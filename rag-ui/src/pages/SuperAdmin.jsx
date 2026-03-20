import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, BarChart2, ClipboardList, Database, ShieldCheck, RefreshCw, TrendingUp, MessageSquare, Clock, TicketCheck, Activity, ChevronDown, ChevronUp, Search, CheckCircle, Shield, Plus, X, Save, Loader2, Folder, Calendar } from 'lucide-react';
import { authFetch } from '../utils/api';
import AppLayout from '../components/AppLayout';

const TABS = [
  { id: 'users',    label: 'Users',              icon: Users },
  { id: 'roles',    label: 'Roles & Permissions',icon: Shield },
  { id: 'platform', label: 'Platform Analytics', icon: BarChart2 },
  { id: 'kbs',      label: 'Knowledge Bases',    icon: Database },
  { id: 'audit',    label: 'Audit Log',          icon: ClipboardList },
];

const AVAILABLE_PERMISSIONS = [
  { key: 'can_view_analytics', label: 'View Analytics', desc: 'Can access the Platform Analytics tab.' },
  { key: 'can_manage_kbs',     label: 'Manage KBs',     desc: 'Can create, edit, and delete Knowledge Bases.' },
  { key: 'can_manage_users',   label: 'Manage Users',   desc: 'Can view the user directory and audit logs.' },
  { key: 'can_manage_roles',   label: 'Manage Roles',   desc: 'Can create roles and assign them to users.' },
];

function RoleBadge({ role }) {
  const cfg = {
    super_admin: { label: 'Super Admin', color: 'var(--purple)', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)' },
    admin:       { label: 'Admin',       color: 'var(--gold)',   bg: 'var(--gold-dim)',       border: 'var(--gold-border)' },
    user:        { label: 'User',        color: 'var(--text-3)', bg: 'var(--bg-3)',           border: 'var(--border)' },
  }[role] || { label: role, color: 'var(--text-3)', bg: 'var(--bg-3)', border: 'var(--border)' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, fontFamily: 'var(--font-body)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {cfg.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="lux-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Icon size={14} style={{ color: color || 'var(--gold)' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, letterSpacing: '-0.035em', color: 'var(--text-1)', lineHeight: 1, marginBottom: 8 }}>{value}</span>
      <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>{label}</span>
      {sub && <span style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3, fontFamily: 'var(--font-body)' }}>{sub}</span>}
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso); const diff = Math.floor((Date.now() - d) / 60000);
  if (diff < 1) return 'just now'; if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

