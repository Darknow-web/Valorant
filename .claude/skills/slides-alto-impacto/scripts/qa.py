#!/usr/bin/env python3
"""Control de calidad del deck: estructura, límites duros y animaciones.

    python3 qa.py salida/deck.pptx salida/deck.plan.json

Comprueba, en este orden:
  1. El .pptx abre y pasa `validate.py` de la skill pptx (esquema, relaciones,
     tipos de contenido, gráficos).
  2. Cada slide valida contra `pml.xsd`, resolviendo antes el markup-compat
     (ese esquema no modela `mc:AlternateContent`, que es lo que usa Morph).
  3. Los límites duros de `assets/temas.json`: palabras visibles por slide,
     palabras por viñeta, número de tarjetas, largo del título, filas de tabla.
  4. Que ninguna slide se quede sin guion del expositor.
  5. Que las animaciones y transiciones estén realmente escritas.
  6. Contraste del texto sobre su fondo (WCAG AA para texto grande, 3:1).

Devuelve código 1 si hay errores (no si solo hay avisos).
"""
import argparse
import copy
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path

from lxml import etree

RAIZ = Path(__file__).resolve().parent.parent
PPTX_SKILL = Path("/mnt/skills/public/pptx/scripts")
XSD = PPTX_SKILL / "office/schemas/ISO-IEC29500-4_2016/pml.xsd"
MC = "{http://schemas.openxmlformats.org/markup-compatibility/2006}"

# Palabras que no cuentan para el límite: numeración, unidades sueltas.
RE_PALABRA = re.compile(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9%]+")


class Reporte:
    def __init__(self):
        self.errores, self.avisos, self.oks = [], [], []

    def error(self, msg): self.errores.append(msg)
    def aviso(self, msg): self.avisos.append(msg)
    def ok(self, msg): self.oks.append(msg)

    def imprimir(self):
        for m in self.oks:
            print(f"  ✓ {m}")
        for m in self.avisos:
            print(f"  ! {m}")
        for m in self.errores:
            print(f"  ✗ {m}")
        print(f"\n  {len(self.oks)} correctos · {len(self.avisos)} avisos · "
              f"{len(self.errores)} errores")
        return 1 if self.errores else 0


# ---------------------------------------------------------------- contraste
def _luminancia(hexc):
    hexc = hexc.replace("#", "")
    if len(hexc) != 6:
        return None
    canales = []
    for i in (0, 2, 4):
        c = int(hexc[i:i + 2], 16) / 255
        canales.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
    r, g, b = canales
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contraste(frente, fondo):
    lf, lb = _luminancia(frente), _luminancia(fondo)
    if lf is None or lb is None:
        return None
    claro, oscuro = max(lf, lb), min(lf, lb)
    return (claro + 0.05) / (oscuro + 0.05)


# ---------------------------------------------------------------- chequeos
def revisar_pptx(pptx, rep):
    if not Path(pptx).exists():
        rep.error(f"no existe {pptx}")
        return
    try:
        with zipfile.ZipFile(pptx) as z:
            malo = z.testzip()
        if malo:
            rep.error(f"el paquete está corrupto en {malo}")
            return
    except zipfile.BadZipFile:
        rep.error("el .pptx no es un ZIP válido — PowerPoint pedirá repararlo")
        return

    r = subprocess.run([sys.executable, str(PPTX_SKILL / "office/validate.py"), str(pptx)],
                       capture_output=True, text=True)
    if r.returncode == 0:
        rep.ok("validate.py: sin violaciones")
    else:
        rep.error("validate.py falló:\n      " +
                  "\n      ".join((r.stdout + r.stderr).strip().splitlines()[:8]))


def revisar_esquema(pptx, rep):
    if not XSD.exists():
        rep.aviso("pml.xsd no disponible; se omite la validación de esquema")
        return
    esquema = etree.XMLSchema(etree.parse(str(XSD)))
    ok = malos = 0
    with zipfile.ZipFile(pptx) as z:
        for n in sorted(x for x in z.namelist()
                        if re.match(r"ppt/slides/slide\d+\.xml$", x)):
            doc = etree.fromstring(z.read(n))
            # El XSD ISO no conoce markup-compatibility: se resuelve al
            # Fallback, como haría un visor sin soporte de Morph.
            for alt in doc.findall(MC + "AlternateContent"):
                fb = alt.find(MC + "Fallback")
                i = list(doc).index(alt)
                doc.remove(alt)
                if fb is not None:
                    for hijo in list(fb):
                        doc.insert(i, copy.deepcopy(hijo))
                        i += 1
            if esquema.validate(doc):
                ok += 1
            else:
                malos += 1
                rep.error(f"{n} no valida: "
                          f"{list(esquema.error_log)[0].message[:120]}")
    if not malos:
        rep.ok(f"pml.xsd: {ok}/{ok} slides válidos")


def _texto_de(sh):
    """Texto plano de un addText, venga como string o como runs."""
    a = sh.get("arg0")
    if isinstance(a, str):
        return [a]
    if isinstance(a, list):
        return [r.get("text", "") for r in a if isinstance(r, dict)]
    return []


