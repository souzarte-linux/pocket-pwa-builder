import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCompany,
  updateCompany,
  deleteCompany,
} from "@/api/auxiliary.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

/**
 * Hook for company mutations (create, update, delete) with automated cache invalidation.
 */
export function useCompanyMutations() {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient if rendered outside QueryClientProvider
  }

  const createMutation = useMutation(
    {
      mutationFn: (payload: TablesInsert<"companies">) => createCompany(payload),
      onSuccess: () => {
        client.invalidateQueries({ queryKey: queryKeys.auxiliary("companies") });
      },
    },
    client
  );

  const updateMutation = useMutation(
    {
      mutationFn: ({ id, payload }: { id: string; payload: TablesUpdate<"companies"> }) =>
        updateCompany(id, payload),
      onSuccess: () => {
        client.invalidateQueries({ queryKey: queryKeys.auxiliary("companies") });
      },
    },
    client
  );

  const deleteMutation = useMutation(
    {
      mutationFn: (id: string) => deleteCompany(id),
      onSuccess: () => {
        client.invalidateQueries({ queryKey: queryKeys.auxiliary("companies") });
      },
    },
    client
  );

  return {
    createCompany: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateCompany: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteCompany: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

export default useCompanyMutations;
