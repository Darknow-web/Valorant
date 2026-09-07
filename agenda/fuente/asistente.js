/* ============================================================
   ASISTENTE — lo que le pregunta a Claude desde la página, y la
   sincronización con Google Calendar.

   Todo degrada a nada si el visor no concede la capacidad: el
   horario, el editor y los rituales son locales y siguen funcionando.
   ============================================================ */
import { GRUPOS } from "./catalogo.js";
import { construirSemana, hm, tienda } from "./motor.js";
import { esc, E } from "./vista.js";
import { fechaDe, OFFSET } from "./estado.js";

let sample = null, mcp = null, AS = null;
const CAL = "Google Calendar", CAL_ID = "cingacordova@gmail.com";

const ERR = {
  not_granted:  "No diste permiso para esto. Puedes concederlo y volver a intentar.",
  rate_limited: "Llegaste al límite de uso por ahora. Espera un rato.",
  cancelled:    "Cancelado.",
  server_not_connected: "Tu Google Calendar no está conectado en Claude."
};
const err = e => (e && ERR[e.code]) || ("Algo falló ("+((e&&e.code)||"desconocido")+").");
const pensando = (n, t) => { n.innerHTML = '<p class="pensando">'+(t||"Pensando…")+'</p>'; };

/* Resumen compacto de la semana. Es lo que hace barata cada llamada:
   se manda esto y el prompt, no una conversación entera. */
function contexto(){
  const s = construirSemana(E());
  return Object.values(s).map(r =>
    r.dia.nom+": "+r.bloques.filter(b=>b.cat!=="traslado")
      .map(b=>b.ini+" "+b.nom).join(" | ")+" · duerme "+hm(r.sueno)
  ).join("\n");
}

export function pintarCartera(){
  const n = document.getElementById("cartera"); if(!n) return;
  n.innerHTML = '<div class="shead"><h2>Tu cartera</h2><span class="eyebrow">20 tiendas</span></div>'+
    '<p class="sub" style="margin:0 0 11px">Minutos <b>medidos</b> desde tu casa: cada dirección '+
    'real ruteada con OSRM y ajustada a hora punta. Un día dentro del mismo grupo cuesta ~23 min '+
    'por salto; cruzar grupos cuesta ~57. Ahí está la decisión que más tiempo te ahorra.</p>'+
    GRUPOS.map(g => '<div class="grupo"><div class="ghead"><i style="background:'+g.color+'"></i>'+
      g.nom+' <span>'+g.tiendas.length+'</span></div><ul class="glist">'+
      g.tiendas.map(t => '<li><b class="mono">'+t[0]+'</b> <span class="tn">'+esc(t[1])+
        '</span><span class="tz">'+esc(t[2])+'</span><span class="mins mono">'+t[4]+
        ' min</span><span class="cat">'+t[3]+'</span></li>').join("")+'</ul></div>').join("");
}

