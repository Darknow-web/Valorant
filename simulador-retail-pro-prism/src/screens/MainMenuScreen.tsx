import React, { useState } from 'react';
import { PrismHeader } from '../components/prism/PrismHeader';
import { PrismMenuButton } from '../components/prism/PrismButton';
import { PrismTabs } from '../components/prism/PrismTabs';
import { Interactive } from '../components/ui/Interactive';
import { useSimulator } from '../store/SimulatorContext';
import { Icons } from '../config/icons';

export const MainMenuScreen = ({ activeSection = 'pos' }: { activeSection?: 'pos' | 'customers' | 'xz' | '' }) => {
  const { appState, handleInteract, currentModuleId } = useSimulator();
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showDesembolsoSubMenu, setShowDesembolsoSubMenu] = useState(false);

  const handleNewTransaction = () => {
    if (!appState.registerOpen) {
      setShowRegisterModal(true);
    }
  };

  const handleNuevoDesembolso = () => {
    const result = handleInteract('pos-menu-new-desembolso');
    if (result !== false) {
      setShowDesembolsoSubMenu(true);
    }
  };


  const handleModalYes = () => {
    setShowRegisterModal(false);
  };

  const handleModalNo = () => {
    setShowRegisterModal(false);
  };

  const tabs = [
    {
      id: 'pos',
      label: 'Punto de Venta',
      iconSrc: Icons.puntoDeVenta,
      interactiveId: 'menu-btn-pos'
    },
    {
      id: 'customers',
      label: 'Clientes',
      iconSrc: Icons.clientes,
      interactiveId: 'menu-btn-customers'
    },
    {
      id: 'xz',
      label: 'X/Z-Out',
      iconSrc: Icons.xzOut,
      interactiveId: 'menu-btn-xz'
    }
  ];

  return (
    <div className="w-full min-h-full flex flex-col bg-[#1c1c1c] relative font-sans">
      <PrismTabs tabs={tabs} activeTabId={activeSection} onTabChange={() => {}} />

      <div className="w-full px-[2px] relative z-20">
         {activeSection === 'pos' && <PosSubMenu onNewTransaction={handleNewTransaction} onNuevoDesembolso={handleNuevoDesembolso} />}
         {activeSection === 'customers' && <CustomersSubMenu />}
         {activeSection === 'xz' && <XZSubMenu />}
      </div>

      {showDesembolsoSubMenu && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-start pt-[5vh] justify-center">
          <div className="bg-white w-[95%] shadow-[0_0_20px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden border border-[#333]">
             <div className="bg-gradient-to-b from-[#1b4b7a] to-[#0f2c4a] text-white px-4 py-2 text-[14px] font-sans shadow-sm font-bold">
               Desembolsos
             </div>
             <div className="px-5 pt-4 pb-4 bg-white flex flex-col">
                <div className="grid grid-cols-4 gap-[10px] w-[80%] mx-auto mt-2 mb-8">
                  <PrismMenuButton id="desembolso-retiro-dinero" text="Retiro de Dinero" onClick={() => handleInteract('desembolso-retiro-dinero')} iconSrc={Icons.nuevoDesembolso} />
                  <PrismMenuButton id="desembolso-egreso" text="Egreso" onClick={() => handleInteract('desembolso-egreso')} iconSrc={Icons.abrirGaveta} />
                  <PrismMenuButton id="desembolso-ingreso" text="Ingreso" onClick={() => handleInteract('desembolso-ingreso')} iconSrc={Icons.nuevoDesembolso} />
                  <PrismMenuButton id="desembolso-abrir-gaveta" text="Abrir Gaveta" onClick={() => handleInteract('desembolso-abrir-gaveta')} iconSrc={Icons.abrirGaveta} />
                </div>
                <div className="flex justify-end pt-2">
                  <button onClick={() => setShowDesembolsoSubMenu(false)} className="bg-gradient-to-b from-[#333] to-[#111] hover:from-[#444] hover:to-[#222] text-white px-6 py-1.5 border border-black rounded-[5px] shadow-sm text-[14px]">
                    Cerrar
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {activeSection === 'pos' && appState.registerOpen && appState.fondoCaja !== '' && currentModuleId === 'm2' && (
        <div className="absolute bottom-0 right-0 z-50">
           <img src="https://firebasestorage.googleapis.com/v0/b/simulador-retail-pro.firebasestorage.app/o/Icono%20de%20Apertura%20correcta.png?alt=media" alt="Apertura Correcta" className="w-[320px] object-contain shadow-2xl" />
        </div>
      )}

      {showRegisterModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-start pt-[8vh] justify-center">
          <div className="bg-white w-[550px] rounded-sm shadow-[0_0_20px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden border border-[#333]">
             <div className="bg-gradient-to-b from-[#1b4b7a] to-[#0f2c4a] text-white px-4 py-2.5 text-[19px] font-sans shadow-sm">
               Registradora No esta Abierto
             </div>
             <div className="px-5 pt-3 pb-4 text-[14px] text-gray-800 bg-white min-h-[50px] flex items-start">
                Una registradora no se ha abierto. ¿Le gustaría abrir un registrador?
             </div>
             <div className="bg-white px-5 pb-3 flex justify-end space-x-2">
                <Interactive id="modal-register-yes">
                  <button onClick={handleModalYes} className="bg-gradient-to-b from-[#333] to-[#111] hover:from-[#444] hover:to-[#222] text-white px-4 py-1.5 border border-black rounded-[5px] shadow-sm text-[14px]">Sí</button>
                </Interactive>
                <button onClick={handleModalNo} className="bg-gradient-to-b from-[#333] to-[#111] hover:from-[#444] hover:to-[#222] text-white px-4 py-1.5 border border-black rounded-[5px] shadow-sm text-[14px]">No</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PosSubMenu = ({ onNewTransaction, onNuevoDesembolso }: { onNewTransaction: () => void, onNuevoDesembolso: () => void }) => (
  <div className="border border-white bg-white">
    <PrismHeader title="Punto de Venta" />
    <div className="p-[10px] bg-white">
       <div className="grid grid-cols-4 gap-[10px]">
          <PrismMenuButton id="pos-menu-new-trans" text="Nueva Transacción" onClick={onNewTransaction} iconSrc={Icons.nuevaTransaccion} />
          <PrismMenuButton text="Búsqueda de Transacción" iconSrc={Icons.busquedaTransaccion} />
          <PrismMenuButton text="Transacciones Pendientes" iconSrc={Icons.transaccionesPendientes} />
          <PrismMenuButton text="Promociones" iconSrc={Icons.promociones} />
          
          <PrismMenuButton id="pos-menu-new-desembolso" text="Nuevo desembolso" onClick={onNuevoDesembolso} iconSrc={Icons.nuevoDesembolso} />
          <PrismMenuButton text="Buscar Desembolso" iconSrc={Icons.buscarDesembolso} />
          <PrismMenuButton text="Abrir Gaveta" iconSrc={Icons.abrirGaveta} />
          <PrismMenuButton text="Cambiar Gaveta/Cajón" iconSrc={Icons.cambiarGaveta} />
       </div>
    </div>
  </div>
);

const CustomersSubMenu = () => (
  <div className="border border-white bg-white">
    <PrismHeader title="Manejo de Clientes" />
    <div className="p-[10px] bg-white">
       <div className="grid grid-cols-4 gap-[10px]">
          <PrismMenuButton id="customer-menu-search" text="Búsqueda de Clientes" iconSrc={Icons.busquedaTransaccion} />
          <PrismMenuButton text="Fidelización de Clientes" iconSrc={Icons.clientes} />
       </div>
    </div>
  </div>
);

const XZSubMenu = () => (
  <div className="border border-white bg-white">
    <PrismHeader title="X/Z-Out" />
    <div className="p-[10px] bg-white">
       <div className="grid grid-cols-4 gap-[10px]">
          <PrismMenuButton id="xz-btn-arqueo" text="Arqueo" iconSrc={Icons.arqueo} iconScale="scale-[1]" />
          <PrismMenuButton id="xz-btn-close" text="Z Out Cierre" iconSrc={Icons.zOutCierre} iconScale="scale-[1]" />
          <PrismMenuButton text="Z Out Histórico" iconSrc={Icons.zOutHistorico} iconScale="scale-[1]" />
       </div>
    </div>
  </div>
);
