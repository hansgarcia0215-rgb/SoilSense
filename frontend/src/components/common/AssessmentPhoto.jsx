import { useEffect, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import assessmentService from '../../services/assessmentService';

export default function AssessmentPhoto({ assessmentId, src, alt, className = '' }) {
  const [imageSrc, setImageSrc] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;

    setImageSrc('');
    setFailed(false);

    if (!assessmentId) {
      setImageSrc(src || '');
      return () => controller.abort();
    }

    assessmentService.getImage(assessmentId, controller.signal)
      .then(response => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(response.data);
        setImageSrc(objectUrl);
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        console.warn(`[AssessmentPhoto] Could not load image for ${assessmentId}:`, error.response?.status || error.message);
        if (src) setImageSrc(src);
        else setFailed(true);
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assessmentId, src]);

  if (!imageSrc || failed) {
    return (
      <div className={`flex items-center justify-center bg-cream-sand text-ink-faint ${className}`}>
        <ImageIcon className="h-6 w-6" aria-hidden="true" />
        <span className="sr-only">No assessment photo available</span>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
