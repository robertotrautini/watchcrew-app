import { useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { GLASS_EDGE, GLASS_FLAT_FILL } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Text, TextInput } from "@/components/ui/Text";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional small secondary line under the label in the list (not in the trigger). */
  hint?: string;
}

export interface SelectProps {
  /** Trigger testID; derived ids: `-list`, `-option-<value>`, `-search`, `-empty`. */
  testID: string;
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Text input in the trigger while open; filters options live (case-insensitive substring). */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** searchable only: focus the search field on open (default true). false = field is shown, keyboard only after an own tap. */
  autoFocusSearch?: boolean;
  /** searchable only: list shown for an empty query (e.g. recent items); typing filters ALL `options`. */
  defaultOptions?: SelectOption[];
  emptyText?: string;
  disabled?: boolean;
  /** Reports the open state so the parent can shield siblings (pointerEvents) while the list is open. */
  onOpenChange?: (open: boolean) => void;
  accessibilityLabel?: string;
  className?: string;
}

/** Case-insensitive substring filter; an empty/blank query returns all options. */
export function filterSelectOptions(options: SelectOption[], query: string): SelectOption[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return options;
  }
  return options.filter((o) => o.label.toLowerCase().includes(needle));
}

const LIST_MAX_HEIGHT = 240;
const LIST_MIN_HEIGHT = 96;
const EDGE_GAP = 8;
/** Space kept free at the top of the window (status bar). */
const TOP_MARGIN = 48;
/** Below this much room the list prefers opening upwards (if that has more room). */
const COMFORTABLE_HEIGHT = 160;

export interface SelectListPlacement {
  direction: "down" | "up";
  maxHeight: number;
}

/**
 * Where the overlay list opens: down by default; up only when the space below
 * (e.g. above the keyboard in a sheet) is tight AND the space above is larger.
 * The height is clamped to the chosen space (min 96, max 240).
 */
export function selectListPlacement(spaceBelow: number, spaceAbove: number): SelectListPlacement {
  const clamp = (space: number) => Math.min(LIST_MAX_HEIGHT, Math.max(LIST_MIN_HEIGHT, Math.floor(space)));
  if (spaceBelow >= COMFORTABLE_HEIGHT || spaceBelow >= spaceAbove) {
    return { direction: "down", maxHeight: clamp(spaceBelow) };
  }
  return { direction: "up", maxHeight: clamp(spaceAbove) };
}

/**
 * Dropdown: trigger field + list as an absolutely positioned overlay directly
 * below (or above, when space is tight) the trigger. It is drawn over the page
 * content, so the layout never shifts. Tapping outside (backdrop) closes it.
 * Options use the flat dark fill (no per-item blur). Closes on selection, on
 * outside tap, or on pressing the trigger again.
 */
