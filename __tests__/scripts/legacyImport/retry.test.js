const { withRetry, runPool, chunk } = require("../../../scripts/legacy-import/retry");

describe("chunk", () => {
  it("splits arrays", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });
});

describe("withRetry", () => {
  it("retries transient errors with growing backoff, then succeeds", async () => {
    const sleeps = [];
    let n = 0;
    const r = await withRetry(
      async () => {
        n += 1;
        if (n < 3) throw Object.assign(new Error("x"), { status: 503 });
        return "ok";
      },
      { retries: 3, baseMs: 10, sleep: async (ms) => sleeps.push(ms) },
    );
    expect(r).toEqual({ value: "ok", attempts: 3 });
    expect(sleeps).toEqual([10, 20]);
  });
  it("does not retry permanent errors", async () => {
    let n = 0;
    await expect(
      withRetry(async () => { n += 1; throw Object.assign(new Error("bad"), { status: 400 }); }, { retries: 3, sleep: async () => {} }),
    ).rejects.toThrow("bad");
    expect(n).toBe(1);
  });
  it("gives up after the retry budget and keeps attempts on the error", async () => {
    let n = 0;
    const p = withRetry(async () => { n += 1; throw Object.assign(new Error("down"), { status: 500 }); }, { retries: 2, sleep: async () => {} });
    await expect(p).rejects.toMatchObject({ attempts: 3 });
    expect(n).toBe(3);
  });
});

describe("runPool", () => {
  it("never exceeds the concurrency and keeps result order", async () => {
    let active = 0;
    let max = 0;
    const out = await runPool([1, 2, 3, 4, 5, 6], 2, async (x) => {
      active += 1;
      max = Math.max(max, active);
      await new Promise((r) => setTimeout(r, 2));
      active -= 1;
      return x * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10, 12]);
    expect(max).toBe(2);
  });
});
