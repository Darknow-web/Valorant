import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useSimulator } from '../store/SimulatorContext';
import { StudentInfoModal } from './StudentInfoModal';
import { PreambuloHistoria } from './PreambuloHistoria';
import { ScenarioBriefing, ScenarioDrawer } from './ScenarioBriefing';
import { RankingColaboradores } from './RankingColaboradores';
import { SeleccionPersonaje } from './SeleccionPersonaje';
import { todosLosPersonajes, urlDePersonaje } from '../lib/personajes';
import { SimulatorHeader } from './SimulatorHeader';
import { SimulatorViewport } from './SimulatorViewport';
import { ScreenManager } from './ScreenManager';
import { PrismShell } from './ui/PrismUI';
import { Badge, Button, Card, CifraAnimada, Isotipo, Notice, Page } from './ui/Kit';
import { scenarios } from '../data/scenarios';
import { TramoDelTurno } from '../types';
import { aviso, cascada, elemento, modal, tarjetaInteractiva, vista } from '../lib/motion';
import { lanzarConfeti } from '../lib/confeti';
import { GatoAnimando, Huella, PerroFeliz } from './ui/Mascotas';
import {
  Progreso,
  PROGRESO_VACIO,
  intentosRestantes,
  modulosPorReforzar,
  modulosRepetibles,
  obtenerProgreso,
  puedeEntrar,
  puedeReiniciar,
} from '../lib/progreso';
import { EstadoModuloGuardado, leerEstadoModulo, marcarBandera, reiniciarCapacitacion } from '../lib/estadoModulo';
import {
  iconoDeCelebracion,
  iconoDeError,
  iconoDeModulo,
  iconoFinalAnimo,
  iconoFinalCelebracion,
  ilustracionHistoria,
} from '../assets/iconos';

/**
 * Resumen del intento, con la nota que calculó el servidor.
 *
 * Si aprobó, cae confeti y aparece el perrito; si no, un gatito y un mensaje que
 * invita a repetirlo. Nunca se regaña: el objetivo es que vuelva a intentarlo.
 */
