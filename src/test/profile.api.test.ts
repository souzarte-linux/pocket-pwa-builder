import { describe, it, expect, vi, beforeEach } from "vitest";
import { getProfile, updateProfile } from "@/api/profile.api";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("profile.api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProfile", () => {
    it("returns null if userId is empty", async () => {
      const result = await getProfile("");
      expect(result).toBeNull();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("fetches profile data from supabase correctly", async () => {
      const mockProfile = { id: "user-123", name: "João Motorista", daily_goal: 250 };
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockProfile, error: null });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const result = await getProfile("user-123");
      expect(supabase.from).toHaveBeenCalledWith("profiles");
      expect(selectMock).toHaveBeenCalledWith("*");
      expect(eqMock).toHaveBeenCalledWith("id", "user-123");
      expect(result).toEqual(mockProfile);
    });

    it("throws error when supabase query fails", async () => {
      const dbError = new Error("Database connection error");
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: dbError });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      await expect(getProfile("user-123")).rejects.toThrow("Database connection error");
    });
  });

  describe("updateProfile", () => {
    it("updates and returns profile successfully", async () => {
      const updatedProfile = { id: "user-123", daily_goal: 300 };
      const singleMock = vi.fn().mockResolvedValue({ data: updatedProfile, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqMock = vi.fn().mockReturnValue({ select: selectMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

      const result = await updateProfile("user-123", { daily_goal: 300 });
      expect(supabase.from).toHaveBeenCalledWith("profiles");
      expect(updateMock).toHaveBeenCalledWith({ daily_goal: 300 });
      expect(eqMock).toHaveBeenCalledWith("id", "user-123");
      expect(result).toEqual(updatedProfile);
    });

    it("throws error when update fails", async () => {
      const dbError = new Error("Update failed constraint");
      const singleMock = vi.fn().mockResolvedValue({ data: null, error: dbError });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqMock = vi.fn().mockReturnValue({ select: selectMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

      await expect(updateProfile("user-123", { daily_goal: 300 })).rejects.toThrow(
        "Update failed constraint"
      );
    });
  });
});
