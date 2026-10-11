"use strict";
// Minimal parser for the extended INSERT statements of a phpMyAdmin/mysqldump
// file (complete-insert, i.e. with column list). Hand-written, no deps.
// Returns { tableName: [ { column: value } ] }; values are string | number | null.

const ESCAPES = { "0": "\0", n: "\n", r: "\r", t: "\t", Z: "\x1a", b: "\b" };

function parseString(text, start) {
  // text[start] === "'"
  let out = "";
  let i = start + 1;
  while (i < text.length) {
    const c = text[i];
    if (c === "\\") {
      const n = text[i + 1];
      out += Object.prototype.hasOwnProperty.call(ESCAPES, n) ? ESCAPES[n] : n;
      i += 2;
    } else if (c === "'") {
      if (text[i + 1] === "'") {
        out += "'";
        i += 2;
      } else {
        return { value: out, end: i + 1 };
      }
    } else {
      out += c;
      i += 1;
    }
  }
  throw new Error("Unterminated string literal in dump");
}

function parseBare(text, start) {
  let i = start;
  while (i < text.length && text[i] !== "," && text[i] !== ")") i += 1;
  const token = text.slice(start, i).trim();
  let value;
  if (token.toUpperCase() === "NULL") value = null;
  else if (/^-?\d+(\.\d+)?$/.test(token)) value = Number(token);
  else value = token;
  return { value, end: i };
}

function parseTuples(text, start, columns, table) {
  const rows = [];
  let i = start;
  for (;;) {
    while (i < text.length && /[\s,]/.test(text[i])) i += 1;
    if (text[i] === ";" || i >= text.length) return { rows, end: i + 1 };
    if (text[i] !== "(") throw new Error(`Unexpected character at tuple start in table ${table}`);
    i += 1;
    const values = [];
    for (;;) {
      while (/\s/.test(text[i])) i += 1;
      const r = text[i] === "'" ? parseString(text, i) : parseBare(text, i);
      values.push(r.value);
      i = r.end;
      while (/\s/.test(text[i])) i += 1;
      if (text[i] === ",") i += 1;
      else if (text[i] === ")") {
        i += 1;
        break;
      } else throw new Error(`Malformed tuple in table ${table}`);
    }
    if (values.length !== columns.length) {
      throw new Error(`Column count mismatch in table ${table}: expected ${columns.length}, got ${values.length}`);
    }
    const row = {};
    columns.forEach((c, k) => {
      row[c] = values[k];
    });
    rows.push(row);
  }
}

function parseDump(text) {
  const tables = {};
  const re = /INSERT INTO `([^`]+)` \(([^)]*)\) VALUES\s*/g;
  let m;
  while ((m = re.exec(text))) {
    const columns = m[2].split(",").map((c) => c.trim().replace(/`/g, ""));
    const { rows, end } = parseTuples(text, re.lastIndex, columns, m[1]);
    if (!tables[m[1]]) tables[m[1]] = [];
    for (const r of rows) tables[m[1]].push(r);
    re.lastIndex = end;
  }
  return tables;
}

module.exports = { parseDump };
