import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Despesa from '@/pages/Despesa';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

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
  },
}));

describe('Despesa Page - Manutenção', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });
  });

  it('renders maintenance expense form and submits maintenance expense', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const upsertMock = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'companies') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [{ name: 'OFICINA VELOCITY' }] }),
          }),
        };
      }
      if (table === 'expenses') {
        return {
          insert: insertMock,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [] }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'part_maintenance') {
        return {
          upsert: upsertMock,
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }
      return {};
    });

    render(
      <MemoryRouter initialEntries={['/despesa/manutencao']}>
        <Routes>
          <Route path="/despesa/:categoria" element={<Despesa />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('LANÇAR MANUTENÇÃO')).toBeInTheDocument();
    expect(screen.getByText('Empresa')).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText('Ex: Troca de óleo, pastilha de freio');
    fireEvent.change(titleInput, { target: { value: 'Troca de óleo' } });

    const amountInput = screen.getByPlaceholderText('R$ 0,00');
    fireEvent.change(amountInput, { target: { value: '15000' } }); // R$ 150,00

    const submitBtn = screen.getByRole('button', { name: /SALVAR DESPESA/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Despesa registrada!');
    });
  });
});
