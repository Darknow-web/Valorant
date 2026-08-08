/**
 * Iconos de SuperPet.
 *
 * Hay tres grupos, cada uno en su carpeta:
 *
 *   portadas/ → uno por módulo, y cada uno cuenta de qué va el suyo (la moto de
 *               Rappi, el banco, el reloj del fin de turno). Son los que se ven
 *               en las tarjetas del menú. El archivo se llama por el NÚMERO DEL
 *               MÓDULO: 1.webp es el del Módulo 1.
 *   modulos/  → los de felicitación. Salen al aprobar un módulo, y el del gato
 *               con el perro se reserva para la celebración final.
 *   errores/  → los de ánimo. Salen al azar cada vez que se equivoca en un paso.
 *
 * CÓMO CAMBIAR UNO: suelta la imagen encima con el mismo número. No hace falta
 * tocar código; el aplicativo las recoge solas al compilar y las asocia por el
 * número del nombre del archivo. Admite .webp, .png, .jpg, .jpeg y .svg.
 *
 * Los originales venían en PNG de 2000×2000 (55 MB entre los 32). Aquí están
 * convertidos a WebP al tamaño en que realmente se ven: pesan menos de 800 KB
 * en total, que es lo que hace la diferencia entre abrir rápido en el celular
 * de la tienda o no abrir.
 */

type Mapa = Record<string, string>;

const portadasRaw = import.meta.glob('./portadas/*.{webp,png,jpg,jpeg,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Mapa;

const celebracionesRaw = import.meta.glob('./modulos/*.{webp,png,jpg,jpeg,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Mapa;

const erroresRaw = import.meta.glob('./errores/*.{webp,png,jpg,jpeg,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Mapa;

/**
 * Ilustraciones del relato: la apertura y el cierre del turno.
 *
 * Se buscan por NOMBRE, no por número, y son opcionales: mientras no existan,
 * el preámbulo y el cierre usan la portada del primer y del último módulo. Para
 * ponerlas basta con soltar `apertura.webp` y `cierre.webp` en esta carpeta.
 */
const historiaRaw = import.meta.glob('./historia/*.{webp,png,jpg,jpeg,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Mapa;

/** Número que lleva el nombre del archivo, para ordenarlos siempre igual. */
function numeroDe(ruta: string): number {
  return Number(ruta.replace(/^.*\//, '').match(/\d+/)?.[0] ?? 0);
}

function ordenados(mapa: Mapa): { numero: number; url: string }[] {
  return Object.entries(mapa)
    .map(([ruta, url]) => ({ numero: numeroDe(ruta), url }))
    .filter((x) => x.numero > 0)
    .sort((a, b) => a.numero - b.numero);
}

const portadas = ordenados(portadasRaw);
const celebraciones = ordenados(celebracionesRaw);
const errores = ordenados(erroresRaw);

/**
 * El icono de la celebración final: el que tiene al gato y al perro juntos.
 * Se reserva ese y los demás se reparten entre los módulos en orden.
 */
export const NUMERO_FINAL = 8;

const iconoFinal = celebraciones.find((c) => c.numero === NUMERO_FINAL)?.url || '';
const deModulos = celebraciones.filter((c) => c.numero !== NUMERO_FINAL);

/**
 * Icono de la tarjeta del módulo ('m1'…'m14').
 *
 * Manda la portada, que es la que identifica al módulo. Si esa carpeta está
 * vacía se recurre a los de felicitación, para que el menú nunca se quede sin
 * imagen mientras llegan las portadas definitivas.
 */
export function iconoDeModulo(moduleId: string): string {
  const numero = Number(moduleId.replace(/^m/, ''));
  if (!Number.isFinite(numero) || numero < 1) return '';

  const portada = portadas.find((p) => p.numero === numero);
  if (portada) return portada.url;

  return deModulos[numero - 1]?.url || '';
}

/** Icono de la celebración final (gato y perro juntos). */
export function iconoFinalCelebracion(): string {
  return iconoFinal;
}

/**
 * Icono para cuando NO alcanzó la nota. Es uno de los de ánimo que ya existen,
 * elegido a propósito y siempre el mismo: en un momento así, una imagen
 * distinta cada vez se lee como burla.
 */
export const NUMERO_ANIMO_FINAL = 22;

export function iconoFinalAnimo(): string {
  return errores.find((e) => e.numero === NUMERO_ANIMO_FINAL)?.url || errores[0]?.url || '';
}

/**
 * Ilustración del relato por nombre ('apertura' | 'cierre').
 *
 * Devuelve cadena vacía si todavía no se ha soltado el archivo; quien la usa
 * se apaña con la portada de un módulo mientras tanto.
 */
export function ilustracionHistoria(nombre: 'apertura' | 'cierre'): string {
  const encontrada = Object.entries(historiaRaw).find(([ruta]) =>
    ruta.replace(/^.*\//, '').toLowerCase().startsWith(nombre)
  );
  return encontrada?.[1] || '';
}

/**
 * Orden barajado que no repite hasta haberlos mostrado todos.
 *
 * La función recibe el número de la ocasión (el contador de errores, por
 * ejemplo) y siempre devuelve lo mismo para ese número. Eso importa: React
 * puede renderizar dos veces el mismo estado, y con una baraja que se consume
 * en cada llamada se saltaban iconos y acababan repitiéndose.
 */
function crearOrden(items: string[]) {
  let orden = [...items];
  let vuelta = -1;

  const barajar = () => {
    const ultimo = orden[orden.length - 1];
    orden = [...items];
    for (let i = orden.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [orden[i], orden[j]] = [orden[j], orden[i]];
    }
    // Que el primero de la vuelta nueva no sea el último de la anterior.
    if (orden.length > 1 && orden[0] === ultimo) [orden[0], orden[1]] = [orden[1], orden[0]];
  };

  return (ocasion: number): string => {
    if (!items.length) return '';
    const n = Math.max(0, Math.floor(ocasion));
    const vueltaActual = Math.floor(n / items.length);
    if (vueltaActual !== vuelta) {
      vuelta = vueltaActual;
      barajar();
    }
    return orden[n % items.length];
  };
}

const errorPara = crearOrden(errores.map((e) => e.url));
const celebracionPara = crearOrden(celebraciones.map((c) => c.url));

/**
 * Un icono de ánimo distinto en cada error. `ocasion` es el número de error:
 * el mismo número devuelve siempre el mismo icono.
 */
export function iconoDeError(ocasion: number): string {
  return errorPara(ocasion);
}

/** Un icono de felicitación, para cuando aprueba un módulo. */
export function iconoDeCelebracion(ocasion: number): string {
  return celebracionPara(ocasion);
}

export const hayIconos = celebraciones.length > 0 || errores.length > 0;
