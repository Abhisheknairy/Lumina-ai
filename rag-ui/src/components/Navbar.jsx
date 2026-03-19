import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare, BarChart2, Moon, Sun,
  ShieldCheck, Users, LogOut, ChevronDown, Menu
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

function safeDisplayName(name) {
  if (!name) return '';
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name) ? '' : name;
}

function nameFromEmail(email) {
  if (!email) return '';
  const local = email.split('@')[0];
  return local
    .replace(/_/g, '.')
    .split('.')
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

function getInitials(name, email) {
  const src = (safeDisplayName(name) || nameFromEmail(email)).trim();
  if (!src) return '?';
  const words = src.split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  return words[0][0].toUpperCase();
}

const SUPER_ADMIN_EMAIL = 'n.abhishek@isteer.com';

export default function Navbar({
  userId, displayName, userEmail, role,
  profileLoading = false, onMenuToggle, showMenuButton = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);

  const path         = location.pathname;
  const safeName     = safeDisplayName(displayName);
  const resolvedName = safeName || nameFromEmail(userEmail);
  const initials     = profileLoading ? '·' : getInitials(displayName, userEmail);
  const isSuperAdmin   = role === 'super_admin' || userEmail === SUPER_ADMIN_EMAIL;
  const isAdminOrAbove = role === 'super_admin' || role === 'admin';

  const tabs = [
    { id: 'chat',      label: 'Chat',          icon: MessageSquare, href: `/chat?user_id=${userId}`,          active: path === '/chat' },
    { id: 'analytics', label: 'Analytics',     icon: BarChart2,     href: `/analytics?user_id=${userId}`,     active: path === '/analytics' },
    ...(isAdminOrAbove ? [{ id: 'collab', label: 'Collaboration', icon: Users,       href: `/collaboration?user_id=${userId}`, active: path === '/collaboration' }] : []),
    ...(isSuperAdmin   ? [{ id: 'admin',  label: 'Admin',         icon: ShieldCheck, href: `/admin?user_id=${userId}`,        active: path === '/admin', isPurple: true }] : []),
  ];

  return (
    <header style={{
      height: 52,
      background: 'var(--bg-2)',
      borderBottom: '1px solid var(--border-sub)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      flexShrink: 0,
      zIndex: 50,
      boxShadow: 'var(--shadow-sm)',
    }}>

      {/* Left — wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {showMenuButton && (
          <button
            onClick={onMenuToggle}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 5, borderRadius: 6, color: 'var(--text-3)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; }}
          >
            <Menu size={16} />
          </button>
        )}
        <button
          onClick={() => navigate(`/chat?user_id=${userId}`)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {/* Notion-style logo: small black square */}
          <div style={{
            width: 24, height: 24,
            background: 'var(--text-1)',
            borderRadius: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2.5 10.5L6.5 2.5L10.5 10.5" stroke="var(--bg-2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
            Lumina AI
          </span>
        </button>
      </div>

      {/* Center — tabs */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.href)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 11px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: tab.active ? 500 : 400,
              border: 'none',
              cursor: 'pointer',
              background: tab.active ? 'var(--bg-3)' : 'transparent',
              color: tab.active ? 'var(--text-1)' : 'var(--text-2)',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => {
              if (!tab.active) {
                e.currentTarget.style.background = 'var(--bg-3)';
                e.currentTarget.style.color = 'var(--text-1)';
              }
            }}
            onMouseLeave={e => {
              if (!tab.active) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-2)';
              }
            }}
          >
            <tab.icon size={14} />
            {tab.label}
            {tab.isPurple && (
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--purple)', flexShrink: 0 }} />
            )}
          </button>
        ))}
      </nav>

      {/* Right — theme + profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to light' : 'Switch to dark'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: 'var(--text-3)', display: 'flex' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; }}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 2px' }} />

        {/* Profile */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '4px 8px 4px 4px',
              borderRadius: 7,
              background: 'none', border: 'none', cursor: 'pointer',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            {/* Avatar */}
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 600, color: '#fff', flexShrink: 0,
            }}>
              {profileLoading ? '·' : initials}
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profileLoading ? '...' : (resolvedName || 'Account')}
            </span>
            <ChevronDown size={12} style={{ color: 'var(--text-3)' }} />
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setProfileOpen(false)} />
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 50,
                width: 210,
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: 'var(--shadow-md)',
              }}>
                {/* User info */}
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-sub)' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>
                    {resolvedName || 'Account'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {userEmail}
                  </p>
                  {isSuperAdmin && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      marginTop: 7, fontSize: 11, fontWeight: 500,
                      color: 'var(--purple)',
                      background: 'rgba(109,40,217,0.08)',
                      padding: '2px 7px', borderRadius: 4,
                    }}>
                      <ShieldCheck size={10} /> Super Admin
                    </span>
                  )}
                </div>
                {/* Sign out */}
                <button
                  onClick={() => { setProfileOpen(false); navigate('/'); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                    padding: '10px 14px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--danger)', fontSize: 13,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-dim)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}