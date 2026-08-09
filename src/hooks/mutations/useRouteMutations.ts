import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRoute, updateRoute, deleteRoute } from "@/api/routes.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

/**
 * Hook providing route mutations (create, update, delete) with surgical cache invalidation.
 */
export function useRouteMutations() {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  const invalidateRouteDependencies = (routeId?: string) => {
    client.invalidateQueries({ queryKey: ["routes"] });
    client.invalidateQueries({ queryKey: queryKeys.odometer.current() });
    client.invalidateQueries({ queryKey: queryKeys.dailyTotals() });
    if (routeId) {
      client.invalidateQueries({ queryKey: ["routes", "detail", routeId] });
    }
  };

  const createMutation = useMutation(
    {
      mutationFn: (payload: TablesInsert<"routes">) => createRoute(payload),
      onSuccess: (data) => {
        invalidateRouteDependencies(data.id);
      },
    },
    client
  );

  const updateMutation = useMutation(
    {
      mutationFn: ({ id, payload }: { id: string; payload: TablesUpdate<"routes"> }) =>
        updateRoute(id, payload),
      onSuccess: (data) => {
        invalidateRouteDependencies(data.id);
      },
    },
    client
  );

  const deleteMutation = useMutation(
    {
      mutationFn: (id: string) => deleteRoute(id),
      onSuccess: (_, routeId) => {
        invalidateRouteDependencies(routeId);
      },
    },
    client
  );

  return {
    createRoute: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateRoute: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteRoute: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
