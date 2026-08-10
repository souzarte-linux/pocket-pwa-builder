import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createOilChange,
  updateOilChange,
  deleteOilChange,
  upsertPartMaintenanceRecord,
  updatePartMaintenanceRecord,
  deletePartMaintenanceRecord,
  type OilChangeInsert,
  type OilChangeUpdate,
  type PartMaintenanceInsert,
  type PartMaintenanceUpdate,
} from "@/api/maintenance.api";
import { queryKeys } from "@/lib/queryKeys";
import { queryClient as defaultQueryClient } from "@/lib/queryClient";

/**
 * Custom hooks for vehicle maintenance mutations (oil changes and part lifespans).
 * Encapsulates surgical cache invalidations across maintenance, odometer, and reports.
 */
export function useCreateOilChange(userId?: string) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useMutation(
    {
      mutationFn: (payload: OilChangeInsert) => createOilChange(payload),
      onSuccess: () => {
        client.invalidateQueries({ queryKey: queryKeys.maintenance.oil() });
        client.invalidateQueries({ queryKey: queryKeys.odometer.current() });
        if (userId) {
          client.invalidateQueries({ queryKey: queryKeys.profile(userId) });
        }
      },
    },
    client
  );
}

export function useUpdateOilChange() {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useMutation(
    {
      mutationFn: ({ id, payload }: { id: string; payload: OilChangeUpdate }) =>
        updateOilChange(id, payload),
      onSuccess: () => {
        client.invalidateQueries({ queryKey: queryKeys.maintenance.oil() });
        client.invalidateQueries({ queryKey: queryKeys.odometer.current() });
      },
    },
    client
  );
}

export function useDeleteOilChange() {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useMutation(
    {
      mutationFn: (id: string) => deleteOilChange(id),
      onSuccess: () => {
        client.invalidateQueries({ queryKey: queryKeys.maintenance.oil() });
        client.invalidateQueries({ queryKey: queryKeys.odometer.current() });
      },
    },
    client
  );
}

export function useUpsertPartMaintenance(userId?: string | null) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useMutation(
    {
      mutationFn: (payload: PartMaintenanceInsert) => upsertPartMaintenanceRecord(payload),
      onSuccess: () => {
        client.invalidateQueries({ queryKey: queryKeys.maintenance.parts(userId) });
      },
    },
    client
  );
}

export function useUpdatePartMaintenance(userId?: string | null) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useMutation(
    {
      mutationFn: ({ id, payload }: { id: string; payload: PartMaintenanceUpdate }) =>
        updatePartMaintenanceRecord(id, payload),
      onSuccess: () => {
        client.invalidateQueries({ queryKey: queryKeys.maintenance.parts(userId) });
      },
    },
    client
  );
}

export function useDeletePartMaintenance(userId?: string | null) {
  let client = defaultQueryClient;
  try {
    const ctx = useQueryClient();
    if (ctx) client = ctx;
  } catch {
    // fallback to defaultQueryClient
  }

  return useMutation(
    {
      mutationFn: (id: string) => deletePartMaintenanceRecord(id),
      onSuccess: () => {
        client.invalidateQueries({ queryKey: queryKeys.maintenance.parts(userId) });
      },
    },
    client
  );
}
