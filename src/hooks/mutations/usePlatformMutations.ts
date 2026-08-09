import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPlatform,
  updatePlatform,
  deletePlatform,
  type PlatformInsert,
  type PlatformUpdate,
} from "@/api/platforms.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

/**
 * Mutation hook for platforms with automated cache invalidation across active and all lists.
 */
export function usePlatformMutations() {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // Uses defaultQueryClient if rendered outside QueryClientProvider
  }

  const invalidatePlatformQueries = () => {
    client.invalidateQueries({ queryKey: ["platforms"] });
  };

  const createMutation = useMutation(
    {
      mutationFn: (payload: PlatformInsert) => createPlatform(payload),
      onSuccess: () => {
        invalidatePlatformQueries();
      },
    },
    client
  );

  const updateMutation = useMutation(
    {
      mutationFn: ({ id, payload }: { id: string; payload: PlatformUpdate }) =>
        updatePlatform(id, payload),
      onSuccess: (_data, variables) => {
        invalidatePlatformQueries();
        client.invalidateQueries({ queryKey: queryKeys.platformDetail(variables.id) });
      },
    },
    client
  );

  const deleteMutation = useMutation(
    {
      mutationFn: (id: string) => deletePlatform(id),
      onSuccess: () => {
        invalidatePlatformQueries();
      },
    },
    client
  );

  const toggleActiveMutation = useMutation(
    {
      mutationFn: ({ id, active }: { id: string; active: boolean }) =>
        updatePlatform(id, { active }),
      onSuccess: () => {
        invalidatePlatformQueries();
      },
    },
    client
  );

  return {
    createPlatform: createMutation.mutateAsync,
    updatePlatform: updateMutation.mutateAsync,
    deletePlatform: deleteMutation.mutateAsync,
    toggleActive: toggleActiveMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending || toggleActiveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export default usePlatformMutations;
