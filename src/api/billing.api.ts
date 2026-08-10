import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { checkOverlap, getPlatformCycleIntervals } from "@/lib/billing";

export type BillingCycle = Tables<"billing_cycles">;
export type BillingCycleInsert = TablesInsert<"billing_cycles">;
export type BillingCycleUpdate = TablesUpdate<"billing_cycles">;

export interface GetBillingCyclesOptions {
  status?: string;
  userId?: string;
}

export interface BillingCycleWithTotals extends BillingCycle {
  platform_name?: string;
  total_amount?: number;
  route_amount?: number;
  tip_total?: number;
  daily_amount?: number;
  adjustments_total?: number;
}

/**
 * Pure API service for billing cycles and invoices management.
 */
export async function getBillingCycles(options?: GetBillingCyclesOptions): Promise<BillingCycle[]> {
  try {
    const fromCycles = supabase.from("billing_cycles");
    if (!fromCycles || typeof fromCycles.select !== "function") return [];
    let query = fromCycles
      .select("*")
      .order("period_start", { ascending: false });

    if (options?.status && options.status !== "all") {
      query = query.eq("status", options.status);
    }

    if (options?.userId) {
      query = query.eq("user_id", options.userId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data ?? [];
  } catch (err) {
    console.error("Error fetching billing cycles:", err);
    return [];
  }
}

/**
 * Fetches all billing cycles with aggregated totals (routes, tips, daily totals, adjustments).
 */
export async function getBillingCyclesWithTotals(
  options?: GetBillingCyclesOptions
): Promise<BillingCycleWithTotals[]> {
  try {
    const fromCycles = supabase.from("billing_cycles");
    if (!fromCycles || typeof fromCycles.select !== "function") return [];
    let query = fromCycles
      .select(`id, platform_id, period_start, period_end, expected_payment_date, status, platforms ( name )`)
      .order("expected_payment_date", { ascending: true });

    if (options?.status && options.status !== "all") {
      query = query.eq("status", options.status);
    }
    if (options?.userId) {
      query = query.eq("user_id", options.userId);
    }

    const { data: cyclesData, error } = await query;
    if (error) throw error;
    if (!cyclesData || cyclesData.length === 0) return [];

    const cycleIds = cyclesData.map((c) => c.id);

    const [routesRes, dailiesRes, adjustmentsRes] = await Promise.all([
      supabase.from("routes").select("amount, tip, billing_cycle_id").in("billing_cycle_id", cycleIds),
      supabase.from("daily_totals").select("amount, billing_cycle_id").in("billing_cycle_id", cycleIds),
      supabase.from("financial_adjustments").select("amount, billing_cycle_id").in("billing_cycle_id", cycleIds),
    ]);

    const routeAmountMap = (routesRes.data || []).reduce((acc: Record<string, number>, r: any) => {
      if (!r.billing_cycle_id) return acc;
      acc[r.billing_cycle_id] = (acc[r.billing_cycle_id] || 0) + Number(r.amount);
      return acc;
    }, {});

    const tipMap = (routesRes.data || []).reduce((acc: Record<string, number>, r: any) => {
      if (!r.billing_cycle_id) return acc;
      acc[r.billing_cycle_id] = (acc[r.billing_cycle_id] || 0) + Number(r.tip || 0);
      return acc;
    }, {});

    const dailyMap = (dailiesRes.data || []).reduce((acc: Record<string, number>, d: any) => {
      if (!d.billing_cycle_id) return acc;
      acc[d.billing_cycle_id] = (acc[d.billing_cycle_id] || 0) + Number(d.amount);
      return acc;
    }, {});

    const adjMap = (adjustmentsRes.data || []).reduce((acc: Record<string, number>, a: any) => {
      if (!a.billing_cycle_id) return acc;
      acc[a.billing_cycle_id] = (acc[a.billing_cycle_id] || 0) + Number(a.amount);
      return acc;
    }, {});

    return cyclesData.map((c: any) => {
      const routeAmt = routeAmountMap[c.id] || 0;
      const tipAmt = tipMap[c.id] || 0;
      const dailyAmt = dailyMap[c.id] || 0;
      const adjAmt = adjMap[c.id] || 0;
      return {
        ...c,
        platform_name: (c.platforms as { name?: string } | null)?.name || "Desconhecida",
        route_amount: routeAmt,
        tip_total: tipAmt,
        daily_amount: dailyAmt,
        adjustments_total: adjAmt,
        total_amount: routeAmt + tipAmt + dailyAmt + adjAmt,
      };
    });
  } catch (err) {
    console.error("Error fetching billing cycles with totals:", err);
    return [];
  }
}

/**
 * Fetches a single billing cycle by ID.
 */
export async function getBillingCycleById(id: string): Promise<BillingCycle | null> {
  if (!id) return null;

  const { data, error } = await supabase
    .from("billing_cycles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Creates a new billing cycle.
 */
export async function createBillingCycle(payload: BillingCycleInsert): Promise<BillingCycle> {
  const { data, error } = await supabase
    .from("billing_cycles")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Updates an existing billing cycle (e.g. status 'confirmed' or 'paid').
 */
export async function updateBillingCycle(
  id: string,
  payload: BillingCycleUpdate
): Promise<BillingCycle> {
  const { data, error } = await supabase
    .from("billing_cycles")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Deletes a billing cycle by ID.
 */
export async function deleteBillingCycle(id: string): Promise<void> {
  const { error } = await supabase
    .from("billing_cycles")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

/**
 * Links unassigned and period-matching transactions to a billing cycle.
 */
export async function linkCycleTransactions(
  cycleId: string,
  platformId: string,
  periodStart: string,
  periodEnd: string
): Promise<void> {
  const startISO = `${periodStart}T00:00:00`;
  const endISO = `${periodEnd}T23:59:59`;

  await Promise.all([
    supabase
      .from("routes")
      .update({ billing_cycle_id: cycleId })
      .eq("platform_id", platformId)
      .or(`billing_cycle_id.is.null,billing_cycle_id.eq.${cycleId}`)
      .gte("occurred_at", startISO)
      .lte("occurred_at", endISO),

    supabase
      .from("daily_totals")
      .update({ billing_cycle_id: cycleId })
      .eq("platform_id", platformId)
      .or(`billing_cycle_id.is.null,billing_cycle_id.eq.${cycleId}`)
      .gte("occurred_at", startISO)
      .lte("occurred_at", endISO),

    supabase
      .from("financial_adjustments")
      .update({ billing_cycle_id: cycleId })
      .eq("platform_id", platformId)
      .or(`billing_cycle_id.is.null,billing_cycle_id.eq.${cycleId}`)
      .gte("occurred_at", periodStart)
      .lte("occurred_at", periodEnd),
  ]);
}

/**
 * Unlinks all transactions from a cycle when deleted or reset.
 */
export async function unlinkCycleTransactions(cycleId: string): Promise<void> {
  await Promise.all([
    supabase.from("routes").update({ billing_cycle_id: null }).eq("billing_cycle_id", cycleId),
    supabase.from("daily_totals").update({ billing_cycle_id: null }).eq("billing_cycle_id", cycleId),
    supabase.from("financial_adjustments").update({ billing_cycle_id: null }).eq("billing_cycle_id", cycleId),
  ]);
}

/**
 * Marks notifications associated with a billing cycle as read.
 */
export async function markCycleNotificationsRead(
  cycleId: string,
  notificationId?: string
): Promise<void> {
  const promises: Promise<any>[] = [
    supabase.from("notifications").update({ read: true }).eq("billing_cycle_id", cycleId),
  ];
  if (notificationId) {
    promises.push(
      supabase.from("notifications").update({ read: true }).eq("id", notificationId)
    );
  }
  await Promise.all(promises);
}

/**
 * Automatically creates pending billing cycles for active platforms with unbilled routes or dailies.
 */
export async function autoGenerateBillingCycles(userId: string): Promise<void> {
  const { data: platforms } = await supabase
    .from("platforms")
    .select("id, name, cycle, payment_day, rules, active")
    .eq("active", true);

  if (!platforms || platforms.length === 0) return;

  for (const platform of platforms) {
    const intervals = getPlatformCycleIntervals(platform);

    for (const interval of intervals) {
      const { periodStart, periodEnd, expectedPaymentDate } = interval;
      const startISO = `${periodStart}T00:00:00`;
      const endISO = `${periodEnd}T23:59:59`;

      const overlapResult = await checkOverlap(platform.id, periodStart, periodEnd);
      if (overlapResult.hasOverlap) continue;

      const { data: unassignedRoutes } = await supabase
        .from("routes")
        .select("id")
        .eq("platform_id", platform.id)
        .is("billing_cycle_id", null)
        .gte("occurred_at", startISO)
        .lte("occurred_at", endISO)
        .limit(1);

      const hasRoutes = unassignedRoutes && unassignedRoutes.length > 0;

      let hasDailies = false;
      if (!hasRoutes) {
        const { data: unassignedDailies } = await supabase
          .from("daily_totals")
          .select("id")
          .eq("platform_id", platform.id)
          .is("billing_cycle_id", null)
          .gte("occurred_at", startISO)
          .lte("occurred_at", endISO)
          .limit(1);
        hasDailies = !!(unassignedDailies && unassignedDailies.length > 0);
      }

      if (!hasRoutes && !hasDailies) continue;

      const { data: newCycle, error: insertErr } = await supabase
        .from("billing_cycles")
        .insert({
          user_id: userId,
          platform_id: platform.id,
          period_start: periodStart,
          period_end: periodEnd,
          expected_payment_date: expectedPaymentDate,
          status: "pendente_confirmacao",
        })
        .select("id")
        .single();

      if (insertErr || !newCycle) continue;

      await supabase.from("notifications").insert({
        user_id: userId,
        type: "fatura_gerada",
        billing_cycle_id: newCycle.id,
        read: false,
      });

      await linkCycleTransactions(newCycle.id, platform.id, periodStart, periodEnd);
    }
  }
}
