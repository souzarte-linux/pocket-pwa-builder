import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPlatforms, getPlatformById } from "@/api/platforms.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

/**
 * Hook to retrieve delivery platforms (iFood, Rappi, etc.).
 * Defaults to active-only platforms with a 30-minute staleTime.
 */
export function usePlatforms(activeOnly: boolean = true) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // Uses defaultQueryClient if rendered outside QueryClientProvider
  }

  return useQuery(
    {
      queryKey: queryKeys.platforms(activeOnly),
      queryFn: () => getPlatforms(activeOnly),
      staleTime: 1000 * 60 * 30,
    },
    client
  );
}

/**
 * Hook to retrieve a single delivery platform by ID.
 * Cached with a 15-minute staleTime.
 */
export function usePlatformDetail(id?: string) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // Uses defaultQueryClient if rendered outside QueryClientProvider
  }

  return useQuery(
    {
      queryKey: queryKeys.platformDetail(id ?? ""),
      queryFn: () => (id ? getPlatformById(id) : null),
      enabled: Boolean(id && id !== "nova"),
      staleTime: 1000 * 60 * 15,
    },
    client
  );
}

export default usePlatforms;
