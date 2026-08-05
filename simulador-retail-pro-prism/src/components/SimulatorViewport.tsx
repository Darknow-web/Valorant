import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button, Card } from './ui/Kit';

/** Ancho con el que están diseñadas las pantallas de Retail Pro. */
export const DESIGN_WIDTH = 1280;
/** Por debajo de esta escala el texto del POS (10-13 px) deja de leerse. */
const MIN_USABLE_SCALE = 0.5;

/**
 * Envoltorio del simulador para que sea usable en celular sin rediseñar las
 * pantallas, que a propósito conservan el aspecto del sistema real.
 *
 * - Si el simulador cabe encogido y sigue siendo legible (celular en
 *   horizontal, tablet, escritorio angosto), se escala para caber en el ancho.
 * - Si no cabe de forma legible (celular en vertical: el factor sería ~0,30 y
 *   dejaría el texto en 3 px), se sugiere girar el teléfono. Quien prefiera
 *   seguir así navega a tamaño real, con scroll en ambos ejes y pinch-zoom.
 *
 * Antes nada de esto era posible: tres `overflow-hidden` anidados recortaban el
 * contenido y no dejaban ni desplazarse ni alejar la vista.
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
  // A tamaño real cuando ya cabe, o cuando el colaborador decidió seguir en vertical.
  const fullSize = fitsAtFullSize || forceFullSize;

  return (
    <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">
      {showRotatePrompt ? (
        <RotatePrompt onContinue={() => setForceFullSize(true)} />
      ) : fullSize ? (
        <ScrollableArea>
          <div style={{ minWidth: fitsAtFullSize ? undefined : DESIGN_WIDTH }} className="flex min-h-full flex-col">
            {children}
          </div>
        </ScrollableArea>
      ) : (
        <ScrollableArea>
          <div style={{ width: size.width, height: size.height }}>
            <div
              style={{
                width: DESIGN_WIDTH,
                height: size.height / rawScale,
                transform: `scale(${rawScale})`,
                transformOrigin: 'top left',
              }}
              className="flex flex-col"
            >
              {children}
            </div>
          </div>
        </ScrollableArea>
      )}
    </div>
  );
};

/** Área desplazable en ambos ejes, con pinch-zoom permitido. */
const ScrollableArea = ({ children }: { children: React.ReactNode }) => (
  <div
    className="h-full w-full overflow-auto"
    style={{ touchAction: 'pan-x pan-y pinch-zoom', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
  >
    {children}
  </div>
);

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
