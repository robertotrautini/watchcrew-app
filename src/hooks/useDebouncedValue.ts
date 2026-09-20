import { useEffect, useState } from "react";

/**
 * Generic debounce hook (M7 part 2, Add-Movie-Modal): returns `value`, but
 * only after it has stayed unchanged for `delayMs`. Every intermediate
 * change resets the timer, so only the final value after a pause is ever
 * committed — the standard debounce shape needed by the three Add-Movie
 * search modes (Film: 350ms, Regisseur/Besetzung: 250ms, Studio: 300ms —
 * see docs/interim-decisions.md for the Studio timing's interim-decision
 * rationale). Kept generic/standalone rather than baked into each search
 * hook, so the three differing delays are just a call-site argument, not
 * three near-duplicate hook implementations.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debounced;
}
