import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, ChevronDown, LogOut, 
  MessageSquare, BarChart2, Moon, Sun 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// FIX: Helper — never show a raw UUID as a display name
function safeDisplayName(name) {
  if (!name) return '';
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name);
  return isUuid ? '' : name;
}

export default function Navbar({ 
  userId, 
  displayName, 
  userEmail, 
  profileLoading = false,
  onMenuToggle,
  showMenuButton = false
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isChat      = location.pathname === '/chat';
  const isAnalytics = location.pathname === '/analytics';

  // Safe name — never expose the UUID
  const safeName   = safeDisplayName(displayName);
  const initials   = safeName ? safeName.charAt(0).toUpperCase() : 'U';
  const headerName = profileLoading ? '...' : (safeName || 'My Account');

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-6 bg-white dark:bg-gray-900 z-50 transition-colors duration-300 flex-shrink-0">
      
      {/* Left Section */}
      <div className="flex items-center gap-3 flex-1">
        {showMenuButton && (
          <button 
            onClick={onMenuToggle}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate(`/chat?user_id=${userId}`)}
        >
          <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white hidden sm:block">
            Lumina AI
          </span>
        </div>
      </div>

      {/* Center — Navigation Tabs */}
      <div className="flex items-center gap-2 flex-1 justify-center">
        <button
          onClick={() => navigate(`/chat?user_id=${userId}`)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            isChat
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm">Chat</span>
        </button>
        
        <button
          onClick={() => navigate(`/analytics?user_id=${userId}`)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            isAnalytics
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span className="text-sm">Analytics</span>
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600" />
          )}
        </button>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1 pl-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
          >
            {/* FIX: Never show UUID — show '...' while loading, 'My Account' as fallback */}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block max-w-[140px] truncate">
              {headerName}
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
              {profileLoading ? '?' : initials}
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 mr-1" />
          </button>

          {isProfileOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsProfileOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 z-50">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {safeName || 'My Account'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {userEmail || 'Managed Services'}
                  </p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setIsProfileOpen(false); navigate('/'); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}