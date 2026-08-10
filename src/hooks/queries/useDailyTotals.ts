import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDailyTotals, type GetDailyTotalsParams } from "@/api/dailyTotals.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

export { useDailyTotalMutations } from "@/hooks/mutations/useDailyTotalMutations";

/**
 * Hook to retrieve daily_totals with optional filters.
 * Stale time: 30 seconds.
 */
export function useDailyTotals(params?: GetDailyTotalsParams) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useQuery(
    {
      queryKey: queryKeys.dailyTotals(params),
      queryFn: () => getDailyTotals(params),
      staleTime: 1000 * 30,
    },
    client
  );
}
