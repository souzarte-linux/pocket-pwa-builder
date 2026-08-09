import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDailyTotals,
  createDailyTotal,
  updateDailyTotal,
  deleteDailyTotal,
  type GetDailyTotalsParams,
} from "@/api/dailyTotals.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

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

/**
 * Hook providing daily_total mutations with surgical cache invalidation.
 */
export function useDailyTotalMutations() {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  const invalidate = () => {
    client.invalidateQueries({ queryKey: queryKeys.dailyTotals() });
  };

  const createMutation = useMutation(
    {
      mutationFn: (payload: TablesInsert<"daily_totals">) => createDailyTotal(payload),
      onSuccess: invalidate,
    },
    client
  );

  const updateMutation = useMutation(
    {
      mutationFn: ({ id, payload }: { id: string; payload: TablesUpdate<"daily_totals"> }) =>
        updateDailyTotal(id, payload),
      onSuccess: invalidate,
    },
    client
  );

  const deleteMutation = useMutation(
    {
      mutationFn: (id: string) => deleteDailyTotal(id),
      onSuccess: invalidate,
    },
    client
  );

  return {
    createDailyTotal: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateDailyTotal: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteDailyTotal: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
