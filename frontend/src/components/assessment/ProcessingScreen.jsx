/**
 * ProcessingScreen.jsx — Animated soil analysis progress screen
 */

import { useEffect, useState } from 'react';
import { Leaf } from 'lucide-react';

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

export default function ProcessingScreen() {
  const [dots, setDots] = useState('');

  // Animated ellipsis
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
      <p className="text-sm text-gray-500 mb-8">Results are usually ready in under 10 seconds</p>

      {/* Pipeline overview — shown dimmed as an honest preview, not fake progress */}
      <div className="text-left space-y-2">
        {STEPS.map(step => (
          <div key={step.id}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-sm w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              {step.icon}
            </span>
            <span className="text-sm text-gray-500 font-medium flex-1">{step.label}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-8">
        This screen closes automatically when your result is ready.
      </p>
    </div>
  );
}
