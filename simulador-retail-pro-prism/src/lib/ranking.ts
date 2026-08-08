/**
 * La tabla de los diez mejores turnos de la empresa.
 *
 * Ordena por módulos completados, después por promedio y al final por tiempo:
 * terminar el turno entero pesa más que sacar un 20 suelto en un módulo.
 *
 * El servidor nunca devuelve el DNI de nadie. Para saber cuál es la fila propia
 * viene marcada con `esTu`, que se resuelve allá.
 */

export interface FilaRanking {
  puesto: number;
  nombre: string;
  tienda: string;
  /** Cuántos módulos tiene completados. */
  modulos: number;
  promedio: number;
  segundos: number;
  /** Esta fila es la del colaborador que está mirando. */
  esTu: boolean;
}

export interface Ranking {
  top: FilaRanking[];
  /** Fila propia cuando quedó fuera del top, con su puesto real. */
  tuFila: FilaRanking | null;
  totalColaboradores: number;
  /** No se pudo consultar; la pantalla lo dice en vez de mentir con una tabla vacía. */
  error: boolean;
}

export const RANKING_VACIO: Ranking = {
  top: [],
  tuFila: null,
  totalColaboradores: 0,
  error: false,
};

export async function obtenerRanking(dni: string): Promise<Ranking> {
  try {
    const res = await fetch(`/api/ranking?dni=${encodeURIComponent(dni || '')}`);
    if (!res.ok) return { ...RANKING_VACIO, error: true };
    const data = await res.json();
    return {
      top: Array.isArray(data.top) ? data.top : [],
      tuFila: data.tuFila || null,
      totalColaboradores: Number(data.totalColaboradores) || 0,
      error: false,
    };
  } catch {
    return { ...RANKING_VACIO, error: true };
  }
}

/** `1247` → `20:47`. El tiempo se muestra como en la barra del simulador. */
export function comoReloj(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  if (mm < 60) return `${mm}:${String(ss).padStart(2, '0')}`;
  const hh = Math.floor(mm / 60);
  return `${hh} h ${String(mm % 60).padStart(2, '0')} min`;
}
