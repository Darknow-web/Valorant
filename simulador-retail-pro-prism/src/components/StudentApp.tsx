import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useSimulator } from '../store/SimulatorContext';
import { StudentInfoModal } from './StudentInfoModal';
import { ScenarioBriefing, ScenarioDrawer } from './ScenarioBriefing';
import { SimulatorHeader } from './SimulatorHeader';
import { SimulatorViewport } from './SimulatorViewport';
import { ScreenManager } from './ScreenManager';
import { PrismShell } from './ui/PrismUI';
import { Badge, Button, Card, CifraAnimada, Isotipo, Notice, Page } from './ui/Kit';
import { scenarios } from '../data/scenarios';
import { aviso, cascada, elemento, modal, tarjetaInteractiva, vista } from '../lib/motion';
import { lanzarConfeti } from '../lib/confeti';
import { GatoAnimando, Huella, PerroFeliz } from './ui/Mascotas';
import { Progreso, PROGRESO_VACIO, modulosPorReforzar, obtenerProgreso } from '../lib/progreso';

/**
 * Resumen del intento, con la nota que calculó el servidor.
 *
 * Si aprobó, cae confeti y aparece el perrito; si no, un gatito y un mensaje que
 * invita a repetirlo. Nunca se regaña: el objetivo es que vuelva a intentarlo.
 */
