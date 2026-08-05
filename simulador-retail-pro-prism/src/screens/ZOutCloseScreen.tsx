import React from 'react';
import { PrismFooter } from '../components/prism/PrismFooter';
import { Interactive } from '../components/ui/Interactive';
import { useSimulator } from '../store/SimulatorContext';

export const ZOutCloseScreen = () => {
  const { handleInteract, currentModuleId } = useSimulator();

  return (
    <div className="w-full min-h-full flex flex-col bg-[#222222] font-sans">
      <div className="bg-gradient-to-b from-[#1c4b7b] to-[#0d2a4a] text-white p-2 flex justify-between items-center text-sm border-b border-[#04111f]">
        <div className="font-bold">Z Out Cierre</div>
        <div className="flex flex-col items-start">
          <span className="text-[11px] font-bold mb-1">Subsidiaria / Tienda</span>
          <div className="bg-gradient-to-b from-[#184475] to-[#0c2440] px-12 py-1 text-[12px] border border-[#041526] rounded-sm flex items-center shadow-inner cursor-pointer hover:from-[#1d528c]">
            Mascotas Peru/MAIN <span className="ml-2 text-[10px]">☑</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex p-[2px] space-x-[2px] overflow-hidden bg-[#222222]">
        {/* Left Column */}
        <div className="w-[330px] flex flex-col bg-white border border-[#777]">
          <div className="bg-gradient-to-b from-[#21568c] to-[#04203e] text-white px-2 py-1.5 text-[13px] font-bold border-b border-[#031326]">
            Criterios de la registradora
          </div>
          <div className="p-3 text-[12px] flex flex-col space-y-3 flex-1">
            <div>
              <label className="font-bold text-[#333] block mb-1">Cajero</label>
              <select className="w-full border border-[#999] p-1 focus:outline-none bg-white text-[#333]">
                <option>SYSADMIN</option>
              </select>
            </div>
            
            <Interactive id="zout-btn-abrir">
              <button 
                className="w-full bg-gradient-to-b from-[#5c9ce6] to-[#2b71cc] text-white font-bold py-1.5 rounded-[2px] shadow-sm border border-[#1b4a86] hover:from-[#6ba6ea] hover:to-[#387dd6] flex justify-center items-center"
              >
                <span className="mr-1 text-[14px]">⬆</span> Abrir Caja
              </button>
            </Interactive>

            <div>
              <label className="font-bold text-[#333] block mb-1">Fecha de Inicio <span className="float-right text-gray-500 font-normal">Hoy</span></label>
              <div className="flex border border-[#999] rounded-[2px] overflow-hidden">
                <div className="bg-[#333] text-white p-1.5 flex items-center justify-center border-r border-[#999]">📅</div>
                <input type="text" value="Ninguno" readOnly className="w-full p-1 text-center bg-white text-[#333] focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="font-bold text-[#333] block mb-1">Fecha Final</label>
              <div className="flex border border-[#999] rounded-[2px] overflow-hidden">
                <div className="bg-[#333] text-white p-1.5 flex items-center justify-center border-r border-[#999]">📅</div>
                <input type="text" value="Ninguno" readOnly className="w-full p-1 text-center bg-white text-[#333] focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="font-bold text-[#333] block mb-1">Status</label>
              <select className="w-full border border-[#999] p-1 focus:outline-none bg-white text-[#333]">
                <option>Apertura</option>
              </select>
            </div>

            <div className="flex space-x-6 pt-1 text-[#333] font-bold">
              <label className="flex items-center space-x-1 cursor-pointer"><input type="checkbox" className="mt-0.5" /> <span>Todas las Sbs</span></label>
              <label className="flex items-center space-x-1 cursor-pointer"><input type="checkbox" className="mt-0.5" /> <span>Todas las Tiendas</span></label>
            </div>

            <div className="flex justify-between pt-3">
              <button className="bg-gradient-to-b from-[#333] to-[#111] border border-black text-white px-3 py-1.5 text-[12px] rounded-[2px] hover:from-[#444] hover:to-[#222]">Reinicializar</button>
              <button className="bg-gradient-to-b from-[#333] to-[#111] border border-black text-white px-3 py-1.5 text-[12px] rounded-[2px] hover:from-[#444] hover:to-[#222] flex items-center shadow-sm">
                <span className="mr-1 text-[10px]">🔍</span> Buscar
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-1 flex flex-col bg-white border border-[#777]">
          <div className="bg-gradient-to-b from-[#21568c] to-[#04203e] text-white px-2 py-1.5 text-[13px] font-bold border-b border-[#031326]">
            Resultados de Búsqueda
          </div>
          
          <div className="flex-1 bg-white p-3">
            {/* The Row */}
            {currentModuleId !== 'm2' && (
            <div className="flex flex-col text-[11px] bg-white border border-[#999] shadow-sm">
               <div className="grid grid-cols-3 gap-2 p-2">
                  <div className="flex flex-col space-y-0.5">
                     <div><strong className="text-[#222] mr-1">Fecha Apertura</strong> <span className="text-[#555]">27/07/26 11:25</span></div>
                     <div><strong className="text-[#222] mr-1">Fecha Cierre</strong> <span className="text-[#555]">--</span></div>
                     <div><strong className="text-[#222] mr-1">Estatus</strong> <span className="text-[#555]">Open</span></div>
                     <div><strong className="text-[#222] mr-1">Cajero</strong> <span className="text-[#555]">SYSADMIN</span></div>
                     <div><strong className="text-[#222] mr-1">Cerrado Por</strong> <span className="text-[#555]">--</span></div>
                  </div>
                  <div className="flex flex-col space-y-0.5">
                     <div><strong className="text-[#222] mr-1">Sub</strong> <span className="text-[#555]">Mascotas Peru</span></div>
                     <div><strong className="text-[#222] mr-1">Tienda</strong> <span className="text-[#555]">MAIN</span></div>
                     <div><strong className="text-[#222] mr-1">Estación de Trabajo</strong> <span className="text-[#555]">--</span></div>
                     <div><strong className="text-[#222] mr-1">Gaveta</strong> <span className="text-[#555]">--</span></div>
                     <div><strong className="text-[#222] mr-1">Cajón</strong> <span className="text-[#555]">--</span></div>
                  </div>
                  <div className="flex flex-col space-y-0.5">
                     <div><strong className="text-[#222] mr-1">Monto Apertura</strong> <span className="text-[#555]">S/.0.00</span></div>
                     <div><strong className="text-[#222] mr-1">Venta Neta</strong> <span className="text-[#555]">S/.0.00</span></div>
                     <div><strong className="text-[#222] mr-1">Monto Cierre</strong> <span className="text-[#555]">S/.0.00</span></div>
                     <div><strong className="text-[#222] mr-1">Sobrante/Faltante</strong> <span className="text-[#555]">S/.0.00</span></div>
                     <div><strong className="text-[#222] mr-1">Dejar</strong> <span className="text-[#555]">S/.0.00</span></div>
                     <div><strong className="text-[#222] mr-1">Auditar Conteo</strong> <span className="text-[#555]">0</span></div>
                  </div>
               </div>
               
               <div className="flex border-t border-[#999]">
                  <button className="flex-1 bg-gradient-to-b from-[#6b85a1] to-[#425f80] text-white py-1.5 font-bold border-r border-[#999] text-[12px] shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">Auditar</button>
                  <Interactive id="zout-btn-auditoria" className="flex-1 border-r border-[#999]">
                     <button 
                       
                       className="w-full h-full bg-gradient-to-b from-[#1c4b7b] to-[#0d2a4a] text-white py-1.5 font-bold hover:from-[#255f9c] hover:to-[#123963] text-[12px] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                     >
                       Cierre /Auditoría
                     </button>
                  </Interactive>
                  <button className="flex-1 bg-gradient-to-b from-[#1c4b7b] to-[#0d2a4a] text-white py-1.5 font-bold hover:from-[#255f9c] hover:to-[#123963] text-[12px] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">Cierre Forzado</button>
               </div>
            </div>
            )}
          </div>
        </div>
      </div>
      
      <PrismFooter 
         leftText="Cerrar"
         rightText=""         
         rightAction={() => {}}
      />
    </div>
  );
};
