import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CadastroMotorista from '@/pages/CadastroMotorista';
import { supabase } from '@/integrations/supabase/client';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'sonner';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
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

describe('CadastroMotorista Page - Flow & Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates password confirmation match', async () => {
    render(
      <BrowserRouter>
        <CadastroMotorista />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('EX: JOÃO DA SILVA'), { target: { value: 'Carlos Silva' } });
    fireEvent.change(screen.getByPlaceholderText('EXEMPLO@EMAIL.COM'), { target: { value: 'carlos@teste.com' } });
    fireEvent.change(screen.getByPlaceholderText('(00) 00000-0000'), { target: { value: '11999998888' } });
    fireEvent.change(screen.getByPlaceholderText('ABC-1234'), { target: { value: 'BRA2E19' } });

    const passwordInputs = screen.getAllByPlaceholderText('********');
    fireEvent.change(passwordInputs[0], { target: { value: '123456' } });
    fireEvent.change(passwordInputs[1], { target: { value: '654321' } });

    fireEvent.click(screen.getByText('FINALIZAR CADASTRO'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('As senhas não coincidem.');
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });
  });

  it('validates minimum password length', async () => {
    render(
      <BrowserRouter>
        <CadastroMotorista />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('EX: JOÃO DA SILVA'), { target: { value: 'Carlos Silva' } });
    fireEvent.change(screen.getByPlaceholderText('EXEMPLO@EMAIL.COM'), { target: { value: 'carlos@teste.com' } });
    fireEvent.change(screen.getByPlaceholderText('(00) 00000-0000'), { target: { value: '11999998888' } });
    fireEvent.change(screen.getByPlaceholderText('ABC-1234'), { target: { value: 'BRA2E19' } });

    const passwordInputs = screen.getAllByPlaceholderText('********');
    fireEvent.change(passwordInputs[0], { target: { value: '123' } });
    fireEvent.change(passwordInputs[1], { target: { value: '123' } });

    fireEvent.click(screen.getByText('FINALIZAR CADASTRO'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('A senha deve ter pelo menos 6 caracteres.');
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });
  });

  it('handles duplicate email / user already registered error from Supabase', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered', name: 'AuthApiError', status: 400 },
    });

    render(
      <BrowserRouter>
        <CadastroMotorista />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('EX: JOÃO DA SILVA'), { target: { value: 'Carlos Silva' } });
    fireEvent.change(screen.getByPlaceholderText('EXEMPLO@EMAIL.COM'), { target: { value: 'carlos@existente.com' } });
    fireEvent.change(screen.getByPlaceholderText('(00) 00000-0000'), { target: { value: '11999998888' } });
    fireEvent.change(screen.getByPlaceholderText('ABC-1234'), { target: { value: 'BRA2E19' } });

    const passwordInputs = screen.getAllByPlaceholderText('********');
    fireEvent.change(passwordInputs[0], { target: { value: '123456' } });
    fireEvent.change(passwordInputs[1], { target: { value: '123456' } });

    fireEvent.click(screen.getByText('FINALIZAR CADASTRO'));

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Este e-mail já está cadastrado. Faça login.');
    });
  });

  it('submits registration successfully and updates profile', async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    vi.mocked(supabase.from).mockReturnValue({
      update: updateSpy,
    } as any);

    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: {
        user: { id: 'user-new-123', email: 'carlos@teste.com' } as any,
        session: { access_token: 'token-123' } as any,
      },
      error: null,
    });

    render(
      <BrowserRouter>
        <CadastroMotorista />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('EX: JOÃO DA SILVA'), { target: { value: 'Carlos Silva' } });
    fireEvent.change(screen.getByPlaceholderText('EXEMPLO@EMAIL.COM'), { target: { value: 'carlos@teste.com' } });
    fireEvent.change(screen.getByPlaceholderText('(00) 00000-0000'), { target: { value: '11999998888' } });
    fireEvent.change(screen.getByPlaceholderText('ABC-1234'), { target: { value: 'BRA2E19' } });

    const passwordInputs = screen.getAllByPlaceholderText('********');
    fireEvent.change(passwordInputs[0], { target: { value: '123456' } });
    fireEvent.change(passwordInputs[1], { target: { value: '123456' } });

    fireEvent.click(screen.getByText('FINALIZAR CADASTRO'));

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'carlos@teste.com',
        password: '123456',
        options: {
          data: {
            full_name: 'Carlos Silva',
            phone: '11999998888',
          },
        },
      });
      expect(toast.success).toHaveBeenCalledWith('Cadastro realizado com sucesso! Bem-vindo!');
    });
  });
});
