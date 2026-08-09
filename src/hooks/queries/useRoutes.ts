import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRoutes, getRouteById, getLatestRoute, type GetRoutesParams } from "@/api/routes.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

/**
 * Hook to retrieve routes with optional filters.
 * Stale time: 30 seconds.
 */
export function useRoutes(params?: GetRoutesParams) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useQuery(
    {
      queryKey: queryKeys.routes(params),
      queryFn: () => getRoutes(params),
      staleTime: 1000 * 30,
    },
    client
  );
}

/**
 * Hook to retrieve a single route by ID.
 * Stale time: 1 minute.
 */
export function useRouteDetail(id?: string | null) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useQuery(
    {
      queryKey: ["routes", "detail", id ?? null] as const,
      queryFn: () => (id ? getRouteById(id) : null),
      enabled: !!id,
      staleTime: 1000 * 60,
    },
    client
  );
}

/**
 * Hook to retrieve the latest recorded route.
 * Stale time: 30 seconds.
 */
export function useLatestRoute(userId?: string) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useQuery(
    {
      queryKey: ["routes", "latest", userId ?? null] as const,
      queryFn: () => getLatestRoute(userId),
      staleTime: 1000 * 30,
    },
    client
  );
}
