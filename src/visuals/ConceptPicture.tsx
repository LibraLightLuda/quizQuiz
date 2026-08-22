import { useEffect, useState } from 'react';
import { LearningIcon } from './LearningIcon';
import { conceptVisuals, type ConceptId } from './visualAssets';

interface ConceptPictureProps {
  conceptId: ConceptId;
  className?: string;
  decorative?: boolean;
}

export function ConceptPicture({ conceptId, className = '', decorative = false }: ConceptPictureProps) {
  const [failed, setFailed] = useState(false);
  const visual = conceptVisuals[conceptId];
  useEffect(() => setFailed(false), [conceptId]);

  if (failed) {
    return <span className={`concept-picture concept-picture-fallback ${className}`.trim()} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : visual.alt} aria-hidden={decorative || undefined}><LearningIcon name="memory" /></span>;
  }
  return <img className={`concept-picture ${className}`.trim()} src={visual.src} alt={decorative ? '' : visual.alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}
