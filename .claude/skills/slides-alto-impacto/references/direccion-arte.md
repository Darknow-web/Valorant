# Dirección de arte

El deck **no elige** un tema de una lista: se le compone uno para su asunto.
Los temas de `assets/temas.json` siguen ahí como puntos de partida cuando
conviene (marca conocida, continuidad con material previo), pero no son el
límite.

## Componer

```bash
node scripts/director_arte.cjs --semilla "#2E6F9E" --modo oscuro \
  --tono tecnico --tratamiento malla --marca-agua "lucide:bar-chart-3" \
  --nombre "Datos" -o salida/tema.json
```

| Parámetro | Qué decide |
|---|---|
| `--semilla` | El color del que nace todo. Elígelo por el asunto, no por gusto |
| `--modo` | `oscuro` (más impacto proyectado) o `claro` (más académico) |
| `--tono` | La pareja tipográfica: `academico`, `editorial`, `tecnico`, `corporativo`, `cercano`, `impacto`, `elegante`, `moderno` |
| `--saturacion` | `baja`, `media`, `alta` |
| `--tratamiento` | El fondo: `plano`, `malla`, `resplandor`, `organico`, `geometrico`, `topografico`, `grano` |
| `--marca-agua` | Un icono que da contexto temático al fondo |

De ahí sale la paleta completa: fondo, superficie, borde, texto, texto suave,
dos acentos, semáforo y seis colores de serie repartidos por el círculo
cromático para que se distingan en un gráfico.

## Elegir la semilla y el tratamiento

No hay tabla que seguir; hay criterio. Algunas correspondencias que funcionan:

| Asunto | Semilla | Modo | Tratamiento | Marca de agua |
|---|---|---|---|---|
| Datos, indicadores, gestión | azul acero | oscuro | `malla` | `lucide:bar-chart-3` |
| Informe académico, tesis | tierra, ocre | claro | `topografico` | `lucide:book-open` |
| Medio ambiente, agro | verde | oscuro | `organico` | `lucide:leaf` |
| Tecnología, sistemas | violeta, cian | claro | `geometrico` | `lucide:cpu` |
| Salud, personas | rojo, coral | oscuro | `resplandor` | `lucide:heart` |
| Corporativo, procesos | cian apagado | claro | `grano` | `lucide:building-2` |

Y cuando el asunto no encaja en ninguna, se compone: lo importante es que el
color diga algo del tema y que el tratamiento no compita con el contenido.

## La legibilidad no se negocia

La estética es libre; el contraste no. Dos redes de seguridad:

1. **Al componer**, cada color se corrige contra el fondo hasta cumplir el
   mínimo WCAG AA — 4.5:1 en texto, 3:1 en texto grande — conservando su tono y
   su saturación. Una semilla imposible no rompe el deck: se ajusta sola.
2. **Contra el fondo real**, no contra el color teórico:

```js
const { ajustarAlFondo } = require("./fondos.cjs");
const { tema, cambios } = await ajustarAlFondo(temaBase,
  { tratamiento: "malla", icono: "lucide:leaf" });
```

Genera el fondo, muestrea el **peor píxel** de cada zona donde va a caer texto
y endurece los colores hasta que cumplen. Verificado sobre 49 combinaciones
(7 paletas × 7 tratamientos): las 49 quedan legibles.

Dos cosas que se aprendieron midiendo, y que están en el código:

- Un halo con un color muy luminoso sobre fondo oscuro crea una zona casi
  blanca donde el texto claro deja de leerse. Ahí **aclarar más el texto
  empeora** las cosas: lo que hay que hacer es atenuar el halo. Por eso la
  opacidad de cada halo se modula según la luminancia de su color.
- Los tratamientos con color van mucho más tenues en modo claro. Al 20% ensucian
  el fondo y se comen el contraste del texto secundario.

## Si ya hay un tema elegido en Canva

Cuando Carlos ya escogió una plantilla, no se compone nada: se lee el diseño con
`read-design`, se sacan sus colores y tipografías del `design_content` y se usan
como tema. El trabajo entonces es de composición, no de color.
