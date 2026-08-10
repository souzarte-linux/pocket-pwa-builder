import { ComponentType, lazy, LazyExoticComponent } from 'react';

export interface LazyWithRetryOptions {
  maxRetries?: number;
  delayMs?: number;
}

/**
 * Enhanced lazy loader with automatic retry and stale chunk recovery for PWAs.
 * - Explicitly bounded to max 2 retries (total 3 attempts).
 * - Avoids infinite reload loops with session tracking.
 * - Supports default exports and named exports.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T } | Record<string, any>>,
  namedExport?: string,
  options: LazyWithRetryOptions = {}
): LazyExoticComponent<T> {
  const maxRetries = options.maxRetries ?? 2;
  const delayMs = options.delayMs ?? 300;

  return lazy(async () => {
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const module = await importer();
        if (namedExport && module && typeof module === 'object' && namedExport in module) {
          return { default: module[namedExport] };
        }
        if (module && typeof module === 'object' && 'default' in module) {
          return module as { default: T };
        }
        return { default: module as unknown as T };
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    const isChunkError =
      lastError?.message?.includes('Failed to fetch dynamically imported module') ||
      lastError?.message?.includes('Loading chunk') ||
      lastError?.message?.includes('Importing a module script failed') ||
      lastError?.name === 'ChunkLoadError';

    if (isChunkError && typeof window !== 'undefined') {
      const storageKey = 'pwa_chunk_reload_lock';
      const hasReloaded = window.sessionStorage?.getItem(storageKey);
      if (!hasReloaded) {
        window.sessionStorage?.setItem(storageKey, 'true');
        window.location.reload();
        return new Promise<never>(() => {});
      }
      window.sessionStorage?.removeItem(storageKey);
    }

    throw lastError || new Error('Falha ao carregar página após tentativas.');
  });
}
