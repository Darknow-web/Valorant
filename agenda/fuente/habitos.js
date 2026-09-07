/* ============================================================
   HÁBITOS — y la evidencia detrás de cada decisión de diseño.

   · Lally (2010, UCL): la automatización llega en 66 días de media,
     con un rango de 18 a 254, y crece con la repetición EN UN
     CONTEXTO CONSTANTE. Por eso cada hábito declara su SEÑAL, no su
     hora.
   · Gollwitzer: un plan "si pasa X, entonces Y" transfiere el control
     a la señal. Eso es el campo `senal`.
   · Milkman: la rigidez mata el hábito — sobreviven los que toleran el
     día en que todo se rompe. Los flotantes no tienen hora.
   · Lally otra vez: un día perdido NO afecta la curva; los fallos
     consecutivos sí. De ahí el `piso` y el aviso al SEGUNDO fallo.
   · Habituación: el mismo estímulo da cada vez menos dopamina, y es la
     causa documentada de abandono. El bloque se queda, el contenido
     rota (`variantes`).
   · Amabile: avanzar en algo que importa es el factor número uno de un
     buen día, pero solo si se nota. De ahí "Esto avanzó", en minutos
     reales y no en porcentaje de cumplimiento.

   tipo: "enganchado" (va tras su señal) · "flotante" (reserva minutos,
   no hora) · "semanal" · "mensual".
   ============================================================ */

export const HABITOS = [
  {id:"takary", nom:"Takary de la visita", tipo:"enganchado", cat:"trabajo",
   senal:"al terminar cada visita, antes de arrancar", piso:5, obj:30,
   por:"Es la reportería, y sale en la tienda con todo fresco. Si no sale aquí, se acumula.",
   variantes:[]},

  {id:"parada", nom:"Parada con libro", tipo:"enganchado", cat:"mente", tag:"lectura",
   senal:"en un traslado de más de 55 min", piso:5, obj:20,
   por:"En scooter no puedes escuchar nada. Una parada en el tramo largo es lectura y descanso a la vez, y las dos cosas tienen respaldo por separado.",
   variantes:["Novela","No ficción","Algo para el juego","Lo que tengas a mano"]},

  {id:"juego", nom:"Juego para celular", tipo:"flotante", cat:"u", tag:"juego",
   piso:10, obj:45, dias:["lun","mar","mie","jue","vie","sab","dom"],
   por:"Tu proyecto. Si la tienda está tranquila, adelanta ahí y aquí solo cierras.",
   variantes:["Programar","Arte y diseño","Probar y anotar bugs","Monetización","Ver qué hace la competencia"]},

  {id:"tesis", nom:"Tesis", tipo:"flotante", cat:"u", tag:"tesis",
   piso:10, obj:60, dias:null,          // los elige él en el ritual del domingo
   por:"Tres días a la semana, no todos. Los que tú elijas.",
   variantes:["Escribir","Leer fuentes","Ordenar referencias","Revisar lo escrito"]},

  {id:"comodin", nom:"Comodín · tú decides", tipo:"flotante", cat:"mente",
   piso:0, obj:30, dias:["lun","mar","mie","jue","vie","sab","dom"],
   por:"Sin una franja que elijas tú en el momento, el horario deja de ser tuyo y se vuelve una jaula. No es tiempo perdido: es lo que hace que el resto se sostenga.",
   variantes:[]},

  {id:"ropa", nom:"Alistar la ropa de la semana", tipo:"semanal", cat:"cuerpo",
   dia:"dom", piso:5, obj:25,
   por:"Cinco mudas listas el domingo son cinco decisiones que no tomas medio dormido.",
   variantes:[]},

  {id:"cuarto", nom:"Ordenar el cuarto", tipo:"semanal", cat:"cuerpo",
   dia:"vie", piso:10, obj:45,
   por:"Superficie: lo que está fuera de sitio vuelve a su sitio.",
   variantes:[]},

  {id:"profundo", nom:"Orden profundo del cuarto", tipo:"mensual", cat:"cuerpo",
   dia:"dom", piso:20, obj:90,
   por:"Una vez al mes, el primer domingo: cajones, debajo de la cama, lo que llevas meses posponiendo.",
   variantes:[]}
];

