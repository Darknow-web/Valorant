#!/usr/bin/env python3
"""Inyecta animaciones y transiciones NATIVAS de PowerPoint en un .pptx.

    python3 animar.py deck.pptx deck.plan.json

pptxgenjs no genera animaciones: hay que escribir el OOXML a mano. Este script
lo hace sobre `ppt/slides/slideN.xml`, usando los `objectName` que build_deck.cjs
dejó en cada shape para saber a qué objeto le toca cada efecto.

Qué escribe:
  <p:transition>  fade · push · wipe · split · cover · morph (p159, con fallback)
  <p:timing>      árbol tnLst→par→seq→childTnLst con entradas, énfasis, salidas
                  y rutas de movimiento, escalonadas por objeto
  <p:bldLst>      builds por párrafo (viñetas una a una) y por serie de gráfico

Se parsea con lxml. `xml.etree.ElementTree` reescribe los prefijos de namespace
y corrompe el paquete.
"""
import argparse
import copy
import json
import shutil
import sys
import zipfile
from pathlib import Path

from lxml import etree

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "mc": "http://schemas.openxmlformats.org/markup-compatibility/2006",
    "p14": "http://schemas.microsoft.com/office/powerpoint/2010/main",
    "p159": "http://schemas.microsoft.com/office/powerpoint/2015/09/main",
}
P = "{%s}" % NS["p"]
A = "{%s}" % NS["a"]
MC = "{%s}" % NS["mc"]
P14 = "{%s}" % NS["p14"]
P159 = "{%s}" % NS["p159"]

# --------------------------------------------------------------------------
# Catálogo de efectos. Cada entrada dice qué elemento de animación usar y con
# qué filtro/atributos. Los nombres de filtro son los que entiende PowerPoint.
# --------------------------------------------------------------------------
ENTRADAS = {
    "fade":     {"tipo": "animEffect", "filtro": "fade", "dur": 500},
    "wipe":     {"tipo": "animEffect", "filtro": "wipe(up)", "dur": 500,
                 "por_direccion": {"arriba": "wipe(up)", "abajo": "wipe(down)",
                                   "izquierda": "wipe(left)", "derecha": "wipe(right)"}},
    "split":    {"tipo": "animEffect", "filtro": "barn(inVertical)", "dur": 500},
    "zoom":     {"tipo": "escala", "de": 0, "a": 100000, "dur": 500, "fade": True},
    "growTurn": {"tipo": "escala", "de": 0, "a": 100000, "dur": 600,
                 "fade": True, "giro": 21600000},
    "flyIn":    {"tipo": "movimiento", "dur": 550, "fade": False,
                 "desde": {"arriba": (0, -0.35), "abajo": (0, 0.35),
                           "izquierda": (-0.35, 0), "derecha": (0.35, 0)}},
    "floatIn":  {"tipo": "movimiento", "dur": 600, "fade": True,
                 "desde": {"arriba": (0, -0.08), "abajo": (0, 0.08),
                           "izquierda": (-0.08, 0), "derecha": (0.08, 0)}},
}

ENFASIS = {
    "pulso":  {"tipo": "escala", "de": 100000, "a": 110000, "dur": 350, "vaiven": True},
    "crecer": {"tipo": "escala", "de": 100000, "a": 125000, "dur": 400, "vaiven": True},
    "girar":  {"tipo": "giro", "grados": 21600000, "dur": 700},
    "color":  {"tipo": "animEffect", "filtro": "fade", "dur": 400},
}

SALIDAS = {
    "fade":  {"filtro": "fade", "dur": 400},
    "flyOut": {"filtro": "wipe(down)", "dur": 450},
}

# Transiciones simples: nombre → (elemento, atributos)
TRANSICIONES = {
    "fade":  ("fade", {}),
    "push":  ("push", {"dir": "u"}),
    "wipe":  ("wipe", {"dir": "l"}),
    "split": ("split", {"orient": "horz", "dir": "out"}),
    "cover": ("cover", {"dir": "d"}),
}

