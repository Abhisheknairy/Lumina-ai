import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getOrCreateUserId() {
  const stored = sessionStorage.getItem('lumina_user_id');
  if (stored) return stored;
  const id = crypto.randomUUID();
  sessionStorage.setItem('lumina_user_id', id);
  return id;
}

// ── Animated constellation canvas ─────────────────────────────────────
function ConstellationCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Nodes
    const nodes = Array.from({ length: 60 }, () => ({
      x:   Math.random() * canvas.width,
      y:   Math.random() * canvas.height,
      vx:  (Math.random() - 0.5) * 0.3,
      vy:  (Math.random() - 0.5) * 0.3,
      r:   Math.random() * 1.5 + 0.5,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update
      nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width)  n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });

      // Connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx   = nodes[i].x - nodes[j].x;
          const dy   = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.18;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(200, 169, 110, ${alpha})`;
            ctx.lineWidth   = 0.6;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Dots
      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200, 169, 110, 0.4)';
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.6 }}
    />
  );
}

// ── Typing animation for tagline ──────────────────────────────────────
const TAGLINES = [
  'Find answers in seconds.',
  'No more folder digging.',
  'Your Drive, intelligently indexed.',
  'Ask. Get cited answers.',
];

function TypingTagline() {
  const [tagIdx, setTagIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [phase, setPhase]   = useState('typing'); // typing | pause | erasing

  useEffect(() => {
    const target = TAGLINES[tagIdx];
    let timeout;

    if (phase === 'typing') {
      if (displayed.length < target.length) {
        timeout = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 55);
      } else {
        timeout = setTimeout(() => setPhase('pause'), 2200);
      }
    } else if (phase === 'pause') {
      timeout = setTimeout(() => setPhase('erasing'), 400);
    } else if (phase === 'erasing') {
      if (displayed.length > 0) {
        timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 28);
      } else {
        setTagIdx(i => (i + 1) % TAGLINES.length);
        setPhase('typing');
      }
    }

    return () => clearTimeout(timeout);
  }, [displayed, phase, tagIdx]);

  return (
    <span>
      {displayed}
      <span style={{ borderRight: '2px solid #c8a96e', animation: 'blink 1s step-end infinite', marginLeft: 1 }}>&nbsp;</span>
    </span>
  );
}

export default function Login() {
  const navigate  = useNavigate();
  const [email, setEmail] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger mount animation
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/api/login?user_id=${getOrCreateUserId()}`;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0b0b0d', fontFamily: "'DM Sans', 'Inter', sans-serif", position: 'relative', overflow: 'hidden' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeLeft { from{opacity:0;transform:translateX(-24px)} to{opacity:1;transform:translateX(0)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }

        .login-card-enter { animation: scaleIn 0.6s cubic-bezier(.2,.8,.2,1) both; }
        .left-enter        { animation: fadeLeft 0.8s cubic-bezier(.2,.8,.2,1) both; }

        .google-btn {
          width: 100%;
          display: flex; align-items: center; justify-content: center; gap: 12px;
          padding: 15px;
          background: #f0ede8;
          border: none; border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 600;
          color: #0b0b0d;
          cursor: pointer;
          position: relative; overflow: hidden;
          transition: all 0.25s;
          letter-spacing: 0.01em;
        }
        .google-btn::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s;
        }
        .google-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(240,237,232,0.15); }
        .google-btn:hover::after { transform: translateX(100%); }

        .email-input {
          width: 100%; padding: 13px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; color: #f0ede8;
          outline: none; transition: border-color 0.2s, background 0.2s;
          box-sizing: border-box;
        }
        .email-input::placeholder { color: rgba(240,237,232,0.25); }
        .email-input:focus { border-color: rgba(200,169,110,0.5); background: rgba(200,169,110,0.04); }

        .submit-btn {
          width: 100%; padding: 14px;
          background: #c8a96e;
          border: none; border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 600;
          color: #0b0b0d; cursor: pointer;
          transition: all 0.25s; letter-spacing: 0.01em;
        }
        .submit-btn:hover:not(:disabled) { background: #dabb82; transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        .back-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: none; border: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; color: rgba(240,237,232,0.35);
          cursor: pointer; transition: color 0.2s; padding: 0;
        }
        .back-btn:hover { color: rgba(240,237,232,0.8); }

        .feature-pill {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px; padding: 7px 14px;
          font-size: 12px; font-weight: 500;
          color: rgba(240,237,232,0.55);
          letter-spacing: 0.01em;
        }
        .feature-pill-dot { width: 5px; height: 5px; border-radius: 50%; background: #c8a96e; flex-shrink: 0; }
      `}</style>

      {/* Full-bleed constellation background */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <ConstellationCanvas />
        {/* Radial vignette */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(11,11,13,0.7) 100%)' }} />
        {/* Left-side gold glow */}
        <div style={{ position: 'absolute', top: '20%', left: '25%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(200,169,110,0.07) 0%, transparent 65%)', filter: 'blur(40px)' }} />
      </div>

      {/* ── LEFT PANE ─────────────────────────────────────────────── */}
      <div
        className={mounted ? 'left-enter' : ''}
        style={{ flex: 1.1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 64px', position: 'relative', zIndex: 1 }}
      >
        {/* Logo */}
        <button onClick={() => navigate('/')} className="back-btn" style={{ marginBottom: 72, alignSelf: 'flex-start' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to home
        </button>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 56 }}>
          <div style={{ width: 32, height: 32, background: '#c8a96e', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 13 13" fill="none"><path d="M2.5 10.5L6.5 2.5L10.5 10.5" stroke="#0b0b0d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', color: '#f0ede8' }}>Lumina AI</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, color: '#f0ede8', marginBottom: 20 }}>
          Ask anything.<br />
          <em style={{ fontStyle: 'italic', color: '#c8a96e' }}>Get cited answers.</em>
        </h1>

        {/* Animated tagline */}
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: 'rgba(240,237,232,0.45)', marginBottom: 56, minHeight: 24, fontWeight: 300 }}>
          <TypingTagline />
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            'Connects to your Google Drive',
            'Answers with source citations',
            'Shared team knowledge bases',
            'Enterprise-grade data security',
          ].map((f, i) => (
            <div key={i} className="feature-pill" style={{ animationDelay: `${0.1 + i * 0.1}s` }}>
              <span className="feature-pill-dot" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Vertical divider */}
      <div style={{ width: 1, background: 'linear-gradient(to bottom, transparent, rgba(200,169,110,0.2) 30%, rgba(200,169,110,0.2) 70%, transparent)', alignSelf: 'stretch', position: 'relative', zIndex: 1 }} />

      {/* ── RIGHT PANE — Login card ──────────────────────────────── */}
      <div style={{ flex: 0.9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 64px', position: 'relative', zIndex: 1 }}>
        <div
          className={mounted ? 'login-card-enter' : ''}
          style={{ width: '100%', maxWidth: 400 }}
        >
          {/* Card */}
          <div style={{
            background: 'rgba(240,237,232,0.03)',
            border: '1px solid rgba(240,237,232,0.09)',
            borderRadius: 20,
            padding: '48px 44px',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
          }}>
            <div style={{ marginBottom: 36 }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: '#f0ede8', marginBottom: 8 }}>
                Welcome back
              </h2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(240,237,232,0.4)', fontWeight: 300, lineHeight: 1.6 }}>
                Sign in to your Lumina workspace and continue where you left off.
              </p>
            </div>

            {/* Google button */}
            <button className="google-btn" onClick={handleGoogleLogin}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" width="18" height="18" alt="Google" />
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '28px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
              <span style={{ padding: '0 14px', fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(240,237,232,0.25)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            </div>

            {/* Email form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!email) return;
                alert('Lumina AI requires a Google account to access your Drive. Please use "Continue with Google".');
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div>
                <label style={{ display: 'block', fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: 'rgba(240,237,232,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Email address
                </label>
                <input
                  type="email"
                  className="email-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              <button type="submit" className="submit-btn" disabled={!email}>
                Continue with email
              </button>
            </form>

            {/* Footer note */}
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(240,237,232,0.2)', textAlign: 'center', marginTop: 28, lineHeight: 1.6 }}>
              By signing in, you agree to our Terms of Service.<br />Your Drive data is never stored permanently.
            </p>
          </div>

          {/* Bottom badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(240,237,232,0.25)" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(240,237,232,0.25)' }}>OAuth 2.0 · Read-only access · No data stored</span>
          </div>
        </div>
      </div>
    </div>
  );
}