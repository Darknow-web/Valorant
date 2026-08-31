---
name: slides-alto-impacto
description: Crea presentaciones de alto impacto visual — poco texto, muy puntuales, con animaciones reales — a partir de un documento de Word o PDF, y también corrige y rehace presentaciones que ya existen en PowerPoint o Canva (quitarles texto de más, volverlas visuales, expandir un slide a más temas). Entrega el deck creado directamente en la cuenta de Canva con su link, más el .pptx 100% editable y el guion del expositor. Sirve sobre todo para trabajos de universidad — sustentaciones, exposiciones de curso, informes de PPP de UPN — y también para material de trabajo de SuperPet o Bellie. Carlos elige del mapa de contenido qué secciones van a slides y cuántas quiere, o le pide al agente que decida. Usa esta skill SIEMPRE que Carlos suba o mencione un Word, PDF, PowerPoint o diseño de Canva y pida slides, diapositivas, una presentación, un deck, material para exponer o sustentar, o pida mejorar, rehacer, "quitarle texto" o "hacer más visual" algo que ya tiene — incluso si no dice "alto impacto" ni nombra el formato. No la uses si solo quiere leer o resumir un documento sin producir slides (usa docx o pdf), ni si pide un prompt para Google AI Studio (usa prompt-ai-studio-exposiciones).
---

# Slides de alto impacto

Dos trabajos: **crear** una presentación desde un documento, y **arreglar** una
que ya existe. El resultado se entrega creado en Canva (con su link) y como
`.pptx` editable.

## Antes de nada

```bash
bash scripts/setup.sh        # idempotente, una vez por sesión
```

Los scripts de Node son `.cjs` a propósito: así funcionan aunque el proyecto
declare `"type": "module"`.

---

## Regla de primer orden: no inventar nada

**Ninguna cifra, fecha, nombre o afirmación que no esté en el documento de
origen o que Carlos no haya dicho.** Ni de relleno, ni «de ejemplo», ni
redondeada para que quede mejor. Sumar dos datos del documento y presentar el
total como si estuviera ahí también es inventar.

Si un arquetipo pide un dato que no existe, **se cambia de arquetipo**. Si el
hueco importa, se le pregunta a Carlos.

Lee `references/integridad-datos.md` — es la referencia más importante de esta
skill — y verifica siempre:

```bash
python3 scripts/verificar_datos.py deck.json salida/contenido.json
```

---

# A. Crear desde un documento

### 1. Ingesta

```bash
python3 scripts/extraer_contenido.py <documento.docx|pdf> -o salida
```

### 2. Que Carlos elija (obligatorio)

Muéstrale el mapa de contenido y pregúntale con `AskUserQuestion`:

1. **Qué secciones** — «todo con tu criterio», «yo elijo» (acepta `2,4,5`,
   rangos `2-6`, `todo`), o «solo lo esencial para N minutos».
2. **Cuántas slides** — auto, un número exacto o un rango.
3. **Contexto de la exposición** — curso y jurado si es de universidad, o
   audiencia si es de trabajo. Esto decide el tono, no un formulario.

Si ya lo dijo en el chat, confírmalo en una línea y sigue.

### 3. Dirección de arte

**No elijas un tema de una lista.** Compón uno para el asunto del documento:

```bash
node scripts/director_arte.cjs --semilla "#2E6F9E" --modo oscuro \
  --tono academico --tratamiento topografico --marca-agua "lucide:book-open" \
  -o salida/tema.json
```

Elige el color, el tratamiento de fondo y la marca de agua **por el tema**, con
criterio propio: un informe de sostenibilidad no se ve como un pitch comercial.
Lee `references/direccion-arte.md`.

Dos excepciones:
- **Si Carlos ya eligió un tema o una plantilla de Canva**, léelo con
  `read-design` y usa sus colores y tipografías. No compongas otro.
- Si pide continuidad con material anterior, parte de `assets/temas.json`.

Ajusta los colores contra el fondo real antes de renderizar:

```js
const { ajustarAlFondo } = require("./scripts/fondos.cjs");
const { tema } = await ajustarAlFondo(temaBase, { tratamiento, icono });
```

### 4. Escribir el deck.json

Este paso es tuyo. Lee `references/arquetipos-slide.md` y
`references/sistema-diseno.md` antes.

