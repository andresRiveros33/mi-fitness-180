import { useCallback, useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { api, formatNumber } from '../lib/api';
import type { PersonalRecord } from '../types';
import { Card, CardHeader } from '../components/Card';
import { PageHeader } from '../components/AppLayout';

export default function RecordsPage() {
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PersonalRecord[]>('/stats/records').then(setRecords).catch(() => setRecords([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Récords personales" />
      {loading ? (
        <div className="text-center py-10 text-slate-500">Cargando…</div>
      ) : records.length === 0 ? (
        <Card className="text-center py-10">
          <Trophy className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">Registra entrenamientos para detectar tus mejores marcas.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <Card key={r.exercise}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{r.exercise}</p>
                  <p className="text-[11px] text-slate-500">{r.category}</p>
                </div>
                <div className="text-right text-sm">
                  <p><span className="text-slate-400">Peso:</span> <b>{formatNumber(r.maxWeight, 1)} kg</b></p>
                  <p><span className="text-slate-400">Reps máx:</span> {r.maxReps}</p>
                  <p><span className="text-slate-400">Volumen:</span> {formatNumber(r.maxVolume, 1)} kg</p>
                </div>
              </div>
              {r.maxWeight > 0 && <p className="text-[11px] text-emerald-600 mt-1">Nuevo récord personal</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}