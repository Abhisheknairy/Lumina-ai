import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, MessageSquare, ChevronLeft, ChevronRight, TrendingUp, BarChart2, Clock } from 'lucide-react';
import Navbar from './Navbar';

export default function AppLayout({ 
  userId, 
  displayName, 
  userEmail,
  role = 'user',
  profileLoading = false,
  children,
  onNewChat,
  // FIX: accept real sidebar data from Chat page
  sessionHistory = [],
  sessionsLoading = false,
  activeSessionId = null,
  onLoadSession,
  // Analytics sidebar data
  analyticsData = null,
}) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const isChat      = location.pathname === '/chat';
  const isAnalytics = location.pathname === '/analytics';

  const totalQueries  = analyticsData?.total_queries ?? 0;
  const deflection    = analyticsData?.deflection_rate_percent ?? 0;
  const avgResponseMs = analyticsData?.avg_response_time_ms ?? 0;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      
      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? 'w-64' : 'w-0'
        } bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 relative`}
      >
        <div className="flex flex-col h-full p-4">
          
          {/* ── CHAT SIDEBAR ── */}
          {isChat && (
            <>
              <button
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all shadow-sm hover:shadow-md mb-6"
                onClick={onNewChat}
              >
                <Plus className="w-5 h-5" />
                New Chat
              </button>

              <div className="flex-1 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-2">
                  Recent Conversations
                </p>

                {/* FIX: Show real session history instead of placeholder */}
                {sessionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : sessionHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-600 text-sm">
                    No conversations yet
                  </div>
                ) : (
                  <div className="space-y-1">
                    {(() => {
                      const personal = sessionHistory.filter(s => !s.is_shared);
                      const shared   = sessionHistory.filter(s => s.is_shared);
                      const renderBtn = (session) => (
                        <button
                          key={session.id}
                          onClick={() => onLoadSession?.(session)}
                          className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                            activeSessionId === session.id
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          <MessageSquare className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                            activeSessionId === session.id ? 'text-blue-500' : session.is_shared ? 'text-teal-400 opacity-70' : 'opacity-40'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{session.session_name || 'Untitled Chat'}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                              {session.is_shared ? `Shared · ${session.kb_name || session.folder_name || 'KB'}` : (session.folder_name || 'Drive')}
                            </p>
                          </div>
                        </button>
                      );
                      return (
                        <>
                          {personal.map(renderBtn)}
                          {shared.length > 0 && (
                            <>
                              <div className="pt-3 pb-1 px-2">
                                <p className="text-xs font-semibold text-teal-500 dark:text-teal-400 uppercase tracking-wider">Shared</p>
                              </div>
                              {shared.map(renderBtn)}
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── ANALYTICS SIDEBAR ── */}
          {isAnalytics && (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                    <BarChart2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Analytics</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Performance Insights</p>
                  </div>
                </div>
              </div>

              {/* FIX: Show real data when available, '--' while loading */}
              <div className="flex-1 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-2">
                  Quick Overview
                </p>
                <div className="space-y-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-900">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Queries</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {analyticsData ? totalQueries : '--'}
                    </p>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-100 dark:border-green-900">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Deflection Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {analyticsData ? `${deflection.toFixed(1)}%` : '--'}
                    </p>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 border border-purple-100 dark:border-purple-900">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Avg Response</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {analyticsData
                        ? avgResponseMs >= 1000
                          ? `${(avgResponseMs / 1000).toFixed(1)}s`
                          : `${Math.round(avgResponseMs)}ms`
                        : '--'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    View detailed metrics in the main dashboard →
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar toggle handle */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-r-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm z-10"
          aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {isSidebarOpen ? (
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          userId={userId}
          displayName={displayName}
          userEmail={userEmail}
          role={role}
          profileLoading={profileLoading}
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          showMenuButton={!isSidebarOpen}
        />
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}