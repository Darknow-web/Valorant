import React, { useEffect, useState } from 'react';
import { useSimulator } from '../store/SimulatorContext';
import { StudentInfoModal } from './StudentInfoModal';
import { ScenarioBriefing, ScenarioDrawer } from './ScenarioBriefing';
import { SimulatorHeader } from './SimulatorHeader';
import { ScreenManager } from './ScreenManager';
import { PrismShell } from './ui/PrismUI';
import { Badge, Button, Card, Notice, Page } from './ui/Kit';
import { scenarios } from '../data/scenarios';

/** Resumen del intento, ya con la nota que calculó el servidor. */
const CompletedScreen = () => {
  const { exitModule, errors, startTime, endTime, submitScore, score, syncStatus, syncMessage } = useSimulator();
  const seconds = endTime && startTime ? Math.round((endTime - startTime) / 1000) : 0;

  // Un solo envío por intento: el contexto ignora reenvíos del mismo attemptId,
  // así que ni el doble montaje de React ni una recarga duplican la fila.
  useEffect(() => {
    submitScore();
  }, [submitScore]);

  return (
    <div className="frame absolute inset-0 z-[9999] flex items-center justify-center bg-ink/50 p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-ok-soft text-ok">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-ink">Módulo completado</h2>
        <p className="mb-6 mt-1 text-sm text-ink-muted">Terminaste el proceso.</p>

        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: 'Tiempo', value: `${seconds}s` },
            { label: 'Errores', value: String(errors) },
            { label: 'Nota', value: score ?? '—' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-sunken px-3 py-4">
              <div className="text-xs text-ink-muted">{stat.label}</div>
              <div className="mt-1 font-mono text-lg font-semibold text-ink">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="mb-6 text-sm">
          {syncStatus === 'sending' && <span className="text-ink-muted">Enviando tu nota…</span>}
          {syncStatus === 'synced' && <Notice tone="ok">{syncMessage}</Notice>}
          {syncStatus === 'saved_locally' && <Notice tone="warn">{syncMessage}</Notice>}
          {syncStatus === 'failed' && <Notice tone="danger">{syncMessage}</Notice>}
        </div>

        <Button onClick={exitModule} className="w-full">
          Volver a los módulos
        </Button>
      </Card>
    </div>
  );
};

/**
 * Aviso de error. No revela el paso correcto: para eso está la pista, que
 * descuenta puntaje. Así el colaborador sigue trabajando desde la situación.
 */
const ErrorModal = () => {
  const { dismissErrorModal, customErrorMessage, triggerHint, currentStep, hintActive } = useSimulator();
  if (!currentStep) return null;

  return (
    <div className="frame fixed inset-0 z-[9999] flex items-center justify-center bg-ink/50 p-4">
      <Card className="w-full max-w-md overflow-hidden">
        <div className="h-1 w-full bg-danger" />
        <div className="p-7">
          <h2 className="text-lg font-bold text-ink">Ese no era el paso</h2>
          <p className="mb-4 mt-1 text-sm text-ink-muted">
            {customErrorMessage || 'Revisa la situación de la tienda y vuelve a intentarlo.'}
          </p>

          {hintActive && (
            <div className="mb-4 rounded-lg border border-warn/25 bg-warn-soft px-4 py-3 text-sm text-ink">
              <span className="font-semibold text-warn">Pista: </span>
              {currentStep.hintMessage || currentStep.instruction}
            </div>
          )}

          <div className="flex gap-3">
            {!hintActive && (
              <Button variant="secondary" onClick={triggerHint} className="flex-1">
                Ver pista
              </Button>
            )}
            <Button onClick={dismissErrorModal} className="flex-1">
              Entendido
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

/** Lista de módulos del colaborador. */
const ModuleMenu = ({ onPick }: { onPick: (moduleId: string) => void }) => {
  const { modulesData, completedModules, operatorName, operatorStore, clearOperator } = useSimulator();

  return (
    <Page className="px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-ink-muted">
            Colaborador: <span className="font-semibold text-ink">{operatorName}</span>
            {operatorStore && <span className="text-ink-subtle"> · {operatorStore}</span>}
            <button onClick={clearOperator} className="ml-3 font-semibold text-brand hover:underline">
              Cambiar
            </button>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ink">Simulador Retail Pro Prism</h1>
          <p className="mt-2 text-ink-muted">
            Elige un módulo. Vas a leer una situación de tienda y resolverla en el sistema, sin instrucciones paso a paso.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modulesData.map((mod) => {
            const isCompleted = completedModules.includes(mod.id);
            const scenario = scenarios.find((s) => s.moduleId === mod.id);
            return (
              <Card
                key={mod.id}
                as="button"
                onClick={() => onPick(mod.id)}
                className={`p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  isCompleted ? 'border-ok/40' : ''
                }`}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-ink">{mod.title}</h3>
                  {isCompleted && <Badge tone="ok">Hecho ✓</Badge>}
                </div>
                {scenario && <p className="text-sm text-ink-muted">{scenario.titulo}</p>}
                <p className="mt-3 text-xs text-ink-subtle">{mod.steps.length} acciones en el sistema</p>
              </Card>
            );
          })}
        </div>

        {completedModules.length === modulesData.length && modulesData.length > 0 && (
          <div className="mt-10 rounded-xl border border-ok/30 bg-ok-soft px-6 py-8 text-center">
            <h2 className="text-2xl font-bold text-ok">¡Terminaste todos los módulos!</h2>
            <p className="mt-1 text-ink-muted">Tus resultados ya están con tu entrenador.</p>
          </div>
        )}
      </div>
    </Page>
  );
};

export const StudentApp = ({ teacherUsername }: { teacherUsername: string }) => {
  const { status, startModule, modulesData, showErrorModal, handleInteract, currentModuleId, operatorName } =
    useSimulator();
  const [briefingModuleId, setBriefingModuleId] = useState<string | null>(null);
  const [showScenario, setShowScenario] = useState(false);

  if (!operatorName) return <StudentInfoModal teacherUsername={teacherUsername} />;

  if (status === 'menu') {
    const briefing = briefingModuleId ? modulesData.find((m) => m.id === briefingModuleId) : null;
    if (briefing) {
      return (
        <Page>
          <ScenarioBriefing
            module={briefing}
            modules={modulesData}
            onBack={() => setBriefingModuleId(null)}
            onStart={() => {
              setBriefingModuleId(null);
              startModule(briefing.id);
            }}
          />
        </Page>
      );
    }
    return <ModuleMenu onPick={setBriefingModuleId} />;
  }

  return (
    <div className="frame flex h-screen flex-col overflow-hidden bg-surface">
      {status === 'completed' && <CompletedScreen />}
      {showErrorModal && <ErrorModal />}
      {showScenario && currentModuleId && (
        <ScenarioDrawer moduleId={currentModuleId} modules={modulesData} onClose={() => setShowScenario(false)} />
      )}
      <SimulatorHeader onShowScenario={() => setShowScenario(true)} />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <div onClick={() => handleInteract('background')} className="h-full min-h-0 w-full">
          <PrismShell url="sp4mj0jy4j1:8080/prism.shtml">
            <ScreenManager />
          </PrismShell>
        </div>
      </div>
    </div>
  );
};
