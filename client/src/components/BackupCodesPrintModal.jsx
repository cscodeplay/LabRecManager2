'use client';

import React from 'react';
import { Printer, X, Scissors, KeyRound, AlertCircle, CheckSquare } from 'lucide-react';

/**
 * BackupCodesPrintModal
 * Renders individual or batch 10-turn emergency backup code chips formatted
 * strictly for A4 paper with visible cut lines (dashed borders & scissor marks).
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {Array} chips - Array of { userId, userName, role, email, admissionNumber, schoolName, schoolCode, generatedAt, codes }
 */
export default function BackupCodesPrintModal({ isOpen, onClose, chips = [], defaultSchoolName = '', defaultSchoolLogo = '' }) {
    if (!isOpen || !chips || chips.length === 0) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
            {/* Modal Container */}
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden print:max-w-none print:w-full print:max-h-none print:shadow-none print:rounded-none">

                {/* Screen Header (Hidden in Print) */}
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                            <KeyRound className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                10-Turn Emergency Backup Codes (A4 Paper Chips)
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                                    {chips.length} {chips.length === 1 ? 'Chip' : 'Chips'}
                                </span>
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Formatted for standard A4 paper with scissor cut guides. Distribute small paper chips to students/instructors.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-md cursor-pointer"
                        >
                            <Printer className="w-4 h-4" />
                            Print A4 Sheet (Ctrl+P)
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Screen Hint Bar */}
                <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between print:hidden shrink-0">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                            <strong>Printing Tip:</strong> In the browser print dialog, ensure <strong>Paper Size is A4</strong> and <strong>Margins are set to Minimum or Default</strong>. Background graphics enabled.
                        </span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-amber-800">
                        <Scissors className="w-3.5 h-3.5" /> 8 chips fit per A4 page (2×4 grid)
                    </div>
                </div>

                {/* Printable Content Area */}
                <div id="backup-codes-print-area" className="flex-1 overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible bg-slate-100 print:bg-white">
                    <style jsx global>{`
                        @media print {
                            @page {
                                size: A4 portrait;
                                margin: 8mm 6mm;
                            }
                            html, body {
                                background: #ffffff !important;
                                color: #000000 !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            /* Hide all external UI elements when printing */
                            body * {
                                visibility: hidden;
                            }
                            #backup-codes-print-area, #backup-codes-print-area * {
                                visibility: visible;
                            }
                            #backup-codes-print-area {
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 100%;
                                padding: 0 !important;
                                margin: 0 !important;
                                background: transparent !important;
                            }
                            .a4-print-grid {
                                display: grid !important;
                                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                                gap: 4mm !important;
                                page-break-inside: auto;
                            }
                            .chip-card {
                                page-break-inside: avoid !important;
                                break-inside: avoid !important;
                                border: 1.5px dashed #000000 !important;
                                box-shadow: none !important;
                            }
                        }
                    `}</style>

                    {/* A4 Grid Layout */}
                    <div className="a4-print-grid grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[210mm] mx-auto">
                        {chips.map((chip, idx) => (
                            <div
                                key={`chip-${chip.userId || idx}`}
                                className="chip-card relative bg-white border-2 border-dashed border-slate-700 rounded-lg p-3 text-slate-900 shadow-xs flex flex-col justify-between"
                                style={{ minHeight: '66mm' }}
                            >
                                {/* Top Cut Line Guide */}
                                <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono -mt-1 mb-1 border-b border-dashed border-slate-300 pb-0.5">
                                    <span className="flex items-center gap-1">
                                        <Scissors className="w-2.5 h-2.5" /> CUT HERE
                                    </span>
                                    <span className="tracking-widest">-----------------------------</span>
                                    <span className="flex items-center gap-1">
                                        CUT HERE <Scissors className="w-2.5 h-2.5" />
                                    </span>
                                </div>

                                {/* Chip Header: School Logo on Left, Centered Wrapped School Name, Role on Right */}
                                <div>
                                    <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-slate-300">
                                        {/* Left: School Logo */}
                                        <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                                            {(chip.schoolLogo || defaultSchoolLogo) ? (
                                                <img
                                                    src={chip.schoolLogo || defaultSchoolLogo}
                                                    alt="Logo"
                                                    className="w-full h-full object-contain p-0.5"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        if (e.currentTarget.nextSibling) {
                                                            e.currentTarget.nextSibling.style.display = 'flex';
                                                        }
                                                    }}
                                                />
                                            ) : null}
                                            <span
                                                className={`text-[9px] font-black text-slate-800 ${
                                                    (chip.schoolLogo || defaultSchoolLogo) ? 'hidden' : 'flex'
                                                } items-center justify-center w-full h-full`}
                                            >
                                                {chip.schoolCode || 'LAB'}
                                            </span>
                                        </div>

                                        {/* Center: Complete School Name (Centered & Wrapped, Never Truncated) */}
                                        <div className="flex-1 min-w-0 text-center px-1">
                                            <div className="text-[10px] font-black uppercase tracking-tight text-slate-950 leading-snug break-words whitespace-normal text-center">
                                                {chip.schoolName || defaultSchoolName || 'LAB RECORD MANAGER'}
                                            </div>
                                        </div>

                                        {/* Right: Role Badge */}
                                        <div className="shrink-0 text-right">
                                            <span className="inline-block text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-900 text-white border border-slate-900 shadow-2xs">
                                                {chip.role}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Student Credentials Row: Name, Darkened ID, Underlined Email */}
                                    <div className="py-1 border-b border-slate-200 space-y-0.5">
                                        <div className="flex items-center justify-between gap-1">
                                            <div className="text-xs font-black text-slate-950 uppercase tracking-tight truncate">
                                                {chip.userName}
                                            </div>
                                            {/* Darkened ID */}
                                            <div className="text-[9.5px] font-mono text-right shrink-0">
                                                <span className="text-slate-600 font-sans text-[8.5px] mr-1">ID:</span>
                                                <span className="font-black text-slate-950 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 shadow-2xs text-[10px]">
                                                    {chip.admissionNumber || chip.studentId || 'N/A'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Underlined Email ID */}
                                        <div className="text-[9px] text-slate-700 flex items-center gap-1 min-w-0">
                                            <span className="text-slate-500 font-medium text-[8px] uppercase tracking-wider shrink-0">Email:</span>
                                            <span className="font-bold text-slate-950 font-mono underline decoration-slate-900 decoration-1 underline-offset-2 truncate">
                                                {chip.email}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 1st-Time Login PIN Box */}
                                    <div className="my-1.5 px-2.5 py-1 bg-amber-50/90 border border-amber-300 rounded flex items-center justify-between">
                                        <div className="min-w-0">
                                            <div className="text-[8.5px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
                                                <KeyRound className="w-3 h-3 text-amber-700" />
                                                1ST-TIME LOGIN PIN
                                            </div>
                                            <div className="text-[7.5px] text-amber-800 leading-tight">
                                                Use on 1st login or password reset
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="font-mono font-black text-sm text-slate-950 tracking-widest bg-white px-2 py-0.5 rounded border border-amber-400 shadow-2xs inline-block">
                                                {chip.firstTimePin || chip.pin || '------'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Chip Title Pill */}
                                    <div className="my-1 px-2 py-0.5 bg-slate-100 border border-slate-300 rounded flex items-center justify-between text-[8.5px]">
                                        <span className="font-extrabold text-slate-900 tracking-wide">
                                            EMERGENCY BACKUP CODES
                                        </span>
                                        <span className="font-bold text-slate-700 bg-white px-1 rounded border border-slate-200">
                                            10 SINGLE-USE TURNS
                                        </span>
                                    </div>

                                    {/* 10 Codes Grid (2 Columns of 5) */}
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono my-1">
                                        {/* Column 1 (Turns 1-5) */}
                                        <div className="space-y-0.5">
                                            {chip.codes?.slice(0, 5).map((c) => (
                                                <div
                                                    key={`turn-${c.turn}`}
                                                    className="flex items-center justify-between px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded-sm"
                                                >
                                                    <span className="text-[9px] text-slate-500 font-sans flex items-center gap-1">
                                                        <span className="inline-block w-2.5 h-2.5 border border-slate-400 rounded-xs bg-white"></span>
                                                        #{c.turn}:
                                                    </span>
                                                    <span className="font-bold tracking-wider text-slate-950 font-mono text-[10.5px]">
                                                        {c.code}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Column 2 (Turns 6-10) */}
                                        <div className="space-y-0.5">
                                            {chip.codes?.slice(5, 10).map((c) => (
                                                <div
                                                    key={`turn-${c.turn}`}
                                                    className="flex items-center justify-between px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded-sm"
                                                >
                                                    <span className="text-[9px] text-slate-500 font-sans flex items-center gap-1">
                                                        <span className="inline-block w-2.5 h-2.5 border border-slate-400 rounded-xs bg-white"></span>
                                                        #{c.turn}:
                                                    </span>
                                                    <span className="font-bold tracking-wider text-slate-950 font-mono text-[10.5px]">
                                                        {c.code}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Instructions */}
                                <div className="mt-1 pt-1 border-t border-dashed border-slate-300">
                                    <div className="flex items-center justify-between text-[8px] text-slate-600">
                                        <span>✓ Tick box after each use. Valid for phone-free lab reset.</span>
                                        <span className="font-mono text-slate-400">
                                            {chip.generatedAt ? new Date(chip.generatedAt).toLocaleDateString() : ''}
                                        </span>
                                    </div>
                                    <div className="text-[7.5px] text-slate-500 mt-0.5 text-center font-sans">
                                        Keep slip inside Lab Record Notebook. Enter PIN or Backup Code at login or password reset.
                                    </div>
                                </div>

                                {/* Bottom Cut Line Guide */}
                                <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono mt-1 border-t border-dashed border-slate-300 pt-0.5">
                                    <span className="flex items-center gap-1">
                                        <Scissors className="w-2.5 h-2.5" /> CUT HERE
                                    </span>
                                    <span className="tracking-widest">-----------------------------</span>
                                    <span className="flex items-center gap-1">
                                        CUT HERE <Scissors className="w-2.5 h-2.5" />
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Controls (Screen Only) */}
                <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between print:hidden shrink-0">
                    <span className="text-xs text-slate-600">
                        Total {chips.length} card(s) ready. Each card fits in a student&apos;s pocket, ID card pouch, or lab manual.
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                            <Printer className="w-4 h-4" />
                            Print Now (A4 Paper)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
