import React from 'react';
import { useSimulator } from '../store/SimulatorContext';
import { Interactive } from './ui/Interactive';
import { LoginScreen } from '../screens/LoginScreen';
import { MainMenuScreen } from '../screens/MainMenuScreen';
import { PosMainScreen } from '../screens/PosScreen';
import { PaymentScreen } from '../screens/PaymentScreen';
import { ZOutCloseScreen } from '../screens/ZOutCloseScreen';
import { RegistroScreen } from '../screens/RegistroScreen';
import { ReturnsMainScreen } from '../screens/ReturnsMainScreen';
import { ArqueoScreen } from '../screens/ArqueoScreen';
import { DesembolsoScreen } from '../screens/DesembolsoScreen';
import { ConciliacionScreen } from '../screens/ConciliacionScreen';
import { CerrarCajaScreen } from '../screens/CerrarCajaScreen';

/**
 * Selecciona la pantalla del Retail Pro simulado según el paso en curso.
 * Estas pantallas conservan a propósito su apariencia original: su valor es
 * parecerse al sistema real, no al tema claro del marco de entrenamiento.
 */
export const ScreenManager = () => {
  const { currentStep, status, handleInteract, modulesData, currentModuleId } = useSimulator();

  let screenIdToRender = currentStep?.screenId;
  if (status === 'completed') {
    const mod = modulesData.find((m) => m.id === currentModuleId);
    if (mod && mod.steps.length > 0) {
      screenIdToRender = mod.steps[mod.steps.length - 1].screenId;
    }
  }

  if (!screenIdToRender) return null;

  switch (screenIdToRender) {
    case 'login': return <LoginScreen />;
    case 'main-menu': return <MainMenuScreen />;
    case 'pos-menu': return <MainMenuScreen activeSection="pos" />;
    case 'pos-main': return <PosMainScreen />;
    case 'payment': return <PaymentScreen />;
    case 'registro': return <RegistroScreen />;
    case 'returns-main': return <ReturnsMainScreen />;
    case 'arqueo': return <ArqueoScreen />;
    case 'desembolso': return <DesembolsoScreen />;
    case 'conciliacion': return <ConciliacionScreen />;
    case 'cerrar-caja': return <CerrarCajaScreen />;
    case 'xz-menu': return <MainMenuScreen activeSection="xz" />;
    case 'z-out-close': return <ZOutCloseScreen />;

    case 'customer-search':
      return (
        <div className="p-10 text-white">
          <h1 className="mb-4 text-2xl">Customer Search Mockup</h1>
          <Interactive id="customer-btn-new">
            <div className="inline-block cursor-pointer bg-blue-500 p-4">Nuevo Cliente</div>
          </Interactive>
        </div>
      );

    case 'customer-new':
      return (
        <div className="flex flex-col space-y-4 p-10 text-white">
          <Interactive id="cust-new-name">
            <input
              placeholder="Nombre"
              onChange={(e) => handleInteract('cust-new-name', e.target.value)}
              onBlur={(e) => handleInteract('cust-new-name', e.target.value, true)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleInteract('cust-new-name', e.currentTarget.value, true); }}
              className="w-full p-2 text-black focus:outline-none"
            />
          </Interactive>
          <Interactive id="cust-new-doc">
            <input
              placeholder="DNI"
              onChange={(e) => handleInteract('cust-new-doc', e.target.value)}
              onBlur={(e) => handleInteract('cust-new-doc', e.target.value, true)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleInteract('cust-new-doc', e.currentTarget.value, true); }}
              className="w-full p-2 text-black focus:outline-none"
            />
          </Interactive>
          <Interactive id="cust-new-save">
            <button className="bg-green-500 p-2">Guardar</button>
          </Interactive>
        </div>
      );

    default:
      return <div className="p-10 text-white">Pantalla no implementada: {screenIdToRender}</div>;
  }
};
