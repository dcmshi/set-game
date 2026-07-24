import { strings } from './strings';
import type { Lang } from './detectLang';
import type { Card } from '../game/cards';

export function cardAriaLabel(card: Card, lang: Lang): string {
  const s = strings[lang];
  const color = s[`color.${card.color}`];
  const shading = s[`shading.${card.shading}`];
  const shape = s[`shape.${card.shape}`];
  if (lang === 'zh') {
    return `${card.count}个${color}${shading}${shape}`;
  }
  const noun = shape + (card.count > 1 ? 's' : '');
  return `${card.count} ${shading} ${color} ${noun}`;
}
