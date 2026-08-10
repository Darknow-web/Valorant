import React, { useEffect, useRef, useState } from 'react';
import { authHeaders } from '../../lib/session';
import { Button, Card, CardHeader, Notice } from '../ui/Kit';
import {
  MAXIMO_PERSONAJES_SUBIDOS,
  convertirAPersonaje,
  personajesBase,
} from '../../lib/personajes';

/**
 * Los personajes que el colaborador puede elegir como avatar.
 *
 * Solo el administrador entra aquí: los personajes son globales —los ven todas
 * las cuentas y salen en el mismo ranking—, así que no es algo que cada
 * entrenador deba poder cambiarle al resto.
 *
 * La conversión al formato del icono la hace ESTE navegador, no el servidor: se
 * recorta la imagen al cuadrado del centro, se lleva a 512 px y se recorta en
 * círculo antes de subirla. Así se sube un dibujo cualquiera y sale un avatar
 * igual a los de fábrica, sin instalar nada ni procesar imágenes en el servidor.
 */
export const PersonajesPanel = () => {
  const [subidos, setSubidos] = useState<{ id: string; url: string }[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const entrada = useRef<HTMLInputElement>(null);

  const base = personajesBase();

  useEffect(() => {
    fetch('/api/admin/personajes', { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setSubidos(data.personajes || []))
      .catch(() => setError('No se pudieron cargar los personajes.'))
      .finally(() => setCargando(false));
  }, []);

  const guardar = async (lista: { id: string; url: string }[]) => {
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const res = await fetch('/api/admin/personajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ personajes: lista }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar.');
        return;
      }
      setSubidos(data.personajes || lista);
      setMensaje('Guardado. Los colaboradores ya lo ven al elegir su personaje.');
    } catch {
      setError('No se pudo guardar. Revisa la conexión.');
    } finally {
      setGuardando(false);
    }
  };

  const agregar = async (archivos: FileList | null) => {
    if (!archivos?.length) return;
    setError('');
    setMensaje('');

    const cabe = MAXIMO_PERSONAJES_SUBIDOS - subidos.length;
    if (cabe <= 0) {
      setError(`Ya hay ${MAXIMO_PERSONAJES_SUBIDOS} personajes subidos. Quita alguno para añadir otro.`);
      return;
    }

    const nuevos: { id: string; url: string }[] = [];
    for (const archivo of Array.from(archivos).slice(0, cabe)) {
      try {
        const url = await convertirAPersonaje(archivo);
        nuevos.push({ id: `sube-${Date.now()}-${nuevos.length}`, url });
      } catch (e: any) {
        setError(`${archivo.name}: ${e?.message || 'no se pudo convertir.'}`);
      }
    }
    if (nuevos.length) await guardar([...subidos, ...nuevos]);
    if (entrada.current) entrada.current.value = '';
  };

  const quitar = (id: string) => guardar(subidos.filter((p) => p.id !== id));

  return (
    <Card>
      <CardHeader
        title="Personajes"
        subtitle="Los avatares que el colaborador elige al empezar. Salen también en la tabla de los mejores turnos."
      />

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <Notice tone="brand">
          Sube el dibujo que quieras y la aplicación lo deja solo en el formato del icono: cuadrado,
          recortado en círculo y del mismo tamaño que los demás. Lo que mejor queda es un dibujo
          centrado, con fondo liso y sin texto.
        </Notice>

        <div className="mt-5">
          <p className="etiqueta mb-2 text-ink-muted">De fábrica ({base.length})</p>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {base.map((p) => (
              <img
                key={p.id}
                src={p.url}
                alt=""
                aria-hidden
                className="aspect-square w-full rounded-full bg-sunken object-contain"
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-subtle">
            Estos vienen con la aplicación y no se pueden quitar desde aquí.
          </p>
        </div>

        <div className="mt-6">
          <p className="etiqueta mb-2 text-ink-muted">
            Subidos ({subidos.length} de {MAXIMO_PERSONAJES_SUBIDOS})
          </p>

          {cargando ? (
            <p className="text-sm text-ink-muted">Cargando…</p>
          ) : subidos.length === 0 ? (
            <p className="text-sm text-ink-muted">Todavía no has subido ninguno.</p>
          ) : (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
              {subidos.map((p) => (
                <div key={p.id} className="relative">
                  <img
                    src={p.url}
                    alt=""
                    aria-hidden
                    className="aspect-square w-full rounded-full bg-sunken object-contain"
                  />
                  <button
                    onClick={() => quitar(p.id)}
                    disabled={guardando}
                    aria-label="Quitar este personaje"
                    className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-danger text-white shadow-md hover:brightness-110 disabled:opacity-50"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {subidos.length > 0 && (
            <p className="mt-2 text-xs text-ink-subtle">
              Si quitas uno que algún colaborador tenía elegido, ese colaborador se queda sin avatar
              y elige otro la próxima vez que entre. No pierde nada de su avance.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={entrada}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => agregar(e.target.files)}
            className="hidden"
            id="subir-personaje"
          />
          <Button
            onClick={() => entrada.current?.click()}
            disabled={guardando || subidos.length >= MAXIMO_PERSONAJES_SUBIDOS}
          >
            {guardando ? 'Guardando…' : 'Subir personajes'}
          </Button>
          <span className="text-xs text-ink-subtle">
            Se pueden soltar varios de una vez. Formatos: PNG, JPG, WEBP.
          </span>
        </div>

        {mensaje && (
          <div className="mt-4">
            <Notice tone="ok">{mensaje}</Notice>
          </div>
        )}
        {error && (
          <div className="mt-4">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}
      </div>
    </Card>
  );
};
