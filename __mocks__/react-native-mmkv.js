// Global Jest fake for the native react-native-mmkv module (Nitro modules are
// unavailable under Jest). Tests that need specific behavior still override
// it with their own jest.mock("react-native-mmkv", ...).
module.exports = {
  createMMKV: () => {
    const map = new Map();
    return {
      getString: (key) => map.get(key),
      set: (key, value) => map.set(key, value),
      remove: (key) => map.delete(key),
    };
  },
};
