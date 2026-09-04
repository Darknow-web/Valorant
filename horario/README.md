# Semana Blindada — sistema de organización semanal

Horario operativo calculado minuto a minuto en el peor escenario, con los traslados
contabilizados como bloques propios y los innegociables protegidos antes de repartir
el resto del tiempo.

Publicado como Artifact: https://claude.ai/code/artifact/0ca773dd-81ed-43e8-b0cd-2159ad6eb995

## Qué contiene `semana-blindada.html`

- Los 7 días desglosados bloque por bloque, con hora de inicio, fin y duración.
- Medidores de los innegociables, calculados desde los propios datos del horario.
- Calculadora de "modo día puntual": planificación hacia atrás desde una hora tope.
- Bandeja de pendientes con estimación en minutos.
- Protocolo de salud mental y orden de sacrificio cuando la semana se rompe.

El estado (bloques marcados y pendientes) se guarda con la capacidad `db` del Artifact
y cae a `localStorage` cuando esa capacidad no está disponible.

## Cuadre de la semana

| Innegociable | Objetivo | Asignado |
|---|---|---|
| Tesis | 5 h | 5 h 00 (lun 45 · mié 55 · jue 60 · dom 140) |
| Lectura | 3 h 30 | 3 h 30 (lun 35 · mié 35 · jue 35 · vie 30 · sáb 30 · dom 45) |
| Pareja | 8 h | 8 h 00 (sáb 5 h 50 · dom 2 h 10) |
| Gym | 3 sesiones | 3 (vie tarde · sáb AM · dom AM) |

Traslados: 17 h 25 por semana. Sueño promedio: 6 h 54 por noche.

## Restricción estructural conocida

La noche del lunes al martes son 5 h 15 y no se puede arreglar moviendo bloques:
la clase del lunes termina 22:40 (llegada 23:45) y la del martes empieza 07:30
(salida 06:15). Se compensa con la siesta del martes a las 13:15 y el arranque
tardío del miércoles.

Por eso el gym quedó viernes tarde, sábado y domingo por la mañana: son las únicas
franjas que no le quitan horas al sueño.

## Asistente en la página (capacidades `sample` + `mcp`)

La operación semanal ya no pasa por el chat. La página declara:

```
capabilities: { db:{}, sample:{},
  mcp:{ servers:[{ server:"Google Calendar",
                   tools:["list_events","create_event","update_event"] }] } }
```

Cinco funciones, todas degradan a nada si el visor no concede la capacidad — el horario,
el re-planificador y la calculadora son locales y siguen funcionando:

1. **Foto del domingo** — `sample.json` con la imagen del plan de banca devuelve la
   programación estructurada. **No se aplica**: pinta una pantalla de confirmación
   editable, con lo de baja confianza resaltado. Solo aparece si `sample.limits()`
   reporta `images`.
2. **Ubicar una tarea** — texto libre → bloque propuesto y la razón. Si no cabe lo dice,
   no comprime.
3. **Preguntar sobre la semana** — respuesta en streaming con botón de parar.
4. **Reporte de cumplimiento** — lee el histórico de `db` y señala qué bloques se caen
   siempre.
5. **Sincronizar Google Calendar** — solo la capa variable. Los ids creados se guardan en
   `CFG.calIds` para actualizar en vez de duplicar.

**Modelo de costo**: cada llamada manda el prompt más un resumen del horario
(`contextoSemana()`, ~1 KB), no la conversación entera. Ese es el ahorro frente al chat.
Gasta el uso de Claude del visor y pide su consentimiento en la primera llamada.

`lunesObjetivo()` resuelve el caso que importa: **el domingo se planifica la semana que
empieza**, no la que termina.

## Fútbol con hora variable

Carlos juega **un partido de 40 min**: llega 20 antes y se va 15 después. Con traslado
(40 min por lado) son **2 h 35 fuera de casa**, fijas, sin importar la hora del partido.
La versión anterior bloqueaba la ventana completa 20:40–23:00, que costaba 40 min extra el
martes y 65 el jueves.

Él avisa la hora un día antes. `tardeFutbol()` genera la tarde completa a partir de ella:
recorta la jornada laboral si hace falta, ubica el traslado y la cancha, y convierte el
sobrante en un **bloque flexible** cuyo destino Carlos elige cada semana (dormir más,
tesis, pendientes, o cena tranquila). Sin hora confirmada usa el escenario tardío (22:00),
nunca el optimista.

Sueño resultante en las noches de fútbol: 7 h 05 sin confirmar, 7 h 35 con partido 21:30,
8 h 25 con partido 20:40.

## Re-planificador

`construirEscenarios(dia, idx, desde)` reprograma los bloques desde `idx` a partir de la
hora `desde`. Nada se descarta por el reloj: lo que no cabe hay que comprimirlo o soltarlo
a propósito. Devuelve tres escenarios ordenados por horas de sueño resultantes —
**Comprimir**, **Soltar lo barato** y **Dormir menos** — y Carlos elige uno; ninguno se
aplica solo.

Metadatos por bloque (séptimo elemento de cada entrada de `DIAS`):

- `fijo` — hora inamovible (clase, reunión, partido, cita). Si se llega tarde, se avisa.
- `min` — duración mínima al comprimir. Sin valor, el bloque no se comprime.
- `prio` — orden de sacrificio (1 primero). Sin valor, **nunca** se ofrece eliminar: así
  quedan protegidos tesis, pareja, descompresión, areneros y sueño.

## Cartera (Matriz de Indicadores 2026, hoja SETIEMBRE)

20 tiendas asignadas a Carlos Inga, todas en región Lima, agrupadas en la página por
conglomerado geográfico. Un día que cruza conglomerados cuesta ~55 min por salto frente
a ~25 min dentro del mismo grupo, así que la calculadora avisa cuando la ruta los cruza.

| Grupo | Tiendas |
|---|---|
| Norte | SP33, SP56, SP44, SP15, SP61 |
| Este | SP36, SP66, SP25, SP54 |
| La Molina | SP03, SP16, SP42, SP48 |
| Centro y oeste | SP52, SP55, SP20 |
| Miraflores | SP47, SP41, SP12 |
| Sin zona confirmada | SP69 Paracas |

Tipos de día detectados en el plan de banca: visita a tienda (90 min), capacitación
(180 min, no se acorta), tienda escuela (turno mañana o tarde), MMEE / proyecto en
oficina, y los correos de visitas el domingo.

## Pendiente de incorporar

- Distrito de la casa: sin él no se puede calcular ningún tramo de vuelta.
- Zona de SP69 Paracas; confirmar SP15 Mayolo, SP55 El Ejército y SP20 Dos de Mayo.
- Calibrar los tiempos entre conglomerados (hoy 25 min intra / 55 min inter, provisionales).
- Capa opcional que consulte Google Maps Distance Matrix con `traffic_model=pessimistic`
  para calcular la ruta del día de visitas (requiere API key).

La jornada laboral está puesta como bloque parametrizable de ~7 h 25 más almuerzo
hasta que llegue el cuadro.
