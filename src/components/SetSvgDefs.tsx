import type { Color } from '../game/cards';

export const COLOR_HEX: Record<Color, string> = {
  red: '#d7263d',
  green: '#2a9d3f',
  purple: '#6a2ca0',
};

export function SetSvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        {(Object.keys(COLOR_HEX) as Color[]).map((c) => (
          <pattern
            key={c}
            id={`stripes-${c}`}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke={COLOR_HEX[c]} strokeWidth="2.5" />
          </pattern>
        ))}
      </defs>
    </svg>
  );
}
