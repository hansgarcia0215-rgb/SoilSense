/**
 * RootcropResult.jsx — Displays a single rootcrop suitability card
 *
 * Shows rank badge, crop name, suitability score, matching/limiting factors,
 * and recommended action. Used in the result page and comparison view.
 */

import { CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const RANK_CONFIG = {
  BEST:         { emoji: '🥇', label: 'Best Option',        bgClass: 'bg-green-50 border-green-200',   badgeClass: 'bg-green-500 text-white' },
  SECOND_BEST:  { emoji: '🥈', label: 'Second Best Option', bgClass: 'bg-blue-50  border-blue-200',    badgeClass: 'bg-blue-500  text-white' },
  CLOSEST:      { emoji: '⚠️', label: 'Closest Option',     bgClass: 'bg-amber-50 border-amber-200',   badgeClass: 'bg-amber-500 text-white' },
  NOT_SUITABLE: { emoji: '🚫', label: 'Not Suitable',        bgClass: 'bg-red-50   border-red-200',     badgeClass: 'bg-red-500   text-white' },
};

export default function RootcropResult({ result }) {
  const [expanded, setExpanded] = useState(false);

  const config   = RANK_CONFIG[result.status] || RANK_CONFIG.NOT_SUITABLE;
  const scoreColor =
    result.suitabilityScore >= 70 ? 'text-green-600' :
    result.suitabilityScore >= 50 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className={`border-2 rounded-2xl overflow-hidden ${config.bgClass}`}>
      {/* Header */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{config.emoji}</span>
            <div>
              <div className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${config.badgeClass} inline-block mb-1`}>
                {config.label}
              </div>
              <h3 className="text-lg font-black text-gray-900">{result.cropName}</h3>
              {result.localName && (
                <p className="text-sm text-gray-500 italic">{result.localName}</p>
              )}
            </div>
          </div>
          {/* Score */}
          <div className="text-right flex-shrink-0">
            <div className={`text-3xl font-black ${scoreColor}`}>
              {result.suitabilityScore?.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-400">suitability</div>
            {!result.meetsThreshold && (
              <div className="text-xs text-red-500 font-medium mt-0.5">Below threshold</div>
            )}
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700
              ${result.suitabilityScore >= 70 ? 'bg-green-500' :
                result.suitabilityScore >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
            style={{ width: `${result.suitabilityScore}%` }}
          />
        </div>
      </div>

      {/* Recommended action (always visible) */}
      <div className="px-5 pb-4">
        <p className="text-sm text-gray-700 leading-relaxed">
          {result.recommendedAction}
        </p>
      </div>

      {/* Expand/collapse for detailed factors */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-white/60 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-white/40 hover:bg-white/60 transition-colors"
      >
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {expanded ? 'Hide details' : 'Why this result?'}
      </button>

      {expanded && (
        <div className="px-5 pb-5 bg-white/50 space-y-3">
          {/* Matching factors */}
          {result.matchingFactors?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-green-700 mb-1.5">✓ Matching conditions:</p>
              <ul className="space-y-1">
                {result.matchingFactors.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Limiting factors */}
          {result.limitingFactors?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-red-600 mb-1.5">✗ Limiting conditions:</p>
              <ul className="space-y-1">
                {result.limitingFactors.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                    <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Component scores */}
          {result.componentScores && (
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">Score breakdown:</p>
              <div className="space-y-1.5">
                {Object.entries(result.componentScores).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-28 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
                      <div className="h-full bg-green-400 rounded-full" style={{ width: `${val}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 w-10 text-right">{val?.toFixed(0)}%</span>
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
