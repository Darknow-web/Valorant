#!/usr/bin/env node
/**
 * Genera los elementos animados que SÍ sobreviven al pasar por Canva.
 *
 *   node animar_media.cjs deck.plan.json -o salida/media
 *
 * Canva descarta las animaciones OOXML al importar un .pptx: los objetos
 * siguen siendo editables, pero los efectos no viajan. Un GIF/WebM/MP4
 * incrustado sí, porque es un elemento más del diseño. Y PowerPoint también
 * los reproduce, así que la misma pieza sirve en los dos lados.
 *
 * Los cuadros se pintan en Chromium (Playwright) desde CSS/SVG y se compilan
 * con ffmpeg-static. Cada pieza se inserta como objeto SEPARADO encima de su
 * versión estática: se puede borrar sin romper el slide.
 *
 * Piezas que sabe generar:
 *   contador   un número que sube hasta el KPI
 *   barra      una barra que se llena
 *   dona       un anillo que se completa
 *   linea      una serie que se dibuja sola
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("/opt/node22/lib/node_modules/playwright");

const VENDOR = process.env.SLIDES_VENDOR_DIR || path.join(__dirname, "..", ".vendor");
const FFMPEG = require(path.join(VENDOR, "node_modules", "ffmpeg-static"));

const FPS = 25;
const col = (c) => "#" + String(c || "000000").replace("#", "");

/** Suavizado: arranca rápido y frena al final, como toda animación decente. */
const EASING = "t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3)";

/**
 * Un número que sube. Es la única pieza que rasteriza texto, así que se
 * coloca ENCIMA del cuadro de texto real: si se borra el GIF, el valor sigue
 * ahí y sigue siendo editable. En WebM/MP4 el antialiasing se conserva mejor
 * que en GIF, cuyo alfa es binario.
 */
function paginaContador(dato, tema, w, h) {
  const bruto = String(dato.valor || "0");
  const num = parseFloat(bruto.replace(/[^\d.,-]/g, "").replace(",", ".")) || 0;
  const decimales = (bruto.split(/[.,]/)[1] || "").length;
  const prefijo = bruto.match(/^[^\d-]*/)[0] || "";
  const sufijo = (bruto.match(/[^\d.,]*$/)[0] || "") + (dato.unidad || "");
  return `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;background:transparent}
  #v{width:${w}px;height:${h}px;display:flex;align-items:center;
     font:700 ${Math.round(h * 0.78)}px/1 '${tema.fuente_titulo}',system-ui,sans-serif;
     color:${col(tema.acento)};letter-spacing:-.04em;white-space:nowrap}
</style><div id="v"></div>
<script>
  const objetivo=${num}, dec=${decimales}, pre=${JSON.stringify(prefijo)},
        suf=${JSON.stringify(sufijo)}, el=document.getElementById('v');
  window.pintar = (t) => {
    const e = (${EASING});
    const v = objetivo * e;
    el.textContent = pre + v.toLocaleString('es-PE',
      {minimumFractionDigits:dec, maximumFractionDigits:dec}) + suf;
  };
  window.pintar(0);
</script>`;
}

function paginaBarra(item, tema, w, h) {
  const pct = Math.max(0, Math.min(100, parseFloat(item.valor) || 100));
  return `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;background:transparent}
  #p{width:${w}px;height:${h}px;background:${col(tema.borde)};
     border-radius:${h / 2}px;overflow:hidden}
  #b{height:100%;width:0;border-radius:${h / 2}px;
     background:linear-gradient(90deg,${col(tema.acento)},${col(tema.acento2)})}
</style><div id="p"><div id="b"></div></div>
<script>
  window.pintar=(t)=>{const e=(${EASING});
    document.getElementById('b').style.width=(${pct}*e)+'%';};
  window.pintar(0);
</script>`;
}

