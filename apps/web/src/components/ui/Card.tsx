import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  glow?: boolean;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  elevated = false,
  glow = false,
  hoverable = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`rounded-2xl border transition-all ${
        elevated ? 'bg-surface border-slate-700/80' : 'bg-card border-slate-800'
      } ${glow ? 'shadow-glow border-accent-primary/50' : ''} ${
        hoverable ? 'hover:border-slate-700 hover:bg-cardHover hover:scale-[1.01]' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
