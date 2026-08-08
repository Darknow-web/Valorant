import React, { useEffect, useRef, useState } from 'react';
import { useSimulator } from '../store/SimulatorContext';

/**
 * Barra de la simulación. Muestra el módulo, el avance y el tiempo, y da acceso
 * a la situación de tienda y a la pista.
 *
 * La instrucción del paso NO se muestra: el colaborador trabaja a partir de la
 * situación. Solo la revela pidiendo la pista, que descuenta puntaje.
 *
 * En celular la barra tiene que ser DELGADA. Cada píxel que se lleve aquí se lo
 * quita al sistema de caja, que ya va justo. Por eso el título se recorta a una
 * línea y las dos acciones secundarias se esconden tras un menú «⋯»: con los
 * cinco botones sueltos, «Módulo 3 — Proceso de venta pago con efectivo» se
 * partía en cinco líneas y la barra se comía un tercio de la pantalla.
 */
export const SimulatorHeader = ({
  onShowScenario,
  puedeReiniciar,
}: {
  onShowScenario: () => void;
  /** Reiniciar gasta una oportunidad: si ya no le quedan, no se ofrece. */
  puedeReiniciar: boolean;
}) => {
  const {
    moduleTitle, currentStep, currentStepIndex, errors, exitModule, restartModule,
    reacomodarPantallas, triggerHint, hintActive, startTime, status,
  } = useSimulator();

  const [elapsed, setElapsed] = useState('00:00');
  /** El reinicio pide confirmación: devuelve al paso 1 y eso no se deshace. */
  const [confirmandoReinicio, setConfirmandoReinicio] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startTime || status !== 'running') return;
    const tick = () => {
      const secs = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(`${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime, status]);

  // Un toque fuera cierra el menú, como cualquier menú del sistema.
  useEffect(() => {
    if (!menuAbierto) return;
    const fuera = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuAbierto(false);
    };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [menuAbierto]);

  if (!currentStep) return null;

  // «Módulo 3» por un lado y «Proceso de venta pago con efectivo» por otro: en
  // celular solo cabe el número, y el nombre largo se recorta con puntos
  // suspensivos en vez de desbordar.
  const numero = moduleTitle.match(/M[oó]dulo (\d+)/)?.[1] ?? '';
  const nombre = moduleTitle.replace(/^M[oó]dulo \d+\s*—\s*/, '');

  const claseBoton =
    'flex h-10 min-w-10 items-center justify-center rounded-xl border border-line-strong px-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-sunken sm:h-9';

  return (
    <div data-barra-simulador className="relative z-10 shrink-0 border-b border-line bg-raised px-2 py-1.5 shadow-sm sm:px-4 sm:py-2.5">
      <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-brand" />
      <div className="flex items-center gap-2">
        <button
          onClick={exitModule}
          className={`${claseBoton} shrink-0 text-ink`}
          aria-label="Salir al menú guardando el avance"
          title="Sales al menú y tu avance queda guardado: al volver retomas en este mismo paso."
        >
          <span aria-hidden>←</span>
          <span className="ml-1 hidden sm:inline">Salir</span>
        </button>

        {/* `min-w-0` en TODA la cadena: sin él, `truncate` no recorta nada y el
            título empuja a los botones fuera de la pantalla. */}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold leading-tight text-ink" title={moduleTitle}>
            <span className="text-navy">Módulo {numero}</span>
            <span className="hidden sm:inline"> — {nombre}</span>
          </h2>
          <div className="cifra truncate text-xs leading-tight text-ink-muted">
            Paso {currentStepIndex + 1} · {elapsed} · Errores{' '}
            <span className={errors > 0 ? 'font-semibold text-danger' : ''}>{errors}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={onShowScenario}
            className="flex h-10 items-center justify-center rounded-xl bg-brand-soft px-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white sm:h-9 sm:px-3"
          >
            <span className="sm:hidden">Caso</span>
            <span className="hidden sm:inline">Ver la situación</span>
          </button>
          <button onClick={triggerHint} className={claseBoton}>
            Pista
          </button>

          {/* Las dos salidas de emergencia. En pantalla ancha van sueltas; en
              celular se agrupan aquí, pero nunca a más de dos toques: de eso
              depende que «Reacomodar» siga siendo una salida de verdad. */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuAbierto((v) => !v)}
              className={`${claseBoton} lg:hidden`}
              aria-label="Más opciones"
              aria-expanded={menuAbierto}
            >
              <span aria-hidden>⋯</span>
            </button>

            {menuAbierto && (
              <div className="absolute right-0 top-full z-20 mt-1 w-60 overflow-hidden rounded-xl border border-line-strong bg-raised shadow-lg lg:hidden">
                <button
                  onClick={() => {
                    reacomodarPantallas();
                    setMenuAbierto(false);
                  }}
                  className="block w-full px-4 py-3 text-left text-sm font-semibold text-ink transition-colors hover:bg-sunken"
                >
                  ⟳ Reacomodar pantallas
                  <span className="mt-0.5 block text-xs font-normal text-ink-muted">
                    ¿Se te trabó una ventana? No pierdes nada.
                  </span>
                </button>
                {puedeReiniciar && (
                  <button
                    onClick={() => {
                      setConfirmandoReinicio(true);
                      setMenuAbierto(false);
                    }}
                    className="block w-full border-t border-line px-4 py-3 text-left text-sm font-semibold text-ink transition-colors hover:bg-sunken"
                  >
                    ↺ Volver a empezar
                    <span className="mt-0.5 block text-xs font-normal text-ink-muted">
                      Empiezas de cero. Gasta tu repetición.
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            onClick={reacomodarPantallas}
            className={`${claseBoton} hidden lg:flex`}
            aria-label="Reacomodar las pantallas"
            title="¿Se te quedó una ventana trabada? Esto devuelve las pantallas a su sitio. No pierdes nada."
          >
            <span aria-hidden>⟳</span>
            <span className="ml-1">Reacomodar</span>
          </button>
          {puedeReiniciar && (
            <button
              onClick={() => setConfirmandoReinicio(true)}
              className={`${claseBoton} hidden lg:flex`}
              aria-label="Volver a empezar el módulo desde cero"
              title="Empiezas el módulo de nuevo, sin errores. Gasta tu repetición."
            >
              <span aria-hidden>↺</span>
              <span className="ml-1">Volver a empezar</span>
            </button>
          )}
        </div>
      </div>

      {confirmandoReinicio && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-line-strong bg-sunken px-3 py-2 text-sm sm:mt-3 sm:px-4 sm:py-3">
          <p className="min-w-0 flex-1 text-ink">
            Empiezas el módulo de nuevo: paso 1, sin errores y con el tiempo a cero.{' '}
            <span className="font-semibold text-warn">Gasta tu repetición: será tu último intento.</span>{' '}
            <span className="text-ink-muted">
              Si solo se te trabó una ventana, usa «Reacomodar»: eso no cuesta nada.
            </span>
          </p>
          <button
            onClick={() => {
              restartModule();
              setConfirmandoReinicio(false);
            }}
            className="rounded-lg bg-brand px-3 py-2 font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Volver a empezar
          </button>
          <button
            onClick={() => setConfirmandoReinicio(false)}
            className="rounded-lg border border-line-strong px-3 py-2 font-semibold text-ink-muted transition-colors hover:bg-raised"
          >
            Seguir aquí
          </button>
        </div>
      )}

      {hintActive && (
        <div className="mt-2 rounded-xl border border-warn/25 bg-warn-soft px-3 py-2 text-sm text-ink sm:mt-3 sm:px-4 sm:py-3">
          <span className="font-semibold text-warn">Pista: </span>
          {currentStep.hintMessage || currentStep.instruction}
        </div>
      )}
    </div>
  );
};
