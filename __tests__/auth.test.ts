const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();

jest.mock("../src/lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
  },
}));

describe("auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("signUpWithEmail", () => {
    it("calls supabase.auth.signUp with email and password and returns its { data, error } result unchanged", async () => {
      const fakeResult = {
        data: { user: { id: "u1" }, session: null },
        error: null,
      };
      mockSignUp.mockResolvedValue(fakeResult);

      const { signUpWithEmail } = require("../src/lib/auth");
      const result = await signUpWithEmail("a@b.com", "secret123");

      expect(mockSignUp).toHaveBeenCalledWith({
        email: "a@b.com",
        password: "secret123",
      });
      expect(result).toBe(fakeResult);
    });

    it("returns the { data, error } shape unchanged when signUp fails, instead of throwing", async () => {
      const fakeResult = {
        data: { user: null, session: null },
        error: { message: "already registered" },
      };
      mockSignUp.mockResolvedValue(fakeResult);

      const { signUpWithEmail } = require("../src/lib/auth");
      const result = await signUpWithEmail("a@b.com", "secret123");

      expect(result).toBe(fakeResult);
    });
  });

  describe("signInWithEmail", () => {
    it("calls supabase.auth.signInWithPassword with email and password and returns its result", async () => {
      const fakeResult = {
        data: { user: { id: "u1" }, session: {} },
        error: null,
      };
      mockSignInWithPassword.mockResolvedValue(fakeResult);

      const { signInWithEmail } = require("../src/lib/auth");
      const result = await signInWithEmail("a@b.com", "secret123");

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "a@b.com",
        password: "secret123",
      });
      expect(result).toBe(fakeResult);
    });

    it("returns the { data, error } shape unchanged when sign-in fails, instead of throwing", async () => {
      const fakeResult = {
        data: { user: null, session: null },
        error: { message: "invalid credentials" },
      };
      mockSignInWithPassword.mockResolvedValue(fakeResult);

      const { signInWithEmail } = require("../src/lib/auth");
      const result = await signInWithEmail("a@b.com", "wrong");

      expect(result).toBe(fakeResult);
    });
  });

  describe("signOut", () => {
    it("calls supabase.auth.signOut with no arguments and returns its result", async () => {
      const fakeResult = { error: null };
      mockSignOut.mockResolvedValue(fakeResult);

      const { signOut } = require("../src/lib/auth");
      const result = await signOut();

      expect(mockSignOut).toHaveBeenCalledWith();
      expect(result).toBe(fakeResult);
    });

    it("returns the { error } shape unchanged when sign-out fails, instead of throwing", async () => {
      const fakeResult = { error: { message: "network error" } };
      mockSignOut.mockResolvedValue(fakeResult);

      const { signOut } = require("../src/lib/auth");
      const result = await signOut();

      expect(result).toBe(fakeResult);
    });
  });
});
