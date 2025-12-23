import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ResponsablesPage from './pages/Responsables';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import A3Page from './pages/A3';
import FiveSPage from './pages/FiveS';
import QuickWinsPage from './pages/QuickWins';
import VSMPage from './pages/VSM';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import ForgotPasswordPage from './pages/ForgotPassword';
import AdminPage from './pages/Admin';
import Auditoria5S from './pages/Auditoria5S';
import ConsultantPage from './pages/ConsultantPage';
import OfflineFiveS from './pages/OfflineFiveS';
import OfflineAudit from './pages/OfflineAudit';
import ResetPasswordPage from './pages/ResetPassword';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