# Animación por defecto de cada arquetipo: lo que hace que un deck se vea
# trabajado sin que nadie tenga que elegir efecto por efecto.
POR_ARQUETIPO = {
    "portada":      {"entrada": "floatIn", "direccion": "abajo", "retardo_ms": 220},
    "divisor":      {"entrada": "wipe", "direccion": "izquierda", "retardo_ms": 150},
    "dato_gigante": {"entrada": "zoom", "retardo_ms": 260, "enfasis": "pulso"},
    "kpis":         {"entrada": "floatIn", "direccion": "abajo", "retardo_ms": 160},
    "tarjetas":     {"entrada": "floatIn", "direccion": "abajo", "retardo_ms": 160},
    "comparacion":  {"entrada": "flyIn", "direccion": "izquierda", "retardo_ms": 220},
    "antes_despues": {"entrada": "flyIn", "direccion": "izquierda", "retardo_ms": 220},
    "proceso":      {"entrada": "fade", "retardo_ms": 140},
    "timeline":     {"entrada": "wipe", "direccion": "izquierda", "retardo_ms": 140},
    "matriz":       {"entrada": "zoom", "retardo_ms": 150},
    "embudo":       {"entrada": "wipe", "direccion": "izquierda", "retardo_ms": 170},
    "cita":         {"entrada": "fade", "retardo_ms": 300},
    "grafico":      {"entrada": "fade", "retardo_ms": 200},
    "tabla":        {"entrada": "fade", "retardo_ms": 200},
    "bullets":      {"entrada": "floatIn", "direccion": "izquierda", "retardo_ms": 170},
    "cierre":       {"entrada": "zoom", "retardo_ms": 240},
}


# --------------------------------------------------------------------------- ids
class Contador:
    """PowerPoint exige que cada nodo de tiempo tenga un id único en el slide."""

    def __init__(self):
        self.n = 1

    def sig(self):
        self.n += 1
        return str(self.n)


def _cTn(cont, dur=None, fill=None, nodeType=None, presetID=None,
         presetClass=None, presetSubtype=None, restart=None, repeatCount=None,
         accel=None, decel=None, autoRev=None, delay=None):
    """Un <p:cTn>. OJO: el retardo no es un atributo del cTn (el esquema lo
    rechaza), va en un <p:stCondLst><p:cond delay="…"/> que debe ir ANTES del
    <p:childTnLst>, así que se crea aquí mismo."""
    at = {"id": cont.sig()}
    if presetID: at["presetID"] = str(presetID)
    if presetClass: at["presetClass"] = presetClass
    if presetSubtype is not None: at["presetSubtype"] = str(presetSubtype)
    if dur is not None: at["dur"] = str(dur)
    if fill: at["fill"] = fill
    if nodeType: at["nodeType"] = nodeType
    if restart: at["restart"] = restart
    if repeatCount: at["repeatCount"] = str(repeatCount)
    if accel: at["accel"] = str(accel)
    if decel: at["decel"] = str(decel)
    if autoRev: at["autoRev"] = "1"
    cTn = etree.Element(P + "cTn", **at)
    if delay is not None:
        st = etree.SubElement(cTn, P + "stCondLst")
        etree.SubElement(st, P + "cond", delay=str(delay))
    return cTn


def _tgt(sid):
    """Apunta el efecto a una forma concreta por su id de shape."""
    tgt = etree.Element(P + "tgtEl")
    spTgt = etree.SubElement(tgt, P + "spTgt")
    spTgt.set("spid", str(sid))
    return tgt


