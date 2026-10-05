import { act, renderHook } from "@testing-library/react-native";
import { Keyboard } from "react-native";

import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";

describe("useKeyboardHeight", () => {
  it("tracks the keyboard height from show/hide events", async () => {
    const handlers: Record<string, (e?: unknown) => void> = {};
    const remove = jest.fn();
    jest.spyOn(Keyboard, "addListener").mockImplementation(((name: string, cb: (e?: unknown) => void) => {
      handlers[name] = cb;
      return { remove };
    }) as never);

    const { result, unmount } = await renderHook(() => useKeyboardHeight());
    expect(result.current).toBe(0);

    await act(async () => {
      handlers[Object.keys(handlers).find((k) => /Show/.test(k))!]({ endCoordinates: { height: 300 } });
    });
    expect(result.current).toBe(300);

    await act(async () => {
      handlers[Object.keys(handlers).find((k) => /Hide/.test(k))!]();
    });
    expect(result.current).toBe(0);

    await unmount();
    expect(remove).toHaveBeenCalledTimes(2);
  });
});
