/**
 * ManageUsers.jsx — Admin page to view and manage user accounts
 *
 * Researchers/admins can view all users, change roles,
 * and activate/deactivate accounts.
 */

import { useState, useEffect } from 'react';
import { Search, Pencil, X, Save, Shield, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { value: 'farmer',           label: 'Farmer' },
  { value: 'extension_worker', label: 'Extension Worker' },
  { value: 'researcher',       label: 'Researcher' },
  { value: 'admin',            label: 'Administrator' },
];

const ROLE_COLORS = {
  farmer:           'bg-green-100 text-green-700',
  extension_worker: 'bg-blue-100 text-blue-700',
  researcher:       'bg-purple-100 text-purple-700',
  admin:            'bg-red-100 text-red-700',
};

export default function ManageUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [editing, setEditing]   = useState(null);
  const [editForm, setEditForm] = useState({ role: '', isActive: true });
  const [saving, setSaving]     = useState(false);

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
    } catch {
      toast.error('Toggle failed.');
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

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} total accounts</p>
        </div>
      </div>

      {/* Role breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ROLES.map(r => (
          <div key={r.value} className="card py-3 text-center">
            <div className="text-2xl font-black text-gray-900">{counts[r.value] || 0}</div>
            <div className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${ROLE_COLORS[r.value]}`}>
              {r.label}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input-field pl-9" placeholder="Search by name, email, or barangay..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Users table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">User</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Location</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(user => {
              const isSelf = user.uid === currentUser?.uid || user.email === currentUser?.email;
              const createdAt = user.createdAt?._seconds
                ? new Date(user.createdAt._seconds * 1000)
                : user.createdAt ? new Date(user.createdAt) : null;

              return (
                <tr key={user.uid || user.id} className="hover:bg-gray-50">
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
                          {user.isDemoAccount && <span className="text-xs text-amber-600 font-normal">demo</span>}
                        </div>
                        {createdAt && (
                          <div className="text-xs text-gray-400">
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
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
                      {user.role?.replace(/_/g,' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(user)}
                      disabled={isSelf}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors
                        ${user.isActive
                          ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600'
                          : 'bg-red-100 text-red-600 hover:bg-green-100 hover:text-green-700'}
                        ${isSelf ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                    >
                      {user.isActive
                        ? <><UserCheck className="w-3 h-3" /> Active</>
                        : <><UserX    className="w-3 h-3" /> Inactive</>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEdit(user)}
                      disabled={isSelf}
                      className={`p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors ${isSelf ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Shield className="w-10 h-10 mx-auto mb-2 text-gray-200" />
            <p className="text-sm">No users found.</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Edit User</h3>
              <button onClick={() => setEditing(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
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
                  {saving ? <LoadingSpinner size="sm" /> : <><Save className="w-4 h-4" /> Save</>}
                </button>
                <button onClick={() => setEditing(null)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
