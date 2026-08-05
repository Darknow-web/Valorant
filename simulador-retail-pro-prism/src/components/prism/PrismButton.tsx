import React from 'react';
import { Interactive } from '../ui/Interactive';

interface PrismMenuButtonProps {
  text: string;
  iconSrc?: string;
  onClick?: () => void;
  id?: string;
  iconScale?: string;
}

export const PrismMenuButton: React.FC<PrismMenuButtonProps> = ({ text, iconSrc, onClick, id, iconScale = 'scale-[1.9]' }) => {
  const content = (
    <button 
      onClick={onClick}
      className="w-full h-[60px] relative rounded-[5px] border border-[#000] overflow-hidden group flex items-center pl-2 pr-4"
      style={{
        background: 'linear-gradient(to bottom, #5d5d5d 0%, #2f2f2f 45%, #151515 50%, #0a0a0a 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)'
      }}
    >
      {/* Glare overlay */}
      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
      
      {iconSrc && (
        <div className="w-[56px] h-[56px] mr-0 relative z-10 flex-shrink-0 flex items-center justify-center">
          <img src={iconSrc} alt="icon" className={`w-full h-full object-contain drop-shadow-md transform ${iconScale}`} />
        </div>
      )}
      <span className="text-white text-[17px] font-sans font-normal drop-shadow-[1px_1px_1px_rgba(0,0,0,1)] relative z-10">{text}</span>
    </button>
  );

  if (id) {
    return <Interactive id={id}>{content}</Interactive>;
  }
  
  return content;
};

