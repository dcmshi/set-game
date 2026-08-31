import { useState } from 'react';
import { useT } from '../i18n/LanguageContext';
import { getSoundEnabled, setStoredSoundEnabled } from '../storage/soundPref';
import { playSet, setSoundEnabled } from '../lib/sound';

/**
 * Opt-in sound toggle. The stored preference is pushed into the sound module
 * on mount, so a returning player who enabled sound gets it back on reload.
 */
export function SoundToggle() {
  const { t } = useT();
  const [on, setOn] = useState(() => {
    const pref = getSoundEnabled();
    setSoundEnabled(pref);
    return pref;
  });

  const swap = () => {
    const next = !on;
    setOn(next);
    setStoredSoundEnabled(next);
    setSoundEnabled(next);
    // A confirming chime right away: feedback that it worked, inside the
    // click gesture so the AudioContext is allowed to start.
    if (next) playSet();
  };

  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={t('sound.aria')}
      aria-pressed={on}
      title={t('sound.aria')}
      onClick={swap}
    >
      <span aria-hidden="true">{on ? '🔊' : '🔇'}</span>
    </button>
  );
}
