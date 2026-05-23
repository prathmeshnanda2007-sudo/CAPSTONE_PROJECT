import { Activity, Clock, Server, CheckCircle2, XCircle } from 'lucide-react';

export const Logs = () => {
  // Mock data for API logs
  const mockLogs = [
    { id: 'req_1', endpoint: '/v1/villages', method: 'GET', status: 200, latency: 45, time: '2 mins ago' },
    { id: 'req_2', endpoint: '/v1/auth/verify', method: 'POST', status: 200, latency: 120, time: '15 mins ago' },
    { id: 'req_3', endpoint: '/v1/districts', method: 'GET', status: 200, latency: 38, time: '1 hour ago' },
    { id: 'req_4', endpoint: '/v1/villages/search', method: 'GET', status: 404, latency: 15, time: '2 hours ago' },
    { id: 'req_5', endpoint: '/v1/states', method: 'GET', status: 200, latency: 22, time: '3 hours ago' },
  ];

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1 flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            Usage & Logs
          </h1>
          <p className="text-gray-400 text-sm">
            Monitor your API consumption, request history, and latency metrics in real-time.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 stagger-1">
        <div className="glass-card p-6 rounded-xl border border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Total Requests (24h)</h3>
            <Server className="w-4 h-4 text-primary" />
          </div>
          <p className="text-3xl font-bold text-white">12,450</p>
          <p className="text-xs text-emerald-400 mt-2">↑ 14% vs yesterday</p>
        </div>
        
        <div className="glass-card p-6 rounded-xl border border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Average Latency</h3>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-white">48ms</p>
          <p className="text-xs text-emerald-400 mt-2">↓ 2ms vs yesterday</p>
        </div>

        <div className="glass-card p-6 rounded-xl border border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Error Rate</h3>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-3xl font-bold text-white">0.05%</p>
          <p className="text-xs text-gray-500 mt-2">Healthy status</p>
        </div>
      </div>

      <div className="glass-card rounded-xl border border-[var(--border)] overflow-hidden stagger-2">
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-white/5">
          <h2 className="text-lg font-semibold text-white">Recent Requests</h2>
        </div>
        
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-black/20">
                <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Method</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Endpoint</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Latency</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {mockLogs.map((log) => (
                <tr key={log.id} className="border-b border-[var(--border)] hover:bg-white/5 transition-colors">
                  <td className="py-4 px-6">
                    {log.status === 200 ? (
                      <div className="flex items-center text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        <span className="text-sm">200 OK</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-rose-400">
                        <XCircle className="w-4 h-4 mr-2" />
                        <span className="text-sm">{log.status} Error</span>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <code className="bg-black/30 px-2 py-1 rounded text-gray-300 font-mono text-sm border border-[var(--border)]">
                      {log.method}
                    </code>
                  </td>
                  <td className="py-4 px-6 font-mono text-sm text-gray-300">
                    {log.endpoint}
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-400">
                    {log.latency}ms
                  </td>
                  <td className="py-4 px-6 text-right text-sm text-gray-500">
                    {log.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
