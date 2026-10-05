const mockCreateClient = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

const mockGetItemAsync = jest.fn();
const mockSetItemAsync = jest.fn();
const mockDeleteItemAsync = jest.fn();

jest.mock("expo-secure-store", () => ({
  getItemAsync: mockGetItemAsync,
  setItemAsync: mockSetItemAsync,
  deleteItemAsync: mockDeleteItemAsync,
}));

const FAKE_URL = "https://vketnadfeyovguikpaao.supabase.co";
const FAKE_KEY = "sb_publishable_KFJgGHttxOlTEGMXrV6aYw_C8CdlO39";

function mockExpoConstants() {
  jest.doMock("expo-constants", () => ({
    __esModule: true,
    default: {
      expoConfig: {
        extra: {
          supabaseUrl: FAKE_URL,
          supabasePublishableKey: FAKE_KEY,
        },
      },
    },
  }));
}

describe("supabase client", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockExpoConstants();
  });

  it("creates the client with the URL and publishable key from app config", () => {
    require("../../src/lib/supabase");

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    const [url, key] = mockCreateClient.mock.calls[0];
    expect(url).toBe(FAKE_URL);
    expect(key).toBe(FAKE_KEY);
  });

  it("configures auth with autoRefreshToken, persistSession, detectSessionInUrl:false and a custom storage adapter", () => {
    require("../../src/lib/supabase");

    const [, , options] = mockCreateClient.mock.calls[0];
    expect(options.auth.autoRefreshToken).toBe(true);
    expect(options.auth.persistSession).toBe(true);
    expect(options.auth.detectSessionInUrl).toBe(false);
    expect(options.auth.storage).toEqual(
      expect.objectContaining({
        getItem: expect.any(Function),
        setItem: expect.any(Function),
        removeItem: expect.any(Function),
      }),
    );
  });

  it("exports the client instance returned by createClient", () => {
    const fakeClient = { auth: {} };
    mockCreateClient.mockReturnValue(fakeClient);

    const { supabase } = require("../../src/lib/supabase");

    expect(supabase).toBe(fakeClient);
  });
});

// SecureStore enforces a real ~2048 byte per-value limit on Android/iOS. A
// Supabase auth session (JWT access token + refresh token + user object) can
// realistically exceed that, so the auth storage adapter must chunk large
// values across multiple SecureStore keys rather than storing one blob.
describe("largeSecureStore auth storage adapter", () => {
  let fakeStore: Record<string, string>;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockExpoConstants();
    mockCreateClient.mockReturnValue({ auth: {} });

    fakeStore = {};
    mockSetItemAsync.mockImplementation(async (k: string, v: string) => {
      fakeStore[k] = v;
    });
    mockGetItemAsync.mockImplementation(
      async (k: string) => fakeStore[k] ?? null,
    );
    mockDeleteItemAsync.mockImplementation(async (k: string) => {
      delete fakeStore[k];
    });
  });

  it("splits large values across multiple SecureStore keys, each within the ~2048 byte per-value limit, and reconstructs them on read", async () => {
    const { largeSecureStore } = require("../../src/lib/supabase");
    const largeValue = "a".repeat(5000);

    await largeSecureStore.setItem("supabase-session", largeValue);

    for (const storedValue of Object.values(fakeStore)) {
      expect(storedValue.length).toBeLessThanOrEqual(2048);
    }
    expect(mockSetItemAsync.mock.calls.length).toBeGreaterThan(1);

    const readBack = await largeSecureStore.getItem("supabase-session");
    expect(readBack).toBe(largeValue);
  });

  it("round-trips small values (below the chunk size) too", async () => {
    const { largeSecureStore } = require("../../src/lib/supabase");

    await largeSecureStore.setItem("small-key", "short-value");

    expect(await largeSecureStore.getItem("small-key")).toBe("short-value");
  });

  it("removes all chunks for a key", async () => {
    const { largeSecureStore } = require("../../src/lib/supabase");

    await largeSecureStore.setItem("supabase-session", "a".repeat(5000));
    await largeSecureStore.removeItem("supabase-session");

    expect(Object.keys(fakeStore)).toHaveLength(0);
    expect(await largeSecureStore.getItem("supabase-session")).toBeNull();
  });

  it("returns null for a key that was never stored", async () => {
    const { largeSecureStore } = require("../../src/lib/supabase");

    expect(await largeSecureStore.getItem("missing-key")).toBeNull();
  });
});
