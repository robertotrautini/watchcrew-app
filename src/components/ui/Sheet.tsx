import { type ReactNode } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { modalKeyboardAvoidingBehavior } from "@/lib/platformKeyboardAvoiding";

/**
 * Below this viewport width, the backdrop uses a flatter/less-transparent
 * fill instead of relying on layered opacity for its "glass" look. This is
 * the cheap stand-in for the planning report's "reduced blur on small
 * screens for performance" note: a real blur view (e.g. expo-glass-effect,
 * already a dependency) is NOT wired in here, since this base component is
 * meant to stay simple/generic — swapping in a real BlurView per-platform is
 * left as a follow-up once a screen actually needs it. Width is read once at
 * module load (not via a resize listener) since phones don't rotate between
 * a Sheet opening and closing.
 */
const SMALL_SCREEN_WIDTH_THRESHOLD = 380;
const isSmallScreen =
  Dimensions.get("window").width < SMALL_SCREEN_WIDTH_THRESHOLD;

export interface SheetProps {
  /** Whether the sheet is currently shown. */
  visible: boolean;
  /** Called when the user asks to dismiss the sheet (backdrop tap or close button). */
  onClose: () => void;
  /** Optional title, rendered in the brand display font with a close button. */
  title?: string;
  /** The dialog's own content — this component only supplies the chrome. */
  children?: ReactNode;
}

/**
 * Generic bottom-sheet-style modal wrapper — the shared dialog primitive
 * referenced in docs/planning-report.html ("Ein wiederverwendetes
 * Sheet/Modal-System treibt jeden Dialog an"). Callers supply the actual
 * dialog content as `children`; this component only owns the backdrop, the
 * sheet container chrome, and the optional title/close affordance.
 *
 * Implementation choice: built on React Native's built-in `Modal`
 * (`transparent` + `animationType="slide"`) rather than a custom
 * `Animated`-driven sheet or a gesture-driven bottom-sheet library. A
 * slide-up transparent Modal already gives the "sheet" look or feel
 * end-to-end (backdrop fade is implicit via the transparent overlay, sheet
 * slides from the bottom) without pulling in gesture/drag-to-dismiss
 * behavior, which was explicitly out of scope for this task.
 */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/*
       * M11 (platform-quirk review, see docs/interim-decisions.md "M11 —
       * Keyboard-Avoiding"): RN's `Modal` opens its own native window
       * (a separate Android Dialog / iOS UIWindow), so it does NOT inherit
       * the app's own keyboard-resize handling -- without this, several
       * Sheet-based dialogs with a real text input (PaymentModal's "Film
       * suchen…", the delete-account confirmation phrase) would get their
       * bottom-anchored content (incl. the save/confirm button) covered by
       * the keyboard. `"height"` on Android rather than leaving it
       * `undefined`, specifically because Android's usual automatic
       * `windowSoftInputMode="adjustResize"` behavior applies to the main
       * Activity window, not to a `Modal`'s own separate Dialog window.
       */}
      <KeyboardAvoidingView
        testID="sheet-keyboard-avoiding-view"
        behavior={modalKeyboardAvoidingBehavior(Platform.OS)}
        className="flex-1"
      >
        <Pressable
          testID="sheet-backdrop"
          onPress={onClose}
          className={
            isSmallScreen
              ? "flex-1 justify-end bg-black/70"
              : "flex-1 justify-end bg-black/50"
          }
        >
          <Pressable
            onPress={() => {
              // Swallow the tap so it doesn't bubble to the backdrop
              // Pressable above and close the sheet when interacting with
              // its own content.
            }}
            testID="sheet-surface"
            // Near-opaque (.97) on purpose: bg-glass (.7 alpha) let the tab bar and
            // the screen behind the Modal bleed through the sheet; no blur available.
            className="rounded-t-xl border-t border-glass-border bg-bg-sheet shadow-card"
          >
            <SafeAreaView edges={["bottom"]} testID="sheet-safe-area">
              {title ? (
                <View className="flex-row items-center justify-between border-b border-border-subtle px-4 py-3">
                  <Text className="font-display text-lg text-text-primary">
                    {title}
                  </Text>
                  <Pressable
                    testID="sheet-close-button"
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    className="h-touch-min w-touch-min items-center justify-center"
                  >
                    <Text className="text-2xl text-text-primary">×</Text>
                  </Pressable>
                </View>
              ) : null}
              <View className="p-4">{children}</View>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