def _cBhvr(cont, sid, dur, attr=None, fill="hold", accel=None, decel=None,
           autoRev=False, repeatCount=None):
    cBhvr = etree.Element(P + "cBhvr")
    cBhvr.append(_cTn(cont, dur=dur, fill=fill, accel=accel, decel=decel,
                      autoRev=autoRev, repeatCount=repeatCount))
    cBhvr.append(_tgt(sid))
    if attr:
        lst = etree.SubElement(cBhvr, P + "attrNameLst")
        for a in attr:
            etree.SubElement(lst, P + "attrName").text = a
    return cBhvr


def _set_visible(cont, sid, valor="visible", delay=None, nodeType="withEffect"):
    """Sin esto, el objeto se ve antes de que su animación de entrada corra."""
    par = etree.Element(P + "par")
    par.append(_cTn(cont, presetID=1, presetClass="entr", presetSubtype=0,
                    fill="hold", nodeType=nodeType, delay=delay))
    cTn = par.find(P + "cTn")
    hijos = etree.SubElement(cTn, P + "childTnLst")
    s = etree.SubElement(hijos, P + "set")
    s.append(_cBhvr(cont, sid, dur=1, attr=["style.visibility"]))
    to = etree.SubElement(s, P + "to")
    etree.SubElement(to, P + "strVal", val=valor)
    return par, hijos


# ------------------------------------------------------------------ efectos
def efecto_entrada(cont, sid, nombre, direccion, retardo, disparador):
    """Un bloque <p:par> completo con la entrada de un objeto."""
    receta = ENTRADAS.get(nombre, ENTRADAS["fade"])
    par, hijos = _set_visible(cont, sid, delay=retardo or 0, nodeType=disparador)
    dur = receta.get("dur", 500)

    if receta["tipo"] == "animEffect":
        filtro = receta.get("por_direccion", {}).get(direccion, receta["filtro"])
        ae = etree.SubElement(hijos, P + "animEffect",
                              transition="in", filter=filtro)
        ae.append(_cBhvr(cont, sid, dur=dur))

    elif receta["tipo"] == "escala":
        if receta.get("fade"):
            ae = etree.SubElement(hijos, P + "animEffect",
                                  transition="in", filter="fade")
            ae.append(_cBhvr(cont, sid, dur=dur))
        ae = etree.SubElement(hijos, P + "animScale")
        ae.append(_cBhvr(cont, sid, dur=dur, decel="50000"))
        etree.SubElement(ae, P + "from", x=str(receta["de"]), y=str(receta["de"]))
        etree.SubElement(ae, P + "to", x=str(receta["a"]), y=str(receta["a"]))
        if receta.get("giro"):
            rot = etree.SubElement(hijos, P + "animRot",
                                   by=str(receta["giro"]))
            rot.append(_cBhvr(cont, sid, dur=dur, attr=["ppt_r"]))

    elif receta["tipo"] == "movimiento":
        dx, dy = receta["desde"].get(direccion or "abajo", (0, 0.3))
        if receta.get("fade"):
            ae = etree.SubElement(hijos, P + "animEffect",
                                  transition="in", filter="fade")
            ae.append(_cBhvr(cont, sid, dur=dur))
        mot = etree.SubElement(hijos, P + "animMotion",
                               origin="layout", pathEditMode="relative",
                               path=f"M {dx} {dy} L 0 0")
        mot.append(_cBhvr(cont, sid, dur=dur, decel="60000",
                          attr=["ppt_x", "ppt_y"]))

    return par


