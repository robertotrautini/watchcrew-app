/**
 * Geometry of the WatchCrew logo badge (P3, squircle + play triangle + three
 * connected dots) in a 64x64 design space. Single source of truth for the RN-View
 * fallback in `BrandLogo` and mirrored by the SVG masters in
 * `docs/logo-concepts/final/`.
 *
 * Centring rule: the play triangle is equilateral with its AREA CENTROID (= incentre)
 * on the badge centre; the dot constellation is the same triangle scaled about that
 * centroid. So the dots' centroid equals the triangle centroid and all three dot
 * centres have the same distance to all three triangle edges.
 */
export type Point = readonly [number, number];

export const LOGO_VIEWBOX = 64;
export const LOGO_CENTER: Point = [32, 32];
/** Side length of the (unrounded) play triangle. */
export const TRIANGLE_SIDE = 38;
/** Dot constellation size relative to the triangle (scale about the centroid). */
export const CONSTELLATION_SCALE = 0.43;
export const DOT_RADIUS = 2.9;
export const LINE_WIDTH = 1.4;
export const BADGE_INSET = 1;
export const BADGE_RADIUS = 17;

const circumradius = (side: number): number => side / Math.sqrt(3);

/** Vertices: apex (right), bottom-left, top-left; centroid at `center`. */
export function trianglePoints(
  side: number = TRIANGLE_SIDE,
  center: Point = LOGO_CENTER,
): Point[] {
  const r = circumradius(side);
  return [0, 120, 240].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return [center[0] + r * Math.cos(a), center[1] + r * Math.sin(a)] as Point;
  });
}

/** The three dot centres: triangle scaled about the shared centroid. */
export function constellationPoints(
  scale: number = CONSTELLATION_SCALE,
): Point[] {
  return trianglePoints().map(
    (p) =>
      [
        LOGO_CENTER[0] + (p[0] - LOGO_CENTER[0]) * scale,
        LOGO_CENTER[1] + (p[1] - LOGO_CENTER[1]) * scale,
      ] as Point,
  );
}

export function centroid(points: readonly Point[]): Point {
  const n = points.length;
  return [
    points.reduce((s, p) => s + p[0], 0) / n,
    points.reduce((s, p) => s + p[1], 0) / n,
  ];
}

/** Distance of point p to the infinite line through a and b. */
export function distanceToLine(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / Math.hypot(dx, dy);
}
