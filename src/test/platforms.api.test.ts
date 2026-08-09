import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPlatforms,
  getPlatformById,
  createPlatform,
  updatePlatform,
  deletePlatform,
} from "@/api/platforms.api";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("platforms.api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPlatforms", () => {
    it("fetches active platforms by default", async () => {
      const mockPlatforms = [
        { id: "plat-1", name: "iFood", active: true },
        { id: "plat-2", name: "Rappi", active: true },
      ];
      const eqMock = vi.fn().mockResolvedValue({ data: mockPlatforms, error: null });
      const orderMock = vi.fn().mockReturnValue({ eq: eqMock });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const result = await getPlatforms(true);
      expect(supabase.from).toHaveBeenCalledWith("platforms");
      expect(selectMock).toHaveBeenCalledWith("*");
      expect(orderMock).toHaveBeenCalledWith("name", { ascending: true });
      expect(eqMock).toHaveBeenCalledWith("active", true);
      expect(result).toEqual(mockPlatforms);
    });

    it("fetches all platforms when activeOnly is false", async () => {
      const mockPlatforms = [
        { id: "plat-1", name: "iFood", active: true },
        { id: "plat-2", name: "OldApp", active: false },
      ];
      const orderMock = vi.fn().mockResolvedValue({ data: mockPlatforms, error: null });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const result = await getPlatforms(false);
      expect(result).toEqual(mockPlatforms);
    });

    it("throws error when query fails", async () => {
      const dbError = new Error("Failed to fetch platforms");
      const eqMock = vi.fn().mockResolvedValue({ data: null, error: dbError });
      const orderMock = vi.fn().mockReturnValue({ eq: eqMock });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      await expect(getPlatforms(true)).rejects.toThrow("Failed to fetch platforms");
    });
  });

  describe("getPlatformById", () => {
    it("returns null if id is empty", async () => {
      const result = await getPlatformById("");
      expect(result).toBeNull();
    });

    it("returns single platform data", async () => {
      const mockPlatform = { id: "plat-1", name: "iFood" };
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockPlatform, error: null });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const result = await getPlatformById("plat-1");
      expect(result).toEqual(mockPlatform);
    });
  });

  describe("createPlatform / updatePlatform / deletePlatform", () => {
    it("creates a platform successfully", async () => {
      const newPlatform = { id: "plat-new", name: "Loggi", user_id: "user-1", segment: "pacote" };
      const singleMock = vi.fn().mockResolvedValue({ data: newPlatform, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

      const result = await createPlatform(newPlatform as any);
      expect(supabase.from).toHaveBeenCalledWith("platforms");
      expect(result).toEqual(newPlatform);
    });

    it("updates a platform successfully", async () => {
      const updated = { id: "plat-1", name: "iFood Express" };
      const singleMock = vi.fn().mockResolvedValue({ data: updated, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqMock = vi.fn().mockReturnValue({ select: selectMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

      const result = await updatePlatform("plat-1", { name: "iFood Express" });
      expect(result).toEqual(updated);
    });

    it("deletes a platform successfully", async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ delete: deleteMock } as any);

      await deletePlatform("plat-1");
      expect(supabase.from).toHaveBeenCalledWith("platforms");
      expect(deleteMock).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith("id", "plat-1");
    });
  });
});
