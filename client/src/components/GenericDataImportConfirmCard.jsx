'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Database,
    Table,
    GraduationCap,
    Server,
    Laptop,
    Building2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    Search,
    CheckSquare,
    Square,
    Loader2,
    ArrowRight,
    RefreshCw,
    ExternalLink,
    FileSpreadsheet,
    Copy,
    Check
} from 'lucide-react';
import api, { classesAPI, labsAPI } from '@/lib/api';
import toast from 'react-hot-toast';

// Available field definitions per target table
const TABLE_FIELD_DEFINITIONS = {
    users: [
        { key: 'firstName', label: 'First Name', required: true, desc: 'Student first name' },
        { key: 'lastName', label: 'Last Name', required: false, desc: 'Student surname / last name' },
        { key: 'email', label: 'Email', required: false, desc: 'Login email (auto-generated if empty)' },
        { key: 'studentId', label: 'Student / Admission No', required: false, desc: 'Unique admission ID' },
        { key: 'rollNumber', label: 'Roll Number', required: false, desc: 'Class roll number' },
        { key: 'phone', label: 'Contact Phone', required: false, desc: 'Mobile / parent contact' }
    ],
    lab_items: [
        { key: 'itemNumber', label: 'Item / Asset Number', required: false, desc: 'Asset identifier' },
        { key: 'itemType', label: 'Equipment Type', required: false, desc: 'pc, monitor, keyboard, switch, etc.' },
        { key: 'brand', label: 'Brand / Make', required: false, desc: 'Dell, HP, Lenovo, Cisco, etc.' },
        { key: 'modelNo', label: 'Model Number', required: false, desc: 'Hardware model' },
        { key: 'serialNo', label: 'Serial Number', required: false, desc: 'Hardware serial tag' },
        { key: 'status', label: 'Status / Condition', required: false, desc: 'working, maintenance, inactive' },
        { key: 'specifications', label: 'Specifications', required: false, desc: 'RAM, CPU, storage, ports' }
    ],
    classes: [
        { key: 'name', label: 'Class Name', required: true, desc: 'e.g. Class 11-A' },
        { key: 'code', label: 'Class Code', required: false, desc: 'Unique code' },
        { key: 'gradeLevel', label: 'Grade Level', required: false, desc: 'e.g. 10, 11, 12' },
        { key: 'section', label: 'Section / Stream', required: false, desc: 'e.g. Science, A, B' },
        { key: 'capacity', label: 'Capacity', required: false, desc: 'Max student capacity' }
    ],
    subjects: [
        { key: 'name', label: 'Subject Name', required: true, desc: 'e.g. Engineering Mathematics' },
        { key: 'code', label: 'Subject Code', required: false, desc: 'Subject code' },
        { key: 'department', label: 'Department', required: false, desc: 'e.g. Computer Science' },
        { key: 'credits', label: 'Credits', required: false, desc: 'Academic credits' }
    ]
};

