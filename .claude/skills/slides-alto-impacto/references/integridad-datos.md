# No inventar nada

Esta es la regla de primer orden de la skill. Está por encima del diseño, del
impacto visual y de que un slide quede bonito.

## La regla

**Ninguna cifra, fecha, nombre, porcentaje o afirmación que no esté en el
documento de origen o que Carlos no haya dicho.** Ni de relleno, ni «de
ejemplo», ni redondeada «para que quede mejor».

Incluye lo que parece inofensivo:

- Sumar dos datos del documento y presentar el total como si estuviera ahí.
  Si el informe dice «7 puntos de protocolo y 4 de estándar», el slide **no**
  puede decir «ficha de 11 puntos» salvo que el documento lo diga.
- Poner el año en un kicker porque queda bien.
- Redondear 62.4% a «más del 60%» sin decir que es una aproximación.
- Rellenar una serie temporal con valores intermedios plausibles.
- Inventar el nombre de una fase, un método o un responsable.

## Cuando falta un dato

Un arquetipo pide cosas que a veces no existen: `dato_gigante` quiere un
`delta`, `grafico` quiere una serie, `timeline` quiere fechas.

**Si el dato no está, se cambia de arquetipo.** No se rellena.

| Falta | Qué hacer |
|---|---|
| El `delta` de una cifra | `dato_gigante` sin `delta` |
| La serie temporal | `dato_gigante` con el valor final, o `comparacion` con inicio y cierre |
| Las fechas de los hitos | `proceso` numerado en vez de `timeline` |
| El valor de un KPI | Quitar esa tarjeta; tres tarjetas ciertas valen más que cuatro con una inventada |

Y si el hueco importa de verdad, se le pregunta a Carlos. Preguntar cuesta un
mensaje; inventar le cuesta la credibilidad delante de un jurado.

## Al rehacer o expandir material existente

Cuando pide «este slide solo tiene un tema, ponle más», los temas nuevos salen
**del material fuente**: otras secciones del documento, otras slides del deck
original, o lo que él diga en el chat. Si el material no da para más, se le
dice: *«el documento solo cubre X; dime qué más quieres que entre»*.

Lo mismo al partir un slide cargado en dos: se reparte lo que hay, no se
inventa relleno para llenar el segundo.

## Lo que sí puede aportar el agente

- **Titulares.** Convertir «El cumplimiento pasó de 62% a 89%» en «27 puntos en
  seis meses» es redacción, no invención: las dos cifras están en la fuente.
- **Estructura.** Decidir que algo es un proceso de cuatro pasos.
- **Interpretación**, marcada como tal. Si el agente concluye algo que el
  documento no dice literalmente, va en el guion con una marca para que Carlos
  la valide o la borre.
- **Diseño entero.** Color, composición, iconos y animación no son datos.

## La comprobación automática

```bash
python3 scripts/verificar_datos.py deck.json salida/contenido.json
```

Recorre las cifras de todo lo **visible** del deck (las notas no cuentan: el
guion puede añadir contexto hablado) y comprueba que cada una exista en el
documento. Entiende que «S/ 1,240» y «S/ 1.240» son la misma cifra, y que «2.0»
y «2» también.

Devuelve código 1 si encuentra una huérfana. `qa.py` la incorpora:

```bash
python3 scripts/qa.py deck.pptx deck.plan.json \
  --deck deck.json --contenido salida/contenido.json
```

Sin `--deck` y `--contenido` avisa de que las cifras van sin verificar. **Pásalos
siempre** cuando el deck venga de un documento.

No es infalible: no detecta una afirmación cualitativa inventada («la principal
causa fue la falta de capacitación») porque no lleva cifras. Contra eso solo
está el criterio, y la costumbre de no escribir nada que no se pueda señalar en
el documento.
