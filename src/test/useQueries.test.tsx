import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useProfile } from "@/hooks/queries/useProfile";
import { usePlatforms } from "@/hooks/queries/usePlatforms";
import { useBillingCycles } from "@/hooks/queries/useBillingCycles";
import * as profileApi from "@/api/profile.api";
import * as platformsApi from "@/api/platforms.api";
import * as billingApi from "@/api/billing.api";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("TanStack Query Custom Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useProfile", () => {
    it("does not fetch when userId is null or undefined", () => {
      const spy = vi.spyOn(profileApi, "getProfile");
      const { result } = renderHook(() => useProfile(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe("idle");
      expect(spy).not.toHaveBeenCalled();
    });

    it("fetches profile successfully when userId is provided", async () => {
      const mockProfile = { id: "user-1", name: "Carlos", daily_goal: 300 } as any;
      vi.spyOn(profileApi, "getProfile").mockResolvedValue(mockProfile);

      const { result } = renderHook(() => useProfile("user-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockProfile);
    });

    it("handles profile query error", async () => {
      vi.spyOn(profileApi, "getProfile").mockRejectedValue(new Error("Profile not found"));

      const { result } = renderHook(() => useProfile("user-err"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("Profile not found");
    });
  });

  describe("usePlatforms", () => {
    it("fetches active platforms by default", async () => {
      const mockPlatforms = [{ id: "p1", name: "iFood", active: true }] as any;
      const spy = vi.spyOn(platformsApi, "getPlatforms").mockResolvedValue(mockPlatforms);

      const { result } = renderHook(() => usePlatforms(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(spy).toHaveBeenCalledWith(true);
      expect(result.current.data).toEqual(mockPlatforms);
    });

    it("handles empty platforms list", async () => {
      vi.spyOn(platformsApi, "getPlatforms").mockResolvedValue([]);

      const { result } = renderHook(() => usePlatforms(false), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });

    it("handles platform query error", async () => {
      vi.spyOn(platformsApi, "getPlatforms").mockRejectedValue(new Error("Failed to load"));

      const { result } = renderHook(() => usePlatforms(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("Failed to load");
    });
  });

  describe("useBillingCycles", () => {
    it("fetches billing cycles with options", async () => {
      const mockCycles = [{ id: "c1", status: "open" }] as any;
      const spy = vi.spyOn(billingApi, "getBillingCycles").mockResolvedValue(mockCycles);

      const { result } = renderHook(() => useBillingCycles({ status: "open" }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(spy).toHaveBeenCalledWith({ status: "open" });
      expect(result.current.data).toEqual(mockCycles);
    });

    it("handles billing cycles query error", async () => {
      vi.spyOn(billingApi, "getBillingCycles").mockRejectedValue(new Error("Cycles error"));

      const { result } = renderHook(() => useBillingCycles(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("Cycles error");
    });
  });
});
