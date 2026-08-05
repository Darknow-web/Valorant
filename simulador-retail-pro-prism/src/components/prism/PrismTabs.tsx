import React from 'react';
import { Interactive } from '../ui/Interactive';

interface Tab {
  id: string;
  label: string;
  iconSrc: string;
  interactiveId?: string;
}

interface PrismTabsProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (id: string) => void;
}

export const PrismTabs: React.FC<PrismTabsProps> = ({ tabs, activeTabId, onTabChange }) => {
  return (
    <div className="flex justify-center pt-8 pb-[28px] relative z-30 bg-transparent" style={{ gap: 'clamp(20px, 10vw, 130px)' }}>
      {tabs.map(tab => {
        const isActive = tab.id === activeTabId;
        const content = (
          <div 
            onClick={() => onTabChange(tab.id)}
            className="relative w-[260px] h-[105px] flex flex-col items-center justify-between cursor-pointer border border-[#999] rounded-[6px] overflow-visible bg-white shadow-md"
          >
            <div className="flex-1 flex items-center justify-center w-full bg-gradient-to-b from-white to-[#f0f0f0] rounded-t-[5px] pt-1 pb-0">
               <img src={tab.iconSrc} alt={tab.label} className="w-[70px] h-[70px] object-contain drop-shadow-md" />
            </div>
            <div className={`w-full h-[40px] flex items-center justify-center border-t border-[#ccc] rounded-b-[5px] ${isActive ? 'bg-gradient-to-b from-[#d0d0d0] to-[#c0c0c0]' : 'bg-gradient-to-b from-[#e8e8e8] to-[#d8d8d8]'}`}>
               <span className="text-[#333] text-[14px] font-sans font-normal">{tab.label}</span>
            </div>
            
            {isActive && (
              <div className="absolute -bottom-[20px] left-1/2 -translate-x-1/2 z-40 flex flex-col items-center drop-shadow-md">
                 <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[12px] border-transparent border-b-[#8ea7ba]"></div>
                 <div className="absolute top-[2px] w-0 h-0 border-l-[10px] border-r-[10px] border-b-[10px] border-transparent border-b-[#d5e4ef]"></div>
              </div>
            )}
          </div>
        );

        if (tab.interactiveId) {
          return <Interactive id={tab.interactiveId} key={tab.id}>{content}</Interactive>;
        }
        return <React.Fragment key={tab.id}>{content}</React.Fragment>;
      })}
    </div>
  );
};
