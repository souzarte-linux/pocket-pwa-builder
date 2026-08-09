import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfirmCycleModal } from '@/components/faturas/ConfirmCycleModal';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
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

describe('ConfirmCycleModal.tsx - Notification and Cycle Confirmation', () => {
  const mockCycle = {
    id: 'cycle-101',
    platform_id: 'p-1',
    platform_name: 'Loggi',
    period_start: '2026-08-01',
    period_end: '2026-08-07',
    expected_payment_date: '2026-08-09',
    status: 'pendente_confirmacao',
    total_amount: 450,
  };

  const onCloseMock = vi.fn();
  const onSuccessMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with cycle details and calls supabase to confirm cycle', async () => {
    const cycleUpdateSpy = vi.fn().mockReturnValue(createQueryMock([]));
    const notifUpdateSpy = vi.fn().mockReturnValue(createQueryMock([]));

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'billing_cycles') {
        return { update: cycleUpdateSpy };
      }
      if (table === 'notifications') {
        return { update: notifUpdateSpy };
      }
      return { select: vi.fn().mockReturnValue(createQueryMock([])) };
    });

    render(
      <ConfirmCycleModal
        cycle={mockCycle}
        notificationId="notif-1"
        onClose={onCloseMock}
        onSuccess={onSuccessMock}
      />
    );

    expect(screen.getByText('CONFIRMAR FATURA GERADA')).toBeInTheDocument();
    expect(screen.getByText('Loggi')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /CONFIRMAR VALORES/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(cycleUpdateSpy).toHaveBeenCalledWith({ status: 'open' });
      expect(notifUpdateSpy).toHaveBeenCalledWith({ read: true });
      expect(onSuccessMock).toHaveBeenCalled();
    });
  });

  it('marks notification as read without changing cycle status on "Fechar sem confirmar"', async () => {
    const cycleUpdateSpy = vi.fn().mockReturnValue(createQueryMock([]));
    const notifUpdateSpy = vi.fn().mockReturnValue(createQueryMock([]));

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'billing_cycles') {
        return { update: cycleUpdateSpy };
      }
      if (table === 'notifications') {
        return { update: notifUpdateSpy };
      }
      return { select: vi.fn().mockReturnValue(createQueryMock([])) };
    });

    render(
      <ConfirmCycleModal
        cycle={mockCycle}
        notificationId="notif-1"
        onClose={onCloseMock}
        onSuccess={onSuccessMock}
      />
    );

    const closeBtn = screen.getByText('FECHAR SEM CONFIRMAR');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(cycleUpdateSpy).not.toHaveBeenCalled();
      expect(notifUpdateSpy).toHaveBeenCalledWith({ read: true });
      expect(onCloseMock).toHaveBeenCalled();
    });
  });
});
