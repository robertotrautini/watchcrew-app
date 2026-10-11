/**
 * Central TS mirrors of design tokens for RN props that take no className
 * (Icon `color`, `placeholderTextColor`, navigation themes, ...).
 * Keep in sync with tailwind.config.js.
 */

/** Fixed regardless of theme: the "Mag ich" like-heart (tailwind token `like-heart`). */
export const LIKE_HEART_COLOR = "#e05c6e";

/** Placeholder text / muted placeholder icons / chevrons: one neutral grey everywhere. */
export const PLACEHOLDER_COLOR = "#888888";

/** Mirrors of tailwind tokens (bg-primary, text-primary, danger-text, success-text, star-empty). */
export const BG_PRIMARY_COLOR = "#0a0a0a";
export const TEXT_PRIMARY_COLOR = "#e8e8e8";
export const DANGER_TEXT_COLOR = "#e5675a";
export const SUCCESS_TEXT_COLOR = "#5fcf8a";
export const STAR_EMPTY_COLOR = "#575757";

/**
 * ONE opaque fill for every control (text fields, dropdowns, buttons, settings rows, view toggles).
 * Measured on device (Select trigger) = rgb(10,10,12). Mirrors tailwind token `field` (`bg-field`).
 * Never use alpha for controls: rgba fills rendered black/unreliable on device.
 */
export const FIELD_FILL = "#0a0a0c";
