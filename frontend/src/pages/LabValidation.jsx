/**
 * LabValidation.jsx — Enter and review laboratory soil analysis results
 *
 * Extension workers and researchers can:
 *   - Search for an assessment by ID
 *   - Enter lab results (fertility class, pH, organic matter, NPK)
 *   - See which assessments are already validated
 */

import { useState, useEffect } from 'react';
import { FlaskConical, Search, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

import FertilityBadge from '../components/common/FertilityBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import assessmentService from '../services/assessmentService';

export default function LabValidation() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const [labForm, setLabForm] = useState({ labFertilityClass: '', labPH: '', labNitrogen: '', labPhosphorus: '', labPotassium: '', labOrganicMatter: '', labSoilTexture: '', notes: '' });
  const [submitting, setSubmitting]   = useState(false);
  const [search, setSearch]           = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await assessmentService.list(50);
        setAssessments(res.data || []);
      } catch {
        toast.error('Could not load assessments.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = assessments.filter(a =>
    !search ||
    a.assessmentId?.toLowerCase().includes(search.toLowerCase()) ||
    a.location?.barangay?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectAssessment = (a) => {
    setSelected(a);
    setLabForm({ labFertilityClass: '', labPH: '', labNitrogen: '', labPhosphorus: '', labPotassium: '', labOrganicMatter: '', labSoilTexture: '', notes: '' });
  };

  const handleSubmitLab = async (e) => {
    e.preventDefault();
    if (!labForm.labFertilityClass) {
      toast.error('Please select the lab fertility classification.');
      return;
    }
    if (labForm.labPH && (parseFloat(labForm.labPH) < 0 || parseFloat(labForm.labPH) > 14)) {
      toast.error('Lab pH must be between 0 and 14.');
      return;
    }
    setSubmitting(true);
    try {
      await assessmentService.enterLabResult(selected.assessmentId, {
        ...labForm,
        labPH: labForm.labPH ? parseFloat(labForm.labPH) : undefined,
      });
      toast.success('Lab result saved successfully!');
      // Refresh list
      const res = await assessmentService.list(50);
      setAssessments(res.data || []);
      setSelected(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save lab result.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Laboratory Validation</h1>
        <p className="text-sm text-gray-500 mt-0.5">Enter lab results to evaluate SoilSense classification accuracy</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">

        {/* Left: Assessment list */}
        <div className="card space-y-3">
          <h3 className="section-title">Select Assessment</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input-field pl-9 text-sm" placeholder="Search by ID or location..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {loading ? <LoadingSpinner size="md" /> : (
            <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {filtered.map(a => {
                const createdAt = a.createdAt?._seconds ? new Date(a.createdAt._seconds * 1000) : new Date(a.createdAt);
                return (
                  <li key={a.assessmentId}>
                    <button
                      onClick={() => handleSelectAssessment(a)}
                      className={`w-full text-left px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors ${selected?.assessmentId === a.assessmentId ? 'bg-green-50 border border-green-200' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-gray-400">{a.assessmentId}</span>
                        {a.hasLabValidation && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Check className="w-3 h-3" /> Validated</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <FertilityBadge classification={a.fertilityClass} size="sm" />
                        <span className="text-xs text-gray-500">{a.location?.barangay || 'Unknown'}</span>
                        <span className="text-xs text-gray-400">{format(createdAt, 'MMM d')}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right: Lab form */}
        <div className="card">
          {!selected ? (
            <div className="text-center py-12 text-gray-400">
              <FlaskConical className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">Select an assessment to enter lab results</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitLab} className="space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 mb-0.5">Lab Results for {selected.assessmentId}</h3>
                <p className="text-xs text-gray-500">Enter the laboratory soil analysis results below.</p>
              </div>

              {selected.hasLabValidation && (
                <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  This assessment already has a lab result. Submitting will update it.
                </div>
              )}

              <div>
                <label className="input-label">Lab Fertility Classification *</label>
                <select className="input-field" value={labForm.labFertilityClass} onChange={e => setLabForm(f => ({...f, labFertilityClass: e.target.value}))}>
                  <option value="">-- Select --</option>
                  <option value="poor">Poor</option>
                  <option value="moderate">Moderate</option>
                  <option value="fertile">Fertile</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Lab pH (0–14)</label>
                  <input type="number" className="input-field" placeholder="6.2" min="0" max="14" step="0.01"
                    value={labForm.labPH} onChange={e => setLabForm(f => ({...f, labPH: e.target.value}))} />
                </div>
                <div>
                  <label className="input-label">Organic Matter (%)</label>
                  <input type="text" className="input-field" placeholder="e.g. 3.2%"
                    value={labForm.labOrganicMatter} onChange={e => setLabForm(f => ({...f, labOrganicMatter: e.target.value}))} />
                </div>
                <div>
                  <label className="input-label">Nitrogen (N)</label>
                  <input type="text" className="input-field" placeholder="e.g. Low, Medium, High"
                    value={labForm.labNitrogen} onChange={e => setLabForm(f => ({...f, labNitrogen: e.target.value}))} />
                </div>
                <div>
                  <label className="input-label">Phosphorus (P)</label>
                  <input type="text" className="input-field" placeholder="e.g. Medium"
                    value={labForm.labPhosphorus} onChange={e => setLabForm(f => ({...f, labPhosphorus: e.target.value}))} />
                </div>
                <div>
                  <label className="input-label">Potassium (K)</label>
                  <input type="text" className="input-field" placeholder="e.g. High"
                    value={labForm.labPotassium} onChange={e => setLabForm(f => ({...f, labPotassium: e.target.value}))} />
                </div>
                <div>
                  <label className="input-label">Soil Texture</label>
                  <select className="input-field" value={labForm.labSoilTexture || ''}
                    onChange={e => setLabForm(f => ({...f, labSoilTexture: e.target.value}))}>
                    <option value="">-- Select --</option>
                    <option value="sandy">Sandy</option>
                    <option value="sandy_loam">Sandy Loam</option>
                    <option value="loam">Loam</option>
                    <option value="clay_loam">Clay Loam</option>
                    <option value="clay">Clay</option>
                    <option value="silty_clay">Silty Clay</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">Notes</label>
                <textarea className="input-field resize-none" rows={2} placeholder="Lab name, date, analyst, etc."
                  value={labForm.notes} onChange={e => setLabForm(f => ({...f, notes: e.target.value}))} />
              </div>

              <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                Enter only actual laboratory values. Do not fabricate data.
              </div>

              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? <LoadingSpinner size="sm" /> : <><FlaskConical className="w-4 h-4" /> Save Lab Result</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
