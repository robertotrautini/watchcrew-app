import { useEffect, useRef, type ComponentProps } from "react";
import { Keyboard, ScrollView, TextInput, type View } from "react-native";

import { KeyboardInsetView } from "@/components/ui/KeyboardInsetView";

/** Gap kept above the focused input after scrolling it into view. */
const INPUT_TOP_GAP = 120;

/**
 * ScrollView for form-like screens: shrinks above the keyboard (Android, via
 * KeyboardInsetView) and, when the keyboard opens, scrolls the focused
 * TextInput into view (Android does not do this reliably on its own once the
 * window is not resized). Taps on buttons keep working with the keyboard open.
 * Positions are compared in window coordinates (measureInWindow), which works
 * on the new architecture where node-handle based measureLayout does not.
 */
export function KeyboardAwareScrollView({ onScroll, ...props }: ComponentProps<typeof ScrollView>) {
  const ref = useRef<ScrollView>(null);
  const offsetY = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      // Wait one layout pass so the viewport already shrank.
      timer = setTimeout(() => {
        const input = TextInput.State.currentlyFocusedInput?.();
        const scroll = ref.current;
        if (!input || !scroll) return;
        (scroll as unknown as View).measureInWindow((_sx, scrollTop) => {
          input.measureInWindow((_ix, inputTop) => {
            const delta = inputTop - scrollTop - INPUT_TOP_GAP;
            scroll.scrollTo({ y: Math.max(0, offsetY.current + delta), animated: true });
          });
        });
      }, 150);
    });
    return () => {
      sub.remove();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <KeyboardInsetView>
      <ScrollView
        ref={ref}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={(e) => {
          offsetY.current = e.nativeEvent.contentOffset.y;
          onScroll?.(e);
        }}
        {...props}
      />
    </KeyboardInsetView>
  );
}
