import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getBillingCycles,
  getBillingCycleById,
  createBillingCycle,
  updateBillingCycle,
  deleteBillingCycle,
} from "@/api/billing.api";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

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
      const orderMock = vi.fn().mockResolvedValue({ data: mockCycles, error: null });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const result = await getBillingCycles();
      expect(supabase.from).toHaveBeenCalledWith("billing_cycles");
      expect(selectMock).toHaveBeenCalledWith("*");
      expect(orderMock).toHaveBeenCalledWith("period_start", { ascending: false });
      expect(result).toEqual(mockCycles);
    });

    it("filters by status when provided", async () => {
      const mockCycles = [{ id: "cycle-1", status: "open" }];
      const eqMock = vi.fn().mockResolvedValue({ data: mockCycles, error: null });
      const orderMock = vi.fn().mockReturnValue({ eq: eqMock });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const result = await getBillingCycles({ status: "open" });
      expect(eqMock).toHaveBeenCalledWith("status", "open");
      expect(result).toEqual(mockCycles);
    });

    it("throws error when query fails", async () => {
      const dbError = new Error("Failed to fetch billing cycles");
      const orderMock = vi.fn().mockResolvedValue({ data: null, error: dbError });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      await expect(getBillingCycles()).rejects.toThrow("Failed to fetch billing cycles");
    });
  });

  describe("getBillingCycleById / create / update / delete", () => {
    it("returns null when id is empty", async () => {
      const result = await getBillingCycleById("");
      expect(result).toBeNull();
    });

    it("fetches single cycle by id", async () => {
      const mockCycle = { id: "cycle-1", status: "open" };
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockCycle, error: null });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const result = await getBillingCycleById("cycle-1");
      expect(result).toEqual(mockCycle);
    });

    it("creates a new cycle", async () => {
      const newCycle = { id: "cycle-new", status: "open", user_id: "user-1", platform_id: "plat-1" };
      const singleMock = vi.fn().mockResolvedValue({ data: newCycle, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

      const result = await createBillingCycle(newCycle as any);
      expect(supabase.from).toHaveBeenCalledWith("billing_cycles");
      expect(result).toEqual(newCycle);
    });

    it("updates an existing cycle status", async () => {
      const updated = { id: "cycle-1", status: "confirmed" };
      const singleMock = vi.fn().mockResolvedValue({ data: updated, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqMock = vi.fn().mockReturnValue({ select: selectMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

      const result = await updateBillingCycle("cycle-1", { status: "confirmed" });
      expect(result).toEqual(updated);
    });

    it("deletes a cycle", async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ delete: deleteMock } as any);

      await deleteBillingCycle("cycle-1");
      expect(deleteMock).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith("id", "cycle-1");
    });
  });
});
