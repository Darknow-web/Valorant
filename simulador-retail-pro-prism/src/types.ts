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
  /**
   * Estado que la pantalla del paso necesita para poder completarse (por
   * ejemplo, que el modal siga abierto). Si el colaborador lo apaga por error
   * —pulsando "Cancelar" o "No"— se vuelve a encender, porque el botón que lo
   * reabriría vive en una pantalla a la que ya no se puede volver.
   */
  keepState?: Partial<AppState>;
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
  /**
   * A qué agregador se le está cobrando en la ventana del código.
   *
   * No se puede deducir de `selectedPaymentMethod`: «Reacomodar pantallas» lo
   * devuelve a 'Efectivo' —tiene que hacerlo, o los botones de RAPPI y PEDIDOS
   * YA desaparecen—, y entonces el OK de la ventana creaba el cobro a nombre de
   * Efectivo. El pedido quedaba cobrado por donde no era y el módulo no cerraba.
   */
  authMethod?: string;
  showNCTransferenciaModal?: boolean;
  showNewCustomerModal?: boolean;
  newCustomerName?: string;
  newCustomerLastName?: string;
  newCustomerEmail?: string;
  newCustomerDoc?: string;
  newCustomerDocType?: string;
  storeCredit: number;
  showStoreCreditModal?: boolean;
  /**
   * Pestaña abierta en el punto de venta ('Venta' | 'Orden' | 'Devolucion').
   *
   * Vive aquí y no dentro de la pantalla porque «Reacomodar pantallas» tiene que
   * poder devolverla a su sitio: irse a «Devolución» en un módulo de venta
   * normal escondía la búsqueda de artículos y dejaba el paso sin forma de
   * cumplirse.
   */
  posTab?: string;
  /**
   * Ventana «Registradora No esta Abierto» del menú principal.
   *
   * Por el mismo motivo que `posTab`: tapa el menú entero, así que «Reacomodar
   * pantallas» tiene que poder cerrarla.
   */
  showRegisterModal?: boolean;
  /**
   * Submenú «Desembolsos» del menú principal.
   *
   * Igual: tapa el menú entero. Mientras vivió dentro de la pantalla, abrirlo
   * por error dejaba el menú tapado sin ninguna forma de destaparlo, porque
   * «Reacomodar» solo alcanza a `appState`.
   */
  showDesembolsoSubMenu?: boolean;
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

/** Momento del turno al que pertenece un caso, para agrupar el menú. */
export type TramoDelTurno = 'manana' | 'tarde' | 'cierre';

export interface Scenario {
  moduleId: string;
  titulo: string;
  /**
   * Una sola frase que engancha con el caso anterior, para que los 14 módulos
   * se lean como un turno seguido y no como catorce ejercicios sueltos. Se
   * muestra encima del titular, en gris. No repite datos ni alarga el relato.
   */
  enlace?: string;
  /** En qué momento del turno ocurre. Agrupa las tarjetas del menú. */
  tramo?: TramoDelTurno;
  contexto: string;
  /** Referencias a datos: clave -> 'stepId|targetValue' o 'stepId|expectedState.clave' */
  datos: Record<string, string>;
  /**
   * Nombre con el que se muestra cada dato en la ficha del caso. El colaborador
   * los lee como "evidencias" sueltas, para no tener que rebuscarlos dentro del
   * relato cuando está a mitad del proceso.
   */
  etiquetas?: Record<string, string>;
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
  /**
   * Identificador del avatar que eligió, no la imagen.
   *
   * Guardar el identificador y no la imagen es lo que permite cambiar el dibujo
   * de un personaje sin que quien lo tenía elegido se quede con el viejo.
   */
  operatorPersonaje: string;
  /** Identificador único del intento en curso; evita filas duplicadas en Sheets. */
  attemptId: string | null;
  mistakeLog: MistakeDetail[];
  processSteps: ProcessStepLog[];
  score: number | null;
  /** Si el intento alcanzó la nota mínima del entrenador. Lo decide el servidor. */
  approved: boolean | null;
  syncStatus: ScoreSyncStatus;
  syncMessage: string;
  showErrorModal: boolean;
  customErrorMessage?: string;
}
