/* ============================================================
   LOS DOS RITUALES

   Domingo por la noche: cierra la semana con los datos reales y abre
   la siguiente. El lunes arranca en cero — efecto de nuevo comienzo:
   una semana mala no se arrastra.

   Cada noche, 5 min: mirar mañana antes de dormir reduce la rumia.
   ============================================================ */
import { SEMANA } from "./semana.js";
import { HABITOS, habito, activos, estaActivo, tocaHoy, diasDe, varianteDe,
         costoSemanal, estadoHabito, avance } from "./habitos.js";
import { construirDia, hm, aHora } from "./motor.js";
import { esc, indiceHoy, minutosAhora, E } from "./vista.js";

let pasoSem = 0, pasoDia = 0, AL = null;

const NOM = {lun:"Lunes",mar:"Martes",mie:"Miércoles",jue:"Jueves",
             vie:"Viernes",sab:"Sábado",dom:"Domingo"};

const PSEM = [
  {id:"balance", q:"¿Cómo salió la semana?"},
  {id:"tiendas", q:"¿Qué tiendas te tocan?"},
  {id:"capa",    q:"¿Qué días hay capacitación?"},
  {id:"futbol",  q:"¿A qué hora los partidos?"},
  {id:"social",  q:"¿Algún compromiso social?"},
  {id:"tareas",  q:"¿Tareas de la U y del juego?"},
  {id:"dias",    q:"¿Qué días caen tesis y el juego?"},
  {id:"ola",     q:"¿Qué hábitos tienes encendidos?"}
];
const PDIA = [
  {id:"cierra",  q:"Cierra hoy"},
  {id:"nuevo",   q:"¿Algo nuevo para mañana?"},
  {id:"manana",  q:"Mañana toca esto"},
  {id:"comodin", q:"El comodín de mañana"}
];

export function pintarRituales(almacen){
  AL = almacen || AL; if(!AL) return;
  pinta("ritSem", PSEM, pasoSem, cuerpoSem, n => { pasoSem = n; }, "Ritual del domingo",
    "Quince minutos que deciden la semana. El lunes arranca en cero: lo que salió mal no se arrastra.");
  pinta("ritDia", PDIA, pasoDia, cuerpoDia, n => { pasoDia = n; }, "Cinco minutos antes de dormir",
    "Cierra hoy y mira mañana. Dejar los pendientes escritos antes de acostarte es lo que evita repasarlos en la cama.");
}

function pinta(id, pasos, actual, cuerpo, set, titulo, sub){
  const c = document.getElementById(id); if(!c) return;
  const p = pasos[actual];
  c.innerHTML = '<h3>'+titulo+'</h3><p class="why">'+sub+'</p>'+
    '<div class="progreso">'+pasos.map((x,i)=>'<i class="'+(i<=actual?"on":"")+'"></i>').join("")+'</div>'+
    '<div class="paso"><div class="q">'+p.q+'</div><div class="cuerpo-paso"></div></div>'+
    '<div class="addrow" style="margin-top:13px">'+
      '<button class="btn ghost chico" data-ir="-1"'+(actual===0?" disabled":"")+'>Atrás</button>'+
      '<button class="btn chico" data-ir="1">'+(actual===pasos.length-1?"Listo":"Siguiente")+'</button>'+
      '<span style="margin-left:auto;font-size:11.5px;color:var(--ink-3);align-self:center">'+
        (actual+1)+' de '+pasos.length+'</span></div>';
  cuerpo(c.querySelector(".cuerpo-paso"), p.id);
  c.querySelectorAll("[data-ir]").forEach(b => b.onclick = () => {
    set((actual + (+b.dataset.ir) + pasos.length) % pasos.length);
    pintarRituales();
  });
}

function lista(items){
  return '<ul class="pend">'+items.map(x =>
    '<li><span class="t">'+esc(x.a)+'</span><span class="m">'+esc(x.b)+'</span></li>').join("")+'</ul>';
}

