import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addBrandToOperator,
  removeBrandFromOperator,
  setOperatorBrands,
} from "@/api/cardBrandOperators.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";
import { TablesInsert } from "@/integrations/supabase/types";

/**
 * Hook for card brand <-> operator relation mutations with automated cache invalidation.
 */
export function useCardBrandOperatorMutations(userId?: string) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback
  }

  const invalidate = () => {
    client.invalidateQueries({ queryKey: queryKeys.cardBrandOperators(userId) });
    client.invalidateQueries({ queryKey: ["card_brand_operators"] });
    client.invalidateQueries({ queryKey: ["auxiliary", "card_brands"] });
    client.invalidateQueries({ queryKey: ["auxiliary", "card_issuers"] });
  };

  const addMutation = useMutation(
    {
      mutationFn: (payload: TablesInsert<"card_brand_operators">) => addBrandToOperator(payload),
      onSuccess: invalidate,
    },
    client
  );

  const removeMutation = useMutation(
    {
      mutationFn: ({ operatorId, brandName }: { operatorId: string; brandName: string }) =>
        removeBrandFromOperator(operatorId, brandName, userId || ""),
      onSuccess: invalidate,
    },
    client
  );

  const setBrandsMutation = useMutation(
    {
      mutationFn: ({ operatorId, brandNames }: { operatorId: string; brandNames: string[] }) =>
        setOperatorBrands(operatorId, brandNames, userId || ""),
      onSuccess: invalidate,
    },
    client
  );

  return {
    addBrandToOperator: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
    removeBrandFromOperator: removeMutation.mutateAsync,
    isRemoving: removeMutation.isPending,
    setOperatorBrands: setBrandsMutation.mutateAsync,
    isSettingBrands: setBrandsMutation.isPending,
  };
}

export default useCardBrandOperatorMutations;
