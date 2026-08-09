import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createBillingCycle,
  updateBillingCycle,
  deleteBillingCycle,
  type BillingCycleInsert,
  type BillingCycleUpdate,
} from "@/api/billing.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

/**
 * Mutation hook for billing cycles and invoices with automatic cache invalidation.
 */
export function useBillingCycleMutations() {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // Uses defaultQueryClient if rendered outside QueryClientProvider
  }

  const invalidateBillingQueries = () => {
    client.invalidateQueries({ queryKey: ["billing_cycles"] });
  };

  const createMutation = useMutation(
    {
      mutationFn: (payload: BillingCycleInsert) => createBillingCycle(payload),
      onSuccess: () => {
        invalidateBillingQueries();
      },
    },
    client
  );

  const updateMutation = useMutation(
    {
      mutationFn: ({ id, payload }: { id: string; payload: BillingCycleUpdate }) =>
        updateBillingCycle(id, payload),
      onSuccess: (_data, variables) => {
        invalidateBillingQueries();
        client.invalidateQueries({ queryKey: queryKeys.billingCycleDetail(variables.id) });
      },
    },
    client
  );

  const deleteMutation = useMutation(
    {
      mutationFn: (id: string) => deleteBillingCycle(id),
      onSuccess: () => {
        invalidateBillingQueries();
      },
    },
    client
  );

  return {
    createBillingCycle: createMutation.mutateAsync,
    updateBillingCycle: updateMutation.mutateAsync,
    deleteBillingCycle: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export default useBillingCycleMutations;
