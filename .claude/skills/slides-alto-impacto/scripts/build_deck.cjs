#!/usr/bin/env node
/**
 * deck.json → deck.pptx
 *
 *   node build_deck.cjs deck.json -o salida/deck.pptx
 *
 * Regla que no se rompe: TODO entra como objeto nativo de PowerPoint —
 * cuadros de texto, formas, gráficos e imágenes independientes. Nada de
 * slides rasterizadas. Es lo que mantiene el deck 100% editable en
 * PowerPoint y al importarlo en Canva.
 *
 * Cada shape se nombra (`objectName`) con un id estable tipo `s3_titulo`,
 * porque animar.py necesita esos nombres para saber a qué objeto le pone
 * cada animación.
 */
const fs = require("fs");
const path = require("path");

const VENDOR = process.env.SLIDES_VENDOR_DIR || path.join(__dirname, "..", ".vendor");
const NM = path.join(VENDOR, "node_modules");
const pptxgen = require(path.join(NM, "pptxgenjs"));
const iconos = require("./iconos.cjs");

const RAIZ = path.join(__dirname, "..");
const TEMAS = JSON.parse(fs.readFileSync(path.join(RAIZ, "assets", "temas.json"), "utf8"));
const G = TEMAS.grid;
const TP = TEMAS.tipografia;
const W = TEMAS._lienzo.ancho_in;
const H = TEMAS._lienzo.alto_in;

// --------------------------------------------------------------- utilidades
const hex = (c) => String(c || "").replace("#", "").toUpperCase();

/** pptxgenjs muta los objetos de opciones al convertirlos a EMU: nunca
 *  se comparte uno entre dos add*(). Cada llamada construye el suyo. */
const sombra = (t, fuerte = false) => ({
  type: "outer",
  color: t.modo === "oscuro" ? "000000" : "64748B",
  blur: fuerte ? 18 : 10,
  offset: fuerte ? 5 : 3,
  angle: 90,
  opacity: t.modo === "oscuro" ? 0.55 : 0.18,
});

function estilo(t, nivel, color) {
  const s = TP[nivel];
  return {
    fontSize: s.pt,
    bold: s.peso === "bold",
    color: hex(color || t.texto),
    charSpacing: s.espaciado || 0,   // `letterSpacing` se ignora en silencio
    lineSpacing: s.interlineado ? Math.round(s.pt * s.interlineado * 1.2) : undefined,
    fontFace: nivel.startsWith("titulo") || nivel.startsWith("dato")
      ? t.fuente_titulo : t.fuente_cuerpo,
    isTextBox: true,                 // sin esto el lector de pantalla lo lee como gráfico
    margin: 0,                       // el padding interno desalinea con las formas
  };
}

/**
 * Reduce el cuerpo de letra hasta que el texto entre en su caja.
 * Sin esto, un título de tres líneas se come el subtítulo de abajo (pasaba en
 * portada y cierre). PowerPoint no reflowea: escribe el texto y lo desborda.
 *
 * Estimación por ancho medio de glifo, suficiente porque el QA visual la
 * verifica después. Nunca baja de `tipografia.minimo_pt`.
 */
function ajustar(texto, opciones) {
  const { fontSize, bold, w, h, lineSpacing } = opciones;
  const cadena = String(texto || "");
  if (!cadena || !w || !h) return fontSize;
  const anchoGlifo = bold ? 0.55 : 0.5;   // en fracción del cuerpo
  const interlineado = lineSpacing ? lineSpacing / fontSize : 1.2;
  const minimo = TP.minimo_pt || 13;

  for (let pt = fontSize; pt >= minimo; pt -= 1) {
    const porLinea = Math.max(1, Math.floor((w * 72) / (anchoGlifo * pt)));
    // Corte por palabras, como hace PowerPoint.
    let lineas = 1, usado = 0;
    for (const palabra of cadena.split(/\s+/)) {
      const costo = palabra.length + (usado ? 1 : 0);
      if (usado + costo > porLinea && usado > 0) { lineas++; usado = palabra.length; }
      else usado += costo;
    }
    if (lineas * pt * interlineado <= h * 72) return pt;
  }
  return minimo;
}

/** estilo() + autoajuste, para los textos que pueden venir largos. */
function estiloAjustado(t, nivel, texto, caja, color) {
  const base = estilo(t, nivel, color);
  const pt = ajustar(texto, {
    fontSize: base.fontSize, bold: base.bold,
    w: caja.w, h: caja.h, lineSpacing: base.lineSpacing,
  });
  if (pt === base.fontSize) return base;
  const k = pt / base.fontSize;
  return {
    ...base,
    fontSize: pt,
    charSpacing: base.charSpacing ? +(base.charSpacing * k).toFixed(2) : 0,
    lineSpacing: base.lineSpacing ? Math.round(base.lineSpacing * k) : undefined,
  };
}

const mayus = (txt, nivel) =>
  TP[nivel] && TP[nivel].mayusculas ? String(txt).toUpperCase() : txt;

