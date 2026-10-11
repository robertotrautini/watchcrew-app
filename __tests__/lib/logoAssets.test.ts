/** @jest-environment node */
// No @types/node in this repo: minimal local typing.
declare const __dirname: string;
declare const require: (id: string) => any;
import { GROUP_THEME_OPTIONS, resolveGroupTheme } from "@/lib/groupTheme";

const fs = require("fs");
const path = require("path");

describe("logo asset generator", () => {
  const script = fs.readFileSync(path.join(__dirname, "../../scripts/generate-logo-assets.js"), "utf8");
  it.each(GROUP_THEME_OPTIONS)("uses the %s theme accent", (theme) => {
    expect(script).toContain(`${theme}: "${resolveGroupTheme(theme).colors.accent}"`);
  });
  it.each(GROUP_THEME_OPTIONS)("has PNGs for %s", (theme) => {
    const dir = path.join(__dirname, "../../assets/images/logo");
    expect(fs.existsSync(path.join(dir, `watchcrew-logo-${theme}.png`))).toBe(true);
    expect(fs.existsSync(path.join(dir, `watchcrew-logo-icon-${theme}.png`))).toBe(true);
  });
});
