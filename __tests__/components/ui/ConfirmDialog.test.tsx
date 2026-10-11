import { fireEvent, render } from "@testing-library/react-native";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

async function setup(
  overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {},
) {
  const props = {
    visible: true,
    testID: "x",
    title: "Film entfernen?",
    description: "Der Film wird aus der Watchlist entfernt.",
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
    ...overrides,
  };
  const utils = await render(<ConfirmDialog {...props} />);
  return { props, ...utils };
}

describe("ConfirmDialog", () => {
  it("renders title and description", async () => {
    const { getByText } = await setup();
    expect(getByText("Film entfernen?")).toBeTruthy();
    expect(getByText("Der Film wird aus der Watchlist entfernt.")).toBeTruthy();
  });

  it("renders nothing when not visible", async () => {
    const { queryByTestId } = await setup({ visible: false });
    expect(queryByTestId("x-confirm-button")).toBeNull();
  });

  it("cancel + confirm call their handlers", async () => {
    const { props, getByTestId } = await setup();
    await fireEvent.press(getByTestId("x-cancel-button"));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
    await fireEvent.press(getByTestId("x-confirm-button"));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("uses default labels Abbrechen / Löschen", async () => {
    const a = await setup();
    expect(a.getByText("Abbrechen")).toBeTruthy();
    expect(a.getByText("Löschen")).toBeTruthy();
  });

  it("supports a custom confirm label", async () => {
    const b = await setup({ confirmLabel: "Entfernen" });
    expect(b.getByText("Entfernen")).toBeTruthy();
  });

  it("puts cancel left of confirm (confirm is the last button)", async () => {
    const { getByTestId } = await setup();
    const row = getByTestId("x-actions");
    const kids = row.props.children as { props: { testID: string } }[];
    expect(kids[0].props.testID).toBe("x-cancel-button");
    expect(kids[kids.length - 1].props.testID).toBe("x-confirm-button");
  });

  it("confirm is disabled while confirmDisabled; no press fires", async () => {
    const { props, getByTestId } = await setup({ confirmDisabled: true });
    await fireEvent.press(getByTestId("x-confirm-button"));
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("loading disables confirm", async () => {
    const { props, getByTestId } = await setup({ loading: true });
    await fireEvent.press(getByTestId("x-confirm-button"));
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("renders children (extra content)", async () => {
    const { Text } = require("react-native");
    const { getByText } = await setup({ children: <Text>Extra</Text> });
    expect(getByText("Extra")).toBeTruthy();
  });
});
