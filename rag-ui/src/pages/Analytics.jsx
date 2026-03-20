import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RefreshCw, MessageSquare, TicketCheck, Target, Clock, Activity, Zap, ShieldCheck, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import AppLayout from '../components/AppLayout';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
function authFetch(userId, path, opts = {}) { return fetch(`${API_BASE}${path}`, { ...opts, headers: { ...(opts.headers || {}), 'Authorization': `Bearer ${userId}` } }); }
function isUUID(s) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || ''); }
function bestName(dn, em) { if (!em) em = ''; const n = (dn && !isUUID(dn)) ? dn : (em ? em.split('@')[0].replace(/_/g,'.').split('.').map(p=>p.charAt(0).toUpperCase()+p.slice(1)).join(' ') : ''); return n; }

function Spark({ data = [], color = 'var(--gold)', height = 30 }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1); const w = 72;
  const pts = data.map((v, i) => `${(i / (data.length - 1 || 1)) * w},${height - (v / max) * height}`).join(' ');
  return <svg width={w} height={height} style={{ display: 'block', opacity: 0.7 }}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

function KpiCard({ icon: Icon, label, value, sub, trend, trendUp, color, spark, sparkColor }) {
  return (
    <div className="lux-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(200,169,110,0.1)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={13} style={{ color: color || 'var(--gold)' }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: 'var(--font-body)' }}>{label}</span>
        </div>
        {spark && <Spark data={spark} color={sparkColor || color || 'var(--gold)'} />}
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.035em', lineHeight: 1 }}>{value}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        {sub && <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>{sub}</span>}
        {trend !== undefined && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 500, color: trendUp ? 'var(--success)' : 'var(--warn)', background: trendUp ? 'var(--success-dim)' : 'var(--warn-dim)', border: `1px solid ${trendUp ? 'var(--success-bdr)' : 'var(--warn-bdr)'}`, padding: '2px 7px', borderRadius: 4, fontFamily: 'var(--font-body)' }}>
            {trendUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />} {trend}
          </span>
        )}
      </div>
    </div>
  );
}

function BarRow({ label, value, max, color }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 12, color: 'var(--text-2)', width: 130, flexShrink: 0, fontFamily: 'var(--font-body)' }}>{label}</span>
      <div style={{ flex: 1, background: 'var(--bg-3)', borderRadius: 3, height: 4, overflow: 'hidden' }}>
        <div style={{ height: 4, background: color, borderRadius: 3, width: `${w}%`, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', width: 36, textAlign: 'right', flexShrink: 0, fontFamily: 'monospace' }}>{w}%</span>
    </div>
  );
}

function ReqRow({ id, req, metric, pass }) {
  return (
    <tr>
      <td style={{ padding: '11px 16px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-sub)' }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: 'var(--gold)', background: 'var(--gold-dim)', padding: '2px 7px', borderRadius: 4, border: '1px solid var(--gold-border)' }}>{id}</span>
      </td>
      <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--text-2)', borderBottom: '1px solid var(--border-sub)', fontFamily: 'var(--font-body)' }}>{req}</td>
      <td style={{ padding: '11px 16px', fontSize: 11, fontFamily: 'monospace', color: 'var(--text-3)', borderBottom: '1px solid var(--border-sub)' }}>{metric}</td>
      <td style={{ padding: '11px 16px', borderBottom: '1px solid var(--border-sub)' }}>
        {pass
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: 'var(--success)', background: 'var(--success-dim)', border: '1px solid var(--success-bdr)', padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-body)' }}><CheckCircle size={9} />Pass</span>
          : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: 'var(--danger)', background: 'var(--danger-dim)', border: '1px solid var(--danger-bdr)', padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-body)' }}><AlertTriangle size={9} />Fail</span>
        }
      </td>
    </tr>
  );
}

