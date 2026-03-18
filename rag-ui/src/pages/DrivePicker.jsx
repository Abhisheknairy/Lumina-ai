import React, { useState, useEffect, useRef } from 'react';
import {
  Search, X, Grid3x3, List, Clock, HardDrive,
  Users, Star, Folder, FileText, FileImage,
  File, ChevronRight, Loader2, Check
} from 'lucide-react';

const FILE_ICONS = {
  'application/vnd.google-apps.folder': { icon: Folder, color: '#5f6368', bg: '#f1f3f4' },
  'application/vnd.google-apps.document': { icon: FileText, color: '#4285f4', bg: '#e8f0fe' },
  'application/vnd.google-apps.spreadsheet': { icon: FileText, color: '#0f9d58', bg: '#e6f4ea' },
  'application/vnd.google-apps.presentation': { icon: FileText, color: '#f4b400', bg: '#fef7e0' },
  'application/pdf': { icon: FileText, color: '#ea4335', bg: '#fce8e6' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileText, color: '#4285f4', bg: '#e8f0fe' },
  'image/png': { icon: FileImage, color: '#9c27b0', bg: '#f3e5f5' },
  'image/jpeg': { icon: FileImage, color: '#9c27b0', bg: '#f3e5f5' },
};

const getFileIcon = (mimeType) => FILE_ICONS[mimeType] || { icon: File, color: '#5f6368', bg: '#f1f3f4' };

const TABS = [
  { id: 'recent', label: 'Recent', icon: Clock },
  { id: 'my-drive', label: 'My Drive', icon: HardDrive },
  { id: 'shared', label: 'Shared with me', icon: Users },
  { id: 'starred', label: 'Starred', icon: Star },
];

