# Llevar el deck a Canva

## Qué sobrevive y qué no

| Elemento | ¿Sobrevive a la importación? |
|---|---|
| Cuadros de texto | ✅ editables, con su fuente y color |
| Formas, tarjetas, líneas, flechas | ✅ vectoriales y editables |
| Iconos y logos | ✅ como imágenes movibles |
| Gráficos nativos de PowerPoint | ✅ como grupo de formas editables (pierden los datos) |
| Tablas | ✅ |
| GIF / WebM / MP4 incrustados | ✅ **siguen animando** |
| Animaciones OOXML (entradas, énfasis, Morph) | ❌ Canva las descarta |
| Fuentes incrustadas | ⚠️ Canva sustituye por la más parecida de su catálogo |

Por eso el deck lleva **dos capas de animación**: las nativas de PowerPoint
(`animar.py`) y las piezas de medios (`animar_media.cjs`), que son las que
cruzan. Ver `animaciones-canva.md` para reponer el resto en Canva.

## Ruta A — Carga directa (la recomendada)

Entrégale el `.pptx` a Carlos y dile:

> En Canva: **Crear un diseño → Importar archivo** (o arrastra el .pptx a la
> página de inicio). Cada slide entra como página editable.

Dos clics, sin exponer nada, y el resultado es idéntico al de la ruta B.

## Ruta B — `import-design-from-url`

**Solo si el archivo ya está publicado en una URL HTTPS pública** y Carlos
quiere que sea así: por ejemplo un `.pptx` que ya vive en un repositorio
público suyo de GitHub.

```
mcp__Canva__import-design-from-url
  url: https://…/deck.pptx          ← ya pública, no fabricada para esto
  name: "Informe PPP — SuperPet"
  intended_design_type: "presentation"
```

**Nunca** subas su documento a Google Drive, Dropbox, un pastebin ni cualquier
hosting temporal para conseguir esa URL. Eso publica contenido posiblemente
confidencial en internet abierto de forma irreversible, y la herramienta lo
prohíbe explícitamente. Si no hay URL pública previa, usa la Ruta A.

### Variante HTML (mejor fidelidad de páginas)

Canva importa HTML anotado como presentación, respetando páginas y notas:

```bash
node scripts/render_html.cjs salida/deck.plan.json -o salida/canva.html --canva
```

Marca cada slide con `data-document-role="page"`, su título con `data-label` y
el guion con `data-speaker-notes`. Aplica la misma condición: la URL debe ser
ya pública.

## Ruta C — Presentación nativa de Canva

Si Carlos prefiere que la diseñe Canva en vez de importar la nuestra:
`request-outline-review` (él aprueba el esquema en el widget) y después
`generate-design-structured`. Se pierde nuestro sistema de diseño y el control
sobre los arquetipos, pero queda como diseño nativo. Úsala solo si la pide.

## Traer algo de vuelta

`mcp__Canva__export-design` saca el diseño a pptx, pdf, png, jpg, gif o mp4.
Antes hay que llamar a `get-export-formats` con ese diseño: no todos admiten
todos los formatos y adivinar falla.

## Si el conector no responde

El conector Canva puede estar sin autorizar. En ese caso **no se puede
autorizar desde una sesión no interactiva**: hay que hacerlo en
claude.ai → Ajustes → Conectores, y además activarlo para el chat.

Mientras tanto la Ruta A funciona igual de bien y no depende del conector.
