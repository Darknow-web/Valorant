import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { AppState, SimulationState, Step, ModuleData, StepDataMap } from '../types';
import { modulesData as defaultModulesData } from '../data/modules';
import { Catalog, cloneDefaultCatalog, normalizeCatalog } from '../data/catalog';
import { applyStepData } from '../lib/stepData';
import { newAttemptId } from '../lib/session';
import {
  EstadoModuloGuardado,
  borrarEstadoModulo,
  consumirIntento,
  guardarEstadoModulo,
} from '../lib/estadoModulo';

interface SimulatorContextType extends SimulationState {
  /** Empieza el módulo, o lo retoma donde quedó si se le pasa lo guardado. */
  startModule: (moduleId: string, reanudar?: EstadoModuloGuardado | null) => void;
  /**
   * Vuelve a empezar el módulo en curso desde cero: pantallas limpias, errores
   * y pistas borrados y cronómetro a cero. Gasta una oportunidad.
   */
  restartModule: () => void;
  /**
   * Recoloca las pantallas en lo que el paso en curso necesita, sin retroceder
   * pasos, sin borrar errores y sin gastar intento. Es la salida garantizada.
   */
  reacomodarPantallas: () => void;
  exitModule: () => void;
  handleInteract: (targetId: string, value?: string, isFinalSubmit?: boolean) => boolean | void;
  triggerCustomError: (message: string, points?: number) => void;
  triggerHint: () => void;
  setAppState: (update: Partial<AppState>) => void;
  setOperator: (name: string, dni: string, store: string) => void;
  clearOperator: () => void;
  submitScore: () => Promise<void>;
  currentStep: Step | null;
  moduleTitle: string;
  modulesData: ModuleData[];
  teacherUsername: string;
  /** Catálogo simulado ya con la configuración del entrenador aplicada. */
  catalog: Catalog;
  /** Mientras es true no se debe empezar ningún módulo: faltan datos del entrenador. */
  configLoading: boolean;
  /** El enlace apunta a un entrenador que no existe. */
  teacherMissing: boolean;
  /** Fallos seguidos contra el paso en curso: a partir de 3 se ofrece ayuda. */
  fallosSeguidos: number;
  /** El colaborador retomó un módulo que había dejado a medias. */
  reanudado: boolean;
  /**
   * Sube cada vez que se gasta un intento. Quien muestre el progreso lo observa
   * para volver a pedirlo: si no, «Volver a empezar» se seguiría ofreciendo
   * después de haber gastado la única repetición que había.
   */
  intentosGastados: number;
  reloadConfig: () => void;
  dismissErrorModal: () => void;
  customErrorMessage?: string;
}

const defaultAppState: AppState = {
  user: '',
  registerOpen: false,
  currentCustomer: null,
  cart: [],
  payments: [],
  comprobanteType: '03-BOL ELECT',
  selectedPaymentMethod: 'Efectivo',
  takeAmount: '',
  returnReason: '',
  returnItems: [],
  fondoCaja: '',
  storeCredit: 0,
  posTab: 'Venta',
};

const SimulatorContext = createContext<SimulatorContextType | undefined>(undefined);

/**
 * ¿Un campo de la pantalla coincide con lo que espera el paso?
 *
 * Compara por significado, no por texto. Antes se hacía `String(x ?? '')`, y
 * como `??` no atrapa el `false`, un booleano sin marcar se convertía en el
 * texto `'false'` y jamás coincidía con el `''` que esperaba el paso: eso hacía
 * imposibles los módulos 4 y 5, donde elegir "Tarjeta de Crédito" ya deja
 * `autorizacionForzada` en `false`.
 */
export function valuesMatch(actualRaw: unknown, expectedRaw: unknown): boolean {
  // `''`, `false`, `null` y `undefined` significan todos "vacío / sin marcar".
  const isEmpty = (v: unknown) =>
    v === undefined || v === null || v === false || (typeof v === 'string' && v.trim() === '');
  if (isEmpty(actualRaw) && isEmpty(expectedRaw)) return true;
  if (isEmpty(actualRaw) !== isEmpty(expectedRaw)) return false;

  // Casillas: se comparan como booleanos, no como texto.
  if (typeof actualRaw === 'boolean' || typeof expectedRaw === 'boolean') {
    const toBool = (v: unknown) => v === true || v === 'true';
    return toBool(actualRaw) === toBool(expectedRaw);
  }

  const actual = String(actualRaw).trim();
  const expected = String(expectedRaw).trim();
  if (actual === expected) return true;

  // Montos: 200 y 200.00 son el mismo importe.
  if (actual !== '' && expected !== '' && !isNaN(Number(actual)) && !isNaN(Number(expected))) {
    return Number(actual) === Number(expected);
  }
  return false;
}

