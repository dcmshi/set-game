import { useEffect, useRef, useState } from 'react';
import { useMultiplayer } from '../../mp/useMultiplayer';
import { useT } from '../../i18n/LanguageContext';
import { MpJoin } from './MpJoin';
import { Lobby } from './Lobby';
import { MpBoard } from './MpBoard';
import { Scoreboard } from './Scoreboard';
import { MpResults } from './MpResults';
import { ConfirmDialog } from '../ConfirmDialog';
import { Timer } from '../Timer';

interface MultiplayerAppProps {
  serverUrl: string;
  initialCode?: string;
  onExit(): void;
}

export function MultiplayerApp({ serverUrl, initialCode, onExit }: MultiplayerAppProps) {
  const { t } = useT();
  const mp = useMultiplayer(serverUrl);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flash the board red on an invalid claim.
  useEffect(() => {
    if (mp.lastClaim === 'invalid') {
      setWrongFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setWrongFlash(false), 500);
    }
  }, [mp.lastClaim, mp.lockoutUntil]);

  const isHost = mp.you?.id === mp.hostId;
  const leave = () => {
    mp.leave();
    onExit();
  };

  if (mp.status === 'connecting' && mp.phase === 'none') {
    return (
      <div className="screen mp-status">
        <p>{t('mp.waking')}</p>
        <button type="button" className="text-btn" onClick={onExit}>
          {t('mp.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="mp-app">
      {mp.phase === 'none' && (
        <>
          <MpJoin initialCode={initialCode} error={mp.error} onCreate={mp.createRoom} onJoin={mp.join} />
          <button type="button" className="text-btn" onClick={onExit}>
            {t('mp.back')}
          </button>
        </>
      )}

      {mp.phase === 'lobby' && mp.code && mp.you && (
        <Lobby
          code={mp.code}
          players={mp.players}
          hostId={mp.hostId ?? ''}
          youId={mp.you.id}
          isHost={isHost}
          onStart={mp.start}
          onLeave={leave}
        />
      )}

      {mp.phase === 'playing' && mp.you && (
        <div className="game mp-game">
          <header className="topbar">
            <Timer ms={Math.max(0, Date.now() - mp.startedAt)} />
            <div className="topbar-actions">
              <button type="button" className="quit-btn" onClick={() => setConfirmLeave(true)}>
                {t('mp.leave')}
              </button>
            </div>
          </header>
          <div className="mp-play">
            <MpBoard board={mp.board} lockoutUntil={mp.lockoutUntil} wrongFlash={wrongFlash} onClaim={mp.claim} />
            <Scoreboard players={mp.players} youId={mp.you.id} />
          </div>
          {mp.status === 'closed' && <p className="mp-reconnect">{t('mp.reconnecting')}</p>}
        </div>
      )}

      {mp.phase === 'results' && mp.results && (
        <MpResults
          finalScores={mp.results.finalScores}
          winnerIds={mp.results.winnerIds}
          isHost={isHost}
          onRematch={mp.rematch}
          onLeave={leave}
        />
      )}

      {confirmLeave && (
        <ConfirmDialog
          title={t('qol.leaveTitle')}
          body={t('qol.quitBodyMulti')}
          confirmLabel={t('mp.leave')}
          cancelLabel={t('qol.keepPlaying')}
          onConfirm={() => {
            setConfirmLeave(false);
            leave();
          }}
          onCancel={() => setConfirmLeave(false)}
        />
      )}
    </div>
  );
}
