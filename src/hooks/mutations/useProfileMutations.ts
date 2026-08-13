import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProfile, upsertProfile, type ProfileUpdate, type ProfileInsert } from "@/api/profile.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

/**
 * Hook for profile mutations (update / upsert) with automated cache invalidation.
 */
export function useProfileMutations() {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // Uses defaultQueryClient if rendered outside QueryClientProvider
  }

  const updateMutation = useMutation(
    {
      mutationFn: ({ userId, updates }: { userId: string; updates: ProfileUpdate }) =>
        updateProfile(userId, updates),
      onSuccess: (data, variables) => {
        client.invalidateQueries({ queryKey: queryKeys.profile(variables.userId) });
        client.invalidateQueries({ queryKey: queryKeys.financialGoals(variables.userId) });
        client.invalidateQueries({ queryKey: queryKeys.odometer.current() });
        client.setQueryData(queryKeys.profile(variables.userId), data);
      },
    },
    client
  );

  const upsertMutation = useMutation(
    {
      mutationFn: ({ userId, payload }: { userId: string; payload: ProfileInsert }) =>
        upsertProfile(userId, payload),
      onSuccess: (data, variables) => {
        client.invalidateQueries({ queryKey: queryKeys.profile(variables.userId) });
        client.invalidateQueries({ queryKey: queryKeys.financialGoals(variables.userId) });
        client.invalidateQueries({ queryKey: queryKeys.odometer.current() });
        client.setQueryData(queryKeys.profile(variables.userId), data);
      },
    },
    client
  );

  return {
    updateProfile: updateMutation.mutateAsync,
    upsertProfile: upsertMutation.mutateAsync,
    isUpdating: updateMutation.isPending || upsertMutation.isPending,
    error: updateMutation.error || upsertMutation.error,
  };
}

export default useProfileMutations;
