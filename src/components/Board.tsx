import { useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { Card } from './Card';
import { gridStep } from '../lib/gridNav';
import type { GameState } from '../game/engine';

interface BoardProps {
  state: GameState;
  onSelect: (id: string) => void;
}

// The grid drops to three columns on narrow screens, so the count is read back
// from layout. Environments that do not resolve grid tracks fall back to four.
const COLUMNS_FALLBACK = 4;

function columnCount(board: HTMLElement | null): number {
  // 'none' is what an environment without grid layout reports for the property.
  const tracks = board ? getComputedStyle(board).gridTemplateColumns : '';
  if (!tracks || tracks === 'none') return COLUMNS_FALLBACK;
  return tracks.split(/\s+/).filter(Boolean).length || COLUMNS_FALLBACK;
}

export function Board({ state, onSelect }: BoardProps) {
  const pendingIds = state.pending ? new Set(state.pending.ids) : new Set<string>();
  const feedbackType = state.pending ? (state.pending.valid ? 'correct' : 'wrong') : null;
  const hinted = new Set(state.hintedIds);

  const ref = useRef<HTMLDivElement>(null);
  // Roving tabindex: the board is a single Tab stop and arrows move inside it.
  // Clamped on read because claiming a Set shrinks the board under us.
  const [active, setActive] = useState(0);
  const activeIndex = Math.min(active, Math.max(state.board.length - 1, 0));

  const cards = () => [...(ref.current?.querySelectorAll<HTMLElement>('.card') ?? [])];

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const to = gridStep(e.key, activeIndex, state.board.length, columnCount(ref.current));
    if (to === null) return;
    e.preventDefault();
    setActive(to);
    cards()[to]?.focus();
  };

  // Focus can also arrive by click or Tab; the tab stop follows it either way.
  const onFocus = (e: FocusEvent<HTMLElement>) => {
    const i = cards().indexOf(e.target);
    if (i >= 0) setActive(i);
  };

  return (
    <div className="board" ref={ref} onKeyDown={onKeyDown} onFocus={onFocus}>
      {state.board.map((card, i) => (
        <Card
          key={card.id}
          card={card}
          selected={state.selected.includes(card.id)}
          hinted={hinted.has(card.id)}
          feedback={pendingIds.has(card.id) ? feedbackType : null}
          tabIndex={i === activeIndex ? 0 : -1}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
