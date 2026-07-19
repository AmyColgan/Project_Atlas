export interface AxialCoord {
  q: number;
  r: number;
}

export interface PixelCoord {
  x: number;
  y: number;
}

const SQRT3 = Math.sqrt(3);

export function hexKey(coord: AxialCoord): string {
  return `${coord.q},${coord.r}`;
}

export function hexEquals(a: AxialCoord, b: AxialCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

export function axialToPixel(coord: AxialCoord, hexSize: number): PixelCoord {
  const x = hexSize * (SQRT3 * coord.q + (SQRT3 / 2) * coord.r);
  const y = hexSize * (1.5 * coord.r);
  return { x, y };
}

export function pixelToAxial(point: PixelCoord, hexSize: number): AxialCoord {
  const q = ((SQRT3 / 3) * point.x - (1 / 3) * point.y) / hexSize;
  const r = ((2 / 3) * point.y) / hexSize;
  return hexRound({ q, r });
}

function hexRound(frac: AxialCoord): AxialCoord {
  const x = frac.q;
  const z = frac.r;
  const y = -x - z;

  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);

  const xDiff = Math.abs(rx - x);
  const yDiff = Math.abs(ry - y);
  const zDiff = Math.abs(rz - z);

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return { q: rx, r: rz };
}

const AXIAL_DIRECTIONS: readonly AxialCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function hexNeighbor(coord: AxialCoord, direction: number): AxialCoord {
  const d = AXIAL_DIRECTIONS[((direction % 6) + 6) % 6];
  return { q: coord.q + d.q, r: coord.r + d.r };
}

export function hexNeighbors(coord: AxialCoord): AxialCoord[] {
  return AXIAL_DIRECTIONS.map((d) => ({ q: coord.q + d.q, r: coord.r + d.r }));
}

export function hexDistance(a: AxialCoord, b: AxialCoord): number {
  const aq = a.q;
  const ar = a.r;
  const as = -aq - ar;
  const bq = b.q;
  const br = b.r;
  const bs = -bq - br;
  return Math.max(Math.abs(aq - bq), Math.abs(ar - br), Math.abs(as - bs));
}

export function hexCorners(center: PixelCoord, hexSize: number): PixelCoord[] {
  const corners: PixelCoord[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push({
      x: center.x + hexSize * Math.cos(angle),
      y: center.y + hexSize * Math.sin(angle),
    });
  }
  return corners;
}
