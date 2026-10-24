import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

export default function AssessmentPhoto({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-cream-sand text-ink-faint ${className}`}>
        <ImageIcon className="h-6 w-6" aria-hidden="true" />
        <span className="sr-only">No assessment photo available</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
