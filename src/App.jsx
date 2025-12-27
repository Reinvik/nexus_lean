import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';

// Layouts
const MainLayout = lazy(() => import('./layouts/MainLayout'));

// Pages (Lazy Loaded)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ResponsablesPage = lazy(() => import('./pages/Responsables'));
const A3Page = lazy(() => import('./pages/A3'));
const FiveSPage = lazy(() => import('./pages/FiveS'));
const QuickWinsPage = lazy(() => import('./pages/QuickWins'));
const VSMPage = lazy(() => import('./pages/VSM'));
const AdminPage = lazy(() => import('./pages/Admin'));
const Auditoria5S = lazy(() => import('./pages/Auditoria5S'));
const ConsultantPage = lazy(() => import('./pages/ConsultantPage'));

// Auth Pages (Keep some eager if needed, but lazy is fine)
const LoginPage = lazy(() => import('./pages/Login'));
const RegisterPage = lazy(() => import('./pages/Register'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPassword'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPassword'));

// Offline Pages
const OfflineFiveS = lazy(() => import('./pages/OfflineFiveS'));
const OfflineAudit = lazy(() => import('./pages/OfflineAudit'));

const LoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
      <p className="text-sm font-medium text-slate-500 animate-pulse">Cargando...</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/offline-access" element={<OfflineFiveS />} />
              <Route path="/offline-audit" element={<OfflineAudit />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="consultant" element={<ConsultantPage />} />
                  <Route path="a3" element={<A3Page />} />
                  <Route path="5s" element={<FiveSPage />} />
                  <Route path="auditorias-5s" element={<Auditoria5S />} />
                  <Route path="quick-wins" element={<QuickWinsPage />} />
                  <Route path="vsm" element={<VSMPage />} />
                  <Route path="responsables" element={<ResponsablesPage />} />
                  <Route path="admin" element={<AdminPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
