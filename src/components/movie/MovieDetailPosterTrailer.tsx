import { Icon } from "@/components/ui/Icon";
import { Image } from "@/components/ui/Image";
import * as ScreenOrientation from "expo-screen-orientation";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { WebView } from "react-native-webview";

import {
  TRAILER_FULLSCREEN_ENTER,
  TRAILER_FULLSCREEN_EXIT,
  buildTrailerWebViewProps,
} from "@/lib/trailerEmbed";

/**
 * Movie Detail Overlay (M6 part 2a): hero poster + inline YouTube
 * trailer player (the standard embedded player with its own controls and
 * fullscreen button; `allowsFullscreenVideo` comes from `buildTrailerWebViewProps`). Purely presentational — `isLoadingDetail` and
 * `trailer` are already resolved upstream by `useMovieDetail(...)`.
 *
 * Poster rendering matches the convention already used by
 * `DiaryPosterTile.tsx` (`expo-image`'s `Image`, raw complete URL, no
 * prefixing) rather than duplicating URL-building logic here.
 */

export interface MovieDetailTrailer {
  id: string;
  key: string;
  site: string;
  type: string;
  name?: string;
}

export interface MovieDetailPosterTrailerProps {
  posterUrl: string | null;
  /** Used for accessibilityLabel / alt text on the poster image. */
  title: string;
  /** True while the useMovieDetail(...) query is loading. */
  isLoadingDetail: boolean;
  trailer: MovieDetailTrailer | null;
}

const OVERLAY_ICON_COLOR = "#ffffff";

export function MovieDetailPosterTrailer({
  posterUrl,
  title,
  isLoadingDetail,
  trailer,
}: MovieDetailPosterTrailerProps) {
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);

  // App is portrait-locked: force landscape only while the YouTube player is
  // fullscreen, lock back to portrait on exit / unmount.
  useEffect(
    () => () => {
      void ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      ).catch(() => {});
    },
    [],
  );
  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    const data = event.nativeEvent.data;
    if (data === TRAILER_FULLSCREEN_ENTER) {
      void ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE,
      ).catch(() => {});
    } else if (data === TRAILER_FULLSCREEN_EXIT) {
      void ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      ).catch(() => {});
    }
  };

  const showPlayButton =
    !isLoadingDetail && trailer != null && !isPlayingTrailer;
  const webViewProps =
    trailer != null ? buildTrailerWebViewProps(trailer.key) : null;

  return (
    <View
      testID="movie-detail-poster-trailer"
      className={
        isPlayingTrailer
          ? "relative aspect-video w-full"
          : "relative aspect-[2/3] w-[55%] max-w-[260px] self-center overflow-hidden rounded-lg border border-glass-border"
      }
    >
      {isPlayingTrailer ? (
        <>
          <WebView
            testID="movie-detail-trailer-webview"
            {...webViewProps}
            onMessage={handleWebViewMessage}
            className="h-full w-full"
          />
          <Pressable
            testID="movie-detail-trailer-close-button"
            accessibilityRole="button"
            accessibilityLabel="Schließen"
            onPress={() => setIsPlayingTrailer(false)}
            className="absolute left-1 top-1 h-12 w-12 items-center justify-center"
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-black/55">
              <Icon name="close" size="M" color={OVERLAY_ICON_COLOR} />
            </View>
          </Pressable>
        </>
      ) : (
        <>
          {posterUrl ? (
            <Image
              testID="movie-detail-poster-image"
              source={{ uri: posterUrl }}
              accessibilityLabel={title}
              className="h-full w-full bg-card"
              contentFit="cover"
            />
          ) : (
            <View
              testID="movie-detail-poster-placeholder"
              className="h-full w-full bg-card"
            />
          )}

          {isLoadingDetail ? (
            <View className="absolute inset-0 items-center justify-center">
              <ActivityIndicator
                testID="movie-detail-poster-spinner"
                size="large"
                color={OVERLAY_ICON_COLOR}
              />
            </View>
          ) : showPlayButton ? (
            <Pressable
              testID="movie-detail-trailer-play-button"
              accessibilityRole="button"
              onPress={() => setIsPlayingTrailer(true)}
              className="absolute inset-0 items-center justify-center"
            >
              <View className="h-14 w-14 items-center justify-center rounded-full bg-black/55">
                <Icon name="play" size="M" color={OVERLAY_ICON_COLOR} />
              </View>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}
