#!/usr/bin/env node
/**
 * Captura PNG de cada slide a partir del HTML de vista previa.
 *
 *   node capturar.cjs vista.html -o salida/png [--grid]
 *
 * Aquí LibreOffice está incompleto (sin Writer ni Impress), así que este es el
 * render de QA: dibuja los mismos shapes que se mandaron a pptxgenjs.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("/opt/node22/lib/node_modules/playwright");

async function capturar(html, dirSalida, { grid = false } = {}) {
  fs.mkdirSync(dirSalida, { recursive: true });
  const navegador = await chromium.launch({ args: ["--font-render-hinting=none"] });
  const pagina = await navegador.newPage({
    viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1,
  });
  await pagina.goto("file://" + path.resolve(html), { waitUntil: "networkidle" });
  // Las webfonts entran por red; sin esto la primera slide sale con la de respaldo.
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForTimeout(400);

  const slides = await pagina.$$(".slide");
  const rutas = [];
  for (let i = 0; i < slides.length; i++) {
    const destino = path.join(dirSalida, `slide-${String(i + 1).padStart(2, "0")}.png`);
    await slides[i].screenshot({ path: destino });
    rutas.push(destino);
  }

  let contacto = null;
  if (grid && rutas.length) {
    const VENDOR = process.env.SLIDES_VENDOR_DIR ||
      path.join(__dirname, "..", ".vendor");
    const sharp = require(path.join(VENDOR, "node_modules", "sharp"));
    const cols = 3, mini = 420, altoMini = Math.round((mini * 720) / 1280);
    const filas = Math.ceil(rutas.length / cols);
    const capas = [];
    for (let i = 0; i < rutas.length; i++) {
      capas.push({
        input: await sharp(rutas[i]).resize(mini, altoMini).png().toBuffer(),
        left: (i % cols) * (mini + 10) + 5,
        top: Math.floor(i / cols) * (altoMini + 10) + 5,
      });
    }
    contacto = path.join(dirSalida, "contacto.png");
    await sharp({
      create: {
        width: cols * (mini + 10) + 5, height: filas * (altoMini + 10) + 5,
        channels: 3, background: { r: 24, g: 24, b: 28 },
      },
    }).composite(capas).png().toFile(contacto);
  }

  await navegador.close();
  return { rutas, contacto };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const html = args[0];
  const oi = args.indexOf("-o");
  const dir = oi >= 0 ? args[oi + 1] : "png";
  capturar(html, dir, { grid: args.includes("--grid") })
    .then((r) => {
      console.log(`  ${r.rutas.length} PNG en ${dir}`);
      if (r.contacto) console.log(`  hoja de contacto: ${r.contacto}`);
    })
    .catch((e) => { console.error("error:", e.message); process.exit(1); });
}

module.exports = { capturar };