/**
 * Solo el anillo, sin número dentro: el porcentaje vive como cuadro de texto
 * real del slide (editable en PowerPoint y en Canva). Rasterizarlo aquí lo
 * volvería inamovible y, con el alfa binario del GIF, se vería hueco.
 */
function paginaDona(item, tema, tam) {
  const pct = Math.max(0, Math.min(100, parseFloat(item.valor) || 100));
  const r = tam / 2 - 14;
  const circ = 2 * Math.PI * r;
  return `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:transparent}</style>
<svg width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}">
  <circle cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none"
          stroke="${col(tema.borde)}" stroke-width="14"/>
  <circle id="a" cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none"
          stroke="${col(tema.acento)}" stroke-width="14" stroke-linecap="round"
          stroke-dasharray="${circ}" stroke-dashoffset="${circ}"
          transform="rotate(-90 ${tam / 2} ${tam / 2})"/>
</svg>
<script>
  const circ=${circ}, pct=${pct};
  window.pintar=(t)=>{const e=(${EASING});
    document.getElementById('a').setAttribute('stroke-dashoffset', circ*(1-pct/100*e));};
  window.pintar(0);
</script>`;
}

function paginaLinea(grafico, tema, w, h) {
  const vals = (grafico.series && grafico.series[0] && grafico.series[0].valores) || [];
  const max = Math.max(...vals, 1) * 1.1;
  const pad = 10;
  const pts = vals.map((v, i) => [
    pad + ((w - pad * 2) * i) / Math.max(vals.length - 1, 1),
    h - pad - ((h - pad * 2) * v) / max,
  ]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0] + "," + p[1]).join(" ");
  return `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:transparent}</style>
<svg width="${w}" height="${h}">
  <path id="l" d="${d}" fill="none" stroke="${col(tema.acento)}" stroke-width="4"
        stroke-linecap="round" stroke-linejoin="round"/>
  <g id="p">${pts.map((p) =>
    `<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="${col(tema.acento)}" opacity="0"/>`
  ).join("")}</g>
</svg>
<script>
  const l=document.getElementById('l'), largo=l.getTotalLength();
  const puntos=[...document.querySelectorAll('#p circle')];
  l.style.strokeDasharray=largo;
  window.pintar=(t)=>{const e=(${EASING});
    l.style.strokeDashoffset=largo*(1-e);
    puntos.forEach((c,i)=>{c.style.opacity = e >= (i/Math.max(puntos.length-1,1)) ? 1 : 0;});};
  window.pintar(0);
</script>`;
}

/** Captura los cuadros y los compila. Devuelve las rutas generadas. */
async function pieza(pagina, html, { w, h, dur, destino, formatos }) {
  const cuadros = Math.max(2, Math.round((dur / 1000) * FPS));
  const dirCuadros = destino + "_frames";
  fs.mkdirSync(dirCuadros, { recursive: true });

  await pagina.setViewportSize({ width: w, height: h });
  await pagina.setContent(html, { waitUntil: "load" });
  await pagina.evaluate(() => document.fonts.ready);

  for (let i = 0; i < cuadros; i++) {
    await pagina.evaluate((t) => window.pintar(t), i / (cuadros - 1));
    await pagina.screenshot({
      path: path.join(dirCuadros, `f${String(i).padStart(4, "0")}.png`),
      omitBackground: true,     // fondo transparente: se apoya sobre el slide
    });
  }
  // Congela el último cuadro un segundo para que no reinicie de golpe.
  const ultimo = path.join(dirCuadros, `f${String(cuadros - 1).padStart(4, "0")}.png`);
  for (let i = 0; i < FPS; i++) {
    fs.copyFileSync(ultimo,
      path.join(dirCuadros, `f${String(cuadros + i).padStart(4, "0")}.png`));
  }

  const patron = path.join(dirCuadros, "f%04d.png");
  const salidas = [];
  if (formatos.includes("gif")) {
    // Paleta propia: sin esto el GIF sale con bandas y el alfa se rompe.
    const paleta = path.join(dirCuadros, "paleta.png");
    execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-framerate", String(FPS),
      "-i", patron, "-vf", "palettegen=reserve_transparent=1", paleta]);
    const gif = destino + ".gif";
    execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-framerate", String(FPS),
      "-i", patron, "-i", paleta,
      "-lavfi", "paletteuse=alpha_threshold=128", "-loop", "0", gif]);
    salidas.push(gif);
  }
  if (formatos.includes("webm")) {
    const webm = destino + ".webm";
    execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-framerate", String(FPS),
      "-i", patron, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p",
      "-b:v", "0", "-crf", "32", webm]);
    salidas.push(webm);
  }
  if (formatos.includes("mp4")) {
    const mp4 = destino + ".mp4";
    execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-framerate", String(FPS),
      "-i", patron, "-c:v", "libx264", "-pix_fmt", "yuv420p",
      "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", mp4]);
    salidas.push(mp4);
  }
  fs.rmSync(dirCuadros, { recursive: true, force: true });
  return salidas;
}

