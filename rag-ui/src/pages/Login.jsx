import React from 'react';
import { ArrowRight, Sparkles, MessageSquare, Files, Zap, Brain, CheckCircle2, Search, Clock, Shield, FileText, Folder, Moon, Sun } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const { isDark, toggleTheme } = useTheme();
  
  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:8000/login?user_id=test_user_1';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 selection:bg-blue-100 dark:selection:bg-blue-900 selection:text-blue-900 dark:selection:text-blue-100 relative overflow-hidden transition-colors duration-300">
      
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 -right-40 w-96 h-96 bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:64px_64px]"></div>
        
        {/* Floating Document Icons */}
        <div className="absolute top-20 left-[15%] opacity-5 dark:opacity-[0.03]">
          <FileText className="w-32 h-32 text-blue-600 dark:text-blue-400 transform rotate-12" />
        </div>
        <div className="absolute top-60 right-[10%] opacity-5 dark:opacity-[0.03]">
          <Folder className="w-40 h-40 text-purple-600 dark:text-purple-400 transform -rotate-12" />
        </div>
        <div className="absolute bottom-40 left-[20%] opacity-5 dark:opacity-[0.03]">
          <Files className="w-36 h-36 text-indigo-600 dark:text-indigo-400 transform rotate-6" />
        </div>
        
        {/* Google Drive Logo Shape - Large */}
        <div className="absolute top-1/2 right-[5%] opacity-[0.04] dark:opacity-[0.025] transform -translate-y-1/2">
          <svg width="320" height="320" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg" className="text-blue-600 dark:text-blue-400">
            <path fill="currentColor" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"/>
            <path fill="currentColor" opacity="0.6" d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"/>
            <path fill="currentColor" opacity="0.8" d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"/>
            <path fill="currentColor" d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"/>
            <path fill="currentColor" opacity="0.4" d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"/>
          </svg>
        </div>
        
        {/* Google Drive Logo - Smaller Top Left */}
        <div className="absolute top-[20%] left-[8%] opacity-[0.035] dark:opacity-[0.02] transform rotate-12">
          <svg width="180" height="180" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg" className="text-green-600 dark:text-green-500">
            <path fill="currentColor" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"/>
            <path fill="currentColor" opacity="0.6" d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"/>
            <path fill="currentColor" opacity="0.8" d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"/>
            <path fill="currentColor" d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"/>
            <path fill="currentColor" opacity="0.4" d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"/>
          </svg>
        </div>
        
        {/* Google Drive Logo - Bottom Center */}
        <div className="absolute bottom-[15%] left-[45%] opacity-[0.03] dark:opacity-[0.015] transform -rotate-6">
          <svg width="200" height="200" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg" className="text-purple-600 dark:text-purple-500">
            <path fill="currentColor" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"/>
            <path fill="currentColor" opacity="0.6" d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"/>
            <path fill="currentColor" opacity="0.8" d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"/>
            <path fill="currentColor" d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"/>
            <path fill="currentColor" opacity="0.4" d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"/>
          </svg>
        </div>
        
        {/* Additional Floating Sheets/Docs Icons */}
        <div className="absolute top-[45%] left-[5%] opacity-[0.04] dark:opacity-[0.02]">
          <FileText className="w-28 h-28 text-yellow-600 dark:text-yellow-500 transform -rotate-6" />
        </div>
        <div className="absolute bottom-[25%] right-[15%] opacity-[0.04] dark:opacity-[0.02]">
          <Folder className="w-32 h-32 text-red-600 dark:text-red-500 transform rotate-15" />
        </div>
      </div>
      
      {/* Sticky Navigation */}
      <nav className="sticky top-0 w-full bg-white/90 dark:bg-gray-950/90 backdrop-blur-md z-50 border-b border-gray-100 dark:border-gray-800 relative transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white dark:text-black" />
            </div>
            <span className="text-xl font-bold tracking-tight">Lumina AI</span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>
            
            {/* Divider */}
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
            
            <button 
              onClick={handleGoogleLogin}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white px-4 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              Sign In <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-20 pb-32 px-6 relative">
        {/* Hero Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 via-purple-50/30 to-transparent dark:from-blue-950/30 dark:via-purple-950/20 dark:to-transparent pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto relative">
          
          {/* Hero Content */}
          <div className="text-center max-w-4xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-sm font-medium mb-8 border border-blue-100 dark:border-blue-900">
              <Sparkles className="w-4 h-4" /> Trusted by teams at fast-growing companies
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
              Stop Searching Files.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-400">Start Asking Questions.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed">
              Turn your Google Drive into an AI assistant that answers questions, summarizes documents, and finds insights—instantly.
            </p>
            
            <button 
              onClick={handleGoogleLogin}
              className="bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-black text-lg font-semibold px-8 py-4 rounded-full transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-3 mx-auto group"
            >
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
                alt="Google" 
                className="w-5 h-5 bg-white rounded-full p-0.5" 
              />
              Connect Your Drive — It's Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">No credit card required • Set up in under 60 seconds</p>
          </div>

          {/* Product Preview */}
          <ScrollReveal>
            <div className="mt-16 rounded-3xl border border-gray-200/60 dark:border-gray-800 bg-gradient-to-br from-blue-50 via-purple-50/50 to-indigo-50 dark:from-blue-950/30 dark:via-purple-950/20 dark:to-indigo-950/30 shadow-2xl p-3 md:p-6 max-w-5xl mx-auto overflow-hidden relative">
              {/* Mesh Pattern Overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.8),transparent_70%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.4),transparent_70%)] pointer-events-none"></div>
              
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden relative">
                {/* Browser-like header */}
                <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="flex-1 text-center text-xs text-gray-500 dark:text-gray-400 font-medium">lumina-ai.com</div>
                </div>
                
                {/* Chat Interface Preview */}
                <div className="p-8 min-h-[400px] bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 flex flex-col justify-center gap-6">
                  
                  {/* User Question */}
                  <div className="flex justify-end">
                    <div className="bg-blue-600 dark:bg-blue-500 text-white px-5 py-3 rounded-2xl rounded-tr-md max-w-md shadow-sm">
                      <p className="text-sm font-medium">What are the key points from my Q3 report?</p>
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-5 py-4 rounded-2xl rounded-tl-md max-w-lg shadow-sm">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-500 dark:from-blue-500 dark:to-indigo-400 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-2">
                            Based on your Q3 report, here are the key highlights:
                          </p>
                          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                              <span>Revenue increased 23% YoY to $4.2M</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                              <span>Customer retention improved to 94%</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                              <span>Launched 3 new product features</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
                        Source: Q3_Business_Report.pdf
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </ScrollReveal>

        </div>
      </main>

      {/* Features Section */}
      <section className="py-32 px-6 bg-gray-50 dark:bg-gray-900/50 relative overflow-hidden transition-colors duration-300">
        {/* Decorative Shapes */}
        <div className="absolute top-10 right-10 w-72 h-72 bg-blue-200/30 dark:bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-purple-200/30 dark:bg-purple-500/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto relative">
          
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Everything you need to work smarter,<br />not harder
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mt-4">
                Transform how you interact with your documents. No more digging through folders or opening dozens of files.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            <ScrollReveal delay={100}>
              <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 hover:shadow-lg dark:hover:shadow-blue-900/20 transition-shadow">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center mb-5">
                  <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">Ask in Plain English</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  No complex queries or syntax. Just ask naturally and get precise answers from across your entire Drive.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 hover:shadow-lg dark:hover:shadow-purple-900/20 transition-shadow">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-950 rounded-xl flex items-center justify-center mb-5">
                  <Files className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">Works Across All Files</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  PDFs, Docs, Sheets, Slides—search through everything at once. Your entire Drive becomes instantly queryable.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 hover:shadow-lg dark:hover:shadow-green-900/20 transition-shadow">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-950 rounded-xl flex items-center justify-center mb-5">
                  <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">Instant Summaries</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Get the key points from 50-page reports in seconds. Extract insights without reading entire documents.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={400}>
              <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 hover:shadow-lg dark:hover:shadow-orange-900/20 transition-shadow">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950 rounded-xl flex items-center justify-center mb-5">
                  <Brain className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">Context-Aware AI</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Understands your documents deeply. Gets nuance, follows references, and provides accurate, sourced answers.
                </p>
              </div>
            </ScrollReveal>

          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-32 px-6 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-50/30 to-transparent dark:via-blue-950/20 pointer-events-none"></div>
        
        <div className="max-w-6xl mx-auto relative">
          
          <ScrollReveal>
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                From connection to answers<br />in under 60 seconds
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-4">
                No training required. No complex setup. Just three clicks to unlock your entire Drive.
              </p>
            </div>
          </ScrollReveal>

          <div className="relative">
            
            {/* Vertical Timeline for Desktop */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-600 via-purple-600 to-green-600 dark:from-blue-500 dark:via-purple-500 dark:to-green-500 transform -translate-x-1/2"></div>
            
            <div className="space-y-20">
              
              {/* Step 1 - Left Side */}
              <ScrollReveal delay={100}>
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="md:text-right md:pr-16">
                    <div className="inline-block md:hidden w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg mb-4">
                      1
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-4">Secure one-click connection</h3>
                    <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                      Authorize with Google OAuth in seconds. We only request read-only access—your files stay private and secure.
                    </p>
                  </div>
                  
                  {/* Center Circle - Desktop Only */}
                  <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-2xl items-center justify-center text-xl font-bold shadow-xl z-10">
                    1
                  </div>
                  
                  <div className="md:pl-16">
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-6 rounded-2xl border-2 border-blue-200 dark:border-blue-900">
                      <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                        <Shield className="w-8 h-8" />
                        <span className="font-semibold">Enterprise-grade security</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Step 2 - Right Side */}
              <ScrollReveal delay={200}>
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="md:pr-16 order-2 md:order-1">
                    <div className="bg-purple-50 dark:bg-purple-950/30 p-6 rounded-2xl border-2 border-purple-200 dark:border-purple-900">
                      <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
                        <MessageSquare className="w-8 h-8" />
                        <span className="font-semibold">Conversational interface</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Center Circle - Desktop Only */}
                  <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-500 text-white rounded-2xl items-center justify-center text-xl font-bold shadow-xl z-10">
                    2
                  </div>
                  
                  <div className="md:pl-16 order-1 md:order-2">
                    <div className="inline-block md:hidden w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-500 text-white rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg mb-4">
                      2
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-4">Ask anything in plain English</h3>
                    <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                      No special syntax or commands. Just type your question naturally—our AI understands context and intent.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Step 3 - Left Side */}
              <ScrollReveal delay={300}>
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="md:text-right md:pr-16">
                    <div className="inline-block md:hidden w-14 h-14 bg-gradient-to-br from-green-600 to-green-500 text-white rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg mb-4">
                      3
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-4">Get sourced answers instantly</h3>
                    <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                      Receive accurate answers with direct citations to source documents. Know exactly where the information came from.
                    </p>
                  </div>
                  
                  {/* Center Circle - Desktop Only */}
                  <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 w-14 h-14 bg-gradient-to-br from-green-600 to-green-500 text-white rounded-2xl items-center justify-center text-xl font-bold shadow-xl z-10">
                    3
                  </div>
                  
                  <div className="md:pl-16">
                    <div className="bg-green-50 dark:bg-green-950/30 p-6 rounded-2xl border-2 border-green-200 dark:border-green-900">
                      <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
                        <Zap className="w-8 h-8" />
                        <span className="font-semibold">Sub-second response time</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

            </div>
          </div>
        </div>
      </section>

      {/* Why This Matters Section */}
      <section className="py-32 px-6 bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-950 dark:to-gray-900 text-white relative overflow-hidden transition-colors duration-300">
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none"></div>
        
        {/* Gradient Overlays */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/10 dark:bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-600/10 dark:bg-purple-500/5 rounded-full blur-3xl"></div>
        
        <div className="max-w-5xl mx-auto relative">
          
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Your team wastes 2.5 hours per day<br />searching for information
              </h2>
              <p className="text-xl text-gray-300 dark:text-gray-400 max-w-3xl mx-auto">
                Stop the endless file hunting. Get back to work that actually matters.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            
            <ScrollReveal delay={100}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-500/20 dark:bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Search className="w-5 h-5 text-blue-400 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-lg text-gray-300 dark:text-gray-400">
                    No more opening 10+ files to find one data point
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-500/20 dark:bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-purple-400 dark:text-purple-300" />
                </div>
                <div>
                  <p className="text-lg text-gray-300 dark:text-gray-400">
                    No more reading entire documents to extract key insights
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-500/20 dark:bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-green-400 dark:text-green-300" />
                </div>
                <div>
                  <p className="text-lg text-gray-300 dark:text-gray-400">
                    No more asking colleagues "where did we put that file?"
                  </p>
                </div>
              </div>
            </ScrollReveal>

          </div>

          <ScrollReveal delay={400}>
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 dark:from-blue-300 dark:to-purple-300">
                Focus on decisions, not document hunting.
              </p>
            </div>
          </ScrollReveal>

        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-32 px-6 relative overflow-hidden">
        {/* Soft Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-50/20 to-transparent dark:via-purple-950/10 pointer-events-none"></div>
        
        <div className="max-w-6xl mx-auto relative">
          
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Trusted by knowledge workers at<br />leading organizations
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mt-4">
                From startups to enterprises, teams use Lumina AI to work smarter with their documents.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-4 gap-6">
            
            <ScrollReveal delay={100}>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 p-8 rounded-2xl text-center border border-blue-200/50 dark:border-blue-900/50">
                <div className="text-4xl mb-3">🚀</div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Growth Teams</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Analyze reports faster</p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 p-8 rounded-2xl text-center border border-purple-200/50 dark:border-purple-900/50">
                <div className="text-4xl mb-3">📊</div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Data Analysts</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Find insights instantly</p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <div className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 p-8 rounded-2xl text-center border border-green-200/50 dark:border-green-900/50">
                <div className="text-4xl mb-3">⚖️</div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Legal & Compliance</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Search case files quickly</p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={400}>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 p-8 rounded-2xl text-center border border-orange-200/50 dark:border-orange-900/50">
                <div className="text-4xl mb-3">👥</div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Product Teams</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Reference docs easily</p>
              </div>
            </ScrollReveal>

          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 px-6 bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 text-white relative overflow-hidden transition-colors duration-300">
        {/* Animated Dots Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
        
        {/* Floating Shapes */}
        <div className="absolute top-10 left-10 w-64 h-64 bg-white/5 rounded-full blur-2xl"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
        
        <div className="max-w-4xl mx-auto text-center relative">
          
          <ScrollReveal>
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to stop searching<br />and start finding?
              </h2>
              <p className="text-xl text-blue-100 dark:text-blue-200 mb-10 max-w-2xl mx-auto">
                Join thousands of professionals who've already transformed how they work with documents.
              </p>
              
              <button 
                onClick={handleGoogleLogin}
                className="bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 text-lg font-semibold px-8 py-4 rounded-full transition-all shadow-lg hover:shadow-2xl hover:-translate-y-0.5 flex items-center gap-3 mx-auto group"
              >
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
                  alt="Google" 
                  className="w-5 h-5" 
                />
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <p className="text-sm text-blue-200 dark:text-blue-300 mt-6 flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" />
                SOC 2 compliant • No credit card required • Cancel anytime
              </p>
            </div>
          </ScrollReveal>

        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white dark:text-black" />
              </div>
              <span className="text-lg font-bold">Lumina AI</span>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © 2024 Lumina AI. Making knowledge work effortless.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}