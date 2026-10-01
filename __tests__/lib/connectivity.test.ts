import { onlineManager } from "@tanstack/react-query";

import { probeConnectivity, startConnectivityMonitor } from "@/lib/connectivity";

describe("probeConnectivity", () => {
  it("is online on any HTTP response, even an error status", async () => {
    const f = jest.fn().mockResolvedValue({ status: 401 });
    expect(await probeConnectivity("https://x", f, 1000)).toBe(true);
  });
  it("is offline when fetch rejects", async () => {
    const f = jest.fn().mockRejectedValue(new TypeError("Network request failed"));
    expect(await probeConnectivity("https://x", f, 1000)).toBe(false);
  });
});

describe("startConnectivityMonitor", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    onlineManager.setOnline(true);
  });

  it("sets onlineManager from probes, initially and on interval", async () => {
    const f = jest.fn().mockRejectedValueOnce(new Error("x")).mockResolvedValue({ status: 200 });
    const stop = startConnectivityMonitor({ url: "https://x", fetchImpl: f, intervalMs: 5000, timeoutMs: 1000 });
    await jest.advanceTimersByTimeAsync(0);
    expect(onlineManager.isOnline()).toBe(false);
    await jest.advanceTimersByTimeAsync(5000);
    expect(onlineManager.isOnline()).toBe(true);
    stop();
    const calls = f.mock.calls.length;
    await jest.advanceTimersByTimeAsync(20000);
    expect(f.mock.calls.length).toBe(calls);
  });
});
