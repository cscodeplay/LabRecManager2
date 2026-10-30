'use client';

import React from 'react';
import { X, Ticket, CheckCircle2, AlertTriangle, KeyRound, Clock, ShieldCheck, Printer, Calendar } from 'lucide-react';

/**
 * BackupTurnHistoryModal
 * Displays detailed emergency backup codes audit history for a student:
 * - Current password configuration status (Password Set vs Pending 1st Login)
 * - 1st-Time PIN generation status
 * - 10-turn breakdown with exact date and time each turn was used
 */
export default function BackupTurnHistoryModal({
    isOpen,
    onClose,
    user,
    onRegenerate
}) {
    if (!isOpen || !user) return null;

    const backupCodes = user.backupCodes || [];
    const totalTurns = user.backupStats?.totalTurns || backupCodes.length || 0;
    const usedTurns = user.backupStats?.usedTurns || backupCodes.filter(c => c.isUsed).length || 0;
    const remainingTurns = totalTurns - usedTurns;
    const isPasswordSet = !user.mustChangePassword;

    // Build 10 turns array (fill up to 10 if generated)
    const turnList = Array.from({ length: Math.max(10, totalTurns) }, (_, idx) => {
        const turnNum = idx + 1;
        const record = backupCodes.find(c => c.turnIndex === turnNum);
        return {
            turnIndex: turnNum,
            isUsed: record ? record.isUsed : false,
            usedAt: record ? record.usedAt : null,
            hasRecord: !!record
        };
    });

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                            <Ticket className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                {user.firstName} {user.lastName}
                                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                    {user.role}
                                </span>
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {user.email} {user.studentId ? `• ID: ${user.studentId}` : ''}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        title="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-5">
                    {/* Access & Password Status Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Password Card */}
                        <div className={`p-3.5 rounded-xl border ${
                            isPasswordSet
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                : 'bg-amber-50/70 border-amber-200 text-amber-950'
                        }`}>
                            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-1">
                                {isPasswordSet ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        <span className="text-emerald-700">Password Active</span>
                                    </>
                                ) : (
                                    <>
                                        <Clock className="w-4 h-4 text-amber-600" />
                                        <span className="text-amber-800">Pending 1st Login</span>
                                    </>
                                )}
                            </div>
                            <p className="text-xs text-slate-600 leading-tight">
                                {isPasswordSet
                                    ? 'Student has successfully configured their personal password.'
                                    : 'Awaiting student to enter their 1st-time PIN or backup code.'}
                            </p>
                            {user.lastLogin && (
                                <p className="text-[10px] text-slate-500 font-mono mt-1.5">
                                    Last Login: {new Date(user.lastLogin).toLocaleString()}
                                </p>
                            )}
                        </div>

                        {/* Backup Slips Card */}
                        <div className="p-3.5 rounded-xl border bg-indigo-50/70 border-indigo-200 text-indigo-950">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                                    10-Turn Backup Slip
                                </span>
                                <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-900">
                                    {remainingTurns}/{totalTurns || 10} Left
                                </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-tight">
                                {totalTurns > 0
                                    ? `${usedTurns} turn(s) used for phone-free lab password reset.`
                                    : 'No emergency backup codes generated yet for this student.'}
                            </p>
                            {user.hasSecurityQuestion && (
                                <p className="text-[10px] text-teal-700 font-medium mt-1.5 flex items-center gap-1">
                                    ✓ Security question configured
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Turn Breakdown Section */}
                    <div>
                        <div className="flex items-center justify-between mb-2.5">
                            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                <Ticket className="w-4 h-4 text-slate-700" />
                                Turn-by-Turn Emergency Usage Audit
                            </h4>
                            <span className="text-[11px] text-slate-500">
                                {usedTurns === 0 ? 'All 10 turns unused' : `${usedTurns} turn(s) consumed`}
                            </span>
                        </div>

                        {totalTurns === 0 ? (
                            <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                                <p className="text-xs text-slate-600 font-medium">
                                    No backup slips have been printed for {user.firstName} yet.
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Click &quot;Generate & Print Slip&quot; below to issue a fresh 10-turn A4 paper chip.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {turnList.map((t) => (
                                    <div
                                        key={`turn-audit-${t.turnIndex}`}
                                        className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition ${
                                            t.isUsed
                                                ? 'bg-amber-50/80 border-amber-300 text-amber-950 shadow-2xs'
                                                : 'bg-slate-50 border-slate-200 text-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                                t.isUsed
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-slate-200 text-slate-700'
                                            }`}>
                                                #{t.turnIndex}
                                            </span>
                                            <div>
                                                <div className="font-bold flex items-center gap-1">
                                                    {t.isUsed ? 'Turn Used' : 'Turn Unused'}
                                                    {t.isUsed && (
                                                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                                    )}
                                                </div>
                                                {t.isUsed && t.usedAt && (
                                                    <div className="text-[10px] text-amber-800 font-mono">
                                                        {new Date(t.usedAt).toLocaleString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            hour: 'numeric',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                            t.isUsed
                                                ? 'bg-amber-200/80 border-amber-400 text-amber-900 font-mono'
                                                : 'bg-emerald-100 border-emerald-300 text-emerald-800 font-medium'
                                        }`}>
                                            {t.isUsed ? 'BURNED' : 'READY'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                    >
                        Close
                    </button>
                    {onRegenerate && (
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onRegenerate(user);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            {totalTurns > 0 ? 'Re-Issue Fresh Slip (A4)' : 'Generate & Print Slip (A4)'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
