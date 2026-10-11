import { act, renderHook } from "@testing-library/react-native";

jest.mock("expo-router", () => require("../helpers/mockRouter").createExpoRouterMock());

import { useColumnSort } from "@/hooks/useColumnSort";

describe("useColumnSort", () => {
  it("starts without a column sort and cycles asc -> desc -> none", async () => {
    const { result } = await renderHook(() => useColumnSort<"title" | "tmdb">());
    expect(result.current.columnSort).toBeNull();
    await act(async () => result.current.toggleColumn("title"));
    expect(result.current.columnSort).toEqual({ column: "title", direction: "asc" });
    await act(async () => result.current.toggleColumn("title"));
    expect(result.current.columnSort).toEqual({ column: "title", direction: "desc" });
    await act(async () => result.current.toggleColumn("title"));
    expect(result.current.columnSort).toBeNull();
  });

  it("switching column restarts at asc", async () => {
    const { result } = await renderHook(() => useColumnSort<"title" | "tmdb">());
    await act(async () => result.current.toggleColumn("title"));
    await act(async () => result.current.toggleColumn("tmdb"));
    expect(result.current.columnSort).toEqual({ column: "tmdb", direction: "asc" });
  });
});