/* OLAS. La evidencia va contra la tentación de encenderlo todo:
   arrancar con dos o tres funciona, arrancar con ocho no. Solo los
   activos consumen tiempo del día; el resto queda en cola, visible,
   costando cero. */
export const OLA_1 = ["takary","juego","ropa","cuarto"];

export function habito(id){ return HABITOS.find(h => h.id === id); }

export function activos(estado){
  const l = (estado || {}).olaHabitos;
  return Array.isArray(l) && l.length ? l : OLA_1;
}
export function estaActivo(h, estado){
  return !!h && activos(estado).indexOf(h.id) >= 0;
}
export function diasDe(h, estado){
  if(h.tipo === "semanal" || h.tipo === "mensual") return [h.dia];
  if(h.dias) return h.dias;
  const el = ((estado || {}).diasHabito || {})[h.id];
  return el && el.length ? el : [];
}
export function tocaHoy(h, diaId, estado){
  if(h.tipo === "mensual" && !(estado || {}).primerDomingo) return false;
  return diasDe(h, estado).indexOf(diaId) >= 0;
}
/* La variante que no tocó la última vez: el bloque se queda igual, el
   contenido cambia. */
export function varianteDe(h, estado){
  if(!h.variantes || !h.variantes.length) return null;
  const ult = ((estado || {}).variantes || {})[h.id];
  const i = h.variantes.indexOf(ult);
  return h.variantes[(i + 1) % h.variantes.length];
}
/* Lo que cuesta encender un hábito, en minutos por semana. Es el
   número que Carlos necesita ver ANTES de activarlo, no después. */
export function costoSemanal(h, estado){
  if(h.tipo === "mensual") return Math.round(h.obj / 4);
  if(h.tipo === "enganchado") return h.obj * (h.id === "takary" ? 4 : 5);
  return diasDe(h, estado).length * h.obj;
}

/* ---------------- rachas ----------------
   El piso cuenta para la racha y no para los minutos: es lo que
   mantiene viva la curva de automatización la semana que se rompe. */
const ORDEN = ["lun","mar","mie","jue","vie","sab","dom"];

export function estadoHabito(estado, h, diaId){
  return ((estado || {}).hechosHabito || {})[h.id+":"+diaId+":"+(estado.semana || "")] || null;
}
export function fallosSeguidos(estado, h, hastaIdx){
  let n = 0;
  for(let i = hastaIdx - 1; i >= 0; i--){
    const d = ORDEN[i];
    if(!tocaHoy(h, d, estado)) continue;
    if(estadoHabito(estado, h, d)) break;
    n++;
  }
  return n;
}
export function racha(estado, h, hastaIdx){
  let n = 0;
  for(let i = 0; i <= hastaIdx; i++){
    const d = ORDEN[i];
    if(!tocaHoy(h, d, estado)) continue;
    if(estadoHabito(estado, h, d)) n++;
  }
  return n;
}
/* Minutos REALES acumulados esta semana, para «Esto avanzó». */
export function avance(estado){
  return HABITOS.filter(h => h.tipo !== "mensual").map(h => {
    let plenos = 0, pisos = 0, tocaba = 0;
    ORDEN.forEach(d => {
      if(!tocaHoy(h, d, estado)) return;
      tocaba++;
      const st = estadoHabito(estado, h, d);
      if(st === "pleno") plenos++; else if(st === "piso") pisos++;
    });
    return {h, tocaba, plenos, pisos, min: plenos * h.obj + pisos * h.piso};
  }).filter(f => f.tocaba);
}
