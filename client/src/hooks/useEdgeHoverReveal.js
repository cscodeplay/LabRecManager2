'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Returns true on memory-constrained panels/devices (<= 4GB reported RAM)
 * so heavy backdrop-blur compositor textures can be avoided.
 */
export function useLowMemoryDevice() {
    const [isLowMemory, setIsLowMemory] = useState(false);

    useEffect(() => {
        if (typeof navigator !== 'undefined' && typeof navigator.deviceMemory === 'number') {
            setIsLowMemory(navigator.deviceMemory <= 4);
        }
    }, []);

    return isLowMemory;
}

/**
 * Shared controller for 0ms mouse/pen edge-hover reveal and macOS-style
 * delayed auto-hide with focus, pin, Escape, and touch fallbacks.
 */
export function useEdgeHoverReveal({
    autoHideMs = 2500,
    initialPeekMs = 0,
    storageKey = null,
    isLocked = false,
} = {}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [hasFocusWithin, setHasFocusWithin] = useState(false);

    const closeTimerRef = useRef(null);
    const pointerInsideRef = useRef(false);

    // Hydrate pin preference from localStorage
    useEffect(() => {
        if (!storageKey || typeof window === 'undefined') return;
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved !== null) {
                const parsed = JSON.parse(saved);
                if (typeof parsed === 'boolean') {
                    setIsPinned(parsed);
                    if (parsed) setIsOpen(true);
                }
            }
        } catch {
            // Ignore storage access errors
        }
    }, [storageKey]);

    // Optional initial mount peek (auto-hides after initialPeekMs unless hovered/pinned)
    useEffect(() => {
        if (!initialPeekMs || typeof window === 'undefined') return;
        const canHover = window.matchMedia?.('(hover: hover)').matches;
        if (!canHover) return;

        setIsOpen(true);
        const timer = setTimeout(() => {
            if (!pointerInsideRef.current) {
                setIsOpen(false);
            }
        }, initialPeekMs);

        return () => clearTimeout(timer);
    }, [initialPeekMs]);

    const clearCloseTimer = useCallback(() => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    }, []);

    const scheduleAutoHide = useCallback(() => {
        clearCloseTimer();
        if (isPinned || isLocked || hasFocusWithin || pointerInsideRef.current) {
            return;
        }
        closeTimerRef.current = setTimeout(() => {
            setIsOpen(false);
        }, autoHideMs);
    }, [autoHideMs, clearCloseTimer, hasFocusWithin, isLocked, isPinned]);

    // Re-evaluate auto-hide when locks or focus clear
    useEffect(() => {
        if (isPinned || isLocked || hasFocusWithin) {
            clearCloseTimer();
            if (isPinned || isLocked) {
                setIsOpen(true);
            }
        } else if (isOpen && !pointerInsideRef.current) {
            scheduleAutoHide();
        }
    }, [isPinned, isLocked, hasFocusWithin, isOpen, clearCloseTimer, scheduleAutoHide]);

    // Dismiss unpinned hover bars on Escape (WCAG 1.4.13)
    useEffect(() => {
        if (!isOpen || isPinned) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !isLocked) {
                clearCloseTimer();
                pointerInsideRef.current = false;
                setHasFocusWithin(false);
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isPinned, isLocked, clearCloseTimer]);

    // Tap / click outside dismissal for touch / tablet devices
    const containerElRef = useRef(null);
    useEffect(() => {
        if (!isOpen || isPinned) return;
        const handleOutsidePointer = (e) => {
            // Guard: Do not dismiss if a menu, modal, or dropdown is currently locked open
            if (isLocked) return;

            // Check if pointer event was inside the primary container
            if (containerElRef.current && !containerElRef.current.contains(e.target)) {
                // Also check if target is inside an attached dropdown, popover or portal menu
                if (e.target && typeof e.target.closest === 'function') {
                    if (e.target.closest('[data-popover], [role="menu"], [role="dialog"], [data-dropdown], .session-menu, .notif-menu')) {
                        return;
                    }
                }
                clearCloseTimer();
                pointerInsideRef.current = false;
                setHasFocusWithin(false);
                setIsOpen(false);
            }
        };
        // Capture phase to catch all taps on iPad / mobile outside the sidebar/bar
        window.addEventListener('pointerdown', handleOutsidePointer, true);
        return () => window.removeEventListener('pointerdown', handleOutsidePointer, true);
    }, [isOpen, isPinned, isLocked, clearCloseTimer]);

    useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

    const handlePointerEnter = useCallback((e) => {
        clearCloseTimer();
        pointerInsideRef.current = true;
        setIsOpen(true);
    }, [clearCloseTimer]);

    const handlePointerLeave = useCallback((e) => {
        pointerInsideRef.current = false;
        scheduleAutoHide();
    }, [scheduleAutoHide]);

    const handleFocusCapture = useCallback(() => {
        clearCloseTimer();
        setHasFocusWithin(true);
        setIsOpen(true);
    }, [clearCloseTimer]);

    const handleBlurCapture = useCallback((e) => {
        // Keep open if focus moved to another descendant inside the same container
        if (e.currentTarget && e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) {
            return;
        }
        setHasFocusWithin(false);
    }, []);

    const togglePinned = useCallback(() => {
        setIsPinned((prev) => {
            const next = !prev;
            if (storageKey && typeof window !== 'undefined') {
                try {
                    localStorage.setItem(storageKey, JSON.stringify(next));
                } catch {
                    // Ignore storage quota errors
                }
            }
            if (next) {
                clearCloseTimer();
                setIsOpen(true);
            }
            return next;
        });
    }, [clearCloseTimer, storageKey]);

    const openNow = useCallback(() => {
        clearCloseTimer();
        setIsOpen(true);
    }, [clearCloseTimer]);

    const closeNow = useCallback(() => {
        clearCloseTimer();
        pointerInsideRef.current = false;
        setIsOpen(false);
    }, [clearCloseTimer]);

    const toggleOpen = useCallback(() => {
        clearCloseTimer();
        setIsOpen((prev) => {
            const next = !prev;
            if (next && !isPinned) {
                closeTimerRef.current = setTimeout(() => {
                    setIsOpen(false);
                }, autoHideMs || 3500);
            }
            return next;
        });
    }, [clearCloseTimer, isPinned, autoHideMs]);

    return {
        isVisible: isPinned || isOpen || isLocked || hasFocusWithin,
        isOpen,
        isPinned,
        togglePinned,
        openNow,
        closeNow,
        toggleOpen,
        triggerProps: {
            onPointerEnter: handlePointerEnter,
            onPointerMove: handlePointerEnter,
            onPointerLeave: handlePointerLeave,
        },
        containerProps: {
            ref: containerElRef,
            onPointerEnter: handlePointerEnter,
            onPointerLeave: handlePointerLeave,
            onFocusCapture: handleFocusCapture,
            onBlurCapture: handleBlurCapture,
        },
    };
}
