import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  CartesianGrid,
} from 'recharts';
import {
  Scale,
  Ruler,
  Plus,
  Trash2,
  Camera,
} from 'lucide-react';
import { api, formatDate, formatNumber, todayISO } from '../lib/api';
import type { BodyMeasurement, WeightEntry } from '../types';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Field, Input } from '../components/Input';
import { PageHeader } from '../components/AppLayout';
import { useToast } from '../components/Toast';

function makeAverage(data: { date: string; value: number }[]) {
  const grouped = new Map<string, { date: string; sum: number; count: number }>();
  for (const d of data) {
    const dt = new Date(d.date);
    const ws = new Date(dt);
    ws.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
    const key = ws.toISOString().slice(0, 10);
    if (!grouped.has(key)) grouped.set(key, { date: key, sum: 0, count: 0 });
    const g = grouped.get(key)!;
    g.sum += d.value;
    g.count += 1;
  }
  return Array.from(grouped.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((g) => ({ date: g.date, avg: Math.round((g.sum / g.count) * 100) / 100 }));
}

export default function BodyProgressPage() {
  const { show } = useToast();
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);

  const [weightInput, setWeightInput] = useState('');
  const [measureForm, setMeasureForm] = useState({ waist: '', chest: '', arm: '', thigh: '', neck: '', fat: '', weight: '', notes: '' });

  const today = todayISO();
  const [activeDate, setActiveDate] = useState(today);
  const [range, setRange] = useState(30);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'peso' | 'medidas'>('peso');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [w, m] = await Promise.all([
        api.get<WeightEntry[]>('/weight'),
        api.get<BodyMeasurement[]>('/measurements'),
      ]);
      setWeights(w);
      setMeasurements(m);
      if (w.length > 0 && !weightInput) setWeightInput(String(w[w.length - 1].weightKg));
    } catch (e) {
      show((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    load();
  }, [load]);

  const saveWeight = async () => {
    if (!weightInput) return;
    setSaving(true);
    try {
      await api.post('/weight', { date: activeDate, weightKg: Number(weightInput) });
      show('Peso registrado');
      setWeightInput('');
      setActiveDate(today);
      load();
    } catch (e) {
      show((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveMeasurement = async () => {
    setSaving(true);
    try {
      await api.post('/measurements', {
        date: activeDate,
        waistCm: measureForm.waist ? Number(measureForm.waist) : null,
        chestCm: measureForm.chest ? Number(measureForm.chest) : null,
        armCm: measureForm.arm ? Number(measureForm.arm) : null,
        thighCm: measureForm.thigh ? Number(measureForm.thigh) : null,
        neckCm: measureForm.neck ? Number(measureForm.neck) : null,
        bodyFatPct: measureForm.fat ? Number(measureForm.fat) : null,
        weightKg: measureForm.weight ? Number(measureForm.weight) : null,
        notes: measureForm.notes || null,
      });
      show('Medidas registradas');
      load();
    } catch (e) {
      show((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteWeight = async (id: number) => {
    try {
      await api.delete(`/weight/${id}`);
      show('Registro eliminado');
      load();
    } catch (e) {
      show((e as Error).message, 'error');
    }
  };

  const deleteMeasurement = async (id: number) => {
    try {
      await api.delete(`/measurements/${id}`);
      show('Registro eliminado');
      load();
    } catch (e) {
      show((e as Error).message, 'error');
    }
  };

  const filteredWeights = useMemo(() => {
    const from = new Date();
    from.setDate(from.getDate() - (range === 180 ? 10000 : range));
    return weights.filter((w) => new Date(w.date) >= from);
  }, [weights, range]);

  const chartWeight = filteredWeights.map((w) => ({ date: formatDate(w.date), peso: w.weightKg }));
  const chartWeekly = makeAverage(filteredWeights.map((w) => ({ date: w.date, value: w.weightKg }))).map((g) => ({
    date: formatDate(g.date),
    promedio: g.avg,
    peso: null,
  }));

  const chartWaist = useMemo(() => {
    const from = new Date();
    from.setDate(from.getDate() - (range === 180 ? 10000 : range));
    return measurements
      .filter((m) => m.waistCm != null && new Date(m.date) >= from)
      .map((m) => ({ date: formatDate(m.date), cintura: m.waistCm as number }));
  }, [measurements, range]);

  const chartFat = useMemo(() => {
    const from = new Date();
    from.setDate(from.getDate() - (range === 180 ? 10000 : range));
    return measurements
      .filter((m) => m.bodyFatPct != null && new Date(m.date) >= from)
      .map((m) => ({ date: formatDate(m.date), grasa: m.bodyFatPct as number }));
  }, [measurements, range]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Cargando…</p>
        </div>
      </div>
    );
  }

  const lastWeight = weights.length > 0 ? weights[weights.length - 1].weightKg : null;
  const firstWeight = weights.length > 0 ? weights[0].weightKg : null;
  const weightDiff = lastWeight && firstWeight ? lastWeight - firstWeight : null;

  return (
    <div className="space-y-4 animate-slide-up pb-24">
      <PageHeader title="Progreso corporal" />

      {/* Current weight summary */}
      <Card className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Peso actual</p>
            <p className="text-3xl font-black">{lastWeight ? `${formatNumber(lastWeight, 1)} kg` : '—'}</p>
            {weightDiff !== null && (
              <p className={`text-xs mt-1 ${weightDiff <= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {weightDiff <= 0 ? '↓' : '↑'} {formatNumber(Math.abs(weightDiff), 1)} kg desde inicio
              </p>
            )}
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <Scale className="w-7 h-7" />
          </div>
        </div>
      </Card>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('peso')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'peso' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
          }`}
        >
          <Scale className="w-4 h-4 inline mr-1.5" />Peso
        </button>
        <button
          onClick={() => setActiveTab('medidas')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'medidas' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
          }`}
        >
          <Ruler className="w-4 h-4 inline mr-1.5" />Medidas
        </button>
      </div>

      {activeTab === 'peso' && (
        <>
          {/* Register weight */}
          <Card>
            <CardHeader title="Registrar peso" subtitle="Pésate en ayunas para mejor precisión" />
            <div className="flex gap-2 items-end">
              <Input type="date" value={activeDate} onChange={(e) => setActiveDate(e.target.value)} className="flex-1" />
              <Input type="number" inputMode="decimal" placeholder="kg" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} className="flex-1" />
              <Button onClick={saveWeight} disabled={saving || !weightInput} className="shrink-0">
                <Plus className="w-4 h-4" /> Guardar
              </Button>
            </div>
          </Card>

          {/* Weight chart */}
          <Card>
            <CardHeader title="Gráfica de peso" subtitle="Línea: registro · Verde: promedio semanal" action={<RangeButtons range={range} setRange={setRange} />} />
            {chartWeight.length > 0 ? (
              <div className="h-56 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...chartWeekly, ...chartWeight]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#8884d8" opacity={0.15} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 10 }} width={35} />
                    <Tooltip />
                    <Line type="monotone" dataKey="peso" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} name="Peso" />
                    <Line type="monotone" dataKey="promedio" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Promedio semanal" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-8 text-center">Registra tu peso para ver la gráfica</p>
            )}
          </Card>

          {/* Weight history */}
          <Card>
            <CardHeader title="Historial" subtitle={`${weights.length} registros`} />
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...weights].reverse().map((w) => (
                <div key={w.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                    <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{formatNumber(w.weightKg, 1)} kg</p>
                    <p className="text-[11px] text-slate-500">{formatDate(w.date)}</p>
                  </div>
                  <button
                    onClick={() => deleteWeight(w.id)}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-500 active:text-rose-600 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {activeTab === 'medidas' && (
        <>
          {/* Waist/Fat chart */}
          <Card>
            <CardHeader title="Cintura y % grasa" action={<RangeButtons range={range} setRange={setRange} />} />
            {chartWaist.length > 0 || chartFat.length > 0 ? (
              <div className="h-56 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...chartWaist, ...chartFat]}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} width={35} />
                    <Tooltip />
                    <Line type="monotone" dataKey="cintura" stroke="#f59e0b" name="Cintura (cm)" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="grasa" stroke="#ef4444" name="% grasa" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-8 text-center">Registra medidas para ver la gráfica</p>
            )}
          </Card>

          {/* Register measurements */}
          <Card>
            <CardHeader title="Registrar medidas" subtitle="Usa la misma cinta y posición cada vez" />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cintura (cm)"><Input type="number" inputMode="decimal" value={measureForm.waist} onChange={(e) => setMeasureForm({ ...measureForm, waist: e.target.value })} /></Field>
                <Field label="Pecho (cm)"><Input type="number" inputMode="decimal" value={measureForm.chest} onChange={(e) => setMeasureForm({ ...measureForm, chest: e.target.value })} /></Field>
                <Field label="Brazo (cm)"><Input type="number" inputMode="decimal" value={measureForm.arm} onChange={(e) => setMeasureForm({ ...measureForm, arm: e.target.value })} /></Field>
                <Field label="Muslo (cm)"><Input type="number" inputMode="decimal" value={measureForm.thigh} onChange={(e) => setMeasureForm({ ...measureForm, thigh: e.target.value })} /></Field>
                <Field label="Cuello (cm)"><Input type="number" inputMode="decimal" value={measureForm.neck} onChange={(e) => setMeasureForm({ ...measureForm, neck: e.target.value })} /></Field>
                <Field label="% grasa"><Input type="number" inputMode="decimal" value={measureForm.fat} onChange={(e) => setMeasureForm({ ...measureForm, fat: e.target.value })} /></Field>
              </div>
              <Field label="Peso (opcional)">
                <Input type="number" inputMode="decimal" value={measureForm.weight} onChange={(e) => setMeasureForm({ ...measureForm, weight: e.target.value })} />
              </Field>
              <Field label="Observaciones">
                <Input value={measureForm.notes} onChange={(e) => setMeasureForm({ ...measureForm, notes: e.target.value })} placeholder="Ej: cintura a la altura del ombligo" />
              </Field>
            </div>
            <Button onClick={saveMeasurement} disabled={saving} className="w-full mt-4 py-4">
              <Ruler className="w-4 h-4" /> Guardar medidas
            </Button>
          </Card>

          {/* Measurements history */}
          <Card>
            <CardHeader title="Historial" subtitle={`${measurements.length} registros`} />
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...measurements].reverse().map((m) => (
                <div key={m.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                    <Ruler className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {m.waistCm ? `Cintura: ${m.waistCm}cm` : '—'}
                      {m.bodyFatPct ? ` · ${m.bodyFatPct}% grasa` : ''}
                    </p>
                    <p className="text-[11px] text-slate-500">{formatDate(m.date)}</p>
                  </div>
                  <button
                    onClick={() => deleteMeasurement(m.id)}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-500 active:text-rose-600 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Link to photos */}
      <Button variant="secondary" onClick={() => (window.location.href = '/mas/photos')} className="w-full py-4">
        <Camera className="w-5 h-5" /> Ver fotografías de progreso
      </Button>
    </div>
  );
}

function RangeButtons({ range, setRange }: { range: number; setRange: (n: number) => void }) {
  const opts = [
    { label: '7d', value: 7 },
    { label: '30d', value: 30 },
    { label: '90d', value: 90 },
    { label: '180d', value: 180 },
  ];
  return (
    <div className="flex gap-1">
      {opts.map((o) => (
        <button
          key={o.value}
          onClick={() => setRange(o.value)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium touch-action-manipulation ${
            range === o.value ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 active:bg-slate-200 dark:active:bg-slate-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
