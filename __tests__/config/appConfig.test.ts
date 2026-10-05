import Constants from "expo-constants";

describe("app.config.ts extra values", () => {
  it("exposes the correct, known non-secret Supabase and Sentry config", () => {
    const extra = Constants.expoConfig?.extra;

    expect(extra?.supabaseUrl).toBe("https://vketnadfeyovguikpaao.supabase.co");
    expect(extra?.supabasePublishableKey).toBe(
      "sb_publishable_KFJgGHttxOlTEGMXrV6aYw_C8CdlO39",
    );
    expect(extra?.sentryDsn).toBe(
      "https://81fe18bbee281b14d29e1a416e7df5e2@o4512112781557760.ingest.de.sentry.io/4512112790995024",
    );
  });
});
