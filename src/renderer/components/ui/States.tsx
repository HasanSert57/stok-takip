import React from 'react';
import { Loader2, PackageX, AlertCircle } from 'lucide-react';
import { Button } from './Button';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className || 'h-4 w-full'}`} />;
};

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Yükleniyor...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-500 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

export const EmptyState: React.FC<{
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}> = ({
  title = 'Kayıt Bulunamadı',
  description = 'Gösterilebilecek veri bulunmuyor.',
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 gap-3">
      <div className="rounded-full bg-slate-100 p-4 text-slate-400">
        <PackageX size={32} />
      </div>
      <h4 className="text-base font-bold text-slate-800">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm">{description}</p>
      {actionText && onAction && (
        <Button onClick={onAction} size="sm" className="mt-2">
          {actionText}
        </Button>
      )}
    </div>
  );
};

export const ErrorState: React.FC<{
  message?: string;
  onRetry?: () => void;
}> = ({ message = 'Bir hata oluştu.', onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-red-200 bg-red-50/50 rounded-xl gap-3 text-red-700">
      <AlertCircle size={32} className="text-red-500" />
      <h4 className="text-sm font-bold">{message}</h4>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          Tekrar Dene
        </Button>
      )}
    </div>
  );
};