export async function iniciarAsistente(claude, almacen){
  AS = almacen;
  try { sample = await claude.use("sample"); } catch(e){}
  try { mcp = await claude.use("mcp"); } catch(e){}
  if(!sample && !mcp) return;

  const zona = document.createElement("section");
  zona.style.marginTop = "24px";
  zona.innerHTML = '<div class="shead"><h2>Preguntarle a Claude</h2>'+
    '<span class="eyebrow">Sin pasar por el chat</span></div>'+
    '<p class="sub" style="margin:0 0 13px">Cada llamada manda solo tu horario y el prompt, '+
    'no una conversación entera. Gasta tu uso de Claude, pero una fracción de lo que cuesta un chat largo.</p>';

  if(sample){
    const lim = await sample.limits().catch(() => ({}));
    if(lim && lim.images) zona.appendChild(tarjeta("La foto de tu plan de banca",
      "Sube la captura. Te muestro lo que entendí antes de tocar nada.",
      '<input type="file" id="fotoIn" accept="image/*"><button class="btn" id="fotoGo">Leer la foto</button>'));
    zona.appendChild(tarjeta("Pregunta lo que sea de tu semana",
      "«¿Me da tiempo de ir al gym hoy?» · «¿Cuándo meto SP33?» · «¿Qué dejo de hacer esta semana?»",
      '<input type="text" id="preIn" placeholder="Tu pregunta" maxlength="300">'+
      '<button class="btn" id="preGo">Preguntar</button>'));
    zona.appendChild(tarjeta("Reporte del domingo",
      "Lee lo que cumpliste de verdad, con las horas reales de cierre, y te dice qué bloques se caen siempre. Eso corrige el horario, no tu voluntad.",
      '<button class="btn" id="repGo">Ver el reporte</button>'));
  }
  if(mcp) zona.appendChild(tarjeta("Sincronizar tu Google Calendar",
    "Crea y mueve los eventos de la semana con las horas que ves aquí. Sin verificar contra tu calendario todavía.",
    '<button class="btn" id="calGo">Sincronizar</button>'));

  document.getElementById("v-semana").appendChild(zona);
  const on = (id, fn) => { const b = document.getElementById(id); if(b) b.onclick = fn; };
  on("fotoGo", leerFoto); on("preGo", preguntar); on("repGo", reporte); on("calGo", sincronizar);
}

function tarjeta(tit, why, controles){
  const d = document.createElement("div");
  d.className = "acard";
  d.innerHTML = '<h3>'+tit+'</h3><p class="why">'+why+'</p>'+
    '<div class="addrow" style="margin-top:10px">'+controles+'</div><div class="salida"></div>';
  return d;
}
const salidaDe = (id) => document.getElementById(id).closest(".acard").querySelector(".salida");

async function leerFoto(){
  const out = salidaDe("fotoGo"), f = document.getElementById("fotoIn").files[0];
  if(!f){ out.innerHTML = '<p class="why">Elige primero la captura.</p>'; return; }
  pensando(out, "Leyendo la foto… esto tarda entre 10 y 60 segundos.");
  try {
    const data = await sample.json(
      "Esta imagen es el plan de banca semanal de Carlos, Entrenador de Marca en SuperPet (Lima). "+
      "Extrae SOLO su fila. Devuelve un array JSON, un objeto por actividad:\n"+
      '[{"dia":"lun|mar|mie|jue|vie|sab","tipo":"visita|turno-completo|capacitacion|tienda-escuela|oficina",'+
      '"tiendas":["SP41"],"horaFija":"14:00 o null","detalle":"texto corto","confianza":"alta|baja"}]\n'+
      "El ORDEN del array es el orden real del día. Una tienda platino a la que le dedica el día "+
      "entero es turno-completo. Los códigos tienen forma SPnn. Si dudas de algo, ponlo con "+
      'confianza "baja". Responde solo el array.',
      {images: f, modelTier: "default"});
    if(!Array.isArray(data)) throw new Error("respuesta rara");
    out.innerHTML = '<div class="respuesta"><b>Esto entendí</b><ul class="plain">'+
      data.map(r => '<li>'+(r.confianza==="baja"?'<b>(dudoso)</b> ':'')+
        (r.dia||"?")+' · '+(r.tipo||"?")+' '+((r.tiendas||[]).join(", "))+'</li>').join("")+
      '</ul></div><div class="addrow" style="margin-top:10px">'+
      '<button class="btn" id="confOk">Aplicar a la semana</button>'+
      '<button class="btn ghost" id="confNo">Descartar</button></div>';
    document.getElementById("confNo").onclick = () => { out.innerHTML = ""; };
    document.getElementById("confOk").onclick = () => {
      AS.guardar(s => { s.programacion = data.filter(Boolean); });
      out.innerHTML = '<p class="ok">Aplicada: '+data.length+' actividades.</p>';
    };
  } catch(e){ out.innerHTML = '<p class="eaviso">'+err(e)+'</p>'; }
}

