/**
 * ManageCrops.jsx — Admin page to view, add, edit, and delete rootcrops
 *
 * Researchers and admins can manage the crop database that drives
 * the rootcrop suitability engine.
 */

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Leaf, AlertTriangle, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const EMPTY_CROP = {
  cropName:    '',
  localName:   '',
  description: '',
  isActive:    true,
  isDemoData:  false,
  dataSource:  '',
  requirements: {
    phMin:           5.5,
    phMax:           7.0,
    phOptimal:       6.2,
    moistureMin:     30,
    moistureMax:     70,
    moistureOptimal: 50,
    fertilityMin:    'moderate',
  },
  suitabilityWeights: {
    ph:           0.30,
    moisture:     0.20,
    fertility:    0.25,
    soilCondition:0.15,
    location:     0.10,
  },
  minSuitabilityThreshold: 50,
};

export default function ManageCrops() {
  const [crops, setCrops]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);   // crop id being edited
  const [form, setForm]         = useState(EMPTY_CROP);
  const [saving, setSaving]     = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    try {
      const res = await api.get('/admin/crops');
      setCrops(res.data.data || []);
    } catch {
      toast.error('Could not load crops.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_CROP);
    setShowForm(true);
  };

  const openEdit = (crop) => {
    setEditing(crop.id || crop.cropId);
    setForm({
      cropName:    crop.cropName || '',
      localName:   crop.localName || '',
      description: crop.description || '',
      isActive:    crop.isActive ?? true,
      isDemoData:  crop.isDemoData ?? false,
      dataSource:  crop.dataSource || '',
      requirements: { ...EMPTY_CROP.requirements, ...crop.requirements },
      suitabilityWeights: { ...EMPTY_CROP.suitabilityWeights, ...crop.suitabilityWeights },
      minSuitabilityThreshold: crop.minSuitabilityThreshold ?? 50,
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.cropName.trim()) { toast.error('Crop name is required.'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/crops/${editing}`, form);
        toast.success('Crop updated!');
      } else {
        await api.post('/admin/crops', { ...form, cropId: form.cropName.toLowerCase().replace(/\s+/g, '_') });
        toast.success('Crop added!');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/admin/crops/${deleteId}`);
      toast.success('Crop deleted.');
      setDeleteId(null);
      load();
    } catch {
      toast.error('Delete failed.');
    }
  };

  const setReq = (key, val) =>
    setForm(f => ({ ...f, requirements: { ...f.requirements, [key]: val } }));

  const setWeight = (key, val) =>
    setForm(f => ({ ...f, suitabilityWeights: { ...f.suitabilityWeights, [key]: parseFloat(val) || 0 } }));

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <LoadingSpinner size="lg" message="Loading crops..." />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Crops</h1>
          <p className="text-sm text-gray-500 mt-0.5">{crops.length} crops in database</p>
        </div>
        <button onClick={openNew} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> Add Crop
        </button>
      </div>

      {/* Demo data warning */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        Demo crop data is pre-loaded. All requirements should be verified by a qualified agricultural officer before operational use.
      </div>

      {/* Crops table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Crop</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">pH Range</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Moisture</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Min Fertility</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Threshold</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {crops.map(crop => (
              <tr key={crop.id || crop.cropId} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <div className="font-semibold text-gray-900">{crop.cropName}</div>
                  <div className="text-xs text-gray-500 italic">{crop.localName}</div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                  {crop.requirements?.phMin}–{crop.requirements?.phMax}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                  {crop.requirements?.moistureMin}–{crop.requirements?.moistureMax}%
                </td>
                <td className="px-4 py-3 hidden lg:table-cell capitalize text-gray-600">
                  {crop.requirements?.fertilityMin}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-gray-600">
                  {crop.minSuitabilityThreshold}%
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    crop.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {crop.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(crop)}
                      className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(crop.id || crop.cropId)}
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <Modal title={editing ? 'Edit Crop' : 'Add New Crop'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Crop Name *</label>
                <input className="input-field" value={form.cropName}
                  onChange={e => setForm(f => ({...f, cropName: e.target.value}))} placeholder="e.g. Sweet Potato" />
              </div>
              <div>
                <label className="input-label">Local Name</label>
                <input className="input-field" value={form.localName}
                  onChange={e => setForm(f => ({...f, localName: e.target.value}))} placeholder="e.g. Kamote" />
              </div>
            </div>

            <div>
              <label className="input-label">Description</label>
              <textarea className="input-field resize-none" rows={2} value={form.description}
                onChange={e => setForm(f => ({...f, description: e.target.value}))} />
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-bold text-gray-700 mb-3">Soil Requirements</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="input-label">pH Min</label>
                  <input type="number" step="0.1" min="0" max="14" className="input-field"
                    value={form.requirements.phMin}
                    onChange={e => setReq('phMin', parseFloat(e.target.value))} />
                </div>
                <div>
                  <label className="input-label">pH Optimal</label>
                  <input type="number" step="0.1" min="0" max="14" className="input-field"
                    value={form.requirements.phOptimal}
                    onChange={e => setReq('phOptimal', parseFloat(e.target.value))} />
                </div>
                <div>
                  <label className="input-label">pH Max</label>
                  <input type="number" step="0.1" min="0" max="14" className="input-field"
                    value={form.requirements.phMax}
                    onChange={e => setReq('phMax', parseFloat(e.target.value))} />
                </div>
                <div>
                  <label className="input-label">Moisture Min (%)</label>
                  <input type="number" min="0" max="100" className="input-field"
                    value={form.requirements.moistureMin}
                    onChange={e => setReq('moistureMin', parseInt(e.target.value))} />
                </div>
                <div>
                  <label className="input-label">Moisture Optimal (%)</label>
                  <input type="number" min="0" max="100" className="input-field"
                    value={form.requirements.moistureOptimal}
                    onChange={e => setReq('moistureOptimal', parseInt(e.target.value))} />
                </div>
                <div>
                  <label className="input-label">Moisture Max (%)</label>
                  <input type="number" min="0" max="100" className="input-field"
                    value={form.requirements.moistureMax}
                    onChange={e => setReq('moistureMax', parseInt(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="input-label">Minimum Fertility</label>
                  <select className="input-field" value={form.requirements.fertilityMin}
                    onChange={e => setReq('fertilityMin', e.target.value)}>
                    <option value="poor">Poor</option>
                    <option value="moderate">Moderate</option>
                    <option value="fertile">Fertile</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Min Suitability Threshold (%)</label>
                  <input type="number" min="0" max="100" className="input-field"
                    value={form.minSuitabilityThreshold}
                    onChange={e => setForm(f => ({...f, minSuitabilityThreshold: parseInt(e.target.value)}))} />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-bold text-gray-700 mb-1">Suitability Weights
                <span className="text-xs font-normal text-gray-500 ml-2">(must sum to 1.0)</span>
              </p>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(form.suitabilityWeights).map(([key, val]) => (
                  <div key={key}>
                    <label className="input-label capitalize text-xs">{key}</label>
                    <input type="number" step="0.05" min="0" max="1" className="input-field text-sm py-2"
                      value={val} onChange={e => setWeight(key, e.target.value)} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Total: {Object.values(form.suitabilityWeights).reduce((a,b) => a + b, 0).toFixed(2)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Data Source / Reference</label>
                <input className="input-field text-sm" value={form.dataSource}
                  onChange={e => setForm(f => ({...f, dataSource: e.target.value}))}
                  placeholder="e.g. DA-MIMAROPA Extension Office" />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input type="checkbox" id="isActive" checked={form.isActive}
                  onChange={e => setForm(f => ({...f, isActive: e.target.checked}))}
                  className="w-4 h-4 rounded text-green-600" />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active (used in assessments)</label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? <LoadingSpinner size="sm" /> : <><Save className="w-4 h-4" /> Save Crop</>}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <Modal title="Delete Crop?" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-600 mb-5">
            This will permanently remove the crop from the database.
            Existing assessments that referenced this crop will not be affected.
          </p>
          <div className="flex gap-3">
            <button onClick={handleDelete} className="btn-danger flex-1">Delete</button>
            <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </Modal>
      )}

    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
