/**
 * App.jsx — Root component and route definitions
 *
 * All phases are now implemented. Routes point to real page components.
 * Admin-only pages (manage crops, fuzzy rules) use PlaceholderPage
 * until a dedicated admin UI is built (out of scope for prototype).
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Auth
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute   from './components/common/ProtectedRoute';
import AppLayout        from './components/layout/AppLayout';

// PWA
import InstallPrompt from './components/common/InstallPrompt';
import UpdatePrompt  from './components/common/UpdatePrompt';

// Public pages
import Landing      from './pages/Landing';
import Login        from './pages/Login';
import Register     from './pages/Register';
import Unauthorized from './pages/Unauthorized';
import PlaceholderPage from './pages/PlaceholderPage';

// Protected pages
import Dashboard         from './pages/Dashboard';
import NewAssessment     from './pages/NewAssessment';
import AssessmentResult  from './pages/AssessmentResult';
import AssessmentHistory from './pages/AssessmentHistory';
import MapView           from './pages/MapView';
import Settings          from './pages/Settings';
import LabValidation     from './pages/LabValidation';
import ResearchAnalytics from './pages/ResearchAnalytics';
import ManageCrops       from './pages/ManageCrops';
import ManageFuzzyRules  from './pages/ManageFuzzyRules';
import ManageUsers       from './pages/ManageUsers';
import Reports           from './pages/Reports';

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition:   true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <Routes>

          {/* ─── Public Routes ─────────────────────────── */}
          <Route path="/"            element={<Landing />} />
          <Route path="/login"       element={<Login />} />
          <Route path="/register"    element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* ─── Protected Routes (any authenticated user) ── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>

              <Route path="/dashboard"           element={<Dashboard />} />
              <Route path="/assess/new"          element={<NewAssessment />} />
              <Route path="/assessments/:id"     element={<AssessmentResult />} />
              <Route path="/history"             element={<AssessmentHistory />} />
              <Route path="/map"                 element={<MapView />} />
              <Route path="/settings"            element={<Settings />} />

              <Route path="/reports" element={<Reports />} />

            </Route>
          </Route>

          {/* ─── Extension Worker + Admin ──────────────── */}
          <Route element={<ProtectedRoute roles={['extension_worker', 'admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/assessments"  element={<AssessmentHistory />} />
              <Route path="/lab"          element={<LabValidation />} />
            </Route>
          </Route>

          {/* ─── System Administrator Only ───────────────── */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/analytics"    element={<ResearchAnalytics />} />
              <Route path="/admin/crops"  element={<ManageCrops />} />
              <Route path="/admin/rules"  element={<ManageFuzzyRules />} />
              <Route path="/admin/users"  element={<ManageUsers />} />
            </Route>
          </Route>

          {/* ─── Fallback ──────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>

        {/* Global toast notification system */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#f9fafb',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />

        {/* PWA: update notification + install prompt */}
        <UpdatePrompt />
        <InstallPrompt />
      </AuthProvider>
    </BrowserRouter>
  );
}
