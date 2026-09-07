/* Junta los módulos en el único archivo HTML que el Artifact necesita.
   El motor vive suelto para poder probarlo en Node; esto solo lo empaca. */
import { readFileSync, writeFileSync } from "node:fs";

const F = "fuente/";
const orden = ["catalogo.js","semana.js","habitos.js","motor.js","estado.js",
               "semilla.js","vista.js","rituales.js","asistente.js","arranque.js"];

const js = orden.map(f => {
  const s = readFileSync(F+f, "utf8");
  return "/* ══════ "+f+" ══════ */\n" +
    s.replace(/^import[\s\S]*?from\s+".*?";\s*$/gm, "")   // los módulos quedan en un solo ámbito
     .replace(/^export\s+(const|let|function|async function|class)\s/gm, "$1 ")
     .replace(/^export\s+\{[^}]*\};\s*$/gm, "")
     .replace(/^export\s+/gm, "");
}).join("\n\n");

const html = readFileSync(F+"index.html", "utf8");
const css  = readFileSync(F+"estilo.css", "utf8");
const i = html.indexOf("\n<div class=\"wrap\">");

writeFileSync("semana-blindada.html",
  html.slice(0, i) + "\n<style>\n" + css.trim() + "\n</style>\n" +
  html.slice(i) + "\n<script>\n\"use strict\";\n" + js + "\n</script>\n");

console.log("semana-blindada.html ·", readFileSync("semana-blindada.html","utf8").length, "bytes");
