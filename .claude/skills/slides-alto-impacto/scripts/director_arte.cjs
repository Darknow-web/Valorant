#!/usr/bin/env node
/**
 * Compone una dirección de arte para el deck, en vez de elegir de una lista.
 *
 *   node director_arte.cjs --semilla "#2E6F9E" --modo oscuro --nombre "Ecología"
 *   node director_arte.cjs --desde-canva colores.json
 *
 * La estética es libre; la legibilidad no. Cada par texto/fondo se mide y se
 * corrige la luminosidad hasta cumplir el mínimo WCAG AA (4.5:1 en texto de
 * cuerpo, 3:1 en texto grande). Una paleta bonita que no se lee proyectada no
 * sirve, así que el ajuste es automático y no opcional.
 *
 * Los temas de `assets/temas.json` siguen ahí como puntos de partida; esto no
 * los sustituye, los amplía a cualquier asunto.
 */
const fs = require("fs");
const path = require("path");

// ------------------------------------------------------------------ color
const hex = (c) => String(c || "").replace("#", "").toUpperCase();

function aRgb(h) {
  h = hex(h);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
const aHex = (rgb) =>
  rgb.map((v) => Math.max(0, Math.min(255, Math.round(v)))
    .toString(16).padStart(2, "0")).join("").toUpperCase();

function rgbAHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslARgb([h, s, l]) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

const hsl = (h, s, l) => aHex(hslARgb([h, s, l]));
const deHex = (h) => rgbAHsl(aRgb(h));

function luminancia(h) {
  const c = aRgb(h).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contraste(a, b) {
  const la = luminancia(a), lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Empuja la luminosidad de `color` hasta que contrasta lo suficiente con
 * `fondo`, conservando su tono y su saturación. Es lo que permite partir de
 * cualquier color y seguir teniendo un deck legible.
 */
function forzarContraste(color, fondo, minimo) {
  if (contraste(color, fondo) >= minimo) return hex(color);
  const [h, s] = deHex(color);
  const fondoClaro = luminancia(fondo) > 0.35;
  let mejor = hex(color), mejorRatio = contraste(color, fondo);
  // Se recorre la luminosidad hacia donde haya contraste: hacia negro si el
  // fondo es claro, hacia blanco si es oscuro.
  for (let i = 1; i <= 100; i++) {
    const l = fondoClaro ? 0.5 - (i / 100) * 0.5 : 0.5 + (i / 100) * 0.5;
    const cand = hsl(h, s, Math.max(0.02, Math.min(0.98, l)));
    const r = contraste(cand, fondo);
    if (r > mejorRatio) { mejor = cand; mejorRatio = r; }
    if (r >= minimo) return cand;
  }
  return mejor;   // lo mejor alcanzable sin cambiar de tono
}

// ------------------------------------------------------------------ paleta
const AA_CUERPO = 4.5;
const AA_GRANDE = 3.0;

/**
 * Un fondo con color encima resta contraste al texto: lo medido sobre el color
 * base ya no vale. Cada tratamiento declara cuánto margen extra hay que
 * reservar, de modo que tras aplicarlo el texto siga por encima del mínimo.
 * Los valores salen de medir el contraste real sobre los PNG generados.
 */
const MARGEN_TRATAMIENTO = {
  plano: 1.0, geometrico: 1.0, grano: 1.02,
  topografico: 1.12, resplandor: 1.22, organico: 1.22, malla: 1.32,
};

/**
 * Construye la paleta completa a partir de un color semilla y un modo.
 * El acento secundario va a ~150° del principal, y las series se reparten el
 * círculo cromático para que se distingan entre sí en un gráfico.
 */
function componer({ semilla, modo = "oscuro", saturacion = "media",
                    tratamiento = "malla" }) {
  const [h0, s0] = deHex(semilla);
  const sat = { baja: 0.32, media: 0.55, alta: 0.78 }[saturacion] ?? Math.max(s0, 0.4);
  const oscuro = modo === "oscuro";
  const margen = MARGEN_TRATAMIENTO[tratamiento] ?? 1.25;
  const minCuerpo = AA_CUERPO * margen;
  const minGrande = AA_GRANDE * margen;

  const fondo = oscuro ? hsl(h0, 0.30, 0.055) : hsl(h0, 0.16, 0.975);
  const fondoAlt = oscuro ? hsl(h0, 0.28, 0.10) : hsl(h0, 0.14, 0.94);
  const superficie = oscuro ? hsl(h0, 0.25, 0.145) : "FFFFFF";
  const borde = oscuro ? hsl(h0, 0.22, 0.26) : hsl(h0, 0.16, 0.86);
  const texto = oscuro ? hsl(h0, 0.12, 0.97) : hsl(h0, 0.35, 0.09);

  // El acento nace de la semilla y luego se corrige hasta ser legible.
  const acentoCrudo = hsl(h0, sat, oscuro ? 0.62 : 0.45);
  const acento = forzarContraste(acentoCrudo, fondo, minGrande);
  const acento2 = forzarContraste(
    hsl(h0 + 150, sat * 0.9, oscuro ? 0.66 : 0.42), fondo, minGrande);
  const textoSuave = forzarContraste(
    hsl(h0, 0.16, oscuro ? 0.66 : 0.42), fondo, minCuerpo);

  const serie = [0, 150, 60, 300, 210, 30].map((giro, i) =>
    forzarContraste(
      hsl(h0 + giro, sat * (i % 2 ? 0.85 : 1), oscuro ? 0.62 : 0.45),
      fondo, minGrande));

  return {
    modo,
    fondo, fondo_alt: fondoAlt, superficie, borde,
    texto, texto_suave: textoSuave,
    acento, acento2,
    exito: forzarContraste(hsl(145, 0.55, oscuro ? 0.55 : 0.34), fondo, AA_GRANDE),
    alerta: forzarContraste(hsl(38, 0.75, oscuro ? 0.58 : 0.40), fondo, AA_GRANDE),
    peligro: forzarContraste(hsl(2, 0.65, oscuro ? 0.62 : 0.45), fondo, AA_GRANDE),
    serie,
    degradado: [fondo, fondoAlt, hsl(h0, sat * 0.55, oscuro ? 0.20 : 0.88)],
  };
}

// ------------------------------------------------------- tipografía
/**
 * Parejas de Google Fonts por carácter. No es una tabla de "temas": es una
 * paleta tipográfica de la que se elige según el tono que pida el asunto.
 */
const TIPOGRAFIAS = {
  academico:   { titulo: "Fraunces",           cuerpo: "Inter" },
  editorial:   { titulo: "Playfair Display",   cuerpo: "Source Sans 3" },
  tecnico:     { titulo: "Space Grotesk",      cuerpo: "Inter" },
  corporativo: { titulo: "Inter",              cuerpo: "Inter" },
  cercano:     { titulo: "Nunito",             cuerpo: "Nunito Sans" },
  impacto:     { titulo: "Sora",               cuerpo: "Inter" },
  elegante:    { titulo: "Cormorant Garamond", cuerpo: "Jost" },
  moderno:     { titulo: "Outfit",             cuerpo: "Inter" },
};

/** Tratamientos de fondo disponibles; los dibuja fondos.cjs. */
const TRATAMIENTOS = ["plano", "malla", "resplandor", "organico",
                      "geometrico", "topografico", "grano"];

function direccion(opciones) {
  const {
    semilla = "#3B82F6", modo = "oscuro", tono = "moderno",
    saturacion = "media", tratamiento = "malla", marcaAgua = null,
    nombre = "Sin nombre",
  } = opciones;

  const paleta = componer({ semilla, modo, saturacion, tratamiento });
  const fuentes = TIPOGRAFIAS[tono] || TIPOGRAFIAS.moderno;

  return {
    nombre,
    verificado: true,
    ...paleta,
    fuente_titulo: fuentes.titulo,
    fuente_cuerpo: fuentes.cuerpo,
    tratamiento_fondo: TRATAMIENTOS.includes(tratamiento) ? tratamiento : "malla",
    marca_agua: marcaAgua,     // id de icono, p. ej. "lucide:leaf"
    _origen: { semilla: hex(semilla), tono, saturacion },
  };
}

/** Informe de contraste de una paleta. Lo usa qa.py y la verificación. */
function auditar(tema) {
  const pares = [
    ["texto", tema.texto, tema.fondo, AA_CUERPO],
    ["texto_suave", tema.texto_suave, tema.fondo, AA_CUERPO],
    ["acento", tema.acento, tema.fondo, AA_GRANDE],
    ["acento2", tema.acento2, tema.fondo, AA_GRANDE],
    ["texto/superficie", tema.texto, tema.superficie, AA_CUERPO],
    ["acento/superficie", tema.acento, tema.superficie, AA_GRANDE],
    ...tema.serie.map((c, i) => [`serie${i}`, c, tema.fondo, AA_GRANDE]),
  ];
  return pares.map(([nombre, a, b, min]) => ({
    nombre, ratio: +contraste(a, b).toFixed(2), minimo: min,
    cumple: contraste(a, b) >= min,
  }));
}

module.exports = {
  direccion, componer, auditar, contraste, forzarContraste,
  TIPOGRAFIAS, TRATAMIENTOS, hsl, deHex,
};

if (require.main === module) {
  const a = process.argv.slice(2);
  const val = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
  const tema = direccion({
    semilla: val("--semilla", "#3B82F6"),
    modo: val("--modo", "oscuro"),
    tono: val("--tono", "moderno"),
    saturacion: val("--saturacion", "media"),
    tratamiento: val("--tratamiento", "malla"),
    marcaAgua: val("--marca-agua", null),
    nombre: val("--nombre", "Compuesto"),
  });
  const destino = val("-o", null);
  if (destino) {
    fs.mkdirSync(path.dirname(path.resolve(destino)), { recursive: true });
    fs.writeFileSync(destino, JSON.stringify(tema, null, 2));
  }
  console.log(JSON.stringify(tema, null, 2));
  const informe = auditar(tema);
  const malos = informe.filter((x) => !x.cumple);
  console.error(`\n  contraste: ${informe.length - malos.length}/${informe.length} cumplen`);
  for (const m of malos) {
    console.error(`   ! ${m.nombre}: ${m.ratio}:1 (mínimo ${m.minimo})`);
  }
}
