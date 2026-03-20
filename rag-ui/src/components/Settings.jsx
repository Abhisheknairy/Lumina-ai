import { useState, useEffect, useRef } from 'react';
import {
  X, Sun, Moon, User, Mail, ShieldCheck, Bell,
  Monitor, Palette, Info, Check, Plug, Link2, Eye, EyeOff, CheckCircle2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const SUPER_ADMIN_EMAILS = ['n.abhishek@isteer.com', 'debasis.sahoo@isteer.com'];

function isUUID(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || '');
}
function nameFromEmail(e) {
  if (!e) return '';
  return e.split('@')[0].replace(/_/g, '.').split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}
function resolvedName(dn, em) {
  return (dn && !isUUID(dn)) ? dn : nameFromEmail(em);
}
function nameHue(name) {
  return name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
}
function getInitials(dn, em) {
  const n = resolvedName(dn, em).trim();
  if (!n) return '?';
  const w = n.split(/\s+/);
  return w.length >= 2 ? (w[0][0] + w[w.length - 1][0]).toUpperCase() : w[0][0].toUpperCase();
}

export default function Settings({ open, onClose, displayName = '', userEmail = '', role = 'user', initialSection = 'appearance' }) {
  const { isDark, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState(initialSection);
  const [drawerWidth, setDrawerWidth] = useState(460);
  const dragRef = useRef(null);

  // Reset to initialSection whenever drawer opens
  useEffect(() => {
    if (open) setActiveSection(initialSection);
  }, [open, initialSection]);

  // Drag-to-resize
  useEffect(() => {
    const MIN_W = 360, MAX_W = 780;
    const onMouseMove = (e) => {
      if (!dragRef.current) return;
      const newW = window.innerWidth - e.clientX;
      setDrawerWidth(Math.min(MAX_W, Math.max(MIN_W, newW)));
    };
    const onMouseUp = () => { dragRef.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  const isSA = role === 'super_admin' || SUPER_ADMIN_EMAILS.includes(userEmail);
  const name = resolvedName(displayName, userEmail);
  const ini = getInitials(displayName, userEmail);
  const hue = nameHue(name || userEmail || 'L');

  // Animate in/out
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [open]);

  // Trap Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open && !mounted) return null;

  const sections = [
    { id: 'appearance',   label: 'Appearance',   icon: Palette },
    { id: 'account',      label: 'Account',      icon: User },
    { id: 'integrations', label: 'Integrations', icon: Plug },
    { id: 'about',        label: 'About',        icon: Info },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 900,
          background: 'rgba(0,0,0,0.45)',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.25s ease',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 901,
        width: drawerWidth,
        maxWidth: '92vw',
        background: 'var(--bg-2)',
        borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transform: mounted ? 'translateX(0)' : 'translateX(100%)',
        transition: mounted ? 'transform 0.28s cubic-bezier(.4,0,.2,1)' : 'transform 0.28s cubic-bezier(.4,0,.2,1)',
        boxShadow: '-12px 0 48px rgba(0,0,0,0.35)',
      }}>

        {/* ── Drag-to-resize handle ── */}
        <div
          onMouseDown={() => { dragRef.current = true; document.body.style.cursor = 'ew-resize'; document.body.style.userSelect = 'none'; }}
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 5,
            cursor: 'ew-resize', zIndex: 10,
            background: 'transparent',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,169,110,0.35)'}
          onMouseLeave={e => { if (!dragRef.current) e.currentTarget.style.background = 'transparent'; }}
          title="Drag to resize"
        />

        {/* ── Header ── */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid var(--border-sub)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{
              margin: 0, fontSize: 16, fontWeight: 600,
              color: 'var(--text-1)', fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
            }}>Settings</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
              Manage your preferences
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 7, borderRadius: 7,
              color: 'var(--text-3)', display: 'flex',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; }}
          >
            <X size={17} />
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* ── Left nav ── */}
          <nav style={{
            width: 140, flexShrink: 0,
            borderRight: '1px solid var(--border-sub)',
            padding: '10px 8px',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            {sections.map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 7,
                  border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                  fontSize: 13, fontFamily: 'var(--font-body)',
                  fontWeight: activeSection === sec.id ? 500 : 400,
                  background: activeSection === sec.id ? 'rgba(200,169,110,0.1)' : 'transparent',
                  color: activeSection === sec.id ? 'var(--gold)' : 'var(--text-2)',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => {
                  if (activeSection !== sec.id) {
                    e.currentTarget.style.background = 'var(--bg-3)';
                    e.currentTarget.style.color = 'var(--text-1)';
                  }
                }}
                onMouseLeave={e => {
                  if (activeSection !== sec.id) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-2)';
                  }
                }}
              >
                <sec.icon size={14} />
                {sec.label}
              </button>
            ))}
          </nav>

          {/* ── Content panel ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>

            {/* ── Appearance ── */}
            {activeSection === 'appearance' && (
              <div>
                <SectionTitle>Theme</SectionTitle>
                <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
                  {[
                    { label: 'Light', icon: Sun,     value: false },
                    { label: 'Dark',  icon: Moon,    value: true  },
                  ].map(opt => {
                    const active = isDark === opt.value;
                    return (
                      <button
                        key={opt.label}
                        onClick={() => { if (isDark !== opt.value) toggleTheme(); }}
                        style={{
                          flex: 1, padding: '14px 12px',
                          borderRadius: 10,
                          border: active ? '1.5px solid var(--gold)' : '1px solid var(--border)',
                          background: active ? 'rgba(200,169,110,0.08)' : 'var(--bg-3)',
                          cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                          transition: 'all 0.15s',
                        }}
                      >
                        <opt.icon size={18} style={{ color: active ? 'var(--gold)' : 'var(--text-3)' }} />
                        <span style={{
                          fontSize: 12, fontWeight: active ? 500 : 400,
                          color: active ? 'var(--gold)' : 'var(--text-2)',
                          fontFamily: 'var(--font-body)',
                        }}>
                          {opt.label}
                        </span>
                        {active && (
                          <span style={{
                            width: 16, height: 16, borderRadius: '50%',
                            background: 'var(--gold)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Check size={10} strokeWidth={3} color="#0b0b0d" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <SectionTitle>Interface</SectionTitle>
                <SettingRow
                  icon={Monitor}
                  label="Compact density"
                  description="Reduce padding for a denser layout"
                >
                  <Toggle />
                </SettingRow>
                <SettingRow
                  icon={Bell}
                  label="Notifications"
                  description="In-app alerts for shared conversations"
                >
                  <Toggle defaultOn />
                </SettingRow>
              </div>
            )}

            {/* ── Account ── */}
            {activeSection === 'account' && (
              <div>
                <SectionTitle>Profile</SectionTitle>
                {/* Avatar card */}
                <div style={{
                  padding: '18px', borderRadius: 12,
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border-sub)',
                  display: 'flex', alignItems: 'center', gap: 16,
                  marginBottom: 24,
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: `hsl(${hue},45%,40%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0,
                    fontFamily: 'var(--font-display)',
                  }}>
                    {ini}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-1)', fontFamily: 'var(--font-display)' }}>
                      {name || 'Account'}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
                      {userEmail}
                    </p>
                    {isSA && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
                        fontSize: 10, fontWeight: 500,
                        color: 'var(--purple)', background: 'rgba(167,139,250,0.1)',
                        padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-body)',
                      }}>
                        <ShieldCheck size={9} /> Super Admin
                      </span>
                    )}
                  </div>
                </div>

                <SectionTitle>Details</SectionTitle>
                <InfoRow icon={User}  label="Display name" value={name || '—'} />
                <InfoRow icon={Mail}  label="Email"        value={userEmail || '—'} />
                <InfoRow icon={ShieldCheck} label="Role"  value={isSA ? 'Super Admin' : role === 'admin' ? 'Admin' : 'User'} />
              </div>
            )}

            {/* ── Integrations ── */}
            {activeSection === 'integrations' && (
              <div>
                <SectionTitle>Ticketing Tool Integration</SectionTitle>
                <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)', marginBottom: 20, lineHeight: 1.6 }}>
                  Connect your ticketing tools to create and track issues directly from Lumina AI.
                </p>

                {/* Jira Card */}
                <ToolCard
                  logo={
                    <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                      <path d="M16.003 2C8.269 2 2 8.268 2 16s6.27 14 14.003 14C23.733 30 30 23.732 30 16S23.733 2 16.003 2z" fill="#2684FF"/>
                      <path d="M21.6 10.4H16l5.6 5.6-5.6 5.6h5.6l5.6-5.6-5.6-5.6z" fill="white"/>
                      <path d="M10.4 10.4H16l-5.6 5.6 5.6 5.6h-5.6L4.8 16l5.6-5.6z" fill="white"/>
                    </svg>
                  }
                  name="Jira"
                  description="Atlassian project & issue tracking"
                  fields={[
                    { key: 'jira_url',      label: 'Jira Base URL',   placeholder: 'https://yourteam.atlassian.net', type: 'text' },
                    { key: 'jira_email',    label: 'Account Email',   placeholder: 'you@company.com',               type: 'text' },
                    { key: 'jira_token',    label: 'API Token',       placeholder: 'Paste your Jira API token',      type: 'password' },
                    { key: 'jira_project',  label: 'Default Project', placeholder: 'e.g. PROJ',                      type: 'text' },
                  ]}
                  docsUrl="https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/"
                  storageKey="lumina_jira"
                />

                <div style={{ height: 1, background: 'var(--border-sub)', margin: '24px 0' }} />

                {/* Appsteer Card */}
                <ToolCard
                  logo={
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M2 10L6.5 2.5L11 10" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  }
                  name="Appsteer"
                  description="In-app feedback & support ticketing"
                  fields={[
                    { key: 'appsteer_url',     label: 'Appsteer URL',    placeholder: 'https://app.appsteer.io',    type: 'text' },
                    { key: 'appsteer_api_key', label: 'API Key',         placeholder: 'Paste your Appsteer API key', type: 'password' },
                    { key: 'appsteer_project', label: 'Project ID',      placeholder: 'e.g. proj_abc123',            type: 'text' },
                  ]}
                  docsUrl="https://appsteer.io/docs"
                  storageKey="lumina_appsteer"
                />
              </div>
            )}

            {/* ── About ── */}
            {activeSection === 'about' && (
              <div>
                <SectionTitle>Application</SectionTitle>
                <div style={{
                  padding: '20px', borderRadius: 12,
                  background: 'var(--bg-3)', border: '1px solid var(--border-sub)',
                  marginBottom: 24, textAlign: 'center',
                }}>
                  <div style={{
                    width: 44, height: 44,
                    background: 'var(--gold)', borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px',
                    boxShadow: '0 8px 24px rgba(200,169,110,0.25)',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 13 13" fill="none">
                      <path d="M2.5 10.5L6.5 2.5L10.5 10.5" stroke="#0b0b0d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-1)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                    Lumina AI
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
                    Intelligent workspace assistant
                  </p>
                </div>

                <SectionTitle>Build info</SectionTitle>
                <InfoRow icon={Info} label="Version"  value="1.0.0" />
                <InfoRow icon={Info} label="Platform" value="Web" />
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-sub)',
          flexShrink: 0,
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px', borderRadius: 8,
              background: 'var(--gold)',
              border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
              color: '#0b0b0d', fontFamily: 'var(--font-body)',
              transition: 'opacity 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ── */

function SectionTitle({ children }) {
  return (
    <p style={{
      margin: '0 0 10px',
      fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: 'var(--text-3)',
      fontFamily: 'var(--font-body)',
    }}>
      {children}
    </p>
  );
}

function SettingRow({ icon: Icon, label, description, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 14px', borderRadius: 9,
      background: 'var(--bg-3)', border: '1px solid var(--border-sub)',
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-1)', fontFamily: 'var(--font-body)' }}>
            {label}
          </p>
          {description && (
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '11px 14px', borderRadius: 9,
      background: 'var(--bg-3)', border: '1px solid var(--border-sub)',
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <Icon size={13} style={{ color: 'var(--text-3)' }} />
        <span style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>{label}</span>
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-1)', fontFamily: 'var(--font-body)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Toggle({ defaultOn = false }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => setOn(!on)}
      style={{
        width: 36, height: 20, borderRadius: 10, border: 'none',
        background: on ? 'var(--gold)' : 'var(--border)',
        cursor: 'pointer', position: 'relative', flexShrink: 0,
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: on ? 18 : 3,
        width: 14, height: 14, borderRadius: '50%',
        background: on ? '#0b0b0d' : 'var(--text-3)',
        transition: 'left 0.2s',
      }} />
    </button>
  );
}

/* ── ToolCard ── */
function ToolCard({ logo, name, description, fields, docsUrl, storageKey }) {
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; }
  })();

  const [values,  setValues]  = useState(stored);
  const [visible, setVisible] = useState({});
  const [saved,   setSaved]   = useState(false);
  const [enabled, setEnabled] = useState(!!stored._enabled);

  const set = (key, val) => setValues(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    const toStore = { ...values, _enabled: enabled };
    localStorage.setItem(storageKey, JSON.stringify(toStore));
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const isConnected = !!stored._enabled && fields.every(f => !!stored[f.key]);

  return (
    <div style={{
      borderRadius: 12,
      border: `1px solid ${isConnected ? 'rgba(200,169,110,0.35)' : 'var(--border-sub)'}`,
      background: 'var(--bg-3)',
      overflow: 'hidden',
      marginBottom: 4,
    }}>
      {/* Header row */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-sub)' }}>
        <div style={{ flexShrink: 0 }}>{logo}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-1)', fontFamily: 'var(--font-display)' }}>{name}</p>
            {isConnected && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 500,
                color: '#4ade80', background: 'rgba(74,222,128,0.1)',
                padding: '2px 7px', borderRadius: 4, fontFamily: 'var(--font-body)',
              }}>
                <CheckCircle2 size={9} /> Connected
              </span>
            )}
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>{description}</p>
        </div>
        {/* Enable toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>{enabled ? 'On' : 'Off'}</span>
          <button
            onClick={() => setEnabled(!enabled)}
            style={{
              width: 36, height: 20, borderRadius: 10, border: 'none',
              background: enabled ? 'var(--gold)' : 'var(--border)',
              cursor: 'pointer', position: 'relative', flexShrink: 0,
              transition: 'background 0.2s',
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: enabled ? 18 : 3,
              width: 14, height: 14, borderRadius: '50%',
              background: enabled ? '#0b0b0d' : 'var(--text-3)',
              transition: 'left 0.2s',
            }} />
          </button>
        </div>
      </div>

      {/* Fields */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fields.map(f => (
          <div key={f.key}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-3)', marginBottom: 5, fontFamily: 'var(--font-body)', letterSpacing: '0.03em' }}>
              {f.label}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={f.type === 'password' && !visible[f.key] ? 'password' : 'text'}
                value={values[f.key] || ''}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: f.type === 'password' ? '8px 36px 8px 11px' : '8px 11px',
                  borderRadius: 7,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-2)',
                  color: 'var(--text-1)',
                  fontSize: 12, fontFamily: 'var(--font-body)',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              {f.type === 'password' && (
                <button
                  onClick={() => setVisible(v => ({ ...v, [f.key]: !v[f.key] }))}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 0 }}
                >
                  {visible[f.key] ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Footer row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <a
            href={docsUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)', textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
          >
            <Link2 size={11} /> How to get API token
          </a>
          <button
            onClick={handleSave}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 7,
              background: saved ? 'rgba(74,222,128,0.15)' : 'var(--gold)',
              border: saved ? '1px solid rgba(74,222,128,0.3)' : 'none',
              cursor: 'pointer',
              fontSize: 12, fontWeight: 500,
              color: saved ? '#4ade80' : '#0b0b0d',
              fontFamily: 'var(--font-body)',
              transition: 'all 0.2s',
            }}
          >
            {saved ? <><CheckCircle2 size={12} /> Saved</> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}