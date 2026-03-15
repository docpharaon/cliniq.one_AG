'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
            <div className="glass rounded-2xl p-10 max-w-md w-full text-center space-y-6">
                <div className="w-16 h-16 bg-error-faded rounded-2xl flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-8 h-8 text-error" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Something went wrong</h1>
                    <p className="text-sm text-text-muted mt-2">
                        An unexpected error occurred. Please try again.
                    </p>
                    {error.digest && (
                        <p className="text-xs text-text-muted mt-1 font-mono">
                            Error ID: {error.digest}
                        </p>
                    )}
                </div>
                <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-bg-primary font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(45,212,191,0.4)] transition-all"
                >
                    <RotateCcw className="w-4 h-4" />
                    Try Again
                </button>
            </div>
        </div>
    );
}
