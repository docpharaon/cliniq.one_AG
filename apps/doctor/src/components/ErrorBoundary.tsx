import React, { Component, ReactNode } from 'react';
import { colors, typography, AlertTriangle } from '@cliniqone/ui';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary] Doctor app error:', error, info);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div style={{
                    display: 'flex', flex: 1, height: '100%',
                    justifyContent: 'center', alignItems: 'center',
                    flexDirection: 'column',
                    backgroundColor: colors.bgPrimary, padding: 24,
                    textAlign: 'center',
                }}>
                    <AlertTriangle size={48} color={colors.warning} />
                    <span style={{ fontSize: typography.h2.fontSize, fontWeight: 700, color: colors.textPrimary, marginBottom: 8, marginTop: 16 }}>
                        Something went wrong
                    </span>
                    <span style={{ fontSize: typography.body.fontSize, color: colors.textTertiary, marginBottom: 8, maxWidth: 300 }}>
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </span>
                    <span style={{ fontSize: typography.caption.fontSize, color: colors.textTertiary, marginBottom: 24 }}>
                        Please restart the app.
                    </span>
                    <button
                        onClick={() => {
                            this.setState({ hasError: false, error: null });
                            window.location.reload();
                        }}
                        style={{
                            backgroundColor: colors.accentTeal,
                            paddingInline: 24, paddingBlock: 12,
                            borderRadius: 12,
                            fontSize: typography.button.fontSize, fontWeight: 600,
                            color: colors.bgPrimary,
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        Try Again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
