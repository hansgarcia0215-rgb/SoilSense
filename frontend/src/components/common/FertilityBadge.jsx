/**
 * FertilityBadge.jsx — Gradient pill badges for soil fertility classification
 */

const CONFIG = {
  fertile:  { label: 'Fertile',  emoji: '🟢', cls: 'badge-fertile',  glow: 'rgba(34,197,94,0.4)' },
  moderate: { label: 'Moderate', emoji: '🟡', cls: 'badge-moderate', glow: 'rgba(245,158,11,0.4)' },
  poor:     { label: 'Poor',     emoji: '🔴', cls: 'badge-poor',     glow: 'rgba(239,68,68,0.4)' },
};

const SIZE = {
  sm: 'text-xs px-2.5 py-0.5 gap-1',
  md: 'text-xs px-3 py-1 gap-1.5',
  lg: 'text-sm px-4 py-1.5 gap-2',
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
      {showEmoji && <span aria-hidden="true" className="text-xs">{config.emoji}</span>}
      {config.label}
    </span>
  );
}
