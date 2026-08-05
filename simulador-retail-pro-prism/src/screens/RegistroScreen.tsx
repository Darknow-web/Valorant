import React from 'react';
import { PrismHeader } from '../components/prism/PrismHeader';
import { PrismFooter } from '../components/prism/PrismFooter';
import { Interactive } from '../components/ui/Interactive';
import { useSimulator } from '../store/SimulatorContext';

export const RegistroScreen = () => {
  const { appState, setAppState, handleInteract } = useSimulator();

  return (
    <div className="w-full min-h-full flex flex-col bg-[#222222] font-sans">
      <PrismHeader title="Registro" className="py-2" />
      
      <div className="bg-white h-[3px] w-full"></div>
      
      <div className="flex-1 p-[2px] flex flex-col relative z-20">
         <div className="flex bg-white h-[250px] space-x-[2px]">
            
            {/* Left Column */}
            <div className="w-[430px] bg-white flex flex-col border border-[#777]">
               <div className="bg-gradient-to-b from-[#21568c] to-[#04203e] text-white px-2 py-1.5 text-sm border-b border-[#031326]">Monedas</div>
               
               <div className="flex-1 bg-white">
                  <div className="px-2 py-1.5 bg-[#ffff00] border-b border-[#ccc]">
                     <span className="text-[13px] text-black">PEN : Nuevo Sol</span>
                  </div>
               </div>
               <div className="bg-[#f0f0f0] border-t border-[#ccc]">
                  <div className="flex justify-between items-center px-2 py-1.5">
                    <span className="text-[13px] text-[#1a5b92]">Total Efectivo</span>
                    <span className="bg-black text-white px-2 py-[2px] text-[13px] font-bold min-w-[90px] text-right shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">S/.{appState.fondoCaja || '0.00'}</span>
                  </div>
                  <div className="flex justify-between items-center px-2 py-1.5 pb-2">
                    <span className="text-[13px] text-[#1a5b92]">Gran Total</span>
                    <span className="bg-black text-white px-2 py-[2px] text-[13px] font-bold min-w-[90px] text-right shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">S/.{appState.fondoCaja || '0.00'}</span>
                  </div>
               </div>
            </div>

            {/* Right Column */}
            <div className="flex-1 bg-white flex flex-col border border-[#777]">
               <div className="bg-gradient-to-b from-[#21568c] to-[#04203e] text-white px-2 py-1.5 text-sm border-b border-[#031326]">
                  Conteo de Moneda PEN : Nuevo Sol
               </div>
               
               <div className="flex-1 flex">
                  {/* Table area */}
                  <div className="flex-1 flex flex-col">
                     <div className="flex bg-[#f5f5f5] border-b border-[#e0e0e0] px-2 py-1.5">
                       <div className="flex-1 text-[12px] font-bold text-[#555]">Denominacion</div>
                       <div className="w-24 text-center text-[12px] font-bold text-[#555]">Conteo</div>
                       <div className="w-24 text-right text-[12px] font-bold text-[#555]">Total</div>
                     </div>
                     <div className="flex-1 bg-white"></div>
                  </div>

                  {/* Input area */}
                  <div className="w-[300px] border-l border-[#ccc] p-3 flex flex-col">
                     <div className="flex mb-4 border border-[#999] rounded-[2px] overflow-hidden">
                        <button className="flex-1 bg-white text-[12px] text-[#333] py-1.5 hover:bg-gray-50 border-r border-[#999]">
                           Ingrese Denominaciones
                        </button>
                        <button className="flex-1 bg-gradient-to-b from-[#21568c] to-[#04203e] text-white text-[12px] py-1.5">
                           Ingrese Totales
                        </button>
                     </div>
                     
                     <label className="text-[12px] font-bold text-[#333] mb-1">Total Nuevo Sol</label>
                     <Interactive id="input-fondo-caja">
                        <input 
                            type="text" 
                            value={appState.fondoCaja} 
                            onChange={(e) => {
                                const val = e.target.value;
                                setAppState({ fondoCaja: val });
                            }}
                            onBlur={(e) => {
                                let val = e.target.value;
                                if (val && !val.includes('.')) {
                                    val = val + '.00';
                                    setAppState({ fondoCaja: val });
                                }
                                handleInteract('input-fondo-caja', val, true);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleInteract('input-fondo-caja', appState.fondoCaja, true);
                                }
                            }}
                            className="bg-white border border-[#5b9dd9] p-1.5 w-full text-left text-black focus:outline-none focus:border-[#2b7bba] focus:ring-1 focus:ring-[#2b7bba] text-[13px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] rounded-[2px]" 
                        />
                     </Interactive>
                  </div>
               </div>
            </div>
            
         </div>
      </div>
      
      <PrismFooter 
         leftText="Cancelar"
         rightText="Siguiente"
         rightAction={() => handleInteract('btn-siguiente')}
         hideRetailPro={true}
      />
    </div>
  );
};
