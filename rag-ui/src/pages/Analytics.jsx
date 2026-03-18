import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Clock, MessageSquare, TicketCheck,
  ShieldCheck, AlertTriangle, CheckCircle, RefreshCw, Zap,
  Target, Activity
} from 'lucide-react';
import AppLayout from '../components/AppLayout';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ── Auth helper — injects Bearer <user_id> on every protected request ─
function authFetch(userId, path, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Authorization': `Bearer ${userId}`,
    },
  });
}

// UUID-safe name helper
function safeDisplayName(name) {
  if (!name) return '';
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name);
  return isUuid ? '' : name;
}

function Sparkline({ data, color = '#3b82f6', height = 40 }) {
  if (!data || data.length < 2) return null;
  const max   = Math.max(...data);
  const min   = Math.min(...data);
  const range = max - min || 1;
  const w     = 120;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={height} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KpiCard({ icon: Icon, label, value, sub, trend, trendUp, color, spark, sparkColor }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
            trendUp
              ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400'
          }`}>
            {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>
        {spark && <Sparkline data={spark} color={sparkColor || '#3b82f6'} />}
      </div>
    </div>
  );
}

function BarRow({ label, value, max, color, pct }) {
  const width = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 dark:text-gray-400 w-32 truncate flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
        <div className="h-2.5 rounded-full transition-all duration-700" style={{ width: `${width}%`, background: color || '#3b82f6' }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-12 text-right flex-shrink-0">
        {pct ? `${Math.round(width)}%` : value}
      </span>
    </div>
  );
}

function SlaBadge({ pass }) {
  return pass
    ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> SLA MET</span>
    : <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" /> SLA BREACH</span>;
}

export default function Analytics() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const userId         = searchParams.get('user_id');

  const [data,           setData]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [lastRefresh,    setLastRefresh]    = useState(null);
  const [refreshing,     setRefreshing]     = useState(false);
  const [displayName,    setDisplayName]    = useState('');
  const [userEmail,      setUserEmail]      = useState('');
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => { if (!userId) navigate('/'); }, [userId, navigate]);
  useEffect(() => { fetchAnalytics(); fetchProfile(); }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;
    try {
      // /api/get-token is PUBLIC — plain fetch, no auth header needed
      const res  = await fetch(`${API_BASE}/api/get-token/${userId}`);
      const d    = await res.json();
      const name = safeDisplayName(d.display_name);
      if (name) setDisplayName(name);
      if (d.email) setUserEmail(d.email);
    } catch {}
    finally { setProfileLoading(false); }
  };

  const fetchAnalytics = async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      // SECURED: requires Authorization: Bearer <userId>
      const res  = await authFetch(userId, `/api/analytics/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
      setError('');
      // Also pick up display name from analytics response if profile fetch missed it
      const name = safeDisplayName(json.user_profile?.display_name);
      if (name) setDisplayName(name);
      if (json.user_profile?.email) setUserEmail(json.user_profile.email);
    } catch (err) {
      setError(err.message || 'Could not load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Derived values
  const deflectionRate   = data?.deflection_rate_percent ?? 0;
  const deflectionTarget = 20;
  const deflectionMet    = deflectionRate >= deflectionTarget;
  const avgResponseMs    = data?.avg_response_time_ms ?? 0;
  const slaTarget        = 3000;
  const slaMet           = avgResponseMs <= slaTarget;
  const totalQueries     = data?.total_queries ?? 0;
  const ticketsRaised    = data?.tickets_raised ?? 0;
  const resolved         = data?.resolved_without_ticket ?? 0;
  const sessions         = data?.sessions_count ?? 0;
  const slowResponses    = data?.slow_responses_over_3s ?? 0;

  const querySpark  = (data?.timeline || []).map(d => d.queries);
  const ticketSpark = (data?.timeline || []).map(d => d.tickets);

  if (loading) {
    return (
      <AppLayout userId={userId} displayName={displayName} userEmail={userEmail} profileLoading={profileLoading}>
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
            <Activity className="w-8 h-8 animate-pulse" />
            <p className="text-sm">Loading analytics...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout userId={userId} displayName={displayName} userEmail={userEmail} profileLoading={profileLoading}>
        <div className="flex items-center justify-center h-full px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-100 dark:border-red-900 p-8 text-center max-w-sm w-full">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">Failed to load analytics</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="w-full bg-black dark:bg-white text-white dark:text-black text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      userId={userId}
      displayName={displayName}
      userEmail={userEmail}
      profileLoading={profileLoading}
      analyticsData={data}
    >
      <div className="h-full overflow-y-auto">
        <main className="max-w-6xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Performance metrics for {safeDisplayName(displayName) || 'your account'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastRefresh && (
                <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
                  Updated {lastRefresh.toLocaleTimeString()}
                </p>
              )}
              <button
                onClick={fetchAnalytics}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard
              icon={MessageSquare}
              label="Total Queries"
              value={totalQueries}
              sub="All time"
              color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              spark={querySpark}
              sparkColor="#3b82f6"
            />
            <KpiCard
              icon={TicketCheck}
              label="Tickets Raised"
              value={ticketsRaised}
              sub="Support escalations"
              color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
              spark={ticketSpark}
              sparkColor="#f97316"
            />
            <KpiCard
              icon={Target}
              label="Deflection Rate"
              value={`${deflectionRate.toFixed(1)}%`}
              sub={`Target: ≥${deflectionTarget}%`}
              trend={deflectionMet ? 'On target' : 'Below target'}
              trendUp={deflectionMet}
              color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
            />
            <KpiCard
              icon={Clock}
              label="Avg Response"
              value={avgResponseMs >= 1000 ? `${(avgResponseMs / 1000).toFixed(1)}s` : `${Math.round(avgResponseMs)}ms`}
              sub="SLA: < 3 seconds"
              trend={slaMet ? 'Within SLA' : 'SLA Breach'}
              trendUp={slaMet}
              color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
            />
          </div>

          {/* Two-column detail section */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">

            {/* SLA Performance */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-500" />
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Response Time SLA</h2>
                </div>
                <SlaBadge pass={slaMet} />
              </div>

              <div className="flex items-end gap-3 mb-5">
                <span className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {avgResponseMs >= 1000 ? `${(avgResponseMs / 1000).toFixed(1)}s` : `${Math.round(avgResponseMs)}ms`}
                </span>
                <span className="text-sm text-gray-400 dark:text-gray-500 mb-1.5">avg / 3s SLA</span>
              </div>

              <div className="space-y-2 mb-5">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>0ms</span>
                  <span className="text-orange-400 font-medium">3000ms SLA limit</span>
                </div>
                <div className="relative bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min((avgResponseMs / 4000) * 100, 100)}%`,
                      background: slaMet ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #f97316, #dc2626)',
                    }}
                  />
                  <div className="absolute top-0 bottom-0 w-0.5 bg-orange-400" style={{ left: '75%' }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{slowResponses}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Breached SLA</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {totalQueries > 0 ? Math.round(((totalQueries - slowResponses) / totalQueries) * 100) : 100}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Within SLA</p>
                </div>
              </div>
            </div>

            {/* Query Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Query Breakdown</h2>
              </div>
              <div className="space-y-4">
                <BarRow label="Resolved by AI"  value={resolved}                     max={totalQueries || 1} color="#22c55e" pct />
                <BarRow label="Tickets Raised"  value={ticketsRaised}                max={totalQueries || 1} color="#f97316" pct />
                <BarRow label="Within SLA"      value={totalQueries - slowResponses} max={totalQueries || 1} color="#3b82f6" pct />
                <BarRow label="SLA Breached"    value={slowResponses}                max={totalQueries || 1} color="#ef4444" pct />
              </div>
              <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-3">
                <div className={`rounded-xl p-3 ${deflectionMet ? 'bg-green-50 dark:bg-green-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${deflectionMet ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>BR-001</p>
                  <p className={`text-sm font-bold ${deflectionMet ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
                    {deflectionMet ? '✓ Target Met' : '⚠ Below Target'}
                  </p>
                </div>
                <div className={`rounded-xl p-3 ${slaMet ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${slaMet ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>NFR-001</p>
                  <p className={`text-sm font-bold ${slaMet ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}`}>
                    {slaMet ? '✓ SLA Met' : '✗ SLA Breach'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Requirements Compliance Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Requirements Compliance</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
                    <th className="px-6 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Requirement</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Metric</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {[
                    { id: 'BR-001',  req: 'Reduce L1 tickets by ≥20%',   metric: `${deflectionRate.toFixed(1)}% deflection rate`,                                                                   pass: deflectionMet },
                    { id: 'NFR-001', req: 'Response time < 3 seconds',    metric: avgResponseMs >= 1000 ? `${(avgResponseMs / 1000).toFixed(2)}s avg` : `${Math.round(avgResponseMs)}ms avg`,       pass: slaMet },
                    { id: 'FR-007',  req: 'Log all user interactions',    metric: `${totalQueries} interactions logged`,                                                                             pass: true },
                    { id: 'FR-006',  req: 'Raise ticket if unresolved',   metric: `${ticketsRaised} ticket${ticketsRaised !== 1 ? 's' : ''} raised`,                                                pass: true },
                    { id: 'NFR-004', req: 'Admin performance monitoring', metric: 'Dashboard active',                                                                                               pass: true },
                  ].map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{row.id}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{row.req}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-mono text-xs">{row.metric}</td>
                      <td className="px-6 py-4">
                        {row.pass
                          ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-full"><CheckCircle className="w-3 h-3" /> Pass</span>
                          : <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2.5 py-1 rounded-full"><AlertTriangle className="w-3 h-3" /> Fail</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 pb-4">
            Data sourced from Lumina AI interaction logs · User: <span className="font-medium">{safeDisplayName(displayName) || 'Account'}</span>
          </p>
        </main>
      </div>
    </AppLayout>
  );
}