// Service-role detection for actions that must not be callable by normal users
// (`refresh_movie`). The Supabase gateway (verify_jwt = true, default) has
// already verified the JWT signature before the function runs, so reading the
// `role` claim from the payload is safe. The raw-key comparison additionally
// covers non-JWT secret keys (sb_secret_...).

function bearerToken(req: Request): string | null {
  const header = req.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

function jwtRole(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))));
    return typeof payload?.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export function isServiceRoleRequest(req: Request, serviceRoleKey: string | undefined): boolean {
  const token = bearerToken(req);
  if (!token) return false;
  if (serviceRoleKey && token === serviceRoleKey) return true;
  return jwtRole(token) === "service_role";
}
