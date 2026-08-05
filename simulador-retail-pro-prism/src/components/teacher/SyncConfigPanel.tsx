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

  useEffect(() => {
    fetch('/api/admin/config', { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setConfig({ ...EMPTY, ...data }))
      .catch(() => setError('No se pudo cargar la configuración.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
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
      setMessage('Configuración guardada.');
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const maxScore = config.gradingScale === 'percentage' ? 100 : 20;

  if (loading) return <Card className="px-5 py-8 text-sm text-ink-muted">Cargando configuración…</Card>;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Google Sheets"
          subtitle="Pega la URL del Apps Script publicado como aplicación web."
          action={
            <Button onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
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
          {message && <Notice tone="ok">{message}</Notice>}
          {error && <Notice tone="danger">{error}</Notice>}
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
            <Button onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar configuración'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
