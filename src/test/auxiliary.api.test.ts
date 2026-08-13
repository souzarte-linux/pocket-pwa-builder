import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  getCardOperators,
  createCardOperator,
  updateCardOperator,
  deleteCardOperator,
  getGasStations,
  createGasStation,
  updateGasStation,
  deleteGasStation,
  getPartsCatalog,
} from "@/api/auxiliary.api";
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
    order: vi.fn().mockImplementation(() => mockObj),
    single: vi.fn().mockImplementation(() => Promise.resolve({ data, error: null })),
    insert: vi.fn().mockImplementation(() => mockObj),
    update: vi.fn().mockImplementation(() => mockObj),
    delete: vi.fn().mockImplementation(() => mockObj),
  };
  return mockObj;
}

describe("auxiliary.api - Master Auxiliary Tables Layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Companies", () => {
    it("getCompanies returns list of companies", async () => {
      const mockList = [{ id: "c1", name: "Empresa ABC", user_id: "u1" }];
      vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockList) as any);

      const res = await getCompanies("u1");
      expect(res).toEqual(mockList);
    });

    it("updateCompany updates and returns company", async () => {
      const mockItem = { id: "c1", name: "Empresa Atualizada", user_id: "u1" };
      vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockItem) as any);

      const res = await updateCompany("c1", { name: "Empresa Atualizada" });
      expect(res).toEqual(mockItem);
    });

    it("deleteCompany deletes company by id", async () => {
      const mockObj = createQueryMock();
      vi.mocked(supabase.from).mockReturnValue(mockObj as any);

      await expect(deleteCompany("c1")).resolves.toBeUndefined();
      expect(mockObj.delete).toHaveBeenCalled();
      expect(mockObj.eq).toHaveBeenCalledWith("id", "c1");
    });
  });

  describe("Card Operators", () => {
    it("getCardOperators returns operators list", async () => {
      const mockList = [{ id: "op1", name: "Mastercard", user_id: "u1" }];
      vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockList) as any);

      const res = await getCardOperators("u1");
      expect(res).toEqual(mockList);
    });

    it("createCardOperator inserts and returns operator", async () => {
      const mockItem = { id: "op2", name: "Visa", user_id: "u1" };
      vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockItem) as any);

      const res = await createCardOperator({ name: "Visa", user_id: "u1" });
      expect(res).toEqual(mockItem);
    });

    it("updateCardOperator updates and returns operator", async () => {
      const mockItem = { id: "op1", name: "Mastercard Black", user_id: "u1" };
      vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockItem) as any);

      const res = await updateCardOperator("op1", { name: "Mastercard Black" });
      expect(res).toEqual(mockItem);
    });

    it("deleteCardOperator deletes operator", async () => {
      vi.mocked(supabase.from).mockReturnValue(createQueryMock(null) as any);

      await expect(deleteCardOperator("op1")).resolves.toBeUndefined();
    });
  });

  describe("Gas Stations", () => {
    it("getGasStations returns stations list", async () => {
      const mockList = [{ id: "gs1", name: "Posto Shell", brand: "Shell", user_id: "u1" }];
      vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockList) as any);

      const res = await getGasStations("u1");
      expect(res).toEqual(mockList);
    });

    it("createGasStation inserts station", async () => {
      const mockItem = { id: "gs2", name: "Posto Ipiranga", brand: "Ipiranga", user_id: "u1" };
      vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockItem) as any);

      const res = await createGasStation({ name: "Posto Ipiranga", brand: "Ipiranga", user_id: "u1" });
      expect(res).toEqual(mockItem);
    });

    it("updateGasStation updates station", async () => {
      const mockItem = { id: "gs1", name: "Posto Shell Atualizado", brand: "Shell", user_id: "u1" };
      vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockItem) as any);

      const res = await updateGasStation("gs1", { name: "Posto Shell Atualizado" });
      expect(res).toEqual(mockItem);
    });

    it("deleteGasStation deletes station", async () => {
      vi.mocked(supabase.from).mockReturnValue(createQueryMock(null) as any);

      await expect(deleteGasStation("gs1")).resolves.toBeUndefined();
    });
  });

  describe("Parts Catalog", () => {
    it("getPartsCatalog returns catalog list", async () => {
      const mockList = [{ id: "pc1", name: "Vela de Ignição", user_id: "u1" }];
      vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockList) as any);

      const res = await getPartsCatalog();
      expect(res).toEqual(mockList);
    });
  });
});
