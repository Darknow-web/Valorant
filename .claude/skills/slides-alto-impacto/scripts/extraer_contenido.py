#!/usr/bin/env python3
"""Extrae la estructura de un .docx o .pdf a contenido.json y muestra el mapa
de contenido numerado que el usuario usa para elegir qué va en las slides.

    python3 extraer_contenido.py informe.docx [-o salida/] [--json]

Salida:
  salida/contenido.json   estructura completa
  salida/img/*            imágenes embebidas del documento
  stdout                  mapa de contenido numerado (o JSON con --json)
"""
import argparse
import json
import os
import re
import sys
import zipfile
from pathlib import Path

# Cifras aprovechables para un slide de "dato gigante": porcentajes, dinero,
# multiplicadores, cantidades con separador de miles y años.
RE_CIFRA = re.compile(
    r"(?<![\w.,])("
    r"(?:S/\.?|US\$|\$|€|PEN|USD)\s*\d+(?:[.,]\d+)*"  # S/ 1200
    r"|\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?\s*%?"      # 1.234  /  12,500.50
    r"|\d+(?:[.,]\d+)?\s*%"                         # 45%  /  12,5 %
    r"|\d+(?:[.,]\d+)?\s*(?:x|X)\b"                 # 3x
    r"|\d+[.,]\d+"                                   # 1.3  /  2,1
    r"|\d{2,}"                                        # 144  /  24
    r")(?![\w])"
)

PALABRAS_TITULO = (
    "introducción", "introduccion", "objetivos", "objetivo", "resumen",
    "conclusiones", "conclusión", "recomendaciones", "metodología",
    "metodologia", "resultados", "antecedentes", "marco teórico",
    "marco teorico", "diagnóstico", "diagnostico", "propuesta", "anexos",
    "bibliografía", "bibliografia", "justificación", "justificacion",
    "alcance", "problema", "solución", "solucion", "cronograma", "presupuesto",
)


def _cifras(texto):
    """Cifras únicas del texto, en orden de aparición, con su frase contenedora."""
    vistos, out = set(), []
    for m in RE_CIFRA.finditer(texto):
        val = m.group(1).strip()
        if val in vistos:
            continue
        vistos.add(val)
        ini = texto.rfind(".", 0, m.start()) + 1
        fin = texto.find(".", m.end())
        fin = len(texto) if fin == -1 else fin
        out.append({"valor": val, "contexto": texto[ini:fin].strip()[:200]})
    return out[:12]


def _con_contenido(sec):
    return bool(sec["parrafos"] or sec["listas"] or sec["tablas"])


# Un título que ya trae su propia numeración ("3.1 Metodología", "IV. Anexos").
RE_NUM_PROPIA = re.compile(r"^\s*(?:\d+(?:\.\d+)*\.?|[IVXLC]+\.)\s+\S")


def _seccion(nivel, titulo):
    return {
        "id": None, "nivel": nivel, "titulo": titulo.strip(),
        "parrafos": [], "listas": [], "tablas": [], "imagenes": [],
    }


# --------------------------------------------------------------------------- docx
def _es_lista(par):
    nombre = (par.style.name or "").lower()
    if "list" in nombre or "viñeta" in nombre or "numer" in nombre:
        return True
    return par._p.find(
        ".//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}numPr"
    ) is not None


def _nivel_docx(par):
    """Nivel de encabezado (1-4) o None si es cuerpo."""
    nombre = (par.style.name or "").strip().lower()
    m = re.match(r"(?:heading|título|titulo|encabezado)\s*(\d)", nombre)
    if m:
        return min(int(m.group(1)), 4)
    if nombre in ("title", "título", "titulo"):
        return 1
    # Heurística: párrafo corto, sin punto final, en negrita y con pinta de título.
    txt = par.text.strip()
    if 3 <= len(txt) <= 90 and not txt.endswith("."):
        runs = [r for r in par.runs if r.text.strip()]
        if runs and all(r.bold for r in runs):
            return 2
        if re.match(r"^(?:\d+(?:\.\d+)*\.?|[IVXLC]+\.)\s+\S", txt):
            return 2 if txt.count(".") <= 1 else 3
        if txt.lower().lstrip("0123456789. ") in PALABRAS_TITULO:
            return 1
    return None


