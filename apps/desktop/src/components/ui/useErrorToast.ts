import { useEffect, useRef } from 'react';
import { useToast } from './ToastProvider';

export function useErrorToast(active: boolean, message: string) {
  const notify = useToast();
  const shown = useRef(false);
  useEffect(() => {
    if (!active) {
      shown.current = false;
      return;
    }
    if (shown.current) return;
    shown.current = true;
    notify.error(message);
  }, [active, message, notify]);
}
