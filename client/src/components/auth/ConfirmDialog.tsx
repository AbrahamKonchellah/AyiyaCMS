// src/components/ConfirmDialog.tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import './ConfirmDialog.css';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    options: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setState({ options, resolve });
    });
  }, []);

  const handleChoice = (confirmed: boolean) => {
    state?.resolve(confirmed);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="confirm-overlay" onClick={() => handleChoice(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className={`confirm-icon-wrap confirm-${state.options.variant ?? 'default'}`}>
              {state.options.variant === 'danger' ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                </svg>
              )}
            </div>
            <h3 className="confirm-title">{state.options.title}</h3>
            <p className="confirm-message">{state.options.message}</p>
            <div className="confirm-actions">
              <button
                className="confirm-btn-cancel"
                onClick={() => handleChoice(false)}
              >
                {state.options.cancelLabel ?? 'Cancel'}
              </button>
              <button
                className={`confirm-btn-confirm confirm-btn-${state.options.variant ?? 'default'}`}
                onClick={() => handleChoice(true)}
              >
                {state.options.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}