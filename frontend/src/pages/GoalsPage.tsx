import { useCallback, useEffect, useState } from 'react';
import { Save, Pencil, X, Check } from 'lucide-react';
import { api } from '../lib/api';
import type { MonthlyGoal } from '../types';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { PageHeader } from '../components/AppLayout';
import { useToast } from '../components/Toast';

export default function GoalsPage() {
  const { show } = useToast();
  const [goals, setGoals] = useState<MonthlyGoal[]>([]);
  const [editing, setEditing] = useState<{ month: number; items: string[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const g = await api.get<MonthlyGoal[]>('/goals');
      setGoals(g);
    } catch (e) {
      show((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    load();
  }, [load]);

  const saveEditing = async () => {
    if (!editing) return;
    try {
      await api.put(`/goals/${editing.month}`, { goals: editing.items.filter((i) => i.trim()) });
      show('Objetivos actualizados');
      setEditing(null);
      load();
    } catch (e) {
      show((e as Error).message, 'error');
    }
  };

  const updateEditingItem = (idx: number, value: string) => {
    setEditing((prev) =>
      prev ? { ...prev, items: prev.items.map((it, i) => (i === idx ? value : it)) } : prev
    );
  };

  if (loading) return <div className="text-center py-10 text-slate-500">Cargando…</div>;

  return (
    <div className="space-y-4">
      <PageHeader title="Objetivos mensuales" />
      <p className="text-xs text-slate-500">Objetivos editables de cada mes del programa de 180 días.</p>

      {goals.map((g) => {
        const isEditing = editing?.month === g.month;
        return (
          <Card key={g.month}>
            <CardHeader
              title={`Mes ${g.month}`}
              subtitle={g.goals.length > 0 ? `${g.goals.length} objetivos` : 'Sin objetivos'}
              action={
                isEditing ? (
                  <div className="flex gap-1">
                    <Button variant="secondary" onClick={saveEditing} className="py-1.5 px-2">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => setEditing(null)} className="py-1.5 px-2">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="secondary" onClick={() => setEditing({ month: g.month, items: [...g.goals] })} className="py-1.5 px-2">
                    <Pencil className="w-4 h-4" />
                  </Button>
                )
              }
            />
            {isEditing ? (
              <div className="space-y-2">
                {editing.items.map((item, idx) => (
                  <Input key={idx} value={item} onChange={(e) => updateEditingItem(idx, e.target.value)} />
                ))}
                <Button variant="secondary" onClick={() => setEditing({ ...editing, items: [...editing.items, ''] })} className="w-full text-sm">
                  + Agregar objetivo
                </Button>
              </div>
            ) : (
              <ul className="space-y-1">
                {g.goals.map((goal, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-0.5">✓</span>
                    {goal}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}