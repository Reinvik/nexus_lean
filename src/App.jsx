import { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import ProtectedRoute from './components/ProtectedRoute';
import RecoveryRedirect from './components/RecoveryRedirect';
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
const SetPasswordPage = lazy(() => import('./pages/SetPassword'));

// Offline Pages
const OfflineFiveS = lazy(() => import('./pages/OfflineFiveS'));
const OfflineAudit = lazy(() => import('./pages/OfflineAudit'));

const LOADING_PHRASES = [
  "Iniciando Sistema Nexus...",
  "Conectando con el Gemba...",
  "Cargando módulos de IA...",
  "Estableciendo protocolos seguros...",
  "Optimizando recursos...",
  "Sincronizando estándares..."
];

const LoadingFallback = () => {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#050B14]">
      <div className="flex flex-col items-center gap-8">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse"></div>
          <img src="/nexus-logo.svg" alt="Nexus Lean" className="h-[120px] w-[120px] relative drop-shadow-2xl animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-500"></div>
            <div className="absolute inset-0 h-10 w-10 animate-spin rounded-full border-4 border-transparent border-b-blue-500 opacity-50" style={{ animationDirection: 'reverse', animationDuration: '2s' }}></div>
          </div>
          <p className="text-sm font-medium text-cyan-500/80 tracking-widest uppercase animate-pulse">
            {LOADING_PHRASES[phraseIndex]}
          </p>
        </div>
      </div>
    </div>
  );
};

function App() {
  // Handle splash screen removal
  useEffect(() => {
    const splash = document.getElementById('splash-overlay');
    if (splash) {
      // Small delay to ensure React has rendered the first frame
      setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => {
          splash.remove();
        }, 500);
      }, 100);
    }
  }, []);

  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <RecoveryRedirect />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/set-password" element={<SetPasswordPage />} />
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
