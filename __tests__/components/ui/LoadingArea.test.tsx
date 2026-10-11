import { render } from "@testing-library/react-native";

import { LoadingArea } from "@/components/ui/LoadingArea";

describe("LoadingArea", () => {
  it("renders a centered accent spinner with testID and label 'Lädt'", async () => {
    const { getByTestId } = await render(<LoadingArea testID="x-loading" />);
    const area = getByTestId("x-loading");
    expect(area.props.accessibilityLabel).toBe("Lädt");
    expect(area.props.className).toContain("items-center");
    expect(area.props.className).toContain("justify-center");
    expect(area.props.className).toContain("min-h-");
    expect(getByTestId("x-loading-spinner")).toBeTruthy();
  });

  it("accepts a custom className and size", async () => {
    const { getByTestId } = await render(
      <LoadingArea testID="y" className="min-h-24" size="small" />,
    );
    expect(getByTestId("y").props.className).toContain("min-h-24");
    expect(getByTestId("y-spinner").props.size).toBe("small");
  });
});
