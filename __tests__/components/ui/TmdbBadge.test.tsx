import { render } from "@testing-library/react-native";

import { TmdbBadge } from "@/components/ui/TmdbBadge";

describe("TmdbBadge", () => {
  it("renders the TMDB logo image and the one-decimal score", async () => {
    const { getByTestId } = await render(<TmdbBadge testID="b" score={8.46} />);
    expect(getByTestId("b-logo")).toBeTruthy();
    expect(getByTestId("b-value").props.children).toBe("8.5");
  });

  it("exposes a German a11y label with the score", async () => {
    const { getByTestId } = await render(<TmdbBadge testID="b" score={8.4} />);
    expect(getByTestId("b").props.accessibilityLabel).toBe("TMDB Bewertung 8.4");
  });

  it("shows a dash when there is no score", async () => {
    const { getByTestId } = await render(<TmdbBadge testID="b" score={null} />);
    expect(getByTestId("b-value").props.children).toBe("–");
    expect(getByTestId("b").props.accessibilityLabel).toBe("TMDB Bewertung unbekannt");
  });

  it("merges the caller's className with the row layout and keeps the logo contained", async () => {
    const { getByTestId } = await render(
      <TmdbBadge testID="b" score={7} className="absolute bottom-0 right-0 rounded-tl-xl bg-black/60 px-3 py-1" />,
    );
    const cls = getByTestId("b").props.className as string;
    for (const c of ["flex-row", "items-center", "absolute", "bottom-0", "right-0", "rounded-tl-xl", "bg-black/60"]) {
      expect(cls).toContain(c);
    }
    expect(getByTestId("b-logo").props.contentFit).toBe("contain");
  });
});
