import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { strings, type StringKey } from './strings';
import { detectLang, type Lang } from './detectLang';
import { getStoredLang, setStoredLang } from './langStorage';

export interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: StringKey, params?: Record<string, string | number>) => string;
}

function translate(lang: Lang, key: StringKey, params?: Record<string, string | number>): string {
  const template = strings[lang][key] ?? strings.en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in params ? String(params[name]) : `{${name}}`
  );
}

function initialLang(): Lang {
  const stored = getStoredLang();
  if (stored) return stored;
  return detectLang(typeof navigator !== 'undefined' ? navigator.language : undefined);
}

const defaultValue: I18n = {
  lang: 'en',
  setLang: () => {},
  t: (key, params) => translate('en', key, params),
};

const LanguageContext = createContext<I18n>(defaultValue);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    setStoredLang(next);
  }, []);
  // index.html ships a static lang="en" for the crawler, so the attribute has to
  // be rewritten once the UI language is known. Here rather than in the toggle:
  // a language restored from storage or detected from the browser never passes
  // through a press.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const value = useMemo<I18n>(
    () => ({ lang, setLang, t: (key, params) => translate(lang, key, params) }),
    [lang, setLang]
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useT(): I18n {
  return useContext(LanguageContext);
}
