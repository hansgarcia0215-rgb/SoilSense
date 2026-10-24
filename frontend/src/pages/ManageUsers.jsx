/**
 * ManageUsers.jsx — System Administrator page to manage user accounts (full CRUD)
 *
 * Create   — new farmer / extension worker / system administrator accounts
 * Read     — searchable list of all accounts
 * Update   — change role, activate/deactivate
 * Delete   — permanently remove an account
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Pencil, X, Save, Shield, UserCheck, UserX, UserPlus,
  Trash2, AlertTriangle, Eye, EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { BARANGAYS } from '../utils/roxasConfig';

const ROLES = [
  { value: 'farmer',           label: 'Farmer' },
  { value: 'extension_worker', label: 'Extension Worker' },
  { value: 'admin',            label: 'System Administrator' },
];

const ROLE_COLORS = {
  farmer:           'bg-green-100 text-green-700',
  extension_worker: 'bg-cream-sand text-ink-soft',
  admin:            'bg-[#f5e0da] text-[#7f2d20]',
};

const BLANK_FORM = {
  displayName: '', email: '', password: '', confirmPassword: '',
  role: 'farmer', barangay: '',
};

export default function ManageUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [editing, setEditing]   = useState(null);
  const [editForm, setEditForm] = useState({ role: '', isActive: true });
  const [saving, setSaving]     = useState(false);

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(BLANK_FORM);
  const [createErrors, setCreateErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const [showPw, setShowPw]     = useState(false);

  // Delete
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.data || []);
    } catch {
      toast.error('Could not load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    !search ||
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.barangay?.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (user) => {
    setEditing(user);
    setEditForm({ role: user.role, isActive: user.isActive ?? true });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.put(`/admin/users/${editing.uid || editing.id}`, editForm);
      toast.success('User updated!');
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    // Prevent deactivating yourself
    if (user.uid === currentUser?.uid || user.email === currentUser?.email) {
      toast.error("You can't deactivate your own account.");
      return;
    }
    try {
      await api.put(`/admin/users/${user.uid || user.id}`, { isActive: !user.isActive });
      toast.success(user.isActive ? 'Account deactivated.' : 'Account activated.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Toggle failed.');
    }
  };

  // ── Create ──────────────────────────────────────────────
  const validateCreate = () => {
    const errors = {};
    const name = createForm.displayName.trim();
    if (!name)      errors.displayName = 'Full name is required.';
    else if (name.length < 2 || name.length > 100)
      errors.displayName = 'Name must be 2–100 characters.';

    const email = createForm.email.trim();
    if (!email) errors.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      errors.email = 'Enter a valid email address.';

    const pw = createForm.password;
    if (!pw)                errors.password = 'Password is required.';
    else if (pw.length < 8) errors.password = 'At least 8 characters.';
    else if (!/[A-Z]/.test(pw)) errors.password = 'Include an uppercase letter.';
    else if (!/[0-9]/.test(pw)) errors.password = 'Include a number.';

    if (createForm.confirmPassword !== pw)
      errors.confirmPassword = 'Passwords do not match.';
    if (!createForm.barangay) errors.barangay = 'Select a barangay.';
    return errors;
  };

  const handleCreate = async () => {
    const errors = validateCreate();
    if (Object.keys(errors).length > 0) { setCreateErrors(errors); return; }
    setCreating(true);
    try {
      await api.post('/admin/users', {
        displayName: createForm.displayName.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        role: createForm.role,
        barangay: createForm.barangay,
        municipality: 'Roxas',
      });
      toast.success(`Account created for ${createForm.displayName.trim()}!`);
      setShowCreate(false);
      setCreateForm(BLANK_FORM);
      setCreateErrors({});
      load();
    } catch (err) {
      const msg = err.response?.data?.message;
      if (msg?.includes('already')) setCreateErrors({ email: 'This email is already registered.' });
      else if (msg) setCreateErrors({ password: msg });
      else toast.error('Account creation failed.');
    } finally {
      setCreating(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await api.delete(`/admin/users/${deleting.uid || deleting.id}`);
      toast.success(`${deleting.displayName}'s account was deleted.`);
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
      setDeleting(null);
    } finally {
      setDeletingBusy(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <LoadingSpinner size="lg" message="Loading users..." />
    </div>
  );

  const counts = ROLES.reduce((acc, r) => {
    acc[r.value] = users.filter(u => u.role === r.value).length;
    return acc;
  }, {});

  const isSelfRow = (user) =>
    user.uid === currentUser?.uid || user.email === currentUser?.email;

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Manage Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} total accounts</p>
        </div>
        <button onClick={() => { setCreateForm(BLANK_FORM); setCreateErrors({}); setShowCreate(true); }}
          className="btn-primary">
          <UserPlus className="w-4 h-4" />
          Create Account
        </button>
      </div>

      {/* Role breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ROLES.map(r => (
          <div key={r.value} className="card py-3 text-center">
            <div className="stat-value">{counts[r.value] || 0}</div>
            <div className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${ROLE_COLORS[r.value]}`}>
              {r.label}
            </div>
          </div>
        ))}
        <div className="card py-3 text-center">
          <div className="stat-value">{users.length}</div>
          <div className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-1 bg-gray-100 text-gray-600">
            All Accounts
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
        <input className="input-field pl-9" placeholder="Search by name, email, or barangay..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Users table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream-sand/60 border-b border-cream-border">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">User</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Location</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-border/60">
            {filtered.map(user => {
              const isSelf = isSelfRow(user);
              const createdAt = user.createdAt?._seconds
                ? new Date(user.createdAt._seconds * 1000)
                : user.createdAt ? new Date(user.createdAt) : null;

              return (
                <tr key={user.uid || user.id} className="hover:bg-cream-sand/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-green-700 font-bold text-sm">
                          {user.displayName?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                          {user.displayName}
                          {isSelf && <span className="text-xs text-green-600 font-normal">(you)</span>}
                          {user.isDemoAccount && <span className="text-xs text-soil-700 font-normal">seeded demo</span>}
                        </div>
                        {createdAt && (
                          <div className="text-xs text-gray-500">
                            Joined {format(createdAt, 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600 text-xs">{user.email}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                    {user.barangay ? `${user.barangay}, ` : ''}{user.municipality || 'Roxas'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
                      {ROLES.find(r => r.value === user.role)?.label || (user.role?.replace(/_/g,' '))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(user)}
                      disabled={isSelf}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors
                        ${user.isActive
                          ? 'bg-green-100 text-green-700 hover:bg-[#f5e0da] hover:text-[#7f2d20]'
                          : 'bg-[#f5e0da] text-[#7f2d20] hover:bg-green-100 hover:text-green-700'}
                        ${isSelf ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                    >
                      {user.isActive
                        ? <><UserCheck className="w-3 h-3" /> Active</>
                        : <><UserX    className="w-3 h-3" /> Inactive</>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        disabled={isSelf}
                        className={`p-1.5 hover:bg-cream-sand text-ink-soft rounded-lg transition-colors ${isSelf ? 'opacity-30 cursor-not-allowed' : ''}`}
                        aria-label={`Edit ${user.displayName}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(user)}
                        disabled={isSelf}
                        className={`p-1.5 hover:bg-[#f5e0da] text-[#a8402f] rounded-lg transition-colors
                          ${isSelf ? 'opacity-30 cursor-not-allowed' : ''}`}
                        aria-label={`Delete ${user.displayName}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            <Shield className="w-10 h-10 mx-auto mb-2 text-gray-200" />
            <p className="text-sm">No users found.</p>
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editing && (
        <AdminModal panelClassName="max-w-sm">
            <div className="flex shrink-0 items-center justify-between border-b border-cream-border px-5 py-4 sm:px-6">
              <h3 className="font-display font-black text-lg">Edit User</h3>
              <button onClick={() => setEditing(null)} className="p-1 hover:bg-cream-sand rounded-lg">
                <X className="w-5 h-5 text-ink-faint" />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 space-y-4">
              <div>
                <p className="font-semibold text-gray-900">{editing.displayName}</p>
                <p className="text-sm text-gray-500">{editing.email}</p>
              </div>

              <div>
                <label className="input-label">Role</label>
                <select className="input-field" value={editForm.role}
                  onChange={e => setEditForm(f => ({...f, role: e.target.value}))}>
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="activeCheck" checked={editForm.isActive}
                  onChange={e => setEditForm(f => ({...f, isActive: e.target.checked}))}
                  className="w-4 h-4 rounded text-green-600" />
                <label htmlFor="activeCheck" className="text-sm font-medium text-gray-700">
                  Account is active
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} className="btn-primary flex-1" disabled={saving}>
                  {saving ? <LoadingSpinner size="sm" color="white" /> : <><Save className="w-4 h-4" /> Save</>}
                </button>
                <button onClick={() => setEditing(null)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </div>
        </AdminModal>
      )}

      {/* ── Create Modal ── */}
      {showCreate && (
        <AdminModal panelClassName="max-w-md">
            <div className="flex shrink-0 items-center justify-between rounded-t-3xl border-b border-cream-border bg-cream-card px-5 py-4 sm:px-6">
              <h3 className="font-display font-black text-lg">Create Account</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-cream-sand rounded-lg">
                <X className="w-5 h-5 text-ink-faint" />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 space-y-4">

              <div>
                <label className="input-label">Full Name</label>
                <input type="text" autoComplete="off"
                  className={`input-field ${createErrors.displayName ? 'border-[#c96a4e] focus:ring-[#c96a4e]' : ''}`}
                  placeholder="Maria Santos"
                  value={createForm.displayName}
                  onChange={e => { setCreateForm(f => ({...f, displayName: e.target.value})); setCreateErrors(p => ({...p, displayName: ''})); }} />
                {createErrors.displayName && <p className="input-error">{createErrors.displayName}</p>}
              </div>

              <div>
                <label className="input-label">Email Address</label>
                <input type="email" autoComplete="off"
                  className={`input-field ${createErrors.email ? 'border-[#c96a4e] focus:ring-[#c96a4e]' : ''}`}
                  placeholder="maria@example.com"
                  value={createForm.email}
                  onChange={e => { setCreateForm(f => ({...f, email: e.target.value})); setCreateErrors(p => ({...p, email: ''})); }} />
                {createErrors.email && <p className="input-error">{createErrors.email}</p>}
              </div>

              <div>
                <label className="input-label">Temporary Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} autoComplete="new-password"
                    className={`input-field pr-11 ${createErrors.password ? 'border-[#c96a4e] focus:ring-[#c96a4e]' : ''}`}
                    placeholder="Min. 8 chars, 1 uppercase, 1 number"
                    value={createForm.password}
                    onChange={e => { setCreateForm(f => ({...f, password: e.target.value})); setCreateErrors(p => ({...p, password: ''})); }} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-soft">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {createErrors.password && <p className="input-error">{createErrors.password}</p>}
              </div>

              <div>
                <label className="input-label">Confirm Password</label>
                <input type={showPw ? 'text' : 'password'} autoComplete="new-password"
                  className={`input-field ${createErrors.confirmPassword ? 'border-[#c96a4e] focus:ring-[#c96a4e]' : ''}`}
                  placeholder="Repeat password"
                  value={createForm.confirmPassword}
                  onChange={e => { setCreateForm(f => ({...f, confirmPassword: e.target.value})); setCreateErrors(p => ({...p, confirmPassword: ''})); }} />
                {createErrors.confirmPassword && <p className="input-error">{createErrors.confirmPassword}</p>}
              </div>

              <div>
                <label className="input-label">Role</label>
                <select className="input-field" value={createForm.role}
                  onChange={e => setCreateForm(f => ({...f, role: e.target.value}))}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Public sign-up always creates Farmer accounts — staff roles are granted here only.
                </p>
              </div>

              <div>
                <label className="input-label">Barangay — Roxas, Oriental Mindoro</label>
                <select className={`input-field ${createErrors.barangay ? 'border-[#c96a4e]' : ''}`}
                  value={createForm.barangay}
                  onChange={e => { setCreateForm(f => ({...f, barangay: e.target.value})); setCreateErrors(p => ({...p, barangay: ''})); }}>
                  <option value="">— Select barangay —</option>
                  {BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                {createErrors.barangay && <p className="input-error">{createErrors.barangay}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleCreate} className="btn-primary flex-1" disabled={creating}>
                  {creating ? <LoadingSpinner size="sm" color="white" /> : <><UserPlus className="w-4 h-4" /> Create</>}
                </button>
                <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </div>
        </AdminModal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleting && (
        <AdminModal panelClassName="max-w-sm">
            <div className="px-6 py-5">
              <div className="w-12 h-12 rounded-2xl bg-[#f5e0da] flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-[#a8402f]" />
              </div>
              <h3 className="font-display font-black text-lg text-gray-900 mb-1">Delete this account?</h3>
              <p className="text-sm text-gray-500 mb-4">
                <span className="font-semibold text-gray-700">{deleting.displayName}</span>
                {' '}({deleting.email}) will be permanently removed. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={handleDelete} className="btn-danger flex-1" disabled={deletingBusy}>
                  {deletingBusy ? <LoadingSpinner size="sm" color="white" /> : <><Trash2 className="w-4 h-4" /> Delete</>}
                </button>
                <button onClick={() => setDeleting(null)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </div>
        </AdminModal>
      )}

    </div>
  );
}

function AdminModal({ children, panelClassName }) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/40 p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className={`flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-3xl bg-cream-card shadow-card-lg sm:max-h-[calc(100dvh-2rem)] ${panelClassName}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
