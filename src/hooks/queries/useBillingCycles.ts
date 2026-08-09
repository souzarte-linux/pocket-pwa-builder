import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getBillingCycles,
  getBillingCycleById,
  type GetBillingCyclesOptions,
} from "@/api/billing.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

/**
 * Hook to retrieve billing cycles and invoices.
 * Cached with a 5-minute staleTime.
 */
export function useBillingCycles(options?: GetBillingCyclesOptions) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // Uses defaultQueryClient if rendered outside QueryClientProvider
  }

  return useQuery(
    {
      queryKey: queryKeys.billingCycles(options?.status),
      queryFn: () => getBillingCycles(options),
      staleTime: 1000 * 60 * 5,
    },
    client
  );
}

/**
 * Hook to retrieve a single billing cycle by ID.
 * Cached with a 5-minute staleTime.
 */
export function useBillingCycleDetail(id?: string) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // Uses defaultQueryClient if rendered outside QueryClientProvider
  }

  return useQuery(
    {
      queryKey: queryKeys.billingCycleDetail(id ?? ""),
      queryFn: () => (id ? getBillingCycleById(id) : null),
      enabled: Boolean(id),
      staleTime: 1000 * 60 * 5,
    },
    client
  );
}

export default useBillingCycles;
