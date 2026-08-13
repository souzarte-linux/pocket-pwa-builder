import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCardBrandOperators } from "@/api/cardBrandOperators.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

/**
 * Hook to query and cache card brand <-> operator relations for a user.
 * Stale time: 10 minutes.
 */
export function useCardBrandOperators(userId?: string) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback
  }

  return useQuery(
    {
      queryKey: queryKeys.cardBrandOperators(userId),
      queryFn: () => getCardBrandOperators(userId),
      staleTime: 1000 * 60 * 10,
    },
    client
  );
}

export default useCardBrandOperators;
