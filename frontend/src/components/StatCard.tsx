import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { Card } from './Card';
import { cn } from '../lib/cn';

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  status,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  status?: 'green' | 'yellow' | 'red' | 'neutral';
  className?: string;
}) {
  const statusDot = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    red: 'bg-rose-500',
    neutral: 'bg-slate-300 dark:bg-slate-600',
  }[status ?? 'neutral'];

  return (
    <Card className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Icon className="w-4 h-4" />
          {label}
        </span>
        <span className={cn('w-2 h-2 rounded-full', statusDot)} />
      </div>
      <div className="text-xl font-bold text-slate-900 dark:text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
    </Card>
  );
}