def efecto_enfasis(cont, sid, nombre, retardo):
    receta = ENFASIS.get(nombre)
    if not receta:
        return None
    par = etree.Element(P + "par")
    par.append(_cTn(cont, presetClass="emph", fill="hold",
                    nodeType="afterEffect", delay=retardo or 0))
    hijos = etree.SubElement(par.find(P + "cTn"), P + "childTnLst")
    dur = receta.get("dur", 400)

    if receta["tipo"] == "escala":
        sc = etree.SubElement(hijos, P + "animScale")
        sc.append(_cBhvr(cont, sid, dur=dur, fill="remove",
                         autoRev=receta.get("vaiven", False)))
        etree.SubElement(sc, P + "from", x=str(receta["de"]), y=str(receta["de"]))
        etree.SubElement(sc, P + "to", x=str(receta["a"]), y=str(receta["a"]))
    elif receta["tipo"] == "giro":
        rot = etree.SubElement(hijos, P + "animRot", by=str(receta["grados"]))
        rot.append(_cBhvr(cont, sid, dur=dur, fill="remove", attr=["ppt_r"]))
    else:
        ae = etree.SubElement(hijos, P + "animEffect",
                              transition="out", filter=receta["filtro"])
        ae.append(_cBhvr(cont, sid, dur=dur, fill="remove"))
    return par


def efecto_salida(cont, sid, nombre, retardo):
    receta = SALIDAS.get(nombre)
    if not receta:
        return None
    par = etree.Element(P + "par")
    par.append(_cTn(cont, presetClass="exit", fill="hold",
                    nodeType="afterEffect", delay=retardo or 0))
    hijos = etree.SubElement(par.find(P + "cTn"), P + "childTnLst")
    ae = etree.SubElement(hijos, P + "animEffect",
                          transition="out", filter=receta["filtro"])
    ae.append(_cBhvr(cont, sid, dur=receta["dur"]))
    s = etree.SubElement(hijos, P + "set")
    s.append(_cBhvr(cont, sid, dur=1, attr=["style.visibility"]))
    to = etree.SubElement(s, P + "to")
    etree.SubElement(to, P + "strVal", val="hidden")
    return par


# ------------------------------------------------------------------ timing
def construir_timing(cont, efectos):
    """Envuelve la lista de <p:par> de efectos en el árbol <p:timing> completo.

    Estructura obligatoria (PowerPoint la rechaza si falta un nivel):
      timing → tnLst → par → cTn(tmRoot) → childTnLst → seq(mainSeq)
             → cTn → childTnLst → par(grupo por clic) → … → los efectos
    """
    timing = etree.Element(P + "timing")
    tnLst = etree.SubElement(timing, P + "tnLst")

    parRaiz = etree.SubElement(tnLst, P + "par")
    cTnRaiz = _cTn(cont, restart="never", nodeType="tmRoot")
    parRaiz.append(cTnRaiz)
    hijosRaiz = etree.SubElement(cTnRaiz, P + "childTnLst")

    seq = etree.SubElement(hijosRaiz, P + "seq", concurrent="1", nextAc="seek")
    cTnSeq = _cTn(cont, restart="whenNotActive", nodeType="mainSeq")
    seq.append(cTnSeq)
    hijosSeq = etree.SubElement(cTnSeq, P + "childTnLst")

    for grupo in efectos:
        # Cada grupo = un clic del expositor.
        parClic = etree.SubElement(hijosSeq, P + "par")
        cTnClic = _cTn(cont, fill="hold")
        parClic.append(cTnClic)
        hijosClic = etree.SubElement(cTnClic, P + "childTnLst")

        parGrupo = etree.SubElement(hijosClic, P + "par")
        cTnGrupo = _cTn(cont, fill="hold", delay=0)
        parGrupo.append(cTnGrupo)
        hijosGrupo = etree.SubElement(cTnGrupo, P + "childTnLst")
        for ef in grupo:
            hijosGrupo.append(ef)

    # prevCondLst/nextCondLst: lo que hace que la barra espaciadora avance.
    prev = etree.SubElement(seq, P + "prevCondLst")
    c = etree.SubElement(prev, P + "cond", evt="onPrev", delay="0")
    etree.SubElement(etree.SubElement(c, P + "tgtEl"), P + "sldTgt")
    nxt = etree.SubElement(seq, P + "nextCondLst")
    c = etree.SubElement(nxt, P + "cond", evt="onNext", delay="0")
    etree.SubElement(etree.SubElement(c, P + "tgtEl"), P + "sldTgt")

    return timing


