import { ReactNode } from 'react';
import { X } from 'lucide-react';

// Hoja modal reutilizable: en móvil sube desde abajo, en escritorio se centra.
export function Modal({
  children,
  onClose,
  labelledBy,
  wide = false,
}: {
  children: ReactNode;
  onClose: () => void;
  labelledBy?: string;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`bg-white dark:bg-slate-900 w-full ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md'
        } rounded-t-3xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto bottom-sheet`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full sm:hidden mx-auto" />
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <X className="w-5 h-5" />
        </button>
        {children}
      </div>
    </div>
  );
}
