import React, { useState } from 'react';
import { PrismHeader } from '../components/prism/PrismHeader';
import { Interactive } from '../components/ui/Interactive';
import { useSimulator } from '../store/SimulatorContext';

export const CerrarCajaScreen = () => {
  const { handleInteract } = useSimulator();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('tarjeta');
  const [transactionsSelected, setTransactionsSelected] = useState(false);

  const handleConfirmCierre = () => {
    
    setShowConfirmModal(false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#222222] font-sans">
      <PrismHeader title="Cerrar Caja" className="py-2" />
      
      <div className="bg-white h-[3px] w-full"></div>
      
      <div className="flex-1 p-[2px] flex flex-col relative z-20">
         <div className="flex h-[300px] space-x-[2px]">
             
            {/* Left Column */}
            <div className="w-[430px] bg-white flex flex-col border border-[#777]">
               <div className="bg-gradient-to-b from-[#21568c] to-[#04203e] text-white px-2 py-1.5 text-sm border-b border-[#031326]">Monedas</div>
               
               <div className="flex-1 bg-white p-2 space-y-1.5 overflow-y-auto">
                  <div className={`border border-[#ccc] rounded-[2px] flex items-center justify-between cursor-pointer p-1.5 ${selectedCurrency === 'tarjeta' ? 'bg-[#ffff00]' : 'bg-white'}`} onClick={() => setSelectedCurrency('tarjeta')}>
                     <div className="flex items-center space-x-2">
                       <span className="w-5 h-5 bg-[#ccc] text-[#333] rounded-full flex items-center justify-center text-[11px] font-bold">10</span>
                       <span className="text-[12px] text-black">Tarjeta de Crédito</span>
                     </div>
                     <span className="bg-[#ccc] text-[#333] px-2 py-0.5 rounded-[2px] text-[12px] font-bold">S/.4,264.30</span>
                  </div>
                  <div className={`border border-[#ccc] rounded-[2px] flex items-center justify-between cursor-pointer p-1.5 ${selectedCurrency === 'credito' ? 'bg-[#ffff00]' : 'bg-white'}`} onClick={() => setSelectedCurrency('credito')}>
                     <div className="flex items-center space-x-2">
                       <span className="w-5 h-5 bg-[#ccc] text-[#333] rounded-full flex items-center justify-center text-[11px] font-bold">0</span>
                       <span className="text-[12px] text-black">Crédito de Tienda</span>
                     </div>
                     <span className="bg-[#ccc] text-[#333] px-2 py-0.5 rounded-[2px] text-[12px] font-bold">S/.0.00</span>
                  </div>
                  <div className={`border border-[#ccc] rounded-[2px] flex items-center justify-between cursor-pointer p-1.5 ${selectedCurrency === 'deposito' ? 'bg-[#ffff00]' : 'bg-white'}`} onClick={() => setSelectedCurrency('deposito')}>
                     <div className="flex items-center space-x-2">
                       <span className="w-5 h-5 bg-[#ccc] text-[#333] rounded-full flex items-center justify-center text-[11px] font-bold">0</span>
                       <span className="text-[12px] text-black">Depósito</span>
                     </div>
                     <span className="bg-[#ccc] text-[#333] px-2 py-0.5 rounded-[2px] text-[12px] font-bold">S/.0.00</span>
                  </div>
                  <div className={`border border-[#ccc] rounded-[2px] flex items-center justify-between cursor-pointer p-1.5 ${selectedCurrency === 'debito' ? 'bg-[#ffff00]' : 'bg-white'}`} onClick={() => setSelectedCurrency('debito')}>
                     <div className="flex items-center space-x-2">
                       <span className="w-5 h-5 bg-[#ccc] text-[#333] rounded-full flex items-center justify-center text-[11px] font-bold">0</span>
                       <span className="text-[12px] text-black">Tarjeta de Débito</span>
                     </div>
                     <span className="bg-[#ccc] text-[#333] px-2 py-0.5 rounded-[2px] text-[12px] font-bold">S/.0.00</span>
                  </div>
               </div>
               <div className="bg-[#f9f9f9] border-t border-[#ccc] p-2 flex">
                  <div className="flex-1 flex flex-col justify-between text-[11px] text-[#1a5b92] py-0.5 space-y-1">
                    <span>Total Efectivo</span>
                    <span>Total No-Efectivo</span>
                    <span>Gran Total</span>
                  </div>
                  <div className="bg-black text-white p-1 text-[11px] font-bold flex flex-col justify-between items-end w-[160px] rounded-[2px]">
                    <span>S/.300.00</span>
                    <span>S/.0.00</span>
                    <span>S/.300.00</span>
                  </div>
               </div>
            </div>

            {/* Right Column */}
            <div className="flex-1 bg-white flex flex-col border border-[#777]">
               <div className="bg-gradient-to-b from-[#21568c] to-[#04203e] text-white px-2 py-1 text-sm border-b border-[#031326] flex justify-between items-center">
                  <span>Medios de Pagos - Tarjeta de Crédito</span>
                  <button className="bg-gradient-to-b from-[#333] to-[#111] border border-black text-white px-3 py-0.5 text-[11px] rounded-[2px] shadow-sm hover:from-[#444] hover:to-[#222]">
                    + Añadir
                  </button>
               </div>
               
               <div className="flex-1 p-[1px] bg-white overflow-y-auto">
                  {selectedCurrency === 'tarjeta' ? (
                     <table className="w-full text-[11px] text-[#333]">
                        <thead>
                           <tr className="bg-[#f5f5f5] border-b border-[#ccc] text-[#aaa]">
                              <th className="p-1 w-8 border-r border-[#ccc]">
                                 <Interactive id="btn-check-all-trans">
                                    <button 
                                      onClick={() => {
                                        setTransactionsSelected(true);
                                      }}
                                      className={`w-5 h-5 flex items-center justify-center text-[11px] font-bold mx-auto cursor-pointer shadow-sm ${transactionsSelected ? 'bg-[#008000] text-white rounded-sm text-[10px]' : 'bg-[#111] text-white border border-black'}`}
                                    >
                                       {transactionsSelected ? '✓' : '?'}
                                    </button>
                                 </Interactive>
                              </th>
                              <th className="p-1 text-left border-r border-[#ccc] font-normal w-24">Documento #</th>
                              <th className="p-1 text-left border-r border-[#ccc] font-normal w-16">EFT #</th>
                              <th className="p-1 text-left border-r border-[#ccc] font-normal w-32">
                                <input type="text" placeholder="Cantidad" className="border border-[#ccc] w-full px-1 py-0.5 text-[#333] focus:outline-none focus:border-[#999] h-5 text-[11px] placeholder:text-[#999]" />
                              </th>
                              <th className="p-1 text-left border-r border-[#ccc] font-normal w-40">Fecha</th>
                              <th className="p-1 text-left font-normal w-16">Nota</th>
                           </tr>
                        </thead>
                        <tbody>
                           <tr className="border-b border-[#eee]">
                              <td className="p-1 border-r border-[#eee] text-center">
                                 {transactionsSelected && (
                                    <div className="w-5 h-5 bg-[#008000] text-white flex items-center justify-center text-[10px] rounded-sm mx-auto shadow-sm">
                                       ✓
                                    </div>
                                 )}
                              </td>
                              <td className="p-1 border-r border-[#eee]">#705</td>
                              <td className="p-1 border-r border-[#eee]">--</td>
                              <td className="p-1 border-r border-[#eee]">S/.3,800.00 (MasterCard)</td>
                              <td className="p-1 border-r border-[#eee]">27 may. 2025 15:53:27</td>
                              <td className="p-1"></td>
                           </tr>
                           <tr className="border-b border-[#eee]">
                              <td className="p-1 border-r border-[#eee] text-center">
                                 {transactionsSelected && (
                                    <div className="w-5 h-5 bg-[#008000] text-white flex items-center justify-center text-[10px] rounded-sm mx-auto shadow-sm">
                                       ✓
                                    </div>
                                 )}
                              </td>
                              <td className="p-1 border-r border-[#eee]">#713</td>
                              <td className="p-1 border-r border-[#eee]">--</td>
                              <td className="p-1 border-r border-[#eee]">S/.30.00</td>
                              <td className="p-1 border-r border-[#eee]">28 may. 2025 15:06:40</td>
                              <td className="p-1"></td>
                           </tr>
                           <tr className="border-b border-[#eee]">
                              <td className="p-1 border-r border-[#eee] text-center">
                                 {transactionsSelected && (
                                    <div className="w-5 h-5 bg-[#008000] text-white flex items-center justify-center text-[10px] rounded-sm mx-auto shadow-sm">
                                       ✓
                                    </div>
                                 )}
                              </td>
                              <td className="p-1 border-r border-[#eee]">#715</td>
                              <td className="p-1 border-r border-[#eee]">--</td>
                              <td className="p-1 border-r border-[#eee]">S/.32.90 (MasterCard)</td>
                              <td className="p-1 border-r border-[#eee]">29 may. 2025 18:13:31</td>
                              <td className="p-1"></td>
                           </tr>
                           <tr className="border-b border-[#eee]">
                              <td className="p-1 border-r border-[#eee] text-center">
                                 {transactionsSelected && (
                                    <div className="w-5 h-5 bg-[#008000] text-white flex items-center justify-center text-[10px] rounded-sm mx-auto shadow-sm">
                                       ✓
                                    </div>
                                 )}
                              </td>
                              <td className="p-1 border-r border-[#eee]">#717</td>
                              <td className="p-1 border-r border-[#eee]">--</td>
                              <td className="p-1 border-r border-[#eee]">S/.66.90 (MasterCard)</td>
                              <td className="p-1 border-r border-[#eee]">29 may. 2025 18:16:19</td>
                              <td className="p-1"></td>
                           </tr>
                           <tr className="border-b border-[#eee]">
                              <td className="p-1 border-r border-[#eee] text-center">
                                 {transactionsSelected && (
                                    <div className="w-5 h-5 bg-[#008000] text-white flex items-center justify-center text-[10px] rounded-sm mx-auto shadow-sm">
                                       ✓
                                    </div>
                                 )}
                              </td>
                              <td className="p-1 border-r border-[#eee]">#719</td>
                              <td className="p-1 border-r border-[#eee]">--</td>
                              <td className="p-1 border-r border-[#eee]">S/.33.90</td>
                              <td className="p-1 border-r border-[#eee]">29 may. 2025 18:17:58</td>
                              <td className="p-1"></td>
                           </tr>
                           <tr className="border-b border-[#eee]">
                              <td className="p-1 border-r border-[#eee] text-center">
                                 {transactionsSelected && (
                                    <div className="w-5 h-5 bg-[#008000] text-white flex items-center justify-center text-[10px] rounded-sm mx-auto shadow-sm">
                                       ✓
                                    </div>
                                 )}
                              </td>
                              <td className="p-1 border-r border-[#eee]">#723</td>
                              <td className="p-1 border-r border-[#eee]">--</td>
                              <td className="p-1 border-r border-[#eee]">S/.53.90 (MasterCard)</td>
                              <td className="p-1 border-r border-[#eee]">29 may. 2025 18:19:24</td>
                              <td className="p-1"></td>
                           </tr>
                           <tr className="border-b border-[#eee]">
                              <td className="p-1 border-r border-[#eee] text-center">
                                 {transactionsSelected && (
                                    <div className="w-5 h-5 bg-[#008000] text-white flex items-center justify-center text-[10px] rounded-sm mx-auto shadow-sm">
                                       ✓
                                    </div>
                                 )}
                              </td>
                              <td className="p-1 border-r border-[#eee]">#724</td>
                              <td className="p-1 border-r border-[#eee]">--</td>
                              <td className="p-1 border-r border-[#eee]">S/.33.90</td>
                              <td className="p-1 border-r border-[#eee]">29 may. 2025 18:23:44</td>
                              <td className="p-1"></td>
                           </tr>
                           <tr className="border-b border-[#eee]">
                              <td className="p-1 border-r border-[#eee] text-center">
                                 {transactionsSelected && (
                                    <div className="w-5 h-5 bg-[#008000] text-white flex items-center justify-center text-[10px] rounded-sm mx-auto shadow-sm">
                                       ✓
                                    </div>
                                 )}
                              </td>
                              <td className="p-1 border-r border-[#eee]">#726</td>
                              <td className="p-1 border-r border-[#eee]">--</td>
                              <td className="p-1 border-r border-[#eee]">S/.100.00 (Visa)</td>
                              <td className="p-1 border-r border-[#eee]">29 may. 2025 18:24:57</td>
                              <td className="p-1"></td>
                           </tr>
                           <tr className="border-b border-[#eee]">
                              <td className="p-1 border-r border-[#eee] text-center">
                                 {transactionsSelected && (
                                    <div className="w-5 h-5 bg-[#008000] text-white flex items-center justify-center text-[10px] rounded-sm mx-auto shadow-sm">
                                       ✓
                                    </div>
                                 )}
                              </td>
                              <td className="p-1 border-r border-[#eee]">#727</td>
                              <td className="p-1 border-r border-[#eee]">--</td>
                              <td className="p-1 border-r border-[#eee]">S/.74.90 (Visa)</td>
                              <td className="p-1 border-r border-[#eee]">29 may. 2025 18:28:18</td>
                              <td className="p-1"></td>
                           </tr>
                           <tr>
                              <td className="p-1 border-r border-[#eee] text-center">
                                 {transactionsSelected && (
                                    <div className="w-5 h-5 bg-[#008000] text-white flex items-center justify-center text-[10px] rounded-sm mx-auto shadow-sm">
                                       ✓
                                    </div>
                                 )}
                              </td>
                              <td className="p-1 border-r border-[#eee]">#729</td>
                              <td className="p-1 border-r border-[#eee]">--</td>
                              <td className="p-1 border-r border-[#eee]">S/.20.90 (Visa)</td>
                              <td className="p-1 border-r border-[#eee]">29 may. 2025 18:34:18</td>
                              <td className="p-1"></td>
                           </tr>
                        </tbody>
                     </table>
                  ) : (
                     <div className="bg-[#f5f5f5] border border-[#ccc] p-2 text-[12px] italic text-[#555] m-1">
                        No existen medios de pago para la moneda seleccionada.
                     </div>
                  )}
               </div>
            </div>
            
         </div>
      </div>

      <div className="h-[40px] bg-gradient-to-b from-[#3a3a3a] via-[#1a1a1a] to-[#000000] border-t border-[#111] grid grid-cols-4 w-full text-white text-[13px] font-bold shrink-0 gap-x-1 px-1">
         <button className="h-full border border-[#444] rounded-sm flex justify-center items-center hover:bg-white/5 transition-colors">Cancelar</button>
         <button className="h-full border border-[#444] rounded-sm flex justify-center items-center hover:bg-white/5 transition-colors">Regresar</button>
         <button className="h-full border border-[#444] rounded-sm flex justify-center items-center hover:bg-white/5 transition-colors">Auditoria</button>
         
         <Interactive id="btn-cerrar-caja" className="h-full border border-[#444] rounded-sm">
            <button onClick={() => setShowConfirmModal(true)} className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
               Cerrar
            </button>
         </Interactive>
      </div>
      
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 bg-black/60">
          <div className="bg-white border border-[#333] shadow-[0_0_15px_rgba(0,0,0,0.3)] w-[480px]">
            <div className="bg-gradient-to-b from-[#21568c] to-[#04203e] text-white px-3 py-2 font-bold text-[13px]">
              Confirmar Cierre de Caja
            </div>
            <div className="py-3 px-10 text-center text-[#333] text-[13px]">
              Está seguro que desea cerrar la caja? Esta acción no podrá revertirse
            </div>
            <div className="flex justify-end space-x-2 p-2 bg-white border-t border-[#ccc]">
              <Interactive id="modal-confirm-yes">
                <button 
                  onClick={handleConfirmCierre}
                  className="bg-[#222] text-white px-4 py-1 rounded-sm shadow-sm hover:bg-[#333] text-[12px] font-bold border border-black"
                >
                  Sí
                </button>
              </Interactive>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="bg-[#222] text-white px-4 py-1 rounded-sm shadow-sm hover:bg-[#333] text-[12px] font-bold border border-black"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};
