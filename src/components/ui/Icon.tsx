import { MaterialIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

/**
 * Central icon component (Material Icons). Callers pass a semantic ROLE as `name`, never a
 * raw glyph name, so every screen uses the same glyph for the same meaning.
 * Material has few outlined variants: filled glyphs are used throughout; the
 * `-border` / `-outline` glyphs only where they carry state (empty star, heart,
 * checkbox, inactive watchlist tab).
 */
export const ICON_ROLES = {
  // navigation / chrome
  back: "arrow-back",
  close: "close",
  check: "check",
  chevronRight: "chevron-right",
  chevronUp: "expand-less",
  chevronDown: "expand-more",
  settings: "settings",
  options: "tune",
  sort: "sort",
  logout: "logout",
  join: "login",
  login: "login",
  next: "arrow-forward",
  // tabs (active / inactive)
  tabTracker: "payments",
  tabWatchlist: "bookmark",
  tabWatchlistInactive: "bookmark-border",
  tabDiary: "menu-book",
  // actions
  add: "add",
  addCircle: "add-circle",
  edit: "edit",
  save: "save",
  delete: "delete",
  share: "share",
  regenerate: "refresh",
  reset: "restore",
  send: "send",
  register: "person-add",
  leave: "exit-to-app",
  removeMember: "person-remove",
  change: "swap-horiz",
  price: "payments",
  play: "play-arrow",
  // movie / rating
  film: "movie",
  filmSeries: "movie-filter",
  similar: "collections",
  star: "star",
  starHalf: "star-half",
  starEmpty: "star-border",
  heart: "favorite",
  heartEmpty: "favorite-border",
  bookmark: "bookmark",
  bookmarkEmpty: "bookmark-border",
  watched: "visibility",
  person: "person",
  checkboxOn: "check-box",
  checkboxOff: "check-box-outline-blank",
  // view modes
  viewCards: "view-agenda",
  viewGrid: "grid-view",
  viewList: "table-rows",
  // settings entries
  group: "people",
  streaming: "tv",
  theme: "palette",
  notifications: "notifications",
  document: "description",
  // theme swatch
  swatch: "circle",
  selected: "check-circle",
  // feedback (toasts)
  toastSuccess: "check-circle",
  toastError: "error",
} as const satisfies Record<string, ComponentProps<typeof MaterialIcons>["name"]>;

export type IconRole = keyof typeof ICON_ROLES;

/** S: badges/inline (was 14-18), M: buttons/rows (was 20-28), L: posters/empty states (was 32-56). */
export const ICON_SIZES = { S: 16, M: 24, L: 40 } as const;
export type IconSize = keyof typeof ICON_SIZES;

type IconProps = Omit<ComponentProps<typeof MaterialIcons>, "name" | "size"> & {
  /** Semantic role (not a raw glyph name). */
  name: IconRole;
  size?: IconSize;
};

export function Icon({ name, size = "M", ...rest }: IconProps) {
  return <MaterialIcons {...rest} name={ICON_ROLES[name]} size={ICON_SIZES[size]} />;
}
