import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const SPINNER_PALETTES = {
    emerald: {
        id: 'emerald',
        name: 'Emerald Green',
        tagline: 'ULRMS Official Brand',
        start: '#bbf7d0',
        mid: '#4ade80',
        end: '#15803d',
        textGradient: [
            { offset: '0%', color: '#f8fff9' },
            { offset: '13%', color: '#a7f3d0' },
            { offset: '27%', color: '#ffffff' },
            { offset: '43%', color: '#34d399' },
            { offset: '58%', color: '#047857' },
            { offset: '72%', color: '#d1fae5' },
            { offset: '86%', color: '#059669' },
            { offset: '100%', color: '#064e3b' }
        ],
        edgeGradient: [
            { offset: '0%', color: '#ecfdf5' },
            { offset: '50%', color: '#065f46' },
            { offset: '100%', color: '#022c22' }
        ],
        badgeColor: 'text-emerald-600 dark:text-emerald-400',
        accentRing: 'ring-emerald-500',
        previewHex: '#10b981'
    },
    sapphire: {
        id: 'sapphire',
        name: 'Cobalt Sapphire',
        tagline: 'Classic Enterprise Blue',
        start: '#bfdbfe',
        mid: '#3b82f6',
        end: '#1d4ed8',
        textGradient: [
            { offset: '0%', color: '#eff6ff' },
            { offset: '13%', color: '#bfdbfe' },
            { offset: '27%', color: '#ffffff' },
            { offset: '43%', color: '#60a5fa' },
            { offset: '58%', color: '#1d4ed8' },
            { offset: '72%', color: '#dbeafe' },
            { offset: '86%', color: '#2563eb' },
            { offset: '100%', color: '#1e3a8a' }
        ],
        edgeGradient: [
            { offset: '0%', color: '#eff6ff' },
            { offset: '50%', color: '#1e40af' },
            { offset: '100%', color: '#172554' }
        ],
        badgeColor: 'text-blue-600 dark:text-blue-400',
        accentRing: 'ring-blue-500',
        previewHex: '#2563eb'
    },
    cyber: {
        id: 'cyber',
        name: 'Cyber Violet',
        tagline: 'Neon Electric Purple',
        start: '#e9d5ff',
        mid: '#a855f7',
        end: '#6b21a8',
        textGradient: [
            { offset: '0%', color: '#faf5ff' },
            { offset: '13%', color: '#e9d5ff' },
            { offset: '27%', color: '#ffffff' },
            { offset: '43%', color: '#c084fc' },
            { offset: '58%', color: '#7e22ce' },
            { offset: '72%', color: '#f3e8ff' },
            { offset: '86%', color: '#9333ea' },
            { offset: '100%', color: '#581c87' }
        ],
        edgeGradient: [
            { offset: '0%', color: '#faf5ff' },
            { offset: '50%', color: '#6b21a8' },
            { offset: '100%', color: '#3b0764' }
        ],
        badgeColor: 'text-purple-600 dark:text-purple-400',
        accentRing: 'ring-purple-500',
        previewHex: '#9333ea'
    },
    amber: {
        id: 'amber',
        name: 'Sunset Amber',
        tagline: 'Golden Luster & Solar Warmth',
        start: '#fef08a',
        mid: '#f59e0b',
        end: '#b45309',
        textGradient: [
            { offset: '0%', color: '#fffbeb' },
            { offset: '13%', color: '#fde68a' },
            { offset: '27%', color: '#ffffff' },
            { offset: '43%', color: '#fbbf24' },
            { offset: '58%', color: '#b45309' },
            { offset: '72%', color: '#fef3c7' },
            { offset: '86%', color: '#d97706' },
            { offset: '100%', color: '#78350f' }
        ],
        edgeGradient: [
            { offset: '0%', color: '#fffbeb' },
            { offset: '50%', color: '#92400e' },
            { offset: '100%', color: '#451a03' }
        ],
        badgeColor: 'text-amber-600 dark:text-amber-400',
        accentRing: 'ring-amber-500',
        previewHex: '#f59e0b'
    },
    crimson: {
        id: 'crimson',
        name: 'Ruby Crimson',
        tagline: 'Bold Vivid Scarlet',
        start: '#fecdd3',
        mid: '#f43f5e',
        end: '#be123c',
        textGradient: [
            { offset: '0%', color: '#fff1f2' },
            { offset: '13%', color: '#fecdd3' },
            { offset: '27%', color: '#ffffff' },
            { offset: '43%', color: '#fb7185' },
            { offset: '58%', color: '#be123c' },
            { offset: '72%', color: '#ffe4e6' },
            { offset: '86%', color: '#e11d48' },
            { offset: '100%', color: '#881337' }
        ],
        edgeGradient: [
            { offset: '0%', color: '#fff1f2' },
            { offset: '50%', color: '#9f1239' },
            { offset: '100%', color: '#4c0519' }
        ],
        badgeColor: 'text-rose-600 dark:text-rose-400',
        accentRing: 'ring-rose-500',
        previewHex: '#e11d48'
    },
    teal: {
        id: 'teal',
        name: 'Oceanic Teal',
        tagline: 'Deep Marine & Mint',
        start: '#99f6e4',
        mid: '#14b8a6',
        end: '#0f766e',
        textGradient: [
            { offset: '0%', color: '#f0fdfa' },
            { offset: '13%', color: '#99f6e4' },
            { offset: '27%', color: '#ffffff' },
            { offset: '43%', color: '#2dd4bf' },
            { offset: '58%', color: '#0f766e' },
            { offset: '72%', color: '#ccfbf1' },
            { offset: '86%', color: '#0d9488' },
            { offset: '100%', color: '#134e4a' }
        ],
        edgeGradient: [
            { offset: '0%', color: '#f0fdfa' },
            { offset: '50%', color: '#115e59' },
            { offset: '100%', color: '#042f2e' }
        ],
        badgeColor: 'text-teal-600 dark:text-teal-400',
        accentRing: 'ring-teal-500',
        previewHex: '#0d9488'
    },
    titanium: {
        id: 'titanium',
        name: 'Titanium Slate',
        tagline: 'Luxury Monochromatic Chrome',
        start: '#f1f5f9',
        mid: '#94a3b8',
        end: '#334155',
        textGradient: [
            { offset: '0%', color: '#f8fafc' },
            { offset: '13%', color: '#e2e8f0' },
            { offset: '27%', color: '#ffffff' },
            { offset: '43%', color: '#94a3b8' },
            { offset: '58%', color: '#334155' },
            { offset: '72%', color: '#f1f5f9' },
            { offset: '86%', color: '#475569' },
            { offset: '100%', color: '#0f172a' }
        ],
        edgeGradient: [
            { offset: '0%', color: '#f8fafc' },
            { offset: '50%', color: '#334155' },
            { offset: '100%', color: '#020617' }
        ],
        badgeColor: 'text-slate-600 dark:text-slate-400',
        accentRing: 'ring-slate-500',
        previewHex: '#64748b'
    },
    custom: {
        id: 'custom',
        name: 'Custom Duo-Hex',
        tagline: 'Your Custom Gradient Palette',
        start: '#86efac',
        mid: '#22c55e',
        end: '#15803d',
        textGradient: [
            { offset: '0%', color: '#ffffff' },
            { offset: '50%', color: '#22c55e' },
            { offset: '100%', color: '#15803d' }
        ],
        edgeGradient: [
            { offset: '0%', color: '#ffffff' },
            { offset: '100%', color: '#14532d' }
        ],
        badgeColor: 'text-emerald-600 dark:text-emerald-400',
        accentRing: 'ring-emerald-500',
        previewHex: '#22c55e'
    }
};

