// Deno.test suite for the `delete-account` Edge Function's orchestration
// logic (self-only-deletion guarantee, JWT `sub` extraction) using a fully
// mocked `DeleteAccountDeps` — no real Supabase client or network call
// involved. Mirrors the hand-rolled assert-helper convention already used
// by supabase/functions/tmdb-proxy/movie-upsert.test.ts.
//
// Run with: deno test supabase/functions/delete-account/

import {
  extractUserIdFromJwt,
  handleDeleteAccount,
  type DeleteAccountDeps,
} from "./delete-account.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${message}\n  actual:   ${a}\n  expected: ${e}`);
  }
}

// --- fake JWT construction (unsigned — see delete-account.ts's module
// comment for why decoding without verifying is safe in this context) -----

function base64UrlEncode(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function makeFakeJwt(payload: Record<string, unknown>): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

function makeRequest(options: { authHeader?: string | null; body?: unknown } = {}): Request {
  const headers = new Headers();
  if (options.authHeader) {
    headers.set("Authorization", options.authHeader);
  }
  return new Request("http://localhost/delete-account", {
    method: "POST",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

function createFakeDeps(outcome: { error: { message: string } | null } = { error: null }): {
  deps: DeleteAccountDeps;
  calls: string[];
} {
  const calls: string[] = [];
  const deps: DeleteAccountDeps = {
    deleteUser: async (userId: string) => {
      calls.push(userId);
      return outcome;
    },
  };
  return { deps, calls };
}

// --- extractUserIdFromJwt ---------------------------------------------

Deno.test("extractUserIdFromJwt: returns null when there is no Authorization header", () => {
  assertEquals(extractUserIdFromJwt(null), null, "no header should yield null");
  assertEquals(extractUserIdFromJwt(undefined), null, "undefined header should yield null");
});

Deno.test("extractUserIdFromJwt: returns null for a malformed (non-3-part) token", () => {
  assertEquals(extractUserIdFromJwt("Bearer not-a-jwt"), null, "malformed token should yield null");
});

Deno.test("extractUserIdFromJwt: returns null for an unparsable payload segment", () => {
  assertEquals(
    extractUserIdFromJwt("Bearer aaa.not-base64-json!!!.ccc"),
    null,
    "unparsable payload should yield null",
  );
});

Deno.test("extractUserIdFromJwt: returns null when the payload has no string sub claim", () => {
  const token = makeFakeJwt({ role: "authenticated" });
  assertEquals(extractUserIdFromJwt(`Bearer ${token}`), null, "missing sub should yield null");
});

Deno.test("extractUserIdFromJwt: extracts the sub claim from a well-formed Bearer token", () => {
  const token = makeFakeJwt({ sub: "user-abc-123", role: "authenticated" });
  assertEquals(
    extractUserIdFromJwt(`Bearer ${token}`),
    "user-abc-123",
    "should extract the sub claim",
  );
});

Deno.test("extractUserIdFromJwt: also works without the 'Bearer ' prefix", () => {
  const token = makeFakeJwt({ sub: "user-xyz" });
  assertEquals(extractUserIdFromJwt(token), "user-xyz", "should work without Bearer prefix");
});

// --- handleDeleteAccount ------------------------------------------------

Deno.test("handleDeleteAccount: returns 401 when the Authorization header is missing", async () => {
  const { deps, calls } = createFakeDeps();
  const req = makeRequest({});

  const result = await handleDeleteAccount(req, deps);

  assertEquals(result.status, 401, "should be 401");
  assert(calls.length === 0, "deleteUser must never be called without a valid caller id");
});

Deno.test(
  "handleDeleteAccount: calls deleteUser with EXACTLY the JWT's own sub claim, never a body-supplied id",
  async () => {
    const token = makeFakeJwt({ sub: "real-caller-id" });
    const { deps, calls } = createFakeDeps({ error: null });
    // Malicious body trying to smuggle a different target user id in.
    const req = makeRequest({
      authHeader: `Bearer ${token}`,
      body: { userId: "attacker-id", targetUserId: "attacker-id", sub: "attacker-id" },
    });

    const result = await handleDeleteAccount(req, deps);

    assertEquals(calls, ["real-caller-id"], "deleteUser must be called with the caller's own id only");
    assertEquals(result, { status: 200, body: { success: true } }, "should succeed");
  },
);

Deno.test(
  "handleDeleteAccount: ignores a completely absent/empty request body without erroring",
  async () => {
    const token = makeFakeJwt({ sub: "caller-2" });
    const { deps, calls } = createFakeDeps({ error: null });
    const req = makeRequest({ authHeader: `Bearer ${token}` });

    const result = await handleDeleteAccount(req, deps);

    assertEquals(calls, ["caller-2"], "should still call deleteUser with the caller's own id");
    assertEquals(result.status, 200, "should succeed with no body");
  },
);

Deno.test("handleDeleteAccount: surfaces a deleteUser error as a 500 with its message", async () => {
  const token = makeFakeJwt({ sub: "caller-3" });
  const { deps } = createFakeDeps({ error: { message: "admin API unavailable" } });
  const req = makeRequest({ authHeader: `Bearer ${token}` });

  const result = await handleDeleteAccount(req, deps);

  assertEquals(
    result,
    { status: 500, body: { error: "admin API unavailable" } },
    "should surface the deleteUser error",
  );
});

Deno.test(
  "handleDeleteAccount: two different callers each only ever delete their own account",
  async () => {
    const { deps, calls } = createFakeDeps({ error: null });

    await handleDeleteAccount(
      makeRequest({ authHeader: `Bearer ${makeFakeJwt({ sub: "user-a" })}` }),
      deps,
    );
    await handleDeleteAccount(
      makeRequest({ authHeader: `Bearer ${makeFakeJwt({ sub: "user-b" })}` }),
      deps,
    );

    assertEquals(calls, ["user-a", "user-b"], "each call should delete only its own caller");
  },
);
