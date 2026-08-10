import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFinancialAdjustments, type GetFinancialAdjustmentsParams } from "@/api/adjustments.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

export * from "@/hooks/mutations/useFinancialAdjustmentMutations";

/**
 * Hook to retrieve financial adjustments (bonuses, deductions) with optional filters.
 * Stale time: 30 seconds.
 */
export function useFinancialAdjustments(params?: GetFinancialAdjustmentsParams) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useQuery(
    {
      queryKey: queryKeys.financialAdjustments(params),
      queryFn: () => getFinancialAdjustments(params),
      staleTime: 1000 * 30,
    },
    client
  );
}

export default useFinancialAdjustments;
