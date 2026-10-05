import { resolveAuthGate } from "../../src/lib/authGate";

// Core redirect-decision logic for M3's navigation shell:
//   no session              -> 'auth'       (show the (auth) login/register group)
//   session, zero groups    -> 'onboarding' (show "create or join a group")
//   session, >=1 group      -> 'app'        (show the main (app)/(tabs) shell)
// See docs/adr/0003-watch-group-data-model.md: Watch-Group is the sole
// shareable unit, so "no group yet" is a real, required app state.
describe("resolveAuthGate", () => {
  it("returns 'auth' when there is no session", () => {
    expect(resolveAuthGate({ session: null, groups: null })).toBe("auth");
  });

  it("returns 'auth' when there is no session, regardless of a (nonsensical) groups value", () => {
    expect(resolveAuthGate({ session: null, groups: [{ group_id: "g1" }] })).toBe("auth");
  });

  it("returns 'onboarding' when there is a session but groups is an empty array", () => {
    expect(resolveAuthGate({ session: { user: { id: "u1" } } as never, groups: [] })).toBe(
      "onboarding",
    );
  });

  it("returns 'onboarding' when there is a session but groups is null (not yet resolved to an empty result)", () => {
    expect(resolveAuthGate({ session: { user: { id: "u1" } } as never, groups: null })).toBe(
      "onboarding",
    );
  });

  it("returns 'app' when there is a session and at least one group", () => {
    expect(
      resolveAuthGate({
        session: { user: { id: "u1" } } as never,
        groups: [{ group_id: "g1" }],
      }),
    ).toBe("app");
  });

  it("returns 'app' when there is a session and multiple groups", () => {
    expect(
      resolveAuthGate({
        session: { user: { id: "u1" } } as never,
        groups: [{ group_id: "g1" }, { group_id: "g2" }],
      }),
    ).toBe("app");
  });
});
