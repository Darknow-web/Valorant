import React from 'react';
import { cn } from './Interactive';
import { LucideIcon } from 'lucide-react';
import { PrismLogo } from './PrismLogo';

export const PrismShell = ({ children, url }: { children: React.ReactNode, url?: string }) => {
  return (
    <div className="flex flex-col w-full h-full max-w-full rounded-none overflow-hidden bg-[#000000] font-sans">
      {/* Fake Browser Chrome */}
      <div className="bg-[#f0f0f0] border-b border-gray-300">
        <div className="flex items-end h-10 px-2 space-x-1 pt-2">
          <div className="bg-white border-t border-l border-r border-gray-300 rounded-t-md px-3 py-1 flex items-center space-x-2 w-64">
            <PrismLogo className="w-4 h-4" />
            <span className="text-xs text-gray-700 truncate">Prism - Retail Pro</span>
          </div>
          <div className="w-8 h-6 flex items-center justify-center hover:bg-gray-200 rounded cursor-default">
            <span className="text-lg leading-none">+</span>
          </div>
          <div className="flex-1"></div>
          <div className="flex space-x-2 pb-1 text-gray-500">
             <span>_</span>
             <span>□</span>
             <span>×</span>
          </div>
        </div>
        <div className="flex items-center px-4 py-1.5 bg-white border-t border-gray-300 space-x-3">
           <span className="text-gray-400">←</span>
           <span className="text-gray-400">→</span>
           <span className="text-gray-400">↻</span>
           <div className="flex-1 bg-gray-100 rounded-full px-4 py-0.5 flex items-center border border-gray-200">
              <span className="text-gray-400 text-xs mr-2">🔒</span>
              <span className="text-sm text-gray-600 font-mono tracking-tight">{url || '10.0.1.102/prism.shtml'}</span>
           </div>
           <span className="text-gray-400 text-xl">☆</span>
           <span className="text-gray-400 text-xl">⋮</span>
        </div>
      </div>
      
      {/* Prism App Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  );
};

export const PrismHeader = ({ title, children }: { title: string, children?: React.ReactNode }) => (
  <div className="bg-gradient-to-b from-[#2f6bb3] to-[#1c4e8a] text-white px-3 py-1.5 flex items-center justify-between text-sm shadow-sm">
    <div className="font-semibold tracking-wide">{title}</div>
    <div className="flex items-center space-x-2">{children}</div>
  </div>
);

export const PrismButtonDark = ({ children, className, onClick }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "bg-gradient-to-b from-[#3a3a3a] to-[#1a1a1a] hover:from-[#4a4a4a] hover:to-[#2a2a2a] text-white border border-[#4a4a4a] text-sm px-4 py-2 rounded-sm flex items-center justify-center font-medium shadow-sm transition-all",
      className
    )}
  >
    {children}
  </button>
);

export const PrismButtonPrimary = ({ children, className, onClick }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "bg-gradient-to-b from-[#2f7fd1] to-[#1f6fb2] hover:from-[#3a8be0] hover:to-[#297ac2] text-white border border-[#1f6fb2] text-sm px-4 py-2 rounded-sm flex items-center justify-center font-semibold shadow-sm",
      className
    )}
  >
    {children}
  </button>
);

export const PrismTab = ({ active, children, className }: any) => (
  <div className={cn(
    "px-6 py-2 text-sm font-semibold cursor-pointer border-r border-[#0a203a] flex-1 text-center bg-gradient-to-b from-[#14355c] to-[#1b3a63]",
    active ? "text-[#f5c518]" : "text-white hover:bg-white/10",
    className
  )}>
    {children}
  </div>
);

export const PrismFooter = ({ items }: { items: string[] }) => (
  <div className="bg-[#111111] border-t border-gray-800 text-white flex text-xs">
    {items.map((item, i) => (
      <div key={i} className={cn(
        "flex-1 py-3 text-center border-r border-gray-800 hover:bg-gray-800 cursor-pointer font-medium",
        i === items.length - 1 ? 'border-r-0' : ''
      )}>
        {item}
      </div>
    ))}
  </div>
);
