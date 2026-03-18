import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Send, Loader2, LogOut, Plus, MessageSquare,
  Paperclip, ChevronDown, Sparkles, Bot, Database,
  FileText, Menu, TicketCheck, ExternalLink, CheckCircle, AlertCircle
} from 'lucide-react';

export default function Chat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('user_id');

  // --- UI STATES ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // --- CHAT STATES ---
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectedItem, setConnectedItem] = useState(null);
  const messagesEndRef = useRef(null);

  // --- INGESTION STATUS STATES ---
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestError, setIngestError] = useState('');
  const [ingestSuccess, setIngestSuccess] = useState('');

  // --- TICKET STATES (FR-006) ---
  const [ticketLoading, setTicketLoading] = useState(null); // stores interaction_id being processed
  const [ticketSuccess, setTicketSuccess] = useState(null); // stores interaction_id that succeeded

  // --- GOOGLE PICKER STATES ---
  const [oauthToken, setOauthToken] = useState(null);
  const [pickerApiLoaded, setPickerApiLoaded] = useState(false);
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "AIzaSyC0OzyJH_I-uI8eWmPs0NYZ1XdhQbMsjb4";

  const recentChats = [
    "Q3 Financial Report Analysis",
    "Employee Onboarding Docs",
    "Project Phoenix Architecture"
  ];

  // 1. Auth Check
  useEffect(() => {
    if (!userId) navigate('/');
  }, [userId, navigate]);

  // 2. Scroll to Bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Fetch OAuth Token & Load Google Picker Script
  useEffect(() => {
    if (!userId) return;

    fetch(`http://localhost:8000/api/get-token/${userId}`)
      .then(res => res.json())
      .then(data => { if (data.access_token) setOauthToken(data.access_token); })
      .catch(err => console.error("Failed to fetch token", err));

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      window.gapi.load('picker', () => setPickerApiLoaded(true));
    };
    document.body.appendChild(script);
  }, [userId]);

  // 4. Open Google Drive Picker (FR-002)
  const handleOpenPicker = () => {
    if (!pickerApiLoaded || !oauthToken) {
      alert("Still loading Google connection. Please try again in a second.");
      return;
    }

    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
    view.setIncludeFolders(true);
    view.setSelectFolderEnabled(true); // FIX: allows folders to be selected

    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(oauthToken)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setCallback(pickerCallback)
      .setTitle("Select a file or folder for Lumina AI")
      .build();

    picker.setVisible(true);
  };

  // 5. Handle Picker Selection & Ingestion (FR-002, FR-005)
  const pickerCallback = async (data) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const doc = data.docs[0];
      const selectedId = doc.id;
      const selectedName = doc.name;

      setIngestLoading(true);
      setIngestError('');
      setIngestSuccess(`Connecting to "${selectedName}"...`);

      try {
        const response = await fetch(
          `http://localhost:8000/api/ingest-item/${userId}/${selectedId}`,
          { method: 'POST' }
        );
        const resData = await response.json();

        if (!response.ok) throw new Error(resData.detail || 'Failed to ingest item');

        setIngestSuccess(`✓ Connected to "${selectedName}" — ${resData.files_processed} file(s), ${resData.total_chunks_saved} chunks`);
        setConnectedItem({ id: selectedId, name: selectedName });

        if (messages.length === 0) {
          setMessages([{
            role: 'bot',
            content: `I've connected to **${selectedName}**. What would you like to know?`,
            sources: [],
            interaction_id: null,
          }]);
        }

        setTimeout(() => setIngestSuccess(''), 4000);
      } catch (err) {
        setIngestError(err.message || 'An error occurred during connection.');
        setIngestSuccess('');
        setTimeout(() => setIngestError(''), 5000);
      } finally {
        setIngestLoading(false);
      }
    }
  };

  // 6. Handle Chat Submission (FR-003, FR-004)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    if (!connectedItem) {
      alert("Please connect a Drive file or folder first using the paperclip icon.");
      return;
    }

    const userMessage = { role: 'user', content: input.trim(), sources: [], interaction_id: null };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(
        `http://localhost:8000/api/chat/${userId}/${connectedItem.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: userMessage.content }),
        }
      );
      const data = await response.json();

      setMessages(prev => [...prev, {
        role: 'bot',
        content: data.answer,
        sources: data.sources_used || [],       // FR-004: [{name, link}] objects
        interaction_id: data.interaction_id,    // FR-006: needed for ticket raising
        response_time_ms: data.response_time_ms,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'bot',
        content: 'Server error. Please try again.',
        sources: [],
        interaction_id: null,
      }]);
    } finally {
      setLoading(false);
    }
  };

  // 7. Raise Ticket (FR-006)
  const handleRaiseTicket = async (message) => {
    if (!message.interaction_id || ticketLoading || ticketSuccess === message.interaction_id) return;

    setTicketLoading(message.interaction_id);
    try {
      const prevUserMsg = messages[messages.findIndex(m => m === message) - 1];
      const response = await fetch(`http://localhost:8000/api/raise-ticket/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interaction_id: message.interaction_id,
          user_query: prevUserMsg?.content || '',
          ai_response: message.content,
          priority: 'medium',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);

      setTicketSuccess(message.interaction_id);
    } catch (err) {
      alert(`Failed to raise ticket: ${err.message}`);
    } finally {
      setTicketLoading(null);
    }
  };

  // --- INGEST STATUS STYLE HELPER (fixes className bug) ---
  const getIngestStatusStyle = () => {
    if (ingestError) return 'bg-red-50 text-red-600 border border-red-100';
    if (ingestSuccess) return 'bg-green-50 text-green-700 border border-green-100';
    return 'bg-blue-50 text-blue-600 border border-blue-100';
  };

  return (
    <div className="flex h-screen bg-white font-sans text-gray-900 overflow-hidden">

      {/* ── SIDEBAR ── */}
      <div className={`${isSidebarOpen ? 'w-72' : 'w-0'} bg-gray-50 border-r border-gray-200 transition-all duration-300 flex flex-col flex-shrink-0 overflow-hidden`}>
        <div className="p-4">
          <button
            onClick={() => setMessages([])}
            className="w-full flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-medium transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 ml-2">Recent</p>
          <div className="space-y-1">
            {recentChats.map((chat, idx) => (
              <button key={idx} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200/50 rounded-lg transition-colors text-left">
                <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-50" />
                <span className="truncate">{chat}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          {/* Active Source Display */}
          {connectedItem && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
              <Database className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-0.5">Active Source</p>
                <p className="text-sm text-blue-900 truncate font-medium">{connectedItem.name}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">

        {/* Header */}
        <header className="h-16 border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold tracking-tight">Lumina AI</h1>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1.5 pl-3 hover:bg-gray-100 rounded-full transition-colors border border-transparent hover:border-gray-200"
            >
              <span className="text-sm font-medium text-gray-700 hidden sm:block">{userId || "Guest"}</span>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                {(userId || 'U').charAt(0).toUpperCase()}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 mr-1" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{userId}</p>
                  <p className="text-xs text-gray-500">Managed Services</p>
                </div>
                <button
                  onClick={() => navigate('/')}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-8">
          <div className="max-w-3xl mx-auto space-y-8">

            {/* Empty State */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 border border-gray-100 shadow-sm">
                  <Sparkles className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">How can I help you today?</h2>
                <p className="text-gray-500">Connect a Drive file or folder using the paperclip icon to start chatting.</p>
              </div>
            )}

            {/* Message List */}
            {messages.map((message, index) => (
              <div key={index} className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                {message.role === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}

                <div className={`max-w-[85%] ${message.role === 'user' ? 'bg-gray-100 text-gray-900 px-5 py-3 rounded-2xl' : 'text-gray-900 pt-1'}`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

                  {/* FR-004: Clickable source document links */}
                  {message.sources?.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Sources</p>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.map((source, idx) => {
                          // Handle both {name, link} objects and plain strings (backwards compat)
                          const name = typeof source === 'object' ? source.name : source;
                          const link = typeof source === 'object' ? source.link : null;

                          return link ? (
                            <a
                              key={idx}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors"
                            >
                              <FileText className="w-3 h-3 opacity-70" />
                              {name}
                              <ExternalLink className="w-3 h-3 opacity-50" />
                            </a>
                          ) : (
                            <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                              <FileText className="w-3 h-3 opacity-50" />
                              {name}
                            </span>
                          );
                        })}
                      </div>

                      {/* FR-006: Raise Ticket Button */}
                      {message.interaction_id && (
                        <div className="mt-3">
                          {ticketSuccess === message.interaction_id ? (
                            <div className="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Ticket raised — support team notified
                            </div>
                          ) : (
                            <button
                              onClick={() => handleRaiseTicket(message)}
                              disabled={ticketLoading === message.interaction_id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-orange-600 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 transition-all disabled:opacity-50"
                            >
                              {ticketLoading === message.interaction_id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <TicketCheck className="w-3.5 h-3.5" />
                              }
                              This didn't resolve my issue — raise a ticket
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* FR-006: Show raise ticket even when no sources but bot responded */}
                  {message.role === 'bot' && message.interaction_id && !message.sources?.length && (
                    <div className="mt-3">
                      {ticketSuccess === message.interaction_id ? (
                        <div className="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Ticket raised — support team notified
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRaiseTicket(message)}
                          disabled={ticketLoading === message.interaction_id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-orange-600 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 transition-all disabled:opacity-50"
                        >
                          {ticketLoading === message.interaction_id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <TicketCheck className="w-3.5 h-3.5" />
                          }
                          This didn't resolve my issue — raise a ticket
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="pt-2">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── INPUT AREA ── */}
        <div className="pt-2 pb-10 px-4">
          <div className="max-w-3xl mx-auto relative">

            {/* Ingest Status Banner — FIXED className bug */}
            {(ingestLoading || ingestSuccess || ingestError) && (
              <div className={`mb-3 px-4 py-2 rounded-lg text-sm flex items-center justify-center font-medium transition-all ${getIngestStatusStyle()}`}>
                {ingestLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {!ingestLoading && ingestError && <AlertCircle className="w-4 h-4 mr-2" />}
                {!ingestLoading && ingestSuccess && <CheckCircle className="w-4 h-4 mr-2" />}
                {ingestError || ingestSuccess || "Processing document..."}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="flex items-end shadow-sm border border-gray-200 bg-white rounded-3xl overflow-hidden focus-within:border-black transition-all"
            >
              <button
                type="button"
                onClick={handleOpenPicker}
                className={`p-4 transition-colors ${connectedItem ? 'text-blue-500 hover:text-blue-700' : 'text-gray-400 hover:text-black'}`}
                title="Connect Google Drive file or folder"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder={connectedItem ? `Chat about "${connectedItem.name}"...` : "Attach a Drive file to start..."}
                className="w-full py-4 bg-transparent resize-none outline-none text-sm"
                rows="1"
              />

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-3 mb-1 mr-2 bg-black text-white rounded-full disabled:opacity-20 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-3">
              Lumina AI can make mistakes. Verify important information from source documents.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}