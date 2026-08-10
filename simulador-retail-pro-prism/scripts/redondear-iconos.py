#!/usr/bin/env python3
"""
Deja todos los iconos de felicitación y de ánimo como discos perfectos.

POR QUÉ EXISTE
--------------
Los iconos originales venían con fondo cuadrado y se recortaron con un
"flood-fill" desde los bordes. Eso dejó dos problemas:

  1. Tres de los quince iconos de felicitación seguían siendo cuadrados
     (su fondo no era uniforme, así que el relleno no lo alcanzó), y otros
     dos conservaban trozos de esquina.
  2. En el icono final (modulos/8) el relleno se comió el BLANCO DEL PERRITO:
     su cuerpo quedó transparente. Sobre el fondo azul marino de la pantalla
     de cierre el perro desaparecía y solo se veía su contorno.

Este script arregla los dos de una vez: pinta un disco opaco DEBAJO del icono
—lo que devuelve el relleno a los huecos que el flood-fill se comió— y después
recorta el resultado en círculo.

CÓMO SE USA
-----------
    python3 scripts/redondear-iconos.py            # procesa y sobrescribe
    python3 scripts/redondear-iconos.py --revisar  # además deja hojas de contacto

Es una herramienta de mantenimiento, no parte del build: se ejecuta a mano
cuando se agregan iconos nuevos. Requiere Pillow (`pip install pillow`).
"""

from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
ICONOS = RAIZ / "src" / "assets" / "iconos"

# Solo los badges circulares. `portadas/` queda fuera a propósito: son
# ilustraciones de línea sobre transparente, ya se ven homogéneas entre sí y
# recortarlas en círculo les cortaría las patas y los detalles que salen del marco.
# `historia/` también queda fuera: son escenas apaisadas, no discos.
GRUPOS = {"modulos": 320, "errores": 512}

# Los personajes van por su cuenta. Ya vienen dibujados como un círculo sobre un
# cuadrado blanco, así que no hay que encogerlos como a un badge cuadrado; lo que
# hay que hacer es lo contrario, quitarles el margen blanco. Y cada uno traía el
# suyo —del 4% al 10%—, con lo que en la rejilla de elección se veían de tamaños
# distintos aunque el dibujo fuera del mismo tamaño.
PERSONAJES = {"personajes": 512}

# Margen que se les deja alrededor del dibujo, ya normalizados. Un pelo de aire
# para que el borde del círculo no quede pegado al filo del recorte.
MARGEN_PERSONAJE = 0.02

# Con cuánta resolución extra se trabaja antes de volver al tamaño final. El
# borde del círculo se dibuja aquí y se reduce después: así queda suave sin
# tener que difuminar la máscara.
SUPERMUESTREO = 4

# Un píxel cuenta como "hay algo aquí" a partir de esta opacidad.
UMBRAL_ALFA = 32


def color_de_fondo(im: Image.Image) -> tuple[int, int, int, int]:
    """
    El color que más se repite en el borde: el fondo del icono.

    Se mira solo el TERCIO CENTRAL de cada lado. Varios iconos llevan un adorno
    pegado a una esquina (el cuarto de círculo rojo y el amarillo del icono 6),
    y mirando el borde entero ese adorno ganaba la votación: el disco salía
    amarillo cuando el fondo real era blanco.
    """
    ancho, alto = im.size
    pixeles = im.load()
    dx0, dx1 = ancho // 3, ancho * 2 // 3
    dy0, dy1 = alto // 3, alto * 2 // 3
    borde = []
    for x in range(dx0, dx1, 2):
        borde.append(pixeles[x, 0])
        borde.append(pixeles[x, alto - 1])
    for y in range(dy0, dy1, 2):
        borde.append(pixeles[0, y])
        borde.append(pixeles[ancho - 1, y])
    opacos = [p for p in borde if p[3] > 200]
    if not opacos:
        return (255, 255, 255, 255)
    return Counter(opacos).most_common(1)[0][0]


