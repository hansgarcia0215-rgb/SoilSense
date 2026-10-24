/**
 * Sidebar.jsx — Dark theme sidebar with gradient accents and animations
 */

import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PlusCircle, ClipboardList, Map,
  FileText, BarChart2, FlaskConical, Leaf, Settings,
  LogOut, X, Users, Sliders
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppLogo from '../common/AppLogo';

const FARMER_LINKS = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/assess/new', icon: PlusCircle,       label: 'New Assessment', cta: true },
  { to: '/history',    icon: ClipboardList,    label: 'My Assessments' },
  { to: '/map',        icon: Map,              label: 'Map View' },
  { to: '/reports',    icon: FileText,         label: 'Reports' },
];
const EXTENSION_LINKS = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/assess/new',  icon: PlusCircle,      label: 'New Assessment', cta: true },
  { to: '/assessments', icon: ClipboardList,   label: 'All Assessments' },
  { to: '/lab',         icon: FlaskConical,    label: 'Lab Validation' },
  { to: '/map',         icon: Map,             label: 'Map View' },
  { to: '/reports',     icon: FileText,        label: 'Reports' },
];
const ADMIN_LINKS = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/assess/new',  icon: PlusCircle,      label: 'New Assessment', cta: true },
  { to: '/assessments', icon: ClipboardList,   label: 'All Assessments' },
  { to: '/analytics',   icon: BarChart2,       label: 'Analytics' },
  { to: '/map',         icon: Map,             label: 'Map View' },
  { to: '/reports',     icon: FileText,        label: 'Reports' },
  { to: '/admin/crops', icon: Leaf,            label: 'Manage Crops', divider: true },
  { to: '/admin/rules', icon: Sliders,         label: 'Fuzzy Rules' },
  { to: '/admin/users', icon: Users,           label: 'Manage Users' },
];
const ROLE_LINKS = {
  farmer: FARMER_LINKS, extension_worker: EXTENSION_LINKS,
  admin: ADMIN_LINKS,
};

const ROLE_LABELS = {
  farmer: 'Farmer', extension_worker: 'Extension Worker',
  admin: 'System Administrator',
};

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = ROLE_LINKS[user?.role] || FARMER_LINKS;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden
                     animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64
          bg-bark text-cream
          z-30 flex flex-col
          transition-transform duration-300 ease-spring
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        `}
      >
        {/* Top accent line */}
        <div className="h-0.5 bg-gradient-to-r from-green-500 via-emerald-400 to-green-600 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bark-border">
          <AppLogo size="sm" dark={true} />
          <button
            onClick={onClose}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg
                       text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto scrollbar-hide">
          {/* CTA button first */}
          <NavLink
            to="/assess/new"
            onClick={onClose}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-4 font-bold text-sm
                       text-white transition-all duration-200 group relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #3c5226 0%, #2f4520 100%)' }}
          >
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
            <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <PlusCircle className="w-4 h-4" />
            </div>
            <span>New Assessment</span>
            <div className="ml-auto w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold">+</span>
            </div>
          </NavLink>

          <ul className="space-y-0.5">
            {links
              .filter(l => l.to !== '/assess/new')
              .map(({ to, icon: Icon, label, divider }, i) => (
                <li key={to}>
                  {divider && (
                    <div className="my-2 pt-2 border-t border-bark-border">
                      <p className="text-[9px] text-cream/40 font-bold uppercase tracking-widest px-3 pb-1">
                        Admin
                      </p>
                    </div>
                  )}
                  <NavLink
                    to={to}
                    onClick={onClose}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                      transition-all duration-150 group relative
                      ${isActive
                        ? 'bg-green-600/20 text-green-300'
                        : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
                      }
                    `}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active indicator */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5
                                          bg-green-300 rounded-full" />
                        )}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center
                                        flex-shrink-0 transition-all duration-150
                                        ${isActive
                                          ? 'bg-green-500/20'
                                          : 'bg-white/5 group-hover:bg-white/10'}`}>
                          <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-green-300' : 'text-gray-400 group-hover:text-gray-200'}`} />
                        </div>
                        <span>{label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))
            }
          </ul>

          <div className="mt-2 pt-2 border-t border-bark-border space-y-0.5">
            <NavLink
              to="/settings"
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-150 group
                ${isActive ? 'bg-green-600/20 text-green-300' : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'}
              `}
            >
              {({ isActive }) => (
                <>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center
                                  ${isActive ? 'bg-green-500/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                    <Settings className="w-3.5 h-3.5" />
                  </div>
                  Settings
                </>
              )}
            </NavLink>
          </div>
        </nav>

        {/* User footer */}
        <div className="px-3 pb-4 border-t border-bark-border pt-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors mb-2">
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600
                              flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {user?.displayName?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-300 rounded-full
                              border-2 border-bark" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-100 truncate">{user?.displayName}</p>
              <p className="text-[11px] text-gray-500 truncate">{ROLE_LABELS[user?.role] || '—'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm
                       font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/10
                       transition-all duration-150 group"
          >
            <div className="w-7 h-7 bg-white/5 group-hover:bg-red-500/20 rounded-lg
                            flex items-center justify-center transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </div>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
