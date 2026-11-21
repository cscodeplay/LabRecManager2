'use client';

import React, { useState, useEffect } from 'react';
import {
    Search,
    Package,
    X,
    Check,
    Building2,
    Filter,
    HardDrive,
    Laptop,
    Tv,
    Printer,
    Wifi,
    Cpu,
    ExternalLink
} from 'lucide-react';
import { labsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { ITEM_TYPE_CONFIG } from './GemGoldenParametersEditor';

export default function LabInventoryPickerModal({
    isOpen,
    onClose,
    onSelectDevice
}) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedType, setSelectedType] = useState('all');

    useEffect(() => {
        if (!isOpen) return;
        let isMounted = true;
        setLoading(true);
        labsAPI.getAllItems()
            .then(res => {
                if (isMounted) {
                    setItems(res.data?.data || []);
                }
            })
            .catch(err => {
                console.error('Failed to load lab inventory items:', err);
                toast.error('Failed to load lab inventory items');
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, [isOpen]);

    if (!isOpen) return null;

    const availableTypes = Array.from(new Set(items.map(i => i.itemType))).filter(Boolean);

    const filteredItems = items.filter(item => {
        const matchesType = selectedType === 'all' || item.itemType === selectedType;
        if (!matchesType) return false;
        if (!search.trim()) return true;

        const term = search.toLowerCase();
        return (
            item.itemNumber?.toLowerCase().includes(term) ||
            item.brand?.toLowerCase().includes(term) ||
            item.modelNo?.toLowerCase().includes(term) ||
            item.serialNo?.toLowerCase().includes(term) ||
            item.lab?.name?.toLowerCase().includes(term)
        );
    });

    const handleSelect = (item) => {
        onSelectDevice(item);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl">
                            <Package className="w-5 h-5" />
                        </span>
                        <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                Select Device from School Lab Inventory
                            </h3>
                            <p className="text-xs text-slate-500">
                                Pre-populates item name, type, specifications, and links device catalog
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filters */}
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by device #, brand, model, lab..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="input text-xs pl-9 w-full bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                            autoFocus
                        />
                    </div>
                    <select
                        value={selectedType}
                        onChange={e => setSelectedType(e.target.value)}
                        className="input text-xs w-full sm:w-48 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                    >
                        <option value="all">All Equipment Types</option>
                        {availableTypes.map(t => (
                            <option key={t} value={t}>
                                {ITEM_TYPE_CONFIG[t]?.icon} {ITEM_TYPE_CONFIG[t]?.label || t.toUpperCase()}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Device List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {loading ? (
                        <div className="p-8 text-center text-xs text-slate-400">Loading inventory devices...</div>
                    ) : filteredItems.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400">
                            No lab items matched your search criteria.
                        </div>
                    ) : (
                        filteredItems.map(item => {
                            const typeConfig = ITEM_TYPE_CONFIG[item.itemType] || ITEM_TYPE_CONFIG.other;
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => handleSelect(item)}
                                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-slate-800/60 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 cursor-pointer transition flex items-center justify-between gap-3 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-lg shrink-0">
                                            {typeConfig.icon}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 font-mono">
                                                    {item.itemNumber}
                                                </span>
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                    {item.brand} {item.modelNo}
                                                </span>
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                    {typeConfig.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                                                {item.lab?.name && (
                                                    <span className="flex items-center gap-1">
                                                        <Building2 className="w-3 h-3 text-slate-400" /> {item.lab.name}
                                                    </span>
                                                )}
                                                {item.serialNo && (
                                                    <span>S/N: {item.serialNo}</span>
                                                )}
                                                {item.specs && typeof item.specs === 'object' && (
                                                    <span className="text-indigo-600 dark:text-indigo-400 truncate max-w-xs">
                                                        {Object.entries(item.specs).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn btn-primary text-xs py-1 px-3 shrink-0 opacity-80 group-hover:opacity-100 transition"
                                    >
                                        Select
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                    <div>Showing {filteredItems.length} of {items.length} inventory devices</div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-secondary text-xs py-1 px-3"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
