import { useState } from 'react';
import { useT } from '../../i18n/LanguageContext';

interface MpJoinProps {
  initialCode?: string;
  error: string | null;
  onCreate(name: string): void;
  onJoin(code: string, name: string): void;
}

const ERR_KEY: Record<string, 'mp.errNotFound' | 'mp.errFull' | 'mp.errGeneric'> = {
  not_found: 'mp.errNotFound',
  full: 'mp.errFull',
};

export function MpJoin({ initialCode = '', error, onCreate, onJoin }: MpJoinProps) {
  const { t } = useT();
  const [name, setName] = useState('');
  const [code, setCode] = useState(initialCode.toUpperCase());
  const trimmed = name.trim();

  return (
    <div className="screen mp-join">
      <h2>{t('start.multiplayerBtn')}</h2>
      <label className="mp-field">
        {t('mp.yourName')}
        <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
      </label>
      <button type="button" className="primary-btn" disabled={!trimmed} onClick={() => onCreate(trimmed)}>
        {t('mp.createRoom')}
      </button>
      <div className="mp-join-divider" />
      <label className="mp-field">
        {t('mp.roomCode')}
        <input
          value={code}
          maxLength={4}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
        />
      </label>
      <button
        type="button"
        className="primary-btn"
        disabled={!trimmed || code.length !== 4}
        onClick={() => onJoin(code, trimmed)}
      >
        {t('mp.join')}
      </button>
      {error && <p className="mp-error">{t(ERR_KEY[error] ?? 'mp.errGeneric')}</p>}
    </div>
  );
}
