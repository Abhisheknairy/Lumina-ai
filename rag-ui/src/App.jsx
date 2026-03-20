import { BrowserRouter as Router, Routes, Route, useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import Landing       from './pages/Landing';
import Login         from './pages/Login';
import Chat          from './pages/Chat';
import OAuthCallback from './pages/OAuthCallback';
import Analytics     from './pages/Analytics';
import SuperAdmin    from './pages/SuperAdmin';
import Collaboration from './pages/Collaboration';

// ── FIX: KB invite accept handler ─────────────────────────────────────
// Route: /kb/join/:token
// Redirects to the backend accept-invite endpoint which then redirects
// back to /chat with the KB context in the URL.
function KBJoinRedirect() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId   = searchParams.get('user_id') || sessionStorage.getItem('lumina_user_id') || '';

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    // Redirect to backend which handles acceptance and redirects back to /chat
    window.location.href = `${API_BASE}/api/kb/accept-invite/${token}?user_id=${userId}`;
  }, [token, userId]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Accepting invitation...</p>
      </div>
    </div>
  );
}


function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/callback" element={<OAuthCallback />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/admin" element={<SuperAdmin />} />
          <Route path="/collaboration" element={<Collaboration />} />
          {/* FIX: KB invite link handler */}
          <Route path="/kb/join/:token" element={<KBJoinRedirect />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;