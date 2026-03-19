import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Database, Users, Link2, Check, Copy,
  ArrowLeft, Loader2, X, Folder, RefreshCw,
  ExternalLink, Trash2, UserPlus, ChevronRight,
  CheckCircle, AlertCircle
} from 'lucide-react';
import { authFetch } from '../utils/api';
import FolderPicker from '../components/FolderPicker';
import AppLayout from '../components/AppLayout';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const s = {
  page:  { height: '100%', background: 'var(--bg)', fontFamily: "'Inter', sans-serif", color: 'var(--text-1)', overflow: 'auto' },
  hdr:   { height: 52, background: 'var(--bg-2)', borderBottom: '1px solid var(--border-sub)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 10, boxShadow: 'var(--shadow-sm)' },
  card:  { background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 22px', boxShadow: 'var(--shadow-sm)', transition: 'box-shadow 0.12s' },
  lbl:   { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 },
  inp:   { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 11px', color: 'var(--text-1)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.12s' },
  modal: { position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  mbox:  { background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-md)', width: '100%', maxWidth: 520 },
  mhdr:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-sub)' },
  btnP:  { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 16px', background: 'var(--text-1)', border: 'none', borderRadius: 7, color: 'var(--bg)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.12s' },
  btnS:  { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', background: 'none', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-2)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.12s' },
  iBtn:  { background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: 6, cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' },
};

// ── Inline progress rendered INSIDE the pending KB card ───────────────
function CardProgress({ ingest }) {
  const { phase, currentFile, currentFolder, filesProcessed, totalFiles, folderNum, totalFolders, chunks, error } = ingest;
  const pct     = totalFiles > 0 ? Math.round((filesProcessed / totalFiles) * 100) : 0;
  const isError = phase === 'error';
  const isDone  = phase === 'done';

  const statusLabel = () => {
    if (isDone)                return `✓ ${filesProcessed} files · ${chunks} chunks indexed`;
    if (isError)               return `Failed: ${error}`;
    if (phase === 'creating')  return 'Creating knowledge base…';
    if (phase === 'embedding') return 'Building search index…';
    if (phase === 'crawling')  return `Scanning: ${currentFolder}`;
    return `Processing files in "${currentFolder}"`;
  };

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-sub)' }}>
      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
          {isDone
            ? <CheckCircle size={13} style={{ color: 'var(--success)', flexShrink: 0 }} />
            : isError
              ? <AlertCircle size={13} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              : <Loader2 size={13} style={{ color: 'var(--accent)', flexShrink: 0, animation: 'spin 0.7s linear infinite' }} />
          }
          <span style={{
            fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: isDone ? 'var(--success)' : isError ? 'var(--danger)' : 'var(--accent)',
          }}>
            {statusLabel()}
          </span>
        </div>
        {!isDone && !isError && totalFiles > 0 && (
          <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'monospace', flexShrink: 0, marginLeft: 8 }}>
            {pct}%
          </span>
        )}
      </div>

      {/* Bar */}
      {!isDone && !isError && (
        <div style={{ background: 'var(--bg-3)', borderRadius: 3, height: 3, overflow: 'hidden', marginBottom: currentFile ? 7 : 0 }}>
          {phase === 'embedding' ? (
            <div style={{ height: 3, borderRadius: 3, background: 'linear-gradient(90deg,transparent,var(--accent),transparent)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite', width: '100%' }} />
          ) : (
            <div style={{ height: 3, borderRadius: 3, background: 'var(--accent)', width: `${Math.max(pct, 3)}%`, transition: 'width 0.3s ease' }} />
          )}
        </div>
      )}

      {/* Current file */}
      {currentFile && !isDone && !isError && (
        <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentFile}
        </p>
      )}

      {/* Folder progress dots */}
      {totalFolders > 1 && !isDone && !isError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
          {Array.from({ length: totalFolders }, (_, i) => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i < folderNum ? 'var(--accent)' : 'var(--bg-4)', transition: 'background 0.3s' }} />
          ))}
          <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 3 }}>
            Folder {folderNum} of {totalFolders}
          </span>
        </div>
      )}

      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Pending KB card — shown immediately on create ─────────────────────
