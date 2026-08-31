#!/usr/bin/env node
/**
 * deck.plan.json → operaciones de `mcp__Canva__edit-design`
 *
 *   node plan_a_canva.cjs deck.plan.json -o salida/canva
 *
 * Escribe un archivo por página con las operaciones listas para pegar en la
 * herramienta. El agente ejecuta las llamadas MCP; este script solo hace la
 * traducción geométrica, que es la parte que conviene tener determinista.
 *
 * Con esto el deck se construye DENTRO de la cuenta de Canva, sin que el
 * documento del usuario pase por ninguna URL pública.
 *
 * Conversión verificada contra un diseño real:
 *   posición y tamaño:  px = pulgadas × 144   (1920 px / 13.333 in)
 *   tipografía:         px = puntos × 2       (144 dpi / 72 pt por pulgada)
 */
const fs = require("fs");
const path = require("path");
const { iconoAPath, rectAPath, circuloAPath } = require("./svg_a_path.cjs");

const PX = 144;            // pulgadas → píxeles de Canva
const PT = 2;              // puntos → píxeles de Canva
const ANCHO = 1920;
const ALTO = 1080;

const px = (n) => Math.round((n || 0) * PX * 100) / 100;
const hex = (c) => (c ? "#" + String(c).replace("#", "").toLowerCase() : undefined);

/** Un rectángulo (con o sin esquinas redondeadas) del tamaño pedido. */
function opForma(o, extra = {}) {
  const w = px(o.w), h = px(o.h);
  return {
    type: "insert_shape",
    page_id: "__PAGE__",
    top: px(o.y), left: px(o.x), width: w, height: h,
    path: `M0 0H${w}V${h}H0Z`,
    view_box_width: w, view_box_height: h,
    ...extra,
  };
}

