# Catálogo de arquetipos

16 layouts. Cada uno resuelve **un tipo de mensaje**. Elegir bien el arquetipo
es el 80% de que el slide se vea bien; el otro 20% es no meterle texto de más.

Las coordenadas están en `scripts/build_deck.cjs`. Aquí va cuándo usar cada uno.

## Estructura

| Arquetipo | Para qué | Campos que usa | Tope de palabras |
|---|---|---|---|
| `portada` | Abrir. El titular debe ser la conclusión, no el tema | `kicker`, `titulo`, `subtitulo`, `icono` | 14 |
| `divisor` | Separar bloques. Da respiro y orienta | `kicker`, `titulo` | 6 |
| `cierre` | Cerrar con la acción concreta | `titulo`, `subtitulo`, `conclusion` (botón) | 22 |

## Datos

| Arquetipo | Para qué | Campos | Tope |
|---|---|---|---|
| `dato_gigante` | UNA cifra que lo dice todo | `dato{valor,unidad,etiqueta,delta,tendencia}`, `conclusion` | 30 |
| `kpis` | 3-4 indicadores en fila | `items[{titulo,valor,icono}]` | 28 |
| `grafico` | Evolución o comparación numérica | `grafico{tipo,categorias,series,sufijo}`, `conclusion` | 26 |
| `tabla` | Detalle que hay que poder leer | `tabla{encabezado,filas,resaltar_columna}` | 50 |
| `embudo` | Etapas que van perdiendo volumen | `items[{titulo,valor}]` | 24 |

**Regla de los gráficos:** un gráfico sin `conclusion` es un gráfico que el
público tiene que interpretar solo. Escribe siempre qué hay que ver en él.

## Comparación y estructura

| Arquetipo | Para qué | Campos | Tope |
|---|---|---|---|
| `comparacion` / `antes_despues` | Dos estados, dos opciones | `items[2]{titulo,valor,texto}` | 34 |
| `matriz` | Cuatro cuadrantes, priorización | `items[4]{titulo,texto}` | 36 |
| `tarjetas` | 3-4 ideas paralelas con icono | `items[{titulo,texto,icono}]` | 40 |

## Secuencia

| Arquetipo | Para qué | Campos | Tope |
|---|---|---|---|
| `proceso` | Pasos numerados de un método | `items[{titulo,texto,icono}]` | 40 |
| `timeline` | Hitos en el tiempo | `items[{fecha,titulo}]` | 30 |

## Texto

| Arquetipo | Para qué | Campos | Tope |
|---|---|---|---|
| `cita` | Una frase que se quede | `titulo` (la frase), `subtitulo` (autor) | 26 |
| `bullets` | Último recurso. 4-5 puntos cortos | `items[{titulo}]`, `imagen` | 32 |

`bullets` es el arquetipo por defecto cuando nada encaja, y casi siempre hay
algo mejor. Antes de usarlo, pregúntate si no son en realidad `tarjetas`
(ideas paralelas), `proceso` (pasos) o dos slides distintas.

## Cómo elegir, en orden

1. ¿Hay **una** cifra que resume la sección? → `dato_gigante`.
2. ¿Hay 3-4 cifras? → `kpis`.
3. ¿Hay una serie temporal o una comparación numérica? → `grafico`.
4. ¿Hay dos estados o dos opciones? → `comparacion`.
5. ¿Hay pasos ordenados? → `proceso`. ¿Con fechas? → `timeline`.
6. ¿Hay 3-4 ideas paralelas? → `tarjetas`.
7. ¿Hay una frase que vale por sí sola? → `cita`.
8. Solo si nada de lo anterior: `bullets`.

Intercala `divisor` cada 3-4 slides de contenido: le da ritmo al deck y le da
al expositor un punto natural para respirar.

## Ritmo de un deck de 10-12 slides

```
portada · divisor · dato_gigante · kpis · comparacion ·
divisor · proceso · grafico · tarjetas · cita · cierre
```

Alterna denso y ligero. Dos slides densas seguidas cansan; dos ligeras seguidas
se sienten vacías.
