import { prefiereMenosMovimiento } from './motion';

/**
 * Confeti dibujado a mano sobre un canvas, en los colores de SuperPet.
 *
 * Se hace aquí en vez de traer una librería: son cuarenta líneas, pesa cero y
 * así los colores salen de la marca y no de una paleta ajena.
 */
const COLORES = ['#e21600', '#f4d0a8', '#060643', '#ffffff', '#00c8e8', '#ffc300'];

interface Papelito {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  ancho: number;
  alto: number;
  color: string;
}

/**
 * Lanza el confeti sobre toda la ventana durante unos segundos.
 * Devuelve una función para cortarlo antes de tiempo.
 */
export function lanzarConfeti({ duracion = 2600, cantidad = 130 } = {}): () => void {
  if (typeof window === 'undefined' || prefiereMenosMovimiento()) return () => {};

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '10000',
  } as CSSStyleDeclaration);
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return () => {};
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const ancho = window.innerWidth;
  const alto = window.innerHeight;
  canvas.width = ancho * dpr;
  canvas.height = alto * dpr;
  ctx.scale(dpr, dpr);

  // Salen desde las dos esquinas superiores, como dos cañones.
  const papelitos: Papelito[] = Array.from({ length: cantidad }, (_, i) => {
    const desdeIzquierda = i % 2 === 0;
    return {
      x: desdeIzquierda ? ancho * 0.08 : ancho * 0.92,
      y: alto * 0.12,
      vx: (desdeIzquierda ? 1 : -1) * (2 + Math.random() * 5),
      vy: -3 - Math.random() * 6,
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.3,
      ancho: 6 + Math.random() * 6,
      alto: 9 + Math.random() * 7,
      color: COLORES[Math.floor(Math.random() * COLORES.length)],
    };
  });

  const inicio = performance.now();
  let frame = 0;
  let vivo = true;

  const dibujar = (ahora: number) => {
    if (!vivo) return;
    const transcurrido = ahora - inicio;
    const desvanecer = Math.max(0, 1 - Math.max(0, transcurrido - duracion * 0.65) / (duracion * 0.35));

    ctx.clearRect(0, 0, ancho, alto);
    ctx.globalAlpha = desvanecer;

    for (const p of papelitos) {
      p.vy += 0.16; // gravedad
      p.vx *= 0.994; // rozamiento del aire
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.ancho / 2, -p.alto / 2, p.ancho, p.alto);
      ctx.restore();
    }

    if (transcurrido < duracion) {
      frame = requestAnimationFrame(dibujar);
    } else {
      detener();
    }
  };

  const detener = () => {
    vivo = false;
    cancelAnimationFrame(frame);
    canvas.remove();
  };

  frame = requestAnimationFrame(dibujar);
  return detener;
}
