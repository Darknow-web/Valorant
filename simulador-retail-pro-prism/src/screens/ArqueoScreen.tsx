import React from 'react';
import { useSimulator } from '../store/SimulatorContext';
import { Interactive } from '../components/ui/Interactive';
import { Icons } from '../config/icons';

export const ArqueoScreen: React.FC = () => {
  const { handleInteract } = useSimulator();

  return (
    <div className="relative w-full min-h-full bg-[#222222] flex flex-col text-[#333] text-[12px] font-sans">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Filtros de Reportes */}
        <div className="w-[450px] h-fit bg-white flex flex-col border border-white m-[2px]">
          <div className="bg-[#0f3b6c] text-white px-3 py-1 font-bold shadow-sm">
            Filtros de Reportes
          </div>
          
          <div className="p-3 space-y-3 flex-1 flex flex-col">
            <div className="flex flex-col space-y-1">
              <label className="font-bold text-[11px]">Fecha de Inicio</label>
              <div className="flex h-[24px] border border-gray-400">
                 <div className="w-[24px] bg-[#333] flex items-center justify-center border-r border-gray-400 text-white">
                    📅
                 </div>
                 <div className="flex-1 flex items-center px-2">3 ago. 2026 00:00:00</div>
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="font-bold text-[11px]">Fecha Final</label>
              <div className="flex h-[24px] border border-gray-400">
                 <div className="w-[24px] bg-[#333] flex items-center justify-center border-r border-gray-400 text-white">
                    📅
                 </div>
                 <div className="flex-1 flex items-center px-2">3 ago. 2026 23:59:59</div>
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="font-bold text-[11px]">Subsidiaria</label>
              <select className="h-[24px] border border-gray-400 px-1 text-[11px]">
                 <option>2 :Mascotas Peru</option>
              </select>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="font-bold text-[11px]">Instalación</label>
              <select className="h-[24px] border border-gray-400 px-1 text-[11px]">
                 <option>1 :RPS</option>
              </select>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="font-bold text-[11px]">Tienda</label>
              <select className="h-[24px] border border-gray-400 px-1 text-[11px]">
                 <option>0 :MAIN</option>
              </select>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="font-bold text-[11px]">Estación de Trabajo</label>
              <select className="h-[24px] border border-gray-400 px-1 text-[11px]">
                 <option>0 :webclient</option>
              </select>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="font-bold text-[11px]">Cajón</label>
              <select className="h-[24px] border border-gray-400 px-1 text-[11px]">
                 <option>Todo</option>
              </select>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="font-bold text-[11px]">Gaveta</label>
              <select className="h-[24px] border border-gray-400 px-1 text-[11px]">
                 <option>Todo</option>
              </select>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="font-bold text-[11px]">Cajero</label>
              <select className="h-[24px] border border-gray-400 px-1 text-[11px]">
                 <option>SYSADMIN</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Empty Area */}
        <div className="flex-1 bg-[#222222]"></div>
      </div>

      {/* Bottom Bar */}
      <div className="h-[40px] bg-gradient-to-b from-[#3a3a3a] via-[#1a1a1a] to-[#000000] border-t border-[#111] grid grid-cols-4 w-full text-white text-[13px] font-bold shrink-0 gap-x-2 px-1">
         <Interactive id="arqueo-btn-imprimir" className="h-full border border-[#444] rounded-sm">
            <button onClick={() => handleInteract('arqueo-btn-imprimir')} className="w-full h-full flex items-center justify-center space-x-2 cursor-pointer hover:bg-white/5 transition-colors">
               <span>🖨️</span>
               <span>Imprimir</span>
            </button>
         </Interactive>
         
         <div className="col-span-2 grid grid-cols-2 h-full gap-x-2">
            <button className="w-full h-full flex items-center justify-center space-x-2 border border-[#444] rounded-sm cursor-pointer hover:bg-white/5 transition-colors text-gray-300">
               <span>💾</span>
               <span>Guardar Valores por Defecto</span>
            </button>
            <button className="w-full h-full flex items-center justify-center space-x-2 border border-[#444] rounded-sm cursor-pointer hover:bg-white/5 transition-colors text-gray-300">
               <span className="text-red-500">↩️</span>
               <span>Restablecer Valores por Defecto</span>
            </button>
         </div>
         <div className="flex items-center justify-end px-4">
            <button className="w-[100px] h-full flex items-center justify-center">
              <img src={Icons.retailProMenu} alt="Retail Pro" className="h-[28px] object-contain drop-shadow-md" />
            </button>
         </div>
      </div>
    </div>
  );
};
