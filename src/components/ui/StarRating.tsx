import { Pressable, View, type GestureResponderEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

/**
 * Business rules (docs/feature-inventory.md §4.5 "Star rating", verbatim):
 *   0–5 range, DECIMAL(2,1), half-star precision, NULL/0 = no rating.
 *
 * Like-heart color rule (feature-inventory §6 bugfix history): the "Mag ich"
 * heart is per-person and its color is FIXED regardless of the active
 * group's color theme — unlike the star fill color, which DOES follow the
 * active group theme's `star-color` token.
 *
 * Design decision (documented per project's "no silent defaults" rule):
 * this component is presentational and takes an already-resolved
 * `starColor` string rather than resolving a group theme itself via
 * `resolveGroupTheme` (src/lib/groupTheme.ts). Rationale: keeps StarRating
 * decoupled from where/how a "current group theme" is determined (a screen
 * concern), and easier to unit-test (no theme-provider/context wiring
 * needed to exercise every color case). The caller is expected to resolve
 * the theme (e.g. via GroupThemeProvider/resolveGroupTheme) and pass
 * `colors.starColor` down.
 */

const STAR_COUNT = 5;

/** Fixed regardless of theme — the spec value for an un-filled star portion. */
const STAR_EMPTY_COLOR = "#575757";

/** Fixed regardless of theme — the spec value for the "Mag ich" like-heart. */
const LIKE_HEART_COLOR = "#e05c6e";

/**
 * Touch-target sizing: a default-size star/heart glyph renders well under the
 * ~44-48px minimum recommended mobile touch target, so each star/heart is
 * wrapped in a fixed-size touchable box (via the project's existing
 * `touch-comfortable` NativeWind spacing token, tailwind.config.js — 48px,
 * the larger/safer end of the commonly-cited 44-48px range) and the glyph is
 * centered inside it, rather than sizing the glyph itself up to match (which
 * would look wrong visually). This numeric constant mirrors that token's
 * value and is used only for the half/full tap-position math below, not for
 * any styling (styling uses the `w-touch-comfortable h-touch-comfortable`
 * className, per project convention of className-only layout styling).
 */
const TOUCH_TARGET_PX = 48;
const STAR_ICON_SIZE = 28;
const HEART_ICON_SIZE = 26;

type StarState = "full" | "half" | "empty";

function getStarState(rating: number, starIndex: number): StarState {
  const filledAmount = Math.max(0, Math.min(1, rating - starIndex));
  if (filledAmount >= 1) return "full";
  if (filledAmount >= 0.5) return "half";
  return "empty";
}

function starIconName(state: StarState): "star" | "star-half" | "star-outline" {
  if (state === "full") return "star";
  if (state === "half") return "star-half";
  return "star-outline";
}

export interface StarRatingProps {
  /** 0-5, 0.5 increments. `null` or `0` both mean "no rating" per spec. */
  rating: number | null;
  /** The resolved, theme-following color to use for filled star portions (see module doc). */
  starColor: string;
  /** Provide to make the widget editable (tap to rate). Omit for read-only display. */
  onChange?: (rating: number) => void;
  /** Whether the current person has "liked" this rating. Omit both this and `onToggleLike` to hide the heart entirely. */
  liked?: boolean;
  /** Provide to render the like-heart and make it tappable. Omit to hide the heart entirely. */
  onToggleLike?: () => void;
}

export function StarRating({ rating, starColor, onChange, liked, onToggleLike }: StarRatingProps) {
  const effectiveRating = rating ?? 0;
  const isEditable = Boolean(onChange);
  const showHeart = Boolean(onToggleLike);

  function handleStarPress(starIndex: number, event: GestureResponderEvent) {
    if (!onChange) return;
    const locationX = event.nativeEvent.locationX;
    const isLeftHalf = locationX < TOUCH_TARGET_PX / 2;
    const newRating = starIndex + (isLeftHalf ? 0.5 : 1);
    // M11 (haptic polish, see docs/interim-decisions.md "M11 — Haptik"):
    // a light impact per star tap -- this is one of the app's most
    // frequent, most "physical" interactions, so a subtle tactile
    // confirmation is worth it. `expo-haptics` already no-ops gracefully
    // on hardware/platforms without haptic support, so no extra try/catch.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(newRating);
  }

  function handleHeartPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleLike?.();
  }

  return (
    <View className="flex-row items-center">
      {Array.from({ length: STAR_COUNT }, (_, starIndex) => {
        const state = getStarState(effectiveRating, starIndex);
        const color = state === "empty" ? STAR_EMPTY_COLOR : starColor;
        const icon = (
          <Ionicons testID="star-rating-icon" name={starIconName(state)} size={STAR_ICON_SIZE} color={color} />
        );

        if (!isEditable) {
          return (
            <View
              key={starIndex}
              testID={`star-rating-touch-${starIndex}`}
              className="w-touch-comfortable h-touch-comfortable items-center justify-center"
            >
              {icon}
            </View>
          );
        }

        return (
          <Pressable
            key={starIndex}
            testID={`star-rating-touch-${starIndex}`}
            accessibilityRole="adjustable"
            className="w-touch-comfortable h-touch-comfortable items-center justify-center"
            onPress={(event) => handleStarPress(starIndex, event)}
          >
            {icon}
          </Pressable>
        );
      })}

      {showHeart ? (
        <Pressable
          testID="star-rating-heart-touch"
          accessibilityRole="button"
          className="w-touch-comfortable h-touch-comfortable items-center justify-center"
          onPress={handleHeartPress}
        >
          <Ionicons
            testID="star-rating-heart-icon"
            name={liked ? "heart" : "heart-outline"}
            size={HEART_ICON_SIZE}
            color={LIKE_HEART_COLOR}
          />
        </Pressable>
      ) : null}
    </View>
  );
}
