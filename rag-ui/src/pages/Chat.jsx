import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Send, Loader2, Paperclip, Bot, 
  FileText, ExternalLink, CheckCircle, AlertCircle, 
  Sparkles, Clock, Zap, X
} from 'lucide-react';
import AppLayout from '../components/AppLayout';

// TicketButton Component
function TicketButton({ message }) {
  const [ticketState, setTicketState] = useState('idle');
  const [ticketId, setTicketId] = useState(null);

  const handleRaiseTicket = async () => {
    setTicketState('loading');
    try {
      const res = await fetch('http://localhost:8000/raise-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'test_user',
          message: message.content,
          conversation_context: JSON.stringify(message),
        }),
      });
      if (!res.ok) throw new Error('Failed to raise ticket');
      const data = await res.json();
      setTicketId(data.ticket_id || 'Generated');
      setTicketState('success');
    } catch {
      setTicketState('error');
      setTimeout(() => setTicketState('idle'), 3000);
    }
  };

  if (ticketState === 'success') {
    return (
      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
        <CheckCircle className="w-3.5 h-3.5" />
        Ticket #{ticketId} created
      </div>
    );
  }

  return (
    <button
      onClick={handleRaiseTicket}
      disabled={ticketState === 'loading'}
      className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-700"
    >
      {ticketState === 'loading' ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Creating...
        </>
      ) : (
        <>
          <FileText className="w-3.5 h-3.5" />
          Raise Ticket
        </>
      )}
    </button>
  );
}

