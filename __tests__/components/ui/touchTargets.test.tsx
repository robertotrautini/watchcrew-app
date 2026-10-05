import { Text } from "react-native";
import { render } from "@testing-library/react-native";

jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");
  return { SafeAreaView: (props: Record<string, unknown>) => <View {...props} /> };
});
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light" },
}));

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";
import { SortButton } from "@/components/ui/SortButton";
import { StarRating } from "@/components/ui/StarRating";
import { ViewModeToggle } from "@/components/ui/ViewModeToggle";
import { MIN_TOUCH_TARGET, MIN_TOUCH_TARGET_IOS, STAR_TOUCH_WIDTH } from "@/components/ui/touchTarget";

const FOUR_SIDES = (n: number) => ({ top: n, bottom: n, left: n, right: n });

describe("Button touch targets (size + hitSlop >= 48)", () => {
  it("default icon button is 48x48 and needs no hitSlop", async () => {
    const { getByTestId } = await render(
      <Button testID="b" iconOnly accessibilityLabel="x"><Text>i</Text></Button>,
    );
    expect(getByTestId("b").props.className).toContain("h-12 w-12");
    expect(getByTestId("b").props.hitSlop).toBeUndefined();
  });

  it("sm icon button (44) gets 2dp hitSlop per side", async () => {
    const { getByTestId } = await render(
      <Button testID="b" iconOnly size="sm" accessibilityLabel="x"><Text>i</Text></Button>,
    );
    expect(getByTestId("b").props.hitSlop).toEqual(FOUR_SIDES(2));
  });

  it("xs icon button (36) gets 6dp hitSlop per side", async () => {
    const { getByTestId } = await render(
      <Button testID="b" iconOnly size="xs" accessibilityLabel="x"><Text>i</Text></Button>,
    );
    expect(getByTestId("b").props.hitSlop).toEqual(FOUR_SIDES(6));
  });

  it("xs / sm text buttons only grow vertically", async () => {
    const { getByTestId } = await render(
      <>
        <Button testID="xs" size="xs" label="a" />
        <Button testID="sm" size="sm" label="a" />
        <Button testID="def" label="a" />
      </>,
    );
    expect(getByTestId("xs").props.hitSlop).toEqual({ top: 6, bottom: 6, left: 0, right: 0 });
    expect(getByTestId("sm").props.hitSlop).toEqual({ top: 2, bottom: 2, left: 0, right: 0 });
    expect(getByTestId("def").props.hitSlop).toBeUndefined();
  });

  it("a caller-supplied hitSlop wins", async () => {
    const { getByTestId } = await render(<Button testID="b" size="xs" label="a" hitSlop={10} />);
    expect(getByTestId("b").props.hitSlop).toBe(10);
  });
});

describe("Chip touch target", () => {
  it("36dp chip gets 6dp vertical hitSlop (48 total)", async () => {
    const { getByTestId } = await render(<Chip testID="c" label="Alle" />);
    expect(getByTestId("c").props.hitSlop).toEqual({ top: 6, bottom: 6, left: 0, right: 0 });
  });
});

describe("Sheet close button", () => {
  it("is a 48x48 icon button with an accessible label", async () => {
    const { getByTestId } = await render(
      <Sheet visible onClose={jest.fn()} title="T">
        <Text>c</Text>
      </Sheet>,
    );
    const close = getByTestId("sheet-close-button");
    expect(close.props.className).toContain("h-12 w-12");
    expect(close.props.accessibilityLabel).toBeTruthy();
  });
});

describe("SortButton", () => {
  it("is at least 48dp high", async () => {
    const { getByTestId } = await render(
      <SortButton testID="s" shortLabel="A" fullLabel="Alpha" onPress={jest.fn()} />,
    );
    expect(getByTestId("s").props.className).toContain("min-h-touch-comfortable");
  });
});

describe("ViewModeToggle segments", () => {
  it("each segment is a 48x48 touch box with label and selected state", async () => {
    const { getByTestId } = await render(
      <ViewModeToggle value="grid" onChange={jest.fn()} testID="vm" buttonTestID={(m) => `vm-${m}`} />,
    );
    for (const mode of ["cards", "grid", "list"]) {
      const seg = getByTestId(`vm-${mode}`);
      expect(seg.props.className).toContain("h-12 w-12");
      expect(seg.props.accessibilityLabel).toBeTruthy();
    }
    expect(getByTestId("vm-grid").props.accessibilityState).toEqual({ selected: true });
    expect(getByTestId("vm-list").props.accessibilityState).toEqual({ selected: false });
  });
});

describe("StarRating touch targets", () => {
  it("every star is a 44x48 box (>= iOS minimum, 48 high) and 5 fit a 360dp phone", async () => {
    const { getByTestId } = await render(
      <StarRating rating={2.5} starColor="#fff" onChange={jest.fn()} liked={false} onToggleLike={jest.fn()} iconSize="L" />,
    );
    for (let i = 0; i < 5; i += 1) {
      const star = getByTestId(`star-rating-touch-${i}`);
      expect(star.props.className).toContain(`w-[${STAR_TOUCH_WIDTH}px]`);
      expect(star.props.className).toContain("h-touch-comfortable");
      expect(star.props.hitSlop).toBeUndefined(); // no overlap between neighbours
    }
    expect(STAR_TOUCH_WIDTH).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_IOS);
    expect(MIN_TOUCH_TARGET).toBe(48);
  });

  it("stars carry an accessibility label and the heart a label + checked state", async () => {
    const { getByTestId, rerender } = await render(
      <StarRating rating={1} starColor="#fff" onChange={jest.fn()} liked={false} onToggleLike={jest.fn()} />,
    );
    expect(getByTestId("star-rating-touch-2").props.accessibilityLabel).toBe("3 Sterne");
    expect(getByTestId("star-rating-touch-0").props.accessibilityLabel).toBe("1 Stern");
    const heart = getByTestId("star-rating-heart-touch");
    expect(heart.props.accessibilityLabel).toBe("Mag ich");
    expect(heart.props.accessibilityState).toEqual({ checked: false });
    expect(heart.props.className).toContain("h-touch-comfortable");
    await rerender(
      <StarRating rating={1} starColor="#fff" onChange={jest.fn()} liked onToggleLike={jest.fn()} />,
    );
    expect(getByTestId("star-rating-heart-touch").props.accessibilityState).toEqual({ checked: true });
  });
});
