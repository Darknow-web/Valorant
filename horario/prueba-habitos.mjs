import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport:{width:390,height:664}, timezoneId:'America/Lima', isMobile:true, hasTouch:true });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('!! PAGEERROR:', e.message));
await p.goto('file://'+process.cwd()+'/semana-blindada.html');
await p.waitForTimeout(1500);
const ver = async (n) => {
  const l = p.locator('.blk').filter({hasText:n}).first();
  return (await l.locator('.time').innerText()).replace('\n','–')+'  '+(await l.locator('.dur').innerText()).split('\n')[0];
};
for(const nombre of ['Takary · SP20','Tus hábitos de hoy']){
  const l = p.locator('.blk').filter({hasText:nombre}).first();
  console.log('\n== '+nombre+' =='); console.log('  antes:      ', await ver(nombre));
  await l.locator('.cuerpo').tap(); await p.waitForTimeout(300);
  for(let k=0;k<2;k++){
    await p.locator('.blk').filter({hasText:nombre}).first().locator('[data-dm="15"]').tap();
    await p.waitForTimeout(350);
    console.log('  tras +15:   ', await ver(nombre));
  }
  await p.locator('.blk').filter({hasText:nombre}).first().locator('[data-dm="-15"]').tap();
  await p.waitForTimeout(350);
  console.log('  tras −15:   ', await ver(nombre));
  console.log('  ajustes:', await p.evaluate(()=>JSON.stringify(CFG.ajustes)));
  await p.locator('.blk').filter({hasText:nombre}).first().locator('[data-reset]').tap();
  await p.waitForTimeout(350);
  console.log('  deshecho:   ', await ver(nombre), '· ajustes', await p.evaluate(()=>JSON.stringify(CFG.ajustes)));
}
// mover una fila, exactamente una
await p.locator('.tb').nth(2).tap(); await p.waitForTimeout(400);
const pos = async () => (await p.locator('.blk .name').allInnerTexts()).findIndex(t=>t.startsWith('Tesis'));
console.log('\n== mover ==\n  Tesis en fila', await pos());
const t = p.locator('.blk').filter({hasText:'Tesis'}).first();
await t.locator('.cuerpo').tap(); await p.waitForTimeout(300);
await p.locator('.blk').filter({hasText:'Tesis'}).first().locator('[data-mv="-1"]').tap();
await p.waitForTimeout(400);
console.log('  tras ↑ antes:', await pos(), '(debe ser una sola fila menos)');
await b.close();
