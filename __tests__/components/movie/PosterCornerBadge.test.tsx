import { render } from "@testing-library/react-native";

import { PosterCornerBadge } from "@/components/movie/PosterCornerBadge";

function childIds(node: { children: unknown[] }): string[] {
  const ids: string[] = [];
  const walk = (n: unknown) => {
    const el = n as { props?: { testID?: string }; children?: unknown[] };
    if (el && typeof el === "object") {
      if (el.props?.testID) ids.push(el.props.testID);
      (el.children ?? []).forEach(walk);
    }
  };
  (node.children ?? []).forEach(walk);
  return ids;
}

describe("PosterCornerBadge", () => {
  it("renders nothing when nothing to show", async () => {
    const { queryByTestId } = await render(<PosterCornerBadge testID="b" />);
    expect(queryByTestId("b")).toBeNull();
  });

  it("renders nothing for all-false/null inputs", async () => {
    const { queryByTestId } = await render(
      <PosterCornerBadge testID="b" liked={false} watched={false} onWatchlist={false} dateText={null} />,
    );
    expect(queryByTestId("b")).toBeNull();
  });

  it("is flush top-right with embedded corner style", async () => {
    const { getByTestId } = await render(<PosterCornerBadge testID="b" dateText="01.01.2030" />);
    const cls = getByTestId("b").props.className as string;
    for (const c of ["absolute", "right-0", "top-0", "rounded-bl-xl", "bg-black/60", "py-1", "pl-2.5", "pr-1.5"]) {
      expect(cls).toContain(c);
    }
  });

  it("orders heart, star+average, eye, bookmark, date and caps at two", async () => {
    const { getByTestId } = await render(
      <PosterCornerBadge
        testID="b"
        idPrefix="p"
        liked
        average={4}
        watched
        onWatchlist
        dateText="x"
      />,
    );
    const ids = childIds(getByTestId("b") as never);
    expect(ids.some((i) => i.startsWith("p-like"))).toBe(true);
    expect(ids.some((i) => i.startsWith("p-average"))).toBe(true);
    expect(ids.some((i) => i.startsWith("p-watched"))).toBe(false);
    expect(ids.some((i) => i.startsWith("p-watchlist"))).toBe(false);
    expect(ids.some((i) => i.startsWith("p-date"))).toBe(false);
  });

  it("without heart: average then eye", async () => {
    const { getByTestId, queryByTestId } = await render(
      <PosterCornerBadge testID="b" idPrefix="p" average={3.5} watched onWatchlist />,
    );
    expect(getByTestId("p-average-value").props.children).toBe("3.5");
    expect(getByTestId("p-watched")).toBeTruthy();
    expect(queryByTestId("p-watchlist")).toBeNull();
  });

  it("watched beats watchlist order: eye before bookmark", async () => {
    const { getByTestId, queryByTestId } = await render(
      <PosterCornerBadge testID="b" idPrefix="p" watched onWatchlist />,
    );
    expect(getByTestId("p-watched").props.accessibilityLabel).toBe("Gesehen");
    expect(getByTestId("p-watchlist").props.accessibilityLabel).toBe("Auf der Watchlist");
    const ids = childIds(getByTestId("b") as never);
    expect(ids.indexOf("p-watched")).toBeLessThan(ids.indexOf("p-watchlist"));
    expect(queryByTestId("p-date-value")).toBeNull();
  });

  it("average null shows dash; fixed heart color", async () => {
    const { getByTestId } = await render(
      <PosterCornerBadge testID="b" idPrefix="p" liked average={null} />,
    );
    expect(getByTestId("p-average-value").props.children).toBe("–");
    expect(JSON.stringify(getByTestId("p-like-icon").props)).toContain("#e05c6e");
  });

  it("watched eye is green, bookmark follows theme accent", async () => {
    const { getByTestId } = await render(
      <PosterCornerBadge testID="b" idPrefix="p" watched onWatchlist />,
    );
    expect(JSON.stringify(getByTestId("p-watched-icon").props)).toContain("#22c55e");
    expect(getByTestId("p-watchlist-icon")).toBeTruthy();
  });

  it("date text shown", async () => {
    const { getByTestId } = await render(<PosterCornerBadge testID="b" idPrefix="p" dateText="10.01.2024" />);
    expect(getByTestId("p-date-value").props.children).toBe("10.01.2024");
  });
});
