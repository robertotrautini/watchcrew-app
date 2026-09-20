import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ScreenOrientation from "expo-screen-orientation";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, View } from "react-native";
import { WebView } from "react-native-webview";

/**
 * Movie Detail Overlay (M6 part 2a): hero poster + inline/fullscreen
 * YouTube trailer player. Purely presentational — `isLoadingDetail` and
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Native-reasonable equivalent of the legacy web player's requestFullscreen() —
  // NOT a byte-for-byte port; RN has no DOM fullscreen API, so we simulate it
  // with a fullscreen Modal + forced landscape orientation.
  useEffect(() => {
    if (isFullscreen) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      return () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      };
    }
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    return undefined;
  }, [isFullscreen]);

  const showPlayButton = !isLoadingDetail && trailer != null && !isPlayingTrailer;
  const trailerUri = trailer != null ? `https://www.youtube.com/embed/${trailer.key}?playsinline=1` : "";

  return (
    <View testID="movie-detail-poster-trailer" className="relative aspect-video w-full">
      {isPlayingTrailer && !isFullscreen ? (
        <>
          <WebView
            testID="movie-detail-trailer-webview"
            source={{ uri: trailerUri }}
            className="h-full w-full"
          />
          <Pressable
            testID="movie-detail-trailer-fullscreen-button"
            accessibilityRole="button"
            onPress={() => setIsFullscreen(true)}
            className="absolute right-2 top-2 h-touch-min w-touch-min items-center justify-center"
          >
            <Ionicons name="expand" size={22} color={OVERLAY_ICON_COLOR} />
          </Pressable>
        </>
      ) : (
        <>
          {posterUrl ? (
            <Image
              testID="movie-detail-poster-image"
              source={{ uri: posterUrl }}
              accessibilityLabel={title}
              className="h-full w-full rounded-lg bg-card"
              contentFit="cover"
            />
          ) : (
            <View testID="movie-detail-poster-placeholder" className="h-full w-full rounded-lg bg-card" />
          )}

          {isLoadingDetail ? (
            <View className="absolute inset-0 items-center justify-center">
              <ActivityIndicator testID="movie-detail-poster-spinner" size="large" color={OVERLAY_ICON_COLOR} />
            </View>
          ) : showPlayButton ? (
            <Pressable
              testID="movie-detail-trailer-play-button"
              accessibilityRole="button"
              onPress={() => setIsPlayingTrailer(true)}
              className="absolute inset-0 items-center justify-center"
            >
              <Ionicons name="play-circle" size={64} color={OVERLAY_ICON_COLOR} />
            </Pressable>
          ) : null}
        </>
      )}

      {isFullscreen ? (
        <Modal
          testID="movie-detail-trailer-fullscreen-modal"
          visible={isFullscreen}
          animationType="fade"
          onRequestClose={() => setIsFullscreen(false)}
        >
          <View className="flex-1 bg-black">
            <WebView testID="movie-detail-trailer-webview" source={{ uri: trailerUri }} className="flex-1" />
            <Pressable
              testID="movie-detail-trailer-fullscreen-close-button"
              accessibilityRole="button"
              onPress={() => setIsFullscreen(false)}
              className="absolute right-4 top-4 h-touch-min w-touch-min items-center justify-center"
            >
              <Ionicons name="close" size={28} color={OVERLAY_ICON_COLOR} />
            </Pressable>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
