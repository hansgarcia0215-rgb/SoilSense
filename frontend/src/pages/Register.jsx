/**
 * Register.jsx — Registration page (public accounts are farmer accounts)
 *
 * Staff accounts (Extension Worker, System Administrator) are created
 * by a System Administrator via Manage Users, not by public sign-up.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { BARANGAYS, MUNICIPALITY, PROVINCE } from '../utils/roxasConfig';
import AppLogo from '../components/common/AppLogo';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    displayName: '', email: '', password: '', confirmPassword: '',
    barangay: '', municipality: MUNICIPALITY, province: PROVINCE,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = e => {
    setError('');
    setFieldErrors(p => ({ ...p, [e.target.name]: '' }));
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    const errors = {};
    const name = formData.displayName.trim();
    if (!name)      errors.displayName = 'Full name is required.';
    else if (name.length < 2 || name.length > 100)
      errors.displayName = 'Name must be 2–100 characters.';
    else if (!/^[a-zA-ZÀ-ÿ\u00f1\u00d1' .\-]+$/.test(name))
      errors.displayName = 'Letters, spaces, hyphens and apostrophes only.';

    const email = formData.email.trim();
    if (!email) errors.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      errors.email = 'Enter a valid email address.';

    const pw = formData.password;
    if (!pw)                 errors.password = 'Create a password.';
    else if (pw.length < 8)  errors.password = 'At least 8 characters required.';
    else if (!/[A-Z]/.test(pw)) errors.password = 'Include at least one uppercase letter.';
    else if (!/[0-9]/.test(pw)) errors.password = 'Include at least one number.';

    if (formData.password !== formData.confirmPassword)
      errors.confirmPassword = 'Passwords do not match.';
    if (!formData.barangay) errors.barangay = 'Please select your barangay.';
    return errors;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setLoading(true);
    try {
      await register({
        displayName: formData.displayName.trim(), email: formData.email.trim().toLowerCase(),
        password: formData.password, barangay: formData.barangay,
        municipality: formData.municipality, province: formData.province,
      });
      navigate('/dashboard');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setFieldErrors({ email: 'This email is already registered.' });
      } else if (err.code === 'auth/invalid-email') {
        setFieldErrors({ email: 'Enter a valid email address.' });
      } else if (err.code === 'auth/weak-password') {
        setFieldErrors({ password: 'Password is too weak. Use at least 8 characters.' });
      } else {
        setError('Registration failed. Please check your information and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const pwStrength = () => {
    const pw = formData.password;
    if (!pw) return null;
    if (pw.length < 6) return { level: 1, label: 'Weak',     color: 'bg-[#c96a4e]' };
    if (pw.length < 8) return { level: 2, label: 'Fair',     color: 'bg-soil-400' };
    if (pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw))
      return { level: 4, label: 'Strong', color: 'bg-green-600' };
    return { level: 3, label: 'Good — add an uppercase letter and a number', color: 'bg-green-400' };
  };
  const strength = pwStrength();

  const fe = name => fieldErrors[name] && (
    <p className="input-error animate-scale-in">{fieldErrors[name]}</p>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg animate-fade-in-up">

        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6 group">
            <AppLogo size="md" />
          </Link>
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

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Full name */}
            <div>
              <label className="input-label">Full Name</label>
              <input name="displayName" type="text" autoComplete="name"
                className={`input-field ${fieldErrors.displayName ? 'border-red-300 focus:ring-red-400' : ''}`}
                placeholder="Juan dela Cruz"
                value={formData.displayName} onChange={handleChange} disabled={loading} />
              {fe('displayName')}
            </div>

            {/* Email */}
            <div>
              <label className="input-label">Email Address</label>
              <input name="email" type="email" autoComplete="email"
                className={`input-field ${fieldErrors.email ? 'border-red-300 focus:ring-red-400' : ''}`}
                placeholder="juan@example.com"
                value={formData.email} onChange={handleChange} disabled={loading} />
              {fe('email')}
            </div>

            {/* Password */}
            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <input name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                  className={`input-field pr-11 ${fieldErrors.password ? 'border-red-300 focus:ring-red-400' : ''}`}
                  placeholder="Min. 8 characters, 1 uppercase, 1 number"
                  value={formData.password} onChange={handleChange} disabled={loading} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength bar */}
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

            {/* Confirm password */}
            <div>
              <label className="input-label">Confirm Password</label>
              <div className="relative">
                <input name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                  className={`input-field pr-11 ${fieldErrors.confirmPassword ? 'border-red-300 focus:ring-red-400' : ''}`}
                  placeholder="Repeat password"
                  value={formData.confirmPassword} onChange={handleChange} disabled={loading} />
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
              {fe('confirmPassword')}
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
              {loading ? <LoadingSpinner size="sm" color="white" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>

        <p className="text-center mt-5 text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-green-600 font-bold hover:text-green-700">Sign in</Link>
        </p>
        <p className="text-center mt-3">
          <Link to="/" className="text-xs text-gray-500 hover:text-gray-600">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
