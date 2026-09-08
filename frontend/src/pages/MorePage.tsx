import { Link } from 'react-router-dom';
import {
  Settings,
  Camera,
  Target,
  Trophy,
  DatabaseBackup,
  Calendar,
  BarChart3,
  Activity,
  Apple,
  ChevronRight,
} from 'lucide-react';
import { Card } from '../components/Card';
import { PageHeader } from '../components/AppLayout';

const items = [
  { to: '/mas/graficas', label: 'Gráficas de análisis', desc: 'Peso, nutrición, actividad y volumen', icon: BarChart3, color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400' },
  { to: '/mas/calendario', label: 'Calendario', desc: 'Cumplimiento por día', icon: Calendar, color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' },
  { to: '/mas/records', label: 'Récords personales', desc: 'Mejores marcas por ejercicio', icon: Trophy, color: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400' },
  { to: '/mas/goals', label: 'Objetivos mensuales', desc: 'Plan de los 6 meses', icon: Target, color: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' },
  { to: '/mas/photos', label: 'Fotografías de progreso', desc: 'Frente, perfil y espalda', icon: Camera, color: 'bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400' },
  { to: '/mas/alimentos', label: 'Base de alimentos', desc: 'Crear y editar alimentos', icon: Apple, color: 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' },
  { to: '/mas/backup', label: 'Respaldo de datos', desc: 'Exportar e importar JSON/CSV', icon: DatabaseBackup, color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' },
  { to: '/mas/stats', label: 'Registro y suplementos', desc: 'Actividad, creatina y whey', icon: Activity, color: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400' },
  { to: '/mas/settings', label: 'Configuración', desc: 'Perfil, objetivos y valores diarios', icon: Settings, color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' },
];

export default function MorePage() {
  return (
    <div className="space-y-4 animate-slide-up">
      <PageHeader title="Más" />
      <div className="space-y-2">
        {items.map((it) => (
          <Link key={it.to} to={it.to}>
            <Card className="flex items-center gap-3 active:scale-[0.98] transition-transform touch-action-manipulation">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${it.color}`}>
                <it.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-white">{it.label}</p>
                <p className="text-xs text-slate-500 truncate">{it.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
