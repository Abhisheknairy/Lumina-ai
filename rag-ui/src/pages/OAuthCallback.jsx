import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const userId = searchParams.get('user_id');
    if (userId) navigate(`/chat?user_id=${userId}`);
    else navigate('/');
  }, [searchParams, navigate]);

  return (
    <div style={{ minHeight: '100vh', background: '#0b0b0d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=Playfair+Display:wght@600&display=swap'); @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, background: '#c8a96e', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(200,169,110,0.25)' }}>
          <svg width="20" height="20" viewBox="0 0 13 13" fill="none"><path d="M2.5 10.5L6.5 2.5L10.5 10.5" stroke="#0b0b0d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div style={{ width: 20, height: 20, border: '2px solid rgba(200,169,110,0.2)', borderTopColor: '#c8a96e', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, color: 'rgba(240,237,232,0.9)', margin: '0 0 6px' }}>Signing you in…</p>
        <p style={{ fontSize: 12, color: 'rgba(240,237,232,0.3)', margin: 0 }}>Setting up your workspace</p>
      </div>
    </div>
  );
}