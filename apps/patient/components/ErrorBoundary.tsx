import React, { Component, ErrorInfo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { t } from '@cliniqone/i18n';

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error boundary that catches React rendering crashes
 * and shows a user-friendly recovery screen.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log to error reporting service (e.g., Sentry)
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <View style={styles.container}>
                    <View style={styles.content}>
                        <Text style={styles.icon}>⚠️</Text>
                        <Text style={styles.title}>{t('common.error')}</Text>
                        <Text style={styles.message}>
                            An unexpected error occurred. Please try again.
                        </Text>
                        {__DEV__ && this.state.error && (
                            <View style={styles.debugCard}>
                                <Text style={styles.debugTitle}>Debug Info</Text>
                                <Text style={styles.debugText}>
                                    {this.state.error.message}
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                            <Text style={styles.buttonText}>{t('common.retry')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.bgPrimary,
        padding: spacing.xl,
    },
    content: {
        alignItems: 'center',
        maxWidth: 320,
    },
    icon: { fontSize: 48, marginBottom: spacing.xl },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    message: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing['2xl'],
    },
    debugCard: {
        width: '100%',
        backgroundColor: colors.errorFaded,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.xl,
    },
    debugTitle: {
        ...typography.label,
        color: colors.error,
        marginBottom: spacing.xs,
    },
    debugText: {
        ...typography.caption,
        color: colors.error,
        fontFamily: 'monospace' as any,
    },
    button: {
        backgroundColor: colors.accentTeal,
        paddingHorizontal: spacing['2xl'],
        paddingVertical: spacing.lg,
        borderRadius: radius.full,
    },
    buttonText: {
        ...typography.button,
        color: '#fff',
    },
});
