import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';

const PageA: React.FC = () => <div>Página Home Ativa</div>;
const PageB: React.FC = () => <div>Página Relatórios Ativa</div>;

describe('PWA Resilience & Stale Chunk Recovery Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  // Cenário A — Primeiro acesso
  it('Cenário A: First-time user opens the application cleanly', async () => {
    const importer = vi.fn().mockResolvedValue({ default: PageA });
    const LazyPageA = lazyWithRetry(importer);

    render(
      <React.Suspense fallback={<div>Carregando App...</div>}>
        <LazyPageA />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Página Home Ativa')).toBeInTheDocument();
    });
    expect(importer).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('pwa_chunk_reload_lock')).toBeNull();
  });

  // Cenário B — Usuário retorna sem nova versão
  it('Cenário B: Returning user reuses cached resources without unnecessary reloads', async () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy },
      writable: true,
    });

    const importer = vi.fn().mockResolvedValue({ default: PageA });
    const LazyPageA = lazyWithRetry(importer);

    render(
      <React.Suspense fallback={<div>Carregando App...</div>}>
        <LazyPageA />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Página Home Ativa')).toBeInTheDocument();
    });
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('pwa_chunk_reload_lock')).toBeNull();
  });

  // Cenário C — Novo deploy (versão N -> versão N+1)
  it('Cenário C: New deploy produces new chunk hash, triggering a single safe reload', async () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy },
      writable: true,
    });

    const oldHashError = new Error('Failed to fetch dynamically imported module: /assets/Relatorios-oldhash123.js');
    const importer = vi.fn().mockRejectedValue(oldHashError);
    const LazyRelatorios = lazyWithRetry(importer, undefined, { delayMs: 5 });

    render(
      <React.Suspense fallback={<div>Atualizando versão...</div>}>
        <LazyRelatorios />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(reloadSpy).toHaveBeenCalledTimes(1);
      expect(sessionStorage.getItem('pwa_chunk_reload_lock')).toBe('true');
    });
  });

  // Cenário D — Chunk stale com falha persistente (evita loop infinito)
  it('Cenário D: Persistent chunk failure after reload terminates safely with Error Boundary and NO infinite loop', async () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy },
      writable: true,
    });

    // Simula que o reload já aconteceu nesta sessão
    sessionStorage.setItem('pwa_chunk_reload_lock', 'true');

    const persistentChunkError = new Error('Failed to fetch dynamically imported module: /assets/Relatorios-oldhash123.js');
    const importer = vi.fn().mockRejectedValue(persistentChunkError);
    const LazyRelatorios = lazyWithRetry(importer, undefined, { maxRetries: 2, delayMs: 5 });

    class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; errorMsg: string }> {
      state = { hasError: false, errorMsg: '' };
      static getDerivedStateFromError(error: Error) {
        return { hasError: true, errorMsg: error.message };
      }
      render() {
        if (this.state.hasError) {
          return <div role="alert">Erro ao carregar página. Verifique sua conexão.</div>;
        }
        return this.props.children;
      }
    }

    render(
      <ErrorBoundary>
        <React.Suspense fallback={<div>Carregando...</div>}>
          <LazyRelatorios />
        </React.Suspense>
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Erro ao carregar página. Verifique sua conexão.');
    });

    // NÃO deve disparar reload infinito!
    expect(reloadSpy).not.toHaveBeenCalled();
    // Lock é liberado para permitir futuras tentativas
    expect(sessionStorage.getItem('pwa_chunk_reload_lock')).toBeNull();
  });

  // Cenário E — Deploy durante utilização (navegação entre múltiplas páginas)
  it('Cenário E: Navigation across multiple lazy routes works sequentially', async () => {
    const importerA = vi.fn().mockResolvedValue({ default: PageA });
    const importerB = vi.fn().mockResolvedValue({ default: PageB });

    const LazyPageA = lazyWithRetry(importerA);
    const LazyPageB = lazyWithRetry(importerB);

    const { rerender } = render(
      <React.Suspense fallback={<div>Carregando...</div>}>
        <LazyPageA />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Página Home Ativa')).toBeInTheDocument();
    });

    // Navega para Página B
    rerender(
      <React.Suspense fallback={<div>Carregando...</div>}>
        <LazyPageB />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Página Relatórios Ativa')).toBeInTheDocument();
    });
  });

  // Cenário F & G — Resiliência Offline e Retorno Online com retry transitório
  it('Cenário F & G: Transient network drop (offline) retries and succeeds when connection resumes', async () => {
    const importer = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch (offline network drop)'))
      .mockResolvedValueOnce({ default: PageA });

    const LazyPageA = lazyWithRetry(importer, undefined, { maxRetries: 2, delayMs: 10 });

    render(
      <React.Suspense fallback={<div>Reconectando...</div>}>
        <LazyPageA />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Página Home Ativa')).toBeInTheDocument();
    });

    expect(importer).toHaveBeenCalledTimes(2);
    expect(sessionStorage.getItem('pwa_chunk_reload_lock')).toBeNull();
  });
});
