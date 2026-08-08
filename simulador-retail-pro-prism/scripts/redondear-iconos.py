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
GRUPOS = {"modulos": 320, "errores": 512}

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

    if "--revisar" in sys.argv:
        salida = RAIZ / "scripts" / "revision"
        salida.mkdir(exist_ok=True)
        for grupo in GRUPOS:
            hoja_de_contacto(grupo, salida / f"{grupo}-oscuro.png", (6, 6, 67))
            hoja_de_contacto(grupo, salida / f"{grupo}-claro.png", (247, 247, 250))
        print(f"\nHojas de contacto en {salida}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
