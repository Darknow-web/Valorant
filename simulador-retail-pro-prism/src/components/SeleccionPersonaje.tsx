import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button, Isotipo } from './ui/Kit';
import { cascada, elemento } from '../lib/motion';
import { Personaje } from '../lib/personajes';

/**
 * El colaborador elige con qué personaje se representa.
 *
 * Sale una sola vez, entre identificarse y el preámbulo del turno, y después se
 * puede volver aquí desde el menú tocando su avatar. No afecta ni al progreso ni
 * a las notas: es solo suyo, y sale en el ranking para que se reconozca.
 *
 * Nota de diseño: los avatares son el contenido, no un adorno. Por eso ocupan
 * todo el ancho que pueden —dos columnas en celular, cuatro en pantalla ancha—
 * en vez de ir en una fila de miniaturas: hay que verles la cara para elegir.
 */
export const SeleccionPersonaje = ({
  personajes,
  elegido,
  nombre,
  onElegir,
  onCancelar,
}: {
  personajes: Personaje[];
  elegido: string;
  nombre: string;
  onElegir: (id: string) => void;
  /** Solo cuando se llega desde el menú a cambiarlo: la primera vez no hay vuelta atrás. */
  onCancelar?: () => void;
}) => {
  const [seleccion, setSeleccion] = useState(elegido);
  const primerNombre = nombre.trim().split(/\s+/)[0] || 'colaborador';

  return (
    <div className="frame min-h-[100dvh] bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <motion.div variants={cascada(0.1, 0.08)} initial="inicial" animate="visible">
          <motion.div variants={elemento} className="mb-6 flex items-center gap-3">
            <Isotipo className="h-9 w-9" />
            <span className="etiqueta text-brand">SuperPet · Capacitación de caja</span>
          </motion.div>

          <motion.h1
            variants={elemento}
            className="text-balance text-[1.75rem] font-extrabold leading-tight text-ink sm:text-4xl"
          >
            {onCancelar ? 'Cambia tu personaje' : `Elige tu personaje, ${primerNombre}.`}
          </motion.h1>
          <motion.p variants={elemento} className="prosa mt-2 text-sm text-ink-muted sm:text-base">
            Es con quien te van a ver los demás en la tabla de los mejores turnos. Puedes cambiarlo
            cuando quieras desde tu menú.
          </motion.p>

          <motion.div
            variants={elemento}
            className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
          >
            {personajes.map((personaje) => {
              const activo = seleccion === personaje.id;
              return (
                <button
                  key={personaje.id}
                  type="button"
                  aria-pressed={activo}
                  aria-label={`Personaje ${personaje.id}`}
                  data-personaje={personaje.id}
                  onClick={() => setSeleccion(personaje.id)}
                  className={`group relative aspect-square rounded-full border-4 bg-raised p-1.5 transition ${
                    activo
                      ? 'border-brand shadow-[0_10px_30px_rgba(0,0,0,0.12)]'
                      : 'border-transparent hover:border-line-strong'
                  }`}
                >
                  <img src={personaje.url} alt="" aria-hidden className="h-full w-full rounded-full object-contain" />
                  {activo && (
                    <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white shadow-md">
                      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 10.5l4 4 8-8" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>

          <motion.div variants={elemento} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button disabled={!seleccion} onClick={() => onElegir(seleccion)} className="w-full sm:w-auto">
              {onCancelar ? 'Guardar mi personaje' : 'Continuar'}
            </Button>
            {onCancelar && (
              <button
                onClick={onCancelar}
                className="inline-flex min-h-11 items-center justify-center text-sm font-semibold text-ink-muted hover:text-ink hover:underline"
              >
                Dejarlo como está
              </button>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
