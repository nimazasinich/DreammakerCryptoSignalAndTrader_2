import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'info' | 'warning' | 'error' | 'success';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface ToastAction {
  label: string;
  onClick?: () => void;
}

export interface ToastOptions {
  duration?: number | null;
  actions?: ToastAction[];
  dismissible?: boolean;
  id?: string;
  position?: ToastPosition;
}

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  actions: ToastAction[];
  dismissible: boolean;
  createdAt: number;
  duration: number | null;
  position: ToastPosition;
}

let toastIdCounter = 0;
const toastListeners = new Set<(toasts: Toast[]) => void>();
const toastTimers = new Map<string, number>();
let currentToasts: Toast[] = [];

function notify() {
  toastListeners.forEach((listener) => listener(currentToasts));
}

export function showToast(type: ToastType, title: string, message: string, options: ToastOptions = {}) {
  const id = options.id ?? `toast-${Date.now()}-${toastIdCounter++}`;
  const duration = options.duration === undefined ? 5000 : options.duration;
  const position = options.position ?? 'top-right';
  const newToast: Toast = {
    id,
    type,
    title,
    message,
    actions: options.actions ?? [],
    dismissible: options.dismissible ?? true,
    createdAt: Date.now(),
    duration,
    position,
  };

  currentToasts = [...currentToasts, newToast];
  notify();

  if (duration !== null) {
    const timerId = window.setTimeout(() => dismissToast(id), duration);
    toastTimers.set(id, timerId);
  }

  return id;
}

export function dismissToast(id: string) {
  const timerId = toastTimers.get(id);
  if (timerId) {
    window.clearTimeout(timerId);
    toastTimers.delete(id);
  }

  currentToasts = currentToasts.filter((t) => t.id !== id);
  notify();
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>(currentToasts);

  useEffect(() => {
    toastListeners.add(setToasts);
    return () => {
      toastListeners.delete(setToasts);
    };
  }, []);

  return toasts;
}

const TYPE_CONFIG: Record<
  ToastType,
  { classes: string; icon: React.ReactNode }
> = {
  info: { classes: 'bg-sky-900/90 border border-sky-600/40 text-sky-50', icon: <Info className="h-4 w-4" /> },
  warning: { classes: 'bg-amber-900/90 border border-amber-600/40 text-amber-50', icon: <AlertTriangle className="h-4 w-4" /> },
  error: { classes: 'bg-red-900/90 border border-red-600/40 text-red-50', icon: <AlertCircle className="h-4 w-4" /> },
  success: { classes: 'bg-emerald-900/90 border border-emerald-600/40 text-emerald-50', icon: <CheckCircle2 className="h-4 w-4" /> },
};

const POSITION_CLASSES: Record<ToastPosition, string> = {
  'top-right': 'top-4 right-4 items-end',
  'top-left': 'top-4 left-4 items-start',
  'bottom-right': 'bottom-4 right-4 items-end',
  'bottom-left': 'bottom-4 left-4 items-start',
};

export function ToastContainer() {
  const toasts = useToasts();
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!toasts.some((toast) => toast.duration !== null)) return;
    const intervalId = window.setInterval(() => forceTick(Date.now()), 250);
    return () => window.clearInterval(intervalId);
  }, [toasts]);

  if (toasts.length === 0) return null;

  const groupedByPosition = (Object.keys(POSITION_CLASSES) as ToastPosition[]).map((position) => ({
    position,
    items: toasts.filter((toast) => toast.position === position),
  }));

  return (
    <>
      {groupedByPosition.map(({ position, items }) => {
        if (items.length === 0) return null;
        return (
          <div
            key={position}
            className={`pointer-events-none fixed z-[9999] flex w-full max-w-sm flex-col gap-3 ${POSITION_CLASSES[position]}`}
          >
            {items.map((toast) => {
              const config = TYPE_CONFIG[toast.type];
              const remaining =
                toast.duration === null ? null : Math.max(0, toast.duration - (Date.now() - toast.createdAt));
              const percent = toast.duration && toast.duration > 0 ? (remaining ?? 0) / toast.duration : null;

              return (
                <div
                  key={toast.id}
                  className={`${config.classes} pointer-events-auto rounded-2xl p-4 shadow-2xl shadow-black/30 backdrop-blur`}
                  role="alert"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-white/10 p-2 text-white">{config.icon}</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{toast.title}</p>
                      <p className="text-xs text-white/80">{toast.message}</p>

                      {toast.actions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {toast.actions.map((action, idx) => (
                            <button
                              key={`${toast.id}-action-${idx}`}
                              type="button"
                              className="rounded-lg border border-white/20 px-3 py-1 text-xs font-semibold text-white transition hover:border-white/40"
                              onClick={() => {
                                action.onClick?.();
                                dismissToast(toast.id);
                              }}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {percent !== null && (
                        <div className="mt-3 h-1 w-full rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-white/70 transition-[width]"
                            style={{ width: `${percent * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                    {toast.dismissible && (
                      <button
                        onClick={() => dismissToast(toast.id)}
                        className="rounded-full p-1 text-white/60 transition hover:text-white"
                        aria-label="Dismiss notification"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
