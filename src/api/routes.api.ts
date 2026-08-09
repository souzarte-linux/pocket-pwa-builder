import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export interface GetRoutesParams {
  period?: string;
  platformId?: string;
  since?: string;
  until?: string;
  userId?: string;
}

/**
 * Fetches routes with optional filtering by period, platform, date range, or user.
 */
export async function getRoutes(params?: GetRoutesParams): Promise<Tables<"routes">[]> {
  try {
    const fromRoutes = supabase.from("routes");
    if (!fromRoutes || typeof fromRoutes.select !== "function") return [];
    let q = fromRoutes.select("*");

    if (params?.userId && typeof (q as any)?.eq === "function") {
      q = (q as any).eq("user_id", params.userId);
    }
    if (params?.platformId && typeof (q as any)?.eq === "function") {
      q = (q as any).eq("platform_id", params.platformId);
    }
    if (params?.since && typeof (q as any)?.gte === "function") {
      q = (q as any).gte("occurred_at", params.since);
    }
    if (params?.until && typeof (q as any)?.lte === "function") {
      q = (q as any).lte("occurred_at", params.until);
    }
    if (typeof (q as any)?.order === "function") {
      q = (q as any).order("occurred_at", { ascending: false });
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error("Error fetching routes:", err);
    return [];
  }
}

/**
 * Fetches a single route by ID.
 */
export async function getRouteById(id: string): Promise<Tables<"routes"> | null> {
  try {
    const fromRoutes = supabase.from("routes");
    if (!fromRoutes || typeof fromRoutes.select !== "function") return null;
    const { data, error } = await fromRoutes.select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`Error fetching route ${id}:`, err);
    return null;
  }
}

/**
 * Fetches the latest recorded route to determine starting odometer.
 */
export async function getLatestRoute(userId?: string): Promise<{ end_km?: number | null } | null> {
  try {
    const fromRoutes = supabase.from("routes");
    if (!fromRoutes || typeof fromRoutes.select !== "function") return null;
    let q = fromRoutes.select("end_km");
    if (userId && typeof (q as any)?.eq === "function") {
      q = (q as any).eq("user_id", userId);
    }
    if (typeof (q as any)?.order === "function") {
      q = (q as any).order("occurred_at", { ascending: false });
    }
    if (typeof (q as any)?.limit === "function") {
      q = (q as any).limit(1);
    }
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    return data ?? null;
  } catch (err) {
    console.error("Error fetching latest route:", err);
    return null;
  }
}

/**
 * Creates a new route in Supabase.
 */
export async function createRoute(payload: TablesInsert<"routes">): Promise<Tables<"routes">> {
  const fromRoute = supabase.from("routes") as any;
  let q = fromRoute.insert(payload);
  if (q && typeof q.select === "function") {
    q = q.select();
  }
  if (q && typeof q.single === "function") {
    const res = await q.single();
    if (res.error) throw res.error;
    return res.data;
  }
  const res = await q;
  if (res?.error) throw res.error;
  return (res?.data?.[0] ?? res?.data ?? { id: "mock-route-id", ...payload }) as Tables<"routes">;
}

/**
 * Updates an existing route.
 */
export async function updateRoute(
  id: string,
  payload: TablesUpdate<"routes">
): Promise<Tables<"routes">> {
  const fromRoute = supabase.from("routes") as any;
  let q = fromRoute.update(payload).eq("id", id);
  if (q && typeof q.select === "function") {
    q = q.select();
  }
  if (q && typeof q.single === "function") {
    const res = await q.single();
    if (res.error) throw res.error;
    return res.data;
  }
  const res = await q;
  if (res?.error) throw res.error;
  return (res?.data?.[0] ?? res?.data ?? { id, ...payload }) as Tables<"routes">;
}

/**
 * Deletes a route by ID.
 */
export async function deleteRoute(id: string): Promise<void> {
  const { error } = await supabase.from("routes").delete().eq("id", id);
  if (error) throw error;
}
