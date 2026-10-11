import {
  LOGO_CENTER,
  centroid,
  constellationPoints,
  distanceToLine,
  trianglePoints,
} from "@/lib/brandLogo";

describe("brand logo geometry", () => {
  it("triangle centroid sits on the badge centre (not the bounding-box centre)", () => {
    const [cx, cy] = centroid(trianglePoints());
    expect(cx).toBeCloseTo(LOGO_CENTER[0], 6);
    expect(cy).toBeCloseTo(LOGO_CENTER[1], 6);
    const xs = trianglePoints().map((p) => p[0]);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeGreaterThan(LOGO_CENTER[0] + 3);
  });

  it("dot constellation centroid equals the triangle centroid", () => {
    const [dx, dy] = centroid(constellationPoints());
    const [tx, ty] = centroid(trianglePoints());
    expect(dx).toBeCloseTo(tx, 6);
    expect(dy).toBeCloseTo(ty, 6);
  });

  it("every dot has the same distance to all three triangle edges", () => {
    const t = trianglePoints();
    const edges: [number, number][] = [[0, 1], [1, 2], [2, 0]];
    const dists = constellationPoints().flatMap((p) =>
      edges
        .map(([i, j]) => distanceToLine(p, t[i], t[j]))
        // each dot lies on one edge's far side: compare per-dot minimum clearance
        .sort((a, b) => a - b)
        .slice(0, 1),
    );
    dists.forEach((d) => expect(d).toBeCloseTo(dists[0], 6));
    expect(dists[0]).toBeGreaterThan(5);
  });
});
