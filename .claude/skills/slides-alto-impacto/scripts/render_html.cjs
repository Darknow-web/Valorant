#!/usr/bin/env node
/**
 * deck.plan.json → HTML
 *
 *   node render_html.cjs deck.plan.json -o vista.html            # vista previa (QA)
 *   node render_html.cjs deck.plan.json -o deck.html --artifact  # deck navegable
 *
 * Dibuja los MISMOS shapes que se mandaron a pptxgenjs (build_deck.cjs los
 * registra en el plan), así que la vista previa no puede divergir del .pptx.
 *
 * Sirve para tres cosas:
 *   1. QA visual con Playwright (aquí LibreOffice está incompleto y no
 *      convierte .pptx, así que este es el único render disponible).
 *   2. El deck interactivo que se publica como Artifact.
 *   3. Los cuadros de las animaciones que animar_media.cjs pasa a GIF/WebM.
 */
const fs = require("fs");
const path = require("path");

const PX = 96;                    // 1 pulgada = 96 px
const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const col = (c) => (c ? "#" + String(c).replace("#", "") : "transparent");

/** transparency de pptxgenjs (0-100) → alpha CSS. */
function conAlpha(hexColor, transparencia) {
  const c = col(hexColor);
  if (!transparencia) return c;
  const a = Math.max(0, Math.min(1, 1 - transparencia / 100));
  return `color-mix(in srgb, ${c} ${(a * 100).toFixed(1)}%, transparent)`;
}

function estiloTexto(o) {
  const partes = [
    `font-size:${(o.fontSize || 18) * (PX / 72)}px`,
    `color:${col(o.color)}`,
    `font-family:'${o.fontFace || "Inter"}',system-ui,sans-serif`,
    `font-weight:${o.bold ? 700 : 400}`,
    `text-align:${o.align || "left"}`,
  ];
  if (o.italic) partes.push("font-style:italic");
  if (o.charSpacing) partes.push(`letter-spacing:${o.charSpacing}px`);
  if (o.lineSpacing) partes.push(`line-height:${o.lineSpacing * (PX / 72)}px`);
  else partes.push("line-height:1.25");
  if (o.transparency) partes.push(`opacity:${1 - o.transparency / 100}`);
  const v = o.valign === "middle" ? "center" : o.valign === "bottom" ? "flex-end" : "flex-start";
  partes.push(`display:flex;flex-direction:column;justify-content:${v}`);
  return partes.join(";");
}

function caja(o) {
  return `left:${(o.x || 0) * PX}px;top:${(o.y || 0) * PX}px;` +
         `width:${(o.w || 0) * PX}px;height:${(o.h || 0) * PX}px`;
}

function sombraCss(sh) {
  if (!sh) return "";
  const a = sh.opacity == null ? 0.2 : sh.opacity;
  return `;box-shadow:0 ${(sh.offset || 3)}px ${(sh.blur || 10)}px ` +
         `color-mix(in srgb, ${col(sh.color)} ${(a * 100).toFixed(0)}%, transparent)`;
}