let ctl = null;
async function preguntar(){
  const out = salidaDe("preGo"), q = document.getElementById("preIn").value.trim();
  if(!q) return;
  if(ctl) ctl.abort();
  ctl = new AbortController();
  pensando(out);
  try {
    await sample(contexto()+"\n\nPregunta de Carlos: \""+q+"\"\n\n"+
      "Responde corto y concreto, con horas cuando aplique. Si la respuesta es que no le da el "+
      "tiempo, dilo claro y propón qué mover. Habla directo, sin rodeos ni listas largas.",
      {signal: ctl.signal, modelTier: "quick",
       onText: ev => { out.innerHTML = '<div class="respuesta"><p>'+
         esc(ev.text).replace(/\n/g,"<br>")+'</p></div>'; }});
  } catch(e){ out.innerHTML = '<p class="eaviso">'+err(e)+'</p>'; }
}

async function reporte(){
  const out = salidaDe("repGo");
  pensando(out, "Revisando lo que cumpliste…");
  const s = construirSemana(E());
  const filas = [];
  Object.values(s).forEach(r => r.bloques.forEach(b => {
    if(b.cat === "sueno" || b.cat === "traslado") return;
    const reg = (E().hechos||{})[b.id];
    filas.push(r.dia.nom+" · "+b.nom+" (plan "+b.ini+"–"+b.fin+"): "+
      (reg ? "cerrado "+reg.t : "no marcado"));
  }));
  try {
    await sample("Este es el cumplimiento real de Carlos esta semana:\n"+filas.join("\n")+
      "\n\nDile en cuatro frases: qué bloque se cae SIEMPRE, si el desvío sugiere que las "+
      "duraciones están mal calculadas, y una sola cosa concreta que cambiar la semana que "+
      "viene. Nada de felicitaciones genéricas ni de sermones sobre disciplina.",
      {modelTier: "default",
       onText: ev => { out.innerHTML = '<div class="respuesta"><p>'+
         esc(ev.text).replace(/\n/g,"<br>")+'</p></div>'; }});
  } catch(e){ out.innerHTML = '<p class="eaviso">'+err(e)+'</p>'; }
}

function fechaISO(diaId, hhmm){
  const d = fechaDe(diaId);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+
    String(d.getDate()).padStart(2,"0")+"T"+hhmm+":00";
}

async function sincronizar(){
  const out = salidaDe("calGo");
  pensando(out, "Sincronizando…");
  const s = construirSemana(E());
  const eventos = [];
  Object.values(s).forEach(r => r.bloques.forEach(b => {
    if(b.origen !== "prog") return;
    if(b.cat !== "trabajo") return;
    eventos.push({dia:r.dia.id, ini:b.ini, fin:b.fin, tit:b.nom, det:b.nota||"", id:b.id});
  }));
  const hechas = [], fallos = [];
  for(const ev of eventos){
    const cuerpo = {calendarId: CAL_ID, summary: ev.tit,
      description: ev.det+"\n\nCreado desde Semana Blindada. Duración en peor escenario.",
      startTime: fechaISO(ev.dia, ev.ini), endTime: fechaISO(ev.dia, ev.fin),
      timeZone: "America/Lima", colorId: "10"};
    try {
      const guardado = (E().calIds||{})[ev.id];
      if(guardado){
        await mcp.callTool(CAL, "update_event", Object.assign({eventId: guardado}, cuerpo));
        hechas.push("Actualizado: "+ev.tit+" "+ev.ini+"–"+ev.fin);
      } else {
        const res = await mcp.callTool(CAL, "create_event", cuerpo);
        const id = res && res.payload && res.payload.id;
        if(id) AS.guardar(st => { st.calIds[ev.id] = id; });
        hechas.push("Creado: "+ev.tit+" "+ev.ini+"–"+ev.fin);
      }
    } catch(e){ fallos.push(ev.tit+" — "+err(e)); }
  }
  out.innerHTML = (hechas.length ? '<div class="respuesta"><b>Listo</b><p>'+
      hechas.join("<br>")+'</p></div>' : '')+
    (fallos.length ? '<p class="eaviso">'+fallos.join("<br>")+'</p>' : '');
}
