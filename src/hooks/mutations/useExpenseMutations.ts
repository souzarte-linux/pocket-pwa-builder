import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createExpense,
  updateExpense,
  deleteExpense,
  deleteInstallmentGroup,
  deleteFutureInstallments,
  upsertPartMaintenance,
} from "@/api/expenses.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

/**
 * Hook providing expense mutations with surgical cache invalidation.
 * Invalidates: expenses, odometer (when km is written), maintenance.parts (when category=manutencao).
 */
export function useExpenseMutations() {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  const invalidateExpenses = (category?: string | null) => {
    client.invalidateQueries({ queryKey: queryKeys.expenses() });
    client.invalidateQueries({ queryKey: queryKeys.dailyTotals() });
    // Odometer depends on expense odometer_km for maintenance/fuel categories
    if (category === "combustivel" || category === "manutencao") {
      client.invalidateQueries({ queryKey: queryKeys.odometer.current() });
    }
    if (category === "manutencao") {
      client.invalidateQueries({ queryKey: queryKeys.maintenance.parts() });
    }
  };

  const createMutation = useMutation(
    {
      mutationFn: ({
        payload,
      }: {
        payload: TablesInsert<"expenses"> | TablesInsert<"expenses">[];
        category?: string | null;
      }) => createExpense(payload),
      onSuccess: (_, variables) => {
        invalidateExpenses(variables.category);
      },
    },
    client
  );

  const updateMutation = useMutation(
    {
      mutationFn: ({
        id,
        payload,
      }: {
        id: string;
        payload: TablesUpdate<"expenses">;
        category?: string | null;
      }) => updateExpense(id, payload),
      onSuccess: (_, variables) => {
        client.invalidateQueries({ queryKey: ["expenses", "detail", variables.id] });
        invalidateExpenses(variables.category);
      },
    },
    client
  );

  const deleteMutation = useMutation(
    {
      mutationFn: ({ id }: { id: string; category?: string | null }) => deleteExpense(id),
      onSuccess: (_, variables) => {
        client.invalidateQueries({ queryKey: ["expenses", "detail", variables.id] });
        invalidateExpenses(variables.category);
      },
    },
    client
  );

  const deleteGroupMutation = useMutation(
    {
      mutationFn: ({
        installmentGroupId,
      }: {
        installmentGroupId: string;
        category?: string | null;
      }) => deleteInstallmentGroup(installmentGroupId),
      onSuccess: (_, variables) => {
        client.invalidateQueries({
          queryKey: ["expenses", "installment_group", variables.installmentGroupId],
        });
        invalidateExpenses(variables.category);
      },
    },
    client
  );

  const deleteFutureMutation = useMutation(
    {
      mutationFn: ({
        installmentGroupId,
        fromNumber,
        fromDate,
      }: {
        installmentGroupId: string;
        fromNumber: number | null;
        fromDate?: string;
        category?: string | null;
      }) => deleteFutureInstallments(installmentGroupId, fromNumber, fromDate),
      onSuccess: (_, variables) => {
        client.invalidateQueries({
          queryKey: ["expenses", "installment_group", variables.installmentGroupId],
        });
        invalidateExpenses(variables.category);
      },
    },
    client
  );

  const upsertPartMutation = useMutation(
    {
      mutationFn: (payload: {
        user_id: string;
        part_name: string;
        life_km: number;
        last_change_km: number;
        last_change_at: string;
      }) => upsertPartMaintenance(payload),
      onSuccess: () => {
        client.invalidateQueries({ queryKey: queryKeys.maintenance.parts() });
      },
    },
    client
  );

  return {
    createExpense: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateExpense: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteExpense: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteInstallmentGroup: deleteGroupMutation.mutateAsync,
    isDeletingGroup: deleteGroupMutation.isPending,
    deleteFutureInstallments: deleteFutureMutation.mutateAsync,
    isDeletingFuture: deleteFutureMutation.isPending,
    upsertPartMaintenance: upsertPartMutation.mutateAsync,
  };
}