def extraer_docx(ruta, dir_img):
    import docx
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    doc = docx.Document(str(ruta))
    secciones, actual = [], _seccion(1, "Portada / sin título")

    cuerpo = doc.element.body
    for hijo in cuerpo.iterchildren():
        tag = hijo.tag.split("}")[-1]
        if tag == "p":
            par = Paragraph(hijo, doc)
            texto = par.text.strip()
            if not texto:
                continue
            nivel = _nivel_docx(par)
            if nivel:
                if _con_contenido(actual) or actual["titulo"]:
                    secciones.append(actual)
                actual = _seccion(nivel, texto)
            elif _es_lista(par):
                actual["listas"].append(texto)
            else:
                actual["parrafos"].append(texto)
        elif tag == "tbl":
            tabla = Table(hijo, doc)
            filas = [[c.text.strip() for c in f.cells] for f in tabla.rows]
            if filas:
                actual["tablas"].append({"encabezado": filas[0], "filas": filas[1:]})

    if _con_contenido(actual) or actual["titulo"] or not secciones:
        secciones.append(actual)

    # Imágenes embebidas: viven en word/media dentro del ZIP.
    dir_img.mkdir(parents=True, exist_ok=True)
    imagenes = []
    with zipfile.ZipFile(ruta) as z:
        for nombre in z.namelist():
            if nombre.startswith("word/media/"):
                destino = dir_img / Path(nombre).name
                destino.write_bytes(z.read(nombre))
                imagenes.append(str(destino))
    if imagenes and secciones:
        secciones[0]["imagenes"] = imagenes
    return secciones


# --------------------------------------------------------------------------- pdf
def extraer_pdf(ruta, dir_img):
    import pdfplumber

    secciones, actual = [], _seccion(1, "Portada / sin título")
    tam_cuerpo = None

    with pdfplumber.open(str(ruta)) as pdf:
        # Tamaño de fuente más frecuente = cuerpo; lo mayor a eso es encabezado.
        conteo = {}
        for pagina in pdf.pages[:20]:
            for ch in pagina.chars:
                k = round(ch["size"], 1)
                conteo[k] = conteo.get(k, 0) + 1
        if conteo:
            tam_cuerpo = max(conteo, key=conteo.get)

        for pagina in pdf.pages:
            # Tablas y texto se recorren juntos, ordenados por posición
            # vertical: así cada tabla cae en la sección donde aparece, y las
            # celdas no se cuelan además como párrafos sueltos.
            tablas = pagina.find_tables() or []
            zonas = [tb.bbox for tb in tablas]
            eventos = [{"orden": bb[1], "clase": "tabla", "dato": tb}
                       for tb, bb in zip(tablas, zonas)]
            for linea in _lineas_pdf(pagina):
                if any(y0 - 2 <= linea["top"] <= y1 + 2 for _, y0, _, y1 in zonas):
                    continue        # está dentro de una tabla
                eventos.append({"orden": linea["top"], "clase": "linea",
                                "dato": linea})

            for ev in sorted(eventos, key=lambda e: e["orden"]):
                if ev["clase"] == "tabla":
                    filas = [[(c or "").strip() for c in f]
                             for f in (ev["dato"].extract() or []) if any(f)]
                    if len(filas) > 1:
                        actual["tablas"].append(
                            {"encabezado": filas[0], "filas": filas[1:]})
                    continue
                linea = ev["dato"]
                texto, tam, negrita = linea["texto"], linea["tam"], linea["negrita"]
                if not texto:
                    continue
                es_titulo = (
                    tam_cuerpo is not None
                    and len(texto) <= 90
                    and not texto.endswith(".")
                    and (tam >= tam_cuerpo + 1.0 or (negrita and tam >= tam_cuerpo))
                )
                if es_titulo:
                    if _con_contenido(actual) or actual["titulo"]:
                        secciones.append(actual)
                    nivel = 1 if tam >= (tam_cuerpo or 0) + 3 else 2
                    actual = _seccion(nivel, texto)
                elif re.match(r"^\s*[-•·▪o]\s+", texto):
                    actual["listas"].append(re.sub(r"^\s*[-•·▪o]\s+", "", texto))
                else:
                    actual["parrafos"].append(texto)

    if _con_contenido(actual) or actual["titulo"] or not secciones:
        secciones.append(actual)

    # Imágenes: PyMuPDF las extrae mejor que pdfplumber.
    try:
        try:
            import pymupdf as fitz          # nombre actual
        except ImportError:
            import fitz                     # versiones viejas
        dir_img.mkdir(parents=True, exist_ok=True)
        doc = fitz.open(str(ruta))
        imagenes = []
        for i, (xref, *_ ) in enumerate(
            {im[0]: im for pg in doc for im in pg.get_images(full=True)}.values()
        ):
            pix = fitz.Pixmap(doc, xref)
            if pix.n - pix.alpha >= 4:
                pix = fitz.Pixmap(fitz.csRGB, pix)
            if pix.width < 80 or pix.height < 80:
                continue
            destino = dir_img / f"pdf_img_{i:03d}.png"
            pix.save(str(destino))
            imagenes.append(str(destino))
        if imagenes and secciones:
            secciones[0]["imagenes"] = imagenes
    except Exception as exc:  # pragma: no cover - las imágenes son opcionales
        print(f"  aviso: no se pudieron extraer imágenes del PDF ({exc})",
              file=sys.stderr)

    return secciones


