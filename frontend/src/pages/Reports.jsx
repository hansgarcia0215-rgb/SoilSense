/**
 * Reports.jsx — Report generation & export hub
 *
 * Lets users:
 *  - Download a PDF report for any past assessment
 *  - Export the full dataset as CSV (admins and extension workers)
 *  - Understand what each report contains
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Download, Search, Calendar, MapPin, FileSpreadsheet, Info
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import FertilityBadge from '../components/common/FertilityBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import assessmentService from '../services/assessmentService';
import api from '../services/api';
import { generatePDFReport } from '../utils/reportGenerator';

export default function Reports() {
  const { isAdmin, isExtensionWorker } = useAuth();
  const canExportCSV = isAdmin || isExtensionWorker;

  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    assessmentService.list(100)
      .then(res => setAssessments(res.data || []))
      .catch(() => toast.error('Could not load assessments.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = assessments.filter(a =>
    !search ||
    a.assessmentId?.toLowerCase().includes(search.toLowerCase()) ||
    a.location?.barangay?.toLowerCase().includes(search.toLowerCase()) ||
    a.bestRootcrop?.toLowerCase().includes(search.toLowerCase())
  );

  // Download a PDF for a single assessment (fetches full detail first)
  const handlePDF = async (assessmentId) => {
    setDownloadingId(assessmentId);
    try {
      const res = await assessmentService.getById(assessmentId);
      await generatePDFReport(res.data);
      toast.success('Report downloaded!');
    } catch {
      toast.error('Could not generate report.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCSV = async () => {
    try {
      toast.loading('Preparing CSV...', { id: 'csv' });
      const res = await api.get('/analytics/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `soilsense_dataset_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Dataset exported!', { id: 'csv' });
    } catch {
      toast.error('Export failed.', { id: 'csv' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Download individual PDF reports or export the full dataset</p>
      </div>

      {/* What's in a report */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Each PDF report includes:</p>
          <p className="text-xs">
            Assessment details, soil fertility result &amp; score, key measurements (pH, moisture, image quality),
            fuzzy logic analysis, fertilizer recommendation, full crop suitability ranking, system limitations,
            and laboratory validation (if available).
          </p>
        </div>
      </div>

      {/* CSV export card (admins/extension workers) */}
      {canExportCSV && (
        <div className="card flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">Export Full Dataset (CSV)</p>
              <p className="text-xs text-gray-500">All assessments with soil data, results, and lab validation — for analysis in Excel or SPSS.</p>
            </div>
          </div>
          <button onClick={handleCSV} className="btn-primary text-sm flex-shrink-0">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input className="input-field pl-9" placeholder="Search assessments to download..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Assessment list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" message="Loading..." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-2 text-gray-200" />
          <p className="text-sm">No assessments found.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {filtered.map(a => {
              const createdAt = a.createdAt?._seconds
                ? new Date(a.createdAt._seconds * 1000)
                : a.createdAt ? new Date(a.createdAt) : null;
              return (
                <li key={a.assessmentId} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <FertilityBadge classification={a.fertilityClass} size="sm" />
                      <span className="text-sm font-bold text-gray-900">{a.fertilityScore}/100</span>
                      <span className="text-xs font-mono text-gray-300">{a.assessmentId}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      {a.location?.barangay && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{a.location.barangay}</span>}
                      {createdAt && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(createdAt, 'MMM d, yyyy')}</span>}
                      {a.bestRootcrop && <span className="text-green-600 font-medium">🥇 {a.bestRootcrop}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <Link to={`/assessments/${a.assessmentId}`} className="btn-ghost text-xs px-3 py-1.5">View</Link>
                    <button onClick={() => handlePDF(a.assessmentId)}
                      disabled={downloadingId === a.assessmentId}
                      className="btn-secondary text-xs px-3 py-1.5">
                      {downloadingId === a.assessmentId
                        ? <LoadingSpinner size="sm" />
                        : <><Download className="w-3.5 h-3.5" /> PDF</>}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
