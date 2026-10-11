import { fireEvent, render } from "@testing-library/react-native";

import { TagebuchScopeSwitch } from "@/components/tagebuch/TagebuchScopeSwitch";

describe("TagebuchScopeSwitch", () => {
  it("shows both scopes with labels", async () => {
    const r = await render(<TagebuchScopeSwitch scope="group" onChange={jest.fn()} />);
    expect(r.getByText("Mein Tagebuch")).toBeTruthy();
    expect(r.getByText("Gruppe")).toBeTruthy();
  });

  it.each([
    ["group", "tagebuch-scope-group", "tagebuch-scope-my_diary"],
    ["my_diary", "tagebuch-scope-my_diary", "tagebuch-scope-group"],
  ] as const)("scope %s selects only its own chip", async (scope, selected, other) => {
    const r = await render(<TagebuchScopeSwitch scope={scope} onChange={jest.fn()} />);
    expect(r.getByTestId(selected).props.accessibilityState).toMatchObject({ selected: true });
    expect(r.getByTestId(other).props.accessibilityState).toMatchObject({ selected: false });
  });

  it("reports the pressed scope", async () => {
    const onChange = jest.fn();
    const r = await render(<TagebuchScopeSwitch scope="group" onChange={onChange} />);
    await fireEvent.press(r.getByTestId("tagebuch-scope-my_diary"));
    expect(onChange).toHaveBeenCalledWith("my_diary");
  });
});
