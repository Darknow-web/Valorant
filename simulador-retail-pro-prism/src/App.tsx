import React, { Suspense, lazy, useEffect, useState } from 'react';
import { motion } from 'motion/react';
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
import { AppView, clearToken, fetchMe, getToken, resolveInitialView, teacherFromLink } from './lib/session';
import { Button, Card, Isotipo, Page } from './components/ui/Kit';
import { cascada, elemento, isotipo } from './lib/motion';

/** Pantalla inicial cuando se abre la app sin enlace de entrenador. */
const Welcome = ({ onPanel }: { onPanel: () => void }) => (
  <Page className="flex items-start justify-center p-4 py-10 sm:items-center">
    <motion.div variants={cascada(0.09, 0.15)} initial="inicial" animate="visible" className="w-full max-w-lg">
      <div className="mb-8 text-center">
        <motion.div {...isotipo} className="mx-auto mb-5 w-fit">
          <Isotipo className="h-20 w-20 shadow-lg" />
        </motion.div>
        <motion.p variants={elemento} className="etiqueta text-brand">
          SuperPet · Mascotas felices
        </motion.p>
        <motion.h1 variants={elemento} className="mt-2 text-4xl font-extrabold text-ink">
          Simulador de caja
        </motion.h1>
        <motion.p variants={elemento} className="prosa mx-auto mt-3 text-ink-muted">
          Entrenamiento de Retail Pro Prism para colaboradores de tienda: casos reales de caja, sin tocar el sistema de
          verdad.
        </motion.p>
      </div>

      <motion.div variants={elemento}>
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-sand px-6 py-5">
            <h2 className="font-bold text-navy">¿Eres colaborador?</h2>
            <p className="prosa mt-1 text-sm text-navy/75">
              Abre el enlace o escanea el código QR que te compartió tu entrenador. Ahí encuentras tus módulos.
            </p>
          </div>
          <div className="px-6 py-5">
            <h2 className="font-bold text-ink">¿Eres entrenador?</h2>
            <p className="prosa mb-4 mt-1 text-sm text-ink-muted">
              Entra a tu panel para configurar los datos, compartir tu enlace y ver los resultados.
            </p>
            <Button onClick={onPanel}>Ir al panel</Button>
          </div>
        </Card>
      </motion.div>
    </motion.div>
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

  return <Welcome onPanel={() => setView('panel')} />;
}
