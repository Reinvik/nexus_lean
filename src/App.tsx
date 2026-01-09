import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OfflineDashboard from './pages/OfflineDashboard';
import OfflineFiveSForm from './components/offline/OfflineFiveSForm';
import OfflineAuditForm from './components/offline/OfflineAuditForm';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Consultor from './pages/Consultor';
import Tarjetas5S from './pages/Tarjetas5S';
import FiveSLogbook from './pages/FiveSLogbook';
import ProyectosA3 from './pages/ProyectosA3';
import VSM from './pages/VSM';
import QuickWins from './pages/QuickWins';
import Responsables from './pages/Responsables';
import UsersPage from './pages/UsersPage';
import CompaniesPage from './pages/CompaniesPage';
import NexusNetwork from './pages/NexusNetwork';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/offline',
    element: <OfflineDashboard />,
  },
  {
    path: '/offline/5s-cards',
    element: <OfflineFiveSForm />,
  },
  {
    path: '/offline/5s-audits',
    element: <OfflineAuditForm />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'consultor',
        element: <Consultor />,
      },
      {
        path: 'tarjetas-5s',
        element: <Tarjetas5S />,
      },
      {
        path: 'auditoria-5s',
        element: <FiveSLogbook />,
      },
      {
        path: 'proyectos-a3',
        element: <ProyectosA3 />,
      },
      {
        path: 'vsm',
        element: <VSM />,
      },
      {
        path: 'quick-wins',
        element: <QuickWins />,
      },
      {
        path: 'responsables',
        element: <Responsables />,
      },
      {
        path: 'admin/users',
        element: <UsersPage />,
      },
      {
        path: 'admin/companies',
        element: <CompaniesPage />,
      },
    ],
  },
  {
    path: '/network',
    element: <NexusNetwork />,
  },
]);

export default function App() {
  return (
    <RouterProvider router={router} />
  );
}
