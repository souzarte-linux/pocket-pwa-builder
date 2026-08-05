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
    eq: vi.fn().mockImplementation(() => mockObj),
    neq: vi.fn().mockImplementation(() => mockObj),
    in: vi.fn().mockImplementation(() => mockObj),
    isNull: vi.fn().mockImplementation(() => mockObj),
    gte: vi.fn().mockImplementation(() => mockObj),
    lte: vi.fn().mockImplementation(() => mockObj),
    or: vi.fn().mockImplementation(() => mockObj),
    order: vi.fn().mockImplementation(() => mockObj),
    limit: vi.fn().mockImplementation(() => mockObj),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: data?.[0] ?? null, error: null })),
  };
  return mockObj;
}

describe('NovaFatura.tsx - Manual Invoice Creation Overlap Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });
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

    const insertCycleSpy = vi.fn();

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'platforms') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([{ id: 'p-1', name: 'Loggi', active: true }])),
        };
      }
      if (table === 'billing_cycles') {
        return { insert: insertCycleSpy };
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      };
    });

    render(
      <BrowserRouter>
        <NovaFatura />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('GERAR FATURA E VINCULAR CORRIDAS ›'));

    const submitBtn = screen.getByText('GERAR FATURA E VINCULAR CORRIDAS ›');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(insertCycleSpy).not.toHaveBeenCalled();
    });
  });
});
