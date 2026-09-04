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

## Pendiente de incorporar

- Cuadro de distribución del horario laboral con las carteras de tienda.
- Distrito de la casa y lista de tiendas con sus zonas, para la tabla de traslados.
- Capa opcional que consulte Google Maps Distance Matrix con `traffic_model=pessimistic`
  para calcular la ruta del día de visitas (requiere API key).

La jornada laboral está puesta como bloque parametrizable de ~7 h 25 más almuerzo
hasta que llegue el cuadro.