- **Un mensaje por slide.** Dos ideas son dos slides.
- **El cuerpo no pasa del tope del arquetipo.** Lo demás va al guion.
- **Cada slide lleva `notas`**, escritas como se hablan.
- **Toda cifra importante merece protagonismo**, y toda cifra del deck tiene que
  estar en el documento.
- **Varía los arquetipos.** Tres slides seguidas de viñetas es un deck malo.
- Busca los iconos: `node scripts/iconos.cjs buscar objetivo meta crecimiento`

Muéstrale el outline (una línea por slide) y espera su visto bueno.

### 5. Renderizar y animar

```bash
node scripts/build_deck.cjs deck.json -o salida/deck.pptx
python3 scripts/fuentes.py incrustar salida/deck.pptx <familias del tema>
python3 scripts/animar.py salida/deck.pptx salida/deck.plan.json
node scripts/animar_media.cjs salida/deck.plan.json -o salida/media --formatos gif,webm
```

`animar.py` es obligatorio: pptxgenjs no genera animaciones. `animar_media.cjs`
crea las piezas que sobreviven a Canva.

### 6. QA

```bash
python3 scripts/qa.py salida/deck.pptx salida/deck.plan.json \
  --deck deck.json --contenido salida/contenido.json
node scripts/render_html.cjs salida/deck.plan.json -o salida/vista.html
node scripts/capturar.cjs salida/vista.html -o salida/png --grid
```

**Mira la hoja de contacto con Read.** El QA automático no ve un desequilibrio;
tú sí. `qa.py` debe terminar con **0 errores**.

### 7. Entregar

1. **Crear el deck en Canva** y darle el link — ruta por defecto. Sigue
   `references/canva-directo.md`.
2. El `.pptx` y el `guion.md` con `SendUserFile`.
3. La lista de animaciones de Canva (`references/animaciones-canva.md`).

---

# B. Arreglar una presentación existente

Sigue `references/rediseno.md`. En resumen:

| Entrada | Cómo se lee |
|---|---|
| `.pptx` que sube | `python3 scripts/leer_pptx.py archivo.pptx -o salida/original` y se dibuja con el renderizador |
| Link de Canva | `read-design` con `design_content`, `presenter_notes` y `thumbnails` |
| Capturas o PDF | Se miran directamente |

Después:

```bash
python3 scripts/auditar.py salida/original/deck.plan.json
```

Da un veredicto por slide (correcta / a ajustar / a rehacer) con lo que le pasa
y qué hacer. **Mira también las capturas.**

Enséñale el diagnóstico antes de rehacer nada, y al entregar pon el antes y el
después uno al lado del otro.

Cuando pida más temas en un slide, salen del material fuente. Si no hay más,
díselo y pídeselo.

---

## Referencias

| Archivo | Cuándo |
|---|---|
| `references/integridad-datos.md` | **Siempre.** Es la regla que no se rompe |
| `references/arquetipos-slide.md` | Antes de escribir el deck |
| `references/sistema-diseno.md` | Antes de escribir el deck |
| `references/direccion-arte.md` | Para componer la paleta y el fondo |
| `references/rediseno.md` | Para arreglar material existente |
| `references/canva-directo.md` | Para crear el deck en Canva (por defecto) |
| `references/canva.md` | Para la ruta alternativa por importación |
| `references/animaciones-pptx.md` | Para ajustar animaciones de PowerPoint |
| `references/animaciones-canva.md` | Para las animaciones en Canva |
| `references/biblioteca-visual.md` | Iconos, logos, ilustraciones, fuentes |
| `references/ingesta.md` | Si el documento viene raro |
| `references/qa.md` | Si `qa.py` da un error que no entiendes |

## Deck interactivo (opcional)

```bash
node scripts/render_html.cjs salida/deck.plan.json -o salida/deck.html --artifact
```

Navegable con flechas, con animaciones CSS y el guion con la tecla `N`.
Publícalo con `Artifact` (carga antes la skill `artifact-design`).

## Errores que se pagan caro

- Inventar un dato. Es el único error que no tiene arreglo después.
- Renderizar sin que Carlos haya elegido las secciones.
- Elegir un tema de la lista en vez de componer uno para el asunto.
- Saltarse `animar.py`: el deck queda estático.
- Dar por bueno el deck sin mirar los PNG.
- Meter párrafos del documento tal cual. El documento se lee; el slide se ve.
