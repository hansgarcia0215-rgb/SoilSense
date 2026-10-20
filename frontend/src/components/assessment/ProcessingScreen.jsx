/**
 * ProcessingScreen.jsx — Animated soil analysis progress screen
 */

import { useEffect, useState } from 'react';
import { Check, Leaf } from 'lucide-react';

const STEPS = [
  { id: 'upload',    label: 'Uploading soil image',             icon: '📤' },
  { id: 'quality',   label: 'Checking image quality',           icon: '🔍' },
  { id: 'features',  label: 'Extracting soil features',         icon: '🎨' },
  { id: 'sensor',    label: 'Processing sensor / manual data',  icon: '📡' },
  { id: 'fuzzy',     label: 'Applying fuzzy logic',             icon: '🧠' },
  { id: 'fertility', label: 'Calculating soil fertility',       icon: '🌱' },
  { id: 'crops',     label: 'Evaluating crop suitability',      icon: '🌿' },
  { id: 'recommend', label: 'Generating recommendations',       icon: '✨' },
];

export default function ProcessingScreen({ currentStep }) {
  const currentIdx = STEPS.findIndex(s => s.id === currentStep);
  const [dots, setDots] = useState('');

  // Animated ellipsis for active step
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="max-w-md mx-auto text-center py-12 px-4">

      {/* Animated logo */}
      <div className="relative w-20 h-20 mx-auto mb-8">
        {/* Outer pulse ring */}
        <div className="absolute inset-0 rounded-full border-4 border-green-200 animate-ping-slow opacity-60" />
        {/* Spinning ring */}
        <div className="absolute inset-1 rounded-full border-4 border-transparent
                        border-t-green-500 border-r-green-400 animate-spin" />
        {/* Inner circle */}
        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-green-500 to-emerald-600
                        flex items-center justify-center shadow-glow-green">
          <Leaf className="w-6 h-6 text-white animate-pulse" />
        </div>
      </div>

      <h2 className="text-xl font-black text-gray-900 mb-1">Analyzing your soil{dots}</h2>
      <p className="text-sm text-gray-400 mb-8">Please wait while we process your assessment</p>

      {/* Steps */}
      <div className="text-left space-y-2.5">
        {STEPS.map((step, i) => {
          const isDone   = i < currentIdx;
          const isActive = i === currentIdx;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500
                ${isActive
                  ? 'bg-green-50 border border-green-200 shadow-sm scale-[1.02]'
                  : isDone
                    ? 'opacity-60'
                    : 'opacity-25'}`}
            >
              {/* Status icon */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
                              transition-all duration-300
                ${isDone   ? 'bg-green-500 shadow-glow-sm' :
                  isActive  ? 'bg-green-100 border-2 border-green-400' :
                              'bg-gray-100'}`}>
                {isDone ? (
                  <Check className="w-4 h-4 text-white" />
                ) : isActive ? (
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                ) : (
                  <span className="text-sm">{step.icon}</span>
                )}
              </div>

              <span className={`text-sm font-medium flex-1
                ${isActive ? 'text-gray-900 font-semibold' :
                  isDone   ? 'text-gray-400 line-through' : 'text-gray-400'}`}>
                {step.label}
              </span>

              {isDone && (
                <span className="text-xs text-green-500 font-bold animate-scale-in">Done</span>
              )}
              {isActive && (
                <div className="flex gap-0.5">
                  {[0,1,2].map(j => (
                    <div key={j} className="w-1 h-1 bg-green-400 rounded-full animate-bounce-sm"
                         style={{ animationDelay: `${j * 150}ms` }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-8 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full
                     transition-all duration-700 ease-smooth relative overflow-hidden"
          style={{ width: `${Math.round(((currentIdx + 0.5) / STEPS.length) * 100)}%` }}
        >
          <div className="absolute inset-0 bg-white/30 animate-progress" />
        </div>
      </div>
      <p className="text-xs text-gray-300 mt-2">
        Step {currentIdx + 1} of {STEPS.length}
      </p>
    </div>
  );
}
