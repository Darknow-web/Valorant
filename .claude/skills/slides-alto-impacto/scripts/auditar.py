#!/usr/bin/env python3
"""Audita una presentación y dice, slide por slide, qué le pasa y qué hacer.

    python3 auditar.py salida/original/deck.plan.json
    python3 auditar.py salida/original/deck.plan.json --json

Funciona igual sobre un deck propio o sobre uno leído con `leer_pptx.py`, y
sobre lo que devuelve Canva. Mide lo que se puede medir; el juicio visual sigue
siendo del agente mirando las capturas.
"""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

RE_PALABRA = re.compile(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9%]+")

# Umbrales. No son caprichos: salen de lo que se lee proyectado en un salón.
MAX_PALABRAS = 40          # por encima de esto el público lee en vez de escuchar
MAX_BLOQUE = 30            # un solo párrafo de más de esto no se lee en pantalla
MIN_PT = 14                # por debajo no se ve desde el fondo del aula
MAX_TEXTOS = 12            # más elementos de texto que esto es una pared
DENSIDAD_ALTA = 0.42       # fracción del slide ocupada por cajas de texto


def _lum(h):
    h = str(h).replace("#", "")
    if len(h) != 6:
        return None
    c = []
    for i in (0, 2, 4):
        try:
            v = int(h[i:i + 2], 16) / 255
        except ValueError:
            return None
        c.append(v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def contraste(a, b):
    la, lb = _lum(a), _lum(b)
    if la is None or lb is None:
        return None
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def _texto_de(sh):
    a = sh.get("arg0")
    if isinstance(a, str):
        return a
    if isinstance(a, list):
        return " ".join(r.get("text", "") for r in a if isinstance(r, dict))
    return ""


def _fondo_bajo(sh, shapes, fondo_slide):
    """El color realmente detrás de un texto: la última forma opaca que lo tapa."""
    o = sh.get("opciones") or {}
    cx = (o.get("x") or 0) + (o.get("w") or 0) / 2
    cy = (o.get("y") or 0) + (o.get("h") or 0) / 2
    fondo = fondo_slide
    for otra in shapes:
        if otra is sh:
            break
        if otra.get("tipo") != "addShape":
            continue
        oo = otra.get("opciones") or {}
        relleno = (oo.get("fill") or {}).get("color")
        if not relleno or (oo.get("fill") or {}).get("transparency", 0) > 60:
            continue
        x, y = oo.get("x") or 0, oo.get("y") or 0
        w, h = oo.get("w") or 0, oo.get("h") or 0
        if x <= cx <= x + w and y <= cy <= y + h:
            fondo = relleno
    return fondo


def _solapan(a, b):
    ax, ay = a.get("x") or 0, a.get("y") or 0
    aw, ah = a.get("w") or 0, a.get("h") or 0
    bx, by = b.get("x") or 0, b.get("y") or 0
    bw, bh = b.get("w") or 0, b.get("h") or 0
    ix = max(0, min(ax + aw, bx + bw) - max(ax, bx))
    iy = max(0, min(ay + ah, by + bh) - max(ay, by))
    area = ix * iy
    menor = min(aw * ah, bw * bh)
    return menor > 0 and area / menor > 0.35


def auditar_slide(slide, lienzo, todas_firmas):
    shapes = slide.get("shapes", [])
    fondo = "FFFFFF"
    for sh in shapes:
        if sh.get("tipo") == "background":
            fondo = (sh.get("opciones") or {}).get("color") or fondo

    textos = [sh for sh in shapes if sh.get("tipo") == "addText"
              and _texto_de(sh).strip()
              and not re.fullmatch(r"\d+", _texto_de(sh).strip())]
    visuales = [sh for sh in shapes if sh.get("tipo") in
                ("addImage", "addChart", "addShape", "addTable")]

    palabras = sum(len(RE_PALABRA.findall(_texto_de(sh))) for sh in textos)
    problemas, mejoras = [], []

    # 1. Exceso de texto
    if palabras > MAX_PALABRAS:
        problemas.append(
            f"{palabras} palabras en pantalla: el público lee en vez de escuchar")
        mejoras.append("extraer el mensaje a un titular y llevar el detalle al guion")
    bloques = [(len(RE_PALABRA.findall(_texto_de(sh))), _texto_de(sh))
               for sh in textos]
    largos = [b for b in bloques if b[0] > MAX_BLOQUE]
    for n, t in largos[:3]:
        problemas.append(f"un párrafo de {n} palabras: «{t[:60]}…»")
        mejoras.append("convertir ese párrafo en 3-4 puntos o en un visual")

    # 2. Tipografía por debajo del mínimo legible
    chicos = [sh for sh in textos
              if ((sh.get("opciones") or {}).get("fontSize") or 18) < MIN_PT]
    if chicos:
        menor = min(((sh.get("opciones") or {}).get("fontSize") or 18)
                    for sh in chicos)
        problemas.append(
            f"{len(chicos)} textos por debajo de {MIN_PT} pt (el menor, {menor:.0f} pt)")
        mejoras.append("subir el cuerpo y quitar texto para que quepa")

    # 3. Contraste
    for sh in textos:
        o = sh.get("opciones") or {}
        color = o.get("color")
        # Un color heredado del tema del .pptx no se puede resolver leyendo el
        # archivo; medirlo daría un falso positivo.
        if not color or o.get("__color_heredado"):
            continue
        c = contraste(color, _fondo_bajo(sh, shapes, fondo))
        grande = (o.get("fontSize") or 18) >= 24 or o.get("bold")
        minimo = 3.0 if grande else 4.5
        if c is not None and c < minimo:
            problemas.append(
                f"contraste {c:.1f}:1 en «{_texto_de(sh)[:32]}…» (mínimo {minimo})")
            mejoras.append("cambiar el color del texto o el fondo bajo él")
            break

    # 4. Pared de elementos
    if len(textos) > MAX_TEXTOS:
        problemas.append(f"{len(textos)} cajas de texto distintas")
        mejoras.append("agrupar en tarjetas o partir la slide en dos")

    # 5. Densidad
    area = (lienzo.get("ancho_in") or 13.333) * (lienzo.get("alto_in") or 7.5)
    ocupado = sum((sh.get("opciones") or {}).get("w", 0) *
                  (sh.get("opciones") or {}).get("h", 0) for sh in textos)
    densidad = ocupado / area if area else 0
    if densidad > DENSIDAD_ALTA:
        problemas.append(f"el texto ocupa el {densidad*100:.0f}% del slide")
        mejoras.append("dar aire: menos contenido y más espacio en blanco")

    # 6. Solo texto, nada visual. Las formas con relleno cuentan: un proceso
    # con círculos numerados o unas tarjetas no son "solo texto".
    apoyos = [v for v in visuales
              if v.get("tipo") in ("addImage", "addChart", "addTable")]
    formas_rellenas = [v for v in visuales
                       if v.get("tipo") == "addShape"
                       and ((v.get("opciones") or {}).get("fill") or {}).get("color")]
    if palabras > 25 and not apoyos and len(formas_rellenas) < 3:
        problemas.append("solo texto, sin ningún apoyo visual")
        mejoras.append("buscar en el texto la cifra, la comparación o el proceso "
                       "que se pueda dibujar")

    # 7. Desbordes
    ancho = lienzo.get("ancho_in") or 13.333
    alto = lienzo.get("alto_in") or 7.5
    fuera = [sh for sh in shapes
             if (sh.get("opciones") or {}).get("x") is not None
             and (((sh["opciones"].get("x") or 0) + (sh["opciones"].get("w") or 0) > ancho + 0.06)
                  or ((sh["opciones"].get("y") or 0) + (sh["opciones"].get("h") or 0) > alto + 0.06)
                  or (sh["opciones"].get("x") or 0) < -0.06
                  or (sh["opciones"].get("y") or 0) < -0.06)]
    if fuera:
        problemas.append(f"{len(fuera)} elementos se salen del lienzo")
        mejoras.append("reposicionar o reducir esos elementos")

    # 8. Textos encima de textos
    for i, a in enumerate(textos):
        for b in textos[i + 1:]:
            if _solapan(a.get("opciones") or {}, b.get("opciones") or {}):
                problemas.append("hay textos superpuestos")
                mejoras.append("separar las cajas o reducir el cuerpo")
                break
        else:
            continue
        break

    # Firma del layout, para detectar monotonía en el conjunto.
    firma = (len(textos), len(visuales),
             round(sum((sh.get("opciones") or {}).get("y", 0) for sh in textos), 1))
    todas_firmas.append(firma[:2])

    return {
        "indice": slide.get("indice"),
        "arquetipo": slide.get("arquetipo", "?"),
        "palabras": palabras,
        "textos": len(textos),
        "visuales": len(visuales),
        "densidad": round(densidad, 3),
        "tiene_guion": bool((slide.get("notas") or "").strip()),
        "problemas": problemas,
        "mejoras": mejoras,
        "veredicto": ("rehacer" if len(problemas) >= 3
                      else "ajustar" if problemas else "correcta"),
    }


def auditar(plan):
    lienzo = plan.get("lienzo") or {"ancho_in": 13.333, "alto_in": 7.5}
    firmas = []
    slides = [auditar_slide(s, lienzo, firmas) for s in plan.get("slides", [])]

    globales = []
    if firmas:
        repetida, veces = Counter(firmas).most_common(1)[0]
        if veces >= 4 and veces / len(firmas) > 0.55:
            globales.append(
                f"{veces} de {len(firmas)} slides usan la misma composición: "
                f"el deck se siente monótono. Varía los arquetipos.")
    sin_guion = [s["indice"] for s in slides if not s["tiene_guion"]]
    if sin_guion:
        globales.append(f"sin guion del expositor: slides {sin_guion}")
    total = sum(s["palabras"] for s in slides)
    if slides:
        media = total / len(slides)
        if media > MAX_PALABRAS * 0.8:
            globales.append(
                f"media de {media:.0f} palabras por slide: el deck entero está "
                f"cargado de texto")
    return {"slides": slides, "globales": globales,
            "resumen": Counter(s["veredicto"] for s in slides)}


def imprimir(informe, titulo):
    print(f"\nAUDITORÍA — {titulo}\n")
    for s in informe["slides"]:
        icono = {"correcta": "✓", "ajustar": "!", "rehacer": "✗"}[s["veredicto"]]
        print(f"  {icono} slide {s['indice']:>2} ({s['arquetipo']}) · "
              f"{s['palabras']} palabras · {s['textos']} textos · "
              f"{s['visuales']} visuales")
        for p in s["problemas"]:
            print(f"      – {p}")
        for m in dict.fromkeys(s["mejoras"]):
            print(f"      → {m}")
    if informe["globales"]:
        print("\n  DEL CONJUNTO:")
        for g in informe["globales"]:
            print(f"      – {g}")
    r = informe["resumen"]
    print(f"\n  {r.get('correcta', 0)} correctas · {r.get('ajustar', 0)} a ajustar "
          f"· {r.get('rehacer', 0)} a rehacer")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("plan")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    plan = json.loads(Path(args.plan).read_text(encoding="utf-8"))
    informe = auditar(plan)
    if args.json:
        print(json.dumps(informe, ensure_ascii=False, indent=2, default=str))
    else:
        imprimir(informe, plan.get("titulo") or Path(args.plan).stem)


if __name__ == "__main__":
    main()
