import { Card } from './Card';
import type { GameState } from '../game/engine';

interface BoardProps {
  state: GameState;
  onSelect: (id: string) => void;
}

export function Board({ state, onSelect }: BoardProps) {
  const pendingIds = state.pending ? new Set(state.pending.ids) : new Set<string>();
  const feedbackType = state.pending ? (state.pending.valid ? 'correct' : 'wrong') : null;
  const hinted = new Set(state.hintedIds);

  return (
    <div className="board">
      {state.board.map((card) => (
        <Card
          key={card.id}
          card={card}
          selected={state.selected.includes(card.id)}
          hinted={hinted.has(card.id)}
          feedback={pendingIds.has(card.id) ? feedbackType : null}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
