/**
 * Progreso del colaborador: la mejor nota de cada módulo y el promedio.
 *
 * Viene del servidor y no del navegador, así que si cambia de equipo o de
 * teléfono su avance sigue ahí. La nota final es el promedio del MEJOR intento
 * de cada módulo: volver a intentarlo siempre suma, nunca resta.
 */
export interface MejorIntento {
  score: number;
  approved: boolean;
  rating: string;
  moduleTitle: string;
}

/** Un módulo que quedó a medias, para poder retomarlo donde lo dejó. */
export interface ModuloAMedias {
  currentStepIndex: number;
  totalPasos: number;
}

export interface Progreso {
  modulos: Record<string, MejorIntento>;
  promedio: number | null;
  aprobado: boolean;
  notaMinima: number;
  notaMaxima: number;
  /** Oportunidades ya gastadas en cada módulo. */
  intentos: Record<string, number>;
  /** Módulos con un intento a medias, con el paso en el que se quedó. */
  aMedias: Record<string, ModuloAMedias>;
  /** Cuántas veces puede hacerse cada módulo (1 + repeticiones). */
  limiteIntentos: number;
  /** El colaborador ya dio por terminada la capacitación. */
  finalizado: boolean;
  /** Ya vio el preámbulo de la historia. */
  preambuloVisto: boolean;
  /** El avatar que eligió, guardado en el servidor. Vacío si todavía no eligió. */
  personaje: string;
}

export const PROGRESO_VACIO: Progreso = {
  modulos: {},
  promedio: null,
  aprobado: false,
  notaMinima: 14,
  notaMaxima: 20,
  intentos: {},
  aMedias: {},
  limiteIntentos: 2,
  finalizado: false,
  preambuloVisto: false,
  personaje: '',
};

export async function obtenerProgreso(teacher: string, dni: string): Promise<Progreso> {
  if (!teacher || !dni) return PROGRESO_VACIO;
  try {
    const res = await fetch(`/api/my-progress?teacher=${encodeURIComponent(teacher)}&dni=${encodeURIComponent(dni)}`);
    if (!res.ok) return PROGRESO_VACIO;
    const data = await res.json();
    return {
      ...PROGRESO_VACIO,
      ...data,
      modulos: data.modulos || {},
      intentos: data.intentos || {},
      aMedias: data.aMedias || {},
    };
  } catch {
    return PROGRESO_VACIO;
  }
}

/** Módulos que aún no llegan a la nota mínima, para saber qué repetir. */
export function modulosPorReforzar(progreso: Progreso, todosLosIds: string[]): string[] {
  return todosLosIds.filter((id) => {
    const mejor = progreso.modulos[id];
    return !mejor || !mejor.approved;
  });
}

/** Oportunidades que le quedan al colaborador en un módulo. */
export function intentosRestantes(progreso: Progreso, moduleId: string): number {
  const usados = progreso.intentos[moduleId] || 0;
  return Math.max(0, progreso.limiteIntentos - usados);
}

/** ¿Puede entrar al módulo? Retomar uno a medias no gasta intento, así que sí. */
export function puedeEntrar(progreso: Progreso, moduleId: string): boolean {
  if (progreso.aMedias[moduleId]) return true;
  return intentosRestantes(progreso, moduleId) > 0;
}

/**
 * ¿Puede pulsar «Volver a empezar» dentro del módulo?
 *
 * Reiniciar borra los errores del intento, así que gasta una oportunidad. Solo
 * tiene sentido si después del reinicio todavía le queda el intento que va a
 * jugar: con el límite en 2, eso significa que aún no ha terminado el módulo
 * ninguna vez.
 */
export function puedeReiniciar(progreso: Progreso, moduleId: string): boolean {
  const usados = progreso.intentos[moduleId] || 0;
  return usados <= progreso.limiteIntentos - 2;
}

/** Módulos que todavía admiten otra pasada, para ofrecerlos al cerrar el turno. */
export function modulosRepetibles(progreso: Progreso, todosLosIds: string[]): string[] {
  return todosLosIds.filter((id) => intentosRestantes(progreso, id) > 0);
}
