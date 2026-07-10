import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import Payroll from './pages/Payroll';
import Reports from './pages/Reports';
import Recruitment from './pages/Recruitment';
import Settings from './pages/Settings';
import EmailLogs from './pages/EmailLogs';
import MyProfile from './pages/MyProfile';
import Careers from './pages/Careers';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="employees" element={<Employees />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="leaves" element={<Leaves />} />
        <Route path="payroll" element={<ProtectedRoute roles={['superadmin','admin','hr']}><Payroll /></ProtectedRoute>} />
        <Route path="reports" element={<Reports />} />
        <Route path="recruitment" element={<ProtectedRoute roles={['superadmin','admin','hr']}><Recruitment /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute roles={['superadmin','admin']}><Settings /></ProtectedRoute>} />
        <Route path="emails" element={<ProtectedRoute roles={['superadmin','admin','hr']}><EmailLogs /></ProtectedRoute>} />
        <Route path="my-profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
      </Route>
      {/* Public — no auth */}
      <Route path="/careers" element={<Careers />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
      </SocketProvider>
    </AuthProvider>
  );
}
