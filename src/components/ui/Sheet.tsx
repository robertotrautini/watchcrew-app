import {
  Fragment,
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { BUTTON_ICON_COLORS, Button } from "@/components/ui/Button";
import {
  GLASS_PANEL_BLUR_FILL,
  GLASS_PANEL_FALLBACK_FILL,
} from "@/components/ui/Glass";
import { GlassBlur } from "@/components/ui/GlassBlur";
import { Icon } from "@/components/ui/Icon";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { modalKeyboardAvoidingBehavior } from "@/lib/platformKeyboardAvoiding";
import { sheetMaxHeight } from "@/lib/sheetLayout";

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

/** Space kept free above the sheet (status bar + a visible backdrop strip). */
const SHEET_TOP_MARGIN = 80;

interface SheetHostApi {
  set: (id: string, node: ReactNode | null) => void;
}
const SheetHostContext = createContext<SheetHostApi | null>(null);

/**
 * Optional screen-level host: Sheets rendered below it (even deep inside a
 * small absolutely positioned bar) draw their overlay here instead, so the
 * overlay fills the whole host area rather than only the nearest parent view.
 * Without a host a Sheet renders its overlay inline (unchanged behavior).
 */
export function SheetHost({ children }: { children?: ReactNode }) {
  const [nodes, setNodes] = useState<Record<string, ReactNode>>({});
  const api = useRef<SheetHostApi>({
    set: (id, node) =>
      setNodes((prev) => {
        if (node == null) {
          if (!(id in prev)) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        }
        return { ...prev, [id]: node };
      }),
  }).current;
  return (
    <SheetHostContext.Provider value={api}>
      {children}
      {Object.entries(nodes).map(([id, node]) => (
        <Fragment key={id}>{node}</Fragment>
      ))}
    </SheetHostContext.Provider>
  );
}

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
 * Generic bottom-sheet overlay (in-window, glass) — the shared dialog primitive
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
  // The sheet is an in-window overlay (NOT an RN Modal): a Modal is a separate
  // Android window where the BlurView cannot sample the app photo (blur target).
  // Whether the main window is resized by the keyboard is device dependent, so
  // the lift uses the measured keyboard height as before.
  const keyboardHeight = useKeyboardHeight();
  const { height: windowHeight } = useWindowDimensions();
  // The overlay is hosted inside the calling screen, which may end above the
  // window bottom (tab bar): lift only by the part of the keyboard that really
  // overlaps the overlay (overlay bottom edge vs. keyboard top edge).
  const slide = useRef(new Animated.Value(0)).current;
  const overlayRef = useRef<View>(null);
  const [overlayBottom, setOverlayBottom] = useState(windowHeight);
  useEffect(() => {
    if (!visible || keyboardHeight === 0) return;
    overlayRef.current?.measureInWindow((_x, y, _w, h) => {
      if (h > 0) setOverlayBottom(y + h);
    });
  }, [visible, keyboardHeight]);
  const keyboardTop = Dimensions.get("screen").height - keyboardHeight;
  const androidLift =
    Platform.OS === "android"
      ? Math.max(0, Math.round(overlayBottom - keyboardTop))
      : 0;

  useEffect(() => {
    if (!visible) return undefined;
    slide.setValue(0);
    Animated.timing(slide, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose, slide]);

  const host = useContext(SheetHostContext);
  const hostId = useId();

  // Dynamic (keyboard/window dependent) values: legitimately inline.
  const liftStyle = { paddingBottom: androidLift };
  const surfaceStyle = {
    maxHeight: sheetMaxHeight(windowHeight, androidLift, SHEET_TOP_MARGIN),
  };
  const slideStyle = {
    transform: [
      {
        translateY: slide.interpolate({
          inputRange: [0, 1],
          outputRange: [windowHeight, 0],
        }),
      },
    ],
  };
  const overlay = !visible ? null : (
    <View
      ref={overlayRef}
      testID="sheet-overlay"
      style={styles.overlay}
      pointerEvents="box-none"
    >
      <KeyboardAvoidingView
        testID="sheet-keyboard-avoiding-view"
        behavior={modalKeyboardAvoidingBehavior(Platform.OS)}
        className="flex-1"
        style={liftStyle}
      >
        <Pressable
          testID="sheet-backdrop"
          onPress={onClose}
          className={
            isSmallScreen
              ? "flex-1 justify-end bg-black/60"
              : "flex-1 justify-end bg-black/40"
          }
        >
          <Animated.View style={slideStyle}>
            <GlassBlur
              testID="sheet-surface"
              style={surfaceStyle}
              className="rounded-t-xl border-t border-glass-border"
              fallbackClassName={GLASS_PANEL_FALLBACK_FILL}
              blurClassName={GLASS_PANEL_BLUR_FILL}
              onPress={() => {
                // Swallow the tap so it doesn't bubble to the backdrop.
              }}
            >
              <SafeAreaView
                edges={androidLift > 0 ? [] : ["bottom"]}
                testID="sheet-safe-area"
                className="shrink"
              >
                {title ? (
                  <View className="flex-row items-center justify-between border-b border-glass-border px-4 py-3">
                    <Text className="font-display text-lg text-text-primary">
                      {title}
                    </Text>
                    <Button
                      testID="sheet-close-button"
                      variant="ghost"
                      iconOnly
                      onPress={onClose}
                      accessibilityLabel="Schließen"
                    >
                      <Icon name="close" color={BUTTON_ICON_COLORS.ghost} />
                    </Button>
                  </View>
                ) : null}
                <ScrollView
                  testID="sheet-scroll"
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerClassName="p-4"
                >
                  {children}
                </ScrollView>
              </SafeAreaView>
            </GlassBlur>
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );

  useEffect(() => {
    host?.set(hostId, overlay);
  });
  useEffect(() => () => host?.set(hostId, null), [host, hostId]);

  return host ? null : overlay;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 1000, elevation: 1000 },
});
