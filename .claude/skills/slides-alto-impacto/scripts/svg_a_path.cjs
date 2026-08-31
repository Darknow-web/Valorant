#!/usr/bin/env node
/**
 * Convierte el cuerpo SVG de un icono en UN solo atributo `d`, que es lo único
 * que acepta `insert_shape` de Canva.
 *
 *   node svg_a_path.cjs lucide:target
 *
 * Hay que resolver tres cosas:
 *   1. Los iconos traen `<circle>`, `<rect>`, `<line>`, `<polyline>` y
 *      `<polygon>` además de `<path>`. Todo eso se pasa a comandos de path.
 *   2. Canva admite M L H V C S A Z pero NO Q ni T (curvas cuadráticas), que
 *      usan bastantes iconos. Se convierten a cúbicas equivalentes — es una
 *      equivalencia exacta, no una aproximación.
 *   3. Solo cabe un path, así que todas las figuras se concatenan como
 *      subtrazados del mismo `d`.
 */
const path = require("path");

const VENDOR = process.env.SLIDES_VENDOR_DIR || path.join(__dirname, "..", ".vendor");
const svgpath = require(path.join(VENDOR, "node_modules", "svgpath"));
const iconos = require("./iconos.cjs");

const num = (s) => parseFloat(s || "0") || 0;

/** Atributos de una etiqueta SVG suelta. */
function attrs(etiqueta) {
  const out = {};
  for (const m of etiqueta.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

/** Un círculo, como dos arcos: es la forma exacta, no una aproximación. */
function circuloAPath(cx, cy, r) {
  return `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}` +
         `A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
}

function elipseAPath(cx, cy, rx, ry) {
  return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}` +
         `A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
}

function rectAPath(x, y, w, h, rx, ry) {
  rx = Math.min(rx || ry || 0, w / 2);
  ry = Math.min(ry || rx || 0, h / 2);
  if (!rx && !ry) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
  return `M${x + rx} ${y}H${x + w - rx}` +
         `A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}` +
         `V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}` +
         `H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}` +
         `V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
}

const puntosAPath = (puntos, cerrar) => {
  const p = (puntos || "").trim().split(/[\s,]+/).map(num);
  if (p.length < 4) return "";
  let d = `M${p[0]} ${p[1]}`;
  for (let i = 2; i + 1 < p.length; i += 2) d += `L${p[i]} ${p[i + 1]}`;
  return d + (cerrar ? "Z" : "");
};

/** Q/T → C. La cúbica equivalente de una cuadrática es exacta. */
function sinCuadraticas(d) {
  const salida = [];
  let x = 0, y = 0;
  svgpath(d).abs().unshort().iterate((seg) => {
    const cmd = seg[0];
    if (cmd === "Q") {
      const [, qx, qy, px, py] = seg;
      const c1x = x + (2 / 3) * (qx - x), c1y = y + (2 / 3) * (qy - y);
      const c2x = px + (2 / 3) * (qx - px), c2y = py + (2 / 3) * (qy - py);
      salida.push(["C", c1x, c1y, c2x, c2y, px, py]);
      x = px; y = py;
    } else {
      salida.push(seg);
      if (cmd === "Z") return;
      if (cmd === "H") x = seg[1];
      else if (cmd === "V") y = seg[1];
      else { x = seg[seg.length - 2]; y = seg[seg.length - 1]; }
    }
  });
  return salida
    .map((s) => s[0] + s.slice(1).map((n) => +Number(n).toFixed(3)).join(" "))
    .join("");
}

/**
 * Cuerpo SVG → { d, modo }.
 * `modo` es "trazo" (iconos de línea, como lucide) o "relleno" (sólidos, como
 * mdi). Canva pinta un solo path, así que un icono tiene que ser de uno u otro.
 */
function cuerpoAPath(cuerpo) {
  const trozos = [];
  let conTrazo = 0, conRelleno = 0;

  for (const m of cuerpo.matchAll(/<(path|circle|ellipse|rect|line|polyline|polygon)\b([^>]*)>/g)) {
    const [, etiqueta, crudo] = m;
    const a = attrs(crudo);
    // El relleno solo cuenta si es un color de verdad, no "none".
    if (a.stroke && a.stroke !== "none") conTrazo++;
    if (a.fill && a.fill !== "none") conRelleno++;

    // Cada trozo se absolutiza AQUÍ, antes de concatenar. Un segundo path que
    // empiece en relativo ("m22 7") se calcularía si no desde el final del
    // anterior, y el icono sale disparado fuera de su viewBox.
    if (etiqueta === "path" && a.d) trozos.push(svgpath(a.d).abs().unshort().toString());
    else if (etiqueta === "circle") trozos.push(circuloAPath(num(a.cx), num(a.cy), num(a.r)));
    else if (etiqueta === "ellipse")
      trozos.push(elipseAPath(num(a.cx), num(a.cy), num(a.rx), num(a.ry)));
    else if (etiqueta === "rect")
      trozos.push(rectAPath(num(a.x), num(a.y), num(a.width), num(a.height),
                            num(a.rx), num(a.ry)));
    else if (etiqueta === "line")
      trozos.push(`M${num(a.x1)} ${num(a.y1)}L${num(a.x2)} ${num(a.y2)}`);
    else if (etiqueta === "polyline") trozos.push(puntosAPath(a.points, false));
    else if (etiqueta === "polygon") trozos.push(puntosAPath(a.points, true));
  }

  // Los atributos del <g> envolvente valen para todos sus hijos.
  const g = cuerpo.match(/<g\b([^>]*)>/);
  if (g) {
    const ga = attrs(g[1]);
    if (ga.stroke && ga.stroke !== "none") conTrazo++;
    if (ga.fill && ga.fill !== "none") conRelleno++;
  }

  const d = trozos.filter(Boolean).join("");
  if (!d) return null;
  return { d: sinCuadraticas(d), modo: conTrazo >= conRelleno ? "trazo" : "relleno" };
}

/** Icono de Iconify o simple-icons → path listo para Canva. */
function iconoAPath(id) {
  const resuelto = iconos.resolver(id);
  if (!resuelto) return null;
  const ico = iconos.obtener(resuelto);
  if (!ico) return null;
  const r = cuerpoAPath(ico.body);
  if (!r) return null;
  return {
    ...r,
    id: resuelto,
    viewBox: { ancho: ico.width, alto: ico.height },
    modo: ico.solido ? "relleno" : r.modo,
  };
}

module.exports = { iconoAPath, cuerpoAPath, circuloAPath, rectAPath, sinCuadraticas };

if (require.main === module) {
  const id = process.argv[2] || "lucide:target";
  const r = iconoAPath(id);
  if (!r) { console.error("no encontrado:", id); process.exit(1); }
  console.log(`  ${r.id}  (${r.modo}, viewBox ${r.viewBox.ancho}x${r.viewBox.alto})`);
  console.log(`  ${r.d}`);
}
