// Shared fake for `expo-router`. Usage in a test file:
//
//   import { mockRouter } from "<rel>/helpers/mockRouter";
//   jest.mock("expo-router", () => require("<rel>/helpers/mockRouter").createExpoRouterMock());
//
// `mockRouter` is ONE shared object: `useRouter()` and the imperative `router` export both return it,
// so assertions are `expect(mockRouter.push).toHaveBeenCalledWith(...)`. Pass `overrides` to add or
// replace module exports (e.g. `useLocalSearchParams: () => mockParams()` or `Link`).
// Note: the factory must `require` the helper (not use the import) so it stays valid under jest.mock
// hoisting; both resolve to the same module instance as long as the test does not jest.resetModules().

export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  canGoBack: jest.fn(() => true),
  setParams: jest.fn(),
};

export function resetMockRouter(): void {
  for (const fn of Object.values(mockRouter)) fn.mockClear();
  mockRouter.canGoBack.mockImplementation(() => true);
}

export function createExpoRouterMock(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- must be required lazily inside the jest.mock factory
  const React = require("react");
  return {
    useRouter: () => mockRouter,
    router: mockRouter,
    useLocalSearchParams: () => ({}),
    useFocusEffect: (callback: () => void | (() => void)) => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount, like a focus
      React.useEffect(() => callback(), []);
    },
    Stack: { Screen: () => null },
    ...overrides,
  };
}
