/**
 * Login.jsx — Firebase Authentication login page
 * Supports Email/Password and Google sign-in.
 */

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, Mail, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AppLogo from '../components/common/AppLogo';

// Map Firebase error codes to friendly messages
function firebaseErrorMsg(code, fallback = 'Sign-in failed. Please try again.') {
  const map = {
    'auth/wrong-password':        'Incorrect password. Please try again.',
    'auth/user-not-found':        'No account found with this email.',
    'auth/invalid-credential':    'Incorrect email or password. Please try again.',
    'auth/invalid-email':         'Please enter a valid email address.',
    'auth/user-disabled':         'This account has been disabled.',
    'auth/expired-action-code':   'This password reset link has expired. Request a new one.',
    'auth/invalid-action-code':   'This password reset link is invalid. Request a new one.',
    'auth/operation-not-allowed': 'Password reset is not enabled. Please contact support.',
    'auth/too-many-requests':     'Too many attempts. Please wait and try again.',
    'auth/network-request-failed':'Network error. Check your connection.',
    'auth/popup-closed-by-user':  'Google sign-in was cancelled.',
    'auth/cancelled-popup-request':'Google sign-in was cancelled.',
  };
  return map[code] || fallback;
}

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || '/dashboard';

  const [form, setForm]           = useState({ email: '', password: '' });
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError]         = useState('');
  const [resetError, setResetError] = useState('');
  const [success, setSuccess]     = useState(false);

  const handleChange = (e) => {
    setError('');
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const openResetModal = () => {
    setResetEmail(form.email.trim());
    setResetError('');
    setResetSent(false);
    setShowResetModal(true);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    const email = resetEmail.trim();
    if (!email) {
      setResetError('Enter your email address to receive a password reset link.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setResetError('Please enter a valid email address.');
      return;
    }

    setResetError('');
    setResetLoading(true);
    try {
      await authService.sendPasswordReset(email);
      setResetSent(true);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setResetSent(true);
      } else {
        setResetError(firebaseErrorMsg(err.code, 'Unable to send the reset email. Please try again.'));
      }
    } finally {
      setResetLoading(false);
    }
  };

  // ── Email / Password login ────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      setSuccess(true);
      setTimeout(() => navigate(from, { replace: true }), 400);
    } catch (err) {
      setError(firebaseErrorMsg(err.code));
    } finally {
      setLoading(false);
    }
  };

  // ── Google login ──────────────────────────────────────────────
  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' &&
          err.code !== 'auth/cancelled-popup-request') {
        setError(firebaseErrorMsg(err.code));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left hero panel (desktop) ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 relative overflow-hidden"
           style={{ background: 'linear-gradient(145deg, #052e16 0%, #14532d 45%, #166534 100%)' }}>
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-green-400/10 rounded-full blur-3xl" />
        <div className="relative z-10"><AppLogo size="md" dark={true} /></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Understand your soil.<br />
            <span className="text-transparent bg-clip-text"
                  style={{ backgroundImage: 'linear-gradient(90deg,#4ade80,#a3e635)' }}>
              Grow smarter.
            </span>
          </h2>
          <p className="text-green-200/70 text-base leading-relaxed">
            Preliminary soil fertility assessment and crop recommendations
            for farmers in Roxas, Oriental Mindoro.
          </p>
        </div>
        {/* Mock result card */}
        <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20
                        p-4 animate-float" style={{ animationDuration: '5s' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/60 text-xs">Latest assessment</span>
            <span className="text-[10px] text-green-300 font-mono">SS-2026-0006</span>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <div className="text-3xl font-black text-white">82</div>
              <div className="text-white/40 text-xs">/100</div>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs
                              font-bold text-white mb-1"
                   style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                🟢 Fertile
              </div>
              <p className="text-white/50 text-xs">Canubing I, Roxas</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 text-xs text-green-300">
            🥇 Best crop: <strong className="text-white">Mango — Kinalabaw</strong>
          </div>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white">
        <div className="lg:hidden mb-8"><AppLogo size="md" /></div>

        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="mb-7">
            <h1 className="text-2xl font-black text-gray-900 mb-1">Welcome back</h1>
            <p className="text-gray-500 text-sm">Sign in to your SoilSense account</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl
                            px-4 py-3 mb-5 text-sm text-red-700 animate-scale-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* ── Google sign-in ─────────────────────────────── */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 mb-4
                       rounded-xl border-2 border-gray-200 bg-white text-gray-700
                       font-semibold text-sm hover:border-gray-300 hover:bg-gray-50
                       hover:-translate-y-px hover:shadow-sm
                       active:translate-y-0 transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <LoadingSpinner size="sm" color="gray" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or sign in with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* ── Email / Password form ───────────────────────── */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="input-label">Email Address</label>
              <input name="email" type="email" autoComplete="email"
                className="input-field" placeholder="you@example.com"
                value={form.email} onChange={handleChange} disabled={loading} />
            </div>
            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <input name="password" type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input-field pr-11" placeholder="Your password"
                  value={form.password} onChange={handleChange} disabled={loading} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-gray-600 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={openResetModal}
                  disabled={loading || googleLoading}
                  className="text-xs font-bold text-green-700 hover:text-green-800 disabled:opacity-50"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || success}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                          font-bold text-white text-sm transition-all duration-200
                          focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2
                          ${success ? 'bg-green-500 scale-[0.98]' : 'btn-primary'}`}>
              {loading  ? <LoadingSpinner size="sm" color="white" /> :
               success  ? <><span className="text-lg">✓</span> Signed in!</> :
               <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center mt-5 text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-green-600 font-bold hover:text-green-700">
              Sign up free
            </Link>
          </p>
          <p className="text-center mt-3">
            <Link to="/" className="text-xs text-gray-400 hover:text-gray-600">← Back to home</Link>
          </p>
        </div>
      </div>

      {showResetModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !resetLoading) setShowResetModal(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-password-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-scale-in"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="reset-password-title" className="text-lg font-black text-gray-900">
                    Reset your password
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Enter your account email and we’ll send you a reset link.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close password reset dialog"
                onClick={() => setShowResetModal(false)}
                disabled={resetLoading}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {resetSent ? (
              <div role="status" className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                  If an account exists for this email, Firebase has sent a password reset link. Check your inbox and spam folder.
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} noValidate>
                <label htmlFor="reset-email" className="input-label">Email Address</label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  className="input-field"
                  placeholder="you@example.com"
                  value={resetEmail}
                  onChange={(e) => {
                    setResetEmail(e.target.value);
                    setResetError('');
                  }}
                  disabled={resetLoading}
                />

                {resetError && (
                  <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {resetError}
                  </div>
                )}

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    disabled={resetLoading}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex min-w-36 items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-60"
                  >
                    {resetLoading ? <LoadingSpinner size="sm" color="white" /> : 'Send reset link'}
                  </button>
                </div>
              </form>
            )}

            {resetSent && (
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-800"
                >
                  Done
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
