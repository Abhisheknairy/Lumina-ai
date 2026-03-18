import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Chat from './pages/Chat';
import OAuthCallback from './pages/OAuthCallback';
import Analytics from './pages/Analytics';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/"          element={<Login />} />
          <Route path="/callback"  element={<OAuthCallback />} />
          <Route path="/chat"      element={<Chat />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;