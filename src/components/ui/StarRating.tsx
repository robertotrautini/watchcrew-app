import { Pressable, View, type GestureResponderEvent } from "react-native";
import { Icon, type IconSize } from "@/components/ui/Icon";
import * as Haptics from "expo-haptics";
import { STAR_TOUCH_WIDTH } from "@/components/ui/touchTarget";

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
 * Touch-target sizing (docs/style-guide.md "Touch-Targets"): each star/heart glyph sits centred
 * in a fixed touch box of STAR_TOUCH_WIDTH (44, iOS minimum) x 48 (`h-touch-comfortable`) dp, so
 * the glyph can stay visually small/tight. 44 wide so 5 stars + heart + reset fit a 360dp phone.
 * `TOUCH_TARGET_PX` is used for the half/full tap-position math below; the box className uses
 * the same value (`w-[44px]`).
 */
const TOUCH_TARGET_PX = STAR_TOUCH_WIDTH;
const STAR_ICON_SIZE: IconSize = "M";
const HEART_ICON_SIZE: IconSize = "M";

type StarState = "full" | "half" | "empty";

function getStarState(rating: number, starIndex: number): StarState {
  const filledAmount = Math.max(0, Math.min(1, rating - starIndex));
  if (filledAmount >= 1) return "full";
  if (filledAmount >= 0.5) return "half";
  return "empty";
}

function starIconRole(state: StarState): "star" | "starHalf" | "starEmpty" {
  if (state === "full") return "star";
  if (state === "half") return "starHalf";
  return "starEmpty";
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
  /** Glyph size token of the stars (default M); the heart uses the same. The touch box stays 48px. */
  iconSize?: IconSize;
  /** Read-only list rows: shrink the per-star box to 22px (instead of the 44x48 touch target). Use with a small `iconSize`. */
  compactBox?: boolean;
  /** Read-only rows with medium stars: 28px box (tight, balanced gap). Ignored when editable. */
  denseBox?: boolean;
}

export function StarRating({
  rating,
  starColor,
  onChange,
  liked,
  onToggleLike,
  iconSize,
  compactBox,
  denseBox,
}: StarRatingProps) {
  const editable = Boolean(onChange);
  const boxClassName = compactBox
    ? "h-[22px] w-[22px] items-center justify-center"
    : denseBox && !editable
      ? "h-7 w-7 items-center justify-center"
      : `h-touch-comfortable w-[${STAR_TOUCH_WIDTH}px] items-center justify-center`;
  const starSize = iconSize ?? STAR_ICON_SIZE;
  const heartSize = iconSize ?? HEART_ICON_SIZE;
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
          <Icon
            testID="star-rating-icon"
            name={starIconRole(state)}
            size={starSize}
            color={color}
          />
        );

        if (!isEditable) {
          return (
            <View
              key={starIndex}
              testID={`star-rating-touch-${starIndex}`}
              className={boxClassName}
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
            accessibilityLabel={
              starIndex === 0 ? "1 Stern" : `${starIndex + 1} Sterne`
            }
            className={boxClassName}
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
          accessibilityLabel="Mag ich"
          accessibilityState={{ checked: Boolean(liked) }}
          className={`h-touch-comfortable w-[${STAR_TOUCH_WIDTH}px] items-center justify-center`}
          onPress={handleHeartPress}
        >
          <Icon
            testID="star-rating-heart-icon"
            name={liked ? "heart" : "heartEmpty"}
            size={heartSize}
            color={LIKE_HEART_COLOR}
          />
        </Pressable>
      ) : null}
    </View>
  );
}
