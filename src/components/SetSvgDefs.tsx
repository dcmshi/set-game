import { COLORS, type Color } from '../game/cards';

/**
 * The stripe patterns for striped shading, defined once for the whole app. They
 * are shared by every card, so unlike the shapes they cannot inherit a suit
 * colour — `.stripe-<suit>` in the stylesheet colours them instead.
 */
export function SetSvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        {COLORS.map((c: Color) => (
          <pattern key={c} id={`stripes-${c}`} width="4.5" height="4.5" patternUnits="userSpaceOnUse">
            <line className={`stripe-${c}`} x1="0" y1="0" x2="0" y2="4.5" strokeWidth="2.1" />
          </pattern>
        ))}
      </defs>
    </svg>
  );
}
