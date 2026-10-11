import { render } from "@testing-library/react-native";

import { PosterTmdbBadge } from "@/components/movie/PosterTmdbBadge";

describe("PosterTmdbBadge", () => {
  it("shows logo and one-decimal score", async () => {
    const { getByTestId } = await render(<PosterTmdbBadge testID="t" score={7.84} />);
    expect(getByTestId("t-logo")).toBeTruthy();
    expect(getByTestId("t-value").props.children).toBe("7.8");
  });

  it("shows dash without score", async () => {
    const { getByTestId } = await render(<PosterTmdbBadge testID="t" score={null} />);
    expect(getByTestId("t-value").props.children).toBe("–");
  });

  it("is flush bottom-right with embedded corner style", async () => {
    const { getByTestId } = await render(<PosterTmdbBadge testID="t" score={1} />);
    const cls = getByTestId("t").props.className as string;
    for (const c of ["absolute", "bottom-0", "right-0", "rounded-tl-xl", "bg-black/60", "py-1", "pl-2.5", "pr-1.5"]) {
      expect(cls).toContain(c);
    }
  });

  it("supports custom value testID", async () => {
    const { getByTestId } = await render(<PosterTmdbBadge testID="t" valueTestID="v" score={5} />);
    expect(getByTestId("v").props.children).toBe("5.0");
  });
});
