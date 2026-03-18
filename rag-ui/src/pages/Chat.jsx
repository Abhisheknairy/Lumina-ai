import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Send, Loader2, LogOut, Plus, MessageSquare,
  Paperclip, ChevronDown, Sparkles, Bot, Database,
  FileText, Menu, TicketCheck, ExternalLink,
  CheckCircle, AlertCircle, Search, X, Grid3x3,
  List, Clock, HardDrive, Users, Star, Folder,
  FileImage, File, ChevronRight, Check, BarChart2
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// DRIVE PICKER — file icon map
// ─────────────────────────────────────────────────────────────────
const FILE_ICONS = {
  'application/vnd.google-apps.folder':
    { icon: Folder,   color: '#5f6368', bg: '#f1f3f4' },
  'application/vnd.google-apps.document':
    { icon: FileText, color: '#4285f4', bg: '#e8f0fe' },
  'application/vnd.google-apps.spreadsheet':
    { icon: FileText, color: '#0f9d58', bg: '#e6f4ea' },
  'application/vnd.google-apps.presentation':
    { icon: FileText, color: '#f4b400', bg: '#fef7e0' },
  'application/pdf':
    { icon: FileText, color: '#ea4335', bg: '#fce8e6' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    { icon: FileText, color: '#4285f4', bg: '#e8f0fe' },
  'image/png':  { icon: FileImage, color: '#9c27b0', bg: '#f3e5f5' },
  'image/jpeg': { icon: FileImage, color: '#9c27b0', bg: '#f3e5f5' },
};
const getFileIcon = (mimeType) =>
  FILE_ICONS[mimeType] || { icon: File, color: '#5f6368', bg: '#f1f3f4' };

const TABS = [
  { id: 'recent',   label: 'Recent',        icon: Clock     },
  { id: 'my-drive', label: 'My Drive',       icon: HardDrive },
  { id: 'shared',   label: 'Shared with me', icon: Users     },
  { id: 'starred',  label: 'Starred',        icon: Star      },
];

// ─────────────────────────────────────────────────────────────────
// DRIVE PICKER COMPONENT
// ─────────────────────────────────────────────────────────────────
function DrivePicker({ onSelect, onClose }) {
  const [activeTab,    setActiveTab]    = useState('recent');
  const [viewMode,     setViewMode]     = useState('grid');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [files,        setFiles]        = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [breadcrumb,   setBreadcrumb]   = useState([{ id: 'root', name: 'My Drive' }]);
  const searchRef = useRef(null);

  useEffect(() => { loadFiles(); }, [activeTab, breadcrumb]);

  const loadFiles = async () => {
    if (!window.gapi?.client?.drive) return;
    setLoading(true);
    setSelectedItem(null);
    try {
      const currentFolderId = breadcrumb[breadcrumb.length - 1].id;
      const params = {
        fields: 'files(id,name,mimeType,modifiedTime,webViewLink,thumbnailLink,owners,size)',
        pageSize: 50,
      };
      if (activeTab === 'recent') {
        params.q = 'trashed=false';
        params.orderBy = 'recency desc';
      } else if (activeTab === 'my-drive') {
        params.q = `'${currentFolderId}' in parents and trashed=false`;
        params.orderBy = 'folder,name';
      } else if (activeTab === 'shared') {
        params.q = 'sharedWithMe=true and trashed=false';
        params.orderBy = 'name';
      } else if (activeTab === 'starred') {
        params.q = 'starred=true and trashed=false';
        params.orderBy = 'name';
      }
      const res = await window.gapi.client.drive.files.list(params);
      setFiles(res.result.files || []);
    } catch (err) {
      console.error('Drive list error:', err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) { loadFiles(); return; }
    setLoading(true);
    try {
      const res = await window.gapi.client.drive.files.list({
        q: `name contains '${searchQuery}' and trashed=false`,
        fields: 'files(id,name,mimeType,modifiedTime,webViewLink,thumbnailLink)',
        pageSize: 30,
        orderBy: 'relevance',
      });
      setFiles(res.result.files || []);
    } catch { setFiles([]); }
    finally { setLoading(false); }
  };

  const handleItemDoubleClick = (item) => {
    if (item.mimeType === 'application/vnd.google-apps.folder') {
      setBreadcrumb(prev => [...prev, { id: item.id, name: item.name }]);
      setActiveTab('my-drive');
    }
  };

  const navigateBreadcrumb = (index) =>
    setBreadcrumb(prev => prev.slice(0, index + 1));

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const diffDays = Math.floor((new Date() - new Date(dateStr)) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7)  return `${diffDays} days ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredFiles = searchQuery
    ? files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '860px',
        height: '580px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>

        {/* Header */}
        <div style={{ padding: '16px 20px 0', borderBottom: '1px solid #e8eaed' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>

            {/* Google Drive logo + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="18" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
              <span style={{ fontSize: '16px', fontWeight: '500', color: '#202124' }}>Select files</span>
            </div>

            {/* Search bar */}
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
              background: '#f1f3f4', borderRadius: '24px', padding: '8px 16px',
              maxWidth: '400px', margin: '0 auto',
            }}>
              <Search size={16} color="#5f6368" style={{ flexShrink: 0 }} />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search in Drive or paste URL"
                style={{
                  border: 'none', background: 'transparent', outline: 'none',
                  fontSize: '14px', color: '#202124', flex: 1, minWidth: 0,
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); loadFiles(); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <X size={14} color="#5f6368" />
                </button>
              )}
            </div>

            {/* View toggle + close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button onClick={() => setViewMode('list')} style={{ padding: '6px', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', background: viewMode === 'list' ? '#e8f0fe' : 'transparent' }}>
                <List size={18} color={viewMode === 'list' ? '#1967d2' : '#5f6368'} />
              </button>
              <button onClick={() => setViewMode('grid')} style={{ padding: '6px', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', background: viewMode === 'grid' ? '#e8f0fe' : 'transparent' }}>
                <Grid3x3 size={18} color={viewMode === 'grid' ? '#1967d2' : '#5f6368'} />
              </button>
              <div style={{ width: '1px', height: '20px', background: '#e8eaed', margin: '0 4px' }} />
              <button onClick={onClose} style={{ padding: '6px', border: 'none', background: 'transparent', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}>
                <X size={18} color="#5f6368" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex' }}>
            {TABS.map(tab => (
              <button key={tab.id}
                onClick={() => { setActiveTab(tab.id); setBreadcrumb([{ id: 'root', name: 'My Drive' }]); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '9px 16px', border: 'none', background: 'transparent',
                  fontSize: '14px', cursor: 'pointer', marginBottom: '-1px',
                  borderBottom: activeTab === tab.id ? '2px solid #1967d2' : '2px solid transparent',
                  color: activeTab === tab.id ? '#1967d2' : '#5f6368',
                  fontWeight: activeTab === tab.id ? '500' : '400',
                }}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Breadcrumb (My Drive only) */}
        {activeTab === 'my-drive' && breadcrumb.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', padding: '8px 20px', borderBottom: '1px solid #e8eaed' }}>
            {breadcrumb.map((crumb, i) => (
              <React.Fragment key={crumb.id}>
                <button onClick={() => navigateBreadcrumb(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '2px 4px', borderRadius: '4px', color: i === breadcrumb.length - 1 ? '#202124' : '#1967d2' }}>
                  {crumb.name}
                </button>
                {i < breadcrumb.length - 1 && <ChevronRight size={14} color="#9aa0a6" />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* File area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '10px', color: '#5f6368' }}>
              <Loader2 size={20} className="animate-spin" />
              <span style={{ fontSize: '14px' }}>Loading your Drive...</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5f6368' }}>
              <HardDrive size={40} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
              <p style={{ fontSize: '14px', margin: 0 }}>No files found</p>
            </div>
          ) : viewMode === 'grid' ? (
            <DriveGridView files={filteredFiles} selectedItem={selectedItem} onSingleClick={setSelectedItem} onDoubleClick={handleItemDoubleClick} formatDate={formatDate} />
          ) : (
            <DriveListView files={filteredFiles} selectedItem={selectedItem} onSingleClick={setSelectedItem} onDoubleClick={handleItemDoubleClick} formatDate={formatDate} />
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #e8eaed', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
          {selectedItem && (
            <span style={{ fontSize: '13px', color: '#5f6368', marginRight: 'auto', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Selected: <strong style={{ color: '#202124' }}>{selectedItem.name}</strong>
            </span>
          )}
          <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: '4px', border: '1px solid #dadce0', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#202124' }}>
            Cancel
          </button>
          <button
            onClick={() => selectedItem && onSelect(selectedItem)}
            disabled={!selectedItem}
            style={{ padding: '8px 20px', borderRadius: '4px', border: 'none', fontSize: '14px', fontWeight: '500', background: selectedItem ? '#1967d2' : '#dadce0', color: selectedItem ? '#fff' : '#80868b', cursor: selectedItem ? 'pointer' : 'not-allowed' }}
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Grid view ──
function DriveGridView({ files, selectedItem, onSingleClick, onDoubleClick, formatDate }) {
  const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
  const docs    = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');
  const Section = ({ title, items }) => !items.length ? null : (
    <div style={{ marginBottom: '20px' }}>
      {title && <p style={{ fontSize: '12px', color: '#5f6368', fontWeight: '500', margin: '0 0 10px' }}>{title}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
        {items.map(file => (
          <DriveGridItem key={file.id} file={file} selected={selectedItem?.id === file.id} onSingleClick={onSingleClick} onDoubleClick={onDoubleClick} formatDate={formatDate} />
        ))}
      </div>
    </div>
  );
  return <><Section title="Folders" items={folders} /><Section title={folders.length > 0 ? 'Files' : null} items={docs} /></>;
}

function DriveGridItem({ file, selected, onSingleClick, onDoubleClick, formatDate }) {
  const { icon: Icon, color, bg } = getFileIcon(file.mimeType);
  return (
    <div onClick={() => onSingleClick(file)} onDoubleClick={() => onDoubleClick(file)}
      style={{ border: selected ? '2px solid #1967d2' : '1px solid #e8eaed', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', background: selected ? '#e8f0fe' : '#fff', position: 'relative', transition: 'border-color 0.15s' }}>
      {selected && (
        <div style={{ position: 'absolute', top: '6px', right: '6px', background: '#1967d2', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={11} color="#fff" strokeWidth={3} />
        </div>
      )}
      <div style={{ height: '80px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {file.thumbnailLink && file.mimeType !== 'application/vnd.google-apps.folder'
          ? <img src={file.thumbnailLink} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Icon size={30} color={color} />
        }
      </div>
      <div style={{ padding: '8px' }}>
        <p style={{ fontSize: '12px', color: '#202124', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }}>{file.name}</p>
        <p style={{ fontSize: '11px', color: '#80868b', margin: 0 }}>{formatDate(file.modifiedTime)}</p>
      </div>
    </div>
  );
}

// ── List view ──
function DriveListView({ files, selectedItem, onSingleClick, onDoubleClick, formatDate }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #e8eaed' }}>
          <th style={{ textAlign: 'left', padding: '8px 12px 8px 8px', color: '#5f6368', fontWeight: '500', width: '45%' }}>Name</th>
          <th style={{ textAlign: 'left', padding: '8px', color: '#5f6368', fontWeight: '500' }}>Owner</th>
          <th style={{ textAlign: 'left', padding: '8px', color: '#5f6368', fontWeight: '500' }}>Last modified</th>
        </tr>
      </thead>
      <tbody>
        {files.map(file => {
          const { icon: Icon, color } = getFileIcon(file.mimeType);
          const isSelected = selectedItem?.id === file.id;
          return (
            <tr key={file.id} onClick={() => onSingleClick(file)} onDoubleClick={() => onDoubleClick(file)}
              style={{ background: isSelected ? '#e8f0fe' : 'transparent', cursor: 'pointer' }}>
              <td style={{ padding: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isSelected
                    ? <div style={{ background: '#1967d2', borderRadius: '50%', width: '20px', height: '20px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={12} color="#fff" strokeWidth={3} /></div>
                    : <Icon size={18} color={color} style={{ flexShrink: 0 }} />
                  }
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#202124' }}>{file.name}</span>
                </div>
              </td>
              <td style={{ padding: '8px', color: '#5f6368' }}>{file.owners?.[0]?.displayName || 'me'}</td>
              <td style={{ padding: '8px', color: '#5f6368' }}>{formatDate(file.modifiedTime)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN CHAT COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function Chat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('user_id');

  // UI
  const [isSidebarOpen,   setIsSidebarOpen]   = useState(true);
  const [isProfileOpen,   setIsProfileOpen]   = useState(false);
  // Chat
  const [messages,        setMessages]        = useState([]);
  const [input,           setInput]           = useState('');
  const [loading,         setLoading]         = useState(false);
  const [connectedItem,   setConnectedItem]   = useState(null);
  const messagesEndRef = useRef(null);
  // Ingestion
  const [ingestLoading,   setIngestLoading]   = useState(false);
  const [ingestError,     setIngestError]     = useState('');
  const [ingestSuccess,   setIngestSuccess]   = useState('');
  // Tickets (FR-006)
  const [ticketLoading,   setTicketLoading]   = useState(null);
  const [ticketSuccess,   setTicketSuccess]   = useState(null);
  // Drive Picker
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [driveApiReady,   setDriveApiReady]   = useState(false);
  const [displayName,     setDisplayName]     = useState('');
  const [userEmail,       setUserEmail]       = useState('');

  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || 'AIzaSyC0OzyJH_I-uI8eWmPs0NYZ1XdhQbMsjb4';

  const recentChats = [
    'Q3 Financial Report Analysis',
    'Employee Onboarding Docs',
    'Project Phoenix Architecture',
  ];

  // Auth check
  useEffect(() => { if (!userId) navigate('/'); }, [userId, navigate]);

  // Auto-scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Load Google API client + Drive v3
  useEffect(() => {
    if (!userId) return;
    fetch(`http://localhost:8000/api/get-token/${userId}`)
      .then(r => r.json())
      .then(async data => {
        if (!data.access_token) return;
        if (data.display_name) setDisplayName(data.display_name);
        if (data.email) setUserEmail(data.email);
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = async () => {
          await new Promise(resolve => window.gapi.load('client', resolve));
          await window.gapi.client.init({ apiKey: GOOGLE_API_KEY });
          await window.gapi.client.load('drive', 'v3');
          window.gapi.client.setToken({ access_token: data.access_token });
          setDriveApiReady(true);
        };
        document.body.appendChild(script);
      })
      .catch(err => console.error('Token fetch failed:', err));
  }, [userId]);

  // Handle file/folder selected from DrivePicker
  const handleDriveItemSelected = async (item) => {
    setShowDrivePicker(false);
    setIngestLoading(true);
    setIngestError('');
    setIngestSuccess(`Connecting to "${item.name}"...`);
    try {
      const res = await fetch(`http://localhost:8000/api/ingest-item/${userId}/${item.id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ingestion failed');
      setIngestSuccess(`✓ Connected to "${item.name}" — ${data.files_processed} file(s), ${data.total_chunks_saved} chunks`);
      setConnectedItem({ id: item.id, name: item.name });
      if (messages.length === 0) {
        setMessages([{ role: 'bot', content: `I've connected to **${item.name}**. What would you like to know?`, sources: [], interaction_id: null }]);
      }
      setTimeout(() => setIngestSuccess(''), 4000);
    } catch (err) {
      setIngestError(err.message || 'Connection failed.');
      setIngestSuccess('');
      setTimeout(() => setIngestError(''), 5000);
    } finally {
      setIngestLoading(false);
    }
  };

  // Chat submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    if (!connectedItem) { alert('Please connect a Drive file or folder first.'); return; }
    const userMessage = { role: 'user', content: input.trim(), sources: [], interaction_id: null };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/chat/${userId}/${connectedItem.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage.content }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'bot', content: data.answer, sources: data.sources_used || [], interaction_id: data.interaction_id, response_time_ms: data.response_time_ms }]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', content: 'Server error. Please try again.', sources: [], interaction_id: null }]);
    } finally {
      setLoading(false);
    }
  };

  // Raise ticket (FR-006)
  const handleRaiseTicket = async (message) => {
    if (!message.interaction_id || ticketLoading || ticketSuccess === message.interaction_id) return;
    setTicketLoading(message.interaction_id);
    try {
      const prevUserMsg = messages[messages.findIndex(m => m === message) - 1];
      const res = await fetch(`http://localhost:8000/api/raise-ticket/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interaction_id: message.interaction_id, user_query: prevUserMsg?.content || '', ai_response: message.content, priority: 'medium' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setTicketSuccess(message.interaction_id);
    } catch (err) {
      alert(`Failed to raise ticket: ${err.message}`);
    } finally {
      setTicketLoading(null);
    }
  };

  const getIngestStatusStyle = () => {
    if (ingestError)   return 'bg-red-50 text-red-600 border border-red-100';
    if (ingestSuccess) return 'bg-green-50 text-green-700 border border-green-100';
    return 'bg-blue-50 text-blue-600 border border-blue-100';
  };

  // Reusable ticket button
  const TicketButton = ({ message }) => {
    if (!message.interaction_id) return null;
    if (ticketSuccess === message.interaction_id) {
      return (
        <div className="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium mt-3">
          <CheckCircle className="w-3.5 h-3.5" /> Ticket raised — support team notified
        </div>
      );
    }
    return (
      <button onClick={() => handleRaiseTicket(message)} disabled={ticketLoading === message.interaction_id}
        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-orange-600 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 transition-all disabled:opacity-50">
        {ticketLoading === message.interaction_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TicketCheck className="w-3.5 h-3.5" />}
        This didn't resolve my issue — raise a ticket
      </button>
    );
  };

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-white font-sans text-gray-900 overflow-hidden">

      {/* Drive Picker overlay */}
      {showDrivePicker && driveApiReady && (
        <DrivePicker onSelect={handleDriveItemSelected} onClose={() => setShowDrivePicker(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <div className={`${isSidebarOpen ? 'w-72' : 'w-0'} bg-gray-50 border-r border-gray-200 transition-all duration-300 flex flex-col flex-shrink-0 overflow-hidden`}>
        <div className="p-4">
          <button onClick={() => setMessages([])}
            className="w-full flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-medium transition-all shadow-sm">
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
          {connectedItem && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
              <Database className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-0.5">Active Source</p>
                <p className="text-sm text-blue-900 truncate font-medium">{connectedItem.name}</p>
              </div>
            </div>
          )}
          <button onClick={() => navigate(`/analytics?user_id=${userId}`)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200/50 rounded-lg transition-colors font-medium mb-1">
            <BarChart2 className="w-4 h-4" /> Analytics
          </button>
          <button onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">

        {/* Header */}
        <header className="h-16 border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold tracking-tight">Lumina AI</h1>
          </div>
          <div className="relative">
            <button onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1.5 pl-3 hover:bg-gray-100 rounded-full transition-colors border border-transparent hover:border-gray-200">
              <span className="text-sm font-medium text-gray-700 hidden sm:block">{displayName || userId || 'Guest'}</span>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                {(displayName || userId || 'U').charAt(0).toUpperCase()}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 mr-1" />
            </button>
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{displayName || userId}</p>
                  <p className="text-xs text-gray-500 truncate">{userEmail || 'Managed Services'}</p>
                </div>
                <button onClick={() => navigate('/')} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">Sign out</button>
              </div>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-8">
          <div className="max-w-3xl mx-auto space-y-8">

            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 border border-gray-100 shadow-sm">
                  <Sparkles className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">How can I help you today?</h2>
                <p className="text-gray-500">
                  {driveApiReady
                    ? 'Click the paperclip to connect a Drive file or folder.'
                    : 'Loading Google Drive connection...'}
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={index} className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className={`max-w-[85%] ${message.role === 'user' ? 'bg-gray-100 text-gray-900 px-5 py-3 rounded-2xl' : 'text-gray-900 pt-1'}`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

                  {/* FR-004: Clickable source links */}
                  {message.sources?.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Sources</p>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.map((source, idx) => {
                          const name = typeof source === 'object' ? source.name : source;
                          const link = typeof source === 'object' ? source.link : null;
                          return link ? (
                            <a key={idx} href={link} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors">
                              <FileText className="w-3 h-3 opacity-70" />{name}<ExternalLink className="w-3 h-3 opacity-50" />
                            </a>
                          ) : (
                            <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                              <FileText className="w-3 h-3 opacity-50" />{name}
                            </span>
                          );
                        })}
                      </div>
                      <TicketButton message={message} />
                    </div>
                  )}

                  {/* Ticket button when no sources */}
                  {message.role === 'bot' && !message.sources?.length && (
                    <TicketButton message={message} />
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="pt-2"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── INPUT ── */}
        <div className="pt-2 pb-10 px-4">
          <div className="max-w-3xl mx-auto relative">
            {(ingestLoading || ingestSuccess || ingestError) && (
              <div className={`mb-3 px-4 py-2 rounded-lg text-sm flex items-center justify-center font-medium transition-all ${getIngestStatusStyle()}`}>
                {ingestLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {!ingestLoading && ingestError   && <AlertCircle className="w-4 h-4 mr-2" />}
                {!ingestLoading && ingestSuccess  && <CheckCircle  className="w-4 h-4 mr-2" />}
                {ingestError || ingestSuccess || 'Processing document...'}
              </div>
            )}
            <form onSubmit={handleSubmit}
              className="flex items-end shadow-sm border border-gray-200 bg-white rounded-3xl overflow-hidden focus-within:border-black transition-all">
              <button type="button"
                onClick={() => {
                  if (!driveApiReady) { alert('Google Drive is still loading. Please wait a moment.'); return; }
                  setShowDrivePicker(true);
                }}
                className={`p-4 transition-colors ${connectedItem ? 'text-blue-500 hover:text-blue-700' : 'text-gray-400 hover:text-black'}`}
                title="Connect Google Drive file or folder">
                <Paperclip className="w-5 h-5" />
              </button>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                placeholder={connectedItem ? `Chat about "${connectedItem.name}"...` : 'Attach a Drive file to start...'}
                className="w-full py-4 bg-transparent resize-none outline-none text-sm"
                rows="1"
              />
              <button type="submit" disabled={!input.trim() || loading}
                className="p-3 mb-1 mr-2 bg-black text-white rounded-full disabled:opacity-20 transition-opacity">
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