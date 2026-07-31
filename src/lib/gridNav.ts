/**
 * Where an arrow key moves focus within a grid of `count` cells laid out in
 * `columns` columns, or null when the key is not an arrow or the move would
 * leave the grid.
 *
 * Left and right follow reading order rather than stopping at the row edge, so
 * the whole board is reachable on one axis.
 */
export function gridStep(key: string, from: number, count: number, columns: number): number | null {
  const delta =
    key === 'ArrowRight' ? 1
    : key === 'ArrowLeft' ? -1
    : key === 'ArrowDown' ? columns
    : key === 'ArrowUp' ? -columns
    : null;
  if (delta === null) return null;

  const to = from + delta;
  return to >= 0 && to < count ? to : null;
}