function PendingCard({ pending, onDismiss }) {
  const isDone  = pending.ingest.phase === 'done';
  const isError = pending.ingest.phase === 'error';

  return (
    <div style={{
      ...s.card,
      border: `1px solid ${isError ? 'var(--danger-bdr)' : isDone ? 'var(--success-bdr)' : 'var(--accent-border)'}`,
    }}>
      {/* Header — same layout as real KB card */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            background: isError ? 'var(--danger-dim)' : isDone ? 'var(--success-dim)' : 'var(--accent-dim)',
            border: `1px solid ${isError ? 'var(--danger-bdr)' : isDone ? 'var(--success-bdr)' : 'var(--accent-border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isDone
              ? <CheckCircle size={15} style={{ color: 'var(--success)' }} />
              : isError
                ? <AlertCircle size={15} style={{ color: 'var(--danger)' }} />
                : <Loader2 size={15} style={{ color: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
            }
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.01em' }}>
              {pending.name}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Folder size={11} /> {pending.folderNames.join(', ')}
            </p>
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 4, flexShrink: 0,
          color:       isDone ? 'var(--success)' : isError ? 'var(--danger)' : 'var(--accent)',
          background:  isDone ? 'var(--success-dim)' : isError ? 'var(--danger-dim)' : 'var(--accent-dim)',
          border: `1px solid ${isDone ? 'var(--success-bdr)' : isError ? 'var(--danger-bdr)' : 'var(--accent-border)'}`,
        }}>
          {isDone ? 'Ready' : isError ? 'Failed' : 'Indexing…'}
        </span>
      </div>

      {pending.description && (
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 4px', lineHeight: 1.55 }}>{pending.description}</p>
      )}

      {/* Live progress bar area */}
      <CardProgress ingest={pending.ingest} />

      {/* Dismiss on error */}
      {isError && (
        <button onClick={onDismiss}
          style={{ marginTop: 12, ...s.btnS, width: '100%', fontSize: 12 }}
          onMouseEnter={e => Object.assign(e.currentTarget.style, { background: 'var(--bg-3)', color: 'var(--text-1)' })}
          onMouseLeave={e => Object.assign(e.currentTarget.style, { background: 'none', color: 'var(--text-2)' })}>
          Dismiss
        </button>
      )}
    </div>
  );
}

// ── Real KB card ──────────────────────────────────────────────────────
function KbCard({ kb, copiedId, onCopy, onOpen, onAddMember, onDeactivate }) {
  const hi = (e, st) => Object.assign(e.currentTarget.style, st);
  return (
    <div style={s.card}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}>

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

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--text-3)', marginBottom: 14, paddingBottom: 13, borderBottom: '1px solid var(--border-sub)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Users size={11} /> {kb.member_count} member{kb.member_count !== 1 ? 's' : ''}
        </span>
        <span>Created {new Date(kb.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <button onClick={() => onOpen(kb)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 12px', background: 'none', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-2)', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s' }}
          onMouseEnter={e => hi(e, { background: 'var(--bg-3)', color: 'var(--text-1)', borderColor: 'var(--teal-border)' })}
          onMouseLeave={e => hi(e, { background: 'none', color: 'var(--text-2)', borderColor: 'var(--border)' })}>
          Open chat <ChevronRight size={13} />
        </button>

        <button onClick={() => onCopy(kb.invite_link, kb.id)} title="Copy link" style={s.iBtn}
          onMouseEnter={e => hi(e, { background: 'var(--bg-3)', color: 'var(--text-1)' })}
          onMouseLeave={e => hi(e, { background: 'none', color: 'var(--text-3)' })}>
          {copiedId === kb.id ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Link2 size={14} />}
        </button>

        {kb.is_creator && (
          <>
            <button onClick={() => onAddMember(kb)} title="Add member" style={s.iBtn}
              onMouseEnter={e => hi(e, { background: 'var(--bg-3)', color: 'var(--text-1)' })}
              onMouseLeave={e => hi(e, { background: 'none', color: 'var(--text-3)' })}>
              <UserPlus size={14} />
            </button>
            <button onClick={() => onDeactivate(kb)} title="Deactivate" style={s.iBtn}
              onMouseEnter={e => hi(e, { background: 'var(--danger-dim)', color: 'var(--danger)', borderColor: 'var(--danger-bdr)' })}
              onMouseLeave={e => hi(e, { background: 'none', color: 'var(--text-3)', borderColor: 'var(--border)' })}>
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 11px', background: 'var(--bg-3)', borderRadius: 6, border: '1px solid var(--border-sub)' }}>
        <ExternalLink size={11} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
          {kb.invite_link}
        </span>
        <button onClick={() => onCopy(kb.invite_link, kb.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 500, padding: 0, flexShrink: 0 }}>
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

  // Pending card: appears immediately when user hits "Create & index"
  // Lives in the grid alongside real KB cards
  const [pendingKb, setPendingKb] = useState(null);
  // null | { name, description, folderNames, ingest: { phase, ... } }

  const [form, setForm] = useState({ name: '', description: '', folders: [], member_emails: '' });

  useEffect(() => { if (!userId) navigate('/'); }, [userId, navigate]);
  useEffect(() => { if (userId) { fetchKBs(); initDrive(); } }, [userId]);

  // ── Drive init ────────────────────────────────────────────────────
  const initDrive = async () => {
    try {
      const res  = await fetch(`${API_BASE}/api/get-token/${userId}`);
      const data = await res.json();
      if (data.display_name) setDisplayName(data.display_name);
      if (data.email)        setUserEmail(data.email);
      if (data.role)         setUserRole(data.role);
      setProfileLoading(false);
      if (!data.access_token) return;

      if (window.__gapiLoaded) {
        window.gapi.client.setToken({ access_token: data.access_token });
        setDriveReady(true);
        return;
      }

      const script   = document.createElement('script');
      script.src     = 'https://apis.google.com/js/api.js';
      script.onerror = () => console.error('GAPI load failed');
      script.onload  = async () => {
        try {
          await new Promise(r => window.gapi.load('client', r));
          const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || '';
          await window.gapi.client.init({ apiKey, discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'] });
          window.gapi.client.setToken({ access_token: data.access_token });
          window.__gapiLoaded = true;
          setDriveReady(true);
        } catch (err) { console.error('GAPI init failed:', err); }
      };
      document.body.appendChild(script);
    } catch (err) { console.error('Drive init:', err); }
  };

  const fetchKBs = async () => {
    setLoading(true);
    try {
      const res  = await authFetch(userId, '/api/kb/list');
      const data = await res.json();
      setKbs(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleFoldersSelected = (selected) => {
    setShowPicker(false);
    setForm(prev => {
      const existing = new Set(prev.folders.map(f => f.id));
      return { ...prev, folders: [...prev.folders, ...selected.filter(f => !existing.has(f.id))] };
    });
  };

  // ── Create KB: close modal → show pending card → stream progress ──
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.folders.length === 0) {
      alert('Please provide a name and select at least one folder.');
      return;
    }

    const snapshot = { ...form };
    setShowCreate(false);
    setForm({ name: '', description: '', folders: [], member_emails: '' });

    // ① Show pending card immediately in the grid
    setPendingKb({
      name:        snapshot.name,
      description: snapshot.description,
      folderNames: snapshot.folders.map(f => f.name),
      ingest: {
        phase: 'creating', currentFile: '', currentFolder: '',
        filesProcessed: 0, totalFiles: 0,
        folderNum: 0, totalFolders: snapshot.folders.length,
        chunks: 0, error: '',
      },
    });

    const emails = snapshot.member_emails.split(/[,\n]/).map(e => e.trim().toLowerCase()).filter(Boolean);

    // ② Stream create-and-ingest
    try {
      const res = await authFetch(userId, `/api/kb/create-and-ingest/${userId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:          snapshot.name,
          description:   snapshot.description,
          folder_ids:    snapshot.folders.map(f => f.id),
          folder_names:  snapshot.folders.map(f => f.name),
          member_emails: emails,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setPendingKb(prev => prev ? { ...prev, ingest: { ...prev.ingest, phase: 'error', error: err.detail || 'Failed' } } : null);
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      // Helper to update just the ingest slice of pendingKb
      const upd = (patch) => setPendingKb(prev => prev ? { ...prev, ingest: { ...prev.ingest, ...patch } } : null);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const f = JSON.parse(line);

            if (f.type === 'kb_created') {
              upd({ phase: 'crawling', totalFolders: f.total_folders });
            }
            else if (f.type === 'folder_start') {
              upd({ phase: 'crawling', currentFolder: f.folder, folderNum: f.folder_num, totalFolders: f.total_folders, filesProcessed: 0, totalFiles: 0 });
            }
            else if (f.type === 'progress') {
              if (f.status === 'embedding') {
                upd({ phase: 'embedding', currentFile: '' });
              } else {
                upd({ phase: 'processing', currentFile: f.file, currentFolder: f.folder, filesProcessed: f.current, totalFiles: f.total });
              }
            }
            else if (f.type === 'folder_done') {
              upd({ currentFile: '' });
            }
            else if (f.type === 'done') {
              // ③ Mark done → refresh list → remove pending card after 3s
              upd({ phase: 'done', filesProcessed: f.total_files, totalFiles: f.total_files, chunks: f.total_chunks, currentFile: '' });
              fetchKBs();
              setTimeout(() => setPendingKb(null), 3000);
            }
            else if (f.type === 'error') {
              upd({ phase: 'error', error: f.detail || 'Ingestion failed' });
            }
          } catch { /* non-JSON line */ }
        }
      }
    } catch (err) {
      setPendingKb(prev => prev ? { ...prev, ingest: { ...prev.ingest, phase: 'error', error: err.message || 'Request failed' } } : null);
    }
  };

  const copyLink = (link, id) => {
    navigator.clipboard.writeText(link).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 2500); });
  };

  const handleAddMember = async (kb) => {
    if (!addMemberEmail.trim()) return;
    setAddingMember(true); setAddResult(null);
    try {
      const res  = await authFetch(userId, `/api/kb/${kb.id}/add-member?email=${encodeURIComponent(addMemberEmail)}&role=viewer`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      setAddResult({ link: data.invite_link, email: addMemberEmail });
      setAddMemberEmail('');
    } catch (err) { alert(`Error: ${err.message}`); }
    finally { setAddingMember(false); }
  };

  const handleDeactivate = async (kb) => {
    if (!window.confirm(`Deactivate "${kb.name}"? Members will lose access.`)) return;
    try { await authFetch(userId, `/api/kb/${kb.id}`, { method: 'DELETE' }); fetchKBs(); }
    catch { alert('Failed.'); }
  };

  const openKb = (kb) => {
    navigate(`/chat?user_id=${userId}&kb_id=${kb.id}&kb_name=${encodeURIComponent(kb.name)}&folder_id=${kb.folder_id}&folder_name=${encodeURIComponent(kb.folder_name)}`);
  };

  const isIndexing = pendingKb && pendingKb.ingest.phase !== 'done' && pendingKb.ingest.phase !== 'error';

  return (
    <AppLayout
      userId={userId}
      displayName={displayName}
      userEmail={userEmail}
      role={userRole}
      profileLoading={profileLoading}
    >
    <div style={s.page}>

      {/* ── Toolbar (replaces full header — AppLayout provides Navbar) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px 0' }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>Knowledge Bases</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.iBtn} onClick={fetchKBs}
            onMouseEnter={e => Object.assign(e.currentTarget.style, { background: 'var(--bg-3)', color: 'var(--text-1)' })}
            onMouseLeave={e => Object.assign(e.currentTarget.style, { background: 'none', color: 'var(--text-3)' })}>
            <RefreshCw size={14} />
          </button>
          <button style={{ ...s.btnP, opacity: isIndexing ? 0.5 : 1, cursor: isIndexing ? 'not-allowed' : 'pointer' }}
            onClick={() => !isIndexing && setShowCreate(true)}>
            <Plus size={14} /> New knowledge base
          </button>
        </div>
      </div>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 980, margin: '0 auto', padding: '36px 24px' }}>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 10, color: 'var(--text-3)' }}>
            <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />
            <span style={{ fontSize: 14 }}>Loading knowledge bases…</span>
          </div>
        )}

        {/* Grid: pending card first, then real cards */}
        {!loading && (pendingKb || kbs.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 10 }}>

            {/* ① Pending card — shown immediately, disappears 3s after done */}
            {pendingKb && (
              <PendingCard
                pending={pendingKb}
                onDismiss={() => setPendingKb(null)}
              />
            )}

            {/* ② Real KB cards */}
            {kbs.map(kb => (
              <KbCard
                key={kb.id}
                kb={kb}
                copiedId={copiedId}
                onCopy={copyLink}
                onOpen={openKb}
                onAddMember={(kb) => { setAddMemberKb(kb); setAddResult(null); }}
                onDeactivate={handleDeactivate}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && kbs.length === 0 && !pendingKb && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ width: 48, height: 48, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <Database size={20} style={{ color: 'var(--text-3)' }} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 500, margin: '0 0 7px' }}>No knowledge bases yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 28px', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
              Create a shared knowledge base so your team can query the same Drive documents.
            </p>
            <button style={{ ...s.btnP, display: 'inline-flex' }} onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Create your first KB
            </button>
          </div>
        )}
      </main>

      {/* ── Create KB modal ─────────────────────────────────────────── */}
      {showCreate && (
        <div style={s.modal}>
          <div style={s.mbox}>
            <div style={s.mhdr}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>New knowledge base</span>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 3 }}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div>
                <label style={s.lbl}>Name *</label>
                <input style={s.inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Q3 Onboarding Docs"
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>

              <div>
                <label style={s.lbl}>Description</label>
                <textarea style={{ ...s.inp, resize: 'none', lineHeight: 1.6 }} rows={2} value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="What is this knowledge base for?"
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>

              <div>
                <label style={s.lbl}>Drive folders * {form.folders.length > 0 && `· ${form.folders.length} selected`}</label>
                {form.folders.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {form.folders.map(f => (
                      <span key={f.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', padding: '4px 10px', borderRadius: 20 }}>
                        <Folder size={11} />{f.name}
                        <button type="button" onClick={() => setForm(p => ({ ...p, folders: p.folders.filter(x => x.id !== f.id) }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-3)' }}>
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <button type="button"
                  onClick={() => { if (!driveReady) { alert('Google Drive is still loading.'); return; } setShowPicker(true); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px 14px', background: 'var(--bg)', border: '1px dashed var(--border)', borderRadius: 7, color: 'var(--text-2)', fontSize: 13, cursor: 'pointer', transition: 'all 0.12s' }}
                  onMouseEnter={e => Object.assign(e.currentTarget.style, { background: 'var(--bg-3)', color: 'var(--text-1)', borderColor: 'var(--accent)' })}
                  onMouseLeave={e => Object.assign(e.currentTarget.style, { background: 'var(--bg)', color: 'var(--text-2)', borderColor: 'var(--border)' })}>
                  {driveReady
                    ? <><Folder size={14} /> Browse Google Drive folders</>
                    : <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Loading Drive…</>
                  }
                </button>
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>
                  Select one or more folders. All files will be indexed into one shared KB.
                </p>
              </div>

              <div>
                <label style={s.lbl}>Invite members</label>
                <textarea style={{ ...s.inp, resize: 'none', lineHeight: 1.6, fontFamily: 'monospace' }} rows={3}
                  value={form.member_emails} onChange={e => setForm(p => ({ ...p, member_emails: e.target.value }))}
                  placeholder={'colleague1@isteer.com\ncolleague2@isteer.com'}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                  Each person receives an invite email with a unique link.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ flex: 1, ...s.btnS }}
                  onMouseEnter={e => Object.assign(e.currentTarget.style, { background: 'var(--bg-3)', color: 'var(--text-1)' })}
                  onMouseLeave={e => Object.assign(e.currentTarget.style, { background: 'none', color: 'var(--text-2)' })}>
                  Cancel
                </button>
                <button type="submit" style={{ flex: 1, ...s.btnP }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  <Plus size={13} /> Create &amp; index
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add member modal ─────────────────────────────────────────── */}
      {addMemberKb && (
        <div style={s.modal}>
          <div style={{ ...s.mbox, maxWidth: 380 }}>
            <div style={s.mhdr}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Add member — {addMemberKb.name}</span>
              <button onClick={() => { setAddMemberKb(null); setAddResult(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 3 }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ padding: 20 }}>
              {addResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--success)', fontSize: 13 }}>
                    <Check size={14} /> Invite sent to {addResult.email}
                  </div>
                  <div style={{ padding: '10px 13px', background: 'var(--bg-3)', borderRadius: 7, border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>Invite link</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {addResult.link}
                      </span>
                      <button onClick={() => copyLink(addResult.link, 'modal')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 500, padding: 0, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        {copiedId === 'modal' ? <><Check size={10} />Copied</> : <><Copy size={10} />Copy</>}
                      </button>
                    </div>
                  </div>
                  <button onClick={() => setAddResult(null)} style={{ ...s.btnS, width: '100%' }}
                    onMouseEnter={e => Object.assign(e.currentTarget.style, { background: 'var(--bg-3)', color: 'var(--text-1)' })}
                    onMouseLeave={e => Object.assign(e.currentTarget.style, { background: 'none', color: 'var(--text-2)' })}>
                    Add another
                  </button>
                </div>
              ) : (
                <>
                  <label style={{ ...s.lbl, marginBottom: 6 }}>Email address</label>
                  <input style={{ ...s.inp, marginBottom: 13 }} value={addMemberEmail}
                    onChange={e => setAddMemberEmail(e.target.value)} placeholder="colleague@isteer.com"
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setAddMemberKb(null)} style={{ flex: 1, ...s.btnS }}
                      onMouseEnter={e => Object.assign(e.currentTarget.style, { background: 'var(--bg-3)', color: 'var(--text-1)' })}
                      onMouseLeave={e => Object.assign(e.currentTarget.style, { background: 'none', color: 'var(--text-2)' })}>
                      Cancel
                    </button>
                    <button onClick={() => handleAddMember(addMemberKb)} disabled={addingMember}
                      style={{ flex: 1, ...s.btnP, opacity: addingMember ? 0.7 : 1 }}>
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

      {/* ── FolderPicker ────────────────────────────────────────────── */}
      {showPicker && (
        <FolderPicker onSelect={handleFoldersSelected} onClose={() => setShowPicker(false)} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
    </AppLayout>
  );
}