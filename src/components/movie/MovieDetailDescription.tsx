import { useState } from "react";
import { Pressable, Text, type NativeSyntheticEvent, type TextLayoutEventData } from "react-native";

import { shouldShowMoreToggle } from "@/lib/movieDetailLogic";

const MAX_COLLAPSED_LINES = 3;
const TEXT_CLASSNAME = "text-text-secondary";

/**
 * Movie overview text with a standard RN two-pass measurement "Mehr
 * anzeigen"/"Weniger anzeigen" toggle: an invisible full-height measurement
 * Text (no `numberOfLines`) reports the real line count via `onTextLayout`,
 * and the toggle only appears once that count exceeds the 3-line cap.
 *
 * Off-screen measurement technique: `className="absolute opacity-0"` (tried
 * first, per the task brief) — this works fine here since `absolute`
 * removes the node from layout flow entirely, so it never affects the
 * visible text's position/size. No inline `style` fallback was needed.
 */
export interface MovieDetailDescriptionProps {
  overview: string | null;
}

export function MovieDetailDescription({ overview }: MovieDetailDescriptionProps) {
  const [measuredLineCount, setMeasuredLineCount] = useState(0);
  const [expanded, setExpanded] = useState(false);

  if (overview == null) {
    return null;
  }

  const showToggle = shouldShowMoreToggle(measuredLineCount, MAX_COLLAPSED_LINES);

  function handleMeasureLayout(event: NativeSyntheticEvent<TextLayoutEventData>) {
    setMeasuredLineCount(event.nativeEvent.lines.length);
  }

  return (
    <>
      <Text
        testID="movie-detail-description-measure"
        pointerEvents="none"
        className={`absolute opacity-0 ${TEXT_CLASSNAME}`}
        onTextLayout={handleMeasureLayout}
      >
        {overview}
      </Text>

      <Text
        testID="movie-detail-description-text"
        className={TEXT_CLASSNAME}
        numberOfLines={expanded ? undefined : MAX_COLLAPSED_LINES}
      >
        {overview}
      </Text>

      {showToggle ? (
        <Pressable testID="movie-detail-description-toggle" onPress={() => setExpanded((prev) => !prev)}>
          <Text className="text-accent">{expanded ? "Weniger anzeigen" : "Mehr anzeigen"}</Text>
        </Pressable>
      ) : null}
    </>
  );
}
