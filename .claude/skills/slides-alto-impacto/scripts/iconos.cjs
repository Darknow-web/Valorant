#!/usr/bin/env node
/**
 * Banco de iconos offline para la skill.
 *
 *   node iconos.cjs buscar objetivo meta crecimiento     # explorar el catálogo
 *   node iconos.cjs png lucide:target '#38BDF8' out.png  # rasterizar uno
 *
 * Fuentes (todas locales tras setup.sh, sin red en tiempo de ejecución):
 *   @iconify-json/<set>   ~250k iconos entre lucide, mdi, tabler, ph y carbon
 *   simple-icons          3.4k logos de marca, con prefijo si:
 */
const fs = require("fs");
const path = require("path");

const VENDOR = process.env.SLIDES_VENDOR_DIR || path.join(__dirname, "..", ".vendor");
const NM = path.join(VENDOR, "node_modules");
const SETS = ["lucide", "mdi", "tabler", "ph", "carbon"];

const req = (m) => require(path.join(NM, m));

function cargarSet(nombre) {
  try {
    return require(path.join(NM, `@iconify-json/${nombre}/icons.json`));
  } catch {
    return null;
  }
}

/** Devuelve {body, width, height} del icono, o null. */
function obtener(id) {
  const [prefijo, ...resto] = id.split(":");
  const nombre = resto.join(":");
  if (prefijo === "si") {
    const si = req("simple-icons");
    const clave =
      "si" + nombre.replace(/(^|[-_ ])(\w)/g, (_, __, c) => c.toUpperCase());
    const icono = si[clave] || si[nombre];
    if (!icono) return null;
    return {
      body: icono.svg.replace(/<\/?svg[^>]*>/g, ""),
      width: 24, height: 24, solido: true,
    };
  }
  const set = cargarSet(prefijo);
  if (!set || !set.icons[nombre]) return null;
  const ico = set.icons[nombre];
  return {
    body: ico.body,
    width: ico.width || set.width || 24,
    height: ico.height || set.height || 24,
  };
}

/** Busca por palabras clave en todos los sets; devuelve los mejores ids. */
function buscar(terminos, limite = 24) {
  const claves = terminos.map((t) => t.toLowerCase());
  const salida = [];
  for (const nombreSet of SETS) {
    const set = cargarSet(nombreSet);
    if (!set) continue;
    for (const nombre of Object.keys(set.icons)) {
      let puntos = 0;
      for (const clave of claves) {
        if (nombre === clave) puntos += 10;
        else if (nombre.startsWith(clave)) puntos += 5;
        else if (nombre.includes(clave)) puntos += 2;
      }
      if (puntos) salida.push({ id: `${nombreSet}:${nombre}`, puntos });
    }
  }
  // Logos de marca: simple-icons expone un objeto con claves siXxx.
  try {
    const si = req("simple-icons");
    for (const clave of Object.keys(si)) {
      const slug = (si[clave] && si[clave].slug) || clave.replace(/^si/, "").toLowerCase();
      let puntos = 0;
      for (const c of claves) {
        if (slug === c) puntos += 12;
        else if (slug.startsWith(c)) puntos += 6;
        else if (slug.includes(c)) puntos += 2;
      }
      if (puntos) salida.push({ id: `si:${slug}`, puntos });
    }
  } catch { /* simple-icons es opcional */ }
  return salida.sort((a, b) => b.puntos - a.puntos).slice(0, limite);
}

/**
 * Resuelve un id de icono. Si no existe tal cual (pasa seguido: en lucide es
 * `circle-check`, no `check-circle`), busca el más parecido con las palabras
 * del nombre en vez de romper el build entero por un icono.
 */
function resolver(id) {
  if (obtener(id)) return id;
  const [prefijo, ...resto] = id.split(":");
  const palabras = resto.join(":").split(/[-_ ]+/).filter(Boolean);
  if (!palabras.length) return null;
  const candidatos = buscar(palabras, 40);
  // Primero uno del mismo set que el pedido; si no, el mejor de cualquiera.
  const mismoSet = candidatos.find((c) => c.id.startsWith(prefijo + ":"));
  const elegido = (mismoSet || candidatos[0] || {}).id || null;
  if (elegido) {
    console.warn(`  aviso: icono «${id}» no existe; se usa «${elegido}»`);
  } else {
    console.warn(`  aviso: icono «${id}» no existe y no hay alternativa; se omite`);
  }
  return elegido;
}

/** SVG completo, recoloreado al color dado. */
function svg(id, color = "#000000") {
  const resuelto = resolver(id);
  const ico = resuelto ? obtener(resuelto) : null;
  if (!ico) throw new Error(`Icono no encontrado: ${id}`);
  // Los iconos de Iconify usan currentColor; los de trazo necesitan el stroke.
  const cuerpo = ico.body
    .replace(/currentColor/g, color)
    .replace(/stroke-width="[\d.]+"/g, 'stroke-width="1.9"');
  // Los logos de simple-icons son formas sólidas sin atributo fill propio:
  // heredan el del <svg> raíz, así que ahí va el color y no "none".
  const relleno = ico.solido ? color : "none";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ico.width}" ` +
    `height="${ico.height}" viewBox="0 0 ${ico.width} ${ico.height}" ` +
    `fill="${relleno}" color="${color}">${cuerpo}</svg>`
  );
}

/** PNG transparente de al menos 256 px (lo que pide la skill pptx). */
async function png(id, color, destino, tam = 512) {
  const sharp = req("sharp");
  const buf = await sharp(Buffer.from(svg(id, color)), { density: 384 })
    .resize(tam, tam, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  if (destino) fs.writeFileSync(destino, buf);
  return buf;
}

/** Base64 listo para pptxgenjs addImage({ data }). */
async function dataUri(id, color, tam = 512) {
  const buf = await png(id, color, null, tam);
  return "image/png;base64," + buf.toString("base64");
}

module.exports = { obtener, resolver, buscar, svg, png, dataUri, SETS };

if (require.main === module) {
  const [cmd, ...args] = process.argv.slice(2);
  (async () => {
    if (cmd === "buscar") {
      const r = buscar(args);
      if (!r.length) return console.log("sin resultados");
      r.forEach((x) => console.log(`  ${x.id}`));
    } else if (cmd === "png") {
      const [id, color = "#000000", destino = "icono.png"] = args;
      await png(id, color, destino);
      console.log(`  ${destino} ← ${id}`);
    } else {
      console.log(
        "uso:\n  node iconos.cjs buscar <palabras...>\n" +
        "  node iconos.cjs png <set:nombre> <#hex> <destino.png>"
      );
    }
  })().catch((e) => {
    console.error("error:", e.message);
    process.exit(1);
  });
}
