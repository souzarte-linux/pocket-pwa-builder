import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';

const DummyComponent: React.FC = () => <div>Carregado com Sucesso</div>;

describe('lazyWithRetry - Resilient Component Loader & PWA Recovery', () => {
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
    expect(sessionStorage.getItem('pwa_chunk_reload_lock')).toBeNull();
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

  it('stops retrying after maxRetries (total 3 attempts) and throws on non-chunk error', async () => {
    const persistentError = new Error('Persistent 404 in application code');
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
    // 1 initial attempt + 2 retries = 3 calls
    expect(importer).toHaveBeenCalledTimes(3);
  });

  it('triggers a single controlled reload on stale chunk error', async () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy },
      writable: true,
    });

    const chunkError = new Error('Failed to fetch dynamically imported module: /assets/Relatorios-oldhash.js');
    const importer = vi.fn().mockRejectedValue(chunkError);

    const LazyComponent = lazyWithRetry(importer, undefined, { maxRetries: 2, delayMs: 10 });

    render(
      <React.Suspense fallback={<div>Fallback durante reload</div>}>
        <LazyComponent />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(reloadSpy).toHaveBeenCalledTimes(1);
      expect(sessionStorage.getItem('pwa_chunk_reload_lock')).toBe('true');
    });
  });

  it('prevents infinite reload loops if chunk error persists after reload', async () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy },
      writable: true,
    });

    // Simulate that the reload already happened once
    sessionStorage.setItem('pwa_chunk_reload_lock', 'true');

    const chunkError = new Error('Failed to fetch dynamically imported module: /assets/Relatorios-oldhash.js');
    const importer = vi.fn().mockRejectedValue(chunkError);

    const LazyComponent = lazyWithRetry(importer, undefined, { maxRetries: 2, delayMs: 10 });

    class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message: string }> {
      state = { hasError: false, message: '' };
      static getDerivedStateFromError(error: Error) {
        return { hasError: true, message: error.message };
      }
      render() {
        if (this.state.hasError) return <div>Falha definitiva: {this.state.message}</div>;
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
      expect(screen.getByText(/Falha definitiva:/i)).toBeInTheDocument();
      // Should NOT reload again!
      expect(reloadSpy).not.toHaveBeenCalled();
      // Lock should be cleaned
      expect(sessionStorage.getItem('pwa_chunk_reload_lock')).toBeNull();
    });
  });
});
