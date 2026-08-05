import React, { useEffect, useState } from 'react';
import { Catalog, cloneDefaultCatalog, normalizeCatalog } from '../../data/catalog';
import { authHeaders } from '../../lib/session';
import { Button, Card, CardHeader, Field, Input, Notice } from '../ui/Kit';

/**
 * Productos y clientes de la tienda simulada.
 *
 * Esto es lo que el POS busca cuando el colaborador escribe un código. Si un
 * dato configurado en «Datos de los módulos» no existe aquí, la búsqueda no
 * encuentra nada y el módulo se queda bloqueado; por eso ambos editores se
 * mantienen coherentes entre sí.
 */
export const CatalogEditor = ({ onSaved }: { onSaved?: () => void }) => {
  const [catalog, setCatalog] = useState<Catalog>(cloneDefaultCatalog);
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/step-data', { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setCatalog(normalizeCatalog(data?.catalog));
        setStepData(data?.stepData || {});
      })
      .catch(() => setError('No se pudo cargar el catálogo.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (next: Catalog | null) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/step-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        // Se reenvía stepData tal cual: el endpoint guarda ambas cosas juntas.
        body: JSON.stringify({ stepData, catalog: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar.');
        return;
      }
      setCatalog(normalizeCatalog(data.catalog));
      setMessage('Catálogo guardado.');
      onSaved?.();
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const updateProduct = (index: number, patch: Partial<Catalog['products'][number]>) =>
    setCatalog((c) => ({ ...c, products: c.products.map((p, i) => (i === index ? { ...p, ...patch } : p)) }));

  const updateCustomer = (index: number, patch: Partial<Catalog['customers'][number]>) =>
    setCatalog((c) => ({ ...c, customers: c.customers.map((x, i) => (i === index ? { ...x, ...patch } : x)) }));

  if (loading) return <Card className="px-5 py-8 text-sm text-ink-muted">Cargando catálogo…</Card>;

  return (
    <div className="space-y-5">
      {message && <Notice tone="ok">{message}</Notice>}
      {error && <Notice tone="danger">{error}</Notice>}

      <Card>
        <CardHeader
          title="Productos"
          subtitle="Lo que el colaborador encuentra al escanear o escribir un código en la caja."
          action={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => save(null)} disabled={saving}>
                Restaurar
              </Button>
              <Button onClick={() => save(catalog)} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar catálogo'}
              </Button>
            </div>
          }
        />
        <div className="space-y-4 px-5 py-5">
          {catalog.products.map((p, i) => (
            <div key={i} className="grid gap-3 rounded-lg border border-line px-4 py-4 sm:grid-cols-4">
              <Field label="Código / SKU" className="sm:col-span-1">
                <Input value={p.sku} onChange={(e) => updateProduct(i, { sku: e.target.value, ean: e.target.value })} />
              </Field>
              <Field label="Descripción" className="sm:col-span-2">
                <Input value={p.desc} onChange={(e) => updateProduct(i, { desc: e.target.value })} />
              </Field>
              <Field label="Precio (S/)">
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={p.price}
                  onChange={(e) => updateProduct(i, { price: Number(e.target.value) })}
                />
              </Field>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Clientes" subtitle="Se buscan por documento al asociarlos a la venta." />
        <div className="space-y-4 px-5 py-5">
          {catalog.customers.map((c, i) => (
            <div key={i} className="grid gap-3 rounded-lg border border-line px-4 py-4 sm:grid-cols-3">
              <Field label="Documento (DNI / RUC)">
                <Input value={c.doc} onChange={(e) => updateCustomer(i, { doc: e.target.value })} />
              </Field>
              <Field label="Nombre">
                <Input value={c.name} onChange={(e) => updateCustomer(i, { name: e.target.value })} />
              </Field>
              <Field label="Correo">
                <Input value={c.email} onChange={(e) => updateCustomer(i, { email: e.target.value })} />
              </Field>
              <label className="flex items-center gap-2 text-sm text-ink sm:col-span-3">
                <input
                  type="checkbox"
                  checked={!!c.esAgregador}
                  onChange={(e) => updateCustomer(i, { esAgregador: e.target.checked })}
                  className="h-4 w-4"
                />
                Es un agregador (Rappi, Pedidos Ya): al asociarlo se pide aplicar el nivel de precio del canal digital.
              </label>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Otros datos de la tienda" />
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <Field label="Fondo de caja inicial" hint="Con el que arrancan los módulos posteriores a la apertura.">
            <Input
              value={catalog.fondoCajaInicial}
              onChange={(e) => setCatalog((c) => ({ ...c, fondoCajaInicial: e.target.value }))}
            />
          </Field>
          <Field label="Marcas de tarjeta" hint="Separadas por coma. Son las opciones que ofrece el POS al cobrar.">
            <Input
              value={catalog.cardTypes.join(', ')}
              onChange={(e) =>
                setCatalog((c) => ({ ...c, cardTypes: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) }))
              }
            />
          </Field>
          <Field label="N.º del documento de devolución" hint="El que el colaborador busca en los módulos 10 y 11.">
            <Input
              value={catalog.returnDocument.id}
              onChange={(e) =>
                setCatalog((c) => ({ ...c, returnDocument: { ...c.returnDocument, id: e.target.value } }))
              }
            />
          </Field>
          <Field label="Documento del cliente de esa boleta">
            <Input
              value={catalog.returnDocument.customerDoc}
              onChange={(e) =>
                setCatalog((c) => ({ ...c, returnDocument: { ...c.returnDocument, customerDoc: e.target.value } }))
              }
            />
          </Field>
          <div className="sm:col-span-2">
            <Button onClick={() => save(catalog)} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar catálogo'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