def _lineas_pdf(pagina):
    """Agrupa los chars de la página en líneas con su tamaño y peso dominante."""
    lineas = {}
    for ch in pagina.chars:
        clave = round(ch["top"] / 3)
        lineas.setdefault(clave, []).append(ch)
    out = []
    for clave in sorted(lineas):
        chars = sorted(lineas[clave], key=lambda c: c["x0"])
        texto = "".join(c["text"] for c in chars).strip()
        if not texto:
            continue
        tams = [c["size"] for c in chars]
        negritas = sum("bold" in (c.get("fontname") or "").lower() for c in chars)
        out.append({
            "texto": re.sub(r"\s{2,}", " ", texto),
            "tam": max(set(tams), key=tams.count),
            "negrita": negritas > len(chars) / 2,
            "top": min(c["top"] for c in chars),
        })
    return out


# --------------------------------------------------------------------------- salida
def enriquecer(secciones):
    """Numera las secciones y calcula métricas para el mapa de contenido."""
    contador = {}
    for i, sec in enumerate(secciones, 1):
        nivel = sec["nivel"]
        contador[nivel] = contador.get(nivel, 0) + 1
        for n in list(contador):
            if n > nivel:
                del contador[n]
        sec["id"] = str(i)
        # Si el documento ya numera sus títulos, se respeta esa numeración en
        # vez de anteponer otra (evita "1.1 2.1 Objetivo general").
        sec["numeracion"] = "" if RE_NUM_PROPIA.match(sec["titulo"]) else ".".join(
            str(contador[n]) for n in sorted(contador) if n <= nivel
        )
        texto = " ".join(sec["parrafos"] + sec["listas"])
        sec["palabras"] = len(texto.split())
        sec["cifras"] = _cifras(texto)
        sec["tiene_datos"] = bool(sec["cifras"] or sec["tablas"])
        # Cuántas slides pide esta sección: 1 por cada ~110 palabras, 1..4.
        sec["es_divisor"] = not _con_contenido(sec)
        sec["slides_sugeridas"] = (
            0 if sec["es_divisor"] else max(1, min(4, round(sec["palabras"] / 110) or 1))
        )
    return secciones


def mapa_texto(doc):
    lineas = [
        f"MAPA DE CONTENIDO — {doc['titulo_documento']}",
        f"({doc['archivo']})",
        f"{len(doc['secciones'])} secciones · {doc['palabras_total']} palabras "
        f"· {doc['slides_sugeridas_total']} slides sugeridas",
        "",
    ]
    for sec in doc["secciones"]:
        sangria = "  " * (sec["nivel"] - 1)
        marcas = []
        if sec["cifras"]:
            marcas.append(f"{len(sec['cifras'])} cifras")
        if sec["tablas"]:
            marcas.append(f"{len(sec['tablas'])} tablas")
        if sec["imagenes"]:
            marcas.append(f"{len(sec['imagenes'])} imgs")
        extra = f"  [{', '.join(marcas)}]" if marcas else ""
        lineas.append(
            f"  [{sec['id']:>2}] {sangria}"
            f"{sec['numeracion'] + ' ' if sec['numeracion'] else ''}{sec['titulo']}"
            f"  ({sec['palabras']} pal · ~{sec['slides_sugeridas']} slide/s){extra}"
        )
    lineas += [
        "",
        "Elige por número: «2,4,5» · rangos «2-6» · «todo» para el documento completo.",
    ]
    return "\n".join(lineas)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("documento", help="archivo .docx o .pdf")
    ap.add_argument("-o", "--salida", default="salida", help="directorio de salida")
    ap.add_argument("--json", action="store_true", help="imprimir JSON en vez del mapa")
    args = ap.parse_args()

    ruta = Path(args.documento)
    if not ruta.exists():
        sys.exit(f"No existe el archivo: {ruta}")
    salida = Path(args.salida)
    salida.mkdir(parents=True, exist_ok=True)

    ext = ruta.suffix.lower()
    if ext == ".docx":
        secciones = extraer_docx(ruta, salida / "img")
    elif ext == ".pdf":
        secciones = extraer_pdf(ruta, salida / "img")
    else:
        sys.exit(f"Formato no soportado: {ext} (usa .docx o .pdf)")

    # Fuera el marcador de portada si quedó sin contenido.
    secciones = [
        s for s in secciones
        if _con_contenido(s) or s["titulo"] != "Portada / sin título"
    ]
    secciones = enriquecer(secciones)
    # El primer divisor de nivel 1 suele ser el título del documento.
    titulo_doc = next(
        (s["titulo"] for s in secciones if s["nivel"] == 1 and s.get("es_divisor")),
        ruta.stem.replace("_", " ").title(),
    )
    doc = {
        "archivo": ruta.name,
        "titulo_documento": titulo_doc,
        "secciones": secciones,
        "palabras_total": sum(s["palabras"] for s in secciones),
        "slides_sugeridas_total": sum(s["slides_sugeridas"] for s in secciones) + 2,
    }
    destino = salida / "contenido.json"
    destino.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(doc, ensure_ascii=False, indent=2) if args.json else mapa_texto(doc))
    if not args.json:
        print(f"\nEstructura guardada en {destino}")


if __name__ == "__main__":
    main()
