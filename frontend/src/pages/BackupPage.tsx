import { useState } from 'react';
import { Download, Upload, FileDown } from 'lucide-react';
import { api } from '../lib/api';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader } from '../components/AppLayout';
import { useToast } from '../components/Toast';

export default function BackupPage() {
  const { show } = useToast();
  const [importing, setImporting] = useState(false);

  const exportJson = async () => {
    try {
      const data = await api.get<any>('/backup/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mi-fitness-180-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      show('Respaldo JSON exportado');
    } catch (e) {
      show((e as Error).message, 'error');
    }
  };

  const exportCsv = async () => {
    try {
      const res = await fetch('/api/backup/weights.csv');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'peso.csv';
      a.click();
      URL.revokeObjectURL(url);
      show('CSV de peso exportado');
    } catch (e) {
      show((e as Error).message, 'error');
    }
  };

  const importJson = async (file: File) => {
    if (!confirm('El respaldo reemplazará los registros existentes cuando haya coincidencias. ¿Continuar?')) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await api.post<any>('/backup/import', data);
      const total = Object.values(res.imported).reduce((s: number, n: any) => s + (n as number), 0);
      show(`Respaldo importado: ${total} registros`);
    } catch (e) {
      show(`No se pudo importar: ${(e as Error).message}`, 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Respaldo de datos" />
      <div className="text-xs text-slate-500 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
        Tus datos son personales. Exporta respaldos con frecuencia y guárdalos fuera de este dispositivo.
      </div>

      <Card>
        <CardHeader title="Exportar" subtitle="Guarda una copia completa de tus datos" />
        <div className="flex flex-col gap-2">
          <Button onClick={exportJson}>
            <Download className="w-4 h-4" /> Exportar JSON (respaldo completo)
          </Button>
          <Button variant="secondary" onClick={exportCsv}>
            <FileDown className="w-4 h-4" /> Exportar CSV (peso)
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Importar respaldo" subtitle="Restaura desde un archivo JSON" />
        <label className="block">
          <input
            type="file"
            accept=".json,application/json"
            className="hidden"
            disabled={importing}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importJson(file);
              e.target.value = '';
            }}
          />
          <Button variant="secondary" disabled={importing} className="w-full">
            <Upload className="w-4 h-4" /> {importing ? 'Importando…' : 'Seleccionar archivo JSON'}
          </Button>
        </label>
      </Card>
    </div>
  );
}