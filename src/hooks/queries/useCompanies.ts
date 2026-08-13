import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCompanies } from "@/api/auxiliary.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

/**
 * Hook for fetching and caching user companies/prestadoras list via TanStack Query.
 * Stale time: 10 minutes.
 */
export function useCompanies(userId?: string) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient if rendered outside QueryClientProvider
  }

  return useQuery(
    {
      queryKey: queryKeys.auxiliary("companies"),
      queryFn: () => getCompanies(userId),
      staleTime: 1000 * 60 * 10,
    },
    client
  );
}

export default useCompanies;
