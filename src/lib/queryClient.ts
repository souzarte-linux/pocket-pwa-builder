import { QueryClient } from "@tanstack/react-query";

/**
 * Global QueryClient instance with resilience-oriented caching and retry defaults.
 * Configured for mobile PWA usage (reconnect refetching, 24h gcTime, safe retry logic).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 minutes default stale time for general application data
      staleTime: 1000 * 60 * 5,
      // 24 hours garbage collection time (keeps cached data in memory across sessions)
      gcTime: 1000 * 60 * 60 * 24,
      // Exponential retry for transient network hiccups, avoiding retry on client/auth errors
      retry: (failureCount, error: unknown) => {
        if (failureCount >= 2) return false;
        if (error && typeof error === "object" && "status" in error) {
          const status = (error as { status?: number }).status;
          if (status && status >= 400 && status < 500) {
            return false;
          }
        }
        return true;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

export default queryClient;
