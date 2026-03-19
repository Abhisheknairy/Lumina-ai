import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Database, Users, Link2, Copy, Check,
  ArrowLeft, Loader2, X, Folder, RefreshCw,
  ExternalLink, Trash2, UserPlus, ChevronRight
} from 'lucide-react';
import { authFetch } from '../utils/api';

// FIX: Use env var — never hardcode localhost or API keys
const API_BASE       = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

export default function Collaboration() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const userId         = searchParams.get('user_id');

  const [kbs,          setKbs]          = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showCreate,   setShowCreate]   = useState(false);
  const [creating,     setCreating]     = useState(false);
  const [copiedLink,   setCopiedLink]   = useState(null);

  const [form, setForm] = useState({
    name: '', description: '', folder_id: '', folder_name: '', member_emails: ''
  });

  const [addMemberKb,    setAddMemberKb]    = useState(null);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addingMember,   setAddingMember]   = useState(false);
  const [addMemberResult, setAddMemberResult] = useState(null); // FIX: show link inline

  const [driveApiReady, setDriveApiReady] = useState(false);
  const [oauthToken,    setOauthToken]    = useState(null);

  useEffect(() => { if (!userId) navigate('/'); }, [userId, navigate]);

  useEffect(() => {
    if (!userId) return;
    fetchKBs();

    // FIX: Use API_BASE env var, not hardcoded localhost
    fetch(`${API_BASE}/api/get-token/${userId}`)
      .then(r => r.json())
      .then(async data => {
        if (!data.access_token) return;
        setOauthToken(data.access_token);

        if (window.__gapiPickerLoaded) {
          setDriveApiReady(true);
          return;
        }

        const script = document.createElement('script');
        script.src    = 'https://apis.google.com/js/api.js';
        script.onload = async () => {
          try {
            await new Promise(resolve => window.gapi.load('client:picker', resolve));
            // FIX: Only init if GOOGLE_API_KEY is set
            if (GOOGLE_API_KEY) {
              await window.gapi.client.init({ apiKey: GOOGLE_API_KEY });
            }
            await window.gapi.client.load('drive', 'v3');
            window.gapi.client.setToken({ access_token: data.access_token });
            window.__gapiPickerLoaded = true;
            setDriveApiReady(true);
          } catch (err) {
            console.error('Collaboration Drive API init failed:', err);
          }
        };
        document.body.appendChild(script);
      })
      .catch(err => console.error('Failed to load Drive token for Collaboration:', err));
  }, [userId]);

  const fetchKBs = async () => {
    setLoading(true);
    try {
      const res  = await authFetch(userId, `/api/kb/list`);
      const data = await res.json();
      setKbs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load KBs:', err);
    } finally {
      setLoading(false);
    }
  };

  const openFolderPicker = () => {
    if (!driveApiReady || !oauthToken) { alert('Drive still loading, try again.'); return; }
    // FIX: Guard against missing GOOGLE_API_KEY
    if (!GOOGLE_API_KEY) { alert('Google API key is not configured. Please set VITE_GOOGLE_API_KEY.'); return; }
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
    view.setIncludeFolders(true);
    view.setSelectFolderEnabled(true);
    new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(oauthToken)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setCallback(data => {
        if (data.action === window.google.picker.Action.PICKED) {
          const item = data.docs[0];
          setForm(prev => ({ ...prev, folder_id: item.id, folder_name: item.name }));
        }
      })
      .setTitle('Select Drive folder for this Knowledge Base')
      .build()
      .setVisible(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.folder_id) {
      alert('Please provide a name and select a Drive folder.');
      return;
    }
    setCreating(true);
    try {
      const emails = form.member_emails
        .split(/[,\n]/)
        .map(e => e.trim().toLowerCase())
        .filter(Boolean);

      const res  = await authFetch(userId, `/api/kb/create`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:          form.name,
          description:   form.description,
          folder_id:     form.folder_id,
          folder_name:   form.folder_name,
          member_emails: emails,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create KB');

      setForm({ name: '', description: '', folder_id: '', folder_name: '', member_emails: '' });
      setShowCreate(false);
      fetchKBs();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (link, kbId) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(kbId);
      setTimeout(() => setCopiedLink(null), 2500);
    });
  };

  const handleAddMember = async (kb) => {
    if (!addMemberEmail.trim()) return;
    setAddingMember(true);
    setAddMemberResult(null);
    try {
      const res = await authFetch(userId,
        `/api/kb/${kb.id}/add-member?email=${encodeURIComponent(addMemberEmail)}&role=viewer`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      // FIX: Show invite link inline instead of alert()
      setAddMemberResult({ link: data.invite_link, email: addMemberEmail });
      setAddMemberEmail('');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setAddingMember(false);
    }
  };

  const handleDeactivate = async (kb) => {
    if (!window.confirm(`Deactivate "${kb.name}"? Members will lose access.`)) return;
    try {
      await authFetch(userId, `/api/kb/${kb.id}`, { method: 'DELETE' });
      fetchKBs();
    } catch (err) {
      alert('Failed to deactivate.');
    }
  };

  const handleOpenKb = (kb) => {
    navigate(`/chat?user_id=${userId}&kb_id=${kb.id}&kb_name=${encodeURIComponent(kb.name)}&folder_id=${kb.folder_id}&folder_name=${encodeURIComponent(kb.folder_name)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">

      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/chat?user_id=${userId}`)}
              className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Collaboration</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchKBs}
              className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> New Knowledge Base
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {!loading && kbs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/20 rounded-2xl flex items-center justify-center mb-4">
              <Database className="w-8 h-8 text-teal-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No knowledge bases yet</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
              Create a shared knowledge base to let your team chat with the same Drive documents.
            </p>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Create your first KB
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading knowledge bases...
          </div>
        )}

        {!loading && kbs.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {kbs.map(kb => (
              <div key={kb.id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 hover:shadow-md transition-shadow">

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-50 dark:bg-teal-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Database className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{kb.name}</h3>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Folder className="w-3 h-3" />{kb.folder_name || kb.folder_id}
                      </p>
                    </div>
                  </div>
                  {kb.is_creator && (
                    <span className="text-xs bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 px-2 py-0.5 rounded-full font-medium">Creator</span>
                  )}
                </div>

                {kb.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{kb.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-400 mb-4 pt-3 border-t border-gray-50 dark:border-gray-800">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{kb.member_count} member{kb.member_count !== 1 ? 's' : ''}</span>
                  <span>Created {new Date(kb.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => handleOpenKb(kb)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition-colors">
                    Open Chat <ChevronRight className="w-4 h-4" />
                  </button>

                  <button onClick={() => copyLink(kb.invite_link, kb.id)} title="Copy invite link"
                    className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-xl transition-colors">
                    {copiedLink === kb.id ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
                  </button>

                  {kb.is_creator && (
                    <>
                      <button onClick={() => { setAddMemberKb(kb); setAddMemberResult(null); }} title="Add member"
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors">
                        <UserPlus className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeactivate(kb)} title="Deactivate KB"
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                  <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-400 truncate flex-1">{kb.invite_link}</span>
                  <button onClick={() => copyLink(kb.invite_link, kb.id)}
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium flex-shrink-0">
                    {copiedLink === kb.id ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── CREATE KB MODAL ── */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Knowledge Base</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Q3 Onboarding Docs"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="What is this knowledge base for?" rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500 resize-none"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Drive Folder *</label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <Folder className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{form.folder_name || 'No folder selected'}</span>
                  </div>
                  <button type="button" onClick={openFolderPicker}
                    className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    Browse
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Invite Members (emails, one per line or comma-separated)
                </label>
                <textarea value={form.member_emails} onChange={e => setForm(p => ({ ...p, member_emails: e.target.value }))}
                  placeholder={"colleague1@isteer.com\ncolleague2@isteer.com"} rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500 resize-none font-mono"/>
                <p className="text-xs text-gray-400 mt-1">Each person gets a shareable invite link. They'll see this KB in their sidebar after accepting.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creating ? 'Creating...' : 'Create Knowledge Base'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD MEMBER MODAL — FIX: show invite link inline ── */}
      {addMemberKb && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Add Member to "{addMemberKb.name}"</h2>
              <button onClick={() => { setAddMemberKb(null); setAddMemberResult(null); }} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              {addMemberResult ? (
                // FIX: Show invite link inline instead of alert()
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">Invite created for {addMemberResult.email}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Share this invite link:</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1 font-mono">{addMemberResult.link}</span>
                      <button onClick={() => copyLink(addMemberResult.link, 'modal')}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium flex-shrink-0 flex items-center gap-1">
                        {copiedLink === 'modal' ? <><Check className="w-3 h-3"/>Copied</> : <><Copy className="w-3 h-3"/>Copy</>}
                      </button>
                    </div>
                  </div>
                  <button onClick={() => { setAddMemberResult(null); }}
                    className="w-full py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    Add Another
                  </button>
                </div>
              ) : (
                <>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email address</label>
                  <input value={addMemberEmail} onChange={e => setAddMemberEmail(e.target.value)}
                    placeholder="colleague@isteer.com"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500 mb-4"/>
                  <div className="flex gap-3">
                    <button onClick={() => setAddMemberKb(null)}
                      className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      Cancel
                    </button>
                    <button onClick={() => handleAddMember(addMemberKb)} disabled={addingMember}
                      className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                      {addingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      Add Member
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}