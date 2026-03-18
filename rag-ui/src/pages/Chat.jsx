import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Send, Loader2, LogOut, FolderOpen, User, X, Search, 
  FileText, Bot, Database, Folder, FileIcon, Menu, 
  Plus, MessageSquare, Paperclip, ChevronDown, Sparkles 
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

  // --- DRIVE MODAL STATES ---
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [driveItems, setDriveItems] = useState([]);
  const [isFetchingItems, setIsFetchingItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All'); 
  const [selectedItem, setSelectedItem] = useState(null);
  
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestError, setIngestError] = useState('');
  const [ingestSuccess, setIngestSuccess] = useState('');

  // Mock History Data
  const recentChats = [
    "Q3 Financial Report Analysis",
    "Employee Onboarding Docs",
    "Project Phoenix Architecture",
    "Meeting Notes: March 10"
  ];

  useEffect(() => {
    if (!userId) {
      navigate('/');
    }
  }, [userId, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch Files AND Folders using Streaming (Newest First)
  useEffect(() => {
    const fetchDriveItems = async () => {
      if (!userId || !showFolderModal) return;
      
      setIsFetchingItems(true);
      setDriveItems([]); // Clear previous items
      setIngestError('');
      
      try {
        const response = await fetch(`http://localhost:8000/list-drive-items/${userId}`);
        
        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter(line => line.trim() !== "");
          
          for (const line of lines) {
            try {
              const newItems = JSON.parse(line);
              if (newItems.error) throw new Error(newItems.error);
              setDriveItems(prev => [...prev, ...newItems]);
              setIsFetchingItems(false); 
            } catch (e) {
              console.error("Chunk parsing error", e);
            }
          }
        }
      } catch (error) {
        setIngestError("Connection failed. Ensure FastAPI is running.");
        setIsFetchingItems(false);
      }
    };
    fetchDriveItems();
  }, [userId, showFolderModal]);

  const filteredItems = driveItems.filter(item => {
    const itemName = item.name || '';
    const matchesSearch = itemName.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesTab = true;
    if (activeTab === 'My Drive') {
      matchesTab = item.ownedByMe === true;
    } else if (activeTab === 'Shared') {
      matchesTab = item.shared === true || item.ownedByMe === false;
    }
    
    return matchesSearch && matchesTab;
  });

  const handleItemSubmit = async () => {
    if (!selectedItem) return;
    setIngestLoading(true);
    setIngestError('');
    setIngestSuccess(`Connecting to "${selectedItem.name}"...`);

    try {
      const response = await fetch(`http://localhost:8000/ingest-item/${userId}/${selectedItem.id}`, { 
        method: 'POST' 
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.detail || 'Failed to ingest item');
      
      setIngestSuccess(`Success! Linked ${data.total_chunks_saved || 0} chunks.`);
      
      setTimeout(() => {
        setConnectedItem(selectedItem);
        setShowFolderModal(false);
        setIngestSuccess('');
        if (messages.length === 0) {
          setMessages([{ 
            role: 'bot', 
            content: `I have connected to **${selectedItem.name}**. What would you like to know?`, 
            sources: [] 
          }]);
        }
      }, 1000);
    } catch (err) {
      setIngestError(err.message || 'An error occurred during connection.');
      setIngestSuccess('');
    } finally {
      setIngestLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !connectedItem) {
      if (!connectedItem && input.trim()) alert("Please connect a file first using the paperclip icon.");
      return;
    }

    const userMessage = { role: 'user', content: input.trim(), sources: [] };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`http://localhost:8000/chat/${userId}/${connectedItem.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage.content }),
      });
      const data = await response.json();
      
      setMessages((prev) => [...prev, { 
        role: 'bot', 
        content: data.answer, 
        sources: data.sources_used || [] 
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, { 
        role: 'bot', 
        content: 'Server error. Please try again.', 
        sources: [] 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderItemIcon = (mimeType, isSelected) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className={`w-10 h-10 mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" fillOpacity={0.2} />;
    }
    if (mimeType === 'application/pdf') {
      return <FileText className={`w-10 h-10 mb-2 ${isSelected ? 'text-red-500' : 'text-red-400'}`} />;
    }
    return <FileIcon className={`w-10 h-10 mb-2 ${isSelected ? 'text-blue-500' : 'text-blue-400'}`} />;
  };

  return (
    <div className="flex h-screen bg-white font-sans text-gray-900 overflow-hidden">
      
      {/* SIDEBAR */}
      <div className={`${isSidebarOpen ? 'w-72' : 'w-0'} bg-gray-50 border-r border-gray-200 transition-all duration-300 flex flex-col flex-shrink-0 overflow-hidden`}>
        <div className="p-4">
          <button onClick={() => setMessages([])} className="w-full flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-medium transition-all shadow-sm">
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 ml-2">Recent</p>
          <div className="space-y-1">
            {recentChats.map((chat, idx) => (
              <button key={idx} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200/50 rounded-lg transition-colors text-left truncate">
                <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-50" />
                <span className="truncate">{chat}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          {connectedItem && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
              <Database className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-0.5">Active Source</p>
                <p className="text-sm text-blue-900 truncate font-medium">{connectedItem.name}</p>
              </div>
            </div>
          )}
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        <header className="h-16 border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
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
                  <p className="text-xs text-gray-500">Free Plan</p>
                </div>
                <button onClick={() => navigate('/')} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">Sign out</button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-8">
          <div className="max-w-3xl mx-auto space-y-8">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 border border-gray-100 shadow-sm">
                  <Sparkles className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">How can I help you today?</h2>
                <p className="text-gray-500">Connect a source from Drive using the paperclip to start chatting.</p>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={index} className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className={`max-w-[85%] ${message.role === 'user' ? 'bg-gray-100 text-gray-900 px-5 py-3 rounded-2xl' : 'text-gray-900 pt-1'}`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  {message.sources?.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                      {message.sources.map((s, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                          <FileText className="w-3 h-3 mr-1 opacity-50"/> {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && <div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="pt-6 pb-10 px-4">
          <div className="max-w-3xl mx-auto relative">
            <form onSubmit={handleSubmit} className="flex items-end shadow-sm border border-gray-200 bg-white rounded-3xl overflow-hidden focus-within:border-black transition-all">
              <button type="button" onClick={() => setShowFolderModal(true)} className={`p-4 text-gray-400 hover:text-black ${connectedItem ? 'text-blue-500' : ''}`}>
                <Paperclip className="w-5 h-5" />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }}}
                placeholder={connectedItem ? `Chat about "${connectedItem.name}"...` : "Attach a Drive file to start..."}
                className="w-full py-4 bg-transparent resize-none outline-none text-sm"
                rows="1"
              />
              <button type="submit" disabled={!input.trim() || loading} className="p-3 mb-1 mr-2 bg-black text-white rounded-full disabled:opacity-20">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 px-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Select Drive Source</h2>
              </div>
              <button onClick={() => setShowFolderModal(false)} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pt-4 border-b border-gray-100">
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-full py-2.5 pl-11 outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div className="flex gap-6">
                {['All', 'My Drive', 'Shared'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-sm font-medium border-b-2 transition-all ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
              {isFetchingItems ? (
                <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border bg-white h-32 transition-all ${selectedItem?.id === item.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:shadow-sm'}`}
                    >
                      {renderItemIcon(item.mimeType, selectedItem?.id === item.id)}
                      <span className="text-xs font-medium truncate w-full px-1">{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 px-6 border-t border-gray-100 flex items-center justify-between">
              <div className="flex-1 text-sm font-medium">
                {ingestError && <span className="text-red-600">{ingestError}</span>}
                {ingestSuccess && <span className="text-blue-600">{ingestSuccess}</span>}
              </div>
              <button
                onClick={handleItemSubmit}
                disabled={!selectedItem || ingestLoading}
                className="bg-black text-white px-8 py-2.5 rounded-full disabled:opacity-20 font-medium"
              >
                {ingestLoading ? "Linking..." : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}