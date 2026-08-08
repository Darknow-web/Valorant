/**
 * El módulo que el colaborador dejó a medias.
 *
 * Salir al menú ya no le borra lo que llevaba hecho: se guarda en el servidor
 * el paso en el que iba, cómo estaban las pantallas y los errores del intento.
 * Al volver a entrar retoma exactamente ahí, con el mismo intento, sin gastar
 * una de sus dos oportunidades.
 *
 * Va al servidor y no al navegador porque el colaborador puede entrar desde el
 * celular de la tienda y seguir desde otro equipo, y porque el navegador de una
 * tienda se limpia solo cada dos por tres.
 */
import { AppState, MistakeDetail, ProcessStepLog } from '../types';

export interface EstadoModuloGuardado {
  attemptId: string;
  currentStepIndex: number;
  totalPasos: number;
  appState: AppState;
  errors: number;
  mistakeLog: MistakeDetail[];
  processSteps: ProcessStepLog[];
  elapsedMs: number;
  guardadoEn: number;
}

interface Identidad {
  teacher: string;
  dni: string;
  moduleId?: string;
}

/** Ninguna de estas llamadas debe romper la simulación si el servidor no responde. */
async function pedir(url: string, opciones?: RequestInit): Promise<any> {
  try {
    const res = await fetch(url, opciones);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function comoJson(cuerpo: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  };
}

export async function leerEstadoModulo({
  teacher,
  dni,
  moduleId,
}: Required<Identidad>): Promise<EstadoModuloGuardado | null> {
  if (!teacher || !dni || !moduleId) return null;
  const datos = await pedir(
    `/api/module-state?teacher=${encodeURIComponent(teacher)}&dni=${encodeURIComponent(dni)}&moduleId=${encodeURIComponent(moduleId)}`
  );
  return datos?.enCurso || null;
}

export async function guardarEstadoModulo(
  identidad: Required<Identidad>,
  estado: Omit<EstadoModuloGuardado, 'guardadoEn'>
): Promise<void> {
  if (!identidad.teacher || !identidad.dni || !identidad.moduleId) return;
  await pedir('/api/module-state', comoJson({ ...identidad, ...estado }));
}

export async function borrarEstadoModulo(identidad: Required<Identidad>): Promise<void> {
  if (!identidad.teacher || !identidad.dni || !identidad.moduleId) return;
  await pedir('/api/module-state', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(identidad),
  });
}

/**
 * Gasta un intento del módulo. Lo llama «Volver a empezar», que borra los
 * errores del intento: si reiniciar fuera gratis, bastaría con reiniciar cada
 * vez que se falla para sacar siempre nota perfecta.
 */
export async function consumirIntento(identidad: Required<Identidad>): Promise<void> {
  if (!identidad.teacher || !identidad.dni || !identidad.moduleId) return;
  await pedir('/api/module-restart', comoJson(identidad));
}

/** Marcas del colaborador: preámbulo visto, capacitación dada por terminada. */
export async function marcarBandera(
  identidad: Identidad,
  banderas: { preambuloVisto?: boolean; finalizado?: boolean }
): Promise<void> {
  if (!identidad.teacher || !identidad.dni) return;
  await pedir('/api/student-flag', comoJson({ ...identidad, ...banderas }));
}

/**
 * Devuelve al colaborador al punto de partida: recupera sus intentos y borra
 * los módulos a medias. Las notas ya registradas NO se borran; siguen en el
 * panel del entrenador y en la hoja, solo dejan de contar para su avance.
 */
export async function reiniciarCapacitacion(identidad: Identidad): Promise<void> {
  if (!identidad.teacher || !identidad.dni) return;
  await pedir('/api/student-reset', comoJson(identidad));
}
