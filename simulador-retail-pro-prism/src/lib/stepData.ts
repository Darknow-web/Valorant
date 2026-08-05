import { ConfigurableField, ModuleData, Step, StepDataMap } from '../types';
import { Catalog, findCustomer, findProduct } from '../data/catalog';

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
  // Los booleanos son interruptores internos del simulador (por ejemplo
  // "el modal de nivel de precio quedó marcado"), no datos de la situación:
  // se siguen validando, pero no se muestran ni se dejan editar.
  if (typeof value === 'boolean') return false;
  // Los valores vacíos son aserciones internas ("este campo debe quedar en
  // blanco"), tampoco se muestran.
  if (typeof value === 'string') return value.trim() !== '';
  return value !== undefined && value !== null && value !== '';
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

      if (step.data) {
        for (const [key, value] of Object.entries(step.data)) {
          fields.push({
            stepId: step.id,
            moduleId: mod.id,
            moduleTitle: mod.title,
            path: `data.${key}`,
            label: step.dataLabels?.[key] || fieldLabel(key),
            help: 'Se comprueba al cerrar el paso.',
            value: override.data?.[key] ?? String(value),
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
          // Solo se sustituyen claves que ya existen, y nunca las booleanas:
          // esas son interruptores internos, no datos de la situación.
          if (key in step.expectedState && typeof step.expectedState[key] !== 'boolean') {
            next.expectedState[key] = value;
          }
        }
      }
      if (override.data && step.data) {
        next.data = { ...step.data };
        for (const [key, value] of Object.entries(override.data)) {
          if (key in step.data) next.data[key] = value;
        }
      }
      return next;
    }),
  }));
}

/**
 * Qué tipo de dato es un campo: los códigos tienen que existir en el catálogo
 * simulado, porque si no la pantalla del POS no encuentra nada al buscarlos y
 * el módulo se queda bloqueado.
 */
export type FieldKind = 'producto' | 'cliente' | 'otro';

export function fieldKind(field: ConfigurableField): FieldKind {
  const label = field.label.toLowerCase();
  if (label.includes('producto')) return 'producto';
  if (label.includes('documento') || label.includes('ruc') || label.includes('cliente')) return 'cliente';
  return 'otro';
}

/**
 * Devuelve un aviso si el valor configurado no existe en el catálogo.
 * `null` significa que está bien.
 */
export function checkAgainstCatalog(field: ConfigurableField, catalog: Catalog): string | null {
  const value = field.value.trim();
  if (!value) return 'Este dato está vacío: el paso no se podrá completar.';

  const kind = fieldKind(field);
  if (kind === 'producto' && !findProduct(catalog, value)) {
    return `No hay ningún producto con el código ${value} en el catálogo. El colaborador no podrá agregarlo a la venta.`;
  }
  if (kind === 'cliente' && !findCustomer(catalog, value)) {
    return `No hay ningún cliente con el documento ${value} en el catálogo. El colaborador no podrá asociarlo a la venta.`;
  }
  return null;
}

/** Lee un dato ya configurado, por referencia 'stepId|ruta'. */
export function readFieldValue(modules: ModuleData[], reference: string): string {
  const [stepId, path] = reference.split('|');
  for (const mod of modules) {
    const step = mod.steps.find((s) => s.id === stepId);
    if (!step) continue;
    if (path === 'targetValue') return step.targetValue ?? '';
    if (path?.startsWith('data.')) return step.data?.[path.slice('data.'.length)] ?? '';
    if (path?.startsWith('expectedState.')) {
      const key = path.slice('expectedState.'.length);
      const value = step.expectedState?.[key];
      return value === undefined ? '' : String(value);
    }
  }
  return '';
}
