/* ============================================================
   MOTOR — arma un día completo a partir del estado.

   Cuatro reglas que existen porque su ausencia costó cinco rondas
   de bugs:

   1 · IDENTIDAD ESTABLE. Cada bloque nace con un id único y
       determinista ("base:vie:volver", "prog:lun:SP20",
       "hab:takary:jue:SP54"). Nunca el nombre: el viernes tiene tres
       bloques llamados "Traslado a casa" y ajustar uno los movía los
       tres.

   2 · PURO. No toca el DOM, no muta lo que recibe y devuelve objetos
       nuevos. Se puede probar en Node, sin navegador, con cientos de
       casos en segundos.

   3 · LOS AJUSTES SE APLICAN AL FINAL, sobre el día ya completo.
       Antes se aplicaban a media construcción y los bloques de hábito
       —que se creaban después— nunca los recibían.

   4 · NO DECIDE. Cuando sobra tiempo emite un hueco y cuando falta
       emite un conflicto, con las opciones. Elegir es de Carlos.
   ============================================================ */

import { GRUPOS, ENTRE, LUGARES, HORARIOS, DUR, VISITA_PISO,
         T_INTER, CIERRE_COLCHON } from "./catalogo.js";
import { SEMANA, bloquesFutbol, METAS } from "./semana.js";
import { HABITOS, tocaHoy, diasDe, varianteDe, estaActivo } from "./habitos.js";

