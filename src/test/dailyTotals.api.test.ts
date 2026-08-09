import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDailyTotals,
  createDailyTotal,
  updateDailyTotal,
  deleteDailyTotal,
} from "@/api/dailyTotals.api";
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
    gte: vi.fn().mockImplementation(() => mockObj),
    lte: vi.fn().mockImplementation(() => mockObj),
    order: vi.fn().mockImplementation(() => mockObj),
    insert: vi.fn().mockImplementation(() => Promise.resolve({ data, error: null })),
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

describe("dailyTotals.api - DailyTotals Service Layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getDailyTotals returns list with optional params", async () => {
    const mockList = [{ id: "dt1", amount: 250, occurred_at: "2026-01-01T10:00:00Z" }];
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockList) as any);

    const res = await getDailyTotals({ since: "2026-01-01T00:00:00Z" });
    expect(res).toEqual(mockList);
  });

  it("getDailyTotals returns empty array on error", async () => {
    const errMock: any = {
      select: vi.fn().mockImplementation(() => errMock),
      eq: vi.fn().mockImplementation(() => errMock),
      gte: vi.fn().mockImplementation(() => errMock),
      order: vi.fn().mockImplementation(() =>
        Promise.resolve({ data: null, error: { message: "DB error" } })
      ),
    };
    vi.mocked(supabase.from).mockReturnValue(errMock as any);

    const res = await getDailyTotals();
    expect(res).toEqual([]);
  });

  it("createDailyTotal inserts a new record", async () => {
    const mockPayload: any = { user_id: "u1", amount: 150, occurred_at: "2026-01-01T10:00:00Z" };
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockPayload) as any);

    await expect(createDailyTotal(mockPayload)).resolves.toBeDefined();
  });

  it("updateDailyTotal updates an existing record", async () => {
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(null) as any);

    await expect(updateDailyTotal("dt1", { amount: 300 })).resolves.toBeUndefined();
  });

  it("deleteDailyTotal removes a record by id", async () => {
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(null) as any);

    await expect(deleteDailyTotal("dt1")).resolves.toBeUndefined();
  });
});