export default function SuperAdmin() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const userId         = searchParams.get('user_id');

  const [activeTab,    setActiveTab]    = useState('users');
  const [users,        setUsers]        = useState([]);
  const [roles,        setRoles]        = useState([]);
  const [platform,     setPlatform]     = useState(null);
  const [kbs,          setKbs]          = useState([]);
  const [auditLogs,    setAuditLogs]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [roleLoading,  setRoleLoading]  = useState(null);
  const [sortField,    setSortField]    = useState('last_seen');
  const [sortAsc,      setSortAsc]      = useState(false);
  const [displayName,  setDisplayName]  = useState('');
  const [userEmail,    setUserEmail]    = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [myPermissions, setMyPermissions] = useState({});
  
  // Role Editor Modal
  const [editingRole, setEditingRole] = useState(null);

  useEffect(() => { if (!userId) navigate('/'); }, [userId, navigate]);
  useEffect(() => {
    fetchTab(activeTab);
    if (userId) {
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/get-token/${userId}`)
        .then(r => r.json()).then(d => { 
          if (d.display_name) setDisplayName(d.display_name); 
          if (d.email) setUserEmail(d.email); 
          if (d.permissions) setMyPermissions(d.permissions);
          setProfileLoading(false); 
        }).catch(() => setProfileLoading(false));
    }
  }, [activeTab, userId]);

  const fetchTab = async (tab) => {
    if (!userId) return; setLoading(true);
    try {
      if (tab === 'users') { 
        const [rU, rR] = await Promise.all([authFetch(userId, '/api/admin/users'), authFetch(userId, '/api/admin/roles')]);
        setUsers(Array.isArray(await rU.clone().json()) ? await rU.json() : []);
        setRoles(Array.isArray(await rR.clone().json()) ? await rR.json() : []);
      }
      else if (tab === 'roles')   { const r = await authFetch(userId, '/api/admin/roles');        const d = await r.json(); setRoles(Array.isArray(d) ? d : []); }
      else if (tab === 'platform'){ const r = await authFetch(userId, '/api/admin/analytics');    const d = await r.json(); setPlatform(d); }
      else if (tab === 'kbs')     { const r = await authFetch(userId, '/api/admin/kb-list');      const d = await r.json(); setKbs(Array.isArray(d) ? d : []); }
      else if (tab === 'audit')   { const r = await authFetch(userId, '/api/admin/audit-log?limit=200'); const d = await r.json(); setAuditLogs(Array.isArray(d) ? d : []); }
    } catch {} finally { setLoading(false); }
  };

  const handleUserRoleChange = async (targetUserId, newRoleId) => {
    if (!window.confirm(`Change this user's role?`)) return;
    setRoleLoading(targetUserId);
    try {
      const res = await authFetch(userId, '/api/admin/update-role', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_user_id: targetUserId, new_role_id: parseInt(newRoleId) }) });
      if (res.ok) fetchTab('users');
      else alert('Failed to update role.');
    } catch { alert('Failed to update role.'); } finally { setRoleLoading(null); }
  };

  const saveRole = async (e) => {
    e.preventDefault();
    if (!editingRole.name.trim()) return;
    try {
      const url = editingRole.id ? `/api/admin/roles/${editingRole.id}` : `/api/admin/roles`;
      const method = editingRole.id ? 'PUT' : 'POST';
      const res = await authFetch(userId, url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingRole) });
      if (res.ok) { setEditingRole(null); fetchTab('roles'); }
      else { const d = await res.json(); alert(d.detail || 'Error saving role'); }
    } catch (err) { alert(err.message); }
  };

  const toggleSort = (field) => { if (sortField === field) setSortAsc(p => !p); else { setSortField(field); setSortAsc(false); } };

  const filteredUsers = users
    .filter(u => !search || u.display_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => { const v1 = a[sortField] ?? ''; const v2 = b[sortField] ?? ''; const cmp = typeof v1 === 'number' ? v1 - v2 : String(v1).localeCompare(String(v2)); return sortAsc ? cmp : -cmp; });

  const SortIcon = ({ field }) => { const active = sortField === field; return active ? (sortAsc ? <ChevronUp size={11} style={{ color: 'var(--gold)' }} /> : <ChevronDown size={11} style={{ color: 'var(--gold)' }} />) : <ChevronDown size={11} style={{ opacity: 0.2 }} />; };

  const th = { padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: 'var(--font-body)', background: 'var(--bg-3)', borderBottom: '1px solid var(--border-sub)' };
  const td = { padding: '11px 16px', borderBottom: '1px solid var(--border-sub)', fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-body)', verticalAlign: 'middle' };

  return (
    <AppLayout userId={userId} displayName={displayName} userEmail={userEmail} role="super_admin" profileLoading={profileLoading}>
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg)', fontFamily: 'var(--font-body)' }}>

      <div style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border-sub)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 14px', fontSize: 12, fontWeight: activeTab === tab.id ? 500 : 400, border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--gold)' : '2px solid transparent', background: 'transparent', color: activeTab === tab.id ? 'var(--gold)' : 'var(--text-2)', cursor: 'pointer', transition: 'color 0.12s' }}>
                <tab.icon size={13} /> {tab.label}
              </button>
            ))}
          </div>
          <button className="btn-ghost" onClick={() => fetchTab(activeTab)} style={{ fontSize: 12, padding: '6px 12px' }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      <main style={{ maxWidth: 1140, margin: '0 auto', padding: '28px 28px 56px' }}>

        {/* ── USERS ── */}
        {activeTab === 'users' && (
          <div style={{ animation: 'fadein 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}><div className="gold-line" /><span className="section-label">Directory</span></div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>All Users</h2>
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" className="lux-input" style={{ paddingLeft: 30, width: 240, fontSize: 12 }} />
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--text-3)' }}><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /></div>
            ) : (
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {[{ label: 'User', field: 'display_name' }, { label: 'Role', field: 'role' }, { label: 'Queries', field: 'query_count' }, { label: 'Tickets', field: 'tickets_raised' }, { label: 'Last seen', field: 'last_seen' }, { label: 'Actions', field: null }].map(col => (
                        <th key={col.label} onClick={() => col.field && toggleSort(col.field)} style={{ ...th, cursor: col.field ? 'pointer' : 'default' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{col.label}{col.field && <SortIcon field={col.field} />}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.user_id} style={{ transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: `hsl(${u.display_name?.split('').reduce((a,c)=>a+c.charCodeAt(0),0)%360 || 200},40%,35%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
                              {(u.display_name?.[0] || u.email?.[0] || '?').toUpperCase()}
                            </div>
                            <div>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{u.display_name || '—'}</p>
                              <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td style={td}>
                           <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'var(--gold-dim)', color: 'var(--gold)', border: '1px solid var(--gold-border)', textTransform: 'uppercase' }}>
                            {u.role.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ ...td, fontFamily: 'monospace', color: 'var(--text-1)' }}>{u.query_count}</td>
                        <td style={{ ...td, fontFamily: 'monospace', color: u.tickets_raised > 0 ? 'var(--warn)' : 'var(--text-2)' }}>{u.tickets_raised}</td>
                        <td style={{ ...td, color: 'var(--text-3)' }}>{formatTime(u.last_seen)}</td>
                        <td style={td}>
                          {u.user_id === userId ? (
                            <span style={{ fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic' }}>You (Protected)</span>
                          ) : roleLoading === u.user_id ? (
                            <Loader2 size={12} style={{ color: 'var(--gold)', animation: 'spin 0.7s linear infinite' }} />
                          ) : (
                            <select
                              value={roles.find(r => r.name === u.role)?.id || ''}
                              onChange={(e) => handleUserRoleChange(u.user_id, e.target.value)}
                              disabled={!myPermissions.can_manage_roles}
                              style={{ background: 'var(--bg-3)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 8px', fontSize: 11, cursor: myPermissions.can_manage_roles ? 'pointer' : 'not-allowed' }}
                            >
                              <option value="" disabled>Select role...</option>
                              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
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

        {/* ── ROLES MANAGER ── */}
        {activeTab === 'roles' && (
          <div style={{ animation: 'fadein 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}><div className="gold-line" /><span className="section-label">Access Control</span></div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>Roles & Permissions</h2>
              </div>
              {myPermissions.can_manage_roles && (
                <button className="btn-gold" onClick={() => setEditingRole({ name: '', description: '', permissions: {} })}>
                  <Plus size={13} /> Create Role
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--text-3)' }}><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                {roles.map(role => (
                  <div key={role.id} className="lux-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Shield size={14} style={{ color: 'var(--gold)' }} />
                        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{role.name}</span>
                      </div>
                      {role.is_system && <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', background: 'var(--bg-3)', color: 'var(--text-3)', borderRadius: 4, border: '1px solid var(--border)' }}>SYSTEM</span>}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 16px', minHeight: 36 }}>{role.description}</p>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                      {AVAILABLE_PERMISSIONS.map(p => (
                        <span key={p.key} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: `1px solid ${role.permissions[p.key] ? 'var(--success-bdr)' : 'var(--border)'}`, background: role.permissions[p.key] ? 'var(--success-dim)' : 'var(--bg-3)', color: role.permissions[p.key] ? 'var(--success)' : 'var(--text-3)' }}>
                          {p.label}
                        </span>
                      ))}
                    </div>

                    {myPermissions.can_manage_roles && (
                      <button onClick={() => setEditingRole(role)} className="btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
                        Edit Permissions
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal for Editing Roles */}
        {editingRole && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 500, boxShadow: 'var(--shadow-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-sub)' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>{editingRole.id ? 'Edit Role' : 'Create Role'}</span>
                <button onClick={() => setEditingRole(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><X size={16} /></button>
              </div>
              <form onSubmit={saveRole} style={{ padding: 20 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>Role Name</label>
                  <input value={editingRole.name} onChange={e => setEditingRole(p => ({ ...p, name: e.target.value }))} disabled={editingRole.is_system && (editingRole.name === 'Super Admin' || editingRole.name === 'User')} className="lux-input" required />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>Description</label>
                  <input value={editingRole.description} onChange={e => setEditingRole(p => ({ ...p, description: e.target.value }))} className="lux-input" />
                </div>
                
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 10 }}>Permissions</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {AVAILABLE_PERMISSIONS.map(p => (
                    <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={editingRole.permissions[p.key] || false} onChange={e => setEditingRole(prev => ({ ...prev, permissions: { ...prev.permissions, [p.key]: e.target.checked } }))} style={{ accentColor: 'var(--gold)' }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', margin: 0 }}>{p.label}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>{p.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setEditingRole(null)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                  <button type="submit" className="btn-gold" style={{ flex: 1, justifyContent: 'center' }}><Save size={13} /> Save Role</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── PLATFORM ANALYTICS ── */}
        {activeTab === 'platform' && (
          <div style={{ animation: 'fadein 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}><div className="gold-line" /><span className="section-label">Platform</span></div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-1)', margin: '0 0 24px' }}>Platform Analytics</h2>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--text-3)', gap: 10 }}>
                <div style={{ width: 14, height: 14, border: '1.5px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                <span style={{ fontSize: 12 }}>Loading…</span>
              </div>
            ) : platform && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                  <StatCard icon={Users}          label="Total users"      value={platform.total_users}      />
                  <StatCard icon={MessageSquare}  label="Total queries"    value={platform.total_queries}    />
                  <StatCard icon={TicketCheck}    label="Tickets raised"   value={platform.tickets_raised}   color="var(--warn)" />
                  <StatCard icon={Database}       label="Knowledge bases"  value={platform.total_knowledge_bases} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div className="lux-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <TrendingUp size={13} style={{ color: 'var(--gold)' }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)' }}>Deflection rate</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: platform.deflection_rate_percent >= 20 ? 'var(--success-dim)' : 'var(--warn-dim)', color: platform.deflection_rate_percent >= 20 ? 'var(--success)' : 'var(--warn)', border: `1px solid ${platform.deflection_rate_percent >= 20 ? 'var(--success-bdr)' : 'var(--warn-bdr)'}` }}>
                        {platform.deflection_rate_percent >= 20 ? '✓ Target met' : '✗ Below target'}
                      </span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, letterSpacing: '-0.035em', color: 'var(--text-1)' }}>{platform.deflection_rate_percent.toFixed(1)}%</span>
                    <div style={{ background: 'var(--bg-3)', borderRadius: 3, height: 4, overflow: 'hidden', marginTop: 16 }}>
                      <div style={{ height: 4, borderRadius: 3, background: 'var(--gold)', width: `${Math.min(platform.deflection_rate_percent, 100)}%`, transition: 'width 0.6s' }} />
                    </div>
                  </div>
                  <div className="lux-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <Clock size={13} style={{ color: 'var(--gold)' }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)' }}>Avg response time</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: platform.avg_response_time_ms <= 3000 ? 'var(--success-dim)' : 'var(--danger-dim)', color: platform.avg_response_time_ms <= 3000 ? 'var(--success)' : 'var(--danger)', border: `1px solid ${platform.avg_response_time_ms <= 3000 ? 'var(--success-bdr)' : 'var(--danger-bdr)'}` }}>
                        {platform.avg_response_time_ms <= 3000 ? '✓ SLA met' : '✗ SLA breach'}
                      </span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, letterSpacing: '-0.035em', color: 'var(--text-1)' }}>{platform.avg_response_time_ms >= 1000 ? `${(platform.avg_response_time_ms/1000).toFixed(1)}s` : `${Math.round(platform.avg_response_time_ms)}ms`}</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
                      {[['SLA breaches', platform.slow_responses_over_3s], ['Total sessions', platform.total_sessions]].map(([lbl, val]) => (
                        <div key={lbl} style={{ padding: '9px 11px', background: 'var(--bg-3)', borderRadius: 7, border: '1px solid var(--border-sub)' }}>
                          <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text-1)', margin: '0 0 2px' }}>{val}</p>
                          <p style={{ fontSize: 10, color: 'var(--text-3)', margin: 0 }}>{lbl}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {platform.timeline && (
                  <div className="lux-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <div className="gold-line" /><span className="section-label">14-day query volume</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 64 }}>
                      {platform.timeline.map((day, i) => {
                        const max = Math.max(...platform.timeline.map(d => d.queries), 1);
                        const h   = Math.max((day.queries / max) * 58, 2);
                        return (
                          <div key={i} title={`${day.date}: ${day.queries}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'default' }}>
                            <div style={{ width: '100%', borderRadius: 3, background: 'var(--gold)', opacity: 0.35, height: h, transition: 'opacity 0.15s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.85'} onMouseLeave={e => e.currentTarget.style.opacity = '0.35'} />
                            {i % 3 === 0 && <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'monospace' }}>{day.date.slice(5)}</span>}
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

        {/* ── KNOWLEDGE BASES ── */}
        {activeTab === 'kbs' && (
          <div style={{ animation: 'fadein 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}><div className="gold-line" /><span className="section-label">Inventory</span></div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-1)', margin: '0 0 24px' }}>All Knowledge Bases</h2>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--text-3)', gap: 10 }}>
                <div style={{ width: 14, height: 14, border: '1.5px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                <span style={{ fontSize: 12 }}>Loading…</span>
              </div>
            ) : kbs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
                <Database size={28} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                <p style={{ fontSize: 13, fontFamily: 'var(--font-body)' }}>No knowledge bases created yet.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
                {kbs.map(kb => (
                  <div key={kb.id} className="lux-card" style={{ opacity: kb.is_active ? 1 : 0.5 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Database size={14} style={{ color: 'var(--gold)' }} />
                        </div>
                        <div style={{ maxWidth: '200px' }}>
                          <p style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kb.name}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 4 }}><Folder size={10} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{kb.folder_name || kb.folder_id}</span></p>
                        </div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-body)', color: kb.is_active ? 'var(--success)' : 'var(--danger)', background: kb.is_active ? 'var(--success-dim)' : 'var(--danger-dim)', border: `1px solid ${kb.is_active ? 'var(--success-bdr)' : 'var(--danger-bdr)'}`, flexShrink: 0 }}>
                        {kb.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {kb.description && <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.55, fontFamily: 'var(--font-body)' }}>{kb.description}</p>}
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: 'var(--text-3)', marginBottom: 12, fontFamily: 'var(--font-body)' }}>
                       <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={10} /> Created {new Date(kb.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border-sub)' }}>
                      {[['Members', kb.member_count], ['Sessions', kb.session_count], ['Creator', kb.created_by?.split('@')[0] || '—']].map(([lbl, val]) => (
                        <div key={lbl} style={{ textAlign: 'center' }}>
                          <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text-1)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={val}>{val}</p>
                          <p style={{ fontSize: 10, color: 'var(--text-3)', margin: 0, fontFamily: 'var(--font-body)' }}>{lbl}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── AUDIT LOG ── */}
        {activeTab === 'audit' && (
          <div style={{ animation: 'fadein 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}><div className="gold-line" /><span className="section-label">Immutable log</span></div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-1)', margin: '0 0 24px' }}>Audit Log</h2>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--text-3)', gap: 10 }}>
                <div style={{ width: 14, height: 14, border: '1.5px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                <span style={{ fontSize: 12 }}>Loading…</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
                <ClipboardList size={28} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                <p style={{ fontSize: 13, fontFamily: 'var(--font-body)' }}>No admin actions recorded yet.</p>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['Time', 'Actor', 'Action', 'Target', 'Detail'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id} style={{ transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--text-3)', fontFamily: 'monospace', fontSize: 11 }}>{formatTime(log.timestamp)}</td>
                        <td style={{ ...td, fontFamily: 'monospace', fontSize: 11 }}>{log.actor_email}</td>
                        <td style={td}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-body)',
                            color: log.action.includes('promote') ? 'var(--success)' : log.action.includes('demote') ? 'var(--danger)' : 'var(--gold)',
                            background: log.action.includes('promote') ? 'var(--success-dim)' : log.action.includes('demote') ? 'var(--danger-dim)' : 'var(--gold-dim)',
                            border: `1px solid ${log.action.includes('promote') ? 'var(--success-bdr)' : log.action.includes('demote') ? 'var(--danger-bdr)' : 'var(--gold-border)'}` }}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ ...td, fontSize: 11, fontFamily: 'monospace' }}>{log.target_email || '—'}</td>
                        <td style={{ ...td, fontSize: 10, fontFamily: 'monospace', color: 'var(--text-3)' }}>{Object.entries(log.detail || {}).map(([k, v]) => `${k}: ${v}`).join(', ') || '—'}</td>
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
    </AppLayout>
  );
}