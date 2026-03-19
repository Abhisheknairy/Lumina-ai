/**
 * FolderPicker — Google Drive folder browser with multi-select
 *
 * Props:
 *   userId    — for auth (not used directly, gapi already authed by Chat.jsx init)
 *   onSelect  — called with array of { id, name } folder objects
 *   onClose   — dismiss
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  Search, X, List, Grid3x3, HardDrive, Users,
  Star, Clock, Folder, ChevronRight, Loader2, Check
} from 'lucide-react';

const TABS = [
  { id: 'my-drive', label: 'My Drive',       icon: HardDrive },
  { id: 'shared',   label: 'Shared with me', icon: Users     },
  { id: 'starred',  label: 'Starred',        icon: Star      },
  { id: 'recent',   label: 'Recent',         icon: Clock     },
];

export default function FolderPicker({ onSelect, onClose }) {
  const [activeTab,    setActiveTab]    = useState('my-drive');
  const [viewMode,     setViewMode]     = useState('list');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [folders,      setFolders]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [breadcrumb,   setBreadcrumb]   = useState([{ id: 'root', name: 'My Drive' }]);
  const [selected,     setSelected]     = useState([]);  // array of { id, name }
  const searchRef = useRef(null);

  useEffect(() => { loadFolders(); }, [activeTab, breadcrumb]);

  // ── Load folders from Drive API ───────────────────────────────────
  const loadFolders = async () => {
    if (!window.gapi?.client?.drive) {
      console.error('Drive API not ready');
      return;
    }
    setLoading(true);

    try {
      const currentId = breadcrumb[breadcrumb.length - 1].id;
      let q = "mimeType='application/vnd.google-apps.folder' and trashed=false";

      if (activeTab === 'my-drive') {
        q += ` and '${currentId}' in parents`;
      } else if (activeTab === 'shared') {
        q += ' and sharedWithMe=true';
      } else if (activeTab === 'starred') {
        q += ' and starred=true';
      } else if (activeTab === 'recent') {
        // recent — just folders, no parent filter
      }

      const res = await window.gapi.client.drive.files.list({
        q,
        fields: 'files(id,name,mimeType,modifiedTime,owners)',
        pageSize: 100,
        orderBy:  activeTab === 'recent' ? 'recency desc' : 'name',
        ...(activeTab === 'recent' ? { corpora: 'allDrives', includeItemsFromAllDrives: true, supportsAllDrives: true } : {}),
      });

      setFolders(res.result.files || []);
    } catch (err) {
      console.error('FolderPicker load error:', err);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Search ────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) { loadFolders(); return; }
    setLoading(true);
    try {
      const res = await window.gapi.client.drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name contains '${searchQuery.replace(/'/g, "\\'")}' and trashed=false`,
        fields:  'files(id,name,mimeType,modifiedTime,owners)',
        pageSize: 50,
        orderBy: 'name',
      });
      setFolders(res.result.files || []);
    } catch { setFolders([]); }
    finally   { setLoading(false); }
  };

  // ── Toggle selection of a folder ─────────────────────────────────
  const toggleSelect = (folder) => {
    setSelected(prev => {
      const already = prev.some(f => f.id === folder.id);
      return already
        ? prev.filter(f => f.id !== folder.id)
        : [...prev, { id: folder.id, name: folder.name }];
    });
  };

  // ── Navigate into folder (double-click) ──────────────────────────
  const openFolder = (folder) => {
    setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }]);
    setActiveTab('my-drive');
  };

  const navigateBreadcrumb = (idx) => {
    setBreadcrumb(prev => prev.slice(0, idx + 1));
  };

  // ── Confirm selection ─────────────────────────────────────────────
  const handleConfirm = () => {
    if (selected.length > 0) onSelect(selected);
  };

  // ── Filtered list ─────────────────────────────────────────────────
  const displayed = searchQuery
    ? folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : folders;

  // ── Date helper ───────────────────────────────────────────────────
  const fmt = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const diffDays = Math.floor((Date.now() - d) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7)  return `${diffDays} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isSelected = (id) => selected.some(f => f.id === id);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        width: '100%',
        maxWidth: 860,
        height: 580,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
      }}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div style={{ padding: '16px 20px 0', borderBottom: '1px solid #e8eaed' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>

            {/* Title + Drive logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
              <span style={{ fontSize: 16, fontWeight: 500, color: '#202124' }}>
                Select folders
              </span>
              {selected.length > 0 && (
                <span style={{ fontSize: 12, color: '#1967d2', background: '#e8f0fe', padding: '2px 8px', borderRadius: 12, fontWeight: 500 }}>
                  {selected.length} selected
                </span>
              )}
            </div>

            {/* Search bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 380, margin: '0 16px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                flex: 1, background: '#f1f3f4', borderRadius: 24,
                padding: '7px 14px',
              }}>
                <Search size={15} color="#5f6368" style={{ flexShrink: 0 }} />
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Search folders"
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: '#202124', flex: 1, minWidth: 0 }}
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); loadFolders(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                    <X size={14} color="#5f6368" />
                  </button>
                )}
              </div>
            </div>

            {/* View toggle + close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setViewMode('list')}
                style={{ padding: 6, border: 'none', background: viewMode === 'list' ? '#e8f0fe' : 'transparent', borderRadius: 4, cursor: 'pointer', display: 'flex' }}
              >
                <List size={18} color={viewMode === 'list' ? '#1967d2' : '#5f6368'} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                style={{ padding: 6, border: 'none', background: viewMode === 'grid' ? '#e8f0fe' : 'transparent', borderRadius: 4, cursor: 'pointer', display: 'flex' }}
              >
                <Grid3x3 size={18} color={viewMode === 'grid' ? '#1967d2' : '#5f6368'} />
              </button>
              <div style={{ width: 1, height: 20, background: '#e8eaed', margin: '0 4px' }} />
              <button onClick={onClose} style={{ padding: 6, border: 'none', background: 'transparent', borderRadius: 4, cursor: 'pointer', display: 'flex' }}>
                <X size={18} color="#5f6368" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setBreadcrumb([{ id: 'root', name: 'My Drive' }]);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', border: 'none', background: 'transparent',
                  fontSize: 14, cursor: 'pointer',
                  borderBottom: activeTab === tab.id ? '2px solid #1967d2' : '2px solid transparent',
                  color: activeTab === tab.id ? '#1967d2' : '#5f6368',
                  fontWeight: activeTab === tab.id ? 500 : 400,
                  marginBottom: -1,
                }}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Breadcrumb ───────────────────────────────────────────── */}
        {activeTab === 'my-drive' && breadcrumb.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 20px', borderBottom: '1px solid #e8eaed', flexWrap: 'wrap' }}>
            {breadcrumb.map((crumb, i) => (
              <React.Fragment key={crumb.id}>
                <button
                  onClick={() => navigateBreadcrumb(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: i === breadcrumb.length - 1 ? '#202124' : '#1967d2', padding: '2px 4px', borderRadius: 4 }}
                >
                  {crumb.name}
                </button>
                {i < breadcrumb.length - 1 && <ChevronRight size={14} color="#9aa0a6" />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ── Multi-select hint ────────────────────────────────────── */}
        <div style={{ padding: '6px 20px', background: '#f8f9fa', borderBottom: '1px solid #e8eaed', fontSize: 12, color: '#5f6368' }}>
          Click to select · Double-click to open · Hold to select multiple folders
        </div>

        {/* ── Folder list / grid ───────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: '#5f6368' }}>
              <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 14 }}>Loading folders…</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : displayed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5f6368' }}>
              <Folder size={40} style={{ margin: '0 auto 12px', opacity: 0.35, display: 'block' }} />
              <p style={{ fontSize: 14, margin: 0 }}>No folders found</p>
            </div>
          ) : viewMode === 'grid' ? (
            <GridFolders
              folders={displayed}
              isSelected={isSelected}
              onToggle={toggleSelect}
              onOpen={openFolder}
              fmt={fmt}
            />
          ) : (
            <ListFolders
              folders={displayed}
              isSelected={isSelected}
              onToggle={toggleSelect}
              onOpen={openFolder}
              fmt={fmt}
            />
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #e8eaed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          {/* Selected chips */}
          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 24 }}>
            {selected.map(f => (
              <span
                key={f.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 12, color: '#1967d2',
                  background: '#e8f0fe',
                  border: '1px solid #c6d9fb',
                  padding: '3px 8px', borderRadius: 20,
                  maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                <Folder size={11} />
                {f.name}
                <button
                  onClick={() => setSelected(prev => prev.filter(x => x.id !== f.id))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#5f6368' }}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button
              onClick={onClose}
              style={{ padding: '8px 20px', borderRadius: 4, border: '1px solid #dadce0', background: '#fff', cursor: 'pointer', fontSize: 14, color: '#202124' }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selected.length === 0}
              style={{
                padding: '8px 20px', borderRadius: 4, border: 'none',
                background: selected.length > 0 ? '#1967d2' : '#dadce0',
                color: selected.length > 0 ? '#fff' : '#80868b',
                cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: 14, fontWeight: 500,
              }}
            >
              {selected.length > 1
                ? `Add ${selected.length} folders`
                : selected.length === 1
                  ? 'Add folder'
                  : 'Select folders'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Grid view — folders only ──────────────────────────────────────────
function GridFolders({ folders, isSelected, onToggle, onOpen, fmt }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
      {folders.map(folder => {
        const sel = isSelected(folder.id);
        return (
          <div
            key={folder.id}
            onClick={() => onToggle(folder)}
            onDoubleClick={() => onOpen(folder)}
            title="Click to select · Double-click to open"
            style={{
              border: sel ? '2px solid #1967d2' : '1px solid #e8eaed',
              borderRadius: 8,
              overflow: 'hidden',
              cursor: 'pointer',
              background: sel ? '#e8f0fe' : '#fff',
              transition: 'all 0.12s',
              position: 'relative',
              userSelect: 'none',
            }}
            onMouseEnter={e => { if (!sel) e.currentTarget.style.borderColor = '#c6d9fb'; }}
            onMouseLeave={e => { if (!sel) e.currentTarget.style.borderColor = '#e8eaed'; }}
          >
            {/* Checkbox */}
            <div style={{
              position: 'absolute', top: 6, right: 6,
              width: 18, height: 18, borderRadius: '50%',
              background: sel ? '#1967d2' : 'rgba(255,255,255,0.85)',
              border: sel ? 'none' : '1.5px solid #bbb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}>
              {sel && <Check size={11} color="#fff" strokeWidth={3} />}
            </div>

            <div style={{ height: 80, background: '#f1f3f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Folder size={34} color="#5f6368" />
            </div>
            <div style={{ padding: '7px 8px' }}>
              <p style={{ fontSize: 12, color: '#202124', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                {folder.name}
              </p>
              <p style={{ fontSize: 11, color: '#80868b', margin: 0 }}>{fmt(folder.modifiedTime)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── List view — folders only ──────────────────────────────────────────
function ListFolders({ folders, isSelected, onToggle, onOpen, fmt }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #e8eaed' }}>
          <th style={{ width: 32, padding: '8px 8px 8px 4px' }} />
          <th style={{ textAlign: 'left', padding: '8px 12px 8px 4px', color: '#5f6368', fontWeight: 500 }}>Name</th>
          <th style={{ textAlign: 'left', padding: '8px', color: '#5f6368', fontWeight: 500 }}>Owner</th>
          <th style={{ textAlign: 'left', padding: '8px', color: '#5f6368', fontWeight: 500 }}>Last modified</th>
          <th style={{ width: 80, textAlign: 'center', padding: '8px', color: '#5f6368', fontWeight: 500 }}>Open</th>
        </tr>
      </thead>
      <tbody>
        {folders.map(folder => {
          const sel = isSelected(folder.id);
          return (
            <tr
              key={folder.id}
              onClick={() => onToggle(folder)}
              style={{
                background: sel ? '#e8f0fe' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.1s',
                userSelect: 'none',
              }}
              onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#f8f9fa'; }}
              onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Checkbox cell */}
              <td style={{ padding: '10px 8px 10px 12px', borderRadius: '4px 0 0 4px' }}>
                <div style={{
                  width: 17, height: 17, borderRadius: 3,
                  background: sel ? '#1967d2' : '#fff',
                  border: sel ? 'none' : '1.5px solid #bbb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.1s',
                }}>
                  {sel && <Check size={11} color="#fff" strokeWidth={3} />}
                </div>
              </td>

              {/* Folder name */}
              <td style={{ padding: '10px 12px 10px 4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Folder size={18} color={sel ? '#1967d2' : '#5f6368'} style={{ flexShrink: 0 }} />
                  <span style={{ color: '#202124', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: sel ? 500 : 400 }}>
                    {folder.name}
                  </span>
                </div>
              </td>

              {/* Owner */}
              <td style={{ padding: '10px 8px', color: '#5f6368' }}>
                {folder.owners?.[0]?.displayName || 'me'}
              </td>

              {/* Modified */}
              <td style={{ padding: '10px 8px', color: '#5f6368' }}>
                {fmt(folder.modifiedTime)}
              </td>

              {/* Open button — stops propagation so click ≠ select */}
              <td style={{ padding: '10px 8px', textAlign: 'center', borderRadius: '0 4px 4px 0' }}>
                <button
                  onClick={e => { e.stopPropagation(); onOpen(folder); }}
                  title="Open folder"
                  style={{
                    background: 'none', border: '1px solid #dadce0', cursor: 'pointer',
                    borderRadius: 4, padding: '3px 8px', fontSize: 12, color: '#5f6368',
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f1f3f4'; e.currentTarget.style.color = '#202124'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#5f6368'; }}
                >
                  Open <ChevronRight size={12} />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
