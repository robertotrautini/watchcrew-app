import { render } from "@testing-library/react-native";

import { Glass } from "@/components/ui/Glass";

describe("Glass", () => {
  it("default variant is a translucent card fill with a faint border and rounded corners", async () => {
    const { getByTestId } = await render(<Glass testID="g" />);
    const className = getByTestId("g").props.className as string;
    expect(className).toContain("bg-card");
    expect(className).toContain("border-glass-border");
    expect(className).toContain("rounded-xl");
  });

  it("strong variant uses the denser fill and merges extra classes", async () => {
    const { getByTestId } = await render(<Glass testID="g" variant="strong" className="px-4" />);
    const className = getByTestId("g").props.className as string;
    expect(className).toContain("bg-bg-glass-strong");
    expect(className).toContain("px-4");
  });
});
