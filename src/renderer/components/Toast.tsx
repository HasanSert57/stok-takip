import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 size={18} className="text-emerald-600" />,
    danger: <XCircle size={18} className="text-red-600" />,
    warning: <AlertTriangle size={18} className="text-amber-600" />,
    info: <Info size={18} className="text-blue-600" />,
  };

  const borders = {
    success: 'border-l-emerald-600',
    danger: 'border-l-red-600',
    warning: 'border-l-amber-600',
    info: 'border-l-blue-600',
  };

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white border border-slate-200 border-l-4 rounded-lg p-3.5 shadow-xl text-slate-800 text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200',
        borders[toast.type]
      )}
    >
      {icons[toast.type]}
      <span>{toast.message}</span>
    </div>
  );
};
