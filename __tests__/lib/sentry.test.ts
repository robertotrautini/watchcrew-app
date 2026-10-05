const mockInit = jest.fn();

// `mockInit` is captured by closure so it stays the SAME jest.fn() reference
// across `jest.resetModules()` calls below (resetModules() re-runs this
// factory for a fresh require of "@sentry/react-native", but the returned
// `init` is still this one function).
jest.mock("@sentry/react-native", () => ({
  init: mockInit,
}));

const REAL_DSN =
  "https://81fe18bbee281b14d29e1a416e7df5e2@o4512112781557760.ingest.de.sentry.io/4512112790995024";

describe("initSentry", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("does not call Sentry.init when the DSN is missing", () => {
    jest.doMock("expo-constants", () => ({
      __esModule: true,
      default: {
        expoConfig: { extra: {} },
      },
    }));

    const { initSentry } = require("../src/lib/sentry");

    expect(() => initSentry()).not.toThrow();
    expect(mockInit).not.toHaveBeenCalled();
  });

  it("calls Sentry.init with only the dsn when it is present", () => {
    jest.doMock("expo-constants", () => ({
      __esModule: true,
      default: {
        expoConfig: { extra: { sentryDsn: REAL_DSN } },
      },
    }));

    const { initSentry } = require("../src/lib/sentry");

    initSentry();

    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockInit).toHaveBeenCalledWith({ dsn: REAL_DSN });
  });
});
