import { ComponentType, lazy, LazyExoticComponent } from 'react';

export interface LazyWithRetryOptions {
  maxRetries?: number;
  delayMs?: number;
}

const STORAGE_LOCK_KEY = 'pwa_chunk_reload_lock';

/**
 * Enhanced lazy loader with automatic retry and stale chunk recovery for PWAs.
 * - Explicitly bounded to max 2 retries (total 3 attempts).
 * - Avoids infinite reload loops with session tracking (STORAGE_LOCK_KEY).
 * - Supports default exports and named exports.
 * - Resilient across mobile browsers (Chrome, Safari/WebKit iOS, Firefox).
 */
export function lazyWithRetry<T extends ComponentType<Record<string, unknown>>>(
  importer: () => Promise<{ default: T } | Record<string, unknown>>,
  namedExport?: string,
  options: LazyWithRetryOptions = {}
): LazyExoticComponent<T> {
  const maxRetries = options.maxRetries ?? 2;
  const delayMs = options.delayMs ?? 300;

  return lazy(async () => {
    let lastError: Error | unknown = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const module = await importer();

        // On successful module load, clear any lingering reload lock
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.removeItem(STORAGE_LOCK_KEY);
        }

        if (namedExport && module && typeof module === 'object' && namedExport in module) {
          return { default: (module as Record<string, T>)[namedExport] };
        }
        if (module && typeof module === 'object' && 'default' in module) {
          return module as { default: T };
        }
        return { default: module as unknown as T };
      } catch (err: unknown) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    const errorObj = lastError as { message?: string; name?: string } | null;
    const msg = String(errorObj?.message || '').toLowerCase();
    const isChunkError =
      msg.includes('failed to fetch dynamically imported module') ||
      msg.includes('loading chunk') ||
      msg.includes('importing a module script failed') ||
      msg.includes('error loading dynamically imported module') ||
      errorObj?.name === 'ChunkLoadError';

    if (isChunkError && typeof window !== 'undefined' && window.sessionStorage) {
      const hasReloaded = window.sessionStorage.getItem(STORAGE_LOCK_KEY);
      if (!hasReloaded) {
        window.sessionStorage.setItem(STORAGE_LOCK_KEY, 'true');
        window.location.reload();
        // Return null component to let React complete cleanly while browser reloads
        return { default: (() => null) as unknown as T };
      }
      // If already reloaded once and the error persists (e.g. offline/permanent 404),
      // clear the lock to prevent looping and throw cleanly to the error boundary.
      window.sessionStorage.removeItem(STORAGE_LOCK_KEY);
    }

    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new Error('Falha ao carregar página após tentativas.');
  });
}
