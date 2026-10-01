import { AUTH_CALLBACK_URL, parseAuthLink } from "@/lib/authDeepLink";

describe("AUTH_CALLBACK_URL", () => {
  it("uses the watchcrew scheme and the auth/callback route", () => {
    expect(AUTH_CALLBACK_URL).toBe("watchcrew://auth/callback");
  });
});

describe("parseAuthLink", () => {
  it("returns an empty result for null / empty / unparsable input", () => {
    const empty = {
      accessToken: null,
      refreshToken: null,
      code: null,
      type: null,
      error: null,
      errorCode: null,
      errorDescription: null,
    };
    expect(parseAuthLink(null)).toEqual(empty);
    expect(parseAuthLink("")).toEqual(empty);
    expect(parseAuthLink("watchcrew://auth/callback")).toEqual(empty);
  });

  it("parses implicit-flow tokens from the URL fragment", () => {
    const result = parseAuthLink(
      "watchcrew://auth/callback#access_token=AT&refresh_token=RT&expires_in=3600&token_type=bearer&type=recovery",
    );
    expect(result.accessToken).toBe("AT");
    expect(result.refreshToken).toBe("RT");
    expect(result.type).toBe("recovery");
    expect(result.code).toBeNull();
    expect(result.error).toBeNull();
  });

  it("parses signup confirmation tokens from the fragment", () => {
    const result = parseAuthLink("watchcrew://auth/callback#access_token=AT&refresh_token=RT&type=signup");
    expect(result.type).toBe("signup");
    expect(result.accessToken).toBe("AT");
  });

  it("parses a PKCE code from the query string", () => {
    const result = parseAuthLink("watchcrew://auth/callback?code=abc123");
    expect(result.code).toBe("abc123");
    expect(result.accessToken).toBeNull();
  });

  it("parses tokens from the query string as well", () => {
    const result = parseAuthLink("watchcrew://auth/callback?access_token=AT&refresh_token=RT&type=recovery");
    expect(result.accessToken).toBe("AT");
    expect(result.refreshToken).toBe("RT");
    expect(result.type).toBe("recovery");
  });

  it("parses error params from the fragment (expired link) and decodes them", () => {
    const result = parseAuthLink(
      "watchcrew://auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
    );
    expect(result.error).toBe("access_denied");
    expect(result.errorCode).toBe("otp_expired");
    expect(result.errorDescription).toBe("Email link is invalid or has expired");
    expect(result.accessToken).toBeNull();
  });

  it("parses error params from the query string", () => {
    const result = parseAuthLink("watchcrew://auth/callback?error=access_denied&error_code=otp_expired");
    expect(result.error).toBe("access_denied");
    expect(result.errorCode).toBe("otp_expired");
  });

  it("prefers fragment values over query values", () => {
    const result = parseAuthLink("watchcrew://auth/callback?type=signup#type=recovery&access_token=AT&refresh_token=RT");
    expect(result.type).toBe("recovery");
  });

  it("works with exp:// dev URLs containing a path prefix", () => {
    const result = parseAuthLink("exp://192.168.0.2:8081/--/auth/callback#access_token=AT&refresh_token=RT&type=recovery");
    expect(result.accessToken).toBe("AT");
    expect(result.type).toBe("recovery");
  });
});
