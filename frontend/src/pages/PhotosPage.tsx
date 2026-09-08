import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { api, todayISO } from '../lib/api';
import type { ProgressPhoto } from '../types';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Input, Select, Field } from '../components/Input';
import { PageHeader } from '../components/AppLayout';
import { useToast } from '../components/Toast';

const TYPES = ['Frente', 'Perfil', 'Espalda'];

export default function PhotosPage() {
  const { show } = useToast();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('Frente');
  const [date, setDate] = useState(todayISO());
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ photos: ProgressPhoto[]; count: number }>('/photos');
      setPhotos(res.photos);
    } catch (e) {
      show((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      show('La imagen supera 4 MB. Comprímela antes.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        await api.post('/photos', { date, photoType: type, dataUrl });
        show('Foto guardada');
        load();
      } catch (err) {
        show((err as Error).message, 'error');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const remove = async (id: number) => {
    if (!confirm('¿Eliminar esta foto?')) return;
    try {
      await api.delete(`/photos/${id}`);
      show('Foto eliminada');
      load();
    } catch (e) {
      show((e as Error).message, 'error');
    }
  };

  const grouped = TYPES.map((t) => ({
    type: t,
    items: photos.filter((p) => p.photoType === t).sort((a, b) => a.date.localeCompare(b.date)),
  }));

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

  return (
    <div className="space-y-4 animate-slide-up">
      <PageHeader title="Fotografías de progreso" />
      <p className="text-xs text-slate-500">Las fotos se guardan solo en tu dispositivo/base de datos local.</p>

      <Card>
        <CardHeader title="Nueva foto" subtitle="Misma ropa y posición cada vez" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        <Button onClick={() => fileRef.current?.click()} className="w-full mt-4 py-4">
          <Camera className="w-5 h-5" /> Tomar / subir foto
        </Button>
      </Card>

      {grouped.map((g) => (
        <Card key={g.type}>
          <CardHeader title={g.type} subtitle={`${g.items.length} fotos`} />
          {g.items.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">Sin fotos aún</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {g.items.map((p) => (
                <div key={p.id} className="relative group rounded-xl overflow-hidden">
                  <img src={p.dataUrl} alt={g.type} className="w-full aspect-[3/4] object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] px-2 py-2">
                    <p>{p.date.slice(0, 10)}</p>
                  </div>
                  <button
                    onClick={() => remove(p.id)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center active:bg-black/70"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
