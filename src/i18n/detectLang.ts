export type Lang = 'en' | 'zh';

export function detectLang(navigatorLanguage: string | undefined): Lang {
  return navigatorLanguage?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}
