import { render } from "@testing-library/react-native";

import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

describe("Skeleton", () => {
  it("renders a block with the given size classes", async () => {
    const { getByTestId } = await render(
      <Skeleton testID="sk" className="h-4 w-40" />,
    );
    const className = getByTestId("sk").props.className as string;
    expect(className).toContain("h-4 w-40");
  });

  it("SkeletonText reserves the real line height via an invisible Text with the same text classes", async () => {
    const { getByTestId, queryByTestId, toJSON } = await render(
      <SkeletonText testID="txt" textClassName="text-sm font-title" lines={3} />,
    );
    expect(getByTestId("txt-line-2").props.className).toContain("w-3/5");
    expect(getByTestId("txt-line-0").props.className).toContain("w-full");
    expect(queryByTestId("txt-line-3")).toBeNull();
    expect(JSON.stringify(toJSON()).match(/opacity-0 text-sm font-title/g)).toHaveLength(3);
  });

  it("ListSkeleton renders the container testID and the default row count", async () => {
    const { getByTestId, toJSON } = await render(
      <ListSkeleton testID="list-sk" rows={2} />,
    );
    expect(getByTestId("list-sk")).toBeTruthy();
    expect(JSON.stringify(toJSON()).match(/h-36 flex-row/g)).toHaveLength(2);
  });
});
