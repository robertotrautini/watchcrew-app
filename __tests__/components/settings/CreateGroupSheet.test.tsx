import { fireEvent, render } from "@testing-library/react-native";

import { CreateGroupSheet } from "@/components/settings/CreateGroupSheet";
import { DEFAULT_GROUP_THEME, GROUP_THEME_OPTIONS } from "@/lib/groupTheme";

const P = "group-settings-create";

async function open(props: Partial<React.ComponentProps<typeof CreateGroupSheet>> = {}) {
  const onCancel = jest.fn();
  const onCreate = jest.fn();
  const r = await render(
    <CreateGroupSheet visible onCancel={onCancel} onCreate={onCreate} {...props} />,
  );
  return { r, onCancel, onCreate };
}

describe("CreateGroupSheet", () => {
  it("renders nothing when not visible", async () => {
    const { r } = await open({ visible: false });
    expect(r.queryByTestId(`${P}-dialog`)).toBeNull();
  });

  it("disables Anlegen for empty and whitespace-only names", async () => {
    const { r, onCreate } = await open();
    expect(r.getByTestId(`${P}-confirm-button`).props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.changeText(r.getByTestId(`${P}-name-input`), "   ");
    await fireEvent.press(r.getByTestId(`${P}-confirm-button`));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("creates with trimmed name and default theme", async () => {
    const { r, onCreate } = await open();
    await fireEvent.changeText(r.getByTestId(`${P}-name-input`), "  Filmabend  ");
    await fireEvent.press(r.getByTestId(`${P}-confirm-button`));
    expect(onCreate).toHaveBeenCalledWith({ name: "Filmabend", theme: DEFAULT_GROUP_THEME });
  });

  it("creates with the chosen theme and marks it selected", async () => {
    const other = GROUP_THEME_OPTIONS.find((t) => t !== DEFAULT_GROUP_THEME)!;
    const { r, onCreate } = await open();
    expect(r.getByTestId(`${P}-theme-${DEFAULT_GROUP_THEME}`).props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(r.getByTestId(`${P}-theme-${other}`));
    expect(r.getByTestId(`${P}-theme-${other}`).props.accessibilityState).toMatchObject({ selected: true });
    expect(r.getByTestId(`${P}-theme-${DEFAULT_GROUP_THEME}`).props.accessibilityState).toMatchObject({ selected: false });
    await fireEvent.changeText(r.getByTestId(`${P}-name-input`), "Crew");
    await fireEvent.press(r.getByTestId(`${P}-confirm-button`));
    expect(onCreate).toHaveBeenCalledWith({ name: "Crew", theme: other });
  });

  it("offers one swatch per theme option", async () => {
    const { r } = await open();
    for (const t of GROUP_THEME_OPTIONS) {
      expect(r.getByTestId(`${P}-theme-${t}`)).toBeTruthy();
    }
  });

  it("does not create while loading", async () => {
    const { r, onCreate } = await open({ loading: true });
    await fireEvent.changeText(r.getByTestId(`${P}-name-input`), "Crew");
    await fireEvent.press(r.getByTestId(`${P}-confirm-button`));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("cancel calls onCancel and discards the draft", async () => {
    const { r, onCancel } = await open();
    await fireEvent.changeText(r.getByTestId(`${P}-name-input`), "Weg");
    await fireEvent.press(r.getByTestId(`${P}-cancel-button`));
    expect(onCancel).toHaveBeenCalledTimes(1);
    // The parent closes the sheet; reopening mounts a fresh draft.
    await r.rerender(<CreateGroupSheet visible={false} onCancel={onCancel} onCreate={jest.fn()} />);
    await r.rerender(<CreateGroupSheet visible onCancel={onCancel} onCreate={jest.fn()} />);
    expect(r.getByTestId(`${P}-name-input`).props.value).toBe("");
  });

  it("keeps the draft after create (caller decides when to close)", async () => {
    const { r } = await open();
    await fireEvent.changeText(r.getByTestId(`${P}-name-input`), "Crew");
    await fireEvent.press(r.getByTestId(`${P}-confirm-button`));
    expect(r.getByTestId(`${P}-name-input`).props.value).toBe("Crew");
  });
});
