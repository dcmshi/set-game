import { useT } from '../i18n/LanguageContext';
import type { Lang } from '../i18n/detectLang';

const LABELS: Record<Lang, string> = { en: 'EN', zh: '中' };
const ORDER: Lang[] = ['en', 'zh'];

export function LanguageToggle() {
  const { lang, setLang, t } = useT();
  return (
    <div className="lang-toggle" role="group" aria-label={t('lang.groupAria')}>
      {ORDER.map((l) => (
        <button
          key={l}
          type="button"
          className={l === lang ? 'lang-opt active' : 'lang-opt'}
          aria-pressed={l === lang}
          onClick={() => setLang(l)}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
