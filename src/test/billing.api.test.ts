import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getBillingCycles,
  getBillingCyclesWithTotals,
  getBillingCycleById,
  createBillingCycle,
  updateBillingCycle,
  deleteBillingCycle,
  linkCycleTransactions,
  unlinkCycleTransactions,
  markCycleNotificationsRead,
} from "@/api/billing.api";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

function createQueryMock(data: any = []) {
  const promise = Promise.resolve({ data, error: null });
  const mockObj: any = {
    then: (resolve: any, reject: any) => promise.then(resolve, reject),
    catch: (reject: any) => promise.catch(reject),
    select: vi.fn().mockImplementation(() => mockObj),
    eq: vi.fn().mockImplementation(() => mockObj),
    neq: vi.fn().mockImplementation(() => mockObj),
    in: vi.fn().mockImplementation(() => mockObj),
    isNull: vi.fn().mockImplementation(() => mockObj),
    gte: vi.fn().mockImplementation(() => mockObj),
    lte: vi.fn().mockImplementation(() => mockObj),
    or: vi.fn().mockImplementation(() => mockObj),
    order: vi.fn().mockImplementation(() => mockObj),
    limit: vi.fn().mockImplementation(() => mockObj),
    update: vi.fn().mockImplementation(() => mockObj),
    delete: vi.fn().mockImplementation(() => mockObj),
    insert: vi.fn().mockImplementation(() => mockObj),
    single: vi.fn().mockImplementation(() => Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null })),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null })),
  };
  return mockObj;
}

describe("billing.api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getBillingCycles", () => {
    it("fetches all cycles ordered by period_start", async () => {
      const mockCycles = [
        { id: "cycle-1", period_start: "2026-08-01", status: "open" },
        { id: "cycle-2", period_start: "2026-07-15", status: "closed" },
      ];
      vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockCycles) as any);

      const result = await getBillingCycles();
      expect(supabase.from).toHaveBeenCalledWith("billing_cycles");
      expect(result).toEqual(mockCycles);
    });

    it("filters by status and userId when provided", async () => {
      const mockCycles = [{ id: "cycle-1", status: "open", user_id: "u-1" }];
      vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockCycles) as any);

      const result = await getBillingCycles({ status: "open", userId: "u-1" });
      expect(result).toEqual(mockCycles);
    });
  });

  describe("getBillingCyclesWithTotals", () => {
    it("aggregates routes, tips, daily totals and adjustments for each cycle", async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "billing_cycles") {
          return createQueryMock([
            {
              id: "c-100",
              platform_id: "p-1",
              period_start: "2026-08-01",
              period_end: "2026-08-07",
              expected_payment_date: "2026-08-09",
              status: "open",
              platforms: { name: "iFood" },
            },
          ]) as any;
        }
        if (table === "routes") {
          return createQueryMock([
            { billing_cycle_id: "c-100", amount: 200, tip: 20 },
            { billing_cycle_id: "c-100", amount: 150, tip: 10 },
          ]) as any;
        }
        if (table === "daily_totals") {
          return createQueryMock([
            { billing_cycle_id: "c-100", amount: 50 },
          ]) as any;
        }
        if (table === "financial_adjustments") {
          return createQueryMock([
            { billing_cycle_id: "c-100", amount: -30 },
          ]) as any;
        }
        return createQueryMock([]) as any;
      });

      const result = await getBillingCyclesWithTotals();
      expect(result).toHaveLength(1);
      expect(result[0].platform_name).toBe("iFood");
      expect(result[0].route_amount).toBe(350);
      expect(result[0].tip_total).toBe(30);
      expect(result[0].daily_amount).toBe(50);
      expect(result[0].adjustments_total).toBe(-30);
      expect(result[0].total_amount).toBe(400); // 350 + 30 + 50 + (-30) = 400
    });
  });

  describe("CRUD operations & transaction linking", () => {
    it("returns null when id is empty", async () => {
      const result = await getBillingCycleById("");
      expect(result).toBeNull();
    });

    it("fetches single cycle by id", async () => {
      const mockCycle = { id: "cycle-1", status: "open" };
      vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockCycle) as any);

      const result = await getBillingCycleById("cycle-1");
      expect(result).toEqual(mockCycle);
    });

    it("creates a new cycle", async () => {
      const newCycle = { id: "cycle-new", status: "open", user_id: "user-1", platform_id: "plat-1" };
      vi.mocked(supabase.from).mockReturnValue(createQueryMock(newCycle) as any);

      const result = await createBillingCycle(newCycle as any);
      expect(supabase.from).toHaveBeenCalledWith("billing_cycles");
      expect(result).toEqual(newCycle);
    });

    it("updates an existing cycle status", async () => {
      const updated = { id: "cycle-1", status: "confirmed" };
      vi.mocked(supabase.from).mockReturnValue(createQueryMock(updated) as any);

      const result = await updateBillingCycle("cycle-1", { status: "confirmed" });
      expect(result).toEqual(updated);
    });

    it("deletes a cycle", async () => {
      vi.mocked(supabase.from).mockReturnValue(createQueryMock([]) as any);
      await deleteBillingCycle("cycle-1");
      expect(supabase.from).toHaveBeenCalledWith("billing_cycles");
    });

    it("links transactions to cycle", async () => {
      vi.mocked(supabase.from).mockReturnValue(createQueryMock([]) as any);
      await linkCycleTransactions("c-1", "p-1", "2026-08-01", "2026-08-07");
      expect(supabase.from).toHaveBeenCalledWith("routes");
      expect(supabase.from).toHaveBeenCalledWith("daily_totals");
      expect(supabase.from).toHaveBeenCalledWith("financial_adjustments");
    });

    it("unlinks transactions from cycle", async () => {
      vi.mocked(supabase.from).mockReturnValue(createQueryMock([]) as any);
      await unlinkCycleTransactions("c-1");
      expect(supabase.from).toHaveBeenCalledWith("routes");
      expect(supabase.from).toHaveBeenCalledWith("daily_totals");
      expect(supabase.from).toHaveBeenCalledWith("financial_adjustments");
    });

    it("marks notifications as read", async () => {
      vi.mocked(supabase.from).mockReturnValue(createQueryMock([]) as any);
      await markCycleNotificationsRead("c-1", "notif-1");
      expect(supabase.from).toHaveBeenCalledWith("notifications");
    });
  });
});
