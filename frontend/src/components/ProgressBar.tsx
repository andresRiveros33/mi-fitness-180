import { ReactNode } from 'react';
import { cn } from '../lib/cn';

const colorMap: Record<string, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-rose-500',
  blue: 'bg-blue-500',
};

export function ProgressBar({
  value,
  max,
  color = 'blue',
  showPct = true,
  className,
}: {
  value: number;
  max: number;
  color?: 'green' | 'yellow' | 'red' | 'blue';
  showPct?: boolean;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorMap[color]} rounded-full progress-bar-fill`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showPct && <span className="text-xs text-slate-500 dark:text-slate-400 w-10 text-right font-medium">{Math.round(pct)}%</span>}
    </div>
  );
}

export function StatValue({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-2xl font-bold text-slate-900 dark:text-white', className)}>{children}</p>;
}

export function StatLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs text-slate-500 dark:text-slate-400">{children}</p>;
}
