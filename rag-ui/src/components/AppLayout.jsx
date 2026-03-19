/**
 * AppLayout — Unified sidebar navigation (Notion/Linear style)
 *
 * Structure:
 *   ┌──────────────────────────────────────┐
 *   │ Sidebar (240px)  │  Content area      │
 *   │                  │                    │
 *   │  [Logo + title]  │  [Slim topbar with  │
 *   │  ──────────────  │   theme + profile] │
 *   │  Nav links       │                    │
 *   │  ──────────────  │  <children />      │
 *   │  Context section │                    │
 *   │  (chats / KBs)   │                    │
 *   │  ──────────────  │                    │
 *   │  User info       │                    │
 *   └──────────────────────────────────────┘
 *
 * The Navbar (top bar with tabs) is removed entirely.
 * Navigation lives in the sidebar. The top bar is a slim strip
 * with only theme toggle + profile dropdown.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare, BarChart2, Users, ShieldCheck,
  Plus, ChevronLeft, ChevronRight, LogOut,
  Moon, Sun, ChevronDown, MessageCircle,
  TrendingUp, Clock, Database, Trash2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';


// ── Helpers ───────────────────────────────────────────────────────────
function isUUID(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || '');
}
function nameFromEmail(email) {
  if (!email) return '';
  return email.split('@')[0]
    .replace(/_/g, '.')
    .split('.')
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}
function resolvedName(displayName, email) {
  return (displayName && !isUUID(displayName)) ? displayName : nameFromEmail(email);
}
function initials(displayName, email) {
  const name = resolvedName(displayName, email).trim();
  if (!name) return '?';
  const words = name.split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  return words[0][0].toUpperCase();
}

const SUPER_ADMIN_EMAIL = 'n.abhishek@isteer.com';
const SIDEBAR_W = 240;

export default function AppLayout({
  userId,
  displayName   = '',
  userEmail     = '',
  role          = 'user',
  profileLoading = false,
  children,
  // Chat context
  onNewChat,
  sessionHistory    = [],
  sessionsLoading   = false,
  activeSessionId   = null,
  onLoadSession,
  onDeleteSession, // <--- ADD THIS RIGHT HERE
  // Analytics context
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

  const isSuperAdmin   = role === 'super_admin' || userEmail === SUPER_ADMIN_EMAIL;
  const isAdminOrAbove = role === 'super_admin' || role === 'admin';

  const name = resolvedName(displayName, userEmail);
  const ini  = profileLoading ? '·' : initials(displayName, userEmail);

  // Nav links
  const NAV = [
    { id: 'chat',      label: 'Chat',          icon: MessageSquare, href: `/chat?user_id=${userId}`,          active: isChat      },
    { id: 'analytics', label: 'Analytics',     icon: BarChart2,     href: `/analytics?user_id=${userId}`,     active: isAnalytics  },
    ...(isAdminOrAbove ? [{
      id: 'collab',    label: 'Collaboration', icon: Users,         href: `/collaboration?user_id=${userId}`, active: isCollab,
    }] : []),
    ...(isSuperAdmin ? [{
      id: 'admin',     label: 'Admin',         icon: ShieldCheck,   href: `/admin?user_id=${userId}`,         active: isAdmin, isAdmin: true,
    }] : []),
  ];

  // Analytics quick stats
  const totalQ   = analyticsData?.total_queries            ?? 0;
  const deflect  = analyticsData?.deflection_rate_percent  ?? 0;
  const avgMs    = analyticsData?.avg_response_time_ms     ?? 0;
  const avgDisp  = avgMs >= 1000 ? `${(avgMs / 1000).toFixed(1)}s` : `${Math.round(avgMs)}ms`;

  // Shared / personal sessions split
  const personal = sessionHistory.filter(s => !s.is_shared);
  const shared   = sessionHistory.filter(s =>  s.is_shared);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ── SIDEBAR ──────────────────────────────────────────────── */}
      <div style={{
        width: open ? SIDEBAR_W : 0,
        flexShrink: 0,
        background: 'var(--bg-2)',
        borderRight: '1px solid var(--border-sub)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.2s ease',
        position: 'relative',
      }}>
        {/* Inner wrapper — keeps content at fixed width so it doesn't squash during animation */}
        <div style={{
          width: SIDEBAR_W,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          opacity: open ? 1 : 0,
          transition: 'opacity 0.15s',
          pointerEvents: open ? 'auto' : 'none',
        }}>

          {/* ── Logo ─────────────────────────────────────────────── */}
          <div style={{ padding: '16px 14px 10px', flexShrink: 0 }}>
            <button
              onClick={() => navigate(`/chat?user_id=${userId}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 7, width: '100%', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{ width: 26, height: 26, background: 'var(--text-1)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M2.5 10.5L6.5 2.5L10.5 10.5" stroke="var(--bg-2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
                Lumina AI
              </span>
            </button>
          </div>

          {/* ── Nav links ─────────────────────────────────────────── */}
          <nav style={{ padding: '4px 8px', flexShrink: 0 }}>
            {NAV.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.href)}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '7px 9px',
                  borderRadius: 7,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: item.active ? 500 : 400,
                  cursor: 'pointer',
                  marginBottom: 1,
                  background: item.active ? 'var(--bg-3)' : 'transparent',
                  color: item.active ? 'var(--text-1)' : item.isAdmin ? 'var(--purple)' : 'var(--text-2)',
                  transition: 'all 0.1s',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { if (!item.active) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-1)'; } }}
                onMouseLeave={e => { if (!item.active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = item.isAdmin ? 'var(--purple)' : 'var(--text-2)'; } }}
              >
                <item.icon size={15} />
                {item.label}
                {item.isAdmin && (
                  <span style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: 'var(--purple)', flexShrink: 0 }} />
                )}
              </button>
            ))}
          </nav>

          <div style={{ height: 1, background: 'var(--border-sub)', margin: '6px 14px', flexShrink: 0 }} />

          {/* ── Context section ───────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>

            {/* CHAT: new chat + session list */}
            {isChat && (
              <>
                <button
                  onClick={onNewChat}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 9px', marginBottom: 10,
                    background: 'none', border: '1px solid var(--border)',
                    borderRadius: 7, cursor: 'pointer',
                    fontSize: 13, fontWeight: 500, color: 'var(--text-2)',
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-2)'; }}
                >
                  <Plus size={14} /> New conversation
                </button>

                {sessionsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                    <div style={{ width: 15, height: 15, border: '1.5px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  </div>
                ) : sessionHistory.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '20px 8px' }}>
                    No conversations yet
                  </p>
                ) : (
                  <>
                    {personal.length > 0 && (
                      <>
                        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '0 6px 5px' }}>
                          Conversations
                        </p>
                        {personal.map(s => (
  <SessionBtn key={s.id} session={s} active={activeSessionId === s.id} onLoad={onLoadSession} onDelete={onDeleteSession} />
))}
                      </>
                    )}
                    {shared.length > 0 && (
                      <>
                        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '10px 6px 5px', borderTop: personal.length > 0 ? '1px solid var(--border-sub)' : 'none', marginTop: personal.length > 0 ? 8 : 0 }}>
                          Shared
                        </p>
                        {shared.map(s => (
  <SessionBtn key={s.id} session={s} active={activeSessionId === s.id} onLoad={onLoadSession} isShared onDelete={onDeleteSession} />
))}
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* ANALYTICS: quick stat cards */}
            {isAnalytics && (
              <>
                <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '0 6px 8px' }}>
                  Quick overview
                </p>
                {[
                  { icon: MessageCircle, label: 'Queries',      value: analyticsData ? String(totalQ)            : '—', color: 'var(--accent)'  },
                  { icon: TrendingUp,    label: 'Deflection',   value: analyticsData ? `${deflect.toFixed(1)}%`  : '—', color: 'var(--success)' },
                  { icon: Clock,         label: 'Avg response', value: analyticsData ? avgDisp                   : '—', color: 'var(--purple)'  },
                ].map(card => (
                  <div key={card.label} style={{ padding: '10px 11px', background: 'var(--bg-3)', borderRadius: 7, border: '1px solid var(--border-sub)', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                      <card.icon size={12} style={{ color: card.color }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{card.label}</span>
                    </div>
                    <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.025em' }}>{card.value}</span>
                  </div>
                ))}
              </>
            )}

            {/* COLLABORATION: hint */}
            {isCollab && (
              <>
                <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '0 6px 8px' }}>
                  Knowledge bases
                </p>
                <div style={{ padding: '10px 11px', background: 'var(--bg-3)', borderRadius: 7, border: '1px solid var(--border-sub)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Database size={12} style={{ color: 'var(--teal)' }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>Create &amp; manage</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>
                    Share Drive folders with your team as searchable knowledge bases.
                  </p>
                </div>
              </>
            )}

            {/* ADMIN: hint */}
            {isAdmin && (
              <>
                <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '0 6px 8px' }}>
                  Super admin
                </p>
                <div style={{ padding: '10px 11px', background: 'rgba(109,40,217,0.06)', borderRadius: 7, border: '1px solid rgba(109,40,217,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <ShieldCheck size={12} style={{ color: 'var(--purple)' }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--purple)' }}>Protected zone</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>
                    Manage users, roles, KBs and audit logs.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* ── User info (bottom) ─────────────────────────────────── */}
          <div style={{ flexShrink: 0, padding: '8px', borderTop: '1px solid var(--border-sub)' }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 8px', borderRadius: 8,
                  background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                {/* Avatar */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0,
                }}>
                  {ini}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profileLoading ? '…' : (name || 'Account')}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--text-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {userEmail}
                  </p>
                </div>
                <ChevronDown size={13} style={{ color: 'var(--text-3)', flexShrink: 0, transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>

              {/* Profile popup — opens UPWARD */}
              {profileOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setProfileOpen(false)} />
                  <div style={{
                    position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50,
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-md)',
                  }}>
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-sub)' }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)', margin: '0 0 2px' }}>{name || 'Account'}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</p>
                      {isSuperAdmin && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 10, fontWeight: 500, color: 'var(--purple)', background: 'rgba(109,40,217,0.08)', padding: '2px 7px', borderRadius: 4 }}>
                          <ShieldCheck size={9} /> Super Admin
                        </span>
                      )}
                    </div>
                    {/* Theme toggle */}
                    <button
                      onClick={() => { toggleTheme(); setProfileOpen(false); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-2)', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      {isDark ? <Sun size={13} /> : <Moon size={13} />}
                      {isDark ? 'Light mode' : 'Dark mode'}
                    </button>
                    {/* Sign out */}
                    <button
                      onClick={() => { setProfileOpen(false); navigate('/'); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--danger)', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-dim)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <LogOut size={13} /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Collapse handle */}
        <button
          onClick={() => setOpen(!open)}
          style={{
            position: 'absolute', right: -11, top: '50%', transform: 'translateY(-50%)',
            width: 22, height: 36, background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10, transition: 'background 0.1s',
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

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Slim top bar — page title + theme (collapsed sidebar shows open button) */}
        <div style={{
          height: 44, flexShrink: 0,
          background: 'var(--bg-2)',
          borderBottom: '1px solid var(--border-sub)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!open && (
              <button
                onClick={() => setOpen(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 5, color: 'var(--text-3)', display: 'flex' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; }}
              >
                <ChevronRight size={15} />
              </button>
            )}
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>
              {isChat       ? 'Chat'
               : isAnalytics ? 'Analytics'
               : isCollab    ? 'Collaboration'
               : isAdmin     ? 'Admin'
               : 'Lumina AI'}
            </span>
          </div>
          {/* Theme toggle in topbar when sidebar is collapsed */}
          {!open && (
            <button
              onClick={toggleTheme}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: 'var(--text-3)', display: 'flex' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; }}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          )}
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {children}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Session button ─────────────────────────────────────────────────────
function SessionBtn({ session, active, onLoad, isShared = false, onDelete }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={() => onLoad?.(session)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 9px', borderRadius: 6, cursor: 'pointer',
        background: active ? 'var(--bg-3)' : 'transparent',
        marginBottom: 1, transition: 'background 0.1s',
      }}
      onMouseEnter={e => { 
        setIsHovered(true);
        if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; 
      }}
      onMouseLeave={e => { 
        setIsHovered(false);
        if (!active) e.currentTarget.style.background = 'transparent'; 
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
        <span style={{
          fontSize: 12, fontWeight: active ? 500 : 400,
          color: active ? 'var(--text-1)' : 'var(--text-2)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: '100%', display: 'block',
        }}>
          {session.session_name || 'Untitled'}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>
          {isShared
            ? `Shared · ${session.kb_name || session.folder_name || 'KB'}`
            : (session.folder_name || 'Drive')
          }
        </span>
      </div>

      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevents the chat from loading when clicking delete
            onDelete(session.id);
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-3)',
            transition: 'all 0.15s ease',
            opacity: isHovered ? 1 : 0, // Only visible on hover
            transform: isHovered ? 'scale(1)' : 'scale(0.9)',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
          title="Delete conversation"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}