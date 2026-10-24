/**
 * Login.jsx — Production sign-in page with animated split layout
 */

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AppLogo from '../components/common/AppLogo';

const DEMO_ACCOUNTS = [
  { label: 'Farmer',               email: 'farmer@soilsense.demo', color: 'bg-green-100 text-green-700  border-green-200' },
  { label: 'System Administrator', email: 'admin@soilsense.demo',  color: 'bg-[#f5e0da] text-[#7f2d20] border-[#e2c4b8]' },
];

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const from       = location.state?.from?.pathname || '/dashboard';

  const [form, setForm]               = useState({ email: '', password: '' });
  const [showPw, setShowPw]           = useState(false);
  const [loading, setLoading]         = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);

  const handleChange = e => {
    setError('');
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const mapFirebaseError = (code) => {
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password. Please try again.';
      case 'auth/user-disabled':
        return 'Your account has been disabled.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait and try again.';
      case 'auth/popup-closed-by-user':
        return '';
      default:
        return null;
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    try {
      await login(form.email, form.password);
      setSuccess(true);
      setTimeout(() => navigate(from, { replace: true }), 400);
    } catch (err) {
      const mapped = mapFirebaseError(err.code);
      if (mapped !== null) {
        setError(mapped);
      } else if (!err.response) {
        setError('Cannot reach the server. Make sure the backend is running.');
      } else {
        setError(`Login failed: ${err.response?.data?.message || err.response?.status}`);
      }
    } finally {
      if (!success) setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      setSuccess(true);
      setTimeout(() => navigate(from, { replace: true }), 400);
    } catch (err) {
      const mapped = mapFirebaseError(err.code);
      if (mapped !== null) {
        setError(mapped);
      } else {
        setError(err.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const fillDemo = email => setForm({ email, password: 'Demo1234!' });

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Hero panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 relative overflow-hidden"
           style={{ background: 'linear-gradient(145deg, #052e16 0%, #14532d 45%, #166534 100%)' }}>
        {/* Patterns */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="absolute inset-0 bg-noise" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-green-400/10 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="relative z-10">
          <AppLogo size="md" dark={true} />
        </div>

        {/* Copy */}
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Understand your soil.
            <br />
            <span className="text-transparent bg-clip-text"
                  style={{ backgroundImage: 'linear-gradient(90deg, #4ade80, #a3e635)' }}>
              Grow smarter.
            </span>
          </h2>
          <p className="text-green-200/70 text-base leading-relaxed">
            Preliminary soil fertility assessment and crop recommendations for
            farmers in Roxas, Oriental Mindoro.
          </p>
        </div>

        {/* Mock result badge */}
        <div className="relative z-10">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4
                          animate-float" style={{ animationDuration: '5s' }}>
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
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white mb-1"
                     style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
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
      </div>

      {/* ── Right: Form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <AppLogo size="md" />
        </div>

        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="mb-8">
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

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="input-label">Email Address</label>
              <input
                id="email" name="email" type="email" autoComplete="email"
                className="input-field" placeholder="you@example.com"
                value={form.email} onChange={handleChange} disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="input-label">Password</label>
              <div className="relative">
                <input
                  id="password" name="password"
                  type={showPw ? 'text' : 'password'} autoComplete="current-password"
                  className="input-field pr-11" placeholder="Your password"
                  value={form.password} onChange={handleChange} disabled={loading}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500
                             hover:text-gray-600 transition-colors"
                  aria-label={showPw ? 'Hide' : 'Show'}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading || success}
              className={`
                w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl
                font-bold text-white text-sm transition-all duration-300
                focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2
                ${success
                  ? 'bg-green-500 scale-[0.98]'
                  : 'btn-primary'}
              `}
            >
              {loading   ? <LoadingSpinner size="sm" color="white" />   :
               success   ? <><span className="text-lg">✓</span> Signed in!</> :
               <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google sign-in */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading || success}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl
                       border border-gray-200 bg-white text-gray-700 text-sm font-semibold
                       hover:bg-gray-50 active:bg-gray-100 transition-colors
                       focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <LoadingSpinner size="sm" color="gray" />
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Demo accounts */}
          <div className="mt-5 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-2.5 uppercase tracking-wide">
              Demo accounts — click to fill
            </p>
            <div className="flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map(a => (
                <button key={a.email}
                  type="button" onClick={() => fillDemo(a.email)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border
                              hover:scale-105 active:scale-95 transition-transform
                              ${a.color}`}>
                  {a.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              Password: <code className="font-mono bg-white px-1 py-0.5 rounded">Demo1234!</code>
            </p>
          </div>

          <p className="text-center mt-6 text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-green-600 font-bold hover:text-green-700">
              Sign up free
            </Link>
          </p>
          <p className="text-center mt-3">
            <Link to="/" className="text-xs text-gray-500 hover:text-gray-600">← Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
