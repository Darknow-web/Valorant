import { AuthUser } from '../types';

const TOKEN_KEY = 'auth_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Devuelve el usuario de la sesión preguntándoselo al servidor.
 * El rol NUNCA se deduce decodificando el JWT en el navegador: ese token lo
 * puede fabricar cualquiera, y la versión anterior además caía a rol "admin"
 * cuando el parseo fallaba.
 */
export async function fetchMe(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/me', { headers: authHeaders() });
    if (!res.ok) {
      clearToken();
      return null;
    }
    return (await res.json()) as AuthUser;
  } catch {
    return null;
  }
}

/** Entrenador cuyo enlace abrió el colaborador (?teacher=usuario). */
export function teacherFromLink(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('teacher')?.trim() || '';
}

export type AppView = 'student' | 'panel' | 'welcome';

/**
 * Resuelve qué ve quien abre la app.
 *
 * Antes la app arrancaba SIEMPRE en el panel de administración (showAdmin=true),
 * así que un colaborador que abría su enlace caía en la pantalla del entrenador.
 */
export function resolveInitialView(): AppView {
  if (typeof window === 'undefined') return 'welcome';
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.replace('#', '').replace(/^\//, '');

  if (params.get('teacher')) return 'student';
  if (hash === 'alumno' || hash === 'colaborador') return 'student';
  if (hash === 'entrenador' || hash === 'panel' || params.get('panel') === '1') return 'panel';
  return 'welcome';
}

export function studentLinkFor(username: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}?teacher=${encodeURIComponent(username)}`;
}

/** Identificador único de intento, para que un reenvío no duplique la fila. */
export function newAttemptId(): string {
  const c: any = typeof crypto !== 'undefined' ? crypto : null;
  if (c?.randomUUID) return c.randomUUID();
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
