import React from 'react';
import { cn } from './Interactive';

/**
 * Primitivas del tema claro corporativo. Se usan en el marco de entrenamiento
 * (bienvenida, módulos, guía, panel del entrenador), nunca dentro de las
 * pantallas que imitan Retail Pro.
 */

export const Page = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('frame min-h-screen bg-surface text-ink', className)}>{children}</div>
);

export const Card = ({
  children,
  className,
  as: Component = 'div',
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) => (
  <Component
    className={cn('rounded-xl border border-line bg-raised shadow-[0_1px_2px_rgba(23,32,51,0.05)]', className)}
    {...props}
  >
    {children}
  </Component>
);

export const CardHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
    <div>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
    </div>
    {action}
  </div>
);

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover disabled:bg-line-strong disabled:text-white',
  secondary: 'border border-line-strong bg-raised text-ink hover:bg-sunken disabled:text-ink-subtle',
  ghost: 'text-brand hover:bg-brand-soft disabled:text-ink-subtle',
  danger: 'border border-danger/30 bg-danger-soft text-danger hover:bg-danger hover:text-white',
};

export const Button = ({
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) => (
  <button
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed',
      BUTTON_STYLES[variant],
      className
    )}
    {...props}
  />
);

export const Field = ({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <label className={cn('block', className)}>
    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-ink-subtle">{hint}</span>}
  </label>
);

const CONTROL =
  'w-full rounded-lg border border-line-strong bg-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-brand focus:outline-none';

export const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(CONTROL, className)} {...props} />
);

export const Select = ({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn(CONTROL, className)} {...props} />
);

type ToneName = 'ok' | 'warn' | 'danger' | 'brand' | 'neutral';

const TONES: Record<ToneName, string> = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  brand: 'bg-brand-soft text-brand',
  neutral: 'bg-sunken text-ink-muted',
};

export const Badge = ({ tone = 'neutral', children }: { tone?: ToneName; children: React.ReactNode }) => (
  <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', TONES[tone])}>
    {children}
  </span>
);

export const Notice = ({ tone = 'brand', children }: { tone?: ToneName; children: React.ReactNode }) => (
  <div className={cn('rounded-lg px-4 py-3 text-sm', TONES[tone])}>{children}</div>
);
