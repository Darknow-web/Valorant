# Ingesta de documentos

```bash
python3 scripts/extraer_contenido.py informe.docx -o salida
python3 scripts/extraer_contenido.py informe.pdf  -o salida --json
```

Produce `salida/contenido.json`, extrae las imágenes a `salida/img/` e imprime
el mapa de contenido numerado que Carlos usa para elegir.

## Qué detecta

**En `.docx`:** encabezados por estilo (`Heading N`, `Título N`), y si el
documento no usa estilos, por heurística: párrafo corto, sin punto final, en
negrita o con numeración propia (`3.1 Metodología`, `IV. Anexos`). Listas por
estilo o por `numPr`. Tablas completas. Imágenes desde `word/media`.

**En `.pdf`:** el tamaño de fuente más frecuente se toma como cuerpo; lo que lo
supera es encabezado. Tablas con `extract_tables`. Imágenes con PyMuPDF,
descartando las menores de 80 px (suelen ser logos repetidos o artefactos).

**Cifras:** porcentajes, montos (`S/`, `US$`, `€`), multiplicadores, decimales,
enteros de dos o más dígitos y años. Cada una se guarda con su frase, para que
puedas convertirla en un `dato_gigante` con contexto.

## Qué mirar en el mapa antes de seguir

- **`~N slide/s`** es una sugerencia por volumen de texto (una cada ~110
  palabras). El criterio manda: una sección de 300 palabras con una sola idea
  es un slide, no tres.
- **`[N cifras]`** marca las secciones con material para `dato_gigante`,
  `kpis` o `grafico`. Son las que dan los mejores slides.
- **`[N tablas]`** decide entre `tabla` (si hay que poder leerla) y `grafico`
  (si lo que importa es la tendencia). Casi siempre gana el gráfico.
- Las secciones con **0 palabras** son divisores del documento: sirven de
  slide `divisor`, no de contenido.

## Si el mapa sale mal

- **Todo en una sección:** el documento no usa estilos de encabezado y la
  heurística no encontró pistas. Lee `contenido.json` y arma la estructura a
  mano; el mapa es una ayuda, no un requisito.
- **Demasiadas secciones en un PDF:** columnas o encabezados de página
  detectados como títulos. Ignora los espurios al elegir.
- **Tablas partidas en un PDF:** las tablas que cruzan páginas salen en trozos.
  Únelas al escribir el `deck.json`.
- **Sin imágenes:** normal si son vectoriales o si el PDF las trae como
  gráficos de fondo.

El JSON es la fuente; el mapa impreso es solo la vista para decidir. Cuando
algo no cuadre, lee el JSON.
