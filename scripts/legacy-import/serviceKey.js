"use strict";
// Service-role key loading. The key only ever comes from the environment or a
// private file outside the repo; it is never accepted as a CLI value and never
// appears in any message.

const fs = require("fs");
const path = require("path");

function loadServiceKey({ env = process.env, keyFile, repoRoot }) {
  let raw;
  if (keyFile) {
    const p = path.resolve(keyFile);
    if (repoRoot && (p === repoRoot || p.startsWith(repoRoot + path.sep))) {
      throw new Error("service key file must be outside the repo");
    }
    let st;
    try {
      st = fs.lstatSync(p);
    } catch {
      throw new Error("cannot read service key file");
    }
    if (!st.isFile()) throw new Error("service key file must be a regular file (no symlink)");
    if ((st.mode & 0o077) !== 0) throw new Error("service key file must have mode 600 (chmod 600 <file>)");
    try {
      raw = fs.readFileSync(p, "utf8");
    } catch {
      throw new Error("cannot read service key file");
    }
  } else {
    raw = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!raw) throw new Error("no service key: set SUPABASE_SERVICE_ROLE_KEY or pass --service-key-file <path>");
  }
  const key = raw.trim();
  if (!key) throw new Error("service key is empty");
  if (/\s/.test(key)) throw new Error("service key must be a single line");
  return key;
}

module.exports = { loadServiceKey };