const CompletedScreen = ({ quedanIntentos }: { quedanIntentos: number }) => {
  const { exitModule, errors, startTime, endTime, submitScore, score, approved, syncStatus, syncMessage,
    completedModules } = useSimulator();
  // La ocasión es el número de módulos ya completados: así cada módulo que
  // aprueba trae un icono distinto, y el mismo intento muestra siempre el mismo.
  const iconoLogro = iconoDeCelebracion(completedModules.length);
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
          {approved !== false && iconoLogro ? (
            <img src={iconoLogro} alt="" aria-hidden className="h-36 w-36 object-contain" />
          ) : approved === false ? (
            <GatoAnimando />
          ) : (
            <PerroFeliz />
          )}
        </motion.div>

        <h2 className="text-2xl font-extrabold text-ink">
          {esperando ? 'Módulo completado' : approved ? '¡Muy bien!' : 'Casi lo tienes'}
        </h2>
        <p className="prosa mx-auto mb-6 mt-1 text-sm text-ink-muted">
          {esperando
            ? 'Terminaste el proceso.'
            : approved
              ? 'Aprobaste este módulo. Así se hace en tienda.'
              : quedanIntentos > 0
                ? 'Todavía no llegas a la nota mínima. Te queda una repetición: se guarda tu mejor intento, así que solo puedes mejorar.'
                : 'Todavía no llegas a la nota mínima y ya usaste tus dos oportunidades en este módulo. Se guarda tu mejor intento.'}
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
          {approved === false && quedanIntentos > 0 ? 'Volver e intentarlo otra vez' : 'Volver a los módulos'}
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
const ErrorToast = ({ puedeReiniciarModulo }: { key?: string; puedeReiniciarModulo: boolean }) => {
  const {
    dismissErrorModal, customErrorMessage, triggerHint, currentStep, hintActive,
    fallosSeguidos, restartModule, reacomodarPantallas, errors,
  } = useSimulator();

  // Un icono de ánimo distinto en cada equivocación. Se deriva del contador de
  // errores en vez de guardarse en estado: así cambia aunque el aviso ya esté
  // abierto, y siempre sale el mismo para el mismo error.
  const iconoAnimo = iconoDeError(errors);

  if (!currentStep) return null;

  // Tres fallos seguidos contra el mismo paso: repetir el mismo aviso ya no
  // ayuda. Se le ofrecen las salidas reales en vez de dejarlo insistiendo.
  const atascado = fallosSeguidos >= 3;

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
            {iconoAnimo ? (
              <motion.img
                key={iconoAnimo}
                src={iconoAnimo}
                alt=""
                aria-hidden
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="-my-1 h-24 w-24 shrink-0 object-contain"
              />
            ) : (
              <span
                aria-hidden
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warn-soft text-sm font-bold text-warn"
              >
                !
              </span>
            )}
            <div>
              <h2 className="text-sm font-bold text-ink">
                {atascado ? 'Se te atoró aquí' : 'Ese no era el paso'}
              </h2>
              <p className="prosa mt-1 text-sm text-ink-muted">
                {atascado
                  ? 'Llevas varios intentos en el mismo paso. Puedes ver la pista, o reacomodar las pantallas si crees que algo se quedó trabado: eso no te cuesta nada.'
                  : customErrorMessage || 'Revisa la situación de la tienda y vuelve a intentarlo.'}
              </p>
            </div>
          </div>

          {hintActive && (
            <div className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-sm text-ink">
              <span className="font-semibold text-warn">Pista: </span>
              {currentStep.hintMessage || currentStep.instruction}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {!hintActive && (
              <Button variant="secondary" onClick={triggerHint} className="flex-1 py-2 text-xs">
                Ver pista
              </Button>
            )}
            {atascado && (
              <Button
                variant="secondary"
                onClick={() => {
                  reacomodarPantallas();
                  dismissErrorModal();
                }}
                className="flex-1 py-2 text-xs"
              >
                Reacomodar
              </Button>
            )}
            {atascado && puedeReiniciarModulo && (
              <Button
                variant="secondary"
                onClick={() => {
                  restartModule();
                  dismissErrorModal();
                }}
                className="flex-1 py-2 text-xs"
                title="Empiezas de cero y gasta tu repetición."
              >
                Volver a empezar
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

const TRAMOS: { id: TramoDelTurno; titulo: string; hora: string }[] = [
  { id: 'manana', titulo: 'La mañana', hora: '8:45 a. m. — mediodía' },
  { id: 'tarde', titulo: 'La tarde', hora: 'Mediodía — 7:00 p. m.' },
  { id: 'cierre', titulo: 'El cierre', hora: '7:00 p. m. — fin de turno' },
];

/**
 * El aviso de cierre, como última escena del relato.
 *
 * Va al final del menú y NO en una ventana emergente, por dos razones. Una
 * emergente taparía justo la lista de módulos que este bloque le está
 * ofreciendo repetir, obligándole a cerrarla para hacer lo que ella misma
 * propone. Y una emergente que aparece sola al volver al menú es el patrón que
 * ya dio problemas antes (la celebración que se relanzaba en cada regreso).
 */
const AvisoDeCierre = ({
  progreso,
  tienda,
  repetibles,
  onFinalizar,
  onReiniciarTodo,
}: {
  progreso: Progreso;
  tienda: string;
  repetibles: number;
  onFinalizar: () => void;
  onReiniciarTodo: () => void;
}) => {
  const [confirmandoReinicio, setConfirmandoReinicio] = useState(false);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-12 overflow-hidden rounded-3xl bg-navy px-6 py-8 text-white shadow-[0_20px_50px_-24px_rgba(6,6,67,0.6)] sm:px-9 sm:py-10"
    >
      <p className="etiqueta text-sand">9:12 p. m. · {tienda || 'tu tienda'}</p>
      <h2 className="mt-2 text-balance text-3xl font-extrabold leading-tight sm:text-4xl">
        La reja está abajo y la caja cuadrada.
      </h2>
      <p className="prosa mt-3 text-white/75">
        {repetibles > 0
          ? `Hiciste los ${Object.keys(progreso.modulos).length} momentos del turno. Te queda una repetición en ${
              repetibles === 1 ? 'un módulo' : `${repetibles} módulos`
            }: puedes usarla para subir tu nota, o cerrar el turno y quedarte con la que tienes.`
          : `Hiciste los ${Object.keys(progreso.modulos).length} momentos del turno y ya usaste todas tus oportunidades. Solo queda cerrar el turno.`}
      </p>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button onClick={onFinalizar}>Cerrar el turno</Button>
        {repetibles > 0 && (
          <p className="text-sm text-white/60">
            …o sube a un módulo de arriba y vuelve a entrar. Tu mejor intento es el que cuenta.
          </p>
        )}
      </div>

      <div className="mt-7 border-t border-white/15 pt-4">
        {confirmandoReinicio ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <p className="min-w-0 flex-1 text-white/75">
              Empiezas la capacitación desde cero, con todas tus oportunidades de vuelta.{' '}
              <span className="font-semibold text-sand">Las notas que ya enviaste quedan guardadas</span> en el panel
              de tu entrenador; solo dejan de contar para tu avance.
            </p>
            <button
              onClick={onReiniciarTodo}
              className="rounded-lg bg-brand px-3 py-1.5 font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              Sí, empezar de cero
            </button>
            <button
              onClick={() => setConfirmandoReinicio(false)}
              className="rounded-lg border border-white/25 px-3 py-1.5 font-semibold text-white/75 transition-colors hover:bg-white/10"
            >
              Mejor no
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmandoReinicio(true)}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-white/55 underline-offset-4 hover:text-white hover:underline"
          >
            Reiniciar toda la capacitación
          </button>
        )}
      </div>
    </motion.section>
  );
};

/**
 * El telón: pantalla completa al cerrar el turno.
 *
 * Es deliberadamente distinta de la celebración de un módulo —a pantalla
 * completa, con su propia entrada y un confeti más largo—, porque cerrar la
 * capacitación no puede sentirse igual que aprobar el módulo 7.
 */
const TelonFinal = ({
  progreso,
  titulos,
  tienda,
  onVolver,
}: {
  progreso: Progreso;
  titulos: { id: string; title: string }[];
  tienda: string;
  onVolver: () => void;
}) => {
  const aprobado = progreso.aprobado;
  const porReforzar = modulosPorReforzar(progreso, titulos.map((m) => m.id));
  const ilustracion = ilustracionHistoria('cierre');
  const icono = aprobado ? iconoFinalCelebracion() : iconoFinalAnimo();

  useEffect(() => {
    if (!aprobado) return;
    // Más largo y más denso que el de un módulo: es el final del recorrido.
    const detener = lanzarConfeti({ duracion: 4200, cantidad: 200 });
    return detener;
  }, [aprobado]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="frame min-h-[100dvh] overflow-y-auto bg-navy text-white"
    >
      <div className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col justify-center px-5 py-14 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: aprobado ? -8 : 0 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={
            aprobado
              ? { type: 'spring', stiffness: 220, damping: 12, delay: 0.15 }
              : { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }
          }
          className="mx-auto mb-6 w-fit"
        >
          {icono ? (
            // Aprobado: late de alegría. No aprobado: respira despacio, que es
            // aliento y no fiesta.
            <motion.img
              src={icono}
              alt=""
              aria-hidden
              animate={aprobado ? { scale: [1, 1.06, 1] } : { scale: [1, 1.03, 1] }}
              transition={{
                duration: aprobado ? 1.6 : 3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.9,
              }}
              className="h-40 w-40 object-contain sm:h-48 sm:w-48"
            />
          ) : aprobado ? (
            <PerroFeliz className="h-32 w-32" />
          ) : (
            <GatoAnimando className="h-32 w-32" />
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <p className="etiqueta text-sand">
            {aprobado ? 'Capacitación completa' : `Fin del turno · ${tienda || 'tu tienda'}`}
          </p>
          <h1 className="mt-2 text-balance text-4xl font-extrabold leading-tight sm:text-5xl">
            {aprobado ? '¡Felicitaciones!' : 'Buen turno. Falta poco.'}
          </h1>
          <p className="prosa mx-auto mt-4 text-white/75">
            {aprobado
              ? 'Completaste toda la capacitación de caja con nota aprobatoria. Estás listo para el mostrador.'
              : 'Cerraste el turno completo, y eso ya es mucho. Para aprobar te falta subir el promedio: mira abajo qué conviene reforzar y habla con tu entrenador. Nadie aprende la caja en un día.'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.65, type: 'spring', stiffness: 200, damping: 18 }}
          className="mx-auto mt-8 w-fit rounded-2xl bg-raised px-10 py-6"
        >
          <div className="etiqueta text-ink-subtle">Tu nota final</div>
          <div className="cifra mt-1 text-6xl font-extrabold leading-none tracking-tight text-navy">
            <CifraAnimada valor={progreso.promedio ?? 0} />
          </div>
          <div className="mt-1 text-sm text-ink-muted">
            de {progreso.notaMaxima} · se aprueba con <span className="cifra">{progreso.notaMinima}</span>
          </div>
        </motion.div>

        <p className="mt-4 text-xs text-white/55">Promedio del mejor intento de cada módulo.</p>

        {!aprobado && porReforzar.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
            className="mx-auto mt-7 w-full max-w-md rounded-xl bg-raised px-5 py-4 text-left"
          >
            <p className="etiqueta mb-2 flex items-center gap-2 text-warn">
              <Huella /> Lo que conviene reforzar
            </p>
            <ul className="space-y-1 text-sm text-ink">
              {porReforzar.map((id) => {
                const mod = titulos.find((m) => m.id === id);
                return <li key={id}>· {mod?.title || id}</li>;
              })}
            </ul>
          </motion.div>
        )}

        {/* La tienda cerrada de noche: el turno terminó. Cierra el relato que
            abrió el preámbulo con la tienda amaneciendo, y es lo último que ve
            el colaborador antes de salir. */}
        {ilustracion && (
          <motion.img
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            src={ilustracion}
            alt=""
            aria-hidden
            className="mx-auto mt-9 max-h-[32vh] w-auto max-w-full rounded-2xl object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
          />
        )}

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          onClick={onVolver}
          className="mx-auto mt-7 inline-flex min-h-11 items-center text-sm font-semibold text-white/60 underline-offset-4 hover:text-white hover:underline"
        >
          Volver a la lista de módulos
        </motion.button>
      </div>
    </motion.div>
  );
};

const ModuleMenu = ({
  onPick,
  progreso,
  onFinalizar,
  onReiniciarTodo,
  onVerRanking,
  onCambiarPersonaje,
}: {
  onPick: (moduleId: string) => void;
  progreso: Progreso;
  onFinalizar: () => void;
  onReiniciarTodo: () => void;
  onVerRanking: () => void;
  onCambiarPersonaje: () => void;
}) => {
  const { modulesData, operatorName, operatorStore, clearOperator, operatorPersonaje, personajesSubidos } =
    useSimulator();
  const avatar = urlDePersonaje(operatorPersonaje, personajesSubidos);
  const total = modulesData.length;
  // El avance sale de las notas guardadas en el servidor, no de esta sesión:
  // así sigue ahí aunque el colaborador entre desde otro equipo.
  const hechos = Object.keys(progreso.modulos).length;
  const promedio = progreso.promedio;
  const repetibles = modulosRepetibles(progreso, modulesData.map((m) => m.id)).length;

  const porTramo = useMemo(() => {
    const mapa = new Map<TramoDelTurno, typeof modulesData>();
    for (const mod of modulesData) {
      const tramo = scenarios.find((s) => s.moduleId === mod.id)?.tramo || 'manana';
      if (!mapa.has(tramo)) mapa.set(tramo, []);
      mapa.get(tramo)!.push(mod);
    }
    return mapa;
  }, [modulesData]);

  const tarjeta = (mod: (typeof modulesData)[number]) => {
    const mejor = progreso.modulos[mod.id];
    const aMedias = progreso.aMedias[mod.id];
    const restantes = intentosRestantes(progreso, mod.id);
    const abierto = puedeEntrar(progreso, mod.id);
    const scenario = scenarios.find((s) => s.moduleId === mod.id);
    const numero = mod.title.match(/M[oó]dulo (\d+)/)?.[1] ?? '';
    const icono = iconoDeModulo(mod.id);
    const nombre = mod.title.replace(/^M[oó]dulo \d+\s*—\s*/, '');

    return (
      <motion.button
        key={mod.id}
        variants={elemento}
        {...(abierto ? tarjetaInteractiva : {})}
        disabled={!abierto}
        onClick={() => abierto && onPick(mod.id)}
        // El título va partido en dos para la jerarquía visual; la etiqueta
        // accesible lo mantiene completo para quien navegue con lector de pantalla.
        aria-label={`${mod.title}${mejor ? ` (nota ${mejor.score})` : ''}${abierto ? '' : ' (sin oportunidades)'}`}
        className={cnCard(!!mejor, abierto)}
      >
        <div className="mb-2.5 flex items-start justify-between gap-2">
          {icono ? (
            <img
              src={icono}
              alt=""
              aria-hidden
              className="h-16 w-16 shrink-0 rounded-xl object-contain sm:h-[4.5rem] sm:w-[4.5rem]"
              loading="lazy"
            />
          ) : (
            <span className="cifra text-2xl font-extrabold leading-none tracking-tight text-line-strong">
              {numero}
            </span>
          )}
          {mejor && (
            <Badge tone={mejor.approved ? 'ok' : 'warn'}>
              <span className="cifra">{mejor.score}</span>
              {mejor.approved ? ' ✓' : ''}
            </Badge>
          )}
        </div>

        {icono && <p className="etiqueta mb-0.5 text-ink-subtle">Módulo {numero}</p>}
        {scenario && (
          <h3 className="text-balance text-[17px] font-bold leading-snug text-navy">{scenario.titulo}</h3>
        )}
        <p className="mt-1 text-sm leading-snug text-ink-muted">{nombre}</p>

        {/* Estado del módulo: a medias, con repetición disponible, o agotado.
            Es lo que evita que el colaborador gaste su última oportunidad sin
            saber que era la última. */}
        <p className="mt-3 text-xs font-semibold">
          {aMedias ? (
            <span className="text-brand">
              A medias · paso {aMedias.currentStepIndex + 1} de {aMedias.totalPasos || mod.steps.length}
            </span>
          ) : !abierto ? (
            <span className="text-ink-subtle">Sin oportunidades · nota final {mejor?.score ?? '—'}</span>
          ) : restantes === 1 && mejor ? (
            <span className="text-warn">Te queda 1 repetición</span>
          ) : (
            <span className="text-ink-subtle">
              {mod.steps.length} <span className="sm:hidden">acciones</span>
              <span className="hidden sm:inline">acciones en el sistema</span>
            </span>
          )}
        </p>
      </motion.button>
    );
  };

  return (
    <Page className="px-4 pb-16 pt-7 sm:pt-10">
      <motion.div variants={vista} initial="inicial" animate="visible" className="mx-auto max-w-5xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-5 sm:mb-10 sm:gap-6">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <Isotipo className="h-10 w-10" />
              <span className="etiqueta text-brand">SuperPet · Capacitación</span>
            </div>
            <h1 className="text-[2rem] font-extrabold leading-tight text-ink sm:text-4xl">Tu turno en la caja</h1>
            <p className="prosa mt-2 text-ink-muted">
              Un turno completo, de la apertura al cierre. Lees lo que pasa en el mostrador, sacas de ahí los datos y
              lo resuelves en el sistema. No hay instrucciones paso a paso.
            </p>
          </div>

          {/* La nota final es el promedio, así que es ella la que manda aquí:
              el contador de módulos pasa a ser el dato de apoyo. */}
          <div className="w-full rounded-2xl border border-line bg-raised px-5 py-4 sm:w-auto sm:min-w-[13rem]">
            <div className="etiqueta text-ink-subtle">{promedio !== null ? 'Tu promedio' : 'Tu avance'}</div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="cifra text-4xl font-extrabold leading-none tracking-tight text-navy">
                {promedio !== null ? promedio : `${hechos}/${total}`}
              </span>
              {promedio !== null && (
                <span className="text-sm font-semibold text-ink-subtle">de {progreso.notaMaxima}</span>
              )}
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
                <motion.div
                  className="h-full rounded-full bg-brand"
                  initial={{ width: 0 }}
                  animate={{ width: `${total ? (hechos / total) * 100 : 0}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className="cifra shrink-0 text-xs font-semibold text-ink-subtle">
                {hechos}/{total}
              </span>
            </div>

            {/* El ranking se abre desde aquí y no desde el final de la lista:
                en celular, el pie del menú queda a catorce tarjetas de
                distancia y nadie baja hasta allí. */}
            <button
              onClick={onVerRanking}
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line-strong px-3 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft"
            >
              <span aria-hidden>🏆</span> Ver el ranking
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          {/* Su personaje, y la puerta para cambiarlo: tocarlo lleva de vuelta a
              la pantalla de elección. Con `title` y `aria-label` porque un
              avatar sin nombre no le dice nada a quien usa lector de pantalla. */}
          {avatar && (
            <button
              onClick={onCambiarPersonaje}
              title="Cambiar mi personaje"
              aria-label="Cambiar mi personaje"
              className="-ml-1 shrink-0 rounded-full border-2 border-transparent p-0.5 transition hover:border-brand"
            >
              <img src={avatar} alt="" aria-hidden className="h-11 w-11 rounded-full object-contain" />
            </button>
          )}
          <span>
            Colaborador: <span className="font-semibold text-ink">{operatorName}</span>
          </span>
          {operatorStore && <Badge tone="sand">{operatorStore}</Badge>}
          <button onClick={clearOperator} className="inline-flex min-h-11 items-center px-1 font-semibold text-brand hover:underline">
            Cambiar
          </button>
        </div>

        {/* Los módulos van agrupados por momento del turno: es la misma lista de
            siempre, pero leída como una jornada y no como catorce ejercicios. */}
        {TRAMOS.map((tramo) => {
          const modulos = porTramo.get(tramo.id) || [];
          if (!modulos.length) return null;
          return (
            <section key={tramo.id} className="mb-9">
              <div className="mb-3 flex items-baseline gap-3 border-b border-line pb-2">
                <h2 className="text-lg font-extrabold text-navy">{tramo.titulo}</h2>
                <span className="etiqueta text-ink-subtle">{tramo.hora}</span>
              </div>
              <motion.div
                variants={cascada()}
                initial="inicial"
                animate="visible"
                className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
              >
                {modulos.map(tarjeta)}
              </motion.div>
            </section>
          );
        })}

        {hechos === total && total > 0 && (
          <AvisoDeCierre
            progreso={progreso}
            tienda={operatorStore}
            repetibles={repetibles}
            onFinalizar={onFinalizar}
            onReiniciarTodo={onReiniciarTodo}
          />
        )}
      </motion.div>
    </Page>
  );
};

const cnCard = (completado: boolean, abierto: boolean) =>
  `relative overflow-hidden rounded-2xl border bg-raised p-4 text-left sm:p-5 shadow-[0_1px_2px_rgba(6,6,67,0.06)] transition-all ${
    abierto
      ? 'hover:border-brand/35 hover:shadow-[0_10px_28px_-12px_rgba(6,6,67,0.22)]'
      : 'cursor-not-allowed opacity-60'
  } ${completado ? 'border-ok/30' : 'border-line'}`;

export const StudentApp = ({ teacherUsername }: { teacherUsername: string }) => {
  const {
    status, startModule, modulesData, showErrorModal, handleInteract, currentModuleId,
    operatorName, operatorDni, operatorStore, catalog, configLoading, teacherMissing, reloadConfig,
    intentosGastados, operatorPersonaje, setOperatorPersonaje, personajesSubidos,
  } = useSimulator();
  const [briefingModuleId, setBriefingModuleId] = useState<string | null>(null);
  const [estadoGuardado, setEstadoGuardado] = useState<EstadoModuloGuardado | null>(null);
  const [showScenario, setShowScenario] = useState(false);
  const [progreso, setProgreso] = useState<Progreso>(PROGRESO_VACIO);
  const [progresoCargado, setProgresoCargado] = useState(false);
  const [preambuloListo, setPreambuloListo] = useState(false);
  const [verTelon, setVerTelon] = useState(false);
  const [verRanking, setVerRanking] = useState(false);
  // Solo cuando vuelve a la pantalla a CAMBIAR el personaje que ya tenía.
  const [cambiarPersonaje, setCambiarPersonaje] = useState(false);

  const identidad = { teacher: teacherUsername, dni: operatorDni };

  const recargarProgreso = useCallback(async () => {
    if (!operatorDni) return;
    const p = await obtenerProgreso(teacherUsername, operatorDni);
    setProgreso(p);
    setProgresoCargado(true);
  }, [teacherUsername, operatorDni]);

  // El progreso se recarga al volver al menú, para que la nota del módulo que
  // acaba de terminar ya aparezca en su tarjeta.
  useEffect(() => {
    if (status !== 'menu' || !operatorDni) return;
    let cancelado = false;
    obtenerProgreso(teacherUsername, operatorDni).then((p) => {
      if (cancelado) return;
      setProgreso(p);
      setProgresoCargado(true);
    });
    return () => {
      cancelado = true;
    };
  }, [status, teacherUsername, operatorDni]);

  // El avatar guardado en el servidor se adopta UNA sola vez, al entrar.
  //
  // Es lo que hace que siga siendo el suyo al abrir desde otro equipo, donde el
  // navegador no sabe nada de él. Pero solo al entrar: dejándolo pendiente del
  // progreso, cambiar de personaje se deshacía solo, porque el progreso todavía
  // traía el anterior y volvía a imponerlo encima del recién elegido.
  const personajeAdoptado = useRef('');
  useEffect(() => {
    if (!progresoCargado || !operatorDni) return;
    if (personajeAdoptado.current === operatorDni) return;
    personajeAdoptado.current = operatorDni;
    if (progreso.personaje && progreso.personaje !== operatorPersonaje) {
      setOperatorPersonaje(progreso.personaje);
    }
  }, [progresoCargado, operatorDni, progreso.personaje, operatorPersonaje, setOperatorPersonaje]);

  // Gastar un intento (pulsar «Volver a empezar») cambia lo que el colaborador
  // puede hacer AHORA MISMO, sin salir del módulo: hay que releer el progreso en
  // el momento, no al volver al menú.
  useEffect(() => {
    if (intentosGastados === 0) return;
    recargarProgreso();
  }, [intentosGastados, recargarProgreso]);

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
  if (configLoading || !progresoCargado) {
    return (
      <Page className="flex items-center justify-center p-4">
        <div className="text-center">
          <Isotipo className="mx-auto mb-4 h-12 w-12 animate-pulse" />
          <p className="text-sm text-ink-muted">Cargando tus módulos…</p>
        </div>
      </Page>
    );
  }

  // El personaje, antes del relato: el preámbulo le habla de tú, así que tiene
  // más sentido que ya se haya elegido a sí mismo cuando eso pasa. Vuelve a
  // salir si el que tenía elegido ya no existe (el administrador lo quitó).
  const personajesDisponibles = todosLosPersonajes(personajesSubidos);
  const suPersonajeExiste = !!urlDePersonaje(operatorPersonaje, personajesSubidos);
  if (personajesDisponibles.length > 0 && (!suPersonajeExiste || cambiarPersonaje)) {
    return (
      <SeleccionPersonaje
        personajes={personajesDisponibles}
        elegido={suPersonajeExiste ? operatorPersonaje : ''}
        nombre={operatorName}
        onElegir={(id) => {
          setOperatorPersonaje(id);
          setCambiarPersonaje(false);
        }}
        onCancelar={cambiarPersonaje ? () => setCambiarPersonaje(false) : undefined}
      />
    );
  }

  // La entrada del relato, una sola vez. La marca vive en el servidor, así que
  // no vuelve a salir aunque cambie de teléfono.
  if (!progreso.preambuloVisto && !preambuloListo) {
    return (
      <PreambuloHistoria
        nombre={operatorName}
        tienda={operatorStore}
        totalModulos={modulesData.length}
        onEmpezar={() => {
          setPreambuloListo(true);
          marcarBandera(identidad, { preambuloVisto: true });
          setProgreso((p) => ({ ...p, preambuloVisto: true }));
        }}
      />
    );
  }

  if (status === 'menu' && verRanking) {
    return (
      <Page>
        <RankingColaboradores
          dni={operatorDni}
          personajesSubidos={personajesSubidos}
          onVolver={() => setVerRanking(false)}
        />
      </Page>
    );
  }

  // El telón sale cuando el colaborador cierra el turno, y también al volver a
  // entrar si ya lo había cerrado: la capacitación tiene un final visible.
  if (status === 'menu' && (verTelon || (progreso.finalizado && !briefingModuleId))) {
    return (
      <TelonFinal
        progreso={progreso}
        titulos={modulesData}
        tienda={operatorStore}
        onVolver={() => {
          setVerTelon(false);
          if (progreso.finalizado) {
            marcarBandera(identidad, { finalizado: false });
            setProgreso((p) => ({ ...p, finalizado: false }));
          }
        }}
      />
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
                reanudar={estadoGuardado}
                intentosRestantes={intentosRestantes(progreso, briefing.id)}
                onBack={() => {
                  setBriefingModuleId(null);
                  setEstadoGuardado(null);
                }}
                onStart={() => {
                  setBriefingModuleId(null);
                  startModule(briefing.id, estadoGuardado);
                  setEstadoGuardado(null);
                }}
              />
            </Page>
          </motion.div>
        ) : (
          <ModuleMenu
            progreso={progreso}
            onFinalizar={() => {
              marcarBandera(identidad, { finalizado: true });
              setProgreso((p) => ({ ...p, finalizado: true }));
              setVerTelon(true);
            }}
            onVerRanking={() => setVerRanking(true)}
            onCambiarPersonaje={() => setCambiarPersonaje(true)}
            onReiniciarTodo={async () => {
              await reiniciarCapacitacion(identidad);
              setVerTelon(false);
              await recargarProgreso();
            }}
            onPick={async (moduleId) => {
              // Se recarga la configuración al abrir cada módulo, para que un
              // cambio del entrenador se note sin recargar la página.
              reloadConfig();
              setEstadoGuardado(
                await leerEstadoModulo({ teacher: teacherUsername, dni: operatorDni, moduleId })
              );
              setBriefingModuleId(moduleId);
            }}
          />
        )}
      </AnimatePresence>
    );
  }

  const puedeReiniciarModulo = !!currentModuleId && puedeReiniciar(progreso, currentModuleId);

  return (
    // Altura fija de pantalla (`dvh` para que la barra de URL del móvil no la
    // falsee) y sin scroll de página: el desplazamiento y el zoom ocurren dentro
    // del simulador.
    <div className="frame flex h-[100dvh] flex-col overflow-hidden bg-surface">
      {status === 'completed' && (
        <CompletedScreen quedanIntentos={currentModuleId ? intentosRestantes(progreso, currentModuleId) - 1 : 0} />
      )}
      <AnimatePresence>
        {showErrorModal && <ErrorToast key="error" puedeReiniciarModulo={puedeReiniciarModulo} />}
      </AnimatePresence>
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
      <SimulatorHeader onShowScenario={() => setShowScenario(true)} puedeReiniciar={puedeReiniciarModulo} />
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