/** Gráficos: SVG propio con los mismos colores del tema. */
function grafico(tipoChart, datos, o, tema) {
  const w = (o.w || 6) * PX, h = (o.h || 3) * PX;
  const colores = (o.chartColors || tema.serie || ["888888"]).map(col);
  const series = datos || [];
  const cats = (series[0] && series[0].labels) || [];
  const todos = series.flatMap((s) => s.values || []);
  // Techo "bonito" por encima del dato mayor: si no, la serie roza el borde
  // superior y el eje muestra números arbitrarios (89, 67, 45…).
  const bruto = Math.max(...todos, 1);
  const magnitud = Math.pow(10, Math.floor(Math.log10(bruto)));
  const max = Math.ceil((bruto * 1.08) / (magnitud / 2)) * (magnitud / 2);
  const padL = 52, padB = 34, padT = 20, padR = 16;
  const iw = w - padL - padR, ih = h - padT - padB;
  const ejeCol = col(o.valGridLine && o.valGridLine.color) || "#8884";
  let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;

  // Rejilla horizontal
  for (let i = 0; i <= 4; i++) {
    const y = padT + (ih * i) / 4;
    svg += `<line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" ` +
           `stroke="${ejeCol}" stroke-width="0.75"/>`;
    svg += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="11" ` +
           `fill="${col(o.valAxisLabelColor)}">${Math.round(max - (max * i) / 4)}</text>`;
  }

  if (tipoChart === "pie" || tipoChart === "doughnut") {
    const vals = (series[0] && series[0].values) || [];
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 24;
    const rInt = tipoChart === "doughnut" ? r * ((o.holeSize || 60) / 100) : 0;
    let ang = -Math.PI / 2;
    svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
    vals.forEach((v, i) => {
      const d = (v / total) * Math.PI * 2;
      const [x1, y1] = [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
      const [x2, y2] = [cx + r * Math.cos(ang + d), cy + r * Math.sin(ang + d)];
      const [xi1, yi1] = [cx + rInt * Math.cos(ang + d), cy + rInt * Math.sin(ang + d)];
      const [xi2, yi2] = [cx + rInt * Math.cos(ang), cy + rInt * Math.sin(ang)];
      const grande = d > Math.PI ? 1 : 0;
      svg += `<path d="M${x1},${y1} A${r},${r} 0 ${grande},1 ${x2},${y2} ` +
             `L${xi1},${yi1} A${rInt},${rInt} 0 ${grande},0 ${xi2},${yi2} Z" ` +
             `fill="${colores[i % colores.length]}"/>`;
      ang += d;
    });
    return svg + "</svg>";
  }

  if (tipoChart === "line" || tipoChart === "area") {
    series.forEach((s, si) => {
      const n = Math.max(cats.length - 1, 1);
      const pts = (s.values || []).map((v, i) => {
        const x = padL + (iw * i) / n;   // primer y último punto en los extremos
        const y = padT + ih - (v / max) * ih;
        return [x, y];
      });
      const d = pts.map((p, i) => (i ? "L" : "M") + p[0] + "," + p[1]).join(" ");
      if (tipoChart === "area") {
        svg += `<path d="${d} L${pts[pts.length - 1][0]},${padT + ih} ` +
               `L${pts[0][0]},${padT + ih} Z" fill="${colores[si % colores.length]}" ` +
               `opacity="0.22"/>`;
      }
      svg += `<path class="linea" d="${d}" fill="none" ` +
             `stroke="${colores[si % colores.length]}" stroke-width="3" ` +
             `stroke-linecap="round" stroke-linejoin="round"/>`;
      pts.forEach((p, i) => {
        svg += `<circle cx="${p[0]}" cy="${p[1]}" r="5" ` +
               `fill="${colores[si % colores.length]}"/>`;
        if (o.showValue) {
          svg += `<text x="${p[0]}" y="${p[1] - 14}" text-anchor="middle" ` +
                 `font-size="12" font-weight="700" fill="${col(o.dataLabelColor)}">` +
                 `${s.values[i]}</text>`;
        }
      });
    });
  } else {
    const nSer = series.length || 1;
    const anchoGrupo = iw / Math.max(cats.length, 1);
    const anchoBarra = (anchoGrupo * 0.62) / nSer;
    series.forEach((s, si) => {
      (s.values || []).forEach((v, i) => {
        const alto = (v / max) * ih;
        const x = padL + anchoGrupo * i + anchoGrupo * 0.19 + anchoBarra * si;
        const y = padT + ih - alto;
        svg += `<rect class="barra" x="${x}" y="${y}" width="${anchoBarra}" ` +
               `height="${alto}" rx="3" fill="${colores[si % colores.length]}"/>`;
        if (o.showValue) {
          svg += `<text x="${x + anchoBarra / 2}" y="${y - 6}" text-anchor="middle" ` +
                 `font-size="12" font-weight="700" fill="${col(o.dataLabelColor)}">` +
                 `${v}</text>`;
        }
      });
    });
  }
  const enLinea = tipoChart === "line" || tipoChart === "area";
  cats.forEach((c, i) => {
    const x = enLinea
      ? padL + (iw * i) / Math.max(cats.length - 1, 1)
      : padL + (iw * (i + 0.5)) / Math.max(cats.length, 1);
    svg += `<text x="${x}" y="${h - 12}" text-anchor="middle" font-size="12" ` +
           `fill="${col(o.catAxisLabelColor)}">${esc(c)}</text>`;
  });
  return svg + "</svg>";
}

