import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, ChevronDown, LogOut,
  MessageSquare, BarChart2, Moon, Sun,
  ShieldCheck, Users
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

function safeDisplayName(name) {
  if (!name) return '';
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name);
  return isUuid ? '' : name;
}

function nameFromEmail(email) {
  if (!email) return '';
  const local = email.split('@')[0];
  const parts = local.replace(/_/g, '.').split('.');
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function getInitials(name, email) {
  const safeName = safeDisplayName(name);
  if (safeName) {
    const words = safeName.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    return words[0][0].toUpperCase();
  }
  if (email) {
    const derived = nameFromEmail(email);
    const words   = derived.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    if (words[0]) return words[0][0].toUpperCase();
  }
  return '?';
}

// Super admin email — must match SUPER_ADMIN_EMAIL in models.py
const SUPER_ADMIN_EMAIL = 'n.abhishek@isteer.com';

export default function Navbar({
  userId, displayName, userEmail, role,
  profileLoading = false, onMenuToggle, showMenuButton = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isChat         = location.pathname === '/chat';
  const isAnalytics    = location.pathname === '/analytics';
  const isAdmin        = location.pathname === '/admin';
  const isCollab       = location.pathname === '/collaboration';

  const safeName     = safeDisplayName(displayName);
  const resolvedName = safeName || nameFromEmail(userEmail);
  const initials     = profileLoading ? '?' : getInitials(displayName, userEmail);
  const headerName   = profileLoading ? '...' : (resolvedName || 'My Account');

  // Show super admin tab only for the designated email
  const isSuperAdmin = role === 'super_admin' || userEmail === SUPER_ADMIN_EMAIL;
  // Show collaboration tab for admins and super admins
  const isAdminOrAbove = role === 'super_admin' || role === 'admin';

  const NAV_TABS = [
    { id: 'chat',          label: 'Chat',          icon: MessageSquare, path: `/chat?user_id=${userId}`,          active: isChat    },
    { id: 'analytics',     label: 'Analytics',     icon: BarChart2,     path: `/analytics?user_id=${userId}`,     active: isAnalytics },
    ...(isAdminOrAbove ? [
      { id: 'collab',      label: 'Collaboration', icon: Users,         path: `/collaboration?user_id=${userId}`, active: isCollab  },
    ] : []),
    ...(isSuperAdmin ? [
      { id: 'admin',       label: 'Admin',         icon: ShieldCheck,   path: `/admin?user_id=${userId}`,         active: isAdmin,
        className: 'text-purple-600 dark:text-purple-400' },
    ] : []),
  ];

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-6 bg-white dark:bg-gray-900 z-50 transition-colors duration-300 flex-shrink-0">

      {/* Left — Brand */}
      <div className="flex items-center gap-3 flex-1">
        {showMenuButton && (
          <button onClick={onMenuToggle}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/chat?user_id=${userId}`)}>
          <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white hidden sm:block">Lumina AI</span>
        </div>
      </div>

      {/* Center — Nav Tabs */}
      <div className="flex items-center gap-1 flex-1 justify-center">
        {NAV_TABS.map(tab => (
          <button key={tab.id} onClick={() => navigate(tab.path)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm ${
              tab.active
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : `text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 ${tab.className || ''}`
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'admin' && (
              <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />
            )}
          </button>
        ))}
      </div>

      {/* Right — Theme + Profile */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        <button onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
        </button>
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

        <div className="relative">
          <button onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1 pl-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block max-w-[140px] truncate">
              {headerName}
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
              {initials}
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 mr-1" />
          </button>

          {isProfileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 z-50">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{resolvedName || 'My Account'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{userEmail || 'Managed Services'}</p>
                  {isSuperAdmin && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-xs bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">
                      <ShieldCheck className="w-3 h-3" /> Super Admin
                    </span>
                  )}
                </div>
                <div className="py-1">
                  <button onClick={() => { setIsProfileOpen(false); navigate('/'); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium">
                    <LogOut className="w-4 h-4" /> Sign out
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