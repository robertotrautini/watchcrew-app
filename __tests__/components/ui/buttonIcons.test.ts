/** @jest-environment node */
// No @types/node in this repo: minimal local typing for the two node modules used.
declare const __dirname: string;
declare const require: (id: string) => any;
const fs = require("fs");
const path = require("path");

/**
 * Lint-style guard (docs/style-guide.md "Button-Icons"): every labelled action `<Button>` in src
 * carries a leading `icon="<role>"`. Icon-only buttons (`iconOnly`) are exempt (the icon IS the
 * content). Documented exception: the group switcher rows in group-settings (selection control,
 * label = group name).
 */
const SRC = path.join(__dirname, "..", "..", "..", "src");
const EXEMPT_TEST_IDS = ["group-settings-switch-"];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e: any) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      return walk(full);
    }
    return full.endsWith(".tsx") ? [full] : [];
  });
}

function buttonOpeningTags(source: string): string[] {
  const tags: string[] = [];
  const re = /<Button\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    let depth = 0;
    let j = re.lastIndex;
    for (; j < source.length; j++) {
      const c = source[j];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0 && source[j - 1] !== "=") break;
    }
    tags.push(source.slice(m.index, j + 1));
  }
  return tags;
}

describe("Button icon consistency", () => {
  const files = walk(SRC).filter((f: string) => !f.endsWith(path.join("ui", "Button.tsx")));

  it("finds Button usages (guard against a broken scanner)", () => {
    const total = files.reduce((n: number, f: string) => n + buttonOpeningTags(fs.readFileSync(f, "utf8")).length, 0);
    expect(total).toBeGreaterThan(40);
  });

  it("every labelled Button has an icon role (or is icon-only / exempt)", () => {
    const offenders: string[] = [];
    for (const file of files) {
      for (const tag of buttonOpeningTags(fs.readFileSync(file, "utf8"))) {
        const hasIcon = /\sicon=/.test(tag) || /\siconOnly\b/.test(tag);
        const exempt = EXEMPT_TEST_IDS.some((id) => tag.includes(id));
        if (!hasIcon && !exempt) {
          offenders.push(`${path.relative(SRC, file)}: ${tag.replace(/\s+/g, " ").slice(0, 100)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no Button wraps hand-built Icon + Text children any more", () => {
    const offenders = files.filter((f: string) => {
      const s = fs.readFileSync(f, "utf8");
      return /<Button\b[^>]*>\s*<Icon\b/.test(s) && !/iconOnly/.test(s);
    });
    expect(offenders.map((f: string) => path.relative(SRC, f))).toEqual([]);
  });
});