/** Fondo degradado como imagen: pptxgenjs no soporta rellenos degradados. */
async function fondoDegradado(t) {
  const sharp = require(path.join(NM, "sharp"));
  const cols = t.degradado || [t.fondo, t.fondo_alt];
  const paradas = cols
    .map((c, i) => `<stop offset="${(i / (cols.length - 1)) * 100}%" stop-color="#${hex(c)}"/>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">${paradas}</linearGradient>
    <radialGradient id="b" cx="78%" cy="18%" r="55%">
      <stop offset="0%" stop-color="#${hex(t.acento)}" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="#${hex(t.acento)}" stop-opacity="0"/>
    </radialGradient></defs>
    <rect width="1600" height="900" fill="url(#g)"/>
    <rect width="1600" height="900" fill="url(#b)"/></svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

// --------------------------------------------------------------- arquetipos
/** Cada arquetipo dibuja su slide y devuelve la lista de objectNames en el
 *  orden en que deben animarse. */
const ARQUETIPOS = {
  async portada(s, d, t, ctx) {
    const n = ctx.n;
    const orden = [];
    if (t.degradado) {
      s.addImage({ data: await fondoDegradado(t), x: 0, y: 0, w: W, h: H });
    }
    // Barra de acento vertical: ancla visual de la portada.
    s.addShape("rect", {
      x: 0, y: 0, w: 0.22, h: H, fill: { color: hex(t.acento) },
      objectName: `${n}_barra`,
    });
    orden.push(`${n}_barra`);

    if (d.kicker) {
      s.addText(mayus(d.kicker, "kicker"), {
        ...estilo(t, "kicker", t.acento), x: G.margen_x, y: 1.85,
        w: G.ancho_util, h: 0.4, objectName: `${n}_kicker`,
      });
      orden.push(`${n}_kicker`);
    }
    // Con icono a la derecha el título tiene que estrecharse o lo pisa.
    const cajaTitulo = { w: G.ancho_util * (d.icono ? 0.68 : 0.86), h: 2.2 };
    s.addText(d.titulo || "", {
      ...estiloAjustado(t, "titulo_xl", d.titulo, cajaTitulo),
      x: G.margen_x, y: 2.3, ...cajaTitulo, valign: "top",
      objectName: `${n}_titulo`,
    });
    orden.push(`${n}_titulo`);

    if (d.subtitulo) {
      s.addText(d.subtitulo, {
        ...estilo(t, "subtitulo", t.texto_suave), x: G.margen_x, y: 4.6,
        w: G.ancho_util * 0.72, h: 1.0, objectName: `${n}_subtitulo`,
      });
      orden.push(`${n}_subtitulo`);
    }
    if (d.icono) {
      s.addImage({
        data: await iconos.dataUri(d.icono, "#" + hex(t.acento)),
        x: W - 2.75, y: 2.35, w: 1.75, h: 1.75,
        transparency: 12, objectName: `${n}_icono`,
        __icono: d.icono, __color: hex(t.acento),
      });
      orden.push(`${n}_icono`);
    }
    return orden;
  },

  async divisor(s, d, t, ctx) {
    const n = ctx.n;
    s.background = { color: hex(t.modo === "oscuro" ? t.fondo_alt : t.acento) };
    const sobreAcento = t.modo !== "oscuro";
    const colTexto = sobreAcento ? "FFFFFF" : t.texto;
    const orden = [];
    if (d.kicker) {
      s.addText(mayus(d.kicker, "kicker"), {
        ...estilo(t, "kicker", sobreAcento ? "FFFFFF" : t.acento),
        x: G.margen_x, y: 2.9, w: G.ancho_util, h: 0.4,
        transparency: 30, objectName: `${n}_kicker`,
      });
      orden.push(`${n}_kicker`);
    }
    const cajaDiv = { w: G.ancho_util * 0.8, h: 1.6 };
    s.addText(d.titulo || "", {
      ...estiloAjustado(t, "titulo_xl", d.titulo, cajaDiv, colTexto),
      x: G.margen_x, y: 3.3, ...cajaDiv, objectName: `${n}_titulo`,
    });
    orden.push(`${n}_titulo`);
    return orden;
  },

  async dato_gigante(s, d, t, ctx) {
    const n = ctx.n;
    const orden = [];
    const dato = d.dato || {};
    if (d.kicker) {
      s.addText(mayus(d.kicker, "kicker"), {
        ...estilo(t, "kicker", t.acento), x: G.margen_x, y: G.margen_y,
        w: G.ancho_util, h: 0.4, objectName: `${n}_kicker`,
      });
      orden.push(`${n}_kicker`);
    }
    const valor = (dato.valor || "") + (dato.unidad || "");
    const grande = valor.length <= 5 ? "dato_xxl" : "dato_xl";
    const cajaValor = { w: G.ancho_util * 0.62, h: 2.4 };
    s.addText(valor, {
      ...estiloAjustado(t, grande, valor, cajaValor, t.acento),
      x: G.margen_x, y: 1.75, ...cajaValor, valign: "middle",
      objectName: `${n}_valor`,
    });
    orden.push(`${n}_valor`);

    if (dato.etiqueta) {
      s.addText(dato.etiqueta, {
        ...estilo(t, "subtitulo", t.texto_suave), x: G.margen_x, y: 4.25,
        w: G.ancho_util * 0.62, h: 0.9, objectName: `${n}_etiqueta`,
      });
      orden.push(`${n}_etiqueta`);
    }
    if (dato.delta) {
      const col = dato.tendencia === "baja" ? t.peligro
        : dato.tendencia === "sube" ? t.exito : t.texto_suave;
      s.addShape("roundRect", {
        x: G.margen_x, y: 5.25, w: 2.5, h: 0.62, rectRadius: 0.31,
        fill: { color: hex(col), transparency: 86 },
        line: { color: hex(col), width: 1 }, objectName: `${n}_delta_caja`,
      });
      s.addText(dato.delta, {
        ...estilo(t, "etiqueta", col), x: G.margen_x, y: 5.25, w: 2.5, h: 0.62,
        align: "center", valign: "middle", objectName: `${n}_delta`,
      });
      orden.push(`${n}_delta_caja`, `${n}_delta`);
    }
    if (d.conclusion) {
      s.addShape("roundRect", {
        x: W - G.margen_x - 4.1, y: 2.2, w: 4.1, h: 3.0,
        rectRadius: G.radio_grande,
        fill: { color: hex(t.superficie) },
        line: { color: hex(t.borde), width: 1 },
        shadow: sombra(t), objectName: `${n}_panel`,
      });
      s.addText(d.conclusion, {
        ...estilo(t, "cuerpo"), x: W - G.margen_x - 3.75, y: 2.5, w: 3.4,
        h: 2.4, valign: "middle", objectName: `${n}_conclusion`,
      });
      orden.push(`${n}_panel`, `${n}_conclusion`);
    }
    return orden;
  },

  async kpis(s, d, t, ctx) {
    const n = ctx.n;
    const orden = await encabezado(s, d, t, n);
    const items = (d.items || []).slice(0, 4);
    const ancho = (G.ancho_util - G.gutter * (items.length - 1)) / items.length;
    for (let i = 0; i < items.length; i++) {
      const x = G.margen_x + i * (ancho + G.gutter);
      const col = items[i].color ? hex(items[i].color) : hex(t.serie[i % t.serie.length]);
      s.addShape("roundRect", {
        x, y: 2.5, w: ancho, h: 3.0, rectRadius: G.radio_grande,
        fill: { color: hex(t.superficie) },
        line: { color: hex(t.borde), width: 1 },
        shadow: sombra(t), objectName: `${n}_kpi${i}_caja`,
      });
      s.addShape("rect", {
        x, y: 2.5, w: ancho, h: 0.09, fill: { color: col },
        objectName: `${n}_kpi${i}_barra`,
      });
      if (items[i].icono) {
        s.addImage({
          data: await iconos.dataUri(items[i].icono, "#" + col),
          x: x + 0.3, y: 2.85, w: 0.6, h: 0.6,
          objectName: `${n}_kpi${i}_icono`,
          __icono: items[i].icono, __color: col,
        });
      }
      s.addText(items[i].valor || "", {
        ...estilo(t, "dato", col), x: x + 0.28, y: 3.5, w: ancho - 0.56, h: 1.0,
        objectName: `${n}_kpi${i}_valor`,
      });
      s.addText(items[i].titulo || "", {
        ...estilo(t, "cuerpo_sm", t.texto_suave), x: x + 0.28, y: 4.5,
        w: ancho - 0.56, h: 0.85, objectName: `${n}_kpi${i}_texto`,
      });
      orden.push(`${n}_kpi${i}_caja`, `${n}_kpi${i}_valor`, `${n}_kpi${i}_texto`);
    }
    return orden;
  },

  async tarjetas(s, d, t, ctx) {
    const n = ctx.n;
    const orden = await encabezado(s, d, t, n);
    const items = (d.items || []).slice(0, 4);
    const ancho = (G.ancho_util - G.gutter * (items.length - 1)) / items.length;
    for (let i = 0; i < items.length; i++) {
      const x = G.margen_x + i * (ancho + G.gutter);
      const col = hex(t.serie[i % t.serie.length]);
      s.addShape("roundRect", {
        x, y: 2.45, w: ancho, h: 3.2, rectRadius: G.radio_grande,
        fill: { color: hex(t.superficie) },
        line: { color: hex(t.borde), width: 1 },
        shadow: sombra(t), objectName: `${n}_card${i}_caja`,
      });
      if (items[i].icono) {
        s.addShape("roundRect", {
          x: x + 0.32, y: 2.78, w: 0.86, h: 0.86, rectRadius: 0.2,
          fill: { color: col, transparency: 84 },
          objectName: `${n}_card${i}_iconobg`,
        });
        s.addImage({
          data: await iconos.dataUri(items[i].icono, "#" + col),
          x: x + 0.5, y: 2.96, w: 0.5, h: 0.5,
          objectName: `${n}_card${i}_icono`,
          __icono: items[i].icono, __color: col,
        });
      }
      s.addText(items[i].titulo || "", {
        ...estilo(t, "subtitulo"), fontSize: 21, bold: true,
        x: x + 0.32, y: 3.85, w: ancho - 0.64, h: 0.6,
        objectName: `${n}_card${i}_titulo`,
      });
      s.addText(items[i].texto || "", {
        ...estilo(t, "cuerpo_sm", t.texto_suave), x: x + 0.32, y: 4.45,
        w: ancho - 0.64, h: 1.05, objectName: `${n}_card${i}_texto`,
      });
      orden.push(`${n}_card${i}_caja`, `${n}_card${i}_titulo`, `${n}_card${i}_texto`);
    }
    return orden;
  },

  async comparacion(s, d, t, ctx) {
    const n = ctx.n;
    const orden = await encabezado(s, d, t, n);
    const items = (d.items || []).slice(0, 2);
    const ancho = (G.ancho_util - G.gutter) / 2;
    for (let i = 0; i < items.length; i++) {
      const x = G.margen_x + i * (ancho + G.gutter);
      const col = hex(items[i].color || (i === 0 ? t.texto_suave : t.acento));
      s.addShape("roundRect", {
        x, y: 2.4, w: ancho, h: 3.35, rectRadius: G.radio_grande,
        fill: { color: hex(i === 0 ? t.fondo_alt : t.superficie) },
        line: { color: i === 0 ? hex(t.borde) : col, width: i === 0 ? 1 : 2 },
        shadow: sombra(t, i === 1), objectName: `${n}_lado${i}_caja`,
      });
      s.addText(mayus(items[i].titulo || "", "etiqueta"), {
        ...estilo(t, "etiqueta", col), x: x + 0.38, y: 2.72, w: ancho - 0.76,
        h: 0.4, objectName: `${n}_lado${i}_titulo`,
      });
      if (items[i].valor) {
        s.addText(items[i].valor, {
          ...estilo(t, "dato", col), x: x + 0.38, y: 3.15, w: ancho - 0.76,
          h: 1.0, objectName: `${n}_lado${i}_valor`,
        });
      }
      s.addText(items[i].texto || "", {
        ...estilo(t, "cuerpo", t.texto_suave), x: x + 0.38,
        y: items[i].valor ? 4.25 : 3.3, w: ancho - 0.76, h: 1.3,
        objectName: `${n}_lado${i}_texto`,
      });
      orden.push(`${n}_lado${i}_caja`, `${n}_lado${i}_titulo`, `${n}_lado${i}_texto`);
    }
    // La flecha entre los dos lados narra el cambio.
    if (items.length === 2) {
      s.addShape("rightArrow", {
        x: W / 2 - 0.28, y: 3.85, w: 0.56, h: 0.44,
        fill: { color: hex(t.acento) }, objectName: `${n}_flecha`,
      });
      orden.push(`${n}_flecha`);
    }
    return orden;
  },

  async antes_despues(s, d, t, ctx) {
    return ARQUETIPOS.comparacion(s, d, t, ctx);
  },

  async proceso(s, d, t, ctx) {
    const n = ctx.n;
    const orden = await encabezado(s, d, t, n);
    const items = (d.items || []).slice(0, 5);
    const ancho = (G.ancho_util - G.gutter * (items.length - 1)) / items.length;
    for (let i = 0; i < items.length; i++) {
      const x = G.margen_x + i * (ancho + G.gutter);
      const col = hex(t.serie[i % t.serie.length]);
      s.addShape("ellipse", {
        x: x + ancho / 2 - 0.38, y: 2.6, w: 0.76, h: 0.76,
        fill: { color: col }, objectName: `${n}_paso${i}_circulo`,
      });
      s.addText(String(i + 1), {
        ...estilo(t, "subtitulo", t.modo === "oscuro" ? t.fondo : "FFFFFF"),
        bold: true, x: x + ancho / 2 - 0.38, y: 2.6, w: 0.76, h: 0.76,
        align: "center", valign: "middle", objectName: `${n}_paso${i}_num`,
      });
      if (i < items.length - 1) {
        s.addShape("line", {
          x: x + ancho / 2 + 0.42, y: 2.98, w: ancho + G.gutter - 0.84, h: 0,
          line: { color: hex(t.borde), width: 2, dashType: "sysDot" },
          objectName: `${n}_paso${i}_linea`,
        });
      }
      s.addText(items[i].titulo || "", {
        ...estilo(t, "subtitulo"), fontSize: 19, bold: true, align: "center",
        x, y: 3.6, w: ancho, h: 0.6, objectName: `${n}_paso${i}_titulo`,
      });
      s.addText(items[i].texto || "", {
        ...estilo(t, "cuerpo_sm", t.texto_suave), align: "center",
        x, y: 4.2, w: ancho, h: 1.2, objectName: `${n}_paso${i}_texto`,
      });
      orden.push(`${n}_paso${i}_circulo`, `${n}_paso${i}_num`,
                 `${n}_paso${i}_titulo`, `${n}_paso${i}_texto`);
    }
    return orden;
  },

  async timeline(s, d, t, ctx) {
    const n = ctx.n;
    const orden = await encabezado(s, d, t, n);
    const items = (d.items || []).slice(0, 5);
    s.addShape("line", {
      x: G.margen_x, y: 3.9, w: G.ancho_util, h: 0,
      line: { color: hex(t.borde), width: 3 }, objectName: `${n}_eje`,
    });
    orden.push(`${n}_eje`);
    const paso = G.ancho_util / Math.max(items.length - 1, 1);
    for (let i = 0; i < items.length; i++) {
      const cx = G.margen_x + i * paso;
      const arriba = i % 2 === 0;
      const col = hex(t.serie[i % t.serie.length]);
      s.addShape("ellipse", {
        x: cx - 0.13, y: 3.77, w: 0.26, h: 0.26, fill: { color: col },
        line: { color: hex(t.fondo), width: 2 }, objectName: `${n}_hito${i}_punto`,
      });
      s.addText(items[i].fecha || items[i].valor || "", {
        ...estilo(t, "etiqueta", col), x: cx - 1.1, y: arriba ? 2.6 : 4.85,
        w: 2.2, h: 0.35, align: "center", objectName: `${n}_hito${i}_fecha`,
      });
      s.addText(items[i].titulo || "", {
        ...estilo(t, "cuerpo_sm"), bold: true, x: cx - 1.1,
        y: arriba ? 2.95 : 5.2, w: 2.2, h: 0.75, align: "center",
        objectName: `${n}_hito${i}_titulo`,
      });
      orden.push(`${n}_hito${i}_punto`, `${n}_hito${i}_fecha`, `${n}_hito${i}_titulo`);
    }
    return orden;
  },

  async matriz(s, d, t, ctx) {
    const n = ctx.n;
    const orden = await encabezado(s, d, t, n);
    const items = (d.items || []).slice(0, 4);
    const ancho = (G.ancho_util - G.gutter) / 2;
    const alto = 1.62;
    for (let i = 0; i < items.length; i++) {
      const x = G.margen_x + (i % 2) * (ancho + G.gutter);
      const y = 2.55 + Math.floor(i / 2) * (alto + G.gutter);
      const col = hex(items[i].color || t.serie[i % t.serie.length]);
      s.addShape("roundRect", {
        x, y, w: ancho, h: alto, rectRadius: G.radio,
        fill: { color: col, transparency: 90 },
        line: { color: col, width: 1.5 }, objectName: `${n}_cel${i}_caja`,
      });
      s.addText(items[i].titulo || "", {
        ...estilo(t, "subtitulo", col), bold: true, fontSize: 20,
        x: x + 0.3, y: y + 0.22, w: ancho - 0.6, h: 0.5,
        objectName: `${n}_cel${i}_titulo`,
      });
      s.addText(items[i].texto || "", {
        ...estilo(t, "cuerpo_sm", t.texto_suave), x: x + 0.3, y: y + 0.75,
        w: ancho - 0.6, h: 0.75, objectName: `${n}_cel${i}_texto`,
      });
      orden.push(`${n}_cel${i}_caja`, `${n}_cel${i}_titulo`, `${n}_cel${i}_texto`);
    }
    return orden;
  },

  async embudo(s, d, t, ctx) {
    const n = ctx.n;
    const orden = await encabezado(s, d, t, n);
    const items = (d.items || []).slice(0, 5);
    const alto = 0.72;
    for (let i = 0; i < items.length; i++) {
      const merma = (i / Math.max(items.length, 1)) * 0.42;
      const ancho = G.ancho_util * 0.58 * (1 - merma);
      const y = 2.55 + i * (alto + 0.16);
      const col = hex(t.serie[i % t.serie.length]);
      s.addShape("roundRect", {
        x: G.margen_x + (G.ancho_util * 0.58 - ancho) / 2, y, w: ancho, h: alto,
        rectRadius: G.radio, fill: { color: col },
        objectName: `${n}_nivel${i}_barra`,
      });
      s.addText(items[i].titulo || "", {
        ...estilo(t, "cuerpo", t.modo === "oscuro" ? t.fondo : "FFFFFF"),
        bold: true, x: G.margen_x + (G.ancho_util * 0.58 - ancho) / 2 + 0.25,
        y, w: ancho - 0.5, h: alto, valign: "middle",
        objectName: `${n}_nivel${i}_titulo`,
      });
      s.addText(items[i].valor || "", {
        ...estilo(t, "subtitulo", col), bold: true,
        x: G.margen_x + G.ancho_util * 0.58 + 0.35, y, w: 2.2, h: alto,
        valign: "middle", objectName: `${n}_nivel${i}_valor`,
      });
      orden.push(`${n}_nivel${i}_barra`, `${n}_nivel${i}_titulo`, `${n}_nivel${i}_valor`);
    }
    return orden;
  },

  async cita(s, d, t, ctx) {
    const n = ctx.n;
    const orden = [];
    s.addText("“", {
      fontSize: 200, bold: true, color: hex(t.acento), isTextBox: true,
      margin: 0, fontFace: t.fuente_titulo, x: G.margen_x - 0.1, y: 0.9,
      w: 2, h: 2, transparency: 70, objectName: `${n}_comilla`,
    });
    const cajaCita = { w: G.ancho_util - 1.0, h: 2.6 };
    const baseCita = estilo(t, "titulo");
    s.addText(d.titulo || "", {
      ...baseCita, italic: true,
      fontSize: ajustar(d.titulo, { fontSize: 34, bold: true, ...cajaCita }),
      x: G.margen_x + 0.5, y: 2.2, ...cajaCita,
      valign: "middle", objectName: `${n}_cita`,
    });
    s.addShape("line", {
      x: G.margen_x + 0.5, y: 5.05, w: 1.2, h: 0,
      line: { color: hex(t.acento), width: 3 }, objectName: `${n}_regla`,
    });
    s.addText(d.subtitulo || "", {
      ...estilo(t, "cuerpo_sm", t.texto_suave), x: G.margen_x + 0.5, y: 5.2,
      w: G.ancho_util - 1.0, h: 0.6, objectName: `${n}_autor`,
    });
    orden.push(`${n}_comilla`, `${n}_cita`, `${n}_regla`, `${n}_autor`);
    return orden;
  },

  async grafico(s, d, t, ctx) {
    const n = ctx.n;
    const orden = await encabezado(s, d, t, n);
    const g = d.grafico || {};
    const conConclusion = Boolean(d.conclusion);
    const anchoGrafico = conConclusion ? G.ancho_util * 0.63 : G.ancho_util;

    const datos = (g.series || []).map((serie) => ({
      name: serie.nombre || "Serie",
      labels: g.categorias || [],
      values: serie.valores || [],
    }));

    // Sin esta configuración el gráfico sale con el estilo por defecto de 2007.
    const opciones = {
      x: G.margen_x, y: 2.4, w: anchoGrafico, h: 3.6,
      chartColors: (t.serie || []).map(hex),
      showTitle: false,
      showLegend: datos.length > 1,
      legendPos: "b",
      legendColor: hex(t.texto_suave),
      legendFontSize: 12,
      showValue: true,
      dataLabelColor: hex(t.texto),
      dataLabelFontSize: 13,
      dataLabelFontBold: true,
      dataLabelFormatCode: g.sufijo === "%" ? '0"%"' : "#,##0.#",
      catAxisLabelColor: hex(t.texto_suave),
      valAxisLabelColor: hex(t.texto_suave),
      catAxisLabelFontSize: 13,
      valAxisLabelFontSize: 12,
      catGridLine: { style: "none" },
      valGridLine: { color: hex(t.borde), size: 0.75 },
      catAxisLineShow: false,
      valAxisLineShow: false,
      chartArea: { fill: { color: hex(t.fondo), transparency: 100 } },
      plotArea: { fill: { color: hex(t.fondo), transparency: 100 } },
      objectName: `${n}_grafico`,
    };
    const tipo = g.tipo || "bar";
    if (tipo === "doughnut") {
      opciones.holeSize = 62;
      opciones.dataLabelPosition = "bestFit";
    } else if (tipo === "pie") {
      opciones.dataLabelPosition = "bestFit";
    } else if (tipo === "line" || tipo === "area") {
      opciones.lineDataSymbol = "circle";
      opciones.lineSize = 3;
      opciones.lineSmooth = true;
      opciones.dataLabelPosition = "t";
    } else {
      // En stacked, `outEnd` corrompe el archivo; aquí no hay stacking.
      opciones.dataLabelPosition = tipo === "barH" ? "outEnd" : "outEnd";
      opciones.barGapWidthPct = 45;
    }
    const mapaTipo = {
      bar: "bar", barH: "bar", line: "line", pie: "pie",
      doughnut: "doughnut", area: "area", radar: "radar", scatter: "scatter",
    };
    if (tipo === "barH") opciones.barDir = "bar";
    else if (tipo === "bar") opciones.barDir = "col";

    s.addChart(mapaTipo[tipo] || "bar", datos, opciones);
    orden.push(`${n}_grafico`);

    if (conConclusion) {
      const x = G.margen_x + anchoGrafico + G.gutter;
      const w = W - G.margen_x - x;
      s.addShape("roundRect", {
        x, y: 2.7, w, h: 2.6, rectRadius: G.radio_grande,
        fill: { color: hex(t.acento), transparency: 90 },
        line: { color: hex(t.acento), width: 1 }, objectName: `${n}_panel`,
      });
      s.addText(d.conclusion, {
        ...estilo(t, "cuerpo"), x: x + 0.3, y: 2.95, w: w - 0.6, h: 2.1,
        valign: "middle", objectName: `${n}_conclusion`,
      });
      orden.push(`${n}_panel`, `${n}_conclusion`);
    }
    return orden;
  },

  async tabla(s, d, t, ctx) {
    const n = ctx.n;
    const orden = await encabezado(s, d, t, n);
    const tb = d.tabla || {};
    const enc = tb.encabezado || [];
    const filas = (tb.filas || []).slice(0, TEMAS.limites.filas_tabla_max);
    const cuerpo = [
      enc.map((c) => ({
        text: String(c),
        options: {
          bold: true, color: hex(t.modo === "oscuro" ? t.fondo : "FFFFFF"),
          fill: { color: hex(t.acento) }, fontSize: 15,
          fontFace: t.fuente_cuerpo, align: "left", valign: "middle",
        },
      })),
      ...filas.map((fila, i) =>
        fila.map((c, j) => ({
          text: String(c),
          options: {
            color: hex(j === tb.resaltar_columna ? t.acento : t.texto),
            bold: j === tb.resaltar_columna,
            fill: { color: hex(i % 2 ? t.fondo_alt : t.superficie) },
            fontSize: 15, fontFace: t.fuente_cuerpo, valign: "middle",
          },
        }))),
    ];
    s.addTable(cuerpo, {
      x: G.margen_x, y: 2.5, w: G.ancho_util, rowH: 0.5,
      border: { type: "solid", color: hex(t.borde), pt: 1 },
      objectName: `${n}_tabla`,
    });
    orden.push(`${n}_tabla`);
    return orden;
  },

  async bullets(s, d, t, ctx) {
    const n = ctx.n;
    const orden = await encabezado(s, d, t, n);
    const items = (d.items || []).slice(0, TEMAS.limites.bullets_max);
    for (let i = 0; i < items.length; i++) {
      const y = 2.6 + i * 0.82;
      const col = hex(t.serie[i % t.serie.length]);
      s.addShape("ellipse", {
        x: G.margen_x, y: y + 0.13, w: 0.26, h: 0.26, fill: { color: col },
        objectName: `${n}_b${i}_punto`,
      });
      s.addText(items[i].titulo || items[i].texto || "", {
        ...estilo(t, "cuerpo"), fontSize: 22, x: G.margen_x + 0.55, y,
        w: G.ancho_util - 0.55, h: 0.6, valign: "middle",
        objectName: `${n}_b${i}_texto`,
      });
      orden.push(`${n}_b${i}_punto`, `${n}_b${i}_texto`);
    }
    if (d.imagen && fs.existsSync(d.imagen)) {
      s.addImage({
        path: d.imagen, x: W - G.margen_x - 3.6, y: 2.5, w: 3.6, h: 2.7,
        rounding: false, objectName: `${n}_imagen`,
      });
      orden.push(`${n}_imagen`);
    }
    return orden;
  },

  async cierre(s, d, t, ctx) {
    const n = ctx.n;
    const orden = [];
    s.background = { color: hex(t.modo === "oscuro" ? t.fondo : t.fondo_alt) };
    const cajaCierre = { w: G.ancho_util, h: 1.6 };
    s.addText(d.titulo || "", {
      ...estiloAjustado(t, "titulo_xl", d.titulo, cajaCierre),
      align: "center", x: G.margen_x, y: 2.4, ...cajaCierre,
      objectName: `${n}_titulo`,
    });
    orden.push(`${n}_titulo`);
    if (d.subtitulo) {
      s.addText(d.subtitulo, {
        ...estilo(t, "subtitulo", t.texto_suave), align: "center",
        x: G.margen_x + 1.5, y: 4.1, w: G.ancho_util - 3.0, h: 1.0,
        objectName: `${n}_subtitulo`,
      });
      orden.push(`${n}_subtitulo`);
    }
    if (d.conclusion) {
      s.addShape("roundRect", {
        x: W / 2 - 2.0, y: 5.3, w: 4.0, h: 0.7, rectRadius: 0.35,
        fill: { color: hex(t.acento) }, objectName: `${n}_cta_caja`,
      });
      s.addText(d.conclusion, {
        ...estilo(t, "etiqueta", t.modo === "oscuro" ? t.fondo : "FFFFFF"),
        align: "center", valign: "middle", x: W / 2 - 2.0, y: 5.3, w: 4.0,
        h: 0.7, objectName: `${n}_cta`,
      });
      orden.push(`${n}_cta_caja`, `${n}_cta`);
    }
    return orden;
  },
};

/**
 * Envuelve un slide de pptxgenjs para registrar cada objeto que se le añade.
 * De ahí sale `deck.layout.json`, que render_html.cjs usa para dibujar la
 * vista previa y el deck interactivo: una sola fuente de verdad para las
 * coordenadas, así la previsualización no puede divergir del .pptx.
 */
function espiar(slide, registro) {
  const metodos = ["addText", "addShape", "addImage", "addChart", "addTable"];
  const proxy = {
    get background() { return slide.background; },
    set background(v) { registro.push({ tipo: "background", opciones: v }); slide.background = v; },
    addNotes: (...a) => slide.addNotes(...a),
  };
  for (const m of metodos) {
    proxy[m] = (...args) => {
      // pptxgenjs muta en su sitio lo que recibe (opciones a EMU, y las series
      // de un gráfico quedan irreconocibles). Hay que clonar ANTES de llamarlo
      // o el registro guarda la versión ya destruida.
      const clon = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
      registro.push({
        tipo: m,
        arg0: m === "addText" || m === "addChart" ? clon(args[0]) : undefined,
        datos: m === "addChart" ? clon(args[1])
             : m === "addTable" ? clon(args[0]) : undefined,
        opciones: clon(args[args.length - 1]) || {},
      });
      return slide[m](...args);
    };
  }
  return proxy;
}

/** Kicker + título + subtítulo: la cabecera común de casi todos los slides. */
async function encabezado(s, d, t, n) {
  const orden = [];
  if (d.kicker) {
    s.addText(mayus(d.kicker, "kicker"), {
      ...estilo(t, "kicker", t.acento), x: G.margen_x, y: G.margen_y,
      w: G.ancho_util, h: 0.35, objectName: `${n}_kicker`,
    });
    orden.push(`${n}_kicker`);
  }
  if (d.titulo) {
    const cajaEnc = { w: G.ancho_util, h: 0.95 };
    s.addText(d.titulo, {
      ...estiloAjustado(t, "titulo", d.titulo, cajaEnc),
      x: G.margen_x, y: d.kicker ? 1.05 : G.margen_y, ...cajaEnc,
      objectName: `${n}_titulo`,
    });
    orden.push(`${n}_titulo`);
  }
  if (d.subtitulo) {
    s.addText(d.subtitulo, {
      ...estilo(t, "cuerpo", t.texto_suave), x: G.margen_x,
      y: d.kicker ? 1.95 : 1.6, w: G.ancho_util * 0.8, h: 0.5,
      objectName: `${n}_subtitulo`,
    });
    orden.push(`${n}_subtitulo`);
  }
  return orden;
}

// --------------------------------------------------------------- principal
async function construir(deck, destino) {
  const t = TEMAS.temas[deck.tema] || TEMAS.temas.cinema;
  const pres = new pptxgen();          // una instancia por archivo de salida
  pres.layout = TEMAS._lienzo.layout_pptxgenjs;  // SIEMPRE antes de addSlide
  pres.title = deck.titulo || "Presentación";
  pres.author = deck.autor || "";
  pres.subject = deck.subtitulo || "";

  const plan = [];   // lo que animar.py necesita saber
  for (let i = 0; i < deck.slides.length; i++) {
    const d = deck.slides[i];
    const slideReal = pres.addSlide();
    const registro = [];
    const s = espiar(slideReal, registro);
    s.background = { color: hex(t.fondo) };
    const ctx = { n: `s${i + 1}`, indice: i };
    const fn = ARQUETIPOS[d.arquetipo] || ARQUETIPOS.bullets;
    const orden = await fn(s, d, t, ctx);

    // Numeración discreta, fuera del área de contenido.
    if (!["portada", "divisor", "cierre"].includes(d.arquetipo)) {
      s.addText(String(i + 1), {
        ...estilo(t, "etiqueta", t.texto_suave), x: W - 0.85, y: H - 0.55,
        w: 0.5, h: 0.3, align: "right", objectName: `${ctx.n}_num`,
      });
    }
    if (!d.notas) {
      console.warn(`  aviso: la slide ${i + 1} no trae guion del expositor`);
    }
    s.addNotes(d.notas || "");   // el guion va aquí, nunca en un cuadro de texto

    plan.push({
      indice: i + 1,
      arquetipo: d.arquetipo,
      objetos: orden,
      transicion: d.transicion || (i === 0 ? "fade" : "morph"),
      animacion: d.animacion || {},
      dato: d.dato || null,
      grafico: d.grafico || null,
      items: d.items || null,   // animar_media.cjs los necesita para las donas
      notas: d.notas || "",
      shapes: registro,
    });
  }

  fs.mkdirSync(path.dirname(destino), { recursive: true });
  await pres.writeFile({ fileName: destino });

  const rutaPlan = destino.replace(/\.pptx$/, ".plan.json");
  // El plan lleva los shapes con sus imágenes en base64: pesa, pero es lo que
  // permite reconstruir el deck en HTML sin volver a generar nada.
  fs.writeFileSync(rutaPlan, JSON.stringify(
    { titulo: deck.titulo, subtitulo: deck.subtitulo, autor: deck.autor,
      tema: deck.tema, colores: t, lienzo: TEMAS._lienzo, slides: plan },
    null, 2));
  return { destino, rutaPlan, nSlides: deck.slides.length };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const entrada = args[0];
  const oi = args.indexOf("-o");
  const destino = oi >= 0 ? args[oi + 1] : "salida/deck.pptx";
  if (!entrada) {
    console.error("uso: node build_deck.cjs deck.json -o salida/deck.pptx");
    process.exit(1);
  }
  const deck = JSON.parse(fs.readFileSync(entrada, "utf8"));
  construir(deck, destino)
    .then((r) => {
      console.log(`  ${r.destino}  (${r.nSlides} slides)`);
      console.log(`  ${r.rutaPlan}  ← plan de animación`);
    })
    .catch((e) => {
      console.error("error:", e.stack || e.message);
      process.exit(1);
    });
}

module.exports = { construir, ARQUETIPOS, TEMAS };
