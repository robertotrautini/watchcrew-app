import { useQuery } from "@tanstack/react-query";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { searchCompany } from "@/lib/tmdbProxy";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Studio mode debounce (M7 part 2). Not specified in the source doc (only
 * Film=350ms, Regisseur/Besetzung=250ms were given) -- resolved interim
 * decision: 300ms (between the two given values), logged in
 * docs/interim-decisions.md.
 */
export const COMPANY_SEARCH_DEBOUNCE_MS = 300;

/**
 * Add-Movie-Modal Studio mode (M7 part 2): debounced production-company
 * autocomplete via the `search_company` tmdb-proxy action (already scored
 * server-side by fuzzy+prefix+logo bonus, M6 — see
 * `scoreCompanyMatch` in supabase/functions/tmdb-proxy/tmdb-client.ts).
 */
export function useCompanySearch(query: string) {
  const debouncedQuery = useDebouncedValue(query, COMPANY_SEARCH_DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();

  return useQuery({
    queryKey: queryKeys.companySearch(trimmedQuery),
    queryFn: async () => {
      const { data, error } = await searchCompany(trimmedQuery);
      if (error) {
        throw error;
      }
      return data;
    },
    enabled: trimmedQuery.length > 0,
  });
}
