# slides-alto-impacto

Agente que convierte un Word o PDF en una presentación de alto impacto:
`.pptx` 100% editable, con animaciones reales, listo para PowerPoint y para
importar a Canva, más el guion del expositor.

## Instalar en la cuenta de Claude

Esta skill vive en el repositorio, así que funciona en cualquier sesión que lo
tenga. Para tenerla disponible en **todas** las sesiones (como el resto de
skills propias), súbela desde la app de Claude:

**Ajustes → Capacidades → Skills → Subir skill**, y elige la carpeta
`.claude/skills/slides-alto-impacto/`.

Sube la carpeta **sin `.vendor/`** (son ~500 MB de dependencias que
`setup.sh` reinstala solo).

## Uso

Basta con pedirlo en lenguaje natural:

> «Toma este informe y hazme slides para sustentar el viernes»

La skill pide el documento, muestra el mapa de contenido, pregunta qué
secciones y cuántas slides, y entrega el `.pptx` con su guion.

## Estructura

```
SKILL.md                  el flujo de 6 pasos
references/               cómo decidir cada cosa
scripts/setup.sh          instala todo (una vez por sesión)
scripts/extraer_contenido.py   docx/pdf → mapa de contenido
scripts/build_deck.cjs    deck.json → deck.pptx
scripts/animar.py         animaciones nativas de PowerPoint
scripts/animar_media.cjs  GIF/WebM que sobreviven a Canva
scripts/render_html.cjs   vista previa · artifact interactivo · HTML para Canva
scripts/capturar.cjs      PNG de cada slide (QA visual)
scripts/iconos.cjs        ~250.000 iconos y 3.457 logos, offline
scripts/fuentes.py        Google Fonts descargadas e incrustadas
scripts/qa.py             control de calidad
assets/temas.json         temas, tipografía, grid y límites
assets/deck.schema.json   contrato del deck.json
```

## Nota sobre los temas de marca

`bellie`, `superpet` y `upn` traen colores **de partida sin verificar** contra
el manual de marca. Antes de usarlos en algo que salga de la empresa,
confírmalos y edítalos en `assets/temas.json` — todo el deck los toma de ahí.
