import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users, BarChart2, ClipboardList, Database,
  Shield, ShieldCheck, ShieldOff, RefreshCw,
  ArrowLeft, TrendingUp, MessageSquare, Clock,
  TicketCheck, AlertTriangle, CheckCircle, Activity,
  ChevronDown, ChevronUp, Search
} from 'lucide-react';
import { authFetch } from '../utils/api';

const TABS = [
  { id: 'users',     label: 'Users',              icon: Users        },
  { id: 'platform',  label: 'Platform Analytics', icon: BarChart2    },
  { id: 'kbs',       label: 'Knowledge Bases',    icon: Database     },
  { id: 'audit',     label: 'Audit Log',          icon: ClipboardList },
];

function RoleBadge({ role }) {
  const styles = {
    super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
    admin:       'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200',
    user:        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  };
  const labels = { super_admin: 'Super Admin', admin: 'Admin', user: 'User' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[role] || styles.user}`}>
      {labels[role] || role}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function SuperAdmin() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const userId         = searchParams.get('user_id');

  const [activeTab,   setActiveTab]   = useState('users');
  const [users,       setUsers]       = useState([]);
  const [platform,    setPlatform]    = useState(null);
  const [kbs,         setKbs]         = useState([]);
  const [auditLogs,   setAuditLogs]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [roleLoading, setRoleLoading] = useState(null);
  const [sortField,   setSortField]   = useState('last_seen');
  const [sortAsc,     setSortAsc]     = useState(false);

  useEffect(() => { if (!userId) navigate('/'); }, [userId, navigate]);
  useEffect(() => { fetchTab(activeTab); }, [activeTab, userId]);

  const fetchTab = async (tab) => {
    if (!userId) return;
    setLoading(true);
    try {
      if (tab === 'users') {
        const res  = await authFetch(userId, `/api/admin/users`);
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } else if (tab === 'platform') {
        const res  = await authFetch(userId, `/api/admin/analytics`);
        const data = await res.json();
        setPlatform(data);
      } else if (tab === 'kbs') {
        const res  = await authFetch(userId, `/api/admin/kb-list`);
        const data = await res.json();
        setKbs(Array.isArray(data) ? data : []);
      } else if (tab === 'audit') {
        const res  = await authFetch(userId, `/api/admin/audit-log?limit=200`);
        const data = await res.json();
        setAuditLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('SuperAdmin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    if (!window.confirm(`Change this user's role to "${newRole}"?`)) return;
    setRoleLoading(targetUserId);
    try {
      const res = await authFetch(userId, `/api/admin/update-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetUserId, new_role: newRole }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u =>
          u.user_id === targetUserId ? { ...u, role: newRole } : u
        ));
      }
    } catch (err) {
      alert('Failed to update role.');
    } finally {
      setRoleLoading(null);
    }
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortAsc(prev => !prev);
    else { setSortField(field); setSortAsc(false); }
  };

  const filteredUsers = users
    .filter(u =>
      !search ||
      u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const v1 = a[sortField] ?? '';
      const v2 = b[sortField] ?? '';
      const cmp = typeof v1 === 'number' ? v1 - v2 : v1.localeCompare(v2);
      return sortAsc ? cmp : -cmp;
    });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30 ml-1" />;
    return sortAsc
      ? <ChevronUp className="w-3 h-3 ml-1 text-blue-500" />
      : <ChevronDown className="w-3 h-3 ml-1 text-blue-500" />;
  };

  const formatTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d) / 60000);
    if (diff < 1)    return 'just now';
    if (diff < 60)   return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">

      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/chat?user_id=${userId}`)}
              className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Super Admin Portal</h1>
            </div>
          </div>
          <button onClick={() => fetchTab(activeTab)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Tab bar */}
        <div className="max-w-7xl mx-auto px-6 flex gap-1 pb-0">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* ── USERS TAB ── */}
        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">All Users</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{users.length} total users on the platform</p>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 w-64"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <Activity className="w-6 h-6 animate-pulse mr-2" /> Loading users...
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                      {[
                        { label: 'User',         field: 'display_name' },
                        { label: 'Role',         field: 'role'         },
                        { label: 'Queries',      field: 'query_count'  },
                        { label: 'Tickets',      field: 'tickets_raised'},
                        { label: 'Files Accessed', field: 'files_accessed'},
                        { label: 'Last Seen',    field: 'last_seen'    },
                        { label: 'Actions',      field: null           },
                      ].map(col => (
                        <th key={col.label}
                          onClick={() => col.field && toggleSort(col.field)}
                          className={`text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider ${col.field ? 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-300' : ''}`}>
                          <span className="flex items-center">
                            {col.label}
                            {col.field && <SortIcon field={col.field} />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {filteredUsers.map(user => (
                      <tr key={user.user_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {(user.display_name || user.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{user.display_name || '—'}</p>
                              <p className="text-xs text-gray-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">{user.query_count}</td>
                        <td className="px-4 py-3">
                          <span className={user.tickets_raised > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}>
                            {user.tickets_raised}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{user.files_accessed}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{formatTime(user.last_seen)}</td>
                        <td className="px-4 py-3">
                          {user.role !== 'super_admin' && (
                            <div className="flex items-center gap-2">
                              {user.role === 'user' ? (
                                <button
                                  onClick={() => handleRoleChange(user.user_id, 'admin')}
                                  disabled={roleLoading === user.user_id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300 transition-colors disabled:opacity-50">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  Make Admin
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRoleChange(user.user_id, 'user')}
                                  disabled={roleLoading === user.user_id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 transition-colors disabled:opacity-50">
                                  <ShieldOff className="w-3.5 h-3.5" />
                                  Remove Admin
                                </button>
                              )}
                            </div>
                          )}
                          {user.role === 'super_admin' && (
                            <span className="text-xs text-gray-400 italic">Protected</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── PLATFORM ANALYTICS TAB ── */}
        {activeTab === 'platform' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Platform Analytics</h2>
            {loading || !platform ? (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <Activity className="w-6 h-6 animate-pulse mr-2" /> Loading analytics...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <StatCard icon={Users}         label="Total Users"         value={platform.total_users}       color="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
                  <StatCard icon={MessageSquare} label="Total Queries"       value={platform.total_queries}     color="bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
                  <StatCard icon={TicketCheck}   label="Tickets Raised"      value={platform.tickets_raised}    color="bg-orange-50 text-orange-500 dark:bg-orange-900/30 dark:text-orange-400" />
                  <StatCard icon={Database}      label="Knowledge Bases"     value={platform.total_knowledge_bases} color="bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-500" /> Deflection Rate
                    </h3>
                    <div className="flex items-end gap-3 mb-4">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">{platform.deflection_rate_percent}%</span>
                      <span className={`text-sm font-medium mb-1 ${platform.deflection_rate_percent >= 20 ? 'text-green-500' : 'text-amber-500'}`}>
                        {platform.deflection_rate_percent >= 20 ? '✓ Target met' : '⚠ Below 20% target'}
                      </span>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                      <div className="h-3 rounded-full bg-green-500 transition-all duration-700"
                        style={{ width: `${Math.min(platform.deflection_rate_percent, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                      <span>0%</span><span className="text-amber-400">20% target</span><span>100%</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-yellow-500" /> Avg Response Time
                    </h3>
                    <div className="flex items-end gap-3 mb-4">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        {platform.avg_response_time_ms >= 1000
                          ? `${(platform.avg_response_time_ms / 1000).toFixed(1)}s`
                          : `${platform.avg_response_time_ms}ms`}
                      </span>
                      <span className={`text-sm font-medium mb-1 ${platform.avg_response_time_ms <= 3000 ? 'text-green-500' : 'text-red-500'}`}>
                        {platform.avg_response_time_ms <= 3000 ? '✓ SLA met' : '✗ SLA breach'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{platform.slow_responses_over_3s}</p>
                        <p className="text-xs text-gray-500">SLA breaches</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{platform.total_sessions}</p>
                        <p className="text-xs text-gray-500">Total sessions</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 14-day timeline */}
                {platform.timeline && (
                  <div className="mt-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Last 14 Days — Queries</h3>
                    <div className="flex items-end gap-1 h-24">
                      {platform.timeline.map((day, i) => {
                        const maxQ = Math.max(...platform.timeline.map(d => d.queries), 1);
                        const h    = Math.max((day.queries / maxQ) * 80, 2);
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {day.queries} queries
                            </div>
                            <div className="w-full bg-blue-500 rounded-t opacity-80 hover:opacity-100 transition-opacity"
                              style={{ height: `${h}px` }} />
                            <span className="text-xs text-gray-300 hidden lg:block">{day.date.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── KNOWLEDGE BASES TAB ── */}
        {activeTab === 'kbs' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">All Knowledge Bases</h2>
            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <Activity className="w-6 h-6 animate-pulse mr-2" /> Loading...
              </div>
            ) : kbs.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No knowledge bases created yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {kbs.map(kb => (
                  <div key={kb.id} className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm p-5 ${kb.is_active ? 'border-gray-100 dark:border-gray-800' : 'border-red-100 dark:border-red-900/30 opacity-60'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                          <Database className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">{kb.name}</p>
                          <p className="text-xs text-gray-400">{kb.folder_name || kb.folder_id}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${kb.is_active ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-500'}`}>
                        {kb.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{kb.description || 'No description'}</p>
                    <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-50 dark:border-gray-800 pt-3">
                      <div><p className="text-sm font-bold text-gray-900 dark:text-white">{kb.member_count}</p><p className="text-xs text-gray-400">Members</p></div>
                      <div><p className="text-sm font-bold text-gray-900 dark:text-white">{kb.session_count}</p><p className="text-xs text-gray-400">Sessions</p></div>
                      <div><p className="text-xs text-gray-400 mt-1">{kb.created_by}</p><p className="text-xs text-gray-400">Creator</p></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── AUDIT LOG TAB ── */}
        {activeTab === 'audit' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Audit Log</h2>
            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <Activity className="w-6 h-6 animate-pulse mr-2" /> Loading...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No admin actions recorded yet.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Time</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actor</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Target</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatTime(log.timestamp)}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{log.actor_email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            log.action.includes('promote') ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                            : log.action.includes('demote') ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{log.target_email || '—'}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                          {Object.entries(log.detail || {}).map(([k, v]) => `${k}: ${v}`).join(', ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}