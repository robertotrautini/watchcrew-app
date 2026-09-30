import { buildTmdbImageUrl } from "@/lib/tmdbImage";

describe("buildTmdbImageUrl", () => {
  it("prefixes a bare TMDB path with the image base URL and default size", () => {
    expect(buildTmdbImageUrl("/abc.jpg")).toBe("https://image.tmdb.org/t/p/w342/abc.jpg");
  });

  it("honours an explicit size", () => {
    expect(buildTmdbImageUrl("/abc.jpg", "w780")).toBe("https://image.tmdb.org/t/p/w780/abc.jpg");
  });

  it("passes an already-absolute URL through unchanged", () => {
    expect(buildTmdbImageUrl("https://example.com/p.jpg")).toBe("https://example.com/p.jpg");
  });

  it("returns null for null/undefined/empty", () => {
    expect(buildTmdbImageUrl(null)).toBeNull();
    expect(buildTmdbImageUrl(undefined)).toBeNull();
    expect(buildTmdbImageUrl("")).toBeNull();
  });
});
