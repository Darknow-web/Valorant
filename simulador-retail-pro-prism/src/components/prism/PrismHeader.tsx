import React from 'react';

interface PrismHeaderProps {
  title: string;
  rightContent?: React.ReactNode;
  className?: string;
}

export const PrismHeader: React.FC<PrismHeaderProps> = ({ title, rightContent, className = '' }) => {
  return (
    <div className={`flex justify-between items-center px-3 py-1 bg-gradient-to-b from-[#1c4e8a] to-[#2a4d78] border-t border-[#4fa1df] border-b border-[#031326] shadow-sm ${className}`}>
      <span className="text-white text-[13px] font-sans tracking-wide">{title}</span>
      {rightContent && <div className="text-white text-sm">{rightContent}</div>}
    </div>
  );
};
