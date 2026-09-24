import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { Barcode, DollarSign } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, type = 'text', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && <label className="text-xs font-medium text-slate-700">{label}</label>}
        <input
          type={type}
          ref={ref}
          className={cn(
            'flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && <span className="text-[11px] font-medium text-red-500">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export const BarcodeInput = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && <label className="text-xs font-medium text-slate-700">{label}</label>}
        <div className="relative flex items-center">
          <Barcode className="absolute left-2.5 h-4 w-4 text-slate-400" />
          <input
            ref={ref}
            type="text"
            data-barcode-input="true"
            className={cn(
              'flex h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-1 text-sm font-mono shadow-sm transition-colors placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-500 focus:ring-red-500',
              className
            )}
            {...props}
          />
        </div>
        {error && <span className="text-[11px] font-medium text-red-500">{error}</span>}
      </div>
    );
  }
);
BarcodeInput.displayName = 'BarcodeInput';

export const CurrencyInput = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && <label className="text-xs font-medium text-slate-700">{label}</label>}
        <div className="relative flex items-center">
          <span className="absolute left-3 text-xs font-semibold text-slate-500">₺</span>
          <input
            ref={ref}
            type="number"
            step="0.01"
            className={cn(
              'flex h-9 w-full rounded-md border border-slate-300 bg-white pl-7 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-500 focus:ring-red-500',
              className
            )}
            {...props}
          />
        </div>
        {error && <span className="text-[11px] font-medium text-red-500">{error}</span>}
      </div>
    );
  }
);
CurrencyInput.displayName = 'CurrencyInput';
