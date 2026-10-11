import { useState } from "react";
import { BackHandler, Text, TextInput } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");
  return { SafeAreaView: (props: Record<string, unknown>) => <View {...props} /> };
});

import {
  DraftSheet,
  DraftSheetForm,
  type DraftSheetFormProps,
} from "../../../src/components/ui/DraftSheet";

type FormOverrides = Partial<DraftSheetFormProps>;

function Form({
  onSave,
  overrides,
}: {
  onSave: (draft: string) => boolean | void | Promise<boolean | void>;
  overrides?: FormOverrides;
}) {
  const [draft, setDraft] = useState("start");
  return (
    <DraftSheetForm
      testID="form"
      cancelTestID="cancel"
      confirmTestID="confirm"
      onSave={() => onSave(draft)}
      {...overrides}
    >
      <TextInput testID="input" value={draft} onChangeText={setDraft} />
    </DraftSheetForm>
  );
}

function Harness({
  onSave,
  overrides,
  initiallyVisible = true,
  resetKey,
}: {
  onSave: (draft: string) => boolean | void | Promise<boolean | void>;
  overrides?: FormOverrides;
  initiallyVisible?: boolean;
  resetKey?: string;
}) {
  const [visible, setVisible] = useState(initiallyVisible);
  return (
    <>
      <Text testID="open" onPress={() => setVisible(true)}>
        open
      </Text>
      <DraftSheet
        visible={visible}
        title="Titel"
        onCancel={() => setVisible(false)}
        resetKey={resetKey}
      >
        <Form onSave={onSave} overrides={overrides} />
      </DraftSheet>
    </>
  );
}

describe("DraftSheet", () => {
  it("keeps the draft until Speichern and passes it to onSave", async () => {
    const onSave = jest.fn();
    const { getByTestId } = await render(<Harness onSave={onSave} />);
    await fireEvent.changeText(getByTestId("input"), "neu");
    await fireEvent.press(getByTestId("confirm"));
    expect(onSave).toHaveBeenCalledWith("neu");
  });

  it("closes after onSave resolves true", async () => {
    const onSave = jest.fn().mockResolvedValue(true);
    const { getByTestId, queryByTestId } = await render(<Harness onSave={onSave} />);
    await fireEvent.press(getByTestId("confirm"));
    await waitFor(() => expect(queryByTestId("form")).toBeNull());
  });

  it.each([
    ["false", () => false],
    ["undefined", () => undefined],
    ["a rejected promise", () => Promise.reject(new Error("boom"))],
    ["a thrown error", () => {
      throw new Error("boom");
    }],
  ])("stays open when onSave returns/throws %s", async (_name, impl) => {
    const { getByTestId } = await render(<Harness onSave={impl} />);
    await fireEvent.press(getByTestId("confirm"));
    await act(async () => {});
    expect(getByTestId("form")).toBeTruthy();
  });

  it("Abbrechen discards the draft: reopening shows a fresh draft", async () => {
    const { getByTestId, queryByTestId } = await render(<Harness onSave={jest.fn()} />);
    await fireEvent.changeText(getByTestId("input"), "verworfen");
    await fireEvent.press(getByTestId("cancel"));
    expect(queryByTestId("form")).toBeNull();
    await fireEvent.press(getByTestId("open"));
    expect(getByTestId("input").props.value).toBe("start");
  });

  it("backdrop tap discards the draft", async () => {
    const { getByTestId, queryByTestId } = await render(<Harness onSave={jest.fn()} />);
    await fireEvent.changeText(getByTestId("input"), "x");
    await fireEvent.press(getByTestId("sheet-backdrop"));
    expect(queryByTestId("form")).toBeNull();
    await fireEvent.press(getByTestId("open"));
    expect(getByTestId("input").props.value).toBe("start");
  });

  it("hardware back discards the draft", async () => {
    const spy = jest.spyOn(BackHandler, "addEventListener");
    const { getByTestId, queryByTestId } = await render(<Harness onSave={jest.fn()} />);
    const handler = spy.mock.calls[spy.mock.calls.length - 1][1] as () => boolean;
    await act(async () => {
      handler();
    });
    expect(queryByTestId("form")).toBeNull();
    await fireEvent.press(getByTestId("open"));
    expect(getByTestId("input").props.value).toBe("start");
    spy.mockRestore();
  });

  it("remounts the draft when resetKey changes while open", async () => {
    const { getByTestId, rerender } = await render(
      <Harness onSave={jest.fn()} resetKey="a" />,
    );
    await fireEvent.changeText(getByTestId("input"), "alt");
    await rerender(<Harness onSave={jest.fn()} resetKey="b" />);
    expect(getByTestId("input").props.value).toBe("start");
  });

  it("shows loading from the prop and while onSave is pending", async () => {
    let resolve: (v: boolean) => void = () => {};
    const onSave = jest.fn(() => new Promise<boolean>((r) => (resolve = r)));
    const { getByTestId } = await render(<Harness onSave={onSave} />);
    expect(getByTestId("confirm").props.accessibilityState?.busy).toBeFalsy();
    await fireEvent.press(getByTestId("confirm"));
    expect(getByTestId("confirm").props.accessibilityState?.busy).toBe(true);
    await act(async () => resolve(false));
    expect(getByTestId("confirm").props.accessibilityState?.busy).toBeFalsy();
  });

  it("shows loading from the loading prop", async () => {
    const { getByTestId } = await render(
      <Harness onSave={jest.fn()} overrides={{ loading: true }} />,
    );
    expect(getByTestId("confirm").props.accessibilityState?.busy).toBe(true);
  });

  it("renders the optional error text", async () => {
    const { getByTestId, queryByTestId, rerender } = await render(
      <Harness onSave={jest.fn()} overrides={{ error: "Kaputt", errorTestID: "err" }} />,
    );
    expect(getByTestId("err").props.children).toBe("Kaputt");
    await rerender(<Harness onSave={jest.fn()} overrides={{ errorTestID: "err" }} />);
    expect(queryByTestId("err")).toBeNull();
  });

  it("saveDisabled blocks saving", async () => {
    const onSave = jest.fn();
    const { getByTestId } = await render(
      <Harness onSave={onSave} overrides={{ saveDisabled: true }} />,
    );
    await fireEvent.press(getByTestId("confirm"));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("supports custom labels, hidden cancel and an extra action rightmost", async () => {
    const { getByText, queryByTestId, getByTestId } = await render(
      <Harness
        onSave={jest.fn()}
        overrides={{
          saveLabel: "Anlegen",
          cancelLabel: null,
          extraAction: <Text testID="extra">Löschen</Text>,
          actionsTestID: "row",
        }}
      />,
    );
    expect(getByText("Anlegen")).toBeTruthy();
    expect(queryByTestId("cancel")).toBeNull();
    const row = getByTestId("row");
    const kids = row.props.children.flat().filter(Boolean);
    expect(kids[kids.length - 1].props.testID).toBe("extra");
  });
});