export default function DrivePicker({ userId, onSelect, onClose }) {
  const [activeTab, setActiveTab] = useState('recent');
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState([{ id: 'root', name: 'My Drive' }]);
  const searchRef = useRef(null);

  useEffect(() => {
    loadFiles();
  }, [activeTab, breadcrumb]);

  const loadFiles = async () => {
    if (!window.gapi?.client?.drive) return;
    setLoading(true);
    setSelectedItem(null);

    try {
      let query = "trashed=false";
      const currentFolderId = breadcrumb[breadcrumb.length - 1].id;

      if (activeTab === 'recent') {
        query = "trashed=false";
      } else if (activeTab === 'my-drive') {
        query = `'${currentFolderId}' in parents and trashed=false`;
      } else if (activeTab === 'shared') {
        query = "sharedWithMe=true and trashed=false";
      } else if (activeTab === 'starred') {
        query = "starred=true and trashed=false";
      }

      const params = {
        q: query,
        fields: "files(id,name,mimeType,modifiedTime,webViewLink,thumbnailLink,owners,size)",
        pageSize: 50,
        orderBy: activeTab === 'recent' ? 'recency desc' : 'folder,name',
      };

      if (activeTab === 'recent') {
        params.orderBy = 'recency desc';
        delete params.q;
        params.q = "trashed=false";
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
        fields: "files(id,name,mimeType,modifiedTime,webViewLink,thumbnailLink)",
        pageSize: 30,
        orderBy: 'relevance',
      });
      setFiles(res.result.files || []);
    } catch (err) {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item) => {
    if (item.mimeType === 'application/vnd.google-apps.folder') {
      // Single click on folder just selects it
      setSelectedItem(item);
    } else {
      setSelectedItem(item);
    }
  };

  const handleItemDoubleClick = (item) => {
    if (item.mimeType === 'application/vnd.google-apps.folder') {
      setBreadcrumb(prev => [...prev, { id: item.id, name: item.name }]);
      setActiveTab('my-drive');
    }
  };

  const navigateBreadcrumb = (index) => {
    setBreadcrumb(prev => prev.slice(0, index + 1));
  };

  const handleSelect = () => {
    if (selectedItem) onSelect(selectedItem);
  };

  const filteredFiles = searchQuery
    ? files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px',
        width: '100%', maxWidth: '860px',
        height: '580px', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>

        {/* Header */}
        <div style={{ padding: '16px 20px 0', borderBottom: '1px solid #e8eaed' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="20" height="20" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
              <span style={{ fontSize: '16px', fontWeight: '500', color: '#202124' }}>Select files</span>
            </div>

            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '380px', margin: '0 16px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                flex: 1, background: '#f1f3f4', borderRadius: '24px',
                padding: '8px 16px',
              }}>
                <Search size={16} color="#5f6368" style={{ flexShrink: 0 }} />
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Search in Drive"
                  style={{
                    border: 'none', background: 'transparent', outline: 'none',
                    fontSize: '14px', color: '#202124', flex: 1, minWidth: 0,
                  }}
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); loadFiles(); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', display: 'flex' }}>
                    <X size={14} color="#5f6368" />
                  </button>
                )}
              </div>
            </div>

            {/* View toggle + close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button onClick={() => setViewMode('list')}
                style={{ padding: '6px', border: 'none', background: viewMode === 'list' ? '#e8f0fe' : 'transparent', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}>
                <List size={18} color={viewMode === 'list' ? '#1967d2' : '#5f6368'} />
              </button>
              <button onClick={() => setViewMode('grid')}
                style={{ padding: '6px', border: 'none', background: viewMode === 'grid' ? '#e8f0fe' : 'transparent', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}>
                <Grid3x3 size={18} color={viewMode === 'grid' ? '#1967d2' : '#5f6368'} />
              </button>
              <div style={{ width: '1px', height: '20px', background: '#e8eaed', margin: '0 4px' }} />
              <button onClick={onClose}
                style={{ padding: '6px', border: 'none', background: 'transparent', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}>
                <X size={18} color="#5f6368" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0' }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setBreadcrumb([{ id: 'root', name: 'My Drive' }]); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', border: 'none', background: 'transparent',
                  fontSize: '14px', cursor: 'pointer', borderBottom: activeTab === tab.id ? '2px solid #1967d2' : '2px solid transparent',
                  color: activeTab === tab.id ? '#1967d2' : '#5f6368',
                  fontWeight: activeTab === tab.id ? '500' : '400',
                  marginBottom: '-1px',
                }}>
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Breadcrumb (My Drive) */}
        {activeTab === 'my-drive' && breadcrumb.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 20px', borderBottom: '1px solid #e8eaed', flexWrap: 'wrap' }}>
            {breadcrumb.map((crumb, i) => (
              <React.Fragment key={crumb.id}>
                <button onClick={() => navigateBreadcrumb(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: i === breadcrumb.length - 1 ? '#202124' : '#1967d2', padding: '2px 4px', borderRadius: '4px' }}>
                  {crumb.name}
                </button>
                {i < breadcrumb.length - 1 && <ChevronRight size={14} color="#9aa0a6" />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* File Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '10px', color: '#5f6368' }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '14px' }}>Loading...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5f6368' }}>
              <HardDrive size={40} style={{ margin: '0 auto 12px', opacity: 0.4, display: 'block' }} />
              <p style={{ fontSize: '14px', margin: 0 }}>No files found</p>
            </div>
          ) : viewMode === 'grid' ? (
            <GridView files={filteredFiles} selectedItem={selectedItem} onSingleClick={handleItemClick} onDoubleClick={handleItemDoubleClick} formatDate={formatDate} />
          ) : (
            <ListView files={filteredFiles} selectedItem={selectedItem} onSingleClick={handleItemClick} onDoubleClick={handleItemDoubleClick} formatDate={formatDate} />
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #e8eaed', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
          {selectedItem && (
            <span style={{ fontSize: '13px', color: '#5f6368', marginRight: 'auto', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Selected: <strong style={{ color: '#202124' }}>{selectedItem.name}</strong>
            </span>
          )}
          <button onClick={onClose} style={{
            padding: '8px 20px', borderRadius: '4px', border: '1px solid #dadce0',
            background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#202124',
          }}>Cancel</button>
          <button onClick={handleSelect} disabled={!selectedItem} style={{
            padding: '8px 20px', borderRadius: '4px', border: 'none',
            background: selectedItem ? '#1967d2' : '#dadce0',
            color: selectedItem ? '#fff' : '#80868b',
            cursor: selectedItem ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: '500',
          }}>Select</button>
        </div>
      </div>
    </div>
  );
}

function GridView({ files, selectedItem, onSingleClick, onDoubleClick, formatDate }) {
  const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
  const docs = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

  const renderSection = (title, items) => items.length === 0 ? null : (
    <div style={{ marginBottom: '20px' }}>
      {title && <p style={{ fontSize: '12px', color: '#5f6368', fontWeight: '500', margin: '0 0 10px', textTransform: 'capitalize' }}>{title}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
        {items.map(file => <GridItem key={file.id} file={file} selected={selectedItem?.id === file.id} onSingleClick={onSingleClick} onDoubleClick={onDoubleClick} formatDate={formatDate} />)}
      </div>
    </div>
  );

  return (
    <div>
      {renderSection('Folders', folders)}
      {renderSection(folders.length > 0 ? 'Files' : null, docs)}
    </div>
  );
}

function GridItem({ file, selected, onSingleClick, onDoubleClick, formatDate }) {
  const { icon: Icon, color, bg } = getFileIcon(file.mimeType);
  const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

  return (
    <div
      onClick={() => onSingleClick(file)}
      onDoubleClick={() => onDoubleClick(file)}
      style={{
        border: selected ? '2px solid #1967d2' : '1px solid #e8eaed',
        borderRadius: '8px', overflow: 'hidden', cursor: 'pointer',
        background: selected ? '#e8f0fe' : '#fff',
        transition: 'border-color 0.15s',
        position: 'relative',
      }}
    >
      {selected && (
        <div style={{ position: 'absolute', top: '6px', right: '6px', background: '#1967d2', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={11} color="#fff" strokeWidth={3} />
        </div>
      )}
      <div style={{ height: '90px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {file.thumbnailLink && !isFolder ? (
          <img src={file.thumbnailLink} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Icon size={32} color={color} />
        )}
      </div>
      <div style={{ padding: '8px' }}>
        <p style={{ fontSize: '12px', color: '#202124', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }}>{file.name}</p>
        <p style={{ fontSize: '11px', color: '#80868b', margin: 0 }}>{formatDate(file.modifiedTime)}</p>
      </div>
    </div>
  );
}

function ListView({ files, selectedItem, onSingleClick, onDoubleClick, formatDate }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #e8eaed' }}>
          <th style={{ textAlign: 'left', padding: '8px 12px 8px 8px', color: '#5f6368', fontWeight: '500', width: '40%' }}>Name</th>
          <th style={{ textAlign: 'left', padding: '8px', color: '#5f6368', fontWeight: '500' }}>Owner</th>
          <th style={{ textAlign: 'left', padding: '8px', color: '#5f6368', fontWeight: '500' }}>Last modified</th>
        </tr>
      </thead>
      <tbody>
        {files.map(file => {
          const { icon: Icon, color } = getFileIcon(file.mimeType);
          const isSelected = selectedItem?.id === file.id;
          return (
            <tr key={file.id}
              onClick={() => onSingleClick(file)}
              onDoubleClick={() => onDoubleClick(file)}
              style={{ background: isSelected ? '#e8f0fe' : 'transparent', cursor: 'pointer', borderRadius: '4px' }}>
              <td style={{ padding: '8px', borderRadius: '4px 0 0 4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isSelected
                    ? <div style={{ background: '#1967d2', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check size={12} color="#fff" strokeWidth={3} /></div>
                    : <Icon size={18} color={color} style={{ flexShrink: 0 }} />
                  }
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#202124' }}>{file.name}</span>
                </div>
              </td>
              <td style={{ padding: '8px', color: '#5f6368' }}>{file.owners?.[0]?.displayName || 'me'}</td>
              <td style={{ padding: '8px', color: '#5f6368', borderRadius: '0 4px 4px 0' }}>{formatDate(file.modifiedTime)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
