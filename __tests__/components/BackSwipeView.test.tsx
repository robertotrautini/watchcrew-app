import { mockRouter } from "../helpers/mockRouter";
import "react-native-gesture-handler/jestSetup";
import { render } from "@testing-library/react-native";
import { Platform, Text } from "react-native";
import { fireGestureHandler, getByGestureTestId } from "react-native-gesture-handler/jest-utils";

// The shared reanimated mock lacks the hooks gesture-handler's reanimated
// bridge needs; handlers here run as plain JS.
jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: { View: require("react-native").View, createAnimatedComponent: (c: unknown) => c },
  runOnJS: (fn: unknown) => fn,
  useEvent: () => jest.fn(),
  useSharedValue: (v: unknown) => ({ value: v }),
  useHandler: () => ({ context: {}, doDependenciesDiffer: false, useWeb: false }),
}));

jest.mock("expo-router", () => require("../helpers/mockRouter").createExpoRouterMock());

import { BACK_SWIPE_GESTURE_TEST_ID, BackSwipeView } from "@/components/BackSwipeView";

const originalOS = Platform.OS;
afterEach(() => {
  Platform.OS = originalOS;
});

describe("BackSwipeView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.canGoBack.mockReturnValue(true);
    Platform.OS = "android";
  });

  it("renders its children", async () => {
    const { getByText } = await render(
      <BackSwipeView>
        <Text>inhalt</Text>
      </BackSwipeView>,
    );
    expect(getByText("inhalt")).toBeTruthy();
  });

  it("pops one level on a left-to-right swipe", async () => {
    await render(
      <BackSwipeView>
        <Text>x</Text>
      </BackSwipeView>,
    );
    const pan = getByGestureTestId(BACK_SWIPE_GESTURE_TEST_ID);
    fireGestureHandler(pan, [
      { state: 2 },
      { state: 4, translationX: 0, translationY: 0 },
      { translationX: 200, translationY: 4, velocityX: 600 },
      { state: 5, translationX: 200, translationY: 4, velocityX: 600 },
    ]);
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it("does not pop on a short slow swipe", async () => {
    await render(
      <BackSwipeView>
        <Text>x</Text>
      </BackSwipeView>,
    );
    const pan = getByGestureTestId(BACK_SWIPE_GESTURE_TEST_ID);
    fireGestureHandler(pan, [
      { state: 2 },
      { state: 4, translationX: 0, translationY: 0 },
      { state: 5, translationX: 20, translationY: 2, velocityX: 50 },
    ]);
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it("does not wrap children in a gesture detector off Android", async () => {
    Platform.OS = "ios";
    const { getByText } = await render(
      <BackSwipeView>
        <Text>ios</Text>
      </BackSwipeView>,
    );
    expect(getByText("ios")).toBeTruthy();
    expect(() => getByGestureTestId(BACK_SWIPE_GESTURE_TEST_ID)).toThrow();
  });
});
