import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (title: string, description?: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback(
    (title: string, description?: string, variant: ToastVariant = 'success') => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setItems((prev) => [...prev, { id, title, description, variant }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const dismiss = (id: number) => setItems((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="no-print fixed right-4 bottom-4 z-[90] flex max-w-sm flex-col gap-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 rounded-xl border bg-white p-3.5 shadow-lg ring-1 ring-black/5 transition-all ${
              item.variant === 'error'
                ? 'border-rose-200'
                : item.variant === 'info'
                  ? 'border-sky-200'
                  : 'border-emerald-200'
            }`}
          >
            {item.variant === 'error' ? (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
            ) : item.variant === 'info' ? (
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              {item.description && (
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{item.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
