/**
 * Multi-column FlatList rows stretch a lone last item to the full row width
 * (the tile uses `flex-1`). Padding the data with invisible placeholders up to
 * a full row keeps every tile at exactly 1/columns width, left-aligned.
 */
export interface GridPlaceholder {
  placeholder: true;
  key: string;
}

export function isGridPlaceholder(value: unknown): value is GridPlaceholder {
  return typeof value === "object" && value !== null && (value as GridPlaceholder).placeholder === true;
}

export function padToFullRows<T>(items: T[], columns: number): Array<T | GridPlaceholder> {
  if (columns <= 1 || items.length === 0) {
    return items;
  }
  const missing = (columns - (items.length % columns)) % columns;
  const placeholders: GridPlaceholder[] = Array.from({ length: missing }, (_, i) => ({
    placeholder: true as const,
    key: `__placeholder-${i}`,
  }));
  return [...items, ...placeholders];
}
