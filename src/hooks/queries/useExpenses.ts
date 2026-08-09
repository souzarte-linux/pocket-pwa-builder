import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getExpenses, getExpenseById, getInstallmentGroup, type GetExpensesParams } from "@/api/expenses.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

/**
 * Hook to retrieve expenses with optional filters.
 * Stale time: 30 seconds.
 */
export function useExpenses(params?: GetExpensesParams) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useQuery(
    {
      queryKey: queryKeys.expenses(params),
      queryFn: () => getExpenses(params),
      staleTime: 1000 * 30,
    },
    client
  );
}

/**
 * Hook to retrieve a single expense by ID.
 * Stale time: 60 seconds.
 */
export function useExpenseDetail(id?: string | null) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useQuery(
    {
      queryKey: ["expenses", "detail", id ?? null] as const,
      queryFn: () => (id ? getExpenseById(id) : null),
      enabled: !!id,
      staleTime: 1000 * 60,
    },
    client
  );
}

/**
 * Hook to retrieve all installments for a group.
 * Stale time: 30 seconds.
 */
export function useInstallmentGroup(installmentGroupId?: string | null) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useQuery(
    {
      queryKey: ["expenses", "installment_group", installmentGroupId ?? null] as const,
      queryFn: () => (installmentGroupId ? getInstallmentGroup(installmentGroupId) : []),
      enabled: !!installmentGroupId,
      staleTime: 1000 * 30,
    },
    client
  );
}
