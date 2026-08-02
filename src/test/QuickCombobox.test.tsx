import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuickCombobox } from '@/components/QuickCombobox';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('QuickCombobox Component', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders placeholder correctly', () => {
    render(
      <QuickCombobox
        value=""
        onChange={onChange}
        placeholder="Selecione a Empresa"
      />
    );

    expect(screen.getByText('Selecione a Empresa')).toBeInTheDocument();
  });

  it('loads options from supabase table', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [{ name: 'Empresa A' }, { name: 'Empresa B' }],
        }),
      }),
    });

    render(
      <QuickCombobox
        table="companies"
        value=""
        onChange={onChange}
        placeholder="Selecione a Empresa"
      />
    );

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('companies');
    });
  });
});
