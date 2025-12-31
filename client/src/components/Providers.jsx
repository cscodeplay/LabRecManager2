'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import AppLayout from './AppLayout';
import { useThemeStore, useLanguageStore } from '@/lib/store';
import WhiteboardNotificationListener from './WhiteboardNotificationListener';
import '@/lib/i18n'; // Initialize i18n

function LanguageInitializer() {
    const { language } = useLanguageStore();

    useEffect(() => {
        // Sync language with i18next on mount
        import('@/lib/i18n').then(({ default: i18n, SUPPORTED_LANGUAGES }) => {
            if (i18n.language !== language) {
                i18n.changeLanguage(language);
            }
            // Set RTL for Urdu
            const selectedLang = SUPPORTED_LANGUAGES.find(l => l.code === language);
            if (selectedLang?.dir === 'rtl') {
                document.documentElement.dir = 'rtl';
            } else {
                document.documentElement.dir = 'ltr';
            }
        });
    }, [language]);

    return null;
}

function ThemeInitializer() {
    const { theme, initializeTheme } = useThemeStore();

    useEffect(() => {
        // Initialize theme on mount
        initializeTheme();

        // Listen for system preference changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (theme === 'system') {
                initializeTheme();
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme, initializeTheme]);

    return null;
}

export function Providers({ children }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
                refetchOnWindowFocus: false,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeInitializer />
            <LanguageInitializer />
            <AppLayout>
                {children}
            </AppLayout>
            <WhiteboardNotificationListener />
        </QueryClientProvider>
    );
}
