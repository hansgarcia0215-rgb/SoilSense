/**
 * CropResult.jsx — Animated crop recommendation card
 */

import { useState } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

const RANK_CONFIG = {
  BEST:         { emoji: '🥇', label: 'Best Crop',                 bg: 'bg-gradient-to-br from-green-50 to-emerald-50/80', border: 'border-green-200', badge: 'bg-green-600 text-white' },
  SECOND_BEST:  { emoji: '🥈', label: 'Second-Best Crop',          bg: 'bg-gradient-to-br from-blue-50  to-sky-50/80',     border: 'border-blue-200',  badge: 'bg-blue-600  text-white' },
  CLOSEST:      { emoji: '⚠️', label: 'Closest Option',            bg: 'bg-gradient-to-br from-amber-50 to-yellow-50/80',  border: 'border-amber-300', badge: 'bg-amber-500 text-white' },
  NOT_SUITABLE: { emoji: '🚫', label: 'Not Suitable / Last Option', bg: 'bg-gradient-to-br from-red-50   to-rose-50/80',    border: 'border-red-200',   badge: 'bg-red-500   text-white' },
};

const FACTOR_LABELS = {
  fertility: 'Fertility',  pH: 'pH',  ph: 'pH',
  moisture: 'Moisture', soilCondition: 'Soil Condition', location: 'Location',
};

export default function CropResult({ result, index = 0 }) {
  const [expanded, setExpanded] = useState(false);
  if (!result) return null;

  const cfg   = RANK_CONFIG[result.status] || RANK_CONFIG.NOT_SUITABLE;
  const score = result.suitabilityScore ?? 0;
  const barColor =
    score >= 70 ? 'from-green-400 to-green-600' :
    score >= 50 ? 'from-amber-400 to-amber-600' : 'from-red-400 to-red-500';
  const scoreColor =
    score >= 70 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-500';

  return (
    <div
      className={`border-2 rounded-2xl overflow-hidden ${cfg.bg} ${cfg.border}
                  animate-fade-in-up hover:shadow-card-hover transition-shadow duration-300`}
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="text-3xl flex-shrink-0 animate-float"
                  style={{ animationDuration: `${3.5 + index * 0.5}s`, animationDelay: `${index * 0.2}s` }}>
              {cfg.emoji}
            </span>
            <div className="min-w-0">
              <span className={`inline-block text-[10px] font-bold uppercase tracking-wider
                               px-2.5 py-0.5 rounded-full ${cfg.badge} mb-2`}>
                {cfg.label}
              </span>
              <h3 className="text-lg font-black text-gray-900 leading-tight">{result.cropName}</h3>
              {result.localName && (
                <p className="text-xs text-gray-400 italic mt-0.5">{result.localName}</p>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {result.category && (
                  <span className="text-[10px] bg-white/70 text-gray-500 px-2 py-0.5 rounded-full font-medium border border-gray-200/80">
                    {result.category}
                  </span>
                )}
                {result.currentFarmCrop && (
                  <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-semibold">
                    🌿 On farm
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Score */}
          <div className="text-right flex-shrink-0">
            <div className={`text-3xl font-black tabular-nums ${scoreColor}`}>
              {score.toFixed(0)}<span className="text-sm font-medium text-gray-300">%</span>
            </div>
            <div className="text-[10px] text-gray-400 font-medium">suitability</div>
            {!result.meetsThreshold && result.status !== 'NOT_SUITABLE' && (
              <div className="text-[10px] text-red-400 font-semibold mt-0.5">Below threshold</div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-white/60 rounded-full overflow-hidden shadow-inner-sm">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barColor}
                        transition-all duration-1000 ease-smooth`}
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="px-5 pb-4">
        <p className="text-sm text-gray-700 leading-relaxed">
          {result.farmerSummary || result.recommendedAction}
        </p>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1.5 py-2.5
                   border-t border-white/50 text-xs font-semibold text-gray-400
                   hover:text-gray-700 bg-white/30 hover:bg-white/60
                   transition-all duration-150"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? 'Hide details' : 'Why this result?'}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-5 bg-white/40 space-y-4 border-t border-white/30
                        animate-slide-down">
          {result.recommendedAction && result.farmerSummary && (
            <div className="mt-3 bg-white/60 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-600 mb-1">Recommended Action</p>
              <p className="text-xs text-gray-600 leading-relaxed">{result.recommendedAction}</p>
            </div>
          )}

          {result.matchingFactors?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-green-700 mb-2">✓ Matching conditions</p>
              <ul className="space-y-1.5">
                {result.matchingFactors.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.limitingFactors?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-red-600 mb-2">✗ Limiting conditions</p>
              <ul className="space-y-1.5">
                {result.limitingFactors.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.componentScores && (
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">Score breakdown</p>
              <div className="space-y-2">
                {Object.entries(result.componentScores).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500 w-28 flex-shrink-0">
                      {FACTOR_LABELS[key] || key}
                    </span>
                    <div className="flex-1 h-1.5 bg-gray-200/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700
                          ${val >= 70 ? 'bg-green-400' : val >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${val}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-gray-600 w-9 text-right">
                      {val?.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
