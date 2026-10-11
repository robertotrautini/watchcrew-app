import { Animated, Text } from "react-native";
import { render } from "@testing-library/react-native";

import { FadeInItem } from "@/components/ui/FadeInItem";
import { computeStaggerDelayMs } from "@/lib/staggerAnimation";
import { FADE_MAX_INDEX } from "@/lib/motion";

describe("FadeInItem", () => {
  it("renders its children", async () => {
    const { getByText } = await render(
      <FadeInItem index={0}>
        <Text>tile content</Text>
      </FadeInItem>,
    );

    expect(getByText("tile content")).toBeTruthy();
  });

  it("starts a fade-to-1 animation, delayed per the item's index (M11 animation polish)", async () => {
    const timingSpy = jest.spyOn(Animated, "timing");

    await render(
      <FadeInItem index={3}>
        <Text>tile content</Text>
      </FadeInItem>,
    );

    expect(timingSpy).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({ toValue: 1, delay: computeStaggerDelayMs(3) }),
    );

    timingSpy.mockRestore();
  });

  it("skipInitialFade mounts visible without starting the fade", async () => {
    const timingSpy = jest.spyOn(Animated, "timing");

    await render(
      <FadeInItem index={1} skipInitialFade>
        <Text>tile content</Text>
      </FadeInItem>,
    );

    expect(timingSpy).not.toHaveBeenCalled();
    timingSpy.mockRestore();
  });

  it("forwards testID and className to the animated wrapper", async () => {
    const { getByTestId } = await render(
      <FadeInItem index={0} testID="fade-item" className="flex-1">
        <Text>tile content</Text>
      </FadeInItem>,
    );

    expect(getByTestId("fade-item")).toBeTruthy();
  });
});

describe("FadeInItem tab replay + reduce motion", () => {
  const { TabSwitchContext } = require("@/components/tabSwitchContext");
  const reanimated = require("react-native-reanimated");

  afterEach(() => jest.restoreAllMocks());

  function renderWith(value: { tab: string | null; epoch: number }, replayTab = "watchlist") {
    const ui = (v: typeof value) => (
      <TabSwitchContext.Provider value={v}>
        <FadeInItem index={2} replayTab={replayTab}>
          <Text>x</Text>
        </FadeInItem>
      </TabSwitchContext.Provider>
    );
    return { ui, ...{ initial: ui(value) } };
  }

  it("replays the staggered fade when its tab becomes active again (epoch bump)", async () => {
    const timingSpy = jest.spyOn(Animated, "timing");
    const { ui, initial } = renderWith({ tab: "watchlist", epoch: 1 });
    const r = await render(initial);
    expect(timingSpy).toHaveBeenCalledTimes(1); // mount animation only
    await r.rerender(ui({ tab: "tracker", epoch: 2 }));
    expect(timingSpy).toHaveBeenCalledTimes(1); // other tab: no replay
    await r.rerender(ui({ tab: "watchlist", epoch: 3 }));
    expect(timingSpy).toHaveBeenCalledTimes(2);
    expect(timingSpy).toHaveBeenLastCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({ toValue: 1, delay: computeStaggerDelayMs(2), duration: 220 }),
    );
  });

  it("does not replay on a plain re-render with the same epoch", async () => {
    const timingSpy = jest.spyOn(Animated, "timing");
    const { ui, initial } = renderWith({ tab: "watchlist", epoch: 1 });
    const r = await render(initial);
    await r.rerender(ui({ tab: "watchlist", epoch: 1 }));
    expect(timingSpy).toHaveBeenCalledTimes(1);
  });

  it("does not replay without a replayTab prop", async () => {
    const timingSpy = jest.spyOn(Animated, "timing");
    const r = await render(
      <TabSwitchContext.Provider value={{ tab: "watchlist", epoch: 1 }}>
        <FadeInItem index={0}><Text>x</Text></FadeInItem>
      </TabSwitchContext.Provider>,
    );
    await r.rerender(
      <TabSwitchContext.Provider value={{ tab: "watchlist", epoch: 2 }}>
        <FadeInItem index={0}><Text>x</Text></FadeInItem>
      </TabSwitchContext.Provider>,
    );
    expect(timingSpy).toHaveBeenCalledTimes(1);
  });

  it("reduce motion: no animation at all", async () => {
    jest.spyOn(reanimated, "useReducedMotion").mockReturnValue(true);
    const timingSpy = jest.spyOn(Animated, "timing");
    const { getByTestId } = await render(
      <FadeInItem index={0} testID="f"><Text>x</Text></FadeInItem>,
    );
    expect(timingSpy).not.toHaveBeenCalled();
    expect(getByTestId("f")).toBeTruthy();
  });

  it("items beyond FADE_MAX_INDEX: no mount fade, no tab-switch replay, content still rendered", async () => {
    const timingSpy = jest.spyOn(Animated, "timing");
    const ui = (epoch: number, tab: string) => (
      <TabSwitchContext.Provider value={{ tab, epoch }}>
        <FadeInItem index={FADE_MAX_INDEX + 1} replayTab="watchlist" testID="far">
          <Text>far</Text>
        </FadeInItem>
      </TabSwitchContext.Provider>
    );
    const r = await render(ui(1, "watchlist"));
    await r.rerender(ui(2, "tracker"));
    await r.rerender(ui(3, "watchlist"));
    expect(timingSpy).not.toHaveBeenCalled();
    expect(r.getByTestId("far")).toBeTruthy();
    expect(r.getByText("far")).toBeTruthy();
  });

  it("items up to FADE_MAX_INDEX still fade on mount", async () => {
    const timingSpy = jest.spyOn(Animated, "timing");
    await render(<FadeInItem index={FADE_MAX_INDEX}><Text>x</Text></FadeInItem>);
    expect(timingSpy).toHaveBeenCalledTimes(1);
  });
});

describe("FadeInItem index freeze (re-sort)", () => {
  afterEach(() => jest.restoreAllMocks());

  it("a changed index neither remounts nor replays the fade (near -> far and far -> near)", async () => {
    const timingSpy = jest.spyOn(Animated, "timing");
    let mounts = 0;
    function Probe() {
      const React = require("react");
      React.useEffect(() => {
        mounts += 1;
      }, []);
      return <Text>probe</Text>;
    }
    const ui = (index: number) => (
      <FadeInItem index={index}>
        <Probe />
      </FadeInItem>
    );
    const r = await render(ui(2));
    await r.rerender(ui(FADE_MAX_INDEX + 5));
    await r.rerender(ui(0));
    expect(mounts).toBe(1);
    expect(timingSpy).toHaveBeenCalledTimes(1);
  });

  it("far item stays a plain view when its index later becomes small", async () => {
    const timingSpy = jest.spyOn(Animated, "timing");
    const ui = (index: number) => (
      <FadeInItem index={index}>
        <Text>x</Text>
      </FadeInItem>
    );
    const r = await render(ui(FADE_MAX_INDEX + 1));
    await r.rerender(ui(0));
    expect(timingSpy).not.toHaveBeenCalled();
  });
});
