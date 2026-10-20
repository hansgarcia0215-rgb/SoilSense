/**
 * AppLayout.jsx — Main app shell with page transition animations
 */

import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

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
    <div className="flex h-screen overflow-hidden bg-slate-50">
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
            background: 'radial-gradient(ellipse at 0% 0%, rgba(34,197,94,0.04) 0px, transparent 60%), radial-gradient(ellipse at 100% 100%, rgba(21,128,61,0.03) 0px, transparent 60%), #f8fafc',
          }}
        >
          <div
            className="px-4 md:px-6 py-5 animate-fade-in-up"
            style={{ animationFillMode: 'both' }}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
