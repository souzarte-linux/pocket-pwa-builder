import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createBillingCycle,
  updateBillingCycle,
  deleteBillingCycle,
  linkCycleTransactions,
  unlinkCycleTransactions,
  autoGenerateBillingCycles,
  type BillingCycleInsert,
  type BillingCycleUpdate,
} from "@/api/billing.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

/**
 * Mutation hook for billing cycles and invoices with surgical cache invalidation across all financial queries.
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
    client.invalidateQueries({ queryKey: ["routes"] });
    client.invalidateQueries({ queryKey: ["daily_totals"] });
    client.invalidateQueries({ queryKey: ["financial_adjustments"] });
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

  const linkMutation = useMutation(
    {
      mutationFn: ({
        cycleId,
        platformId,
        periodStart,
        periodEnd,
      }: {
        cycleId: string;
        platformId: string;
        periodStart: string;
        periodEnd: string;
      }) => linkCycleTransactions(cycleId, platformId, periodStart, periodEnd),
      onSuccess: () => {
        invalidateBillingQueries();
      },
    },
    client
  );

  const unlinkMutation = useMutation(
    {
      mutationFn: (cycleId: string) => unlinkCycleTransactions(cycleId),
      onSuccess: () => {
        invalidateBillingQueries();
      },
    },
    client
  );

  const autoGenerateMutation = useMutation(
    {
      mutationFn: (userId: string) => autoGenerateBillingCycles(userId),
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
    linkCycleTransactions: linkMutation.mutateAsync,
    unlinkCycleTransactions: unlinkMutation.mutateAsync,
    autoGenerateBillingCycles: autoGenerateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export default useBillingCycleMutations;
