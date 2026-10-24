/**
 * Dashboard.jsx — Production dashboard with animated stat cards,
 * count-up numbers, fertility trend, and latest soil hero card.
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle, ClipboardList, TrendingUp, TrendingDown,
  Minus, Leaf, ArrowRight, MapPin, Calendar, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import FertilityBadge from '../components/common/FertilityBadge';
import AssessmentPhoto from '../components/common/AssessmentPhoto';
import { SkeletonStatCard, SkeletonRow } from '../components/common/SkeletonLoader';
import FertilityTrendChart from '../components/charts/FertilityTrendChart';
import api from '../services/api';
import { format } from 'date-fns';

/** Animated count-up hook */
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (target == null || started.current) return;
    started.current = true;
    const n = parseFloat(target);
    if (isNaN(n) || n === 0) { setVal(n || 0); return; }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out-cubic
      setVal(Math.round(n * ease * 10) / 10);
      if (t < 1) requestAnimationFrame(tick);
      else setVal(n);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

function StatCard({ icon, iconBg, label, value, small, delay = 0 }) {
  const animated = useCountUp(typeof value === 'number' ? value : null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div className={`card-hover transition-all duration-500
                     ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center mb-3
                       group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className={`font-black text-gray-900 tabular-nums ${small ? 'text-lg' : 'text-2xl'}`}>
        {typeof value === 'number' ? animated : value || '—'}
      </div>
      <div className="text-xs text-gray-500 mt-0.5 font-medium">{label}</div>
    </div>
  );
}

function TrendPill({ direction }) {
  const cfg = {
    improving: { icon: <TrendingUp className="w-3.5 h-3.5" />,   text: 'Improving',  cls: 'bg-green-100 text-green-700' },
    declining: { icon: <TrendingDown className="w-3.5 h-3.5" />, text: 'Declining',  cls: 'bg-red-100   text-red-600'   },
    stable:    { icon: <Minus className="w-3.5 h-3.5" />,        text: 'Stable',     cls: 'bg-gray-100  text-gray-600'  },
  }[direction];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                      text-xs font-semibold ${cfg.cls}`}>
      {cfg.icon} {cfg.text}
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats,  setStats]  = useState(null);
  const [recent, setRecent] = useState([]);
  const [trend,  setTrend]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/analytics/summary'),
      api.get('/assessments?limit=5'),
      api.get('/analytics/trend'),
    ]).then(([s, r, t]) => {
      setStats(s.data.data);
      setRecent(r.data.data || []);
      setTrend(t.data.data);
    }).catch(err => {
      console.error(err);
      setError('Unable to load dashboard data. Please refresh.');
    }).finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const latest = recent[0];

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* ── Hero header — editorial ─────────────────────────── */}
      <div className="relative card overflow-hidden p-6 animate-fade-in-up">
        <div className="absolute top-0 right-0 w-56 h-56 bg-cream-deep/50 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-100/60 rounded-full blur-2xl" />

        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="hand-accent text-2xl leading-none mb-1">{greeting},</p>
            <h1 className="text-3xl md:text-4xl text-ink leading-tight">
              {user?.displayName?.split(' ')[0] || 'Farmer'}
            </h1>
            <p className="text-ink-faint text-xs mt-2 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              {user?.barangay ? `${user.barangay}, ` : ''}{user?.municipality || 'Roxas'}, Oriental Mindoro
            </p>
          </div>
          <Link to="/assess/new"
            className="btn-primary flex-shrink-0 group">
            <PlusCircle className="w-4 h-4" />
            New Assessment
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700
                        animate-scale-in">
          {error}
        </div>
      )}

      {/* ── Stat cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? [...Array(4)].map((_, i) => <SkeletonStatCard key={i} />) : (
          <>
            <StatCard icon={<ClipboardList className="w-5 h-5 text-blue-600" />}  iconBg="bg-blue-50"   label="Total Assessments"   value={stats?.totalAssessments ?? 0} delay={0} />
            <StatCard icon={<Calendar      className="w-5 h-5 text-purple-600" />} iconBg="bg-purple-50" label="This Week"            value={stats?.thisWeek ?? 0}          delay={80} />
            <StatCard icon={<TrendingUp    className="w-5 h-5 text-amber-600" />}  iconBg="bg-amber-50"  label="Avg Fertility Score"  value={stats?.avgFertilityScore ? parseFloat(stats.avgFertilityScore.toFixed(1)) : null} delay={160} />
            <StatCard icon={<Leaf          className="w-5 h-5 text-green-600" />}  iconBg="bg-green-50"  label="Top Recommended Crop" value={stats?.topRecommendedCrop || '—'} small delay={240} />
          </>
        )}
      </div>

      {/* ── Latest soil + Trend ─────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Latest soil hero */}
        {latest && (
          <Link to={`/assessments/${latest.assessmentId}`}
            className="card-hover block group animate-fade-in-up"
            style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-green-500" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Latest Assessment</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto
                                     group-hover:text-green-500 group-hover:translate-x-1
                                     transition-all duration-200" />
            </div>

            <div className="flex items-center gap-4">
              <AssessmentPhoto
                assessmentId={latest.assessmentId}
                src={latest.imageUrl}
                alt={`Soil sample for assessment ${latest.assessmentId}`}
                className="h-24 w-28 flex-shrink-0 rounded-2xl object-cover"
              />
              {/* Score circle */}
              <div className="relative flex-shrink-0 w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#f3f4f6" strokeWidth="6" />
                  <circle cx="32" cy="32" r="28" fill="none"
                    stroke={latest.fertilityClass === 'fertile' ? '#4a652e' : latest.fertilityClass === 'moderate' ? '#b0722a' : '#a8402f'}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${(latest.fertilityScore / 100) * 175.9} 175.9`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-black text-gray-900">{latest.fertilityScore}</span>
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <FertilityBadge classification={latest.fertilityClass} size="sm" />
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {latest.location?.barangay || 'Roxas'}
                </p>
                {latest.bestRootcrop && (
                  <p className="text-xs font-semibold text-green-600">🥇 {latest.bestRootcrop}</p>
                )}
                {trend?.trendDirection && trend.count >= 2 && (
                  <TrendPill direction={trend.trendDirection} />
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Trend chart */}
        {trend?.points?.length >= 2 && (
          <div className="card animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Fertility Over Time
              </span>
              <span className="text-xs text-gray-500 font-mono">{trend.count} pts</span>
            </div>
            <FertilityTrendChart points={trend.points} />
          </div>
        )}
      </div>

      {/* ── Recent assessments ──────────────────────────────── */}
      <div className="card animate-fade-in-up" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Recent Assessments
          </span>
          <Link to="/history"
            className="text-xs text-green-600 font-semibold hover:text-green-700
                       flex items-center gap-1 group">
            View all
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-1 divide-y divide-gray-50">
            {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : recent.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <ClipboardList className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-600 mb-1">No assessments yet</p>
            <p className="text-xs text-gray-500 mb-4">Start your first soil assessment</p>
            <Link to="/assess/new" className="btn-primary text-xs px-4 py-2">
              <PlusCircle className="w-3.5 h-3.5" /> New Assessment
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {recent.map((a, i) => {
              const ts = a.createdAt?._seconds ? new Date(a.createdAt._seconds * 1000) : new Date(a.createdAt);
              return (
                <li key={a.assessmentId}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
                  <Link to={`/assessments/${a.assessmentId}`}
                    className="flex items-center justify-between py-3 -mx-1 px-1
                               rounded-xl hover:bg-gray-50 transition-all duration-150 group">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <AssessmentPhoto
                        assessmentId={a.assessmentId}
                        src={a.imageUrl}
                        alt={`Soil sample for assessment ${a.assessmentId}`}
                        className="h-12 w-14 flex-shrink-0 rounded-xl object-cover"
                      />
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                                      text-white text-xs font-black
                                      ${a.fertilityClass === 'fertile'  ? 'bg-green-600' :
                                        a.fertilityClass === 'moderate' ? 'bg-soil-500' : 'bg-[#a8402f]'}`}>
                        {a.fertilityScore}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <FertilityBadge classification={a.fertilityClass} size="sm" showEmoji={false} />
                          {a.hasLabValidation && (
                            <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5
                                             rounded-full font-semibold">Lab</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {a.location?.barangay || 'Roxas'} · {format(ts, 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      {a.bestRootcrop && (
                        <p className="text-[11px] font-semibold text-green-600">🥇 {a.bestRootcrop}</p>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-gray-200 ml-auto mt-1
                                             group-hover:text-green-400 group-hover:translate-x-0.5
                                             transition-all duration-150" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Tips ────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { emoji: '📸', title: 'Good lighting', desc: 'Avoid shadows when capturing soil photos' },
          { emoji: '🔌', title: 'Use ESP32 sensor', desc: 'pH + moisture data improves accuracy' },
          { emoji: '📍', title: 'Allow GPS', desc: 'Enable location for Roxas-specific results' },
          { emoji: '🧪', title: 'Validate with lab', desc: 'For high-stakes decisions, test in laboratory' },
        ].map((tip, i) => (
          <div key={tip.title}
            className="card animate-fade-in-up"
            style={{ animationDelay: `${200 + i * 60}ms`, animationFillMode: 'both' }}>
            <div className="text-2xl mb-2">{tip.emoji}</div>
            <p className="text-xs font-bold text-gray-700 mb-0.5">{tip.title}</p>
            <p className="text-xs text-gray-500">{tip.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