function tablaHtml(datos, o, tema) {
  let html = `<table style="width:100%;border-collapse:collapse;` +
             `font-family:'${tema.fuente_cuerpo}',system-ui,sans-serif">`;
  for (const fila of datos) {
    html += "<tr>";
    for (const celda of fila) {
      const co = (celda && celda.options) || {};
      html += `<td style="padding:9px 14px;border:1px solid ${col(tema.borde)};` +
              `background:${col(co.fill && co.fill.color)};color:${col(co.color)};` +
              `font-weight:${co.bold ? 700 : 400};font-size:${(co.fontSize || 15) * (PX / 72)}px">` +
              `${esc(celda && celda.text)}</td>`;
    }
    html += "</tr>";
  }
  return html + "</table>";
}

const FORMAS_CSS = {
  ellipse: "border-radius:50%",
  roundRect: null,          // usa rectRadius
  rect: "",
  line: null,
  rightArrow: null,
};

function shapeHtml(s, tema, idx) {
  const o = s.opciones || {};
  const nombre = o.objectName || `obj${idx}`;
  const base = `position:absolute;${caja(o)}`;
  const anim = `data-obj="${esc(nombre)}"`;

  if (s.tipo === "addText") {
    const texto = typeof s.arg0 === "string"
      ? esc(s.arg0).replace(/\n/g, "<br>")
      : (Array.isArray(s.arg0)
          ? s.arg0.map((r) => esc(r.text)).join("<br>")
          : esc(s.arg0));
    return `<div class="obj" ${anim} style="${base};${estiloTexto(o)}">` +
           `<div>${texto}</div></div>`;
  }
  if (s.tipo === "addImage") {
    const src = o.data ? `data:${o.data}` : (o.path || "");
    const op = o.transparency ? `;opacity:${1 - o.transparency / 100}` : "";
    return `<img class="obj" ${anim} src="${esc(src)}" style="${base};` +
           `object-fit:contain${op}">`;
  }
  if (s.tipo === "addChart") {
    return `<div class="obj grafico" ${anim} style="${base}">` +
           `${grafico(s.arg0, s.datos, o, tema)}</div>`;
  }
  if (s.tipo === "addTable") {
    return `<div class="obj" ${anim} style="position:absolute;left:${(o.x || 0) * PX}px;` +
           `top:${(o.y || 0) * PX}px;width:${(o.w || 0) * PX}px">` +
           `${tablaHtml(s.datos, o, tema)}</div>`;
  }
  // Formas
  const relleno = o.fill ? conAlpha(o.fill.color, o.fill.transparency) : "transparent";
  let extra = "";
  if (s.arg0 === "ellipse" || o.shape === "ellipse") extra = "border-radius:50%";
  if (o.rectRadius) extra = `border-radius:${o.rectRadius * PX}px`;
  if (o.line) {
    extra += `;border:${o.line.width || 1}px ` +
             `${o.line.dashType ? "dashed" : "solid"} ${col(o.line.color)}`;
  }
  const forma = s.arg0;
  if (forma === "line") {
    return `<div class="obj" ${anim} style="position:absolute;left:${(o.x || 0) * PX}px;` +
           `top:${(o.y || 0) * PX}px;width:${(o.w || 0) * PX}px;` +
           `height:${Math.max((o.h || 0) * PX, o.line ? o.line.width : 2)}px;` +
           `background:${col(o.line && o.line.color)}"></div>`;
  }
  if (forma === "rightArrow") {
    return `<div class="obj" ${anim} style="${base};display:flex;align-items:center;` +
           `justify-content:center;color:${col(o.fill && o.fill.color)};` +
           `font-size:${(o.h || 0.4) * PX}px;line-height:1">➔</div>`;
  }
  return `<div class="obj" ${anim} style="${base};background:${relleno};` +
         `${extra}${sombraCss(o.shadow)}"></div>`;
}

function slideHtml(slide, tema, i, total, { canva = false } = {}) {
  const fondo = (slide.shapes.find((s) => s.tipo === "background") || {}).opciones;
  const cuerpo = slide.shapes
    .filter((s) => s.tipo !== "background")
    .map((s, k) => shapeHtml(s, tema, k))
    .join("\n      ");
  // Canva importa HTML como presentación si cada página lleva estos atributos;
  // así respeta el corte de slides y se trae el guion del expositor.
  const anot = canva
    ? ` data-document-role="page" data-label="${esc(tituloDe(slide, i))}"` +
      ` data-speaker-notes="${esc(slide.notas || "")}"`
    : "";
  return `    <section class="slide" data-i="${i}" data-transicion="${esc(slide.transicion || "fade")}"${anot}
      style="background:${col((fondo && fondo.color) || tema.fondo)}">
      ${cuerpo}
    </section>`;
}

