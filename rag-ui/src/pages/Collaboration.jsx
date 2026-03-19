import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Database, Users, Link2, Check, Copy,
  ArrowLeft, Loader2, X, Folder, RefreshCw,
  ExternalLink, Trash2, UserPlus, ChevronRight
} from 'lucide-react';
import { authFetch } from '../utils/api';

const API_BASE       = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

// ── Shared style tokens ───────────────────────────────────────────────
const BTN_BASE = {
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: 7,
  cursor: 'pointer',
  color: 'var(--text-2)',
  fontSize: 13,
  fontFamily: 'inherit',
  transition: 'all 0.12s',
};

const INPUT_STYLE = {
  width: '100%',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 7,
  padding: '8px 11px',
  color: 'var(--text-1)',
  fontSize: 13,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

export default function Collaboration() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const userId         = searchParams.get('user_id');

  const [kbs,            setKbs]            = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [showCreate,     setShowCreate]     = useState(false);
  const [creating,       setCreating]       = useState(false);
  const [copiedId,       setCopiedId]       = useState(null);
  const [addMemberKb,    setAddMemberKb]    = useState(null);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addingMember,   setAddingMember]   = useState(false);
  const [addResult,      setAddResult]      = useState(null);
  const [driveReady,     setDriveReady]     = useState(false);
  const [oauthToken,     setOauthToken]     = useState(null);

  const [form, setForm] = useState({
    name: '', description: '', folder_id: '', folder_name: '', member_emails: '',
  });

  useEffect(() => { if (!userId) navigate('/'); }, [userId, navigate]);

  useEffect(() => {
    if (!userId) return;
    fetchKBs();

    fetch(`${API_BASE}/api/get-token/${userId}`)
      .then(r => r.json())
      .then(async data => {
        if (!data.access_token) return;
        setOauthToken(data.access_token);

        if (window.__gapiPickerLoaded) { setDriveReady(true); return; }

        const script    = document.createElement('script');
        script.src      = 'https://apis.google.com/js/api.js';
        script.onload   = async () => {
          try {
            await new Promise(resolve => window.gapi.load('client:picker', resolve));
            if (GOOGLE_API_KEY) await window.gapi.client.init({ apiKey: GOOGLE_API_KEY });
            await window.gapi.client.load('drive', 'v3');
            window.gapi.client.setToken({ access_token: data.access_token });
            window.__gapiPickerLoaded = true;
            setDriveReady(true);
          } catch (err) { console.error('Drive picker init failed:', err); }
        };
        document.body.appendChild(script);
      })
      .catch(console.error);
  }, [userId]);

  const fetchKBs = async () => {
    setLoading(true);
    try {
      const res  = await authFetch(userId, '/api/kb/list');
      const data = await res.json();
      setKbs(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openPicker = () => {
    if (!driveReady || !oauthToken) { alert('Drive is still loading. Please wait.'); return; }
    if (!GOOGLE_API_KEY) { alert('Google API key not configured.'); return; }

    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
    view.setIncludeFolders(true);
    view.setSelectFolderEnabled(true);

    new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(oauthToken)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setCallback(data => {
        if (data.action === window.google.picker.Action.PICKED) {
          const item = data.docs[0];
          setForm(prev => ({ ...prev, folder_id: item.id, folder_name: item.name }));
        }
      })
      .setTitle('Select a folder for this Knowledge Base')
      .build()
      .setVisible(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.folder_id) {
      alert('Please provide a name and select a Drive folder.');
      return;
    }
    setCreating(true);
    try {
      const emails = form.member_emails
        .split(/[,\n]/)
        .map(em => em.trim().toLowerCase())
        .filter(Boolean);

      const res  = await authFetch(userId, '/api/kb/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:          form.name,
          description:   form.description,
          folder_id:     form.folder_id,
          folder_name:   form.folder_name,
          member_emails: emails,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create');

      setForm({ name: '', description: '', folder_id: '', folder_name: '', member_emails: '' });
      setShowCreate(false);
      fetchKBs();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (link, id) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const handleAddMember = async (kb) => {
    if (!addMemberEmail.trim()) return;
    setAddingMember(true);
    setAddResult(null);
    try {
      const res = await authFetch(
        userId,
        `/api/kb/${kb.id}/add-member?email=${encodeURIComponent(addMemberEmail)}&role=viewer`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      setAddResult({ link: data.invite_link, email: addMemberEmail });
      setAddMemberEmail('');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setAddingMember(false);
    }
  };

  const handleDeactivate = async (kb) => {
    const confirmed = window.confirm(`Deactivate "${kb.name}"? Members will lose access.`);
    if (!confirmed) return;
    try {
      await authFetch(userId, `/api/kb/${kb.id}`, { method: 'DELETE' });
      fetchKBs();
    } catch {
      alert('Failed to deactivate.');
    }
  };

  const openKb = (kb) => {
    navigate(
      `/chat?user_id=${userId}` +
      `&kb_id=${kb.id}` +
      `&kb_name=${encodeURIComponent(kb.name)}` +
      `&folder_id=${kb.folder_id}` +
      `&folder_name=${encodeURIComponent(kb.folder_name)}`
    );
  };

  // ── Icon button shared style ──────────────────────────────────────
  const iconBtn = {
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: 6,
    cursor: 'pointer',
    color: 'var(--text-3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.12s',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'inherit', color: 'var(--text-1)' }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header style={{ height: 52, background: 'var(--bg-2)', borderBottom: '1px solid var(--border-sub)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 10, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate(`/chat?user_id=${userId}`)}
            style={{ ...BTN_BASE, border: 'none', display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', fontSize: 13 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-2)'; }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--teal-dim)', border: '1px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={13} style={{ color: 'var(--teal)' }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>Collaboration</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={fetchKBs}
            style={iconBtn}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; }}
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 15px', background: 'var(--text-1)', border: 'none', borderRadius: 7, color: 'var(--bg)', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'opacity 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Plus size={14} /> New knowledge base
          </button>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 980, margin: '0 auto', padding: '36px 24px' }}>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 10, color: 'var(--text-3)' }}>
            <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />
            <span style={{ fontSize: 14 }}>Loading knowledge bases…</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && kbs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ width: 48, height: 48, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <Database size={20} style={{ color: 'var(--text-3)' }} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-1)', margin: '0 0 7px' }}>No knowledge bases yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 28px', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
              Create a shared knowledge base so your team can query the same Drive documents together.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: 'var(--text-1)', border: 'none', borderRadius: 8, color: 'var(--bg)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              <Plus size={14} /> Create your first KB
            </button>
          </div>
        )}

        {/* KB grid */}
        {!loading && kbs.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 10 }}>
            {kbs.map(kb => (
              <div
                key={kb.id}
                style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 22px', boxShadow: 'var(--shadow-sm)', transition: 'box-shadow 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
              >
                {/* KB header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Database size={15} style={{ color: 'var(--text-2)' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.01em' }}>{kb.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Folder size={11} /> {kb.folder_name || kb.folder_id}
                      </p>
                    </div>
                  </div>
                  {kb.is_creator && (
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--teal)', background: 'var(--teal-dim)', border: '1px solid var(--teal-border)', padding: '2px 7px', borderRadius: 4, flexShrink: 0 }}>
                      Creator
                    </span>
                  )}
                </div>

                {kb.description && (
                  <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 11px', lineHeight: 1.55 }}>{kb.description}</p>
                )}

                {/* Stats */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--text-3)', marginBottom: 14, paddingBottom: 13, borderBottom: '1px solid var(--border-sub)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={11} /> {kb.member_count} member{kb.member_count !== 1 ? 's' : ''}
                  </span>
                  <span>
                    Created {new Date(kb.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                {/* Actions row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  {/* Open chat */}
                  <button
                    onClick={() => openKb(kb)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 12px', background: 'none', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-2)', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.borderColor = 'var(--teal-border)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    Open chat <ChevronRight size={13} />
                  </button>

                  {/* Copy invite link */}
                  <button
                    onClick={() => copyLink(kb.invite_link, kb.id)}
                    title="Copy invite link"
                    style={iconBtn}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; }}
                  >
                    {copiedId === kb.id
                      ? <Check size={14} style={{ color: 'var(--success)' }} />
                      : <Link2 size={14} />
                    }
                  </button>

                  {/* Creator-only actions */}
                  {kb.is_creator && (
                    <>
                      <button
                        onClick={() => { setAddMemberKb(kb); setAddResult(null); }}
                        title="Add member"
                        style={iconBtn}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; }}
                      >
                        <UserPlus size={14} />
                      </button>
                      <button
                        onClick={() => handleDeactivate(kb)}
                        title="Deactivate"
                        style={iconBtn}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-dim)'; e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--danger-bdr)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>

                {/* Invite link strip */}
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 11px', background: 'var(--bg-3)', borderRadius: 6, border: '1px solid var(--border-sub)' }}>
                  <ExternalLink size={11} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                    {kb.invite_link}
                  </span>
                  <button
                    onClick={() => copyLink(kb.invite_link, kb.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 500, padding: 0, flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-h)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--accent)'}
                  >
                    {copiedId === kb.id ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Create KB modal ────────────────────────────────────────── */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 500, overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-sub)' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>New knowledge base</span>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 3 }}><X size={15} /></button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Name *</label>
                <input
                  style={INPUT_STYLE}
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Q3 Onboarding Docs"
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Description</label>
                <textarea
                  style={{ ...INPUT_STYLE, resize: 'none', lineHeight: 1.6 }}
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="What is this knowledge base for?"
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {/* Drive folder */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Drive folder *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7 }}>
                    <Folder size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: form.folder_name ? 'var(--text-1)' : 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {form.folder_name || 'No folder selected'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={openPicker}
                    style={{ ...BTN_BASE, padding: '8px 14px' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-2)'; }}
                  >
                    Browse
                  </button>
                </div>
              </div>

              {/* Invite members */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
                  Invite members
                </label>
                <textarea
                  style={{ ...INPUT_STYLE, resize: 'none', lineHeight: 1.6, fontFamily: 'monospace' }}
                  rows={3}
                  value={form.member_emails}
                  onChange={e => setForm(p => ({ ...p, member_emails: e.target.value }))}
                  placeholder={'colleague1@isteer.com\ncolleague2@isteer.com'}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                  Comma or newline-separated. Each gets a unique shareable invite link.
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  style={{ flex: 1, padding: '8px', ...BTN_BASE }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-2)'; }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{ flex: 1, padding: '8px', background: 'var(--text-1)', border: 'none', borderRadius: 7, color: 'var(--bg)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: creating ? 0.7 : 1 }}
                >
                  {creating
                    ? <><Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} />Creating…</>
                    : <><Plus size={13} />Create KB</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add member modal ────────────────────────────────────────── */}
      {addMemberKb && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 380, overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-sub)' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Add member</span>
              <button onClick={() => { setAddMemberKb(null); setAddResult(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 3 }}><X size={15} /></button>
            </div>

            <div style={{ padding: 20 }}>
              {addResult ? (
                /* Show invite link result inline — no alert() */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--success)', fontSize: 13 }}>
                    <Check size={14} /> Invite created for {addResult.email}
                  </div>
                  <div style={{ padding: '10px 13px', background: 'var(--bg-3)', borderRadius: 7, border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>Invite link</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {addResult.link}
                      </span>
                      <button
                        onClick={() => copyLink(addResult.link, 'modal')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 500, padding: 0, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                      >
                        {copiedId === 'modal' ? <><Check size={11} />Copied</> : <><Copy size={11} />Copy</>}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setAddResult(null)}
                    style={{ padding: '8px', ...BTN_BASE, width: '100%' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-2)'; }}
                  >
                    Add another
                  </button>
                </div>
              ) : (
                <>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                    Email address
                  </label>
                  <input
                    style={{ ...INPUT_STYLE, marginBottom: 13 }}
                    value={addMemberEmail}
                    onChange={e => setAddMemberEmail(e.target.value)}
                    placeholder="colleague@isteer.com"
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setAddMemberKb(null)}
                      style={{ flex: 1, padding: '8px', ...BTN_BASE }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-2)'; }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAddMember(addMemberKb)}
                      disabled={addingMember}
                      style={{ flex: 1, padding: '8px', background: 'var(--text-1)', border: 'none', borderRadius: 7, color: 'var(--bg)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: addingMember ? 0.7 : 1 }}
                    >
                      {addingMember
                        ? <><Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} />Adding…</>
                        : <><UserPlus size={13} />Add member</>
                      }
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}