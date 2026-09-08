import { useCallback, useEffect, useState } from 'react';
import { Footprints, Flame, Pill, Zap, Save } from 'lucide-react';
import { api, formatNumber, todayISO } from '../lib/api';
import type { DailyActivity, UserProfile } from '../types';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Field, Input, Select } from '../components/Input';
import { PageHeader } from '../components/AppLayout';
import { useToast } from '../components/Toast';

export default function StatsPage() {
  const { show } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activity, setActivity] = useState({ steps: '', activeCalories: '', walkingMinutes: '', cardioMinutes: '', cardioType: '' });
  const [supp, setSupp] = useState({ creatine: '', whey: '', wheyCalories: '' });
  const [todaySupp, setTodaySupp] = useState<{ creatineG: number } | null>(null);
  const today = todayISO();

  const load = useCallback(async () => {
    try {
      const [p, sup] = await Promise.all([
        api.get<UserProfile>('/users/profile'),
        api.get<Array<{ date: string; creatineG: number }>>('/supplements'),
      ]);
      setProfile(p);
      const todaySup = sup.find((s) => s.date.slice(0, 10) === today);
      if (todaySup) setTodaySupp({ creatineG: todaySup.creatineG });
    } catch (e) {
      show((e as Error).message, 'error');
    }
  }, [show, today]);

  useEffect(() => {
    load();
  }, [load]);

  const saveActivity = async () => {
    try {
      await api.post('/activity', {
        date: today,
        steps: Number(activity.steps) || 0,
        activeCalories: Number(activity.activeCalories) || 0,
        walkingMinutes: Number(activity.walkingMinutes) || 0,
        cardioType: activity.cardioType || null,
        cardioMinutes: Number(activity.cardioMinutes) || 0,
      });
      show('Actividad guardada');
    } catch (e) {
      show((e as Error).message, 'error');
    }
  };

  const saveSupplements = async () => {
    try {
      await api.post('/supplements', {
        date: today,
        wheyProteinG: Number(supp.whey) || 0,
        caloriesFromWhey: Number(supp.wheyCalories) || 0,
        creatineG: Number(supp.creatine) || 0,
      });
      show('Suplementos registrados');
      load();
    } catch (e) {
      show((e as Error).message, 'error');
    }
  };

  const creatineTarget = profile?.creatineTargetG ?? 5;
  const creatineDone = todaySupp ? todaySupp.creatineG >= creatineTarget : false;

  return (
    <div className="space-y-4 animate-slide-up pb-24">
      <PageHeader title="Estadísticas y registro" />

      <Card>
        <CardHeader title="Actividad diaria" subtitle="Objetivo: 6000-7000 pasos/día" />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Pasos">
            <Input type="number" inputMode="numeric" value={activity.steps} onChange={(e) => setActivity({ ...activity, steps: e.target.value })} placeholder="6000" />
          </Field>
          <Field label="Calorías activas (opcional)">
            <Input type="number" inputMode="numeric" value={activity.activeCalories} onChange={(e) => setActivity({ ...activity, activeCalories: e.target.value })} />
          </Field>
          <Field label="Minutos caminando">
            <Input type="number" inputMode="numeric" value={activity.walkingMinutes} onChange={(e) => setActivity({ ...activity, walkingMinutes: e.target.value })} />
          </Field>
          <Field label="Cardio (min)">
            <Input type="number" inputMode="numeric" value={activity.cardioMinutes} onChange={(e) => setActivity({ ...activity, cardioMinutes: e.target.value })} />
          </Field>
        </div>
        <Field label="Tipo de cardio" className="mt-2">
          <Select value={activity.cardioType} onChange={(e) => setActivity({ ...activity, cardioType: e.target.value })}>
            <option value="">Ninguno</option>
            <option value="caminata">Caminata</option>
            <option value="bici">Bicicleta</option>
            <option value="elip">Elíptica</option>
            <option value="correr">Correr</option>
            <option value="natacion">Natación</option>
            <option value="otro">Otro</option>
          </Select>
        </Field>
        <Button onClick={saveActivity} className="w-full mt-3">
          <Save className="w-4 h-4" /> Guardar actividad
        </Button>
      </Card>

      <Card>
        <CardHeader
          title="Suplementos"
          subtitle={`Creatina: objetivo ${formatNumber(creatineTarget, 1)} g/día`}
        />
        <div className={`rounded-xl p-3 text-sm mb-3 flex items-center gap-2 ${creatineBadge(creatineDone)}`}>
          <Zap className="w-4 h-4" />
          {creatineDone ? 'Creatina de hoy tomada ✓' : 'Recuerda tomar tu creatina hoy'}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Creatina (g)">
            <Input type="number" inputMode="decimal" value={supp.creatine} onChange={(e) => setSupp({ ...supp, creatine: e.target.value })} placeholder={`${creatineTarget}`} />
          </Field>
          <Field label="Whey (g proteína)">
            <Input type="number" inputMode="decimal" value={supp.whey} onChange={(e) => setSupp({ ...supp, whey: e.target.value })} />
          </Field>
          <Field label="Calorías de whey">
            <Input type="number" inputMode="numeric" value={supp.wheyCalories} onChange={(e) => setSupp({ ...supp, wheyCalories: e.target.value })} />
          </Field>
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          Cada whey tiene valores distintos. Configura la tuya según la etiqueta; no se asume un valor estándar.
        </p>
        <Button onClick={saveSupplements} className="w-full mt-3">
          <Pill className="w-4 h-4" /> Guardar suplementos
        </Button>
      </Card>
    </div>
  );
}

function creatineBadge(done: boolean) {
  return done
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
}