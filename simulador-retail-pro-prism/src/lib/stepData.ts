import { ConfigurableField, ModuleData, Step, StepDataMap } from '../types';

/**
 * Etiquetas legibles para cada dato validado. La clave es el nombre técnico que
 * usa el simulador; el entrenador solo ve el nombre de la izquierda.
 */
const FIELD_LABELS: Record<string, string> = {
  targetValue: 'Valor a digitar',
  user: 'Usuario del sistema',
  password: 'Clave del sistema',
  fondoCaja: 'Fondo de caja',
  takeAmount: 'Monto recibido',
  cardType: 'Marca de la tarjeta',
  tipoProcesamiento: 'Tipo de procesamiento',
  e115: 'Voucher E-115',
  e116: 'Voucher E-116',
  noAutorizacion: 'N.º de autorización',
  autorizacionForzada: 'Autorización forzada',
  selectedPaymentMethod: 'Forma de pago',
  comprobanteType: 'Tipo de comprobante',
  returnReason: 'Motivo de devolución',
  authCode: 'Código de autorización',
  authMethod: 'Método de autorización',
  newCustomerName: 'Nombre del cliente nuevo',
  newCustomerLastName: 'Apellido del cliente nuevo',
  newCustomerEmail: 'Correo del cliente nuevo',
  newCustomerDoc: 'Documento del cliente nuevo',
  newCustomerDocType: 'Tipo de documento',
  storeCredit: 'Crédito de tienda',
  applyPriceLevelToExisting: 'Aplicar nivel de precio',
  priceLevelActive: 'Nivel de precio activo',
};

/**
 * Pistas de contexto para los pasos cuyo "Valor a digitar" tiene un significado
 * concreto (un SKU, un DNI, un RUC…). Se deducen del texto de la instrucción.
 */
function describeTargetValue(step: Step): string {
  const t = step.instruction.toLowerCase();
  if (t.includes('sku')) return 'Código del producto que se escanea';
  if (t.includes('ruc')) return 'RUC del cliente';
  if (t.includes('dni') || t.includes('documento')) return 'Documento del cliente';
  if (t.includes('comprobante')) return 'Tipo de comprobante';
  if (t.includes('cantidad')) return 'Cantidad';
  return 'Valor que el colaborador debe digitar';
}

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] || key;
}

/** ¿Este valor es un dato que el entrenador debería configurar? */
function isConfigurableValue(value: unknown): boolean {
  // Los valores vacíos son aserciones internas ("este campo debe quedar en
  // blanco"), no datos de la situación: se validan pero no se muestran.
  return typeof value === 'string' ? value.trim() !== '' : value !== undefined && value !== null && value !== '';
}

/** Lista plana de todos los datos configurables, ya con el override aplicado. */
export function collectConfigurableFields(modules: ModuleData[], overrides: StepDataMap = {}): ConfigurableField[] {
  const fields: ConfigurableField[] = [];

  for (const mod of modules) {
    for (const step of mod.steps) {
      if (step.targetId === 'auto') continue;
      const override = overrides[step.id] || {};

      if (step.targetValue !== undefined) {
        fields.push({
          stepId: step.id,
          moduleId: mod.id,
          moduleTitle: mod.title,
          path: 'targetValue',
          label: describeTargetValue(step),
          help: 'Valor exacto que se compara con lo que digita el colaborador.',
          value: override.targetValue ?? step.targetValue,
        });
      }

      if (step.expectedState) {
        for (const [key, value] of Object.entries(step.expectedState)) {
          if (!isConfigurableValue(value)) continue;
          fields.push({
            stepId: step.id,
            moduleId: mod.id,
            moduleTitle: mod.title,
            path: `expectedState.${key}`,
            label: fieldLabel(key),
            help: 'Se compara con lo que el colaborador deja en pantalla.',
            value: override.expectedState?.[key] ?? String(value),
          });
        }
      }
    }
  }

  return fields;
}

/**
 * Aplica los datos configurados por el entrenador sobre los módulos.
 *
 * Importante: se copian los pasos pero se CONSERVAN `action` y `validator`, que
 * son funciones. La versión anterior guardaba los módulos completos como JSON
 * en Firestore, lo que borraba esas funciones y rompía la validación en
 * silencio; por eso ahora solo viajan los datos.
 */
export function applyStepData(modules: ModuleData[], overrides: StepDataMap): ModuleData[] {
  if (!overrides || !Object.keys(overrides).length) return modules;

  return modules.map((mod) => ({
    ...mod,
    steps: mod.steps.map((step) => {
      const override = overrides[step.id];
      if (!override) return step;

      const next: Step = { ...step };
      if (override.targetValue !== undefined && step.targetValue !== undefined) {
        next.targetValue = override.targetValue;
      }
      if (override.expectedState && step.expectedState) {
        next.expectedState = { ...step.expectedState };
        for (const [key, value] of Object.entries(override.expectedState)) {
          if (key in step.expectedState) next.expectedState[key] = value;
        }
      }
      return next;
    }),
  }));
}

/** Lee un dato ya configurado, por referencia 'stepId|ruta'. */
export function readFieldValue(modules: ModuleData[], reference: string): string {
  const [stepId, path] = reference.split('|');
  for (const mod of modules) {
    const step = mod.steps.find((s) => s.id === stepId);
    if (!step) continue;
    if (path === 'targetValue') return step.targetValue ?? '';
    if (path?.startsWith('expectedState.')) {
      const key = path.slice('expectedState.'.length);
      const value = step.expectedState?.[key];
      return value === undefined ? '' : String(value);
    }
  }
  return '';
}
