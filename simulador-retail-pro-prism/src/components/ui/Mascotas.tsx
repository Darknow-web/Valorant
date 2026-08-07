import React from 'react';
import { cn } from './Interactive';

/**
 * Mascotas ilustradas en los colores de SuperPet.
 *
 * Son dibujos propios en SVG en vez de fotos: pesan casi nada, combinan con el
 * resto de la interfaz y no dependen de imágenes de terceros. Se usan en la
 * celebración de cada módulo y en el ánimo cuando toca repetir.
 */

const ARENA = '#f4d0a8';
const ROJO = '#e21600';
const AZUL = '#060643';

/** Perrito contento, para la celebración. */
export const PerroFeliz = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={cn('h-24 w-24', className)} role="img" aria-label="Perrito celebrando">
    {/* orejas caídas, por fuera de la cabeza para que se lean como de perro */}
    <ellipse cx="24" cy="62" rx="11" ry="24" fill={ROJO} transform="rotate(-18 24 62)" />
    <ellipse cx="96" cy="62" rx="11" ry="24" fill={ROJO} transform="rotate(18 96 62)" />
    {/* cabeza */}
    <circle cx="60" cy="58" r="32" fill={ARENA} />
    {/* hocico */}
    <ellipse cx="60" cy="70" rx="18" ry="13" fill="#fff6ef" />
    <ellipse cx="60" cy="63" rx="6" ry="4.5" fill={AZUL} />
    {/* ojos cerrados de alegría */}
    <path d="M44 50c3-4 8-4 11 0" stroke={AZUL} strokeWidth="3.4" fill="none" strokeLinecap="round" />
    <path d="M65 50c3-4 8-4 11 0" stroke={AZUL} strokeWidth="3.4" fill="none" strokeLinecap="round" />
    {/* lengua */}
    <path d="M56 73q4 10 8 0" fill={ROJO} />
    {/* boca */}
    <path d="M52 68q8 8 16 0" stroke={AZUL} strokeWidth="2.6" fill="none" strokeLinecap="round" />
  </svg>
);

/** Gatito atento, para el mensaje de ánimo. */
export const GatoAnimando = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={cn('h-24 w-24', className)} role="img" aria-label="Gatito animando">
    {/* orejas */}
    <path d="M32 44 34 18 56 34Z" fill={AZUL} />
    <path d="M88 44 86 18 64 34Z" fill={AZUL} />
    <path d="M38 40 39 26 51 35Z" fill={ROJO} opacity="0.5" />
    <path d="M82 40 81 26 69 35Z" fill={ROJO} opacity="0.5" />
    {/* cabeza */}
    <circle cx="60" cy="62" r="32" fill={AZUL} />
    {/* ojos abiertos, mirando de frente */}
    <ellipse cx="48" cy="58" rx="6" ry="7.5" fill="#fff6ef" />
    <ellipse cx="72" cy="58" rx="6" ry="7.5" fill="#fff6ef" />
    <circle cx="49" cy="59" r="3.2" fill={AZUL} />
    <circle cx="73" cy="59" r="3.2" fill={AZUL} />
    {/* nariz y boca */}
    <path d="M56 72h8l-4 4Z" fill={ROJO} />
    <path d="M60 76q-5 5-9 1M60 76q5 5 9 1" stroke="#fff6ef" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    {/* bigotes */}
    <path d="M30 68h14M30 76h14M76 68h14M76 76h14" stroke={ARENA} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

/** Huella, para adornar sin robar protagonismo. */
export const Huella = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={cn('h-5 w-5', className)} aria-hidden fill="currentColor">
    <ellipse cx="12" cy="12" rx="4.5" ry="6" />
    <ellipse cx="24" cy="9" rx="4.5" ry="6" />
    <ellipse cx="34" cy="16" rx="4" ry="5.5" />
    <path d="M20 20c6 0 11 5 11 10 0 4-4 6-11 6S9 34 9 30c0-5 5-10 11-10Z" />
  </svg>
);
