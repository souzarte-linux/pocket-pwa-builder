import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TotalDia from '@/pages/TotalDia';
import { supabase } from '@/integrations/supabase/client';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'sonner';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function createQueryMock(data: unknown = []) {
  const promise = Promise.resolve({ data, error: null });
  const mockObj: any = {
    then: (resolve: any, reject: any) => promise.then(resolve, reject),
    catch: (reject: any) => promise.catch(reject),
    eq: () => mockObj,
    neq: () => mockObj,
    not: () => mockObj,
    in: () => mockObj,
    isNull: () => mockObj,
    gte: () => mockObj,
    lte: () => mockObj,
    or: () => mockObj,
    order: () => mockObj,
    limit: () => mockObj,
    maybeSingle: () => Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null }),
  };
  return mockObj;
}

const mockPlatforms = [
  { id: 'plat-total-1', name: 'iFood Diária', active: true },
  { id: 'plat-total-2', name: 'Loggi Diária', active: true },
];

describe('TotalDia - Daily Total Recording and Route Deduction Flag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-daily-123' } },
    } as any);

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'platforms') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock(mockPlatforms)),
        } as any;
      }
      if (table === 'daily_totals') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });
  });

  it('renders form with default subtract_routes = true and submits daily total', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'platforms') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock(mockPlatforms)),
        } as any;
      }
      if (table === 'daily_totals') {
        return {
          insert: insertSpy,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <TotalDia />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('LANÇAR TOTAL DO DIA')).toBeDefined();
      expect(screen.getByText('iFood Diária')).toBeDefined();
    });

    // Enter Amount
    const amountInput = screen.getByPlaceholderText('Ex: 150,00');
    fireEvent.change(amountInput, { target: { value: '250,00' } });

    // Enter Distance
    const distanceInput = screen.getByPlaceholderText('Ex: 10,5');
    fireEvent.change(distanceInput, { target: { value: '45,5' } });

    // Click submit
    const submitBtn = screen.getByText('CONFIRMAR LANÇAMENTO ✓');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-daily-123',
          platform_id: 'plat-total-1',
          amount: 250,
          distance_km: 45.5,
          subtract_routes: true,
          product_type: 'alimento',
        })
      );
      expect(toast.success).toHaveBeenCalledWith('Total do dia registrado!');
    });
  });

  it('allows toggling subtract_routes to false and persists correctly', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'platforms') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock(mockPlatforms)),
        } as any;
      }
      if (table === 'daily_totals') {
        return {
          insert: insertSpy,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <TotalDia />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('LANÇAR TOTAL DO DIA'));

    // Toggle subtract_routes to NAO
    const naoBtn = screen.getByText('NÃO');
    fireEvent.click(naoBtn);

    // Select Pacotes product type
    const pacotesBtn = screen.getByText('Pacotes');
    fireEvent.click(pacotesBtn);

    // Enter Amount
    const amountInput = screen.getByPlaceholderText('Ex: 150,00');
    fireEvent.change(amountInput, { target: { value: '180,00' } });

    const submitBtn = screen.getByText('CONFIRMAR LANÇAMENTO ✓');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          subtract_routes: false,
          amount: 180,
          product_type: 'pacote',
        })
      );
      expect(toast.success).toHaveBeenCalledWith('Total do dia registrado!');
    });
  });

  it('handles Supabase insertion error gracefully', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: { message: 'Failed to insert daily total' } });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'platforms') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock(mockPlatforms)),
        } as any;
      }
      if (table === 'daily_totals') {
        return {
          insert: insertSpy,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <TotalDia />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('LANÇAR TOTAL DO DIA'));

    const amountInput = screen.getByPlaceholderText('Ex: 150,00');
    fireEvent.change(amountInput, { target: { value: '100,00' } });

    const submitBtn = screen.getByText('CONFIRMAR LANÇAMENTO ✓');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to insert daily total');
    });
  });
});
