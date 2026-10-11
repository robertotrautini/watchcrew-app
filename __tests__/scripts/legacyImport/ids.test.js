const { uuidv5, NAMESPACE, legacyId, DNS_NAMESPACE } = require("../../../scripts/legacy-import/ids");

describe("uuidv5", () => {
  it("matches the RFC 4122 reference value", () => {
    expect(uuidv5("www.example.com", DNS_NAMESPACE)).toBe("2ed6657d-e927-568b-95e1-2665a8aea6a2");
  });
  it("pins the import namespace constant", () => {
    expect(NAMESPACE).toBe(uuidv5("watchcrew-legacy-import", DNS_NAMESPACE));
  });
  it("is deterministic and kind-scoped", () => {
    expect(legacyId("entry", 5)).toBe(legacyId("entry", 5));
    expect(legacyId("entry", 5)).not.toBe(legacyId("group", 5));
    expect(legacyId("rating", 5, 2)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
