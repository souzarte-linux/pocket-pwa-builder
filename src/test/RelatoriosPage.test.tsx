import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Relatorios from '@/pages/Relatorios';
import { supabase } from '@/integrations/supabase/client';
import { BrowserRouter } from 'react-router-dom';

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

const todayIso = new Date().toISOString();

describe('RelatoriosPage - Financial and Operational Reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-rel-1' } },
    } as any);

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'routes') {
        return {
          select: vi.fn().mockReturnValue(
            createQueryMock([
              {
                id: 'route-r-1',
                amount: 450,
                tip: 25,
                distance_km: 120,
                package_count: 35,
                product_type: 'pacote',
                occurred_at: todayIso,
                started_at: todayIso,
                ended_at: todayIso,
              },
            ])
          ),
        } as any;
      }
      if (table === 'expenses') {
        return {
          select: vi.fn().mockReturnValue(
            createQueryMock([
              {
                id: 'exp-r-1',
                amount: 100,
                category: 'combustivel',
                liters: 17,
                occurred_at: todayIso,
              },
            ])
          ),
        } as any;
      }
      if (table === 'daily_totals') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
        } as any;
      }
      if (table === 'platforms') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([{ id: 'p1', name: 'Loggi', active: true }])),
        } as any;
      }
      if (table === 'billing_cycles') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
        } as any;
      }
      if (table === 'financial_adjustments') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
        } as any;
      }
      if (table === 'part_maintenance') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
        } as any;
      }
      if (table === 'oil_changes') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });
  });

  it('renders reports page with aggregated gross revenue, expenses and net balance', async () => {
    render(
      <BrowserRouter>
        <Relatorios />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Receita Bruta')).toBeDefined();
      expect(screen.getByText('Lucro Líquido')).toBeDefined();
    });
  });

  it('switches report period dropdown (Dia, Semana, Quinzena, Mês, Ano)', async () => {
    render(
      <BrowserRouter>
        <Relatorios />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('Receita Bruta'));

    // Open period dropdown (currently "Semana")
    const dropdownToggle = screen.getByText('Semana');
    fireEvent.click(dropdownToggle);

    // Select "Mês"
    const mesOption = screen.getByText('Mês');
    fireEvent.click(mesOption);

    await waitFor(() => {
      expect(screen.getByText('Mês')).toBeDefined();
    });
  });

  it('handles empty data state safely without NaN or division by zero', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <Relatorios />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Receita Bruta')).toBeDefined();
      expect(screen.queryByText(/NaN/i)).toBeNull();
      expect(screen.queryByText(/Infinity/i)).toBeNull();
    });
  });
});
