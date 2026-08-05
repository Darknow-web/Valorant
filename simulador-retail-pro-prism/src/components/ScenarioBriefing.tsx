import React from 'react';
import { ModuleData } from '../types';
import { resolveScenario } from '../data/scenarios';
import { Badge, Button, Card } from './ui/Kit';

/**
 * La situación de tienda que reemplaza al paso a paso.
 *
 * El colaborador no lee "haz clic aquí": lee una escena y de ahí deduce los
 * datos. Los valores vienen de lo que configuró el entrenador.
 */
export const ScenarioBriefing = ({
  module: mod,
  modules,
  onStart,
  onBack,
}: {
  module: ModuleData;
  modules: ModuleData[];
  onStart: () => void;
  onBack: () => void;
}) => {
  const scenario = resolveScenario(mod.id, modules);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <button onClick={onBack} className="mb-6 text-sm font-semibold text-brand hover:underline">
        ← Volver a los módulos
      </button>

      <Card className="overflow-hidden">
        <div className="border-b border-line bg-sunken px-6 py-5">
          <Badge tone="brand">{mod.title}</Badge>
          <h1 className="mt-3 text-2xl font-bold text-ink">{scenario?.titulo || 'Situación en tienda'}</h1>
        </div>

        <div className="space-y-6 px-6 py-6">
          {scenario ? (
            <>
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Qué está pasando</h2>
                <p className="text-[15px] leading-relaxed text-ink">{scenario.contexto}</p>
              </section>

              {scenario.pistas.length > 0 && (
                <section>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Lo que observas</h2>
                  <ul className="space-y-2">
                    {scenario.pistas.map((pista, i) => (
                      <li key={i} className="flex gap-3 rounded-lg bg-sunken px-4 py-3 text-[15px] leading-relaxed text-ink">
                        <span className="mt-0.5 select-none text-ink-subtle">•</span>
                        <span>{pista}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="rounded-lg border border-brand/20 bg-brand-soft px-4 py-3">
                <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand">Tu objetivo</h2>
                <p className="text-[15px] font-medium text-ink">{scenario.objetivo}</p>
              </section>
            </>
          ) : (
            <p className="text-[15px] text-ink-muted">
              Este módulo todavía no tiene una situación asociada. Realiza el proceso completo en el sistema.
            </p>
          )}

          <p className="border-t border-line pt-4 text-sm text-ink-muted">
            No verás el paso a paso. Si te trabas, puedes pedir una pista dentro de la simulación, pero descuenta puntaje.
          </p>
        </div>
      </Card>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onBack}>
          Cancelar
        </Button>
        <Button onClick={onStart}>Entrar al sistema</Button>
      </div>
    </div>
  );
};

/** Versión compacta, accesible durante la simulación. */
export const ScenarioDrawer = ({
  moduleId,
  modules,
  onClose,
}: {
  moduleId: string;
  modules: ModuleData[];
  onClose: () => void;
}) => {
  const scenario = resolveScenario(moduleId, modules);
  if (!scenario) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex justify-end bg-ink/40" onClick={onClose}>
      <aside
        className="frame h-full w-full max-w-md overflow-y-auto bg-raised p-6 text-ink shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold">{scenario.titulo}</h2>
          <button onClick={onClose} className="text-sm font-semibold text-brand hover:underline">
            Cerrar
          </button>
        </div>
        <p className="mb-5 text-[15px] leading-relaxed text-ink-muted">{scenario.contexto}</p>
        <ul className="mb-5 space-y-2">
          {scenario.pistas.map((pista, i) => (
            <li key={i} className="rounded-lg bg-sunken px-4 py-3 text-[15px] leading-relaxed">
              {pista}
            </li>
          ))}
        </ul>
        <div className="rounded-lg border border-brand/20 bg-brand-soft px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Tu objetivo</p>
          <p className="mt-1 text-[15px] font-medium">{scenario.objetivo}</p>
        </div>
      </aside>
    </div>
  );
};
