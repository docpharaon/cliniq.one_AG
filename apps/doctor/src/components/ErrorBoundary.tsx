import React, { Component, ReactNode } from 'react';
import { colors, typography, AlertTriangle } from '@cliniqone/ui';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.error('Doctor app error boundary:', error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', flex: 1, height: '100%',
                    justifyContent: 'center', alignItems: 'center',
                    flexDirection: 'column',
                    backgroundColor: colors.bgPrimary, padding: 24,
                }}>
                    <AlertTriangle size={48} color={colors.warning} />
                    <span style={{ fontSize: typography.h2.fontSize, fontWeight: 700, color: colors.textPrimary, marginBottom: 8 }}>
                        Something went wrong
                    </span>
                    <span style={{ fontSize: typography.body.fontSize, color: colors.textTertiary, marginBottom: 24 }}>
                        Please restart the app.
                    </span>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        style={{
                            backgroundColor: colors.accentTeal,
                            paddingInline: 24, paddingBlock: 12,
                            borderRadius: 12,
                            fontSize: typography.button.fontSize, fontWeight: 600,
                            color: colors.bgPrimary,
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
