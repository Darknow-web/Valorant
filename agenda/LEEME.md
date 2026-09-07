# Agenda — la app de Carlos, reconstruida

Publicada en https://claude.ai/code/artifact/bda7820b-ddf6-4ee5-bb23-8fe52d9e2b56

## Por qué se rehízo

Cinco rondas de arreglos sobre la misma queja —«la modificación manual no funciona»—
encontraron seis bugs **distintos**. Eso no es mala suerte: todos eran variantes de lo mismo.

| Defecto | Causa raíz |
|---|---|
| Un ajuste cambiaba los tres «Traslado a casa» del viernes | Los bloques se identificaban **por nombre** |
| Los ajustes se descartaban en los bloques de hábito | Se aplicaban **antes** de que esos bloques existieran |
| El botón escribía siempre `315`, con 40 escrituras seguidas | La interfaz leía un **valor derivado** en vez del estado |
| El bloque editado desaparecía al recortarlo | El plegado por hora borraba lo que estabas usando |
| La pantalla saltaba 236 px y el botón se iba de la vista | Redibujado total del día en cada toque |
| Marcar «hecho» borraba toda la configuración | `set()` reemplaza el documento entero |

**Estado implícito, identidad frágil y render destructivo.** La reconstrucción existe para
que esa clase de bug no pueda volver a existir.

## Las cuatro reglas

1. **Identidad estable.** Cada bloque nace con un id determinista: `base:vie:volver`,
   `prog:lun:SP20`, `hab:takary:jue:SP54`. Nunca el nombre.
2. **Motor puro.** `construirDia(estado, diaId)` no toca el DOM, no muta lo que recibe y
   devuelve objetos nuevos. Se prueba **en Node**, sin navegador.
3. **La interfaz nunca lee valores derivados.** Un control lee del estado y escribe al
   estado; jamás toma su punto de partida de lo dibujado.
4. **Render por clave.** La lista se actualiza por `id`: lo que no cambió no se recrea.

Y dos de datos: los bloques son objetos con campos con nombre (los arreglos con propiedades
pegadas —`b[6]`, `b.dm`, `b.clave`— fueron fuente constante de error), y el estado lleva
número de esquema con migración explícita, porque lo guardado pisa los valores del código.

## Los tres tipos de bloque

| Tipo | Qué es |
|---|---|
| **ancla** | Hora impuesta por otro: clase, partido, capacitación, cine. Nunca se mueve. |
| **ventana** | Visita a tienda: dentro del horario real de esa tienda. |
| **libre** | Todo lo demás. Se recorta antes de correrse; un traslado ni se recorta ni se corre. |

Un ancla no cede: si la cadena llega tarde el motor emite un **conflicto**, si llega temprano
un **hueco**. Ninguno se resuelve solo.

## Estructura

```
fuente/catalogo.js   20 tiendas, 7 conglomerados, 190 pares medidos, horarios de tienda
fuente/semana.js     la plantilla base de los 7 días y el fútbol de hora variable
fuente/habitos.js    los 8 hábitos, las olas, las rachas y la evidencia detrás
fuente/motor.js      construirDia — puro, sin DOM
fuente/estado.js     esquema, migración, persistencia con rev monótona
fuente/vista.js      render por clave, tarjeta Ahora, editor
fuente/rituales.js   los formularios semanal y diario
fuente/asistente.js  sample (foto, preguntas, reporte) y Google Calendar
construir.mjs        empaca todo en el HTML de un archivo que pide el Artifact
pruebas/             motor.test.mjs (Node) · vista.test.mjs (Playwright)
datos/               lo medido: direcciones, matriz OSRM cruda, horarios de tienda
```

## Cómo se prueba

**Motor, en Node:** `node pruebas/motor.test.mjs` — 18 casos, incluido el que originó todo
(con 5 h 30 de retraso reportado la clase del lunes sigue en 19:30–22:40 y sale el conflicto).

**Interfaz, con Playwright:** `node pruebas/vista.test.mjs` — 15 casos con las **cuatro
condiciones** que faltaron durante cinco rondas y sin las cuales la prueba no vale:

1. **Toques reales**, no `evaluate`.
2. **`db` simulada**, con eco del documento anterior después de cada escritura.
3. **Pantalla de celular**, 390×664.
4. **El día de hoy**, que es el único que Carlos mira.

Un bug que apareció solo gracias a eso: al tocar `−15`, el panel se redibuja, el botón queda
huérfano del DOM, `closest(".ed")` deja de encontrar el panel y el clic llega al bloque, que
lo cierra. El guard por posición no bastaba; hace falta `stopPropagation`.

## Datos medidos que se conservan

20 tiendas ruteadas con OSRM desde Las Gladiolas 125 (factor de hora punta ×2.2 + 10 min),
190 pares tienda-a-tienda, y los horarios de apertura de las 20 fichas de superpet.pe, las 20
con confianza alta. La matriz cruda queda en `datos/` por si hay que recalcular.

**Límites conocidos.** El punto de casa es el centroide de Independencia. El ×2.2 es un factor
de tráfico, no una medición. De la oficina a una tienda no hay matriz: se usa el salto entre
conglomerados (57 min), el lado pesimista. **La sincronización con Google Calendar no está
verificada contra el calendario real.**
