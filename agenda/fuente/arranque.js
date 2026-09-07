/* ============================================================
   ARRANQUE — conecta el estado, la vista y los rituales.
   ============================================================ */

import { crearAlmacen, estadoVacio, migrar, idSemana, esPrimerDomingo } from "./estado.js";
import { iniciar, pintar, irADia, indiceHoy, minutosAhora, E } from "./vista.js";
import { pintarRituales } from "./rituales.js";
import { pintarCartera, iniciarAsistente } from "./asistente.js";
import { SEMILLA } from "./semilla.js";

const SEM = idSemana(new Date());

function avisoGuardado(estado, detalle){
  const st = document.getElementById("saveState");
  if(!st) return;
  st.textContent = estado;
  st.classList.toggle("on",  estado === "guardado");
  st.classList.toggle("mal", estado === "sin guardar");
  if(detalle) st.title = detalle;
}

const almacen = crearAlmacen({
  clave: "agenda." + SEM,
  estado: estadoVacio(SEM),
  aviso: avisoGuardado
});

/* Lo guardado manda, pero si no hay nada guardado se siembra la semana
   que ya tenemos cargada. */
const guardado = almacen.local.leer();
almacen.estado = guardado ? migrar(guardado, SEM) : SEMILLA(SEM);
almacen.estado.primerDomingo = esPrimerDomingo();

iniciar(almacen);
almacen.alCambiar(() => { pintar(); pintarRituales(almacen); });

document.getElementById("semLabel").textContent = SEM.replace("-W", " · semana ");
irADia(indiceHoy());
pintar();
pintarRituales(almacen);
pintarCartera();

/* ---------------- navegación ---------------- */
function irA(v){
  ["hoy","semana","ritual","mas"].forEach(k => {
    const n = document.getElementById("v-" + k); if(n) n.hidden = (k !== v);
  });
  document.querySelectorAll(".nv").forEach(b =>
    b.setAttribute("aria-selected", String(b.dataset.v === v)));
  const vis = document.getElementById("v-" + v);
  if(vis){ vis.style.animation = "none"; void vis.offsetWidth; vis.style.animation = ""; }
  window.scrollTo({top: 0, behavior: "instant"});
}
document.querySelectorAll(".nv").forEach(b => b.onclick = () => irA(b.dataset.v));

/* El reloj reordena la vista sin recargar. No redibuja si hay un panel
   abierto: el tic del minuto no tiene derecho a cerrarle el editor. */
setInterval(() => {
  if(document.getElementById("v-hoy").hidden) return;
  if(!window.__panelAbierto) pintar();
}, 60000);

/* ---------------- persistencia y asistente ---------------- */
(async () => {
  if(!window.claude || !window.claude.use) return;
  await almacen.conectar(window.claude, "semanas/" + SEM);
  iniciarAsistente(window.claude, almacen);
})();

window.__agenda = {almacen, pintar, minutosAhora};