/**
 * Deja el estado de las pantallas como el paso lo necesita para poder cumplirse.
 *
 * Es lo que sostiene los modales que el propio paso exige: los botones
 * "Cancelar" y "No" no pasan por la validación, apagan el flag y siguen, y hay
 * pasos —el crédito de tienda del Módulo 11— cuyo botón de reapertura vive en
 * una pantalla que ya quedó atrás.
 *
 * Vive fuera del componente porque lo usan dos cosas: el efecto que lo sostiene
 * solo, y el botón «Reacomodar pantallas», que es la salida garantizada cuando
 * algo queda en un sitio del que el colaborador no sabe volver.
 */
export function reencuadrarPaso(step: Step | null | undefined, appState: AppState): AppState {
  if (!step?.keepState) return appState;
  return { ...appState, ...step.keepState };
}

/**
 * Estado ESTORBO: ventanas abiertas y forma de pago a medio elegir.
 *
 * Es lo único que «Reacomodar pantallas» tiene derecho a tocar. Se distingue
 * del avance real —el carrito, el cliente, los pagos ya aplicados, el crédito
 * de tienda, la caja abierta— que NO se toca nunca: eso es trabajo hecho y
 * borrarlo sería castigar al colaborador por pedir ayuda.
 */
const ESTADO_ESTORBO: Partial<AppState> = {
  showAuthModal: false,
  showNCTransferenciaModal: false,
  showStoreCreditModal: false,
  showNewCustomerModal: false,
  showPriceLevelModal: false,
  authCode: '',
  pendingCustomer: null,
  // La forma de pago vuelve a Efectivo, que es de donde salen todos los caminos.
  // Sin esto, pulsar RAPPI o «NC TRANSFERENCIA» por error en un módulo de venta
  // normal escondía el campo del importe y dejaba el paso imposible de cumplir.
  selectedPaymentMethod: 'Efectivo',
  takeAmount: '',
  cardType: '',
  tipoProcesamiento: 'Manual',
  e115: '',
  e116: '',
  noAutorizacion: '',
  autorizacionForzada: false,
  // Los pagos aplicados por error también estorban, y mucho: el mismo hueco de
  // la pantalla muestra «Pago» o «Vuelto» según si lo cobrado ya cubre el
  // documento. Un importe disparatado aplicado sin querer convertía el botón
  // «Pago» en «Vuelto» y el paso que pedía aplicar el pago se volvía imposible.
  // Se vacían: el colaborador vuelve a cobrar, que es lo que dice su caso.
  payments: [],
  vueltoGiven: false,
  // La pestaña del punto de venta. Irse a «Devolución» en un módulo de venta
  // normal escondía la búsqueda de artículos y del cliente.
  posTab: 'Venta',
};

/**
 * Devuelve las pantallas al estado desde el que el paso en curso SÍ se puede
 * completar, sin retroceder pasos ni borrar el avance de la transacción.
 *
 * Es la salida garantizada. Primero se quita el estorbo (ventanas abiertas,
 * forma de pago a medias) y después se repone lo que el propio paso exige, que
 * puede ser justamente una de esas ventanas.
 */
export function reacomodarParaElPaso(step: Step | null | undefined, appState: AppState): AppState {
  return reencuadrarPaso(step, { ...appState, ...ESTADO_ESTORBO });
}

