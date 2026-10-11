import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import {
  GlassTableHeader,
  GlassTableHeaderCell,
  GlassTableHeaderIconCell,
  GlassTableRow,
  TABLE_ICON_CELL,
  TABLE_SCORE_CELL,
  TABLE_SCORE_STRONG_CELL,
} from "@/components/ui/GlassTable";

describe("GlassTable", () => {
  it("renders header cells under the given testID", async () => {
    const { getByTestId, getByText } = await render(
      <GlassTableHeader testID="hdr">
        <GlassTableHeaderCell>Film</GlassTableHeaderCell>
      </GlassTableHeader>,
    );
    expect(getByTestId("hdr")).toBeTruthy();
    expect(getByText("Film")).toBeTruthy();
  });

  it("row is a pressable button that fires onPress", async () => {
    const onPress = jest.fn();
    const { getByTestId } = await render(
      <GlassTableRow testID="row" isLast={false} onPress={onPress}>
        <Text>Alpha</Text>
      </GlassTableRow>,
    );
    await fireEvent.press(getByTestId("row"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("only non-last rows get the separator border", async () => {
    const { getByTestId } = await render(
      <>
        <GlassTableRow testID="a" isLast={false} onPress={() => {}}>
          <Text>A</Text>
        </GlassTableRow>
        <GlassTableRow testID="b" isLast onPress={() => {}}>
          <Text>B</Text>
        </GlassTableRow>
      </>,
    );
    expect(getByTestId("a").props.className).toContain("border-b");
    expect(getByTestId("b").props.className ?? "").not.toContain("border-b");
  });

  describe("sortable header cells", () => {
    it("text cell without onPress stays plain (no button)", async () => {
      const { queryByTestId } = await render(
        <GlassTableHeader>
          <GlassTableHeaderCell testID="c">Film</GlassTableHeaderCell>
        </GlassTableHeader>,
      );
      expect(queryByTestId("c-sort-asc")).toBeNull();
      expect(queryByTestId("c")?.props.accessibilityRole).not.toBe("button");
    });

    it("text cell with onPress fires, exposes state and indicator", async () => {
      const onPress = jest.fn();
      const { getByTestId, queryByTestId, rerender } = await render(
        <GlassTableHeaderCell
          testID="c"
          onPress={onPress}
          sortState={null}
          accessibilityLabel="Film"
        >
          Film
        </GlassTableHeaderCell>,
      );
      expect(getByTestId("c").props.accessibilityRole).toBe("button");
      expect(getByTestId("c").props.accessibilityState).toMatchObject({
        selected: false,
      });
      expect(queryByTestId("c-sort-asc")).toBeNull();
      expect(queryByTestId("c-sort-desc")).toBeNull();
      await fireEvent.press(getByTestId("c"));
      expect(onPress).toHaveBeenCalledTimes(1);

      await rerender(
        <GlassTableHeaderCell
          testID="c"
          onPress={onPress}
          sortState="asc"
          accessibilityLabel="Film"
        >
          Film
        </GlassTableHeaderCell>,
      );
      expect(getByTestId("c-sort-asc")).toBeTruthy();
      expect(getByTestId("c").props.accessibilityState).toMatchObject({
        selected: true,
      });
      expect(getByTestId("c").props.accessibilityLabel).toContain("aufsteigend");

      await rerender(
        <GlassTableHeaderCell
          testID="c"
          onPress={onPress}
          sortState="desc"
          accessibilityLabel="Film"
        >
          Film
        </GlassTableHeaderCell>,
      );
      expect(getByTestId("c-sort-desc")).toBeTruthy();
      expect(getByTestId("c").props.accessibilityLabel).toContain("absteigend");
    });

    it("icon cell keeps label and gains press + indicator when sortable", async () => {
      const onPress = jest.fn();
      const { getByTestId } = await render(
        <GlassTableHeaderIconCell
          testID="i"
          label="Durchschnitt"
          onPress={onPress}
          sortState="desc"
        >
          <Text>*</Text>
        </GlassTableHeaderIconCell>,
      );
      expect(getByTestId("i").props.accessibilityLabel).toContain("Durchschnitt");
      expect(getByTestId("i-sort-desc")).toBeTruthy();
      await fireEvent.press(getByTestId("i"));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("icon cell without onPress has no indicator", async () => {
      const { getByTestId, queryByTestId } = await render(
        <GlassTableHeaderIconCell testID="i" label="Favorit">
          <Text>*</Text>
        </GlassTableHeaderIconCell>,
      );
      expect(getByTestId("i").props.accessibilityLabel).toBe("Favorit");
      expect(queryByTestId("i-sort-asc")).toBeNull();
    });

    it("icon cell: chevron is an overlay below the icon row, icon row has fixed height, touch target >= 44dp", async () => {
      const { getByTestId } = await render(
        <GlassTableHeaderIconCell
          testID="i"
          label="Durchschnitt"
          onPress={() => {}}
          sortState="asc"
        >
          <Text>*</Text>
        </GlassTableHeaderIconCell>,
      );
      const chevron = getByTestId("i-sort-asc");
      expect(chevron.parent?.props.className).toContain("absolute");
      expect(chevron.parent?.props.className).toContain("top-[22px]");
      expect(chevron.parent?.props.pointerEvents).toBe("none");
      expect(getByTestId("i").props.className).toContain("h-9");
      const slop = getByTestId("i").props.hitSlop;
      expect(24 + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
    });

    it("idle header cells have normal height (no reserved chevron strip)", async () => {
      const { getByTestId } = await render(
        <>
          <GlassTableHeaderIconCell testID="i" label="X" onPress={() => {}}>
            <Text>*</Text>
          </GlassTableHeaderIconCell>
          <GlassTableHeaderCell testID="c" onPress={() => {}}>
            Film
          </GlassTableHeaderCell>
        </>,
      );
      for (const id of ["i", "c"]) {
        expect(getByTestId(id).props.className).toContain("h-6");
        expect(getByTestId(id).props.className).not.toContain("h-9");
      }
    });

    it("text cell reserves a fixed 14px chevron slot with and without sort", async () => {
      const { getByTestId, queryByTestId, rerender, toJSON } = await render(
        <GlassTableHeaderCell testID="c" onPress={() => {}} sortState={null}>
          Film
        </GlassTableHeaderCell>,
      );
      const before = JSON.stringify(toJSON()).includes("w-[14px]");
      await rerender(
        <GlassTableHeaderCell testID="c" onPress={() => {}} sortState="desc">
          Film
        </GlassTableHeaderCell>,
      );
      expect(before).toBe(true);
      expect(getByTestId("c-sort-desc")).toBeTruthy();
      expect(queryByTestId("c-sort-asc")).toBeNull();
    });

    it("header and data cells of a column share the same width constants", () => {
      const width = (c: string) => c.split(" ").find((x) => x.startsWith("w-"));
      expect(width(TABLE_ICON_CELL)).toBe("w-12");
      expect(width(TABLE_SCORE_STRONG_CELL)).toBe("w-12");
      expect(width(TABLE_SCORE_CELL)).toBe("w-16");
    });
  });

  it("header and rows use the flat dark glass (no live BlurView per row)", async () => {
    const { queryAllByTestId, toJSON } = await render(
      <>
        <GlassTableHeader>
          <Text>H</Text>
        </GlassTableHeader>
        <GlassTableRow isLast={false} onPress={() => {}}>
          <Text>A</Text>
        </GlassTableRow>
      </>,
    );
    expect(queryAllByTestId("glass-blur-view")).toHaveLength(0);
    expect(JSON.stringify(toJSON()).match(/bg-bg-card-flat/g)).toHaveLength(2);
  });
});