async function generar(plan, dirSalida, { formatos = ["gif"], dur = 1400 } = {}) {
  fs.mkdirSync(dirSalida, { recursive: true });
  const tema = plan.colores;
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage();
  const hechas = [];

  for (const s of plan.slides) {
    const base = path.join(dirSalida, `slide${s.indice}`);

    if (s.dato && s.dato.animar_conteo !== false && s.dato.valor) {
      const salidas = await pieza(pagina, paginaContador(s.dato, tema, 640, 190),
        { w: 640, h: 190, dur, destino: base + "_contador", formatos });
      hechas.push({ slide: s.indice, tipo: "contador", archivos: salidas,
                    objetivo: `s${s.indice}_valor` });
    }

    if (s.arquetipo === "kpis" || s.arquetipo === "embudo") {
      const items = (s.items || []).filter((i) => /%$/.test(String(i.valor || "")));
      for (let k = 0; k < items.length; k++) {
        const salidas = await pieza(pagina, paginaDona(items[k], tema, 260),
          { w: 260, h: 260, dur, destino: `${base}_dona${k}`, formatos });
        hechas.push({ slide: s.indice, tipo: "dona", archivos: salidas,
                      objetivo: `s${s.indice}_kpi${k}_valor` });
      }
    }

    if (s.grafico && s.grafico.animar_dibujo &&
        ["line", "area"].includes(s.grafico.tipo)) {
      const salidas = await pieza(pagina, paginaLinea(s.grafico, tema, 700, 330),
        { w: 700, h: 330, dur: dur + 400, destino: base + "_linea", formatos });
      hechas.push({ slide: s.indice, tipo: "linea", archivos: salidas,
                    objetivo: `s${s.indice}_grafico` });
    }
  }

  await navegador.close();
  const manifiesto = path.join(dirSalida, "media.json");
  fs.writeFileSync(manifiesto, JSON.stringify(hechas, null, 2));
  return { hechas, manifiesto };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const entrada = args[0];
  const oi = args.indexOf("-o");
  const dir = oi >= 0 ? args[oi + 1] : "media";
  const fi = args.indexOf("--formatos");
  const formatos = fi >= 0 ? args[fi + 1].split(",") : ["gif"];
  if (!entrada) {
    console.error("uso: node animar_media.cjs deck.plan.json -o media [--formatos gif,webm,mp4]");
    process.exit(1);
  }
  const plan = JSON.parse(fs.readFileSync(entrada, "utf8"));
  generar(plan, dir, { formatos })
    .then((r) => {
      console.log(`  ${r.hechas.length} piezas animadas en ${dir}`);
      for (const h of r.hechas) {
        console.log(`    slide ${h.slide} · ${h.tipo} → ${h.archivos.map((a) => path.basename(a)).join(", ")}`);
      }
    })
    .catch((e) => { console.error("error:", e.stack || e.message); process.exit(1); });
}

module.exports = { generar };
