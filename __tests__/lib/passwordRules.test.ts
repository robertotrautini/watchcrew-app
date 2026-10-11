import { MIN_PASSWORD_LENGTH } from "@/lib/passwordRules";

describe("passwordRules", () => {
  it("MIN_PASSWORD_LENGTH matches supabase/config.toml auth.minimum_password_length", () => {
    const fs = require("fs");
    const path = require("path");
    const toml: string = fs.readFileSync(path.join(process.cwd(), "supabase", "config.toml"), "utf8");
    const match = toml.match(/^\s*minimum_password_length\s*=\s*(\d+)/m);
    expect(match).not.toBeNull();
    expect(MIN_PASSWORD_LENGTH).toBe(Number(match![1]));
  });

  it("is a positive integer", () => {
    expect(Number.isInteger(MIN_PASSWORD_LENGTH)).toBe(true);
    expect(MIN_PASSWORD_LENGTH).toBeGreaterThan(0);
  });
});
