import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const estado = JSON.parse(readFileSync('estado-real.json','utf8'));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport:{width:390,height:664}, timezoneId:'America/Lima', isMobile:true, hasTouch:true });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('!! PAGEERROR:', e.message));
p.on('console', m => { const t=m.text(); if(m.type()==='error' && !/ERR_CONNECTION|favicon|fonts/.test(t)) console.log('!! CONSOLE:', t); });

// db real simulada, precargada con EL DOCUMENTO REAL de Carlos
await p.addInitScript(est => {
  const docs = {'semanas/2026-W37': JSON.parse(JSON.stringify(est))};
  const subs = {}; const clone = o => JSON.parse(JSON.stringify(o));
  const emitir = (path,doc) => (subs[path]||[]).forEach(fn => fn({exists:!!doc,
    data:()=>clone(doc||{}), metadata:{fromCache:false,hasPendingWrites:false}}));
  const ref = path => ({
    update(c){ return new Promise((res,rej)=>setTimeout(()=>{
      if(!docs[path]) return rej({code:'invalid_argument',message:'no existe'});
      docs[path]=Object.assign({},docs[path],clone(c)); res();
      setTimeout(()=>emitir(path,docs[path]),80); },50)); },
    set(c){ return new Promise(res=>setTimeout(()=>{docs[path]=clone(c);res();
      setTimeout(()=>emitir(path,docs[path]),50);},50)); },
    onSnapshot(fn){ (subs[path]=subs[path]||[]).push(fn);
      setTimeout(()=>{ if(docs[path]) emitir(path,docs[path]); },120); return ()=>{}; }
  });
  window.__docs = docs;
  window.claude = { use: async n => n==="db" ? {doc: ref} : null };
}, estado);

await p.goto('file://'+process.cwd()+'/semana-blindada.html');
await p.waitForTimeout(2000);

const nom = 'Turno completo';
const ver = async () => { const l=p.locator('.blk').filter({hasText:nom}).first();
  return (await l.locator('.time').innerText()).replace('\n','–')+'  '+(await l.locator('.dur').innerText()).split('\n')[0]; };
console.log('estado cargado · ajustes:', await p.evaluate(()=>JSON.stringify(CFG.ajustes)));
console.log('turno completo:', await ver());
const l = p.locator('.blk').filter({hasText:nom}).first();
await l.locator('.cuerpo').tap(); await p.waitForTimeout(400);
console.log('panel abierto:', await p.locator('.blk').filter({hasText:nom}).first().locator('.ed').isVisible());
console.log('hora simulada del navegador:', await p.evaluate(()=>fmt(minutosAhora())));
for(let k=0;k<3;k++){
  const antes = await p.locator('.blk').count();
  await p.locator('.blk').filter({hasText:nom}).first().locator('[data-dm="-15"]').tap();
  await p.waitForTimeout(600);
  const info = await p.evaluate(()=>{
    const bs = bloquesDe(DIAS[0]);
    const i = bs.findIndex(x=>/Turno completo/.test(x[2]));
    const plegado = document.querySelector('#verPasado');
    return {motor: i<0?'no existe':bs[i][0]+'-'+bs[i][1]+' dm='+bs[i].dm,
            enPantalla: !!document.querySelector('.blk .name'),
            visible: [...document.querySelectorAll('.blk .name')].some(n=>/Turno completo/.test(n.textContent)),
            plegado: plegado ? plegado.innerText.replace(/\n/g,' ') : 'sin plegar',
            bloques: document.querySelectorAll('.blk').length,
            ajuste: JSON.stringify(CFG.ajustes.lun)};
  });
  console.log('−15 #'+(k+1), JSON.stringify(info));
  if(!info.visible) break;
}
await b.close();
