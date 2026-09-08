import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import {
  Home,
  Dumbbell,
  Utensils,
  TrendingUp,
  MoreHorizontal,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { cn } from '../lib/cn';

const navItems = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/entrenamiento', label: 'Entreno', icon: Dumbbell },
  { to: '/nutricion', label: 'Nutrición', icon: Utensils },
  { to: '/progreso', label: 'Progreso', icon: TrendingUp },
  { to: '/mas', label: 'Más', icon: MoreHorizontal },
];

export function AppLayout() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 sticky top-0 h-screen p-4">
        <div className="flex items-center gap-2 mb-8 px-2">
          <span className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">F</span>
          <div>
            <p className="font-bold text-slate-900 dark:text-white leading-tight">Mi Fitness 180</p>
            <p className="text-[11px] text-slate-500">Recomposición corporal</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 pb-24 md:pb-8 px-4 md:px-8 py-4 md:py-6 max-w-3xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav - optimized for touch */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 md:hidden safe-bottom-nav">
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 touch-active',
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 active:text-slate-700 dark:active:text-slate-200'
                )
              }
            >
              <item.icon className="w-6 h-6" strokeWidth={2} />
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
      {action}
    </div>
  );
}

export { Link };
