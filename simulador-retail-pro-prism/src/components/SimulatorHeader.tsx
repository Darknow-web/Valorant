import React, { useEffect, useState } from 'react';
import { useSimulator } from '../store/SimulatorContext';

/**
 * Barra de la simulación. Muestra el módulo, el avance y el tiempo, y da acceso
 * a la situación de tienda y a la pista.
 *
 * La instrucción del paso NO se muestra: el colaborador trabaja a partir de la
 * situación. Solo la revela pidiendo la pista, que descuenta puntaje.
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

  if (!currentStep) return null;

  // En pantallas angostas la barra se compacta a una sola fila: cada fila extra
  // le quita altura al simulador, que es lo que más escasea en un celular.
  return (
    <div className="relative z-10 shrink-0 border-b border-line bg-raised px-2 py-2 shadow-sm sm:px-4 sm:py-3">
      <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-brand" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <button
            onClick={exitModule}
            className="shrink-0 rounded-lg border border-line-strong px-2.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-sunken sm:px-3 sm:py-1.5"
            aria-label="Salir al menú guardando el avance"
            title="Sales al menú y tu avance queda guardado: al volver retomas en este mismo paso."
          >
            <span aria-hidden>←</span>
            <span className="ml-1 hidden sm:inline">Salir</span>
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold leading-tight text-ink sm:text-base">{moduleTitle}</h2>
            <div className="cifra text-xs text-ink-muted sm:text-sm">
              Paso {currentStepIndex + 1} · {elapsed} · Errores{' '}
              <span className={errors > 0 ? 'font-semibold text-danger' : ''}>{errors}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* La salida garantizada. No retrocede pasos, no borra errores y no
              gasta intento: solo devuelve las pantallas al sitio desde el que
              el paso en curso se puede completar. Va siempre visible porque su
              razón de ser es servir justo cuando algo salió mal. */}
          <button
            onClick={reacomodarPantallas}
            className="rounded-xl border border-line-strong px-2.5 py-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-sunken sm:px-3 sm:py-1.5"
            aria-label="Reacomodar las pantallas"
            title="¿Se te quedó una ventana trabada? Esto devuelve las pantallas a su sitio. No pierdes nada."
          >
            <span aria-hidden>⟳</span>
            <span className="ml-1 hidden xl:inline">Reacomodar</span>
          </button>
          {puedeReiniciar && (
            <button
              onClick={() => setConfirmandoReinicio(true)}
              className="rounded-xl border border-line-strong px-2.5 py-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-sunken sm:px-3 sm:py-1.5"
              aria-label="Volver a empezar el módulo desde cero"
              title="Empiezas el módulo de nuevo, sin errores. Gasta tu repetición."
            >
              <span aria-hidden>↺</span>
              <span className="ml-1 hidden lg:inline">Volver a empezar</span>
            </button>
          )}
          <button
            onClick={onShowScenario}
            className="rounded-xl bg-brand-soft px-2.5 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white sm:px-3 sm:py-1.5"
          >
            <span className="sm:hidden">Situación</span>
            <span className="hidden sm:inline">Ver la situación</span>
          </button>
          <button
            onClick={triggerHint}
            className="rounded-xl border border-line-strong px-2.5 py-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-sunken sm:px-3 sm:py-1.5"
          >
            <span className="sm:hidden">Pista</span>
            <span className="hidden sm:inline">Pedir pista</span>
          </button>
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
            className="rounded-lg bg-brand px-3 py-1.5 font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Volver a empezar
          </button>
          <button
            onClick={() => setConfirmandoReinicio(false)}
            className="rounded-lg border border-line-strong px-3 py-1.5 font-semibold text-ink-muted transition-colors hover:bg-raised"
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
