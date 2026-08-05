import React, { useEffect, useState } from 'react';
import { useSimulator } from '../store/SimulatorContext';

/**
 * Barra de la simulación. Muestra el módulo, el avance y el tiempo, y da acceso
 * a la situación de tienda y a la pista.
 *
 * La instrucción del paso NO se muestra: el colaborador trabaja a partir de la
 * situación. Solo la revela pidiendo la pista, que descuenta puntaje.
 */
export const SimulatorHeader = ({ onShowScenario }: { onShowScenario: () => void }) => {
  const {
    moduleTitle, currentStep, currentStepIndex, errors, exitModule,
    triggerHint, hintActive, startTime, status,
  } = useSimulator();

  const [elapsed, setElapsed] = useState('00:00');

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
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <button
            onClick={exitModule}
            className="shrink-0 rounded-lg border border-line-strong px-2.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-sunken sm:px-3 sm:py-1.5"
            aria-label="Salir del módulo"
          >
            <span aria-hidden>←</span>
            <span className="ml-1 hidden sm:inline">Salir</span>
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold leading-tight text-ink sm:text-base">{moduleTitle}</h2>
            <div className="text-xs text-ink-muted sm:text-sm">
              Paso {currentStepIndex + 1} · {elapsed} · Errores{' '}
              <span className={errors > 0 ? 'font-semibold text-danger' : ''}>{errors}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            onClick={onShowScenario}
            className="rounded-lg bg-brand-soft px-2.5 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white sm:px-3 sm:py-1.5"
          >
            <span className="sm:hidden">Situación</span>
            <span className="hidden sm:inline">Ver la situación</span>
          </button>
          <button
            onClick={triggerHint}
            className="rounded-lg border border-line-strong px-2.5 py-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-sunken sm:px-3 sm:py-1.5"
          >
            <span className="sm:hidden">Pista</span>
            <span className="hidden sm:inline">Pedir pista</span>
          </button>
        </div>
      </div>

      {hintActive && (
        <div className="mt-2 rounded-lg border border-warn/25 bg-warn-soft px-3 py-2 text-sm text-ink sm:mt-3 sm:px-4 sm:py-3">
          <span className="font-semibold text-warn">Pista: </span>
          {currentStep.hintMessage || currentStep.instruction}
        </div>
      )}
    </div>
  );
};
