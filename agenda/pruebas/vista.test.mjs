/* Prueba de interfaz con las CUATRO condiciones que me faltaban y que
   dejaron pasar cinco rondas de bugs:
     1 · toques reales, no evaluate
     2 · db simulada, con eco del documento anterior
     3 · pantalla de celular
     4 · el día de HOY, que es el único que Carlos mira
*/
import { chromium } from "playwright";

const R = [];
const t = (nom, cond, extra) => { R.push({nom, ok: !!cond, extra}); 
  console.log((cond ? "  ✓ " : "  ✗ ") + nom + (extra ? "   " + extra : "")); };

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ viewport:{width:390,height:664}, timezoneId:"America/Lima",
  isMobile:true, hasTouch:true });
const p = await ctx.newPage();
let errores = [];
p.on("pageerror", e => { errores.push(e.message); console.log("  !! " + e.message); });
p.on("console", m => { const x = m.text();
  if(m.type() === "error" && !/ERR_|favicon|fonts/.test(x)){ errores.push(x); console.log("  !! " + x); } });

/* db falsa que se comporta como la real: latencia, y un ECO del
   documento ANTERIOR después de cada escritura. Sin esto, la clase de
   bug que revierte lo recién tocado es invisible en local. */
await p.addInitScript(() => {
  const docs = {}, subs = {};
  const cl = o => JSON.parse(JSON.stringify(o));
  const emit = (path, d) => (subs[path]||[]).forEach(f => f({exists:!!d,
    data:()=>cl(d||{}), metadata:{fromCache:false, hasPendingWrites:false}}));
  const ref = path => ({
    update(c){ return new Promise((res,rej)=>setTimeout(()=>{
      if(!docs[path]) return rej({code:"invalid_argument",message:"no existe"});
      const viejo = cl(docs[path]);
      docs[path] = Object.assign({}, docs[path], cl(c)); res();
      setTimeout(()=>emit(path, viejo), 25);       // ECO VIEJO
      setTimeout(()=>emit(path, docs[path]), 80);
    },30)); },
    set(c){ return new Promise(r=>setTimeout(()=>{ docs[path]=cl(c); r();
      setTimeout(()=>emit(path,docs[path]),30); },30)); },
    onSnapshot(f){ (subs[path]=subs[path]||[]).push(f);
      setTimeout(()=>{ if(docs[path]) emit(path,docs[path]); },60); return ()=>{}; }
  });
  window.__docs = docs;
  window.claude = { use: async n => n === "db" ? {doc: ref} : null };
});

await p.goto("file://" + process.cwd() + "/semana-blindada.html");
await p.waitForTimeout(1500);

t("la página carga sin errores", errores.length === 0, errores[0] || "");
t("dibuja el día completo", (await p.locator(".blk").count()) > 5,
  (await p.locator(".blk").count()) + " bloques");

/* El día de HOY, con un bloque que esté terminando ahora. */
const hoyTab = await p.locator(".tb.hoy").first();
await hoyTab.tap(); await p.waitForTimeout(400);

const primera = p.locator(".blk").filter({has: p.locator("label.done:not([hidden])")}).first();
const nombre = (await primera.locator(".name").innerText()).split("\n")[0];
const dur = async () => (await p.locator(".blk").filter({hasText:nombre}).first()
  .locator(".dur").innerText()).split("ajustar")[0].trim();

await primera.locator(".cuerpo").tap(); await p.waitForTimeout(300);
t("tocar el bloque abre su panel",
  await p.locator(".blk").filter({hasText:nombre}).first().locator(".ed").isVisible());

const d0 = await dur();
const caja0 = await p.locator(".blk").filter({hasText:nombre}).first().boundingBox();

const vals = [d0];
for(let i = 0; i < 3; i++){
  await p.locator(".blk").filter({hasText:nombre}).first()
          .locator(".edb", {hasText:"+15"}).first().tap();
  await p.waitForTimeout(450);
  vals.push(await dur());
}
t("+15 tres veces cambia la duración cada vez",
  new Set(vals).size === vals.length, vals.join(" → "));
t("el panel sigue abierto después de tocar",
  await p.locator(".blk").filter({hasText:nombre}).first().locator(".ed").isVisible());
const caja1 = await p.locator(".blk").filter({hasText:nombre}).first().boundingBox();
t("la pantalla no salta bajo el dedo",
  caja1 && Math.abs(caja1.y - caja0.y) < 6,
  caja1 ? Math.round(Math.abs(caja1.y - caja0.y)) + " px" : "el bloque desapareció");
t("el bloque editado NO se pliega aunque su hora ya pase",
  await p.locator(".blk").filter({hasText:nombre}).first().isVisible());

await p.waitForTimeout(500);   // deja pasar el eco viejo
t("el eco del servidor no revierte el cambio", (await dur()) === vals[vals.length-1],
  "quedó en " + (await dur()));

/* Marcar hecho no puede borrar la configuración. */
await p.locator(".blk").filter({hasText:nombre}).first().locator("label.done span").tap();
await p.waitForTimeout(600);
const doc = await p.evaluate(() => {
  const k = Object.keys(window.__docs)[0];
  return k ? window.__docs[k] : null;
});
t("marcar hecho NO borra la configuración",
  !!(doc && doc.estado && doc.estado.programacion && doc.estado.programacion.length),
  doc ? Object.keys(doc).join(",") : "sin documento");
t("el ajuste sobrevive en el guardado",
  !!(doc && doc.estado && Object.keys(doc.estado.ajustes || {}).length));

/* Recargar y comprobar que persiste. */
await p.reload(); await p.waitForTimeout(1500);
await p.locator(".tb.hoy").first().tap(); await p.waitForTimeout(400);
const guardadoTrasRecarga = await p.evaluate(() =>
  JSON.stringify(window.__agenda.almacen.estado.ajustes));
t("los ajustes siguen ahí después de recargar",
  guardadoTrasRecarga.length > 5, guardadoTrasRecarga);

/* Los dos rituales y las otras pestañas no revientan. */
for(const v of ["semana","ritual","mas"]){
  await p.locator('.nv[data-v="'+v+'"]').tap(); await p.waitForTimeout(350);
  t("la pestaña «"+v+"» dibuja algo",
    (await p.locator("#v-"+v).innerText()).length > 100);
}
t("no hubo ningún error en toda la sesión", errores.length === 0, errores[0] || "");

await b.close();
const mal = R.filter(x => !x.ok).length;
console.log("\n" + (mal ? "✗ " + mal + " fallan, " + (R.length-mal) + " pasan"
                        : "✓ " + R.length + " pruebas pasan") + "\n");
process.exit(mal ? 1 : 0);