export function Select({
  testID,
  options,
  value,
  onChange,
  placeholder = "Auswählen",
  searchable = false,
  searchPlaceholder = "Suchen…",
  autoFocusSearch = true,
  defaultOptions,
  emptyText = "Keine Treffer",
  disabled = false,
  onOpenChange,
  accessibilityLabel,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const wrapperRef = useRef<View>(null);
  const keyboardHeight = useKeyboardHeight();
  const [placement, setPlacement] = useState<SelectListPlacement>({ direction: "down", maxHeight: LIST_MAX_HEIGHT });

  // Measure free space (keyboard aware) whenever the list opens or the keyboard moves.
  useEffect(() => {
    if (!open) {
      return;
    }
    wrapperRef.current?.measureInWindow?.((_x, y, _w, h) => {
      if (!(h > 0)) {
        return;
      }
      const bottomLimit = Dimensions.get("screen").height - keyboardHeight;
      setPlacement(selectListPlacement(bottomLimit - (y + h) - EDGE_GAP, y - TOP_MARGIN));
    });
  }, [open, keyboardHeight]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  // Never leave the parent shielded if the Select unmounts while open.
  useEffect(() => () => onOpenChange?.(false), [onOpenChange]);

  const selected = options.find((o) => o.value === value) ?? null;
  const visible = !searchable
    ? options
    : defaultOptions && query.trim() === ""
      ? defaultOptions
      : filterSelectOptions(options, query);

  function toggle() {
    if (disabled) {
      return;
    }
    setQuery("");
    setOpen((prev) => !prev);
  }

  function handleSelect(next: string) {
    setOpen(false);
    setQuery("");
    onChange(next);
  }

  const showInput = open && searchable;
  // Field visible but not auto-focused: the field handles its own taps, the trigger must not toggle.
  const manualFocus = showInput && !autoFocusSearch;

  return (
    <View ref={wrapperRef} className={className} style={open ? styles.wrapperOpen : styles.wrapper}>
      {open ? (
        <Pressable
          testID={`${testID}-backdrop`}
          accessibilityLabel="Auswahl schließen"
          onPress={() => {
            setOpen(false);
            setQuery("");
          }}
          style={styles.backdrop}
        />
      ) : null}
      <Pressable
        testID={testID}
        accessibilityRole="combobox"
        accessibilityLabel={accessibilityLabel ?? selected?.label ?? placeholder}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={manualFocus ? undefined : toggle}
        className={cn(
          `min-h-touch-comfortable flex-row items-center gap-2 rounded-lg ${GLASS_EDGE} ${GLASS_FLAT_FILL} px-4`,
          disabled && "opacity-50",
        )}
      >
        {showInput ? (
          <TextInput
            testID={`${testID}-search`}
            autoFocus={autoFocusSearch}
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor="#8b8b8b"
            accessibilityLabel={searchPlaceholder}
            className="flex-1 py-2 text-text-primary"
          />
        ) : (
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            className={cn("flex-1", selected ? "text-text-primary" : "text-text-secondary")}
          >
            {selected?.label ?? placeholder}
          </Text>
        )}
        {manualFocus ? (
          <Pressable
            testID={`${testID}-toggle`}
            accessibilityRole="button"
            accessibilityLabel="Auswahl schließen"
            hitSlop={12}
            onPress={toggle}
          >
            <Icon name="chevronUp" size="M" color="#8b8b8b" />
          </Pressable>
        ) : (
          <Icon name={open ? "chevronUp" : "chevronDown"} size="M" color="#8b8b8b" />
        )}
      </Pressable>
      {open ? (
        <View
          testID={`${testID}-list`}
          className={`overflow-hidden rounded-lg ${GLASS_EDGE} ${GLASS_FLAT_FILL}`}
          style={[
            styles.list,
            placement.direction === "up" ? styles.listUp : styles.listDown,
            { maxHeight: placement.maxHeight },
          ]}
        >
          <ScrollView testID={`${testID}-scroll`} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {visible.length === 0 ? (
              <Text testID={`${testID}-empty`} className="px-4 py-3 text-text-secondary">
                {emptyText}
              </Text>
            ) : (
              visible.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    testID={`${testID}-option-${option.value}`}
                    accessibilityRole="menuitem"
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => handleSelect(option.value)}
                    className={cn(
                      "min-h-touch-comfortable justify-center border-b border-glass-border px-4",
                      isSelected && "bg-accent",
                    )}
                  >
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      className={isSelected ? "text-bg-primary" : "text-text-primary"}
                    >
                      {option.label}
                    </Text>
                    {option.hint ? (
                      <Text
                        testID={`${testID}-option-${option.value}-hint`}
                        numberOfLines={1}
                        className={cn("text-xs", isSelected ? "text-bg-primary" : "text-text-secondary")}
                      >
                        {option.hint}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "relative" },
  // Raised above following siblings (iOS zIndex, Android elevation) while open.
  wrapperOpen: { position: "relative", zIndex: 50, elevation: 50 },
  // Huge inset: with overflow visible the area outside the wrapper still catches taps.
  backdrop: { position: "absolute", top: -2000, bottom: -2000, left: -2000, right: -2000 },
  list: { position: "absolute", left: 0, right: 0, zIndex: 60, elevation: 60 },
  listDown: { top: "100%", marginTop: 4 },
  listUp: { bottom: "100%", marginBottom: 4 },
});
