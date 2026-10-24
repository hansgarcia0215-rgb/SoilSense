/**
 * Settings.jsx — User settings page
 *
 * All changes are now persisted to Firestore via PATCH /api/auth/me
 * Password change via PATCH /api/auth/password
 * ESP32 device ID stored in user profile
 */

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { BARANGAYS, MUNICIPALITY, PROVINCE } from '../utils/roxasConfig';

const ROLE_LABELS = {
  farmer: 'Farmer', extension_worker: 'Extension Worker',
  researcher: 'System Administrator', admin: 'System Administrator',
};

export default function Settings() {
  const { user, updateUser } = useAuth();

  const [profileForm, setProfileForm] = useState({
    displayName:       user?.displayName       || '',
    barangay:          user?.barangay          || '',
    preferredDeviceId: user?.preferredDeviceId || 'SS-ESP32-001',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // ── Save profile ───────────────────────────────────────────
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.displayName.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }
    setSavingProfile(true);
    try {
      const result = await authService.updateProfile({
        displayName:       profileForm.displayName.trim(),
        barangay:          profileForm.barangay,
        preferredDeviceId: profileForm.preferredDeviceId.trim() || 'SS-ESP32-001',
      });
      updateUser(result.user);
      toast.success('Profile saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Change password ────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('Please fill in all password fields.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await authService.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );
      toast.success('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg = err.response?.data?.message;
      if (msg?.includes('incorrect') || err.response?.status === 401) {
        toast.error('Current password is incorrect.');
      } else {
        toast.error(msg || 'Could not change password.');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Changes are saved to your account</p>
      </div>

      {/* ── Profile ────────────────────────────────────────── */}
      <div className="card">
        <h3 className="section-title">Account Information</h3>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="input-label">Full Name</label>
            <input className="input-field"
              value={profileForm.displayName}
              onChange={e => setProfileForm(f => ({ ...f, displayName: e.target.value }))} />
          </div>

          <div>
            <label className="input-label">Email Address</label>
            <input className="input-field bg-gray-50 text-gray-500"
              value={user?.email || ''} disabled />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed here.</p>
          </div>

          <div>
            <label className="input-label">Role</label>
            <input className="input-field bg-gray-50 text-gray-500"
              value={ROLE_LABELS[user?.role] || user?.role || ''} disabled />
          </div>

          <div>
            <label className="input-label">Barangay ({MUNICIPALITY}, {PROVINCE})</label>
            <select className="input-field"
              value={profileForm.barangay}
              onChange={e => setProfileForm(f => ({ ...f, barangay: e.target.value }))}>
              <option value="">-- Select barangay --</option>
              {BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label className="input-label">ESP32 Device ID</label>
            <input className="input-field font-mono text-sm"
              placeholder="SS-ESP32-001"
              value={profileForm.preferredDeviceId}
              onChange={e => setProfileForm(f => ({ ...f, preferredDeviceId: e.target.value }))} />
            <p className="text-xs text-gray-500 mt-1">
              The device ID your ESP32 sends in its readings. Used by the assessment wizard.
            </p>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={savingProfile}>
            {savingProfile ? <LoadingSpinner size="sm" /> : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* ── Change Password ────────────────────────────────── */}
      <div className="card">
        <h3 className="section-title">Change Password</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="input-label">Current Password</label>
            <div className="relative">
              <input
                type={showPasswords ? 'text' : 'password'}
                className="input-field pr-10"
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                autoComplete="current-password" />
              <button type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600">
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="input-label">New Password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              className="input-field"
              placeholder="At least 8 characters"
              value={passwordForm.newPassword}
              onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
              autoComplete="new-password" />
          </div>

          <div>
            <label className="input-label">Confirm New Password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              className="input-field"
              placeholder="Repeat new password"
              value={passwordForm.confirmPassword}
              onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
              autoComplete="new-password" />
          </div>

          <button type="submit" className="btn-secondary w-full" disabled={savingPassword}>
            {savingPassword ? <LoadingSpinner size="sm" /> : 'Change Password'}
          </button>
        </form>
      </div>

      {/* ── About ──────────────────────────────────────────── */}
      <div className="card">
        <h3 className="section-title">About SoilSense</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between"><span>Version</span><span className="font-mono">2.0.0</span></div>
          <div className="flex justify-between"><span>Service Area</span><span>{MUNICIPALITY}, {PROVINCE}</span></div>
          <div className="flex justify-between"><span>System Type</span><span>Preliminary Assessment Tool</span></div>
        </div>
        <p className="text-xs text-gray-500 mt-3 border-t border-gray-100 pt-3">
          SoilSense is a research prototype. All recommendations are preliminary and should be
          validated with laboratory soil analysis and consultation with an agricultural extension officer.
        </p>
      </div>
    </div>
  );
}
