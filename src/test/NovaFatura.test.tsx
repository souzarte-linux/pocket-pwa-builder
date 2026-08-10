import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NovaFatura from '@/pages/NovaFatura';
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
    update: vi.fn().mockImplementation(() => mockObj),
    insert: vi.fn().mockImplementation(() => mockObj),
    single: vi.fn().mockImplementation(() => Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null })),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null })),
  };
  return mockObj;
}

describe('NovaFatura.tsx - Manual Invoice Creation Overlap Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } },
    } as any);
  });

  it('blocks creation of manual invoice when checkOverlap returns conflict', async () => {
    vi.spyOn(billingModule, 'checkOverlap').mockResolvedValue({
      hasOverlap: true,
      conflictingCycle: {
        id: 'c-exist',
        platform_id: 'p-1',
        period_start: '2026-08-01T00:00:00',
        period_end: '2026-08-07T23:59:59',
        expected_payment_date: '2026-08-09',
        status: 'open',
        platform_name: 'Loggi',
      },
    });

    const insertCycleSpy = vi.fn().mockReturnValue(createQueryMock({ id: 'c-1' }));

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'platforms') {
        return createQueryMock([{ id: 'p-1', name: 'Loggi', active: true }]) as any;
      }
      if (table === 'billing_cycles') {
        return { insert: insertCycleSpy } as any;
      }
      return createQueryMock([]) as any;
    });

    render(
      <BrowserRouter>
        <NovaFatura />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByRole('button', { name: /GERAR FATURA E VINCULAR CORRIDAS/i }));

    const select = screen.getByDisplayValue('Loggi');
    fireEvent.change(select, { target: { value: 'p-1' } });

    const submitBtn = screen.getByRole('button', { name: /GERAR FATURA E VINCULAR CORRIDAS/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(insertCycleSpy).not.toHaveBeenCalled();
    });
  });

  it('creates manual invoice and links transactions when valid', async () => {
    vi.spyOn(billingModule, 'checkOverlap').mockResolvedValue({
      hasOverlap: false,
      conflictingCycle: null,
    });

    const createdCycle = { id: 'c-created', platform_id: 'p-1', status: 'pending' };
    const insertCycleSpy = vi.fn().mockReturnValue(createQueryMock(createdCycle));

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'platforms') {
        return createQueryMock([{ id: 'p-1', name: 'Loggi', active: true }]) as any;
      }
      if (table === 'billing_cycles') {
        return {
          insert: insertCycleSpy,
        } as any;
      }
      if (table === 'routes' || table === 'daily_totals' || table === 'financial_adjustments') {
        return createQueryMock([]) as any;
      }
      return createQueryMock([]) as any;
    });

    render(
      <BrowserRouter>
        <NovaFatura />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByDisplayValue('Loggi')).toBeInTheDocument());

    const select = screen.getByDisplayValue('Loggi');
    fireEvent.change(select, { target: { value: 'p-1' } });

    const submitBtn = screen.getByRole('button', { name: /GERAR FATURA E VINCULAR CORRIDAS/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(insertCycleSpy).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('routes');
    });
  });
});
