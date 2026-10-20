/**
 * ManageFuzzyRules.jsx — Admin page to view, add, edit, and toggle fuzzy rules
 *
 * The fuzzy rules determine how pH + moisture + visual condition
 * map to fertility classifications. Researchers can tune these
 * without touching the Python fuzzy engine code.
 */

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Save, ToggleLeft, ToggleRight, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const PH_SETS = ['strongly_acidic','acidic','slightly_acidic','optimal','slightly_alkaline','alkaline'];
const MOISTURE_SETS = ['very_dry','dry','moderate','wet','very_wet'];
const VISUAL_SETS   = ['poor','moderate','good'];
const FERTILITY_CLASSES = ['poor','moderate','fertile'];

const EMPTY_RULE = {
  ruleId:          '',
  ph:              'optimal',
  moisture:        'moderate',
  visualCondition: 'good',
  fertilityClass:  'fertile',
  strength:        1.0,
  description:     '',
  isActive:        true,
};

const CLASS_COLORS = {
  fertile:  'bg-green-100 text-green-700',
  moderate: 'bg-amber-100 text-amber-700',
  poor:     'bg-red-100 text-red-700',
};

export default function ManageFuzzyRules() {
  const [rules, setRules]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY_RULE);
  const [saving, setSaving]     = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    try {
      const res = await api.get('/admin/fuzzy-rules');
      setRules(res.data.data || []);
    } catch {
      toast.error('Could not load fuzzy rules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_RULE, ruleId: `r${(rules.length + 1).toString().padStart(2,'0')}` });
    setShowForm(true);
  };

  const openEdit = (rule) => {
    setEditing(rule.id);
    setForm({
      ruleId:          rule.ruleId || '',
      ph:              rule.ph || 'optimal',
      moisture:        rule.moisture || 'moderate',
      visualCondition: rule.visualCondition || 'good',
      fertilityClass:  rule.fertilityClass || 'fertile',
      strength:        rule.strength ?? 1.0,
      description:     rule.description || '',
      isActive:        rule.isActive ?? true,
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.ruleId.trim()) { toast.error('Rule ID is required.'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/fuzzy-rules/${editing}`, form);
        toast.success('Rule updated!');
      } else {
        await api.post('/admin/fuzzy-rules', form);
        toast.success('Rule added!');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (rule) => {
    try {
      await api.put(`/admin/fuzzy-rules/${rule.id}`, { isActive: !rule.isActive });
      toast.success(rule.isActive ? 'Rule disabled.' : 'Rule enabled.');
      load();
    } catch {
      toast.error('Toggle failed.');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/admin/fuzzy-rules/${deleteId}`);
      toast.success('Rule deleted.');
      setDeleteId(null);
      load();
    } catch {
      toast.error('Delete failed.');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <LoadingSpinner size="lg" message="Loading fuzzy rules..." />
    </div>
  );

  const activeCount   = rules.filter(r => r.isActive).length;
  const inactiveCount = rules.length - activeCount;

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Fuzzy Rules</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeCount} active · {inactiveCount} disabled · {rules.length} total
          </p>
        </div>
        <button onClick={openNew} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> Add Rule
        </button>
      </div>

      {/* How rules work */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <strong>How fuzzy rules work:</strong> Each rule says "IF soil pH is [X] AND moisture is [Y] AND image condition is [Z], THEN fertility is [class]."
          The <em>strength</em> (0–1) controls how much weight this rule contributes to the final score.
          Rules are evaluated by the Python fuzzy engine on every assessment.
        </div>
      </div>

      {/* Rules table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">IF pH is...</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">AND Moisture is...</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">AND Visual is...</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">THEN Fertility =</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Strength</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Active</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rules.map(rule => (
              <tr key={rule.id} className={`hover:bg-gray-50 ${!rule.isActive ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{rule.ruleId}</td>
                <td className="px-4 py-3 capitalize text-gray-700">{rule.ph?.replace(/_/g,' ')}</td>
                <td className="px-4 py-3 capitalize text-gray-700">{rule.moisture?.replace(/_/g,' ')}</td>
                <td className="px-4 py-3 capitalize text-gray-700">{rule.visualCondition}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${CLASS_COLORS[rule.fertilityClass] || ''}`}>
                    {rule.fertilityClass}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{rule.strength?.toFixed(2)}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleActive(rule)}>
                    {rule.isActive
                      ? <ToggleRight className="w-6 h-6 text-green-500" />
                      : <ToggleLeft  className="w-6 h-6 text-gray-300" />}
                  </button>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(rule)}
                      className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(rule.id)}
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5" />
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
        <Modal title={editing ? 'Edit Fuzzy Rule' : 'Add Fuzzy Rule'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 font-mono">
              IF pH is <strong>{form.ph?.replace(/_/g,' ')}</strong>
              {' '}AND moisture is <strong>{form.moisture?.replace(/_/g,' ')}</strong>
              {' '}AND visual is <strong>{form.visualCondition}</strong>
              {' '}→ <strong className={`capitalize ${CLASS_COLORS[form.fertilityClass]?.split(' ')[1] || ''}`}>{form.fertilityClass}</strong>
              {' '}(strength: {form.strength})
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Rule ID *</label>
                <input className="input-field font-mono" value={form.ruleId}
                  onChange={e => setForm(f => ({...f, ruleId: e.target.value}))}
                  placeholder="e.g. r16" />
              </div>
              <div>
                <label className="input-label">Strength (0–1)</label>
                <input type="number" step="0.05" min="0" max="1" className="input-field"
                  value={form.strength}
                  onChange={e => setForm(f => ({...f, strength: parseFloat(e.target.value) || 0}))} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="input-label">pH Fuzzy Set</label>
                <select className="input-field" value={form.ph}
                  onChange={e => setForm(f => ({...f, ph: e.target.value}))}>
                  {PH_SETS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Moisture Fuzzy Set</label>
                <select className="input-field" value={form.moisture}
                  onChange={e => setForm(f => ({...f, moisture: e.target.value}))}>
                  {MOISTURE_SETS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Visual Condition</label>
                <select className="input-field" value={form.visualCondition}
                  onChange={e => setForm(f => ({...f, visualCondition: e.target.value}))}>
                  {VISUAL_SETS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="input-label">Resulting Fertility Class</label>
              <select className="input-field" value={form.fertilityClass}
                onChange={e => setForm(f => ({...f, fertilityClass: e.target.value}))}>
                {FERTILITY_CLASSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="input-label">Description (optional)</label>
              <input className="input-field" value={form.description}
                onChange={e => setForm(f => ({...f, description: e.target.value}))}
                placeholder="e.g. Optimal pH + moderate moisture + good visual → Fertile" />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="ruleActive" checked={form.isActive}
                onChange={e => setForm(f => ({...f, isActive: e.target.checked}))}
                className="w-4 h-4 rounded text-green-600" />
              <label htmlFor="ruleActive" className="text-sm font-medium text-gray-700">
                Rule is active (used in assessments)
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? <LoadingSpinner size="sm" /> : <><Save className="w-4 h-4" /> Save Rule</>}
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
        <Modal title="Delete Rule?" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-600 mb-5">
            This will permanently remove the rule. Future assessments will not use it.
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
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
