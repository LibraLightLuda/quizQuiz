import { useEffect, useState } from 'react';
import type { Question, QuestionStatus } from '../domain/types';
import { ConceptPicture } from '../visuals/ConceptPicture';
import { GuideCharacter } from '../visuals/GuideCharacter';
import { questionConceptIds } from '../visuals/visualAssets';

interface Props {
  question: Question;
  status: QuestionStatus;
  selectedOptionId: string | null;
  paused: boolean;
  onSelect: (optionId: string | null, selectedAnswer?: string) => void;
  onHint: () => void;
}

const activityIcon = {
  'sound-match': '👂',
  'word-build': '🧩',
  'picture-link': '🖼️',
  'sentence-complete': '💬'
} as const;

const normalized = (value: string): string => value.trim().normalize('NFC').toLocaleLowerCase();

const activityDemo = {
  'sound-match': { example: '🔊 “고양이” → 고양이', explanation: '소리를 듣고 같은 낱말을 눌러요.' },
  'word-build': { example: '나 + 무 → 나무', explanation: '타일을 앞에서부터 차례로 놓아요.' },
  'picture-link': { example: '🐶 → 강아지', explanation: '그림과 이름이 같은 친구를 찾아요.' },
  'sentence-complete': { example: '나는 사과를 먹어요.', explanation: '문장에 자연스럽게 이어지는 낱말을 골라요.' }
} as const;

const demoStorageKey = (question: Question): string =>
  `numbercal.language-activity-demo.v1:${question.subject}:${question.activity?.kind}`;

export function LanguageActivityRenderer({
  question, status, selectedOptionId, paused, onSelect, onHint
}: Props) {
  const activity = question.activity;
  const [chosenTileIds, setChosenTileIds] = useState<string[]>([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [demoVisible, setDemoVisible] = useState(() => {
    try { return localStorage.getItem(demoStorageKey(question)) !== 'done'; } catch { return true; }
  });

  useEffect(() => {
    setChosenTileIds([]);
    setHintLevel(0);
    try { setDemoVisible(localStorage.getItem(demoStorageKey(question)) !== 'done'); } catch { setDemoVisible(true); }
  }, [question.id]);

  if (!activity) return null;

  if (demoVisible) {
    const demo = activityDemo[activity.kind];
    return (
      <section className="activity-demo" aria-label={`${activity.title} 연습`}>
        <GuideCharacter className="activity-demo-guide" decorative />
        <div><strong>모리가 먼저 보여줄게요!</strong><p>{demo.example}</p><small>{demo.explanation}</small></div>
        <button type="button" className="primary-button" onClick={() => {
          try { localStorage.setItem(demoStorageKey(question), 'done'); } catch { /* 시범은 계속 진행할 수 있다. */ }
          setDemoVisible(false);
        }}>이제 내가 해볼래요</button>
      </section>
    );
  }

  const disabled = status !== 'answering' || paused;
  const tiles = activity.tiles ?? [];
  const chosenTiles = chosenTileIds.flatMap((id) => {
    const tile = tiles.find((candidate) => candidate.id === id);
    return tile ? [tile] : [];
  });
  const targetTileCount = activity.targetTileCount ?? 0;
  const assembled = chosenTiles.map((tile) => tile.value).join('');

  const chooseTile = (tileId: string) => {
    if (disabled || chosenTileIds.length >= targetTileCount) return;
    setChosenTileIds((ids) => [...ids, tileId]);
  };
  const showNextHint = () => {
    if (disabled || hintLevel >= (activity.hintSteps?.length ?? 0)) return;
    setHintLevel((level) => level + 1);
    onHint();
  };
  const submitTiles = () => {
    if (disabled || chosenTileIds.length !== targetTileCount) return;
    const match = question.options.find((option) => normalized(String(option.value)) === normalized(assembled));
    onSelect(match?.id ?? null, assembled);
  };

  return (
    <section className={'language-activity activity-' + activity.optionStyle} aria-label={activity.title}>
      <header className="activity-guide">
        <span aria-hidden="true">{activityIcon[activity.kind]}</span>
        <div><strong>{activity.title}</strong><small>{activity.instruction}</small></div>
      </header>
      {activity.optionStyle === 'tiles' ? (
        <div className="tile-build-board">
          <div className="tile-slots" aria-label="내가 만든 낱말" aria-live="polite">
            {Array.from({ length: targetTileCount }, (_, index) => (
              <span className={'tile-slot ' + (chosenTiles[index] ? 'filled' : '')} key={index}>
                {chosenTiles[index]?.label ?? <span aria-hidden="true">?</span>}
              </span>
            ))}
          </div>
          <div className="word-tile-pool" role="group" aria-label="낱말 타일">
            {tiles.map((tile) => (
              <button
                type="button"
                className="word-tile"
                key={tile.id}
                disabled={disabled || chosenTileIds.includes(tile.id) || chosenTileIds.length >= targetTileCount}
                onClick={() => chooseTile(tile.id)}
              >{tile.label}</button>
            ))}
          </div>
          <div className="tile-actions">
            <button type="button" className="small-button" disabled={disabled || chosenTileIds.length === 0}
              onClick={() => setChosenTileIds((ids) => ids.slice(0, -1))}>하나 되돌리기</button>
            <button type="button" className="small-button" disabled={disabled || chosenTileIds.length === 0}
              onClick={() => setChosenTileIds([])}>다시 놓기</button>
          </div>
          {hintLevel > 0 && activity.hintSteps && (
            <p className="tile-hint" role="status">💡 {activity.hintSteps[hintLevel - 1]}</p>
          )}
          <div className="tile-submit-row">
            {!!activity.hintSteps?.length && hintLevel < activity.hintSteps.length && (
              <button type="button" className="small-button hint-button" disabled={disabled} onClick={showNextHint}>
                {hintLevel === 0 ? '힌트 보기' : '힌트 한 단계 더'}
              </button>
            )}
            <button type="button" className="tile-submit" disabled={disabled || chosenTileIds.length !== targetTileCount}
              onClick={submitTiles}>완성했어요</button>
          </div>
          {status === 'feedback' && (
            <p className={'tile-result ' + (selectedOptionId === question.correctOptionId ? 'correct' : 'incorrect')}>
              내가 만든 낱말: <strong>{assembled || '—'}</strong>
            </p>
          )}
        </div>
      ) : (
        <div className={'activity-option-grid activity-options-' + question.options.length} role="group" aria-label={activity.title + ' 보기'}>
          {question.options.map((option) => {
            const selected = selectedOptionId === option.id;
            const correct = status === 'feedback' && option.id === question.correctOptionId;
            const incorrect = status === 'feedback' && selected && !correct;
            const wordId = activity.optionWordIds?.[option.id];
            const conceptId = wordId ? questionConceptIds[wordId] : undefined;
            return (
              <button
                key={option.id}
                className={'activity-option ' + (selected ? 'selected ' : '') + (correct ? 'correct ' : '') + (incorrect ? 'incorrect' : '')}
                disabled={disabled}
                onClick={() => onSelect(option.id)}
              >
                {activity.optionStyle === 'pictures' && conceptId && (
                  <ConceptPicture conceptId={conceptId} className="activity-option-picture" />
                )}
                <span>{option.label}</span>
                {correct && <b aria-label="정답">✓</b>}
                {incorrect && <b aria-label="선택한 답">•</b>}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
