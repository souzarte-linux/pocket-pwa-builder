import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Faturas from '@/pages/Faturas';
import { supabase } from '@/integrations/supabase/client';
import { BrowserRouter } from 'react-router-dom';
import * as billingModule from '@/lib/billing';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn(),
  },
}));

function createQueryMock(data: any = []) {
  const promise = Promise.resolve({ data, error: null });
  const mockObj: any = {
    then: (resolve: any, reject: any) => promise.then(resolve, reject),
    catch: (reject: any) => promise.catch(reject),
    select: vi.fn().mockImplementation(() => mockObj),
    eq: vi.fn().mockImplementation(() => mockObj),
    neq: vi.fn().mockImplementation(() => mockObj),
    in: vi.fn().mockImplementation(() => mockObj),
    isNull: vi.fn().mockImplementation(() => mockObj),
    gte: vi.fn().mockImplementation(() => mockObj),
    lte: vi.fn().mockImplementation(() => mockObj),
    or: vi.fn().mockImplementation(() => mockObj),
    order: vi.fn().mockImplementation(() => mockObj),
    limit: vi.fn().mockImplementation(() => mockObj),
    single: vi.fn().mockImplementation(() => Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null })),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null })),
  };
  return mockObj;
}

describe('Faturas.tsx - Invoice Management & Adjustments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });
  });

  const getBaseMockImplementation = (table: string) => {
    if (table === 'notifications' || table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      };
    }
    return null;
  };

  it('renders Faturas page correctly and loads cycle lists', async () => {
    (supabase.from as any).mockImplementation((table: string) => {
      const base = getBaseMockImplementation(table);
      if (base) return base;

      if (table === 'platforms') {
        return {
          select: vi.fn().mockReturnValue(
            createQueryMock([
              { id: 'p-1', name: 'Loggi', active: true, billing_frequency: 'semanal', weekly_closing_day: 0, payment_delay_days: 2 },
            ])
          ),
        };
      }
      if (table === 'billing_cycles') {
        return {
          select: vi.fn().mockReturnValue(
            createQueryMock([
              {
                id: 'c-1',
                platform_id: 'p-1',
                period_start: '2026-08-01T00:00:00',
                period_end: '2026-08-07T23:59:59',
                expected_payment_date: '2026-08-09',
                status: 'open',
                platforms: { name: 'Loggi' },
              },
            ])
          ),
        };
      }
      if (table === 'routes' || table === 'daily_totals' || table === 'financial_adjustments') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
        };
      }
      return { select: vi.fn().mockReturnValue(createQueryMock([])) };
    });

    render(
      <BrowserRouter>
        <Faturas />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /FATURAS/i })).toBeInTheDocument();
    });
  });

  it('does NOT create a cycle if there are no unassociated records in the period (regression 6.2)', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });

    (supabase.from as any).mockImplementation((table: string) => {
      const base = getBaseMockImplementation(table);
      if (base) return base;

      if (table === 'platforms') {
        return {
          select: vi.fn().mockReturnValue(
            createQueryMock([
              { id: 'p-1', name: 'Loggi', active: true, billing_frequency: 'semanal', weekly_closing_day: 0, payment_delay_days: 2 },
            ])
          ),
        };
      }
      if (table === 'billing_cycles') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
          insert: insertSpy,
        };
      }
      if (table === 'routes' || table === 'daily_totals' || table === 'financial_adjustments') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
        };
      }
      return { select: vi.fn().mockReturnValue(createQueryMock([])) };
    });

    render(
      <BrowserRouter>
        <Faturas />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(insertSpy).not.toHaveBeenCalled();
    });
  });

  it('only considers active platforms for automatic cycle generation', async () => {
    (supabase.from as any).mockImplementation((table: string) => {
      const base = getBaseMockImplementation(table);
      if (base) return base;

      if (table === 'platforms') {
        return {
          select: vi.fn().mockReturnValue(
            createQueryMock([
              { id: 'p-inactive', name: 'Inativa Express', active: false, billing_frequency: 'semanal', weekly_closing_day: 0, payment_delay_days: 2 },
            ])
          ),
        };
      }
      if (table === 'billing_cycles') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
        };
      }
      if (table === 'routes' || table === 'daily_totals' || table === 'financial_adjustments') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([{ id: 'r-1' }])),
        };
      }
      return { select: vi.fn().mockReturnValue(createQueryMock([])) };
    });

    render(
      <BrowserRouter>
        <Faturas />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Inativa Express')).toBeNull();
    });
  });

  it('blocks saveEdit when checkOverlap detects conflict', async () => {
    vi.spyOn(billingModule, 'checkOverlap').mockResolvedValue({
      hasOverlap: true,
      conflictingCycle: {
        id: 'c-conflict',
        platform_id: 'p-1',
        period_start: '2026-08-01T00:00:00',
        period_end: '2026-08-07T23:59:59',
        expected_payment_date: '2026-08-09',
        status: 'open',
        platform_name: 'Loggi',
      },
    });

    const updateSpy = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockImplementation((table: string) => {
      const base = getBaseMockImplementation(table);
      if (base) return base;

      if (table === 'platforms') {
        return { select: vi.fn().mockReturnValue(createQueryMock([{ id: 'p-1', name: 'Loggi', active: true }])) };
      }
      if (table === 'billing_cycles') {
        return {
          select: vi.fn().mockReturnValue(
            createQueryMock([
              {
                id: 'c-1',
                platform_id: 'p-1',
                period_start: '2026-08-01',
                period_end: '2026-08-07',
                expected_payment_date: '2026-08-09',
                status: 'open',
                platforms: { name: 'Loggi' },
              },
            ])
          ),
          update: updateSpy,
        };
      }
      if (table === 'routes' || table === 'daily_totals' || table === 'financial_adjustments') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
        };
      }
      return { select: vi.fn().mockReturnValue(createQueryMock([])) };
    });

    render(
      <BrowserRouter>
        <Faturas />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Loggi').length).toBeGreaterThan(1);
    });

    const cycleElements = screen.getAllByText('Loggi');
    const cardTitle = cycleElements[cycleElements.length - 1];
    
    // Click card to open Details Modal
    fireEvent.click(cardTitle);

    // Wait for Details Modal and click Editar Fatura
    await waitFor(() => screen.getByText('DETALHES DA FATURA'));
    const editBtnInModal = screen.getByRole('button', { name: /Editar Fatura/i });
    fireEvent.click(editBtnInModal);

    await waitFor(() => screen.getByText(/Descontos & Acréscimos/i));
    const saveBtn = screen.getByText('SALVAR ALTERAÇÕES');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  it('saves discounts/additions in financial_adjustments and pre-fills on openEdit', async () => {
    vi.spyOn(billingModule, 'checkOverlap').mockResolvedValue({
      hasOverlap: false,
      conflictingCycle: null,
    });

    const deleteSpy = vi.fn().mockReturnValue(createQueryMock([]));
    const insertSpy = vi.fn().mockResolvedValue({ data: [], error: null });

    (supabase.from as any).mockImplementation((table: string) => {
      const base = getBaseMockImplementation(table);
      if (base) return base;

      if (table === 'platforms') {
        return { select: vi.fn().mockReturnValue(createQueryMock([{ id: 'p-1', name: 'Loggi', active: true }])) };
      }
      if (table === 'billing_cycles') {
        return {
          select: vi.fn().mockReturnValue(
            createQueryMock([
              {
                id: 'c-1',
                platform_id: 'p-1',
                period_start: '2026-08-01',
                period_end: '2026-08-07',
                expected_payment_date: '2026-08-09',
                status: 'open',
                platforms: { name: 'Loggi' },
              },
            ])
          ),
          update: vi.fn().mockReturnValue(createQueryMock([])),
        };
      }
      if (table === 'financial_adjustments') {
        return {
          select: vi.fn().mockReturnValue(
            createQueryMock([
              { type: 'previdenciario', amount: -50 },
              { type: 'bonus_fatura', amount: 100 },
            ])
          ),
          update: vi.fn().mockReturnValue(createQueryMock([])),
          delete: deleteSpy,
          insert: insertSpy,
        };
      }
      if (table === 'routes' || table === 'daily_totals') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
          update: vi.fn().mockReturnValue(createQueryMock([])),
        };
      }
      return { select: vi.fn().mockReturnValue(createQueryMock([])) };
    });

    render(
      <BrowserRouter>
        <Faturas />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Loggi').length).toBeGreaterThan(1);
    });

    const cycleElements = screen.getAllByText('Loggi');
    const cardTitle = cycleElements[cycleElements.length - 1];
    
    // Click card to open Details Modal
    fireEvent.click(cardTitle);

    // Wait for Details Modal and click Editar Fatura
    await waitFor(() => screen.getByText('DETALHES DA FATURA'));
    const editBtnInModal = screen.getByRole('button', { name: /Editar Fatura/i });
    fireEvent.click(editBtnInModal);

    await waitFor(() => screen.getByText(/Descontos & Acréscimos/i));

    const prevLabel = screen.getByText('Previdenciário');
    const prevInput = (prevLabel.parentElement?.querySelector('input') as HTMLInputElement)!;
    expect(prevInput.value.replace(/\s/g, ' ')).toBe('R$ 50,00');

    const bonusLabel = screen.getByText('Bônus de Fatura');
    const bonusInput = (bonusLabel.parentElement?.querySelector('input') as HTMLInputElement)!;
    expect(bonusInput.value.replace(/\s/g, ' ')).toBe('R$ 100,00');

    const saveBtn = screen.getByText('SALVAR ALTERAÇÕES');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalled();
      expect(insertSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'previdenciario', amount: -50 }),
          expect.objectContaining({ type: 'bonus_fatura', amount: 100 }),
        ])
      );
    });
  });
});
