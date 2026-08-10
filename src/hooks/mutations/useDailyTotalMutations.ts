import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createDailyTotal,
  updateDailyTotal,
  deleteDailyTotal,
} from "@/api/dailyTotals.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

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
