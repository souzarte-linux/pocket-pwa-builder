import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFinancialGoals, type FinancialGoals } from "@/api/financialGoals.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

/**
 * Hook to retrieve financial goals for a user.
 * Stale time: 5 minutes.
 */
export function useFinancialGoals(userId?: string | null) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback
  }

  return useQuery(
    {
      queryKey: queryKeys.financialGoals(userId),
      queryFn: () => getFinancialGoals(userId),
      staleTime: 1000 * 60 * 5,
    },
    client
  );
}

export type { FinancialGoals };
export default useFinancialGoals;
