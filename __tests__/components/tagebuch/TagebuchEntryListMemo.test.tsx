import { render } from "@testing-library/react-native";

import {
  PANEL_LIST_CONTENT_PT_CLASSNAME,
  PANEL_LIST_GRID_CONTENT_PT_CLASSNAME,
} from "@/components/ui/Surface";

import { TagebuchEntryList } from "@/components/tagebuch/TagebuchEntryList";

const mockCardRender = jest.fn();
jest.mock("@/components/movie/DiaryEntryCard", () => {
  const { Text } = require("react-native");
  return {
    ...jest.requireActual("@/components/movie/DiaryEntryCard"),
    DiaryEntryCard: (props: { title: string }) => {
      mockCardRender(props.title);
      return <Text>{props.title}</Text>;
    },
  };
});

function entry(id: string) {
  return {
    id,
    movie: { id, tmdb_id: 1, name: `Film ${id}`, poster: null, vote_average: 7 },
    ratings: [],
  } as never;
}

describe("TagebuchEntryList sort remount", () => {
  it("a sort change remounts the list and renders the rows in the new order", async () => {
    const a = entry("a");
    const b = entry("b");
    const c = entry("c");
    const members: string[] = [];
    const names = new Map<string, string>();
    const onOpen = jest.fn();
    const ui = (entries: never[], dir: "asc" | "desc") => (
      <TagebuchEntryList
        entries={entries}
        mode="cards"
        userId="u"
        starColor="#fff"
        showTitlesInGrid
        groupMemberIds={members}
        displayNameById={names}
        onOpenEntry={onOpen}
        sort={{ field: "title", direction: dir }}
      />
    );
    const r = await render(ui([a, b, c] as never[], "asc"));
    expect(mockCardRender).toHaveBeenCalledTimes(3);
    mockCardRender.mockClear();
    await r.rerender(ui([c, b, a] as never[], "desc"));
    // Fresh mount (key changed): all rows render once, first row is the new first.
    expect(mockCardRender).toHaveBeenCalledTimes(3);
    expect(mockCardRender.mock.calls.map((c) => c[0])).toEqual([
      "Film c",
      "Film b",
      "Film a",
    ]);
  });

  it.each(["cards", "grid", "list"] as const)("%s mode: list content starts with PANEL_LIST_CONTENT_PT_CLASSNAME", async (mode) => {
    const r = await render((
      <TagebuchEntryList
        entries={[entry("a")] as never[]}
        mode={mode}
        userId="u"
        starColor="#fff"
        showTitlesInGrid
        groupMemberIds={[]}
        displayNameById={new Map()}
        onOpenEntry={jest.fn()}
        sort={{ field: "title", direction: "asc" }}
      />
    ));
    const cls = r.getByTestId("tagebuch-entry-list").props.contentContainerClassName as string;
    expect(cls).toContain(
      mode === "grid" ? PANEL_LIST_GRID_CONTENT_PT_CLASSNAME : PANEL_LIST_CONTENT_PT_CLASSNAME,
    );
    expect(cls).not.toMatch(/(^| )pt-3( |$)/);
  });
});
