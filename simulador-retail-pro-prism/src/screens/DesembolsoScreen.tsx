import React, { useState } from 'react';
import { useSimulator } from '../store/SimulatorContext';
import { Interactive } from '../components/ui/Interactive';
import { MainMenuScreen } from './MainMenuScreen';

export const DesembolsoScreen: React.FC = () => {
  const { handleInteract } = useSimulator();
  const [nota, setNota] = useState('');
  const [cantidad, setCantidad] = useState('0.00');
  const [isEditingCantidad, setIsEditingCantidad] = useState(false);
  const [pagoAgregado, setPagoAgregado] = useState(false);

  const handleAgregarPago = () => {
    handleInteract('desembolso-add-payment');
    setPagoAgregado(true);
  };

  const handleUpdate = () => {
    // Interactive handles handleInteract
  };

  return (
    <>
      <MainMenuScreen activeSection="pos" />
      <div className="absolute inset-0 bg-black/70 z-50 flex items-start justify-center pt-[5vh] text-[#333] text-[12px] font-sans">
        <div className="w-[99%] max-w-[1600px] bg-white flex flex-col border border-[#555] shadow-[0_0_20px_rgba(0,0,0,0.5)] h-[68vh]">
          {/* Header area */}
          <div className="bg-gradient-to-b from-[#1b4b7a] to-[#0f2c4a] text-white flex justify-between items-stretch border-b border-[#0f2c4a]">
            <div className="px-4 py-2 font-bold flex items-center text-[13px] flex-1">
              Retiro - Retiro de Dinero
            </div>
            <div className="flex flex-col items-center justify-center bg-gradient-to-b from-[#11406e] to-[#0a2745] px-6 py-1 text-[11px] border-x border-[#0a2745] min-w-[300px]">
              <span className="font-bold text-[10px] mb-0.5">Subsidiaria / Tienda</span>
              <div className="bg-gradient-to-b from-[#1b4b7a] to-[#0f2c4a] border border-[#0f2c4a] px-8 py-0.5 rounded-[3px] text-[11px] font-bold shadow-inner">
                Sp15 mayolo ↻
              </div>
            </div>
            <div className="flex-1"></div>
          </div>

          <div className="p-4 flex-1 flex flex-col">
            {/* Form Fields */}
            <div className="grid grid-cols-12 gap-3 mb-4 items-end">
               <div className="col-span-3">
                  <label className="font-bold text-[11px] block mb-1">Asociado</label>
                  <div className="flex border border-gray-400 shadow-sm h-[28px]">
                    <select className="w-full p-1 text-[11px] bg-white outline-none appearance-none">
                       <option>SYSADMIN</option>
                    </select>
                    <div className="w-[28px] bg-[#1a1a1a] text-white flex items-center justify-center pointer-events-none flex-shrink-0">
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
               </div>
               <div className="col-span-4">
                  <label className="font-bold text-[11px] block mb-1">Razones Desembolso</label>
                  <div className="flex border border-gray-400 shadow-sm h-[28px]">
                    <select className="w-full p-1 text-[11px] bg-white outline-none appearance-none">
                       <option>Seleccionar...</option>
                    </select>
                    <div className="w-[28px] bg-[#1a1a1a] text-white flex items-center justify-center pointer-events-none flex-shrink-0">
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
               </div>
               <div className="col-span-3">
                  <label className="font-bold text-[11px] block mb-1">Nota</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-400 px-2 h-[28px] text-[11px] bg-white shadow-sm outline-none"
                    value={nota}
                    onChange={(e) => {
                      setNota(e.target.value);
                    }}
                  />
               </div>
               <div className="col-span-2 flex space-x-1 justify-end h-[28px]">
                 <Interactive id="desembolso-add-payment">
                   <button onClick={handleAgregarPago} className="bg-[#1b4b7a] text-white px-3 h-full text-[11px] rounded-[3px] shadow-sm hover:bg-[#153a61]">Agregar Pago</button>
                 </Interactive>
                 <button className="bg-[#6c86a6] text-white px-3 h-full text-[11px] rounded-[3px] shadow-sm opacity-90 cursor-not-allowed">Quitar Pago</button>
               </div>
            </div>

            {/* Table */}
            <div className="border border-gray-300 flex-1 flex flex-col overflow-hidden min-h-[200px]">
               <div className="bg-[#f5f5f5] grid grid-cols-5 border-b border-gray-300 text-[11px] font-bold text-gray-700">
                  <div className="p-1.5 border-r border-gray-300">Nombre Moneda</div>
                  <div className="p-1.5 border-r border-gray-300">Metodo de Pago</div>
                  <div className="p-1.5 border-r border-gray-300">Cantidad</div>
                  <div className="p-1.5 border-r border-gray-300">Valor Moneda Base</div>
                  <div className="p-1.5">Balance de Gaveta</div>
               </div>
               <div className="flex-1 overflow-y-auto bg-white">
                 {pagoAgregado && (
                   <div className="grid grid-cols-5 border-b border-gray-200 text-[11px] items-center">
                     <div className="p-1.5 border-r border-gray-200 h-full">Nuevo Sol</div>
                     <div className="p-1.5 border-r border-gray-200 h-full">Efectivo</div>
                     <div className="p-0.5 border-r border-gray-200 h-full flex items-center">
                       {isEditingCantidad ? (
                         <input 
                           type="text" 
                           className="w-full border border-[#00a2e8] p-1 text-[11px] outline-none shadow-[0_0_2px_#00a2e8]" 
                           value={cantidad}
                           onChange={(e) => {
                             setCantidad(e.target.value);
                           }}
                           onBlur={() => {
                             if (cantidad) {
                               if (!cantidad.includes('.')) {
                                 setCantidad(cantidad + '.00');
                               } else {
                                 const parts = cantidad.split('.');
                                 if (parts[1].length === 0) setCantidad(cantidad + '00');
                                 else if (parts[1].length === 1) setCantidad(cantidad + '0');
                               }
                             }
                             setIsEditingCantidad(false);
                           }}
                           autoFocus
                         />
                       ) : (
                         <Interactive id="desembolso-click-cantidad" className="w-full h-full flex items-center">
                           <div className="w-full h-full p-1 cursor-text" onClick={() => {
                             setIsEditingCantidad(true);
                             if (cantidad === '0.00') setCantidad('');
                           }}>
                             {cantidad}
                           </div>
                         </Interactive>
                       )}
                     </div>
                     <div className="p-1.5 border-r border-gray-200 h-full">S/. {cantidad || '0.00'}</div>
                     <div className="p-1.5 h-full"></div>
                   </div>
                 )}
               </div>
               <div className="bg-white border-t border-gray-300 p-1 flex justify-end font-bold">
                 <div className="bg-black text-white px-2 py-0.5 text-[11px] w-[180px] flex justify-between">
                   <span>Total</span>
                   <span>S/ {cantidad || '0.00'}</span>
                 </div>
               </div>
            </div>
            
            <div className="pt-4 pb-2 flex justify-end space-x-2">
              <button className={`px-4 py-1.5 border border-black rounded-[4px] shadow-sm text-white text-[12px] bg-gradient-to-b from-[#666] to-[#444] opacity-80 cursor-not-allowed`}>
                 Imprimir
              </button>
              <Interactive id="desembolso-update" value={cantidad}>
                <button 
                  onClick={handleUpdate} 
                  className={`px-4 py-1.5 border border-black rounded-[4px] shadow-sm text-white text-[12px] ${pagoAgregado ? 'bg-gradient-to-b from-[#666] to-[#444] hover:from-[#777] hover:to-[#555]' : 'bg-gradient-to-b from-[#666] to-[#444] opacity-80 cursor-not-allowed'}`}
                  disabled={!pagoAgregado}
                >
                   Sólo Actualizar
                </button>
              </Interactive>
              <button className="px-4 py-1.5 bg-gradient-to-b from-[#111] to-[#000] border border-black rounded-[4px] shadow-sm text-white text-[12px]">
                 Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
