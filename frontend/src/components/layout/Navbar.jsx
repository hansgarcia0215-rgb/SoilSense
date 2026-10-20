/**
 * Navbar.jsx — Production-quality glass navbar with animations
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Bell, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppLogo from '../common/AppLogo';

const ROLE_LABELS = {
  farmer:           'Farmer',
  extension_worker: 'Extension Worker',
  researcher:       'Researcher',
  admin:            'Administrator',
};

const ROLE_COLORS = {
  farmer:           'from-green-500 to-emerald-600',
  extension_worker: 'from-blue-500 to-blue-600',
  researcher:       'from-purple-500 to-purple-600',
  admin:            'from-rose-500 to-rose-600',
};

export default function Navbar({ onMenuClick, sidebarOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const avatarColor = ROLE_COLORS[user?.role] || ROLE_COLORS.farmer;
  const initials = user?.displayName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <nav
      className={`
        sticky top-0 z-30 px-4 py-3 flex items-center justify-between
        transition-all duration-300
        ${scrolled
          ? 'bg-white/85 backdrop-blur-md border-b border-gray-200/60 shadow-sm'
          : 'bg-white/70 backdrop-blur-sm border-b border-transparent'}
      `}
    >
      {/* ── Left ── */}
      <div className="flex items-center gap-3">
        {/* Animated hamburger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden relative w-9 h-9 flex items-center justify-center rounded-xl
                     hover:bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Toggle menu"
        >
          <div className="w-5 flex flex-col gap-1 transition-all duration-300">
            <span className={`h-0.5 bg-gray-600 rounded-full transition-all duration-300 origin-center
              ${sidebarOpen ? 'rotate-45 translate-y-[5.5px]' : ''}`} />
            <span className={`h-0.5 bg-gray-600 rounded-full transition-all duration-300
              ${sidebarOpen ? 'opacity-0 scale-x-0' : ''}`} />
            <span className={`h-0.5 bg-gray-600 rounded-full transition-all duration-300 origin-center
              ${sidebarOpen ? '-rotate-45 -translate-y-[5.5px]' : ''}`} />
          </div>
        </button>

        {/* Logo */}
        <Link to="/dashboard" className="flex items-center group">
          <AppLogo size="sm" dark={false} />
        </Link>
      </div>

      {/* ── Right ── */}
      <div className="flex items-center gap-1.5">
        {/* Notification bell */}
        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-xl
                     hover:bg-gray-100 active:bg-gray-200 transition-all duration-150 group"
          aria-label="Notifications"
        >
          <Bell className="w-4.5 h-4.5 text-gray-500 group-hover:text-gray-700 transition-colors" />
          {/* Pulse dot */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-green-500
                           ring-2 ring-white animate-ping-slow" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-green-500 ring-2 ring-white" />
        </button>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl
                       hover:bg-gray-100 active:bg-gray-200
                       transition-all duration-150 group"
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${avatarColor}
                            flex items-center justify-center shadow-sm
                            group-hover:shadow-md group-hover:scale-105
                            transition-all duration-200`}>
              <span className="text-white font-bold text-xs">{initials}</span>
            </div>
            {/* Name */}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                {user?.displayName?.split(' ')[0] || 'User'}
              </p>
              <p className="text-[10px] text-gray-400 leading-tight font-medium">
                {ROLE_LABELS[user?.role] || '—'}
              </p>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 hidden sm:block transition-transform duration-200
                         ${showUserMenu ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-white/95 backdrop-blur-md
                              rounded-2xl shadow-card-lg border border-gray-100/80 py-1.5 z-20
                              animate-slide-down origin-top-right">
                {/* User info */}
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColor}
                                    flex items-center justify-center shadow-sm flex-shrink-0`}>
                      <span className="text-white font-bold text-xs">{initials}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user?.displayName}</p>
                      <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                    </div>
                  </div>
                  {user?.barangay && (
                    <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                      {user.barangay}, Roxas, Oriental Mindoro
                    </p>
                  )}
                </div>

                <Link
                  to="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700
                             hover:bg-gray-50 hover:text-gray-900 transition-colors mx-1 rounded-xl"
                >
                  <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Settings className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  Settings
                </Link>

                <div className="mx-1 my-1 border-t border-gray-100" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600
                             hover:bg-red-50 transition-colors mx-1 rounded-xl"
                  style={{ width: 'calc(100% - 8px)' }}
                >
                  <div className="w-6 h-6 bg-red-50 rounded-lg flex items-center justify-center">
                    <LogOut className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
