import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPart, updatePart, deletePart } from "@/api/parts.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

/**
 * Hook for parts catalog mutations (create, update, delete) with automated cache invalidation.
 */
export function usePartsCatalogMutations(userId?: string) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  const invalidate = () => {
    client.invalidateQueries({ queryKey: queryKeys.partsCatalog(userId) });
    client.invalidateQueries({ queryKey: ["auxiliary", "parts_catalog"] });
    client.invalidateQueries({ queryKey: ["parts_catalog"] });
  };

  const createMutation = useMutation(
    {
      mutationFn: (payload: TablesInsert<"parts_catalog">) => createPart(payload),
      onSuccess: invalidate,
    },
    client
  );

  const updateMutation = useMutation(
    {
      mutationFn: ({ id, payload }: { id: string; payload: TablesUpdate<"parts_catalog"> }) =>
        updatePart(id, payload),
      onSuccess: invalidate,
    },
    client
  );

  const deleteMutation = useMutation(
    {
      mutationFn: (id: string) => deletePart(id),
      onSuccess: invalidate,
    },
    client
  );

  return {
    createPart: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updatePart: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deletePart: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

export default usePartsCatalogMutations;
