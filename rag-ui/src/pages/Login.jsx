import { ArrowRight, FileText, Users, Zap, Lock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

function getOrCreateUserId() {
  const stored = sessionStorage.getItem('lumina_user_id');
  if (stored) return stored;
  const id = crypto.randomUUID();
  sessionStorage.setItem('lumina_user_id', id);
  return id;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const FEATURES = [
  {
    icon: FileText,
    title: 'Ask your Drive',
    desc: 'Query any Google Doc, Sheet, Slide, or PDF in plain English. Get cited answers in seconds.',
  },
  {
    icon: Zap,
    title: 'Instant, sourced answers',
    desc: 'Sub-3-second responses. Every answer links back to the document it came from.',
  },
  {
    icon: Users,
    title: 'Team knowledge bases',
    desc: 'Share document collections with your team. Everyone queries the same source of truth.',
  },
  {
    icon: Lock,
    title: 'Stays in your org',
    desc: 'OAuth 2.0 only. Your documents never leave Google Workspace.',
  },
];

export default function Login() {
  const { isDark, toggleTheme } = useTheme();

  const handleLogin = () => {
    window.location.href = `${API_BASE}/api/login?user_id=${getOrCreateUserId()}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      fontFamily: "'Inter', sans-serif",
      color: 'var(--text-1)',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav style={{
        height: 56,
        background: 'var(--bg-2)',
        borderBottom: '1px solid var(--border-sub)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 26, height: 26, background: 'var(--text-1)', borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
              <path d="M2.5 10.5L6.5 2.5L10.5 10.5" stroke="var(--bg)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
            Lumina AI
          </span>
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={toggleTheme}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 7, borderRadius: 6, color: 'var(--text-3)', display: 'flex' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; }}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={handleLogin}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px',
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 7,
              fontSize: 13, fontWeight: 500, color: 'var(--text-2)',
              cursor: 'pointer', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-2)'; }}
          >
            Sign in <ArrowRight size={13} />
          </button>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px 64px', position: 'relative' }}>

        {/* Subtle dot-grid background */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.5,
        }} />

        <div style={{ position: 'relative', maxWidth: 620, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '5px 12px',
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            fontSize: 12, fontWeight: 500, color: 'var(--text-2)',
            marginBottom: 28,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
            Powered by Gemini 2.0 Flash · Google Drive RAG
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 48,
            fontWeight: 600,
            letterSpacing: '-0.035em',
            lineHeight: 1.1,
            color: 'var(--text-1)',
            margin: '0 0 18px',
          }}>
            Your Drive,<br />
            <span style={{ color: 'var(--accent)' }}>answering questions</span>
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: 17,
            color: 'var(--text-2)',
            lineHeight: 1.65,
            margin: '0 0 40px',
            maxWidth: 480,
          }}>
            Connect your Google Drive and ask anything in plain English. Lumina finds answers across all your documents instantly.
          </p>

          {/* CTA */}
          <button
            onClick={handleLogin}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '13px 26px',
              background: 'var(--text-1)',
              border: 'none',
              borderRadius: 9,
              fontSize: 15, fontWeight: 500, color: 'var(--bg-2)',
              cursor: 'pointer',
              transition: 'opacity 0.12s',
              boxShadow: 'var(--shadow)',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
              alt="Google"
              style={{ width: 18, height: 18 }}
            />
            Continue with Google
            <ArrowRight size={15} />
          </button>

          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 14 }}>
            Free to start · No credit card · 60-second setup
          </p>
        </div>

        {/* ── Feature grid ─────────────────────────────────────────── */}
        <div style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 1,
          maxWidth: 760,
          width: '100%',
          marginTop: 72,
          background: 'var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: 'var(--shadow)',
        }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              style={{ padding: '28px 30px', background: 'var(--bg-2)' }}
            >
              <div style={{
                width: 34, height: 34,
                borderRadius: 8,
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 13,
              }}>
                <f.icon size={16} style={{ color: 'var(--text-2)' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
                {f.title}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer style={{
        height: 48,
        borderTop: '1px solid var(--border-sub)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>© 2026 Lumina AI · iSteer Technologies</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Secured by Google OAuth 2.0</span>
      </footer>
    </div>
  );
}