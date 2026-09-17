import { useCallback, useState } from 'react';
import type { Toast } from '../types';
import { randomId } from '../lib/utils';

const DEFAULTS: Record<Toast['tone'], number> = {
  info: 3200,
  success: 3600,
  warn: 4200,
  danger: 5200,
};

/** Tiny notification queue rendered as macOS-style banners in the shell. */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, 'id' | 'ttl'> & { ttl?: number }) => {
      const id = randomId('toast');
      const ttl = toast.ttl ?? DEFAULTS[toast.tone];
      setToasts((current) => [...current.slice(-3), { ...toast, id, ttl }]);
      window.setTimeout(() => dismiss(id), ttl);
      return id;
    },
    [dismiss],
  );

  return { toasts, push, dismiss };
}

export type ToastController = ReturnType<typeof useToasts>;
