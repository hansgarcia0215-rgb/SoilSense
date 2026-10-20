/**
 * LoadingSpinner.jsx — Animated loading indicators
 *
 * Variants: spinner | dots | pulse | ring
 */

const SIZE = {
  sm: { spinner: 'w-4 h-4 border-[2px]', dots: 'w-1.5 h-1.5', ring: 'w-8 h-8' },
  md: { spinner: 'w-7 h-7 border-2',     dots: 'w-2 h-2',     ring: 'w-12 h-12' },
  lg: { spinner: 'w-10 h-10 border-[3px]',dots: 'w-2.5 h-2.5', ring: 'w-16 h-16' },
};

const COLOR = {
  green: { spinner: 'border-green-200 border-t-green-600', dot: 'bg-green-500', ring: 'border-green-500' },
  amber: { spinner: 'border-amber-200 border-t-amber-500', dot: 'bg-amber-500',  ring: 'border-amber-500' },
  red:   { spinner: 'border-red-200   border-t-red-500',   dot: 'bg-red-500',    ring: 'border-red-500' },
  white: { spinner: 'border-white/30  border-t-white',     dot: 'bg-white',      ring: 'border-white' },
  gray:  { spinner: 'border-gray-200  border-t-gray-500',  dot: 'bg-gray-400',   ring: 'border-gray-400' },
};

export default function LoadingSpinner({
  size     = 'md',
  variant  = 'spinner',
  color    = 'green',
  message  = '',
  className = '',
}) {
  const sz  = SIZE[size]  || SIZE.md;
  const col = COLOR[color] || COLOR.green;

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} role="status">
      {variant === 'spinner' && (
        <div className={`${sz.spinner} ${col.spinner} rounded-full animate-spin`} />
      )}

      {variant === 'dots' && (
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`${sz.dots} ${col.dot} rounded-full animate-bounce-sm`}
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}

      {variant === 'pulse' && (
        <div className="relative flex items-center justify-center">
          <div className={`${sz.ring} rounded-full border-2 ${col.ring} opacity-30 animate-ping-slow absolute`} />
          <div className={`${sz.ring} rounded-full border-2 ${col.ring}`} />
        </div>
      )}

      {variant === 'ring' && (
        <div className="relative">
          <div className={`${sz.ring} rounded-full border-4 border-gray-100`} />
          <div className={`${sz.ring} rounded-full border-4 border-t-transparent ${col.ring} absolute inset-0 animate-spin`} />
        </div>
      )}

      {message && (
        <span className="text-sm text-gray-500 font-medium animate-pulse">{message}</span>
      )}
    </div>
  );
}
