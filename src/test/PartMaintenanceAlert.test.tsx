import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PartMaintenanceAlert } from '@/components/PartMaintenanceAlert';
import { supabase } from '@/integrations/supabase/client';
import { BrowserRouter } from 'react-router-dom';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('PartMaintenanceAlert Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });
  });

  it('renders nothing when no parts are near life limit', async () => {
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'part_maintenance') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { id: 'p1', part_name: 'Pneu Traseiro', life_km: 20000, last_change_km: 10000 },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === 'expenses' || table === 'routes' || table === 'work_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [{ odometer_km: 11000 }] }),
              }),
            }),
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        };
      }
      return {};
    });

    const { container } = render(
      <BrowserRouter>
        <PartMaintenanceAlert />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders warning alert when part reaches 90% life', async () => {
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'part_maintenance') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { id: 'p1', part_name: 'Óleo do Motor', life_km: 3000, last_change_km: 1000 },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === 'expenses') {
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [{ odometer_km: 3800 }] }),
              }),
            }),
          }),
        };
      }
      if (table === 'routes' || table === 'work_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        };
      }
      return {};
    });

    render(
      <BrowserRouter>
        <PartMaintenanceAlert />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/TROCA DE PEÇA PRÓXIMA: Óleo do Motor/i)).toBeInTheDocument();
    });
  });

  it('renders overdue alert when part exceeds 100% life', async () => {
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'part_maintenance') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { id: 'p1', part_name: 'Pastilha de Freio', life_km: 10000, last_change_km: 0 },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === 'expenses') {
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [{ odometer_km: 10500 }] }),
              }),
            }),
          }),
        };
      }
      if (table === 'routes' || table === 'work_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        };
      }
      return {};
    });

    render(
      <BrowserRouter>
        <PartMaintenanceAlert />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/MANUTENÇÃO ATRASADA: Pastilha de Freio/i)).toBeInTheDocument();
    });
  });
});