/* ---------------- tiempo ---------------- */
export const aMin = (hhmm) => { const p = String(hhmm).split(":"); return (+p[0])*60 + (+p[1]); };
export const aHora = (m) => { m = ((m % 1440) + 1440) % 1440;
  return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0"); };
export const hm = (m) => { m = Math.round(m); const h = Math.floor(m/60), mm = m%60;
  return h === 0 ? mm+" min" : (mm === 0 ? h+" h" : h+" h "+String(mm).padStart(2,"0")); };

/* ---------------- tiendas ---------------- */
export function tienda(cod){
  for(const g of GRUPOS) for(const t of g.tiendas) if(t[0] === cod)
    return {cod:t[0], nom:t[1], dir:t[2], cat:t[3], min:t[4], grupo:g};
  return null;
}
export function minsCasa(loc){
  if(LUGARES[loc]) return LUGARES[loc].min;
  const t = tienda(loc); return t ? t.min : 45;
}
export function minsEntre(a, b){
  return ENTRE[a+"|"+b] || ENTRE[b+"|"+a] || null;
}
/* Minutos entre dos puntos del día. Entre tiendas usa el par medido;
   con un lugar de por medio no hay matriz, así que cae al salto entre
   conglomerados, que es el lado pesimista. */
export function traslado(a, b){
  if(a === b) return 0;
  if(a === "CASA") return minsCasa(b);
  if(b === "CASA") return minsCasa(a);
  return minsEntre(a, b) || T_INTER;
}
export function nombreLugar(loc){
  if(LUGARES[loc]) return LUGARES[loc].nom;
  const t = tienda(loc); return t ? loc+" · "+t.nom : loc;
}
/* De la más lejana a la más cercana a casa: el último tramo, el de
   hora punta, es el más corto. */
export function ordenarRuta(cods){
  return cods.slice().sort((a, b) => {
    const ta = tienda(a), tb = tienda(b);
    const ga = ta ? ta.grupo.min : 0, gb = tb ? tb.grupo.min : 0;
    return ga !== gb ? gb - ga : minsCasa(b) - minsCasa(a);
  });
}
export function ventanaTienda(cod, diaId){
  const h = HORARIOS[cod]; if(!h) return null;
  const i = diaId === "dom" ? 2 : (diaId === "sab" ? 1 : 0);
  return [h[i][0], h[i][1] - CIERRE_COLCHON];
}

/* ---------------- capas ---------------- */

/* 1 · la base del día, con ids estables por clave. */
function capaBase(dia, estado){
  const out = dia.base.map(s => Object.assign({}, s, {
    id: "base:"+dia.id+":"+s.k,
    tipo: s.tipo || "libre",
    origen: "base"
  }));
  if(dia.futbol){
    const hora = (estado.partidos || {})[dia.id] || null;
    const fut = bloquesFutbol(hora).map(s => Object.assign({}, s, {
      id: "fut:"+dia.id+":"+s.k, tipo: s.tipo || "libre", origen: "futbol"
    }));
    // El fútbol va antes del cierre de la noche.
    const i = out.findIndex(x => x.cat === "sueno");
    out.splice(i < 0 ? out.length : i, 0, ...fut);
  }
  return out;
}

/* 2 · la programación real reemplaza el bloque de trabajo genérico. */
function capaTrabajo(bloques, dia, estado){
  const filas = (estado.programacion || []).filter(r => r.dia === dia.id);
  const iIr  = bloques.findIndex(x => x.k === "ir-trabajo");
  // El final del tramo es la vuelta del TRABAJO, no cualquier "Traslado a
  // casa": el viernes también vuelve del gym, y buscar por nombre se comía
  // el gym entero dentro del segmento reemplazado.
  let iVol = bloques.findIndex(x => x.k === "volver-trabajo");
  if(iVol < 0) iVol = bloques.findIndex((x,i) => i > iIr && x.k === "almuerzo");
  if(!filas.length || iIr < 0) return bloques;

  const almuerzo = (bloques.find(x => x.k === "almuerzo") || {}).min || 35;
  const paradas = [];
  filas.forEach((r, n) => {
    const esTienda = r.tipo === "visita" || r.tipo === "turno-completo";
    if(esTienda && (r.tiendas || []).length){
      ordenarRuta(r.tiendas).forEach(cod => paradas.push({
        loc:cod, tipo:r.tipo, min:r.min || DUR[r.tipo] || DUR.visita,
        hora:r.horaFija || null, detalle:r.detalle || "", fila:n
      }));
    } else if(!esTienda){
      paradas.push({loc:r.lugar || "OFICINA", tipo:r.tipo,
        min:r.min || DUR[r.tipo] || 180, hora:r.horaFija || null,
        detalle:r.detalle || "", fila:n});
    }
  });
  if(!paradas.length) return bloques;

  const nuevos = [];
  let aqui = "CASA", almPuesto = false;
  paradas.forEach((p, i) => {
    const sufijo = LUGARES[p.loc] ? p.tipo+":"+p.fila : p.loc;
    const v = traslado(aqui, p.loc);
    if(v){
      nuevos.push({id:"prog:"+dia.id+":ir:"+sufijo, k:"ir:"+sufijo,
        nom:"Traslado a "+nombreLugar(p.loc), cat:"traslado", min:v,
        tipo:"libre", origen:"prog"});
      if(!LUGARES[p.loc]) nuevos.push({id:"prog:"+dia.id+":hola:"+sufijo,
        k:"hola:"+sufijo, nom:"Llegada y saludo", cat:"traslado", min:10,
        piso:6, tipo:"libre", origen:"prog"});
    }
    const t = tienda(p.loc);
    const nom = p.tipo === "capacitacion"   ? "Capacitación"
              : p.tipo === "tienda-escuela" ? "Tienda escuela"
              : p.tipo === "oficina"        ? "Proyecto en oficina"
              : (p.tipo === "turno-completo" ? "Turno completo " : "Visita ") + nombreLugar(p.loc);
    const blk = {id:"prog:"+dia.id+":"+sufijo, k:sufijo, nom, cat:"trabajo",
      min:p.min, prio:2, origen:"prog", tienda:t ? p.loc : null,
      nota:p.detalle || (t ? t.dir : "")};
    if(p.hora){ blk.tipo = "ancla"; blk.hora = p.hora; }
    else {
      const w = t ? ventanaTienda(p.loc, dia.id) : null;
      if(w){ blk.tipo = "ventana"; blk.ventana = w;
             blk.nota += (blk.nota ? " · " : "")+"Abre "+aHora(w[0])+", cierra "+aHora(w[1]+CIERRE_COLCHON)+"."; }
      else blk.tipo = "libre";
    }
    nuevos.push(blk);
    aqui = p.loc;
    if(!almPuesto && i < paradas.length - 1){
      nuevos.push({id:"prog:"+dia.id+":almuerzo", k:"almuerzo", nom:"Almuerzo",
        cat:"cuerpo", min:almuerzo, piso:25, tipo:"libre", origen:"prog"});
      almPuesto = true;
    }
  });
  if(!almPuesto) nuevos.push({id:"prog:"+dia.id+":almuerzo", k:"almuerzo",
    nom:"Almuerzo", cat:"cuerpo", min:almuerzo, piso:25, tipo:"libre", origen:"prog"});
  const vuelta = traslado(aqui, "CASA");
  if(vuelta) nuevos.push({id:"prog:"+dia.id+":volver", k:"volver",
    nom:"Traslado a casa", cat:"traslado", min:vuelta, tipo:"libre", origen:"prog"});

  const fin = iVol > iIr ? iVol : iIr;
  return bloques.slice(0, iIr).concat(nuevos).concat(bloques.slice(fin + 1));
}

/* 3 · compromisos y tareas que Carlos agregó. */
function capaTareas(bloques, dia, estado){
  const out = bloques.slice();
  (estado.tareas || []).filter(t => t.dia === dia.id).forEach(t => {
    const blk = {id:"tarea:"+t.id, k:"tarea:"+t.id, nom:t.txt,
      cat:t.cat || "trabajo", min:Math.max(5, t.min || 30),
      tipo: t.hora ? "ancla" : "libre", origen:"tarea", tag:t.tag || null,
      nota: t.hora ? "Compromiso con hora acordada con otra gente. La app no lo mueve."
                   : "Lo agregaste tú."};
    if(t.hora) blk.hora = t.hora; else blk.prio = 2;
    let at = -1;
    if(t.tras) at = out.findIndex(x => x.id === t.tras);
    if(at < 0) at = out.findIndex(x => x.k === "descompresion") - 1;
    if(at < 0) at = out.length - 2;
    out.splice(at + 1, 0, blk);
  });
  return out;
}

/* 4 · hábitos. Los enganchados van tras su señal; los flotantes se
   suman en un solo bloque, porque reservan minutos pero no hora. */
function capaHabitos(bloques, dia, estado){
  let out = bloques.slice();

  const tak = HABITOS.find(h => h.id === "takary");
  if(estaActivo(tak, estado)){
    for(let i = out.length - 1; i >= 0; i--){
      if(!/^(Visita|Turno completo) /.test(out[i].nom)) continue;
      const cod = out[i].tienda || "";
      out.splice(i + 1, 0, {id:"hab:takary:"+dia.id+":"+(cod || i),
        k:"takary:"+cod, nom:"Takary · "+cod, cat:"trabajo", min:tak.obj,
        piso:tak.piso, prio:2, tipo:"libre", origen:"habito", habito:"takary",
        nota:tak.por});
    }
  }

  const par = HABITOS.find(h => h.id === "parada");
  if(estaActivo(par, estado) && !out.some(x => x.tag === "lectura")){
    let peor = -1, peorM = 55;
    out.forEach((x, i) => { if(x.cat === "traslado" && x.min > peorM){ peorM = x.min; peor = i; } });
    if(peor >= 0){
      const v = varianteDe(par, estado);
      out.splice(peor + 1, 0, {id:"hab:parada:"+dia.id, k:"parada",
        nom:"Parada con libro", cat:"mente", min:par.obj, piso:par.piso,
        prio:3, tipo:"libre", origen:"habito", habito:"parada", tag:"lectura",
        nota:par.por + (v ? " Esta semana: "+v+"." : "")});
    }
  }

  const yaHay = {}; out.forEach(x => { if(x.tag) yaHay[x.tag] = true; });
  const juntos = HABITOS.filter(h =>
    h.tipo !== "enganchado" && estaActivo(h, estado) && tocaHoy(h, dia.id, estado)
    && !(estado.hechosHabito || {})[claveHabito(h, dia.id, estado)]
    && !(h.tag && yaHay[h.tag]));

  if(juntos.length){
    const total = juntos.reduce((a, h) => a + h.obj, 0);
    const piso  = juntos.reduce((a, h) => a + h.piso, 0);
    let at = out.findIndex(x => x.k === "descompresion");
    if(at < 0) at = out.findIndex(x => /^cena/.test(x.k || "")) - 1;
    if(at < 0) at = out.length - 3;
    out.splice(at + 1, 0, {id:"hab:bolsa:"+dia.id, k:"bolsa", nom:"Tus hábitos de hoy",
      cat:"mente", min:total, piso, prio:3, tipo:"libre", origen:"habito",
      bolsa:juntos.map(h => h.id),
      nota:juntos.map(h => h.nom+" "+hm(h.obj)).join(" · ")+
        ". No tienen hora: hazlos en el orden que quieras. El tiempo está reservado para que la cuenta del sueño no te mienta."});
  }
  return out;
}

export function claveHabito(h, diaId, estado){
  return h.id+":"+diaId+":"+(estado.semana || "");
}

/* 5 · los ajustes manuales, SOBRE EL DÍA YA COMPLETO. */
function capaAjustes(bloques, estado){
  const aj = estado.ajustes || {};
  let out = bloques
    .filter(x => !(aj[x.id] && aj[x.id].fuera))
    .map(x => {
      const a = aj[x.id]; if(!a) return x;
      const y = Object.assign({}, x, {ajustado:true});
      if(a.min)  y.min = Math.max(5, a.min);
      if(a.hora){ y.tipo = "ancla"; y.hora = a.hora; y.clavado = true; }
      return y;
    });
  Object.keys(aj).forEach(id => {
    const mv = aj[id].mover; if(!mv) return;
    const i = out.findIndex(x => x.id === id); if(i < 0) return;
    const j = Math.max(1, Math.min(out.length - 2, i + mv));
    if(j !== i) out.splice(j, 0, out.splice(i, 1)[0]);
  });
  return out;
}

/* ---------------- resolución de horas ----------------
   Coloca cada bloque respetando su tipo. Devuelve huecos y conflictos
   en vez de decidir por Carlos. */
function resolver(bloques, dia, desde){
  const out = bloques.map(x => Object.assign({}, x));
  const arranque = aMin(out[0].desde || dia.arranque);
  const horaDe = (x) => { let h = aMin(x.hora); return h < arranque ? h + 1440 : h; };

  // Hora del próximo ancla desde cada posición, para saber cuánto sitio hay.
  const proxima = new Array(out.length).fill(Infinity);
  for(let i = out.length - 1, sig = Infinity; i >= 0; i--){
    proxima[i] = sig;
    if(out[i].tipo === "ancla" && out[i].hora) sig = horaDe(out[i]);
  }

  const huecos = [], conflictos = [];
  let t = arranque, i = 0, diferidos = [];

  if(desde && desde.i >= 0){
    i = Math.min(desde.i + 1, out.length - 1);
    t = desde.t < arranque ? desde.t + 1440 : desde.t;
  }
  const poner = (x, ini, min) => { x.ini = aHora(ini); x.fin = aHora(ini + min);
    x.dur = min; return ini + min; };
  const vaciar = () => { diferidos.forEach(x => { x.diferido = true; t = poner(x, t, x.min); });
    diferidos = []; };

  for(; i < out.length; i++){
    const x = out[i];
    if(x.cat === "sueno") break;

    if(x.tipo === "ancla" && x.hora){
      const ini = horaDe(x);
      if(t > ini + 1) conflictos.push({id:x.id, nom:x.nom, hora:aHora(ini),
        tarde:t - ini, clase:"ancla"});
      else if(ini - t >= 10) huecos.push({desde:t, hasta:ini, min:ini - t,
        antes:x.id, nom:x.nom});
      t = poner(x, ini, x.min);
      vaciar();
      continue;
    }

    if(x.tipo === "ventana" && x.ventana){
      const ini = Math.max(t, x.ventana[0]);
      if(ini - t >= 10) huecos.push({desde:t, hasta:ini, min:ini - t,
        antes:x.id, nom:"que abra "+x.nom});
      if(ini + x.min > x.ventana[1]) conflictos.push({id:x.id, nom:x.nom,
        clase:"cierre", cierra:x.ventana[1] + CIERRE_COLCHON,
        excede:(ini + x.min) - x.ventana[1]});
      t = poner(x, ini, x.min);
      continue;
    }

    // Contra un ancla el bloque se recorta hasta donde haya sitio; solo
    // se difiere cuando no queda nada. Un traslado no se recorta ni se
    // difiere: si no cabe, llegas tarde y el ancla lo dice.
    const sitio = proxima[i] - t;
    if(x.min > sitio + 1 && x.cat !== "traslado"){
      if(sitio <= 0){ diferidos.push(x); continue; }
      const piso = x.piso != null ? x.piso : x.min;
      const usa = Math.max(Math.min(sitio, x.min), Math.min(piso, sitio));
      x.recortado = x.min - usa;
      t = poner(x, t, usa);
      continue;
    }
    t = poner(x, t, x.min);
  }
  vaciar();

  const fin = out[out.length - 1];
  let sueno = 0;
  if(fin && fin.cat === "sueno"){
    sueno = aMin(fin.hasta) - t; if(sueno <= 0) sueno += 1440;
    fin.ini = aHora(t); fin.fin = fin.hasta; fin.dur = sueno;
  }
  return {bloques:out, huecos, conflictos, sueno};
}

/* ---------------- la función que usa toda la app ---------------- */
export function construirDia(estado, diaId){
  const dia = SEMANA.find(d => d.id === diaId);
  if(!dia) throw new Error("día desconocido: "+diaId);

  let bs = capaBase(dia, estado);
  bs = capaTrabajo(bs, dia, estado);
  bs = capaTareas(bs, dia, estado);
  bs = capaHabitos(bs, dia, estado);
  bs = capaAjustes(bs, estado);

  const sinCarga = resolver(capaAjustes(capaBase(dia, estado), estado), dia).sueno;
  const real = (estado.real || {})[diaId];
  let r = resolver(bs, dia, real ? {i:bs.findIndex(x => x.id === real.id), t:aMin(real.hora)} : null);

  // El sueño no paga los hábitos: bajo 6 h la bolsa cae sola a su piso.
  // Si Carlos le puso la duración a mano, manda él — subirla es decidir
  // dormir menos, y el aviso de noche corta ya se lo dice.
  const bolsa = r.bloques.find(x => x.k === "bolsa");
  const manual = bolsa && (estado.ajustes || {})[bolsa.id] && (estado.ajustes || {})[bolsa.id].min;
  if(bolsa && !manual && r.sueno < 360 && bolsa.min > (bolsa.piso || 0)){
    const bs2 = bs.map(x => x.k === "bolsa" ? Object.assign({}, x, {min:x.piso || 0, aPiso:true}) : x);
    r = resolver(bs2, dia, real ? {i:bs2.findIndex(x => x.id === real.id), t:aMin(real.hora)} : null);
  }

  return Object.assign(r, {
    dia,
    desborde: r.sueno < sinCarga ? sinCarga - r.sueno : 0,
    orden: r.bloques.map((x, i) => i).sort((a, bb) => {
      const A = absoluto(r.bloques, a, dia), B = absoluto(r.bloques, bb, dia);
      return A === B ? a - bb : A - B;
    })
  });
}

/* Minuto absoluto de arranque, para leer el día en orden cronológico:
   un bloque diferido ocurre después aunque en el arreglo venga antes. */
export function absoluto(bloques, i, dia){
  const base = aMin(bloques[0].desde || dia.arranque);
  let t = aMin(bloques[i].ini || "00:00");
  return t < base ? t + 1440 : t;
}

export function construirSemana(estado){
  const out = {};
  SEMANA.forEach(d => { out[d.id] = construirDia(estado, d.id); });
  return out;
}

/* Cuánto se puso de cada innegociable en la semana. */
export function contadores(estado){
  const sem = construirSemana(estado), puesto = {};
  let traslados = 0, noches = [];
  Object.values(sem).forEach(r => {
    r.bloques.forEach(x => {
      if(x.tag) puesto[x.tag] = (puesto[x.tag] || 0) + (x.dur || 0);
      if(x.cat === "traslado") traslados += x.dur || 0;
    });
    noches.push(r.sueno);
  });
  return {
    metas: METAS.map(m => ({...m, puesto: puesto[m.tag] || 0,
      sesiones_puestas: m.sesiones
        ? Object.values(sem).reduce((a, r) => a + r.bloques.filter(x => x.tag === m.tag).length, 0)
        : null})),
    traslados,
    suenoProm: Math.round(noches.reduce((a, b) => a + b, 0) / noches.length)
  };
}
