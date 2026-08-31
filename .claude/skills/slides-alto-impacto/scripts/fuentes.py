#!/usr/bin/env python3
"""Descarga familias de Google Fonts y las incrusta en un .pptx.

    python3 fuentes.py descargar Inter Sora            # a .vendor/fuentes/
    python3 fuentes.py incrustar deck.pptx Inter Sora  # embeber en el paquete

Incrustar las fuentes hace que el deck se vea igual en cualquier PC aunque no
tenga la tipografía instalada. PowerPoint lo soporta de forma nativa
(ppt/fonts/*.fntdata + <p:embeddedFontLst> en presentation.xml).

`fonts.googleapis.com` y `fonts.gstatic.com` están permitidos por el proxy;
el resto de CDNs no. Tras la primera descarga todo queda en caché local.
"""
import argparse
import os
import re
import shutil
import sys
import urllib.request
import zipfile
from pathlib import Path

VENDOR = Path(os.environ.get(
    "SLIDES_VENDOR_DIR", Path(__file__).resolve().parent.parent / ".vendor"))
CACHE = VENDOR / "fuentes"

# Un navegador viejo en el User-Agent hace que Google sirva TTF en vez de WOFF2,
# que es lo que PowerPoint necesita.
UA_TTF = "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 " \
         "(KHTML, like Gecko) Chrome/40.0.2214.85 Safari/537.36"

PESOS = "400;600;700"


