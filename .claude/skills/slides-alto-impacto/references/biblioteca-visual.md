# Biblioteca visual

Todo local tras `setup.sh`. En este entorno el proxy bloquea los CDN de
iconos y los bancos de fotos, así que nada depende de la red en tiempo de
ejecución.

## Iconos — ~250.000, offline

```bash
node scripts/iconos.cjs buscar objetivo meta crecimiento
node scripts/iconos.cjs png lucide:target "#38BDF8" salida/icono.png
```

Sets incluidos: `lucide` (trazo limpio, el de casa), `mdi` (el más completo),
`tabler`, `ph` (Phosphor), `carbon` (IBM). Más `simple-icons` con 3.457 logos
de marca bajo el prefijo `si:`.

En el `deck.json` se referencian por id: `"icono": "lucide:target"`,
`"icono": "si:instagram"`.

**Si el id no existe, no se rompe nada**: el script busca el más parecido y
avisa. Pasa seguido — en lucide el icono es `circle-check`, no `check-circle`.
Aun así, búscalo antes: el fallback acierta, pero no siempre elige el mejor.

**Criterio:** un icono por idea, del mismo set en todo el deck, y siempre con
significado. Un icono decorativo es ruido. Se recolorean solos al acento del
tema o al color de la serie.

## Logos de marca

`si:` cubre casi cualquier empresa o tecnología reconocible: `si:instagram`,
`si:whatsapp`, `si:shopify`, `si:woocommerce`, `si:google`. Son formas
sólidas, así que se ven bien a un solo color.

## Tipografías

```bash
python3 scripts/fuentes.py descargar Inter Sora
python3 scripts/fuentes.py incrustar salida/deck.pptx Inter Sora
```

Google Fonts sí es accesible. Se descarga solo el subconjunto latino (3 pesos)
y se incrusta en el `.pptx`, así el deck se ve igual en cualquier PC aunque no
tenga la fuente instalada.

Cada tema declara su `fuente_titulo` y `fuente_cuerpo`. Incrusta siempre esas
dos, no más: cada familia suma peso al archivo.

## Imágenes

Por orden de preferencia:

1. **Las del propio documento.** `extraer_contenido.py` las deja en
   `salida/img/`. Son las más pertinentes y ya son suyas.
2. **Fondos y degradados generados.** `build_deck.cjs` los compone con `sharp`
   a partir de los colores del tema (pptxgenjs no soporta rellenos
   degradados, por eso van como imagen).
3. **Ilustraciones vectoriales** desde repositorios públicos de GitHub
   (unDraw y similares), que sí es accesible.
4. **Fotos que suba Carlos.**

**No hay banco de fotos de stock.** Unsplash, Pexels y Wikimedia están
bloqueados por la política de salida de la organización; no se puede rodear.
Si un slide pide una foto de verdad, pídesela a Carlos. Levantar ese bloqueo
depende del administrador de la organización.

En la práctica se nota poco: para slides de alto impacto, tipografía grande +
iconos + color + espacio funcionan mejor que una foto de stock genérica.

## Gráficos

Nativos de PowerPoint (`addChart`), con los colores de `serie` del tema y el
marco silenciado: sin título de gráfico (el título es el del slide), sin
leyenda si hay una sola serie, ejes en `texto_suave` y rejilla tenue.

Trampas de pptxgenjs que ya están resueltas en `build_deck.cjs` pero conviene
conocer si se toca:

- Los colores van **sin `#`** y sin canal alfa: `"38BDF8"`. Con `#` o con 8
  dígitos, el archivo se corrompe.
- En barras apiladas, `dataLabelPosition: "outEnd"` **corrompe el archivo**;
  hay que usar `ctr`, `inEnd` o `inBase`.
- Un combo con eje secundario necesita `valAxes` **y** `catAxes` con dos
  entradas cada uno, o PowerPoint descarta el gráfico.
- pptxgenjs **muta los objetos que recibe**. Nunca compartas un objeto de
  opciones entre dos llamadas, y clona los datos antes si los vas a reutilizar.
