// Accessible, Color-Blind Aware Mathematical Palette for Graph Plotter

export const EQUATION_PALETTE = [
    { name: 'Classic Blue', hex: '#2563eb', lightHex: '#60a5fa', darkHex: '#1d4ed8', border: '#3b82f6' },
    { name: 'Crimson Red', hex: '#dc2626', lightHex: '#f87171', darkHex: '#b91c1c', border: '#ef4444' },
    { name: 'Emerald Green', hex: '#059669', lightHex: '#34d399', darkHex: '#047857', border: '#10b981' },
    { name: 'Vibrant Amber', hex: '#d97706', lightHex: '#fbbf24', darkHex: '#b45309', border: '#f59e0b' },
    { name: 'Deep Purple', hex: '#7c3aed', lightHex: '#a78bfa', darkHex: '#6d28d9', border: '#8b5cf6' },
    { name: 'Bright Magenta', hex: '#db2777', lightHex: '#f472b6', darkHex: '#be185d', border: '#ec4899' },
    { name: 'Ocean Cyan', hex: '#0284c7', lightHex: '#38bdf8', darkHex: '#0369a1', border: '#0ea5e9' },
    { name: 'Lime Zest', hex: '#65a30d', lightHex: '#a3e635', darkHex: '#4d7c0f', border: '#84cc16' },
    { name: 'Tangerine Orange', hex: '#ea580c', lightHex: '#fb923c', darkHex: '#c2410c', border: '#f97316' },
    { name: 'Electric Indigo', hex: '#4f46e5', lightHex: '#818cf8', darkHex: '#4338ca', border: '#6366f1' },
    { name: 'Teal Peacock', hex: '#0d9488', lightHex: '#2dd4bf', darkHex: '#0f766e', border: '#14b8a6' },
    { name: 'Rose Petal', hex: '#e11d48', lightHex: '#fb7185', darkHex: '#be123c', border: '#f43f5e' },
];

/**
 * Return default color for equation index
 */
export function getEquationColor(index) {
    const entry = EQUATION_PALETTE[index % EQUATION_PALETTE.length];
    return entry.hex;
}

/**
 * Converts Hex string to rgba() CSS string
 */
export function hexToRgba(hex, alpha = 1) {
    if (!hex) return `rgba(59, 130, 246, ${alpha})`;
    let c = hex.replace('#', '');
    if (c.length === 3) {
        c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    const num = parseInt(c, 16);
    if (isNaN(num)) return `rgba(59, 130, 246, ${alpha})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * List of fast swatch colors for the color picker
 */
export const COLOR_SWATCHES = [
    '#2563eb', // Blue
    '#dc2626', // Red
    '#059669', // Green
    '#d97706', // Amber
    '#7c3aed', // Purple
    '#db2777', // Magenta
    '#0284c7', // Cyan
    '#65a30d', // Lime
    '#ea580c', // Orange
    '#4f46e5', // Indigo
    '#0d9488', // Teal
    '#000000', // Black
    '#ffffff', // White
    '#e11d48', // Rose
    '#8b5cf6', // Violet
    '#eab308', // Yellow
];
