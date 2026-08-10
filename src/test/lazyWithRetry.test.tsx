import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';

const DummyComponent: React.FC = () => <div>Carregado com Sucesso</div>;

describe('lazyWithRetry - Resilient Component Loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('loads module successfully on first attempt (default export)', async () => {
    const importer = vi.fn().mockResolvedValue({ default: DummyComponent });
    const LazyComponent = lazyWithRetry(importer, undefined, { delayMs: 10 });

    render(
      <React.Suspense fallback={<div>Carregando...</div>}>
        <LazyComponent />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Carregado com Sucesso')).toBeInTheDocument();
    });
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('loads module successfully with named export', async () => {
    const NamedComp: React.FC = () => <div>Named Component OK</div>;
    const importer = vi.fn().mockResolvedValue({ CustomExport: NamedComp });
    const LazyComponent = lazyWithRetry(importer, 'CustomExport', { delayMs: 10 });

    render(
      <React.Suspense fallback={<div>Carregando...</div>}>
        <LazyComponent />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Named Component OK')).toBeInTheDocument();
    });
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('retries on transient failure and recovers on 2nd attempt', async () => {
    const importer = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network glitch'))
      .mockResolvedValueOnce({ default: DummyComponent });

    const LazyComponent = lazyWithRetry(importer, undefined, { maxRetries: 2, delayMs: 10 });

    render(
      <React.Suspense fallback={<div>Carregando...</div>}>
        <LazyComponent />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Carregado com Sucesso')).toBeInTheDocument();
    });
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it('stops retrying after maxRetries (total 3 attempts) and throws', async () => {
    const persistentError = new Error('Persistent 404');
    const importer = vi.fn().mockRejectedValue(persistentError);

    const LazyComponent = lazyWithRetry(importer, undefined, { maxRetries: 2, delayMs: 10 });

    class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
      state = { hasError: false };
      static getDerivedStateFromError() {
        return { hasError: true };
      }
      render() {
        if (this.state.hasError) return <div>Erro ao carregar componente</div>;
        return this.props.children;
      }
    }

    render(
      <ErrorBoundary>
        <React.Suspense fallback={<div>Carregando...</div>}>
          <LazyComponent />
        </React.Suspense>
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar componente')).toBeInTheDocument();
    });
    expect(importer).toHaveBeenCalledTimes(3);
  });
});
