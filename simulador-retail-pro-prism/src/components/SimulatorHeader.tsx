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

  return (
    <div className="relative z-10 border-b border-line bg-raised px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={exitModule}
            className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-sunken"
          >
            ← Salir
          </button>
          <div>
            <h2 className="text-base font-bold leading-tight text-ink">{moduleTitle}</h2>
            <div className="text-sm text-ink-muted">
              Paso {currentStepIndex + 1} · Tiempo {elapsed} · Errores{' '}
              <span className={errors > 0 ? 'font-semibold text-danger' : ''}>{errors}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onShowScenario}
            className="rounded-lg bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
          >
            Ver la situación
          </button>
          <button
            onClick={triggerHint}
            className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-sunken"
          >
            Pedir pista
          </button>
        </div>
      </div>

      {hintActive && (
        <div className="mt-3 rounded-lg border border-warn/25 bg-warn-soft px-4 py-3 text-sm text-ink">
          <span className="font-semibold text-warn">Pista: </span>
          {currentStep.hintMessage || currentStep.instruction}
        </div>
      )}
    </div>
  );
};
