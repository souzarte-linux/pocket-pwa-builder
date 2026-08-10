import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getOilChanges, getPartMaintenance } from "@/api/maintenance.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

export * from "@/hooks/mutations/useMaintenanceMutations";

/**
 * Hook to retrieve vehicle oil changes.
 * Stale time: 1 minute.
 */
export function useOilChanges(userId?: string) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useQuery(
    {
      queryKey: queryKeys.maintenance.oil(),
      queryFn: () => getOilChanges(userId),
      staleTime: 1000 * 60,
    },
    client
  );
}

/**
 * Hook to retrieve vehicle parts maintenance history and lifespans.
 * Stale time: 1 minute.
 */
export function usePartMaintenance(userId?: string | null) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useQuery(
    {
      queryKey: queryKeys.maintenance.parts(userId),
      queryFn: () => getPartMaintenance(userId ?? undefined),
      staleTime: 1000 * 60,
    },
    client
  );
}
