const fs = require("fs");
const os = require("os");
const path = require("path");
const { loadServiceKey } = require("../../../scripts/legacy-import/serviceKey");

const REPO = path.resolve(__dirname, "..", "..", "..");
const SECRET = "test-secret-value-123";
function keyFile(mode = 0o600, content = `${SECRET}\n`) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "key-"));
  const p = path.join(dir, "key");
  fs.writeFileSync(p, content, { mode });
  fs.chmodSync(p, mode);
  return p;
}

describe("loadServiceKey", () => {
  it("reads the env var", () => {
    expect(loadServiceKey({ env: { SUPABASE_SERVICE_ROLE_KEY: ` ${SECRET} ` }, repoRoot: REPO })).toBe(SECRET);
  });
  it("reads a mode-600 key file outside the repo (trimmed)", () => {
    expect(loadServiceKey({ env: {}, keyFile: keyFile(), repoRoot: REPO })).toBe(SECRET);
  });
  it("rejects a key file readable by others", () => {
    expect(() => loadServiceKey({ env: {}, keyFile: keyFile(0o644), repoRoot: REPO })).toThrow(/600/);
  });
  it("rejects a key file inside the repo", () => {
    const p = path.join(REPO, "__tests__", "tmp-key-file");
    fs.writeFileSync(p, SECRET, { mode: 0o600 });
    try {
      expect(() => loadServiceKey({ env: {}, keyFile: p, repoRoot: REPO })).toThrow(/outside the repo/);
    } finally {
      fs.unlinkSync(p);
    }
  });
  it("rejects missing, empty and multi-line keys", () => {
    expect(() => loadServiceKey({ env: {}, repoRoot: REPO })).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(() => loadServiceKey({ env: {}, keyFile: keyFile(0o600, "\n"), repoRoot: REPO })).toThrow(/empty/);
    expect(() => loadServiceKey({ env: {}, keyFile: keyFile(0o600, "a\nb"), repoRoot: REPO })).toThrow(/single line/);
    expect(() => loadServiceKey({ env: {}, keyFile: "/nonexistent/key", repoRoot: REPO })).toThrow(/cannot read/);
  });
  it("never leaks the key in error messages", () => {
    for (const f of [() => loadServiceKey({ env: {}, keyFile: keyFile(0o644), repoRoot: REPO }), () => loadServiceKey({ env: {}, keyFile: keyFile(0o600, `${SECRET}\nx`), repoRoot: REPO })]) {
      try { f(); } catch (e) { expect(e.message).not.toContain(SECRET); }
    }
  });
});