def construir_transicion(nombre):
    """<p:transition>. Morph necesita mc:AlternateContent con fallback."""
    if nombre in (None, "ninguna"):
        return None

    if nombre == "morph":
        # Los prefijos van por nsmap: escribirlos como atributo xmlns hace que
        # lxml falle con "reuse of the xmlns namespace name is forbidden".
        alt = etree.Element(MC + "AlternateContent",
                            nsmap={"mc": NS["mc"], "p": NS["p"]})
        choice = etree.SubElement(alt, MC + "Choice", Requires="p159",
                                  nsmap={"p159": NS["p159"], "p14": NS["p14"]})
        tr = etree.SubElement(choice, P + "transition", spd="slow", advTm="0")
        tr.set(P14 + "dur", "1200")
        etree.SubElement(tr, P159 + "morph", option="byObject")
        # Un visor sin soporte de Morph ve un fundido, no una slide sin efecto.
        fb = etree.SubElement(alt, MC + "Fallback")
        tr2 = etree.SubElement(fb, P + "transition", spd="slow", advTm="0")
        etree.SubElement(tr2, P + "fade")
        return alt

    # `p14:dur` solo es legal bajo un mc:Choice que lo declare; en una
    # transición simple el esquema lo rechaza, así que se usa `spd`.
    elem, attrs = TRANSICIONES.get(nombre, TRANSICIONES["fade"])
    tr = etree.Element(P + "transition", spd="med", advTm="0")
    etree.SubElement(tr, P + elem, **attrs)
    return tr


def construir_bldLst(cont, builds):
    """Builds: viñetas de a una, y gráficos por serie."""
    if not builds:
        return None
    bldLst = etree.Element(P + "bldLst")
    for b in builds:
        if b["tipo"] == "parrafo":
            etree.SubElement(bldLst, P + "bldP", spid=str(b["spid"]),
                             grpId="0", build="p", uiExpand="1")
        elif b["tipo"] == "grafico":
            bg = etree.SubElement(bldLst, P + "bldGraphic", spid=str(b["spid"]),
                                  grpId="0")
            bd = etree.SubElement(bg, P + "bldAsOne") if b.get("como_uno") \
                else etree.SubElement(bg, P + "bldSub")
            if not b.get("como_uno"):
                etree.SubElement(bd, A + "bldChart", bld="series", animBg="1")
    return bldLst if len(bldLst) else None


# ------------------------------------------------------------------ mapeo
def indexar_shapes(arbol):
    """objectName → spid, leyendo el árbol de formas del slide."""
    mapa = {}
    for nv in arbol.iter(P + "nvSpPr"):
        c = nv.find(P + "cNvPr")
        if c is not None and c.get("name"):
            mapa[c.get("name")] = c.get("id")
    for etiqueta in ("nvPicPr", "nvGraphicFramePr", "nvCxnSpPr"):
        for nv in arbol.iter(P + etiqueta):
            c = nv.find(P + "cNvPr")
            if c is not None and c.get("name"):
                mapa[c.get("name")] = c.get("id")
    return mapa


