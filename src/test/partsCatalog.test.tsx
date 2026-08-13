import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPartsCatalog,
  getPartById,
  getPartByName,
  createPart,
  updatePart,
  deletePart,
  searchParts,
} from '@/api/parts.api';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

function createQueryMock(data: unknown = []) {
  const promise = Promise.resolve({ data, error: null });
  const mockObj: any = {
    then: (resolve: any, reject: any) => promise.then(resolve, reject),
    catch: (reject: any) => promise.catch(reject),
    select: vi.fn().mockImplementation(() => mockObj),
    eq: vi.fn().mockImplementation(() => mockObj),
    ilike: vi.fn().mockImplementation(() => mockObj),
    or: vi.fn().mockImplementation(() => mockObj),
    order: vi.fn().mockImplementation(() => mockObj),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data, error: null })),
    single: vi.fn().mockImplementation(() => Promise.resolve({ data, error: null })),
    insert: vi.fn().mockImplementation(() => mockObj),
    update: vi.fn().mockImplementation(() => mockObj),
    delete: vi.fn().mockImplementation(() => mockObj),
  };
  return mockObj;
}

describe('parts.api.ts — Catálogo Centralizado de Peças & Metadados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Scenario A & L: getPartsCatalog fetches user isolated catalog', async () => {
    const mockList = [
      {
        id: 'part-1',
        name: 'Pastilha de Freio Cobreq',
        category: 'Freios',
        manufacturer: 'Cobreq',
        brand: 'Cobreq',
        model: 'N-123',
        sku: 'CBQ-900',
        default_life_km: 10000,
        unit: 'par',
        user_id: 'user-123',
      },
    ];

    const queryMock = createQueryMock(mockList);
    vi.mocked(supabase.from).mockReturnValue(queryMock as any);

    const res = await getPartsCatalog('user-123');

    expect(res).toEqual(mockList);
    expect(queryMock.eq).toHaveBeenCalledWith('user_id', 'user-123');
    expect(queryMock.order).toHaveBeenCalledWith('name');
  });

  it('Scenario B: returns empty list when no parts exist', async () => {
    const queryMock = createQueryMock([]);
    vi.mocked(supabase.from).mockReturnValue(queryMock as any);

    const res = await getPartsCatalog('user-123');
    expect(res).toEqual([]);
  });

  it('Scenario C: handles error gracefully and returns empty array', async () => {
    const errorObj = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockRejectedValue(new Error('DB error')),
    };
    vi.mocked(supabase.from).mockReturnValue(errorObj as any);

    const res = await getPartsCatalog('user-123');
    expect(res).toEqual([]);
  });

  it('Scenario D: createPart inserts new part with metadata', async () => {
    const mockCreated = {
      id: 'part-2',
      name: 'Óleo Motor 20w50',
      category: 'Motor',
      manufacturer: 'Mobil',
      brand: 'Mobil',
      model: 'Super 20w50',
      sku: 'MBL-2050',
      default_life_km: 3000,
      unit: 'litro',
      user_id: 'user-123',
    };

    const queryMock = createQueryMock(mockCreated);
    vi.mocked(supabase.from).mockReturnValue(queryMock as any);

    const res = await createPart({
      user_id: 'user-123',
      name: 'Óleo Motor 20w50',
      category: 'Motor',
      manufacturer: 'Mobil',
      brand: 'Mobil',
      model: 'Super 20w50',
      sku: 'MBL-2050',
      default_life_km: 3000,
      unit: 'litro',
    });

    expect(res).toEqual(mockCreated);
    expect(queryMock.insert).toHaveBeenCalled();
  });

  it('Scenario E & J: updatePart updates metadata correctly', async () => {
    const mockUpdated = {
      id: 'part-2',
      name: 'Óleo Motor 20w50 Sintético',
      default_life_km: 5000,
      user_id: 'user-123',
    };

    const queryMock = createQueryMock(mockUpdated);
    vi.mocked(supabase.from).mockReturnValue(queryMock as any);

    const res = await updatePart('part-2', {
      name: 'Óleo Motor 20w50 Sintético',
      default_life_km: 5000,
    });

    expect(res).toEqual(mockUpdated);
    expect(queryMock.update).toHaveBeenCalled();
    expect(queryMock.eq).toHaveBeenCalledWith('id', 'part-2');
  });

  it('Scenario F: deletePart deletes part by ID', async () => {
    const queryMock = createQueryMock(null);
    vi.mocked(supabase.from).mockReturnValue(queryMock as any);

    await expect(deletePart('part-2')).resolves.toBeUndefined();
    expect(queryMock.delete).toHaveBeenCalled();
    expect(queryMock.eq).toHaveBeenCalledWith('id', 'part-2');
  });

  it('Scenario H & I: getPartByName finds part and returns default_life_km', async () => {
    const mockPart = {
      id: 'part-3',
      name: 'Pneu Traseiro',
      default_life_km: 15000,
      manufacturer: 'Pirelli',
      brand: 'Pirelli',
      model: 'City Demon',
      user_id: 'user-123',
    };

    const queryMock = createQueryMock(mockPart);
    vi.mocked(supabase.from).mockReturnValue(queryMock as any);

    const res = await getPartByName('Pneu Traseiro', 'user-123');
    expect(res).toEqual(mockPart);
    expect(res?.default_life_km).toBe(15000);
    expect(res?.brand).toBe('Pirelli');
  });

  it('Scenario K & M: searchParts performs multi-field search', async () => {
    const mockList = [
      {
        id: 'part-4',
        name: 'Vela de Ignição',
        sku: 'NGK-CPR8',
        user_id: 'user-123',
      },
    ];

    const queryMock = createQueryMock(mockList);
    vi.mocked(supabase.from).mockReturnValue(queryMock as any);

    const res = await searchParts('NGK', 'user-123');
    expect(res).toEqual(mockList);
    expect(queryMock.or).toHaveBeenCalled();
  });
});
