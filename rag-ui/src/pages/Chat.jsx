import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Send, Loader2, Paperclip, Bot,
  FileText, ExternalLink, CheckCircle, AlertCircle,
  Sparkles, Clock, Zap, X, TicketCheck, FolderCheck
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import DrivePicker from '../components/DrivePicker';

const API_BASE       = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

function authFetch(userId, path, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...(options.headers || {}), 'Authorization': `Bearer ${userId}` },
  });
}

// ── Name resolution helpers ───────────────────────────────────────────
function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');
}

// "n.abhishek@isteer.com" → "N Abhishek"
function nameFromEmail(email) {
  if (!email) return '';
  const local = email.split('@')[0];
  const parts = local.replace(/_/g, '.').split('.');
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

// Best available name: real name > email-derived > ''
function bestName(displayName, email) {
  if (displayName && !isUUID(displayName)) return displayName;
  return nameFromEmail(email);
}

// ── Markdown renderer ─────────────────────────────────────────────────
function SimpleMarkdown({ text }) {
  if (!text) return null;
  const lines = text.split('\n'); const els = []; let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const code = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) { code.push(lines[i]); i++; }
      els.push(<pre key={i} className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto text-sm my-3 font-mono"><code>{code.join('\n')}</code></pre>);
    } else if (line.startsWith('### ')) { els.push(<h3 key={i} className="font-bold text-base mt-4 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith('## '))  { els.push(<h2 key={i} className="font-bold text-lg mt-4 mb-1">{line.slice(3)}</h2>);
    } else if (line.startsWith('# '))   { els.push(<h1 key={i} className="font-bold text-xl mt-4 mb-1">{line.slice(2)}</h1>);
    } else if (line.match(/^[-*+] /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*+] /)) { items.push(<li key={i}>{fmt(lines[i].slice(2))}</li>); i++; }
      els.push(<ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-2 text-sm">{items}</ul>); continue;
    } else if (line.match(/^\d+\. /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) { items.push(<li key={i}>{fmt(lines[i].replace(/^\d+\. /, ''))}</li>); i++; }
      els.push(<ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 my-2 text-sm">{items}</ol>); continue;
    } else if (line.trim() === '') { els.push(<br key={i} />);
    } else { els.push(<p key={i} className="leading-relaxed text-[15px]">{fmt(line)}</p>); }
    i++;
  }
  return <div className="space-y-1">{els}</div>;
}
function fmt(text) {
  const parts = []; const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g; let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const r = m[0];
    if (r.startsWith('`'))      parts.push(<code key={m.index} className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 px-1 py-0.5 rounded text-xs font-mono">{r.slice(1,-1)}</code>);
    else if (r.startsWith('**')) parts.push(<strong key={m.index}>{r.slice(2,-2)}</strong>);
    else                         parts.push(<em key={m.index}>{r.slice(1,-1)}</em>);
    last = m.index + r.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

function TicketButton({ message, userId }) {
  const [state, setState] = useState('idle');
  const go = async () => {
    if (!message.interaction_id) return; setState('loading');
    try {
      const res = await authFetch(userId, `/api/raise-ticket/${userId}`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({interaction_id:message.interaction_id,user_query:'',ai_response:message.content,priority:'medium'}),
      });
      if (!res.ok) throw new Error(); setState('success');
    } catch { setState('error'); setTimeout(()=>setState('idle'),3000); }
  };
  if (!message.interaction_id) return null;
  if (state==='success') return <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"><CheckCircle className="w-3.5 h-3.5"/>Ticket raised — support team notified</div>;
  return <button onClick={go} disabled={state==='loading'} className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-gray-200 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-800 transition-all disabled:opacity-50">{state==='loading'?<><Loader2 className="w-3.5 h-3.5 animate-spin"/>Creating...</>:<><TicketCheck className="w-3.5 h-3.5"/>This didn't help — raise a ticket</>}</button>;
}

function IngestProgress({ progress }) {
  if (!progress) return null;
  const { current, total, file, status } = progress;
  const pct = total > 0 ? Math.round((current/total)*100) : 0;
  return (
    <div className="mb-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400 flex-shrink-0"/>
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{status==='embedding'?'Building search index...':`Processing file ${current} of ${total}`}</span>
        </div>
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{pct}%</span>
      </div>
      <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5 mb-2 overflow-hidden">
        <div className="h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 transition-all duration-300" style={{width:`${pct}%`}}/>
      </div>
      {file && status!=='embedding' && (
        <div className="flex items-center gap-1.5">
          <FileText className="w-3 h-3 text-blue-500 dark:text-blue-400 flex-shrink-0"/>
          <span className="text-xs text-blue-600 dark:text-blue-400 truncate max-w-[420px]">{file}</span>
          {status==='done'&&<CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 ml-auto"/>}
          {status==='skipped'&&<span className="text-xs text-gray-400 ml-auto">skipped</span>}
          {status==='processing'&&<span className="text-xs text-blue-500 ml-auto">processing...</span>}
        </div>
      )}
    </div>
  );
}

function AlreadyIndexedBanner({ itemName, onDismiss }) {
  return (
    <div className="mb-3 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 flex items-start gap-3">
      <FolderCheck className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"/>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-green-700 dark:text-green-300">Already indexed — ready to use</p>
        <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 truncate">"{itemName}" was previously processed. Starting a fresh conversation.</p>
      </div>
      <button onClick={onDismiss} className="p-1 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-full transition-colors flex-shrink-0">
        <X className="w-3.5 h-3.5 text-green-600 dark:text-green-400"/>
      </button>
    </div>
  );
}

export default function Chat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const userId          = searchParams.get('user_id');
  const kbIdParam       = searchParams.get('kb_id') ? parseInt(searchParams.get('kb_id'), 10) : null;
  const kbNameParam     = searchParams.get('kb_name')     ? decodeURIComponent(searchParams.get('kb_name'))     : null;
  const folderIdParam   = searchParams.get('folder_id')   || null;
  const folderNameParam = searchParams.get('folder_name') ? decodeURIComponent(searchParams.get('folder_name')) : null;

  const messagesEndRef = useRef(null);
  const [messages,        setMessages]        = useState([]);
  const [input,           setInput]           = useState('');
  const [loading,         setLoading]         = useState(false);
  const [connectedItem,   setConnectedItem]   = useState(null);
  const [activeKbId,      setActiveKbId]      = useState(null);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [driveApiReady,   setDriveApiReady]   = useState(false);
  const [ingestPhase,    setIngestPhase]    = useState(null);
  const [ingestProgress, setIngestProgress] = useState(null);
  const [ingestMessage,  setIngestMessage]  = useState('');
  const [ingestError,    setIngestError]    = useState('');

  // ── THE FIX: store both raw values AND resolved name ─────────────────
  const [displayName,    setDisplayName]    = useState('');
  const [userEmail,      setUserEmail]      = useState('');
  const [userRole,       setUserRole]       = useState('user');
  const [profileLoading, setProfileLoading] = useState(true);

  const [sessionHistory,  setSessionHistory]  = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);

  useEffect(() => { if (!userId) navigate('/'); }, [userId, navigate]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  // Auto-connect when coming from Collaboration page with KB params
  useEffect(() => {
    if (folderIdParam && folderNameParam) {
      setConnectedItem({ id: folderIdParam, name: folderNameParam });
      if (kbIdParam) setActiveKbId(kbIdParam);
    }
  }, [folderIdParam, folderNameParam, kbIdParam]);

  // ── PROFILE + DRIVE INIT ──────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const init = async () => {
      try {
        const res  = await fetch(`${API_BASE}/api/get-token/${userId}`);
        const data = await res.json();

        // ── THE KEY FIX: Set email and role IMMEDIATELY ───────────────
        // Do this BEFORE any async operations so Navbar gets them fast
        const emailVal = data.email || '';
        const roleVal  = data.role  || 'user';
        setUserEmail(emailVal);
        setUserRole(roleVal);

        // Resolve the best available name RIGHT NOW synchronously
        // bestName() uses email as fallback — no async needed
        const name = bestName(data.display_name, emailVal);
        setDisplayName(name);

        // Mark profile as loaded — Navbar will now show real name
        setProfileLoading(false);

        // No token = not authenticated → back to login
        if (!data.access_token) { navigate('/'); return; }

        // ── Google Drive init ─────────────────────────────────────────
        if (window.__gapiLoaded) {
          window.gapi.client.setToken({ access_token: data.access_token });
          setDriveApiReady(true);
          return;
        }

        const script   = document.createElement('script');
        script.src     = 'https://apis.google.com/js/api.js';
        script.onerror = () => { console.error('GAPI load failed'); setDriveApiReady(false); };
        script.onload  = async () => {
          try {
            await new Promise(resolve => window.gapi.load('client', resolve));
            await window.gapi.client.init({ apiKey: GOOGLE_API_KEY, discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'] });
            window.gapi.client.setToken({ access_token: data.access_token });
            window.__gapiLoaded = true;
            setDriveApiReady(true);
          } catch (err) { console.error('GAPI init failed:', err); setDriveApiReady(false); }
        };
        document.body.appendChild(script);

      } catch (err) {
        console.error('Profile fetch error:', err);
        setProfileLoading(false);
      }
    };

    init();
    fetchSessionHistory();
  }, [userId]);

  const fetchSessionHistory = async () => {
    if (!userId) return;
    setSessionsLoading(true);
    try {
      const res  = await authFetch(userId, `/api/sessions/${userId}`);
      const data = await res.json();
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const personal = data.personal || [];
        const shared   = (data.shared || []).map(s => ({ ...s, is_shared: true }));
        setSessionHistory([...personal, ...shared]);
      } else {
        setSessionHistory(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error('Sessions fetch error:', err); }
    finally { setSessionsLoading(false); }
  };

  const handleLoadSession = async (session) => {
    try {
      const res  = await authFetch(userId, `/api/sessions/${userId}/${session.id}/messages`);
      const data = await res.json();
      setMessages(data.messages); setActiveSessionId(session.id);
      setConnectedItem({ id: data.folder_id, name: data.folder_name || data.folder_id });
      setActiveKbId(data.kb_id || null);
    } catch (err) { console.error('Load session error:', err); }
  };

  const handleNewChat = () => {
    setMessages([]); setConnectedItem(null); setActiveSessionId(null); setActiveKbId(null);
    setIngestPhase(null); setIngestProgress(null); setIngestMessage(''); setIngestError(''); setInput('');
  };

  const handleOpenDrivePicker = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!driveApiReady) { alert('Google Drive is still loading. Please wait a moment.'); return; }
    setShowDrivePicker(true);
  };

  const handleDriveSelect = async (item) => {
    setShowDrivePicker(false);
    setIngestPhase('connecting'); setIngestProgress(null); setIngestMessage(''); setIngestError('');
    setMessages([]); setActiveSessionId(null);
    setConnectedItem({ id: item.id, name: item.name });

    const ingestUrl = activeKbId
      ? `/api/ingest-item/${userId}/${item.id}?kb_id=${activeKbId}`
      : `/api/ingest-item/${userId}/${item.id}`;

    try {
      const res = await authFetch(userId, ingestUrl, { method: 'POST' });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Ingestion failed'); }

      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('ndjson')) {
        const data = await res.json();
        setConnectedItem({ id: item.id, name: data.item_name || item.name });
        setIngestPhase('already_indexed');
        setTimeout(() => setIngestPhase('done'), 6000);
        return;
      }

      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const f = JSON.parse(line);
            if (f.type==='progress') { setIngestPhase('progress'); setIngestProgress({current:f.current,total:f.total,file:f.file,status:f.status}); }
            else if (f.type==='done') { setConnectedItem({id:item.id,name:f.item_name||item.name}); setIngestProgress(null); setIngestPhase('done'); setIngestMessage(`✓ Indexed "${f.item_name||item.name}" — ${f.files_processed} file(s), ${f.total_chunks_saved} chunks`); fetchSessionHistory(); setTimeout(()=>{setIngestPhase(null);setIngestMessage('');},5000); }
            else if (f.type==='error') throw new Error(f.detail||'Ingestion failed');
          } catch { /* non-JSON */ }
        }
      }
    } catch (err) {
      setIngestProgress(null); setIngestPhase('error'); setIngestError(err.message||'Failed to process. Please try again.');
      setTimeout(()=>{setIngestPhase(null);setIngestError('');},6000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); if (!input.trim()||loading) return;
    if (!connectedItem) { alert('Please connect a Drive file or folder first.'); return; }
    const userMsg = {role:'user',content:input.trim(),sources:[],interaction_id:null};
    setMessages(prev=>[...prev,userMsg]);
    setMessages(prev=>[...prev,{role:'bot',content:'',sources:[],interaction_id:null,streaming:true}]);
    setInput(''); setLoading(true);
    try {
      const res = await authFetch(userId, `/api/chat/${userId}/${connectedItem.id}`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({question:userMsg.content,folder_name:connectedItem.name,...(activeKbId?{kb_id:activeKbId}:{})}),
      });
      if (!res.ok) throw new Error('Server error');
      const reader=res.body.getReader(); const dec=new TextDecoder(); let buf='';
      while (true) {
        const {done,value}=await reader.read(); if(done)break;
        buf+=dec.decode(value,{stream:true}); const lines=buf.split('\n'); buf=lines.pop();
        for(const line of lines){
          if(!line.trim())continue;
          try{
            const f=JSON.parse(line);
            if(f.type==='token'){setMessages(prev=>{const u=[...prev];const l={...u[u.length-1]};l.content+=f.content;u[u.length-1]=l;return u;});}
            else if(f.type==='done'){setMessages(prev=>{const u=[...prev];const l={...u[u.length-1]};l.sources=f.sources||[];l.interaction_id=f.interaction_id;l.streaming=false;u[u.length-1]=l;return u;});fetchSessionHistory();}
          }catch{/*non-JSON*/}
        }
      }
    } catch { setMessages(prev=>{const u=[...prev];const l={...u[u.length-1]};l.content='An error occurred. Please try again.';l.streaming=false;u[u.length-1]=l;return u;}); }
    finally { setLoading(false); }
  };

  const resolvedName = bestName(displayName, userEmail);

  return (
    <AppLayout userId={userId} displayName={displayName} userEmail={userEmail} role={userRole}
      profileLoading={profileLoading} onNewChat={handleNewChat} sessionHistory={sessionHistory}
      sessionsLoading={sessionsLoading} activeSessionId={activeSessionId} onLoadSession={handleLoadSession}>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-8">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Sparkles className="w-10 h-10 text-white"/>
                </div>
                {activeKbId && kbNameParam && (
                  <div className="mb-4 px-4 py-1.5 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 rounded-full text-sm text-teal-700 dark:text-teal-300 font-medium">
                    Knowledge Base: {kbNameParam}
                  </div>
                )}
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  {profileLoading ? 'How can I help you today?' : resolvedName ? `Hi ${resolvedName.split(' ')[0]}, how can I help?` : 'How can I help you today?'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
                  {connectedItem ? `Connected to "${connectedItem.name}" — ask away!` : driveApiReady ? 'Connect a file or folder from your Google Drive to start chatting.' : 'Loading Google Drive...'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {[{icon:Clock,text:'Summarize recent documents'},{icon:FileText,text:'Find specific information'},{icon:Zap,text:'Compare multiple files'},{icon:Sparkles,text:'Extract key insights'}].map((s,idx)=>(
                    <button key={idx} onClick={()=>setInput(s.text)} className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-all group text-left">
                      <div className="w-10 h-10 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"><s.icon className="w-5 h-5 text-gray-600 dark:text-gray-400"/></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg,idx)=>(
              <div key={idx} className={`flex gap-4 mb-8 ${msg.role==='user'?'justify-end':'justify-start'}`}>
                {msg.role==='bot'&&<div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-gray-900 to-gray-700 dark:from-gray-700 dark:to-gray-500 flex items-center justify-center flex-shrink-0 shadow-sm mt-1"><Bot className="w-5 h-5 text-white"/></div>}
                <div className={`max-w-[75%] ${msg.role==='user'?'bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-2xl rounded-tr-sm shadow-md':'text-gray-900 dark:text-gray-100'}`}>
                  {msg.role==='bot'?<SimpleMarkdown text={msg.content}/>:<p className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</p>}
                  {msg.streaming&&<span className="inline-block w-0.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle"/>}
                  {msg.sources?.length>0&&(
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold mb-2">Sources</p>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((src,i)=>{
                          const name=typeof src==='object'?src.name:src; const link=typeof src==='object'?src.link:null;
                          return link?<a key={i} href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"><FileText className="w-3 h-3"/>{name}<ExternalLink className="w-3 h-3"/></a>
                          :<span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"><FileText className="w-3 h-3"/>{name}</span>;
                        })}
                      </div>
                      <TicketButton message={msg} userId={userId}/>
                    </div>
                  )}
                  {msg.role==='bot'&&!msg.sources?.length&&!msg.streaming&&<TicketButton message={msg} userId={userId}/>}
                </div>
              </div>
            ))}

            {loading&&messages[messages.length-1]?.role!=='bot'&&(
              <div className="flex gap-4 justify-start">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-gray-900 to-gray-700 dark:from-gray-700 dark:to-gray-500 flex items-center justify-center flex-shrink-0 shadow-sm"><Bot className="w-5 h-5 text-white"/></div>
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl"><Loader2 className="w-4 h-4 animate-spin text-gray-400"/><span className="text-sm text-gray-500 dark:text-gray-400">Thinking...</span></div>
              </div>
            )}
            <div ref={messagesEndRef}/>
          </div>
        </div>

        <div className="bg-transparent p-4 pb-5">
          <div className="max-w-3xl mx-auto">
            {ingestPhase==='connecting'&&<div className="mb-3 px-4 py-2.5 rounded-full text-sm font-medium flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Connecting to "{connectedItem?.name}"...</div>}
            {ingestPhase==='progress'&&<IngestProgress progress={ingestProgress}/>}
            {ingestPhase==='already_indexed'&&connectedItem&&<AlreadyIndexedBanner itemName={connectedItem.name} onDismiss={()=>setIngestPhase('done')}/>}
            {ingestPhase==='done'&&ingestMessage&&<div className="mb-3 px-4 py-2.5 rounded-full text-sm font-medium flex items-center justify-center bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"><CheckCircle className="w-4 h-4 mr-2"/>{ingestMessage}</div>}
            {ingestPhase==='error'&&ingestError&&<div className="mb-3 px-4 py-2.5 rounded-full text-sm font-medium flex items-center justify-center bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"><AlertCircle className="w-4 h-4 mr-2"/>{ingestError}</div>}

            {connectedItem&&(
              <div className="mb-3 flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-full">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400"/>
                <span className="text-sm text-blue-700 dark:text-blue-300 font-medium flex-1 truncate">{activeKbId?`[KB] ${connectedItem.name}`:`Connected: ${connectedItem.name}`}</span>
                <button onClick={()=>{setConnectedItem(null);setActiveKbId(null);}} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full transition-colors"><X className="w-4 h-4 text-blue-600 dark:text-blue-400"/></button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full px-4 py-2.5 focus-within:border-gray-400 dark:focus-within:border-gray-500 transition-colors shadow-sm">
              <button type="button" onClick={handleOpenDrivePicker} className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${connectedItem?'text-blue-600 dark:text-blue-400':'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`} title="Connect Google Drive file or folder"><Paperclip className="w-5 h-5"/></button>
              <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSubmit(e);}}} placeholder={connectedItem?`Ask about "${connectedItem.name}"...`:'Attach a Drive file to start...'} className="flex-1 bg-transparent resize-none outline-none text-[15px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 py-1 px-2 max-h-32 leading-relaxed" rows="1" onInput={e=>{e.target.style.height='auto';e.target.style.height=e.target.scrollHeight+'px';}}/>
              <button type="submit" disabled={!input.trim()||loading||ingestPhase==='progress'||ingestPhase==='connecting'} className="w-9 h-9 flex items-center justify-center bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-200 text-white dark:text-gray-900 rounded-full disabled:opacity-25 disabled:cursor-not-allowed transition-all flex-shrink-0 shadow-sm"><Send className="w-4 h-4"/></button>
            </form>
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">Lumina AI can make mistakes. Verify important information from source documents.</p>
          </div>
        </div>
      </div>
      {showDrivePicker&&<DrivePicker userId={userId} onSelect={handleDriveSelect} onClose={()=>setShowDrivePicker(false)}/>}
    </AppLayout>
  );
}