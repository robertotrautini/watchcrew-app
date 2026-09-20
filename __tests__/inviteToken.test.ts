import { extractInviteToken } from "../src/lib/inviteToken";

describe("extractInviteToken", () => {
  it("returns a bare invite-token UUID unchanged (lowercased)", () => {
    expect(extractInviteToken("11111111-1111-1111-1111-111111111111")).toBe(
      "11111111-1111-1111-1111-111111111111",
    );
  });

  it("trims incidental surrounding whitespace on a bare paste", () => {
    expect(extractInviteToken("  11111111-1111-1111-1111-111111111111  ")).toBe(
      "11111111-1111-1111-1111-111111111111",
    );
  });

  it("normalizes an uppercase UUID paste to lowercase", () => {
    expect(extractInviteToken("11111111-1111-1111-1111-111111111111".toUpperCase())).toBe(
      "11111111-1111-1111-1111-111111111111",
    );
  });

  it("extracts the UUID embedded in a full deep-link URL", () => {
    expect(
      extractInviteToken("https://watchcrew.app/join/11111111-1111-1111-1111-111111111111"),
    ).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("extracts the UUID embedded in a custom-scheme deep link with query params", () => {
    expect(extractInviteToken("watchcrew://join?token=11111111-1111-1111-1111-111111111111")).toBe(
      "11111111-1111-1111-1111-111111111111",
    );
  });

  it("returns null for input with no UUID-shaped substring at all", () => {
    expect(extractInviteToken("not-a-token")).toBeNull();
    expect(extractInviteToken("")).toBeNull();
    expect(extractInviteToken("12345")).toBeNull();
  });
});
