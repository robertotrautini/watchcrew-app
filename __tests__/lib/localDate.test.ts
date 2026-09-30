import { isoDateToLocalDate, toLocalIsoDate } from "../../src/lib/localDate";

describe("toLocalIsoDate", () => {
  it("uses local calendar components, not the UTC date (00:10 local on the 1st)", () => {
    // Local-time constructor: 2026-10-01 00:10 local. In any zone ahead of
    // UTC, the UTC date is 2026-09-30 -- the exact bug being guarded.
    expect(toLocalIsoDate(new Date(2026, 9, 1, 0, 10))).toBe("2026-10-01");
  });

  it("uses local date late in the evening (23:50 local)", () => {
    expect(toLocalIsoDate(new Date(2026, 8, 30, 23, 50))).toBe("2026-09-30");
  });

  it("zero-pads month and day", () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5, 12, 0))).toBe("2026-01-05");
  });

  it("returns the local date when TZ is ahead of UTC", () => {
    const original = process.env.TZ;
    process.env.TZ = "Europe/Berlin";
    try {
      expect(toLocalIsoDate(new Date("2026-09-30T22:10:00Z"))).toBe("2026-10-01");
    } finally {
      process.env.TZ = original;
    }
  });
});

describe("isoDateToLocalDate", () => {
  it("round-trips through toLocalIsoDate", () => {
    expect(toLocalIsoDate(isoDateToLocalDate("2026-10-01"))).toBe("2026-10-01");
  });
});