export const THICKNESS_PRESETS = {
    sleek: { id: 'sleek', label: 'Sleek & Thin', inner: 80, outer: 108 },
    standard: { id: 'standard', label: 'Standard Balanced', inner: 66, outer: 108 },
    bold: { id: 'bold', label: 'Bold & Chunky', inner: 48, outer: 108 }
};

export const GAP_PRESETS = {
    tight: { id: 'tight', label: 'Tight (1.0°)', gap: 1.0 },
    standard: { id: 'standard', label: 'Standard (1.8°)', gap: 1.8 },
    wide: { id: 'wide', label: 'Wide (3.5°)', gap: 3.5 }
};

export const SPEED_PRESETS = {
    slow: { id: 'slow', label: 'Slow (6 blocks/s · 4.0s cycle)', speed: 6 },
    normal: { id: 'normal', label: 'Normal (12 blocks/s · 2.0s cycle)', speed: 12 },
    brisk: { id: 'brisk', label: 'Brisk (18 blocks/s · 1.3s cycle)', speed: 18 },
    turbo: { id: 'turbo', label: 'Turbo (24 blocks/s · 1.0s cycle)', speed: 24 }
};

export const BLOCK_COUNT_PRESETS = [8, 12, 16, 20, 24, 32];

export const DEFAULT_SPINNER_CONFIG = {
    palette: 'emerald',
    customColors: {
        start: '#a7f3d0',
        mid: '#10b981',
        end: '#047857'
    },
    blockCount: 24,
    speed: 12,
    ringThickness: 'standard',
    slotGap: 1.8,
    brandText: 'ULRMS',
    showBrandText: true,
    showSpecularShine: true,
    showTrackGuide: true
};

export const useSpinnerStore = create(
    persist(
        (set, get) => ({
            ...DEFAULT_SPINNER_CONFIG,
            isHydrated: false,

            setHydrated: () => set({ isHydrated: true }),

            updateConfig: (patch) => set((state) => ({ ...state, ...patch })),

            setPalette: (palette) => set({ palette }),

            setCustomColor: (key, hex) => set((state) => ({
                customColors: { ...state.customColors, [key]: hex }
            })),

            resetDefaults: () => set({ ...DEFAULT_SPINNER_CONFIG })
        }),
        {
            name: 'ulrms-spinner-configuration',
            onRehydrateStorage: () => (state) => {
                if (state) state.setHydrated();
            }
        }
    )
);

/**
 * Mathematically generates block paths for any count, inner radius, outer radius, and gap.
 */
export function generateRadialPaths(count = 24, inner = 66, outer = 108, gap = 1.8, cx = 130, cy = 130) {
    const step = (Math.PI * 2) / count;
    const half = Math.max(0, (step - (gap * Math.PI) / 180) / 2);
    const paths = [];

    for (let i = 0; i < count; i++) {
        const a = i * step;
        const p1 = [cx + inner * Math.sin(a - half), cy - inner * Math.cos(a - half)];
        const p2 = [cx + outer * Math.sin(a - half), cy - outer * Math.cos(a - half)];
        const p3 = [cx + outer * Math.sin(a + half), cy - outer * Math.cos(a + half)];
        const p4 = [cx + inner * Math.sin(a + half), cy - inner * Math.cos(a + half)];

        const d = `M ${p1[0].toFixed(3)} ${p1[1].toFixed(3)} L ${p2[0].toFixed(3)} ${p2[1].toFixed(3)} A ${outer} ${outer} 0 0 1 ${p3[0].toFixed(3)} ${p3[1].toFixed(3)} L ${p4[0].toFixed(3)} ${p4[1].toFixed(3)} A ${inner} ${inner} 0 0 0 ${p1[0].toFixed(3)} ${p1[1].toFixed(3)} Z`;
        paths.push(d);
    }
    return paths;
}
