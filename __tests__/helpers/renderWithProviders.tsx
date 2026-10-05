import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook } from "@testing-library/react-native";

// Fresh QueryClient per call: no retries, no cache retention (gcTime 0), so a test never sees another
// test's cached data and failing queries settle immediately.
export function createTestQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
}

export function createQueryWrapper(queryClient: QueryClient = createTestQueryClient()) {
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// Always `await` the results (RNTL async render in this repo's version combo).
export async function renderWithProviders(ui: ReactElement, queryClient: QueryClient = createTestQueryClient()) {
  const result = await render(ui, { wrapper: createQueryWrapper(queryClient) });
  return { ...result, queryClient };
}

export async function renderHookWithProviders<Result, Props>(
  callback: (props: Props) => Result,
  options: { initialProps?: Props; queryClient?: QueryClient } = {},
) {
  const queryClient = options.queryClient ?? createTestQueryClient();
  const result = await renderHook(callback, { wrapper: createQueryWrapper(queryClient), initialProps: options.initialProps });
  return { ...result, queryClient };
}
