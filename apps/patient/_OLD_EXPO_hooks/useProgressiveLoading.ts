import { useEffect, useRef, useState, useCallback } from 'react';

export type LoadingStage = 'idle' | 'loading' | 'slow' | 'timeout';

interface ProgressiveLoadingState {
    /** Current loading stage */
    stage: LoadingStage;
    /** User-facing message (null when idle or first second) */
    message: string | null;
    /** Whether a retry should be offered */
    canRetry: boolean;
    /** Elapsed time in ms since loading started */
    elapsed: number;
}

interface ProgressiveLoadingOptions {
    /** Ms before showing "Still working…" (default 2000) */
    slowThreshold?: number;
    /** Ms before showing timeout state (default 12000) */
    timeoutThreshold?: number;
    /** Auto-cancel callback on timeout */
    onTimeout?: () => void;
}

/**
 * Transforms a boolean loading state into staged UX feedback.
 *
 * @example
 * const { stage, message } = useProgressiveLoading(isLoading);
 * // stage: 'idle' | 'loading' | 'slow' | 'timeout'
 * // message: null | "Still working…" | "Taking longer than expected…"
 */
export function useProgressiveLoading(
    isLoading: boolean,
    opts: ProgressiveLoadingOptions = {},
): ProgressiveLoadingState {
    const { slowThreshold = 2000, timeoutThreshold = 12000, onTimeout } = opts;
    const [elapsed, setElapsed] = useState(0);
    const startRef = useRef<number>(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeoutFired = useRef(false);

    useEffect(() => {
        if (isLoading) {
            startRef.current = Date.now();
            timeoutFired.current = false;
            setElapsed(0);

            intervalRef.current = setInterval(() => {
                const now = Date.now() - startRef.current;
                setElapsed(now);

                if (now >= timeoutThreshold && !timeoutFired.current) {
                    timeoutFired.current = true;
                    onTimeout?.();
                }
            }, 500);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setElapsed(0);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isLoading, slowThreshold, timeoutThreshold]);

    if (!isLoading) {
        return { stage: 'idle', message: null, canRetry: false, elapsed: 0 };
    }

    if (elapsed >= timeoutThreshold) {
        return {
            stage: 'timeout',
            message: 'Something went wrong. Please try again.',
            canRetry: true,
            elapsed,
        };
    }

    if (elapsed >= slowThreshold) {
        return {
            stage: 'slow',
            message: elapsed >= slowThreshold * 2.5
                ? 'Taking longer than expected…'
                : 'Still working…',
            canRetry: false,
            elapsed,
        };
    }

    return { stage: 'loading', message: null, canRetry: false, elapsed };
}
