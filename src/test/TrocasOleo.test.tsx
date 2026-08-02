import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TrocasOleo from '@/pages/TrocasOleo';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  },
}));

describe('TrocasOleo Page (Maintenance)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });
  });

  it('renders title and form correctly', async () => {
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'oil_changes') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
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
      <BrowserRouter>
        <TrocasOleo />
      </BrowserRouter>
    );

    expect(screen.getByText('TROCAS DE ÓLEO')).toBeInTheDocument();
    expect(screen.getByText('NOVA TROCA')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma troca registrada ainda.')).toBeInTheDocument();
  });

  it('submits a new oil change successfully and updates profile', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'oil_changes') {
        return {
          insert: insertMock,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: '1', changed_at: new Date().toISOString(), km_at_change: 45000, notes: 'troca sintética' },
                ],
              }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          update: updateMock,
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
      <BrowserRouter>
        <TrocasOleo />
      </BrowserRouter>
    );

    // Wait for initial load to finish setting userId
    await waitFor(() => {
      expect(supabase.auth.getUser).toHaveBeenCalled();
    });

    const kmInput = screen.getByPlaceholderText('Ex.: 45230');
    fireEvent.change(kmInput, { target: { value: '45000' } });

    const submitBtn = screen.getByRole('button', { name: /REGISTRAR TROCA/i });
    const form = submitBtn.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
      expect(updateMock).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Troca registrada');
    });
  });
});
