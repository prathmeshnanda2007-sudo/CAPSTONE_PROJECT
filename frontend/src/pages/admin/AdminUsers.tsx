import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Shield, ChevronDown } from 'lucide-react';
import { listAdminUsers, approveUser, suspendUser, changePlan, changeRole } from '../../services/adminApi';
import { Link } from 'react-router-dom';

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  PENDING_APPROVAL: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  SUSPENDED: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const PLAN_BADGE: Record<string, string> = {
  Free: 'bg-gray-500/15 text-gray-400',
  Premium: 'bg-blue-500/15 text-blue-400',
  Pro: 'bg-indigo-500/15 text-indigo-400',
  Unlimited: 'bg-emerald-500/15 text-emerald-400',
};

const PLANS = ['Free', 'Premium', 'Pro', 'Unlimited'];

export const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdminUsers({ page, limit, search: search || undefined, status: statusFilter || undefined, plan: planFilter || undefined });
      setUsers(res.data);
      setTotal(res.meta?.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, planFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAction = async (id: string, action: () => Promise<any>) => {
    setActionLoading(id);
    try { await action(); await fetchUsers(); }
    catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Users</h1>
          <p className="text-gray-400 text-sm mt-1">{total.toLocaleString()} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search email or business…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-[var(--input)] border border-[var(--border)] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-[var(--input)] border border-[var(--border)] rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING_APPROVAL">Pending</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-[var(--input)] border border-[var(--border)] rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50">
          <option value="">All Plans</option>
          {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {['Business', 'Email', 'Plan', 'Status', 'Role', 'Keys', 'Requests', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">No users found</td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/admin/users/${user.id}`} className="font-medium text-gray-200 hover:text-primary transition-colors">
                      {user.businessName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{user.email}</td>
                  <td className="px-4 py-3">
                    <div className="relative group/plan">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium cursor-pointer flex items-center gap-1 w-fit ${PLAN_BADGE[user.planType] ?? ''}`}>
                        {user.planType} <ChevronDown className="w-3 h-3" />
                      </span>
                      <div className="absolute left-0 top-7 hidden group-hover/plan:block z-10 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl py-1 min-w-28">
                        {PLANS.map(p => (
                          <button key={p} onClick={() => handleAction(user.id, () => changePlan(user.id, p))}
                            className="block w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-primary/10 hover:text-primary transition-colors">
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_BADGE[user.status] ?? 'bg-gray-500/10 text-gray-400'}`}>
                      {user.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${user.role === 'ADMIN' ? 'bg-purple-500/15 text-purple-400' : 'bg-gray-500/10 text-gray-400'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{user._count?.apiKeys ?? 0}</td>
                  <td className="px-4 py-3 text-gray-300">{(user._count?.apiLogs ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {user.status !== 'ACTIVE' && (
                        <button disabled={actionLoading === user.id} title="Approve / Reactivate"
                          onClick={() => handleAction(user.id, () => approveUser(user.id))}
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {user.status === 'ACTIVE' && (
                        <button disabled={actionLoading === user.id} title="Suspend"
                          onClick={() => handleAction(user.id, () => suspendUser(user.id))}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50">
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button disabled={actionLoading === user.id} title={user.role === 'ADMIN' ? 'Demote to User' : 'Promote to Admin'}
                        onClick={() => handleAction(user.id, () => changeRole(user.id, user.role === 'ADMIN' ? 'USER' : 'ADMIN'))}
                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${user.role === 'ADMIN' ? 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20' : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'}`}>
                        <Shield className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
            <span className="text-xs text-gray-400">Page {page} of {totalPages} · {total} users</span>
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
