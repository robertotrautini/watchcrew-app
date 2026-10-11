import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockShowToast = jest.fn();
jest.mock("@/lib/toast", () => ({ showToast: (...a: unknown[]) => mockShowToast(...a) }));

import { useAppMutation } from "@/hooks/useAppMutation";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const wrapper = function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
  return { wrapper, queryClient };
}

describe("useAppMutation", () => {
  beforeEach(() => jest.clearAllMocks());

  it("invalidates static keys, calls onSuccess and shows the success toast", async () => {
    const { wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, "invalidateQueries");
    const onSuccess = jest.fn();
    const { result } = await renderHook(
      () =>
        useAppMutation({
          mutationFn: async (v: { id: string }) => v.id,
          invalidateKeys: [["a"], ["b", "x"]],
          successToast: "ok",
          errorToast: "bad",
          onSuccess,
        }),
      { wrapper },
    );
    await act(async () => {
      result.current.mutate({ id: "1" });
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["a"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["b", "x"] });
    expect(onSuccess).toHaveBeenCalledWith("1", { id: "1" });
    expect(mockShowToast).toHaveBeenCalledWith("ok", { variant: "success" });
    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });

  it("derives keys and toast text from variables", async () => {
    const { wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = await renderHook(
      () =>
        useAppMutation({
          mutationFn: async (v: { id: string; on: boolean }) => v.id,
          invalidateKeys: (v) => [["item", v.id]],
          successToast: (_d, v) => (v.on ? "an" : "aus"),
        }),
      { wrapper },
    );
    await act(async () => {
      result.current.mutate({ id: "7", on: false });
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["item", "7"] });
    expect(mockShowToast).toHaveBeenCalledWith("aus", { variant: "success" });
  });

  it("on error: error toast, onError callback, no invalidation, no success toast", async () => {
    const { wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, "invalidateQueries");
    const onError = jest.fn();
    const err = new Error("boom");
    const { result } = await renderHook(
      () =>
        useAppMutation({
          mutationFn: async (_v: void) => {
            throw err;
          },
          invalidateKeys: [["a"]],
          successToast: "ok",
          errorToast: "bad",
          onError,
        }),
      { wrapper },
    );
    await act(async () => {
      result.current.mutate();
    });
    expect(spy).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(err, undefined);
    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith("bad", { variant: "error" });
  });

  it("shows no toast when none configured", async () => {
    const { wrapper } = createWrapper();
    const { result } = await renderHook(
      () => useAppMutation({ mutationFn: async (_v: void) => 1 }),
      { wrapper },
    );
    await act(async () => {
      result.current.mutate();
    });
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});
