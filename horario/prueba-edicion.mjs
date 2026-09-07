import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport:{width:430,height:900}, timezoneId:'America/Lima' });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('!! PAGEERROR:', e.message));
p.on('console', m => { const t=m.text(); if(m.type()==='error' && !/ERR_CONNECTION|favicon/.test(t)) console.log('!! CONSOLE:', t); });

// db falsa que reproduce el celular: latencia + un ECO con el documento ANTERIOR
// después de cada escritura. Sin esto el bug es invisible en local.
await p.addInitScript(() => {
  const docs = {}; const subs = {};
  const clone = o => JSON.parse(JSON.stringify(o));
  const emitir = (path, snapDoc) => (subs[path]||[]).forEach(fn =>
    fn({exists: !!snapDoc, data: () => clone(snapDoc||{}), metadata:{fromCache:false, hasPendingWrites:false}}));
  const ref = path => ({
    update(c){ return new Promise((res,rej)=>setTimeout(()=>{
        if(!docs[path]) return rej({code:'invalid_argument',message:'no existe'});
        const anterior = clone(docs[path]);
        docs[path] = Object.assign({}, docs[path], clone(c));
        res();
        setTimeout(()=>emitir(path, anterior), 30);      // ECO VIEJO
        setTimeout(()=>emitir(path, docs[path]), 90);    // el bueno, después
      }, 40)); },
    set(c){ return new Promise(res=>setTimeout(()=>{ docs[path]=clone(c); res();
        setTimeout(()=>emitir(path, docs[path]), 40); }, 40)); },
    onSnapshot(fn){ (subs[path]=subs[path]||[]).push(fn);
      setTimeout(()=>{ if(docs[path]) emitir(path, docs[path]); }, 60); return ()=>{}; }
  });
  window.__docs = docs;
  window.claude = { use: async n => n==="db" ? {doc: ref} : null };
});

await p.goto('file://'+process.cwd()+'/semana-blindada.html');
await p.waitForTimeout(1600);

const dur = async () => (await p.locator('.blk').filter({hasText:'Tesis'}).first().locator('.dur').innerText()).split('\n')[0].trim();
const abierto = async () => await p.locator('.blk').filter({hasText:'Tesis'}).first().locator('.ed').isVisible();

await p.locator('.tb').nth(2).click(); await p.waitForTimeout(400);   // miércoles
console.log('duración inicial de Tesis:', await dur());

await p.locator('.blk').filter({hasText:'Tesis'}).first().locator('.cuerpo').click();
await p.waitForTimeout(300);
console.log('panel abierto tras tocar el bloque:', await abierto());

for(const [etiqueta, sel] of [['+15','[data-dm="15"]'], ['+15 otra vez','[data-dm="15"]'], ['−15','[data-dm="-15"]']]){
  await p.locator('.blk').filter({hasText:'Tesis'}).first().locator(sel).click();
  await p.waitForTimeout(500);                       // deja pasar el eco viejo
  console.log(etiqueta.padEnd(13), '→ dura', await dur(), '· panel sigue abierto:', await abierto());
}
await p.waitForTimeout(400);
console.log('tras el eco completo →  dura', await dur());
console.log('CFG.ajustes:', await p.evaluate(()=>JSON.stringify(CFG.ajustes)));

// marcar algo como hecho NO debe borrar la configuración remota
await p.locator('.blk').filter({hasText:'Tesis'}).first().locator('label.done').click();
await p.waitForTimeout(600);
const remoto = await p.evaluate(()=>JSON.stringify(Object.keys(window.__docs['semanas/'+WEEK]||{})));
console.log('campos en el documento remoto tras marcar hecho:', remoto);
console.log('¿sobrevivió cfg.ajustes?:', await p.evaluate(()=>{
  const d = window.__docs['semanas/'+WEEK]||{}; return JSON.stringify((d.cfg||{}).ajustes||null); }));
console.log('sello de guardado:', await p.locator('#saveState').innerText());
await b.close();
