/**
 * AssessmentHistory.jsx — Animated assessment history list
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Calendar, Filter, PlusCircle, ArrowRight, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import FertilityBadge from '../components/common/FertilityBadge';
import { SkeletonRow } from '../components/common/SkeletonLoader';
import assessmentService from '../services/assessmentService';

const FILTERS = [
  { value: 'all',      label: 'All' },
  { value: 'fertile',  label: '🟢 Fertile' },
  { value: 'moderate', label: '🟡 Moderate' },
  { value: 'poor',     label: '🔴 Poor' },
];

export default function AssessmentHistory() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [filterClass, setFilterClass] = useState('all');

  useEffect(() => {
    assessmentService.list(50)
      .then(res => setAssessments(res.data || []))
      .catch(() => setError('Could not load assessments. Please refresh.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = assessments.filter(a => {
    const matchSearch =
      !search ||
      a.assessmentId?.toLowerCase().includes(search.toLowerCase()) ||
      a.location?.barangay?.toLowerCase().includes(search.toLowerCase()) ||
      a.bestRootcrop?.toLowerCase().includes(search.toLowerCase());
    const matchClass = filterClass === 'all' || a.fertilityClass?.toLowerCase() === filterClass;
    return matchSearch && matchClass;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Assessment History</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {assessments.length} total assessment{assessments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/assess/new" className="btn-primary text-sm">
          <PlusCircle className="w-4 h-4" /> New Assessment
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up" style={{ animationDelay: '50ms', animationFillMode: 'both' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" className="input-field pl-10"
            placeholder="Search by ID, barangay, or crop..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.value}
              onClick={() => setFilterClass(f.value)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border
                          transition-all duration-200 hover:scale-[1.02] active:scale-95
                          ${filterClass === f.value
                            ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="card space-y-1 divide-y divide-gray-50">
          {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700 animate-scale-in">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="card text-center py-14 animate-scale-in">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {search || filterClass !== 'all'
              ? <Filter className="w-6 h-6 text-gray-300" />
              : <ClipboardList className="w-6 h-6 text-gray-300" />}
          </div>
          <h3 className="font-bold text-gray-700 mb-1">
            {search || filterClass !== 'all' ? 'No matching assessments' : 'No assessments yet'}
          </h3>
          <p className="text-xs text-gray-400 mb-5">
            {search || filterClass !== 'all'
              ? 'Try adjusting your search or filter.'
              : 'Create your first soil assessment.'}
          </p>
          {!search && filterClass === 'all' && (
            <Link to="/assess/new" className="btn-primary text-sm px-5 py-2.5 inline-flex">
              <PlusCircle className="w-4 h-4" /> New Assessment
            </Link>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="card p-0 overflow-hidden animate-fade-in-up"
             style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          <ul className="divide-y divide-gray-50/80">
            {filtered.map((a, i) => {
              const ts = a.createdAt?._seconds
                ? new Date(a.createdAt._seconds * 1000)
                : a.createdAt ? new Date(a.createdAt) : null;
              const scoreColor =
                a.fertilityClass === 'fertile'  ? 'bg-green-500' :
                a.fertilityClass === 'moderate' ? 'bg-amber-500' : 'bg-red-500';

              return (
                <li key={a.assessmentId}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}>
                  <Link
                    to={`/assessments/${a.assessmentId}`}
                    className="flex items-center justify-between px-5 py-4
                               hover:bg-gray-50/80 transition-all duration-150 group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Score pill */}
                      <div className={`w-10 h-10 rounded-xl ${scoreColor}
                                      flex items-center justify-center flex-shrink-0
                                      text-white text-sm font-black shadow-sm
                                      group-hover:scale-110 transition-transform duration-200`}>
                        {a.fertilityScore ?? '—'}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <FertilityBadge classification={a.fertilityClass} size="sm" showEmoji={false} />
                          {a.hasLabValidation && (
                            <span className="text-[10px] bg-blue-100 text-blue-600
                                             px-1.5 py-0.5 rounded-full font-bold">Lab ✓</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                          {a.location?.barangay && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{a.location.barangay}
                            </span>
                          )}
                          {ts && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />{format(ts, 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      {a.bestRootcrop && (
                        <span className="text-[11px] font-semibold text-green-600 hidden sm:block">
                          🥇 {a.bestRootcrop}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-gray-200 hidden lg:block">
                        {a.assessmentId}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-200
                                             group-hover:text-green-400 group-hover:translate-x-0.5
                                             transition-all duration-150" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
