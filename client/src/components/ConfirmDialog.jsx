'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AlertTriangle, Trash2, Info, X, Loader2 } from 'lucide-react';

const ConfirmContext = createContext(null);

function getTypeDetails(type) {
    switch (type) {
        case 'warning':
            return {
                icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
                iconBg: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
                confirmBtn: 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-lg shadow-amber-500/25',
                glowRing: 'ring-amber-500/20',
            };
        case 'info':
            return {
                icon: <Info className="w-6 h-6 text-cyan-400" />,
                iconBg: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
                confirmBtn: 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25',
                glowRing: 'ring-cyan-500/20',
            };
        case 'danger':
        default:
            return {
                icon: <Trash2 className="w-6 h-6 text-rose-400" />,
                iconBg: 'bg-rose-500/20 border-rose-500/30 text-rose-400',
                confirmBtn: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-500/30',
                glowRing: 'ring-rose-500/20',
            };
    }
}

/**
 * Standalone JSX Modal Component for `<ConfirmDialog isOpen={...} ... />`
 */
export default function ConfirmDialog({
    isOpen,
    open, // fallback prop name
    onClose,
    onCancel,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger',
    loading = false,
}) {
    const isVisible = isOpen ?? open ?? false;
    const handleClose = onCancel || onClose || (() => {});

    useEffect(() => {
        if (!isVisible) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !loading) {
                handleClose();
            } else if (e.key === 'Enter' && !loading && onConfirm) {
                onConfirm();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, loading, handleClose, onConfirm]);

    if (!isVisible) return null;

    const typeDetails = getTypeDetails(type);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => !loading && handleClose()}
        >
            <div
                className={`relative w-full max-w-md bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl p-6 text-white shadow-2xl ring-4 ${typeDetails.glowRing} animate-in zoom-in-95 duration-200`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top Close Button */}
                <button
                    onClick={() => !loading && handleClose()}
                    disabled={loading}
                    className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition disabled:opacity-50"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-4">
                    {/* Icon Badge */}
                    <div className={`p-3 rounded-2xl border ${typeDetails.iconBg} flex items-center justify-center flex-shrink-0`}>
                        {typeDetails.icon}
                    </div>

                    {/* Title & Message */}
                    <div className="flex-1 pt-0.5">
                        <h3 className="text-lg font-bold text-slate-100 mb-1.5">
                            {title}
                        </h3>
                        <p className="text-sm text-slate-300/90 leading-relaxed">
                            {message}
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
                    <button
                        type="button"
                        onClick={() => !loading && handleClose()}
                        disabled={loading}
                        className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={() => onConfirm && onConfirm()}
                        disabled={loading}
                        className={`px-5 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 disabled:opacity-60 ${typeDetails.confirmBtn}`}
                        autoFocus
                    >
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Global Confirm Provider & Programmatic `useConfirm` Hook
 */
export function ConfirmProvider({ children }) {
    const [confirmState, setConfirmState] = useState(null);

    const confirm = useCallback((options) => {
        return new Promise((resolve) => {
            setConfirmState({
                title: options?.title || 'Confirm Action',
                message: options?.message || 'Are you sure you want to proceed?',
                confirmText: options?.confirmText || 'Confirm',
                cancelText: options?.cancelText || 'Cancel',
                type: options?.type || 'danger',
                resolve,
            });
        });
    }, []);

    const handleConfirm = () => {
        if (confirmState?.resolve) {
            confirmState.resolve(true);
        }
        setConfirmState(null);
    };

    const handleCancel = () => {
        if (confirmState?.resolve) {
            confirmState.resolve(false);
        }
        setConfirmState(null);
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}

            <ConfirmDialog
                isOpen={!!confirmState}
                onClose={handleCancel}
                onConfirm={handleConfirm}
                title={confirmState?.title}
                message={confirmState?.message}
                confirmText={confirmState?.confirmText}
                cancelText={confirmState?.cancelText}
                type={confirmState?.type}
            />
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        return async (options) => {
            console.warn('[useConfirm] ConfirmProvider not found in component tree. Auto-confirming action.');
            return true;
        };
    }
    return context;
}