const formatElapsed = (startTime: number | null) => {
  if (!startTime) return '00:00';
  const secs = Math.floor((Date.now() - startTime) / 1000);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

export const SimulatorProvider = ({
  children,
  teacherUsername = '',
}: {
  children: ReactNode;
  teacherUsername?: string;
}) => {
  const [modulesData, setModules] = useState<ModuleData[]>(defaultModulesData);
  const [catalog, setCatalog] = useState<Catalog>(cloneDefaultCatalog);
  const [configLoading, setConfigLoading] = useState(!!teacherUsername);
  const [teacherMissing, setTeacherMissing] = useState(false);
  const [configVersion, setConfigVersion] = useState(0);

  const reloadConfig = useCallback(() => setConfigVersion((v) => v + 1), []);

  // Los módulos (pasos, acciones y validadores) viven en el código; del servidor
  // solo llegan los DATOS que el entrenador configuró y su catálogo de tienda.
  //
  // Hasta que esto termine, `configLoading` impide empezar un módulo: antes se
  // podía arrancar con los valores por defecto y recibir los del entrenador a
  // media simulación, dejando la situación diciendo una cosa y la validación
  // esperando otra.
  useEffect(() => {
    if (!teacherUsername) {
      setModules(defaultModulesData);
      setCatalog(cloneDefaultCatalog());
      setConfigLoading(false);
      return;
    }
    let cancelled = false;
    setConfigLoading(true);
    fetch(`/api/step-data?teacher=${encodeURIComponent(teacherUsername)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const overrides: StepDataMap = data?.stepData || {};
        setModules(applyStepData(defaultModulesData, overrides));
        setCatalog(normalizeCatalog(data?.catalog));
        setTeacherMissing(data ? data.teacherExists === false : false);
      })
      .catch(() => {
        if (cancelled) return;
        setModules(defaultModulesData);
        setCatalog(cloneDefaultCatalog());
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teacherUsername, configVersion]);

  const [state, setState] = useState<SimulationState>({
    status: 'menu',
    currentModuleId: null,
    currentStepIndex: 0,
    errors: 0,
    startTime: null,
    endTime: null,
    completedModules: [],
    feedback: null,
    hintActive: false,
    appState: { ...defaultAppState },
    operatorName: typeof window !== 'undefined' ? localStorage.getItem('operatorName') || '' : '',
    operatorDni: typeof window !== 'undefined' ? localStorage.getItem('operatorDni') || '' : '',
    operatorStore: typeof window !== 'undefined' ? localStorage.getItem('operatorStore') || '' : '',
    attemptId: null,
    mistakeLog: [],
    processSteps: [],
    score: null,
    approved: null,
    syncStatus: 'idle',
    syncMessage: '',
    showErrorModal: false,
  });

  // Espejo del estado para que los manejadores no lean valores obsoletos.
  const stateRef = useRef(state);
  stateRef.current = state;

  const modulesRef = useRef(modulesData);
  modulesRef.current = modulesData;

  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;

  const currentModule = modulesData.find((m) => m.id === state.currentModuleId);
  const currentStep = currentModule ? currentModule.steps[state.currentStepIndex] : null;

  const setOperator = (name: string, dni: string, store: string) => {
    localStorage.setItem('operatorName', name);
    localStorage.setItem('operatorDni', dni);
    localStorage.setItem('operatorStore', store);
    setState((prev) => ({ ...prev, operatorName: name, operatorDni: dni, operatorStore: store }));
  };

  const clearOperator = () => {
    localStorage.removeItem('operatorName');
    localStorage.removeItem('operatorDni');
    localStorage.removeItem('operatorStore');
    setState((prev) => ({
      ...prev,
      operatorName: '',
      operatorDni: '',
      operatorStore: '',
      status: 'menu',
      currentModuleId: null,
      completedModules: [],
    }));
  };

  /**
   * Las pantallas tal como las encuentra el colaborador al empezar el módulo.
   *
   * Todos los módulos posteriores a la apertura de caja arrancan con la caja ya
   * abierta; solo el 1 (ingreso) y el 2 (apertura) empiezan con ella cerrada.
   */
  const pantallasIniciales = (moduleId: string): AppState => {
    const inicial = { ...defaultAppState };
    if (moduleId !== 'm1' && moduleId !== 'm2') {
      inicial.registerOpen = true;
      inicial.fondoCaja = catalogRef.current.fondoCajaInicial;
    }
    return inicial;
  };

  /** Identidad para guardar el avance en el servidor. */
  const identidad = (moduleId: string) => ({
    teacher: teacherUsername,
    dni: stateRef.current.operatorDni,
    moduleId,
  });

  const [reanudado, setReanudado] = useState(false);
  const [intentosGastados, setIntentosGastados] = useState(0);

  const startModule = (moduleId: string, reanudar?: EstadoModuloGuardado | null) => {
    currentStepIndexRef.current = reanudar?.currentStepIndex ?? 0;
    advancingRef.current = false;
    setFallosSeguidos(0);
    setReanudado(!!reanudar);

    // Retomar un módulo a medias NO gasta intento y NO limpia errores: es el
    // mismo intento, que sigue justo donde lo dejó.
    const inicio = reanudar
      ? Date.now() - (Number(reanudar.elapsedMs) || 0)
      : Date.now();

    setState((prev) => ({
      ...prev,
      status: 'running',
      currentModuleId: moduleId,
      currentStepIndex: reanudar?.currentStepIndex ?? 0,
      errors: reanudar?.errors ?? 0,
      startTime: inicio,
      endTime: null,
      feedback: null,
      hintActive: false,
      appState: reanudar?.appState
        ? { ...pantallasIniciales(moduleId), ...reanudar.appState }
        : pantallasIniciales(moduleId),
      attemptId: reanudar?.attemptId || newAttemptId(),
      mistakeLog: reanudar?.mistakeLog ?? [],
      processSteps: reanudar?.processSteps?.length
        ? [...reanudar.processSteps, { action: 'Retomó el módulo', time: formatElapsed(inicio) }]
        : [{ action: 'Inicio del módulo', time: '00:00' }],
      score: null,
      approved: null,
      syncStatus: 'idle',
      syncMessage: '',
      showErrorModal: false,
      customErrorMessage: undefined,
    }));
  };

  /**
   * Vuelve a empezar el módulo desde cero: paso 1, pantallas limpias, errores y
   * pistas borrados y cronómetro a cero.
   *
   * Gasta una de las dos oportunidades del módulo. Tiene que costar: si borrar
   * los errores fuera gratis, bastaría con reiniciar cada vez que se falla para
   * sacar siempre nota perfecta. La interfaz solo ofrece el botón cuando
   * después del reinicio todavía queda el intento que se va a jugar.
   */
  const restartModule = () => {
    const { currentModuleId } = stateRef.current;
    if (!currentModuleId) return;

    consumirIntento(identidad(currentModuleId));
    setIntentosGastados((n) => n + 1);

    currentStepIndexRef.current = 0;
    advancingRef.current = false;
    setFallosSeguidos(0);
    setReanudado(false);

    setState((prev) => ({
      ...prev,
      currentStepIndex: 0,
      feedback: null,
      hintActive: false,
      showErrorModal: false,
      customErrorMessage: undefined,
      appState: pantallasIniciales(currentModuleId),
      errors: 0,
      mistakeLog: [],
      startTime: Date.now(),
      attemptId: newAttemptId(),
      processSteps: [{ action: 'Volvió a empezar el módulo', time: '00:00' }],
    }));
  };

  /**
   * Recoloca las pantallas en lo que el paso en curso necesita.
   *
   * Es la salida garantizada: si una combinación rara de clics deja la pantalla
   * en un sitio del que el colaborador no sabe volver, esto lo devuelve al
   * estado desde el que el paso se puede completar, SIN retroceder pasos, sin
   * borrar errores y sin gastar intento. No se puede usar para hacer trampa
   * porque no perdona nada ni salta nada: el paso sigue exigiendo lo suyo.
   */
  const reacomodarPantallas = () => {
    const snapshot = stateRef.current;
    const mod = modulesRef.current.find((m) => m.id === snapshot.currentModuleId);
    const paso = mod?.steps[currentStepIndexRef.current];
    if (!paso) return;

    advancingRef.current = false;
    setState((prev) => ({
      ...prev,
      feedback: null,
      showErrorModal: false,
      customErrorMessage: undefined,
      // El índice del estado vuelve a alinearse con el de la referencia: si se
      // hubieran desincronizado, la pantalla mostrada dejaría de ser la del paso.
      currentStepIndex: currentStepIndexRef.current,
      appState: reacomodarParaElPaso(paso, prev.appState),
      processSteps: [
        ...prev.processSteps,
        { action: 'Reacomodó las pantallas', time: formatElapsed(prev.startTime) },
      ],
    }));
  };

  /**
   * Sale al menú GUARDANDO lo que llevaba hecho.
   *
   * Antes salir borraba el intento entero. Ahora el paso, las pantallas y los
   * errores quedan en el servidor: al volver a entrar retoma ahí mismo y no
   * gasta ninguna de sus dos oportunidades.
   */
  const exitModule = () => {
    const snapshot = stateRef.current;
    const mod = modulesRef.current.find((m) => m.id === snapshot.currentModuleId);

    if (snapshot.status === 'running' && mod && snapshot.attemptId) {
      guardarEstadoModulo(identidad(mod.id), {
        attemptId: snapshot.attemptId,
        currentStepIndex: currentStepIndexRef.current,
        totalPasos: mod.steps.length,
        appState: snapshot.appState,
        errors: snapshot.errors,
        mistakeLog: snapshot.mistakeLog,
        processSteps: [
          ...snapshot.processSteps,
          { action: 'Salió al menú (avance guardado)', time: formatElapsed(snapshot.startTime) },
        ],
        elapsedMs: snapshot.startTime ? Date.now() - snapshot.startTime : 0,
      });
    }

    setReanudado(false);
    setState((prev) => ({
      ...prev,
      status: 'menu',
      currentModuleId: null,
      currentStepIndex: 0,
      feedback: null,
      hintActive: false,
      showErrorModal: false,
      customErrorMessage: undefined,
    }));
  };

  /** Fallos seguidos contra el mismo paso; se reinicia al avanzar. */
  const [fallosSeguidos, setFallosSeguidos] = useState(0);

  const currentStepIndexRef = useRef<number>(0);
  const lastStepChangeTimeRef = useRef<number>(Date.now());
  const hintedStepsRef = useRef<Set<string>>(new Set());
  /** Hay un avance de paso en curso: ignora clics repetidos mientras dura. */
  const advancingRef = useRef(false);

  const handleInteractRef = useRef<(targetId: string, value?: string, isFinalSubmit?: boolean) => boolean | void>();

  // Avance automático de los pasos "auto". El timer se cancela al desmontar o al
  // cambiar de paso: sin ese cleanup se acumulaban avances y un módulo podía
  // darse por terminado sin recorrido real (puntaje 0 en la hoja).
  //
  // Este efecto NO depende de `modulesData`: cuando dependía, la llegada de la
  // configuración del entrenador lo re-ejecutaba y revertía
  // `currentStepIndexRef` al índice anterior en plena animación de avance. El
  // paso se volvía a evaluar con el `appState` ya modificado por su `action`
  // —que en el Módulo 1 borra usuario y clave—, y salía "incorrecto" aunque el
  // colaborador hubiera escrito exactamente lo que decía la situación.
  useEffect(() => {
    if (state.status !== 'running') return;
    if (advancingRef.current) return;
    currentStepIndexRef.current = state.currentStepIndex;

    const mod = modulesRef.current.find((m) => m.id === state.currentModuleId);
    const step = mod?.steps[state.currentStepIndex];
    if (!step || step.targetId !== 'auto') return;

    const timer = setTimeout(() => handleInteractRef.current?.('auto'), 800);
    return () => clearTimeout(timer);
  }, [state.currentStepIndex, state.status, state.currentModuleId]);

  // Sostiene el estado que el paso en curso necesita (`keepState`).
  //
  // Los botones "Cancelar" y "No" de los modales no pasan por la validación:
  // apagan el flag y siguen. Para la mayoría de los casos basta con poder
  // repetir el paso que abrió el modal, pero hay uno —el crédito de tienda del
  // Módulo 11— donde el botón que lo abre vive en una pantalla que el paso ya
  // dejó atrás. Ahí el módulo quedaba muerto sin retorno posible. Con esto, el
  // modal que el paso exige se vuelve a abrir solo.
  useEffect(() => {
    if (state.status !== 'running') return;
    const mod = modulesRef.current.find((m) => m.id === state.currentModuleId);
    const step = mod?.steps[state.currentStepIndex];
    if (!step?.keepState) return;

    // El propio paso cierra su ventana al darse por cumplido. Si se reabriera
    // entonces, quedaría tapando la pantalla y el módulo se trabaría por culpa
    // del arreglo. Solo se sostiene mientras el paso sigue pendiente.
    if (advancingRef.current) return;

    const actual = state.appState as Record<string, unknown>;
    const faltantes = Object.entries(step.keepState).filter(
      ([clave, valor]) => actual[clave] !== valor
    );
    if (faltantes.length === 0) return;

    const indice = state.currentStepIndex;
    const timer = setTimeout(() => {
      // Se vuelve a comprobar: entre medio el paso pudo completarse.
      if (advancingRef.current || currentStepIndexRef.current !== indice) return;
      setState((prev) => ({ ...prev, appState: reencuadrarPaso(step, prev.appState) }));
    }, 250);
    return () => clearTimeout(timer);
  }, [state.appState, state.currentStepIndex, state.status, state.currentModuleId]);

  const handleInteract = (targetId: string, value?: string, _isFinalSubmit?: boolean): boolean | void => {
    const snapshot = stateRef.current;
    if (snapshot.status !== 'running') return;
    // Un avance ya está en curso: cualquier clic extra se ignora en vez de
    // encolar un segundo avance sobre el mismo paso.
    if (advancingRef.current) return;
    const mod = modulesRef.current.find((m) => m.id === snapshot.currentModuleId);
    if (!mod) return;
    const stepToProcess = mod.steps[currentStepIndexRef.current];
    if (!stepToProcess) return;

    if (targetId === 'ignore-click' || targetId.startsWith('ignore-')) {
      return true;
    }

    if (targetId === stepToProcess.targetId) {
      if (stepToProcess.targetValue !== undefined) {
        // Un clic sobre el campo (sin valor) es enfocarlo para escribir, no
        // responder: no se valida ni se cuenta como error. La validación llega
        // cuando el colaborador confirma con Enter o con el botón de buscar.
        if (value === undefined) return true;

        if (value.trim() !== stepToProcess.targetValue.trim()) {
          setFallosSeguidos((f) => f + 1);
          setState((prev) => ({
            ...prev,
            errors: prev.errors + 1,
            showErrorModal: true,
            customErrorMessage: 'El valor ingresado no coincide con el del caso. Revisa la situación de la tienda.',
            mistakeLog: [...prev.mistakeLog, { step: `Valor incorrecto: ${stepToProcess.instruction}`, pointsDeducted: 1 }],
          }));
          return false;
        }
      }

      if (stepToProcess.expectedState) {
        let isValid = true;
        const appStateRecord = snapshot.appState as Record<string, any>;
        for (const [key, expectedValue] of Object.entries(stepToProcess.expectedState)) {
          if (!valuesMatch(appStateRecord[key], expectedValue)) {
            isValid = false;
            break;
          }
        }

        if (!isValid) {
          setFallosSeguidos((f) => f + 1);
          setState((prev) => ({
            ...prev,
            feedback: { status: 'error', id: targetId },
            errors: prev.errors + 1,
            showErrorModal: true,
            customErrorMessage: 'Datos incorrectos. Revisa los valores ingresados.',
            mistakeLog: [...prev.mistakeLog, { step: stepToProcess.instruction, pointsDeducted: 1 }],
          }));
          return false;
        }
      } else if (stepToProcess.validator) {
        const validationResult = stepToProcess.validator(snapshot.appState, {
          step: stepToProcess,
          steps: mod.steps,
        });
        if (validationResult !== true) {
          setFallosSeguidos((f) => f + 1);
          setState((prev) => ({
            ...prev,
            errors: prev.errors + 1,
            showErrorModal: true,
            customErrorMessage:
              typeof validationResult === 'string' ? validationResult : 'Condición no cumplida. Revisa los montos y pagos.',
            mistakeLog: [...prev.mistakeLog, { step: stepToProcess.instruction, pointsDeducted: 1 }],
          }));
          return false;
        }
      }

      setState((prev) => ({ ...prev, feedback: { status: 'success', id: targetId } }));

      // El paso salió bien: la racha de fallos vuelve a cero.
      setFallosSeguidos(0);
      advancingRef.current = true;
      // Red de seguridad: si por lo que sea el avance no llegara a ejecutarse,
      // `advancingRef` se quedaría en `true` y la aplicación dejaría de aceptar
      // clics para siempre. Este temporizador lo suelta pase lo que pase.
      const sueltaDeEmergencia = setTimeout(() => {
        advancingRef.current = false;
      }, 3000);
      setTimeout(() => {
        clearTimeout(sueltaDeEmergencia);
        currentStepIndexRef.current += 1;
        lastStepChangeTimeRef.current = Date.now();
        advancingRef.current = false;
        setState((prev) => {
          const nextIndex = prev.currentStepIndex + 1;
          const processSteps = [
            ...prev.processSteps,
            { action: `Paso completado: ${stepToProcess.instruction}`, time: formatElapsed(prev.startTime) },
          ];

          const newState: SimulationState = {
            ...prev,
            currentStepIndex: nextIndex,
            feedback: null,
            hintActive: false,
            processSteps,
          };

          // Si el `action` de un paso reventara, antes se perdía TODO el avance
          // de este bloque: la referencia del paso ya había subido y el estado
          // se quedaba en el paso anterior, así que la pantalla mostrada dejaba
          // de ser la que la validación esperaba y el módulo quedaba muerto.
          // Ahora el fallo se aísla: se pierde el efecto de ese `action`, no el
          // avance ni el módulo.
          if (stepToProcess.action) {
            try {
              const appStateCopy = JSON.parse(JSON.stringify(newState.appState));
              stepToProcess.action(appStateCopy);
              newState.appState = appStateCopy;
            } catch (error) {
              console.error('[prism] El paso no pudo aplicar su acción:', stepToProcess.id, error);
            }
          }

          if (nextIndex >= mod.steps.length) {
            newState.status = 'completed';
            newState.endTime = Date.now();
            newState.completedModules = prev.completedModules.includes(mod.id)
              ? prev.completedModules
              : [...prev.completedModules, mod.id];
          }

          return newState;
        });
      }, 400);
    } else {
      if (targetId === 'background') return;
      if (value !== undefined) return;
      const bypassValidationIds = [
        'cust-new-name', 'cust-new-lastname', 'cust-new-email', 'cust-new-doctype',
        'cust-new-doc', 'pos-btn-remove-cust', 'modal-auth-ok', 'ignore-click',
      ];
      if (bypassValidationIds.includes(targetId)) return true;
      // Quitar un artículo del carrito es una corrección legítima. El botón real
      // lleva el índice de la línea (`pos-btn-remove-0`), así que la lista de
      // arriba nunca coincidía y quitar un producto mal agregado era imposible.
      if (targetId.startsWith('pos-btn-remove')) return true;

      // Un paso YA CUMPLIDO se puede repetir. Es la salida de casi todos los
      // atascos: los botones "No", "Cancelar" y "Cerrar" de los modales no pasan
      // por aquí y cierran lo que el paso actual necesita, mientras que el botón
      // que lo reabriría sí pasaba y quedaba bloqueado para siempre. Permitirlo
      // devuelve el clic a la pantalla, que reabre el modal o el submenú por sí
      // sola —igual que en el sistema real— sin contar error ni saltarse nada:
      // el paso en curso sigue exigiendo lo suyo para avanzar.
      const yaCumplido = mod.steps
        .slice(0, currentStepIndexRef.current)
        .some((paso) => paso.targetId === targetId);
      if (yaCumplido) return true;
      // Acciones intermedias que el propio paso pide (aplicar el pago, dar el
      // vuelto). Sin esto se contaban como error y, peor, el clic quedaba
      // bloqueado: el Módulo 6 era imposible de terminar porque nunca llegaba a
      // aplicarse el pago que su instrucción exige.
      if (stepToProcess.allowedTargets?.includes(targetId)) return true;
      if (stepToProcess.screenId === 'login' && targetId !== 'login-btn-submit') return;
      // Evita que un doble clic justo después de avanzar cuente como error
      if (Date.now() - lastStepChangeTimeRef.current < 400) return;

      const isInputError =
        targetId.includes('input') || targetId.includes('search') || targetId.includes('select') ||
        (targetId.includes('cust-new-') && targetId !== 'cust-new-save') ||
        targetId.includes('pay-method') || targetId.includes('pay-select-card-type');
      if (isInputError) return;

      setFallosSeguidos((f) => f + 1);
      setState((prev) => ({
        ...prev,
        feedback: { status: 'error', id: targetId },
        errors: prev.errors + 1,
        showErrorModal: true,
        mistakeLog: [...prev.mistakeLog, { step: stepToProcess.instruction, pointsDeducted: 1 }],
      }));

      setTimeout(() => {
        setState((prev) => (prev.feedback?.status === 'error' ? { ...prev, feedback: null } : prev));
      }, 1000);
      return false;
    }
    return true;
  };

  handleInteractRef.current = handleInteract;

  const triggerCustomError = (message: string, points: number = 1) => {
    setState((prev) => ({
      ...prev,
      errors: prev.errors + 1,
      showErrorModal: true,
      customErrorMessage: message,
      mistakeLog: [...prev.mistakeLog, { step: `Error: ${message}`, pointsDeducted: points }],
    }));
  };

  // La pista se cobra una sola vez por paso y se marca como pista, para que el
  // servidor aplique la penalización de ayuda y no la de error.
  const triggerHint = () => {
    const step = currentStep;
    const stepKey = `${stateRef.current.currentModuleId}:${step?.id || stateRef.current.currentStepIndex}`;
    const alreadyHinted = hintedStepsRef.current.has(stepKey);
    hintedStepsRef.current.add(stepKey);

    setState((prev) => ({
      ...prev,
      hintActive: true,
      mistakeLog: alreadyHinted
        ? prev.mistakeLog
        : [...prev.mistakeLog, { step: `Pista usada: ${step?.instruction || ''}`, pointsDeducted: 0.5, isHint: true }],
    }));
  };

  const dismissErrorModal = () => {
    setState((prev) => ({ ...prev, showErrorModal: false, customErrorMessage: undefined }));
  };

  const setAppState = (update: Partial<AppState>) => {
    setState((prev) => ({ ...prev, appState: { ...prev.appState, ...update } }));
  };

  // Un intento se envía UNA sola vez. Antes el fetch vivía dentro del updater de
  // setState y se disparaba desde un efecto de montaje sin guarda, así que React
  // en modo estricto generaba varias filas idénticas por módulo terminado.
  const submittedAttemptsRef = useRef<Set<string>>(new Set());

  const submitScore = useCallback(async () => {
    const snapshot = stateRef.current;
    const { attemptId, operatorName, operatorDni, operatorStore, currentModuleId } = snapshot;
    const mod = modulesRef.current.find((m) => m.id === currentModuleId);

    if (!attemptId || !mod) return;
    if (!operatorName.trim() || !operatorDni.trim()) {
      setState((prev) => ({
        ...prev,
        syncStatus: 'failed',
        syncMessage: 'Falta registrar tus datos de colaborador; el intento no se envió.',
      }));
      return;
    }
    if (!teacherUsername) {
      setState((prev) => ({
        ...prev,
        syncStatus: 'failed',
        syncMessage: 'Este enlace no tiene entrenador asignado. Pídele a tu entrenador el enlace correcto.',
      }));
      return;
    }
    if (submittedAttemptsRef.current.has(attemptId)) return;
    submittedAttemptsRef.current.add(attemptId);

    const totalSeconds =
      snapshot.startTime && snapshot.endTime ? Math.round((snapshot.endTime - snapshot.startTime) / 1000) : 0;

    setState((prev) => ({ ...prev, syncStatus: 'sending', syncMessage: '' }));

    try {
      const res = await fetch('/api/submit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          studentName: operatorName.trim(),
          studentDni: operatorDni.trim(),
          storeName: operatorStore.trim(),
          moduleId: mod.id,
          moduleTitle: mod.title,
          teacherUsername,
          mistakeLog: snapshot.mistakeLog,
          processSteps: snapshot.processSteps,
          totalSeconds,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        // El límite de intentos no es un fallo de red: no tiene sentido dejar
        // que lo reintente, y el guardado a medias ya no sirve para nada.
        if (data?.limiteAlcanzado) {
          borrarEstadoModulo({ teacher: teacherUsername, dni: operatorDni, moduleId: mod.id });
        } else {
          submittedAttemptsRef.current.delete(attemptId);
        }
        setState((prev) => ({ ...prev, syncStatus: 'failed', syncMessage: data?.error || 'No se pudo registrar la nota.' }));
        return;
      }

      // El intento terminó: lo guardado a medias deja de tener sentido.
      borrarEstadoModulo({ teacher: teacherUsername, dni: operatorDni, moduleId: mod.id });

      // El puntaje oficial lo calcula el servidor con la configuración del
      // entrenador (penalización por error y por pista, escala de nota).
      setState((prev) => ({
        ...prev,
        score: data?.log?.score ?? prev.score,
        approved: data?.log?.approved ?? prev.approved,
        syncStatus: data.status === 'synced' ? 'synced' : 'saved_locally',
        syncMessage: data.message || '',
      }));
    } catch {
      submittedAttemptsRef.current.delete(attemptId);
      setState((prev) => ({ ...prev, syncStatus: 'failed', syncMessage: 'No se pudo conectar con el servidor.' }));
    }
  }, [teacherUsername]);

  return (
    <SimulatorContext.Provider
      value={{
        ...state,
        startModule,
        restartModule,
        reacomodarPantallas,
        exitModule,
        handleInteract,
        triggerCustomError,
        triggerHint,
        setAppState,
        setOperator,
        clearOperator,
        submitScore,
        currentStep,
        moduleTitle: currentModule?.title || '',
        modulesData,
        teacherUsername,
        catalog,
        configLoading,
        teacherMissing,
        fallosSeguidos,
        reanudado,
        intentosGastados,
        reloadConfig,
        dismissErrorModal,
      }}
    >
      {children}
    </SimulatorContext.Provider>
  );
};

export const useSimulator = () => {
  const context = useContext(SimulatorContext);
  if (!context) throw new Error('useSimulator must be used within SimulatorProvider');
  return context;
};

export { defaultAppState };
