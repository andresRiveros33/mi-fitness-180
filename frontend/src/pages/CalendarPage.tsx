import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { Card, CardHeader } from '../components/Card';
import { PageHeader } from '../components/AppLayout';
import { useToast } from '../components/Toast';

interface CalendarDay {
  date: string;
  workout: { id: number; name: string } | null;
  nutrition: { calories: number } | null;
  activity: { steps: number } | null;
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function CalendarPage() {
  const { show } = useToast();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ days: CalendarDay[] }>('/stats/calendar', { year, month });
      setDays(res.days);
    } catch (e) {
      show((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [year, month, show]);

  useEffect(() => {
    load();
  }, [load]);

  const firstDay = new Date(year, month - 1, 1).getDay();
  const emptyCells = (firstDay + 6) % 7; // calendar starts Monday

  const moveMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  };

  const statusClass = (d: CalendarDay) => {
    if (d.workout) return 'bg-emerald-500 text-white';
    if (d.nutrition || d.activity) return 'bg-amber-400 text-white';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-500';
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Calendario" />
      <div className="text-[11px] text-slate-500 flex gap-3">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Entrenamiento</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Parcial</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" /> Sin registro</span>
      </div>

      <Card>
        <CardHeader
          title={`${month} / ${year}`}
          action={
            <div className="flex gap-1">
              <button onClick={() => moveMonth(-1)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => moveMonth(1)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800"><ChevronRight className="w-4 h-4" /></button>
            </div>
          }
        />
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w, i) => (
            <div key={i} className="text-xs font-medium text-slate-400 py-1">{w}</div>
          ))}
          {Array.from({ length: emptyCells }).map((_, i) => (
            <div key={`e${i}`} className="h-9" />
          ))}
          {days.map((d) => (
            <div
              key={d.date}
              className={`h-9 rounded-lg flex items-center justify-center text-sm font-medium ${statusClass(d)}`}
              title={`${d.date}${d.workout ? ' · ' + d.workout.name : ''}`}
            >
              {Number(d.date.slice(8, 10))}
            </div>
          ))}
        </div>
      </Card>

      {loading && <div className="text-center text-slate-500 text-sm">Cargando…</div>}
    </div>
  );
}