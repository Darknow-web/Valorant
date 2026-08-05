import React, { useEffect, useState } from 'react';
import { SimulatorProvider } from './store/SimulatorContext';
import { StudentApp } from './components/StudentApp';
import { TeacherPanel } from './components/teacher/TeacherPanel';
import { LoginForm, ChangePasswordForm } from './components/teacher/LoginForm';
import { AuthUser } from './types';
import { AppView, clearToken, fetchMe, getToken, resolveInitialView, teacherFromLink } from './lib/session';
import { Button, Card, Page } from './components/ui/Kit';

/** Pantalla inicial cuando se abre la app sin enlace de entrenador. */
const Welcome = ({ onPanel }: { onPanel: () => void }) => (
  <Page className="flex items-center justify-center p-4">
    <Card className="w-full max-w-lg p-10 text-center">
      <h1 className="text-2xl font-bold text-ink">Simulador Retail Pro Prism</h1>
      <p className="mx-auto mt-2 max-w-md text-ink-muted">
        Entrenamiento interactivo de caja para colaboradores de tienda.
      </p>

      <div className="mt-8 space-y-4 text-left">
        <div className="rounded-lg border border-line bg-sunken px-4 py-4">
          <h2 className="font-semibold text-ink">¿Eres colaborador?</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Abre el enlace o escanea el código QR que te compartió tu entrenador. Ahí encuentras tus módulos.
          </p>
        </div>

        <div className="rounded-lg border border-line px-4 py-4">
          <h2 className="font-semibold text-ink">¿Eres entrenador?</h2>
          <p className="mb-3 mt-1 text-sm text-ink-muted">
            Ingresa a tu panel para configurar los datos, compartir tu enlace y ver los resultados.
          </p>
          <Button onClick={onPanel}>Ir al panel</Button>
        </div>
      </div>
    </Card>
  </Page>
);

export default function App() {
  const [view, setView] = useState<AppView>(resolveInitialView);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(!!getToken());
  const teacherLink = teacherFromLink();

  // La sesión se valida contra el servidor. El rol nunca se deduce del token
  // en el navegador, que era lo que permitía hacerse pasar por administrador.
  useEffect(() => {
    if (!getToken()) {
      setCheckingSession(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .finally(() => setCheckingSession(false));
  }, []);

  // El enlace del colaborador manda: quien lo abre va a sus módulos, nunca al
  // panel (antes la app arrancaba en el panel para todo el mundo).
  if (view === 'student' || teacherLink) {
    return (
      <SimulatorProvider teacherUsername={teacherLink}>
        <StudentApp teacherUsername={teacherLink} />
      </SimulatorProvider>
    );
  }

  if (checkingSession) {
    return (
      <Page className="flex items-center justify-center">
        <p className="text-sm text-ink-muted">Cargando…</p>
      </Page>
    );
  }

  if (view === 'panel') {
    if (!user) {
      return <LoginForm onLogin={setUser} onBack={() => setView('welcome')} />;
    }
    if (user.mustChangePassword) {
      return (
        <ChangePasswordForm
          onDone={() => setUser({ ...user, mustChangePassword: false })}
          onLogout={() => {
            clearToken();
            setUser(null);
          }}
        />
      );
    }
    return <TeacherPanel user={user} onLogout={() => setUser(null)} />;
  }

  return <Welcome onPanel={() => setView('panel')} />;
}