// DrivePicker Component - Google Drive File Picker
function DrivePicker({ onSelect, onClose }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    if (!window.gapi?.client?.drive) {
      setError('Google Drive API not initialized. Please refresh the page.');
      console.error('Google Drive API not ready');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Fetching Google Drive files...');
      
      // Fetch files from Google Drive (not local filesystem!)
      const res = await window.gapi.client.drive.files.list({
        q: 'trashed=false',
        fields: 'files(id,name,mimeType,modifiedTime,webViewLink,iconLink)',
        pageSize: 20,
        orderBy: 'recency desc',
        spaces: 'drive' // Explicitly specify Google Drive space
      });
      
      console.log('Google Drive API response:', res);
      
      if (res.result && res.result.files) {
        console.log(`Found ${res.result.files.length} files in Google Drive`);
        setFiles(res.result.files);
      } else {
        setFiles([]);
      }
    } catch (err) {
      console.error('Google Drive API error:', err);
      setError('Failed to load Google Drive files. Please try again.');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[600px] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Select from Google Drive
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Choose a file or folder from your Google Drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Files List */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading your Google Drive files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No files found in Google Drive</p>
              <button
                onClick={loadFiles}
                className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Reload files
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => setSelectedItem(file)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    selectedItem?.id === file.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-2 border-transparent'
                  }`}
                >
                  <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(file.modifiedTime).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedItem?.id === file.id && (
                    <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {selectedItem ? `Selected: ${selectedItem.name}` : 'Select a file or folder from Google Drive'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => selectedItem && onSelect(selectedItem)}
              disabled={!selectedItem}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Chat Component
export default function Chat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('user_id');
  const messagesEndRef = useRef(null);

  // State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [connectedItem, setConnectedItem] = useState(null);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [driveApiReady, setDriveApiReady] = useState(false);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState('');
  const [ingestError, setIngestError] = useState('');

  // Redirect if no userId
  useEffect(() => {
    if (!userId) {
      navigate('/');
    }
  }, [userId, navigate]);

  // Fetch user profile and initialize Google Drive with access token
  useEffect(() => {
    if (!userId) return;
    
    const fetchProfileAndInitDrive = async () => {
      try {
        console.log('Fetching user profile and access token...');
        
        // Get user profile and access token from backend
        const res = await fetch(`http://localhost:8000/api/get-token/${userId}`);
        const data = await res.json();
        
        console.log('Backend response:', data);
        
        if (data.display_name) setDisplayName(data.display_name);
        if (data.email) setUserEmail(data.email);
        
        // Check if we got an access token
        if (data.access_token) {
          console.log('✅ Got access token from backend, initializing Google Drive...');
          await initializeGoogleDriveWithToken(data.access_token);
        } else {
          console.error('❌ No access token received from backend');
          console.log('Make sure your backend /api/get-token endpoint returns access_token');
        }
      } catch (err) {
        console.error('Profile/token fetch error:', err);
      }
    };

    fetchProfileAndInitDrive();
  }, [userId]);

  // Initialize Google Drive API with access token
  const initializeGoogleDriveWithToken = async (accessToken) => {
    try {
      console.log('Step 1: Checking if gapi is loaded...');
      
      // Wait for gapi to be loaded
      if (!window.gapi) {
        console.log('⏳ Waiting for gapi to load...');
        setTimeout(() => initializeGoogleDriveWithToken(accessToken), 500);
        return;
      }

      console.log('Step 2: Loading gapi client...');
      
      // Load the client library
      await new Promise((resolve) => {
        window.gapi.load('client', resolve);
      });

      console.log('Step 3: Initializing gapi client...');
      
      // Initialize the client
      await window.gapi.client.init({
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      });

      console.log('Step 4: Setting access token...');
      
      // Set the access token - THIS IS CRITICAL!
      window.gapi.client.setToken({
        access_token: accessToken
      });

      console.log('✅ Google Drive API initialized successfully!');
      console.log('✅ You can now browse Google Drive files');
      
      setDriveApiReady(true);
    } catch (error) {
      console.error('❌ Error initializing Google Drive API:', error);
      
      // Retry logic
      console.log('Retrying in 2 seconds...');
      setTimeout(() => initializeGoogleDriveWithToken(accessToken), 2000);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle new chat
  const handleNewChat = () => {
    setMessages([]);
    setConnectedItem(null);
    setIngestSuccess('');
    setIngestError('');
    setInput('');
  };

  // Handle opening Drive Picker - NO NATIVE FILE PICKER!
  const handleOpenDrivePicker = (e) => {
    // Prevent any default behavior
    e.preventDefault();
    e.stopPropagation();
    
    if (!driveApiReady) {
      alert('Google Drive is still loading. Please wait a moment and try again.');
      return;
    }
    
    console.log('Opening Google Drive picker...');
    setShowDrivePicker(true);
  };

  // Handle file/folder selection
  const handleDriveSelect = async (item) => {
    console.log('Selected from Google Drive:', item);
    setShowDrivePicker(false);
    setConnectedItem(item);

    // If folder, trigger ingestion
    if (item.mimeType === 'application/vnd.google-apps.folder') {
      setIngestLoading(true);
      setIngestError('');
      setIngestSuccess('');

      try {
        const res = await fetch(
          `http://localhost:8000/ingest-folder/${userId}/${item.id}`,
          { method: 'POST' }
        );

        if (!res.ok) throw new Error('Ingestion failed');

        const data = await res.json();
        setIngestSuccess(
          `✓ Processed ${data.files_processed} files with ${data.total_chunks_saved} chunks`
        );
        setTimeout(() => setIngestSuccess(''), 5000);
      } catch (err) {
        setIngestError('⚠ Failed to process folder. Please try again.');
        setTimeout(() => setIngestError(''), 5000);
      } finally {
        setIngestLoading(false);
      }
    }
  };

  // Handle message submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          query: userMessage.content,
          folder_id: connectedItem?.id || 'default',
        }),
      });

      if (!res.ok) throw new Error('Query failed');

      const data = await res.json();
      const botMessage = {
        role: 'bot',
        content: data.response || 'Sorry, I could not process that.',
        sources: data.sources || [],
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          content: 'An error occurred. Please try again.',
          sources: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getIngestStatusStyle = () => {
    if (ingestLoading)
      return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
    if (ingestError)
      return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800';
    if (ingestSuccess)
      return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800';
    return '';
  };

  return (
    <AppLayout
      userId={userId}
      displayName={displayName}
      userEmail={userEmail}
      onNewChat={handleNewChat}
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
                  How can I help you today?
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
                  {driveApiReady
                    ? 'Connect a file or folder from your Google Drive to start chatting.'
                    : 'Initializing Google Drive connection...'}
                </p>

                {/* Suggestions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {[
                    { icon: Clock, text: 'Summarize recent documents', color: 'blue' },
                    { icon: FileText, text: 'Find specific information', color: 'green' },
                    { icon: Zap, text: 'Compare multiple files', color: 'purple' },
                    { icon: Sparkles, text: 'Extract key insights', color: 'orange' },
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-all group text-left"
                      onClick={() => setInput(suggestion.text)}
                    >
                      <div className="w-10 h-10 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <suggestion.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {suggestion.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

<<<<<<< HEAD
            {messages.map((message, index) => (
              <div key={index} className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                >
                  {/* Bot Avatar */}
                  {message.role === 'bot' && (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-gray-900 to-gray-700 dark:from-gray-700 dark:to-gray-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}

                  {/* Message Content */}
                  <div
                    className={`max-w-[75%] ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-2xl rounded-tr-sm shadow-md'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed text-[15px]">
                      {message.content}
                    </p>

                    {/* Sources */}
                    {message.sources?.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold mb-2">
                          Sources
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {message.sources.map((source, idx) => {
                            const name =
                              typeof source === 'object' ? source.name : source;
                            const link =
                              typeof source === 'object' ? source.link : null;
                            return link ? (
                              <a
                                key={idx}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                              >
                                <FileText className="w-3 h-3" />
                                {name}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                              >
                                <FileText className="w-3 h-3" />
                                {name}
                              </span>
                            );
                          })}
                        </div>
                        <TicketButton message={message} />
                      </div>
                    )}

                    {/* Ticket Button (no sources) */}
                    {message.role === 'bot' && !message.sources?.length && (
                      <TicketButton message={message} />
                    )}
                  </div>
>>>>>>> f976f393962d58104eff7deb37351f4814875473
                </div>
              ))}

              {/* Loading */}
              {loading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-gray-900 to-gray-700 dark:from-gray-700 dark:to-gray-500 flex items-center justify-center shadow-sm">
                  </div>
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Thinking...
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-transparent p-4 pb-5">
          <div className="max-w-3xl mx-auto">
            {/* Ingestion Status */}
            {(ingestLoading || ingestSuccess || ingestError) && (
              <div
                className={`mb-3 px-4 py-2.5 rounded-full text-sm font-medium flex items-center justify-center ${getIngestStatusStyle()}`}
              >
                {ingestLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {!ingestLoading && ingestError && (
                  <AlertCircle className="w-4 h-4 mr-2" />
                )}
                {!ingestLoading && ingestSuccess && (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {ingestError || ingestSuccess || 'Processing document...'}
              </div>
            )}

            {/* Connected File Banner */}
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

            {/* Input Form — pill shaped like ChatGPT */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-1 bg-transparent border border-gray-300 dark:border-gray-600 rounded-full px-4 py-2.5 focus-within:border-gray-400 dark:focus-within:border-gray-500 transition-colors shadow-sm"
            >
              {/* Paperclip / Drive button */}
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
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder={
                  connectedItem
                    ? `Ask about "${connectedItem.name}"...`
                    : 'Ask anything...'
                }
                className="flex-1 bg-transparent resize-none outline-none text-[15px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 py-1 px-2 max-h-32 leading-relaxed"
                rows="1"
                style={{
                  height: 'auto',
                  minHeight: '24px',
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
              />

              {/* Send button — solid circle like ChatGPT */}
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

      {/* Drive Picker Modal - This is Google Drive, not native file picker! */}
      {showDrivePicker && (
        <DrivePicker
          onSelect={handleDriveSelect}
          onClose={() => setShowDrivePicker(false)}
        />
      )}
    </AppLayout>
  );
}