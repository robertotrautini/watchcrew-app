import { render } from "@testing-library/react-native";

import { DiaryEntryCard } from "@/components/movie/DiaryEntryCard";

describe("DiaryEntryCard", () => {
  const base = {
    posterUrl: null,
    title: "Dune",
    seenLabel: "Gesehen am 30.05.2026",
    starColor: "#FFD700",
    averageRating: 3.5,
    liked: false,
    tmdbScore: 7.8,
    members: [
      { id: "a", label: "Robin", rating: null },
      { id: "b", label: "Dad", rating: 3.5 },
    ],
  };

  it("shows a labelled row per member with '–' for unrated members", async () => {
    const { getAllByTestId } = await render(<DiaryEntryCard {...base} />);
    expect(getAllByTestId("member-rating-name").map((n) => n.props.children)).toEqual(["Robin", "Dad"]);
    expect(getAllByTestId("member-rating-value").map((n) => n.props.children)).toEqual(["–", "3.5"]);
  });

  it("shows title, seen label, average and TMDB score; heart only when liked", async () => {
    const { getByText, getByTestId, queryByTestId, rerender } = await render(<DiaryEntryCard {...base} />);
    expect(getByText("Dune")).toBeTruthy();
    expect(getByText("Gesehen am 30.05.2026")).toBeTruthy();
    expect(getByTestId("poster-card-average-value").props.children).toBe("3.5");
    expect(getByTestId("poster-card-tmdb-value").props.children).toBe("7.8");
    expect(queryByTestId("poster-card-like-badge")).toBeNull();
    await rerender(<DiaryEntryCard {...base} liked />);
    expect(getByTestId("poster-card-like-badge")).toBeTruthy();
  });

  it("puts the TMDB badge flush in the bottom-right corner, rounded on the inner corner only", async () => {
    const { getByTestId } = await render(<DiaryEntryCard {...base} />);
    const cls = getByTestId("poster-card-tmdb-badge").props.className as string;
    expect(cls).toContain("absolute");
    expect(cls).toContain("bottom-0");
    expect(cls).toContain("right-0");
    expect(cls).toContain("rounded-tl-xl");
  });

  it("puts the average badge flush in the top-right corner, rounded on the inner corner only", async () => {
    const { getByTestId } = await render(<DiaryEntryCard {...base} />);
    const cls = getByTestId("poster-card-average-badge").props.className as string;
    for (const c of ["absolute", "top-0", "right-0", "rounded-bl-xl"]) expect(cls).toContain(c);
    expect(getByTestId("poster-card-average-value").props.children).toBe("3.5");
  });

  it("shows a dash when there is no average", async () => {
    const { getByTestId } = await render(<DiaryEntryCard {...base} averageRating={null} />);
    expect(getByTestId("poster-card-average-value").props.children).toBe("–");
  });

  it("shows the red like heart inside the corner badge, before the star, only when liked", async () => {
    const { getByTestId, queryByTestId, rerender } = await render(<DiaryEntryCard {...base} />);
    expect(queryByTestId("poster-card-like-icon")).toBeNull();
    await rerender(<DiaryEntryCard {...base} liked />);
    const badge = getByTestId("poster-card-average-badge");
    expect(badge).toBeTruthy();
    expect(getByTestId("poster-card-like-badge").parent).toBe(badge);
    expect(JSON.stringify(getByTestId("poster-card-like-icon").props)).toContain("#e05c6e");
  });
});
