import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getExpenses,
  getExpenseById,
  getPartHistory,
  getInstallmentGroup,
  createExpense,
  updateExpense,
  deleteExpense,
  deleteInstallmentGroup,
  deleteFutureInstallments,
  upsertPartMaintenance,
} from "@/api/expenses.api";
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
    ilike: vi.fn().mockImplementation(() => mockObj),
    order: vi.fn().mockImplementation(() => mockObj),
    limit: vi.fn().mockImplementation(() => mockObj),
    insert: vi.fn().mockImplementation(() => Promise.resolve({ data, error: null })),
    update: vi.fn().mockImplementation(() => mockObj),
    delete: vi.fn().mockImplementation(() => mockObj),
    upsert: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn().mockImplementation(() =>
      Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null })
    ),
  };
  return mockObj;
}

describe("expenses.api - Expenses Service Layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getExpenses returns filtered list", async () => {
    const mockList = [{ id: "e1", category: "combustivel", amount: 150 }];
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockList) as any);

    const res = await getExpenses({ category: "combustivel" });
    expect(res).toEqual(mockList);
  });

  it("getExpenseById returns single expense", async () => {
    const mockExpense = { id: "e1", category: "manutencao", amount: 300 };
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockExpense) as any);

    const res = await getExpenseById("e1");
    expect(res).toEqual(mockExpense);
  });

  it("getPartHistory returns filtered maintenance records", async () => {
    const mockHistory = [
      { id: "e2", title: "Troca de óleo", amount: 120, odometer_km: 20000, occurred_at: "2026-01-01T10:00:00Z" },
    ];
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockHistory) as any);

    const res = await getPartHistory("Troca de óleo", "other-id");
    expect(res).toEqual(mockHistory);
  });

  it("getInstallmentGroup returns installments ordered by number", async () => {
    const mockInstallments = [
      { id: "i1", title: "Capacete (Parcela 1/3)", amount: 100, installment_number: 1, installment_total: 3, occurred_at: "2026-01-01T10:00:00Z" },
    ];
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockInstallments) as any);

    const res = await getInstallmentGroup("group-123");
    expect(res).toEqual(mockInstallments);
  });

  it("createExpense inserts a new expense record", async () => {
    const mockPayload: any = { user_id: "u1", category: "combustivel", amount: 200 };
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockPayload) as any);

    await expect(createExpense(mockPayload)).resolves.toBeUndefined();
  });

  it("updateExpense updates existing expense", async () => {
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(null) as any);

    await expect(updateExpense("e1", { amount: 250 })).resolves.toBeUndefined();
  });

  it("deleteExpense deletes expense by id", async () => {
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(null) as any);

    await expect(deleteExpense("e1")).resolves.toBeUndefined();
  });

  it("deleteInstallmentGroup removes all installments of a group", async () => {
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(null) as any);

    await expect(deleteInstallmentGroup("group-abc")).resolves.toBeUndefined();
  });

  it("deleteFutureInstallments removes from installment_number onwards", async () => {
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(null) as any);

    await expect(deleteFutureInstallments("group-abc", 2)).resolves.toBeUndefined();
  });

  it("upsertPartMaintenance writes part lifecycle record", async () => {
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(null) as any);

    await expect(
      upsertPartMaintenance({
        user_id: "u1",
        part_name: "Corrente",
        life_km: 20000,
        last_change_km: 45000,
        last_change_at: "2026-01-01T10:00:00Z",
      })
    ).resolves.toBeUndefined();
  });
});
