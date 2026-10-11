/**
 * ONE height for every operable control row/field (docs/style-guide.md "Felder und Flächen"):
 * TextField, Select trigger, default Button, ListRow, member capsule. 56dp (Material 3 list item).
 * The class must stay a literal so NativeWind sees it; the test pins both to each other.
 * Smaller variants (Button sm/xs, Chip, IconButton 48/44) keep their own size on purpose.
 */
export const CONTROL_HEIGHT = 56;
/** Fixed height (rows). */
export const CONTROL_HEIGHT_CLASSNAME = "h-14";
/** Minimum height (fields/buttons that may grow with content, e.g. multiline TextField). */
export const CONTROL_MIN_HEIGHT_CLASSNAME = "min-h-14";
