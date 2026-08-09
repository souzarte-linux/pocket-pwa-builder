import { supabase } from "@/integrations/supabase/client";

/**
 * Calculates the current real odometer reading for the vehicle.
 * Rule: MAX(routes.end_km, expenses.odometer_km, oil_changes.km_at_change)
 * Strict Requirement: If no reading exists or max <= 0, returns null (NEVER a fake fallback like 45.000).
 */
export async function getCurrentOdometer(userId?: string): Promise<number | null> {
  try {
    const fetchExp = async () => {
      try {
        const fromExp = supabase.from("expenses");
        if (!fromExp || typeof fromExp.select !== "function") return 0;
        let q = fromExp.select("odometer_km");
        if (typeof (q as any)?.not === "function") {
          q = (q as any).not("odometer_km", "is", null);
        }
        if (typeof (q as any)?.order === "function") {
          q = (q as any).order("odometer_km", { ascending: false });
        }
        if (typeof (q as any)?.limit === "function") {
          q = (q as any).limit(1);
        }
        if (userId && typeof (q as any)?.eq === "function") {
          q = (q as any).eq("user_id", userId);
        }
        const res = await q;
        return Number(res?.data?.[0]?.odometer_km ?? 0);
      } catch {
        return 0;
      }
    };

    const fetchOil = async () => {
      try {
        const fromOil = supabase.from("oil_changes");
        if (!fromOil || typeof fromOil.select !== "function") return 0;
        let q = fromOil.select("km_at_change");
        if (typeof (q as any)?.not === "function") {
          q = (q as any).not("km_at_change", "is", null);
        }
        if (typeof (q as any)?.order === "function") {
          q = (q as any).order("km_at_change", { ascending: false });
        }
        if (typeof (q as any)?.limit === "function") {
          q = (q as any).limit(1);
        }
        if (userId && typeof (q as any)?.eq === "function") {
          q = (q as any).eq("user_id", userId);
        }
        const res = await q;
        return Number(res?.data?.[0]?.km_at_change ?? 0);
      } catch {
        return 0;
      }
    };

    const fetchRoute = async () => {
      try {
        const fromRoute = supabase.from("routes");
        if (!fromRoute || typeof fromRoute.select !== "function") return 0;
        let q = fromRoute.select("end_km");
        if (typeof (q as any)?.not === "function") {
          q = (q as any).not("end_km", "is", null);
        }
        if (typeof (q as any)?.order === "function") {
          q = (q as any).order("end_km", { ascending: false });
        }
        if (typeof (q as any)?.limit === "function") {
          q = (q as any).limit(1);
        }
        if (userId && typeof (q as any)?.eq === "function") {
          q = (q as any).eq("user_id", userId);
        }
        const res = await q;
        return Number(res?.data?.[0]?.end_km ?? 0);
      } catch {
        return 0;
      }
    };

    const [odoExp, odoOil, odoRoute] = await Promise.all([
      fetchExp(),
      fetchOil(),
      fetchRoute(),
    ]);

    const maxReading = Math.max(
      isNaN(odoExp) ? 0 : odoExp,
      isNaN(odoOil) ? 0 : odoOil,
      isNaN(odoRoute) ? 0 : odoRoute
    );
    return maxReading > 0 ? maxReading : null;
  } catch (err) {
    console.error("Error calculating current odometer:", err);
    return null;
  }
}
