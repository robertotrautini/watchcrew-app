import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { mmkvStorage } from "@/lib/mmkvStorage";

/**
 * Invite token from a `watchcrew://join/<token>` deep link that could not be
 * redeemed yet because the user was logged out (or not registered yet).
 * Persisted (MMKV) so the join survives the auth flow, including an app
 * restart in between (e.g. email-confirmation during registration).
 * Consumed and cleared by `src/app/join/[token].tsx`; `src/app/index.tsx`
 * redirects there as soon as the auth gate says the user is signed in.
 */
interface PendingInviteState {
  token: string | null;
  setToken: (token: string | null) => void;
}

export const usePendingInviteStore = create<PendingInviteState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
    }),
    {
      name: "watchcrew-pending-invite",
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