/** Traduce un shape registrado por build_deck.cjs a una operación de Canva. */
function traducir(sh, tema) {
  const o = sh.opciones || {};
  const nombre = o.objectName || "";

  if (sh.tipo === "addText") {
    const texto = typeof sh.arg0 === "string"
      ? sh.arg0
      : Array.isArray(sh.arg0)
        ? sh.arg0.map((r) => r.text || "").join("")
        : String(sh.arg0 ?? "");
    if (!texto.trim()) return null;
    return {
      insertar: {
        type: "add_text",
        page_id: "__PAGE__",
        top: px(o.y), left: px(o.x), width: px(o.w),
        text: texto,
      },
      // add_text no acepta formato: hay que aplicarlo en una segunda pasada,
      // con el locator_id que devuelve la inserción. Sin esto el texto sale
      // negro de 16 px, invisible sobre un fondo oscuro.
      formato: {
        type: "format_text",
        locator_id: "__LOCATOR__",
        formatting: {
          font_size: Math.max(1, Math.round((o.fontSize || 18) * PT)),
          font_weight: o.bold ? "bold" : "normal",
          font_style: o.italic ? "italic" : "normal",
          color: hex(o.color) || "#000000",
          text_align: o.align === "center" ? "center"
                    : o.align === "right" ? "end" : "start",
          line_height: Math.min(2.5, Math.max(0.5,
            o.lineSpacing ? o.lineSpacing / (o.fontSize || 18) : 1.25)),
        },
      },
      nombre,
    };
  }

  if (sh.tipo === "addShape") {
    const forma = sh.arg0;
    const relleno = (o.fill || {}).color;
    const transp = (o.fill || {}).transparency || 0;
    const w = px(o.w), h = px(o.h);

    if (forma === "line") {
      const grosor = Math.max(1, (o.line || {}).width || 2);
      return { insertar: {
        type: "insert_shape", page_id: "__PAGE__",
        top: px(o.y), left: px(o.x),
        width: Math.max(w, 1), height: Math.max(h, grosor),
        path: `M0 0H${Math.max(w, 1)}V${grosor}H0Z`,
        view_box_width: Math.max(w, 1), view_box_height: grosor,
        color: hex((o.line || {}).color) || "#888888",
      }, nombre };
    }

    if (forma === "ellipse") {
      const r = Math.min(w, h) / 2;
      return { insertar: {
        type: "insert_shape", page_id: "__PAGE__",
        top: px(o.y), left: px(o.x), width: w, height: h,
        path: circuloAPath(w / 2, h / 2, r),
        view_box_width: w, view_box_height: h,
        ...(relleno ? { color: hex(relleno) } : {}),
        ...(transp ? { opacity: +(1 - transp / 100).toFixed(2) } : {}),
      }, nombre };
    }

    if (forma === "rightArrow") {
      // Una flecha sencilla dibujada a mano: cuerpo más punta.
      const m = h * 0.3;
      return { insertar: {
        type: "insert_shape", page_id: "__PAGE__",
        top: px(o.y), left: px(o.x), width: w, height: h,
        path: `M0 ${m}H${w * 0.6}V0L${w} ${h / 2}L${w * 0.6} ${h}V${h - m}H0Z`,
        view_box_width: w, view_box_height: h,
        ...(relleno ? { color: hex(relleno) } : {}),
      }, nombre };
    }

    const extra = {};
    if (relleno) extra.color = hex(relleno);
    if (transp) extra.opacity = +(1 - transp / 100).toFixed(2);
    if (o.rectRadius) extra.corner_rounding = Math.min(1000, px(o.rectRadius));
    if (o.line) {
      extra.stroke_color = hex(o.line.color) || "#000000";
      extra.stroke_weight = Math.min(100, o.line.width || 1);
    }
    return { insertar: opForma(o, extra), nombre };
  }

  if (sh.tipo === "addImage") {
    // Los iconos entran como forma vectorial, no como imagen: quedan nítidos a
    // cualquier tamaño y se pueden recolorear en Canva.
    const icono = o.__icono ? iconoAPath(o.__icono) : null;
    if (icono) {
      const trazo = icono.modo === "trazo";
      return { insertar: {
        type: "insert_shape", page_id: "__PAGE__",
        top: px(o.y), left: px(o.x), width: px(o.w), height: px(o.h),
        path: icono.d,
        view_box_width: icono.viewBox.ancho,
        view_box_height: icono.viewBox.alto,
        ...(trazo
          ? { stroke_color: hex(o.__color) || "#000000", stroke_weight: 1.9 }
          : { color: hex(o.__color) || "#000000" }),
        ...(o.transparency ? { opacity: +(1 - o.transparency / 100).toFixed(2) } : {}),
      }, nombre };
    }
    // Sin id de icono (un fondo generado, una foto del documento) no hay forma
    // de insertarlo sin subirlo antes como asset: se omite y se avisa.
    return { omitido: `imagen sin icono asociado (${nombre})`, nombre };
  }

  if (sh.tipo === "addChart") {
    return { grafico: sh, nombre };
  }

  if (sh.tipo === "addTable") {
    return { tabla: sh, nombre };
  }

  return null;
}

