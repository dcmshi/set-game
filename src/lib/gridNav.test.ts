import { gridStep } from './gridNav';

// A 12-card board in 4 columns:
//   0  1  2  3
//   4  5  6  7
//   8  9 10 11
const step = (key: string, from: number) => gridStep(key, from, 12, 4);

it('moves one card at a time along a row', () => {
  expect(step('ArrowRight', 5)).toBe(6);
  expect(step('ArrowLeft', 5)).toBe(4);
});

it('moves a whole row at a time up and down', () => {
  expect(step('ArrowDown', 1)).toBe(5);
  expect(step('ArrowUp', 9)).toBe(5);
});

// Left and right follow reading order, so every card is reachable with one axis.
it('carries on into the next row at the end of a row', () => {
  expect(step('ArrowRight', 3)).toBe(4);
  expect(step('ArrowLeft', 4)).toBe(3);
});

it('stays put rather than leaving the board', () => {
  expect(step('ArrowLeft', 0)).toBeNull();
  expect(step('ArrowUp', 2)).toBeNull();
  expect(step('ArrowRight', 11)).toBeNull();
  expect(step('ArrowDown', 9)).toBeNull();
});

// A board of 15 has a partial last row; down from 12 would land outside it.
it('does not step into a gap in a partial last row', () => {
  expect(gridStep('ArrowDown', 12, 15, 4)).toBeNull();
  expect(gridStep('ArrowDown', 10, 15, 4)).toBe(14);
});

it('reports no movement for keys that are not arrows', () => {
  expect(step('Enter', 5)).toBeNull();
  expect(step(' ', 5)).toBeNull();
  expect(step('Tab', 5)).toBeNull();
});

it('follows the column count it is given', () => {
  expect(gridStep('ArrowDown', 0, 12, 3)).toBe(3);
  expect(gridStep('ArrowUp', 3, 12, 3)).toBe(0);
});
