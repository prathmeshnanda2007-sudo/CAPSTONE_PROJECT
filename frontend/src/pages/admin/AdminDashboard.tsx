import { useState, useEffect } from 'react';
import { Users, Key, Activity, TrendingUp, AlertTriangle, CheckCircle, Clock, Trash2 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { getAdminStats, flushCache } from '../../services/adminApi';
import { Link } from 'react-router-dom';

const PLAN_COLORS: Record<string, string> = {
  Free: '#94a3b8', Premium: '#38bdf8', Pro: '#818cf8', Unlimited: '#34d399',
};

export const AdminDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [flushing, setFlushing] = useState(false);
  const [flushMsg, setFlushMsg] = useState('');

  useEffect(() => {
    getAdminStats()
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleFlushCache = async () => {
    setFlushing(true);
    try {
      await flushCache();
      setFlushMsg('Cache flushed ✓');
      setTimeout(() => setFlushMsg(''), 3000);
    } catch { setFlushMsg('Failed to flush'); }
    finally { setFlushing(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const statCards = [
    { label: 'Total Users',    value: stats?.users?.total ?? 0,   icon: Users,    color: 'text-blue-400',   bg: 'bg-blue-400/10' },
    { label: 'Active Users',   value: stats?.users?.active ?? 0,  icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Pending Approval', value: stats?.users?.pending ?? 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'API Keys Active', value: stats?.keys?.active ?? 0,  icon: Key,      color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: "Today's Requests", value: stats?.requests?.today ?? 0, icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { label: 'Total Requests', value: stats?.requests?.total ?? 0, icon: TrendingUp, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Admin Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Platform-wide metrics and management</p>
        </div>
        <button
          onClick={handleFlushCache}
          disabled={flushing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          {flushing ? 'Flushing…' : flushMsg || 'Flush Cache'}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="glass-card rounded-xl p-5 hover:-translate-y-1 transition-transform duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{card.value.toLocaleString()}</p>
            <p className="text-sm text-gray-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Pending Approval Alert */}
      {stats?.users?.pending > 0 && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-3 rounded-lg">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm">
            <strong>{stats.users.pending}</strong> user{stats.users.pending > 1 ? 's' : ''} pending approval.{' '}
            <Link to="/admin/users?status=PENDING_APPROVAL" className="underline hover:text-amber-300">Review now →</Link>
          </span>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Requests Area Chart */}
        <div className="lg:col-span-2 glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Daily API Requests (7 days)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.dailyRequests ?? []}>
                <defs>
                  <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={v => v.slice(5)} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }} />
                <Area type="monotone" dataKey="total"  stroke="#38bdf8" strokeWidth={2} fill="url(#reqGrad)" name="Total" />
                <Area type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} fill="url(#errGrad)" name="Errors" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan Distribution Pie */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Users by Plan</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.planBreakdown ?? []}
                  dataKey="count"
                  nameKey="plan"
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  paddingAngle={3}
                >
                  {(stats?.planBreakdown ?? []).map((entry: any) => (
                    <Cell key={entry.plan} fill={PLAN_COLORS[entry.plan] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
                <Legend formatter={(v) => <span className="text-gray-300 text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Endpoints Bar Chart */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Top 5 Endpoints by Usage</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.topEndpoints ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="endpoint" stroke="#94a3b8" fontSize={10} tickLine={false}
                axisLine={false} width={180} tickFormatter={v => v.replace('/v1/geo/', '/')} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ color: '#e2e8f0' }} />
              <Bar dataKey="count" fill="#818cf8" radius={[0, 4, 4, 0]} name="Calls" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
