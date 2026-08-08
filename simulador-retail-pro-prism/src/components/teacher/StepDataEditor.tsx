import React, { useEffect, useMemo, useState } from 'react';
import { ConfigurableField, StepDataMap } from '../../types';
import { modulesData } from '../../data/modules';
import { applyStepData, checkAgainstCatalog, collectConfigurableFields, fieldKind } from '../../lib/stepData';
import { resolveScenario } from '../../data/scenarios';
import { Catalog, cloneDefaultCatalog, findCustomer, findProduct, normalizeCatalog } from '../../data/catalog';
import { authHeaders } from '../../lib/session';
import { Button, Card, CardHeader, Input, Notice } from '../ui/Kit';

/**
 * Configuración de los DATOS que se validan en cada módulo.
 *
 * No se edita el texto de los pasos ni el proceso: solo el valor con el que se
 * compara lo que hace el colaborador. Antes el panel guardaba los módulos
 * completos como JSON, lo que borraba las funciones de acción y validación de
 * cada paso; ahora solo viajan estos valores.
 */
export const StepDataEditor = () => {
  const [overrides, setOverrides] = useState<StepDataMap>({});
  const [catalog, setCatalog] = useState<Catalog>(cloneDefaultCatalog);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [openModule, setOpenModule] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/step-data', { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setOverrides(data?.stepData || {});
        setCatalog(normalizeCatalog(data?.catalog));
      })
      .catch(() => setError('No se pudieron cargar los datos configurados.'))
      .finally(() => setLoading(false));
  }, []);

  const fields = useMemo(() => collectConfigurableFields(modulesData, overrides), [overrides]);

  const byModule = useMemo(() => {
    const groups = new Map<string, { title: string; fields: ConfigurableField[] }>();
    for (const field of fields) {
      if (!groups.has(field.moduleId)) groups.set(field.moduleId, { title: field.moduleTitle, fields: [] });
      groups.get(field.moduleId)!.fields.push(field);
    }
    return [...groups.entries()];
  }, [fields]);

  // La situación se recalcula con los datos en pantalla, así el entrenador ve
  // en el momento cómo le va a quedar al colaborador.
  const previewModules = useMemo(() => applyStepData(modulesData, overrides), [overrides]);

  /**
   * Copia el código configurado al catálogo, para que el producto o el cliente
   * exista de verdad cuando el colaborador lo busque en la caja.
   */
  const adoptIntoCatalog = (field: ConfigurableField) => {
    const value = field.value.trim();
    const kind = fieldKind(field);
    setCatalog((c) => {
      if (kind === 'producto') {
        if (findProduct(c, value)) return c;
        const products = [...c.products];
        products[0] = { ...products[0], sku: value, ean: value };
        return { ...c, products };
      }
      if (kind === 'cliente') {
        if (findCustomer(c, value)) return c;
        const customers = [...c.customers];
        customers[0] = { ...customers[0], doc: value };
        return { ...c, customers };
      }
      return c;
    });
    setMessage('Se actualizó el catálogo. Recuerda guardar.');
  };

  const updateField = (field: ConfigurableField, value: string) => {
    setMessage('');
    setOverrides((prev) => {
      const entry = { ...(prev[field.stepId] || {}) };
      if (field.path === 'targetValue') {
        entry.targetValue = value;
      } else if (field.path.startsWith('data.')) {
        const key = field.path.slice('data.'.length);
        entry.data = { ...(entry.data || {}), [key]: value };
      } else {
        const key = field.path.slice('expectedState.'.length);
        entry.expectedState = { ...(entry.expectedState || {}), [key]: value };
      }
      return { ...prev, [field.stepId]: entry };
    });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/step-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ stepData: overrides, catalog }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudieron guardar los datos.');
        return;
      }
      setOverrides(data.stepData || {});
      setCatalog(normalizeCatalog(data.catalog));
      setMessage('Datos guardados. Los colaboradores los verán al abrir el módulo.');
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setOverrides({});
    setMessage('Se restauraron los valores originales. Recuerda guardar.');
  };

  if (loading) return <Card className="px-5 py-8 text-sm text-ink-muted">Cargando datos…</Card>;

  return (
    <Card>
      <CardHeader
        title="Datos de cada módulo"
        subtitle="Cambia solo los valores que se validan. El proceso y los pasos no se tocan."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={resetAll}>
              Restaurar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar datos'}
            </Button>
          </div>
        }
      />

      <div className="space-y-3 px-5 py-5">
        {message && <Notice tone="ok">{message}</Notice>}
        {error && <Notice tone="danger">{error}</Notice>}

        {byModule.map(([moduleId, group]) => {
          const isOpen = openModule === moduleId;
          const scenario = resolveScenario(moduleId, previewModules, catalog);
          const problemas = group.fields.filter((f) => checkAgainstCatalog(f, catalog));
          return (
            <div key={moduleId} className="overflow-hidden rounded-lg border border-line">
              <button
                onClick={() => setOpenModule(isOpen ? null : moduleId)}
                className="flex w-full items-center justify-between gap-4 bg-sunken px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold text-ink">{group.title}</span>
                <span className="flex items-center gap-2 text-xs text-ink-muted">
                  {problemas.length > 0 && <span className="font-semibold text-danger">Revisar</span>}
                  {group.fields.length} dato{group.fields.length === 1 ? '' : 's'} {isOpen ? '▲' : '▼'}
                </span>
              </button>

              {isOpen && (
                <div className="space-y-4 px-4 py-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {group.fields.map((field) => {
                      // Un código que no existe en el catálogo deja el módulo
                      // bloqueado: la caja no encuentra nada al buscarlo.
                      const aviso = checkAgainstCatalog(field, catalog);
                      return (
                        <div key={`${field.stepId}.${field.path}`}>
                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
                              {field.label}
                            </span>
                            <Input
                              value={field.value}
                              onChange={(e) => updateField(field, e.target.value)}
                              className={aviso ? 'border-danger' : undefined}
                            />
                          </label>
                          {aviso && (
                            <div className="mt-1.5 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
                              <p>{aviso}</p>
                              {fieldKind(field) !== 'otro' && field.value.trim() && (
                                <button
                                  onClick={() => adoptIntoCatalog(field)}
                                  className="mt-1.5 font-semibold underline"
                                >
                                  Agregarlo al catálogo
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {scenario && scenario.faltantes.length > 0 && (
                    <Notice tone="warn">
                      Hay {scenario.faltantes.length} dato
                      {scenario.faltantes.length === 1 ? '' : 's'} sin valor. La situación se lo mostrará al
                      colaborador como pendiente, y ese paso no se podrá completar.
                    </Notice>
                  )}

                  {scenario && (
                    <div className="rounded-lg border border-line bg-sunken px-4 py-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Así le llega la situación al colaborador
                      </p>
                      <p className="mb-2 text-sm font-semibold text-ink">{scenario.titulo}</p>
                      <p className="mb-2 text-sm leading-relaxed text-ink-muted">{scenario.contexto}</p>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
                        {scenario.pistas.map((pista, i) => (
                          <li key={i}>{pista}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
