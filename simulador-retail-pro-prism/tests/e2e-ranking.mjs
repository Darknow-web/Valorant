/**
 * El ranking de los diez mejores.
 *
 * Siembra colaboradores con notas conocidas y comprueba las reglas pactadas:
 * manda quien completó más módulos, luego el promedio y al final el tiempo; la
 * tabla se corta en diez; quien queda fuera ve su puesto real; y —lo más
 * importante— **la respuesta no lleva el DNI de nadie**, porque el endpoint es
 * público: lo abre cualquiera con el enlace del entrenador.
 *
 *   node tests/e2e-ranking.mjs
 */
import { arrancarServidor, BASE, pararServidor } from './util.mjs';

const pruebas = [];
const comprobar = (nombre, condicion, detalle = '') => {
  pruebas.push({ nombre, ok: !!condicion });
  console.log(`  ${condicion ? 'ok   ' : 'FALLA'} ${nombre}${condicion || !detalle ? '' : ` — ${detalle}`}`);
};

/**
 * Registra un intento tal como lo hace el simulador.
 *
 * La nota la calcula el servidor a partir de los errores, así que para pedir un
 * puntaje concreto se manda el número de errores que lo produce: 20 menos uno
 * por error.
 */
async function sembrarIntento({ dni, nombre, tienda, moduleId, errores, segundos, entrenador = 'entrenador' }) {
  const res = await fetch(`${BASE}/api/submit-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attemptId: `siembra-${dni}-${moduleId}-${Math.random().toString(36).slice(2)}`,
      studentName: nombre,
      studentDni: dni,
      storeName: tienda,
      moduleId,
      moduleTitle: `Módulo ${moduleId.replace('m', '')} — de prueba`,
      teacherUsername: entrenador,
      mistakeLog: Array.from({ length: errores }, (_, i) => ({ step: `error ${i}`, pointsDeducted: 1 })),
      processSteps: [],
      totalSeconds: segundos,
    }),
  });
  return res.status;
}

const pedirRanking = async (dni = '') => {
  const res = await fetch(`${BASE}/api/ranking?dni=${encodeURIComponent(dni)}`);
  return { estado: res.status, texto: await res.clone().text(), cuerpo: await res.json() };
};

const servidor = await arrancarServidor();

try {
  // --- Tabla vacía ---
  console.log('\n  Sin nadie todavía');
  const vacio = await pedirRanking();
  comprobar('devuelve una tabla vacía sin romperse', Array.isArray(vacio.cuerpo.top) && vacio.cuerpo.top.length === 0);
  comprobar('y cuenta cero colaboradores', vacio.cuerpo.totalColaboradores === 0);

  // --- El orden pactado ---
  console.log('\n  Módulos → promedio → tiempo');
  // ANA: 2 módulos, promedio 20  → debe ir primera (más módulos)
  await sembrarIntento({ dni: '10000001', nombre: 'Ana Torres', tienda: 'SP01', moduleId: 'm1', errores: 0, segundos: 100 });
  await sembrarIntento({ dni: '10000001', nombre: 'Ana Torres', tienda: 'SP01', moduleId: 'm2', errores: 0, segundos: 100 });
  // BETO: 1 módulo, promedio 20, 50 s  → segundo (empata en nota con Caro, gana por tiempo)
  await sembrarIntento({ dni: '10000002', nombre: 'Beto Ruiz', tienda: 'SP02', moduleId: 'm1', errores: 0, segundos: 50 });
  // CARO: 1 módulo, promedio 20, 300 s → tercera
  await sembrarIntento({ dni: '10000003', nombre: 'Caro Díaz', tienda: 'SP03', moduleId: 'm1', errores: 0, segundos: 300 });
  // DANI: 1 módulo, promedio 15        → cuarta (misma cantidad, peor nota)
  await sembrarIntento({ dni: '10000004', nombre: 'Dani Paz', tienda: 'SP04', moduleId: 'm1', errores: 5, segundos: 10 });

  const orden = await pedirRanking('10000004');
  const nombres = orden.cuerpo.top.map((f) => f.nombre);
  comprobar(
    'gana quien completó más módulos, aunque otro empate en nota',
    nombres[0] === 'Ana Torres',
    nombres.join(' → ')
  );
  comprobar('a igualdad de módulos y nota, gana el más rápido', nombres[1] === 'Beto Ruiz' && nombres[2] === 'Caro Díaz', nombres.join(' → '));
  comprobar('la peor nota queda al final', nombres[3] === 'Dani Paz', nombres.join(' → '));
  comprobar('los puestos van del 1 en adelante', orden.cuerpo.top.map((f) => f.puesto).join(',') === '1,2,3,4');

  // --- Datos que salen y datos que NO salen ---
  console.log('\n  Lo que se publica');
  comprobar('sale el nombre y la tienda', orden.cuerpo.top[0].nombre === 'Ana Torres' && orden.cuerpo.top[0].tienda === 'SP01');
  comprobar(
    'NO sale ningún DNI en toda la respuesta',
    !/1000000\d/.test(orden.texto),
    orden.texto.slice(0, 200)
  );
  comprobar('marca cuál es la fila propia', orden.cuerpo.top.find((f) => f.nombre === 'Dani Paz')?.esTu === true);
  comprobar('y no marca las de los demás', orden.cuerpo.top.filter((f) => f.esTu).length === 1);

  // --- Se corta en diez y enseña el puesto propio ---
  console.log('\n  Top 10 y el puesto propio');
  // Doce colaboradores más, todos con 3 módulos, para empujar a los primeros fuera.
  for (let i = 0; i < 12; i++) {
    const dni = String(20000000 + i);
    for (const moduleId of ['m1', 'm2', 'm3']) {
      await sembrarIntento({ dni, nombre: `Crack ${i}`, tienda: `SP${10 + i}`, moduleId, errores: 0, segundos: 60 });
    }
  }

  const lleno = await pedirRanking('10000004');
  comprobar('la tabla se corta en 10', lleno.cuerpo.top.length === 10, `llegaron ${lleno.cuerpo.top.length}`);
  comprobar('cuenta a todos los colaboradores', lleno.cuerpo.totalColaboradores === 16, `${lleno.cuerpo.totalColaboradores}`);
  comprobar('quien quedó fuera recibe su fila aparte', !!lleno.cuerpo.tuFila, JSON.stringify(lleno.cuerpo.tuFila));
  comprobar('con su puesto real y marcada como suya', lleno.cuerpo.tuFila?.puesto > 10 && lleno.cuerpo.tuFila?.esTu === true, `puesto ${lleno.cuerpo.tuFila?.puesto}`);
  comprobar('nadie del top queda marcado como propio', lleno.cuerpo.top.every((f) => !f.esTu));
  comprobar('sigue sin haber DNIs', !/1000000\d|2000000\d/.test(lleno.texto));

  // --- Sin DNI: la tabla se ve igual, sin nadie resaltado ---
  console.log('\n  Sin identificar');
  const anonimo = await pedirRanking('');
  comprobar('funciona sin pasar DNI', anonimo.cuerpo.top.length === 10);
  comprobar('y no resalta a nadie', anonimo.cuerpo.top.every((f) => !f.esTu) && anonimo.cuerpo.tuFila === null);

  // --- Se actualiza al terminar un módulo ---
  console.log('\n  Se refresca al registrar una nota');
  await sembrarIntento({ dni: '10000004', nombre: 'Dani Paz', tienda: 'SP04', moduleId: 'm2', errores: 0, segundos: 10 });
  const despues = await pedirRanking('10000004');
  const daniAhora = despues.cuerpo.tuFila || despues.cuerpo.top.find((f) => f.esTu);
  comprobar('la nota recién enviada ya cuenta', daniAhora?.modulos === 2, `módulos=${daniAhora?.modulos}`);
} finally {
  pararServidor(servidor);
}

const fallos = pruebas.filter((p) => !p.ok).length;
console.log(`\n${pruebas.length - fallos}/${pruebas.length} comprobaciones correctas.`);
process.exit(fallos === 0 ? 0 : 1);
