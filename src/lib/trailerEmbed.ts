/**
 * WebView props for the YouTube trailer embed.
 *
 * Root cause of "Fehler 153" (video player configuration error): a WebView
 * that navigates directly to `youtube.com/embed/<id>` is a top-level load
 * with no embedding page and no Referer, and YouTube rejects embeds that
 * don't identify an embedder. We load the nocookie embed (legacy spec:
 * "nocookie-Domain") and send an explicit Referer plus a matching `origin`
 * query param.
 */
const EMBED_ORIGIN = "https://www.youtube-nocookie.com";

export function buildTrailerWebViewProps(videoKey: string) {
  return {
    source: {
      uri: `${EMBED_ORIGIN}/embed/${videoKey}?playsinline=1&rel=0&origin=${encodeURIComponent(EMBED_ORIGIN)}`,
      headers: { Referer: EMBED_ORIGIN },
    },
    originWhitelist: ["https://*"],
    allowsInlineMediaPlayback: true,
    allowsFullscreenVideo: true,
    mediaPlaybackRequiresUserAction: false,
    injectedJavaScript: TRAILER_FULLSCREEN_BRIDGE_JS,
  };
}

/** Message the embed page posts when the player enters/leaves fullscreen. */
export const TRAILER_FULLSCREEN_ENTER = "trailer-fullscreen:1";
export const TRAILER_FULLSCREEN_EXIT = "trailer-fullscreen:0";

/**
 * Injected into the embed page: reports fullscreen changes of the standard
 * YouTube player so the app can unlock landscape only while it is fullscreen
 * (the app itself is portrait-locked).
 */
export const TRAILER_FULLSCREEN_BRIDGE_JS = `
(function () {
  function report() {
    var fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    window.ReactNativeWebView.postMessage(fs ? "${TRAILER_FULLSCREEN_ENTER}" : "${TRAILER_FULLSCREEN_EXIT}");
  }
  document.addEventListener("fullscreenchange", report);
  document.addEventListener("webkitfullscreenchange", report);
})();
true;
`;
