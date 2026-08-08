import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button, Card } from './ui/Kit';

/** Ancho con el que están diseñadas las pantallas de Retail Pro. */
export const DESIGN_WIDTH = 1280;
/** Alto mínimo para que las pantallas del POS no se aplasten. */
const DESIGN_MIN_HEIGHT = 640;
/** Por debajo de esta escala el texto del POS (10-13 px) deja de leerse. */
const MIN_USABLE_SCALE = 0.5;

/**
 * Envoltorio del simulador para que sea usable en celular sin rediseñar las
 * pantallas, que a propósito conservan el aspecto del sistema real.
 *
 * Clave: siempre entrega un **escenario con ancho y alto explícitos en píxeles**.
 * Las pantallas usan `absolute inset-0` y `h-full`, que necesitan un ancestro con
 * altura definida; al envolverlas antes en un contenedor de altura automática se
 * quedaban en su altura natural y aparecía una franja vacía debajo en escritorio.
 *
 * - Escritorio: el escenario mide justo el espacio disponible, sin escalar.
 *   Se ve exactamente igual que antes de adaptar el móvil.
 * - Horizontal (y tablet): escenario de 1280 px escalado para caber en el ancho.
 * - Vertical: escalar daría un factor ~0,30 y dejaría el texto en 3 px, así que
 *   se sugiere girar el teléfono; quien siga navega a tamaño real con scroll y
 *   zoom.
 */
export const SimulatorViewport = ({ children }: { children: React.ReactNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: DESIGN_WIDTH, height: 720 });
  const [forceFullSize, setForceFullSize] = useState(false);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('orientationchange', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  const rawScale = size.width / DESIGN_WIDTH;
  const fitsAtFullSize = rawScale >= 1;
  const canScaleLegibly = rawScale >= MIN_USABLE_SCALE;

  // Al girar el teléfono ya no hace falta la excepción manual.
  useEffect(() => {
    if (canScaleLegibly) setForceFullSize(false);
  }, [canScaleLegibly]);

  const showRotatePrompt = !canScaleLegibly && !forceFullSize;

  let stage: { width: number; height: number; scale: number };
  if (fitsAtFullSize) {
    // Cabe entero: el escenario es el espacio disponible, tal cual.
    stage = { width: size.width, height: Math.max(size.height, DESIGN_MIN_HEIGHT), scale: 1 };
  } else if (forceFullSize) {
    // A tamaño real en una pantalla angosta: se navega con scroll y zoom.
    stage = { width: DESIGN_WIDTH, height: Math.max(size.height, DESIGN_MIN_HEIGHT), scale: 1 };
  } else {
    // Escalado para caber en el ancho, conservando la altura visible.
    stage = { width: DESIGN_WIDTH, height: Math.max(size.height / rawScale, DESIGN_MIN_HEIGHT), scale: rawScale };
  }

  return (
    <div ref={containerRef} data-pos className="relative min-h-0 flex-1 overflow-hidden">
      {showRotatePrompt ? (
        <RotatePrompt onContinue={() => setForceFullSize(true)} />
      ) : (
        <div
          className="h-full w-full overflow-auto"
          style={{ touchAction: 'pan-x pan-y pinch-zoom', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {/* Reserva el espacio que ocupa el escenario ya escalado. */}
          <div style={{ width: stage.width * stage.scale, height: stage.height * stage.scale }}>
            <div
              className="flex flex-col"
              style={{
                width: stage.width,
                height: stage.height,
                transform: stage.scale === 1 ? undefined : `scale(${stage.scale})`,
                transformOrigin: 'top left',
              }}
            >
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RotatePrompt = ({ onContinue }: { onContinue: () => void }) => (
  <div className="frame flex h-full items-center justify-center bg-surface p-6">
    <Card className="w-full max-w-sm p-8 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand">
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M12 18h.01" strokeLinecap="round" />
          <path d="M20 8a8 8 0 0 1-3 6" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-ink">Gira tu teléfono</h2>
      <p className="mb-6 mt-2 text-sm text-ink-muted">
        El sistema de caja está hecho para pantallas anchas. En horizontal se ve completo y se lee bien.
      </p>
      <Button variant="secondary" onClick={onContinue} className="w-full">
        Continuar así de todos modos
      </Button>
      <p className="mt-3 text-xs text-ink-subtle">
        Si continúas, podrás desplazarte y hacer zoom con los dedos para llegar a cada botón.
      </p>
    </Card>
  </div>
);
