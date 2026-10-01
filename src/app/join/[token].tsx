import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { Button } from "@/components/ui/Button";
import { isInvalidInviteTokenError, joinWatchGroupByToken } from "@/lib/groups";
import { extractInviteToken } from "@/lib/inviteToken";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { usePendingInviteStore } from "@/stores/usePendingInviteStore";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

const INVALID_INVITE_TOKEN_MESSAGE = "Ungültiger oder deaktivierter Einladungscode.";

/**
 * Deep-link target for `watchcrew://join/<invite_token>` (invite link built in
 * group-settings.tsx).
 *   - logged out: store the token (usePendingInviteStore) and hand over to
 *     the root gate ("/") -> login/registration; index.tsx resumes this route
 *     once the user is signed in.
 *   - logged in: redeem via the idempotent join RPC (already a member is
 *     fine), make the joined group the active one, then "/" lets the gate
 *     pick the home tab.
 */
export default function JoinTokenScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const rawToken = Array.isArray(params.token) ? params.token[0] : params.token;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const token = extractInviteToken(rawToken ?? "");
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!data.session) {
        if (token) {
          usePendingInviteStore.getState().setToken(token);
        }
        router.replace("/");
        return;
      }

      usePendingInviteStore.getState().setToken(null);
      if (!token) {
        setError(INVALID_INVITE_TOKEN_MESSAGE);
        return;
      }

      const { data: joined, error: joinError } = await joinWatchGroupByToken(token);
      if (cancelled) return;

      if (joinError || !joined) {
        setError(
          isInvalidInviteTokenError(joinError)
            ? INVALID_INVITE_TOKEN_MESSAGE
            : `Beitritt fehlgeschlagen: ${joinError?.message ?? "Unbekannter Fehler"}`,
        );
        return;
      }

      usePreferencesStore.getState().setActiveGroupId(joined.groupId);
      await queryClient.invalidateQueries({ queryKey: ["userGroups"] });
      router.replace("/");
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [rawToken]);

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      className="flex-1 items-center justify-center gap-4 bg-bg-primary px-6"
      testID="join-token-screen">
      {error ? (
        <>
          <Text testID="join-token-error" className="text-center text-danger">
            {error}
          </Text>
          <Button testID="join-token-continue" label="Weiter" onPress={() => router.replace("/")} />
        </>
      ) : (
        <ActivityIndicator testID="join-token-loading" />
      )}
    </SafeAreaView>
  );
}
