"use strict";
// Hard guard: the import may only ever talk to the DEV Supabase project
// (ref from app.config.ts). Used by the apply phase (phase 2).

const DEV_PROJECT_REF = "vketnadfeyovguikpaao";

function assertDevTarget(url) {
  const expected = `https://${DEV_PROJECT_REF}.supabase.co`;
  let parsed;
  try {
    parsed = new URL(String(url));
  } catch {
    throw new Error("Refusing: target URL is missing or not a valid URL (only the dev project is allowed).");
  }
  if (parsed.protocol !== "https:" || parsed.origin !== expected || parsed.username || parsed.password) {
    throw new Error("Refusing: target is not the dev Supabase project. The legacy import never touches any other project.");
  }
}

module.exports = { assertDevTarget, DEV_PROJECT_REF };
