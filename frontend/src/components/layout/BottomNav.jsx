/**
 * BottomNav.jsx — Mobile-first bottom tab bar with center FAB.
 * Shown below `lg` only; the sidebar remains the full navigation on desktop
 * and stays reachable via the navbar hamburger for secondary/admin links.
 */

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, PlusCircle, ClipboardList, Map, FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const HISTORY_BY_ROLE = {
  farmer: '/history',
  extension_worker: '/assessments',
  admin: '/assessments',
};

const TABS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: 'history',    icon: ClipboardList,   label: 'History' },
  { to: null,         icon: PlusCircle,      label: 'New Assessment', fab: true },
  { to: '/map',       icon: Map,             label: 'Map' },
  { to: '/reports',   icon: FileText,        label: 'Reports' },
];

export default function BottomNav() {
  const { user } = useAuth();
  const historyTo = HISTORY_BY_ROLE[user?.role] || '/history';

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 lg:hidden
                 bg-cream-card/92 backdrop-blur-md border-t border-cream-border/80"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <div className="grid grid-cols-5 items-end max-w-lg mx-auto">
        {TABS.map(({ to, icon: Icon, label, fab }) => {
          if (fab) {
            return (
              <div key="fab" className="flex justify-center relative">
                <NavLink
                  to="/assess/new"
                  aria-label={label}
                  className="-mt-6 w-14 h-14 rounded-2xl flex items-center justify-center
                             text-white shadow-glow-green active:scale-95
                             transition-transform duration-150
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2"
                  style={{ background: 'linear-gradient(135deg, #3c5226 0%, #2f4520 100%)' }}
                >
                  <Icon className="w-6 h-6" />
                </NavLink>
              </div>
            );
          }
          const target = to === 'history' ? historyTo : to;
          return (
            <NavLink
              key={to}
              to={target}
              className={({ isActive }) => `
                flex flex-col items-center gap-0.5 py-2.5
                text-[10px] font-semibold
                focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-400
                ${isActive ? 'text-green-600' : 'text-ink-faint active:text-ink-soft'}
                transition-colors duration-150
              `}
            >
              {({ isActive }) => (
                <>
                  <div className={`w-8 h-7 rounded-lg flex items-center justify-center
                                  ${isActive ? 'bg-green-50' : ''}`}>
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 2} />
                  </div>
                  {label}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
