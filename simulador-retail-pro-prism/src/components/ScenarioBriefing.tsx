import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ModuleData } from '../types';
import { Catalog } from '../data/catalog';
import { Evidencia, ResolvedScenario, resolveScenario } from '../data/scenarios';
import { Button } from './ui/Kit';
import { cascada, elemento, panelLateral } from '../lib/motion';

/**
 * La situación de tienda que reemplaza al paso a paso.
 *
 * El colaborador no lee "haz clic aquí": lee una escena y de ahí deduce qué
 * hacer. La ficha se compone como una nota de revista —titular, relato, y los
 * datos separados como "evidencias"—, porque a mitad del proceso lo que se
 * necesita es volver a un dato suelto, no releer el párrafo entero.
 */

/** Una evidencia: etiqueta arriba, dato grande abajo, y copiar al portapapeles. */
const FichaDato = ({ dato }: { dato: Evidencia }) => {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    if (dato.pendiente) return;
    try {
      await navigator.clipboard.writeText(dato.valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1400);
    } catch {
      // Sin permiso de portapapeles el dato sigue estando a la vista.
    }
  };

  if (dato.pendiente) {
    return (
      <div className="h-full w-full rounded-xl border border-warn/30 bg-warn-soft px-4 py-3">
        <p className="etiqueta text-warn">{dato.etiqueta}</p>
        <p className="mt-1 text-sm font-semibold text-warn">
          <span aria-hidden>⚠ </span>Falta configurarlo
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={copiar}
      title="Copiar"
      className="group relative h-full w-full rounded-xl border border-line bg-raised px-4 py-3 text-left transition-colors hover:border-brand/40 hover:bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
    >
      <p className="etiqueta pr-14 text-ink-subtle">{dato.etiqueta}</p>
      <p className="cifra mt-1 break-words text-[17px] font-bold leading-snug text-navy">{dato.valor}</p>
      {/* El aviso va superpuesto: si reservara su línea, cada ficha crecería
          una altura que en el celular no compensa. */}
      <span
        className={`absolute right-3 top-3 text-[11px] font-bold transition-opacity ${
          copiado ? 'text-ok opacity-100' : 'text-ink-subtle opacity-0 group-hover:opacity-100'
        }`}
      >
        {copiado ? '¡Copiado!' : 'Copiar'}
      </span>
    </button>
  );
};

