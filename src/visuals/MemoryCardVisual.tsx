import type { MemoryCard } from '../memory/types';
import { ConceptPicture } from './ConceptPicture';
import { memoryPairConceptIds } from './visualAssets';

export function MemoryCardVisual({ card }: { card: MemoryCard }) {
  if (card.side !== 'answer') return null;
  const conceptId = memoryPairConceptIds[card.pairId];
  if (conceptId) return <ConceptPicture conceptId={conceptId} className="memory-concept-picture" decorative />;
  if (card.category !== 'math') return null;

  const amount = Number(card.content);
  if (!Number.isInteger(amount) || amount < 1 || amount > 99) return null;
  const tens = Math.floor(amount / 10);
  const ones = amount % 10;
  return <span className="memory-quantity" aria-hidden="true">{Array.from({ length: tens }, (_, index) => <i className="ten" key={`ten-${index}`} />)}{Array.from({ length: ones }, (_, index) => <i className="one" key={`one-${index}`} />)}</span>;
}
