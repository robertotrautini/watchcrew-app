import { supabase } from "./supabase";

// M10 (part): thin, typed wrappers around the `push_tokens`/`push_subscriptions`
// writes needed by src/hooks/usePushRegistration.ts and
// src/hooks/useGroupPushSubscription.ts. Same "never throw, always return
// the underlying Supabase `{ data, error }` result unchanged" convention as
// src/lib/groups.ts/watchlist.ts.

export interface UpsertPushTokenParams {
  userId: string;
  expoPushToken: string;
}

/**
 * Registers (or refreshes) this device's Expo push token for `userId`.
 * A real UPSERT keyed on the table's own `(user_id, expo_push_token)`
 * primary key -- a user can have multiple tokens (multiple devices), so this
 * never removes any of the user's OTHER tokens, it only inserts-or-refreshes
 * this one. `updated_at` is set explicitly (client-supplied timestamp, same
 * convention as the TMDB proxy's cache-aside `last_fetched_at` writes)
 * rather than relying on the column default, which only applies on a fresh
 * INSERT, not on the UPDATE branch of an upsert.
 */
export async function upsertPushToken(params: UpsertPushTokenParams) {
  return supabase.from("push_tokens").upsert(
    {
      user_id: params.userId,
      expo_push_token: params.expoPushToken,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,expo_push_token" },
  );
}

export interface GroupPushSubscriptionParams {
  userId: string;
  groupId: string;
}

/** Per-group push opt-in (requirement 1: per-group, not global). RLS additionally requires the caller to be a member of `groupId` -- see the M10 migration. */
export async function subscribeToGroupPush(params: GroupPushSubscriptionParams) {
  return supabase
    .from("push_subscriptions")
    .insert({ user_id: params.userId, group_id: params.groupId });
}

export async function unsubscribeFromGroupPush(params: GroupPushSubscriptionParams) {
  return supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", params.userId)
    .eq("group_id", params.groupId);
}

/** `data` is the subscription row (truthy) or `null` (not subscribed) -- never throws on the common "not subscribed yet" case, that's just an empty result, not an error. */
export async function getGroupPushSubscription(params: GroupPushSubscriptionParams) {
  return supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", params.userId)
    .eq("group_id", params.groupId)
    .maybeSingle();
}
