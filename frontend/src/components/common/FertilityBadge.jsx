/**
 * FertilityBadge.jsx — Editorial pill badges for soil fertility classification
 */

const CONFIG = {
  fertile:  { label: 'Fertile',  dot: 'bg-green-600',  cls: 'badge-fertile'  },
  moderate: { label: 'Moderate', dot: 'bg-soil-500',   cls: 'badge-moderate' },
  poor:     { label: 'Poor',     dot: 'bg-[#a8402f]',  cls: 'badge-poor'     },
};

const SIZE = {
  sm: 'text-xs px-2.5 py-0.5 gap-1.5',
  md: 'text-xs px-3 py-1 gap-2',
  lg: 'text-sm px-4 py-1.5 gap-2.5',
};

export default function FertilityBadge({ classification, size = 'md', showEmoji = true, className = '' }) {
  const key    = classification?.toLowerCase() || 'moderate';
  const config = CONFIG[key] || CONFIG.moderate;
  const sizeCls = SIZE[size] || SIZE.md;

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-bold select-none
        transition-transform duration-200 hover:scale-105
        ${config.cls} ${sizeCls} ${className}
      `}
    >
      {showEmoji && <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`} />}
      {config.label}
    </span>
  );
}
