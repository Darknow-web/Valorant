import React from 'react';
import { PrismHeader } from '../components/prism/PrismHeader';
import { Interactive } from '../components/ui/Interactive';
import { useSimulator } from '../store/SimulatorContext';

export const ConciliacionScreen = () => {
  const { handleInteract } = useSimulator();

  return (
    <div className="w-full h-full flex flex-col bg-[#222222] font-sans">
      <PrismHeader title="Conciliacion" className="py-2" />
      
      <div className="bg-white h-[3px] w-full"></div>
      
      <div className="flex-1 flex flex-col overflow-hidden relative z-20">
         
         <div className="bg-white flex flex-col border border-[#777]">
            <table className="w-full text-[12px]">
               <thead>
                  <tr className="bg-gradient-to-b from-[#21568c] to-[#04203e] text-white">
                     <th className="py-1 px-2 text-left border-r border-[#031326] font-bold w-[120px]">Tipo</th>
                     <th className="py-1 px-2 text-center border-r border-[#031326] font-bold">Apertura</th>
                     <th className="py-1 px-2 text-center border-r border-[#031326] font-bold">Ventas</th>
                     <th className="py-1 px-2 text-center border-r border-[#031326] font-bold">Pago Entrante/Saliente</th>
                     <th className="py-1 px-2 text-center border-r border-[#031326] font-bold">Recogido</th>
                     <th className="py-1 px-2 text-center font-bold">Cerrar</th>
                  </tr>
               </thead>
               <tbody>
                  <tr className="border-b border-[#ccc] bg-white">
                     <td className="py-1 px-2 border-r border-[#ccc] text-[#333]">Efectivo</td>
                     <td className="py-1 px-2 border-r border-[#ccc] text-center text-[#333]">S/. 300.00</td>
                     <td className="py-1 px-2 border-r border-[#ccc] text-center text-[#333]">S/. 19,261.50</td>
                     <td className="py-1 px-2 border-r border-[#ccc] text-center text-[#333]">S/. 0.00</td>
                     <td className="py-1 px-2 border-r border-[#ccc] text-center text-[#333]">S/. 19,261.50</td>
                     <td className="py-1 px-2 text-center text-[#333]">S/. 300.00</td>
                  </tr>
                  <tr className="border-b border-[#ccc] bg-[#f9f9f9]">
                     <td className="py-1 px-2 border-r border-[#ccc] text-[#333]">No Efectivo</td>
                     <td className="py-1 px-2 border-r border-[#ccc] text-center text-[#333]">S/. 0.00</td>
                     <td className="py-1 px-2 border-r border-[#ccc] text-center text-[#333]">-S/. 5,055.70</td>
                     <td className="py-1 px-2 border-r border-[#ccc] text-center text-[#333]">S/. 0.00</td>
                     <td className="py-1 px-2 border-r border-[#ccc] text-center text-[#333]">S/. 0.00</td>
                     <td className="py-1 px-2 text-center text-[#333]">-S/. 5,055.70</td>
                  </tr>
                  <tr className="border-b border-[#ccc] bg-white font-bold">
                     <td className="py-1 px-2 border-r border-[#ccc] text-[#333]">Total</td>
                     <td className="py-1 px-2 border-r border-[#ccc] text-center text-[#333]">S/. 300.00</td>
                     <td className="py-1 px-2 border-r border-[#ccc] text-center text-[#333]">S/. 14,205.80</td>
                     <td className="py-1 px-2 border-r border-[#ccc] text-center text-[#333]">S/. 0.00</td>
                     <td className="py-1 px-2 border-r border-[#ccc] text-center text-[#333]">S/. 19,261.50</td>
                     <td className="py-1 px-2 text-center text-[#333]">-S/. 4,755.70</td>
                  </tr>
               </tbody>
            </table>

            <div className="flex justify-end p-2 bg-white border-b border-[#ccc]">
               <div className="w-[700px] bg-[#f5f5f5] border border-[#ccc] rounded-[2px] flex items-stretch p-2 text-[13px] font-bold text-[#555]">
                  <div className="flex-1 flex flex-col justify-between py-0.5 px-2">
                     <div>Efectivo Sobrante/Faltante</div>
                     <div>No-Efectivo Sobrante/Faltante</div>
                     <div>Total Sobrante/Faltante</div>
                  </div>
                  <div className="w-[450px] bg-black text-white rounded-[4px] flex flex-col justify-between py-1 px-2 text-right">
                     <div>S/. 0.00</div>
                     <div>S/. 0.00</div>
                     <div>S/. 0.00</div>
                  </div>
               </div>
            </div>
         </div>
         
         <div className="h-1 bg-transparent w-full"></div>
         
         <div className="bg-gradient-to-b from-[#21568c] to-[#04203e] text-white px-2 py-1.5 text-sm font-bold border border-[#031326] shadow-sm">
            Finalizar e Imprimir
         </div>
         
         <div className="bg-white flex justify-end items-start p-2 border-b border-[#ccc]">
            <div className="w-[700px] bg-[#f5f5f5] border border-[#ccc] rounded-[2px] flex items-stretch p-2 text-[13px] font-bold text-[#555]">
               <div className="flex-1 flex flex-col py-0.5 gap-y-1 px-2">
                  <div>Total Agregado</div>
                  <div>Total Faltantes</div>
               </div>
               <div className="w-[450px] bg-black text-white rounded-[4px] flex flex-col gap-y-1 py-1 px-2 text-right">
                  <div>S/. 0.00</div>
                  <div>S/. 0.00</div>
               </div>
            </div>
         </div>
      </div>
      <div className="h-[40px] bg-gradient-to-b from-[#3a3a3a] via-[#1a1a1a] to-[#000000] border-t border-[#111] grid grid-cols-3 w-full text-white text-[13px] font-bold shrink-0 gap-x-1 px-1">
         <button className="h-full border border-[#444] rounded-sm flex justify-center items-center hover:bg-white/5 transition-colors">Recuento</button>
         <Interactive id="btn-finalizar-imprimir" className="h-full border border-[#444] rounded-sm">
            <button onClick={() => handleInteract('btn-finalizar-imprimir')} className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
               Finalizar e Imprimir
            </button>
         </Interactive>
         <button className="h-full border border-[#444] rounded-sm flex justify-center items-center hover:bg-white/5 transition-colors">Salir</button>
      </div>
    </div>
  );
};
