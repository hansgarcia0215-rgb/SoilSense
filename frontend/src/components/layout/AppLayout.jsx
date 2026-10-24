/**
 * AppLayout.jsx — Main app shell with page transition animations
 */

import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageKey, setPageKey] = useState(0);
  const location = useLocation();

  // Trigger page transition on route change
  useEffect(() => {
    setPageKey(k => k + 1);
    setSidebarOpen(false); // close sidebar on nav
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar */}
        <Navbar
          onMenuClick={() => setSidebarOpen(s => !s)}
          sidebarOpen={sidebarOpen}
        />

        {/* Page — fade-in-up on each route change */}
        <main
          key={pageKey}
          className="flex-1 overflow-y-auto"
          style={{
            background: 'radial-gradient(ellipse at 0% 0%, rgba(226,207,164,0.3) 0px, transparent 60%), radial-gradient(ellipse at 100% 100%, rgba(227,234,210,0.35) 0px, transparent 60%), #f7f1e5',
          }}
        >
          <div
            className="px-4 md:px-6 py-5 pb-28 lg:pb-5 animate-fade-in-up"
            style={{ animationFillMode: 'both' }}
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar (below lg only) */}
      <BottomNav />
    </div>
  );
}
