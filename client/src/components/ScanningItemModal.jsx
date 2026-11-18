'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ScanLine, Plus, Trash2, Check, AlertCircle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ScanningItemModal({
    isOpen,
    item,
    expectedQty = 1,
    initialSerials = [],
    initialRemarks = '',
    onClose,
    onSave
}) {
    const [serials, setSerials] = useState([]);
    const [currentInput, setCurrentInput] = useState('');
    const [remarks, setRemarks] = useState('');
    const [condition, setCondition] = useState('New / Intact (Working)');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setSerials(Array.isArray(initialSerials) ? [...initialSerials] : []);
            setRemarks(initialRemarks || '');
            setCurrentInput('');
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen, initialSerials, initialRemarks]);

    if (!isOpen || !item) return null;

    const handleAddSerial = (val) => {
        const cleaned = (val || currentInput).trim();
        if (!cleaned) return;

        if (serials.includes(cleaned)) {
            toast.error(`Serial "${cleaned}" already added`);
            return;
        }

        const updated = [...serials, cleaned];
        setSerials(updated);
        setCurrentInput('');
        toast.success(`Recorded serial #${updated.length}: ${cleaned}`);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddSerial();
        }
    };

    const handleRemoveSerial = (idx) => {
        setSerials(prev => prev.filter((_, i) => i !== idx));
    };

    const handleAutoGenerate = () => {
        const prefix = (item.itemName || 'ITEM').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
        const year = new Date().getFullYear();
        const generated = [];
        for (let i = 1; i <= expectedQty; i++) {
            generated.push(`${prefix}-${year}-${i.toString().padStart(3, '0')}`);
        }
        setSerials(generated);
        toast.success(`Generated ${generated.length} sample serial numbers`);
    };

    const handleSave = () => {
        onSave({
            serialNumbers: serials,
            receivedCount: serials.length,
            remarks,
            condition
        });
        onClose();
    };

    const isComplete = serials.length >= expectedQty;
    const progressPercent = Math.min(100, Math.round((serials.length / (expectedQty || 1)) * 100));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                            <ScanLine className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                Verify & Scan Serial Numbers
                            </h3>
                            <p className="text-xs text-slate-500">
                                {item.itemName} • Expected: <strong className="text-slate-800 dark:text-slate-200">{expectedQty} {item.unit || 'units'}</strong>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress Bar & Status */}
                <div className="px-5 pt-4 pb-2">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Verification Progress
                        </span>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            isComplete
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                            {serials.length} / {expectedQty} Verified ({progressPercent}%)
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-300 ${
                                isComplete ? 'bg-emerald-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                    {/* Scanner Input Box */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <ScanLine className="w-3.5 h-3.5 text-indigo-600" />
                                Barcode Scanner / Serial Input
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                                Press Enter to add
                            </span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                className="input text-xs flex-1 font-mono tracking-wider"
                                placeholder="Scan barcode or type serial number..."
                                value={currentInput}
                                onChange={e => setCurrentInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <button
                                type="button"
                                onClick={() => handleAddSerial()}
                                disabled={!currentInput.trim()}
                                className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1 disabled:opacity-40"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500">
                            <span>Ready for USB/Bluetooth barcode scanner</span>
                            <button
                                type="button"
                                onClick={handleAutoGenerate}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                            >
                                <Sparkles className="w-3 h-3" /> Auto-generate {expectedQty} serials
                            </button>
                        </div>
                    </div>

                    {/* Scanned Serials List */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Recorded Serial Numbers ({serials.length})
                            </span>
                            {serials.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSerials([])}
                                    className="text-[11px] text-rose-500 hover:underline"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        {serials.length === 0 ? (
                            <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center text-slate-400 text-xs">
                                <ScanLine className="w-8 h-8 mx-auto mb-1.5 opacity-40" />
                                No serial numbers scanned yet. Scan or type above.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                                {serials.map((sn, idx) => (
                                    <div
                                        key={idx}
                                        className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shadow-2xs"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 flex items-center justify-center shrink-0">
                                                {idx + 1}
                                            </span>
                                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                {sn}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSerial(idx)}
                                            className="text-slate-400 hover:text-rose-600 transition p-1"
                                            title="Delete serial"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Condition & Remarks */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Physical Condition
                            </label>
                            <select
                                className="input text-xs w-full"
                                value={condition}
                                onChange={e => setCondition(e.target.value)}
                            >
                                <option value="New / Intact (Working)">New / Intact (Working)</option>
                                <option value="Opened Box / Verified">Opened Box / Verified</option>
                                <option value="Good Condition">Good Condition</option>
                                <option value="Minor Cosmetic Wear">Minor Cosmetic Wear</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Receiving Remarks
                            </label>
                            <input
                                type="text"
                                className="input text-xs w-full"
                                placeholder="e.g. Verified by IT Storekeeper"
                                value={remarks}
                                onChange={e => setRemarks(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-secondary text-xs py-2 px-3.5"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-xs"
                    >
                        <Check className="w-4 h-4" /> Save Verification ({serials.length} Units)
                    </button>
                </div>
            </div>
        </div>
    );
}