function cuerpoSem(n, id){
  if(id === "balance"){
    const av = avance(E());
    const total = av.reduce((a,f)=>a+f.min,0);
    n.innerHTML = (av.length
      ? lista(av.map(f => ({a:f.h.nom, b:f.plenos+" de "+f.tocaba+(f.pisos?" (+"+f.pisos+" piso)":"")})))
      : '<p class="why">Todavía no marcaste nada esta semana.</p>')+
      '<p class="why" style="margin-top:9px">Minutos reales acumulados: <b>'+hm(total)+'</b>.</p>';
    return;
  }
  if(id === "tiendas"){
    n.innerHTML = lista((E().programacion||[]).map(r => ({
      a: NOM[r.dia]+" · "+((r.tiendas||[]).join(", ") || r.tipo),
      b: r.tipo })))+
      '<p class="why" style="margin-top:9px">Para cargar la semana nueva, sube la foto del plan de banca en la pestaña Semana.</p>';
    return;
  }
  if(id === "capa"){
    n.innerHTML = lista((E().programacion||[]).filter(r=>r.tipo==="capacitacion")
      .map(r => ({a:NOM[r.dia], b:(r.horaFija||"14:00")+" · "+hm(r.min||150)})));
    return;
  }
  if(id === "futbol"){
    n.innerHTML = '<div class="frow">'+["mar","jue"].map(k =>
      '<div class="field"><label>'+NOM[k]+'</label><input type="time" data-fut="'+k+'" value="'+
      ((E().partidos||{})[k]||"")+'"></div>').join("")+'</div>'+
      '<p class="why" style="margin-top:8px">Vacío = uso las 22:00, el escenario tardío. Nunca el optimista.</p>';
    n.querySelectorAll("[data-fut]").forEach(i => i.onchange = () =>
      AL.guardar(s => { if(i.value) s.partidos[i.dataset.fut] = i.value;
                       else delete s.partidos[i.dataset.fut]; }));
    return;
  }
  if(id === "social" || id === "tareas"){
    const social = id === "social";
    const items = (E().tareas||[]).filter(t => social ? !!t.hora : !t.hora);
    n.innerHTML = (items.length ? lista(items.map(t => ({
      a:t.txt, b:NOM[t.dia]+(t.hora?" "+t.hora:"")+" · "+hm(t.min)}))) : '<p class="why">Nada por ahora.</p>')+
      '<div class="addrow" style="margin-top:9px">'+
      '<input type="text" data-t="txt" placeholder="'+(social?"Cine con mis amigos":"Avance de tesis")+'" maxlength="80">'+
      '<select data-t="dia">'+SEMANA.map(d=>'<option value="'+d.id+'">'+d.corto+'</option>').join("")+'</select>'+
      (social?'<input type="time" data-t="hora" value="20:00" style="flex:0 0 108px">':'')+
      '<input type="number" data-t="min" value="'+(social?120:60)+'" min="10" max="480" step="10">'+
      '<button class="btn chico" data-add="1">Agregar</button></div>'+
      (social?'<p class="why" style="margin-top:8px">Un compromiso social entra como <b>ancla</b>: tiene hora acordada con otra gente y la app no lo mueve.</p>':'');
    n.querySelector("[data-add]").onclick = () => {
      const g = k => (n.querySelector('[data-t="'+k+'"]')||{}).value;
      if(!g("txt")) return;
      AL.guardar(s => s.tareas.push({id:"u"+Date.now(), txt:g("txt"), dia:g("dia"),
        min:+g("min")||60, hora: social ? g("hora") : null,
        cat: social ? "vinculo" : "u", tag: social ? null : "tesis"}));
    };
    return;
  }
  if(id === "dias"){
    n.innerHTML = HABITOS.filter(h => h.tipo==="flotante" && !h.dias).map(h => {
      const sel = diasDe(h, E());
      return '<div style="margin-bottom:11px"><div class="edl" style="margin-bottom:5px">'+
        esc(h.nom)+' · '+hm(h.obj)+'</div><div class="picker">'+SEMANA.map(d =>
        '<button type="button" class="pk'+(sel.indexOf(d.id)>=0?" on":"")+'" data-hd="'+h.id+
        '" data-d="'+d.id+'" style="--pkc:var(--c-'+h.cat+')">'+d.corto+'</button>').join("")+'</div></div>';
    }).join("")+'<p class="why">Tesis: tres días. Si eliges menos, la app no te regaña — te dice cuánto falta.</p>';
    n.querySelectorAll("[data-hd]").forEach(b => b.onclick = () => AL.guardar(s => {
      const l = (s.diasHabito[b.dataset.hd]||[]).slice(), i = l.indexOf(b.dataset.d);
      if(i>=0) l.splice(i,1); else l.push(b.dataset.d);
      s.diasHabito[b.dataset.hd] = l;
    }));
    return;
  }
  // ola
  const act = activos(E());
  const cuesta = act.reduce((a,id2) => { const h = habito(id2); return a + (h?costoSemanal(h,E()):0); }, 0);
  n.innerHTML = '<p class="why" style="margin-bottom:10px">La evidencia es incómoda pero clara: '+
    '<b>arrancar con dos o tres funciona, arrancar con ocho no.</b> Solo los encendidos ocupan '+
    'tiempo en tu semana; los apagados esperan aquí sin costarte nada.</p><div class="cands">'+
    HABITOS.map(h => '<button class="cand'+(estaActivo(h,E())?" on":"")+'" data-ola="'+h.id+'">'+
      '<span><b>'+(estaActivo(h,E())?"● ":"○ ")+esc(h.nom)+'</b><span class="p">'+esc(h.por)+
      '</span></span><span class="m">'+hm(costoSemanal(h,E()))+'<br>por semana</span></button>').join("")+
    '</div><p class="why" style="margin-top:10px">Encendidos ahora: <b>'+hm(cuesta)+
    '</b> a la semana. Cada minuto sale de algún lado, casi siempre del sueño.</p>';
  n.querySelectorAll("[data-ola]").forEach(b => b.onclick = () => AL.guardar(s => {
    const l = activos(s).slice(), i = l.indexOf(b.dataset.ola);
    if(i>=0) l.splice(i,1); else l.push(b.dataset.ola);
    s.olaHabitos = l;
  }));
}

