import { render } from "@testing-library/react-native";

import { EmptyState } from "@/components/ui/EmptyState";

describe("EmptyState", () => {
  it("renders icon and title", async () => {
    const r = await render(<EmptyState title="Keine Filme gefunden" testID="es" />);
    expect(r.getByText("Keine Filme gefunden")).toBeTruthy();
    expect(r.getByTestId("es")).toBeTruthy();
  });

  it("centers horizontally and vertically in the free space", async () => {
    const r = await render(<EmptyState title="Leer" icon="search" testID="es" />);
    const cls = r.getByTestId("es").props.className as string;
    expect(cls).toContain("flex-1");
    expect(cls).toContain("justify-center");
    expect(cls).toContain("items-center");
    expect(cls).not.toContain("rounded-full");
  });
});
