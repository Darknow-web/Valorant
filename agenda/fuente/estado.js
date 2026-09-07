/* ============================================================
   ESTADO — la única fuente de verdad.

   Un objeto JSON plano, versionado, que se guarda tal cual. La
   interfaz LEE de aquí y ESCRIBE aquí; nunca toma un valor de lo que
   hay dibujado en pantalla. Ese fue exactamente el bug de las cuarenta
   escrituras con el mismo número: el botón calculaba a partir de la
   duración renderizada en vez del valor guardado.

   ESQUEMA lleva número porque lo guardado pisa los valores del código:
   sin migración explícita, un cambio en el catálogo nunca llega a un
   teléfono que ya tiene estado.
   ============================================================ */

export const ESQUEMA = 1;

export function estadoVacio(semana){
  return {
    esquema: ESQUEMA,
    semana: semana || "",
    rev: 0,

    programacion: [],   // [{dia, tipo, tiendas?, min?, horaFija?, lugar?, detalle}]
    tareas: [],         // [{id, txt, min, dia, hora?, cat?, tag?, tras?}]
    partidos: {},       // {mar:"21:30"}
    ajustes: {},        // {"<idBloque>": {min?, mover?, hora?, fuera?}}
    real: {},           // {lun:{id, hora, nom}}  lo que de verdad pasó
    hechos: {},         // {"<idBloque>": {t, plan}}  hora real de cierre
    hechosHabito: {},   // {"juego:lun:2026-W37": "pleno"|"piso"}
    olaHabitos: null,   // null = la ola 1
    diasHabito: {},     // {tesis:["mar","jue","dom"]}
    variantes: {},      // {juego:"Programar"}
    comodin: {},        // {mar:"llamar a mi mamá"}
    checkin: {},        // qué preguntas del ritual ya respondió
    pendientes: [],     // [{id, txt, min, hecho}]
    calIds: {},
    primerDomingo: false
  };
}

/* Migración explícita: cada versión sabe subir desde la anterior. */
/* CLONAR ES OBLIGATORIO, no una cortesía. Los snapshots de la db vienen
   congelados en profundidad —el contrato dice "clone a body before editing
   it"— y Object.assign solo copia el primer nivel: `ajustes`, `hechos` y
   `real` quedaban como referencias a objetos congelados. Escribir sobre
   ellos fallaba EN SILENCIO, `rev` subía igual y se guardaba el mismo
   valor. Esa fue la causa raíz de toda la saga de "los botones no hacen
   nada", en las dos apps. */
export function clonar(o){ return o == null ? o : JSON.parse(JSON.stringify(o)); }

export function migrar(guardado, semana){
  const base = estadoVacio(semana);
  if(!guardado || typeof guardado !== "object") return base;
  const e = Object.assign(base, clonar(guardado));
  e.esquema = ESQUEMA;
  e.semana = semana || e.semana;
  // Restos de la versión anterior que ya no significan nada.
  delete e.ajuste; delete e.flex; delete e.soltados; delete e.cfg;
  ["programacion","tareas","pendientes"].forEach(k => {
    if(!Array.isArray(e[k])) e[k] = [];
  });
  ["ajustes","real","hechos","hechosHabito","diasHabito","variantes",
   "comodin","checkin","partidos","calIds"].forEach(k => {
    if(!e[k] || typeof e[k] !== "object") e[k] = {};
  });
  return e;
}

