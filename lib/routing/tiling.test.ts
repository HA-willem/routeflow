import { describe, expect, it } from 'vitest';

import { splitIntoTiles } from './tiling.ts';

function allPairsCovered(tiles: number[][], pointCount: number): boolean {
  for (let i = 0; i < pointCount; i += 1) {
    for (let j = 0; j < pointCount; j += 1) {
      const covered = tiles.some((tile) => tile.includes(i) && tile.includes(j));
      if (!covered) return false;
    }
  }
  return true;
}

describe('splitIntoTiles (RE-07)', () => {
  it('geeft één tegel voor N binnen de limiet', () => {
    const tiles = splitIntoTiles(24, 25);
    expect(tiles).toHaveLength(1);
    expect(tiles[0]).toHaveLength(24);
  });

  it('geeft één tegel wanneer N precies de limiet is', () => {
    const tiles = splitIntoTiles(25, 25);
    expect(tiles).toHaveLength(1);
  });

  it('splitst in meerdere tegels boven de limiet, elke tegel binnen de limiet', () => {
    const tiles = splitIntoTiles(40, 25);
    expect(tiles.length).toBeGreaterThan(1);
    for (const tile of tiles) {
      expect(tile.length).toBeLessThanOrEqual(25);
    }
  });

  it('dekt elk paar (i,j) in minstens één tegel voor N > limiet', () => {
    const tiles = splitIntoTiles(40, 25);
    expect(allPairsCovered(tiles, 40)).toBe(true);
  });

  it('dekt elk paar voor een grotere N (60 stops, PRD § 13-budget)', () => {
    const tiles = splitIntoTiles(60, 25);
    expect(allPairsCovered(tiles, 60)).toBe(true);
    for (const tile of tiles) {
      expect(tile.length).toBeLessThanOrEqual(25);
    }
  });

  it('geeft lege lijst met puntindices voor 0 punten', () => {
    const tiles = splitIntoTiles(0, 25);
    expect(tiles).toEqual([[]]);
  });
});
