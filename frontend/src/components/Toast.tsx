import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface ToastState {
  show: (message: string, type?: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastState>({ show: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [visible, setVisible] = useState(false);

  const show = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setVisible(true);
    setTimeout(() => {
      setVisible(false);
      setTimeout(() => setToast(null), 300);
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div className="fixed top-4 left-4 right-4 sm:inset-x-0 sm:left-auto sm:right-auto sm:flex sm:justify-center z-[100] pointer-events-none" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
          <div
            className={`pointer-events-auto rounded-2xl px-5 py-3.5 text-sm font-medium shadow-xl max-w-sm w-full sm:w-auto transition-all duration-300 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
            } ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            {toast.type === 'success' ? '✓ ' : '✕ '}{toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
