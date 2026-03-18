/**
 * Async resilience utilities for all cliniq.one apps.
 *
 * Every network call should use `safeFetch()` to prevent
 * infinite hangs and provide retry logic.
 */

// ── withTimeout ────────────────────────────────
/**
 * Race a promise against a deadline timer.
 * Throws a descriptive error if the promise doesn't resolve in time.
 * Accepts PromiseLike (e.g. Supabase PostgrestBuilder) as well as Promise.
 */
export function withTimeout<T>(
    promise: PromiseLike<T>,
    ms: number,
    label = 'Operation',
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error(`${label} timed out after ${ms}ms`)),
            ms,
        );
        Promise.resolve(promise)
            .then((val) => {
                clearTimeout(timer);
                resolve(val);
            })
            .catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
    });
}

// ── sleep ──────────────────────────────────────
export const sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

// ── withRetry ──────────────────────────────────
export interface RetryOptions {
    /** Number of retry attempts (default 2) */
    retries?: number;
    /** Base delay between retries in ms (default 1000) */
    delay?: number;
    /** Exponential backoff multiplier (default 2) */
    backoff?: number;
    /** Optional label for error messages */
    label?: string;
}

/**
 * Retry an async function with exponential backoff.
 * Only retries on transient errors (network, timeout).
 */
export async function withRetry<T>(
    fn: () => PromiseLike<T>,
    opts: RetryOptions = {},
): Promise<T> {
    const { retries = 2, delay = 1000, backoff = 2, label = 'Operation' } = opts;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;

            // Don't retry on auth errors or validation errors
            const code = err?.code || err?.status;
            if (code === 401 || code === 403 || code === 422 || code === 400) {
                throw err;
            }

            if (attempt < retries) {
                const waitMs = delay * backoff ** attempt;
                console.warn(
                    `[${label}] Attempt ${attempt + 1}/${retries + 1} failed, retrying in ${waitMs}ms:`,
                    err?.message,
                );
                await sleep(waitMs);
            }
        }
    }

    throw lastError || new Error(`${label} failed after ${retries + 1} attempts`);
}

// ── safeFetch ──────────────────────────────────
export interface SafeFetchOptions {
    /** Timeout in ms (default 10000) */
    timeout?: number;
    /** Number of retries (default 1) */
    retries?: number;
    /** Base retry delay in ms (default 1000) */
    delay?: number;
    /** Label for error messages */
    label?: string;
}

/**
 * The go-to wrapper for all async operations.
 * Combines timeout + retry with sensible defaults.
 *
 * @example
 * const data = await safeFetch(
 *   () => supabase.from('users').select('*').single(),
 *   { timeout: 5000, label: 'fetchUser' }
 * );
 */
export async function safeFetch<T>(
    fn: () => PromiseLike<T>,
    opts: SafeFetchOptions = {},
): Promise<T> {
    const {
        timeout = 10000,
        retries = 1,
        delay = 1000,
        label = 'Request',
    } = opts;

    return withRetry(
        () => withTimeout(fn(), timeout, label),
        { retries, delay, label },
    );
}
