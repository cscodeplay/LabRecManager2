import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            _hasHydrated: false,

            // Academic Session State
            selectedSessionId: null,
            selectedSession: null,
            availableSessions: [],
            isReadOnlyMode: false,

            setHasHydrated: (state) => set({ _hasHydrated: state }),

            setAuth: (user, accessToken, refreshToken) => set({
                user,
                accessToken,
                refreshToken,
                isAuthenticated: true,
            }),

            logout: () => set({
                user: null,
                accessToken: null,
                refreshToken: null,
                isAuthenticated: false,
                selectedSessionId: null,
                selectedSession: null,
                availableSessions: [],
                isReadOnlyMode: false,
            }),

            updateUser: (userData) => set((state) => ({
                user: { ...state.user, ...userData },
            })),

            getAccessToken: () => get().accessToken,

            // Session Management
            setAvailableSessions: (sessions) => set({ availableSessions: sessions }),

            setSession: (session) => set({
                selectedSessionId: session?.id || null,
                selectedSession: session || null,
                isReadOnlyMode: session ? !session.isCurrent : false,
            }),

            getSelectedSessionId: () => get().selectedSessionId,
            getIsReadOnlyMode: () => get().isReadOnlyMode,
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
                selectedSessionId: state.selectedSessionId,
                selectedSession: state.selectedSession,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);

export const useLanguageStore = create(
    persist(
        (set) => ({
            language: 'en',
            setLanguage: (language) => set({ language }),
        }),
        { name: 'language-storage' }
    )
);

export const useThemeStore = create(
    persist(
        (set, get) => ({
            theme: 'light', // 'light', 'dark', 'system'
            setTheme: (theme) => {
                set({ theme });
                // Apply theme to document
                if (typeof window !== 'undefined') {
                    const root = document.documentElement;
                    root.classList.remove('light', 'dark');

                    if (theme === 'system') {
                        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                        root.classList.add(systemDark ? 'dark' : 'light');
                    } else {
                        root.classList.add(theme);
                    }
                }
            },
            initializeTheme: () => {
                const theme = get().theme;
                if (typeof window !== 'undefined') {
                    const root = document.documentElement;
                    root.classList.remove('light', 'dark');

                    if (theme === 'system') {
                        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                        root.classList.add(systemDark ? 'dark' : 'light');
                    } else {
                        root.classList.add(theme);
                    }
                }
            },
        }),
        { name: 'theme-storage' }
    )
);
