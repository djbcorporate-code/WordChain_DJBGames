import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  pulse = false,
}) => {
  const variantStyles = {
    primary: 'bg-accent-primary/20 text-indigo-300 border-accent-primary/40',
    secondary: 'bg-slate-800 text-slate-300 border-slate-700',
    success: 'bg-state-success/20 text-emerald-300 border-state-success/40',
    danger: 'bg-state-danger/20 text-rose-300 border-state-danger/40',
    warning: 'bg-state-warning/20 text-amber-300 border-state-warning/40',
    info: 'bg-accent-secondary/20 text-cyan-300 border-accent-secondary/40',
  }[variant];

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-bold tracking-wide rounded-full border uppercase ${variantStyles} ${sizeStyles} ${
        pulse ? 'animate-pulse' : ''
      }`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
