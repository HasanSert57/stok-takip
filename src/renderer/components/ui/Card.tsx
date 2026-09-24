import React, { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm transition-shadow hover:shadow-md',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: string;
  color?: 'blue' | 'emerald' | 'amber' | 'cyan' | 'red' | 'purple';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'blue',
  onClick,
}) => {
  const colorBorders = {
    blue: 'border-l-4 border-l-blue-600',
    emerald: 'border-l-4 border-l-emerald-600',
    amber: 'border-l-4 border-l-amber-500',
    cyan: 'border-l-4 border-l-cyan-500',
    red: 'border-l-4 border-l-red-600',
    purple: 'border-l-4 border-l-purple-600',
  };

  const iconColors = {
    blue: 'text-blue-600 bg-blue-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    cyan: 'text-cyan-600 bg-cyan-50',
    red: 'text-red-600 bg-red-50',
    purple: 'text-purple-600 bg-purple-50',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md',
        colorBorders[color],
        onClick && 'cursor-pointer hover:-translate-y-0.5'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {icon && <div className={cn('rounded-lg p-2.5', iconColors[color])}>{icon}</div>}
      </div>
      <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{value}</div>
      {(subtitle || trend) && (
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          {subtitle && <span>{subtitle}</span>}
          {trend && <span className="font-semibold text-emerald-600">{trend}</span>}
        </div>
      )}
    </div>
  );
};
