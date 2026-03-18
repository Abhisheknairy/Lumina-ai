import React from 'react';
import { ArrowRight, Database, Shield, Zap, Sparkles } from 'lucide-react';

export default function Login() {
  const handleGoogleLogin = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = 'http://localhost:8000/login?user_id=test_user_1';
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-blue-100 selection:text-blue-900">
      
      {/* Top Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Lumina AI</span>
          </div>
          
          {/* Top Right Login Button (As requested) */}
          <button 
            onClick={handleGoogleLogin}
            className="text-sm font-medium text-gray-600 hover:text-black px-4 py-2 rounded-full hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            Sign In <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-16 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4" /> Introducing the ultimate Drive integration
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-gray-900 max-w-4xl mx-auto leading-tight">
          Your Second Brain for <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Google Drive.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
          Instantly chat with your documents, spreadsheets, and PDFs. Find answers, summarize reports, and extract insights without opening a single file.
        </p>
        
        <button 
          onClick={handleGoogleLogin}
          className="bg-black hover:bg-gray-800 text-white text-lg font-medium px-8 py-4 rounded-full transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-3 mx-auto"
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
          Continue with Google
        </button>

        {/* Product Mockup/Graphic */}
        <div className="mt-20 rounded-3xl border border-gray-200/60 bg-gray-50/50 shadow-2xl p-2 md:p-4 max-w-5xl mx-auto overflow-hidden">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm aspect-[16/9] flex items-center justify-center relative overflow-hidden">
            {/* Fake abstract UI representing the app */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50" />
            <div className="relative z-10 flex flex-col gap-4 items-center">
              <Database className="w-16 h-16 text-blue-500 opacity-20" />
              <div className="w-64 h-4 bg-gray-200 rounded-full opacity-50" />
              <div className="w-48 h-4 bg-gray-200 rounded-full opacity-50" />
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}