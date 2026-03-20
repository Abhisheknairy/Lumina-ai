/**
 * AppLayout — Dark Luxury Unified Sidebar
 * Matches Landing/Login: #0b0b0d bg, #c8a96e gold, Playfair + DM Sans
 */
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare, BarChart2, Users, ShieldCheck,
  Plus, ChevronLeft, ChevronRight, LogOut,
  Moon, Sun, ChevronDown, TrendingUp, Clock,
  Database, MessageCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const SUPER_ADMIN_EMAIL = 'n.abhishek@isteer.com';
const W = 236;

function isUUID(s) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || ''); }
function nameFromEmail(e) {
  if (!e) return '';
  return e.split('@')[0].replace(/_/g, '.').split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}
function resolved(dn, em) { return (dn && !isUUID(dn)) ? dn : nameFromEmail(em); }
function initials(dn, em) {
  const n = resolved(dn, em).trim(); if (!n) return '?';
  const w = n.split(/\s+/);
  return w.length >= 2 ? (w[0][0] + w[w.length - 1][0]).toUpperCase() : w[0][0].toUpperCase();
}
// Deterministic hue from name string
function nameHue(name) { return name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360; }

export default function AppLayout({
  userId, displayName = '', userEmail = '', role = 'user',
  profileLoading = false, children,
  onNewChat, sessionHistory = [], sessionsLoading = false,
  activeSessionId = null, onLoadSession,
  analyticsData = null,
}) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [open,        setOpen]        = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  const path         = location.pathname;
  const isChat       = path === '/chat';
  const isAnalytics  = path === '/analytics';
  const isCollab     = path === '/collaboration';
  const isAdmin      = path === '/admin';

  const isSA  = role === 'super_admin' || userEmail === SUPER_ADMIN_EMAIL;
  const isAdm = role === 'super_admin' || role === 'admin';
  const name  = resolved(displayName, userEmail);
  const ini   = profileLoading ? '·' : initials(displayName, userEmail);
  const hue   = nameHue(name || userEmail || 'L');

  const NAV = [
    { id: 'chat',  label: 'Chat',          icon: MessageSquare, href: `/chat?user_id=${userId}`,          active: isChat },
    { id: 'an',    label: 'Analytics',     icon: BarChart2,     href: `/analytics?user_id=${userId}`,     active: isAnalytics },
    ...(isAdm ? [{ id: 'co', label: 'Collaboration', icon: Users, href: `/collaboration?user_id=${userId}`, active: isCollab }] : []),
    ...(isSA  ? [{ id: 'ad', label: 'Admin',         icon: ShieldCheck, href: `/admin?user_id=${userId}`, active: isAdmin, gold: true }] : []),
  ];

  const personal = sessionHistory.filter(s => !s.is_shared);
  const shared   = sessionHistory.filter(s =>  s.is_shared);

  // analytics quick stats
  const totalQ  = analyticsData?.total_queries           ?? 0;
  const deflect = analyticsData?.deflection_rate_percent ?? 0;
  const avgMs   = analyticsData?.avg_response_time_ms    ?? 0;
  const avgDisp = avgMs >= 1000 ? `${(avgMs/1000).toFixed(1)}s` : `${Math.round(avgMs)}ms`;

  const pageLabel = isChat ? 'Chat' : isAnalytics ? 'Analytics' : isCollab ? 'Collaboration' : isAdmin ? 'Admin' : 'Lumina AI';

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* ── Film grain ── */}
      <div className="grain-overlay" />

      {/* ── SIDEBAR ─────────────────────────────────────────────── */}
      <div style={{
        width: open ? W : 0, flexShrink: 0,
        background: 'var(--bg-2)',
        borderRight: '1px solid var(--border-sub)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', position: 'relative',
        transition: 'width 0.22s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{ width: W, height: '100%', display: 'flex', flexDirection: 'column', opacity: open ? 1 : 0, transition: 'opacity 0.15s', pointerEvents: open ? 'auto' : 'none' }}>

          {/* Logo */}
          <div style={{ padding: '18px 14px 10px', flexShrink: 0 }}>
            <button
              onClick={() => navigate(`/chat?user_id=${userId}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: '5px 7px', borderRadius: 7, width: '100%', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{ width: 24, height: 24, background: 'var(--gold)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 13 13" fill="none"><path d="M2.5 10.5L6.5 2.5L10.5 10.5" stroke="#0b0b0d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>Lumina AI</span>
            </button>
          </div>

          {/* Nav */}
          <nav style={{ padding: '2px 8px 6px', flexShrink: 0 }}>
            {NAV.map(item => (
              <button key={item.id} onClick={() => navigate(item.href)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 7, border: 'none', marginBottom: 2,
                  fontSize: 13, fontWeight: item.active ? 500 : 400,
                  cursor: 'pointer', textAlign: 'left',
                  background: item.active ? 'rgba(200,169,110,0.1)' : 'transparent',
                  color: item.active ? 'var(--gold)' : item.gold ? 'var(--purple)' : 'var(--text-2)',
                  transition: 'all 0.12s',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={e => { if (!item.active) { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-1)'; } }}
                onMouseLeave={e => { if (!item.active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = item.gold ? 'var(--purple)' : 'var(--text-2)'; } }}
              >
                <item.icon size={14} />
                {item.label}
                {item.gold && <span style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: 'var(--purple)' }} />}
              </button>
            ))}
          </nav>

          <div style={{ height: 1, background: 'var(--border-sub)', margin: '4px 14px 8px', flexShrink: 0 }} />

          {/* Context section */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>

            {isChat && (
              <>
                <button onClick={onNewChat} className="btn-ghost"
                  style={{ width: '100%', marginBottom: 10, fontSize: 12, padding: '6px 10px', justifyContent: 'flex-start' }}>
                  <Plus size={13} /> New conversation
                </button>

                {sessionsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                    <div style={{ width: 14, height: 14, border: '1.5px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  </div>
                ) : sessionHistory.length === 0 ? (
                  <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', padding: '16px 8px', fontFamily: 'var(--font-body)' }}>No conversations yet</p>
                ) : (
                  <>
                    {personal.length > 0 && (
                      <>
                        <p className="section-label" style={{ padding: '0 6px 5px' }}>Conversations</p>
                        {personal.map(s => <SessBtn key={s.id} s={s} active={activeSessionId === s.id} onLoad={onLoadSession} />)}
                      </>
                    )}
                    {shared.length > 0 && (
                      <>
                        <p className="section-label" style={{ padding: '10px 6px 5px', color: 'var(--teal)', borderTop: personal.length > 0 ? '1px solid var(--border-sub)' : 'none', marginTop: personal.length > 0 ? 8 : 0 }}>Shared</p>
                        {shared.map(s => <SessBtn key={s.id} s={s} active={activeSessionId === s.id} onLoad={onLoadSession} shared />)}
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {isAnalytics && (
              <>
                <p className="section-label" style={{ padding: '0 6px 8px' }}>Overview</p>
                {[
                  { icon: MessageCircle, label: 'Queries',    val: analyticsData ? String(totalQ)            : '—' },
                  { icon: TrendingUp,    label: 'Deflection', val: analyticsData ? `${deflect.toFixed(1)}%`  : '—' },
                  { icon: Clock,         label: 'Avg resp.',  val: analyticsData ? avgDisp                   : '—' },
                ].map(c => (
                  <div key={c.label} style={{ padding: '10px 11px', background: 'var(--bg-3)', border: '1px solid var(--border-sub)', borderRadius: 7, marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                      <c.icon size={11} style={{ color: 'var(--gold)' }} />
                      <span className="section-label">{c.label}</span>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-1)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{c.val}</span>
                  </div>
                ))}
              </>
            )}

            {isCollab && (
              <>
                <p className="section-label" style={{ padding: '0 6px 8px' }}>Knowledge Bases</p>
                <div style={{ padding: '11px 12px', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', borderRadius: 7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <Database size={11} style={{ color: 'var(--gold)' }} />
                    <span className="section-label">Create &amp; manage</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
                    Share Drive folders with your team as searchable knowledge bases.
                  </p>
                </div>
              </>
            )}

            {isAdmin && (
              <>
                <p className="section-label" style={{ padding: '0 6px 8px', color: 'var(--purple)' }}>Super Admin</p>
                <div style={{ padding: '11px 12px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <ShieldCheck size={11} style={{ color: 'var(--purple)' }} />
                    <span className="section-label" style={{ color: 'var(--purple)' }}>Protected zone</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
                    Manage users, roles, KBs and audit logs.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* User bottom */}
          <div style={{ flexShrink: 0, padding: '8px', borderTop: '1px solid var(--border-sub)' }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setProfileOpen(!profileOpen)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `hsl(${hue},45%,40%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{ini}</div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}>{profileLoading ? '…' : (name || 'Account')}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}>{userEmail}</p>
                </div>
                <ChevronDown size={12} style={{ color: 'var(--text-3)', flexShrink: 0, transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>

              {profileOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setProfileOpen(false)} />
                  <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-sub)' }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)', margin: '0 0 2px', fontFamily: 'var(--font-body)' }}>{name || 'Account'}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-3)', margin: 0, fontFamily: 'var(--font-body)' }}>{userEmail}</p>
                      {isSA && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 10, color: 'var(--purple)', background: 'rgba(167,139,250,0.1)', padding: '2px 7px', borderRadius: 4, fontFamily: 'var(--font-body)' }}><ShieldCheck size={9} />Super Admin</span>}
                    </div>
                    <button onClick={() => { toggleTheme(); setProfileOpen(false); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-body)', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      {isDark ? <Sun size={13} /> : <Moon size={13} />}
                      {isDark ? 'Light mode' : 'Dark mode'}
                    </button>
                    <button onClick={() => { setProfileOpen(false); navigate('/'); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--danger)', fontFamily: 'var(--font-body)', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-dim)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <LogOut size={13} /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Collapse handle */}
        <button onClick={() => setOpen(!open)}
          style={{ position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)', width: 20, height: 32, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'background 0.12s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-2)'}>
          {open ? <ChevronLeft size={11} style={{ color: 'var(--text-3)' }} /> : <ChevronRight size={11} style={{ color: 'var(--text-3)' }} />}
        </button>
      </div>

      {/* ── MAIN AREA ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Slim topbar */}
        <div style={{ height: 42, flexShrink: 0, background: 'var(--bg-2)', borderBottom: '1px solid var(--border-sub)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!open && (
              <button onClick={() => setOpen(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 5, color: 'var(--text-3)', display: 'flex' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; }}>
                <ChevronRight size={14} />
              </button>
            )}
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 500, color: 'var(--text-2)', fontStyle: 'italic' }}>{pageLabel}</span>
          </div>
          {!open && (
            <button onClick={toggleTheme}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 5, color: 'var(--text-3)', display: 'flex' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; }}>
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>{children}</div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function SessBtn({ s, active, onLoad, shared = false }) {
  return (
    <button onClick={() => onLoad?.(s)}
      style={{
        width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        padding: '6px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', marginBottom: 1,
        background: active ? 'rgba(200,169,110,0.1)' : 'transparent',
        transition: 'background 0.1s', textAlign: 'left',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-3)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
      <span style={{ fontSize: 12, fontWeight: active ? 500 : 400, color: active ? 'var(--gold)' : 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', fontFamily: 'var(--font-body)' }}>
        {s.session_name || 'Untitled'}
      </span>
      <span style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1, fontFamily: 'var(--font-body)' }}>
        {shared ? `Shared · ${s.kb_name || s.folder_name || 'KB'}` : (s.folder_name || 'Drive')}
      </span>
    </button>
  );
}