#!/usr/bin/env python3
"""Comprueba que ninguna cifra del deck esté inventada.

    python3 verificar_datos.py deck.json salida/contenido.json

Recorre todas las cifras que aparecen en el deck y verifica que cada una exista
en el documento de origen. Una cifra que no está en la fuente es una cifra
inventada, y eso invalida la presentación entera: sale con código 1.

No es una comprobación de estilo. Es la que impide que un slide diga «creció un
34%» porque quedaba bien en el hueco.
"""
import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

# Las mismas formas de cifra que detecta extraer_contenido.py.
RE_CIFRA = re.compile(
    r"(?<![\w.,])("
    r"(?:S/\.?|US\$|\$|€|PEN|USD)\s*\d+(?:[.,]\d+)*"
    r"|\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?\s*%?"
    r"|\d+(?:[.,]\d+)?\s*%"
    r"|\d+(?:[.,]\d+)?\s*(?:x|X)\b"
    r"|\d+[.,]\d+"
    r"|\d{2,}"
    r")(?![\w])"
)

# Números que no son datos: numeración de pasos, años del calendario en un
# título, cantidades de elementos del propio diseño.
IGNORAR = {"16", "9", "10", "100"}


def normalizar(s):
    """Quita acentos, espacios y separadores de miles para poder comparar."""
    s = unicodedata.normalize("NFKD", str(s))
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace(" ", "").replace(" ", "")
    return s


def variantes(cifra):
    """Formas equivalentes de la misma cifra, para no dar falsos positivos.

    «S/ 1,240» y «S/ 1.240» son el mismo dato escrito distinto, y «2.1» puede
    aparecer en el documento como «2,1».
    """
    base = normalizar(cifra)
    out = {base}
    out.add(base.replace(",", "."))
    out.add(base.replace(".", ","))
    solo = re.sub(r"[^\d.,]", "", base)
    if solo:
        out.add(solo)
        out.add(solo.replace(",", ""))
        out.add(solo.replace(".", ""))
        out.add(solo.replace(",", "."))
        # Sin decimales cero: «2.0» y «2» son el mismo número.
        try:
            f = float(solo.replace(",", "."))
            if f == int(f):
                out.add(str(int(f)))
            out.add(str(f))
        except ValueError:
            pass
    return {v for v in out if v}


def cifras_de_texto(txt):
    return [m.group(1).strip() for m in RE_CIFRA.finditer(str(txt or ""))]


def recorrer(nodo, campos=("titulo", "subtitulo", "kicker", "conclusion",
                           "texto", "valor", "etiqueta", "delta", "unidad",
                           "fecha")):
    """Todos los textos visibles del deck. Las notas NO cuentan: el guion es
    del expositor y puede añadir contexto, pero la pantalla no."""
    salida = []
    if isinstance(nodo, dict):
        for k, v in nodo.items():
            if k == "notas":
                continue
            if isinstance(v, str) and (k in campos):
                salida.append((k, v))
            else:
                salida.extend(recorrer(v, campos))
    elif isinstance(nodo, list):
        for x in nodo:
            salida.extend(recorrer(x, campos))
    return salida


def texto_fuente(contenido):
    partes = []
    for sec in contenido.get("secciones", []):
        partes.append(sec.get("titulo", ""))
        partes.extend(sec.get("parrafos", []))
        partes.extend(sec.get("listas", []))
        for t in sec.get("tablas", []):
            partes.extend(t.get("encabezado", []))
            for fila in t.get("filas", []):
                partes.extend(fila)
    return " ".join(str(p) for p in partes)


def verificar(deck, contenido):
    fuente = texto_fuente(contenido)
    # Todas las variantes de todas las cifras de la fuente, más el texto crudo.
    permitidas = set()
    for c in cifras_de_texto(fuente):
        permitidas |= variantes(c)
    fuente_norm = normalizar(fuente)

    huerfanas, revisadas = [], 0
    for campo, texto in recorrer(deck):
        for cifra in cifras_de_texto(texto):
            revisadas += 1
            if cifra in IGNORAR:
                continue
            vs = variantes(cifra)
            if vs & permitidas:
                continue
            # Última oportunidad: que aparezca literal dentro del texto fuente.
            if any(v in fuente_norm for v in vs if len(v) >= 2):
                continue
            huerfanas.append({"cifra": cifra, "campo": campo,
                              "contexto": str(texto)[:80]})
    return {"revisadas": revisadas, "huerfanas": huerfanas}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("deck", help="deck.json")
    ap.add_argument("contenido", help="contenido.json del documento de origen")
    args = ap.parse_args()

    deck = json.loads(Path(args.deck).read_text(encoding="utf-8"))
    contenido = json.loads(Path(args.contenido).read_text(encoding="utf-8"))
    r = verificar(deck, contenido)

    print(f"\n  {r['revisadas']} cifras en el deck, "
          f"{len(r['huerfanas'])} sin respaldo en el documento\n")
    if not r["huerfanas"]:
        print("  ✓ todas las cifras del deck están en el documento de origen")
        return 0
    for h in r["huerfanas"]:
        print(f"  ✗ «{h['cifra']}» en {h['campo']}: «{h['contexto']}»")
    print("\n  Una cifra que no está en la fuente está inventada. Quítala del")
    print("  deck o pídele el dato a quien te dio el documento.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
