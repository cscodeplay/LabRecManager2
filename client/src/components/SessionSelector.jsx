'use client';

import { useEffect, useState } from 'react';
import { Calendar, ChevronDown, Lock, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';

export default function SessionSelector() {
    const {
        selectedSession,
        availableSessions,
        isReadOnlyMode,
        setSession,
        setAvailableSessions,
        isAuthenticated
    } = useAuthStore();

    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Load available sessions on mount
    useEffect(() => {
        if (isAuthenticated) {
            loadSessions();
        }
    }, [isAuthenticated]);

    const loadSessions = async () => {
        try {
            setLoading(true);
            const response = await api.get('/academic-years');
            const sessions = response.data.data.academicYears || [];
            setAvailableSessions(sessions);

            // Auto-select current session if none selected
            if (!selectedSession && sessions.length > 0) {
                const current = sessions.find(s => s.isCurrent) || sessions[0];
                setSession(current);
            }
        } catch (error) {
            console.error('Failed to load sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectSession = (session) => {
        setSession(session);
        setIsOpen(false);
    };

    if (!isAuthenticated || loading) {
        return null;
    }

    return (
        <div className="relative">
            {/* Selector Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${isReadOnlyMode
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-primary-300'
                    }`}
            >
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">
                    {selectedSession?.yearLabel || 'Select Session'}
                </span>
                {isReadOnlyMode && <Lock className="w-3 h-3 text-amber-600" />}
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown Menu */}
                    <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
                        <div className="p-2 border-b border-slate-100 bg-slate-50">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Academic Session
                            </p>
                        </div>

                        <div className="max-h-64 overflow-y-auto">
                            {availableSessions.length === 0 ? (
                                <div className="p-4 text-center text-sm text-slate-500">
                                    No sessions available
                                </div>
                            ) : (
                                availableSessions.map((session) => (
                                    <button
                                        key={session.id}
                                        onClick={() => handleSelectSession(session)}
                                        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition ${selectedSession?.id === session.id ? 'bg-primary-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Calendar className={`w-4 h-4 ${session.isCurrent ? 'text-emerald-600' : 'text-slate-400'
                                                }`} />
                                            <div className="text-left">
                                                <p className="text-sm font-medium text-slate-900">
                                                    {session.yearLabel}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {new Date(session.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} - {new Date(session.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {session.isCurrent && (
                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                                                    Current
                                                </span>
                                            )}
                                            {!session.isCurrent && (
                                                <Lock className="w-3 h-3 text-amber-500" />
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Info Footer */}
                        <div className="p-3 border-t border-slate-100 bg-slate-50">
                            <div className="flex items-start gap-2 text-xs text-slate-500">
                                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>Historical sessions are read-only. Switch to current session to make changes.</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// Read-only mode banner component
export function ReadOnlyBanner() {
    const { isReadOnlyMode, selectedSession } = useAuthStore();

    if (!isReadOnlyMode) return null;

    return (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-amber-800 text-sm">
                <Lock className="w-4 h-4" />
                <span>
                    <strong>Read-Only Mode:</strong> Viewing {selectedSession?.yearLabel} session.
                    Data cannot be modified in historical sessions.
                </span>
            </div>
        </div>
    );
}
