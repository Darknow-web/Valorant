import React from 'react';
import { Interactive } from '../ui/Interactive';
import { Icons } from '../../config/icons';

interface PrismFooterProps {
  leftText?: string;
  leftAction?: () => void;
  rightText?: string;
  rightAction?: () => void;
  rightId?: string;
  leftId?: string;
  hideRetailPro?: boolean;
}

export const PrismFooter: React.FC<PrismFooterProps> = ({
  leftText = 'Cancelar',
  leftAction,
  rightText = 'Siguiente',
  rightAction,
  rightId = 'btn-siguiente',
  leftId = 'btn-cancelar',
  hideRetailPro = false
}) => {
  return (
    <div className="h-12 w-full bg-gradient-to-b from-[#3a3a3a] via-[#1a1a1a] to-[#000000] border-t border-[#555] flex relative">
      <div className="flex-1 flex items-center justify-center border-r border-[#111]">
        {leftAction ? (
           <Interactive id={leftId} className="w-full h-full" onClick={leftAction}>
              <button className="w-full h-full text-white text-[13px] font-sans hover:bg-white/10 transition-colors">
                {leftText}
              </button>
           </Interactive>
        ) : (
           <div className="text-white text-[13px] font-sans opacity-70 cursor-not-allowed">
              {leftText}
           </div>
        )}
      </div>
      <div className="flex-1 flex items-center justify-center border-l border-[#444]">
        {rightAction ? (
           <Interactive id={rightId} className="w-full h-full" onClick={rightAction}>
              <button className="w-full h-full text-white text-[13px] font-sans hover:bg-white/10 transition-colors">
                {rightText}
              </button>
           </Interactive>
        ) : (
           <div className="text-white text-[13px] font-sans opacity-70 cursor-not-allowed">
              {rightText}
           </div>
        )}
      </div>
      {!hideRetailPro && (
        <div className="h-full bg-gradient-to-b from-[#2a2a2a] to-[#111] px-4 cursor-pointer flex items-center justify-center min-w-[120px] border-l border-[#444] relative">
           <img src={Icons.retailProMenu} alt="Retail Pro" className="h-[28px] object-contain" />
           <div className="absolute bottom-1 right-1 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-[#007acc] rotate-[135deg]"></div>
        </div>
      )}
    </div>
  );
};
