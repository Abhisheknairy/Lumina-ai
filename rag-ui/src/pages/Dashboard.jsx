import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FolderOpen, Loader2 } from 'lucide-react';

function Dashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('user_id');

  const [folderId, setFolderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!userId) {
      navigate('/');
    }
  }, [userId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!folderId.trim()) {
      setError('Please enter a folder ID');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `http://localhost:8000/ingest-folder/${userId}/${folderId.trim()}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('Failed to ingest folder');
      }

      const data = await response.json();
      setSuccess(
        `Success! Processed ${data.files_processed} files with ${data.total_chunks_saved} chunks.`
      );

      setTimeout(() => {
        navigate(`/chat?user_id=${userId}&folder_id=${folderId.trim()}`);
      }, 1500);
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Skip folder ingestion and go directly to chat with a default folder ID
    navigate(`/chat?user_id=${userId}&folder_id=default`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg">
        <div className="flex flex-col items-center space-y-6">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center">
            <FolderOpen className="w-8 h-8 text-white" />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Select Google Drive Folder
            </h1>
            <p className="text-gray-600">
              Enter the folder ID to process your documents
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div>
              <label
                htmlFor="folderId"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Google Drive Folder ID
              </label>
              <input
                type="text"
                id="folderId"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                placeholder="Paste folder ID here"
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Process Folder</span>
              )}
            </button>
          </form>

          <button
            onClick={handleSkip}
            disabled={loading}
            className="w-full text-blue-600 hover:text-blue-700 font-medium py-2 px-6 rounded-xl transition-colors disabled:text-blue-400 disabled:cursor-not-allowed"
          >
            Skip for now
          </button>

          <p className="text-xs text-gray-500 text-center">
            User ID: <span className="font-mono">{userId}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
