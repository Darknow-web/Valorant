#!/usr/bin/env node
/**
 * Fondos generados para los slides. Nada de bancos de fotos: se componen con
 * SVG y se rasterizan con sharp, así que no dependen de la red.
 *
 *   node fondos.cjs --tema tema.json --tratamiento malla -o fondo.png
 *   node fondos.cjs --muestrario tema.json -o muestras/
 *
 * Todos los tratamientos son sutiles a propósito: un fondo que compite con el
 * texto es un fondo que estorba. La regla es que el contraste medido del texto
 * sobre la zona donde va el texto no baje del mínimo, y `verificar()` lo mide
 * sobre el PNG real, no sobre el color teórico.
 */
const fs = require("fs");
const path = require("path");

const VENDOR = process.env.SLIDES_VENDOR_DIR || path.join(__dirname, "..", ".vendor");
const sharp = require(path.join(VENDOR, "node_modules", "sharp"));
const { iconoAPath } = require("./svg_a_path.cjs");
const { contraste } = require("./director_arte.cjs");

const W = 1920, H = 1080;
const col = (c) => "#" + String(c || "000000").replace("#", "");

function luminancia(h) {
  const s = String(h).replace("#", "");
  const c = [0, 2, 4].map((i) => {
    const v = parseInt(s.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/**
 * Opacidad de un halo, atenuada según lo luminoso que sea su color.
 *
 * Un acento muy claro (un verde o un cian brillante) sobre fondo oscuro crea
 * una zona casi blanca donde el texto claro deja de leerse — y ahí no sirve
 * aclarar más el texto, porque se acerca todavía más al halo. La única salida
 * es que el halo sea más tenue cuanto más claro es su color.
 */
function opacidadHalo(base, color, modo) {
  const l = luminancia(color);
  const factor = modo === "oscuro" ? 1 - l * 0.62 : 1 - (1 - l) * 0.35;
  return +(base * Math.max(0.3, factor)).toFixed(3);
}

/** Ruido determinista: el mismo tema da siempre el mismo fondo. */
function aleatorio(semilla) {
  let s = semilla >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const semillaDe = (txt) => {
  let h = 2166136261;
  for (const c of String(txt)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

// ---------------------------------------------------------------- tratamientos
const TRATAMIENTOS = {
  plano: (t) => `<rect width="${W}" height="${H}" fill="${col(t.fondo)}"/>`,

  /** Varios halos de color solapados: profundidad sin ruido. */
  malla: (t) => {
    const r = aleatorio(semillaDe(t.acento + t.fondo));
    const halos = [t.acento, t.acento2, t.serie[2] || t.acento].map((c, i) => {
      const cx = 12 + r() * 76, cy = 8 + r() * 84, rad = 34 + r() * 30;
      return `<radialGradient id="h${i}" cx="${cx}%" cy="${cy}%" r="${rad}%">
        <stop offset="0%" stop-color="${col(c)}" stop-opacity="${opacidadHalo(t.modo === "oscuro" ? 0.30 : 0.10, c, t.modo)}"/>
        <stop offset="100%" stop-color="${col(c)}" stop-opacity="0"/>
      </radialGradient>`;
    }).join("");
    return `<defs>${halos}</defs>
      <rect width="${W}" height="${H}" fill="${col(t.fondo)}"/>
      ${[0, 1, 2].map((i) => `<rect width="${W}" height="${H}" fill="url(#h${i})"/>`).join("")}`;
  },

  /** Un único foco de luz en una esquina. El más discreto. */
  resplandor: (t) => `<defs>
      <radialGradient id="g" cx="78%" cy="14%" r="62%">
        <stop offset="0%" stop-color="${col(t.acento)}" stop-opacity="${opacidadHalo(t.modo === "oscuro" ? 0.34 : 0.12, t.acento, t.modo)}"/>
        <stop offset="100%" stop-color="${col(t.acento)}" stop-opacity="0"/>
      </radialGradient></defs>
      <rect width="${W}" height="${H}" fill="${col(t.fondo)}"/>
      <rect width="${W}" height="${H}" fill="url(#g)"/>`,

  /** Manchas redondeadas al borde, como recortes de papel. */
  organico: (t) => {
    const r = aleatorio(semillaDe(t.fondo + t.acento2));
    const manchas = [t.acento, t.acento2, t.serie[3] || t.acento].map((c, i) => {
      const cx = (i % 2 ? 1.05 : -0.05) * W + (r() - 0.5) * 300;
      const cy = (i === 1 ? 1.0 : 0.0) * H + (r() - 0.5) * 400;
      const rad = 320 + r() * 300;
      return `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${rad.toFixed(0)}"
        fill="${col(c)}" opacity="${opacidadHalo(t.modo === "oscuro" ? 0.17 : 0.08, c, t.modo)}"/>`;
    }).join("");
    return `<rect width="${W}" height="${H}" fill="${col(t.fondo)}"/>
      <g filter="url(#b)">${manchas}</g>
      <defs><filter id="b"><feGaussianBlur stdDeviation="70"/></filter></defs>`;
  },

  /** Retícula fina: ordenado, va bien con contenido técnico. */
  geometrico: (t) => `<defs>
      <pattern id="p" width="72" height="72" patternUnits="userSpaceOnUse">
        <path d="M72 0H0V72" fill="none" stroke="${col(t.borde)}"
              stroke-width="1" opacity="0.5"/>
      </pattern>
      <radialGradient id="v" cx="50%" cy="45%" r="72%">
        <stop offset="0%" stop-color="${col(t.fondo)}" stop-opacity="0"/>
        <stop offset="100%" stop-color="${col(t.fondo)}" stop-opacity="0.95"/>
      </radialGradient></defs>
      <rect width="${W}" height="${H}" fill="${col(t.fondo)}"/>
      <rect width="${W}" height="${H}" fill="url(#p)"/>
      <rect width="${W}" height="${H}" fill="url(#v)"/>`,

  /** Curvas de nivel: da sensación de mapa o de datos. */
  topografico: (t) => {
    const r = aleatorio(semillaDe(t.acento + "topo"));
    let lineas = "";
    for (let i = 0; i < 14; i++) {
      const y = -80 + i * 92 + r() * 30;
      const a1 = 40 + r() * 70, a2 = 30 + r() * 60;
      lineas += `<path d="M-50 ${y.toFixed(0)}
        C ${W * 0.25} ${(y - a1).toFixed(0)}, ${W * 0.55} ${(y + a2).toFixed(0)}, ${W + 50} ${(y - a2 / 2).toFixed(0)}"
        fill="none" stroke="${col(t.acento)}" stroke-width="1.6"
        opacity="${((t.modo === "oscuro" ? 0.10 : 0.07) + (i % 3) * 0.03).toFixed(2)}"/>`;
    }
    return `<rect width="${W}" height="${H}" fill="${col(t.fondo)}"/>${lineas}`;
  },

  /** Grano de película: rompe la planitud sin dibujar nada. */
  grano: (t) => `<defs>
      <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85"
        numOctaves="3"/><feColorMatrix type="saturate" values="0"/></filter></defs>
      <rect width="${W}" height="${H}" fill="${col(t.fondo)}"/>
      <rect width="${W}" height="${H}" filter="url(#n)"
        opacity="${t.modo === "oscuro" ? 0.08 : 0.05}"/>`,
};

/**
 * Marca de agua: un icono enorme, sangrado por un borde y muy tenue.
 * Da contexto temático sin quitarle sitio al contenido.
 */
function marcaAgua(t, idIcono, { lado = "derecha", opacidad = 0.07 } = {}) {
  const ico = iconoAPath(idIcono);
  if (!ico) return "";
  const tam = 1150;
  const x = lado === "derecha" ? W - tam * 0.62 : -tam * 0.38;
  const y = H - tam * 0.72;
  const esc = tam / ico.viewBox.ancho;
  const trazo = ico.modo === "trazo";
  return `<g transform="translate(${x.toFixed(0)},${y.toFixed(0)}) scale(${esc.toFixed(4)})"
    opacity="${opacidad}">
      <path d="${ico.d}" ${trazo
        ? `fill="none" stroke="${col(t.acento)}" stroke-width="1.1"`
        : `fill="${col(t.acento)}"`} stroke-linecap="round" stroke-linejoin="round"/>
    </g>`;
}

async function generar(tema, {
  tratamiento = "malla", icono = null, opacidadMarca = 0.07, destino = null,
} = {}) {
  const dibujo = TRATAMIENTOS[tratamiento] || TRATAMIENTOS.malla;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"
    viewBox="0 0 ${W} ${H}">
    ${dibujo(tema)}
    ${icono ? marcaAgua(tema, icono, { opacidad: opacidadMarca }) : ""}
  </svg>`;
  const buf = await sharp(Buffer.from(svg)).png({ quality: 92 }).toBuffer();
  if (destino) {
    fs.mkdirSync(path.dirname(path.resolve(destino)), { recursive: true });
    fs.writeFileSync(destino, buf);
  }
  return buf;
}

/**
 * Mide el contraste real del texto sobre el fondo generado, muestreando la
 * zona donde el texto va a caer. Un degradado puede cumplir en el centro y
 * fallar en una esquina, y eso no se ve mirando solo el color base.
 */
async function verificar(buffer, colorTexto, zonas) {
  const img = sharp(buffer);
  const salida = [];
  for (const z of zonas) {
    const region = {
      left: Math.max(0, Math.round(z.x)), top: Math.max(0, Math.round(z.y)),
      width: Math.min(W - Math.round(z.x), Math.round(z.w)),
      height: Math.min(H - Math.round(z.y), Math.round(z.h)),
    };
    if (region.width < 2 || region.height < 2) continue;
    const { data, info } = await img.clone().extract(region)
      .raw().toBuffer({ resolveWithObject: true });
    // El peor píxel manda: si en algún punto el texto no se lee, no se lee.
    let peor = Infinity, peorColor = null;
    const paso = info.channels;
    for (let i = 0; i < data.length; i += paso * 97) {   // muestreo disperso
      const c = [data[i], data[i + 1], data[i + 2]]
        .map((v) => v.toString(16).padStart(2, "0")).join("");
      const r = contraste(colorTexto, c);
      if (r < peor) { peor = r; peorColor = c.toUpperCase(); }
    }
    salida.push({ zona: z.nombre || "", ratio: +peor.toFixed(2), fondoPeor: peorColor });
  }
  return salida;
}

/**
 * Ajusta los colores de texto del tema contra el fondo REAL ya generado.
 *
 * El margen teórico por tratamiento nunca acierta del todo: depende del tono,
 * de dónde caen los halos y de la zona del slide. Así que se genera el fondo,
 * se mide el peor punto de cada zona de texto y se oscurece (o aclara) el
 * color hasta cumplir. Devuelve el tema corregido y lo que hizo falta cambiar.
 */
async function ajustarAlFondo(tema, {
  tratamiento = "malla", icono = null, zonas = ZONAS_TEXTO, maxIntentos = 6,
} = {}) {
  const { forzarContraste, contraste } = require("./director_arte.cjs");
  const ajustado = { ...tema };
  const cambios = [];

  // Se apunta un poco por encima del mínimo: el muestreo del fondo es
  // disperso y quedarse justo en el límite deja fallos de una centésima.
  const HOLGURA = 1.06;
  for (const [clave, minimo] of [["texto", 4.5], ["texto_suave", 4.5],
                                 ["acento", 3.0], ["acento2", 3.0]]) {
    let intento = 0;
    const objetivo = minimo * HOLGURA;
    let exigido = objetivo;
    while (intento++ < maxIntentos) {
      const buf = await generar(ajustado, { tratamiento, icono });
      const medido = await verificar(buf, ajustado[clave], zonas);
      const peor = Math.min(...medido.map((m) => m.ratio));
      if (peor >= objetivo) {
        if (intento > 1) {
          cambios.push({ clave, de: tema[clave], a: ajustado[clave],
                         ratioFinal: +peor.toFixed(2) });
        }
        break;
      }
      // Se pide más contraste contra el color base, proporcional a lo que falta.
      exigido *= Math.max(1.08, objetivo / Math.max(peor, 0.1));
      ajustado[clave] = forzarContraste(ajustado[clave], ajustado.fondo,
                                        Math.min(exigido, 21));
    }
  }
  return { tema: ajustado, cambios };
}

/** Dónde cae el texto en los arquetipos, en píxeles de 1920x1080. */
const ZONAS_TEXTO = [
  { nombre: "cabecera", x: 122, y: 100, w: 1670, h: 200 },
  { nombre: "cuerpo", x: 122, y: 340, w: 820, h: 450 },
  { nombre: "panel", x: 1150, y: 300, w: 650, h: 450 },
  { nombre: "pie", x: 122, y: 880, w: 1670, h: 150 },
];

module.exports = {
  generar, verificar, marcaAgua, ajustarAlFondo, ZONAS_TEXTO,
  TRATAMIENTOS: Object.keys(TRATAMIENTOS),
};

if (require.main === module) {
  const a = process.argv.slice(2);
  const val = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
  const tema = JSON.parse(fs.readFileSync(val("--tema"), "utf8"));
  const destino = val("-o", "fondo.png");

  (async () => {
    if (a.includes("--muestrario")) {
      fs.mkdirSync(destino, { recursive: true });
      for (const t of Object.keys(TRATAMIENTOS)) {
        await generar(tema, { tratamiento: t, icono: val("--icono", null),
                              destino: path.join(destino, `${t}.png`) });
        console.log(`  ${t}.png`);
      }
      return;
    }
    await generar(tema, {
      tratamiento: val("--tratamiento", "malla"),
      icono: val("--icono", null), destino,
    });
    console.log(`  ${destino}`);
  })().catch((e) => { console.error("error:", e.message); process.exit(1); });
}
