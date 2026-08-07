import React, { useEffect, useState } from 'react';
import { authHeaders } from '../../lib/session';
import { Button, Card, CardHeader, Field, Input, Notice, Select } from '../ui/Kit';

interface TeacherConfig {
  googleWebhookUrl: string;
  googleSpreadsheetId: string;
  penaltyPerError: number;
  penaltyPerHint: number;
  gradingScale: 'vigesimal' | 'percentage';
  passingScore: number;
}

const EMPTY: TeacherConfig = {
  googleWebhookUrl: '',
  googleSpreadsheetId: '',
  penaltyPerError: 1,
  penaltyPerHint: 0.5,
  gradingScale: 'vigesimal',
  passingScore: 14,
};

/** Sincronización con Google Sheets y reglas de calificación. */
export const SyncConfigPanel = () => {
  const [config, setConfig] = useState<TeacherConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [probando, setProbando] = useState(false);
  const [prueba, setPrueba] = useState<{ ok: boolean; mensaje: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/config', { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setConfig({ ...EMPTY, ...data }))
      .catch(() => setError('No se pudo cargar la configuración.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async ({ silencioso = false }: { silencioso?: boolean } = {}) => {
    setSaving(true);
    setError('');
    if (!silencioso) setMessage('');
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar.');
        return;
      }
      if (!silencioso) setMessage('Configuración guardada.');
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  /** Envía un ping al Apps Script y muestra en claro lo que respondió Google. */
  const probar = async () => {
    setProbando(true);
    setPrueba(null);
    setError('');
    setMessage('');
    try {
      // Se guarda primero: probar la URL que aún no está guardada no sirve de nada.
      await save({ silencioso: true });
      const res = await fetch('/api/admin/test-sync', { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      setPrueba({ ok: !!data.ok, mensaje: data.mensaje || 'Sin respuesta del servidor.' });
    } catch {
      setPrueba({ ok: false, mensaje: 'No se pudo conectar con el servidor.' });
    } finally {
      setProbando(false);
    }
  };

  const maxScore = config.gradingScale === 'percentage' ? 100 : 20;

  if (loading) return <Card className="px-5 py-8 text-sm text-ink-muted">Cargando configuración…</Card>;

  return (
    <div className="space-y-5">
      {/* La configuración es de cada entrenador. Pegarla con otro usuario es el
          error más fácil de cometer y el más difícil de notar: los colaboradores
          entrenan igual, pero sus notas no salen de aquí. */}
      {!config.googleWebhookUrl && (
        <Notice tone="warn">
          <strong>Tu hoja de cálculo no está conectada.</strong> Los intentos de tus colaboradores se guardan en este
          panel, pero no llegan a ninguna hoja. Ojo: la conexión es de cada entrenador, así que si la configuraste con
          otro usuario, aquí no cuenta.
        </Notice>
      )}

      <Card>
        <CardHeader
          title="Google Sheets"
          subtitle="Pega la URL del Apps Script publicado como aplicación web."
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={probar} disabled={probando || saving}>
                {probando ? 'Probando…' : 'Probar conexión'}
              </Button>
              <Button onClick={() => save()} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          }
        />
        <div className="space-y-4 px-5 py-5">
          <Field
            label="URL del Webhook (Apps Script)"
            hint="Debe terminar en /exec. El script que va dentro está en docs/apps-script.gs."
          >
            <Input
              value={config.googleWebhookUrl}
              onChange={(e) => setConfig({ ...config, googleWebhookUrl: e.target.value })}
              placeholder="https://script.google.com/macros/s/.../exec"
            />
          </Field>
          <Field label="ID de la hoja de cálculo" hint="Alternativa avanzada; solo se usa si no hay webhook.">
            <Input
              value={config.googleSpreadsheetId}
              onChange={(e) => setConfig({ ...config, googleSpreadsheetId: e.target.value })}
              placeholder="ID de la hoja de cálculo"
            />
          </Field>
          {prueba && <Notice tone={prueba.ok ? 'ok' : 'danger'}>{prueba.mensaje}</Notice>}
          {message && <Notice tone="ok">{message}</Notice>}
          {error && <Notice tone="danger">{error}</Notice>}

          <details className="rounded-xl bg-sunken px-4 py-3 text-sm text-ink-muted">
            <summary className="cursor-pointer font-semibold text-ink">¿No llega nada a tu hoja?</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Usa «Probar conexión»: te dice exactamente qué respondió Google.</li>
              <li>
                Al publicar el Apps Script, en <strong>«Quién tiene acceso»</strong> elige{' '}
                <strong>«Cualquier usuario»</strong>. Es el fallo más común.
              </li>
              <li>Cada vez que cambies el script hay que crear una implementación nueva; guardar no basta.</li>
              <li>Los resultados se escriben en la pestaña «Resultados» de tu hoja.</li>
            </ul>
          </details>
        </div>
      </Card>

      <Card>
        <CardHeader title="Nota" subtitle="Cómo se calcula el puntaje de cada intento." />
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <Field label="Escala">
            <Select
              value={config.gradingScale}
              onChange={(e) => {
                const gradingScale = e.target.value as TeacherConfig['gradingScale'];
                setConfig({ ...config, gradingScale, passingScore: gradingScale === 'percentage' ? 70 : 14 });
              }}
            >
              <option value="vigesimal">Vigesimal (0-20)</option>
              <option value="percentage">Porcentaje (0-100)</option>
            </Select>
          </Field>
          <Field label={`Nota mínima para aprobar (de ${maxScore})`}>
            <Input
              type="number"
              min={0}
              max={maxScore}
              step="0.5"
              value={config.passingScore}
              onChange={(e) => setConfig({ ...config, passingScore: Number(e.target.value) })}
            />
          </Field>
          <Field label="Puntos por error">
            <Input
              type="number"
              min={0}
              step="0.5"
              value={config.penaltyPerError}
              onChange={(e) => setConfig({ ...config, penaltyPerError: Number(e.target.value) })}
            />
          </Field>
          <Field label="Puntos por pista usada">
            <Input
              type="number"
              min={0}
              step="0.5"
              value={config.penaltyPerHint}
              onChange={(e) => setConfig({ ...config, penaltyPerHint: Number(e.target.value) })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Button onClick={() => save()} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar configuración'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
