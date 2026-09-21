import {
  isPlaceholderLegalUrl,
  PLACEHOLDER_PRIVACY_POLICY_URL,
  PLACEHOLDER_TERMS_OF_SERVICE_URL,
} from "@/lib/legalLinks";

// M11 part 2, Job 3 (legal document placeholder plumbing) — pure helper
// function determining whether a configured privacy-policy/terms-of-service
// URL is still the placeholder default (no real iubenda embed set up yet)
// or a real, openable URL.

describe("isPlaceholderLegalUrl", () => {
  it("treats the known privacy-policy placeholder as a placeholder", () => {
    expect(isPlaceholderLegalUrl(PLACEHOLDER_PRIVACY_POLICY_URL)).toBe(true);
  });

  it("treats the known terms-of-service placeholder as a placeholder", () => {
    expect(isPlaceholderLegalUrl(PLACEHOLDER_TERMS_OF_SERVICE_URL)).toBe(true);
  });

  it("treats an empty string as a placeholder", () => {
    expect(isPlaceholderLegalUrl("")).toBe(true);
  });

  it("treats null/undefined as a placeholder", () => {
    expect(isPlaceholderLegalUrl(null)).toBe(true);
    expect(isPlaceholderLegalUrl(undefined)).toBe(true);
  });

  it("treats a real configured URL as NOT a placeholder", () => {
    expect(isPlaceholderLegalUrl("https://www.iubenda.com/privacy-policy/12345678")).toBe(false);
  });
});
