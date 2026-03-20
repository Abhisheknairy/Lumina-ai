import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ── Scroll reveal hook ────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const io  = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ── Animated counter ──────────────────────────────────────────────────
function Counter({ to, suffix = '', duration = 2000 }) {
  const [val, setVal] = useState(0);
  const ref           = useRef(null);
  const started       = useRef(false);

  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick  = () => {
          const progress = Math.min((Date.now() - start) / duration, 1);
          const ease     = 1 - Math.pow(1 - progress, 3);
          setVal(Math.round(ease * to));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [to, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
}

// ── Floating document card ────────────────────────────────────────────
function DocCard({ title, excerpt, tag, delay, x, y, rotate }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      width: 220,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 12,
      padding: '16px 18px',
      backdropFilter: 'blur(12px)',
      transform: `rotate(${rotate}deg)`,
      animation: `float ${3 + delay * 0.7}s ease-in-out ${delay}s infinite alternate`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      pointerEvents: 'none',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c8a96e', marginBottom: 8 }}>{tag}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 6, lineHeight: 1.4 }}>{title}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{excerpt}</div>
    </div>
  );
}

const FEATURES = [
  {
    num: '01',
    title: 'Instant answers from any document',
    body: 'Ask in plain English. Lumina reads every file in your Drive — Docs, PDFs, Sheets, Slides — and synthesises a precise answer in under 3 seconds.',
  },
  {
    num: '02',
    title: 'Cited, auditable responses',
    body: 'Every answer includes direct links to the source documents. No hallucinations, no guessing — your team can verify every statement.',
  },
  {
    num: '03',
    title: 'Shared team knowledge bases',
    body: 'Curate document collections for your team. When you update the source, the knowledge base updates automatically. One source of truth.',
  },
  {
    num: '04',
    title: 'Built for enterprise security',
    body: 'OAuth 2.0 — your documents never leave Google Workspace. Lumina reads only when asked, stores nothing permanently.',
  },
];

const TESTIMONIALS = [
  { quote: 'Cut our onboarding time from two weeks to two days. New hires just ask Lumina.', name: 'Head of Engineering', company: 'iSteer Technologies' },
  { quote: 'I used to spend 40 minutes finding answers in our compliance docs. Now it takes 40 seconds.', name: 'Operations Lead', company: 'Managed Services' },
  { quote: 'The citation feature is a game changer. Our legal team trusts it because every answer is sourced.', name: 'GC Office', company: 'Enterprise Client' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef   = useRef(null);
  useScrollReveal();

  const handleMouseMove = (e) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left - rect.width  / 2) / rect.width,
      y: (e.clientY - rect.top  - rect.height / 2) / rect.height,
    });
  };

  return (
    <div style={{ background: '#0b0b0d', color: '#f0ede8', fontFamily: "'Playfair Display', 'Georgia', serif", overflowX: 'hidden' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes float {
          from { transform: translateY(0px) rotate(var(--r, 0deg)); }
          to   { transform: translateY(-18px) rotate(var(--r, 0deg)); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes grain {
          0%,100% { transform: translate(0,0); }
          10%     { transform: translate(-2%,-3%); }
          20%     { transform: translate(3%,2%); }
          30%     { transform: translate(-1%,4%); }
          40%     { transform: translate(4%,-1%); }
          50%     { transform: translate(-3%,1%); }
          60%     { transform: translate(1%,-4%); }
          70%     { transform: translate(-4%,2%); }
          80%     { transform: translate(2%,3%); }
          90%     { transform: translate(-1%,-2%); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lineGrow {
          from { width: 0; }
          to   { width: 100%; }
        }

        [data-reveal] { opacity: 0; transform: translateY(32px); transition: opacity 0.8s cubic-bezier(.2,.8,.2,1), transform 0.8s cubic-bezier(.2,.8,.2,1); }
        [data-reveal].revealed { opacity: 1; transform: none; }
        [data-reveal][data-delay="1"] { transition-delay: 0.1s; }
        [data-reveal][data-delay="2"] { transition-delay: 0.2s; }
        [data-reveal][data-delay="3"] { transition-delay: 0.3s; }
        [data-reveal][data-delay="4"] { transition-delay: 0.4s; }
        [data-reveal][data-delay="5"] { transition-delay: 0.5s; }
        [data-reveal][data-delay="6"] { transition-delay: 0.6s; }

        .grain-overlay {
          position: fixed; inset: 0; z-index: 999; pointer-events: none;
          opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 200px;
          animation: grain 0.5s steps(1) infinite;
        }

        .cta-btn {
          display: inline-flex; align-items: center; gap: 10px;
          background: #c8a96e; color: #0b0b0d;
          border: none; border-radius: 6px;
          padding: 16px 32px; font-size: 15px; font-weight: 600;
          cursor: pointer; letter-spacing: 0.01em;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.25s;
          position: relative; overflow: hidden;
        }
        .cta-btn::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transform: translateX(-100%); transition: transform 0.5s;
        }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(200,169,110,0.35); }
        .cta-btn:hover::after { transform: translateX(100%); }

        .ghost-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: rgba(240,237,232,0.7);
          border: 1px solid rgba(240,237,232,0.2); border-radius: 6px;
          padding: 14px 28px; font-size: 14px; font-weight: 500;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .ghost-btn:hover { border-color: rgba(200,169,110,0.5); color: #c8a96e; }

        .feature-card {
          border-top: 1px solid rgba(255,255,255,0.08);
          padding: 40px 0;
          display: grid;
          grid-template-columns: 80px 1fr;
          gap: 32px;
          transition: border-color 0.3s;
        }
        .feature-card:hover { border-color: rgba(200,169,110,0.4); }

        .stat-number {
          font-family: 'Playfair Display', serif;
          font-size: clamp(52px, 8vw, 80px);
          font-weight: 700;
          background: linear-gradient(135deg, #f0ede8 0%, #c8a96e 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          line-height: 1;
        }

        .testimonial-card {
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 36px;
          background: rgba(255,255,255,0.02);
          backdrop-filter: blur(8px);
          transition: all 0.3s;
        }
        .testimonial-card:hover {
          border-color: rgba(200,169,110,0.25);
          background: rgba(200,169,110,0.04);
          transform: translateY(-4px);
        }

        .nav-link {
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; color: rgba(240,237,232,0.55);
          background: none; border: none; cursor: pointer;
          transition: color 0.2s; padding: 0;
          letter-spacing: 0.01em;
        }
        .nav-link:hover { color: #f0ede8; }

        .divider-line {
          width: 48px; height: 1px; background: #c8a96e;
        }

        .badge {
          display: inline-flex; align-items: center; gap: 7px;
          border: 1px solid rgba(200,169,110,0.3);
          border-radius: 20px; padding: 6px 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px; font-weight: 500; letter-spacing: 0.04em;
          color: #c8a96e; text-transform: uppercase;
        }
        .badge-dot { width: 5px; height: 5px; border-radius: 50%; background: #c8a96e; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
      `}</style>

      {/* Film grain overlay */}
      <div className="grain-overlay" />

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '0 48px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', background: 'rgba(11,11,13,0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, background: '#c8a96e', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M2.5 10.5L6.5 2.5L10.5 10.5" stroke="#0b0b0d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', color: '#f0ede8' }}>Lumina AI</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          {['Product', 'Security', 'Enterprise'].map(t => (
            <button key={t} className="nav-link">{t}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="ghost-btn" onClick={() => navigate('/login')}>Sign in</button>
          <button className="cta-btn" onClick={() => navigate('/login')} style={{ padding: '11px 22px', fontSize: 14 }}>
            Get started
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        onMouseMove={handleMouseMove}
        style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 48px 80px', position: 'relative', overflow: 'hidden', textAlign: 'center' }}
      >
        {/* Ambient orbs */}
        <div style={{
          position: 'absolute', width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200,169,110,0.08) 0%, transparent 70%)',
          left: '50%', top: '40%',
          transform: `translate(calc(-50% + ${mousePos.x * 30}px), calc(-50% + ${mousePos.y * 30}px))`,
          transition: 'transform 0.8s ease-out', pointerEvents: 'none',
        }} />
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(60,80,200,0.05) 0%, transparent 70%)', right: '15%', top: '20%', pointerEvents: 'none' }} />

        {/* Floating doc cards */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <DocCard title="Q3 Business Review" excerpt="Revenue up 23% YoY, customer NPS at 68..." tag="Finance · PDF" delay={0} x="5%" y="20%" rotate={-4} />
          <DocCard title="Engineering Runbook" excerpt="Service restart procedure: Step 1..." tag="DevOps · Doc" delay={0.4} x="76%" y="15%" rotate={3} />
          <DocCard title="HR Policy 2026" excerpt="Remote work guidelines updated Jan 2026..." tag="HR · Policy" delay={0.8} x="80%" y="60%" rotate={-2} />
          <DocCard title="Client SLA Template" excerpt="Response time SLA: P1 within 4 hours..." tag="Legal · Contract" delay={1.2} x="3%" y="65%" rotate={2} />
        </div>

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 860, animation: 'fadeUp 1s cubic-bezier(.2,.8,.2,1) both' }}>
          <div className="badge" style={{ marginBottom: 32 }}>
            <span className="badge-dot" />
            Now in enterprise availability
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(46px, 7vw, 88px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            marginBottom: 28,
            color: '#f0ede8',
          }}>
            Your documents.<br />
            <em style={{ fontStyle: 'italic', background: 'linear-gradient(100deg, #e8d5b0 0%, #c8a96e 50%, #a07840 100%)', backgroundSize: '200% auto', animation: 'shimmer 3s linear infinite', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Finally intelligent.
            </em>
          </h1>

          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 19, color: 'rgba(240,237,232,0.55)', lineHeight: 1.7, marginBottom: 48, maxWidth: 580, margin: '0 auto 48px', fontWeight: 300 }}>
            Lumina AI connects to your Google Drive and turns thousands of documents into an instant-answer knowledge engine — with citations, collaboration, and enterprise controls.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="cta-btn" onClick={() => navigate('/login')}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" width="17" height="17" alt="" />
              Connect your Drive
            </button>
            <button className="ghost-btn" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
              See how it works
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            </button>
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: 0.3, animation: 'fadeUp 1s 1.5s cubic-bezier(.2,.8,.2,1) both' }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Scroll</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, #f0ede8, transparent)' }} />
        </div>
      </section>

      {/* ── STATS BAND ──────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '64px 48px', background: 'rgba(255,255,255,0.015)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48 }}>
          {[
            { to: 3, suffix: 's', label: 'Average response time' },
            { to: 98, suffix: '%', label: 'Query deflection rate in production' },
            { to: 15, suffix: '+', label: 'File formats supported' },
          ].map((stat, i) => (
            <div key={i} data-reveal data-delay={String(i + 1)} style={{ textAlign: 'center' }}>
              <div className="stat-number"><Counter to={stat.to} suffix={stat.suffix} /></div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(240,237,232,0.4)', marginTop: 10, letterSpacing: '0.01em' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '120px 48px', maxWidth: 1040, margin: '0 auto' }}>
        <div data-reveal style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 72 }}>
          <div className="divider-line" />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c8a96e' }}>Capabilities</span>
        </div>

        <h2 data-reveal style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 80, maxWidth: 680, color: '#f0ede8' }}>
          Built for the questions your team asks every day.
        </h2>

        <div>
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card" data-reveal data-delay={String((i % 3) + 1)}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: 'rgba(240,237,232,0.2)', letterSpacing: '0.08em', paddingTop: 6 }}>{f.num}</div>
              <div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 500, color: '#f0ede8', marginBottom: 14, letterSpacing: '-0.01em' }}>{f.title}</h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,237,232,0.45)', lineHeight: 1.75, fontWeight: 300, maxWidth: 560 }}>{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section style={{ padding: '100px 48px', background: 'rgba(200,169,110,0.04)', borderTop: '1px solid rgba(200,169,110,0.1)', borderBottom: '1px solid rgba(200,169,110,0.1)' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <div data-reveal style={{ textAlign: 'center', marginBottom: 80 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 24 }}>
              <div className="divider-line" />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c8a96e' }}>Process</span>
              <div className="divider-line" />
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 4.5vw, 48px)', fontWeight: 700, letterSpacing: '-0.025em', color: '#f0ede8' }}>Up and running in minutes.</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
            {[
              { n: '1', title: 'Connect Google Drive', body: 'Authorise Lumina with read-only access via OAuth 2.0. Your credentials never leave your browser.' },
              { n: '2', title: 'Index your folders', body: 'Select which folders to make searchable. Lumina extracts and embeds every document in seconds.' },
              { n: '3', title: 'Ask anything', body: 'Type your question. Lumina retrieves the right passages, reasons across them, and cites every source.' },
            ].map((step, i) => (
              <div key={i} data-reveal data-delay={String(i + 1)} style={{
                padding: '48px 40px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: i === 0 ? '16px 0 0 16px' : i === 2 ? '0 16px 16px 0' : 0,
                position: 'relative',
              }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 700, color: 'rgba(200,169,110,0.15)', lineHeight: 1, marginBottom: 24 }}>{step.n}</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: '#f0ede8', marginBottom: 14 }}>{step.title}</h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(240,237,232,0.45)', lineHeight: 1.75, fontWeight: 300 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────── */}
      <section style={{ padding: '120px 48px', maxWidth: 1040, margin: '0 auto' }}>
        <div data-reveal style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 64 }}>
          <div className="divider-line" />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c8a96e' }}>Testimonials</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="testimonial-card" data-reveal data-delay={String(i + 1)}>
              <div style={{ fontSize: 32, color: '#c8a96e', marginBottom: 20, lineHeight: 1, fontFamily: "'Playfair Display', serif" }}>"</div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,237,232,0.75)', lineHeight: 1.75, fontWeight: 300, marginBottom: 28 }}>{t.quote}</p>
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#f0ede8' }}>{t.name}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(240,237,232,0.35)', marginTop: 3 }}>{t.company}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BLOCK ───────────────────────────────────────────────── */}
      <section style={{ padding: '100px 48px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,169,110,0.07) 0%, transparent 65%)', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
        <div data-reveal style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#f0ede8', marginBottom: 20 }}>
            Ready to stop searching<br />and start knowing?
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, color: 'rgba(240,237,232,0.45)', marginBottom: 48, fontWeight: 300 }}>
            Connect your Drive and ask your first question in under 60 seconds.
          </p>
          <button className="cta-btn" onClick={() => navigate('/login')} style={{ fontSize: 16, padding: '18px 40px' }}>
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" width="18" height="18" alt="" />
            Get started free
          </button>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer style={{ padding: '40px 48px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, background: '#c8a96e', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 13 13" fill="none"><path d="M2.5 10.5L6.5 2.5L10.5 10.5" stroke="#0b0b0d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color: 'rgba(240,237,232,0.4)' }}>Lumina AI · iSteer Technologies · 2026</span>
        </div>
        <div style={{ display: 'flex', gap: 28 }}>
          {['Privacy', 'Security', 'Terms'].map(l => (
            <button key={l} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(240,237,232,0.3)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#c8a96e'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,237,232,0.3)'}>
              {l}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}