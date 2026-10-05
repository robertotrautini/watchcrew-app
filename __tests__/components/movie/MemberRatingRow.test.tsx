import { render } from "@testing-library/react-native";

import { MemberRatingRow } from "@/components/movie/MemberRatingRow";

const GOLD_STAR_COLOR = "#FFD700";

describe("MemberRatingRow", () => {
  it("renders the member's name and a formatted numeric rating", async () => {
    const { getByTestId } = await render(
      <MemberRatingRow memberLabel="Anna" rating={4} starColor={GOLD_STAR_COLOR} />,
    );

    expect(getByTestId("member-rating-name").props.children).toBe("Anna");
    expect(getByTestId("member-rating-value").props.children).toBe("4.0");
  });

  it("renders '–' when the member has no (null) rating", async () => {
    const { getByTestId } = await render(
      <MemberRatingRow memberLabel="Ben" rating={null} starColor={GOLD_STAR_COLOR} />,
    );

    expect(getByTestId("member-rating-value").props.children).toBe("–");
  });

  it("renders '–' when the member's rating is exactly 0 (0 = no real rating, per project convention)", async () => {
    const { getByTestId } = await render(
      <MemberRatingRow memberLabel="Cara" rating={0} starColor={GOLD_STAR_COLOR} />,
    );

    expect(getByTestId("member-rating-value").props.children).toBe("–");
  });

  it("renders a read-only star row (no touch handler / adjustable role) for the member's rating", async () => {
    const { queryAllByRole } = await render(
      <MemberRatingRow memberLabel="Anna" rating={4} starColor={GOLD_STAR_COLOR} />,
    );

    expect(queryAllByRole("adjustable")).toHaveLength(0);
  });

  it("hideValue omits the numeric value and uses tight read-only stars (28px box)", async () => {
    const { queryByTestId, getAllByTestId } = await render(
      <MemberRatingRow memberLabel="Anna" rating={3.5} starColor={GOLD_STAR_COLOR} hideValue />,
    );

    expect(queryByTestId("member-rating-value")).toBeNull();
    const boxes = getAllByTestId(/star-rating-touch-/);
    expect(boxes).toHaveLength(5);
    expect(boxes[0].props.className).toContain("h-7 w-7");
  });
});
