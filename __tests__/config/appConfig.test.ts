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

describe("brand assets in app.config.ts", () => {
  const cfg = Constants.expoConfig;

  it("uses the legacy-glyph icon with a black adaptive background", () => {
    expect(cfg?.name).toBe("WatchCrew");
    expect(cfg?.icon).toBe("./assets/images/icon.png");
    expect(cfg?.ios?.icon).toBeUndefined();
    expect(cfg?.android?.adaptiveIcon?.backgroundColor).toBe("#0a0a0a");
    expect(cfg?.android?.adaptiveIcon?.foregroundImage).toBe(
      "./assets/images/android-icon-foreground.png",
    );
  });

  it("configures a black native splash with the glyph", () => {
    const splash = cfg?.plugins?.find(
      (p) => Array.isArray(p) && p[0] === "expo-splash-screen",
    ) as [string, { backgroundColor: string; image: string }] | undefined;
    expect(splash?.[1].backgroundColor).toBe("#000000");
    expect(splash?.[1].image).toBe("./assets/images/splash-icon.png");
  });
});
