/* Pruebas del motor, en Node y sin navegador.
   Este archivo es el cambio de método: antes, probar significaba abrir
   Chrome y mirar, y por eso cinco bugs sobrevivieron rondas enteras. */

import { construirDia, construirSemana, contadores, aMin, aHora, hm,
         ventanaTienda, ordenarRuta } from "../fuente/motor.js";
import { estadoVacio } from "../fuente/estado.js";
import { SEMANA } from "../fuente/semana.js";

let ok = 0, mal = 0;
const t = (nom, fn) => {
  try { fn(); ok++; console.log("  ✓ " + nom); }
  catch(e){ mal++; console.log("  ✗ " + nom + "\n      " + e.message); }
};
const eq = (a, b, m) => { if(a !== b) throw new Error((m||"")+"  esperaba "+b+", vino "+a); };
const yes = (c, m) => { if(!c) throw new Error(m || "falso"); };

function semanaReal(){
  const e = estadoVacio("2026-W37");
  e.programacion = [
    {dia:"lun", tipo:"turno-completo", tiendas:["SP20"], detalle:"Platino · bono 10 %, cayó 65 %."},
    {dia:"mar", tipo:"capacitacion", lugar:"OFICINA", horaFija:"14:00", detalle:"14:00–16:30"},
    {dia:"mar", tipo:"visita", tiendas:["SP33"], min:90, detalle:"Platino · la única que cabe antes del partido."},
    {dia:"mie", tipo:"visita", tiendas:["SP16"], detalle:"Bono 0 %. La prioridad de la semana."},
    {dia:"mie", tipo:"capacitacion", lugar:"OFICINA", horaFija:"14:00", detalle:"14:00–16:30"},
    {dia:"jue", tipo:"visita", tiendas:["SP54"], detalle:"Bono 25 %, cayó 50 %."},
    {dia:"jue", tipo:"capacitacion", lugar:"OFICINA", horaFija:"14:00", detalle:"14:00–16:30"},
    {dia:"vie", tipo:"tienda-escuela", lugar:"OFICINA", detalle:"Todo el día."},
    {dia:"sab", tipo:"visita", tiendas:["SP69"], min:180, detalle:"Media jornada de sábado."}
  ];
  e.diasHabito = {tesis:["mie","jue","dom"]};
  return e;
}

console.log("\nMOTOR\n");

t("los siete días se construyen sin reventar", () => {
  const s = construirSemana(estadoVacio("2026-W37"));
  eq(Object.keys(s).length, 7);
});

t("ningún bloque se solapa ni deja hueco sin declarar", () => {
  const s = construirSemana(semanaReal());
  Object.values(s).forEach(r => {
    const orden = r.orden.map(i => r.bloques[i]).filter(x => x.cat !== "sueno");
    for(let i = 1; i < orden.length; i++){
      const finAnt = aMin(orden[i-1].fin), ini = aMin(orden[i].ini);
      const d = ini - finAnt;
      if(d !== 0 && Math.abs(d) !== 1440 && d > 0){
        const dec = r.huecos.some(h => Math.abs(h.desde - finAnt) < 2);
        yes(dec || d < 10, r.dia.nom+": hueco de "+d+" min sin declarar antes de "+orden[i].nom);
      }
      // Un solapamiento contra un ancla no es un error del motor: es que
      // llegas tarde de verdad. Vale mientras el conflicto lo declare.
      if(d < 0 && Math.abs(d) !== 1440){
        yes(r.conflictos.some(c => c.id === orden[i].id),
          r.dia.nom+": "+orden[i].nom+" se solapa con "+orden[i-1].nom+" sin declararlo");
      }
    }
  });
});

t("EL CASO QUE ORIGINÓ TODO · la clase del lunes no se mueve con 5 h 30 de retraso", () => {
  const e = semanaReal();
  const r0 = construirDia(e, "lun");
  const turno = r0.bloques.find(x => /Turno completo/.test(x.nom));
  e.real = {lun:{id:turno.id, hora:"20:30", nom:turno.nom}};
  const r = construirDia(e, "lun");
  const clase = r.bloques.find(x => x.k === "clase");
  eq(clase.ini, "19:30", "la clase se movió");
  eq(clase.fin, "22:40", "la clase cambió de duración");
  yes(r.conflictos.some(c => c.clase === "ancla"), "no reportó el conflicto");
});