def es_fondo_lleno(im: Image.Image) -> bool:
    """
    ¿El icono trae un fondo que ocupa todo el lienzo (o sea, es un cuadrado)?

    Se mira solo las cuatro esquinas, que es justo lo que sobra de un cuadrado
    y lo que falta en uno que ya es redondo.
    """
    ancho, alto = im.size
    alfa = im.getchannel("A").load()
    margen = max(2, ancho // 12)
    esquinas = [
        (0, 0), (ancho - 1, 0), (0, alto - 1), (ancho - 1, alto - 1),
        (margen, margen), (ancho - 1 - margen, margen),
        (margen, alto - 1 - margen), (ancho - 1 - margen, alto - 1 - margen),
    ]
    opacas = sum(1 for x, y in esquinas if alfa[x, y] > 200)
    return opacas >= len(esquinas) / 2


def radio_del_contenido(im: Image.Image) -> float:
    """Distancia del centro al píxel visible más lejano."""
    ancho, alto = im.size
    alfa = im.getchannel("A").load()
    cx, cy = (ancho - 1) / 2, (alto - 1) / 2
    lejano = 0.0
    for y in range(alto):
        for x in range(ancho):
            if alfa[x, y] > UMBRAL_ALFA:
                d = (x - cx) ** 2 + (y - cy) ** 2
                if d > lejano:
                    lejano = d
    return lejano ** 0.5


def redondear(ruta: Path, lado: int) -> str:
    original = Image.open(ruta).convert("RGBA")
    lleno = es_fondo_lleno(original)

    # Un icono que YA es un disco que llena su lienzo se deja en paz.
    #
    # Sin esto el script no era idempotente: al no quedar fondo cuadrado, el
    # cálculo de abajo le aplicaba otra vez el ×0.98 de margen, así que cada
    # pasada encogía todos los badges un 2% más. Se descubrió al añadir los
    # personajes, cuando una pasada de rutina retocó los 32 iconos ya buenos.
    if not lleno and radio_del_contenido(original) >= (original.size[0] / 2) * 0.97:
        return "ya normalizado (sin tocar)"

    if lleno:
        # Fondo cuadrado: el disco se pinta con el color del propio fondo y el
        # dibujo se encoge un poco, para que al recortar el círculo no se pierda
        # nada de lo que estaba pegado a los bordes.
        disco = color_de_fondo(original)
        escala = 0.82
        nota = "cuadrado → disco"
    else:
        # Fondo ya transparente. El disco va en blanco: eso es lo que rellena los
        # huecos que el flood-fill dejó dentro del dibujo (el perrito del 8).
        disco = (255, 255, 255, 255)
        radio = radio_del_contenido(original)
        limite = (original.size[0] / 2) * 0.98
        escala = min(1.0, limite / radio) if radio > 0 else 1.0
        nota = "ajustado" if escala < 0.999 else "sin recorte"

    grande = lado * SUPERMUESTREO
    mascara = Image.new("L", (grande, grande), 0)
    ImageDraw.Draw(mascara).ellipse([0, 0, grande - 1, grande - 1], fill=255)

    lienzo = Image.new("RGBA", (grande, grande), (0, 0, 0, 0))
    lienzo.paste(Image.new("RGBA", (grande, grande), disco), (0, 0), mascara)

    dibujado = max(1, int(round(grande * escala)))
    arte = original.resize((dibujado, dibujado), Image.LANCZOS)
    desplace = (grande - dibujado) // 2
    lienzo.alpha_composite(arte, (desplace, desplace))

    lienzo.putalpha(mascara)
    lienzo.resize((lado, lado), Image.LANCZOS).save(ruta, "WEBP", quality=82, method=6)
    return f"{nota} ×{escala:.2f}"


def recortar_al_contenido(im: Image.Image, fondo: tuple[int, int, int, int]) -> Image.Image:
    """
    Quita el marco de fondo y deja el dibujo centrado en un cuadrado.

    Los personajes vienen como un círculo dibujado sobre un cuadrado blanco, pero
    con márgenes distintos entre sí. Sin esto, en la rejilla de elección unos se
    ven claramente más grandes que otros.
    """
    lado_original = im.size[0]
    # Máscara de "esto no es fondo", con tolerancia: el blanco del archivo no es
    # exactamente 255 en todos los píxeles por la compresión del original.
    base = Image.new("RGBA", im.size, fondo)
    diferencia = Image.new("L", im.size, 0)
    px_im, px_base, px_dif = im.load(), base.load(), diferencia.load()
    for y in range(lado_original):
        for x in range(lado_original):
            r, g, b, a = px_im[x, y]
            R, G, B, _ = px_base[x, y]
            if a > UMBRAL_ALFA and abs(r - R) + abs(g - G) + abs(b - B) > 24:
                px_dif[x, y] = 255

    caja = diferencia.getbbox()
    if not caja:
        return im

    # Cuadrado centrado en el contenido: recortar por la caja a secas deformaría
    # a los que no están perfectamente centrados en su lienzo.
    x0, y0, x1, y1 = caja
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    medio = max(x1 - x0, y1 - y0) / 2
    medio = medio / (1 - 2 * MARGEN_PERSONAJE)
    izq, arr = int(round(cx - medio)), int(round(cy - medio))
    lado = int(round(medio * 2))

    recorte = Image.new("RGBA", (lado, lado), fondo)
    recorte.alpha_composite(im, (-izq, -arr))
    return recorte


def redondear_personaje(ruta: Path, lado: int) -> str:
    """
    Un avatar: se le quita el marco blanco y se recorta en círculo.

    Es idempotente a propósito: volver a pasar el script no encoge el dibujo un
    poco más cada vez. Un personaje ya procesado tiene las esquinas
    transparentes, y en ese caso solo se le vuelve a aplicar la máscara.
    """
    original = Image.open(ruta).convert("RGBA")
    if es_fondo_lleno(original):
        original = recortar_al_contenido(original, color_de_fondo(original))
        nota = "recortado al dibujo"
    else:
        nota = "ya normalizado"

    grande = lado * SUPERMUESTREO
    mascara = Image.new("L", (grande, grande), 0)
    ImageDraw.Draw(mascara).ellipse([0, 0, grande - 1, grande - 1], fill=255)

    lienzo = Image.new("RGBA", (grande, grande), (0, 0, 0, 0))
    lienzo.alpha_composite(original.resize((grande, grande), Image.LANCZOS))
    lienzo.putalpha(mascara)
    lienzo.resize((lado, lado), Image.LANCZOS).save(ruta, "WEBP", quality=86, method=6)
    return nota


def hoja_de_contacto(grupo: str, destino: Path, fondo: tuple[int, int, int]) -> None:
    archivos = sorted(
        (ICONOS / grupo).glob("*.webp"),
        key=lambda p: int("".join(c for c in p.stem if c.isdigit()) or 0),
    )
    columnas, celda = 5, 200
    filas = (len(archivos) + columnas - 1) // columnas
    hoja = Image.new("RGB", (columnas * celda, filas * (celda + 20)), fondo)
    dibujo = ImageDraw.Draw(hoja)
    for i, archivo in enumerate(archivos):
        im = Image.open(archivo).convert("RGBA")
        im.thumbnail((celda - 12, celda - 12), Image.LANCZOS)
        x, y = (i % columnas) * celda, (i // columnas) * (celda + 20)
        hoja.paste(im, (x + (celda - im.width) // 2, y + (celda - im.height) // 2), im)
        dibujo.text((x + 6, y + celda + 4), archivo.name, fill=(150, 150, 160))
    hoja.save(destino)


def main() -> int:
    if not ICONOS.is_dir():
        print(f"No encuentro {ICONOS}", file=sys.stderr)
        return 1

    for grupo, lado in GRUPOS.items():
        carpeta = ICONOS / grupo
        archivos = sorted(carpeta.glob("*.webp"), key=lambda p: p.name)
        print(f"\n{grupo}/ ({len(archivos)} iconos)")
        for archivo in archivos:
            print(f"  {archivo.name:<10} {redondear(archivo, lado)}")

    for grupo, lado in PERSONAJES.items():
        carpeta = ICONOS / grupo
        if not carpeta.is_dir():
            continue
        archivos = sorted(carpeta.glob("*.webp"), key=lambda p: p.name)
        print(f"\n{grupo}/ ({len(archivos)} avatares)")
        for archivo in archivos:
            print(f"  {archivo.name:<10} {redondear_personaje(archivo, lado)}")

    if "--revisar" in sys.argv:
        salida = RAIZ / "scripts" / "revision"
        salida.mkdir(exist_ok=True)
        for grupo in {**GRUPOS, **PERSONAJES}:
            hoja_de_contacto(grupo, salida / f"{grupo}-oscuro.png", (6, 6, 67))
            hoja_de_contacto(grupo, salida / f"{grupo}-claro.png", (247, 247, 250))
        print(f"\nHojas de contacto en {salida}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
