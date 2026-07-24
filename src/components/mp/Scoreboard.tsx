import { useT } from '../../i18n/LanguageContext';
import type { PlayerView } from '../../mp/protocol';

export function Scoreboard({ players, youId }: { players: PlayerView[]; youId: string }) {
  const { t } = useT();
  const sorted = [...players].filter((p) => !p.spectator).sort((a, b) => b.score - a.score);
  return (
    <ul className="mp-scoreboard">
      {sorted.map((p) => (
        <li key={p.id} className={p.connected ? '' : 'mp-off'}>
          <span className="mp-score-name">
            {p.name}
            {p.id === youId && <span className="mp-tag"> ({t('mp.you')})</span>}
          </span>
          <strong className="mp-score-num">{p.score}</strong>
        </li>
      ))}
    </ul>
  );
}
