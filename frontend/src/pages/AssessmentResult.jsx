/**
 * AssessmentResult.jsx — Production result page with animations
 *
 * Layout:
 *   1. Header bar
 *   2. Fertility hero card (compact + measurements side-by-side)
 *   3. Crop Recommendation cards (top priority)
 *   4. Fertilizer (collapsed accordion)
 *   5. Technical / Fuzzy details (collapsed)
 *   6. Disclaimer + Actions
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, PlusCircle, Share2, FlaskConical,
  ChevronDown, AlertTriangle, MapPin, Calendar, Info, Leaf
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import FertilityBadge     from '../components/common/FertilityBadge';
import AssessmentPhoto    from '../components/common/AssessmentPhoto';
import LoadingSpinner     from '../components/common/LoadingSpinner';
import { SkeletonResult } from '../components/common/SkeletonLoader';
import CropResult         from '../components/assessment/CropResult';
import CropComparison     from '../components/assessment/CropComparison';
import assessmentService  from '../services/assessmentService';
import { generatePDFReport } from '../utils/reportGenerator';

export default function AssessmentResult() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  const [showComparison,  setShowComparison]  = useState(false);
  const [showTechnical,   setShowTechnical]   = useState(false);
  const [showAllCrops,    setShowAllCrops]    = useState(false);

  useEffect(() => {
    assessmentService.getById(id)
      .then(res => setData(res.data))
      .catch(() => setError('Assessment not found or you do not have access.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = async () => {
    try { await generatePDFReport(data); toast.success('Report downloaded!'); }
    catch { toast.error('Could not generate report.'); }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: `SoilSense ${data?.assessmentId}`, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied!');
    }
  };

  if (loading) return (
    <div className="animate-fade-in">
      <SkeletonResult />
    </div>
  );

  if (error) return (
    <div className="max-w-lg mx-auto text-center py-16 animate-scale-in">
      <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <h2 className="text-lg font-black text-gray-900 mb-2">Assessment Not Found</h2>
      <p className="text-gray-500 text-sm mb-6">{error}</p>
      <Link to="/history" className="btn-primary text-sm">Back to History</Link>
    </div>
  );

  const f      = data.fuzzyResult    || {};
  const sensor = data.sensorData     || {};
  const img    = data.imageFeatures  || {};
  const serviceStatus = data.serviceStatus || {};
  const loc    = data.location       || {};
  const crops = data.rootcropResults?.length
    ? data.rootcropResults
    : data.cropRecommendations?.length
      ? data.cropRecommendations
      : [];
  const allCrops = data.allCropsRanked || [];
  const fert   = data.aiFertilizerRecommendation;

  const displayPH          = sensor.soilPH          ?? data.fuzzyInputs?.ph          ?? null;
  const displayMoisture    = sensor.soilMoisture    ?? data.fuzzyInputs?.moisture    ?? null;
  const displayTemperature = sensor.soilTemperature ?? data.fuzzyInputs?.temperature ?? null;

  const createdAt = data.createdAt?._seconds
    ? new Date(data.createdAt._seconds * 1000)
    : new Date(data.createdAt);

  const fClass = f.fertilityClass || 'moderate';
  const fertGradient =
    fClass === 'fertile'  ? 'from-green-500 to-emerald-600' :
    fClass === 'moderate' ? 'from-amber-400 to-orange-500'  : 'from-red-500 to-rose-600';
  const fertBg =
    fClass === 'fertile'  ? 'from-green-50 to-emerald-50/60' :
    fClass === 'moderate' ? 'from-amber-50 to-yellow-50/60'  : 'from-red-50  to-rose-50/60';
  const fertBorder =
    fClass === 'fertile'  ? 'border-green-200' :
    fClass === 'moderate' ? 'border-amber-200' : 'border-red-200';

  const bestCrop = crops.find(c => c.status === 'BEST' || c.status === 'CLOSEST');
  const fertilizerCrop = crops.find(c => c.cropId === data.fertilizerRecommendationCropId) || bestCrop;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2 animate-fade-in-up">
        <button onClick={() => navigate(-1)} className="btn-ghost text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleShare} className="btn-ghost text-sm">
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button onClick={handleDownload}
            className="btn-secondary text-sm px-4 py-2 hover:shadow-sm">
            <Download className="w-4 h-4" /> Report
          </button>
        </div>
      </div>

      {/* ── Fertility hero card ─────────────────────────────── */}
      <div
        className={`rounded-3xl border-2 bg-gradient-to-br ${fertBg} ${fertBorder}
                    overflow-hidden animate-fade-in-up`}
        style={{ animationDelay: '50ms', animationFillMode: 'both' }}
      >
        {/* Top accent bar */}
        <div className={`h-1 bg-gradient-to-r ${fertGradient}`} />

        <div className="p-5">
          {/* Meta row */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-gray-500 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />{format(createdAt, 'MMM d, yyyy')}
              </span>
              <span className="font-mono bg-white/60 px-1.5 py-0.5 rounded-lg">
                {data.assessmentId}
              </span>
              {loc.barangay && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{loc.barangay}
                </span>
              )}
            </div>
            {data.farmerName && (
              <span className="font-semibold text-gray-600">{data.farmerName}</span>
            )}
          </div>

          {/* Main content: score + tiles */}
          <div className="flex items-center gap-5 flex-wrap sm:flex-nowrap">
            {/* Score */}
            <div className="flex-shrink-0 text-center">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Soil Fertility
              </div>
              <FertilityBadge classification={fClass} size="md" />
              {/* SVG arc score */}
              <div className="relative w-24 h-24 mx-auto mt-2">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                  <circle cx="48" cy="48" r="40" fill="none"
                    stroke={fClass === 'fertile' ? '#22c55e' : fClass === 'moderate' ? '#f59e0b' : '#ef4444'}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${((f.fertilityScore ?? 0) / 100) * 251.3} 251.3`}
                    style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-gray-900 leading-none tabular-nums">
                    {f.fertilityScore ?? 50}
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium">/100</span>
                </div>
              </div>
              <div className={`text-xs font-semibold mt-1.5
                ${f.confidenceLevel === 'high' ? 'text-green-600' : 'text-amber-500'}`}>
                {f.confidenceLevel === 'high' ? '🎯' : '⚠️'} {f.confidence ?? 40}% conf.
              </div>
            </div>

            {/* Measurement tiles */}
            <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
              <MeasTile
                label="Soil pH"
                value={displayPH != null ? Number(displayPH).toFixed(1) : '—'}
                sub={f.phFuzzySet?.replace(/_/g, ' ') || (displayPH != null ? 'Measured' : 'Not measured')}
                color={displayPH != null ? 'text-blue-600' : 'text-gray-300'}
                bg="bg-white/70"
              />
              <MeasTile
                label="Moisture"
                value={displayMoisture != null ? `${Number(displayMoisture).toFixed(0)}%` : '—'}
                sub={f.moistureFuzzySet?.replace(/_/g, ' ') || (displayMoisture != null ? 'Measured' : 'Not measured')}
                color={displayMoisture != null ? 'text-teal-600' : 'text-gray-300'}
                bg="bg-white/70"
              />
              <MeasTile
                label="Temperature"
                value={displayTemperature != null ? `${Number(displayTemperature).toFixed(1)}°C` : '—'}
                sub={displayTemperature != null
                  ? Number(displayTemperature) < 20 ? 'Cool'
                  : Number(displayTemperature) < 30 ? 'Optimal'
                  : 'Warm'
                  : 'Not measured'}
                color={displayTemperature != null ? 'text-orange-500' : 'text-gray-300'}
                bg="bg-white/70"
              />
              <MeasTile
                label="Image"
                value={!img.imageQuality || img.imageQuality === 'unknown' ? 'Unavailable'
                  : img.imageQuality.charAt(0).toUpperCase() + img.imageQuality.slice(1)}
                sub={img.qualityScore != null ? `Score: ${(img.qualityScore * 100).toFixed(0)}%`
                  : (!img.imageQuality || img.imageQuality === 'unknown')
                    ? serviceStatus.imageProcessing?.message || 'Processing unavailable'
                    : '—'}
                color={img.imageQuality === 'good' ? 'text-green-600' :
                       img.imageQuality === 'moderate' ? 'text-amber-500' : 'text-gray-500'}
                bg="bg-white/70"
              />
              <MeasTile
                label="Location"
                value={loc.barangay || 'Unknown'}
                sub={loc.municipality || 'Roxas'}
                color="text-purple-600"
                bg="bg-white/70 col-span-2"
              />
            </div>
          </div>

          {/* Explanation */}
          {f.explanation && (
            <p className="text-xs text-gray-500 leading-relaxed mt-4 pt-4 border-t border-white/60">
              {f.explanation}
            </p>
          )}

          {/* Service warning */}
          {(!img.imageQuality || img.imageQuality === 'unknown') && (
            <div className="flex items-start gap-2 bg-white/60 rounded-xl p-3 mt-3 text-xs text-gray-500">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
              Image analysis was unavailable
              {serviceStatus.imageProcessing?.message
                ? `: ${serviceStatus.imageProcessing.message}`
                : '. Check the image-processing service configuration and retry.'}
            </div>
          )}
        </div>
      </div>

      <section className="card overflow-hidden p-0 animate-fade-in-up"
               aria-label="Uploaded soil photo">
        <AssessmentPhoto
          assessmentId={data.assessmentId}
          src={data.imageData?.imageUrl}
          alt={`Uploaded soil sample for assessment ${data.assessmentId}`}
          className="max-h-80 w-full bg-cream-sand object-cover"
        />
        <p className="px-4 py-3 text-xs font-medium text-gray-600">
          Uploaded soil photo · {data.assessmentId}
        </p>
      </section>

      {/* ── Crop Recommendation ─────────────────────────────── */}
      {crops.length > 0 && (
        <div className="space-y-3 animate-fade-in-up"
             style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          {/* Section header */}
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
              <Leaf className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-base">Crop Recommendation</h2>
              <p className="text-xs text-gray-500">
                Based on{' '}
                <span className={`font-bold capitalize
                  ${fClass === 'fertile' ? 'text-green-600' :
                    fClass === 'moderate' ? 'text-amber-600' : 'text-red-500'}`}>
                  {fClass}
                </span> soil
                {bestCrop && (
                  <> · Best match: <span className="font-bold text-green-600">{bestCrop.cropName}</span></>
                )}
              </p>
            </div>
          </div>

          {/* Crop cards */}
          {crops.map((crop, i) => (
            <CropResult key={crop.cropId || crop.rank} result={crop} index={i} />
          ))}

          {/* Compare button */}
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="w-full flex items-center justify-between px-4 py-3.5
                       bg-white/80 hover:bg-white border border-gray-100 hover:border-gray-200
                       rounded-2xl text-sm font-medium text-gray-600 hover:text-gray-900
                       transition-all duration-200 group"
          >
            <span>📊 Compare top three crops side-by-side</span>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300
                                     ${showComparison ? 'rotate-180' : ''}`} />
          </button>
          {showComparison && (
            <div className="card animate-slide-down">
              <CropComparison crops={crops} />
            </div>
          )}
          {/* Full crops ranking */}
          {allCrops.length > 3 && (
            <>
              <button
                onClick={() => setShowAllCrops(!showAllCrops)}
                className="w-full flex items-center justify-between px-4 py-3.5
                           bg-white/80 hover:bg-white border border-gray-100 hover:border-gray-200
                           rounded-2xl text-sm font-medium text-gray-600 hover:text-gray-900
                           transition-all duration-200"
              >
                <span>🌾 See all {allCrops.length} farm crops ranked</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300
                                         ${showAllCrops ? 'rotate-180' : ''}`} />
              </button>
              {showAllCrops && (
                <div className="card p-0 overflow-hidden animate-slide-down">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">#</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Crop</th>
                        <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Score</th>
                        <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {allCrops.map((c, i) => (
                        <tr key={c.cropId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 text-gray-300 font-mono text-xs">{i + 1}</td>
                          <td className="px-4 py-2.5">
                            <span className="font-semibold text-gray-800 text-sm">{c.cropName}</span>
                            {c.currentFarmCrop && <span className="ml-1.5 text-xs text-green-500">🌿</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`font-black text-sm tabular-nums
                              ${c.suitabilityScore >= 70 ? 'text-green-600' :
                                c.suitabilityScore >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                              {c.suitabilityScore?.toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full
                              ${c.meetsThreshold
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'}`}>
                              {c.meetsThreshold ? 'Suitable' : 'Below threshold'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-500 px-4 py-3 bg-gray-50 border-t border-gray-100">
                    🌿 = currently on farm · All scores driven by the{' '}
                    <span className="font-semibold capitalize">{fClass}</span> soil fertility result
                  </p>
                </div>
              )}
              {crops.length === 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-bold">Crop recommendations are unavailable</p>
                  <p className="mt-1 text-xs">
                    {serviceStatus.fuzzyEngine?.status === 'offline'
                      ? serviceStatus.fuzzyEngine.message
                      : data.activeCropCount === 0
                        ? 'No active crop records were sent for ranking. Confirm the crops collection is seeded and the crops are active, then submit a new assessment.'
                        : 'The fuzzy engine did not return crop recommendations. Confirm the latest fuzzy-engine deployment is running, then submit a new assessment.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Soil Improvement Plan ───────────────────────────── */}
      {(fClass === 'poor' || fClass === 'moderate') && (
        <SoilImprovementPlan fertilityClass={fClass} ph={displayPH} moisture={displayMoisture} />
      )}

      {/* ── Fertilizer (accordion) ──────────────────────────── */}
      <div className="card p-0 overflow-hidden animate-fade-in-up"
           style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-base">🌿</span>
            </div>
            <span className="font-bold text-gray-800 text-sm">Fertilizer Recommendation</span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
              Gemini AI
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Based on {fClass} soil fertility
            {fertilizerCrop?.cropName ? ` and the top-ranked crop, ${fertilizerCrop.cropName}` : ''}.
          </p>
        </div>
        {fert ? (
          <div className="px-5 pb-5 pt-4 space-y-3">
            {fert.summary && (
              <p className="text-sm text-gray-700 leading-relaxed">{fert.summary}</p>
            )}
            {fert.fertilizerGuidance && (
              <div className="rounded-xl bg-green-50 p-3 space-y-1.5">
                <p className="text-xs font-bold text-green-900">Fertilizer guidance</p>
                <p className="text-sm text-green-800">{fert.fertilizerGuidance}</p>
              </div>
            )}
            {fert.recommendedActions?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-700 mb-1.5">Recommended actions</p>
                {fert.recommendedActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-600 mb-1.5">
                    <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center
                                     flex-shrink-0 mt-0.5 text-green-600 text-xs font-bold">✓</span>
                    {action}
                  </div>
                ))}
              </div>
            )}
            {fert.avoidActions?.length > 0 && (
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-xs font-bold text-amber-900 mb-1">Avoid</p>
                {fert.avoidActions.map((action, i) => (
                  <p key={i} className="text-xs text-amber-800">{action}</p>
                ))}
              </div>
            )}
            {fert.limitations?.length > 0 && (
              <div className="rounded-xl bg-amber-50 p-3 space-y-1">
                <p className="text-xs font-bold text-amber-900">Limitations</p>
                {fert.limitations.map((limitation, i) => (
                  <p key={i} className="text-xs text-amber-800">{limitation}</p>
                ))}
              </div>
            )}
            {fert.retestRecommendation && (
              <p className="text-xs text-gray-500 italic">{fert.retestRecommendation}</p>
            )}
            <p className="text-[11px] text-gray-500">
              Generated by {fert.provider || 'Gemini AI'}{fert.model ? ` (${fert.model})` : ''}.
              This is decision-support guidance, not a laboratory fertilizer prescription.
            </p>
            {fert.generatedAt && (
              <p className="text-[11px] text-gray-400">
                Generated {new Date(fert.generatedAt?._seconds
                  ? fert.generatedAt._seconds * 1000
                  : fert.generatedAt).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-gray-600">
            {serviceStatus.fertilizerRecommendation?.message ||
              'No Gemini recommendation was saved for this assessment. Submit a new assessment after configuring GEMINI_API_KEY on the SoilSense API.'}
          </p>
        )}
      </div>

      {/* ── Technical Details (accordion) ──────────────────── */}
      <div className="card p-0 overflow-hidden animate-fade-in-up"
           style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
        <button
          onClick={() => setShowTechnical(!showTechnical)}
          className="w-full flex items-center justify-between px-5 py-4
                     hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
              <Info className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <span className="font-bold text-gray-700 text-sm">Technical Details (Fuzzy Logic)</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300
                                   ${showTechnical ? 'rotate-180' : ''}`} />
        </button>
        {showTechnical && (
          <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3 text-xs text-gray-600
                          animate-slide-down">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-bold text-gray-700 mb-1.5">Inputs Used</p>
                <ul className="space-y-1">
                  <li>pH: <strong>{displayPH != null ? Number(displayPH).toFixed(1) : '—'}</strong>
                    {' '}→ <em className="text-gray-500">{f.phFuzzySet ?? '—'}</em></li>
                  <li>Moisture: <strong>{displayMoisture != null ? `${Number(displayMoisture).toFixed(0)}%` : '—'}</strong>
                    {' '}→ <em className="text-gray-500">{f.moistureFuzzySet ?? '—'}</em></li>
                  <li>Image: <strong>{img.imageQuality ?? '—'}</strong></li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-gray-700 mb-1.5">Aggregation</p>
                {Object.entries(f.aggregation || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 mb-1">
                    <span className="w-14 capitalize text-gray-500">{k}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full"
                           style={{ width: `${(v * 100).toFixed(0)}%` }} />
                    </div>
                    <span className="w-9 text-right font-mono">{(v*100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="font-bold text-gray-700 mb-1.5">
                Activated Rules: {f.activatedRules?.length || 0}
              </p>
              <p className="font-mono text-gray-500">
                {f.activatedRules?.join(', ') || 'None'}
              </p>
            </div>
            <p className="text-gray-500 italic">
              Mamdani inference · Centroid defuzzification
            </p>
            {data.labValidation?.isValidated && (
              <div className="bg-blue-50 rounded-xl p-3 mt-2">
                <p className="font-bold text-blue-800 mb-1 flex items-center gap-1.5 text-sm">
                  <FlaskConical className="w-3.5 h-3.5" /> Lab Validation
                </p>
                <p className="text-blue-700">
                  Lab result: <strong>{data.labValidation.labFertilityClass?.toUpperCase()}</strong>
                  {data.labValidation.labPH && ` · pH: ${data.labValidation.labPH}`}
                </p>
                {data.labValidation.notes && (
                  <p className="text-blue-400 mt-0.5">{data.labValidation.notes}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Disclaimer ─────────────────────────────────────── */}
      <p className="text-xs text-gray-500 text-center px-2 animate-fade-in-up"
         style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
        ⚠️ SoilSense provides a <strong>preliminary assessment</strong> and does not replace laboratory soil analysis.
        Verify all recommendations with a qualified agricultural extension officer before field application.
      </p>

      {/* ── Action buttons ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 animate-fade-in-up"
           style={{ animationDelay: '350ms', animationFillMode: 'both' }}>
        <Link to="/assess/new" className="btn-primary justify-center py-3.5">
          <PlusCircle className="w-4 h-4" /> New Assessment
        </Link>
        <Link to="/history" className="btn-secondary justify-center py-3.5">
          View History
        </Link>
      </div>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────── */

function MeasTile({ label, value, sub, color, bg = 'bg-gray-50', className = '' }) {
  return (
    <div className={`${bg} ${className} rounded-2xl p-3 text-center border border-white/60`}>
      <div className={`text-lg font-black leading-tight ${color}`}>{value}</div>
      <div className="text-[11px] font-semibold text-gray-600 mt-0.5">{label}</div>
      <div className="text-[10px] text-gray-500 capitalize mt-0.5 truncate">{sub}</div>
    </div>
  );
}

function SoilImprovementPlan({ fertilityClass, ph, moisture }) {
  const actions = [];

  if (fertilityClass === 'poor') {
    actions.push({ priority: 'high', title: 'Add organic matter', detail: 'Apply compost or farm yard manure. This is the single most effective way to raise soil fertility over 1–2 seasons.' });
    actions.push({ priority: 'high', title: 'Plant cover crops', detail: 'Legumes like mung bean or cowpea fix nitrogen and improve soil structure when tilled back in.' });
  } else {
    actions.push({ priority: 'medium', title: 'Maintain organic matter', detail: 'Keep adding compost regularly. Your soil is on the right track — consistent organic inputs can push it to fertile.' });
  }

  if (ph != null) {
    const p = Number(ph);
    if (p < 5.5) actions.push({ priority: 'high', title: 'Apply lime to raise pH', detail: `Your soil pH (${p.toFixed(1)}) is acidic. Agricultural lime raises pH over a few months.` });
    else if (p > 7.5) actions.push({ priority: 'medium', title: 'Lower pH with organic matter', detail: `Your pH (${p.toFixed(1)}) is alkaline. Organic matter and elemental sulfur gradually lower it.` });
  }

  if (moisture != null) {
    const m = Number(moisture);
    if (m < 35) actions.push({ priority: 'medium', title: 'Improve water retention', detail: `Moisture (${m.toFixed(0)}%) is low. Mulching and organic matter help soil hold water longer.` });
    else if (m > 80) actions.push({ priority: 'medium', title: 'Improve drainage', detail: `Moisture (${m.toFixed(0)}%) is very high. Raised beds or drainage canals prevent root rot.` });
  }

  actions.push({ priority: 'low', title: 'Get a laboratory soil test', detail: 'For high-value planting decisions, a lab test gives exact N-P-K levels.' });

  const priStyle = {
    high:   { cls: 'bg-red-100 text-red-700',   label: 'Do first' },
    medium: { cls: 'bg-amber-100 text-amber-700', label: 'Recommended' },
    low:    { cls: 'bg-gray-100 text-gray-600',  label: 'Optional' },
  };

  return (
    <div className="card border-l-4 border-blue-400 animate-fade-in-up"
         style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
      <h3 className="flex items-center gap-2 font-black text-gray-900 mb-4 text-sm">
        <span className="text-xl">🧪</span> Soil Improvement Plan
      </h3>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Your soil is <strong className="capitalize">{fertilityClass}</strong>.
        These steps can improve it, making more crops suitable over time.
      </p>
      <div className="space-y-3">
        {actions.map((a, i) => {
          const style = priStyle[a.priority];
          return (
            <div key={i} className="flex items-start gap-3">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${style.cls}`}>
                {style.label}
              </span>
              <div>
                <p className="text-sm font-bold text-gray-800">{a.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{a.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
