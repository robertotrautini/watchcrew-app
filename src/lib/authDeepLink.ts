/**
 * Deep-link target for Supabase Auth emails (password reset + signup
 * confirmation). Must be on the Redirect-URLs allow-list in the Supabase
 * Dashboard (e.g. `watchcrew://**`). The client uses supabase-js' default
 * implicit flow, so Supabase redirects to this URL with the session in the
 * URL FRAGMENT: `#access_token=...&refresh_token=...&type=recovery|signup`
 * (errors: `#error=access_denied&error_code=otp_expired&error_description=...`).
 * A PKCE-style `?code=...` is parsed too, for robustness.
 */
export const AUTH_CALLBACK_URL = "watchcrew://auth/callback";

export type ParsedAuthLink = {
  accessToken: string | null;
  refreshToken: string | null;
  code: string | null;
  type: string | null;
  error: string | null;
  errorCode: string | null;
  errorDescription: string | null;
};

function parsePairs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  for (const pair of raw.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawValue = eq === -1 ? "" : pair.slice(eq + 1);
    try {
      out[decodeURIComponent(rawKey.replace(/\+/g, " "))] = decodeURIComponent(
        rawValue.replace(/\+/g, " "),
      );
    } catch {
      // malformed percent-encoding: skip this pair
    }
  }
  return out;
}

/**
 * Extracts auth params from an incoming deep link. Fragment values win over
 * query values (Supabase puts the session in the fragment).
 */
export function parseAuthLink(url: string | null | undefined): ParsedAuthLink {
  let query = "";
  let fragment = "";
  if (url) {
    const hashIndex = url.indexOf("#");
    const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
    fragment = hashIndex === -1 ? "" : url.slice(hashIndex + 1);
    const queryIndex = beforeHash.indexOf("?");
    query = queryIndex === -1 ? "" : beforeHash.slice(queryIndex + 1);
  }
  const params = { ...parsePairs(query), ...parsePairs(fragment) };
  const get = (key: string) => (params[key] ? params[key] : null);

  return {
    accessToken: get("access_token"),
    refreshToken: get("refresh_token"),
    code: get("code"),
    type: get("type"),
    error: get("error"),
    errorCode: get("error_code"),
    errorDescription: get("error_description"),
  };
}
