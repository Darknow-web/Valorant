import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { AppState, SimulationState, Step, ModuleData, StepDataMap } from '../types';
import { modulesData as defaultModulesData } from '../data/modules';
import { Catalog, cloneDefaultCatalog, normalizeCatalog } from '../data/catalog';
import { applyStepData } from '../lib/stepData';
import { newAttemptId } from '../lib/session';

interface SimulatorContextType extends SimulationState {
  startModule: (moduleId: string) => void;
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

  const startModule = (moduleId: string) => {
    const initialAppState = { ...defaultAppState };
    // Todos los módulos posteriores a la apertura de caja arrancan con la caja
    // ya abierta; solo el 1 (ingreso) y el 2 (apertura) empiezan con ella cerrada.
    if (moduleId !== 'm1' && moduleId !== 'm2') {
      initialAppState.registerOpen = true;
      initialAppState.fondoCaja = catalogRef.current.fondoCajaInicial;
    }

    currentStepIndexRef.current = 0;
    advancingRef.current = false;

    setState((prev) => ({
      ...prev,
      status: 'running',
      currentModuleId: moduleId,
      currentStepIndex: 0,
      errors: 0,
      startTime: Date.now(),
      endTime: null,
      feedback: null,
      hintActive: false,
      appState: initialAppState,
      attemptId: newAttemptId(),
      mistakeLog: [],
      processSteps: [{ action: 'Inicio del módulo', time: '00:00' }],
      score: null,
      syncStatus: 'idle',
      syncMessage: '',
      showErrorModal: false,
    }));
  };

  const exitModule = () => {
    setState((prev) => ({
      ...prev,
      status: 'menu',
      currentModuleId: null,
      currentStepIndex: 0,
      feedback: null,
      hintActive: false,
      showErrorModal: false,
    }));
  };

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

      advancingRef.current = true;
      setTimeout(() => {
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

          if (stepToProcess.action) {
            const appStateCopy = JSON.parse(JSON.stringify(newState.appState));
            stepToProcess.action(appStateCopy);
            newState.appState = appStateCopy;
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
        'cust-new-doc', 'pos-btn-remove-cust', 'pos-btn-remove', 'modal-auth-ok', 'ignore-click',
      ];
      if (bypassValidationIds.includes(targetId)) return true;
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
        submittedAttemptsRef.current.delete(attemptId);
        setState((prev) => ({ ...prev, syncStatus: 'failed', syncMessage: data?.error || 'No se pudo registrar la nota.' }));
        return;
      }

      // El puntaje oficial lo calcula el servidor con la configuración del
      // entrenador (penalización por error y por pista, escala de nota).
      setState((prev) => ({
        ...prev,
        score: data?.log?.score ?? prev.score,
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
