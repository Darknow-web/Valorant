import React from 'react';
import { motion } from 'motion/react';
import { ModuleData } from '../types';
import { Catalog } from '../data/catalog';
import { resolveScenario } from '../data/scenarios';
import { Badge, Button, Card } from './ui/Kit';
import { cascada, elemento, panelLateral } from '../lib/motion';

/**
 * La situación de tienda que reemplaza al paso a paso.
 *
 * El colaborador no lee "haz clic aquí": lee una escena y de ahí deduce los
 * datos. Los valores vienen de lo que configuró el entrenador.
 */
export const ScenarioBriefing = ({
  module: mod,
  modules,
  catalog,
  onStart,
  onBack,
}: {
  module: ModuleData;
  modules: ModuleData[];
  catalog: Catalog;
  onStart: () => void;
  onBack: () => void;
}) => {
  const scenario = resolveScenario(mod.id, modules, catalog);
  const numero = mod.title.match(/M[oó]dulo (\d+)/)?.[1] ?? '';

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <button onClick={onBack} className="mb-6 text-sm font-semibold text-brand hover:underline">
        ← Volver a los módulos
      </button>

      <Card className="overflow-hidden">
        {/* El arena de marca separa el "encabezado del caso" del cuerpo. */}
        <div className="border-b border-line bg-sand px-6 py-6">
          <Badge tone="brand">Módulo {numero}</Badge>
          <h1 className="mt-3 text-3xl font-extrabold text-navy">{scenario?.titulo || 'Situación en tienda'}</h1>
        </div>

        <motion.div variants={cascada(0.09, 0.12)} initial="inicial" animate="visible" className="space-y-7 px-6 py-7">
          {scenario ? (
            <>
              <motion.section variants={elemento}>
                <h2 className="etiqueta mb-2 text-ink-muted">Qué está pasando</h2>
                <p className="prosa text-[15px] text-ink">{scenario.contexto}</p>
              </motion.section>

              {scenario.pistas.length > 0 && (
                <motion.section variants={elemento}>
                  <h2 className="etiqueta mb-2 text-ink-muted">Lo que observas</h2>
                  <motion.ul variants={cascada(0.06)} className="space-y-2">
                    {scenario.pistas.map((pista, i) => (
                      <motion.li
                        key={i}
                        variants={elemento}
                        className="flex gap-3 rounded-xl bg-sunken px-4 py-3 text-[15px] leading-relaxed text-ink"
                      >
                        <span aria-hidden className="mt-0.5 select-none font-bold text-brand">
                          ·
                        </span>
                        <span>{pista}</span>
                      </motion.li>
                    ))}
                  </motion.ul>
                </motion.section>
              )}

              <motion.section variants={elemento} className="rounded-xl border-l-4 border-brand bg-brand-soft px-4 py-3">
                <h2 className="etiqueta mb-1 text-brand">Tu objetivo</h2>
                <p className="text-[15px] font-semibold text-navy">{scenario.objetivo}</p>
              </motion.section>
            </>
          ) : (
            <p className="prosa text-[15px] text-ink-muted">
              Este módulo todavía no tiene una situación asociada. Realiza el proceso completo en el sistema.
            </p>
          )}

          <motion.p variants={elemento} className="prosa border-t border-line pt-4 text-sm text-ink-muted">
            No verás el paso a paso. Si te trabas, puedes pedir una pista dentro de la simulación, pero descuenta
            puntaje.
          </motion.p>
        </motion.div>
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
  catalog,
  onClose,
}: {
  moduleId: string;
  modules: ModuleData[];
  catalog: Catalog;
  onClose: () => void;
}) => {
  const scenario = resolveScenario(moduleId, modules, catalog);
  if (!scenario) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998] flex justify-end bg-navy/40"
      onClick={onClose}
    >
      <motion.aside
        variants={panelLateral}
        initial="inicial"
        animate="visible"
        exit="salida"
        className="frame h-full w-full max-w-md overflow-y-auto bg-raised p-6 text-ink shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold">{scenario.titulo}</h2>
          <button onClick={onClose} className="text-sm font-semibold text-brand hover:underline">
            Cerrar
          </button>
        </div>
        <p className="prosa mb-5 text-[15px] text-ink-muted">{scenario.contexto}</p>
        <ul className="mb-5 space-y-2">
          {scenario.pistas.map((pista, i) => (
            <li key={i} className="rounded-xl bg-sunken px-4 py-3 text-[15px] leading-relaxed">
              {pista}
            </li>
          ))}
        </ul>
        <div className="rounded-xl border-l-4 border-brand bg-brand-soft px-4 py-3">
          <p className="etiqueta text-brand">Tu objetivo</p>
          <p className="mt-1 text-[15px] font-semibold text-navy">{scenario.objetivo}</p>
        </div>
      </motion.aside>
    </motion.div>
  );
};
