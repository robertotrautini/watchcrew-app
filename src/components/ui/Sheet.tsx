import { type ReactNode } from "react";
import { Dimensions, Modal, Pressable, Text, View } from "react-native";

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
const isSmallScreen = Dimensions.get("window").width < SMALL_SCREEN_WIDTH_THRESHOLD;

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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        testID="sheet-backdrop"
        onPress={onClose}
        className={
          isSmallScreen ? "flex-1 justify-end bg-black/70" : "flex-1 justify-end bg-black/50"
        }>
        <Pressable
          onPress={() => {
            // Swallow the tap so it doesn't bubble to the backdrop
            // Pressable above and close the sheet when interacting with
            // its own content.
          }}
          className="rounded-t-xl bg-glass shadow-card">
          {title ? (
            <View className="flex-row items-center justify-between border-b border-border-subtle px-4 py-3">
              <Text className="font-display text-lg text-text-primary">{title}</Text>
              <Pressable
                testID="sheet-close-button"
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                className="h-touch-min w-touch-min items-center justify-center">
                <Text className="text-2xl text-text-primary">×</Text>
              </Pressable>
            </View>
          ) : null}
          <View className="p-4">{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