export default function Analytics() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const userId         = searchParams.get('user_id');
  const [data, setData]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [lastRefresh, setLastRefresh]     = useState(null);
  const [refreshing, setRefreshing]       = useState(false);
  const [displayName, setDisplayName]     = useState('');
  const [userEmail, setUserEmail]         = useState('');
  const [userRole, setUserRole]           = useState('user');
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => { if (!userId) navigate('/'); }, [userId, navigate]);
  useEffect(() => { fetchAnalytics(); fetchProfile(); }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;
    try { const res = await fetch(`${API_BASE}/api/get-token/${userId}`); const d = await res.json(); setDisplayName(bestName(d.display_name, d.email || '')); setUserEmail(d.email || ''); setUserRole(d.role || 'user'); }
    catch {} finally { setProfileLoading(false); }
  };

  const fetchAnalytics = async () => {
    if (!userId) return; setRefreshing(true);
    try {
      const res = await authFetch(userId, `/api/analytics/${userId}`); if (!res.ok) throw new Error('Failed');
      const json = await res.json(); setData(json); setLastRefresh(new Date()); setError('');
      const n = bestName(json.user_profile?.display_name, json.user_profile?.email || ''); if (n) setDisplayName(n); if (json.user_profile?.email) setUserEmail(json.user_profile.email);
    } catch (err) { setError(err.message || 'Could not load analytics'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const defRate  = data?.deflection_rate_percent ?? 0;
  const avgMs    = data?.avg_response_time_ms ?? 0;
  const totalQ   = data?.total_queries ?? 0;
  const tickets  = data?.tickets_raised ?? 0;
  const resolved = data?.resolved_without_ticket ?? 0;
  const sessions = data?.sessions_count ?? 0;
  const slowRes  = data?.slow_responses_over_3s ?? 0;
  const defMet   = defRate >= 20; const slaMet = avgMs <= 3000;
  const querySpark  = (data?.timeline || []).map(d => d.queries);
  const ticketSpark = (data?.timeline || []).map(d => d.tickets);
  const avgDisplay  = avgMs >= 1000 ? `${(avgMs/1000).toFixed(1)}s` : `${Math.round(avgMs)}ms`;

  const loadState = (
    <AppLayout userId={userId} displayName={displayName} userEmail={userEmail} role={userRole} profileLoading={profileLoading}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-3)' }}>
          <div style={{ width: 14, height: 14, border: '1.5px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <span style={{ fontSize: 13, fontFamily: 'var(--font-body)' }}>Loading analytics…</span>
        </div>
      </div>
    </AppLayout>
  );

  if (loading) return loadState;
  if (error) return (
    <AppLayout userId={userId} displayName={displayName} userEmail={userEmail} role={userRole} profileLoading={profileLoading}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }}>
        <div className="lux-card" style={{ padding: 36, textAlign: 'center', maxWidth: 340 }}>
          <AlertTriangle size={20} style={{ color: 'var(--danger)', marginBottom: 14 }} />
          <p style={{ fontSize: 14, color: 'var(--text-1)', marginBottom: 6, fontWeight: 500, fontFamily: 'var(--font-display)' }}>Failed to load analytics</p>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 22, fontFamily: 'var(--font-body)' }}>{error}</p>
          <button className="btn-gold" onClick={fetchAnalytics}>Retry</button>
        </div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout userId={userId} displayName={displayName} userEmail={userEmail} role={userRole} profileLoading={profileLoading} analyticsData={data}>
      <div style={{ height: '100%', overflowY: 'auto' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '36px 28px 56px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
                <div className="gold-line" />
                <span className="section-label">Performance</span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text-1)', margin: '0 0 5px' }}>Analytics</h1>
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, fontFamily: 'var(--font-body)' }}>
                {bestName(displayName, userEmail) || 'Your account'}
                {lastRefresh && ` · Updated ${lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              </p>
            </div>
            <button className="btn-ghost" onClick={fetchAnalytics} disabled={refreshing}>
              <RefreshCw size={12} style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }} /> Refresh
            </button>
          </div>

          {/* KPI grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            <KpiCard icon={MessageSquare} label="Queries"      value={totalQ}               sub={`${sessions} sessions`}  color="var(--gold)"    spark={querySpark}  sparkColor="var(--gold)" />
            <KpiCard icon={TicketCheck}   label="Tickets"      value={tickets}              sub="Escalations"              color="var(--warn)"    spark={ticketSpark} sparkColor="var(--warn)" />
            <KpiCard icon={Target}        label="Deflection"   value={`${defRate.toFixed(1)}%`} sub="Target ≥20%"         color="var(--success)" trend={defMet ? 'Target met' : 'Below target'} trendUp={defMet} />
            <KpiCard icon={Clock}         label="Avg response" value={avgDisplay}           sub="SLA: < 3s"                color="var(--purple)"  trend={slaMet ? 'SLA met' : 'Breach'} trendUp={slaMet} />
          </div>

          {/* Two-col */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>

            {/* SLA card */}
            <div className="lux-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={13} style={{ color: 'var(--gold)' }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)', fontFamily: 'var(--font-body)' }}>Response time SLA</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: slaMet ? 'var(--success)' : 'var(--danger)', background: slaMet ? 'var(--success-dim)' : 'var(--danger-dim)', border: `1px solid ${slaMet ? 'var(--success-bdr)' : 'var(--danger-bdr)'}`, padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-body)' }}>
                  {slaMet ? '✓ Met' : '✗ Breach'}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, letterSpacing: '-0.035em', color: 'var(--text-1)', marginBottom: 16 }}>{avgDisplay}</div>
              <div style={{ background: 'var(--bg-3)', borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 14, position: 'relative' }}>
                <div style={{ height: 6, borderRadius: 4, background: slaMet ? 'var(--success)' : 'var(--danger)', width: `${Math.min((avgMs / 4000) * 100, 100)}%`, transition: 'width 0.6s ease' }} />
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: '75%', width: 1.5, background: 'var(--gold)', opacity: 0.6 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[['SLA breaches', slowRes], ['Within SLA', `${totalQ > 0 ? Math.round(((totalQ-slowRes)/totalQ)*100) : 100}%`]].map(([lbl, val]) => (
                  <div key={lbl} style={{ padding: '10px 12px', background: 'var(--bg-3)', borderRadius: 7, border: '1px solid var(--border-sub)' }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text-1)', margin: '0 0 3px' }}>{val}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, fontFamily: 'var(--font-body)' }}>{lbl}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Query breakdown */}
            <div className="lux-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <ShieldCheck size={13} style={{ color: 'var(--gold)' }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)', fontFamily: 'var(--font-body)' }}>Query breakdown</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 20 }}>
                <BarRow label="Resolved by AI"  value={resolved}       max={totalQ || 1} color="var(--success)" />
                <BarRow label="Tickets raised"  value={tickets}        max={totalQ || 1} color="var(--warn)"    />
                <BarRow label="Within SLA"      value={totalQ-slowRes} max={totalQ || 1} color="var(--gold)"    />
                <BarRow label="SLA breached"    value={slowRes}        max={totalQ || 1} color="var(--danger)"  />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 16, borderTop: '1px solid var(--border-sub)' }}>
                {[['BR-001', defMet, defMet ? 'Target met' : 'Below target'], ['NFR-001', slaMet, slaMet ? 'SLA met' : 'SLA breach']].map(([id, pass, lbl]) => (
                  <div key={id} style={{ padding: '10px 12px', background: 'var(--bg-3)', borderRadius: 7, border: `1px solid ${pass ? 'var(--success-bdr)' : 'var(--danger-bdr)'}` }}>
                    <p style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: 'var(--gold)', margin: '0 0 3px' }}>{id}</p>
                    <p style={{ fontSize: 11, fontWeight: 500, color: pass ? 'var(--success)' : 'var(--danger)', margin: 0, fontFamily: 'var(--font-body)' }}>{pass ? '✓' : '✗'} {lbl}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 14-day chart */}
          {data?.timeline && (
            <div className="lux-card" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <Activity size={13} style={{ color: 'var(--text-3)' }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)', fontFamily: 'var(--font-body)' }}>14-day query volume</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 }}>
                {data.timeline.map((day, i) => {
                  const max = Math.max(...data.timeline.map(d => d.queries), 1);
                  const h   = Math.max((day.queries / max) * 54, 2);
                  return (
                    <div key={i} title={`${day.date}: ${day.queries}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'default' }}>
                      <div style={{ width: '100%', borderRadius: 3, background: 'var(--gold)', opacity: 0.35, height: h, transition: 'opacity 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.35'} />
                      {i % 3 === 0 && <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'monospace' }}>{day.date.slice(5)}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Requirements table */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-sub)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="gold-line" />
              <span className="section-label">Requirements compliance</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-sub)' }}>
                  {['ID', 'Requirement', 'Metric', 'Status'].map(h => (
                    <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-body)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <ReqRow id="BR-001"  req="Reduce L1 tickets ≥20%"      metric={`${defRate.toFixed(1)}% deflection`}                                              pass={defMet} />
                <ReqRow id="NFR-001" req="Response time < 3s"          metric={avgMs >= 1000 ? `${(avgMs/1000).toFixed(2)}s avg` : `${Math.round(avgMs)}ms avg`} pass={slaMet} />
                <ReqRow id="FR-007"  req="Log all interactions"        metric={`${totalQ} logged`}                                                                pass={true} />
                <ReqRow id="FR-006"  req="Ticket on unresolved query"  metric={`${tickets} raised`}                                                               pass={true} />
                <ReqRow id="NFR-004" req="Admin monitoring dashboard"  metric="Active"                                                                            pass={true} />
              </tbody>
            </table>
          </div>

        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}