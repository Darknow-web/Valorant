/* ============================================================
   VISTA — render por clave.

   La lista se actualiza POR ID: lo que no cambió no se vuelve a
   crear. La versión anterior reemplazaba el HTML entero del día en
   cada toque, y eso produjo tres bugs distintos — el panel se cerraba
   solo, la pantalla saltaba 236 px en el celular y el bloque que
   estabas editando desaparecía.

   Y la regla que costó cuarenta escrituras con el mismo número: un
   control LEE del estado y ESCRIBE al estado. Nunca toma su punto de
   partida de lo que hay dibujado.
   ============================================================ */

import { construirDia, construirSemana, contadores, aMin, aHora, hm } from "./motor.js";
import { SEMANA, METAS } from "./semana.js";
import { HABITOS, habito, activos, estaActivo, tocaHoy, diasDe, varianteDe,
         costoSemanal, estadoHabito, fallosSeguidos, racha, avance } from "./habitos.js";
import { fechaTexto, OFFSET } from "./estado.js";

let A = null;                 // almacén
let diaActivo = 0;
let abierto = null;           // id del bloque con el panel desplegado
let verPasado = false;
let ahoraSim = null;          // solo para pruebas

export function iniciar(almacen){ A = almacen; }
export const E = () => A.estado;

/* ---------------- utilidades ---------------- */
export const esc = (s) => String(s == null ? "" : s)
  .replace(/[<>&"]/g, c => ({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));
export function minutosAhora(){
  if(ahoraSim != null) return ahoraSim;
  const d = new Date(); return d.getHours()*60 + d.getMinutes();
}
export function fijarAhora(m){ ahoraSim = m; }
export function indiceHoy(){ const j = new Date().getDay(); return j === 0 ? 6 : j - 1; }
export const esHoy = (i) => i === indiceHoy();

const el = (tag, cls, txt) => { const n = document.createElement(tag);
  if(cls) n.className = cls; if(txt != null) n.textContent = txt; return n; };

/* ---------------- estado derivado del día ---------------- */
function dia(){ return SEMANA[diaActivo]; }
function plan(){ return construirDia(E(), dia().id); }

/* Índice del bloque en curso dentro del orden cronológico. */
function enCurso(r){
  const t = minutosAhora();
  for(const i of r.orden){
    const b = r.bloques[i];
    if(b.cat === "sueno") continue;
    const ini = aMin(b.ini), fin = ini + b.dur;
    if(t >= ini && t < fin) return b.id;
    if(t < ini) return null;
  }
  return null;
}
/* Un bloque de las 00:15 pertenece a la madrugada SIGUIENTE: comparar
   su hora de reloj contra "ahora" lo daba por pasado y el plegado se
   tragaba medio día. Se mide en minutos absolutos desde el arranque. */
function absDe(r, b){
  const base = aMin(r.bloques[r.orden[0]].ini);
  let t = aMin(b.ini);
  return t < base ? t + 1440 : t;
}
function yaPaso(r, b){ return absDe(r, b) + b.dur <= minutosAhora(); }

/* ---------------- pestañas de día ---------------- */
function pintarTabs(){
  const cont = document.getElementById("tabs");
  cont.innerHTML = "";
  SEMANA.forEach((d, i) => {
    const b = el("button", "tb" + (esHoy(i) ? " hoy" : ""));
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(i === diaActivo));
    b.innerHTML = "<b>" + fechaTexto(d.id).split(" ")[0] + "</b>" + d.corto;
    b.onclick = () => { diaActivo = i; verPasado = false; abierto = null; pintar(); };
    cont.appendChild(b);
  });
}

/* ---------------- la tarjeta Ahora ---------------- */
function pintarAhora(r){
  const c = document.getElementById("ahora");
  c.innerHTML = "";
  const caja = el("div", "ahora");

  if(!esHoy(diaActivo)){
    caja.innerHTML = '<div class="top"><span class="lbl">Otro día</span></div>' +
      '<div class="nom">' + esc(dia().nom) + '</div>' +
      '<div class="meta">Estás viendo un día que no es hoy.</div>';
    const b = el("button", "lnk", "Ir a hoy");
    b.onclick = () => { diaActivo = indiceHoy(); abierto = null; pintar(); };
    caja.querySelector(".meta").appendChild(document.createTextNode(" "));
    caja.querySelector(".meta").appendChild(b);
    c.appendChild(caja); return;
  }

  const idCurso = enCurso(r);
  const b = idCurso ? r.bloques.find(x => x.id === idCurso) : null;
  const marcables = r.bloques.filter(x => x.cat !== "sueno" && x.cat !== "traslado");
  const hechos = marcables.filter(x => (E().hechos || {})[x.id]).length;
  const pct = marcables.length ? Math.round(hechos / marcables.length * 100) : 0;

  if(!b){
    const t = minutosAhora(), pri = r.bloques[r.orden[0]];
    const fin = t >= aMin(pri.ini);
    caja.innerHTML = '<div class="top"><span class="lbl">Hoy</span>' +
      '<span class="reloj">' + pct + ' % del día</span></div>' +
      '<div class="nom">' + (fin ? "Día cerrado" : "El día no ha arrancado") + '</div>' +
      '<div class="meta">' + (fin ? "A dormir."
        : "Empieza <b>" + pri.ini + "</b> con " + esc(pri.nom)) + '</div>';
    c.appendChild(caja); return;
  }

  const t = minutosAhora(), ini = aMin(b.ini), quedan = ini + b.dur - t;
  const avance2 = Math.round((t - ini) / b.dur * 100);
  const sig = r.orden.map(i => r.bloques[i])
    .find(x => x.cat !== "sueno" && aMin(x.ini) > ini);
  caja.innerHTML =
    '<div class="top"><span class="lbl">Ahora · ' + b.ini + '–' + b.fin + '</span>' +
    '<span class="reloj">' + pct + ' % del día</span></div>' +
    '<div class="nom">' + esc(b.nom) + '</div>' +
    '<div class="meta"><b>' + hm(quedan) + '</b> por delante · terminaba ' + b.fin + '</div>' +
    '<div class="barra"><i style="width:' + Math.max(3, Math.min(100, avance2)) + '%"></i></div>' +
    (sig ? '<div class="luego">luego <b>' + esc(sig.nom) + '</b><span class="h">' + sig.ini + '</span></div>' : '');
  const btn = el("button", "cerrar", "Terminé esto — son las " + aHora(t));
  btn.onclick = () => {
    A.guardar(s => {
      s.hechos[b.id] = {t: aHora(minutosAhora()), plan: b.fin};
      s.real[dia().id] = {id: b.id, hora: aHora(minutosAhora()), nom: b.nom};
    });
  };
  caja.appendChild(btn);
  c.appendChild(caja);
}

/* ---------------- franja de hábitos ---------------- */
function pintarTira(){
  const c = document.getElementById("tira");
  const hoy = HABITOS.filter(h => estaActivo(h, E()) && tocaHoy(h, dia().id, E()));
  if(!hoy.length){ c.innerHTML = ""; return; }
  c.innerHTML = '<div class="eyebrow">Hoy toca</div>';
  const caja = el("div", "hchips");
  hoy.forEach(h => {
    const st = estadoHabito(E(), h, dia().id);
    const fs = fallosSeguidos(E(), h, diaActivo), rr = racha(E(), h, diaActivo);
    const v = varianteDe(h, E());
    const n = el("div", "hchip" + (st ? " ok" : "") + (fs >= 2 ? " mal" : ""));
    n.innerHTML = '<div class="hn">' + esc(h.nom) +
      (st === "piso" ? '<span class="hp">piso</span>' : '') + '</div>' +
      '<div class="hm">' + hm(h.obj) + (v ? ' · ' + esc(v) : '') +
      (rr ? ' · racha ' + rr : '') + '</div>' +
      (fs >= 2 ? '<div class="hw">' + fs + ' veces seguidas sin hacerlo. Hoy hazlo aunque sea el piso: un día perdido no rompe nada, dos seguidos sí.</div>' : '');
    const btns = el("div", "hbtns");
    const marca = (v2, txt) => { const b = el("button", "edb", txt);
      b.disabled = st === v2;
      b.onclick = () => A.guardar(s => {
        const k = h.id + ":" + dia().id + ":" + s.semana;
        if(v2) s.hechosHabito[k] = v2; else delete s.hechosHabito[k];
      });
      btns.appendChild(b); };
    marca("pleno", "Hecho");
    if(h.piso) marca("piso", "Hice el piso · " + h.piso + " min");
    if(st) marca(null, "Deshacer");
    n.appendChild(btns);
    caja.appendChild(n);
  });
  c.appendChild(caja);
}

/* ---------------- cabecera del día ---------------- */
function pintarCabecera(r){
  const c = document.getElementById("cab");
  let trab = 0, tras = 0, desp = 0;
  r.bloques.forEach(x => { if(x.cat === "sueno") return;
    desp += x.dur; if(x.cat === "trabajo") trab += x.dur;
    if(x.cat === "traslado") tras += x.dur; });

  let h = '<div class="dayhead"><div class="l1"><h2>' + dia().nom + '</h2>' +
    '<span class="fecha">' + fechaTexto(dia().id) + '</span>' +
    '<span class="res">' + esc(dia().res) + '</span></div><div class="pills">' +
    '<span class="pill' + (r.sueno < 390 ? " corta" : "") + '">Sueño <b>' + hm(r.sueno) + '</b></span>' +
    '<span class="pill">Trabajo <b>' + hm(trab) + '</b></span>' +
    '<span class="pill">Traslado <b>' + hm(tras) + '</b></span>' +
    '<span class="pill">Despierto <b>' + hm(desp) + '</b></span></div></div>';

  const ds = disciplina(r);
  if(ds) h += '<div class="discip">Disciplina · <b>' + ds.puntual + '</b> de <b>' + ds.n +
    '</b> cerrados a tiempo · desvío medio <b>' + (ds.medio > 0 ? "+" : "") + ds.medio +
    ' min</b>' + (ds.medio > 25 ? ' — el horario te está quedando corto, no es falta de ganas.' : '') + '</div>';

  if(dia().aviso) h += '<div class="aviso' + (dia().aviso.grave ? " alerta" : "") + '">' +
    dia().aviso.txt + '</div>';
  if(r.desborde) h += '<div class="aviso mal">Con lo programado este día te deja <b>' +
    hm(r.sueno) + '</b> de sueño: <b>' + hm(r.desborde) + '</b> menos de lo normal.</div>';
  if(r.bloques.some(x => x.aPiso)) h += '<div class="aviso alerta">Hoy tus hábitos van al ' +
    '<b>piso</b>: el día no daba para el objetivo completo y tu sueño no los paga.</div>';

  c.innerHTML = h;

  const ajs = Object.keys(E().ajustes || {}).filter(id =>
    r.bloques.some(x => x.id === id) || (E().ajustes[id] || {}).fuera);
  if(ajs.length){
    const a = el("div", "aviso");
    a.innerHTML = 'Ajustaste a mano <b>' + ajs.length + '</b> bloque' + (ajs.length > 1 ? "s" : "") + '. ';
    const b = el("button", "lnk", "Volver al plan original");
    b.onclick = () => A.guardar(s => { ajs.forEach(id => delete s.ajustes[id]); });
    a.appendChild(b); c.appendChild(a);
  }
  const real = (E().real || {})[dia().id];
  if(real){
    const a = el("div", "aviso");
    a.innerHTML = 'Reprogramado desde las <b>' + real.hora + '</b>, cuando cerraste <b>' +
      esc(real.nom) + '</b>. ';
    const b = el("button", "lnk", "Volver al plan");
    b.onclick = () => A.guardar(s => { delete s.real[dia().id]; });
    a.appendChild(b); c.appendChild(a);
  }
}

function disciplina(r){
  const ds = [];
  r.bloques.forEach(x => {
    const reg = (E().hechos || {})[x.id];
    if(!reg || !reg.t || !reg.plan) return;
    let d = aMin(reg.t) - aMin(reg.plan);
    if(d > 720) d -= 1440; if(d < -720) d += 1440;
    ds.push(d);
  });
  if(!ds.length) return null;
  return {n: ds.length, puntual: ds.filter(v => v <= 10).length,
          medio: Math.round(ds.reduce((a, b) => a + b, 0) / ds.length)};
}

/* ---------------- la lista, con render por clave ---------------- */
function pintarLista(r){
  const ul = document.getElementById("lista");
  const previos = {};
  [...ul.children].forEach(n => { if(n.dataset.id) previos[n.dataset.id] = n; });

  // Corte del pasado. El bloque con el panel abierto NUNCA se pliega:
  // recortarlo movía su fin al pasado y el plegado se lo tragaba entero.
  const visibles = r.orden.map(i => r.bloques[i]);
  let corte = -1;
  if(esHoy(diaActivo) && !verPasado){
    for(let k = 0; k < visibles.length; k++){
      const b = visibles[k];
      if(b.cat === "sueno") break;
      if(!yaPaso(r, b)) break;      // en cuanto uno no pasó, el resto tampoco
      corte = k;
    }
    const k = visibles.findIndex(b => b.id === abierto);
    if(k >= 0 && k <= corte) corte = k - 1;
  }

  const pleg = document.getElementById("plegado");
  if(corte >= 0){
    const n = corte + 1;
    const hechos = visibles.slice(0, n).filter(b => (E().hechos || {})[b.id]).length;
    pleg.hidden = false;
    pleg.innerHTML = '<b>' + n + '</b> bloques hasta las ' + visibles[corte].fin +
      ' · <b>' + hechos + '</b> cumplidos<span>ver</span>';
    pleg.onclick = () => { verPasado = true; pintar(); };
  } else if(esHoy(diaActivo) && verPasado){
    pleg.hidden = false;
    pleg.innerHTML = 'Ocultar lo que ya pasó<span>ocultar</span>';
    pleg.onclick = () => { verPasado = false; pintar(); };
  } else pleg.hidden = true;

  const idCurso = esHoy(diaActivo) ? enCurso(r) : null;
  const usados = {};
  let anterior = null;

  visibles.forEach((b, k) => {
    if(k <= corte) return;
    const li = previos[b.id] || crearFila(b);
    usados[b.id] = true;
    actualizarFila(li, b, r, idCurso);
    // Colocar en orden sin recrear: insertBefore mueve el nodo existente.
    ul.insertBefore(li, anterior ? anterior.nextSibling : ul.firstChild);
    anterior = li;
    pintarHuecoYConflicto(ul, r, b, li);
  });
  [...ul.children].forEach(n => {
    if(n.dataset.id && !usados[n.dataset.id]) n.remove();
    if(n.dataset.extra && !usados[n.dataset.extra]) n.remove();
  });

}

function crearFila(b){
  const li = el("li", "blk");
  li.dataset.id = b.id;
  li.innerHTML =
    '<div class="time"></div><div class="rail"></div>' +
    '<div class="cuerpo" role="button" tabindex="0"><div class="name"></div>' +
    '<div class="dur"></div><div class="ed" hidden></div></div>' +
    '<label class="done"><input type="checkbox"><span aria-hidden="true"></span><em>hecho</em></label>';
  const cuerpo = li.querySelector(".cuerpo");
  const abrir = () => {
    abierto = abierto === b.id ? null : b.id;
    pintar();
    if(abierto === b.id) setTimeout(() => {
      const e2 = li.querySelector(".ed");
      if(e2) e2.scrollIntoView({block:"nearest", behavior:"smooth"});
    }, 40);
  };
  cuerpo.addEventListener("click", e => { if(!e.target.closest(".ed")) abrir(); });
  cuerpo.addEventListener("keydown", e => {
    if(e.target !== cuerpo) return;
    if(e.key === "Enter" || e.key === " "){ e.preventDefault(); abrir(); }
  });
  li.querySelector("label.done").addEventListener("click", e => e.stopPropagation());
  li.querySelector("input").addEventListener("change", function(){
    const marcado = this.checked;
    A.guardar(s => {
      if(marcado) s.hechos[b.id] = {t: aHora(minutosAhora()), plan: li.dataset.fin};
      else delete s.hechos[b.id];
    });
  });
  return li;
}

function actualizarFila(li, b, r, idCurso){
  const hecho = !!(E().hechos || {})[b.id];
  const esAncla = b.tipo === "ancla";
  li.dataset.c = b.cat;
  li.dataset.fijo = esAncla ? "1" : "0";
  li.dataset.fin = b.fin;
  li.classList.toggle("hecho", hecho);
  li.classList.toggle("encurso", b.id === idCurso);
  li.classList.toggle("corrido", !!b.diferido);
  li.querySelector(".time").innerHTML = b.ini +
    "<em>" + (b.cat === "sueno" ? "→ " + b.fin : b.fin) + "</em>";

  let chips = "";
  if(b.tag) chips += '<span class="chip blindado">' + b.tag + '</span>';
  if(esAncla) chips += '<span class="chip fija">' + (b.clavado ? "clavada" : "fija") + '</span>';
  else if(b.tipo === "ventana") chips += '<span class="chip fija">' +
    aHora(b.ventana[0]) + '–' + aHora(b.ventana[1]) + '</span>';
  if(b.cat === "sueno" && b.dur < 390) chips += '<span class="chip corta">noche corta</span>';
  if(b.recortado) chips += '<span class="chip corta">−' + b.recortado + ' min</span>';
  if(b.diferido) chips += '<span class="chip corta">se corrió</span>';
  if(esHoy(diaActivo) && b.cat !== "sueno" && yaPaso(r, b)) chips += '<span class="chip fija">ya pasó</span>';
  const reg = (E().hechos || {})[b.id];
  if(reg && reg.t){
    let d = aMin(reg.t) - aMin(reg.plan || b.fin);
    if(d > 720) d -= 1440; if(d < -720) d += 1440;
    chips += '<span class="chip real">' + reg.t +
      (d > 0 ? " · +" + d : d < 0 ? " · " + d : " · en punto") + '</span>';
  }
  li.querySelector(".name").innerHTML = esc(b.nom) + chips;
  li.querySelector(".dur").innerHTML = hm(b.dur) + '<span class="pista">ajustar</span>';

  const marcable = b.cat !== "sueno" && b.cat !== "traslado";
  li.querySelector("label.done").hidden = !marcable;
  li.querySelector("input").checked = hecho;

  const ed = li.querySelector(".ed");
  ed.hidden = abierto !== b.id;
  li.querySelector(".cuerpo").setAttribute("aria-expanded", String(abierto === b.id));
  if(!ed.hidden) pintarEditor(ed, b);
  else ed.innerHTML = "";
}

/* ---------------- el editor ----------------
   Cada control lee del ESTADO, nunca de lo dibujado. */
function pintarEditor(ed, b){
  const aj = (E().ajustes || {})[b.id] || {};
  const tocado = !!(aj.min || aj.hora || aj.mover);
  const fijoAjeno = b.tipo === "ancla" && !aj.hora;

  if(b.cat === "sueno"){
    ed.innerHTML = '<p class="why">Tu hora de dormir sale de lo que sobra al final del ' +
      'día. Para dormir más, recorta o suelta algo de más arriba.</p>';
    return;
  }
  ed.innerHTML = (b.nota ? '<p class="why">' + esc(b.nota) + '</p>' : '') +
    (fijoAjeno ? '<p class="why">Tiene hora acordada con otra gente, así que no se mueve. ' +
      'Puedes cambiar cuánto dura o soltarlo hoy.</p>' : '');

  const fila = (etq) => { const f = el("div", "edrow");
    if(etq) f.appendChild(el("span", "edl", etq)); ed.appendChild(f); return f; };
  // stopPropagation NO es decorativo: al redibujar, el botón queda huérfano
  // del DOM y `closest(".ed")` deja de encontrar el panel, así que el clic
  // llegaba al bloque y lo cerraba. El guard por posición no basta.
  const boton = (f, txt, fn, cls) => { const x = el("button", "edb" + (cls ? " " + cls : ""), txt);
    x.onclick = (e) => { e.stopPropagation(); fn(); }; f.appendChild(x); return x; };

  const f1 = fila("Dura");
  // El punto de partida es SIEMPRE el valor guardado. Leer la duración
  // dibujada hacía que cada toque recalculara el mismo número.
  const base = () => (E().ajustes[b.id] || {}).min || b.dur;
  boton(f1, "−15", () => A.guardar(s => {
    s.ajustes[b.id] = Object.assign({}, s.ajustes[b.id], {min: Math.max(5, base() - 15)}); }));
  const val = el("b", "edv" + (tocado ? " cambia" : ""), hm(b.dur));
  f1.appendChild(val);
  boton(f1, "+15", () => A.guardar(s => {
    s.ajustes[b.id] = Object.assign({}, s.ajustes[b.id], {min: base() + 15}); }));

  if(!fijoAjeno){
    const f2 = fila("Mover");
    const mv = (n) => A.guardar(s => {
      const a = Object.assign({}, s.ajustes[b.id]);
      a.mover = (a.mover || 0) + n; s.ajustes[b.id] = a; });
    boton(f2, "↑ antes", () => mv(-1));
    boton(f2, "↓ después", () => mv(1));

    const f3 = fila("Clavar a las");
    const inp = el("input"); inp.type = "time"; inp.className = "edt"; inp.value = b.ini;
    inp.onclick = e => e.stopPropagation();
    inp.onchange = (e) => { e.stopPropagation(); A.guardar(s => {
      s.ajustes[b.id] = Object.assign({}, s.ajustes[b.id], {hora: inp.value || null}); }); };
    f3.appendChild(inp);
  }

  const f4 = fila(null);
  boton(f4, "Hoy no lo hago", () => {
    abierto = null;
    A.guardar(s => { s.ajustes[b.id] = Object.assign({}, s.ajustes[b.id], {fuera: true}); });
  }, "x");
  if(tocado) boton(f4, "Deshacer ajustes", () => A.guardar(s => { delete s.ajustes[b.id]; }));
}

/* ---------------- huecos y conflictos ---------------- */
function pintarHuecoYConflicto(ul, r, b, li){
  const h = r.huecos.find(x => x.antes === b.id);
  const c = r.conflictos.find(x => x.id === b.id);
  if(!h && !c) return;
  const n = el("li", h ? "hueco" : "conf");
  n.dataset.extra = b.id;
  if(h){
    n.innerHTML = '<h4>Se abrieron ' + hm(h.min) + '</h4>' +
      '<p class="why">Entre las ' + aHora(h.desde) + ' y las ' + aHora(h.hasta) +
      ', esperando ' + esc(h.nom) + '. Elige qué meter ahí.</p>';
    const caja = el("div", "cands");
    candidatos(h.min).forEach(cd => {
      const x = el("button", "cand");
      x.innerHTML = '<span><b>' + esc(cd.txt) + '</b><span class="p">' + esc(cd.por) +
        '</span></span><span class="m">' + hm(cd.min) + '</span>';
      x.onclick = () => A.guardar(s => {
        s.tareas.push({id: "h" + Date.now(), txt: cd.txt, min: cd.min,
                       dia: dia().id, cat: cd.cat, tag: cd.tag || null, tras: b.id});
        if(cd.pendiente) s.pendientes = s.pendientes.filter(p => p.id !== cd.pendiente);
      });
      caja.appendChild(x);
    });
    n.appendChild(caja);
  } else if(c.clase === "cierre"){
    n.innerHTML = '<h4>La tienda cierra antes</h4><p class="why">' + esc(c.nom) +
      ' terminaría ' + hm(c.excede) + ' después del cierre (' + aHora(c.cierra) +
      '). Adelanta el día o pásala a otro.</p>';
  } else {
    n.innerHTML = '<h4>Vas ' + c.tarde + ' min tarde para ' + esc(c.nom) + '</h4>' +
      '<p class="why">' + esc(c.nom) + ' es a las ' + c.hora +
      ' y no se mueve. Tienes dos salidas.</p>';
    const dos = el("div", "dos");
    const sueltos = sacrificables(r, c);
    const v1 = el("button", "ver");
    v1.innerHTML = '<b>Llegas tarde</b><span>Entras ' + c.tarde + ' min tarde a ' +
      esc(c.nom) + '. Todo lo de antes se hace completo.</span>';
    v1.onclick = () => { n.innerHTML = '<h4>Vas tarde y está asumido</h4>' +
      '<p class="why">Nada se cae. Avisa que llegas tarde y sigue.</p>'; };
    dos.appendChild(v1);
    const v2 = el("button", "ver");
    if(sueltos.total >= c.tarde){
      v2.innerHTML = '<b>Sueltas y llegas</b><span>Dejas ' +
        sueltos.lista.map(x => esc(x.nom)).join(" y ") + '. Llegas a su hora.</span>';
      v2.onclick = () => A.guardar(s => {
        sueltos.lista.forEach(x => { s.ajustes[x.id] = Object.assign({}, s.ajustes[x.id], {fuera:true}); });
      });
    } else {
      v2.innerHTML = '<b>Soltar no alcanza</b><span>Ni soltando lo barato llegas a tiempo.</span>';
      v2.disabled = true;
    }
    dos.appendChild(v2);
    n.appendChild(dos);
  }
  ul.insertBefore(n, li);
}

/* Orden de sacrificio: lectura → trabajo adelantado → fútbol → gym.
   Lo que no tiene prio nunca se ofrece: tesis, pareja, sueño y
   descompresión quedan protegidos. */
function sacrificables(r, c){
  const iC = r.bloques.findIndex(x => x.id === c.id);
  const cand = r.bloques.slice(0, iC)
    .filter(x => x.prio && x.cat !== "traslado" && x.tipo !== "ancla")
    .sort((a, b) => a.prio - b.prio);
  const lista = []; let total = 0;
  for(const x of cand){ if(total >= c.tarde) break; lista.push(x); total += x.dur; }
  return {lista, total};
}

function candidatos(min){
  const out = [];
  (E().pendientes || []).filter(p => !p.hecho && (p.min || 30) <= min).forEach(p =>
    out.push({txt: p.txt, min: p.min || 30, cat: "trabajo",
              por: "Lo tienes en la bandeja", pendiente: p.id}));
  const c = contadores(E());
  c.metas.forEach(m => {
    if(m.sesiones) return;
    const falta = m.meta - m.puesto;
    if(falta > 20 && Math.min(falta, min) >= 25)
      out.push({txt: m.nom, min: Math.min(falta, min, 120), cat: "u", tag: m.tag,
                por: "Te faltan " + hm(falta) + " esta semana"});
  });
  out.push({txt: "Dejarlo libre", min, cat: "mente",
            por: "Café, lectura o simplemente respirar"});
  return out.slice(0, 6);
}

/* ---------------- pestaña Semana ---------------- */
function pintarSemana(){
  const c = contadores(E());
  document.getElementById("metros").innerHTML = c.metas.map(m => {
    const val = m.sesiones ? m.sesiones_puestas + " de " + m.sesiones
                           : hm(m.puesto) + " de " + hm(m.meta);
    const pct = m.sesiones ? Math.min(100, m.sesiones_puestas / m.sesiones * 100)
                           : Math.min(100, m.puesto / m.meta * 100);
    return '<div class="meter' + (pct < 100 ? " corto" : "") + '"><div class="mt">' +
      m.nom + '<b>' + val + '</b></div><div class="bar"><i style="width:' +
      Math.round(pct) + '%"></i></div></div>';
  }).join("") +
    '<div class="meter"><div class="mt">Traslados<b>' + hm(c.traslados) + '</b></div>' +
    '<div class="bar"><i style="width:100%;background:var(--c-traslado)"></i></div></div>' +
    '<div class="meter' + (c.suenoProm < 420 ? " corto" : "") + '"><div class="mt">' +
    'Sueño promedio<b>' + hm(c.suenoProm) + '</b></div><div class="bar"><i style="width:' +
    Math.min(100, Math.round(c.suenoProm / 420 * 100)) + '%;background:var(--c-sueno)"></i></div></div>';

  const av = avance(E());
  const total = av.reduce((a, f) => a + f.min, 0);
  document.getElementById("avance").innerHTML =
    '<div class="shead"><h2>Esto avanzó</h2><span class="eyebrow">Minutos reales</span></div>' +
    '<p class="sub">No es porcentaje de cumplimiento: son minutos que de verdad le metiste. ' +
    (total ? 'Van <b>' + hm(total) + '</b> esta semana.'
           : 'Todavía nada esta semana — marca lo que hagas y aparece aquí.') + '</p>' +
    '<ul class="pend">' + av.map(f =>
      '<li' + (f.min ? ' class="ok"' : '') + '><span class="t">' + esc(f.h.nom) +
      '</span><span class="m">' + (f.min ? hm(f.min) : "—") + ' · ' + f.plenos + '/' + f.tocaba +
      (f.pisos ? ' (+' + f.pisos + ' piso)' : '') + '</span></li>').join("") + '</ul>';
}

/* ---------------- pintado completo ---------------- */
export function pintar(){
  // ANCLA VISUAL. Se mide ANTES de repintar nada — la cabecera crece cuando
  // aparece el aviso de "ajustaste a mano" y eso solo ya mueve la lista 51 px.
  // Al terminar se devuelve el scroll para que el bloque quede bajo el dedo.
  const ancla = abierto ? document.querySelector('[data-id="' + CSS.escape(abierto) + '"]') : null;
  const yAntes = ancla ? ancla.getBoundingClientRect().top : null;

  const r = plan();
  pintarTabs();
  pintarAhora(r);
  pintarTira();
  pintarCabecera(r);
  pintarLista(r);
  pintarSemana();

  if(yAntes !== null){
    const luego = document.querySelector('[data-id="' + CSS.escape(abierto) + '"]');
    if(luego){
      const salto = luego.getBoundingClientRect().top - yAntes;
      if(Math.abs(salto) > 1) window.scrollBy(0, salto);
    }
  }
  window.__panelAbierto = abierto;
  if(typeof window.alPintar === "function") window.alPintar(r);
}

export function irADia(i){ diaActivo = i; abierto = null; }
export function diaActual(){ return diaActivo; }
export function bloqueAbierto(){ return abierto; }
