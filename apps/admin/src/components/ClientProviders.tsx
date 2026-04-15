'use client';

import React from 'react';
import { I18nProvider } from '@cliniqone/i18n';
import { ThemeProvider } from '@cliniqone/ui';
import AdminAuthProvider from './AdminAuthProvider';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <I18nProvider>
                <AdminAuthProvider>
                    {children}
                </AdminAuthProvider>
            </I18nProvider>
        </ThemeProvider>
    );
}
