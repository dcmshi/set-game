import { useT } from '../i18n/LanguageContext';
import { LANGS, isLang, type Lang } from '../i18n/detectLang';

// Deliberately short: this control sits in the in-game top bar beside Quit and
// the help button, and full names ("Français") push that cluster into the
// centred timer on a narrow phone. Latin languages get their ISO code, CJK
// their native name — both are what a speaker scans for.
const LABELS: Record<Lang, string> = {
  en: 'EN',
  zh: '中文',
  fr: 'FR',
  es: 'ES',
  ja: '日本語',
};

export function LanguageToggle() {
  const { lang, setLang, t } = useT();
  return (
    <select
      className="lang-select"
      aria-label={t('lang.groupAria')}
      value={lang}
      onChange={(e) => {
        if (isLang(e.target.value)) setLang(e.target.value);
      }}
    >
      {LANGS.map((l) => (
        <option key={l} value={l}>
          {LABELS[l]}
        </option>
      ))}
    </select>
  );
}
