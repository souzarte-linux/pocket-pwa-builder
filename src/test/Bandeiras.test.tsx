import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Bandeiras } from '@/pages/Bandeiras';
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
  const mockObj: Record<string, unknown> = {
    then: (resolve: (v: { data: unknown; error: null }) => unknown, reject?: (r: unknown) => unknown) => promise.then(resolve, reject),
    catch: (reject: (r: unknown) => unknown) => promise.catch(reject),
    eq: vi.fn().mockImplementation(() => mockObj),
    neq: vi.fn().mockImplementation(() => mockObj),
    in: vi.fn().mockImplementation(() => mockObj),
    isNull: vi.fn().mockImplementation(() => mockObj),
    gte: vi.fn().mockImplementation(() => mockObj),
    lte: vi.fn().mockImplementation(() => mockObj),
    or: vi.fn().mockImplementation(() => mockObj),
    order: vi.fn().mockImplementation(() => mockObj),
    limit: vi.fn().mockImplementation(() => mockObj),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null })),
  };
  return mockObj;
}

describe('Bandeiras Page - CRUD & Real Database Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-brands-123' } },
    } as any);
  });

  it('renders empty state with CTA when no brands are saved in DB', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'card_operators') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <Bandeiras />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nenhuma bandeira cadastrada')).toBeDefined();
    });

    expect(screen.getByText('Cadastrar Primeira Bandeira')).toBeDefined();
  });

  it('loads and lists persisted brands from database', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'card_operators') {
        return {
          select: vi.fn().mockReturnValue(
            createQueryMock([
              { id: 'b-1', name: 'Mastercard Black', card_due_day: 15, user_id: 'user-brands-123' },
              { id: 'b-2', name: 'Visa Infinite', card_due_day: 10, user_id: 'user-brands-123' },
            ])
          ),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <Bandeiras />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Mastercard Black')).toBeDefined();
      expect(screen.getByText('Visa Infinite')).toBeDefined();
    });
  });

  it('creates new brand and persists to card_operators', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'card_operators') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
          insert: insertSpy,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <Bandeiras />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nova Bandeira')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Nova Bandeira'));

    const nameInput = screen.getByPlaceholderText('Ex: Sodexo, Caju, Hiper');
    fireEvent.change(nameInput, { target: { value: 'Elo Nanquim' } });

    fireEvent.click(screen.getByText('Cadastrar Bandeira'));

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Elo Nanquim',
          user_id: 'user-brands-123',
        })
      );
      expect(toast.success).toHaveBeenCalledWith('Bandeira "Elo Nanquim" cadastrada com sucesso!');
    });
  });

  it('handles creation error gracefully', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: { message: 'Database connection failed' } });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'card_operators') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
          insert: insertSpy,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <Bandeiras />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('Nova Bandeira'));
    fireEvent.click(screen.getByText('Nova Bandeira'));

    const nameInput = screen.getByPlaceholderText('Ex: Sodexo, Caju, Hiper');
    fireEvent.change(nameInput, { target: { value: 'Elo Nanquim' } });

    fireEvent.click(screen.getByText('Cadastrar Bandeira'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao cadastrar bandeira: Database connection failed');
    });
  });

  it('edits existing brand and updates Supabase', async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'card_operators') {
        return {
          select: vi.fn().mockReturnValue(
            createQueryMock([
              { id: 'b-1', name: 'Mastercard', card_due_day: 10, user_id: 'user-brands-123' },
            ])
          ),
          update: updateSpy,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <Bandeiras />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('Mastercard'));

    const editBtn = screen.getByTitle('Editar Bandeira');
    fireEvent.click(editBtn);

    const editModal = screen.getByText('Editar Bandeira');
    expect(editModal).toBeDefined();

    const nameInput = screen.getByDisplayValue('Mastercard');
    fireEvent.change(nameInput, { target: { value: 'Mastercard Platinum' } });

    fireEvent.click(screen.getByText('Salvar Alterações'));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Mastercard Platinum',
        })
      );
      expect(toast.success).toHaveBeenCalledWith('Bandeira atualizada com sucesso!');
    });
  });

  it('deletes brand and removes from Supabase', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const deleteSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'card_operators') {
        return {
          select: vi.fn().mockReturnValue(
            createQueryMock([
              { id: 'b-1', name: 'Mastercard', card_due_day: 10, user_id: 'user-brands-123' },
            ])
          ),
          delete: deleteSpy,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <Bandeiras />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('Mastercard'));

    const deleteBtn = screen.getByTitle('Remover Bandeira');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Bandeira removida com sucesso!');
    });
  });
});
