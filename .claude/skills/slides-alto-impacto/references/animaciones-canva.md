# Animaciones en Canva

Canva **descarta todas las animaciones OOXML** al importar un `.pptx`. Los
objetos siguen siendo editables, pero el movimiento no viaja. Hay dos maneras
de recuperarlo.

## Capa 1 — Medios animados (viajan solos)

`scripts/animar_media.cjs` genera piezas animadas de verdad, que Canva conserva
porque son elementos del diseño como cualquier otro. PowerPoint también las
reproduce, así que la misma pieza sirve en los dos lados.

```bash
node scripts/animar_media.cjs salida/deck.plan.json -o salida/media --formatos gif,webm
```

| Pieza | Se genera cuando | Qué hace |
|---|---|---|
| `contador` | el slide tiene `dato.valor` | El número sube desde 0 hasta la cifra |
| `dona` | `kpis` o `embudo` con valores en % | Un anillo que se completa |
| `linea` | gráfico de línea/área con `animar_dibujo: true` | La serie se dibuja sola |

Los cuadros se pintan en Chromium y se compilan con ffmpeg. Salen con fondo
transparente, así que se apoyan sobre el slide sin recuadro.

**Formatos:** `gif` (el más compatible; alfa binario), `webm` (mejor calidad y
alfa real), `mp4` (para PowerPoint si el GIF pesa demasiado).

### Cómo insertarlas

Cada pieza va como **objeto separado, encima de su versión estática**, nunca en
reemplazo. Así, si alguien la borra, debajo sigue estando el texto o la forma
editable. El `media.json` que se genera dice a qué objeto corresponde cada
pieza (campo `objetivo`).

La dona sale **sin el número dentro** a propósito: ese porcentaje es un cuadro
de texto real del slide. Rasterizarlo lo volvería inamovible.

## Capa 2 — Animaciones nativas de Canva

Para lo que no se puede prefabricar. Se aplican en dos clics sobre el diseño ya
importado, y esta es la equivalencia con lo que hace `animar.py`:

| Lo que hace el .pptx | Equivalente en Canva | Dónde |
|---|---|---|
| Entrada `fade` | Elemento → **Desvanecer** | Animar → Desvanecer |
| Entrada `floatIn` | Elemento → **Elevar** | Animar → Elevar |
| Entrada `flyIn` | Elemento → **Panorámica** | Animar → Panorámica, elige dirección |
| Entrada `zoom` | Elemento → **Ampliar** | Animar → Ampliar |
| Entrada `wipe` | Elemento → **Deslizar** | Animar → Deslizar |
| Énfasis `pulso` | **Latido** | Animar → Latido |
| Transición `fade` | Página → **Desvanecer** | Animar → Estilo de página |
| Transición `push` / `wipe` | Página → **Deslizar** | Animar → Estilo de página |
| Transición `morph` | Página → **Transición fluida** | Animar → Transición fluida |
| Entrada escalonada | Aplicar el efecto a cada objeto y ajustar el retardo | Panel Animar → temporización |

**Atajo:** en Canva, aplicar una animación de página con *Aplicar a todas las
páginas* deja el deck entero coherente en un clic. Es lo primero que hay que
decirle a Carlos.

La **Transición fluida** de Canva es el equivalente directo de Morph: entre dos
páginas con elementos parecidos, los interpola. Úsala en los mismos sitios
donde el .pptx lleva `morph`.

## Qué entregar

Junto al archivo, dale a Carlos la lista concreta de su deck: qué animación
aplicar, a qué página y en qué orden. Una tabla de tres columnas (página,
elemento, animación) le ahorra reconstruirlo a ojo.
