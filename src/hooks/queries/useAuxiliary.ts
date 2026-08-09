import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCompanies,
  getCardOperators,
  getGasStations,
  getPartsCatalog,
} from "@/api/auxiliary.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

/**
 * Hook for cached companies list.
 * Stale time: 10 minutes.
 */
export function useCompanies(userId?: string) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useQuery(
    {
      queryKey: queryKeys.auxiliary("companies"),
      queryFn: () => getCompanies(userId),
      staleTime: 1000 * 60 * 10,
    },
    client
  );
}

/**
 * Hook for cached card operators / brands list.
 * Stale time: 10 minutes.
 */
export function useCardOperators(userId?: string) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useQuery(
    {
      queryKey: queryKeys.auxiliary("card_brands"),
      queryFn: () => getCardOperators(userId),
      staleTime: 1000 * 60 * 10,
    },
    client
  );
}

/**
 * Hook for cached gas stations list.
 * Stale time: 10 minutes.
 */
export function useGasStations(userId?: string) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useQuery(
    {
      queryKey: queryKeys.auxiliary("gas_stations"),
      queryFn: () => getGasStations(userId),
      staleTime: 1000 * 60 * 10,
    },
    client
  );
}

/**
 * Hook for cached parts catalog list.
 * Stale time: 10 minutes.
 */
export function usePartsCatalog() {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useQuery(
    {
      queryKey: ["auxiliary", "parts_catalog"] as const,
      queryFn: () => getPartsCatalog(),
      staleTime: 1000 * 60 * 10,
    },
    client
  );
}
