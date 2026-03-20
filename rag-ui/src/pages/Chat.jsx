import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, Loader2, Paperclip, FileText, ExternalLink, CheckCircle, AlertCircle, X, TicketCheck, FolderCheck } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import DrivePicker from '../components/DrivePicker';

const API_BASE       = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

function authFetch(userId, path, opts = {}) {
  return fetch(`${API_BASE}${path}`, { ...opts, headers: { ...(opts.headers || {}), 'Authorization': `Bearer ${userId}` } });
}
function isUUID(s) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || ''); }
function nameFromEmail(e) { if (!e) return ''; return e.split('@')[0].replace(/_/g, '.').split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' '); }
function bestName(dn, em) { return (dn && !isUUID(dn)) ? dn : nameFromEmail(em); }
function initials(dn, em) { const n = bestName(dn, em).trim(); if (!n) return '?'; const w = n.split(/\s+/); return w.length >= 2 ? (w[0][0] + w[w.length-1][0]).toUpperCase() : w[0][0].toUpperCase(); }
function nameHue(name) { return name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360; }

// ── User avatar ───────────────────────────────────────────────────────
function UserAvatar({ displayName, email, size = 26 }) {
  const n   = bestName(displayName, email);
  const ini = initials(displayName, email);
  const hue = nameHue(n || email || 'U');
  return (
    <div title={n || email} style={{ width: size, height: size, borderRadius: '50%', background: `hsl(${hue},45%,40%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
      {ini}
    </div>
  );
}

// ── Markdown ──────────────────────────────────────────────────────────
function Markdown({ text }) {
  if (!text) return null;
  const lines = text.split('\n'); const els = []; let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const code = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) { code.push(lines[i]); i++; }
      els.push(<pre key={i} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 7, padding: '12px 14px', overflowX: 'auto', fontSize: 12, fontFamily: 'monospace', margin: '8px 0', color: 'var(--text-1)' }}><code>{code.join('\n')}</code></pre>);
    } else if (line.startsWith('### ')) { els.push(<p key={i} style={{ fontWeight: 600, fontSize: 14, margin: '14px 0 4px', color: 'var(--text-1)', fontFamily: 'var(--font-display)' }}>{line.slice(4)}</p>);
    } else if (line.startsWith('## '))  { els.push(<p key={i} style={{ fontWeight: 600, fontSize: 15, margin: '16px 0 5px', color: 'var(--text-1)', fontFamily: 'var(--font-display)' }}>{line.slice(3)}</p>);
    } else if (line.startsWith('# '))   { els.push(<p key={i} style={{ fontWeight: 600, fontSize: 16, margin: '18px 0 6px', color: 'var(--text-1)', fontFamily: 'var(--font-display)' }}>{line.slice(2)}</p>);
    } else if (line.match(/^[-*+] /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*+] /)) { items.push(<li key={i} style={{ marginBottom: 3 }}>{inlineFmt(lines[i].slice(2))}</li>); i++; }
      els.push(<ul key={`ul${i}`} style={{ paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column' }}>{items}</ul>); continue;
    } else if (line.match(/^\d+\. /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) { items.push(<li key={i} style={{ marginBottom: 3 }}>{inlineFmt(lines[i].replace(/^\d+\. /, ''))}</li>); i++; }
      els.push(<ol key={`ol${i}`} style={{ paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column' }}>{items}</ol>); continue;
    } else if (line.trim() === '') { els.push(<div key={i} style={{ height: 6 }} />);
    } else { els.push(<p key={i} style={{ margin: '2px 0', lineHeight: 1.7, fontSize: 14, fontFamily: 'var(--font-body)' }}>{inlineFmt(line)}</p>); }
    i++;
  }
  return <div style={{ color: 'var(--text-1)' }}>{els}</div>;
}
function inlineFmt(text) {
  const parts = []; const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g; let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const r = m[0];
    if (r.startsWith('`'))   parts.push(<code key={m.index} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--gold)', padding: '1px 5px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>{r.slice(1,-1)}</code>);
    else if (r.startsWith('**')) parts.push(<strong key={m.index} style={{ fontWeight: 600, color: 'var(--text-1)' }}>{r.slice(2,-2)}</strong>);
    else parts.push(<em key={m.index} style={{ color: 'var(--text-2)' }}>{r.slice(1,-1)}</em>);
    last = m.index + r.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

// ── Ticket button ─────────────────────────────────────────────────────
function TicketBtn({ message, userId }) {
  const [state, setState] = useState('idle');
  const raise = async () => {
    if (!message.interaction_id) return;
    setState('loading');
    try {
      const res = await authFetch(userId, `/api/raise-ticket/${userId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interaction_id: message.interaction_id, user_query: '', ai_response: message.content, priority: 'medium' }) });
      if (!res.ok) throw new Error();
      setState('success');
    } catch { setState('error'); setTimeout(() => setState('idle'), 3000); }
  };
  if (!message.interaction_id) return null;
  if (state === 'success') return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, padding: '4px 10px', background: 'var(--success-dim)', border: '1px solid var(--success-bdr)', borderRadius: 5, fontSize: 11, color: 'var(--success)' }}><CheckCircle size={11} /> Ticket raised</div>;
  return (
    <button onClick={raise} disabled={state === 'loading'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, padding: '4px 10px', background: 'none', border: '1px solid var(--border)', borderRadius: 5, fontSize: 11, color: 'var(--text-3)', cursor: 'pointer', transition: 'all 0.1s', fontFamily: 'var(--font-body)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--warn-bdr)'; e.currentTarget.style.color = 'var(--warn)'; e.currentTarget.style.background = 'var(--warn-dim)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'none'; }}>
      {state === 'loading' ? <><Loader2 size={11} style={{ animation: 'spin 0.7s linear infinite' }} />Raising…</> : <><TicketCheck size={11} />Raise ticket</>}
    </button>
  );
}

function IngestBar({ progress }) {
  if (!progress) return null;
  const { current, total, file, status } = progress;
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10, padding: '10px 14px', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Loader2 size={12} style={{ color: 'var(--gold)', animation: 'spin 0.7s linear infinite' }} />
          <span style={{ fontSize: 12, color: 'var(--gold)', fontFamily: 'var(--font-body)' }}>{status === 'embedding' ? 'Building search index…' : `Processing ${current} of ${total}`}</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 500, fontFamily: 'monospace' }}>{pct}%</span>
      </div>
      <div style={{ background: 'rgba(200,169,110,0.12)', borderRadius: 3, height: 2, overflow: 'hidden' }}>
        <div style={{ height: 2, background: 'var(--gold)', borderRadius: 3, width: `${pct}%`, transition: 'width 0.3s' }} />
      </div>
      {file && status !== 'embedding' && <p style={{ fontSize: 11, color: 'var(--gold)', marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.6, fontFamily: 'monospace' }}>{file}</p>}
    </div>
  );
}

const SUGGESTIONS = ['Summarize the key points', 'What are the action items?', 'Compare across documents', 'Extract all dates and deadlines'];

// ═════════════════════════════════════════════════════════════════════
export default function Chat() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const userId          = searchParams.get('user_id');
  const kbIdParam       = searchParams.get('kb_id') ? parseInt(searchParams.get('kb_id'), 10) : null;
  const kbNameParam     = searchParams.get('kb_name')     ? decodeURIComponent(searchParams.get('kb_name'))     : null;
  const folderIdParam   = searchParams.get('folder_id')   || null;
  const folderNameParam = searchParams.get('folder_name') ? decodeURIComponent(searchParams.get('folder_name')) : null;
  const endRef   = useRef(null);
  const inputRef = useRef(null);

  const [messages,        setMessages]        = useState([]);
  const [input,           setInput]           = useState('');
  const [loading,         setLoading]         = useState(false);
  const [connected,       setConnected]       = useState(null);
  const [activeKbId,      setActiveKbId]      = useState(null);
  const [isSharedSession, setIsSharedSession] = useState(false);
  const [showPicker,      setShowPicker]      = useState(false);
  const [driveReady,      setDriveReady]      = useState(false);
  const [ingestPhase,     setIngestPhase]     = useState(null);
  const [ingestProgress,  setIngestProgress]  = useState(null);
  const [ingestMsg,       setIngestMsg]       = useState('');
  const [ingestErr,       setIngestErr]       = useState('');
  const [displayName,     setDisplayName]     = useState('');
  const [userEmail,       setUserEmail]       = useState('');
  const [userRole,        setUserRole]        = useState('user');
  const [profileLoading,  setProfileLoading]  = useState(true);
  const [sessions,        setSessions]        = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activeSession,   setActiveSession]   = useState(null);

  useEffect(() => { if (!userId) navigate('/'); }, [userId, navigate]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => {
    if (folderIdParam && folderNameParam) { setConnected({ id: folderIdParam, name: folderNameParam }); if (kbIdParam) { setActiveKbId(kbIdParam); setIsSharedSession(true); } }
  }, [folderIdParam, folderNameParam, kbIdParam]);

  useEffect(() => {
    if (!userId) return;
    const init = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/get-token/${userId}`);
        const d   = await res.json();
        setUserEmail(d.email || ''); setUserRole(d.role || 'user');
        setDisplayName(bestName(d.display_name, d.email)); setProfileLoading(false);
        if (!d.access_token) { navigate('/'); return; }
        if (window.__gapiLoaded) { window.gapi.client.setToken({ access_token: d.access_token }); setDriveReady(true); return; }
        const script = document.createElement('script'); script.src = 'https://apis.google.com/js/api.js';
        script.onerror = () => setDriveReady(false);
        script.onload  = async () => {
          try {
            await new Promise(r => window.gapi.load('client', r));
            await window.gapi.client.init({ apiKey: GOOGLE_API_KEY, discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'] });
            window.gapi.client.setToken({ access_token: d.access_token }); window.__gapiLoaded = true; setDriveReady(true);
          } catch { setDriveReady(false); }
        };
        document.body.appendChild(script);
      } catch { setProfileLoading(false); }
    };
    init(); fetchSessions();
  }, [userId]);

  const fetchSessions = async () => {
    if (!userId) return; setSessionsLoading(true);
    try {
      const res = await authFetch(userId, `/api/sessions/${userId}`); const d = await res.json();
      if (d && typeof d === 'object' && !Array.isArray(d)) { const p = d.personal || []; const s = (d.shared || []).map(x => ({ ...x, is_shared: true })); setSessions([...p, ...s]); }
      else setSessions(Array.isArray(d) ? d : []);
    } catch {} finally { setSessionsLoading(false); }
  };

  const loadSession = async (session) => {
    try {
      const res = await authFetch(userId, `/api/sessions/${userId}/${session.id}/messages`); const d = await res.json();
      setMessages(d.messages || []); setActiveSession(session.id);
      setConnected({ id: d.folder_id, name: d.folder_name || d.folder_id });
      setActiveKbId(d.kb_id || null); setIsSharedSession(!!d.kb_id);
    } catch {}
  };

  const newChat = () => { setMessages([]); setConnected(null); setActiveSession(null); setActiveKbId(null); setIsSharedSession(false); setIngestPhase(null); setIngestProgress(null); setIngestMsg(''); setIngestErr(''); setInput(''); inputRef.current?.focus(); };

  const handleDriveSelect = async (item) => {
    setShowPicker(false); setIngestPhase('connecting'); setIngestProgress(null); setIngestMsg(''); setIngestErr(''); setMessages([]); setActiveSession(null); setConnected({ id: item.id, name: item.name });
    const url = activeKbId ? `/api/ingest-item/${userId}/${item.id}?kb_id=${activeKbId}` : `/api/ingest-item/${userId}/${item.id}`;
    try {
      const res = await authFetch(userId, url, { method: 'POST' }); if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Ingestion failed'); }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('ndjson')) { const d = await res.json(); setConnected({ id: item.id, name: d.item_name || item.name }); setIngestPhase('already_indexed'); setTimeout(() => setIngestPhase('done'), 6000); return; }
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop();
        for (const line of lines) { if (!line.trim()) continue; try { const frame = JSON.parse(line);
          if (frame.type === 'progress') { setIngestPhase('progress'); setIngestProgress({ current: frame.current, total: frame.total, file: frame.file, status: frame.status }); }
          else if (frame.type === 'done') { setConnected({ id: item.id, name: frame.item_name || item.name }); setIngestProgress(null); setIngestPhase('done'); setIngestMsg(`Indexed "${frame.item_name || item.name}" · ${frame.files_processed} files`); await fetchSessions(); setTimeout(() => { setIngestPhase(null); setIngestMsg(''); }, 5000); }
          else if (frame.type === 'error') throw new Error(frame.detail || 'Ingestion failed');
        } catch {} }
      }
    } catch (err) { setIngestProgress(null); setIngestPhase('error'); setIngestErr(err.message || 'Failed.'); setTimeout(() => { setIngestPhase(null); setIngestErr(''); }, 6000); }
  };

  const submit = async (e) => {
    e.preventDefault(); if (!input.trim() || loading) return; if (!connected) { alert('Please connect a Drive file or folder first.'); return; }
    const question = input.trim();
    const userMsg  = { role: 'user', content: question, sources: [], interaction_id: null, asked_by_user_id: userId, asked_by_display_name: displayName, asked_by_email: userEmail };
    setMessages(prev => [...prev, userMsg, { role: 'bot', content: '', sources: [], interaction_id: null, streaming: true }]);
    setInput(''); setLoading(true);
    try {
      const res = await authFetch(userId, `/api/chat/${userId}/${connected.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, folder_name: connected.name, ...(activeKbId ? { kb_id: activeKbId } : {}) }) });
      if (!res.ok) throw new Error('Server error');
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; const isNew = activeSession === null;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop();
        for (const line of lines) { if (!line.trim()) continue; try { const frame = JSON.parse(line);
          if (frame.type === 'token') { setMessages(prev => { const u = [...prev]; const l = { ...u[u.length-1] }; l.content += frame.content; u[u.length-1] = l; return u; }); }
          else if (frame.type === 'done') {
            setMessages(prev => { const u = [...prev]; const l = { ...u[u.length-1] }; l.sources = frame.sources || []; l.interaction_id = frame.interaction_id; l.streaming = false; u[u.length-1] = l; return u; });
            await fetchSessions();
            if (isNew) { try { const sr = await authFetch(userId, `/api/sessions/${userId}`); const sd = await sr.json(); let all = []; if (sd && typeof sd === 'object' && !Array.isArray(sd)) { all = [...(sd.personal || []), ...(sd.shared || []).map(x => ({ ...x, is_shared: true }))]; } setSessions(all); const ns = all.find(s => activeKbId ? s.kb_id === activeKbId : s.folder_id === connected?.id && !s.is_shared); if (ns) setActiveSession(ns.id); } catch {} }
          }
        } catch {} }
      }
    } catch { setMessages(prev => { const u = [...prev]; const l = { ...u[u.length-1] }; l.content = 'Something went wrong.'; l.streaming = false; u[u.length-1] = l; return u; }); }
    finally { setLoading(false); }
  };

  return (
    <AppLayout userId={userId} displayName={displayName} userEmail={userEmail} role={userRole} profileLoading={profileLoading} onNewChat={newChat} sessionHistory={sessions} sessionsLoading={sessionsLoading} activeSessionId={activeSession} onLoadSession={loadSession}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 28px 20px' }}>

            {messages.length === 0 && (
              <div style={{ textAlign: 'center', paddingTop: 40, animation: 'fadein 0.4s ease' }}>
                {activeKbId && kbNameParam && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 14px', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', borderRadius: 20, fontSize: 11, fontWeight: 500, color: 'var(--gold)', marginBottom: 28, fontFamily: 'var(--font-body)' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)' }} /> {kbNameParam}
                  </div>
                )}
                <div style={{ width: 48, height: 48, background: 'var(--gold)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(200,169,110,0.25)' }}>
                  <svg width="22" height="22" viewBox="0 0 13 13" fill="none"><path d="M2.5 10.5L6.5 2.5L10.5 10.5" stroke="#0b0b0d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text-1)', margin: '0 0 10px' }}>
                  {profileLoading ? 'Hello' : displayName ? `Hello, ${bestName(displayName, userEmail).split(' ')[0]}` : 'Hello'}
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '0 0 40px', fontFamily: 'var(--font-body)', fontWeight: 300 }}>
                  {connected ? `Connected to "${connected.name}"` : driveReady ? 'Attach a Drive file or folder to begin' : 'Loading Google Drive…'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 520, margin: '0 auto' }}>
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      style={{ padding: '7px 14px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 12, color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'var(--font-body)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold-dim)'; e.currentTarget.style.color = 'var(--gold)'; e.currentTarget.style.borderColor = 'var(--gold-border)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-2)'; e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 12, marginBottom: 28, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', animation: 'fadein 0.2s ease' }}>
                {msg.role === 'bot' && (
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, boxShadow: '0 4px 12px rgba(200,169,110,0.2)' }}>
                    <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M2.5 10.5L6.5 2.5L10.5 10.5" stroke="#0b0b0d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                )}
                {msg.role === 'user' && isSharedSession && <UserAvatar displayName={msg.asked_by_display_name || displayName} email={msg.asked_by_email || userEmail} size={26} />}

                <div style={{ maxWidth: '76%' }}>
                  {msg.role === 'user' && isSharedSession && (
                    <p style={{ fontSize: 10, color: 'var(--gold)', margin: '0 0 4px', fontWeight: 500, fontFamily: 'var(--font-body)', opacity: 0.8 }}>{bestName(msg.asked_by_display_name || displayName, msg.asked_by_email || userEmail)}</p>
                  )}
                  {msg.role === 'user' ? (
                    <div style={{ padding: '10px 15px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, borderBottomRightRadius: 3, fontSize: 14, color: 'var(--text-1)', lineHeight: 1.65, boxShadow: 'var(--shadow-sm)', fontFamily: 'var(--font-body)' }}>
                      {msg.content}
                    </div>
                  ) : (
                    <div>
                      <Markdown text={msg.content} />
                      {msg.streaming && <span style={{ display: 'inline-block', width: 2, height: 14, background: 'var(--gold)', marginLeft: 3, verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }} />}
                      {msg.sources?.length > 0 && (
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-sub)' }}>
                          <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'var(--font-body)' }}>Sources</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {msg.sources.map((src, i) => {
                              const name = typeof src === 'object' ? src.name : src;
                              const link = typeof src === 'object' ? src.link : null;
                              const st   = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 5, fontSize: 11, color: 'var(--text-2)', textDecoration: 'none', transition: 'all 0.1s', fontFamily: 'var(--font-body)' };
                              return link
                                ? <a key={i} href={link} target="_blank" rel="noopener noreferrer" style={st} onMouseEnter={e => { e.currentTarget.style.color = 'var(--gold)'; e.currentTarget.style.borderColor = 'var(--gold-border)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}><FileText size={10} />{name}<ExternalLink size={9} /></a>
                                : <span key={i} style={st}><FileText size={10} />{name}</span>;
                            })}
                          </div>
                          <TicketBtn message={msg} userId={userId} />
                        </div>
                      )}
                      {msg.role === 'bot' && !msg.sources?.length && !msg.streaming && <TicketBtn message={msg} userId={userId} />}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && messages[messages.length-1]?.role !== 'bot' && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M2.5 10.5L6.5 2.5L10.5 10.5" stroke="#0b0b0d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 0' }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--gold)', animation: `dotpulse 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {/* Input */}
        <div style={{ padding: '10px 28px 18px', flexShrink: 0, background: 'var(--bg)' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {ingestPhase === 'connecting' && <div style={{ marginBottom: 8, padding: '8px 13px', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', borderRadius: 7, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--gold)', fontFamily: 'var(--font-body)' }}><Loader2 size={12} style={{ animation: 'spin 0.7s linear infinite' }} />Connecting…</div>}
            {ingestPhase === 'progress' && <IngestBar progress={ingestProgress} />}
            {ingestPhase === 'already_indexed' && connected && (
              <div style={{ marginBottom: 8, padding: '8px 13px', background: 'var(--success-dim)', border: '1px solid var(--success-bdr)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><FolderCheck size={13} style={{ color: 'var(--success)' }} /><span style={{ fontSize: 12, color: 'var(--success)', fontFamily: 'var(--font-body)' }}>"{connected.name}" is already indexed</span></div>
                <button onClick={() => setIngestPhase('done')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success)', display: 'flex' }}><X size={12} /></button>
              </div>
            )}
            {ingestPhase === 'done' && ingestMsg && <div style={{ marginBottom: 8, padding: '8px 13px', background: 'var(--success-dim)', border: '1px solid var(--success-bdr)', borderRadius: 7, display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--success)', fontFamily: 'var(--font-body)' }}><CheckCircle size={12} />{ingestMsg}</div>}
            {ingestPhase === 'error' && ingestErr && <div style={{ marginBottom: 8, padding: '8px 13px', background: 'var(--danger-dim)', border: '1px solid var(--danger-bdr)', borderRadius: 7, display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--danger)', fontFamily: 'var(--font-body)' }}><AlertCircle size={12} />{ingestErr}</div>}

            {connected && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 11, color: 'var(--text-2)', marginBottom: 7, fontFamily: 'var(--font-body)' }}>
                <FileText size={11} style={{ color: 'var(--gold)' }} />
                <span style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeKbId ? `KB: ${connected.name}` : connected.name}</span>
                <button onClick={() => { setConnected(null); setActiveKbId(null); setIsSharedSession(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 0, display: 'flex', marginLeft: 2 }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}><X size={11} /></button>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', boxShadow: 'var(--shadow-sm)', transition: 'border-color 0.15s, box-shadow 0.15s' }}
              onFocusCapture={e => { e.currentTarget.style.borderColor = 'var(--gold-border)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--gold-dim)'; }}
              onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
              <button onClick={e => { e.preventDefault(); if (!driveReady) { alert('Google Drive is still loading.'); return; } setShowPicker(true); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: connected ? 'var(--gold)' : 'var(--text-3)', padding: '2px 3px', display: 'flex', flexShrink: 0, transition: 'color 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.color = connected ? 'var(--gold-h)' : 'var(--text-2)'}
                onMouseLeave={e => e.currentTarget.style.color = connected ? 'var(--gold)' : 'var(--text-3)'}>
                <Paperclip size={15} />
              </button>
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(e); } }}
                placeholder={connected ? `Ask about "${connected.name}"…` : 'Attach a Drive file to start…'}
                rows={1} onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 130) + 'px'; }}
                style={{ flex: 1, background: 'none', border: 'none', resize: 'none', color: 'var(--text-1)', fontSize: 14, lineHeight: 1.65, padding: 0, minHeight: 22, maxHeight: 130, fontFamily: 'var(--font-body)' }} />
              <button onClick={submit} disabled={!input.trim() || loading || ingestPhase === 'progress' || ingestPhase === 'connecting'}
                style={{ width: 28, height: 28, borderRadius: 6, background: input.trim() && !loading ? 'var(--gold)' : 'var(--bg-3)', border: '1px solid var(--border)', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}
                onMouseEnter={e => { if (input.trim() && !loading) e.currentTarget.style.background = 'var(--gold-h)'; }}
                onMouseLeave={e => { if (input.trim() && !loading) e.currentTarget.style.background = 'var(--gold)'; }}>
                <Send size={12} style={{ color: input.trim() && !loading ? '#0b0b0d' : 'var(--text-3)' }} />
              </button>
            </div>
            <p style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-3)', marginTop: 7, fontFamily: 'var(--font-body)' }}>Lumina may make mistakes — always verify with source documents</p>
          </div>
        </div>
      </div>
      {showPicker && <DrivePicker userId={userId} onSelect={handleDriveSelect} onClose={() => setShowPicker(false)} />}
    </AppLayout>
  );
}