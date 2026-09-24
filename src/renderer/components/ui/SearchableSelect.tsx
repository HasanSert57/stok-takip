import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SearchableOption {
  value: number | string;
  label: string;
  sublabel?: string;
  badge?: string;
}

interface SearchableSelectProps {
  label?: string;
  placeholder?: string;
  options: SearchableOption[];
  value: number | string | null;
  onChange: (val: any) => void;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  placeholder = 'Ürün arayın veya seçin...',
  options,
  value,
  onChange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value) || null;

  // Filter options dynamically
  const filteredOptions = options.filter(
    (o) =>
      o.label.toLowerCase().includes(query.toLowerCase()) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(query.toLowerCase())) ||
      (o.badge && o.badge.toLowerCase().includes(query.toLowerCase()))
  );

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelect = (val: number | string) => {
    onChange(val);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className={cn('flex flex-col gap-1 text-xs relative', className)} ref={containerRef}>
      {label && <label className="font-semibold text-slate-700">{label}</label>}

      {/* Main Trigger Box */}
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className={cn(
          'min-h-[38px] px-3 py-1.5 rounded-lg border bg-white flex items-center justify-between cursor-pointer transition-all duration-150 shadow-sm',
          isOpen
            ? 'border-blue-600 ring-2 ring-blue-500/20'
            : 'border-slate-300 hover:border-slate-400'
        )}
      >
        {selectedOption ? (
          <div className="flex items-center gap-2 overflow-hidden pr-2">
            <span className="font-bold text-slate-800 truncate">{selectedOption.label}</span>
            {selectedOption.badge && (
              <span className="font-mono text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold shrink-0">
                {selectedOption.badge}
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-400 font-medium">{placeholder}</span>
        )}

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {selectedOption && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="p-0.5 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={16} className={cn('transition-transform duration-150', isOpen && 'rotate-180')} />
        </div>
      </div>

      {/* Filterable Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Input Bar */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
            <Search size={14} className="text-slate-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Yazarak filtreleyin (Örn: Kulaklık, Kılıf, Barkod)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-xs bg-transparent focus:outline-none font-medium text-slate-800 placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-slate-400 font-medium">
                Aranan kritere uygun ürün bulunamadı.
              </div>
            ) : (
              filteredOptions.map((o) => {
                const isSelected = o.value === value;
                return (
                  <div
                    key={o.value}
                    onClick={() => handleSelect(o.value)}
                    className={cn(
                      'px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors text-xs',
                      isSelected
                        ? 'bg-blue-50 text-blue-900 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold leading-tight">{o.label}</span>
                      {o.sublabel && (
                        <span className="text-[11px] text-slate-400 font-normal">{o.sublabel}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {o.badge && (
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {o.badge}
                        </span>
                      )}
                      {isSelected && <Check size={14} className="text-blue-600" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
