import type { Transition, Variants } from 'motion/react';

/**
 * Transiciones compartidas del marco de entrenamiento.
 *
 * El movimiento acompaña, no entretiene: entra con el contenido, marca de dónde
 * viene cada cosa y se quita de en medio. Quien active "reducir movimiento" en
 * su sistema no ve nada de esto (lo neutraliza `src/index.css`, y aquí se
 * comprueba para las animaciones que se disparan por código).
 */

export const prefiereMenosMovimiento = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Salida suave, sin rebote: la usan las entradas de contenido. */
export const suave: Transition = { duration: 0.4, ease: [0.22, 1, 0.36, 1] };

/** Con algo de resorte, para lo que responde a un clic. */
export const resorte: Transition = { type: 'spring', stiffness: 380, damping: 30 };

/** Entrada de una vista completa. */
export const vista: Variants = {
  inicial: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: suave },
  salida: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

/** Contenedor que hace entrar a sus hijos en cascada. */
export const cascada = (retardoHijo = 0.05, retardoInicial = 0.04): Variants => ({
  inicial: {},
  visible: {
    transition: { staggerChildren: retardoHijo, delayChildren: retardoInicial },
  },
});

/** Cada elemento de una cascada. */
export const elemento: Variants = {
  inicial: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: suave },
};

/** Tarjeta que se levanta al pasar el cursor. */
export const tarjetaInteractiva = {
  whileHover: { y: -3, transition: resorte },
  whileTap: { scale: 0.985, transition: resorte },
};

/** Aviso que entra desde el borde derecho. */
export const aviso: Variants = {
  inicial: { opacity: 0, x: 32, scale: 0.97 },
  visible: { opacity: 1, x: 0, scale: 1, transition: resorte },
  salida: { opacity: 0, x: 32, scale: 0.97, transition: { duration: 0.18 } },
};

/** Panel lateral de la situación. */
export const panelLateral: Variants = {
  inicial: { x: '100%' },
  visible: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 34 } },
  salida: { x: '100%', transition: { duration: 0.22 } },
};

/** Modal centrado. */
export const modal: Variants = {
  inicial: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: resorte },
  salida: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.15 } },
};

/** El isotipo de SuperPet respirando en la bienvenida. */
export const isotipo = {
  inicial: { scale: 0.85, opacity: 0, rotate: -6 },
  animate: { scale: 1, opacity: 1, rotate: 0 },
  transition: { type: 'spring' as const, stiffness: 220, damping: 18, delay: 0.1 },
};
