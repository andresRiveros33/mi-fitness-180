import { ReactNode } from 'react';

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    primary:
      'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white disabled:opacity-40 shadow-sm shadow-blue-600/20',
    secondary:
      'bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:active:bg-slate-500 dark:text-white disabled:opacity-40',
    danger:
      'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white disabled:opacity-40 shadow-sm shadow-rose-600/20',
    ghost:
      'bg-transparent hover:bg-slate-100 active:bg-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700 text-slate-700 dark:text-slate-200',
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] select-none touch-action-manipulation ${styles} ${className ?? ''}`}
    >
      {children}
    </button>
  );
}
