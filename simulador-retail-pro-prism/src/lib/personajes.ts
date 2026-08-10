/**
 * Los personajes que el colaborador puede elegir como avatar.
 *
 * Vienen de dos sitios y aquí se juntan en una sola lista:
 *
 *   - Los de fábrica, que van compilados con la aplicación
 *     (`src/assets/iconos/personajes/`). Siempre están, aunque no haya red ni
 *     Firebase configurado.
 *   - Los que sube el administrador desde su panel, que viajan con la
 *     configuración y llegan por `/api/step-data`, la misma llamada que ya trae
 *     el catálogo de productos.
 *
 * Lo que se guarda del colaborador es el **identificador**, nunca la imagen: si
 * mañana se cambia el dibujo de un personaje, quien lo tenía elegido sigue
 * teniéndolo. Y si un personaje subido se borra, quien lo tuviera se queda sin
 * avatar en vez de con una imagen rota — de eso se encarga `urlDePersonaje`.
 */
import { PERSONAJES_BASE } from '../assets/iconos';

export interface Personaje {
  id: string;
  /** La imagen: una URL del build para los de fábrica, un `data:` para los subidos. */
  url: string;
  /** Solo los subidos por el administrador se pueden quitar. */
  esBase: boolean;
}

/** Cuántos puede haber en total. Un documento de Firestore no pasa de 1 MB. */
export const MAXIMO_PERSONAJES_SUBIDOS = 24;

/** Lado del avatar ya convertido. Se ve a ~112 px; 512 cubre pantallas retina. */
export const LADO_PERSONAJE = 512;

/** Lo que puede pesar un avatar convertido, antes de darlo por imposible. */
export const MAXIMO_BYTES_PERSONAJE = 80 * 1024;

/** Los de fábrica, en el orden en que están numerados. */
export const personajesBase = (): Personaje[] =>
  PERSONAJES_BASE.map((p) => ({ id: p.id, url: p.url, esBase: true }));

/**
 * La lista completa: primero los de fábrica y después los subidos, en el orden
 * en que se subieron. El orden importa porque es el de la rejilla de elección, y
 * un orden que baila desorienta a quien vuelve a cambiar su personaje.
 */
export function todosLosPersonajes(subidos: { id: string; url: string }[] | undefined): Personaje[] {
  const extra = (subidos || [])
    .filter((p) => p && typeof p.id === 'string' && typeof p.url === 'string' && p.url)
    .map((p) => ({ id: p.id, url: p.url, esBase: false }));
  return [...personajesBase(), ...extra];
}

/** La imagen de un personaje, o cadena vacía si ese identificador ya no existe. */
export function urlDePersonaje(
  id: string | undefined,
  subidos?: { id: string; url: string }[]
): string {
  if (!id) return '';
  return todosLosPersonajes(subidos).find((p) => p.id === id)?.url || '';
}

/**
 * Convierte cualquier imagen al formato del avatar: cuadrada, de
 * `LADO_PERSONAJE` de lado y recortada en círculo.
 *
 * Lo hace el navegador con un `canvas`, sin librerías ni proceso en el servidor.
 * Se recorta por el centro al cuadrado más grande que quepa —así una foto
 * apaisada no sale deformada— y se baja la calidad por pasos hasta que el
 * resultado quepa en `MAXIMO_BYTES_PERSONAJE`.
 */
export async function convertirAPersonaje(archivo: File): Promise<string> {
  const imagen = await cargarImagen(archivo);

  const lienzo = document.createElement('canvas');
  lienzo.width = LADO_PERSONAJE;
  lienzo.height = LADO_PERSONAJE;
  const pincel = lienzo.getContext('2d');
  if (!pincel) throw new Error('El navegador no pudo preparar la imagen.');

  // El recorte cuadrado del centro del original.
  const lado = Math.min(imagen.width, imagen.height);
  const x = (imagen.width - lado) / 2;
  const y = (imagen.height - lado) / 2;

  pincel.save();
  pincel.beginPath();
  pincel.arc(LADO_PERSONAJE / 2, LADO_PERSONAJE / 2, LADO_PERSONAJE / 2, 0, Math.PI * 2);
  pincel.clip();
  pincel.drawImage(imagen, x, y, lado, lado, 0, 0, LADO_PERSONAJE, LADO_PERSONAJE);
  pincel.restore();

  for (const calidad of [0.88, 0.78, 0.68, 0.55]) {
    const dataUrl = lienzo.toDataURL('image/webp', calidad);
    // Un `data:` URL en base64 ocupa cuatro caracteres por cada tres bytes.
    if ((dataUrl.length * 3) / 4 <= MAXIMO_BYTES_PERSONAJE) return dataUrl;
  }
  throw new Error('La imagen es demasiado pesada incluso reducida. Prueba con un dibujo más simple.');
}

function cargarImagen(archivo: File): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const imagen = new Image();
    imagen.onload = () => {
      URL.revokeObjectURL(url);
      resolver(imagen);
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar(new Error('Ese archivo no es una imagen que se pueda leer.'));
    };
    imagen.src = url;
  });
}