def revisar_limites(plan, rep):
    limites = json.loads((RAIZ / "assets" / "temas.json").read_text(
        encoding="utf-8"))["limites"]
    topes = limites.get("palabras_cuerpo_max", {})
    sin_guion = []

    for s in plan["slides"]:
        i = s["indice"]
        # El kicker y el título no compiten con el mensaje: se descuentan.
        # Se identifican por su objectName, que build_deck.cjs deja fijo.
        cuerpo = []
        for sh in s["shapes"]:
            if sh["tipo"] != "addText":
                continue
            nombre = (sh.get("opciones") or {}).get("objectName", "")
            if nombre.endswith(("_kicker", "_titulo", "_num")):
                continue
            cuerpo += _texto_de(sh)
        # El número de slide tampoco es contenido.
        cuerpo = [v for v in cuerpo if not re.fullmatch(r"\d+", v.strip())]
        palabras = sum(len(RE_PALABRA.findall(v)) for v in cuerpo)

        tope = topes.get(s["arquetipo"], limites["palabras_visibles_max"])
        if palabras > tope * 1.5:
            rep.error(f"slide {i} ({s['arquetipo']}): {palabras} palabras de "
                      f"cuerpo, el tope de este arquetipo es {tope}. "
                      f"Pártela en dos o manda el detalle al guion.")
        elif palabras > tope:
            rep.aviso(f"slide {i} ({s['arquetipo']}): {palabras} palabras de "
                      f"cuerpo, algo por encima del tope {tope}")

        for v in cuerpo:
            n = len(RE_PALABRA.findall(v))
            if n > limites["palabras_por_bullet_max"] * 5:
                rep.aviso(f"slide {i}: un bloque de texto muy largo "
                          f"({n} palabras): «{v[:60]}…»")

        if s.get("items") and len(s["items"]) > limites["tarjetas_max"]:
            rep.error(f"slide {i}: {len(s['items'])} elementos, "
                      f"el máximo es {limites['tarjetas_max']}")

        if not (s.get("notas") or "").strip():
            sin_guion.append(i)

    if sin_guion:
        rep.error(f"sin guion del expositor: slides {sin_guion}")
    else:
        rep.ok("todas las slides tienen guion del expositor")


def _fondo_bajo(sh, shapes, fondo_slide):
    """Color realmente detrás de un texto: la última forma opaca que lo cubre.

    Sin esto, el número blanco sobre un círculo de acento se compara contra el
    fondo del slide y sale un 1:1 que no existe.
    """
    o = sh.get("opciones") or {}
    cx = (o.get("x", 0) or 0) + (o.get("w", 0) or 0) / 2
    cy = (o.get("y", 0) or 0) + (o.get("h", 0) or 0) / 2
    fondo = fondo_slide
    for otra in shapes:
        if otra is sh:
            break            # solo lo dibujado ANTES puede estar debajo
        if otra["tipo"] != "addShape":
            continue
        oo = otra.get("opciones") or {}
        relleno = (oo.get("fill") or {}).get("color")
        # Un relleno muy translúcido deja ver el fondo del slide.
        if not relleno or (oo.get("fill") or {}).get("transparency", 0) > 60:
            continue
        x, y = oo.get("x", 0) or 0, oo.get("y", 0) or 0
        w, h = oo.get("w", 0) or 0, oo.get("h", 0) or 0
        if x <= cx <= x + w and y <= cy <= y + h:
            fondo = relleno
    return fondo


def revisar_contraste(plan, rep):
    tema = plan["colores"]
    fondo_defecto = tema["fondo"]
    problemas = 0
    for s in plan["slides"]:
        fondo_slide = fondo_defecto
        for sh in s["shapes"]:
            if sh["tipo"] == "background":
                fondo_slide = (sh.get("opciones") or {}).get("color") or fondo_slide
        for sh in s["shapes"]:
            if sh["tipo"] != "addText":
                continue
            o = sh.get("opciones") or {}
            color = o.get("color")
            if not color or o.get("transparency"):
                continue
            fondo = _fondo_bajo(sh, s["shapes"], fondo_slide)
            c = contraste(color, fondo)
            # Texto grande: AA pide 3:1. Todo lo del deck es ≥13pt en negrita
            # o ≥18pt, así que ese es el umbral que aplica.
            if c is not None and c < 3.0:
                problemas += 1
                rep.aviso(f"slide {s['indice']}: contraste {c:.1f}:1 "
                          f"(#{color} sobre #{fondo}) por debajo de 3:1")
    if not problemas:
        rep.ok("contraste de texto: todo por encima de 3:1")


def revisar_animaciones(pptx, plan, rep):
    con_timing = con_transicion = 0
    total = len(plan["slides"])
    with zipfile.ZipFile(pptx) as z:
        for s in plan["slides"]:
            n = f"ppt/slides/slide{s['indice']}.xml"
            if n not in z.namelist():
                continue
            x = z.read(n).decode("utf-8", "ignore")
            if "<p:timing>" in x and "animEffect" in x or "animScale" in x \
                    or "animMotion" in x:
                con_timing += 1
            if "<p:transition" in x or "AlternateContent" in x:
                con_transicion += 1
    if con_timing == 0:
        rep.error("ninguna slide tiene animaciones: ¿se corrió animar.py?")
    elif con_timing < total:
        rep.aviso(f"{con_timing}/{total} slides con animación de entrada")
    else:
        rep.ok(f"animaciones de entrada en las {total} slides")

    if con_transicion < total:
        rep.aviso(f"{con_transicion}/{total} slides con transición")
    else:
        rep.ok(f"transiciones en las {total} slides")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("pptx")
    ap.add_argument("plan")
    ap.add_argument("--sin-animaciones", action="store_true",
                    help="omite el chequeo de animaciones (deck aún sin animar)")
    args = ap.parse_args()

    plan = json.loads(Path(args.plan).read_text(encoding="utf-8"))
    rep = Reporte()

    print(f"\nQA de {Path(args.pptx).name} — {len(plan['slides'])} slides, "
          f"tema «{plan.get('tema')}»\n")
    revisar_pptx(args.pptx, rep)
    revisar_esquema(args.pptx, rep)
    revisar_limites(plan, rep)
    revisar_contraste(plan, rep)
    if not args.sin_animaciones:
        revisar_animaciones(args.pptx, plan, rep)

    sys.exit(rep.imprimir())


if __name__ == "__main__":
    main()
