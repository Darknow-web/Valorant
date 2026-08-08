/**
 * Herramientas compartidas por las pruebas: arrancar el servidor, abrir el
 * simulador como colaborador y ejecutar las acciones del solver.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** El Chromium que ya viene instalado en el entorno; nunca se descarga otro. */
const CHROMIUM =
  process.env.PLAYWRIGHT_CHROMIUM ||
  ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) =>
    fs.existsSync(p)
  );

export const PUERTO = Number(process.env.PUERTO_PRUEBA || 3517);
export const BASE = `http://127.0.0.1:${PUERTO}`;

/** Arranca el servidor compilado con un almacén local limpio. */
export async function arrancarServidor() {
  const almacen = path.join(RAIZ, 'local_data.json');
  if (fs.existsSync(almacen)) fs.rmSync(almacen);

  const proceso = spawn('node', ['dist/server.cjs'], {
    cwd: RAIZ,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PUERTO),
      JWT_SECRET: 'prueba-local-sin-valor',
      ADMIN_INITIAL_PASSWORD: 'adminadmin1',
      TEACHER_INITIAL_PASSWORD: 'entrenador1',
      FIREBASE_CONFIG: '',
      FIREBASE_CONFIG_PATH: '/ruta/que/no/existe.json',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const salida = [];
  proceso.stdout.on('data', (d) => salida.push(String(d)));
  proceso.stderr.on('data', (d) => salida.push(String(d)));

  for (let intento = 0; intento < 60; intento++) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return { proceso, salida };
    } catch {
      /* todavía no levanta */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  proceso.kill('SIGKILL');
  throw new Error('El servidor no arrancó:\n' + salida.join(''));
}

export function pararServidor(servidor) {
  servidor?.proceso?.kill('SIGKILL');
  const almacen = path.join(RAIZ, 'local_data.json');
  if (fs.existsSync(almacen)) fs.rmSync(almacen);
}

export async function abrirNavegador() {
  if (!CHROMIUM) throw new Error('No encuentro el Chromium de Playwright.');
  return chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
}

/**
 * Deja la página en el menú de módulos, ya identificado como colaborador.
 * Cada colaborador se distingue por su DNI, así que usar uno distinto en cada
 * prueba equivale a empezar de cero sin tener que reiniciar el servidor.
 */
export async function entrarComoColaborador(page, { dni, nombre = 'Ana Torres', tienda = 'SP15 Mayolo' }) {
  await page.goto(`${BASE}/?teacher=entrenador`, { waitUntil: 'domcontentloaded' });

  await page.getByPlaceholder('Ej: Ana Torres').fill(nombre);
  await page.getByPlaceholder('Ej: 71234567').fill(dni);
  await page.getByPlaceholder('Ej: SP15 Mayolo').fill(tienda);
  await page.getByRole('button', { name: 'Continuar' }).click();

  // El preámbulo de la historia sale una sola vez por colaborador.
  const empezar = page.getByRole('button', { name: 'Empezar el turno' });
  if (await visible(empezar, 6000)) await empezar.click();
  await page.getByRole('heading', { name: 'Tu turno en la caja' }).waitFor({ timeout: 8000 });
}

/** Abre la ficha del caso y entra al sistema. */
export async function entrarAlModulo(page, moduleId) {
  const numero = moduleId.replace('m', '');
  await page.locator(`button[aria-label^="Módulo ${numero} "]`).first().click();
  const boton = page.getByRole('button', { name: /Entrar al sistema|Retomar donde lo dejé/ });
  await boton.waitFor({ timeout: 8000 });
  await boton.click();
  await page.locator('#simulador-marco, .frame').first().waitFor({ timeout: 8000 });
}

const ESPERA = { timeout: 6000 };

/** Ejecuta una acción del solver sobre la página. */
export async function ejecutar(page, accion) {
  switch (accion.tipo) {
    case 'clic': {
      const objetivo = page.locator(`#${accion.id}`).nth(accion.indice ?? 0);
      await objetivo.waitFor(ESPERA);
      await objetivo.click({ timeout: 6000 });
      break;
    }
    case 'escribirEn': {
      const campo = page.locator(`#${accion.id}`).locator('input').first();
      await campo.waitFor(ESPERA);
      await campo.fill(accion.valor);
      await campo.blur().catch(() => {});
      break;
    }
    case 'escribirEtiqueta': {
      // Las pantallas del POS rotulan sus campos con <label>, <span> o <div>
      // según la pantalla, así que se busca por el texto exacto del rótulo y se
      // toma el input que va justo detrás, sea cual sea la etiqueta.
      const rotulo = entrecomillar(accion.etiqueta);
      const campo = page
        .locator(
          `xpath=//*[normalize-space(text())=${rotulo}]/following-sibling::input[1] | ` +
            `//*[normalize-space(text())=${rotulo}]/following-sibling::*[1]//input`
        )
        .first();
      await campo.waitFor(ESPERA);
      await campo.fill(accion.valor);
      await campo.press('Enter').catch(() => {});
      await campo.blur().catch(() => {});
      break;
    }
    case 'escribirEnfocado': {
      await page.keyboard.type(accion.valor);
      await page.keyboard.press('Tab');
      break;
    }
    case 'buscar': {
      const campo = page.locator(`#${accion.id}`).locator('input').first();
      await campo.waitFor(ESPERA);
      await campo.fill(accion.valor);
      await campo.press('Enter');
      break;
    }
    case 'seleccionar': {
      const select = page.locator(`#${accion.id}`).locator('select').first();
      await select.waitFor(ESPERA);
      await select.selectOption({ label: accion.valor }).catch(async () => {
        await select.selectOption(accion.valor);
      });
      break;
    }
    case 'seleccionarPrimera': {
      const select = page.locator(`#${accion.id}`).locator('select').first();
      await select.waitFor(ESPERA);
      const valores = await select.locator('option').evaluateAll((os) => os.map((o) => o.value));
      const util = valores.find((v) => v && !/^(Select|Seleccionar)/i.test(v));
      await select.selectOption(util ?? valores[1]);
      break;
    }
    case 'marcar': {
      const casilla = page.locator(accion.selector).first();
      await casilla.waitFor(ESPERA);
      await casilla.check();
      break;
    }
    case 'abrirDesplegable': {
      const boton = page
        .locator(`xpath=//label[contains(normalize-space(.), ${entrecomillar(accion.etiqueta)})]/following-sibling::div[1]//button`)
        .first();
      await boton.waitFor(ESPERA);
      await boton.click();
      break;
    }
    case 'elegirOpcion': {
      const opcion = accion.texto
        ? page.locator(`#${accion.id}`, { hasText: accion.texto }).first()
        : page.locator(`#${accion.id}`).first();
      await opcion.waitFor(ESPERA);
      await opcion.click();
      break;
    }
    default:
      throw new Error(`Acción desconocida: ${accion.tipo}`);
  }
  // El simulador tarda 400 ms en pasar de paso (la animación de "correcto") y
  // durante ese rato ignora los clics a propósito, para que un doble clic no
  // encadene dos avances. Sin esta espera la prueba clica en ese hueco y parece
  // que el módulo se atascó cuando lo que falla es la prueba.
  await page.waitForTimeout(600);
}

/** XPath no tiene escape de comillas; esto arma el literal correcto. */
function entrecomillar(texto) {
  if (!texto.includes("'")) return `'${texto}'`;
  return `concat('${texto.split("'").join(`', "'", '`)}')`;
}

/** El paso en el que va el módulo, leído de la barra del simulador. */
export async function pasoActual(page) {
  const texto = await page.locator('text=/^Paso \\d+/').first().textContent().catch(() => null);
  const n = texto?.match(/Paso (\d+)/)?.[1];
  return n ? Number(n) : null;
}

/**
 * ¿Está visible, esperando hasta `ms`?
 *
 * `isVisible()` NO espera: responde con lo que hay en ese instante. Usarlo para
 * comprobar el final de un módulo daba siempre "no" —el último paso es
 * automático y tarda algo más de un segundo—, y la prueba acusaba de atasco a
 * módulos que terminaban perfectamente.
 */
export async function visible(locator, ms = 3000) {
  try {
    await locator.first().waitFor({ state: 'visible', timeout: ms });
    return true;
  } catch {
    return false;
  }
}

/** ¿El módulo llegó a la pantalla de "módulo completado"? */
export async function estaCompletado(page, ms = 9000) {
  return visible(page.getByRole('heading', { name: /Módulo completado|¡Muy bien!|Casi lo tienes/ }), ms);
}

/** Cierra el aviso de error si está abierto, para que no tape la pantalla. */
export async function cerrarAviso(page) {
  const boton = page.getByRole('button', { name: 'Entendido' });
  if (await visible(boton, 400)) await boton.click().catch(() => {});
}
