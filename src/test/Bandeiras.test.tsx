import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
    select: vi.fn().mockImplementation(() => mockObj),
    single: vi.fn().mockImplementation(() => Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null })),
    eq: vi.fn().mockImplementation(() => mockObj),
    neq: vi.fn().mockImplementation(() => mockObj),
    in: vi.fn().mockImplementation(() => mockObj),
    isNull: vi.fn().mockImplementation(() => mockObj),
    gte: vi.fn().mockImplementation(() => mockObj),
    lte: vi.fn().mockImplementation(() => mockObj),
    or: vi.fn().mockImplementation(() => mockObj),
    order: vi.fn().mockImplementation(() => mockObj),
    limit: vi.fn().mockImplementation(() => mockObj),
  };
  return mockObj;
}

describe('Bandeiras Page - CRUD & Real Database Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-brands-123' } },
    } as any);

    vi.mocked(supabase.from).mockImplementation(() => {
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });
  });

  it('renders header, banner and default supported card brands', async () => {
    render(
      <BrowserRouter>
        <Bandeiras />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('BANDEIRAS DE CARTÃO')).toBeDefined();
      expect(screen.getByText('Bandeiras Suportadas')).toBeDefined();
      expect(screen.getByText('Visa')).toBeDefined();
      expect(screen.getByText('Mastercard')).toBeDefined();
    });

    expect(screen.getByTitle('Cadastrar Nova Bandeira')).toBeDefined();
    expect(screen.getAllByTitle('Remover Bandeira').length).toBeGreaterThan(0);
  });

  it('loads and lists supported brands with issuer information', async () => {
    render(
      <BrowserRouter>
        <Bandeiras />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Mastercard')).toBeDefined();
      expect(screen.getByText('Visa')).toBeDefined();
      expect(screen.getByText('Elo')).toBeDefined();
      expect(screen.getByText('Hipercard')).toBeDefined();
    });

    expect(screen.getAllByTitle('Editar Bandeira').length).toBe(10);
    expect(screen.getAllByTitle('Remover Bandeira').length).toBe(10);
  });

  it('creates new brand and persists to card_operators', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: { id: 'b-new-123' }, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertSpy = vi.fn().mockReturnValue({ select: selectMock });

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
      expect(screen.getByTitle('Cadastrar Nova Bandeira')).toBeDefined();
    });

    fireEvent.click(screen.getByTitle('Cadastrar Nova Bandeira'));

    const nameInput = screen.getByPlaceholderText('Ex: JCB / Discover');
    fireEvent.change(nameInput, { target: { value: 'Elo Nanquim' } });

    fireEvent.click(screen.getByText('Cadastrar'));

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Elo Nanquim',
          user_id: 'user-brands-123',
        })
      );
      expect(toast.success).toHaveBeenCalledWith('Bandeira "Elo Nanquim" adicionada com sucesso!');
      expect(screen.getByText('Elo Nanquim')).toBeDefined();
    });
  });

  it('validates duplicate brand name and prevents duplicate creation', async () => {
    render(
      <BrowserRouter>
        <Bandeiras />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByTitle('Cadastrar Nova Bandeira'));
    fireEvent.click(screen.getByTitle('Cadastrar Nova Bandeira'));

    const nameInput = screen.getByPlaceholderText('Ex: JCB / Discover');
    fireEvent.change(nameInput, { target: { value: 'Mastercard' } });

    fireEvent.click(screen.getByText('Cadastrar'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Esta bandeira já está cadastrada.');
    });
  });

  it('edits existing brand and updates Supabase', async () => {
    const eqSpy = vi.fn().mockResolvedValue({ error: null });
    const updateSpy = vi.fn().mockReturnValue({ eq: eqSpy });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'card_operators') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
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

    const editButtons = screen.getAllByTitle('Editar Bandeira');
    fireEvent.click(editButtons[1]); 

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
      expect(eqSpy).toHaveBeenCalledWith('id', '2');
      expect(toast.success).toHaveBeenCalledWith('Bandeira atualizada com sucesso!');
      expect(screen.getByText('Mastercard Platinum')).toBeDefined();
    });
  });

  it('deletes brand and removes from Supabase', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const eqSpy = vi.fn().mockResolvedValue({ error: null });
    const deleteSpy = vi.fn().mockReturnValue({ eq: eqSpy });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'card_operators') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
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

    const card = screen.getByText('Mastercard').closest('.bg-\\[\\#1c1b1b\\]')!;
    const deleteBtn = within(card as HTMLElement).getByTitle('Remover Bandeira');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalled();
      expect(eqSpy).toHaveBeenCalledWith('id', '2');
      expect(toast.success).toHaveBeenCalledWith('Bandeira removida com sucesso!');
      expect(screen.queryByText('Mastercard')).toBeNull();
    });
  });
});
