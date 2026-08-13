import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCompany,
  createCardOperator,
  updateCardOperator,
  deleteCardOperator,
  createGasStation,
  updateGasStation,
  deleteGasStation,
} from "@/api/auxiliary.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export function useCompanyMutations() {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
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

export function useCardOperatorMutations() {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  const createMutation = useMutation(
    {
      mutationFn: (payload: TablesInsert<"card_operators">) => createCardOperator(payload),
      onSuccess: () => {
        client.invalidateQueries({ queryKey: queryKeys.auxiliary("card_brands") });
        client.invalidateQueries({ queryKey: queryKeys.auxiliary("card_issuers") });
      },
    },
    client
  );

  const updateMutation = useMutation(
    {
      mutationFn: ({ id, payload }: { id: string; payload: TablesUpdate<"card_operators"> }) =>
        updateCardOperator(id, payload),
      onSuccess: () => {
        client.invalidateQueries({ queryKey: queryKeys.auxiliary("card_brands") });
        client.invalidateQueries({ queryKey: queryKeys.auxiliary("card_issuers") });
      },
    },
    client
  );

  const deleteMutation = useMutation(
    {
      mutationFn: (id: string) => deleteCardOperator(id),
      onSuccess: () => {
        client.invalidateQueries({ queryKey: queryKeys.auxiliary("card_brands") });
        client.invalidateQueries({ queryKey: queryKeys.auxiliary("card_issuers") });
      },
    },
    client
  );

  return {
    createCardOperator: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateCardOperator: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteCardOperator: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

export function useGasStationMutations() {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  const createMutation = useMutation(
    {
      mutationFn: (payload: TablesInsert<"gas_stations">) => createGasStation(payload),
      onSuccess: () => {
        client.invalidateQueries({ queryKey: queryKeys.auxiliary("gas_stations") });
      },
    },
    client
  );

  const updateMutation = useMutation(
    {
      mutationFn: ({ id, payload }: { id: string; payload: TablesUpdate<"gas_stations"> }) =>
        updateGasStation(id, payload),
      onSuccess: () => {
        client.invalidateQueries({ queryKey: queryKeys.auxiliary("gas_stations") });
      },
    },
    client
  );

  const deleteMutation = useMutation(
    {
      mutationFn: (id: string) => deleteGasStation(id),
      onSuccess: () => {
        client.invalidateQueries({ queryKey: queryKeys.auxiliary("gas_stations") });
      },
    },
    client
  );

  return {
    createGasStation: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateGasStation: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteGasStation: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
