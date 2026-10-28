// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/AuthContext';

import AdminPanel      from './pages/AdminPanel';
import Matters         from './pages/Matters';
import AppShell        from './layouts/AppShell';
import StaffDashboard  from './pages/Staffdashboard';
import AdminDashboard  from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import Clients from './pages/Clients';
import ClientProfile from './pages/ClientProfile';
import MatterDetail from './pages/MatterDetail';
import Documents from './pages/Documents';
import Calendar    from './pages/Calendar';
import AuditLogs   from './pages/AuditLogs';
import Reports     from './pages/Reports';
import SystemHealth from './pages/SystemHealth';
import MyCases         from './pages/MyCases';
import MyInvoices      from './pages/MyInvoices';
import Billing          from './pages/Billing';
import Help from './pages/Help';

// Auth
import LandingPage     from './pages/LandingPage';
import Login           from './pages/Login';
import Unauthorized    from './pages/Unauthorized';
import ResetPassword   from './pages/ResetPassword';
import ChangePassword  from './pages/ChangePassword';

// Guards
import ProtectedRoute  from './components/auth/ProtectedRoute';
import RoleGuard       from './components/auth/RoleGuard';

// Placeholder pages
const TimeEntries = () => <div>Time Entries</div>;
const Invoices    = () => <div>Invoices</div>;


export default function App() {
  const { user } = useAuth();

  return (
    <Routes>

      {/* ── Fully public ── */}
      <Route path="/Ayiya"          element={<LandingPage />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/unauthorized"   element={<Unauthorized />} />
      <Route path="/login" element={
        user ? <Navigate to="/dashboard" replace /> : <Login />
      } />

      {/* ── All authenticated ── */}
      <Route element={<ProtectedRoute />}>

        {/* Needs auth but no shell */}
        <Route path="/change-password" element={<ChangePassword />} />

        <Route element={<AppShell />}>

          {/* Dashboard — role-based */}
          <Route path="/dashboard" element={
            user?.role === 'Admin'  ? <AdminDashboard />  :
            user?.role === 'Client' ? <ClientDashboard /> :
                                      <StaffDashboard />
          } />

          {/* Admin only */}
          <Route element={<RoleGuard allowedRoles={['Admin']} />}>
            <Route path="/users"      element={<AdminPanel />} />
            <Route path="/admin"      element={<Navigate to="/users" replace />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/system-health" element={<SystemHealth />} />
          </Route>

          {/* Admin + Partner only */}
          <Route element={<RoleGuard allowedRoles={['Admin', 'Partner']} />}>
            <Route path="/billing" element={<Billing />} />
            <Route path="/reports" element={<Reports />} />
          </Route>

          {/* Staff — Admin, Partner, Associate, Paralegal */}
          <Route element={<RoleGuard allowedRoles={['Admin', 'Partner', 'Associate', 'Paralegal']} />}>
            <Route path="/matters"      element={<Matters />} />
            <Route path="/matters/:id"  element={<MatterDetail />} />
            <Route path="/clients"      element={<Clients />} />
            <Route path="/clients/:id"  element={<ClientProfile />} />
            <Route path="/documents"    element={<Documents />} />
            <Route path="/time-entries" element={<TimeEntries />} />
            <Route path="/calendar"     element={<Calendar />} />
            
          </Route>

          {/* Client only */}
          <Route element={<RoleGuard allowedRoles={['Client']} />}>
            <Route path="/my-cases"    element={<MyCases />} />
            <Route path="/my-invoices" element={<MyInvoices />} />
            
          </Route>

          {/* Help — available to every authenticated role */}
          <Route element={<RoleGuard allowedRoles={['Admin', 'Partner', 'Associate', 'Paralegal', 'Client']} />}>
          <Route path="/help" element={<Help />} />
          </Route>

        </Route>
      </Route>

      {/* ── Fallbacks ── */}
      <Route path="/"  element={<Navigate to="/Ayiya" replace />} />
      <Route path="*"  element={<Navigate to="/Ayiya" replace />} />

    </Routes>
  );
}