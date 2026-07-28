// The single source of truth for supported languages. `Lang` derives from it,
// so adding an entry here makes TypeScript point at every table that needs a
// translation, and the storage + strings tests iterate it rather than a
// hardcoded list.
export const LANGS = ['en', 'zh', 'fr', 'es', 'ja'] as const;

export type Lang = (typeof LANGS)[number];

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

export function detectLang(navigatorLanguage: string | undefined): Lang {
  // Match on the primary subtag so regional variants (fr-CA, es-419) resolve.
  const primary = navigatorLanguage?.toLowerCase().split('-')[0];
  return isLang(primary) ? primary : 'en';
}