def descargar(familia, pesos=PESOS):
    """Descarga los TTF de una familia. Devuelve las rutas locales."""
    destino = CACHE / familia.replace(" ", "_")
    if destino.is_dir() and any(destino.glob("*.ttf")):
        return sorted(destino.glob("*.ttf"))
    destino.mkdir(parents=True, exist_ok=True)

    url = ("https://fonts.googleapis.com/css2?family="
           + urllib.parse.quote(familia) + ":wght@" + pesos + "&display=swap")
    req = urllib.request.Request(url, headers={"User-Agent": UA_TTF})
    with urllib.request.urlopen(req, timeout=45) as r:
        css = r.read().decode("utf-8")

    # Google sirve un @font-face por subset (latin, cyrillic, greek…). Solo
    # interesa `latin`: con todos serían ~7 archivos por peso y el .pptx
    # engordaría sin motivo.
    bloques = re.findall(
        r"/\*\s*([\w-]+)\s*\*/\s*@font-face\s*\{([^}]+)\}", css)
    if not bloques:  # respuesta sin comentarios de subset
        bloques = [("latin", b) for b in re.findall(r"@font-face\s*\{([^}]+)\}", css)]

    elegidos = {}
    for subset, cuerpo in bloques:
        if subset != "latin":
            continue
        u = re.search(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", cuerpo)
        w = re.search(r"font-weight:\s*(\d+)", cuerpo)
        if u:
            elegidos.setdefault(w.group(1) if w else "400", u.group(1))

    if not elegidos:
        raise RuntimeError(f"Google Fonts no devolvió TTF latin para «{familia}». "
                           f"¿Nombre correcto? ¿Tiene esos pesos?")
    rutas = []
    for peso, u in sorted(elegidos.items()):
        ruta = destino / f"{familia.replace(' ', '')}-{peso}.ttf"
        with urllib.request.urlopen(
                urllib.request.Request(u, headers={"User-Agent": UA_TTF}),
                timeout=60) as r:
            ruta.write_bytes(r.read())
        rutas.append(ruta)
    return rutas


def incrustar(pptx_path, familias):
    """Incrusta las familias en el .pptx (in place)."""
    from lxml import etree

    P = "http://schemas.openxmlformats.org/presentationml/2006/main"
    R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    CT = "http://schemas.openxmlformats.org/package/2006/content-types"
    REL = "http://schemas.openxmlformats.org/package/2006/relationships"
    TIPO_FUENTE = ("http://schemas.openxmlformats.org/officeDocument/2006/"
                   "relationships/font")

    pptx_path = Path(pptx_path)
    tmp = pptx_path.with_suffix(".fuentes.tmp")
    partes = {}
    with zipfile.ZipFile(pptx_path) as z:
        for n in z.namelist():
            partes[n] = z.read(n)

    pres = etree.fromstring(partes["ppt/presentation.xml"])
    rels = etree.fromstring(partes["ppt/_rels/presentation.xml.rels"])
    tipos = etree.fromstring(partes["[Content_Types].xml"])

    # rId libre
    usados = {int(m.group(1)) for e in rels
              for m in [re.match(r"rId(\d+)$", e.get("Id") or "")] if m}
    siguiente = max(usados, default=0) + 1

    lista = pres.find(f"{{{P}}}embeddedFontLst")
    if lista is None:
        lista = etree.Element(f"{{{P}}}embeddedFontLst")
        # embeddedFontLst va después de sldSz/notesSz, antes de defaultTextStyle.
        ancla = pres.find(f"{{{P}}}notesSz")
        if ancla is not None:
            ancla.addnext(lista)
        else:
            pres.append(lista)

    n_embebidas = 0
    for familia in familias:
        try:
            ttfs = descargar(familia)
        except Exception as exc:
            print(f"  aviso: «{familia}» no se pudo descargar ({exc}); "
                  f"el deck usará la fuente del sistema", file=sys.stderr)
            continue
        fuente = etree.SubElement(lista, f"{{{P}}}embeddedFont")
        etree.SubElement(fuente, f"{{{P}}}font", typeface=familia,
                         pitchFamily="34", charset="0")
        for ttf in ttfs:
            peso = re.search(r"-(\d+)\.ttf$", ttf.name)
            peso = int(peso.group(1)) if peso else 400
            etiqueta = "bold" if peso >= 600 else "regular"
            if any(e.tag == f"{{{P}}}{etiqueta}" for e in fuente):
                continue
            nombre_parte = f"ppt/fonts/font{siguiente}.fntdata"
            partes[nombre_parte] = ttf.read_bytes()
            etree.SubElement(rels, f"{{{REL}}}Relationship",
                             Id=f"rId{siguiente}", Type=TIPO_FUENTE,
                             Target=f"fonts/font{siguiente}.fntdata")
            etree.SubElement(fuente, f"{{{P}}}{etiqueta}",
                             **{f"{{{R}}}id": f"rId{siguiente}"})
            siguiente += 1
            n_embebidas += 1

    if not n_embebidas:
        print("  no se incrustó ninguna fuente")
        return 0

    if not any(e.get("Extension") == "fntdata" for e in tipos):
        etree.SubElement(tipos, f"{{{CT}}}Default", Extension="fntdata",
                         ContentType="application/x-fontdata")

    partes["ppt/presentation.xml"] = etree.tostring(
        pres, xml_declaration=True, encoding="UTF-8", standalone=True)
    partes["ppt/_rels/presentation.xml.rels"] = etree.tostring(
        rels, xml_declaration=True, encoding="UTF-8", standalone=True)
    partes["[Content_Types].xml"] = etree.tostring(
        tipos, xml_declaration=True, encoding="UTF-8", standalone=True)

    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
        for nombre, datos in partes.items():
            z.writestr(nombre, datos)
    shutil.move(str(tmp), str(pptx_path))
    print(f"  {n_embebidas} archivos de fuente incrustados en {pptx_path.name}")
    return n_embebidas


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("descargar"); d.add_argument("familias", nargs="+")
    i = sub.add_parser("incrustar")
    i.add_argument("pptx"); i.add_argument("familias", nargs="+")
    args = ap.parse_args()

    if args.cmd == "descargar":
        for f in args.familias:
            rutas = descargar(f)
            print(f"  {f}: {len(rutas)} archivos → {rutas[0].parent}")
    else:
        incrustar(args.pptx, args.familias)


if __name__ == "__main__":
    import urllib.parse  # noqa: E402  (lo usa descargar())
    main()