def animar_slide(xml_bytes, plan_slide):
    """Devuelve el XML del slide con transición, timing y builds inyectados."""
    arbol = etree.fromstring(xml_bytes)
    mapa = indexar_shapes(arbol)
    cont = Contador()

    arquetipo = plan_slide.get("arquetipo", "bullets")
    base = dict(POR_ARQUETIPO.get(arquetipo, POR_ARQUETIPO["bullets"]))
    base.update({k: v for k, v in (plan_slide.get("animacion") or {}).items()
                 if v is not None})

    entrada = base.get("entrada", "fade")
    direccion = base.get("direccion")
    retardo = int(base.get("retardo_ms", 180))
    escalonado = base.get("escalonado", True)
    disparador = base.get("disparador", "withEffect")

    objetos = [o for o in plan_slide.get("objetos", []) if o in mapa]
    aplicados = 0
    if entrada != "ninguna" and objetos:
        grupo = []
        for i, nombre in enumerate(objetos):
            sid = mapa[nombre]
            # El primero entra al abrir el slide; el resto se escalona detrás.
            d = (retardo * i) if escalonado else 0
            tipo_nodo = "afterEffect" if i else disparador
            grupo.append(efecto_entrada(cont, sid, entrada, direccion, d, tipo_nodo))
        # Énfasis: solo sobre el objeto protagonista (el primero del arquetipo).
        if base.get("enfasis") and base["enfasis"] != "ninguno":
            protagonista = mapa[objetos[0]]
            ef = efecto_enfasis(cont, protagonista, base["enfasis"],
                                retardo * len(objetos) + 200)
            if ef is not None:
                grupo.append(ef)
        if base.get("salida"):
            ef = efecto_salida(cont, mapa[objetos[-1]], base["salida"],
                               retardo * len(objetos) + 600)
            if ef is not None:
                grupo.append(ef)
        aplicados = len(grupo)

        timing = construir_timing(cont, [grupo])
        for viejo in arbol.findall(P + "timing"):
            arbol.remove(viejo)
        arbol.append(timing)

    # Builds
    builds = []
    for nombre in objetos:
        if arquetipo == "bullets" and nombre.endswith("_texto"):
            builds.append({"tipo": "parrafo", "spid": mapa[nombre]})
    if plan_slide.get("grafico"):
        for nombre in objetos:
            if nombre.endswith("_grafico"):
                builds.append({"tipo": "grafico", "spid": mapa[nombre],
                               "como_uno": not plan_slide["grafico"].get(
                                   "animar_dibujo")})
    bld = construir_bldLst(cont, builds)
    if bld is not None:
        timing = arbol.find(P + "timing")
        if timing is not None:
            timing.append(bld)

    # La transición va ANTES de <p:timing> en el orden que exige el esquema.
    tr = construir_transicion(plan_slide.get("transicion"))
    if tr is not None:
        for viejo in arbol.findall(P + "transition") + \
                arbol.findall(MC + "AlternateContent"):
            arbol.remove(viejo)
        timing = arbol.find(P + "timing")
        if timing is not None:
            timing.addprevious(tr)
        else:
            arbol.append(tr)

    return etree.tostring(arbol, xml_declaration=True, encoding="UTF-8",
                          standalone=True), aplicados


def animar(pptx_path, plan_path):
    pptx_path = Path(pptx_path)
    plan = json.loads(Path(plan_path).read_text(encoding="utf-8"))
    partes = {}
    with zipfile.ZipFile(pptx_path) as z:
        for n in z.namelist():
            partes[n] = z.read(n)

    total, con_transicion = 0, 0
    for ps in plan["slides"]:
        nombre = f"ppt/slides/slide{ps['indice']}.xml"
        if nombre not in partes:
            print(f"  aviso: no existe {nombre}", file=sys.stderr)
            continue
        nuevo, aplicados = animar_slide(partes[nombre], ps)
        partes[nombre] = nuevo
        total += aplicados
        if ps.get("transicion") not in (None, "ninguna"):
            con_transicion += 1

    tmp = pptx_path.with_suffix(".anim.tmp")
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
        for nombre, datos in partes.items():
            z.writestr(nombre, datos)
    shutil.move(str(tmp), str(pptx_path))
    return total, con_transicion


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("pptx")
    ap.add_argument("plan", help="deck.plan.json que emitió build_deck.cjs")
    args = ap.parse_args()
    efectos, transiciones = animar(args.pptx, args.plan)
    print(f"  {efectos} efectos y {transiciones} transiciones inyectados "
          f"en {Path(args.pptx).name}")


if __name__ == "__main__":
    main()
