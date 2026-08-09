/**
 * Ningún dato del guion se puede saltar.
 *
 * La ficha de cada caso le da al colaborador unos datos concretos: el código del
 * producto, el documento del cliente, el importe, el código de autorización. Si
 * alguno de esos datos no se valida, la ficha está mintiendo: da un dato que no
 * hace falta respetar. Eso es lo que pasaba con el código de autorización de
 * Rappi, con los cinco datos del cliente nuevo y con la nota del desembolso.
 *
 * Esta prueba recorre **todos** los datos declarados en `scenarios.ts`, mira a
 * qué paso apunta cada uno y comprueba que el paso lo exija de verdad. No es una
 * lista escrita a mano: si mañana se añade un dato a una ficha y nadie lo valida,
 * aparece aquí solo.
 *
 *   node tests/e2e-guion.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ } from './util.mjs';

const leer = (relativo) => fs.readFileSync(path.join(RAIZ, relativo), 'utf8');

const scenarios = leer('src/data/scenarios.ts');
const modules = leer('src/data/modules.ts');

/** Los bloques `datos: { clave: 'referencia' }` de cada escenario. */
function datosDeLosCasos() {
  const encontrados = [];
  const re = /moduleId:\s*'(\w+)'[\s\S]*?datos:\s*\{([\s\S]*?)\}/g;
  let m;
  while ((m = re.exec(scenarios)) !== null) {
    const [, moduleId, cuerpo] = m;
    const reDato = /(\w+):\s*'([^']+)'/g;
    let d;
    while ((d = reDato.exec(cuerpo)) !== null) {
      encontrados.push({ moduleId, clave: d[1], referencia: d[2] });
    }
  }
  return encontrados;
}

/** El texto del paso `stepId` dentro de modules.ts, para inspeccionarlo. */
function textoDelPaso(stepId) {
  const inicio = modules.indexOf(`id: '${stepId}'`);
  if (inicio === -1) return null;
  // Hasta el comienzo del paso siguiente, o el final del módulo.
  const resto = modules.slice(inicio);
  const siguiente = resto.slice(10).search(/\bid:\s*'m\d+-s/);
  return siguiente === -1 ? resto.slice(0, 2000) : resto.slice(0, siguiente + 10);
}

/**
 * ¿El paso EXIGE ese dato?
 *
 * Se considera exigido si lo compara por `targetValue`, por `expectedState`, o
 * si el paso tiene un `validator` que menciona la clave del dato (los
 * validadores leen `ctx.step.data.<clave>`).
 */
function estaValidado({ referencia }) {
  // 'catalog|...' lo valida la propia pantalla al buscar el documento.
  if (referencia.startsWith('catalog|')) return { ok: true, via: 'la pantalla' };

  const [stepId, ruta] = referencia.split('|');
  const texto = textoDelPaso(stepId);
  if (!texto) return { ok: false, via: `no encuentro el paso ${stepId}` };

  if (ruta.startsWith('targetValue')) {
    return { ok: /targetValue:/.test(texto), via: 'targetValue' };
  }
  if (ruta.startsWith('expectedState.')) {
    const clave = ruta.slice('expectedState.'.length);
    return { ok: new RegExp(`expectedState:[^}]*\\b${clave}\\b`).test(texto), via: `expectedState.${clave}` };
  }
  if (ruta.startsWith('data.')) {
    const clave = ruta.slice('data.'.length);
    // Un `data` solo es de verdad si algo lo comprueba: el propio paso con
    // expectedState/targetValue, o un validador que lea esa clave.
    const porEstado = new RegExp(`expectedState:[^}]*\\b${clave}\\b`).test(texto);
    const porValidador = /validator:/.test(texto) && new RegExp(`\\b${clave}\\b`).test(texto.split('validator:')[1] || '');
    const porTargetValue = /targetValue:/.test(texto);
    return {
      ok: porEstado || porValidador || porTargetValue,
      via: porEstado ? 'expectedState' : porValidador ? 'validator' : porTargetValue ? 'targetValue' : 'NADA lo comprueba',
    };
  }
  return { ok: false, via: `referencia rara: ${ruta}` };
}

const datos = datosDeLosCasos();
console.log(`Revisando los ${datos.length} datos que las 14 fichas le dan al colaborador.\n`);

const huecos = [];
for (const dato of datos) {
  const { ok, via } = estaValidado(dato);
  if (!ok) huecos.push({ ...dato, via });
  console.log(`  ${ok ? 'ok   ' : 'FALLA'} ${dato.moduleId} · ${dato.clave.padEnd(16)} ${ok ? via : `→ ${via}`}`);
}

console.log('');
if (huecos.length === 0) {
  console.log(`Los ${datos.length} datos del guion se validan. Ninguna ficha promete un dato que no haga falta respetar.`);
  process.exit(0);
}
console.log(`${huecos.length} dato(s) que la ficha muestra y nadie comprueba:`);
for (const h of huecos) console.log(`  ${h.moduleId} · ${h.clave} (${h.referencia})`);
process.exit(1);
