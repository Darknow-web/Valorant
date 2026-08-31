---
name: slides-alto-impacto
description: Convierte un documento de Word o PDF (informe de PPP de UPN, reporte de SuperPet, material de Bellie, propuesta, tesis, manual) en una presentación de alto impacto visual — poco texto, muy puntual, con animaciones reales — entregada como .pptx 100% editable, listo para PowerPoint y para importar a Canva, más el guion del expositor. Carlos elige del mapa de contenido qué secciones van a slides y cuántas slides quiere, o le pide al agente que decida por él. Usa esta skill SIEMPRE que Carlos suba o mencione un Word/PDF y pida slides, diapositivas, una presentación, un PPT, un deck, material para exponer o sustentar, o pida "pasar este informe a diapositivas" — incluso si no dice "alto impacto" ni nombra el formato. También cuando pida rehacer o mejorar visualmente una presentación a partir de un documento. No la uses si solo quiere leer o resumir el documento sin producir slides (usa docx o pdf), ni si pide un prompt para Google AI Studio (usa prompt-ai-studio-exposiciones).
---

# Slides de alto impacto desde Word o PDF

Esta skill produce presentaciones que se ven trabajadas por un diseñador y que
**se pueden editar entero** después: cada texto, forma, icono y gráfico entra
como objeto nativo. Nada de slides-imagen.

## Antes de empezar

```bash
bash scripts/setup.sh        # idempotente; una vez por sesión
```

Instala pptxgenjs, sharp, ~250.000 iconos, 3.457 logos de marca, ffmpeg y las
librerías de Python. Todo queda en `.vendor/` y después funciona sin red.

**Rutas:** los comandos de abajo asumen que estás en el directorio de la skill.
Si no, usa rutas absolutas. Los scripts de Node son `.cjs` a propósito — así
funcionan aunque el proyecto declare `"type": "module"`.

---

## El flujo, paso a paso

### Paso 1 — Ingesta

```bash
python3 scripts/extraer_contenido.py <documento.docx|pdf> -o salida
```

Deja `salida/contenido.json` (secciones jerárquicas, párrafos, listas, tablas,
cifras detectadas) y `salida/img/` con las imágenes del documento. Imprime el
mapa de contenido numerado.

### Paso 2 — Que Carlos elija (obligatorio, nunca te lo saltes)

Muéstrale el mapa tal como sale y pregúntale con `AskUserQuestion`:

1. **Qué secciones** — opciones: *(a)* «todo el documento, con tu criterio»,
   *(b)* «yo elijo cuáles», *(c)* «solo lo esencial para 10 minutos».
   Si elige (b), pídele los números; acepta `2,4,5`, rangos `2-6` y `todo`.
2. **Cuántas slides** — auto (una por sección, más las que pidan los datos),
   un número exacto, o un rango.
3. **Tema visual** — de `assets/temas.json`: `cinema` (el más vistoso
   proyectado), `editorial` (académico), `corporativo`, `vibrante`,
   `bellie`, `superpet`, `upn`.

