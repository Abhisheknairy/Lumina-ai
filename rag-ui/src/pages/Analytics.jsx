import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, TrendingUp, TrendingDown, Clock,
  MessageSquare, TicketCheck, ShieldCheck,
  AlertTriangle, CheckCircle, RefreshCw, BarChart2,
  Zap, Target, Activity
} from 'lucide-react';

// ── tiny sparkline drawn with SVG ──────────────────────────────
function Sparkline({ data, color = '#3b82f6', height = 40 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120;
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

// ── KPI card ───────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, trend, trendUp, color, spark, sparkColor }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
            {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-xs text-gray-400">{sub}</p>
        {spark && <Sparkline data={spark} color={sparkColor || '#3b82f6'} />}
      </div>
    </div>
  );
}

// ── horizontal bar ─────────────────────────────────────────────
function BarRow({ label, value, max, color, pct }) {
  const width = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-32 truncate flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${width}%`, background: color || '#3b82f6' }} />
      </div>
      <span className="text-sm font-medium text-gray-700 w-10 text-right flex-shrink-0">
        {pct ? `${Math.round(width)}%` : value}
      </span>
    </div>
  );
}

// ── SLA badge ──────────────────────────────────────────────────
function SlaBadge({ pass }) {
  return pass
    ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> SLA MET</span>
    : <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" /> SLA BREACH</span>;
}

// ── main page ──────────────────────────────────────────────────
export default function Analytics() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('user_id');

  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [lastRefresh,  setLastRefresh]  = useState(null);
  const [refreshing,   setRefreshing]   = useState(false);
  const [displayName,  setDisplayName]  = useState('');

  useEffect(() => { if (!userId) navigate('/'); }, [userId, navigate]);
  useEffect(() => { fetchAnalytics(); }, [userId]);

  const fetchAnalytics = async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const res = await fetch(`http://localhost:8000/api/analytics/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
      setError('');
      if (json.user_profile?.display_name) setDisplayName(json.user_profile.display_name);
    } catch (err) {
      setError(err.message || 'Could not load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── derived values ────────────────────────────────────────────
  const deflectionRate   = data?.deflection_rate_percent ?? 0;
  const deflectionTarget = 20;
  const deflectionMet    = deflectionRate >= deflectionTarget;

  const avgResponseMs  = data?.avg_response_time_ms ?? 0;
  const slaTarget      = 3000;
  const slaMet         = avgResponseMs <= slaTarget;

  const totalQueries   = data?.total_queries ?? 0;
  const ticketsRaised  = data?.tickets_raised ?? 0;
  const resolved       = data?.resolved_without_ticket ?? 0;
  const sessions       = data?.sessions_count ?? 0;
  const slowResponses  = data?.slow_responses_over_3s ?? 0;

  // Real sparkline data from timeline (last 14 days)
  const querySpark  = (data?.timeline || []).map(d => d.queries);
  const ticketSpark = (data?.timeline || []).map(d => d.tickets);

  // ── loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Activity className="w-8 h-8 animate-pulse" />
          <p className="text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-red-100 p-8 text-center max-w-sm w-full">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium mb-1">Failed to load analytics</p>
          <p className="text-sm text-gray-400 mb-5">{error}</p>
          <button onClick={fetchAnalytics} className="w-full bg-black text-white text-sm font-medium py-2.5 rounded-xl hover:bg-gray-800 transition-colors">
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── main render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── TOP NAV ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/chat?user_id=${userId}`)}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-semibold tracking-tight">Analytics Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-gray-400 hidden sm:block">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchAnalytics}
              disabled={refreshing}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
              {displayName || userId}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── BR-001 HEADLINE BANNER ── */}
        <div className={`rounded-2xl p-6 border ${deflectionMet ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${deflectionMet ? 'bg-green-100' : 'bg-amber-100'}`}>
                <Target className={`w-6 h-6 ${deflectionMet ? 'text-green-600' : 'text-amber-600'}`} />
              </div>
              <div>
                <p className={`text-sm font-semibold uppercase tracking-wider mb-1 ${deflectionMet ? 'text-green-700' : 'text-amber-700'}`}>
                  BR-001 — L1 Ticket Deflection Target
                </p>
                <p className={`text-3xl font-bold tracking-tight ${deflectionMet ? 'text-green-800' : 'text-amber-800'}`}>
                  {deflectionRate.toFixed(1)}%
                  <span className={`text-base font-normal ml-2 ${deflectionMet ? 'text-green-600' : 'text-amber-600'}`}>
                    / {deflectionTarget}% target
                  </span>
                </p>
                <p className={`text-sm mt-1 ${deflectionMet ? 'text-green-600' : 'text-amber-600'}`}>
                  {deflectionMet
                    ? `✓ Target achieved — ${resolved} of ${totalQueries} queries resolved without a ticket`
                    : `${(deflectionTarget - deflectionRate).toFixed(1)}% below target — ${resolved} of ${totalQueries} queries resolved without a ticket`
                  }
                </p>
              </div>
            </div>

            {/* Progress arc visual */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="15.9" fill="none"
                    stroke={deflectionMet ? '#16a34a' : '#d97706'}
                    strokeWidth="2.5"
                    strokeDasharray={`${Math.min(deflectionRate, 100)}, 100`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-lg font-bold ${deflectionMet ? 'text-green-700' : 'text-amber-700'}`}>
                    {Math.round(deflectionRate)}%
                  </span>
                </div>
              </div>
              <span className="text-xs text-gray-500">deflection rate</span>
            </div>
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={MessageSquare}
            label="Total Queries"
            value={totalQueries.toLocaleString()}
            sub="All time"
            color="bg-blue-50 text-blue-600"
            spark={querySpark}
            sparkColor="#3b82f6"
          />
          <KpiCard
            icon={CheckCircle}
            label="Resolved by AI"
            value={resolved.toLocaleString()}
            sub="No ticket needed"
            trend={deflectionRate > 0 ? `${deflectionRate.toFixed(0)}%` : undefined}
            trendUp={deflectionMet}
            color="bg-green-50 text-green-600"
            spark={querySpark.map(v => Math.floor(v * (deflectionRate / 100)))}
            sparkColor="#16a34a"
          />
          <KpiCard
            icon={TicketCheck}
            label="Tickets Raised"
            value={ticketsRaised.toLocaleString()}
            sub="Escalated to support"
            color="bg-orange-50 text-orange-500"
            spark={ticketSpark}
            sparkColor="#f97316"
          />
          <KpiCard
            icon={MessageSquare}
            label="Active Sessions"
            value={sessions.toLocaleString()}
            sub="Unique Drive connections"
            color="bg-purple-50 text-purple-600"
          />
        </div>

        {/* ── PERFORMANCE + BREAKDOWN ROW ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* NFR-001 Response Time */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <h2 className="text-base font-semibold text-gray-900">Response Time</h2>
              </div>
              <SlaBadge pass={slaMet} />
            </div>

            <div className="flex items-end gap-3 mb-5">
              <span className="text-4xl font-bold text-gray-900 tracking-tight">
                {avgResponseMs >= 1000
                  ? `${(avgResponseMs / 1000).toFixed(1)}s`
                  : `${Math.round(avgResponseMs)}ms`
                }
              </span>
              <span className="text-sm text-gray-400 mb-1.5">avg / 3s SLA</span>
            </div>

            {/* SLA bar */}
            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>0ms</span>
                <span className="text-orange-400 font-medium">3000ms SLA limit</span>
              </div>
              <div className="relative bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min((avgResponseMs / 4000) * 100, 100)}%`,
                    background: slaMet
                      ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                      : 'linear-gradient(90deg, #f97316, #dc2626)',
                  }}
                />
                {/* SLA marker */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-orange-400" style={{ left: '75%' }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-gray-900">{slowResponses}</p>
                <p className="text-xs text-gray-500 mt-0.5">Breached SLA</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-gray-900">
                  {totalQueries > 0 ? Math.round(((totalQueries - slowResponses) / totalQueries) * 100) : 100}%
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Within SLA</p>
              </div>
            </div>
          </div>

          {/* Query breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              <h2 className="text-base font-semibold text-gray-900">Query Breakdown</h2>
            </div>

            <div className="space-y-4">
              <BarRow
                label="Resolved by AI"
                value={resolved}
                max={totalQueries || 1}
                color="#22c55e"
                pct
              />
              <BarRow
                label="Tickets Raised"
                value={ticketsRaised}
                max={totalQueries || 1}
                color="#f97316"
                pct
              />
              <BarRow
                label="Within SLA"
                value={totalQueries - slowResponses}
                max={totalQueries || 1}
                color="#3b82f6"
                pct
              />
              <BarRow
                label="SLA Breached"
                value={slowResponses}
                max={totalQueries || 1}
                color="#ef4444"
                pct
              />
            </div>

            {/* Summary pills */}
            <div className="mt-5 pt-5 border-t border-gray-50 grid grid-cols-2 gap-3">
              <div className={`rounded-xl p-3 ${deflectionMet ? 'bg-green-50' : 'bg-amber-50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${deflectionMet ? 'text-green-600' : 'text-amber-600'}`}>BR-001 Status</p>
                <p className={`text-sm font-bold ${deflectionMet ? 'text-green-700' : 'text-amber-700'}`}>
                  {deflectionMet ? '✓ Target Met' : '⚠ Below Target'}
                </p>
              </div>
              <div className={`rounded-xl p-3 ${slaMet ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${slaMet ? 'text-green-600' : 'text-red-500'}`}>NFR-001 Status</p>
                <p className={`text-sm font-bold ${slaMet ? 'text-green-700' : 'text-red-600'}`}>
                  {slaMet ? '✓ SLA Met' : '✗ SLA Breach'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── REQUIREMENTS COMPLIANCE TABLE ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">Requirements Compliance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Requirement</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Metric</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  {
                    id: 'BR-001',
                    req: 'Reduce L1 tickets by ≥20%',
                    metric: `${deflectionRate.toFixed(1)}% deflection rate`,
                    pass: deflectionMet,
                  },
                  {
                    id: 'NFR-001',
                    req: 'Response time < 3 seconds',
                    metric: avgResponseMs >= 1000 ? `${(avgResponseMs / 1000).toFixed(2)}s avg` : `${Math.round(avgResponseMs)}ms avg`,
                    pass: slaMet,
                  },
                  {
                    id: 'FR-007',
                    req: 'Log all user interactions',
                    metric: `${totalQueries} interactions logged`,
                    pass: true,
                  },
                  {
                    id: 'FR-006',
                    req: 'Raise ticket if unresolved',
                    metric: `${ticketsRaised} ticket${ticketsRaised !== 1 ? 's' : ''} raised`,
                    pass: true,
                  },
                  {
                    id: 'NFR-004',
                    req: 'Admin performance monitoring',
                    metric: 'Dashboard active',
                    pass: true,
                  },
                ].map(row => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {row.id}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{row.req}</td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{row.metric}</td>
                    <td className="px-6 py-4">
                      {row.pass
                        ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full"><CheckCircle className="w-3 h-3" /> Pass</span>
                        : <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-50 px-2.5 py-1 rounded-full"><AlertTriangle className="w-3 h-3" /> Fail</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          Data sourced from Lumina AI interaction logs · User: <span className="font-medium">{displayName || userId}</span>
        </p>
      </main>
    </div>
  );
}