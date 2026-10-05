import { formatPlainDate, getYearFromDate } from "@/lib/dateFormat";

describe("formatPlainDate", () => {
  it("formats YYYY-MM-DD as DD.MM.YYYY", () => {
    expect(formatPlainDate("2024-03-07")).toBe("07.03.2024");
  });

  it("ignores a time suffix", () => {
    expect(formatPlainDate("2024-03-07T12:00:00Z")).toBe("07.03.2024");
  });

  it("returns an empty string for null by default", () => {
    expect(formatPlainDate(null)).toBe("");
  });

  it("returns the given fallback for null or empty input", () => {
    expect(formatPlainDate(null, "Kein Datum")).toBe("Kein Datum");
    expect(formatPlainDate("", "Kein Datum")).toBe("Kein Datum");
  });
});

describe("getYearFromDate", () => {
  it("returns the numeric year", () => {
    expect(getYearFromDate("1999-12-31")).toBe(1999);
  });
});
