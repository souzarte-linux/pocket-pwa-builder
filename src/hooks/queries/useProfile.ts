import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile } from "@/api/profile.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

/**
 * Hook to retrieve driver profile, vehicle information, and financial goals.
 * Cached with a 15-minute staleTime.
 */
export function useProfile(userId?: string | null) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // Uses defaultQueryClient if rendered outside QueryClientProvider
  }

  return useQuery(
    {
      queryKey: queryKeys.profile(userId),
      queryFn: () => {
        if (!userId) return null;
        return getProfile(userId);
      },
      enabled: Boolean(userId),
      staleTime: 1000 * 60 * 15,
    },
    client
  );
}

export default useProfile;
