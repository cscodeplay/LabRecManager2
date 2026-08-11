'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AlertTriangle, Trash2, Info, HelpCircle, X } from 'lucide-react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
    const [confirmState, setConfirmState] = useState(null);

    const confirm = useCallback((options) => {
        return new Promise((resolve) => {
            setConfirmState({
                title: options?.title || 'Confirm Action',
                message: options?.message || 'Are you sure you want to proceed?',
                confirmText: options?.confirmText || 'Confirm',
                cancelText: options?.cancelText || 'Cancel',
                type: options?.type || 'danger', // 'danger', 'warning', 'info'
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

    useEffect(() => {
        if (!confirmState) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                handleCancel();
            } else if (e.key === 'Enter') {
                handleConfirm();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [confirmState]);

    const getTypeDetails = () => {
        switch (confirmState?.type) {
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
    };

    const typeDetails = getTypeDetails();

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}

            {confirmState && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150"
                    onClick={handleCancel}
                >
                    <div
                        className={`relative w-full max-w-md bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl p-6 text-white shadow-2xl ring-4 ${typeDetails.glowRing} animate-in zoom-in-95 duration-200`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Top Close Button */}
                        <button
                            onClick={handleCancel}
                            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
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
                                    {confirmState.title}
                                </h3>
                                <p className="text-sm text-slate-300/90 leading-relaxed">
                                    {confirmState.message}
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition"
                            >
                                {confirmState.cancelText}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                className={`px-5 py-2 text-xs font-semibold rounded-xl transition ${typeDetails.confirmBtn}`}
                                autoFocus
                            >
                                {confirmState.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        // Fallback to window.confirm if used outside provider
        return async (options) => {
            return window.confirm(options?.message || options?.title || 'Are you sure?');
        };
    }
    return context;
}
