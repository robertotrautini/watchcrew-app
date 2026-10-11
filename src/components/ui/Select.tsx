import { PLACEHOLDER_COLOR } from "@/lib/colors";
import { useEffect, useRef, useState } from "react";
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { CONTROL_MIN_HEIGHT_CLASSNAME } from "@/components/ui/controlHeight";
import { SURFACE_EDGE } from "@/components/ui/Surface";
import { Icon, type IconRole } from "@/components/ui/Icon";
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
  /** Optional icon at the left of the trigger (not in the open overlay list). */
  leadingIcon?: IconRole;
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

interface SelectAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
 * Dropdown: trigger field in the layout; while open, field + list are drawn in
 * a transparent RN `Modal` (own Android window) at the trigger's measured
 * window position. The layout never shifts (the original trigger stays in
 * place, covered by the identical field in the Modal). Why a Modal: on Android
 * touches on children outside the parent bounds are not delivered and a
 * vertical ScrollView in a sheet ScrollView/overflow-hidden surface swallows
 * the scroll gesture; a Modal window has neither problem. Tapping outside
 * (backdrop) or hardware-back closes it. Options use the flat dark fill (no
 * per-item blur). Closes on selection, on outside tap, or on pressing the
 * field again.
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
  leadingIcon,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const wrapperRef = useRef<View>(null);
  const keyboardHeight = useKeyboardHeight();
  const [anchor, setAnchor] = useState<SelectAnchor | null>(null);
  const [placement, setPlacement] = useState<SelectListPlacement>({ direction: "down", maxHeight: LIST_MAX_HEIGHT });

  // Measure trigger position + free space (keyboard aware) when the list opens or the keyboard moves.
  // Measured again shortly after, because the surrounding sheet lifts with the keyboard.
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    function measure() {
      wrapperRef.current?.measureInWindow?.((x, y, w, h) => {
        if (!(h > 0)) {
          return;
        }
        setAnchor({ x, y, width: w, height: h });
        const bottomLimit = Dimensions.get("screen").height - keyboardHeight;
        setPlacement(selectListPlacement(bottomLimit - (y + h) - EDGE_GAP, y - TOP_MARGIN));
      });
    }
    measure();
    const timer = setTimeout(measure, 200);
    return () => clearTimeout(timer);
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

  function close() {
    setOpen(false);
    setQuery("");
  }

  function toggle() {
    if (disabled) {
      return;
    }
    setQuery("");
    if (open) {
      setOpen(false);
    } else {
      setAnchor(null);
      setOpen(true);
    }
  }

  function handleSelect(next: string) {
    close();
    onChange(next);
  }

  const showInput = open && searchable;
  // Field visible but not auto-focused: the field handles its own taps, it must not toggle.
  const manualFocus = showInput && !autoFocusSearch;
  const chevronColor = PLACEHOLDER_COLOR;
  const fieldClass = cn(
    `${CONTROL_MIN_HEIGHT_CLASSNAME} flex-row items-center gap-2 rounded-lg ${SURFACE_EDGE} bg-field px-4`,
    disabled && "opacity-50",
  );

  // Dynamic (measured) geometry: legitimately inline.
  const screenHeight = Dimensions.get("screen").height;
  const fieldGeometry = anchor
    ? { left: anchor.x, top: anchor.y, width: anchor.width, height: anchor.height }
    : { left: 0, right: 0, top: 0 };
  const listGeometry = anchor
    ? placement.direction === "up"
      ? { left: anchor.x, width: anchor.width, bottom: screenHeight - anchor.y + 4, maxHeight: placement.maxHeight }
      : { left: anchor.x, width: anchor.width, top: anchor.y + anchor.height + 4, maxHeight: placement.maxHeight }
    : { left: 0, right: 0, top: 0, maxHeight: placement.maxHeight };
  const measuredStyle = anchor ? undefined : styles.unmeasured;

  return (
    <View ref={wrapperRef} className={className} style={styles.wrapper}>
      <Pressable
        testID={testID}
        accessibilityRole="combobox"
        accessibilityLabel={accessibilityLabel ?? selected?.label ?? placeholder}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={toggle}
        className={fieldClass}
      >
        {leadingIcon ? <Icon name={leadingIcon} size="M" color={chevronColor} /> : null}
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          className={cn("flex-1", selected ? "text-text-primary" : "text-text-secondary")}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Icon name={open ? "chevronUp" : "chevronDown"} size="M" color={chevronColor} />
      </Pressable>
      {open ? (
        <Modal
          transparent
          animationType="none"
          statusBarTranslucent
          navigationBarTranslucent
          onRequestClose={close}
        >
          <View style={styles.modalRoot}>
            <Pressable
              testID={`${testID}-backdrop`}
              accessibilityLabel="Auswahl schließen"
              onPress={close}
              style={styles.backdrop}
            />
            <Pressable
              testID={`${testID}-field`}
              accessibilityRole="combobox"
              accessibilityLabel={accessibilityLabel ?? selected?.label ?? placeholder}
              accessibilityState={{ expanded: true, disabled }}
              onPress={manualFocus ? undefined : toggle}
              className={fieldClass}
              style={[styles.overlayPart, fieldGeometry, measuredStyle]}
            >
              {leadingIcon ? <Icon name={leadingIcon} size="M" color={chevronColor} /> : null}
              {showInput ? (
                <TextInput
                  testID={`${testID}-search`}
                  autoFocus={autoFocusSearch}
                  value={query}
                  onChangeText={setQuery}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={chevronColor}
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
                  <Icon name="chevronUp" size="M" color={chevronColor} />
                </Pressable>
              ) : (
                <Icon name="chevronUp" size="M" color={chevronColor} />
              )}
            </Pressable>
            <View
              testID={`${testID}-list`}
              className={`overflow-hidden rounded-lg ${SURFACE_EDGE} bg-field`}
              style={[styles.overlayPart, listGeometry, measuredStyle]}
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
                          "min-h-touch-comfortable justify-center border-b border-surface-border px-4",
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
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "relative" },
  modalRoot: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill },
  overlayPart: { position: "absolute" },
  // Hidden until the first window measurement arrives (avoids a flash at the wrong place).
  unmeasured: { opacity: 0 },
});
