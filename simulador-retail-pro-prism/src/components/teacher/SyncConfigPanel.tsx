import React, { useEffect, useState } from 'react';
import { authHeaders } from '../../lib/session';
import { Button, Card, CardHeader, Field, Input, Notice, Select } from '../ui/Kit';

interface GradingConfig {
  penaltyPerError: number;
  penaltyPerHint: number;
  gradingScale: 'vigesimal' | 'percentage';
  passingScore: number;
}

const NOTA_VACIA: GradingConfig = {
  penaltyPerError: 1,
  penaltyPerHint: 0.5,
  gradingScale: 'vigesimal',
  passingScore: 14,
};

/**
 * Reglas de calificación. Son de CADA entrenador: uno puede pedir 14 y otro 16,
 * y eso no afecta a los colaboradores del resto.
 */
export const GradingConfigPanel = () => {
  const [config, setConfig] = useState<GradingConfig>(NOTA_VACIA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [hojaConectada, setHojaConectada] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/admin/config', { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setConfig({ ...NOTA_VACIA, ...data }))
      .catch(() => setError('No se pudo cargar la configuración.'))
      .finally(() => setLoading(false));

    // El entrenador no puede tocar la hoja, pero sí necesita saber si sus notas
    // están llegando a alguna parte.
    fetch('/api/admin/sheet-info', { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setHojaConectada(data ? !!data.conectada : null))
      .catch(() => setHojaConectada(null));
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
      {hojaConectada === false && (
        <Notice tone="warn">
          <strong>La hoja de cálculo de la organización no está conectada.</strong> Los intentos de tus colaboradores
          se guardan igual en la pestaña «Resultados» de este panel, pero no llegan a ninguna hoja. La conexión la hace
          el administrador.
        </Notice>
      )}

      <Card>
        <CardHeader title="Nota" subtitle="Cómo se calcula el puntaje de cada intento de tus colaboradores." />
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <Field label="Escala">
            <Select
              value={config.gradingScale}
              onChange={(e) => {
                const gradingScale = e.target.value as GradingConfig['gradingScale'];
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
            {message && <Notice tone="ok">{message}</Notice>}
            {error && <Notice tone="danger">{error}</Notice>}
            <Button onClick={save} disabled={saving} className="mt-3">
              {saving ? 'Guardando…' : 'Guardar configuración'}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="px-5 py-4 text-sm text-ink-muted">
        Cada colaborador puede hacer un módulo <strong className="text-ink">dos veces</strong> como máximo, y se queda
        con su mejor nota. Salir del módulo a medias no le gasta un intento: su avance se guarda y retoma donde lo
        dejó.
      </Card>
    </div>
  );
};

interface SheetConfig {
  googleWebhookUrl: string;
  googleSpreadsheetId: string;
}

/**
 * Conexión con Google Sheets. Solo el administrador.
 *
 * Es UNA sola hoja para toda la organización: las notas de todos los
 * entrenadores caen ahí y se distinguen por la columna «Entrenador». Antes cada
 * entrenador guardaba su propia URL, y bastaba con que uno se equivocara de
 * usuario al pegarla para que sus notas no llegaran a ninguna parte.
 */
export const SheetConfigPanel = () => {
  const [config, setConfig] = useState<SheetConfig>({ googleWebhookUrl: '', googleSpreadsheetId: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [probando, setProbando] = useState(false);
  const [prueba, setPrueba] = useState<{ ok: boolean; mensaje: string } | null>(null);
  const [reintentando, setReintentando] = useState(false);

  useEffect(() => {
    fetch('/api/admin/sheet', { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setConfig({ googleWebhookUrl: data.googleWebhookUrl || '', googleSpreadsheetId: data.googleSpreadsheetId || '' }))
      .catch(() => setError('No se pudo cargar la configuración.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async ({ silencioso = false }: { silencioso?: boolean } = {}) => {
    setSaving(true);
    setError('');
    if (!silencioso) setMessage('');
    try {
      const res = await fetch('/api/admin/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar.');
        return;
      }
      if (!silencioso) setMessage('Conexión guardada.');
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

  /** Sube a la hoja lo que quedó pendiente mientras la conexión estaba rota. */
  const reintentar = async () => {
    setReintentando(true);
    setPrueba(null);
    try {
      const res = await fetch('/api/admin/retry-sync', { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      setPrueba({
        ok: !data.error,
        mensaje: data.error
          ? `Se subieron ${data.successCount || 0} y se detuvo: ${data.error}`
          : `Listo: ${data.successCount || 0} intentos pendientes subidos a la hoja.`,
      });
    } catch {
      setPrueba({ ok: false, mensaje: 'No se pudo conectar con el servidor.' });
    } finally {
      setReintentando(false);
    }
  };

  if (loading) return <Card className="px-5 py-8 text-sm text-ink-muted">Cargando configuración…</Card>;

  return (
    <div className="space-y-5">
      {!config.googleWebhookUrl && !config.googleSpreadsheetId && (
        <Notice tone="warn">
          <strong>La hoja de cálculo no está conectada.</strong> Los intentos se guardan en la pestaña «Resultados»
          de este panel, pero no llegan a ninguna hoja de Google.
        </Notice>
      )}

      <Notice tone="brand">
        Esta conexión es <strong>una sola para toda la organización</strong>: las notas de todos los entrenadores caen
        en la misma hoja y se distinguen por la columna «Entrenador». Los entrenadores no pueden cambiarla.
      </Notice>

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

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <Button variant="secondary" onClick={reintentar} disabled={reintentando}>
              {reintentando ? 'Subiendo…' : 'Subir intentos pendientes'}
            </Button>
            <p className="prosa flex-1 text-sm text-ink-subtle">
              Sube a la hoja los intentos de <strong>todos los entrenadores</strong> que se guardaron mientras la
              conexión estaba caída.
            </p>
          </div>

          <details className="rounded-xl bg-sunken px-4 py-3 text-sm text-ink-muted">
            <summary className="cursor-pointer font-semibold text-ink">¿No llega nada a la hoja?</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Usa «Probar conexión»: te dice exactamente qué respondió Google.</li>
              <li>
                Al publicar el Apps Script, en <strong>«Quién tiene acceso»</strong> elige{' '}
                <strong>«Cualquier usuario»</strong>. Es el fallo más común.
              </li>
              <li>Cada vez que cambies el script hay que crear una implementación nueva; guardar no basta.</li>
              <li>Los resultados se escriben en la pestaña «Resultados» de la hoja.</li>
            </ul>
          </details>
        </div>
      </Card>
    </div>
  );
};
