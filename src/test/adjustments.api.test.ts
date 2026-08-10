import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getFinancialAdjustments,
  createFinancialAdjustment,
  createFinancialAdjustmentsBatch,
  updateFinancialAdjustment,
  deleteFinancialAdjustment,
  deleteCycleAdjustmentsByType,
} from "@/api/adjustments.api";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

function createQueryMock(data: unknown = []) {
  const promise = Promise.resolve({ data, error: null });
  const mockObj: any = {
    then: (resolve: any, reject: any) => promise.then(resolve, reject),
    catch: (reject: any) => promise.catch(reject),
    select: vi.fn().mockImplementation(() => mockObj),
    eq: vi.fn().mockImplementation(() => mockObj),
    in: vi.fn().mockImplementation(() => mockObj),
    gte: vi.fn().mockImplementation(() => mockObj),
    lte: vi.fn().mockImplementation(() => mockObj),
    order: vi.fn().mockImplementation(() => mockObj),
    insert: vi.fn().mockImplementation(() => mockObj),
    update: vi.fn().mockImplementation(() => mockObj),
    delete: vi.fn().mockImplementation(() => mockObj),
    single: vi.fn().mockImplementation(() =>
      Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null })
    ),
    maybeSingle: vi.fn().mockImplementation(() =>
      Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null })
    ),
  };
  return mockObj;
}

describe("adjustments.api - Financial Adjustments Service Layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getFinancialAdjustments returns list with optional params", async () => {
    const mockList = [
      { id: "adj-1", amount: 50, type: "bonus", occurred_at: "2026-08-01T10:00:00Z" },
    ];
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockList) as any);

    const res = await getFinancialAdjustments({ cycleId: "cycle-1", platformId: "plat-1" });
    expect(res).toEqual(mockList);
  });

  it("getFinancialAdjustments returns empty array on error", async () => {
    const errMock: any = {
      select: vi.fn().mockImplementation(() => errMock),
      eq: vi.fn().mockImplementation(() => errMock),
      gte: vi.fn().mockImplementation(() => errMock),
      lte: vi.fn().mockImplementation(() => errMock),
      order: vi.fn().mockImplementation(() =>
        Promise.resolve({ data: null, error: { message: "DB error" } })
      ),
    };
    vi.mocked(supabase.from).mockReturnValue(errMock as any);

    const res = await getFinancialAdjustments();
    expect(res).toEqual([]);
  });

  it("createFinancialAdjustment inserts a new record", async () => {
    const mockPayload: any = {
      user_id: "u1",
      platform_id: "p1",
      amount: 100,
      type: "gratificacao",
      occurred_at: "2026-08-01T10:00:00Z",
    };
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockPayload) as any);

    await expect(createFinancialAdjustment(mockPayload)).resolves.toEqual(mockPayload);
  });

  it("createFinancialAdjustmentsBatch inserts multiple records", async () => {
    const payloads: any[] = [
      { user_id: "u1", platform_id: "p1", amount: 50, type: "bonus_fatura" },
      { user_id: "u1", platform_id: "p1", amount: -20, type: "multa" },
    ];
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(payloads) as any);

    const result = await createFinancialAdjustmentsBatch(payloads);
    expect(result).toEqual(payloads);
  });

  it("updateFinancialAdjustment updates an existing record", async () => {
    const mockUpdated: any = { id: "adj-1", amount: 150 };
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockUpdated) as any);

    await expect(updateFinancialAdjustment("adj-1", { amount: 150 })).resolves.toEqual(mockUpdated);
  });

  it("deleteFinancialAdjustment removes a record by id", async () => {
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(null) as any);

    await expect(deleteFinancialAdjustment("adj-1")).resolves.toBeUndefined();
  });

  it("deleteCycleAdjustmentsByType removes adjustments matching types", async () => {
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(null) as any);

    await expect(deleteCycleAdjustmentsByType("c-1", ["multa", "extravio"])).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("financial_adjustments");
  });
});
