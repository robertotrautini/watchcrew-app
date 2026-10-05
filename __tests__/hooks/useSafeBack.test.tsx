import { mockRouter } from "../helpers/mockRouter";
import { renderHook } from "@testing-library/react-native";

jest.mock("expo-router", () => require("../helpers/mockRouter").createExpoRouterMock());

import { useSafeBack } from "@/hooks/useSafeBack";

describe("useSafeBack", () => {
  beforeEach(() => jest.clearAllMocks());

  it("pops one level when there is history", async () => {
    mockRouter.canGoBack.mockReturnValue(true);
    const { result } = await renderHook(() => useSafeBack());
    result.current();
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("falls back to the root route (deep link / cold start without history)", async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    const { result } = await renderHook(() => useSafeBack());
    result.current();
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith("/");
  });

  it("accepts a custom fallback", async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    const { result } = await renderHook(() => useSafeBack("/settings" as never));
    result.current();
    expect(mockRouter.replace).toHaveBeenCalledWith("/settings");
  });
});