/* ---------------- semana ISO ---------------- */
export function idSemana(d){
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dia = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - dia);
  const a = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  const n = Math.ceil((((x - a) / 86400000) + 1) / 7);
  return x.getUTCFullYear()+"-W"+String(n).padStart(2, "0");
}
/* El domingo se planifica la semana que EMPIEZA, no la que termina. */
export function lunesObjetivo(hoy){
  const d = hoy ? new Date(hoy) : new Date();
  const wd = d.getDay();
  if(wd === 0) d.setDate(d.getDate() + 1); else d.setDate(d.getDate() - (wd - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}
export const OFFSET = {lun:0, mar:1, mie:2, jue:3, vie:4, sab:5, dom:6};
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio",
               "agosto","setiembre","octubre","noviembre","diciembre"];
export function fechaDe(diaId, hoy){
  const d = lunesObjetivo(hoy);
  d.setDate(d.getDate() + (OFFSET[diaId] || 0));
  return d;
}
export function fechaTexto(diaId, hoy){
  const d = fechaDe(diaId, hoy);
  return d.getDate()+" de "+MESES[d.getMonth()];
}
export function esPrimerDomingo(hoy){
  return fechaDe("dom", hoy).getDate() <= 7;
}

/* ---------------- persistencia ----------------
   Dos reglas que salieron de un bug real:

   1 · NUNCA `set` sobre el documento. `set` reemplaza el documento
       entero: guardar solo `hechos` borraba toda la configuración.
       Todo escribe con `update`; el `set` completo existe solo para
       crear el documento la primera vez.

   2 · `rev` sube en cada escritura y viaja dentro del documento. Un
       snapshot con un rev menor es un eco viejo y se descarta, para
       que la respuesta del servidor no revierta lo recién tocado. */
export function crearAlmacen(opciones){
  const o = opciones || {};
  const clave = o.clave || "agenda";
  let db = null, doc = null, estado = o.estado, aviso = o.aviso || (() => {});
  const oyentes = [];

  const local = {
    leer(){ try { return JSON.parse(localStorage.getItem(clave) || "null"); }
            catch(e){ return null; } },
    guardar(e){ try { localStorage.setItem(clave, JSON.stringify(e)); } catch(e2){} }
  };

  function emitir(){ oyentes.forEach(f => f(estado)); }

  return {
    get estado(){ return estado; },
    set estado(e){ estado = e; },
    local,
    alCambiar(f){ oyentes.push(f); },

    /* Aplica un cambio y lo persiste. `fn` recibe el estado y lo muta;
       devolver algo no hace falta. */
    guardar(fn, campos){
      // Cinturón y tirantes: si algo congelado se coló, se reemplaza por una
      // copia ANTES de mutar. Con "use strict" además lanzaría, no callaría.
      Object.keys(estado).forEach(k => {
        const v = estado[k];
        if(v && typeof v === "object" && Object.isFrozen(v)) estado[k] = clonar(v);
      });
      fn(estado);
      estado.rev = (estado.rev || 0) + 1;
      local.guardar(estado);
      emitir();
      if(!db || !doc) return;
      aviso("guardando…");
      const cuerpo = {};
      (campos || ["todo"]).forEach(c => {
        if(c === "todo") Object.assign(cuerpo, {estado});
        else cuerpo[c] = estado[c];
      });
      cuerpo.rev = estado.rev;
      cuerpo.actualizado = new Date().toISOString();
      doc.update(cuerpo)
        .then(() => aviso("guardado"))
        .catch(() => doc.set({estado, rev:estado.rev,
                              actualizado:new Date().toISOString()})
                        .then(() => aviso("guardado")))
        .catch(e => aviso("sin guardar", (e && e.message) || "no se pudo escribir"));
    },

    async conectar(claude, ruta){
      try {
        const cap = await claude.use("db");
        if(!cap) return false;
        db = cap; doc = cap.doc(ruta);
        aviso("conectando…");
        doc.onSnapshot(snap => {
          if(!snap.exists) return;
          const d = snap.data() || {};
          const rev = typeof d.rev === "number" ? d.rev : 0;
          if(rev < (estado.rev || 0)) return;      // eco viejo
          if(d.estado && typeof d.estado === "object"){
            estado = migrar(d.estado, estado.semana);
            estado.rev = rev;
          }
          local.guardar(estado);
          emitir();
          aviso("guardado");
        }, e => aviso("sin guardar", (e && e.message) || "sin conexión"));
        return true;
      } catch(e){ return false; }
    }
  };
}
