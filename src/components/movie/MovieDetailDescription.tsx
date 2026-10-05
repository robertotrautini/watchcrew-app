import { useState } from "react";
import {
  Pressable,
  Text,
  View,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from "react-native";

import { shouldShowMoreToggle } from "@/lib/movieDetailLogic";

const MAX_COLLAPSED_LINES = 3;
const TEXT_CLASSNAME = "text-text-secondary";

/**
 * Movie overview text with a standard RN two-pass measurement "Mehr
 * anzeigen"/"Weniger anzeigen" toggle: an invisible full-height measurement
 * Text (no `numberOfLines`) reports the real line count via `onTextLayout`,
 * and the toggle only appears once that count exceeds the 3-line cap.
 *
 * Off-screen measurement technique: the measurement Text lives in an
 * `absolute h-0 w-full overflow-hidden` wrapper, so it never affects layout
 * and has no hit area. (Plain `absolute` + `pointerEvents="none"` on the Text
 * let it swallow taps on the director/cast rows on Android.)
 */
export interface MovieDetailDescriptionProps {
  overview: string | null;
}

export function MovieDetailDescription({
  overview,
}: MovieDetailDescriptionProps) {
  const [measuredLineCount, setMeasuredLineCount] = useState(0);
  const [expanded, setExpanded] = useState(false);

  if (overview == null) {
    return null;
  }

  const showToggle = shouldShowMoreToggle(
    measuredLineCount,
    MAX_COLLAPSED_LINES,
  );

  function handleMeasureLayout(
    event: NativeSyntheticEvent<TextLayoutEventData>,
  ) {
    setMeasuredLineCount(event.nativeEvent.lines.length);
  }

  return (
    <>
      <View
        testID="movie-detail-description-measure-wrapper"
        className="absolute h-0 w-full overflow-hidden"
      >
        <Text
          testID="movie-detail-description-measure"
          className={`opacity-0 ${TEXT_CLASSNAME}`}
          onTextLayout={handleMeasureLayout}
        >
          {overview}
        </Text>
      </View>

      <Text
        testID="movie-detail-description-text"
        className={TEXT_CLASSNAME}
        numberOfLines={expanded ? undefined : MAX_COLLAPSED_LINES}
      >
        {overview}
      </Text>

      {showToggle ? (
        <Pressable
          testID="movie-detail-description-toggle"
          accessibilityRole="button"
          className="min-h-touch-comfortable justify-center"
          onPress={() => setExpanded((prev) => !prev)}
        >
          <Text className="text-accent">
            {expanded ? "Weniger anzeigen" : "Mehr anzeigen"}
          </Text>
        </Pressable>
      ) : null}
    </>
  );
}
