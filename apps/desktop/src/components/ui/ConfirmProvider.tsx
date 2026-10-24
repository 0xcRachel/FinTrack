import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from '../workspace/Dialog';

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: 'default' | 'danger';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
interface PendingConfirm { options: ConfirmOptions; resolve: (value: boolean) => void }

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used inside ConfirmProvider');
  return context;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const pendingRef = useRef<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>(options => new Promise<boolean>(resolve => {
    pendingRef.current?.resolve(false);
    const next = { options, resolve };
    pendingRef.current = next;
    setPending(next);
  }), []);

  const finish = useCallback((value: boolean) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(value);
  }, []);

  useEffect(() => () => {
    pendingRef.current?.resolve(false);
    pendingRef.current = null;
  }, []);

  const tone = pending?.options.tone ?? 'default';

  return <ConfirmContext.Provider value={confirm}>
    {children}
    {pending && <Dialog title={pending.options.title} onClose={() => finish(false)} closeLabel={pending.options.cancelLabel}>
      <div className="ft-confirm">
        <div className="ft-confirm-body">
          <span className={`ft-confirm-symbol ${tone}`}><AlertTriangle size={22} strokeWidth={1.7} /></span>
          <p>{pending.options.description}</p>
        </div>
        <div className="ft-form-actions ft-confirm-actions">
          <button type="button" className="ft-btn ft-btn-secondary" autoFocus onClick={() => finish(false)}>{pending.options.cancelLabel}</button>
          <button type="button" className={`ft-btn ${tone === 'danger' ? 'ft-btn-danger' : 'ft-btn-primary'}`} onClick={() => finish(true)}>{pending.options.confirmLabel}</button>
        </div>
      </div>
    </Dialog>}
  </ConfirmContext.Provider>;
}
