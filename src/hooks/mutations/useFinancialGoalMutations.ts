import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateFinancialGoals, type FinancialGoals } from "@/api/financialGoals.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

/**
 * Hook for updating financial goals with automated surgical cache invalidations.
 */
export function useFinancialGoalMutations(userId?: string | null) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback
  }

  const invalidate = () => {
    client.invalidateQueries({ queryKey: queryKeys.financialGoals(userId) });
    client.invalidateQueries({ queryKey: ["financial_goals"] });
    if (userId) {
      client.invalidateQueries({ queryKey: queryKeys.profile(userId) });
    }
  };

  const updateMutation = useMutation(
    {
      mutationFn: ({ userId: uid, goals }: { userId: string; goals: Partial<FinancialGoals> }) =>
        updateFinancialGoals(uid, goals),
      onSuccess: invalidate,
    },
    client
  );

  return {
    updateGoals: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}

export default useFinancialGoalMutations;
