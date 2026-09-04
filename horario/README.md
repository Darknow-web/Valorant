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
