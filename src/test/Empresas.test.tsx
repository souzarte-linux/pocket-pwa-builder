import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Empresas } from '@/pages/Empresas';
import * as useCompaniesModule from '@/hooks/queries/useCompanies';
import * as useCompanyMutationsModule from '@/hooks/mutations/useCompanyMutations';
import * as useAuthModule from '@/hooks/useAuth';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/queries/useCompanies', () => ({
  useCompanies: vi.fn(),
}));

vi.mock('@/hooks/mutations/useCompanyMutations', () => ({
  useCompanyMutations: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Empresas.tsx — Centralização de Empresas & Prestadoras', () => {
  const mockCreateCompany = vi.fn();
  const mockUpdateCompany = vi.fn();
  const mockDeleteCompany = vi.fn();
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' } as any,
      loading: false,
    } as any);

    vi.mocked(useCompanyMutationsModule.useCompanyMutations).mockReturnValue({
      createCompany: mockCreateCompany,
      isCreating: false,
      updateCompany: mockUpdateCompany,
      isUpdating: false,
      deleteCompany: mockDeleteCompany,
      isDeleting: false,
    } as any);
  });

  const renderEmpresas = () =>
    render(
      <BrowserRouter>
        <Empresas />
      </BrowserRouter>
    );

  it('Scenario A: loads and displays companies from public.companies via TanStack Query', () => {
    const mockCompanies = [
      {
        id: 'comp-1',
        name: 'Oficina do Silva Moto',
        category: 'Oficina Mecânica',
        phone: '11999998888',
        address: 'Rua das Flores, 100',
        number: null,
        complement: null,
        cep: null,
        cnpj: null,
        created_at: new Date().toISOString(),
        user_id: 'user-123',
      },
      {
        id: 'comp-2',
        name: 'Restaurante Sabor Express',
        category: 'Alimentação / Restaurante',
        phone: '11988887777',
        address: 'Av. Paulista, 500',
        number: null,
        complement: null,
        cep: null,
        cnpj: null,
        created_at: new Date().toISOString(),
        user_id: 'user-123',
      },
    ];

    vi.mocked(useCompaniesModule.useCompanies).mockReturnValue({
      data: mockCompanies,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as any);

    renderEmpresas();

    expect(screen.getByText('Oficina do Silva Moto')).toBeInTheDocument();
    expect(screen.getByText('Restaurante Sabor Express')).toBeInTheDocument();
    expect(screen.getByText('(11) 9.9999-8888')).toBeInTheDocument();
  });

  it('Scenario B: displays empty state when no companies are registered in the database', () => {
    vi.mocked(useCompaniesModule.useCompanies).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as any);

    renderEmpresas();

    expect(
      screen.getByText('Nenhuma prestadora de serviços cadastrada ainda.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Cadastrar Primeira Prestadora/i })
    ).toBeInTheDocument();
  });

  it('Scenario C: displays error state and allows retry when query fails', () => {
    vi.mocked(useCompaniesModule.useCompanies).mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    } as any);

    renderEmpresas();

    expect(
      screen.getByText('Falha ao carregar prestadoras de serviços.')
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Tentar novamente/i });
    fireEvent.click(retryBtn);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('Scenario D: creates new company with correct category and triggers mutation', async () => {
    vi.mocked(useCompaniesModule.useCompanies).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as any);

    mockCreateCompany.mockResolvedValue({ id: 'comp-new', name: 'Nova Oficina Pro' });

    renderEmpresas();

    // Open add modal
    const openAddBtn = screen.getByTitle('Cadastrar Nova Empresa');
    fireEvent.click(openAddBtn);

    expect(screen.getByText('Nova Prestadora de Serviços')).toBeInTheDocument();

    // Fill form
    const nameInput = screen.getByPlaceholderText('Ex: Oficina Mecânica MotoSpeed');
    fireEvent.change(nameInput, { target: { value: 'Nova Oficina Pro' } });

    const phoneInput = screen.getByPlaceholderText('(00) 0.0000-0000');
    fireEvent.change(phoneInput, { target: { value: '11977776666' } });

    const addrInput = screen.getByPlaceholderText('Av. Paulista, 1000 - SP');
    fireEvent.change(addrInput, { target: { value: 'Rua Nova, 123' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /^Cadastrar$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateCompany).toHaveBeenCalledWith({
        user_id: 'user-123',
        name: 'Nova Oficina Pro',
        category: 'Oficina Mecânica',
        phone: '11977776666',
        address: 'Rua Nova, 123',
      });
    });
  });

  it('Scenario E: edits existing company and triggers updateCompany mutation', async () => {
    const mockCompanies = [
      {
        id: 'comp-1',
        name: 'Oficina Original',
        category: 'Oficina Mecânica',
        phone: '11999998888',
        address: 'Rua Original, 10',
        created_at: new Date().toISOString(),
        user_id: 'user-123',
      },
    ];

    vi.mocked(useCompaniesModule.useCompanies).mockReturnValue({
      data: mockCompanies,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as any);

    mockUpdateCompany.mockResolvedValue({ id: 'comp-1', name: 'Oficina Modificada' });

    renderEmpresas();

    const editBtn = screen.getByTitle('Editar Empresa');
    fireEvent.click(editBtn);

    expect(screen.getByText('Editar Prestadora de Serviços')).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue('Oficina Original');
    fireEvent.change(nameInput, { target: { value: 'Oficina Modificada' } });

    const saveBtn = screen.getByRole('button', { name: /Salvar Alterações/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateCompany).toHaveBeenCalledWith({
        id: 'comp-1',
        payload: {
          name: 'Oficina Modificada',
          category: 'Oficina Mecânica',
          phone: '11999998888',
          address: 'Rua Original, 10',
        },
      });
    });
  });

  it('Scenario F: deletes company when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const mockCompanies = [
      {
        id: 'comp-delete-1',
        name: 'Oficina para Excluir',
        category: 'Oficina Mecânica',
        created_at: new Date().toISOString(),
        user_id: 'user-123',
      },
    ];

    vi.mocked(useCompaniesModule.useCompanies).mockReturnValue({
      data: mockCompanies,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as any);

    mockDeleteCompany.mockResolvedValue(undefined);

    renderEmpresas();

    const deleteBtn = screen.getByTitle('Remover Empresa');
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith('Deseja remover "Oficina para Excluir"?');
    await waitFor(() => {
      expect(mockDeleteCompany).toHaveBeenCalledWith('comp-delete-1');
    });
  });

  it('Scenario G: filters companies by search term and category', () => {
    const mockCompanies = [
      {
        id: 'comp-1',
        name: 'Oficina Alpha',
        category: 'Oficina Mecânica',
        created_at: new Date().toISOString(),
        user_id: 'user-123',
      },
      {
        id: 'comp-2',
        name: 'Restaurante Beta',
        category: 'Alimentação / Restaurante',
        created_at: new Date().toISOString(),
        user_id: 'user-123',
      },
    ];

    vi.mocked(useCompaniesModule.useCompanies).mockReturnValue({
      data: mockCompanies,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as any);

    renderEmpresas();

    expect(screen.getByText('Oficina Alpha')).toBeInTheDocument();
    expect(screen.getByText('Restaurante Beta')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('Buscar por nome, categoria ou endereço...');
    fireEvent.change(searchInput, { target: { value: 'Alpha' } });

    expect(screen.getByText('Oficina Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Restaurante Beta')).not.toBeInTheDocument();
  });
});
