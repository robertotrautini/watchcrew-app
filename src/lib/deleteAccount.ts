import { supabase } from "./supabase";

/**
 * M10 Settings hub ("Konto löschen"): thin client-side wrapper around the
 * `delete-account` Edge Function (supabase/functions/delete-account/index.ts).
 * `supabase.functions.invoke` automatically forwards the current session's
 * JWT as the `Authorization` header — the function extracts the caller's
 * own id from THAT, never from anything this client sends, so there is no
 * request body to build here at all.
 *
 * Follows the same "never throw, always resolve { data, error }" convention
 * as src/lib/tmdbProxy.ts.
 */
export async function deleteOwnAccount(): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase.functions.invoke("delete-account", { body: {} });

  if (error) {
    const message =
      error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : String(error);
    return { error: { message } };
  }

  return { error: null };
}