/** Un gráfico dibujado con formas: editable en Canva, sin datos vinculados. */
function graficoAFormas(sh, tema) {
  const o = sh.opciones || {};
  const series = sh.datos || [];
  const cats = (series[0] && series[0].labels) || [];
  const todos = series.flatMap((s) => s.values || []);
  const bruto = Math.max(...todos, 1);
  const magnitud = Math.pow(10, Math.floor(Math.log10(bruto)));
  const max = Math.ceil((bruto * 1.08) / (magnitud / 2)) * (magnitud / 2);
  const colores = (o.chartColors || tema.serie || ["888888"]).map(hex);

  const x0 = px(o.x), y0 = px(o.y), w = px(o.w), h = px(o.h);
  const padL = 70, padB = 50, padT = 20;
  const iw = w - padL - 20, ih = h - padT - padB;
  const ops = [];

  // Rejilla
  for (let i = 0; i <= 4; i++) {
    const y = y0 + padT + (ih * i) / 4;
    ops.push({
      type: "insert_shape", page_id: "__PAGE__",
      top: y, left: x0 + padL, width: iw, height: 1,
      path: `M0 0H${iw}V1H0Z`, view_box_width: iw, view_box_height: 1,
      color: hex((o.valGridLine || {}).color) || "#888888", opacity: 0.35,
    });
  }

  const tipo = sh.arg0;
  if (tipo === "line" || tipo === "area") {
    const n = Math.max(cats.length - 1, 1);
    for (const [si, s] of series.entries()) {
      const pts = (s.values || []).map((v, i) => [
        padL + (iw * i) / n,
        padT + ih - (v / max) * ih,
      ]);
      const d = pts.map((p, i) => (i ? "L" : "M") +
        p[0].toFixed(1) + " " + p[1].toFixed(1)).join("");
      ops.push({
        type: "insert_shape", page_id: "__PAGE__",
        top: y0, left: x0, width: w, height: h,
        path: d, view_box_width: w, view_box_height: h,
        stroke_color: colores[si % colores.length], stroke_weight: 4,
      });
      // Los puntos, uno a uno, para que se puedan mover en Canva.
      for (const p of pts) {
        ops.push({
          type: "insert_shape", page_id: "__PAGE__",
          top: y0 + p[1] - 7, left: x0 + p[0] - 7, width: 14, height: 14,
          path: circuloAPath(7, 7, 7), view_box_width: 14, view_box_height: 14,
          color: colores[si % colores.length],
        });
      }
    }
  } else {
    const nSer = series.length || 1;
    const grupo = iw / Math.max(cats.length, 1);
    const ancho = (grupo * 0.62) / nSer;
    for (const [si, s] of series.entries()) {
      (s.values || []).forEach((v, i) => {
        const alto = Math.max(2, (v / max) * ih);
        ops.push({
          type: "insert_shape", page_id: "__PAGE__",
          top: y0 + padT + ih - alto,
          left: x0 + padL + grupo * i + grupo * 0.19 + ancho * si,
          width: ancho, height: alto,
          path: `M0 0H${ancho.toFixed(1)}V${alto.toFixed(1)}H0Z`,
          view_box_width: ancho, view_box_height: alto,
          color: colores[si % colores.length], corner_rounding: 6,
        });
      });
    }
  }

  // Etiquetas de categoría y de eje, como texto real.
  const textos = [];
  cats.forEach((c, i) => {
    const enLinea = tipo === "line" || tipo === "area";
    const cx = enLinea
      ? padL + (iw * i) / Math.max(cats.length - 1, 1)
      : padL + (iw * (i + 0.5)) / Math.max(cats.length, 1);
    textos.push({
      insertar: {
        type: "add_text", page_id: "__PAGE__",
        top: y0 + h - 40, left: x0 + cx - 60, width: 120, text: String(c),
      },
      formato: {
        type: "format_text", locator_id: "__LOCATOR__",
        formatting: { font_size: 24, color: hex(o.catAxisLabelColor) || "#888888",
                      text_align: "center" },
      },
    });
  });
  return { formas: ops, textos };
}

