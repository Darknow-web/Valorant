import React from 'react';

interface ProgressBarProps {
  current: number;
  max: number;
  colorClass: string;
  label?: string;
  subLabel?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, max, colorClass, label, subLabel }) => {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));

  return (
    <div className="w-full mb-4">
      <div className="flex justify-between items-end mb-1">
        <span className="text-sm font-bold text-gray-200 font-mono uppercase tracking-wider">{label}</span>
        <span className="text-xs text-gray-400">{subLabel || `${current} / ${max} XP`}</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-4 border border-gray-700 relative overflow-hidden">
        <div
          className={`h-4 rounded-full transition-all duration-500 ease-out ${colorClass} relative`}
          style={{ width: `${percentage}%` }}
        >
          {/* Shine effect */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/20 to-transparent"></div>
        </div>
      </div>
    </div>
  );
};