export default function GenericDataImportConfirmCard({ action }) {
    if (!action) return null;

    const detectedTable = action.targetTable || (action.actionType === 'student_import' ? 'users' : 'lab_items');
    const [targetTable, setTargetTable] = useState(detectedTable);
    const [records, setRecords] = useState(() => (action.records || []).map((r, idx) => ({ ...r, _selected: true, _idx: idx })));
    const [columnMapping, setColumnMapping] = useState(() => action.columnMapping || {});
    const [isMappingExpanded, setIsMappingExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(action.isConfirmed || false);
    const [importResult, setImportResult] = useState(null);
    const [showErrorDetails, setShowErrorDetails] = useState(true);
    const [copiedError, setCopiedError] = useState(false);

    // Target Class selector state (for students)
    const [availableClasses, setAvailableClasses] = useState(action.classes || []);
    const [selectedClassId, setSelectedClassId] = useState(action.targetClassId || action.classId || '');

    // Target Lab selector state (for lab items)
    const [availableLabs, setAvailableLabs] = useState(action.labs || action.availableLabs || []);
    const [selectedLabId, setSelectedLabId] = useState(action.targetLabId || action.labId || '');

    // Fetch classes or labs if needed
    useEffect(() => {
        if (targetTable === 'users' && availableClasses.length === 0) {
            classesAPI.getAll({ limit: 100 }).then(res => {
                const list = res.data?.data?.classes || res.data?.data || [];
                if (Array.isArray(list) && list.length > 0) {
                    setAvailableClasses(list);
                    if (!selectedClassId) setSelectedClassId(list[0].id);
                }
            }).catch(() => {});
        } else if (targetTable === 'lab_items' && availableLabs.length === 0) {
            labsAPI.getAll().then(res => {
                const list = res.data?.data?.labs || res.data?.data || [];
                if (Array.isArray(list) && list.length > 0) {
                    setAvailableLabs(list);
                    if (!selectedLabId) setSelectedLabId(list[0].id);
                }
            }).catch(() => {});
        }
    }, [targetTable]);

    // Source headers from records
    const sourceHeaders = useMemo(() => {
        if (!records.length) return [];
        const first = records[0];
        return Object.keys(first).filter(k => !k.startsWith('_'));
    }, [records]);

    // Table field options
    const tableFields = TABLE_FIELD_DEFINITIONS[targetTable] || [];

    // Filtered records for preview
    const filteredRecords = useMemo(() => {
        if (!searchQuery.trim()) return records;
        const q = searchQuery.toLowerCase();
        return records.filter(r =>
            Object.entries(r).some(([k, v]) => !k.startsWith('_') && String(v).toLowerCase().includes(q))
        );
    }, [records, searchQuery]);

    const selectedCount = records.filter(r => r._selected).length;

    const toggleSelectAll = () => {
        const allSelected = selectedCount === records.length;
        setRecords(prev => prev.map(r => ({ ...r, _selected: !allSelected })));
    };

    const toggleRow = (idx) => {
        setRecords(prev => prev.map(r => r._idx === idx ? { ...r, _selected: !r._selected } : r));
    };

    const handleMappingChange = (sourceHeader, targetField) => {
        setColumnMapping(prev => {
            const next = { ...prev };
            if (targetField === '__ignore__' || !targetField) {
                delete next[sourceHeader];
            } else {
                next[sourceHeader] = targetField;
            }
            return next;
        });
    };

    // Confirm Import action
    const handleConfirmImport = async () => {
        const itemsToImport = records.filter(r => r._selected);
        if (itemsToImport.length === 0) {
            toast.error('Please select at least one record to import');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/admin/chatbot/load-data', {
                actionType: targetTable === 'users' ? 'student_import' : targetTable === 'lab_items' ? 'inventory_import' : 'generic_import',
                targetTable,
                classId: selectedClassId,
                labId: selectedLabId,
                records: itemsToImport,
                columnMapping
            });

            if (res.data?.success) {
                setIsConfirmed(true);
                setImportResult(res.data);
                toast.success(res.data.message || `Successfully imported ${res.data.count} records!`);

                if (targetTable === 'lab_items') {
                    window.dispatchEvent(new CustomEvent('lab-items-updated'));
                } else if (targetTable === 'users') {
                    window.dispatchEvent(new CustomEvent('users-updated'));
                }
            } else {
                toast.error(res.data?.message || 'Import failed');
            }
        } catch (err) {
            console.error('Import error:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to import records');
        } finally {
            setLoading(false);
        }
    };

    const copyErrorLog = () => {
        if (!importResult?.failedRows?.length) return;
        const text = importResult.failedRows.map(f => `Row ${f.row} [${f.identifier}]: ${f.error}`).join('\n');
        navigator.clipboard.writeText(text);
        setCopiedError(true);
        setTimeout(() => setCopiedError(false), 2000);
        toast.success('Error log copied to clipboard');
    };

    // Theme and icon per table
    const tableMeta = {
        users: {
            title: 'Student Roster Import',
            icon: <GraduationCap className="w-4 h-4 text-white" />,
            badge: 'Students & Users Table',
            gradient: 'from-blue-600 via-indigo-600 to-violet-600',
            bgBadge: 'bg-blue-50 text-blue-700 border-blue-200',
            viewLink: selectedClassId ? `/admin/classes/${selectedClassId}` : '/admin/classes'
        },
        lab_items: {
            title: 'Lab Inventory Import',
            icon: <Server className="w-4 h-4 text-white" />,
            badge: 'Lab Equipment Table',
            gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
            bgBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            viewLink: selectedLabId ? `/admin/labs/${selectedLabId}` : '/admin/labs'
        },
        classes: {
            title: 'Class Registry Import',
            icon: <Building2 className="w-4 h-4 text-white" />,
            badge: 'Classes Table',
            gradient: 'from-indigo-600 via-purple-600 to-pink-600',
            bgBadge: 'bg-purple-50 text-purple-700 border-purple-200',
            viewLink: '/admin/classes'
        },
        subjects: {
            title: 'Subject Curriculum Import',
            icon: <Database className="w-4 h-4 text-white" />,
            badge: 'Subjects Table',
            gradient: 'from-purple-600 via-indigo-600 to-blue-600',
            bgBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            viewLink: '/admin/subjects'
        }
    }[targetTable] || {
        title: 'Data Table Import',
        icon: <Database className="w-4 h-4 text-white" />,
        badge: `${targetTable} Table`,
        gradient: 'from-slate-700 via-indigo-700 to-slate-800',
        bgBadge: 'bg-slate-100 text-slate-700 border-slate-200',
        viewLink: '/admin'
    };

    return (
        <div className="mt-3 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/70 shadow-lg overflow-hidden text-xs">
            {/* Header */}
            <div className={`px-4 py-3 bg-gradient-to-r ${tableMeta.gradient} text-white flex items-center justify-between`}>
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                        {tableMeta.icon}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm leading-tight">{tableMeta.title}</h4>
                            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold">
                                {action.sourceDocument || action.fileName || 'Referenced File'}
                            </span>
                        </div>
                        <p className="text-[11px] text-white/80 mt-0.5">
                            {records.length} records detected • Auto-detected target: <strong>{targetTable}</strong>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-black/20 text-[11px] font-semibold">
                        {selectedCount}/{records.length} Selected
                    </span>
                </div>
            </div>

            {/* Target Destination & Table Selector Bar */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 flex-wrap">
                    {/* If users/students, show target class selector */}
                    {targetTable === 'users' && (
                        <div className="flex items-center gap-1.5">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Enroll Into Class:</label>
                            <select
                                value={selectedClassId}
                                disabled={isConfirmed}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            >
                                {availableClasses.map(c => (
                                    <option key={c.id} value={c.id}>
                                        🏫 {c.name} {c.section ? `(${c.section})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* If lab items, show target lab selector */}
                    {targetTable === 'lab_items' && (
                        <div className="flex items-center gap-1.5">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Target Lab:</label>
                            <select
                                value={selectedLabId}
                                disabled={isConfirmed}
                                onChange={(e) => setSelectedLabId(e.target.value)}
                                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            >
                                {availableLabs.map(l => (
                                    <option key={l.id} value={l.id}>
                                        🏢 {l.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex items-center gap-1.5">
                        <label className="font-medium text-slate-500 dark:text-slate-400">Target Table:</label>
                        <select
                            value={targetTable}
                            disabled={isConfirmed}
                            onChange={(e) => {
                                setTargetTable(e.target.value);
                                setColumnMapping({});
                            }}
                            className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] text-slate-700 dark:text-slate-300 font-mono"
                        >
                            <option value="users">users (Students)</option>
                            <option value="lab_items">lab_items (Inventory)</option>
                            <option value="classes">classes</option>
                            <option value="subjects">subjects</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setIsMappingExpanded(!isMappingExpanded)}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 transition"
                    >
                        {isMappingExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        Column Mapping ({Object.keys(columnMapping).length} mapped)
                    </button>
                    <button
                        type="button"
                        disabled={isConfirmed}
                        onClick={toggleSelectAll}
                        className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
                    >
                        {selectedCount === records.length ? 'Deselect All' : 'Select All'}
                    </button>
                </div>
            </div>

            {/* Collapsible Column Mapping Section */}
            {isMappingExpanded && (
                <div className="p-3.5 bg-indigo-50/40 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/50">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            File Header to Database Field Mapping
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Verify and adjust fields before importing
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {sourceHeaders.map(header => {
                            const currentTarget = columnMapping[header] || '';
                            const isMapped = !!currentTarget;
                            return (
                                <div
                                    key={header}
                                    className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition ${
                                        isMapped
                                            ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800/80 shadow-xs'
                                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate" title={header}>
                                            {header}
                                        </span>
                                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                                            isMapped
                                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}>
                                            {isMapped ? 'Mapped' : 'Ignored'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                        <select
                                            value={currentTarget || '__ignore__'}
                                            disabled={isConfirmed}
                                            onChange={(e) => handleMappingChange(header, e.target.value)}
                                            className="w-full text-[11px] px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                        >
                                            <option value="__ignore__">-- Ignore Column --</option>
                                            {tableFields.map(f => (
                                                <option key={f.key} value={f.key}>
                                                    {f.label} {f.required ? '(*required)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Table Preview Toolbar */}
            <div className="px-3.5 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search extracted rows..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800 dark:text-slate-200"
                    />
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Showing {filteredRecords.length} of {records.length} records
                </div>
            </div>

            {/* Records Preview Table */}
            <div className="max-h-60 overflow-y-auto overflow-x-auto border-b border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 sticky top-0 z-10 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="p-2 w-8 text-center">
                                <input
                                    type="checkbox"
                                    checked={selectedCount === records.length && records.length > 0}
                                    onChange={toggleSelectAll}
                                    disabled={isConfirmed}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                            </th>
                            <th className="p-2 w-10 text-center text-slate-400">#</th>
                            {sourceHeaders.map(h => (
                                <th key={h} className="p-2 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className="font-semibold">{h}</span>
                                        {columnMapping[h] && (
                                            <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 font-normal">
                                                → {columnMapping[h]}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredRecords.length === 0 ? (
                            <tr>
                                <td colSpan={sourceHeaders.length + 2} className="p-6 text-center text-slate-400">
                                    No records match your search filter
                                </td>
                            </tr>
                        ) : (
                            filteredRecords.map((r, i) => (
                                <tr
                                    key={r._idx}
                                    onClick={() => !isConfirmed && toggleRow(r._idx)}
                                    className={`cursor-pointer transition ${
                                        r._selected
                                            ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                            : 'bg-slate-50/70 dark:bg-slate-950/40 text-slate-400 opacity-60'
                                    }`}
                                >
                                    <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={!!r._selected}
                                            onChange={() => toggleRow(r._idx)}
                                            disabled={isConfirmed}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </td>
                                    <td className="p-2 text-center text-slate-400 font-mono text-[10px]">
                                        {r._idx + 1}
                                    </td>
                                    {sourceHeaders.map(h => (
                                        <td key={h} className="p-2 whitespace-nowrap max-w-[180px] truncate text-slate-700 dark:text-slate-300">
                                            {String(r[h] ?? '')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Post-Import Result or Action Footer */}
            {isConfirmed && importResult ? (
                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border-t border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h5 className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">
                                    Import Completed Successfully!
                                </h5>
                                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                                    Loaded <strong>{importResult.count}</strong> records into <strong>{targetTable}</strong> table.
                                    {importResult.failedCount > 0 && (
                                        <span className="ml-1 text-amber-700 dark:text-amber-300 font-medium">
                                            ({importResult.failedCount} rows failed)
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {tableMeta.viewLink && (
                                <a
                                    href={tableMeta.viewLink}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs flex items-center gap-1.5 hover:bg-emerald-700 shadow-xs transition"
                                >
                                    <span>View Records</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Row-by-Row Failure Log (if any rows failed) */}
                    {importResult.failedCount > 0 && importResult.failedRows?.length > 0 && (
                        <div className="mt-3 p-3 rounded-xl bg-red-50/80 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-red-900 dark:text-red-300 flex items-center gap-1 text-xs">
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                                    Failed Rows Detail ({importResult.failedRows.length} errors)
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={copyErrorLog}
                                        className="text-[10px] text-red-700 dark:text-red-300 hover:underline flex items-center gap-1 font-medium"
                                    >
                                        {copiedError ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                        {copiedError ? 'Copied' : 'Copy Log'}
                                    </button>
                                    <button
                                        onClick={() => setShowErrorDetails(!showErrorDetails)}
                                        className="text-[10px] text-red-700 dark:text-red-300 hover:underline font-medium"
                                    >
                                        {showErrorDetails ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                            </div>

                            {showErrorDetails && (
                                <div className="max-h-40 overflow-y-auto divide-y divide-red-200 dark:divide-red-900/40 text-[11px] font-mono">
                                    {importResult.failedRows.map((f, i) => (
                                        <div key={i} className="py-1.5 flex items-start justify-between gap-3 text-red-800 dark:text-red-200">
                                            <div className="flex items-center gap-2">
                                                <span className="px-1.5 py-0.2 rounded bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100 font-bold text-[10px]">
                                                    Row {f.row}
                                                </span>
                                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                                    {f.identifier}
                                                </span>
                                            </div>
                                            <span className="text-red-600 dark:text-red-400 text-right">
                                                {f.error}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {selectedCount === 0 ? (
                            <span className="text-amber-600 font-medium">Select at least one record to enable import</span>
                        ) : (
                            <span>Ready to load <strong>{selectedCount}</strong> records into <strong>{targetTable}</strong></span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleConfirmImport}
                            disabled={selectedCount === 0 || loading || isConfirmed}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Importing Records...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Confirm & Import ({selectedCount} Records)</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
