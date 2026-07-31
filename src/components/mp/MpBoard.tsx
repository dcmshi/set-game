import { useEffect, useState } from 'react';
import { Card } from '../Card';
import { useT } from '../../i18n/LanguageContext';
import type { Card as CardModel } from '../../game/cards';

interface MpBoardProps {
  board: CardModel[];
  lockoutUntil: number;
  wrongFlash: boolean;
  onClaim(ids: [string, string, string]): void;
}

export function MpBoard({ board, lockoutUntil, wrongFlash, onClaim }: MpBoardProps) {
  const { t } = useT();
  const [selected, setSelected] = useState<string[]>([]);
  const [remaining, setRemaining] = useState(0);

  const locked = remaining > 0;

  // Live countdown while locked out.
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000)));
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [lockoutUntil]);

  // Clear selection whenever the board changes (a Set was claimed by someone).
  useEffect(() => setSelected([]), [board]);

  const toggle = (id: string) => {
    if (locked) return;
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      const next = [...prev, id];
      if (next.length === 3) {
        onClaim(next as [string, string, string]);
        return [];
      }
      return next;
    });
  };

  return (
    <div className={`mp-board-wrap${wrongFlash ? ' mp-wrong' : ''}`}>
      <div className="board">
        {board.map((card) => (
          <Card
            key={card.id}
            card={card}
            selected={selected.includes(card.id)}
            hinted={false}
            feedback={null}
            onSelect={toggle}
          />
        ))}
      </div>
      {locked && (
        <div className="mp-lockout" role="status">
          {t('mp.lockedSecs', { secs: remaining })}
        </div>
      )}
    </div>
  );
}
