#!/usr/bin/env node
/**
 * Renders the final WatchCrew logo SVG masters (docs/logo-concepts/final/) to transparent PNGs,
 * one per group theme (currentColor -> theme accent), into assets/images/logo/.
 *
 * @resvg/resvg-js is NOT a project dependency. Run with a temporary install:
 *   npm i --no-save @resvg/resvg-js && node scripts/generate-logo-assets.js
 * (or install it in another directory and set NODE_PATH to its node_modules).
 *
 * The ACCENTS map mirrors `accent` in src/lib/groupTheme.ts (guarded by
 * __tests__/lib/logoAssets.test.ts).
 */
const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");

const ACCENTS = {
  gold: "#c8a44e",
  red: "#c75050",
  blue: "#4e8ac8",
  green: "#50a870",
  purple: "#9050c7",
  orange: "#c8784e",
};
const root = path.join(__dirname, "..");
const src = path.join(root, "docs/logo-concepts/final");
const out = path.join(root, "assets/images/logo");
fs.mkdirSync(out, { recursive: true });

const jobs = [
  ["watchcrew-logo-horizontal.svg", "watchcrew-logo", 1560], // 260x64 viewBox -> 1560x384 (6x)
  ["watchcrew-logo-icon.svg", "watchcrew-logo-icon", 512],
];
for (const [file, prefix, width] of jobs) {
  const svg = fs.readFileSync(path.join(src, file), "utf8");
  for (const [theme, accent] of Object.entries(ACCENTS)) {
    const png = new Resvg(svg.replace(/currentColor/g, accent), {
      fitTo: { mode: "width", value: width },
    })
      .render()
      .asPng();
    fs.writeFileSync(path.join(out, `${prefix}-${theme}.png`), png);
  }
}
console.log("done:", fs.readdirSync(out).length, "files in", out);
