import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Isotipo, Logotipo } from './ui/Kit';
import { prefiereMenosMovimiento } from '../lib/motion';

const CLAVE_SESION = 'intro_vista';

/**
 * Entrada de marca antes del acceso.
 *
 * Dura poco más de un segundo y se puede saltar con un clic o una tecla. Se
 * muestra **una sola vez por sesión**: nadie quiere esperar la misma animación
 * cada vez que se equivoca de clave. Con "reducir movimiento" no se muestra.
 */
export const IntroSuperPet = ({ onFinish }: { onFinish: () => void }) => {
  useEffect(() => {
    const saltar = () => onFinish();
    const timer = setTimeout(saltar, 2300);
    window.addEventListener('keydown', saltar);
    window.addEventListener('pointerdown', saltar);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', saltar);
      window.removeEventListener('pointerdown', saltar);
    };
  }, [onFinish]);

  return (
    <div className="frame fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-surface">
      {/* Trazo rojo que barre la pantalla y deja el logo asentado. */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: [0, 1, 1, 0] }}
        transition={{ duration: 1.5, times: [0, 0.35, 0.7, 1], ease: [0.65, 0, 0.35, 1] }}
        style={{ transformOrigin: 'left center' }}
        className="absolute inset-x-0 top-1/2 h-24 -translate-y-1/2 bg-brand/10"
      />

      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14 }}
        className="relative"
      >
        <Isotipo className="h-28 w-28 shadow-xl" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-7"
      >
        <Logotipo className="h-9" />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.95, duration: 0.4 }}
        className="etiqueta mt-4 text-ink-subtle"
      >
        Simulador de caja
      </motion.p>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        onClick={onFinish}
        className="absolute bottom-8 text-xs font-semibold text-ink-subtle hover:text-brand"
      >
        Saltar
      </motion.button>
    </div>
  );
};

/**
 * ¿Toca mostrar la intro? Solo la primera vez de la sesión, y nunca si el
 * sistema pide reducir el movimiento.
 */
export function useIntro(): [boolean, () => void] {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (prefiereMenosMovimiento()) return false;
    return sessionStorage.getItem(CLAVE_SESION) !== 'si';
  });

  const terminar = () => {
    try {
      sessionStorage.setItem(CLAVE_SESION, 'si');
    } catch {
      /* modo privado: se muestra otra vez, no es grave */
    }
    setVisible(false);
  };

  return [visible, terminar];
}
