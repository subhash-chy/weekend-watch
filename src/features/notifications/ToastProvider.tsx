/**
 * Toast notifications.
 *
 * Explicit feedback for every asynchronous outcome: a successful search, a
 * failed request, an offline-catalogue notice. Toasts are *ephemeral UI*
 * state, so they live in their own provider and never touch the server cache.
 *
 * Announcing: the stack is an `aria-live="polite"` region, so a new toast is
 * read without interrupting whatever the user was doing. Errors use
 * `role="alert"` semantics via `aria-live="assertive"` on the individual item.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { JSX, ReactNode } from 'react';
import { Icon } from '@/assets/icons/Icon';
import { cls } from '@/utils/cx';
import type { IconName } from '@/assets/icons/Icon';
import { TOAST_DURATION_MS } from '@/utils/constants';
import type { Toast, ToastTone } from '@/types/media';
import styles from './Toast.module.css';

/** Payload for pushing a toast. */
export interface ToastInput {
  tone?: ToastTone | undefined;
  title: string;
  description?: string | undefined;
  /** Override the default auto-dismiss timeout. `0` keeps it until dismissed. */
  durationMs?: number | undefined;
}

/** Imperative toast API exposed by {@link useToast}. */
export interface ToastApi {
  /** Queues a toast and returns its id. */
  push: (input: ToastInput) => number;
  /** Removes a toast immediately. */
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Icon and colour token per tone. */
const TONE_META: Readonly<Record<ToastTone, { icon: IconName; className: string }>> = {
  info: { icon: 'info', className: cls(styles, 'toneInfo') },
  success: { icon: 'check', className: cls(styles, 'toneSuccess') },
  warning: { icon: 'warning', className: cls(styles, 'toneWarning') },
  error: { icon: 'error', className: cls(styles, 'toneError') },
};

/** Props accepted by {@link ToastProvider}. */
export interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Provides the toast API to the tree and renders the stack.
 *
 * @param props - Provider props.
 * @returns The provider element.
 */
export function ToastProvider({ children }: ToastProviderProps): JSX.Element {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  /** Monotonic id source; a counter avoids `Date.now()` collisions. */
  const nextId = useRef(1);
  /** Active timers, cleared on unmount to avoid setState after teardown. */
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number): void => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (input: ToastInput): number => {
      const id = nextId.current;
      nextId.current += 1;

      const toast: Toast = {
        id,
        tone: input.tone ?? 'info',
        title: input.title,
        ...(input.description !== undefined ? { description: input.description } : {}),
      };

      setToasts((current) => [...current, toast].slice(-4));

      const duration = input.durationMs ?? TOAST_DURATION_MS;
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  // Clear every pending timer when the provider unmounts, so no dismissal can
  // fire a state update against a torn-down tree.
  useEffect(() => {
    const active = timers.current;
    return () => {
      for (const timer of active.values()) clearTimeout(timer);
      active.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={cls(styles, 'stack')} role="region" aria-label="Notifications">
        {toasts.map((toast) => {
          const meta = TONE_META[toast.tone];
          return (
            <div
              key={toast.id}
              className={`${cls(styles, 'toast')} ${meta.className}`}
              role={toast.tone === 'error' ? 'alert' : 'status'}
              aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
            >
              <Icon name={meta.icon} size={20} className={cls(styles, 'icon')} />
              <div className={cls(styles, 'body')}>
                <p className={cls(styles, 'title')}>{toast.title}</p>
                {toast.description !== undefined ? (
                  <p className={cls(styles, 'description')}>{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                className={cls(styles, 'close')}
                onClick={() => dismiss(toast.id)}
                aria-label={`Dismiss notification: ${toast.title}`}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Returns the imperative toast API.
 *
 * @returns The {@link ToastApi}.
 * @throws {Error} When used outside a {@link ToastProvider}.
 */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error('useToast must be used inside a <ToastProvider>.');
  }
  return context;
}
