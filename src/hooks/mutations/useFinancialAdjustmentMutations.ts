import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createFinancialAdjustment,
  createFinancialAdjustmentsBatch,
  updateFinancialAdjustment,
  deleteFinancialAdjustment,
  deleteCycleAdjustmentsByType,
  type FinancialAdjustmentInsert,
  type FinancialAdjustmentUpdate,
} from "@/api/adjustments.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

/**
 * Hook providing financial adjustment mutations with surgical cache invalidation.
 */
export function useFinancialAdjustmentMutations() {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  const invalidate = () => {
    client.invalidateQueries({ queryKey: ["financial_adjustments"] });
    client.invalidateQueries({ queryKey: ["billing_cycles"] });
  };

  const createMutation = useMutation(
    {
      mutationFn: (payload: FinancialAdjustmentInsert) => createFinancialAdjustment(payload),
      onSuccess: invalidate,
    },
    client
  );

  const createBatchMutation = useMutation(
    {
      mutationFn: (payloads: FinancialAdjustmentInsert[]) =>
        createFinancialAdjustmentsBatch(payloads),
      onSuccess: invalidate,
    },
    client
  );

  const updateMutation = useMutation(
    {
      mutationFn: ({ id, payload }: { id: string; payload: FinancialAdjustmentUpdate }) =>
        updateFinancialAdjustment(id, payload),
      onSuccess: invalidate,
    },
    client
  );

  const deleteMutation = useMutation(
    {
      mutationFn: (id: string) => deleteFinancialAdjustment(id),
      onSuccess: invalidate,
    },
    client
  );

  const deleteCycleByTypeMutation = useMutation(
    {
      mutationFn: ({ cycleId, types }: { cycleId: string; types: string[] }) =>
        deleteCycleAdjustmentsByType(cycleId, types),
      onSuccess: invalidate,
    },
    client
  );

  return {
    createAdjustment: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createAdjustmentsBatch: createBatchMutation.mutateAsync,
    isCreatingBatch: createBatchMutation.isPending,
    updateAdjustment: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteAdjustment: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteCycleAdjustmentsByType: deleteCycleByTypeMutation.mutateAsync,
    isDeletingCycleByType: deleteCycleByTypeMutation.isPending,
  };
}

export default useFinancialAdjustmentMutations;
