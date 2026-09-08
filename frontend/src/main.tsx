import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ToastProvider } from './components/Toast';
import './index.css';

// Lazy-loaded pages for code splitting
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const WorkoutPage = React.lazy(() => import('./pages/WorkoutPage'));
const WorkoutTodayPage = React.lazy(() => import('./pages/WorkoutTodayPage'));
const NutritionPage = React.lazy(() => import('./pages/NutritionPage'));
const BodyProgressPage = React.lazy(() => import('./pages/BodyProgressPage'));
const MorePage = React.lazy(() => import('./pages/MorePage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const PhotosPage = React.lazy(() => import('./pages/PhotosPage'));
const GoalsPage = React.lazy(() => import('./pages/GoalsPage'));
const RecordsPage = React.lazy(() => import('./pages/RecordsPage'));
const BackupPage = React.lazy(() => import('./pages/BackupPage'));
const CalendarPage = React.lazy(() => import('./pages/CalendarPage'));
const ChartsPage = React.lazy(() => import('./pages/ChartsPage'));
const StatsPage = React.lazy(() => import('./pages/StatsPage'));
const FoodManagementPage = React.lazy(() => import('./pages/FoodManagementPage'));

// Loading fallback for lazy routes
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Cargando…</p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <React.Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/entrenamiento" element={<WorkoutPage />} />
              <Route path="/entrenamiento/hoy" element={<WorkoutTodayPage />} />
              <Route path="/nutricion" element={<NutritionPage />} />
              <Route path="/progreso" element={<BodyProgressPage />} />
              <Route path="/mas" element={<MorePage />} />
              <Route path="/mas/settings" element={<SettingsPage />} />
              <Route path="/mas/photos" element={<PhotosPage />} />
              <Route path="/mas/goals" element={<GoalsPage />} />
              <Route path="/mas/records" element={<RecordsPage />} />
              <Route path="/mas/backup" element={<BackupPage />} />
              <Route path="/mas/calendario" element={<CalendarPage />} />
              <Route path="/mas/graficas" element={<ChartsPage />} />
              <Route path="/mas/stats" element={<StatsPage />} />
              <Route path="/mas/alimentos" element={<FoodManagementPage />} />
            </Route>
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </ToastProvider>
  </React.StrictMode>
);
