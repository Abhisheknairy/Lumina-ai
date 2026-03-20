import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Database, Users, Link2, Check, Copy, Loader2, X, Folder, RefreshCw, ExternalLink, Trash2, UserPlus, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import { authFetch } from '../utils/api';
import FolderPicker from '../components/FolderPicker';
import AppLayout from '../components/AppLayout';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ── Shared inline styles ──────────────────────────────────────────────
const inp  = { width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 7, padding: '9px 12px', color: 'var(--text-1)', fontSize: 13, fontFamily: 'var(--font-body)', boxSizing: 'border-box', transition: 'border-color 0.15s, background 0.15s', outline: 'none' };
const lbl  = { display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: 'var(--font-body)' };
const modal = { position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 };
const mbox = { background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-md)', width: '100%', maxWidth: 520 };
const mhdr = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-sub)' };

// ── Card progress ─────────────────────────────────────────────────────
function CardProgress({ ingest }) {
  const { phase, currentFile, currentFolder, filesProcessed, totalFiles, folderNum, totalFolders, chunks, error } = ingest;
  const pct = totalFiles > 0 ? Math.round((filesProcessed / totalFiles) * 100) : 0;
  const isDone = phase === 'done'; const isError = phase === 'error';
  const label = isDone ? `✓ ${filesProcessed} files · ${chunks} chunks` : isError ? `Failed: ${error}` : phase === 'creating' ? 'Creating knowledge base…' : phase === 'embedding' ? 'Building search index…' : phase === 'crawling' ? `Scanning: ${currentFolder}` : `Processing in "${currentFolder}"`;
  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-sub)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
          {isDone ? <CheckCircle size={12} style={{ color: 'var(--success)', flexShrink: 0 }} /> : isError ? <AlertCircle size={12} style={{ color: 'var(--danger)', flexShrink: 0 }} /> : <Loader2 size={12} style={{ color: 'var(--gold)', flexShrink: 0, animation: 'spin 0.7s linear infinite' }} />}
          <span style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)', color: isDone ? 'var(--success)' : isError ? 'var(--danger)' : 'var(--gold)' }}>{label}</span>
        </div>
        {!isDone && !isError && totalFiles > 0 && <span style={{ fontSize: 10, color: 'var(--gold)', fontFamily: 'monospace', flexShrink: 0, marginLeft: 8 }}>{pct}%</span>}
      </div>
      {!isDone && !isError && (
        <div style={{ background: 'var(--bg-3)', borderRadius: 3, height: 3, overflow: 'hidden', marginBottom: currentFile ? 6 : 0 }}>
          {phase === 'embedding'
            ? <div style={{ height: 3, borderRadius: 3, background: 'linear-gradient(90deg,transparent,var(--gold),transparent)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite', width: '100%' }} />
            : <div style={{ height: 3, borderRadius: 3, background: 'var(--gold)', width: `${Math.max(pct, 3)}%`, transition: 'width 0.3s ease' }} />}
        </div>
      )}
      {currentFile && !isDone && !isError && <p style={{ fontSize: 10, color: 'var(--text-3)', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{currentFile}</p>}
      {totalFolders > 1 && !isDone && !isError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
          {Array.from({ length: totalFolders }, (_, i) => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: i < folderNum ? 'var(--gold)' : 'var(--bg-4)', transition: 'background 0.3s' }} />)}
          <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>Folder {folderNum} of {totalFolders}</span>
        </div>
      )}
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function PendingCard({ pending, onDismiss }) {
  const isDone = pending.ingest.phase === 'done'; const isError = pending.ingest.phase === 'error';
  const border = isError ? 'var(--danger-bdr)' : isDone ? 'var(--success-bdr)' : 'var(--gold-border)';
  return (
    <div className="lux-card" style={{ borderColor: border }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: isError ? 'var(--danger-dim)' : isDone ? 'var(--success-dim)' : 'var(--gold-dim)', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isDone ? <CheckCircle size={14} style={{ color: 'var(--success)' }} /> : isError ? <AlertCircle size={14} style={{ color: 'var(--danger)' }} /> : <Loader2 size={14} style={{ color: 'var(--gold)', animation: 'spin 0.7s linear infinite' }} />}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>{pending.name}</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)' }}><Folder size={10} />{pending.folderNames.join(', ')}</p>
          </div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, flexShrink: 0, fontFamily: 'var(--font-body)', color: isDone ? 'var(--success)' : isError ? 'var(--danger)' : 'var(--gold)', background: isDone ? 'var(--success-dim)' : isError ? 'var(--danger-dim)' : 'var(--gold-dim)', border: `1px solid ${border}` }}>
          {isDone ? 'Ready' : isError ? 'Failed' : 'Indexing…'}
        </span>
      </div>
      {pending.description && <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 4px', lineHeight: 1.55, fontFamily: 'var(--font-body)' }}>{pending.description}</p>}
      <CardProgress ingest={pending.ingest} />
      {isError && <button onClick={onDismiss} className="btn-ghost" style={{ marginTop: 12, width: '100%', justifyContent: 'center', fontSize: 12 }}>Dismiss</button>}
    </div>
  );
}

