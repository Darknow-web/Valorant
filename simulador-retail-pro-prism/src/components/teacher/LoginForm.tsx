import React, { useState } from 'react';
import { AuthUser } from '../../types';
import { authHeaders, setToken } from '../../lib/session';
import { Button, Card, Field, Input, Isotipo, Notice, Page } from '../ui/Kit';

/**
 * Ingreso del entrenador o del administrador.
 *
 * A diferencia de la versión anterior, aquí NO se muestran credenciales por
 * defecto: las claves iniciales se definen por variable de entorno y se piden
 * cambiar en el primer ingreso.
 */
export const LoginForm = ({ onLogin, onBack }: { onLogin: (user: AuthUser) => void; onBack?: () => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'No se pudo iniciar sesión.');
        return;
      }
      setToken(data.token);
      onLogin(data.user as AuthUser);
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page className="flex items-start justify-center p-4 py-10 sm:items-center">
      <Card className="w-full max-w-sm p-8">
        <Isotipo className="mb-5 h-12 w-12" />
        <h1 className="text-xl font-bold text-ink">Panel de Entrenadores</h1>
        <p className="mb-6 mt-1 text-sm text-ink-muted">Ingresa con tu usuario para configurar y ver resultados.</p>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Usuario">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" />
          </Field>
          <Field label="Clave">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>

          {error && <Notice tone="danger">{error}</Notice>}

          <Button type="submit" className="w-full" disabled={busy || !username.trim() || !password}>
            {busy ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>

        {onBack && (
          <button onClick={onBack} className="mt-5 block w-full text-center text-sm font-semibold text-brand hover:underline">
            ← Volver al inicio
          </button>
        )}

        {/* Los colaboradores no entran por aquí, y conviene decirlo para que
            nadie se quede probando claves que no tiene. */}
        <p className="mt-6 border-t border-line pt-4 text-center text-xs text-ink-subtle">
          ¿Eres colaborador? Entra con el enlace o el código QR que te compartió tu entrenador.
        </p>
      </Card>
    </Page>
  );
};

/** Cambio de clave obligatorio en el primer ingreso. */
export const ChangePasswordForm = ({ onDone, onLogout }: { onDone: () => void; onLogout: () => void }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== repeat) {
      setError('Las dos claves nuevas no coinciden.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo cambiar la clave.');
        return;
      }
      onDone();
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page className="flex items-start justify-center p-4 py-10 sm:items-center">
      <Card className="w-full max-w-sm p-8">
        <Isotipo className="mb-5 h-12 w-12" />
        <h1 className="text-xl font-bold text-ink">Define tu clave</h1>
        <p className="mb-6 mt-1 text-sm text-ink-muted">
          Estás usando la clave inicial. Elige una nueva de al menos 8 caracteres para continuar.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Clave actual">
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoFocus />
          </Field>
          <Field label="Clave nueva">
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </Field>
          <Field label="Repite la clave nueva">
            <Input type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
          </Field>

          {error && <Notice tone="danger">{error}</Notice>}

          <Button type="submit" className="w-full" disabled={busy || newPassword.length < 8}>
            {busy ? 'Guardando…' : 'Guardar y continuar'}
          </Button>
        </form>

        <button onClick={onLogout} className="mt-5 block w-full text-center text-sm font-semibold text-ink-muted hover:underline">
          Cerrar sesión
        </button>
      </Card>
    </Page>
  );
};