/** El título visible de la slide, para etiquetar la página en Canva. */
function tituloDe(slide, i) {
  for (const s of slide.shapes) {
    const nombre = (s.opciones || {}).objectName || "";
    if (s.tipo === "addText" && nombre.endsWith("_titulo") &&
        typeof s.arg0 === "string" && s.arg0.trim()) {
      return s.arg0.trim().slice(0, 60);
    }
  }
  return `Slide ${i + 1}`;
}

function documento(plan, { artifact, canva }) {
  const tema = plan.colores;
  const familias = [...new Set([tema.fuente_titulo, tema.fuente_cuerpo])];
  const gf = familias.map((f) => f.replace(/ /g, "+") + ":wght@400;600;700").join("&family=");
  const slides = plan.slides
    .map((s, i) => slideHtml(s, tema, i, plan.slides.length, { canva }))
    .join("\n");
  const notas = JSON.stringify(plan.slides.map((s) => s.notas || ""));

  const cssComun = `
    :root { color-scheme: ${tema.modo === "oscuro" ? "dark" : "light"}; }
    * { box-sizing: border-box; }
    body { margin: 0; background: ${col(tema.fondo_alt)};
           font-family: '${tema.fuente_cuerpo}', system-ui, sans-serif; }
    .slide { position: relative; width: 1280px; height: 720px; overflow: hidden;
             flex: none; }
    .obj { position: absolute; }
    .grafico svg { display: block; }`;

  if (canva) {
    // Para importar en Canva: páginas anotadas, sin JS ni navegación. Canva
    // ignora el script y la interactividad; lo que lee es la estructura.
    return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${esc(plan.titulo || "Presentación")}</title>
<link href="https://fonts.googleapis.com/css2?family=${gf}&display=block" rel="stylesheet">
<style>${cssComun}
  body { background: ${col(tema.fondo)}; }
  .slide { margin: 0 auto; }
</style></head><body>
${slides}
</body></html>`;
  }

  if (!artifact) {
    // Vista previa: todas las slides apiladas, sin animación (Playwright captura).
    return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${esc(plan.titulo || "Vista previa")}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${gf}&display=block" rel="stylesheet">
<style>${cssComun}
  .pila { display: flex; flex-direction: column; gap: 24px; padding: 24px; }
  .marco { position: relative; }
  .etq { position: absolute; top: -20px; left: 0; font: 700 13px/1 system-ui;
         color: ${col(tema.texto_suave)}; }
</style></head><body><div class="pila">
${plan.slides.map((s, i) => `  <div class="marco"><div class="etq">Slide ${i + 1} — ${esc(s.arquetipo)}</div>
${slideHtml(s, tema, i, plan.slides.length)}</div>`).join("\n")}
</div></body></html>`;
  }

  // Deck interactivo: navegación por teclado/clic, animaciones CSS y notas.
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(plan.titulo || "Presentación")}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${gf}&display=swap" rel="stylesheet">
<style>${cssComun}
  body { display: grid; place-items: center; min-height: 100vh; overflow: hidden; }
  #escenario { position: relative; width: 1280px; height: 720px;
               transform-origin: center; box-shadow: 0 18px 60px #0006;
               border-radius: 10px; overflow: hidden; }
  .slide { position: absolute; inset: 0; display: none; }
  .slide.activa { display: block; }
  .slide.activa .obj { animation: entrar .52s cubic-bezier(.2,.7,.3,1) both;
                       animation-delay: var(--d, 0s); }
  @keyframes entrar { from { opacity: 0; transform: translateY(18px) scale(.985); }
                      to   { opacity: 1; transform: none; } }
  .slide.activa[data-transicion="zoom"] .obj { animation-name: entrarZoom; }
  @keyframes entrarZoom { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: none; } }
  .slide.activa .grafico .barra { animation: crecer .7s cubic-bezier(.2,.7,.3,1) both;
                                  transform-origin: bottom; animation-delay: var(--d, 0s); }
  @keyframes crecer { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  .slide.activa .grafico .linea { stroke-dasharray: 2000; stroke-dashoffset: 2000;
                                  animation: trazar 1.4s ease-out .3s forwards; }
  @keyframes trazar { to { stroke-dashoffset: 0; } }
  #barra { position: fixed; bottom: 0; left: 0; height: 3px;
           background: ${col(tema.acento)}; transition: width .3s; z-index: 9; }
  #ui { position: fixed; bottom: 14px; right: 16px; display: flex; gap: 8px;
        align-items: center; font: 600 13px system-ui; color: ${col(tema.texto_suave)};
        background: ${col(tema.superficie)}; padding: 7px 12px; border-radius: 999px;
        border: 1px solid ${col(tema.borde)}; z-index: 10; }
  #ui button { all: unset; cursor: pointer; padding: 2px 9px; border-radius: 7px;
               color: ${col(tema.texto)}; }
  #ui button:hover { background: ${col(tema.fondo_alt)}; }
  #notas { position: fixed; left: 16px; bottom: 14px; max-width: 40vw; z-index: 10;
           font: 400 13px/1.45 system-ui; color: ${col(tema.texto_suave)};
           background: ${col(tema.superficie)}; border: 1px solid ${col(tema.borde)};
           border-radius: 10px; padding: 10px 13px; display: none; }
  #notas.visible { display: block; }
