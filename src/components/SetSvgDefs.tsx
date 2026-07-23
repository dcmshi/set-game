import type { Color } from '../game/cards';

export const COLOR_HEX: Record<Color, string> = {
  red: '#c8283f',
  green: '#1f8f4e',
  purple: '#6b3fa0',
};

export function SetSvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        {(Object.keys(COLOR_HEX) as Color[]).map((c) => (
          <pattern
            key={c}
            id={`stripes-${c}`}
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="5" stroke={COLOR_HEX[c]} strokeWidth="1.75" />
          </pattern>
        ))}
      </defs>
    </svg>
  );
}
