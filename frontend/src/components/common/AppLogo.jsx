/**
 * AppLogo.jsx — SoilSense brand logo component
 *
 * Uses the actual soilsense_logo.png for all UI instances.
 * Replaces the placeholder green circle with "S" text.
 *
 * Props:
 *   size    — 'sm' | 'md' | 'lg' | 'xl'
 *   showText — whether to show "SoilSense" text beside the logo
 *   dark     — true = white text (for dark backgrounds)
 *   className — extra classes on wrapper
 */

const SIZES = {
  sm:  { img: 'w-7 h-7',   text: 'text-sm',  sub: 'text-[8px]'  },
  md:  { img: 'w-9 h-9',   text: 'text-base', sub: 'text-[9px]'  },
  lg:  { img: 'w-11 h-11', text: 'text-lg',  sub: 'text-[10px]' },
  xl:  { img: 'w-16 h-16', text: 'text-2xl', sub: 'text-xs'     },
};

export default function AppLogo({ size = 'md', showText = true, dark = false, className = '' }) {
  const s = SIZES[size] || SIZES.md;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Logo image */}
      <img
        src="/soilsense_logo.png"
        alt="SoilSense"
        className={`${s.img} object-contain rounded-xl flex-shrink-0`}
        draggable={false}
      />

      {/* Optional text */}
      {showText && (
        <div>
          <span className={`font-black tracking-tight leading-none block
                            ${s.text} ${dark ? 'text-white' : 'text-gray-900'}`}>
            SoilSense
          </span>
          <span className={`font-medium tracking-widest uppercase leading-none block
                            ${s.sub} ${dark ? 'text-white/50' : 'text-gray-400'}`}>
            Roxas · Mindoro
          </span>
        </div>
      )}
    </div>
  );
}
