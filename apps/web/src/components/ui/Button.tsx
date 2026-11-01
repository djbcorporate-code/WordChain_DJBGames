import React from 'react';
import { soundManager } from '../../utils/sound.js';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'warning' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  glow?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  glow = false,
  loading = false,
  icon,
  className = '',
  disabled,
  onClick,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading) {
      soundManager.playTimerTick();
      onClick?.(e);
    }
  };

  const baseStyles = 'inline-flex items-center justify-center font-bold rounded-xl transition-all select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5',
  }[size];

  const variantStyles = {
    primary: 'bg-accent-primary hover:bg-indigo-500 text-white shadow-glow',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700',
    accent: 'bg-accent-secondary hover:bg-cyan-400 text-slate-950 font-extrabold',
    danger: 'bg-state-danger hover:bg-rose-600 text-white shadow-glowRose',
    warning: 'bg-state-warning hover:bg-amber-500 text-slate-950 font-extrabold',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white',
    outline: 'bg-transparent border border-slate-700 hover:border-slate-500 text-slate-200',
  }[variant];

  const glowStyle = glow ? 'shadow-glow ring-1 ring-accent-primary/50' : '';

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${glowStyle} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
