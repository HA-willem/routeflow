/**
 * Matrix-tegeling (14_RoutingEngine.md § 3.3, RE-07): Mapbox Matrix API
 * accepteert max. 25 coördinaten per request. Voor N ≤ maxTileSize is er
 * precies één tegel; voor grotere N wordt de puntenlijst in blokken
 * gesplitst en wordt elk blok-paar (incl. blok-met-zichzelf) als één tegel
 * bevraagd, zodat elk benodigd paar (i,j) in minstens één tegel valt. Zuiver,
 * geen I/O (41_CodingStandards.md § 12).
 */

/** Retourneert een lijst tegels; elke tegel is een lijst puntindices (in de oorspronkelijke puntenlijst). */
export function splitIntoTiles(pointCount: number, maxTileSize = 25): number[][] {
  if (pointCount <= maxTileSize) {
    return [Array.from({ length: pointCount }, (_, i) => i)];
  }

  const blockSize = Math.max(1, Math.floor(maxTileSize / 2));
  const blocks: number[][] = [];
  for (let start = 0; start < pointCount; start += blockSize) {
    blocks.push(
      Array.from({ length: Math.min(blockSize, pointCount - start) }, (_, i) => start + i),
    );
  }

  const tiles: number[][] = [];
  for (let a = 0; a < blocks.length; a += 1) {
    const blockA = blocks[a]!;
    for (let b = a; b < blocks.length; b += 1) {
      const blockB = blocks[b]!;
      const combined = a === b ? blockA : [...blockA, ...blockB];
      tiles.push(combined);
    }
  }
  return tiles;
}
