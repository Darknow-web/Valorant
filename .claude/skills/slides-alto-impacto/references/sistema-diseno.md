# Sistema de diseño

Todo sale de `assets/temas.json`. No inventes colores ni tamaños en el
`deck.json`: si algo no encaja, es que el arquetipo está mal elegido.

## Lienzo

16:9 de 13.333 × 7.5 pulgadas (`LAYOUT_WIDE`). Equivale a 1920×1080 px, que es
exactamente el tamaño de presentación de Canva: la importación calza sin
recortes ni bandas.

Márgenes de seguridad: 0.85" a los lados, 0.7" arriba y abajo. Nada de
contenido fuera de ahí.

## La regla anti-texto

El slide **se ve**; el documento **se lee**. Lo que el público tiene que
entender de un vistazo va en la pantalla; lo que hay que explicar va al guion.

- Máximo `limites.palabras_cuerpo_max` del arquetipo (kicker y título no cuentan).
- Máximo 6 palabras por viñeta.
- Un mensaje por slide.
- Si no cabe, **se parte en dos slides**. Nunca se achica la tipografía a mano:
  el motor ya autoajusta los títulos largos y no baja de 13 pt.

## Jerarquía tipográfica

| Nivel | Tamaño | Uso |
|---|---|---|
| `kicker` | 14 pt, mayúsculas, con tracking | La etiqueta de contexto sobre el título |
| `titulo_xl` | 60 pt | Portada, divisores, cierre |
| `titulo` | 40 pt | Título de slide de contenido |
| `dato_xxl` / `dato_xl` | 140 / 96 pt | La cifra protagonista |
| `dato` | 54 pt | Cifras dentro de tarjetas |
| `subtitulo` | 24 pt | Bajada del título |
| `cuerpo` | 20 pt | Texto de tarjetas y viñetas |
| `cuerpo_sm` | 16 pt | Texto secundario |
| `etiqueta` | 13 pt, mayúsculas | Etiquetas dentro de componentes |

**Nunca por debajo de 13 pt.** A 13 pt, proyectado en un salón, ya cuesta leer.

## Color

Cada tema define: `fondo`, `fondo_alt`, `superficie`, `borde`, `texto`,
`texto_suave`, `acento`, `acento2`, `exito`, `alerta`, `peligro` y una `serie`
de 6 colores para gráficos.

- El **acento** es para lo que importa: la cifra, la conclusión, el botón. Si
  todo es acento, nada lo es.
- `texto_suave` para lo secundario. Nunca para el mensaje principal.
- Los colores de gráfico salen de `serie`, en orden. No los elijas a mano.
- El contraste mínimo es 3:1 (WCAG AA para texto grande). `qa.py` lo verifica
  teniendo en cuenta la forma que hay debajo del texto.

### Temas

`cinema` (oscuro, el más vistoso proyectado) · `editorial` (claro, académico) ·
`corporativo` (sobrio) · `vibrante` (marketing) · `bellie` · `superpet` · `upn`.

Los tres últimos tienen `"verificado": false`: son colores de partida, no
confirmados contra el manual de marca. Se editan en un solo sitio —
`assets/temas.json` — y todo el deck los toma de ahí.

## Composición

- **Grid de 2, 3 o 4 columnas** con 0.4" de canal. Los anchos ya están
  calculados en `grid`.
- **Alinea a la izquierda** por defecto. Centrado solo en portada y cierre.
- **Aire.** Un slide con tres cosas bien puestas se ve mejor que uno con seis
  apretadas. El espacio vacío no es espacio desperdiciado.
- **Una sola familia de radios** (`grid.radio` y `radio_grande`) para que las
  tarjetas se vean del mismo sistema.
- Sombras suaves y solo en tarjetas elevadas, nunca en texto.

## Editabilidad — la regla de oro

Cada elemento entra como objeto nativo de PowerPoint:

- Textos como cuadros de texto reales (`isTextBox: true`), nunca rasterizados.
- Formas vectoriales, no imágenes de formas.
- Gráficos con `addChart()`, editables y con sus datos dentro.
- Iconos como imágenes PNG independientes y movibles.

Lo único rasterizado en todo el deck son los iconos, los fondos degradados y
las piezas animadas — y cada uno es un objeto separado que se puede borrar sin
romper nada. Esto es lo que hace que el deck siga siendo editable al 100% en
PowerPoint y al importarlo a Canva.
