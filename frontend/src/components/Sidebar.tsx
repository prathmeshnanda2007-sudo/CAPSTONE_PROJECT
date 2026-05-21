import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Key, Settings, Database, Activity, Code2, Users, Map, LogOut, ShieldCheck, ScrollText, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const PLAN_LIMITS: Record<string, string> = {
  Free: '5k',
  Premium: '50k',
  Pro: '300k',
  Unlimited: '1M',
};

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const planType = user?.planType ?? 'Free';
  const planLabel = `${planType} Plan`;
  const planLimit = `${PLAN_LIMITS[planType] ?? '5k'} requests/day`;

  const navItems = [
    { name: 'Overview',         path: '/dashboard',          icon: LayoutDashboard },
    { name: 'Data Explorer',    path: '/dashboard/explorer', icon: Map },
    { name: 'API Keys',         path: '/dashboard/keys',     icon: Key },
    { name: 'Usage & Logs',     path: '/dashboard/logs',     icon: Activity },
    { name: 'API Reference',    path: '/docs',               icon: Code2 },
    { name: 'Live Demo',        path: '/demo',               icon: Sparkles },
    { name: 'Account Settings', path: '/dashboard/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="w-64 glass border-r border-[var(--border)] h-screen sticky top-0 flex flex-col z-20">
      <div className="h-16 flex items-center px-6 border-b border-[var(--border)]">
        <Database className="w-6 h-6 text-primary mr-2" />
        <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tight">
          Village API
        </span>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-3 mt-4">
          Main Menu
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-primary' : 'text-gray-500 group-hover:text-gray-300'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Admin Section — only visible to ADMINs */}
        {user?.role === 'ADMIN' && (
          <div className="mt-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
              Admin
            </div>
            <nav className="space-y-1">
              {[
                { name: 'Admin Dashboard', path: '/admin',        icon: ShieldCheck },
                { name: 'Manage Users',    path: '/admin/users',  icon: Users },
                { name: 'API Logs',        path: '/admin/logs',   icon: ScrollText },
              ].map(item => {
                const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
                return (
                  <Link key={item.name} to={item.path}
                    className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                      isActive ? 'bg-purple-500/10 text-purple-400 font-medium' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`}>
                    <item.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-purple-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        <div className="mt-8 mb-4 border-t border-[var(--border)] pt-6">
          {/* Plan badge */}
          <div className="px-3 py-4 rounded-xl bg-gradient-to-b from-blue-900/20 to-transparent border border-blue-900/30 mb-3">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mr-3">
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-200">{planLabel}</p>
                <p className="text-xs text-gray-400">{planLimit}</p>
              </div>
            </div>
            {user && (
              <p className="text-xs text-gray-500 truncate mt-1" title={user.email}>
                {user.email}
              </p>
            )}
          </div>

          {/* Logout button */}
          <button
            id="sidebar-logout"
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2.5 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group"
          >
            <LogOut className="w-5 h-5 mr-3 text-gray-500 group-hover:text-red-400 transition-colors" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
};
