/* ============================================================
   SEMILLA — la semana que ya tenemos armada, para que la app no
   abra vacía. Lo guardado siempre manda sobre esto.
   ============================================================ */
import { estadoVacio } from "./estado.js";

export function SEMILLA(sem){
  const e = estadoVacio(sem);
  e.programacion = [
    {dia:"lun", tipo:"turno-completo", tiendas:["SP20"],
     detalle:"Platino · bono 10 %, cayó 65 %. Turno completo."},
    {dia:"mar", tipo:"capacitacion", lugar:"OFICINA", horaFija:"14:00", detalle:"14:00–16:30"},
    {dia:"mar", tipo:"visita", tiendas:["SP33"], min:90,
     detalle:"Platino · bono 40 %, cayó 45 % en 7 días. Va a 1 h 30 y no a 2 h: es el mínimo que dijiste y el martes no da para más entre la capacitación y el partido."},
    {dia:"mie", tipo:"visita", tiendas:["SP16"], detalle:"Bono 0 %. La prioridad de la semana."},
    {dia:"mie", tipo:"capacitacion", lugar:"OFICINA", horaFija:"14:00", detalle:"14:00–16:30"},
    {dia:"jue", tipo:"visita", tiendas:["SP54"], detalle:"Bono 25 %, cayó 50 %."},
    {dia:"jue", tipo:"capacitacion", lugar:"OFICINA", horaFija:"14:00", detalle:"14:00–16:30"},
    {dia:"vie", tipo:"tienda-escuela", lugar:"OFICINA", detalle:"Todo el día."},
    {dia:"sab", tipo:"visita", tiendas:["SP69"], min:180,
     detalle:"Bono 35 %. Media jornada de sábado: 3 h en una sola tienda."}
  ];
  /* Compromisos con hora acordada con otra gente: son anclas. */
  e.tareas = [
    {id:"cine", txt:"Cine con tus amigos", min:120, dia:"mie", hora:"20:20", cat:"vinculo"},
    {id:"brena", txt:"Partido en Breña", min:120, dia:"vie", hora:"22:00", cat:"cuerpo"},
    {id:"seguimiento", txt:"Seguimiento de tiendas", min:40, dia:"jue", cat:"trabajo"},
    {id:"reporteria", txt:"Reportería y correos", min:60, dia:"dom", cat:"trabajo"}
  ];
  e.diasHabito = {tesis:["mie","jue","dom"]};
  return e;
}
