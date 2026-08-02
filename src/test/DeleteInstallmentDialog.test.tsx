import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteInstallmentDialog } from '@/components/forms/DeleteInstallmentDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DeleteInstallmentDialog Component', () => {
  const onOpenChange = vi.fn();
  const onDeleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Step 1 with options to delete single or more installments', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 'inst-1', title: 'Pneu', amount: 100, installment_number: 1, installment_total: 3, occurred_at: '2026-08-01' },
              { id: 'inst-2', title: 'Pneu', amount: 100, installment_number: 2, installment_total: 3, occurred_at: '2026-09-01' },
              { id: 'inst-3', title: 'Pneu', amount: 100, installment_number: 3, installment_total: 3, occurred_at: '2026-10-01' },
            ],
            error: null,
          }),
        }),
      }),
    });

    render(
      <DeleteInstallmentDialog
        open={true}
        onOpenChange={onOpenChange}
        currentExpenseId="inst-2"
        installmentGroupId="group-1"
        onDeleted={onDeleted}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Excluir Despesa Parcelada')).toBeInTheDocument();
      expect(screen.getByText(/APAGAR SOMENTE ESTA PARCELA/i)).toBeInTheDocument();
      expect(screen.getByText(/APAGAR MAIS PARCELAS…/i)).toBeInTheDocument();
    });
  });

  it('advances to Step 2 when clicking "APAGAR MAIS PARCELAS…"', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 'inst-1', title: 'Pneu', amount: 100, installment_number: 1, installment_total: 3, occurred_at: '2026-08-01' },
              { id: 'inst-2', title: 'Pneu', amount: 100, installment_number: 2, installment_total: 3, occurred_at: '2026-09-01' },
              { id: 'inst-3', title: 'Pneu', amount: 100, installment_number: 3, installment_total: 3, occurred_at: '2026-10-01' },
            ],
            error: null,
          }),
        }),
      }),
    });

    render(
      <DeleteInstallmentDialog
        open={true}
        onOpenChange={onOpenChange}
        currentExpenseId="inst-2"
        installmentGroupId="group-1"
        onDeleted={onDeleted}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/APAGAR MAIS PARCELAS…/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/APAGAR MAIS PARCELAS…/i));

    await waitFor(() => {
      expect(screen.getByText('Escolha as Parcelas a Excluir')).toBeInTheDocument();
      expect(screen.getByText(/APAGAR A PARCELA ATUAL E AS FUTURAS/i)).toBeInTheDocument();
      expect(screen.getByText(/APAGAR A PARCELA ATUAL, AS JÁ PAGAS E AS FUTURAS/i)).toBeInTheDocument();
    });
  });

  it('hides all-inclusive delete option when current installment is the first (installment_number = 1)', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 'inst-1', title: 'Pneu', amount: 100, installment_number: 1, installment_total: 3, occurred_at: '2026-08-01' },
              { id: 'inst-2', title: 'Pneu', amount: 100, installment_number: 2, installment_total: 3, occurred_at: '2026-09-01' },
              { id: 'inst-3', title: 'Pneu', amount: 100, installment_number: 3, installment_total: 3, occurred_at: '2026-10-01' },
            ],
            error: null,
          }),
        }),
      }),
    });

    render(
      <DeleteInstallmentDialog
        open={true}
        onOpenChange={onOpenChange}
        currentExpenseId="inst-1"
        installmentGroupId="group-1"
        onDeleted={onDeleted}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/APAGAR MAIS PARCELAS…/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/APAGAR MAIS PARCELAS…/i));

    await waitFor(() => {
      expect(screen.getByText(/APAGAR A PARCELA ATUAL E AS FUTURAS/i)).toBeInTheDocument();
      expect(screen.queryByText(/APAGAR A PARCELA ATUAL, AS JÁ PAGAS E AS FUTURAS/i)).not.toBeInTheDocument();
    });
  });
});