t("una visita no empieza antes de que la tienda abra", () => {
  const e = estadoVacio("2026-W37");
  // SP56 Mega Plaza abre 10:00; el lunes se sale de casa 08:15
  e.programacion = [{dia:"lun", tipo:"visita", tiendas:["SP56"]}];
  const r = construirDia(e, "lun");
  const v = r.bloques.find(x => /Visita SP56/.test(x.nom));
  const w = ventanaTienda("SP56", "lun");
  yes(aMin(v.ini) >= w[0], "empieza "+v.ini+" y abre "+aHora(w[0]));
});

t("una visita no termina después del cierre", () => {
  const e = estadoVacio("2026-W37");
  e.programacion = [{dia:"lun", tipo:"visita", tiendas:["SP16"], min:900}];
  const r = construirDia(e, "lun");
  yes(r.conflictos.some(c => c.clase === "cierre"), "no avisó del cierre");
});

t("el viernes tiene varios «Traslado a casa» y cada uno tiene id propio", () => {
  const r = construirDia(semanaReal(), "vie");
  const t2 = r.bloques.filter(x => x.nom === "Traslado a casa");
  yes(t2.length >= 2, "esperaba al menos dos, hay "+t2.length);
  eq(new Set(t2.map(x => x.id)).size, t2.length, "ids repetidos");
});

t("ajustar uno de ellos NO toca los otros", () => {
  const e = semanaReal();
  const r0 = construirDia(e, "vie");
  const t2 = r0.bloques.filter(x => x.nom === "Traslado a casa");
  const antes = t2.map(x => x.dur);
  e.ajustes[t2[1].id] = {min: t2[1].dur + 15};
  const r = construirDia(e, "vie");
  const t3 = r.bloques.filter(x => x.nom === "Traslado a casa");
  eq(t3[0].dur, antes[0], "cambió el primero");
  eq(t3[1].dur, antes[1] + 15, "no cambió el segundo");
  if(t3[2]) eq(t3[2].dur, antes[2], "cambió el tercero");
});

t("−15 diez veces seguidas baja monótono, nunca repite", () => {
  const e = semanaReal();
  const r0 = construirDia(e, "lun");
  const b = r0.bloques.find(x => /Turno completo/.test(x.nom));
  let v = b.dur; const vistos = [v];
  for(let i = 0; i < 10; i++){
    const guardado = (e.ajustes[b.id] || {}).min;
    const base = guardado || construirDia(e, "lun").bloques.find(x => x.id === b.id).dur;
    e.ajustes[b.id] = {min: Math.max(5, base - 15)};
    const n = construirDia(e, "lun").bloques.find(x => x.id === b.id).dur;
    yes(n < v, "no bajó: "+v+" → "+n);
    v = n; vistos.push(v);
  }
  eq(new Set(vistos).size, vistos.length, "repitió un valor: "+vistos.join(","));
});

t("los ajustes SÍ llegan a los bloques que genera el motor", () => {
  const e = semanaReal();
  const r0 = construirDia(e, "lun");
  const tak = r0.bloques.find(x => x.habito === "takary");
  yes(tak, "no se generó el Takary");
  e.ajustes[tak.id] = {min: 45};
  const n = construirDia(e, "lun").bloques.find(x => x.id === tak.id);
  eq(n.dur, 45, "el ajuste se descartó");
});

t("clavar un bloque a una hora lo convierte en ancla", () => {
  const e = semanaReal();
  const r0 = construirDia(e, "mie");
  const tesis = r0.bloques.find(x => x.k === "tesis");
  e.ajustes[tesis.id] = {hora: "19:00"};
  const n = construirDia(e, "mie").bloques.find(x => x.id === tesis.id);
  eq(n.ini, "19:00");
  eq(n.tipo, "ancla");
});

