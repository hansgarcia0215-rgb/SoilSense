/**
 * Register.jsx — Firebase Authentication registration page
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { BARANGAYS, MUNICIPALITY, PROVINCE } from '../utils/roxasConfig';
import AppLogo from '../components/common/AppLogo';

const ROLES = [
  { value: 'farmer',           icon: '👨‍🌾', label: 'Farmer',          desc: 'I want to assess my soil' },
  { value: 'extension_worker', icon: '🌾',  label: 'Extension Worker', desc: 'I review farm assessments' },
  { value: 'researcher',       icon: '🔬',  label: 'Researcher',       desc: 'I analyze data and manage the system' },
];

function firebaseErrorMsg(code) {
  const map = {
    'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
    'auth/invalid-email':        'Please enter a valid email address.',
    'auth/weak-password':        'Password must be at least 6 characters.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] || 'Registration failed. Please try again.';
}

export default function Register() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    displayName: '', email: '', password: '', confirmPassword: '',
    role: 'farmer', barangay: '', municipality: MUNICIPALITY, province: PROVINCE,
  });
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]       = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    setError('');
    setFieldErrors(p => ({ ...p, [e.target.name]: '' }));
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    const errors = {};
    if (!formData.displayName.trim()) errors.displayName = 'Full name is required.';
    if (!formData.email.trim())        errors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Enter a valid email.';
    if (!formData.password)            errors.password = 'Create a password.';
    else if (formData.password.length < 8) errors.password = 'At least 8 characters.';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    if (!formData.barangay)            errors.barangay = 'Please select your barangay.';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setLoading(true);
    try {
      await register({
        displayName:  formData.displayName.trim(),
        email:        formData.email.trim().toLowerCase(),
        password:     formData.password,
        role:         formData.role,
        barangay:     formData.barangay,
        municipality: formData.municipality,
        province:     formData.province,
      });
      navigate('/dashboard');
    } catch (err) {
      if (err.code) setError(firebaseErrorMsg(err.code));
      else setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(firebaseErrorMsg(err.code));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const pwStrength = () => {
    const pw = formData.password;
    if (!pw) return null;
    if (pw.length < 6) return { level: 1, label: 'Weak',   color: 'bg-red-400' };
    if (pw.length < 8) return { level: 2, label: 'Fair',   color: 'bg-amber-400' };
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) return { level: 4, label: 'Strong', color: 'bg-green-500' };
    return { level: 3, label: 'Good', color: 'bg-blue-400' };
  };
  const strength = pwStrength();

  const fe = (name) => fieldErrors[name] && (
    <p className="input-error animate-scale-in">{fieldErrors[name]}</p>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg animate-fade-in-up">

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6"><AppLogo size="md" /></Link>
          <h1 className="text-2xl font-black text-gray-900 mb-1">Create your account</h1>
          <p className="text-gray-500 text-sm">Start assessing your soil today — free</p>
        </div>

        <div className="card shadow-card-lg">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl
                            p-3 mb-5 text-sm text-red-700 animate-scale-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Google sign-up */}
          <button type="button" onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 mb-4
                       rounded-xl border-2 border-gray-200 bg-white text-gray-700
                       font-semibold text-sm hover:border-gray-300 hover:bg-gray-50
                       hover:-translate-y-px hover:shadow-sm transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed">
            {googleLoading ? <LoadingSpinner size="sm" color="gray" /> : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          <div className="relative flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or register with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="input-label">Full Name</label>
              <input name="displayName" type="text" autoComplete="name"
                className={`input-field ${fieldErrors.displayName ? 'border-red-300' : ''}`}
                placeholder="Juan dela Cruz"
                value={formData.displayName} onChange={handleChange} disabled={loading} />
              {fe('displayName')}
            </div>

            <div>
              <label className="input-label">Email Address</label>
              <input name="email" type="email" autoComplete="email"
                className={`input-field ${fieldErrors.email ? 'border-red-300' : ''}`}
                placeholder="juan@example.com"
                value={formData.email} onChange={handleChange} disabled={loading} />
              {fe('email')}
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <input name="password" type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`input-field pr-11 ${fieldErrors.password ? 'border-red-300' : ''}`}
                  placeholder="Min. 8 characters"
                  value={formData.password} onChange={handleChange} disabled={loading} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-gray-600 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {strength && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 flex gap-0.5">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300
                        ${i <= strength.level ? strength.color : 'bg-gray-200'}`} />
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500">{strength.label}</span>
                </div>
              )}
              {fe('password')}
            </div>

            <div>
              <label className="input-label">Confirm Password</label>
              <div className="relative">
                <input name="confirmPassword" type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`input-field pr-11 ${fieldErrors.confirmPassword ? 'border-red-300' : ''}`}
                  placeholder="Repeat password"
                  value={formData.confirmPassword} onChange={handleChange} disabled={loading} />
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
              {fe('confirmPassword')}
            </div>

            {/* Role selector */}
            <div>
              <label className="input-label">I am a...</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <button key={r.value} type="button"
                    onClick={() => setFormData(p => ({ ...p, role: r.value }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2
                                text-center transition-all duration-200 hover:scale-[1.02]
                                ${formData.role === r.value
                                  ? 'border-green-500 bg-green-50 shadow-glow-sm'
                                  : 'border-gray-200 bg-white hover:border-green-300'}`}>
                    <span className="text-xl">{r.icon}</span>
                    <span className={`text-xs font-bold leading-tight
                                     ${formData.role === r.value ? 'text-green-700' : 'text-gray-600'}`}>
                      {r.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Barangay */}
            <div>
              <label className="input-label">Barangay — {MUNICIPALITY}, {PROVINCE}</label>
              <select name="barangay"
                className={`input-field ${fieldErrors.barangay ? 'border-red-300' : ''}`}
                value={formData.barangay} onChange={handleChange} disabled={loading}>
                <option value="">— Select your barangay —</option>
                {BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              {fe('barangay')}
            </div>

            <button type="submit" className="btn-primary w-full py-3.5 mt-2" disabled={loading}>
              {loading
                ? <LoadingSpinner size="sm" color="white" />
                : <>Create Account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>

        <p className="text-center mt-5 text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-green-600 font-bold hover:text-green-700">Sign in</Link>
        </p>
        <p className="text-center mt-3">
          <Link to="/" className="text-xs text-gray-400 hover:text-gray-600">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
