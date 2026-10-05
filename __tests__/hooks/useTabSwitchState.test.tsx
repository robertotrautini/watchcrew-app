import { renderHook } from "@testing-library/react-native";

import { useTabSwitchState } from "@/hooks/useTabSwitchState";

describe("useTabSwitchState", () => {
  it("bumps epoch only on tab-to-tab changes", async () => {
    const { result, rerender } = await renderHook(({ tab }: { tab: string | null }) => useTabSwitchState(tab), {
      initialProps: { tab: "tracker" as string | null },
    });
    expect(result.current).toEqual({ tab: "tracker", epoch: 0 });
    await rerender({ tab: "watchlist" });
    expect(result.current).toEqual({ tab: "watchlist", epoch: 1 });
    await rerender({ tab: null });
    expect(result.current).toEqual({ tab: "watchlist", epoch: 1 });
    await rerender({ tab: "watchlist" });
    expect(result.current.epoch).toBe(1);
  });
});
