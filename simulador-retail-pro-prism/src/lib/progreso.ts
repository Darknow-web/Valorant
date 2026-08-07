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

export interface Progreso {
  modulos: Record<string, MejorIntento>;
  promedio: number | null;
  aprobado: boolean;
  notaMinima: number;
  notaMaxima: number;
}

export const PROGRESO_VACIO: Progreso = {
  modulos: {},
  promedio: null,
  aprobado: false,
  notaMinima: 14,
  notaMaxima: 20,
};

export async function obtenerProgreso(teacher: string, dni: string): Promise<Progreso> {
  if (!teacher || !dni) return PROGRESO_VACIO;
  try {
    const res = await fetch(`/api/my-progress?teacher=${encodeURIComponent(teacher)}&dni=${encodeURIComponent(dni)}`);
    if (!res.ok) return PROGRESO_VACIO;
    const data = await res.json();
    return { ...PROGRESO_VACIO, ...data, modulos: data.modulos || {} };
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
