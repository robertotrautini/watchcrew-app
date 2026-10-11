import { renderHook } from "@testing-library/react-native";

import { useSortRemountKey } from "@/hooks/useSortRemountKey";
import type { SortState } from "@/lib/entrySorting";

const asc: SortState = { field: "title", direction: "asc" };
const desc: SortState = { field: "title", direction: "desc" };

describe("useSortRemountKey", () => {
  it("changes the key and skips the fade when only the sort changes", async () => {
    const { result, rerender } = await renderHook(
      (p: { mode: string; sort: SortState }) => useSortRemountKey(p.mode, p.sort),
      { initialProps: { mode: "grid", sort: asc } },
    );
    const first = result.current;
    expect(first.skipFade).toBe(false);

    await rerender({ mode: "grid", sort: desc });
    expect(result.current.listKey).not.toBe(first.listKey);
    expect(result.current.skipFade).toBe(true);
  });

  it("keeps the key for unrelated rerenders", async () => {
    const { result, rerender } = await renderHook(
      (p: { mode: string; sort: SortState }) => useSortRemountKey(p.mode, p.sort),
      { initialProps: { mode: "grid", sort: asc } },
    );
    const key = result.current.listKey;
    await rerender({ mode: "grid", sort: { ...asc } });
    expect(result.current.listKey).toBe(key);
  });

  it("re-enables the fade on a mode change", async () => {
    const { result, rerender } = await renderHook(
      (p: { mode: string; sort: SortState }) => useSortRemountKey(p.mode, p.sort),
      { initialProps: { mode: "grid", sort: asc } },
    );
    await rerender({ mode: "grid", sort: desc });
    await rerender({ mode: "list", sort: desc });
    expect(result.current.skipFade).toBe(false);
  });
});
