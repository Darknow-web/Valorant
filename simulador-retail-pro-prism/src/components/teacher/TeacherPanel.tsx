import React, { useEffect, useState } from 'react';
import { AuthUser } from '../../types';
import { clearToken, studentLinkFor } from '../../lib/session';
import { Badge, Logotipo, Page } from '../ui/Kit';
import { ShareLinkPanel } from './ShareLinkPanel';
import { StepDataEditor } from './StepDataEditor';
import { CatalogEditor } from './CatalogEditor';
import { GradingConfigPanel, SheetConfigPanel } from './SyncConfigPanel';
import { PersonajesPanel } from './PersonajesPanel';
import { ResultsPanel } from './ResultsPanel';
import { UsersPanel } from './UsersPanel';

type TabId = 'compartir' | 'datos' | 'catalogo' | 'nota' | 'personajes' | 'sheets' | 'resultados' | 'usuarios';

const TABS: { id: TabId; label: string; adminOnly?: boolean }[] = [
  { id: 'compartir', label: 'Compartir' },
  { id: 'datos', label: 'Datos de los módulos' },
  { id: 'catalogo', label: 'Productos y clientes' },
  { id: 'nota', label: 'Nota y calificación' },
  // La hoja es una sola para toda la organización, así que la conecta el
  // administrador. Un entrenador que la cambiara desviaría las notas de todos.
  // Los personajes son globales: los ve todo el mundo y salen en el mismo
  // ranking, así que los sube el administrador y no cada entrenador.
  { id: 'personajes', label: 'Personajes', adminOnly: true },
  { id: 'sheets', label: 'Google Sheets', adminOnly: true },
  { id: 'resultados', label: 'Resultados' },
  { id: 'usuarios', label: 'Entrenadores', adminOnly: true },
];

interface Salud {
  almacen: 'firestore' | 'local';
  proyecto: string;
  motivo: string;
}

/**
 * Dónde están cayendo los datos ahora mismo.
 *
 * Sin esto, una app sin Firestore configurado funciona perfectamente hasta que
 * el servidor se reinicia y desaparecen los entrenadores, las notas y el
 * catálogo. Nadie se enteraba de que estaba pasando porque no había forma de
 * verlo. Ahora se ve, y en rojo.
 */
const AvisoDeAlmacen = () => {
  const [salud, setSalud] = useState<Salud | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setSalud(data))
      .catch(() => setSalud(null));
  }, []);

  if (!salud || salud.almacen === 'firestore') return null;

  return (
    <div className="bg-danger px-4 py-3 text-center text-sm text-white">
      <strong>Los datos se están guardando en el disco del servidor y se borran al reiniciar.</strong>{' '}
      {salud.motivo} Conecta Firestore siguiendo <code className="rounded bg-white/20 px-1">docs/conectar-firebase.md</code>.
    </div>
  );
};

export const TeacherPanel = ({ user, onLogout }: { user: AuthUser; onLogout: () => void }) => {
  const [tab, setTab] = useState<TabId>('compartir');
  // Al guardar el catálogo se refresca el editor de datos, para que sus avisos
  // reflejen los productos y clientes que acaban de cambiar.
  const [catalogVersion, setCatalogVersion] = useState(0);
  const isAdmin = user.role === 'admin';
  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  const logout = () => {
    clearToken();
    onLogout();
  };

  return (
    <Page conRiel={false}>
      <header className="border-b border-line bg-raised">
        {isAdmin && <AvisoDeAlmacen />}
        {/* Barra de marca, como la del manual. */}
        <div className="bg-brand">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
            <Logotipo className="h-6 brightness-0 invert" />
            <span className="etiqueta text-white/85">Capacitación de caja</span>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-lg font-bold text-ink">Panel de Entrenadores</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-ink-muted">
              <span>{user.name}</span>
              <Badge tone={isAdmin ? 'brand' : 'neutral'}>{isAdmin ? 'Administrador' : 'Entrenador'}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={studentLinkFor(user.username)}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-brand hover:underline"
            >
              Ver como colaborador ↗
            </a>
            <button onClick={logout} className="text-sm font-semibold text-danger hover:underline">
              Cerrar sesión
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              // `px-2` y no `px-4`: con la pestaña de personajes son ocho y
              // pedían 49 px más de los que caben, así que la última
              // («Entrenadores») salía cortada en una pantalla de portátil. La
              // barra sabe desplazarse, pero una pestaña cortada parece un error.
              className={`-mb-px whitespace-nowrap border-b-2 px-2 py-3 text-sm font-semibold transition-colors ${
                tab === t.id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === 'compartir' && <ShareLinkPanel username={user.username} name={user.name} />}
        {tab === 'datos' && <StepDataEditor key={`datos-${catalogVersion}`} />}
        {tab === 'catalogo' && <CatalogEditor onSaved={() => setCatalogVersion((v) => v + 1)} />}
        {tab === 'nota' && <GradingConfigPanel />}
        {tab === 'personajes' && isAdmin && <PersonajesPanel />}
        {tab === 'sheets' && isAdmin && <SheetConfigPanel />}
        {tab === 'resultados' && <ResultsPanel isAdmin={isAdmin} />}
        {tab === 'usuarios' && isAdmin && <UsersPanel currentUsername={user.username} />}
      </main>
    </Page>
  );
};
