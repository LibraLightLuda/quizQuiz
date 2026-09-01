import { useState } from 'react';
import { BalanceIcon } from '../visuals/BalanceIcon';
import { useLocale } from '../i18n/LocaleContext';

interface BalanceTutorialProps {
  onBack: () => void;
  onComplete: () => void;
}

type TutorialStage = 'choose' | 'read' | 'fix' | 'complete';

function BalanceTutorial({ onBack, onComplete }: BalanceTutorialProps) {
  const { t } = useLocale();
  const [stage, setStage] = useState<TutorialStage>('choose');
  const [selected, setSelected] = useState<number | null>(null);
  const [placed, setPlaced] = useState<number | null>(null);

  const place = () => {
    if (selected === null) return;
    setPlaced(selected);
    setSelected(null);
    if (stage === 'choose') setStage('read');
    if (stage === 'fix' && selected === 5) setStage('complete');
  };

  const remove = () => {
    if (stage !== 'fix') return;
    setPlaced(null);
  };

  const message = stage === 'choose' ? t('먼저 3 추를 골라 왼쪽 접시에 놓아 보세요.', 'Choose weight 3 and place it on the left pan.')
    : stage === 'read' ? t('왼쪽 합은 3, 오른쪽 합은 5예요. 왼쪽이 2만큼 가벼워요.', 'The left total is 3 and the right is 5. The left is 2 lighter.')
      : stage === 'fix' ? placed === 3 ? t('3 추를 눌러 빼고 5 추를 놓아 보세요.', 'Remove weight 3 and place weight 5.') : t('이번에는 5 추를 골라 놓아 보세요.', 'Now choose and place weight 5.')
        : t('양쪽 합이 5로 같아요. 5 = 5, 균형이에요!', 'Both sides total 5. 5 = 5, balanced!');

  return (
    <main className="screen balance-tutorial-screen">
      <header className="top-bar"><button className="icon-button" onClick={onBack} aria-label={t('단계 선택으로 돌아가기', 'Return to level selection')}>←</button><strong>{t('균형 저울 규칙 연습', 'Balance Scale practice')}</strong><span /></header>
      <div className="balance-tutorial-progress" aria-label="규칙 연습 3단계">
        {[1, 2, 3].map((step) => <span key={step} className={step <= (stage === 'choose' ? 1 : stage === 'read' ? 2 : 3) ? 'active' : ''}>{step}</span>)}
      </div>
      <section className="balance-tutorial-copy">
        <p className="eyebrow">{t('직접 해 보면 금방 알 수 있어요', 'Try it once to learn quickly')}</p>
        <h1>{stage === 'choose' ? t('추를 골라 놓아요', 'Choose and place a weight') : stage === 'read' ? t('기울기와 합을 읽어요', 'Read the tilt and totals') : stage === 'fix' ? t('추를 빼고 다시 놓아요', 'Remove and replace a weight') : t('양쪽을 같게 만들었어요', 'You made both sides equal')}</h1>
      </section>
      <section className={`balance-tutorial-scale ${placed === 3 ? 'right-heavy' : ''} ${placed === 5 ? 'balanced' : ''}`} aria-label={`왼쪽 합계 ${placed ?? 0}, 오른쪽 합계 5`}>
        <div className="tutorial-beam"><span /></div>
        <div className="tutorial-pans">
          <div><button onClick={remove} disabled={placed === null || stage !== 'fix'} aria-label={placed ? t(`${placed} 추 빼기`, `Remove weight ${placed}`) : t('왼쪽 빈 접시', 'Empty left pan')}>{placed ?? t('빈 접시', 'Empty')}</button><strong>{t('합계', 'Total')} {placed ?? 0}</strong></div>
          <BalanceIcon />
          <div><span>{t('고정', 'Fixed')} 5</span><strong>{t('합계', 'Total')} 5</strong></div>
        </div>
      </section>
      <p className={`balance-tutorial-message ${stage === 'complete' ? 'success' : ''}`} aria-live="polite">{message}</p>
      {stage === 'read' ? (
        <button className="primary-button" onClick={() => setStage('fix')}>{t('기울기를 확인했어요', 'I checked the tilt')}</button>
      ) : stage === 'complete' ? (
        <button className="primary-button" onClick={onComplete}>{t('첫걸음 시작하기', 'Start the first level')}</button>
      ) : (
        <section className="balance-tutorial-tools" aria-label="연습용 숫자 추">
          {(stage === 'choose' ? [3] : [5]).map((value) => (
            <button key={value} className={selected === value ? 'selected' : ''} onClick={() => setSelected(value)} aria-pressed={selected === value}>{value}<small>{t('추 고르기', 'Choose weight')}</small></button>
          ))}
          <button className="tutorial-place" onClick={place} disabled={selected === null}>{t('왼쪽에 놓기', 'Place on left')}</button>
        </section>
      )}
    </main>
  );
}

export default BalanceTutorial;