const CompletedScreen = () => {
  const { exitModule, errors, startTime, endTime, submitScore, score, approved, syncStatus, syncMessage } =
    useSimulator();
  const seconds = endTime && startTime ? Math.round((endTime - startTime) / 1000) : 0;

  // Un solo envío por intento: el contexto ignora reenvíos del mismo attemptId,
  // así que ni el doble montaje de React ni una recarga duplican la fila.
  useEffect(() => {
    submitScore();
  }, [submitScore]);

  // El confeti espera a saber la nota: celebrar antes de tiempo sería mentir.
  useEffect(() => {
    if (approved !== true) return;
    const detener = lanzarConfeti();
    return detener;
  }, [approved]);

  const esperando = approved === null;

  return (
    <motion.div
      variants={modal}
      initial="inicial"
      animate="visible"
      className="frame absolute inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-navy/50 p-4 backdrop-blur-[2px]"
    >
      <Card className="my-auto w-full max-w-md overflow-hidden p-8 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
          className="mx-auto mb-4 w-fit"
        >
          {approved === false ? <GatoAnimando /> : <PerroFeliz />}
        </motion.div>

        <h2 className="text-2xl font-extrabold text-ink">
          {esperando ? 'Módulo completado' : approved ? '¡Muy bien!' : 'Casi lo tienes'}
        </h2>
        <p className="prosa mx-auto mb-6 mt-1 text-sm text-ink-muted">
          {esperando
            ? 'Terminaste el proceso.'
            : approved
              ? 'Aprobaste este módulo. Así se hace en tienda.'
              : 'Todavía no llegas a la nota mínima. Repítelo: se guarda tu mejor intento, así que solo puedes mejorar.'}
        </p>

        <motion.div variants={cascada(0.08, 0.25)} initial="inicial" animate="visible" className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: 'Tiempo', valor: `${seconds}s`, numero: null },
            { label: 'Errores', valor: null, numero: errors },
            { label: 'Nota', valor: score === null ? '—' : null, numero: score },
          ].map((stat) => (
            <motion.div key={stat.label} variants={elemento} className="rounded-xl bg-sunken px-3 py-4">
              <div className="etiqueta text-ink-muted">{stat.label}</div>
              <div className="mt-1 text-xl font-bold text-ink">
                {stat.valor !== null ? (
                  <span className="cifra">{stat.valor}</span>
                ) : (
                  <CifraAnimada valor={stat.numero as number} />
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="mb-6 text-sm">
          {syncStatus === 'sending' && <span className="text-ink-muted">Enviando tu nota…</span>}
          {syncStatus === 'synced' && <Notice tone="ok">{syncMessage}</Notice>}
          {syncStatus === 'saved_locally' && <Notice tone="warn">{syncMessage}</Notice>}
          {syncStatus === 'failed' && <Notice tone="danger">{syncMessage}</Notice>}
        </div>

        <Button onClick={exitModule} className="w-full">
          {approved === false ? 'Volver e intentarlo otra vez' : 'Volver a los módulos'}
        </Button>
      </Card>
    </motion.div>
  );
};

/**
 * Aviso de error: entra por el borde y no tapa la pantalla del sistema, así el
 * colaborador puede releer lo que hizo mal sin perder de vista la caja.
 * Tampoco revela el paso correcto: para eso está la pista, que descuenta.
 */
const ErrorToast = () => {
  const { dismissErrorModal, customErrorMessage, triggerHint, currentStep, hintActive } = useSimulator();
  if (!currentStep) return null;

  return (
    <motion.div
      variants={aviso}
      initial="inicial"
      animate="visible"
      exit="salida"
      role="alert"
      className="frame pointer-events-none fixed inset-x-0 bottom-0 z-[9999] flex justify-end p-4 sm:inset-x-auto sm:right-0 sm:top-20 sm:bottom-auto"
    >
      <Card className="pointer-events-auto w-full max-w-sm overflow-hidden border-warn/30">
        <div className="h-1 w-full bg-warn" />
        <div className="p-5">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warn-soft text-sm font-bold text-warn"
            >
              !
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink">Ese no era el paso</h2>
              <p className="prosa mt-1 text-sm text-ink-muted">
                {customErrorMessage || 'Revisa la situación de la tienda y vuelve a intentarlo.'}
              </p>
            </div>
          </div>

          {hintActive && (
            <div className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-sm text-ink">
              <span className="font-semibold text-warn">Pista: </span>
              {currentStep.hintMessage || currentStep.instruction}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {!hintActive && (
              <Button variant="secondary" onClick={triggerHint} className="flex-1 py-2 text-xs">
                Ver pista
              </Button>
            )}
            <Button onClick={dismissErrorModal} className="flex-1 py-2 text-xs">
              Entendido
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

/** Lista de módulos del colaborador. */

/**
 * Cierre de la capacitación: la nota final es el promedio del mejor intento de
 * cada módulo. Si aprueba, se celebra; si no, se reconoce lo avanzado y se
 * señala qué conviene repetir, sin dramatismo.
 */
const CierreFinal = ({
  progreso,
  idsModulos,
  titulos,
}: {
  progreso: Progreso;
  idsModulos: string[];
  titulos: { id: string; title: string }[];
}) => {
  const aprobado = progreso.aprobado;
  const porReforzar = modulosPorReforzar(progreso, idsModulos);

  useEffect(() => {
    if (!aprobado) return;
    const detener = lanzarConfeti({ duracion: 3400, cantidad: 180 });
    return detener;
  }, [aprobado]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className={`mt-10 overflow-hidden rounded-2xl border px-6 py-8 text-center ${
        aprobado ? 'border-ok/25 bg-ok-soft' : 'border-warn/25 bg-warn-soft'
      }`}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 15, delay: 0.35 }}
        className="mx-auto mb-4 w-fit"
      >
        {aprobado ? <PerroFeliz className="h-28 w-28" /> : <GatoAnimando className="h-28 w-28" />}
      </motion.div>

      <h2 className={`text-3xl font-extrabold ${aprobado ? 'text-ok' : 'text-warn'}`}>
        {aprobado ? '¡Felicitaciones!' : 'Ya casi está'}
      </h2>
      <p className="prosa mx-auto mt-2 text-ink-muted">
        {aprobado
          ? 'Completaste toda la capacitación de caja con nota aprobatoria. Estás listo para el mostrador.'
          : 'Terminaste todos los módulos. Para aprobar la capacitación te falta subir el promedio; repite los que te quedaron cortos y tu mejor intento es el que cuenta.'}
      </p>

      <div className="mx-auto mt-6 w-fit rounded-2xl bg-raised px-8 py-5">
        <div className="etiqueta text-ink-muted">Tu nota final</div>
        <div className="mt-1 text-5xl font-extrabold text-ink">
          <CifraAnimada valor={progreso.promedio ?? 0} />
        </div>
        <div className="mt-1 text-sm text-ink-muted">
          de {progreso.notaMaxima} · se aprueba con <span className="cifra">{progreso.notaMinima}</span>
        </div>
      </div>

      <p className="mt-4 text-xs text-ink-subtle">Promedio del mejor intento de cada módulo.</p>

      {!aprobado && porReforzar.length > 0 && (
        <div className="mx-auto mt-6 max-w-md rounded-xl bg-raised px-5 py-4 text-left">
          <p className="etiqueta mb-2 flex items-center gap-2 text-warn">
            <Huella /> Para subir el promedio
          </p>
          <ul className="space-y-1 text-sm text-ink">
            {porReforzar.map((id) => {
              const mod = titulos.find((m) => m.id === id);
              return <li key={id}>· {mod?.title || id}</li>;
            })}
          </ul>
        </div>
      )}
    </motion.div>
  );
};

const ModuleMenu = ({ onPick, progreso }: { onPick: (moduleId: string) => void; progreso: Progreso }) => {
  const { modulesData, operatorName, operatorStore, clearOperator } = useSimulator();
  const total = modulesData.length;
  // El avance sale de las notas guardadas en el servidor, no de esta sesión:
  // así sigue ahí aunque el colaborador entre desde otro equipo.
  const hechos = Object.keys(progreso.modulos).length;
  const promedio = progreso.promedio;

  return (
    <Page className="px-4 pb-16 pt-10">
      <motion.div variants={vista} initial="inicial" animate="visible" className="mx-auto max-w-5xl">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <Isotipo className="h-10 w-10" />
              <span className="etiqueta text-brand">SuperPet · Capacitación</span>
            </div>
            <h1 className="text-4xl font-extrabold text-ink">Simulador de caja</h1>
            <p className="prosa mt-2 text-ink-muted">
              Cada módulo te pone en una situación de tienda. Lees el caso, sacas de ahí los datos y lo resuelves en el
              sistema. No hay instrucciones paso a paso.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-raised px-5 py-4">
            <div className="etiqueta text-ink-muted">Tu avance</div>
            <div className="mt-1 text-2xl font-bold text-ink">
              <span className="cifra">
                {hechos}/{total}
              </span>
            </div>
            {promedio !== null && (
              <div className="mt-1 text-sm text-ink-muted">
                Promedio <span className="cifra font-bold text-ink">{promedio}</span> de {progreso.notaMaxima}
              </div>
            )}
            <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-sunken">
              <motion.div
                className="h-full rounded-full bg-brand"
                initial={{ width: 0 }}
                animate={{ width: `${total ? (hechos / total) * 100 : 0}%` }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          <span>
            Colaborador: <span className="font-semibold text-ink">{operatorName}</span>
          </span>
          {operatorStore && <Badge tone="sand">{operatorStore}</Badge>}
          <button onClick={clearOperator} className="font-semibold text-brand hover:underline">
            Cambiar
          </button>
        </div>

        <motion.div
          variants={cascada()}
          initial="inicial"
          animate="visible"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {modulesData.map((mod) => {
            const mejor = progreso.modulos[mod.id];
            const isCompleted = !!mejor;
            const scenario = scenarios.find((s) => s.moduleId === mod.id);
            const numero = mod.title.match(/M[oó]dulo (\d+)/)?.[1] ?? '';
            const nombre = mod.title.replace(/^M[oó]dulo \d+\s*—\s*/, '');
            return (
              <motion.button
                key={mod.id}
                variants={elemento}
                {...tarjetaInteractiva}
                onClick={() => onPick(mod.id)}
                // El título va partido en dos para la jerarquía visual; la
                // etiqueta accesible lo mantiene completo para quien navegue
                // con lector de pantalla.
                aria-label={`${mod.title}${isCompleted ? ' (completado)' : ''}`}
                className={cnCard(isCompleted)}
              >
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 w-1 ${
                    mejor ? (mejor.approved ? 'bg-ok' : 'bg-warn') : 'bg-line-strong'
                  }`}
                />
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="etiqueta text-ink-subtle">Módulo {numero}</span>
                  {mejor && (
                    <Badge tone={mejor.approved ? 'ok' : 'warn'}>
                      <span className="cifra">{mejor.score}</span>
                      {mejor.approved ? ' ✓' : ' · repetir'}
                    </Badge>
                  )}
                </div>
                <h3 className="font-bold leading-snug text-ink">{nombre}</h3>
                {scenario && <p className="mt-1.5 text-sm text-ink-muted">{scenario.titulo}</p>}
                <p className="mt-3 text-xs text-ink-subtle">{mod.steps.length} acciones en el sistema</p>
              </motion.button>
            );
          })}
        </motion.div>

        {hechos === total && total > 0 && (
          <CierreFinal progreso={progreso} idsModulos={modulesData.map((m) => m.id)} titulos={modulesData} />
        )}
      </motion.div>
    </Page>
  );
};

const cnCard = (completado: boolean) =>
  `relative overflow-hidden rounded-2xl border bg-raised p-5 pl-6 text-left shadow-[0_1px_2px_rgba(6,6,67,0.06)] transition-shadow hover:shadow-[0_8px_24px_rgba(6,6,67,0.10)] ${
    completado ? 'border-ok/30' : 'border-line'
  }`;

export const StudentApp = ({ teacherUsername }: { teacherUsername: string }) => {
  const {
    status, startModule, modulesData, showErrorModal, handleInteract, currentModuleId,
    operatorName, operatorDni, catalog, configLoading, teacherMissing, reloadConfig,
  } = useSimulator();
  const [briefingModuleId, setBriefingModuleId] = useState<string | null>(null);
  const [showScenario, setShowScenario] = useState(false);
  const [progreso, setProgreso] = useState<Progreso>(PROGRESO_VACIO);

  // El progreso se recarga al volver al menú, para que la nota del módulo que
  // acaba de terminar ya aparezca en su tarjeta.
  useEffect(() => {
    if (status !== 'menu' || !operatorDni) return;
    let cancelado = false;
    obtenerProgreso(teacherUsername, operatorDni).then((p) => {
      if (!cancelado) setProgreso(p);
    });
    return () => {
      cancelado = true;
    };
  }, [status, teacherUsername, operatorDni]);

  if (teacherMissing) {
    return (
      <Page className="flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Isotipo className="mx-auto mb-5 h-12 w-12" />
          <h2 className="text-lg font-bold text-ink">Este enlace no es válido</h2>
          <p className="prosa mx-auto mt-2 text-sm text-ink-muted">
            No existe ningún entrenador llamado <span className="font-semibold text-ink">{teacherUsername}</span>. Pídele
            a tu entrenador que te comparta su enlace o su código QR otra vez.
          </p>
        </Card>
      </Page>
    );
  }

  if (!operatorName) return <StudentInfoModal teacherUsername={teacherUsername} />;

  // Sin la configuración del entrenador no se puede empezar: hacerlo llevaba a
  // entrenar con unos datos y validar contra otros.
  if (configLoading) {
    return (
      <Page className="flex items-center justify-center p-4">
        <div className="text-center">
          <Isotipo className="mx-auto mb-4 h-12 w-12 animate-pulse" />
          <p className="text-sm text-ink-muted">Cargando tus módulos…</p>
        </div>
      </Page>
    );
  }

  if (status === 'menu') {
    const briefing = briefingModuleId ? modulesData.find((m) => m.id === briefingModuleId) : null;
    return (
      <AnimatePresence mode="wait">
        {briefing ? (
          <motion.div key="briefing" variants={vista} initial="inicial" animate="visible" exit="salida">
            <Page>
              <ScenarioBriefing
                module={briefing}
                modules={modulesData}
                catalog={catalog}
                onBack={() => setBriefingModuleId(null)}
                onStart={() => {
                  setBriefingModuleId(null);
                  startModule(briefing.id);
                }}
              />
            </Page>
          </motion.div>
        ) : (
          <ModuleMenu
            progreso={progreso}
            onPick={(moduleId) => {
              // Se recarga la configuración al abrir cada módulo, para que un
              // cambio del entrenador se note sin recargar la página.
              reloadConfig();
              setBriefingModuleId(moduleId);
            }}
          />
        )}
      </AnimatePresence>
    );
  }

  return (
    // Altura fija de pantalla (`dvh` para que la barra de URL del móvil no la
    // falsee) y sin scroll de página: el desplazamiento y el zoom ocurren dentro
    // del simulador.
    <div className="frame flex h-[100dvh] flex-col overflow-hidden bg-surface">
      {status === 'completed' && <CompletedScreen />}
      <AnimatePresence>{showErrorModal && <ErrorToast key="error" />}</AnimatePresence>
      <AnimatePresence>
        {showScenario && currentModuleId && (
          <ScenarioDrawer
            moduleId={currentModuleId}
            modules={modulesData}
            catalog={catalog}
            onClose={() => setShowScenario(false)}
          />
        )}
      </AnimatePresence>
      <SimulatorHeader onShowScenario={() => setShowScenario(true)} />
      <SimulatorViewport>
        {/* El clic de fondo va aquí dentro, no sobre toda el área: así
            desplazarse o hacer zoom en móvil no cuenta como paso fallido. */}
        <div onClick={() => handleInteract('background')} className="flex h-full w-full flex-col">
          <PrismShell url="sp4mj0jy4j1:8080/prism.shtml">
            <ScreenManager />
          </PrismShell>
        </div>
      </SimulatorViewport>
    </div>
  );
};
