/**
 * whiteboardPageUtils.js
 * Lossless helper utilities for whiteboard multi-page reordering and state manipulation.
 */

/**
 * Reorders a whiteboard state (or parsed canvasData) by moving a page from `fromIndex` to `toIndex`.
 * Safely preserves all parallel layer collections:
 *   - pages (canvas raster data URLs)
 *   - pageThumbnails (preview images)
 *   - pageBackgrounds (pattern & color)
 *   - pageImageObjects
 *   - pageTextObjects
 *   - pageShapeObjects
 *   - pageMediaObjects
 *   - pagePdfObjects
 *   - page3DObjects
 *   - pageGraphObjects
 *   - pageQuizObjects
 *   - pageAIPanels
 *
 * @param {Object} state - The parsed whiteboard state object
 * @param {number} fromIndex - Current zero-based index of the page
 * @param {number} toIndex - Target zero-based index for the page
 * @returns {Object} A fresh updated state object with reordered pages
 */
export function reorderWhiteboardPagesState(state, fromIndex, toIndex) {
    if (!state || typeof state !== 'object') return state;
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return state;

    const totalPages = Math.max(
        Number(state.totalPages) || 1,
        Array.isArray(state.pages) ? state.pages.length : 1,
        Array.isArray(state.pageThumbnails) ? state.pageThumbnails.length : 1
    );

    if (fromIndex >= totalPages || toIndex >= totalPages) return state;

    const nextState = { ...state };

    // 1. Reorder pages array (raster canvas data URLs)
    const rawPages = Array.isArray(state.pages) ? [...state.pages] : Array(totalPages).fill(null);
    while (rawPages.length < totalPages) rawPages.push(null);
    const [movedPage] = rawPages.splice(fromIndex, 1);
    rawPages.splice(toIndex, 0, movedPage);
    nextState.pages = rawPages;

    // 2. Reorder pageThumbnails array
    const rawThumbs = Array.isArray(state.pageThumbnails) ? [...state.pageThumbnails] : [];
    if (rawThumbs.length > 0) {
        while (rawThumbs.length < totalPages) rawThumbs.push(null);
        const [movedThumb] = rawThumbs.splice(fromIndex, 1);
        rawThumbs.splice(toIndex, 0, movedThumb);
        nextState.pageThumbnails = rawThumbs;
    }

    // Helper to reorder 0-based numeric keyed maps: { 0: [...], 1: [...] }
    const reorderMap = (sourceMap) => {
        if (!sourceMap || typeof sourceMap !== 'object') return {};
        const newMap = {};
        const items = [];
        for (let i = 0; i < totalPages; i++) {
            items.push(sourceMap[i] !== undefined ? sourceMap[i] : (Array.isArray(sourceMap[0]) ? [] : null));
        }
        const [moved] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, moved);
        for (let i = 0; i < totalPages; i++) {
            if (items[i] !== null && items[i] !== undefined) {
                newMap[i] = items[i];
            }
        }
        return newMap;
    };

    nextState.pageBackgrounds = reorderMap(state.pageBackgrounds);
    nextState.pageImageObjects = reorderMap(state.pageImageObjects);
    nextState.pageTextObjects = reorderMap(state.pageTextObjects);
    nextState.pageShapeObjects = reorderMap(state.pageShapeObjects);
    nextState.pageMediaObjects = reorderMap(state.pageMediaObjects);
    nextState.pagePdfObjects = reorderMap(state.pagePdfObjects);
    nextState.page3DObjects = reorderMap(state.page3DObjects);
    nextState.pageGraphObjects = reorderMap(state.pageGraphObjects);
    nextState.pageQuizObjects = reorderMap(state.pageQuizObjects);
    nextState.pageAIPanels = reorderMap(state.pageAIPanels);

    // Update currentPage index if present
    if (typeof state.currentPage === 'number') {
        if (state.currentPage === fromIndex) {
            nextState.currentPage = toIndex;
        } else if (state.currentPage > fromIndex && state.currentPage <= toIndex) {
            nextState.currentPage = state.currentPage - 1;
        } else if (state.currentPage < fromIndex && state.currentPage >= toIndex) {
            nextState.currentPage = state.currentPage + 1;
        }
    }

    nextState.totalPages = totalPages;
    return nextState;
}
