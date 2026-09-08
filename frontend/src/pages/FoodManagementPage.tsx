import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { api, formatNumber } from '../lib/api';
import type { Food } from '../types';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Field, Input } from '../components/Input';
import { PageHeader } from '../components/AppLayout';
import { useToast } from '../components/Toast';

const emptyForm = { name: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '0' };

export default function FoodManagementPage() {
  const { show } = useToast();
  const [foods, setFoods] = useState<Food[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setFoods(await api.get<Food[]>('/nutrition/foods'));
    } catch (e) {
      show((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (f: Food) => {
    setEditingId(f.id);
    setForm({
      name: f.name,
      kcal: String(f.kcalPer100),
      protein: String(f.proteinPer100),
      carbs: String(f.carbsPer100),
      fat: String(f.fatsPer100),
      fiber: String(f.fiberPer100),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async () => {
    if (!form.name) {
      show('El nombre es obligatorio', 'error');
      return;
    }
    const payload = {
      name: form.name,
      kcalPer100: Number(form.kcal) || 0,
      proteinPer100: Number(form.protein) || 0,
      carbsPer100: Number(form.carbs) || 0,
      fatsPer100: Number(form.fat) || 0,
      fiberPer100: Number(form.fiber) || 0,
      servingUnit: 'g',
    };
    try {
      if (editingId) {
        await api.put(`/nutrition/foods/${editingId}`, payload);
        show('Alimento actualizado');
      } else {
        await api.post('/nutrition/foods', payload);
        show('Alimento creado');
      }
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (e) {
      show((e as Error).message, 'error');
    }
  };

  const remove = async (id: number) => {
    if (!confirm('¿Eliminar este alimento?')) return;
    try {
      await api.delete(`/nutrition/foods/${id}`);
      show('Alimento eliminado');
      load();
    } catch (e) {
      show((e as Error).message, 'error');
    }
  };

  const filtered = foods.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <PageHeader title="Base de alimentos" />
      <p className="text-xs text-slate-500">Valores por 100 g. Puedes crear y editar alimentos propios.</p>

      <Card>
        <CardHeader title={editingId ? 'Editar alimento' : 'Nuevo alimento'} subtitle="Nutrientes por 100 g" />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Nombre" className="col-span-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Pollo a la plancha" />
          </Field>
          <Field label="Calorías (kcal)"><Input type="number" inputMode="decimal" value={form.kcal} onChange={(e) => setForm({ ...form, kcal: e.target.value })} /></Field>
          <Field label="Proteína (g)"><Input type="number" inputMode="decimal" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} /></Field>
          <Field label="Carbohidratos (g)"><Input type="number" inputMode="decimal" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} /></Field>
          <Field label="Grasas (g)"><Input type="number" inputMode="decimal" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} /></Field>
          <Field label="Fibra (g)" className="col-span-2"><Input type="number" inputMode="decimal" value={form.fiber} onChange={(e) => setForm({ ...form, fiber: e.target.value })} /></Field>
        </div>
        <div className="flex gap-2 mt-3">
          <Button onClick={save} className="flex-1">
            <Save className="w-4 h-4" /> {editingId ? 'Actualizar' : 'Crear alimento'}
          </Button>
          {editingId && (
            <Button variant="ghost" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
              <X className="w-4 h-4" /> Cancelar
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title={`Todos los alimentos (${filtered.length})`} />
        <Input placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-3" />
        <div className="space-y-1.5 max-h-[28rem] overflow-y-auto">
          {filtered.map((f) => (
            <div key={f.id} className="flex items-center gap-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{f.name}{!f.isBasic && <span className="text-[10px] text-blue-500 ml-1">propio</span>}</p>
                <p className="text-[11px] text-slate-500">
                  {formatNumber(f.kcalPer100)} kcal · P {formatNumber(f.proteinPer100, 1)} · C {formatNumber(f.carbsPer100, 1)} · G {formatNumber(f.fatsPer100, 1)}
                </p>
              </div>
              <button onClick={() => startEdit(f)} className="text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => remove(f.id)} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Sin resultados</p>}
        </div>
      </Card>
    </div>
  );
}