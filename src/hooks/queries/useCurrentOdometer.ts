import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentOdometer } from "@/api/odometer.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

/**
 * Hook to retrieve the vehicle's real current odometer reading.
 * Returns null if no odometer readings exist (never returns a fake fallback).
 * Cached with a 5-minute staleTime.
 */
export function useCurrentOdometer(userId?: string) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // Uses defaultQueryClient if rendered outside QueryClientProvider
  }

  return useQuery(
    {
      queryKey: queryKeys.odometer.current(),
      queryFn: () => getCurrentOdometer(userId),
      staleTime: 1000 * 60 * 5,
    },
    client
  );
}

export default useCurrentOdometer;
