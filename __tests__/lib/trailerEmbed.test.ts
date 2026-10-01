import { buildTrailerWebViewProps } from "@/lib/trailerEmbed";

describe("buildTrailerWebViewProps", () => {
  const props = buildTrailerWebViewProps("abc123");

  it("uses the nocookie embed URL with playsinline", () => {
    expect(props.source.uri).toBe(
      "https://www.youtube-nocookie.com/embed/abc123?playsinline=1&rel=0&origin=https%3A%2F%2Fwww.youtube-nocookie.com",
    );
  });

  it("sends a Referer header (missing referrer => YouTube error 153)", () => {
    expect(props.source.headers.Referer).toBe("https://www.youtube-nocookie.com");
  });

  it("allows inline playback and https-only navigation", () => {
    expect(props.allowsInlineMediaPlayback).toBe(true);
    expect(props.allowsFullscreenVideo).toBe(true);
    expect(props.mediaPlaybackRequiresUserAction).toBe(false);
    expect(props.originWhitelist).toEqual(["https://*"]);
  });
});
