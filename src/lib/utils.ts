import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges className fragments (conditionals via clsx, then Tailwind conflict
 * resolution via tailwind-merge) — the standard shadcn/ui-style `cn()`
 * utility, used by RN Reusables-pattern components so callers can override
 * a component's default classes via a `className` prop without duplicate/
 * conflicting Tailwind utilities surviving in the final string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