Si Carlos ya dijo en el chat qué quiere ("solo resultados y conclusiones, 8
slides"), no repreguntes: confirma en una línea y sigue.

Los temas `bellie`, `superpet` y `upn` traen colores **de partida sin
verificar** contra el manual de marca. Si el deck sale de la empresa, avísale y
ofrece confirmarlos (para Bellie está la skill `auditor-marca-bellie`).

### Paso 3 — Escribir el deck.json

Este paso es tuyo, no de un script: es donde se decide el deck. Lee
`references/arquetipos-slide.md` y `references/sistema-diseno.md` antes.

Reglas que no se negocian:

- **Un mensaje por slide.** Si una sección tiene dos ideas, son dos slides.
- **El cuerpo del slide no pasa de lo que fija `limites.palabras_cuerpo_max`**
  para su arquetipo. Todo lo demás va a `notas`, que es el guion del expositor.
- **Cada slide lleva `notas`.** Escríbelas como se hablan, no como se leen:
  qué decir mientras esa slide está en pantalla. `qa.py` da error si falta.
- **Toda cifra relevante merece protagonismo.** Un dato importante enterrado en
  un párrafo se convierte en un slide `dato_gigante` o en un `kpis`.
- **Varía los arquetipos.** Tres slides seguidas de viñetas es un deck malo.
- **Iconos por significado**, no de adorno. Búscalos:
  `node scripts/iconos.cjs buscar objetivo meta crecimiento`

Valida contra `assets/deck.schema.json` antes de renderizar.

Muéstrale a Carlos el esquema resultante (una línea por slide: número,
arquetipo, titular) y espera su visto bueno antes del paso 4.

### Paso 4 — Renderizar

```bash
node scripts/build_deck.cjs deck.json -o salida/deck.pptx
```

Produce el `.pptx` y `salida/deck.plan.json`, que es lo que consumen los pasos
siguientes (lleva los `objectName` de cada shape y una copia fiel del layout).

Fuentes incrustadas, para que se vea igual en cualquier PC:

```bash
python3 scripts/fuentes.py incrustar salida/deck.pptx Inter Sora
```

### Paso 5 — Animar (obligatorio, en dos capas)

pptxgenjs no genera animaciones: hay que inyectarlas.

```bash
python3 scripts/animar.py salida/deck.pptx salida/deck.plan.json
node scripts/animar_media.cjs salida/deck.plan.json -o salida/media --formatos gif,webm
```

- `animar.py` escribe las animaciones **nativas de PowerPoint**: transiciones
  (incluida Morph), entradas escalonadas, énfasis, salidas y builds.
- `animar_media.cjs` genera contadores, donas y líneas animadas como GIF/WebM.
  **Esta es la capa que sobrevive a Canva**, que descarta las animaciones
  OOXML al importar. Insértalas como objetos separados encima de su versión
  estática (ver `references/animaciones-canva.md`).

### Paso 6 — QA y entrega

```bash
python3 scripts/qa.py salida/deck.pptx salida/deck.plan.json
node scripts/render_html.cjs salida/deck.plan.json -o salida/vista.html
node scripts/capturar.cjs salida/vista.html -o salida/png --grid
```

**Mira la hoja de contacto con la herramienta Read.** El QA automático no ve
un desborde ni un desequilibrio; tú sí. Si algo se ve mal, corrige el
`deck.json` y vuelve al paso 4.

`qa.py` debe terminar con **0 errores**. Los avisos se juzgan.

Entrega con `SendUserFile`: el `.pptx` y un `guion.md` con las notas por slide.

---

## Extras que Carlos puede pedir

### Mandarlo a Canva

Lee `references/canva.md` completo antes. Lo esencial:

**La ruta por defecto es que Carlos suba el archivo él mismo** en Canva →
*Importar archivo*. Son dos clics y queda 100% editable.

`mcp__Canva__import-design-from-url` **solo sirve si el archivo YA está en una
URL pública**. Nunca subas su documento a Drive, Dropbox ni a un pastebin para
fabricar esa URL: eso publica en internet abierto un informe que puede ser
confidencial, y la propia herramienta lo prohíbe.

Para esa ruta, `render_html.cjs --canva` genera un HTML anotado que Canva
importa como presentación con páginas y notas del expositor.

### Deck interactivo con link de Claude

```bash
node scripts/render_html.cjs salida/deck.plan.json -o salida/deck.html --artifact
```

Navegable con flechas y clic, con animaciones CSS y el guion con la tecla `N`.
Publícalo con la herramienta `Artifact` (carga antes la skill `artifact-design`).

---

## Referencias

| Archivo | Cuándo leerlo |
|---|---|
| `references/arquetipos-slide.md` | Siempre, antes del paso 3 |
| `references/sistema-diseno.md` | Siempre, antes del paso 3 |
| `references/ingesta.md` | Si el documento viene raro o el mapa sale mal |
| `references/animaciones-pptx.md` | Para ajustar animaciones a mano |
| `references/animaciones-canva.md` | Si el destino es Canva |
| `references/biblioteca-visual.md` | Para iconos, logos, ilustraciones, fuentes |
| `references/canva.md` | Para mandarlo a Canva |
| `references/qa.md` | Si `qa.py` da un error que no entiendes |

## Errores que se pagan caro

- Renderizar sin que Carlos haya elegido las secciones.
- Saltarse `animar.py`: el deck queda estático.
- Dar por bueno el deck sin mirar los PNG.
- Meter párrafos del documento tal cual en el slide. El documento se lee; el
  slide se ve. Lo que hay que decir va al guion.
- Cambiar los colores de un tema de marca sin avisar que no están verificados.
