// src/components/Toast.tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import './Toast.css';

// ── Types ─────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
}

// ── Context ───────────────────────────────────────────
const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

// ── Icons ─────────────────────────────────────────────
function ToastIcon({ type }: { type: ToastType }) {
  const paths: Record<ToastType, string> = {
    success: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    error:   "M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z",
    warning: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
    info:    "m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z",
  };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[type]} />
    </svg>
  );
}

// ── Single toast ──────────────────────────────────────
function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  return (
    <div className={`toast toast-${item.type}`} role="alert">
      <div className="toast-icon">
        <ToastIcon type={item.type} />
      </div>
      <div className="toast-body">
        <div className="toast-title">{item.title}</div>
        {item.message && <div className="toast-message">{item.message}</div>}
      </div>
      <button
        className="toast-close"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 4000);
  }, [dismiss]);

  const ctx: ToastContextType = {
    success: (t, m) => push('success', t, m),
    error:   (t, m) => push('error',   t, m),
    warning: (t, m) => push('warning', t, m),
    info:    (t, m) => push('info',    t, m),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map(item => (
          <Toast key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}