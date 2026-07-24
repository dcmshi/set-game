import { useT } from '../../i18n/LanguageContext';
import type { PlayerView } from '../../mp/protocol';

interface LobbyProps {
  code: string;
  players: PlayerView[];
  hostId: string;
  youId: string;
  isHost: boolean;
  onStart(): void;
  onLeave(): void;
}

export function Lobby({ code, players, hostId, youId, isHost, onStart, onLeave }: LobbyProps) {
  const { t } = useT();
  const link = `${window.location.origin}/r/${code}`;

  return (
    <div className="screen mp-lobby">
      <h2>{t('mp.lobby')}</h2>
      <p className="mp-room-code">
        {t('mp.room')} <strong>{code}</strong>
      </p>
      <p className="mp-share">{t('mp.shareHint')}</p>
      <code className="mp-share-link">{link}</code>

      <h3 className="howto-subtitle">
        {t('mp.players')} ({players.length})
      </h3>
      <ul className="mp-roster">
        {players.map((p) => (
          <li key={p.id}>
            {p.name}
            {p.id === youId && <span className="mp-tag"> ({t('mp.you')})</span>}
            {p.id === hostId && <span className="mp-tag"> · {t('mp.host')}</span>}
            {p.spectator && <span className="mp-tag"> · {t('mp.spectating')}</span>}
            {!p.connected && <span className="mp-tag mp-tag-off"> · {t('mp.disconnectedTag')}</span>}
          </li>
        ))}
      </ul>

      {isHost ? (
        <button type="button" className="primary-btn" onClick={onStart}>
          {t('mp.startGame')}
        </button>
      ) : (
        <p className="mp-waiting">{t('mp.waitingHost')}</p>
      )}
      <button type="button" className="text-btn" onClick={onLeave}>
        {t('mp.leave')}
      </button>
    </div>
  );
}
