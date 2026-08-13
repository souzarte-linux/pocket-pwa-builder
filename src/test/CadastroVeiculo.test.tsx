import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CadastroVeiculo from '@/pages/CadastroVeiculo';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BrowserRouter } from 'react-router-dom';

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

describe('CadastroVeiculo Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });
  });

  it('loads profile vehicle details including initial_odometer_km on mount', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        vehicle_brand: 'Honda',
        vehicle_model: 'CG 160 Fan',
        vehicle_year: 2023,
        plate: 'ABC-1D23',
        initial_odometer_km: 15400,
        tank_size_l: 16.1,
        avg_consumption_kml: 40,
        oil_change_km: 3000,
        tire_size_front: '80/100-18',
        tire_size_rear: '90/90-18',
        has_bag: true,
      },
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: maybeSingleMock,
        }),
      }),
    });

    render(
      <BrowserRouter>
        <CadastroVeiculo />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Honda')).toBeInTheDocument();
      expect(screen.getByDisplayValue('CG 160 Fan')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2023')).toBeInTheDocument();
      expect(screen.getByDisplayValue('ABC-1D23')).toBeInTheDocument();
      expect(screen.getByDisplayValue('15400')).toBeInTheDocument();
    });
  });

  it('saves vehicle details with initial_odometer_km to profile when form is submitted (Cenário H)', async () => {
    let updatePayloadCaptured: any = null;

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
      update: vi.fn().mockImplementation((payload: any) => {
        updatePayloadCaptured = payload;
        return {
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { vehicle_brand: 'Yamaha' }, error: null }),
            }),
          }),
        };
      }),
    });

    render(
      <BrowserRouter>
        <CadastroVeiculo />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ex: Honda')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Ex: Honda'), { target: { value: 'Yamaha' } });
    fireEvent.change(screen.getByPlaceholderText('Ex: CB 500X'), { target: { value: 'Fazer 250' } });
    fireEvent.change(screen.getByPlaceholderText('Ex: 85000'), { target: { value: '18500' } });

    const submitBtn = screen.getByRole('button', { name: /Salvar Alterações/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Veículo cadastrado com sucesso!');
      expect(updatePayloadCaptured).not.toBeNull();
      expect(updatePayloadCaptured.initial_odometer_km).toBe(18500);
      expect(updatePayloadCaptured.vehicle_brand).toBe('Yamaha');
    });
  });

  it('blocks submission and shows error toast when initial_odometer_km is negative (Cenário G)', async () => {
    const updateFn = vi.fn();
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
      update: updateFn,
    });

    render(
      <BrowserRouter>
        <CadastroVeiculo />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ex: 85000')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Ex: 85000'), { target: { value: '-500' } });

    const submitBtn = screen.getByRole('button', { name: /Salvar Alterações/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('O odômetro inicial deve ser um número válido e não negativo.');
      expect(updateFn).not.toHaveBeenCalled();
    });
  });
});
