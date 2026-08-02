import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompanyDialog } from '@/components/forms/CompanyDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
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

describe('CompanyDialog', () => {
  const onOpenChange = vi.fn();
  const onCompanyCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(
      <CompanyDialog
        open={true}
        onOpenChange={onOpenChange}
        onCompanyCreated={onCompanyCreated}
        initialName="OFICINA DO ZE"
      />
    );

    expect(screen.getByText('Cadastrar Nova Empresa')).toBeInTheDocument();
    expect(screen.getByDisplayValue('OFICINA DO ZE')).toBeInTheDocument();
  });

  it('shows error toast when submitting empty name', async () => {
    render(
      <CompanyDialog
        open={true}
        onOpenChange={onOpenChange}
        onCompanyCreated={onCompanyCreated}
        initialName=""
      />
    );

    const submitBtn = screen.getByRole('button', { name: /CADASTRAR EMPRESA/i });
    fireEvent.click(submitBtn);

    expect(toast.error).toHaveBeenCalledWith('Informe o nome da empresa.');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('validates CNPJ and blocks submission if invalid', async () => {
    render(
      <CompanyDialog
        open={true}
        onOpenChange={onOpenChange}
        onCompanyCreated={onCompanyCreated}
        initialName="EMPRESA TESTE"
      />
    );

    const cnpjInput = screen.getByPlaceholderText('00.000.000/0001-00');
    fireEvent.change(cnpjInput, { target: { value: '11111111111111' } });

    const submitBtn = screen.getByRole('button', { name: /CADASTRAR EMPRESA/i });
    fireEvent.click(submitBtn);

    expect(toast.error).toHaveBeenCalledWith('CNPJ inválido. Verifique os números digitados.');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('submits successfully when fields are valid', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });

    const insertMock = vi.fn().mockResolvedValue({ error: null });
    (supabase.from as any).mockReturnValue({
      insert: insertMock,
    });

    render(
      <CompanyDialog
        open={true}
        onOpenChange={onOpenChange}
        onCompanyCreated={onCompanyCreated}
        initialName="AUTO PECAS CENTRAL"
      />
    );

    const submitBtn = screen.getByRole('button', { name: /CADASTRAR EMPRESA/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Empresa cadastrada!');
      expect(onCompanyCreated).toHaveBeenCalledWith('AUTO PECAS CENTRAL');
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
