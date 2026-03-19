import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, MessageSquare, TrendingUp, BarChart2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from './Navbar';

export default function AppLayout({
  userId,
  displayName,
  userEmail,
  role = 'user',
  profileLoading = false,
  children,
  onNewChat,
  sessionHistory = [],
  sessionsLoading = false,
  activeSessionId = null,
  onLoadSession,
  analyticsData = null,
}) {
  const location  = useLocation();
  const [open, setOpen] = useState(true);

  const isChat      = location.pathname === '/chat';
  const isAnalytics = location.pathname === '/analytics';

  const totalQueries = analyticsData?.total_queries ?? 0;
  const deflection   = analyticsData?.deflection_rate_percent ?? 0;
  const avgMs        = analyticsData?.avg_response_time_ms ?? 0;

  // ── sidebar width ──────────────────────────────────────────────────
  const sideW = 240;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <div style={{
        width: open ? sideW : 0,
        flexShrink: 0,
        background: 'var(--bg-2)',
        borderRight: '1px solid var(--border-sub)',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}>
        {/* Inner — only visible when open */}
        <div style={{
          width: sideW,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '14px 0 12px',
          opacity: open ? 1 : 0,
          transition: 'opacity 0.15s',
          pointerEvents: open ? 'auto' : 'none',
        }}>

          {/* ── CHAT sidebar ─────────────────────────────────────────── */}
          {isChat && (
            <>
              {/* New chat button */}
              <div style={{ padding: '0 10px', marginBottom: 14 }}>
                <button
                  onClick={onNewChat}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px',
                    background: 'none',
                    border: '1px solid var(--border)',
                    borderRadius: 7,
                    color: 'var(--text-2)',
                    fontSize: 13, fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bg-3)';
                    e.currentTarget.style.color = 'var(--text-1)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = 'var(--text-2)';
                  }}
                >
                  <Plus size={14} />
                  New conversation
                </button>
              </div>

              {/* Section header */}
              <div style={{ padding: '0 14px 6px', marginTop: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Conversations
                </span>
              </div>

              {/* Session list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px' }}>
                {sessionsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 28 }}>
                    <div style={{ width: 16, height: 16, border: '1.5px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  </div>
                ) : sessionHistory.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, padding: '24px 10px' }}>
                    No conversations yet
                  </p>
                ) : (() => {
                  const personal = sessionHistory.filter(s => !s.is_shared);
                  const shared   = sessionHistory.filter(s => s.is_shared);

                  const renderBtn = (s) => {
                    const isActive = activeSessionId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => onLoadSession?.(s)}
                        style={{
                          width: '100%',
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                          padding: '7px 10px',
                          borderRadius: 6,
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          background: isActive ? 'var(--bg-3)' : 'transparent',
                          transition: 'background 0.1s',
                          marginBottom: 1,
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{
                          fontSize: 13,
                          color: isActive ? 'var(--text-1)' : 'var(--text-2)',
                          fontWeight: isActive ? 500 : 400,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          maxWidth: '100%', display: 'block',
                        }}>
                          {s.session_name || 'Untitled'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                          {s.is_shared ? `Shared · ${s.kb_name || s.folder_name || 'KB'}` : (s.folder_name || 'Drive')}
                        </span>
                      </button>
                    );
                  };

                  return (
                    <>
                      {personal.map(renderBtn)}
                      {shared.length > 0 && (
                        <>
                          <div style={{ padding: '10px 10px 4px', borderTop: '1px solid var(--border-sub)', marginTop: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                              Shared
                            </span>
                          </div>
                          {shared.map(renderBtn)}
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            </>
          )}

          {/* ── ANALYTICS sidebar ────────────────────────────────────── */}
          {isAnalytics && (
            <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ padding: '0 4px 8px' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Quick overview
                </span>
              </div>
              {[
                { icon: MessageSquare, label: 'Queries',      value: analyticsData ? String(totalQueries) : '—',     color: 'var(--accent)' },
                { icon: TrendingUp,    label: 'Deflection',   value: analyticsData ? `${deflection.toFixed(1)}%` : '—', color: 'var(--success)' },
                { icon: Clock,         label: 'Avg response', value: analyticsData ? (avgMs >= 1000 ? `${(avgMs / 1000).toFixed(1)}s` : `${Math.round(avgMs)}ms`) : '—', color: 'var(--purple)' },
              ].map(item => (
                <div
                  key={item.label}
                  style={{
                    padding: '11px 13px',
                    background: 'var(--bg-3)',
                    borderRadius: 7,
                    border: '1px solid var(--border-sub)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <item.icon size={12} style={{ color: item.color }} />
                    <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
                      {item.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.025em' }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Collapse handle */}
        <button
          onClick={() => setOpen(!open)}
          style={{
            position: 'absolute', right: -11, top: '50%', transform: 'translateY(-50%)',
            width: 22, height: 36,
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10,
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-2)'}
        >
          {open
            ? <ChevronLeft size={13} style={{ color: 'var(--text-3)' }} />
            : <ChevronRight size={13} style={{ color: 'var(--text-3)' }} />
          }
        </button>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Navbar
          userId={userId}
          displayName={displayName}
          userEmail={userEmail}
          role={role}
          profileLoading={profileLoading}
          onMenuToggle={() => setOpen(!open)}
          showMenuButton={!open}
        />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {children}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}