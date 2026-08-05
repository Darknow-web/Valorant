export type ScreenId = 
  | 'login' 
  | 'main-menu' 
  | 'pos-menu' 
  | 'pos-main' 
  | 'payment' 
  | 'registro'
  | 'customer-search' 
  | 'customer-new'
  | 'returns-main'
  | 'xz-menu'
  | 'z-out-close'
  | 'arqueo'
  | 'desembolso'
  | 'cerrar-caja'
  | 'conciliacion';

/**
 * Contexto que reciben los validadores, para que puedan comparar contra los
 * datos que configuró el entrenador en vez de contra valores fijos en el código.
 */
export interface ValidatorContext {
  /** El paso que se está validando, ya con los datos del entrenador aplicados. */
  step: Step;
  /** Todos los pasos del módulo en curso, por si un paso depende de otro. */
  steps: Step[];
}

export interface Step {
  id: string;
  instruction: string;
  targetId: string;
  screenId: ScreenId;
  action?: (state: AppState) => void;
  // Optional: A hint to show if the user gets stuck
  hintMessage?: string;
  targetValue?: string; // Add targetValue for text input steps
  expectedState?: Record<string, any>; // Used to validate specific AppState values before advancing
  /**
   * Controles que el paso permite usar antes de darlo por terminado, sin
   * contarlos como error. Son las acciones intermedias que la propia
   * instrucción pide (por ejemplo aplicar el pago antes de imprimir).
   */
  allowedTargets?: string[];
  /** Datos extra que usa el validador del paso (clave → valor configurable). */
  data?: Record<string, string>;
  /** Nombres legibles de `data` para el panel del entrenador. */
  dataLabels?: Record<string, string>;
  validator?: (state: AppState, ctx: ValidatorContext) => boolean | string; // Optional state validation before advancing
}

export interface ModuleData {
  id: string;
  title: string;
  steps: Step[];
}

// The simulated state of the "Retail Pro Prism" app
export interface AppState {
  user: string;
  password?: string;
  registerOpen: boolean;
  currentCustomer: any | null;
  cart: any[];
  payments: any[];
  comprobanteType: string;
  selectedPaymentMethod: string;
  takeAmount: string;
  cardType?: string;
  tipoProcesamiento?: string;
  e115?: string;
  e116?: string;
  autorizacionForzada?: boolean;
  noAutorizacion?: string;
  returnReason: string;
  returnItems: any[];
  fondoCaja: string;
  vueltoGiven?: boolean;
  priceLevelActive?: boolean;
  pendingCustomer?: any | null;
  showPriceLevelModal?: boolean;
  applyPriceLevelToExisting?: boolean;
  authCode?: string;
  showAuthModal?: boolean;
  showNCTransferenciaModal?: boolean;
  authMethod?: string;
  showNewCustomerModal?: boolean;
  newCustomerName?: string;
  newCustomerLastName?: string;
  newCustomerEmail?: string;
  newCustomerDoc?: string;
  newCustomerDocType?: string;
  storeCredit: number;
  showStoreCreditModal?: boolean;
}

export interface MistakeDetail {
  step: string;
  pointsDeducted: number;
  // Distingue una pista pedida de un error real: el servidor aplica
  // penaltyPerHint en vez de penaltyPerError.
  isHint?: boolean;
}

/** Datos que el entrenador puede reconfigurar en un paso (nunca el texto del paso). */
export interface StepDataOverride {
  targetValue?: string;
  expectedState?: Record<string, string>;
  data?: Record<string, string>;
}

export type StepDataMap = Record<string, StepDataOverride>;

/** Un dato configurable, tal como se muestra en el panel del entrenador. */
export interface ConfigurableField {
  stepId: string;
  moduleId: string;
  moduleTitle: string;
  /** 'targetValue' o 'expectedState.<clave>' */
  path: string;
  label: string;
  help?: string;
  value: string;
}

export interface AuthUser {
  username: string;
  name: string;
  role: 'admin' | 'teacher';
  mustChangePassword: boolean;
}

/** Guía de situación que ve el colaborador antes de empezar un módulo. */
export interface ScenarioClue {
  /** Texto con marcadores {{slot}} que se reemplazan por el dato configurado. */
  texto: string;
}

export interface Scenario {
  moduleId: string;
  titulo: string;
  contexto: string;
  /** Referencias a datos: clave -> 'stepId|targetValue' o 'stepId|expectedState.clave' */
  datos: Record<string, string>;
  pistas: string[];
  objetivo: string;
}

export interface ProcessStepLog {
  action: string;
  time: string; // mm:ss desde el inicio del módulo
}

export type ScoreSyncStatus = 'idle' | 'sending' | 'synced' | 'saved_locally' | 'failed';

export interface SimulationState {
  status: 'menu' | 'running' | 'completed';
  currentModuleId: string | null;
  currentStepIndex: number;
  errors: number;
  startTime: number | null;
  endTime: number | null;
  completedModules: string[];
  feedback: { status: 'success' | 'error'; id: string } | null;
  hintActive: boolean;
  appState: AppState; // The internal state of the simulated POS
  operatorName: string;
  operatorDni: string;
  operatorStore: string;
  /** Identificador único del intento en curso; evita filas duplicadas en Sheets. */
  attemptId: string | null;
  mistakeLog: MistakeDetail[];
  processSteps: ProcessStepLog[];
  score: number | null;
  syncStatus: ScoreSyncStatus;
  syncMessage: string;
  showErrorModal: boolean;
  customErrorMessage?: string;
}
