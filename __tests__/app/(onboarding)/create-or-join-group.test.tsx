import { Alert } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import CreateOrJoinGroupScreen from "../../../src/app/(onboarding)/create-or-join-group";

// Same convention as __tests__/StarRating.test.tsx: mock the native Ionicons
// implementation as a plain View that spreads its props through, so
// testID/name/color assertions on the rendered node work under RNTL.
jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Ionicons: (props: Record<string, unknown>) => <View {...props} />,
  };
});

const THEME_NAMES = ["gold", "red", "blue", "green", "purple", "orange"];

describe("CreateOrJoinGroupScreen", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the two initial options and no form yet", async () => {
    const { getByTestId, queryByTestId } = await render(<CreateOrJoinGroupScreen />);

    expect(getByTestId("option-create-group")).toBeTruthy();
    expect(getByTestId("option-join-group")).toBeTruthy();
    expect(queryByTestId("mode-create")).toBeNull();
    expect(queryByTestId("mode-join")).toBeNull();
  });

  describe("create flow", () => {
    it("shows the create form (name input + 6 theme swatches) and a back button when selected", async () => {
      const { getByTestId, queryByTestId } = await render(<CreateOrJoinGroupScreen />);

      await fireEvent.press(getByTestId("option-create-group"));

      expect(getByTestId("mode-create")).toBeTruthy();
      expect(getByTestId("create-group-name-input")).toBeTruthy();
      expect(getByTestId("create-group-back")).toBeTruthy();
      THEME_NAMES.forEach((name) => {
        expect(getByTestId(`theme-swatch-${name}`)).toBeTruthy();
      });
      expect(queryByTestId("mode-select")).toBeNull();
    });

    it("returns to the initial two-option state via back, and re-selecting create works again", async () => {
      const { getByTestId, queryByTestId } = await render(<CreateOrJoinGroupScreen />);

      await fireEvent.press(getByTestId("option-create-group"));
      await fireEvent.press(getByTestId("create-group-back"));

      expect(getByTestId("option-create-group")).toBeTruthy();
      expect(queryByTestId("mode-create")).toBeNull();

      await fireEvent.press(getByTestId("option-create-group"));
      expect(getByTestId("mode-create")).toBeTruthy();
    });

    it("disables submit when the group name is empty, enables once non-empty", async () => {
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-create-group"));

      expect(getByTestId("create-group-submit").props.accessibilityState.disabled).toBe(true);

      await fireEvent.changeText(getByTestId("create-group-name-input"), "Filmfreunde");

      expect(getByTestId("create-group-submit").props.accessibilityState.disabled).toBe(false);
    });

    it("calls the create stub (Alert) when submitted with a non-empty name, not any real backend call", async () => {
      const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-create-group"));
      await fireEvent.changeText(getByTestId("create-group-name-input"), "Filmfreunde");

      await fireEvent.press(getByTestId("create-group-submit"));

      expect(alertSpy).toHaveBeenCalledTimes(1);
    });

    it("does not call the stub while the submit button is disabled (empty name)", async () => {
      const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-create-group"));

      await fireEvent.press(getByTestId("create-group-submit"));

      expect(alertSpy).not.toHaveBeenCalled();
    });

    it("renders all 6 theme swatches with visually distinct accent colors", async () => {
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-create-group"));

      const colors = THEME_NAMES.map((name) => getByTestId(`theme-swatch-icon-${name}`).props.color);

      expect(new Set(colors).size).toBe(6);
    });

    it("marks the Gold swatch selected by default and moves the selection on tap", async () => {
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-create-group"));

      expect(getByTestId("theme-swatch-gold").props.accessibilityState.selected).toBe(true);
      expect(getByTestId("theme-swatch-blue").props.accessibilityState.selected).toBe(false);

      await fireEvent.press(getByTestId("theme-swatch-blue"));

      expect(getByTestId("theme-swatch-blue").props.accessibilityState.selected).toBe(true);
      expect(getByTestId("theme-swatch-gold").props.accessibilityState.selected).toBe(false);
    });
  });

  describe("join flow", () => {
    it("shows the join form (group-id input) and a back button when selected", async () => {
      const { getByTestId, queryByTestId } = await render(<CreateOrJoinGroupScreen />);

      await fireEvent.press(getByTestId("option-join-group"));

      expect(getByTestId("mode-join")).toBeTruthy();
      expect(getByTestId("join-group-code-input")).toBeTruthy();
      expect(getByTestId("join-group-back")).toBeTruthy();
      expect(queryByTestId("mode-select")).toBeNull();
    });

    it("returns to the initial two-option state via back", async () => {
      const { getByTestId, queryByTestId } = await render(<CreateOrJoinGroupScreen />);

      await fireEvent.press(getByTestId("option-join-group"));
      await fireEvent.press(getByTestId("join-group-back"));

      expect(getByTestId("option-join-group")).toBeTruthy();
      expect(queryByTestId("mode-join")).toBeNull();
    });

    it("disables submit when the group code is empty, enables once non-empty", async () => {
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-join-group"));

      expect(getByTestId("join-group-submit").props.accessibilityState.disabled).toBe(true);

      await fireEvent.changeText(getByTestId("join-group-code-input"), "abc-123-def");

      expect(getByTestId("join-group-submit").props.accessibilityState.disabled).toBe(false);
    });

    it("calls the join stub (Alert) when submitted with a non-empty code, not any real backend call", async () => {
      const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-join-group"));
      await fireEvent.changeText(getByTestId("join-group-code-input"), "abc-123-def");

      await fireEvent.press(getByTestId("join-group-submit"));

      expect(alertSpy).toHaveBeenCalledTimes(1);
    });

    it("does not call the stub while the submit button is disabled (empty code)", async () => {
      const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const { getByTestId } = await render(<CreateOrJoinGroupScreen />);
      await fireEvent.press(getByTestId("option-join-group"));

      await fireEvent.press(getByTestId("join-group-submit"));

      expect(alertSpy).not.toHaveBeenCalled();
    });
  });
});
