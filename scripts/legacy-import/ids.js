"use strict";
const crypto = require("crypto");

const DNS_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function uuidv5(name, namespace) {
  const ns = Buffer.from(namespace.replace(/-/g, ""), "hex");
  const h = crypto.createHash("sha1").update(ns).update(Buffer.from(name, "utf8")).digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const x = b.toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

// Fixed once: uuidv5("watchcrew-legacy-import", DNS). NEVER change (idempotent reruns).
const NAMESPACE = uuidv5("watchcrew-legacy-import", DNS_NAMESPACE);

/** legacyId("entry", 12) -> uuidv5("entry:12", NAMESPACE) */
function legacyId(kind, ...parts) {
  return uuidv5([kind, ...parts].join(":"), NAMESPACE);
}

module.exports = { uuidv5, legacyId, NAMESPACE, DNS_NAMESPACE };
