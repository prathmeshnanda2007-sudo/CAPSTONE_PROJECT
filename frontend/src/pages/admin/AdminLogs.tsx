import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAdminLogs } from '../../services/adminApi';

const STATUS_COLOR: Record<string, string> = {
  '200': 'text-emerald-400', '201': 'text-emerald-400',
  '400': 'text-amber-400',  '401': 'text-amber-400',
  '403': 'text-orange-400', '404': 'text-orange-400',
  '429': 'text-red-400',    '500': 'text-red-400',
};

export const AdminLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [endpointFilter, setEndpointFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminLogs({
        page, limit,
        endpoint: endpointFilter || undefined,
        status:   statusFilter   || undefined,
      });
      setLogs(res.data);
      setTotal(res.meta?.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, endpointFilter, statusFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">API Logs</h1>
        <p className="text-gray-400 text-sm mt-1">{total.toLocaleString()} total log entries</p>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Filter by endpoint…" value={endpointFilter}
            onChange={e => { setEndpointFilter(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-[var(--input)] border border-[var(--border)] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-[var(--input)] border border-[var(--border)] rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50">
          <option value="">All Status Codes</option>
          <option value="200">200 OK</option>
          <option value="400">400 Bad Request</option>
          <option value="401">401 Unauthorized</option>
          <option value="403">403 Forbidden</option>
          <option value="404">404 Not Found</option>
          <option value="429">429 Rate Limited</option>
          <option value="500">500 Server Error</option>
        </select>
      </div>

      {/* Log Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {['Time', 'Method', 'Endpoint', 'Status', 'Resp Time', 'IP', 'User', 'API Key'].map(h => (
                  <th key={h} className="text-left font-semibold text-gray-400 uppercase tracking-wider px-3 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-500">No logs found</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-white/[0.02] font-mono transition-colors">
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="px-3 py-2 text-gray-300">{log.method}</td>
                  <td className="px-3 py-2 text-gray-300 max-w-xs truncate" title={log.endpoint}>
                    {log.endpoint}
                  </td>
                  <td className={`px-3 py-2 font-semibold ${STATUS_COLOR[String(log.statusCode)] ?? 'text-gray-300'}`}>
                    {log.statusCode}
                  </td>
                  <td className="px-3 py-2 text-gray-400">{log.responseTime}ms</td>
                  <td className="px-3 py-2 text-gray-500">{log.ipAddress ? log.ipAddress.replace('::1', 'localhost') : '—'}</td>
                  <td className="px-3 py-2 text-gray-400 max-w-[120px] truncate" title={log.user?.email}>
                    {log.user?.businessName ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{log.apiKey?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
            <span className="text-xs text-gray-400">Page {page} of {totalPages} · {total.toLocaleString()} entries</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="p-2 rounded-lg bg-[var(--input)] border border-[var(--border)] text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-lg bg-[var(--input)] border border-[var(--border)] text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
