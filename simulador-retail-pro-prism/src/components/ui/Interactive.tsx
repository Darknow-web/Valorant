import React from 'react';
import { useSimulator } from '../../store/SimulatorContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Wrapper to make any element interactive within the simulation
interface InteractiveProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  value?: string;
  as?: React.ElementType;
}

export const Interactive = React.forwardRef<HTMLElement, InteractiveProps>(
  ({ id, value, children, className, as: Component = 'div', onClick, ...props }, ref) => {
    const { handleInteract, feedback, hintActive, currentStep } = useSimulator();

    const isTarget = currentStep?.targetId === id;
    const isError = feedback?.status === 'error' && feedback.id === id;
    const isSuccess = feedback?.status === 'success' && feedback.id === id;

    const handleClick = (e: React.MouseEvent) => {
      const result = handleInteract(id, value);
      if (result === false) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      if (onClick) onClick(e as any);
    };

    return (
      <Component
        ref={ref as any}
        id={id}
        onClickCapture={handleClick}
        className={cn(
          'cursor-pointer relative transition-all duration-200',
          isError && 'ring-4 ring-[#e74c3c] bg-red-500/20 z-50',
          isSuccess && 'ring-4 ring-[#2ecc71] bg-green-500/20 z-50 scale-[0.98]',
          className
        )}
        {...props}
      >
        {children}
        {isSuccess && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="w-6 h-6 bg-[#2ecc71] rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </Component>
    );
  }
);
Interactive.displayName = 'Interactive';