/** El bloque de evidencias, compartido por la ficha y el cajón. */
const Evidencias = ({ scenario, compacto = false }: { scenario: ResolvedScenario; compacto?: boolean }) => {
  if (scenario.evidencias.length === 0) return null;
  return (
    <div>
      <h2 className="etiqueta mb-2 text-ink-muted">Los datos del caso</h2>
      {/* Una sola columna en celular. Con dos, cada ficha medía ~170 px: la
          etiqueta se partía en tres líneas y un SKU de 13 dígitos se cortaba por
          la mitad, que es justo lo que no puede pasar con un dato que hay que
          teclear. El cajón lateral sí mantiene sus dos columnas: ahí los datos
          ya se consultan de un vistazo. */}
      <motion.div
        variants={cascada(0.05)}
        className={compacto ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1 gap-2 sm:grid-cols-2'}
      >
        {scenario.evidencias.map((dato) => (
          <motion.div key={dato.clave} variants={elemento}>
            <FichaDato dato={dato} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export const ScenarioBriefing = ({
  module: mod,
  modules,
  catalog,
  reanudar,
  intentosRestantes,
  onStart,
  onBack,
}: {
  module: ModuleData;
  modules: ModuleData[];
  catalog: Catalog;
  /** Intento a medias que el colaborador dejó guardado, si lo hay. */
  reanudar?: { currentStepIndex: number; totalPasos: number } | null;
  /** Oportunidades que le quedan en este módulo. */
  intentosRestantes: number;
  onStart: () => void;
  onBack: () => void;
}) => {
  const scenario = resolveScenario(mod.id, modules, catalog);
  const numero = mod.title.match(/M[oó]dulo (\d+)/)?.[1] ?? '';

  return (
    <div className="mx-auto max-w-3xl px-4 py-7 sm:py-14">
      <button onClick={onBack} className="mb-6 inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">
        ← Volver a los módulos
      </button>

      <motion.article variants={cascada(0.08, 0.1)} initial="inicial" animate="visible">
        {/* Titular: el caso se anuncia como una nota, no como un formulario. */}
        <motion.header variants={elemento} className="border-b border-line pb-5 sm:pb-7">
          <p className="etiqueta text-brand">Caso {numero} · Situación en tienda</p>
          {/* La frase de enganche va antes del titular y en gris: recuerda de
              dónde viene el turno sin robarle peso al caso de ahora. */}
          {scenario?.enlace && (
            <p className="prosa mt-2 text-[15px] italic leading-snug text-ink-subtle">{scenario.enlace}</p>
          )}
          <h1 className="mt-2 text-balance text-[2rem] font-extrabold leading-[1.08] tracking-tight text-navy sm:mt-3 sm:text-5xl">
            {scenario?.titulo || 'Situación en tienda'}
          </h1>
        </motion.header>

        {scenario ? (
          <div className="space-y-7 pt-6 sm:space-y-9 sm:pt-8">
            {/* El relato, en ancho de lectura y con la primera línea destacada. */}
            <motion.section variants={elemento}>
              <p className="prosa text-[17px] leading-[1.7] text-ink sm:text-[19px]">{scenario.contexto}</p>
            </motion.section>

            <motion.section variants={elemento}>
              <Evidencias scenario={scenario} />
            </motion.section>

            {scenario.pistas.length > 0 && (
              <motion.section variants={elemento}>
                <h2 className="etiqueta mb-2 text-ink-muted">Lo que observas</h2>
                <motion.ul variants={cascada(0.05)} className="space-y-1.5">
                  {scenario.pistas.map((pista, i) => (
                    <motion.li
                      key={i}
                      variants={elemento}
                      className="flex gap-3 border-l-2 border-line py-1.5 pl-4 text-[15px] leading-relaxed text-ink-muted"
                    >
                      {pista}
                    </motion.li>
                  ))}
                </motion.ul>
              </motion.section>
            )}

            {/* El objetivo cierra la ficha: es lo último que se lee antes de entrar. */}
            <motion.section
              variants={elemento}
              className="rounded-2xl bg-navy px-6 py-5 text-white shadow-[0_10px_30px_-12px_rgba(6,6,67,0.55)]"
            >
              <p className="etiqueta text-sand">Tu objetivo</p>
              <p className="mt-1.5 text-xl font-bold leading-snug">{scenario.objetivo}</p>
            </motion.section>
          </div>
        ) : (
          <p className="prosa pt-8 text-[15px] text-ink-muted">
            Este módulo todavía no tiene una situación asociada. Realiza el proceso completo en el sistema.
          </p>
        )}

        <motion.p variants={elemento} className="prosa mt-8 border-t border-line pt-5 text-sm text-ink-subtle">
          No verás el paso a paso. Si te trabas, puedes pedir una pista dentro de la simulación, pero descuenta
          puntaje. Salir al menú no te cuesta nada: tu avance queda guardado y retomas donde lo dejaste.
        </motion.p>
      </motion.article>

      {/* Lo que le va a pasar al entrar, dicho antes de entrar. Es lo que evita
          que gaste su última oportunidad sin saber que era la última. */}
      {reanudar ? (
        <div className="mt-8 rounded-2xl border border-brand/25 bg-brand-soft px-5 py-4">
          <p className="text-sm font-semibold text-brand">Tienes este módulo a medias</p>
          <p className="prosa mt-1 text-sm text-ink-muted">
            Lo dejaste en el paso {reanudar.currentStepIndex + 1} de {reanudar.totalPasos || mod.steps.length}. Al
            entrar sigues justo ahí, con los mismos errores y el mismo tiempo. No gastas ninguna oportunidad.
          </p>
        </div>
      ) : intentosRestantes === 1 ? (
        <div className="mt-8 rounded-2xl border border-warn/30 bg-warn-soft px-5 py-4">
          <p className="text-sm font-semibold text-warn">Es tu última oportunidad en este módulo</p>
          <p className="prosa mt-1 text-sm text-ink-muted">
            Se queda con tu mejor nota de las dos, así que no puedes bajar. Si necesitas salir a mitad del proceso,
            tu avance se guarda y esto no cuenta como intento.
          </p>
        </div>
      ) : null}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onBack}>
          Cancelar
        </Button>
        <Button onClick={onStart}>{reanudar ? 'Retomar donde lo dejé' : 'Entrar al sistema'}</Button>
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
        className="frame h-full w-full overflow-y-auto bg-surface p-5 text-ink shadow-2xl sm:max-w-md sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="etiqueta text-brand">El caso</p>
            <h2 className="mt-1 text-2xl font-extrabold leading-tight text-navy">{scenario.titulo}</h2>
          </div>
          <button onClick={onClose} className="shrink-0 inline-flex min-h-11 items-center px-2 text-sm font-semibold text-brand hover:underline">
            Cerrar
          </button>
        </div>

        {/* A mitad del proceso lo que se busca es un dato, así que van primero. */}
        <motion.div variants={cascada(0.05)} initial="inicial" animate="visible" className="space-y-6">
          <motion.div variants={elemento}>
            <Evidencias scenario={scenario} compacto />
          </motion.div>

          <motion.div variants={elemento}>
            <h2 className="etiqueta mb-2 text-ink-muted">La situación</h2>
            <p className="prosa text-[15px] leading-relaxed text-ink-muted">{scenario.contexto}</p>
            <ul className="mt-3 space-y-1.5">
              {scenario.pistas.map((pista, i) => (
                <li key={i} className="border-l-2 border-line py-1 pl-3 text-[14px] leading-relaxed text-ink-muted">
                  {pista}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div variants={elemento} className="rounded-2xl bg-navy px-5 py-4 text-white">
            <p className="etiqueta text-sand">Tu objetivo</p>
            <p className="mt-1 text-[17px] font-bold leading-snug">{scenario.objetivo}</p>
          </motion.div>
        </motion.div>
      </motion.aside>
    </motion.div>
  );
};
