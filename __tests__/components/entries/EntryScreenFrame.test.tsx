import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import {
  EntryScreenFrame,
  type EntryScreenFrameProps,
} from "@/components/entries/EntryScreenFrame";

jest.mock("expo-router", () =>
  require("../../helpers/mockRouter").createExpoRouterMock(),
);
jest.mock("@/components/ui/AppHeader", () => {
  const { Text: T } = require("react-native");
  return { AppHeader: (p: { title: string }) => <T>{p.title}</T> };
});

function ui(overrides: Partial<EntryScreenFrameProps> = {}) {
  return (
    <EntryScreenFrame
      testIDPrefix="x"
      title="Titel"
      isLoading={false}
      isError={false}
      errorMessage="kaputt"
      panel={<Text testID="x-panel">panel</Text>}
      providersLoading={false}
      body="list"
      emptyIcon="bookmark"
      emptyTitle="leer"
      searchQuery=""
      flyout={<Text testID="x-flyout">flyout</Text>}
      {...overrides}
    >
      <Text testID="x-children">list</Text>
    </EntryScreenFrame>
  );
}

describe("EntryScreenFrame", () => {
  it("renders panel, list and flyout when loaded", async () => {
    const r = await render(ui());
    expect(r.getByTestId("x-screen")).toBeTruthy();
    expect(r.getByTestId("x-panel")).toBeTruthy();
    expect(r.getByTestId("x-children")).toBeTruthy();
    expect(r.getByTestId("x-flyout")).toBeTruthy();
  });

  it("loading: header and loading area only", async () => {
    const r = await render(ui({ isLoading: true }));
    expect(r.getByTestId("x-loading")).toBeTruthy();
    expect(r.queryByTestId("x-panel")).toBeNull();
    expect(r.queryByTestId("x-children")).toBeNull();
  });

  it("error: message in text-danger, no panel", async () => {
    const r = await render(ui({ isError: true }));
    const err = r.getByTestId("x-error");
    expect(err.props.className).toContain("text-danger");
    expect(r.getByText("kaputt")).toBeTruthy();
    expect(r.queryByTestId("x-panel")).toBeNull();
  });

  it("providers loading replaces the list", async () => {
    const r = await render(ui({ providersLoading: true }));
    expect(r.getByTestId("x-providers-loading")).toBeTruthy();
    expect(r.queryByTestId("x-children")).toBeNull();
    expect(r.getByTestId("x-panel")).toBeTruthy();
  });

  it("empty and no-results states replace the list but keep the panel", async () => {
    const empty = await render(ui({ body: "empty" }));
    expect(empty.getByTestId("x-empty")).toBeTruthy();
    expect(empty.getByText("leer")).toBeTruthy();
    expect(empty.queryByTestId("x-children")).toBeNull();
    const none = await render(ui({ body: "no-results" }));
    expect(none.getByTestId("x-no-results")).toBeTruthy();
    expect(none.getByTestId("x-panel")).toBeTruthy();
  });
});