</style></head><body>
<div id="escenario">
${slides}
</div>
<div id="barra"></div>
<div id="notas"></div>
<div id="ui">
  <button id="prev">←</button><span id="pos">1 / ${plan.slides.length}</span>
  <button id="next">→</button><button id="bnotas" title="Guion (tecla N)">N</button>
</div>
<script>
  const slides = [...document.querySelectorAll('.slide')];
  const notas = ${notas};
  let i = 0;
  function escalar() {
    const e = document.getElementById('escenario');
    const k = Math.min(innerWidth / 1280, innerHeight / 720) * 0.94;
    e.style.transform = 'scale(' + k + ')';
  }
  function mostrar(n) {
    i = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach((s, k) => s.classList.toggle('activa', k === i));
    // Escalona la entrada de los objetos: el patrón que hace que se vea trabajado.
    slides[i].querySelectorAll('.obj').forEach((o, k) => {
      o.style.setProperty('--d', (k * 0.07).toFixed(2) + 's');
    });
    document.getElementById('pos').textContent = (i + 1) + ' / ' + slides.length;
    document.getElementById('barra').style.width =
      ((i + 1) / slides.length * 100) + 'vw';
    document.getElementById('notas').textContent = notas[i] || '';
  }
  addEventListener('keydown', (e) => {
    if (['ArrowRight', ' ', 'PageDown', 'Enter'].includes(e.key)) { e.preventDefault(); mostrar(i + 1); }
    if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); mostrar(i - 1); }
    if (e.key === 'Home') mostrar(0);
    if (e.key === 'End') mostrar(slides.length - 1);
    if (e.key.toLowerCase() === 'n') document.getElementById('notas').classList.toggle('visible');
  });
  document.getElementById('next').onclick = () => mostrar(i + 1);
  document.getElementById('prev').onclick = () => mostrar(i - 1);
  document.getElementById('bnotas').onclick = () =>
    document.getElementById('notas').classList.toggle('visible');
  document.getElementById('escenario').onclick = (e) => {
    mostrar(e.clientX < innerWidth / 2 ? i - 1 : i + 1);
  };
  addEventListener('resize', escalar);
  escalar(); mostrar(0);
</script></body></html>`;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const entrada = args[0];
  const oi = args.indexOf("-o");
  const destino = oi >= 0 ? args[oi + 1] : "vista.html";
  const artifact = args.includes("--artifact");
  const canva = args.includes("--canva");
  if (!entrada) {
    console.error("uso: node render_html.cjs deck.plan.json -o salida.html " +
                  "[--artifact | --canva]");
    process.exit(1);
  }
  const plan = JSON.parse(fs.readFileSync(entrada, "utf8"));
  fs.mkdirSync(path.dirname(path.resolve(destino)), { recursive: true });
  fs.writeFileSync(destino, documento(plan, { artifact, canva }));
  const modo = canva ? "para importar en Canva"
             : artifact ? "interactivo" : "vista previa";
  console.log(`  ${destino}  (${plan.slides.length} slides, ${modo})`);
}

module.exports = { documento, grafico };
