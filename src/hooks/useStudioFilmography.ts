import { useInfiniteQuery } from "@tanstack/react-query";

import { getStudioMovies, type TmdbStudioMoviesResponse } from "@/lib/tmdbProxy";

// Paginated via TanStack Query's `useInfiniteQuery` (chosen over manual page
// state) — studio filmographies can be arbitrarily large (TMDB paginates
// `discover`-style company results), and `useInfiniteQuery` gives the
// consuming screen `fetchNextPage`/`hasNextPage`/`isFetchingNextPage` for
// free instead of hand-rolling page-number state + refetch plumbing.
export function useStudioFilmography(companyId: number | undefined) {
  return useInfiniteQuery({
    queryKey: ["studioFilmography", companyId],
    queryFn: async ({ pageParam }) => {
      const { data, error } = await getStudioMovies(companyId as number, pageParam);
      if (error) {
        throw error;
      }
      return data as TmdbStudioMoviesResponse;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    enabled: !!companyId,
  });
}