/** Una tabla dibujada: filas como rectángulos y celdas como texto. */
function tablaAFormas(sh, tema) {
  const o = sh.opciones || {};
  const filas = sh.datos || [];
  const x0 = px(o.x), y0 = px(o.y), w = px(o.w);
  const altoFila = px(o.rowH || 0.5);
  const nCols = (filas[0] || []).length || 1;
  const anchoCol = w / nCols;
  const formas = [], textos = [];

  filas.forEach((fila, r) => {
    fila.forEach((celda, c) => {
      const co = (celda && celda.options) || {};
      const relleno = (co.fill || {}).color;
      if (relleno) {
        formas.push({
          type: "insert_shape", page_id: "__PAGE__",
          top: y0 + r * altoFila, left: x0 + c * anchoCol,
          width: anchoCol, height: altoFila,
          path: `M0 0H${anchoCol.toFixed(1)}V${altoFila.toFixed(1)}H0Z`,
          view_box_width: anchoCol, view_box_height: altoFila,
          color: hex(relleno),
        });
      }
      textos.push({
        insertar: {
          type: "add_text", page_id: "__PAGE__",
          top: y0 + r * altoFila + altoFila * 0.28,
          left: x0 + c * anchoCol + 20,
          width: anchoCol - 40,
          text: String((celda && celda.text) ?? ""),
        },
        formato: {
          type: "format_text", locator_id: "__LOCATOR__",
          formatting: {
            font_size: Math.round((co.fontSize || 15) * PT),
            font_weight: co.bold ? "bold" : "normal",
            color: hex(co.color) || "#000000",
          },
        },
      });
    });
  });
  return { formas, textos };
}

function paginaAOperaciones(slide, tema) {
  const inserciones = [], formatos = [], avisos = [];

  for (const sh of slide.shapes) {
    if (sh.tipo === "background") continue;
    const t = traducir(sh, tema);
    if (!t) continue;
    if (t.omitido) { avisos.push(t.omitido); continue; }

    if (t.grafico) {
      const g = graficoAFormas(t.grafico, tema);
      inserciones.push(...g.formas);
      for (const x of g.textos) { inserciones.push(x.insertar); formatos.push(x.formato); }
      continue;
    }
    if (t.tabla) {
      const tb = tablaAFormas(t.tabla, tema);
      inserciones.push(...tb.formas);
      for (const x of tb.textos) { inserciones.push(x.insertar); formatos.push(x.formato); }
      continue;
    }
    inserciones.push(t.insertar);
    if (t.formato) formatos.push(t.formato);
  }

  const fondo = (slide.shapes.find((s) => s.tipo === "background") || {}).opciones;
  return {
    indice: slide.indice,
    arquetipo: slide.arquetipo,
    fondo: hex((fondo && fondo.color) || tema.fondo),
    notas: slide.notas || "",
    // add_page crea la página; el resto se inserta encima.
    pagina: {
      type: "add_page", width: ANCHO, height: ALTO,
      background_color: hex((fondo && fondo.color) || tema.fondo),
      title: `Slide ${slide.indice}`,
    },
    inserciones,
    formatos,
    avisos,
  };
}

function generar(plan) {
  const tema = plan.colores;
  return {
    titulo: plan.titulo || "Presentación",
    lienzo: { ancho: ANCHO, alto: ALTO },
    paginas: plan.slides.map((s) => paginaAOperaciones(s, tema)),
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const entrada = args[0];
  const oi = args.indexOf("-o");
  const dir = oi >= 0 ? args[oi + 1] : "canva";
  if (!entrada) {
    console.error("uso: node plan_a_canva.cjs deck.plan.json -o salida/canva");
    process.exit(1);
  }
  const plan = JSON.parse(fs.readFileSync(entrada, "utf8"));
  const r = generar(plan);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "operaciones.json"), JSON.stringify(r, null, 2));

  let ins = 0, fmt = 0, avisos = 0;
  for (const p of r.paginas) {
    ins += p.inserciones.length; fmt += p.formatos.length; avisos += p.avisos.length;
    fs.writeFileSync(path.join(dir, `pagina-${String(p.indice).padStart(2, "0")}.json`),
      JSON.stringify(p, null, 2));
  }
  console.log(`  ${r.paginas.length} páginas · ${ins} inserciones · ${fmt} formatos`);
  if (avisos) console.log(`  ${avisos} elementos omitidos (ver avisos en cada página)`);
  console.log(`  operaciones en ${dir}/`);
}

module.exports = { generar, paginaAOperaciones, traducir };
