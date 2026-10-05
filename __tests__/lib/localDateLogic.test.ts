// Regression: 2026-10-01 00:10 CEST (= 2026-09-30T22:10Z) -> UTC leftovers gave 30.09.
process.env.TZ = "Europe/Berlin";

import { resolvePaymentDate } from "../../src/lib/ratingLogic";
import { daysSincePayment } from "../../src/lib/trackerLogic";

const JUST_AFTER_LOCAL_MIDNIGHT = new Date("2026-09-30T22:10:00.000Z");

describe("local-date leftovers", () => {
  it("resolvePaymentDate fallback is the LOCAL date (YYYY-MM-DD), not a UTC timestamp", () => {
    expect(resolvePaymentDate(null, null, null, JUST_AFTER_LOCAL_MIDNIGHT)).toBe("2026-10-01");
  });

  it("daysSincePayment counts from the LOCAL date: paid 2026-10-01 at 00:10 local is 'heute'", () => {
    expect(daysSincePayment("2026-10-01", JUST_AFTER_LOCAL_MIDNIGHT)).toBe("heute");
  });

  it("daysSincePayment: paid 2026-09-30 at 00:10 local on 10-01 is 'gestern'", () => {
    expect(daysSincePayment("2026-09-30", JUST_AFTER_LOCAL_MIDNIGHT)).toBe("gestern");
  });
});
