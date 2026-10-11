// Deno tests for service-role detection (refresh_movie auth gate).
// Run with: deno test supabase/functions/tmdb-proxy/service-auth.test.ts

import { isServiceRoleRequest } from "./service-auth.ts";

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) throw new Error(`${message}: got ${actual}, expected ${expected}`);
}

function b64url(obj: unknown): string {
  return btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function jwt(payload: unknown): string {
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url(payload)}.sig`;
}
function req(authorization?: string): Request {
  return new Request("http://x", { method: "POST", headers: authorization ? { Authorization: authorization } : {} });
}

Deno.test("service role: bearer equals configured key", () => {
  assertEquals(isServiceRoleRequest(req("Bearer sb_secret_dummy"), "sb_secret_dummy"), true, "exact key");
});
Deno.test("service role: JWT with role=service_role", () => {
  assertEquals(isServiceRoleRequest(req(`Bearer ${jwt({ role: "service_role" })}`), "other"), true, "claim");
});
Deno.test("user JWT (authenticated) is rejected", () => {
  assertEquals(isServiceRoleRequest(req(`Bearer ${jwt({ role: "authenticated", sub: "u" })}`), "k"), false, "user");
});
Deno.test("anon JWT, garbage, missing header are rejected", () => {
  assertEquals(isServiceRoleRequest(req(`Bearer ${jwt({ role: "anon" })}`), "k"), false, "anon");
  assertEquals(isServiceRoleRequest(req("Bearer not-a-jwt"), "k"), false, "garbage");
  assertEquals(isServiceRoleRequest(req("Bearer a.%%%.c"), "k"), false, "bad base64");
  assertEquals(isServiceRoleRequest(req(), "k"), false, "no header");
  assertEquals(isServiceRoleRequest(req("Basic abc"), "k"), false, "wrong scheme");
});
Deno.test("empty configured key never matches an empty bearer", () => {
  assertEquals(isServiceRoleRequest(req("Bearer "), ""), false, "empty");
  assertEquals(isServiceRoleRequest(req("Bearer "), undefined), false, "undefined");
});
