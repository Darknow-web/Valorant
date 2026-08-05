import React, { useState } from 'react';
import { AuthUser } from '../../types';
import { clearToken, studentLinkFor } from '../../lib/session';
import { Badge, Page } from '../ui/Kit';
import { ShareLinkPanel } from './ShareLinkPanel';
import { StepDataEditor } from './StepDataEditor';
import { CatalogEditor } from './CatalogEditor';
import { SyncConfigPanel } from './SyncConfigPanel';
import { ResultsPanel } from './ResultsPanel';
import { UsersPanel } from './UsersPanel';

type TabId = 'compartir' | 'datos' | 'catalogo' | 'sheets' | 'resultados' | 'usuarios';

const TABS: { id: TabId; label: string; adminOnly?: boolean }[] = [
  { id: 'compartir', label: 'Compartir' },
  { id: 'datos', label: 'Datos de los módulos' },
  { id: 'catalogo', label: 'Productos y clientes' },
  { id: 'sheets', label: 'Google Sheets y nota' },
  { id: 'resultados', label: 'Resultados' },
  { id: 'usuarios', label: 'Entrenadores', adminOnly: true },
];

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
    <Page>
      <header className="border-b border-line bg-raised">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-lg font-bold text-ink">Panel de Entrenadores — Retail Pro Prism</h1>
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
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
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
        {tab === 'sheets' && <SyncConfigPanel />}
        {tab === 'resultados' && <ResultsPanel />}
        {tab === 'usuarios' && isAdmin && <UsersPanel currentUsername={user.username} />}
      </main>
    </Page>
  );
};
