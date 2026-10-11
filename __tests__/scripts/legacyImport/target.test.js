const { assertDevTarget, DEV_PROJECT_REF } = require("../../../scripts/legacy-import/target");

describe("assertDevTarget", () => {
  it("accepts the dev project url", () => {
    expect(() => assertDevTarget(`https://${DEV_PROJECT_REF}.supabase.co`)).not.toThrow();
  });
  it("refuses other refs, hosts and garbage", () => {
    expect(() => assertDevTarget("https://abcdefghijklmnopqrst.supabase.co")).toThrow(/refus/i);
    expect(() => assertDevTarget(`https://${DEV_PROJECT_REF}.evil.com`)).toThrow(/refus/i);
    expect(() => assertDevTarget(`https://x.com/${DEV_PROJECT_REF}.supabase.co`)).toThrow(/refus/i);
    expect(() => assertDevTarget("")).toThrow(/refus/i);
    expect(() => assertDevTarget(undefined)).toThrow(/refus/i);
  });
});