t("«hoy no lo hago» saca el bloque del día", () => {
  const e = semanaReal();
  const r0 = construirDia(e, "mie");
  const tesis = r0.bloques.find(x => x.k === "tesis");
  e.ajustes[tesis.id] = {fuera: true};
  yes(!construirDia(e, "mie").bloques.some(x => x.id === tesis.id), "sigue ahí");
});

t("mover un bloque lo corre exactamente una posición", () => {
  const e = semanaReal();
  const r0 = construirDia(e, "mie");
  const i0 = r0.bloques.findIndex(x => x.k === "tesis");
  e.ajustes[r0.bloques[i0].id] = {mover: -1};
  const i1 = construirDia(e, "mie").bloques.findIndex(x => x.k === "tesis");
  eq(i1, i0 - 1);
});

t("un compromiso social es un ancla y no se mueve", () => {
  const e = semanaReal();
  e.tareas = [{id:"cine", txt:"Cine con mis amigos", min:120, dia:"mie",
               hora:"20:20", cat:"vinculo"}];
  const r = construirDia(e, "mie");
  const c = r.bloques.find(x => x.id === "tarea:cine");
  eq(c.ini, "20:20");
  eq(c.tipo, "ancla");
});

t("el sueño no paga los hábitos: la bolsa cae a su piso antes que la noche baje de 6 h", () => {
  const e = semanaReal();
  const r = construirDia(e, "lun");     // el lunes es el día corto estructural
  const bolsa = r.bloques.find(x => x.k === "bolsa");
  if(bolsa) yes(bolsa.dur <= bolsa.piso || r.sueno >= 360,
    "bolsa de "+bolsa.dur+" min con "+hm(r.sueno)+" de sueño");
});

t("ningún día pierde el bloque de dormir", () => {
  const s = construirSemana(semanaReal());
  Object.values(s).forEach(r => {
    yes(r.bloques.some(x => x.cat === "sueno"), r.dia.nom+" se quedó sin dormir");
    yes(r.sueno > 0, r.dia.nom+" duerme "+r.sueno);
  });
});

t("la ruta del día ordena de la tienda más lejana a la más cercana", () => {
  const r = ordenarRuta(["SP33","SP16","SP54"]);
  eq(r[0], "SP16");            // La Molina, 85 min
  eq(r[r.length-1], "SP33");   // Independencia, 27 min
});

t("construir el mismo día dos veces da el mismo resultado", () => {
  const e = semanaReal();
  const a = JSON.stringify(construirDia(e, "jue").bloques);
  const b = JSON.stringify(construirDia(e, "jue").bloques);
  eq(a, b, "el motor no es determinista");
});

t("construir un día no muta el estado", () => {
  const e = semanaReal();
  const antes = JSON.stringify(e);
  construirSemana(e);
  eq(JSON.stringify(e), antes, "el motor mutó el estado");
});

console.log("\nLA SEMANA REAL\n");
const s = construirSemana(semanaReal());
Object.values(s).forEach(r => {
  console.log("  " + r.dia.nom.padEnd(10) + " sueño " + hm(r.sueno).padEnd(8) +
    " huecos " + r.huecos.length + "  conflictos " + r.conflictos.length +
    r.conflictos.map(c => "  [" + (c.clase === "cierre" ? "cierra" : "tarde " + c.tarde + "m") +
      " · " + c.nom + "]").join(""));
});
const c = contadores(semanaReal());
console.log("\n  " + c.metas.map(m => m.nom + " " +
  (m.sesiones ? m.sesiones_puestas + "/" + m.sesiones : hm(m.puesto) + "/" + hm(m.meta))).join(" · "));
console.log("  traslados " + hm(c.traslados) + " · sueño promedio " + hm(c.suenoProm));

console.log("\n" + (mal ? "✗ " + mal + " fallan, " + ok + " pasan" : "✓ " + ok + " pruebas pasan") + "\n");
process.exit(mal ? 1 : 0);
