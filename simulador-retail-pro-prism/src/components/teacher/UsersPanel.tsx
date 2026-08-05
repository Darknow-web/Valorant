import React, { useCallback, useEffect, useState } from 'react';
import { AuthUser } from '../../types';
import { authHeaders, studentLinkFor } from '../../lib/session';
import { Badge, Button, Card, CardHeader, Field, Input, Notice, Select } from '../ui/Kit';

/** Gestión de entrenadores. Solo la ve el administrador. */
export const UsersPanel = ({ currentUsername }: { currentUsername: string }) => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [form, setForm] = useState({ username: '', name: '', password: '', role: 'teacher' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/users', { headers: authHeaders() });
      setUsers(res.ok ? await res.json() : []);
    } catch {
      setError('No se pudo cargar la lista de usuarios.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo crear el usuario.');
        return;
      }
      setMessage(`Usuario "${form.username}" creado. Deberá cambiar su clave al primer ingreso.`);
      setForm({ username: '', name: '', password: '', role: 'teacher' });
      await load();
    } catch {
      setError('No se pudo conectar con el servidor.');
    }
  };

  const remove = async (username: string) => {
    if (!window.confirm(`¿Eliminar al usuario "${username}"? Sus resultados dejarán de ser accesibles.`)) return;
    setMessage('');
    setError('');
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo eliminar.');
        return;
      }
      await load();
    } catch {
      setError('No se pudo conectar con el servidor.');
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Entrenadores" subtitle="Cada entrenador tiene su propio enlace, sus datos y sus resultados." />
        <div className="px-5 py-5">
          {error && <Notice tone="danger">{error}</Notice>}
          <div className="mt-2 space-y-2">
            {users.map((u) => (
              <div key={u.username} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{u.name}</span>
                    <Badge tone={u.role === 'admin' ? 'brand' : 'neutral'}>
                      {u.role === 'admin' ? 'Administrador' : 'Entrenador'}
                    </Badge>
                    {u.mustChangePassword && <Badge tone="warn">Clave inicial sin cambiar</Badge>}
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-ink-subtle">{studentLinkFor(u.username)}</div>
                </div>
                {u.username !== currentUsername && (
                  <Button variant="danger" onClick={() => remove(u.username)}>
                    Eliminar
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Crear entrenador" />
        <form onSubmit={create} className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <Field label="Usuario" hint="Sin espacios. Es el que aparece en el enlace.">
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </Field>
          <Field label="Nombre visible">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Clave inicial" hint="Mínimo 8 caracteres. Se le pedirá cambiarla al ingresar.">
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={8}
              required
            />
          </Field>
          <Field label="Rol">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="teacher">Entrenador</option>
              <option value="admin">Administrador</option>
            </Select>
          </Field>
          <div className="sm:col-span-2 space-y-3">
            {message && <Notice tone="ok">{message}</Notice>}
            <Button type="submit">Crear usuario</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
