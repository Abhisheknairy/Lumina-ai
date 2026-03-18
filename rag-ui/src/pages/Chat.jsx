import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Send, Loader2, Paperclip, Bot,
  FileText, ExternalLink, CheckCircle, AlertCircle,
  Sparkles, Clock, Zap, X, TicketCheck
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import DrivePicker from '../components/DrivePicker';

const API_BASE       = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

// ── Auth helper — injects Bearer <user_id> on every protected request ─
// /api/get-token is the only endpoint called WITHOUT this (it's public,
// needed before we know if the session is valid).
function authFetch(userId, path, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Authorization': `Bearer ${userId}`,
    },
  });
}

// UUID detection helper — never render a UUID as a display name
function safeDisplayName(name) {
  if (!name) return '';
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name);
  return isUuid ? '' : name;
}

// ── SIMPLE MARKDOWN RENDERER ──────────────────────────────────────────
function SimpleMarkdown({ text }) {
  if (!text) return null;
  const lines    = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++; }
      elements.push(
        <pre key={i} className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto text-sm my-3 font-mono">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="font-bold text-base mt-4 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="font-bold text-lg mt-4 mb-1">{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="font-bold text-xl mt-4 mb-1">{line.slice(2)}</h1>);
    } else if (line.match(/^[-*+] /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*+] /)) {
        items.push(<li key={i}>{inlineFormat(lines[i].slice(2))}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-2 text-sm">{items}</ul>);
      continue;
    } else if (line.match(/^\d+\. /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(<li key={i}>{inlineFormat(lines[i].replace(/^\d+\. /, ''))}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 my-2 text-sm">{items}</ol>);
      continue;
    } else if (line.trim() === '') {
      elements.push(<br key={i} />);
    } else {
      elements.push(<p key={i} className="leading-relaxed text-[15px]">{inlineFormat(line)}</p>);
    }
    i++;
  }
  return <div className="space-y-1">{elements}</div>;
}

function inlineFormat(text) {
  const parts = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0, match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const raw = match[0];
    if (raw.startsWith('`'))      parts.push(<code key={match.index} className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 px-1 py-0.5 rounded text-xs font-mono">{raw.slice(1, -1)}</code>);
    else if (raw.startsWith('**')) parts.push(<strong key={match.index}>{raw.slice(2, -2)}</strong>);
    else                           parts.push(<em key={match.index}>{raw.slice(1, -1)}</em>);
    last = match.index + raw.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
}

// ── TICKET BUTTON ─────────────────────────────────────────────────────
function TicketButton({ message, userId }) {
  const [state, setState] = useState('idle'); // idle | loading | success | error

  const handleRaiseTicket = async () => {
    if (!message.interaction_id) return;
    setState('loading');
    try {
      // SECURED: authFetch injects Authorization: Bearer <userId>
      const res = await authFetch(userId, `/api/raise-ticket/${userId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interaction_id: message.interaction_id,
          user_query:     '',
          ai_response:    message.content,
          priority:       'medium',
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setState('success');
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  if (!message.interaction_id) return null;

  if (state === 'success') {
    return (
      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
        <CheckCircle className="w-3.5 h-3.5" />
        Ticket raised — support team notified
      </div>
    );
  }

  return (
    <button
      onClick={handleRaiseTicket}
      disabled={state === 'loading'}
      className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-gray-200 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-800 transition-all disabled:opacity-50"
    >
      {state === 'loading'
        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Creating...</>
        : <><TicketCheck className="w-3.5 h-3.5" />This didn't help — raise a ticket</>
      }
    </button>
  );
}

// ── MAIN CHAT COMPONENT ───────────────────────────────────────────────
export default function Chat() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const userId         = searchParams.get('user_id');
  const messagesEndRef = useRef(null);

  // Chat state
  const [messages,        setMessages]        = useState([]);
  const [input,           setInput]           = useState('');
  const [loading,         setLoading]         = useState(false);
  const [connectedItem,   setConnectedItem]   = useState(null);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [driveApiReady,   setDriveApiReady]   = useState(false);

  // Ingestion
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState('');
  const [ingestError,   setIngestError]   = useState('');

  // User profile
  const [displayName,    setDisplayName]    = useState('');
  const [userEmail,      setUserEmail]      = useState('');
  const [profileLoading, setProfileLoading] = useState(true);

  // Session history (for sidebar)
  const [sessionHistory,  setSessionHistory]  = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);

  useEffect(() => { if (!userId) navigate('/'); }, [userId, navigate]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  // ── Fetch profile + init Google Drive ──────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const init = async () => {
      try {
        // /api/get-token is PUBLIC — plain fetch, no auth header needed.
        // It returns null access_token if the user has no session → redirect to login.
        const res  = await fetch(`${API_BASE}/api/get-token/${userId}`);
        const data = await res.json();

        const name = safeDisplayName(data.display_name);
        if (name) {
          setDisplayName(name);
        } else {
          // Fallback: try analytics which also carries user_profile.
          // SECURED: analytics is a protected endpoint — use authFetch.
          authFetch(userId, `/api/analytics/${userId}`)
            .then(r => r.json())
            .then(a => { const n = safeDisplayName(a?.user_profile?.display_name); if (n) setDisplayName(n); })
            .catch(() => {});
        }
        if (data.email) setUserEmail(data.email);
        setProfileLoading(false);

        if (!data.access_token) return;

        // Guard against duplicate GAPI script injection
        if (window.__gapiLoaded) {
          window.gapi.client.setToken({ access_token: data.access_token });
          setDriveApiReady(true);
          return;
        }

        const script   = document.createElement('script');
        script.src     = 'https://apis.google.com/js/api.js';
        script.onerror = () => console.error('Failed to load Google API script');
        script.onload  = async () => {
          try {
            await new Promise(resolve => window.gapi.load('client', resolve));
            await window.gapi.client.init({
              apiKey:        GOOGLE_API_KEY,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
            });
            window.gapi.client.setToken({ access_token: data.access_token });
            window.__gapiLoaded = true;
            setDriveApiReady(true);
          } catch (err) {
            console.error('Google API init failed:', err);
          }
        };
        document.body.appendChild(script);
      } catch (err) {
        console.error('Profile/token fetch error:', err);
        setProfileLoading(false);
      }
    };

    init();
    fetchSessionHistory();
  }, [userId]);

  // ── Session history ────────────────────────────────────────────────
  const fetchSessionHistory = async () => {
    if (!userId) return;
    setSessionsLoading(true);
    try {
      // SECURED: requires Authorization: Bearer <userId>
      const res  = await authFetch(userId, `/api/sessions/${userId}`);
      const data = await res.json();
      setSessionHistory(data);
    } catch (err) {
      console.error('Sessions fetch error:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleLoadSession = async (session) => {
    try {
      // SECURED: requires Authorization: Bearer <userId>
      const res  = await authFetch(userId, `/api/sessions/${userId}/${session.id}/messages`);
      const data = await res.json();
      setMessages(data.messages);
      setActiveSessionId(session.id);
      setConnectedItem({ id: data.folder_id, name: data.folder_name || data.folder_id });
    } catch (err) {
      console.error('Load session error:', err);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConnectedItem(null);
    setActiveSessionId(null);
    setIngestSuccess('');
    setIngestError('');
    setInput('');
  };

  // ── Drive picker ───────────────────────────────────────────────────
  const handleOpenDrivePicker = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!driveApiReady) {
      alert('Google Drive is still loading. Please wait a moment.');
      return;
    }
    setShowDrivePicker(true);
  };

  // ── Drive item selected → ingest ───────────────────────────────────
  const handleDriveSelect = async (item) => {
    setShowDrivePicker(false);
    setConnectedItem(item);
    setIngestLoading(true);
    setIngestError('');
    setIngestSuccess(`Connecting to "${item.name}"...`);

    try {
      // SECURED: requires Authorization: Bearer <userId>
      const res  = await authFetch(userId, `/api/ingest-item/${userId}/${item.id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ingestion failed');

      const realName = data.item_name || item.name;
      setConnectedItem({ id: item.id, name: realName });
      setIngestSuccess(`✓ Connected "${realName}" — ${data.files_processed} file(s), ${data.total_chunks_saved} chunks`);
      setTimeout(() => setIngestSuccess(''), 5000);
    } catch (err) {
      setIngestError(err.message || 'Failed to process. Please try again.');
      setTimeout(() => setIngestError(''), 5000);
    } finally {
      setIngestLoading(false);
    }
  };

  // ── Chat submit — streaming ────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    if (!connectedItem) {
      alert('Please connect a Drive file or folder first.');
      return;
    }

    const userMessage = { role: 'user', content: input.trim(), sources: [], interaction_id: null };
    setMessages(prev => [...prev, userMessage]);
    setMessages(prev => [...prev, { role: 'bot', content: '', sources: [], interaction_id: null, streaming: true }]);
    setInput('');
    setLoading(true);

    try {
      // SECURED: requires Authorization: Bearer <userId>
      const res = await authFetch(userId, `/api/chat/${userId}/${connectedItem.id}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ question: userMessage.content, folder_name: connectedItem.name }),
      });

      if (!res.ok) throw new Error('Server error');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const frame = JSON.parse(line);
            if (frame.type === 'token') {
              setMessages(prev => {
                const updated = [...prev];
                const last    = { ...updated[updated.length - 1] };
                last.content += frame.content;
                updated[updated.length - 1] = last;
                return updated;
              });
            } else if (frame.type === 'done') {
              setMessages(prev => {
                const updated = [...prev];
                const last    = { ...updated[updated.length - 1] };
                last.sources        = frame.sources || [];
                last.interaction_id = frame.interaction_id;
                last.streaming      = false;
                updated[updated.length - 1] = last;
                return updated;
              });
              fetchSessionHistory();
            }
          } catch { /* non-JSON line */ }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        const last    = { ...updated[updated.length - 1] };
        last.content   = 'An error occurred. Please try again.';
        last.streaming = false;
        updated[updated.length - 1] = last;
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const getIngestStatusStyle = () => {
    if (ingestLoading) return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
    if (ingestError)   return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800';
    if (ingestSuccess) return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800';
    return '';
  };

  const safeName = safeDisplayName(displayName);

  return (
    <AppLayout
      userId={userId}
      displayName={displayName}
      userEmail={userEmail}
      profileLoading={profileLoading}
      onNewChat={handleNewChat}
      sessionHistory={sessionHistory}
      sessionsLoading={sessionsLoading}
      activeSessionId={activeSessionId}
      onLoadSession={handleLoadSession}
    >
      <div className="flex flex-col h-full">

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-8">

            {/* Empty State */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  {profileLoading
                    ? 'How can I help you today?'
                    : safeName
                      ? `Hi ${safeName.split(' ')[0]}, how can I help?`
                      : 'How can I help you today?'
                  }
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
                  {driveApiReady
                    ? 'Connect a file or folder from your Google Drive to start chatting.'
                    : 'Initializing Google Drive connection...'}
                </p>

                {/* Suggestion chips */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {[
                    { icon: Clock,    text: 'Summarize recent documents' },
                    { icon: FileText, text: 'Find specific information'  },
                    { icon: Zap,      text: 'Compare multiple files'     },
                    { icon: Sparkles, text: 'Extract key insights'       },
                  ].map((s, idx) => (
                    <button
                      key={idx}
                      className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-all group text-left"
                      onClick={() => setInput(s.text)}
                    >
                      <div className="w-10 h-10 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <s.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-4 mb-8 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {/* Bot Avatar */}
                {message.role === 'bot' && (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-gray-900 to-gray-700 dark:from-gray-700 dark:to-gray-500 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}

                {/* Message Content */}
                <div className={`max-w-[75%] ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-2xl rounded-tr-sm shadow-md'
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {message.role === 'bot'
                    ? <SimpleMarkdown text={message.content} />
                    : <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{message.content}</p>
                  }

                  {/* Streaming cursor */}
                  {message.streaming && (
                    <span className="inline-block w-0.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle" />
                  )}

                  {/* Sources */}
                  {message.sources?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold mb-2">Sources</p>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.map((source, idx) => {
                          const name = typeof source === 'object' ? source.name : source;
                          const link = typeof source === 'object' ? source.link : null;
                          return link ? (
                            <a key={idx} href={link} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                              <FileText className="w-3 h-3" />{name}<ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                              <FileText className="w-3 h-3" />{name}
                            </span>
                          );
                        })}
                      </div>
                      <TicketButton message={message} userId={userId} />
                    </div>
                  )}

                  {message.role === 'bot' && !message.sources?.length && !message.streaming && (
                    <TicketButton message={message} userId={userId} />
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && messages[messages.length - 1]?.role !== 'bot' && (
              <div className="flex gap-4 justify-start">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-gray-900 to-gray-700 dark:from-gray-700 dark:to-gray-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-transparent p-4 pb-5">
          <div className="max-w-3xl mx-auto">

            {/* Ingestion status */}
            {(ingestLoading || ingestSuccess || ingestError) && (
              <div className={`mb-3 px-4 py-2.5 rounded-full text-sm font-medium flex items-center justify-center ${getIngestStatusStyle()}`}>
                {ingestLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {!ingestLoading && ingestError  && <AlertCircle className="w-4 h-4 mr-2" />}
                {!ingestLoading && ingestSuccess && <CheckCircle className="w-4 h-4 mr-2" />}
                {ingestError || ingestSuccess || 'Processing document...'}
              </div>
            )}

            {/* Connected file banner */}
            {connectedItem && (
              <div className="mb-3 flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-full">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-blue-700 dark:text-blue-300 font-medium flex-1 truncate">
                  Connected: {connectedItem.name}
                </span>
                <button
                  onClick={() => setConnectedItem(null)}
                  className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </button>
              </div>
            )}

            {/* Input form */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full px-4 py-2.5 focus-within:border-gray-400 dark:focus-within:border-gray-500 transition-colors shadow-sm"
            >
              <button
                type="button"
                onClick={handleOpenDrivePicker}
                className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${
                  connectedItem
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                title="Connect Google Drive file or folder"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                placeholder={connectedItem ? `Ask about "${connectedItem.name}"...` : 'Attach a Drive file to start...'}
                className="flex-1 bg-transparent resize-none outline-none text-[15px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 py-1 px-2 max-h-32 leading-relaxed"
                rows="1"
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
              />

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-9 h-9 flex items-center justify-center bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-200 text-white dark:text-gray-900 rounded-full disabled:opacity-25 disabled:cursor-not-allowed transition-all flex-shrink-0 shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
              Lumina AI can make mistakes. Verify important information from source documents.
            </p>
          </div>
        </div>
      </div>

      {showDrivePicker && (
        <DrivePicker userId={userId} onSelect={handleDriveSelect} onClose={() => setShowDrivePicker(false)} />
      )}
    </AppLayout>
  );
}