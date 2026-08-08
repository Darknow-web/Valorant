/**
 * Los iconos de felicitación y de ánimo son discos perfectos, y ninguno tiene
 * agujeros por dentro.
 *
 * Las dos cosas que comprueba corresponden a los dos defectos reales que había:
 *
 *   - Tres de los quince iconos de felicitación seguían siendo CUADRADOS.
 *   - En el icono final el recorte de fondo se había comido el blanco del
 *     perrito: su cuerpo era transparente, así que sobre el azul marino de la
 *     pantalla de cierre el perro desaparecía.
 *
 * No hace falta navegador: se leen los archivos.
 *
 *   node tests/e2e-iconos.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { RAIZ } from './util.mjs';

const ICONOS = path.join(RAIZ, 'src', 'assets', 'iconos');

// El análisis de píxeles se hace con Pillow, que es lo que usa el script que
// genera los iconos. Si no está, la prueba lo dice en vez de fingir que pasa.
const GUION = `
import json, sys, glob, os
from PIL import Image

problemas = []
revisados = 0

for grupo in ("modulos", "errores"):
    for ruta in sorted(glob.glob(os.path.join(sys.argv[1], grupo, "*.webp"))):
        nombre = f"{grupo}/{os.path.basename(ruta)}"
        im = Image.open(ruta).convert("RGBA")
        ancho, alto = im.size
        alfa = im.getchannel("A").load()
        revisados += 1

        # 1. Las esquinas tienen que estar vacías: si no, sigue siendo un cuadrado.
        margen = max(1, ancho // 40)
        esquinas = [(margen, margen), (ancho-1-margen, margen),
                    (margen, alto-1-margen), (ancho-1-margen, alto-1-margen)]
        opacas = [ (x, y) for x, y in esquinas if alfa[x, y] > 40 ]
        if opacas:
            problemas.append(f"{nombre}: no es redondo, las esquinas siguen pintadas")

        # 2. El centro tiene que estar lleno: es el disco.
        cx, cy = ancho // 2, alto // 2
        if alfa[cx, cy] < 200:
            problemas.append(f"{nombre}: el centro está transparente")

        # 3. Ningún agujero DENTRO del disco. Es la comprobación del perrito:
        #    se recorre el interior del círculo buscando píxeles transparentes.
        radio = ancho / 2
        huecos = 0
        for y in range(0, alto, 2):
            for x in range(0, ancho, 2):
                d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                if d < radio * 0.92 and alfa[x, y] < 128:
                    huecos += 1
        if huecos:
            problemas.append(f"{nombre}: {huecos} punto(s) transparentes dentro del disco")

print(json.dumps({"revisados": revisados, "problemas": problemas}))
`;

if (!fs.existsSync(ICONOS)) {
  console.error(`No encuentro ${ICONOS}`);
  process.exit(1);
}

let resultado;
try {
  const salida = execFileSync('python3', ['-c', GUION, ICONOS], { encoding: 'utf8' });
  resultado = JSON.parse(salida);
} catch (e) {
  console.error('No se pudo analizar los iconos. ¿Está Pillow instalado? (pip install pillow)');
  console.error(String(e.stderr || e.message).split('\n').slice(-3).join('\n'));
  process.exit(1);
}

console.log(`Revisados ${resultado.revisados} iconos de modulos/ y errores/.\n`);

if (resultado.problemas.length === 0) {
  console.log('Todos son discos perfectos y ninguno tiene agujeros por dentro.');
  process.exit(0);
}

for (const p of resultado.problemas) console.log(`  FALLA ${p}`);
console.log(`\n${resultado.problemas.length} problema(s). Corrígelos con: python3 scripts/redondear-iconos.py`);
process.exit(1);
