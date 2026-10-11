import { render } from "@testing-library/react-native";

import { ICON_ROLES, ICON_SIZES, Icon } from "@/components/ui/Icon";

// Host props (name/size/color) are asserted on a View stand-in; the real glyph map is kept.
jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  const actual = jest.requireActual("@expo/vector-icons");
  const MaterialIcons = (props: Record<string, unknown>) => <View {...props} />;
  MaterialIcons.glyphMap = actual.MaterialIcons.glyphMap;
  return { MaterialIcons };
});

// eslint-disable-next-line import/first
import { MaterialIcons } from "@expo/vector-icons";

describe("Icon", () => {
  it("maps every role to an existing MaterialIcons glyph", () => {
    const glyphs = Object.keys(MaterialIcons.glyphMap);
    for (const [role, glyph] of Object.entries(ICON_ROLES)) {
      expect({ role, ok: glyphs.includes(glyph) }).toEqual({ role, ok: true });
    }
  });

  it("defines the empty-state roles search, filter and studio", () => {
    expect(ICON_ROLES.search).toBe("search");
    expect(ICON_ROLES.filter).toBe("filter-list");
    expect(ICON_ROLES.studio).toBe("business");
  });

  it("defines the S/M/L size tokens", () => {
    expect(ICON_SIZES).toEqual({ XS: 14, S: 16, SM: 20, M: 24, L: 40 });
  });

  it("renders the role's glyph at the token size, default M", async () => {
    const view = await render(<Icon testID="i" name="back" color="#fff" />);
    const node = view.getByTestId("i");
    expect(node.props.name).toBe("arrow-back");
    expect(node.props.size).toBe(24);
    expect(node.props.color).toBe("#fff");
  });

  it("resolves size tokens", async () => {
    const view = await render(<Icon testID="i" name="star" size="L" />);
    expect(view.getByTestId("i").props.size).toBe(40);
  });
});
