import React, { useCallback, useEffect, useState } from 'react';
import { authHeaders } from '../../lib/session';
import { Badge, Button, Card, CardHeader, Notice } from '../ui/Kit';

interface StudentLog {
  id: string;
  attemptId: string;
  timestamp: string;
  studentName: string;
  studentDni: string;
  storeName: string;
  moduleTitle: string;
  score: number;
  mistakesCount: number;
  hintsCount: number;
  approved: boolean;
  rating: string;
  totalTime: string;
  syncStatus: string;
  errorDetails?: string;
}

const INVALID = (log: StudentLog) =>
  !log.studentName?.trim() ||
  log.studentName.toLowerCase() === 'desconocido' ||
  !log.moduleTitle?.trim() ||
  log.moduleTitle.toUpperCase() === 'N/A';

export const ResultsPanel = ({ isAdmin = false }: { isAdmin?: boolean }) => {
  const [logs, setLogs] = useState<StudentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/students', { headers: authHeaders() });
      setLogs(res.ok ? await res.json() : []);
    } catch {
      setError('No se pudieron cargar los resultados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const executePost = async (path: string) => {
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const res = await fetch(path, { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'La operación falló.');
        setLoading(false);
        return;
      }
      if (typeof data.removed === 'number') {
        setMessage(`Se eliminaron ${data.removed} fila(s) inválida(s). Quedan ${data.kept}.`);
      } else if (typeof data.successCount === 'number') {
        setMessage(`Se sincronizaron ${data.successCount} registro(s).${data.error ? ` Se detuvo: ${data.error}` : ''}`);
      } else {
        setMessage('Listo.');
      }
      await load(); // load() sets loading to false in finally
    } catch {
      setError('No se pudo conectar con el servidor.');
      setLoading(false);
    }
  };

  const post = (path: string, confirmMessage?: string) => {
    if (confirmMessage) {
      setConfirmDialog({
        message: confirmMessage,
        onConfirm: () => {
          setConfirmDialog(null);
          executePost(path);
        },
      });
      return;
    }
    executePost(path);
  };

  const invalidCount = logs.filter(INVALID).length;

  return (
    <Card>
      {confirmDialog && (
        <div className="frame fixed inset-0 z-[9999] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px]">
          <Card className="w-full max-w-sm p-6 text-center">
            <h3 className="mb-4 text-lg font-bold text-ink">¿Estás seguro?</h3>
            <p className="mb-6 text-sm text-ink-muted">{confirmDialog.message}</p>
            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={() => setConfirmDialog(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={confirmDialog.onConfirm}>
                Sí, continuar
              </Button>
            </div>
          </Card>
        </div>
      )}
      <CardHeader
        title="Resultados de colaboradores"
        subtitle={`${logs.length} intento(s) registrado(s).`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={load} disabled={loading}>
              Actualizar
            </Button>
            {/* Subir lo pendiente toca la hoja de toda la organización, así que
                es cosa del administrador, igual que conectarla. */}
            {isAdmin && (
              <Button variant="secondary" onClick={() => post('/api/admin/retry-sync')} disabled={loading}>
                Reintentar sync
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => post('/api/admin/clear-invalid-logs', '¿Eliminar las filas sin colaborador o sin módulo?')}
              disabled={loading}
            >
              Limpiar filas inválidas
            </Button>
            <Button
              variant="danger"
              onClick={() => post('/api/admin/clear-logs', '¿Eliminar TODOS los resultados? Esto no se puede deshacer.')}
              disabled={loading}
            >
              Borrar todo
            </Button>
          </div>
        }
      />

      <div className="space-y-4 px-5 py-5">
        {message && <Notice tone="ok">{message}</Notice>}
        {error && <Notice tone="danger">{error}</Notice>}
        {invalidCount > 0 && (
          <Notice tone="warn">
            Hay {invalidCount} fila(s) sin colaborador o sin módulo, restos de la versión anterior. Usa
            «Limpiar filas inválidas» para quitarlas.
          </Notice>
        )}

        {loading ? (
          <p className="text-sm text-ink-muted">Cargando resultados…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-ink-muted">Todavía no hay intentos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-2 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold">Colaborador</th>
                  <th className="px-3 py-2 font-semibold">Tienda</th>
                  <th className="px-3 py-2 font-semibold">Módulo</th>
                  <th className="px-3 py-2 font-semibold">Nota</th>
                  <th className="px-3 py-2 font-semibold">Tiempo</th>
                  <th className="px-3 py-2 font-semibold">Errores</th>
                  <th className="px-3 py-2 font-semibold">Pistas</th>
                  <th className="px-3 py-2 font-semibold">Sync</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className={`border-b border-line ${INVALID(log) ? 'bg-warn-soft' : ''}`}>
                    <td className="px-3 py-2 text-ink-muted">{log.timestamp}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-ink">{log.studentName || '—'}</div>
                      <div className="text-xs text-ink-subtle">{log.studentDni}</div>
                    </td>
                    <td className="px-3 py-2 text-ink-muted">{log.storeName || '—'}</td>
                    <td className="px-3 py-2 text-ink">{log.moduleTitle || '—'}</td>
                    <td className="px-3 py-2">
                      <Badge tone={log.approved ? 'ok' : 'danger'}>
                        {log.score} · {log.rating}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-ink-muted">{log.totalTime}</td>
                    <td className="px-3 py-2 text-ink-muted">{log.mistakesCount}</td>
                    <td className="px-3 py-2 text-ink-muted">{log.hintsCount ?? 0}</td>
                    <td className="px-3 py-2">
                      {log.syncStatus === 'Sincronizado' ? (
                        <Badge tone="ok">Sincronizado</Badge>
                      ) : (
                        <span title={log.errorDetails}>
                          <Badge tone="warn">{log.syncStatus}</Badge>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
};
