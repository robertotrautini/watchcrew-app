"use strict";
// Tiny filter DSL shared by the REST client and the in-memory test backend.

const eq = (col, value) => ({ col, op: "eq", value });
const inList = (col, values) => ({ col, op: "in", values });
const notIn = (col, values) => ({ col, op: "notin", values });
const notNull = (col) => ({ col, op: "notnull" });

function matches(row, f) {
  const v = row[f.col];
  switch (f.op) {
    case "eq": return String(v) === String(f.value);
    case "in": return f.values.map(String).includes(String(v));
    case "notin": return !f.values.map(String).includes(String(v));
    case "notnull": return v !== null && v !== undefined;
    default: throw new Error(`unknown filter op ${f.op}`);
  }
}

/** PostgREST query-string fragment for one filter. */
function toQuery(f) {
  const enc = encodeURIComponent;
  switch (f.op) {
    case "eq": return `${f.col}=eq.${enc(f.value)}`;
    case "in": return `${f.col}=in.(${f.values.map(enc).join(",")})`;
    case "notin": return f.values.length ? `${f.col}=not.in.(${f.values.map(enc).join(",")})` : `${f.col}=not.is.null`;
    case "notnull": return `${f.col}=not.is.null`;
    default: throw new Error(`unknown filter op ${f.op}`);
  }
}

/** An "in" filter over an empty list can never match. */
const isEmptyIn = (filters = []) => filters.some((f) => f.op === "in" && f.values.length === 0);

module.exports = { eq, inList, notIn, notNull, matches, toQuery, isEmptyIn };
