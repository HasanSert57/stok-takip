import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'warning' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

    const variants = {
      primary: 'bg-primary text-primary-foreground hover:bg-blue-700 shadow-sm',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-slate-200 border border-slate-200',
      outline: 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-800',
      danger: 'bg-destructive text-destructive-foreground hover:bg-red-700 shadow-sm',
      warning: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm',
      success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
      ghost: 'hover:bg-slate-100 text-slate-700',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-9 px-4 text-sm gap-2',
      lg: 'h-11 px-6 text-base gap-2.5',
      icon: 'h-9 w-9 p-0 text-sm',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
