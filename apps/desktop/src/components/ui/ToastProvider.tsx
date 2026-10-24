import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, CircleAlert, Info, X } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'info';
export interface ToastOptions { tone?: ToastTone; duration?: number; title?: string }
interface ToastItem { id: number; message: string; tone: ToastTone; title?: string }
interface ToastApi {
  push: (message: string, options?: ToastOptions) => number;
  success: (message: string, options?: Omit<ToastOptions, 'tone'>) => number;
  error: (message: string, options?: Omit<ToastOptions, 'tone'>) => number;
  info: (message: string, options?: Omit<ToastOptions, 'tone'>) => number;
  dismiss: (id: number) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}

const toneIcons = { success: Check, error: CircleAlert, info: Info };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts(current => current.filter(item => item.id !== id));
  }, []);

  const clear = useCallback(() => {
    timers.current.forEach(timer => clearTimeout(timer));
    timers.current.clear();
    setToasts([]);
  }, []);

  const push = useCallback((message: string, options: ToastOptions = {}) => {
    const id = ++nextId.current;
    const tone = options.tone ?? 'success';
    setToasts(current => [...current.slice(-2), { id, message, tone, title: options.title }]);
    const timer = setTimeout(() => dismiss(id), options.duration ?? (tone === 'error' ? 6500 : 4500));
    timers.current.set(id, timer);
    return id;
  }, [dismiss]);

  useEffect(() => () => {
    timers.current.forEach(timer => clearTimeout(timer));
    timers.current.clear();
  }, []);

  const api = useMemo<ToastApi>(() => ({
    push,
    dismiss,
    clear,
    success: (message, options) => push(message, { ...options, tone: 'success' }),
    error: (message, options) => push(message, { ...options, tone: 'error' }),
    info: (message, options) => push(message, { ...options, tone: 'info' }),
  }), [push, dismiss, clear]);

  return <ToastContext.Provider value={api}>
    {children}
    <div className="ft-toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map(item => {
        const Icon = toneIcons[item.tone];
        return <div key={item.id} className={`ft-toast ft-toast-${item.tone}`} role={item.tone === 'error' ? 'alert' : 'status'}>
          <span className="ft-toast-symbol"><Icon size={18} strokeWidth={1.8} /></span>
          <div className="ft-toast-copy">
            {item.title && <strong>{item.title}</strong>}
            <span>{item.message}</span>
          </div>
          <button type="button" className="ft-toast-close" onClick={() => dismiss(item.id)} aria-label="Dismiss notification"><X size={14} /></button>
        </div>;
      })}
    </div>
  </ToastContext.Provider>;
}
