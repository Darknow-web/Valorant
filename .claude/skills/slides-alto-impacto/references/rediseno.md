# Mejorar una presentación que ya existe

Tres vías de entrada, un mismo método: **verla, medirla, decidir y rehacer**.

## 1. Un `.pptx` que sube Carlos

```bash
python3 scripts/leer_pptx.py presentacion.pptx -o salida/original
node scripts/render_html.cjs salida/original/deck.plan.json -o salida/original/vista.html
node scripts/capturar.cjs salida/original/vista.html -o salida/original/png --grid
python3 scripts/auditar.py salida/original/deck.plan.json
```

`leer_pptx.py` reconstruye la presentación al formato de shapes de la skill, así
que se puede **ver** con el mismo renderizador. Aquí LibreOffice no convierte
`.pptx`, así que es la única forma de mirarla.

**La reconstrucción es aproximada, no un render exacto.** Se pierden:
transparencias, colores heredados del tema del archivo, gráficos (salen como un
bloque gris) y rellenos de celda. Sirve para juzgar densidad, composición,
jerarquía y exceso de texto — que es lo que importa. Para el detalle fino, mira
también el texto que devuelve el propio `deck.plan.json`.

## 2. Un link de un diseño de Canva

```
mcp__Canva__read-design  design_id: <url o id>
  filter: { fields: ["design_metadata","design_content","presenter_notes","thumbnails"] }
```

Aquí la lectura es **exacta**: Canva devuelve cada elemento con su geometría,
color y tipografía, más las miniaturas reales. Se puede corregir en el sitio
con `edit-design` (ver `canva-directo.md`) o rehacer el deck entero.

## 3. Capturas o PDF

Se miran directamente con Read. El contenido hay que transcribirlo, así que
conviene pedirle a Carlos el archivo original si lo tiene.

---

## Qué mide el auditor

```bash
python3 scripts/auditar.py deck.plan.json
```

Por slide: palabras en pantalla, párrafos demasiado largos, tipografía por
debajo de 14 pt, contraste, número de cajas de texto, densidad, ausencia de
apoyo visual, elementos fuera del lienzo y textos superpuestos. Del conjunto:
monotonía de composición, slides sin guion y carga media de texto.

Cada slide sale como **correcta**, **a ajustar** o **a rehacer**, con lo que le
pasa y qué hacer.

El auditor mide; el juicio visual es tuyo. **Mira siempre las capturas**: un
slide puede pasar todas las métricas y verse desequilibrado.

---

## Las cuatro peticiones típicas

### «Tiene mucho texto»

1. Lee el slide entero y localiza **el mensaje**: la frase que el público debe
   recordar.
2. Ese mensaje es el titular. Todo lo demás baja al guion.
3. Busca en el texto lo que se puede dibujar: una cifra que destaque, dos
   estados que comparar, pasos que numerar.
4. Elige el arquetipo (`arquetipos-slide.md`) y reconstruye.

Si el slide tiene dos ideas, salen dos slides. No hay premio por comprimir.

### «Hazlo más visual»

Busca en el texto lo que ya está pidiendo un visual:

| Si el texto dice… | Va a |
|---|---|
| una cifra que resume | `dato_gigante` |
| tres o cuatro indicadores | `kpis` |
| «antes… ahora…», «en vez de…» | `comparacion` |
| «primero… luego… finalmente…» | `proceso` |
| una serie de meses o años | `grafico` |
| ideas paralelas del mismo rango | `tarjetas` |
| una frase que vale sola | `cita` |

Y añade dirección de arte: `director_arte.cjs` para la paleta, `fondos.cjs`
para el fondo y la marca de agua temática.

### «Este slide solo tiene un tema, quiero más»

Los temas nuevos **salen del material fuente**, no de la imaginación
(`integridad-datos.md`). Mira el resto del documento o del deck original, y
propón: *«además de X, el documento cubre Y y Z; ¿los meto?»*. Si no hay más
material, dilo y pídeselo.

### «Mejóralo pero mantén el diseño»

Conserva paleta, tipografía y estructura de marca; corrige solo composición,
densidad y jerarquía. Si el deck viene de Canva, `edit-design` permite
arreglarlo en el sitio sin rehacerlo: `replace_text` para acortar,
`format_text` para la jerarquía, `delete_element` para lo que sobra,
`position_element` y `resize_element` para el aire.

---

## Antes de entregar

Pásale al deck rehecho el mismo listón que a uno nuevo: `qa.py` con 0 errores,
`verificar_datos.py` si hay un documento de origen, y la revisión visual de las
capturas. Y enséñale a Carlos el antes y el después: la hoja de contacto de la
versión original junto a la nueva explica el trabajo mejor que cualquier lista.
