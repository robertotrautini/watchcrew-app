const mockInvoke = jest.fn();

jest.mock("../../src/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: mockInvoke,
    },
  },
}));

describe("deleteOwnAccount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("invokes the delete-account edge function with no body params (the JWT alone identifies the caller)", async () => {
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

    const { deleteOwnAccount } = require("../../src/lib/deleteAccount");
    const result = await deleteOwnAccount();

    expect(mockInvoke).toHaveBeenCalledWith("delete-account", { body: {} });
    expect(result).toEqual({ error: null });
  });

  it("maps a functions.invoke error with a message into { error: { message } } (never throws)", async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: "internal error" } });

    const { deleteOwnAccount } = require("../../src/lib/deleteAccount");
    const result = await deleteOwnAccount();

    expect(result).toEqual({ error: { message: "internal error" } });
  });

  it("falls back to String(error) when the error has no message property", async () => {
    mockInvoke.mockResolvedValue({ data: null, error: "boom" });

    const { deleteOwnAccount } = require("../../src/lib/deleteAccount");
    const result = await deleteOwnAccount();

    expect(result).toEqual({ error: { message: "boom" } });
  });
});
