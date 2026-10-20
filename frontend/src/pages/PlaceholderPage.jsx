/**
 * PlaceholderPage.jsx — Temporary page shown for routes not yet implemented
 *
 * Displays which phase will implement this feature.
 * Will be replaced by the real page component in each subsequent phase.
 */

import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title = 'Coming Soon', phase = 'Future Phase' }) {
  return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Construction className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-500 text-sm">
          This page will be built in <strong>{phase}</strong> of development.
          Check back soon!
        </p>
      </div>
    </div>
  );
}
