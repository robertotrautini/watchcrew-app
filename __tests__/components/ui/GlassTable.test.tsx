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

  it("rows are square slices of one container: only the last row is rounded (bottom)", async () => {
    const { getByTestId, toJSON } = await render(
      <>
        <GlassTableHeader testID="h">
          <Text>H</Text>
        </GlassTableHeader>
        <GlassTableRow testID="a" isLast={false} onPress={() => {}}>
          <Text>A</Text>
        </GlassTableRow>
        <GlassTableRow testID="b" isLast onPress={() => {}}>
          <Text>B</Text>
        </GlassTableRow>
      </>,
    );
    const json = JSON.stringify(toJSON());
    // header: top rounding only; middle row square; last row bottom rounding only
    expect(json).toContain("rounded-t-xl");
    expect(json).toContain("rounded-b-xl");
    expect(json).not.toMatch(/"className":"[^"]*\brounded-xl\b/);
    expect(getByTestId("h")).toBeTruthy();
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

  it("header content is vertically centred: symmetric pt-3/pb-3, items-center", async () => {
    const { getByTestId, toJSON } = await render(
      <GlassTableHeader testID="h">
        <Text>H</Text>
      </GlassTableHeader>,
    );
    const cls = getByTestId("h").props.className;
    expect(cls).toContain("items-center");
    expect(cls).toContain("pb-3");
    expect(JSON.stringify(toJSON())).toContain("pt-3");
  });

  describe("static header cells", () => {
    it("text and icon cells are plain (no button, no sort chevron)", async () => {
      const { getByTestId } = await render(
        <GlassTableHeader>
          <GlassTableHeaderCell testID="c">Film</GlassTableHeaderCell>
          <GlassTableHeaderIconCell testID="i" label="Favorit">
            <Text>*</Text>
          </GlassTableHeaderIconCell>
        </GlassTableHeader>,
      );
      expect(getByTestId("c").props.accessibilityRole).not.toBe("button");
      expect(getByTestId("i").props.accessibilityRole).not.toBe("button");
      expect(getByTestId("i").props.accessibilityLabel).toBe("Favorit");
      expect(getByTestId("i").props.onPress).toBeUndefined();
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
