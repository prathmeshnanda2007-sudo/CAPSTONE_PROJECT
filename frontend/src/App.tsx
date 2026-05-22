import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Overview } from './pages/Overview';
import { ApiKeys } from './pages/ApiKeys';
import { Docs } from './pages/Docs';
import { DataExplorer } from './pages/DataExplorer';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Demo } from './pages/Demo';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminLogs } from './pages/admin/AdminLogs';
import { Landing } from './pages/Landing';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* ─── Public Landing & Demo ───────────────────────────────── */}
          <Route path="/" element={<Landing />} />
          <Route path="/demo" element={<Demo />} />

          {/* ─── Public Auth ──────────────────────────────────────────── */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ─── Protected Dashboard ──────────────────────────────────── */}
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardLayout /></ProtectedRoute>
          }>
            <Route index          element={<Overview />} />
            <Route path="explorer" element={<DataExplorer />} />
            <Route path="keys"    element={<ApiKeys />} />
            <Route path="logs"    element={<div className="p-8 text-white">Logs coming soon…</div>} />
            <Route path="settings" element={<div className="p-8 text-white">Settings coming soon…</div>} />
          </Route>

          {/* ─── Protected Docs ───────────────────────────────────────── */}
          <Route path="/docs" element={
            <ProtectedRoute><DashboardLayout /></ProtectedRoute>
          }>
            <Route index element={<Docs />} />
          </Route>

          {/* ─── Admin Panel (ADMIN role required) ────────────────────── */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="ADMIN"><DashboardLayout /></ProtectedRoute>
          }>
            <Route index        element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="logs"  element={<AdminLogs />} />
          </Route>

          <Route path="*" element={
            <div className="min-h-screen bg-[var(--background)] text-white flex items-center justify-center text-2xl font-bold">
               404 Not Found
            </div>
          } />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
