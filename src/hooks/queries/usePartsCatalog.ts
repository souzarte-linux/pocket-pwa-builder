import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPartsCatalog, getPartById, searchParts } from "@/api/parts.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

/**
 * Hook to query and cache the parts catalog via TanStack Query.
 * Stale time: 10 minutes.
 */
export function usePartsCatalog(userId?: string) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useQuery(
    {
      queryKey: queryKeys.partsCatalog(userId),
      queryFn: () => getPartsCatalog(userId),
      staleTime: 1000 * 60 * 10,
    },
    client
  );
}

/**
 * Hook to query a single part by ID.
 */
export function usePartDetail(id?: string) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback
  }

  return useQuery(
    {
      queryKey: ["parts_catalog", "detail", id] as const,
      queryFn: () => (id ? getPartById(id) : null),
      enabled: Boolean(id),
      staleTime: 1000 * 60 * 10,
    },
    client
  );
}

/**
 * Hook to search parts dynamically.
 */
export function useSearchParts(query: string, userId?: string) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback
  }

  return useQuery(
    {
      queryKey: ["parts_catalog", "search", query, userId ?? null] as const,
      queryFn: () => searchParts(query, userId),
      enabled: query.trim().length > 0,
      staleTime: 1000 * 60 * 5,
    },
    client
  );
}

export default usePartsCatalog;
