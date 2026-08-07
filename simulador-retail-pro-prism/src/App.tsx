import React, { Suspense, lazy, useEffect, useState } from 'react';
import { SimulatorProvider } from './store/SimulatorContext';
import { StudentApp } from './components/StudentApp';
// El panel del entrenador (con el generador de QR) se carga aparte: el
// colaborador entra desde la tienda, muchas veces con datos móviles, y no
// tiene por qué descargar código que nunca va a usar.
const TeacherPanel = lazy(() =>
  import('./components/teacher/TeacherPanel').then((m) => ({ default: m.TeacherPanel }))
);
import { LoginForm, ChangePasswordForm } from './components/teacher/LoginForm';
import { AuthUser } from './types';
import { clearToken, fetchMe, getToken, teacherFromLink } from './lib/session';
import { Page } from './components/ui/Kit';
import { IntroSuperPet, useIntro } from './components/IntroSuperPet';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(!!getToken());
  const [introVisible, cerrarIntro] = useIntro();
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
  if (teacherLink) {
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

  // A partir de aquí solo entran administradores y entrenadores: la raíz es el
  // acceso, sin bifurcación. Los colaboradores llegan por el enlace de arriba.
  if (introVisible) return <IntroSuperPet onFinish={cerrarIntro} />;

  if (!user) return <LoginForm onLogin={setUser} />;

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

  return (
    <Suspense
      fallback={
        <Page className="flex items-center justify-center">
          <p className="text-sm text-ink-muted">Abriendo tu panel…</p>
        </Page>
      }
    >
      <TeacherPanel user={user} onLogout={() => setUser(null)} />
    </Suspense>
  );
}
