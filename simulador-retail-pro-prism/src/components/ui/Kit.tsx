import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { cn } from './Interactive';
import { prefiereMenosMovimiento, resorte } from '../../lib/motion';

/**
 * Primitivas del marco de entrenamiento, con la identidad SuperPet.
 * No se usan dentro de las pantallas que replican Retail Pro.
 */

/** Página con el riel rojo de marca en el borde superior. */
export const Page = ({
  children,
  className,
  conRiel = true,
}: {
  children: React.ReactNode;
  className?: string;
  conRiel?: boolean;
}) => (
  <div className={cn('frame min-h-screen overflow-y-auto bg-surface text-ink', className)}>
    {conRiel && <div aria-hidden className="fixed inset-x-0 top-0 z-50 h-1 bg-brand" />}
    {children}
  </div>
);

/** Isotipo de SuperPet. */
export const Isotipo = ({ className }: { className?: string }) => (
  <img src="/marca/isotipo.png" alt="" aria-hidden className={cn('rounded-xl object-contain', className)} />
);

/** Logotipo completo (isotipo + palabra). */
export const Logotipo = ({ className }: { className?: string }) => (
  <img src="/marca/logo.png" alt="SuperPet" className={cn('object-contain', className)} />
);

export const Card = ({
  children,
  className,
  as: Component = 'div',
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) => (
  <Component
    className={cn('rounded-2xl border border-line bg-raised shadow-[0_1px_2px_rgba(6,6,67,0.06)]', className)}
    {...props}
  >
    {children}
  </Component>
);

export const CardHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) => (
  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4">
    <div>
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {subtitle && <p className="prosa mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
    </div>
    {action}
  </div>
);

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-hover disabled:bg-line-strong disabled:text-white',
  secondary: 'border border-line-strong bg-raised text-ink hover:bg-sunken disabled:text-ink-subtle',
  ghost: 'text-brand hover:bg-brand-soft disabled:text-ink-subtle',
  danger: 'border border-danger/25 bg-danger-soft text-danger hover:bg-danger hover:text-white',
};

export const Button = ({
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) => (
  <motion.button
    whileHover={props.disabled ? undefined : { y: -1 }}
    whileTap={props.disabled ? undefined : { scale: 0.97 }}
    transition={resorte}
    className={cn(
      // `min-h-11` son 44 px, la medida táctil recomendada. Con solo el
      // relleno quedaba en 40,5 px, justo en el límite: cualquier animación
      // de entrada que lo escale un 4% lo dejaba por debajo del mínimo.
      'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed',
      BUTTON_STYLES[variant],
      className
    )}
    {...(props as any)}
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
    <span className="etiqueta mb-1 block text-ink-muted">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-ink-subtle">{hint}</span>}
  </label>
);

const CONTROL =
  'w-full rounded-xl border border-line-strong bg-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-brand focus:outline-none';

export const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(CONTROL, className)} {...props} />
);

export const Select = ({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn(CONTROL, className)} {...props} />
);

type ToneName = 'ok' | 'warn' | 'danger' | 'brand' | 'sand' | 'neutral';

const TONES: Record<ToneName, string> = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  brand: 'bg-brand-soft text-brand',
  sand: 'bg-sand text-navy',
  neutral: 'bg-sunken text-ink-muted',
};

export const Badge = ({ tone = 'neutral', children }: { tone?: ToneName; children: React.ReactNode }) => (
  <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', TONES[tone])}>
    {children}
  </span>
);

/** Icono de estado, para que el color nunca sea la única señal. */
const ICONOS: Partial<Record<ToneName, string>> = { ok: '✓', warn: '!', danger: '✕' };

export const Notice = ({ tone = 'brand', children }: { tone?: ToneName; children: React.ReactNode }) => (
  <div className={cn('flex items-start gap-2 rounded-xl px-4 py-3 text-sm', TONES[tone])}>
    {ICONOS[tone] && (
      <span aria-hidden className="mt-px font-bold">
        {ICONOS[tone]}
      </span>
    )}
    <div className="prosa">{children}</div>
  </div>
);

/**
 * Cifra que sube hasta su valor. Se usa para la nota del intento; con
 * "reducir movimiento" aparece directamente en su valor final.
 */
export const CifraAnimada = ({ valor, decimales = 1 }: { valor: number; decimales?: number }) => {
  const motionValue = useMotionValue(0);
  const animada = useSpring(motionValue, { stiffness: 90, damping: 18 });
  const texto = useTransform(animada, (v) => v.toFixed(decimales).replace(/\.0$/, ''));
  const [estatico, setEstatico] = useState(prefiereMenosMovimiento());

  useEffect(() => {
    setEstatico(prefiereMenosMovimiento());
    motionValue.set(valor);
  }, [valor, motionValue]);

  if (estatico) return <span className="cifra">{valor}</span>;
  return <motion.span className="cifra">{texto}</motion.span>;
};