function KbCard({ kb, copiedId, onCopy, onOpen, onAddMember, onDeactivate }) {
  return (
    <div className="lux-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Database size={14} style={{ color: 'var(--gold)' }} />
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.01em' }}>{kb.name}</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)' }}><Folder size={10} />{kb.folder_name || kb.folder_id}</p>
          </div>
        </div>
        {kb.is_creator && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', padding: '2px 8px', borderRadius: 4, flexShrink: 0, fontFamily: 'var(--font-body)' }}>Creator</span>}
      </div>
      {kb.description && <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 11px', lineHeight: 1.55, fontFamily: 'var(--font-body)' }}>{kb.description}</p>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: 'var(--text-3)', marginBottom: 14, paddingBottom: 13, borderBottom: '1px solid var(--border-sub)', fontFamily: 'var(--font-body)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={10} />{kb.member_count} member{kb.member_count !== 1 ? 's' : ''}</span>
        <span>Created {new Date(kb.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <button onClick={() => onOpen(kb)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '7px 10px' }}>
          Open chat <ChevronRight size={12} />
        </button>
        <button onClick={() => onCopy(kb.invite_link, kb.id)} className="btn-icon" title="Copy link">
          {copiedId === kb.id ? <Check size={13} style={{ color: 'var(--success)' }} /> : <Link2 size={13} />}
        </button>
        {kb.is_creator && (
          <>
            <button onClick={() => onAddMember(kb)} className="btn-icon" title="Add member"><UserPlus size={13} /></button>
            <button onClick={() => onDeactivate(kb)} className="btn-icon" title="Deactivate"
              style={{ border: '1px solid var(--border)' }}
              onMouseEnter={e => Object.assign(e.currentTarget.style, { background: 'var(--danger-dim)', color: 'var(--danger)', borderColor: 'var(--danger-bdr)' })}
              onMouseLeave={e => Object.assign(e.currentTarget.style, { background: 'none', color: 'var(--text-3)', borderColor: 'var(--border)' })}>
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 11px', background: 'var(--bg-3)', borderRadius: 6, border: '1px solid var(--border-sub)' }}>
        <ExternalLink size={10} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 10, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{kb.invite_link}</span>
        <button onClick={() => onCopy(kb.invite_link, kb.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: 11, fontWeight: 500, padding: 0, flexShrink: 0, fontFamily: 'var(--font-body)' }}>
          {copiedId === kb.id ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
export default function Collaboration() {
  const [sp]     = useSearchParams();
  const navigate = useNavigate();
  const userId   = sp.get('user_id');

  const [displayName,    setDisplayName]    = useState('');
  const [userEmail,      setUserEmail]      = useState('');
  const [userRole,       setUserRole]       = useState('user');
  const [profileLoading, setProfileLoading] = useState(true);
  const [kbs,            setKbs]            = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [showCreate,     setShowCreate]     = useState(false);
  const [showPicker,     setShowPicker]     = useState(false);
  const [driveReady,     setDriveReady]     = useState(false);
  const [copiedId,       setCopiedId]       = useState(null);
  const [addMemberKb,    setAddMemberKb]    = useState(null);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addingMember,   setAddingMember]   = useState(false);
  const [addResult,      setAddResult]      = useState(null);
  const [pendingKb,      setPendingKb]      = useState(null);
  const [form, setForm] = useState({ name: '', description: '', folders: [], member_emails: '' });

  useEffect(() => { if (!userId) navigate('/'); }, [userId, navigate]);
  useEffect(() => { if (userId) { fetchKBs(); initDrive(); } }, [userId]);

  const initDrive = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/get-token/${userId}`); const data = await res.json();
      if (data.display_name) setDisplayName(data.display_name); if (data.email) setUserEmail(data.email); if (data.role) setUserRole(data.role); setProfileLoading(false);
      if (!data.access_token) return;
      if (window.__gapiLoaded) { window.gapi.client.setToken({ access_token: data.access_token }); setDriveReady(true); return; }
      const script = document.createElement('script'); script.src = 'https://apis.google.com/js/api.js';
      script.onerror = () => console.error('GAPI load failed');
      script.onload  = async () => {
        try { await new Promise(r => window.gapi.load('client', r)); await window.gapi.client.init({ apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '', discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'] }); window.gapi.client.setToken({ access_token: data.access_token }); window.__gapiLoaded = true; setDriveReady(true); }
        catch (err) { console.error('GAPI init:', err); }
      };
      document.body.appendChild(script);
    } catch {}
  };

  const fetchKBs = async () => { setLoading(true); try { const res = await authFetch(userId, '/api/kb/list'); const d = await res.json(); setKbs(Array.isArray(d) ? d : []); } catch {} finally { setLoading(false); } };
  const handleFoldersSelected = (sel) => { setShowPicker(false); setForm(prev => { const ex = new Set(prev.folders.map(f => f.id)); return { ...prev, folders: [...prev.folders, ...sel.filter(f => !ex.has(f.id))] }; }); };
  const copyLink = (link, id) => { navigator.clipboard.writeText(link).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 2500); }); };
  const openKb   = (kb) => navigate(`/chat?user_id=${userId}&kb_id=${kb.id}&kb_name=${encodeURIComponent(kb.name)}&folder_id=${kb.folder_id}&folder_name=${encodeURIComponent(kb.folder_name)}`);
  const handleDeactivate = async (kb) => { if (!window.confirm(`Deactivate "${kb.name}"?`)) return; try { await authFetch(userId, `/api/kb/${kb.id}`, { method: 'DELETE' }); fetchKBs(); } catch { alert('Failed.'); } };
  const handleAddMember = async (kb) => {
    if (!addMemberEmail.trim()) return; setAddingMember(true); setAddResult(null);
    try { const res = await authFetch(userId, `/api/kb/${kb.id}/add-member?email=${encodeURIComponent(addMemberEmail)}&role=viewer`, { method: 'POST' }); const d = await res.json(); if (!res.ok) throw new Error(d.detail || 'Failed'); setAddResult({ link: d.invite_link, email: addMemberEmail }); setAddMemberEmail(''); }
    catch (err) { alert(`Error: ${err.message}`); } finally { setAddingMember(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.folders.length === 0) { alert('Please provide a name and select at least one folder.'); return; }
    const snap = { ...form }; setShowCreate(false); setForm({ name: '', description: '', folders: [], member_emails: '' });
    setPendingKb({ name: snap.name, description: snap.description, folderNames: snap.folders.map(f => f.name), ingest: { phase: 'creating', currentFile: '', currentFolder: '', filesProcessed: 0, totalFiles: 0, folderNum: 0, totalFolders: snap.folders.length, chunks: 0, error: '' } });
    const emails = snap.member_emails.split(/[,\n]/).map(e => e.trim().toLowerCase()).filter(Boolean);
    const upd = (patch) => setPendingKb(prev => prev ? { ...prev, ingest: { ...prev.ingest, ...patch } } : null);
    try {
      const res = await authFetch(userId, `/api/kb/create-and-ingest/${userId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: snap.name, description: snap.description, folder_ids: snap.folders.map(f => f.id), folder_names: snap.folders.map(f => f.name), member_emails: emails }) });
      if (!res.ok) { const err = await res.json(); upd({ phase: 'error', error: err.detail || 'Failed' }); return; }
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop();
        for (const line of lines) { if (!line.trim()) continue; try { const f = JSON.parse(line);
          if (f.type === 'kb_created')   upd({ phase: 'crawling', totalFolders: f.total_folders });
          else if (f.type === 'folder_start') upd({ phase: 'crawling', currentFolder: f.folder, folderNum: f.folder_num, totalFolders: f.total_folders, filesProcessed: 0, totalFiles: 0 });
          else if (f.type === 'progress') { if (f.status === 'embedding') upd({ phase: 'embedding', currentFile: '' }); else upd({ phase: 'processing', currentFile: f.file, currentFolder: f.folder, filesProcessed: f.current, totalFiles: f.total }); }
          else if (f.type === 'folder_done') upd({ currentFile: '' });
          else if (f.type === 'done') { upd({ phase: 'done', filesProcessed: f.total_files, totalFiles: f.total_files, chunks: f.total_chunks, currentFile: '' }); fetchKBs(); setTimeout(() => setPendingKb(null), 3000); }
          else if (f.type === 'error') upd({ phase: 'error', error: f.detail || 'Failed' });
        } catch {} }
      }
    } catch (err) { upd({ phase: 'error', error: err.message || 'Request failed' }); }
  };

  const isIndexing = pendingKb && pendingKb.ingest.phase !== 'done' && pendingKb.ingest.phase !== 'error';

  return (
    <AppLayout userId={userId} displayName={displayName} userEmail={userEmail} role={userRole} profileLoading={profileLoading}>
    <div style={{ height: '100%', background: 'var(--bg)', fontFamily: 'var(--font-body)', color: 'var(--text-1)', overflow: 'auto' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px 0' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div className="gold-line" /><span className="section-label">Shared workspace</span>
          </div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-1)' }}>Knowledge Bases</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-icon" onClick={fetchKBs}><RefreshCw size={13} /></button>
          <button className="btn-gold" style={{ opacity: isIndexing ? 0.5 : 1, cursor: isIndexing ? 'not-allowed' : 'pointer' }} onClick={() => !isIndexing && setShowCreate(true)}>
            <Plus size={13} /> New knowledge base
          </button>
        </div>
      </div>

      <main style={{ maxWidth: 980, margin: '0 auto', padding: '28px 28px 56px' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 10, color: 'var(--text-3)' }}>
            <div style={{ width: 14, height: 14, border: '1.5px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <span style={{ fontSize: 13 }}>Loading knowledge bases…</span>
          </div>
        )}

        {!loading && (pendingKb || kbs.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 10 }}>
            {pendingKb && <PendingCard pending={pendingKb} onDismiss={() => setPendingKb(null)} />}
            {kbs.map(kb => <KbCard key={kb.id} kb={kb} copiedId={copiedId} onCopy={copyLink} onOpen={openKb} onAddMember={(kb) => { setAddMemberKb(kb); setAddResult(null); }} onDeactivate={handleDeactivate} />)}
          </div>
        )}

        {!loading && kbs.length === 0 && !pendingKb && (
          <div style={{ textAlign: 'center', padding: '80px 0', animation: 'fadein 0.4s ease' }}>
            <div style={{ width: 52, height: 52, background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(200,169,110,0.15)' }}>
              <Database size={22} style={{ color: 'var(--gold)' }} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, margin: '0 0 8px', letterSpacing: '-0.02em' }}>No knowledge bases yet</h3>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 28px', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto', fontWeight: 300, lineHeight: 1.65 }}>
              Create a shared knowledge base so your team can query the same Drive documents together.
            </p>
            <button className="btn-gold" onClick={() => setShowCreate(true)}><Plus size={13} /> Create your first KB</button>
          </div>
        )}
      </main>

      {/* ── Create modal ─────────────────────────────────────────── */}
      {showCreate && (
        <div style={modal}>
          <div style={mbox}>
            <div style={mhdr}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 24, height: 24, background: 'var(--gold)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Database size={12} style={{ color: '#0b0b0d' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>New knowledge base</span>
              </div>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 3 }}><X size={14} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Name *</label>
                <input style={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Q3 Onboarding Docs" onFocus={e => { e.target.style.borderColor = 'var(--gold-border)'; e.target.style.background = 'rgba(200,169,110,0.04)'; }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-3)'; }} />
              </div>
              <div>
                <label style={lbl}>Description</label>
                <textarea style={{ ...inp, resize: 'none', lineHeight: 1.6 }} rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What is this knowledge base for?" onFocus={e => { e.target.style.borderColor = 'var(--gold-border)'; e.target.style.background = 'rgba(200,169,110,0.04)'; }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-3)'; }} />
              </div>
              <div>
                <label style={lbl}>Drive folders * {form.folders.length > 0 && `· ${form.folders.length} selected`}</label>
                {form.folders.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {form.folders.map(f => (
                      <span key={f.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', padding: '4px 10px', borderRadius: 20, fontFamily: 'var(--font-body)' }}>
                        <Folder size={10} />{f.name}
                        <button type="button" onClick={() => setForm(p => ({ ...p, folders: p.folders.filter(x => x.id !== f.id) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-3)' }}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => { if (!driveReady) { alert('Google Drive is still loading.'); return; } setShowPicker(true); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px 14px', background: 'var(--bg-3)', border: '1px dashed var(--border)', borderRadius: 7, color: 'var(--text-2)', fontSize: 12, cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'var(--font-body)' }}
                  onMouseEnter={e => Object.assign(e.currentTarget.style, { background: 'var(--gold-dim)', color: 'var(--gold)', borderColor: 'var(--gold-border)' })}
                  onMouseLeave={e => Object.assign(e.currentTarget.style, { background: 'var(--bg-3)', color: 'var(--text-2)', borderColor: 'var(--border)' })}>
                  {driveReady ? <><Folder size={13} />Browse Google Drive folders</> : <><Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} />Loading Drive…</>}
                </button>
                <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 5, fontFamily: 'var(--font-body)' }}>Select one or more folders. All files will be indexed into one shared KB.</p>
              </div>
              <div>
                <label style={lbl}>Invite members</label>
                <textarea style={{ ...inp, resize: 'none', lineHeight: 1.6, fontFamily: 'monospace', fontSize: 12 }} rows={2} value={form.member_emails} onChange={e => setForm(p => ({ ...p, member_emails: e.target.value }))} placeholder={'colleague1@isteer.com\ncolleague2@isteer.com'} onFocus={e => { e.target.style.borderColor = 'var(--gold-border)'; }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; }} />
                <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, fontFamily: 'var(--font-body)' }}>Each person receives an invite email with a unique link.</p>
              </div>
              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button type="submit" className="btn-gold" style={{ flex: 1, justifyContent: 'center' }}><Plus size={13} /> Create &amp; index</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add member modal ────────────────────────────────────── */}
      {addMemberKb && (
        <div style={modal}>
          <div style={{ ...mbox, maxWidth: 380 }}>
            <div style={mhdr}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Add member — {addMemberKb.name}</span>
              <button onClick={() => { setAddMemberKb(null); setAddResult(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 3 }}><X size={14} /></button>
            </div>
            <div style={{ padding: 20 }}>
              {addResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--success)', fontSize: 13, fontFamily: 'var(--font-body)' }}><Check size={13} />Invite sent to {addResult.email}</div>
                  <div style={{ padding: '10px 13px', background: 'var(--bg-3)', borderRadius: 7, border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px', fontFamily: 'var(--font-body)' }}>Invite link</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, fontSize: 10, fontFamily: 'monospace', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{addResult.link}</span>
                      <button onClick={() => copyLink(addResult.link, 'modal')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: 11, fontWeight: 500, padding: 0, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, fontFamily: 'var(--font-body)' }}>{copiedId === 'modal' ? <><Check size={9} />Copied</> : <><Copy size={9} />Copy</>}</button>
                    </div>
                  </div>
                  <button onClick={() => setAddResult(null)} className="btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>Add another</button>
                </div>
              ) : (
                <>
                  <label style={{ ...lbl, marginBottom: 6 }}>Email address</label>
                  <input style={{ ...inp, marginBottom: 13 }} value={addMemberEmail} onChange={e => setAddMemberEmail(e.target.value)} placeholder="colleague@isteer.com" onFocus={e => e.target.style.borderColor = 'var(--gold-border)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setAddMemberKb(null)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                    <button onClick={() => handleAddMember(addMemberKb)} disabled={addingMember} className="btn-gold" style={{ flex: 1, justifyContent: 'center' }}>
                      {addingMember ? <><Loader2 size={12} style={{ animation: 'spin 0.7s linear infinite' }} />Adding…</> : <><UserPlus size={12} />Add member</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showPicker && <FolderPicker onSelect={handleFoldersSelected} onClose={() => setShowPicker(false)} />}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
    </AppLayout>
  );
}