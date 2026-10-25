/**
 * ResearchAnalytics.jsx — System administrator dashboard
 *
 * Shows accuracy metrics, processing times, fertility distribution,
 * and allows exporting the dataset.
 */

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { FlaskConical, Clock, Target, TrendingUp, Download, Sprout } from 'lucide-react';
import toast from 'react-hot-toast';

import LoadingSpinner from '../components/common/LoadingSpinner';
import api from '../services/api';

const FERTILITY_COLORS = { fertile: '#d8ff70', moderate: '#e2cfa4', poor: '#c96a4e' };

export default function ResearchAnalytics() {
  const [summary, setSummary]     = useState(null);
  const [accuracy, setAccuracy]   = useState(null);
  const [timing, setTiming]       = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sumRes, accRes, timeRes] = await Promise.all([
          api.get('/analytics/summary'),
          api.get('/analytics/accuracy'),
          api.get('/analytics/processing-times'),
        ]);
        setSummary(sumRes.data.data);
        setAccuracy(accRes.data.data);
        setTiming(timeRes.data.data);
      } catch (err) {
        console.error('Analytics load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <LoadingSpinner size="lg" message="Loading analytics..." />
    </div>
  );

  const distData = summary?.fertilityDistribution
    ? Object.entries(summary.fertilityDistribution).map(([k, v]) => ({
        name: k.charAt(0).toUpperCase() + k.slice(1), value: v, key: k,
      }))
    : [];

  const classNames = ['poor', 'moderate', 'fertile'];

  const handleExport = async () => {
    try {
      toast.loading('Preparing CSV...', { id: 'csv' });
      const res = await api.get('/analytics/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `soilsense_dataset_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Dataset exported!', { id: 'csv' });
    } catch {
      toast.error('Export failed. Please try again.', { id: 'csv' });
    }
  };

  return (
    <div className="mc max-w-5xl mx-auto space-y-6">

      <div className="flex items-center justify-between flex-wrap gap-3 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Research Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">System performance, accuracy metrics, and data distribution</p>
        </div>
        <button onClick={handleExport}
          className="btn-secondary text-sm hover:shadow-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Target className="w-5 h-5 text-green-600" />}  iconBg="bg-green-100" label="Total Assessments"   value={summary?.totalAssessments ?? '—'} />
        <StatCard icon={<FlaskConical className="w-5 h-5 text-blue-600" />}  iconBg="bg-blue-100" label="Lab Validated"   value={accuracy?.totalValidated ?? 0} />
        <StatCard icon={<TrendingUp className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-100" label="Classification Accuracy" value={accuracy?.accuracy != null ? `${accuracy.accuracy}%` : '—'} />
        <StatCard icon={<Clock className="w-5 h-5 text-purple-600" />}  iconBg="bg-purple-100" label="Avg Processing Time"  value={timing?.avgTotalMs != null ? `${(timing.avgTotalMs/1000).toFixed(1)}s` : '—'} />
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-5">

        {/* Fertility distribution pie */}
        <div className="card">
          <h3 className="section-title">Fertility Classification Distribution</h3>
          {distData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={distData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {distData.map((entry) => (
                    <Cell key={entry.key} fill={FERTILITY_COLORS[entry.key] || '#6b7280'} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-500 text-center py-8">No data yet</p>}
        </div>

        {/* Most recommended crops */}
        <div className="card">
          <h3 className="section-title">Most Recommended Crops</h3>
          {summary?.topRecommendedCrops?.length > 0 ? (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                Crops ranked first across completed soil assessments.
              </p>
              {summary.topRecommendedCrops.map((crop, index) => (
                <div key={crop.cropName}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-700">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                        <Sprout className="h-3.5 w-3.5" />
                      </span>
                      <span className="truncate">{crop.cropName}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-gray-500">
                      {crop.count} assessment{crop.count === 1 ? '' : 's'} · {crop.percentage}%
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-gray-100"
                    role="progressbar"
                    aria-label={`${crop.cropName} recommendation share`}
                    aria-valuenow={crop.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className={`h-full rounded-full ${index === 0 ? 'bg-green-600' : 'bg-green-300'}`}
                      style={{ width: `${crop.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Sprout className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No crop recommendations yet.</p>
              <p className="mt-1 text-xs text-gray-500">Completed assessments will show the most frequently recommended crops here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Confusion matrix */}
      {accuracy?.confusionMatrix && accuracy.totalValidated > 0 && (
        <div className="card">
          <h3 className="section-title">Confusion Matrix</h3>
          <p className="text-xs text-gray-500 mb-3">Rows = actual lab class · Columns = SoilSense predicted class</p>
          <div className="overflow-x-auto">
            <table className="text-sm text-center">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-xs text-gray-500 font-normal">Actual ↓ / Predicted →</th>
                  {classNames.map(c => (
                    <th key={c} className="px-4 py-2 font-bold capitalize text-gray-700">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {classNames.map(actual => (
                  <tr key={actual}>
                    <td className="px-4 py-2 font-bold capitalize text-gray-700 text-right">{actual}</td>
                    {classNames.map(predicted => {
                      const val = accuracy.confusionMatrix[actual]?.[predicted] ?? 0;
                      const isDiag = actual === predicted;
                      return (
                        <td key={predicted} className={`px-4 py-2 font-bold rounded
                          ${isDiag && val > 0 ? 'bg-green-100 text-green-700' :
                            !isDiag && val > 0 ? 'bg-red-100 text-red-600' : 'text-gray-300'}`}>
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Processing times */}
      {timing && (
        <div className="card">
          <h3 className="section-title">Processing Performance (Last 100 Assessments)</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-black text-gray-900">
                {timing.avgTotalMs != null ? `${(timing.avgTotalMs/1000).toFixed(1)}s` : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Average</div>
            </div>
            <div>
              <div className="text-2xl font-black text-green-600">
                {timing.minMs != null ? `${(timing.minMs/1000).toFixed(1)}s` : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Fastest</div>
            </div>
            <div>
              <div className="text-2xl font-black text-amber-600">
                {timing.maxMs != null ? `${(timing.maxMs/1000).toFixed(1)}s` : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Slowest</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function StatCard({ icon, iconBg, label, value }) {
  return (
    <div className="card">
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center mb-3`}>{icon}</div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
