import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Chat from './pages/Chat';
import OAuthCallback from './pages/OAuthCallback';
import Analytics from './pages/Analytics';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/"          element={<Login />} />
        <Route path="/callback"  element={<OAuthCallback />} />
        <Route path="/chat"      element={<Chat />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Router>
  );
}

export default App;