function cuerpoDia(n, id){
  const hoy = SEMANA[indiceHoy()], man = SEMANA[(indiceHoy()+1)%7];
  if(id === "cierra"){
    const hs = HABITOS.filter(h => estaActivo(h,E()) && tocaHoy(h,hoy.id,E()));
    if(!hs.length){ n.innerHTML = '<p class="why">Hoy no te tocaba ningún hábito. Descansa.</p>'; return; }
    n.innerHTML = '<div class="cands">'+hs.map(h => {
      const st = estadoHabito(E(), h, hoy.id);
      return '<button class="cand" data-cd="'+h.id+'"><span><b>'+esc(h.nom)+'</b><span class="p">'+
        (st==="pleno"?"Hecho":(st==="piso"?"Hiciste el piso":"Toca marcarlo o dejarlo"))+
        '</span></span><span class="m">'+(st?"✓":hm(h.obj))+'</span></button>';
    }).join("")+'</div><p class="why" style="margin-top:9px">Un día perdido no rompe nada. Dos seguidos sí — por eso vale la pena marcar hasta el piso.</p>';
    n.querySelectorAll("[data-cd]").forEach(b => b.onclick = () => AL.guardar(s => {
      const k = b.dataset.cd+":"+hoy.id+":"+s.semana, st = s.hechosHabito[k];
      if(st === "pleno") s.hechosHabito[k] = "piso";
      else if(st === "piso") delete s.hechosHabito[k];
      else s.hechosHabito[k] = "pleno";
    }));
    return;
  }
  if(id === "nuevo"){
    n.innerHTML = '<div class="addrow"><input type="text" id="pTxt" placeholder="Lo que se te cruzó hoy" maxlength="120">'+
      '<input type="number" id="pMin" value="30" min="5" max="480" step="5">'+
      '<button class="btn chico" id="pAdd">Anotar</button></div>'+
      lista((E().pendientes||[]).filter(p=>!p.hecho).map(p => ({a:p.txt, b:hm(p.min||30)})));
    n.querySelector("#pAdd").onclick = () => {
      const t = n.querySelector("#pTxt");
      if(!t.value.trim()) return;
      AL.guardar(s => s.pendientes.push({id:Date.now(), txt:t.value.trim(),
        min:+n.querySelector("#pMin").value||30, hecho:false}));
    };
    return;
  }
  if(id === "manana"){
    const r = construirDia(E(), man.id);
    const hs = HABITOS.filter(h => estaActivo(h,E()) && tocaHoy(h,man.id,E()));
    n.innerHTML = '<p class="why" style="margin-bottom:9px"><b>'+man.nom+'</b> arranca '+
      r.bloques[r.orden[0]].ini+' y duermes '+hm(r.sueno)+'.</p>'+
      (hs.length ? lista(hs.map(h => ({a:h.nom+(varianteDe(h,E())?" · "+varianteDe(h,E()):""), b:hm(h.obj)})))
                 : '<p class="why">Mañana no toca ningún hábito.</p>')+
      (r.conflictos.length ? '<p class="eaviso">Mañana ya viene apretado: '+
        esc(r.conflictos[0].nom)+'. Míralo hoy, no mañana a las siete.</p>' : '');
    return;
  }
  const val = (E().comodin||{})[man.id] || "";
  n.innerHTML = '<div class="addrow"><input type="text" id="cmd" maxlength="80" value="'+esc(val)+
    '" placeholder="Déjalo vacío y decides mañana"></div>'+
    '<p class="why" style="margin-top:9px">Treinta minutos que eliges tú. Dejarlo en blanco es una '+
    'respuesta válida: la libertad de elegir en el momento es justamente el punto.</p>';
  n.querySelector("#cmd").onchange = function(){
    AL.guardar(s => { s.comodin[man.id] = this.value.trim(); });
  };
}
