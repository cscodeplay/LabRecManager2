/**
 * Universal Human-Readable Date & Time Utilities for LabRecManager
 */

/**
 * Formats a date into a clean, human-readable date string (e.g., "12 Aug 2026").
 * @param {Date|string|number} date 
 * @param {Intl.DateTimeFormatOptions} [options] 
 * @returns {string}
 */
export function formatDate(date, options = {}) {
    if (!date) return 'N/A';
    try {
        const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            ...options
        });
    } catch {
        return 'N/A';
    }
}

/**
 * Formats a date into a clean, human-readable date & time string (e.g., "12 Aug 2026, 4:30 PM").
 * @param {Date|string|number} date 
 * @returns {string}
 */
export function formatDateTime(date) {
    if (!date) return 'N/A';
    try {
        const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch {
        return 'N/A';
    }
}

/**
 * Formats a date into a clean 12-hour time string (e.g., "4:30 PM").
 * @param {Date|string|number} date 
 * @returns {string}
 */
export function formatTime(date) {
    if (!date) return 'N/A';
    try {
        const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch {
        return 'N/A';
    }
}

/**
 * Formats a date into a human-friendly relative time (e.g., "Just now", "5m ago", "2h ago", "Yesterday").
 * @param {Date|string|number} date 
 * @returns {string}
 */
export function formatRelativeTime(date) {
    if (!date) return 'N/A';
    try {
        const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
        if (isNaN(d.getTime())) return 'N/A';
        const now = Date.now();
        const diffMs = now - d.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 45) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;

        return formatDate(d);
    } catch {
        return 'N/A';
    }
}

/**
 * Formats a start and end date range cleanly (e.g., "12 Aug 2026 – 15 Aug 2026" or "Aug 2025 – May 2026").
 * @param {Date|string|number} startDate 
 * @param {Date|string|number} endDate 
 * @param {boolean} [monthYearOnly=false]
 * @returns {string}
 */
export function formatDateRange(startDate, endDate, monthYearOnly = false) {
    if (!startDate && !endDate) return 'N/A';
    const opts = monthYearOnly
        ? { month: 'short', year: 'numeric' }
        : { day: 'numeric', month: 'short', year: 'numeric' };
    const startStr = startDate ? formatDate(startDate, opts) : 'N/A';
    const endStr = endDate ? formatDate(endDate, opts) : 'Ongoing';
    return `${startStr} – ${endStr}`;
}
