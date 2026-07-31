import { strings } from './strings';
import type { Lang } from './detectLang';
import type { Card } from '../game/cards';

/** CJK scripts join clauses with their own full-width comma and no space. */
const HINT_SEPARATOR: Record<Lang, string> = {
  en: ', ',
  fr: ', ',
  es: ', ',
  zh: '，',
  ja: '、',
};

/**
 * Screen-reader label for a card. Each language inflects differently — plural
 * suffixes, gender agreement, measure words — so every language owns a
 * formatter instead of sharing one with branches in it.
 *
 * `hinted` appends the hint marker, because the hint itself is conveyed by
 * outline colour and a glow that a screen reader cannot see.
 */
export function cardAriaLabel(card: Card, lang: Lang, hinted = false): string {
  const label = FORMATTERS[lang](card);
  return hinted ? label + HINT_SEPARATOR[lang] + strings[lang]['card.hinted'] : label;
}

type Formatter = (card: Card) => string;

function english(card: Card): string {
  const s = strings.en;
  const noun = s[`shape.${card.shape}`] + (card.count > 1 ? 's' : '');
  return `${card.count} ${s[`shading.${card.shading}`]} ${s[`color.${card.color}`]} ${noun}`;
}

function chinese(card: Card): string {
  const s = strings.zh;
  return `${card.count}个${s[`color.${card.color}`]}${s[`shading.${card.shading}`]}${s[`shape.${card.shape}`]}`;
}

/** Gender of the French shape nouns: losange (m), vague (f), ovale (m). */
const FR_SHAPE_GENDER: Record<Card['shape'], 'm' | 'f'> = {
  diamond: 'm',
  squiggle: 'f',
  oval: 'm',
};

/**
 * Feminine forms of the French adjectives. The masculine comes from the
 * strings table; only the ones that actually change are listed here, so `red`
 * (rouge) and `open` (vide) are absent by design rather than by oversight.
 * Tabulated because `violet → violette` doubles its consonant — a suffix rule
 * would get it wrong.
 */
const FR_FEMININE: Partial<Record<Card['color'] | Card['shading'], string>> = {
  green: 'verte',
  purple: 'violette',
  solid: 'pleine',
  striped: 'hachurée',
};

function french(card: Card): string {
  const s = strings.fr;
  const feminine = FR_SHAPE_GENDER[card.shape] === 'f';
  const plural = card.count > 1 ? 's' : '';
  const agree = (key: Card['color'] | Card['shading'], masculine: string) =>
    (feminine ? (FR_FEMININE[key] ?? masculine) : masculine) + plural;

  const shape = s[`shape.${card.shape}`] + plural;
  const color = agree(card.color, s[`color.${card.color}`]);
  const shading = agree(card.shading, s[`shading.${card.shading}`]);
  return `${card.count} ${shape} ${color} ${shading}`;
}

function spanish(card: Card): string {
  const s = strings.es;
  // Every Spanish shape noun here is masculine and vowel-final, so agreement
  // and pluralisation both collapse to a trailing -s.
  const plural = card.count > 1 ? 's' : '';
  const shape = s[`shape.${card.shape}`] + plural;
  const color = s[`color.${card.color}`] + plural;
  const shading = s[`shading.${card.shading}`] + plural;
  return `${card.count} ${shape} ${color} ${shading}`;
}

function japanese(card: Card): string {
  const s = strings.ja;
  // 個 is the generic counter; Japanese marks no plural.
  return `${card.count}個の${s[`color.${card.color}`]}の${s[`shading.${card.shading}`]}の${s[`shape.${card.shape}`]}`;
}

const FORMATTERS: Record<Lang, Formatter> = {
  en: english,
  zh: chinese,
  fr: french,
  es: spanish,
  ja: japanese,
};
