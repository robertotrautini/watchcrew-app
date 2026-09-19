// react-native-mmkv is a native module (the 4.x Nitro-modules rewrite) and
// cannot be instantiated inside the Jest/Node environment (no native binary
// is available there) — calling the real `createMMKV()` would throw. We
// replace it with a plain Map-backed fake that implements the tiny slice of
// the API mmkvStorage.ts actually uses (getString/set/remove). This is
// enough to prove the Zustand `StateStorage` adapter round-trips correctly
// through *some* MMKV-shaped storage without needing a real native binary —
// the actual native get/set/remove behavior is MMKV's own concern, not ours
// to re-test here.
const mockStorageMap = new Map<string, string>();

jest.mock("react-native-mmkv", () => {
  return {
    createMMKV: jest.fn().mockImplementation(() => ({
      getString: (key: string) => mockStorageMap.get(key),
      set: (key: string, value: string) => {
        mockStorageMap.set(key, value);
      },
      remove: (key: string) => {
        mockStorageMap.delete(key);
      },
    })),
  };
});

import { mmkvStorage } from "@/lib/mmkvStorage";

describe("mmkvStorage", () => {
  beforeEach(() => {
    mockStorageMap.clear();
  });

  it("getItem returns null for a key that was never set", () => {
    expect(mmkvStorage.getItem("missing")).toBeNull();
  });

  it("setItem then getItem round-trips the stored string", () => {
    mmkvStorage.setItem("foo", "bar");

    expect(mmkvStorage.getItem("foo")).toBe("bar");
  });

  it("removeItem deletes a previously stored value", () => {
    mmkvStorage.setItem("foo", "bar");

    mmkvStorage.removeItem("foo");

    expect(mmkvStorage.getItem("foo")).toBeNull();
  });
});
