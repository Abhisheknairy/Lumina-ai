import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, MessageSquare, ChevronLeft, ChevronRight, TrendingUp, BarChart2, Clock } from 'lucide-react';
import Navbar from './Navbar';

export default function AppLayout({ 
  userId, 
  displayName, 
  userEmail, 
  children,
  onNewChat
}) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const isChat = location.pathname === '/chat';
  const isAnalytics = location.pathname === '/analytics';

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      
      {/* Sidebar - Always visible, different content based on page */}
      <div
        className={`${
          isSidebarOpen ? 'w-64' : 'w-0'
        } bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 relative`}
      >
        <div className="flex flex-col h-full p-4">
          
          {/* Chat Page Content */}
          {isChat && (
            <>
              {/* New Chat Button */}
              <button
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all shadow-sm hover:shadow-md mb-6"
                onClick={onNewChat}
              >
                <Plus className="w-5 h-5" />
                New Chat
              </button>

              {/* Chat History Section */}
              <div className="flex-1 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-2">
                  Recent Conversations
                </p>
                <div className="space-y-1">
                  {/* Placeholder for conversation history */}
                  <div className="text-center py-8 text-gray-400 dark:text-gray-600 text-sm">
                    No conversations yet
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Analytics Page Content */}
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

              {/* Quick Stats */}
              <div className="flex-1 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-2">
                  Quick Overview
                </p>
                
                <div className="space-y-3">
                  {/* Quick stat cards */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-900">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Queries</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">--</p>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-100 dark:border-green-900">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Deflection Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">--</p>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 border border-purple-100 dark:border-purple-900">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Avg Response</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">--</p>
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

        {/* Toggle Button - positioned at the edge */}
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
        {/* Navbar with Chat/Analytics tabs in center */}
        <Navbar
          userId={userId}
          displayName={displayName}
          userEmail={userEmail}
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          showMenuButton={!isSidebarOpen}
        />

        {/* Page Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}