"use strict";

const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const isTransient = (e) => e && (e.code === "NETWORK" || e.status === 429 || e.status >= 500);

/** Retries transient errors with exponential backoff. Resolves { value, attempts }; rejects with error.attempts set. */
async function withRetry(fn, { retries = 3, baseMs = 500, sleep = defaultSleep, shouldRetry = isTransient } = {}) {
  let attempts = 0;
  for (;;) {
    attempts += 1;
    try {
      return { value: await fn(), attempts };
    } catch (e) {
      e.attempts = attempts;
      if (attempts > retries || !shouldRetry(e)) throw e;
      await sleep(baseMs * 2 ** (attempts - 1));
    }
  }
}

/** Runs worker over items with at most `concurrency` in flight; results keep input order. */
async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await worker(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, lane));
  return results;
}

module.exports = { withRetry, runPool, chunk, isTransient, defaultSleep };
