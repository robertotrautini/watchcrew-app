/** Smallest sheet height that still shows a title + one input row. */
const MIN_SHEET_HEIGHT = 120;

/**
 * Max panel height of a bottom Sheet: the window minus the top inset (so the
 * sheet never slides under the status bar) minus the on-screen keyboard.
 */
export function sheetMaxHeight(windowHeight: number, keyboardHeight: number, topInset: number): number {
  return Math.max(MIN_SHEET_HEIGHT, windowHeight - topInset - keyboardHeight);
}
