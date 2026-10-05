// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

/**
 * Lint-style guard: the gold highlight must follow the group theme, so the
 * gold hex values may only appear in the theme definitions (and documented
 * constants). Everything else uses accent tokens / useGroupTheme().colors.
 */
const FORBIDDEN = [
  /#c8a44e/i,
  /#c9a54e/i,
  /#e8d5a3/i,
  /#d4af37/i,
  /#f5c518/i,
  /#f5b301/i,
  /#d4aa4f/i,
  /#b8903e/i,
  /#ffd700/i,
  /\b(?:text|bg|border|fill|stroke|ring)-(?:yellow|amber|gold)\b/,
  /rgba?\(\s*200\s*,\s*164\s*,\s*78/i,
];

/** Files that DEFINE the themes or document the fallback (paths relative to repo root). */
const ALLOWLIST = new Set([
  "src/lib/groupTheme.ts", // theme definitions (source of truth)
  "src/global.css", // theme CSS variables
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }) as Array<{ name: string; isDirectory(): boolean }>) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|css|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("no hard-coded gold accent outside the theme definitions", () => {
  const files = walk("src").filter((f) => !ALLOWLIST.has(f));

  it("scans a non-trivial number of files", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it.each(files)("%s", (file) => {
    const lines = fs.readFileSync(file, "utf8").split("\n") as string[];
    const offenders = lines
      .map((line, i) => ({ line, n: i + 1 }))
      // comments may mention the legacy values
      .filter(({ line }) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .filter(({ line }) => FORBIDDEN.some((re) => re.test(line)))
      .map(({ n, line }) => `${file}:${n}: ${line.trim()}`);
    expect(offenders).toEqual([]);
  });
});
