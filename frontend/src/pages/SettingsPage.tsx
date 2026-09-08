import { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api } from '../lib/api';
import type { UserProfile } from '../types';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Field, Input, Select } from '../components/Input';
import { PageHeader } from '../components/AppLayout';
import { useToast } from '../components/Toast';

export default function SettingsPage() {
  const { show } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const p = await api.get<UserProfile>('/users/profile');
    setProfile(p);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = (field: keyof UserProfile, value: unknown) => {
    setProfile((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await api.put('/users/profile', {
        sex: profile.sex,
        age: Number(profile.age),
        heightCm: Number(profile.heightCm),
        initialWeightKg: Number(profile.initialWeightKg),
        activityLevel: profile.activityLevel,
        trainingLevel: profile.trainingLevel,
        primaryGoal: profile.primaryGoal,
        startDate: profile.startDate,
        calorieTarget: Number(profile.calorieTarget),
        proteinTarget: Number(profile.proteinTarget),
        fatMinTarget: Number(profile.fatMinTarget),
        fatMaxTarget: Number(profile.fatMaxTarget),
        waterTargetMl: Number(profile.waterTargetMl),
        stepsTarget: Number(profile.stepsTarget),
        fiberTarget: Number(profile.fiberTarget),
        creatineTargetG: Number(profile.creatineTargetG),
      });
      show('Configuración guardada');
    } catch (e) {
      show((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Cargando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up pb-24">
      <PageHeader title="Configuración" />
      <div className="text-xs text-slate-500 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
        Estos valores son objetivos personales de referencia, no una prescripción médica.
      </div>

      <Card>
        <CardHeader title="Perfil base" />
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sexo">
              <Select value={profile.sex} onChange={(e) => update('sex', e.target.value)}>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </Select>
            </Field>
            <Field label="Edad">
              <Input type="number" inputMode="numeric" value={profile.age} onChange={(e) => update('age', e.target.value)} />
            </Field>
            <Field label="Estatura (cm)">
              <Input type="number" inputMode="decimal" value={profile.heightCm} onChange={(e) => update('heightCm', e.target.value)} />
            </Field>
            <Field label="Peso inicial (kg)">
              <Input type="number" inputMode="decimal" value={profile.initialWeightKg} onChange={(e) => update('initialWeightKg', e.target.value)} />
            </Field>
          </div>
          <Field label="Actividad diaria">
            <Select value={profile.activityLevel} onChange={(e) => update('activityLevel', e.target.value)}>
              <option value="sedentaria">Sedentaria</option>
              <option value="ligera">Ligera</option>
              <option value="moderada">Moderada</option>
              <option value="activa">Activa</option>
            </Select>
          </Field>
          <Field label="Nivel de entrenamiento">
            <Select value={profile.trainingLevel} onChange={(e) => update('trainingLevel', e.target.value)}>
              <option value="bajo">Bajo</option>
              <option value="moderado">Moderado</option>
              <option value="alto">Alto</option>
            </Select>
          </Field>
          <Field label="Objetivo principal">
            <Input value={profile.primaryGoal} onChange={(e) => update('primaryGoal', e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Programa" subtitle="Ajusta la fecha de inicio del programa de 180 días" />
        <div className="space-y-3">
          <Field label="Fecha de inicio del programa">
            <Input
              type="date"
              value={profile.startDate ? profile.startDate.slice(0, 10) : ''}
              onChange={(e) => update('startDate', e.target.value)}
            />
          </Field>
          <p className="text-[10px] text-slate-500">
            Cambia esta fecha para corregir el conteo de días del programa. El día 1 es el día de inicio.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Objetivos diarios" subtitle="Duración del programa: 180 días" />
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Calorías (kcal)">
              <Input type="number" inputMode="numeric" value={profile.calorieTarget} onChange={(e) => update('calorieTarget', e.target.value)} />
            </Field>
            <Field label="Proteína (g)">
              <Input type="number" inputMode="numeric" value={profile.proteinTarget} onChange={(e) => update('proteinTarget', e.target.value)} />
            </Field>
            <Field label="Grasas mín (g)">
              <Input type="number" inputMode="numeric" value={profile.fatMinTarget} onChange={(e) => update('fatMinTarget', e.target.value)} />
            </Field>
            <Field label="Grasas máx (g)">
              <Input type="number" inputMode="numeric" value={profile.fatMaxTarget} onChange={(e) => update('fatMaxTarget', e.target.value)} />
            </Field>
            <Field label="Agua (ml)">
              <Input type="number" inputMode="numeric" value={profile.waterTargetMl} onChange={(e) => update('waterTargetMl', e.target.value)} />
            </Field>
            <Field label="Fibra (g)">
              <Input type="number" inputMode="numeric" value={profile.fiberTarget} onChange={(e) => update('fiberTarget', e.target.value)} />
            </Field>
            <Field label="Pasos/día">
              <Input type="number" inputMode="numeric" value={profile.stepsTarget} onChange={(e) => update('stepsTarget', e.target.value)} />
            </Field>
            <Field label="Creatina (g/día)">
              <Input type="number" inputMode="numeric" value={profile.creatineTargetG} onChange={(e) => update('creatineTargetG', e.target.value)} />
            </Field>
          </div>
          <p className="text-[10px] text-slate-500">
            Los carbohidratos se calculan automáticamente según las calorías restantes.
          </p>
        </div>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full py-4">
        <Save className="w-5 h-5" /> Guardar configuración
      </Button>
    </div>
  );
}
