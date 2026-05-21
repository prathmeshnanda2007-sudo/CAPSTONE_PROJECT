import { useState, useEffect } from 'react';
import { Activity, Clock, Database, Globe2, TrendingUp, AlertCircle, Zap } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { getDashboardMetrics, getDashboardStats } from '../services/api';
import { useAuthStore } from '../store/authStore';

type Period = '24h' | '7d' | '30d';

const PERIOD_LABELS: Record<Period, string> = {
  '24h': 'Last 24 Hours',
  '7d':  'Last 7 Days',
  '30d': 'Last 30 Days',
};

export const Overview = () => {
  const { user } = useAuthStore();

  const [metrics, setMetrics] = useState<any>(null);
  const [stats,   setStats]   = useState<any>(null);
  const [period,  setPeriod]  = useState<Period>('24h');
  const [loading, setLoading] = useState(true);

  // Fetch base metrics (stat cards)
  useEffect(() => {
    getDashboardMetrics()
      .then(res => { if (res.success) setMetrics(res.data); })
      .catch(() => {});
  }, []);

  // Fetch chart stats whenever period changes
  useEffect(() => {
    setLoading(true);
    getDashboardStats(period)
      .then(res => { if (res.success) setStats(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const chartData = stats?.chartData ?? [];
  const topEndpoints = stats?.topEndpoints ?? [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
            {user?.businessName ? `Welcome, ${user.businessName}` : 'Overview'}
          </h1>
          <p className="text-gray-400 text-sm">Monitor your API usage and performance metrics.</p>
        </div>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value as Period)}
          className="bg-[var(--card)] border border-[var(--border)] text-gray-300 text-sm rounded-lg focus:ring-primary focus:border-primary block p-2 cursor-pointer"
        >
          {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 stagger-1">
        {[
          {
            label: 'Total Requests',
            value: metrics ? metrics.totalRequests.toLocaleString() : '—',
            sub:   `${metrics?.todayRequests ?? 0} today`,
            icon: Activity,
            color: 'text-blue-400',
            bg:    'bg-blue-400/10',
          },
          {
            label: 'Active API Keys',
            value: metrics ? String(metrics.activeKeys) : '—',
            sub:   'Create more in API Keys',
            icon: Clock,
            color: 'text-emerald-400',
            bg:    'bg-emerald-400/10',
          },
          {
            label: 'Daily Limit',
            value: metrics ? metrics.dailyLimit.toLocaleString() : '—',
            sub:   `${metrics?.usagePercent ?? 0}% used today`,
            icon: Database,
            color: 'text-purple-400',
            bg:    'bg-purple-400/10',
          },
          {
            label: 'Current Plan',
            value: user?.planType ?? 'Free',
            sub:   stats ? `${stats.avgLatency}ms avg latency` : '—',
            icon: Globe2,
            color: 'text-amber-400',
            bg:    'bg-amber-400/10',
          },
        ].map((stat, i) => (
          <div key={i} className="glass-card rounded-xl p-5 hover:-translate-y-1 transition-transform duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
            <p className="text-sm text-gray-400">{stat.label}</p>
            <p className="text-xs text-gray-600 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Usage meter ──────────────────────────────────────────────────── */}
      {metrics && metrics.dailyLimit > 0 && (
        <div className="glass-card rounded-xl p-4 mb-6 flex items-center gap-4">
          <Zap className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>{metrics.todayRequests.toLocaleString()} used today</span>
              <span>{metrics.dailyLimit.toLocaleString()} limit</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${
                  metrics.usagePercent > 80 ? 'bg-red-500' :
                  metrics.usagePercent > 50 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(metrics.usagePercent, 100)}%` }}
              />
            </div>
          </div>
          <span className={`text-sm font-semibold shrink-0 ${
            metrics.usagePercent > 80 ? 'text-red-400' : 'text-gray-300'
          }`}>{metrics.usagePercent}%</span>
        </div>
      )}

      {/* ── Charts row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 stagger-2">

        {/* Traffic area chart */}
        <div className="lg:col-span-2 glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">API Traffic</h3>
            {stats && (
              <div className="flex gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                  Requests
                </span>
                {stats.errorRate > 0 && (
                  <span className="flex items-center gap-1 text-red-400">
                    <AlertCircle className="w-3 h-3" />
                    {stats.errorRate}% errors
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : chartData.length === 0 || chartData.every((d: any) => d.requests === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <TrendingUp className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">No requests yet in this period.</p>
                <p className="text-xs mt-1">Make a geo API call to see traffic appear here.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="#94a3b8" fontSize={11}
                    tickLine={false} axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area
                    type="monotone" dataKey="requests"
                    stroke="#38bdf8" strokeWidth={2}
                    fillOpacity={1} fill="url(#colorRequests)"
                    name="Requests"
                  />
                  {chartData.some((d: any) => d.errors > 0) && (
                    <Area
                      type="monotone" dataKey="errors"
                      stroke="#ef4444" strokeWidth={1.5}
                      fillOpacity={1} fill="url(#colorErrors)"
                      name="Errors"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top endpoints */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Top Endpoints</h3>
          <div className="space-y-4">
            {topEndpoints.length === 0 ? (
              <p className="text-gray-500 text-sm text-center mt-8">No endpoint data yet.</p>
            ) : topEndpoints.map((ep: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-1.5">
                  <span
                    className="text-xs font-medium text-gray-300 truncate max-w-[170px]"
                    title={ep.path}
                  >
                    {ep.path || '(unknown)'}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">{ep.count}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${ep.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent API logs ───────────────────────────────────────────────── */}
      {metrics?.recentLogs?.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden stagger-3">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h3 className="text-lg font-semibold text-white">Recent Requests</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {['Method', 'Endpoint', 'Status', 'Response Time', 'Time'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-gray-500 uppercase tracking-wider font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {metrics.recentLogs.map((log: any) => (
                <tr key={log.id} className="hover:bg-white/[0.02] font-mono transition-colors">
                  <td className="px-4 py-2.5 text-gray-400">{log.method}</td>
                  <td className="px-4 py-2.5 text-gray-300 truncate max-w-xs" title={log.endpoint}>
                    {log.endpoint?.replace('/v1', '') || '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                      log.statusCode < 300 ? 'text-emerald-400' :
                      log.statusCode < 400 ? 'text-blue-400' :
                      log.statusCode < 500 ? 'text-amber-400' : 'text-red-400'
                    }`}>{log.statusCode}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">{log.responseTime}ms</td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
