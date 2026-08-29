'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Bot, Send, Upload, Database, ChevronDown, ChevronRight, Trash2,
    Sparkles, FileText, AlertTriangle, Copy, Check, RefreshCw, X,
    Loader2, Minimize2, Maximize2, Download, Image as ImageIcon, User, BarChart2, Expand, Shrink, File,
    HelpCircle, History, FilePlus, Maximize, Minimize, Plus,
    Calendar, Clock, Video, Users, CheckCircle, ExternalLink, Edit3, Save, Link2,
    XCircle, CalendarPlus, Undo2, BookOpen, StickyNote, GraduationCap, CheckSquare,
    LayoutGrid, Table as TableIcon, Inbox, Layers, Laptop, Server, HardDrive,
    Monitor, Printer, Building2, Tv, Hash, PieChart, TrendingUp, Cpu, CheckCircle2, Ticket,
    ShoppingBag, Code, Terminal, Award, Package, Zap, Wifi, Network, Headphones, ScanLine, Cable, Camera
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useAuthStore } from '@/lib/store';
import api, { reportsAPI, meetingAPI, calendarAPI, assignmentsAPI, classesAPI, timetableAPI, usersAPI, ticketsAPI, labsAPI, procurementAPI, trainingAPI } from '@/lib/api';
import VoiceInputButton from './VoiceInputButton';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

/* ─── Markdown-ish renderer ─── */

function CodeBlock({ code, language }) {
    const [copied, setCopied] = useState(false);
    
    const handleDownload = () => {
        const ext = language ? language.toLowerCase() : 'txt';
        const filename = `${ext === 'csv' ? 'template' : 'code'}.${ext}`;
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${filename}`);
    };

    return (
        <div className="my-2 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 text-[11px]">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800">
                <span className="text-slate-400 font-mono uppercase text-[10px]">{language || 'code'}</span>
                <div className="flex items-center gap-3">
                    <button onClick={handleDownload}
                        className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px]">
                        <Download className="w-3 h-3" /> Download
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                        className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px]">
                        {copied ? <><Check className="w-3 h-3 text-emerald-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </button>
                </div>
            </div>
            <pre className="p-3 overflow-x-auto text-slate-100 font-mono leading-relaxed"><code>{code}</code></pre>
        </div>
    );
}

/* ─── SQL result card item: renders one row as a structured graphic card ─── */
function SQLCardItem({ row, cols }) {
    // 1. Identify primary title candidate
    const titleKeys = [
        'lab_name', 'name', 'title', 'item_number', 'item_name', 'full_name',
        'first_name', 'username', 'subject_name', 'class_name', 'room_number'
    ];
    const titleKey = titleKeys.find(k => k in row && row[k] !== null && row[k] !== undefined && String(row[k]).trim() !== '') || cols[0];
    const titleVal = row[titleKey];

    // 2. Identify subtitle / secondary key
    const subKeys = ['brand', 'model_no', 'item_type', 'room_number', 'serial_no', 'email', 'code', 'grade_level', 'category'];
    const subKey = subKeys.find(k => k in row && k !== titleKey && row[k] !== null && row[k] !== undefined && String(row[k]).trim() !== '');
    const subVal = subKey ? row[subKey] : null;

    // 3. Identify status / badge
    const statusKeys = ['status', 'state', 'role', 'type', 'priority', 'condition', 'assignment_type'];
    const statusKey = statusKeys.find(k => k in row && k !== titleKey && row[k] !== null && row[k] !== undefined && String(row[k]).trim() !== '');
    const statusVal = statusKey ? String(row[statusKey]) : null;

    // 4. Identify count / quantitative metrics
    const countKeys = ['total_computers', 'pc_count', 'count', 'total_items', 'item_count', 'quantity', 'total', 'active_count'];
    const countKey = countKeys.find(k => k in row && row[k] !== null && row[k] !== undefined && !isNaN(Number(row[k])));
    const countVal = countKey !== undefined ? row[countKey] : null;

    // Helper for status badge color & dot
    const getBadgeStyle = (status) => {
        const s = String(status).toLowerCase();
        if (['active', 'completed', 'published', 'resolved', 'working', 'good', 'approved', 'yes'].includes(s)) {
            return {
                bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                dot: 'bg-emerald-500'
            };
        }
        if (['pending', 'in_progress', 'scheduled', 'draft', 'open', 'assigned', 'review'].includes(s)) {
            return {
                bg: 'bg-blue-50 text-blue-700 border-blue-200',
                dot: 'bg-blue-500'
            };
        }
        if (['maintenance', 'warning', 'medium', 'high', 'urgent'].includes(s)) {
            return {
                bg: 'bg-amber-50 text-amber-700 border-amber-200',
                dot: 'bg-amber-500 animate-pulse'
            };
        }
        if (['inactive', 'failed', 'cancelled', 'critical', 'damaged', 'broken', 'closed', 'no'].includes(s)) {
            return {
                bg: 'bg-red-50 text-red-700 border-red-200',
                dot: 'bg-red-500'
            };
        }
        return {
            bg: 'bg-slate-100 text-slate-700 border-slate-200',
            dot: 'bg-slate-400'
        };
    };

    // Card Icon detection
    const getCardIcon = () => {
        const strCols = cols.join(' ').toLowerCase();
        const itemType = String(row.item_type || row.type || row.category || '').toLowerCase();
        
        if (itemType.includes('ups') || itemType.includes('battery') || itemType.includes('power')) {
            return <Zap className="w-4 h-4 text-amber-500 shrink-0" />;
        }
        if (itemType.includes('pc') || itemType.includes('comp') || itemType.includes('desktop') || strCols.includes('total_computers')) {
            return <Laptop className="w-4 h-4 text-blue-500 shrink-0" />;
        }
        if (itemType.includes('printer')) return <Printer className="w-4 h-4 text-amber-500 shrink-0" />;
        if (itemType.includes('scanner')) return <ScanLine className="w-4 h-4 text-rose-500 shrink-0" />;
        if (itemType.includes('monitor') || itemType.includes('screen') || itemType.includes('display')) return <Monitor className="w-4 h-4 text-cyan-500 shrink-0" />;
        if (itemType.includes('server')) return <Server className="w-4 h-4 text-indigo-500 shrink-0" />;
        if (itemType.includes('projector') || itemType.includes('panel') || itemType.includes('ifpd')) return <Tv className="w-4 h-4 text-purple-500 shrink-0" />;
        if (itemType.includes('router') || itemType.includes('wifi')) return <Wifi className="w-4 h-4 text-green-500 shrink-0" />;
        if (itemType.includes('switch') || itemType.includes('network')) return <Network className="w-4 h-4 text-cyan-500 shrink-0" />;
        if (itemType.includes('camera')) return <Camera className="w-4 h-4 text-indigo-500 shrink-0" />;
        if (itemType.includes('headphone') || itemType.includes('audio') || itemType.includes('speaker') || itemType.includes('soundbar')) return <Headphones className="w-4 h-4 text-pink-500 shrink-0" />;
        if (itemType.includes('cable')) return <Cable className="w-4 h-4 text-slate-500 shrink-0" />;
        if (strCols.includes('lab') || strCols.includes('room')) return <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />;
        if (strCols.includes('student') || strCols.includes('user') || strCols.includes('first_name')) return <User className="w-4 h-4 text-violet-500 shrink-0" />;
        if (strCols.includes('assignment') || strCols.includes('class') || strCols.includes('subject')) return <BookOpen className="w-4 h-4 text-emerald-500 shrink-0" />;
        return <Layers className="w-4 h-4 text-slate-500 shrink-0" />;
    };

    // Filter remaining columns to display in key-value grid
    const displayedCols = cols.filter(c => c !== titleKey && c !== statusKey && c !== countKey);

    const formatColName = (c) => {
        return c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const formatVal = (v) => {
        if (v === null || v === undefined || v === '') return <span className="text-slate-400 italic">None</span>;
        if (typeof v === 'boolean') return v ? 'Yes' : 'No';
        if (typeof v === 'object') return JSON.stringify(v);
        const s = String(v);
        if (s.startsWith('http://') || s.startsWith('https://')) {
            return (
                <a href={s} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline truncate hover:text-indigo-800 inline-block max-w-[140px]">
                    Open Link
                </a>
            );
        }
        return s;
    };

    const badgeInfo = statusVal ? getBadgeStyle(statusVal) : null;

    return (
        <div className="p-3 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-300 hover:shadow-xs transition space-y-2 text-[11px] group">
            {/* Header: Icon + Title + Subtitle + Badge */}
            <div className="flex items-start justify-between gap-1.5 border-b border-slate-100 pb-2">
                <div className="flex items-start gap-2 min-w-0">
                    <div className="mt-0.5 p-1 rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition">
                        {getCardIcon()}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <h5 className="font-bold text-slate-900 text-xs truncate leading-tight">
                                {titleVal !== null && titleVal !== undefined ? String(titleVal) : 'Record'}
                            </h5>
                            {row.item_number && row.item_number !== titleVal && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[9.5px] font-semibold border border-slate-200">
                                    #{row.item_number}
                                </span>
                            )}
                        </div>
                        {subVal && (
                            <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                                {formatColName(subKey)}: <span className="text-slate-800 font-semibold">{String(subVal)}</span>
                            </p>
                        )}
                    </div>
                </div>
                {badgeInfo && (
                    <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border shrink-0 capitalize flex items-center gap-1 shadow-2xs ${badgeInfo.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badgeInfo.dot}`} />
                        {statusVal}
                    </span>
                )}
            </div>

            {/* Quick Quantitative / Metric Stat Badge if available */}
            {countKey && (
                <div className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        {formatColName(countKey)}
                    </span>
                    <span className="text-xs font-extrabold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200 shadow-2xs">
                        {countVal}
                    </span>
                </div>
            )}

            {/* Serial Number / Room tag if present */}
            <div className="flex items-center gap-2 flex-wrap text-[10px]">
                {row.room_number && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium border border-slate-200">
                        📍 Room {row.room_number}
                    </span>
                )}
                {row.serial_no && (
                    <button
                        type="button"
                        onClick={() => {
                            navigator.clipboard.writeText(String(row.serial_no));
                            toast.success('Serial No copied!');
                        }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[9px] border border-slate-200 transition"
                        title="Click to copy serial number"
                    >
                        <Copy className="w-2.5 h-2.5 text-slate-400" />
                        <span>SN: {row.serial_no}</span>
                    </button>
                )}
            </div>

            {/* Key-Value Fields Grid */}
            {displayedCols.length > 0 && (
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1 border-t border-slate-50">
                    {displayedCols.filter(c => !['item_number', 'room_number', 'serial_no'].includes(c)).slice(0, 8).map((c, idx) => (
                        <div key={idx} className="min-w-0">
                            <span className="text-[8.5px] font-semibold text-slate-400 block uppercase tracking-wider truncate">
                                {formatColName(c)}
                            </span>
                            <span className="text-[10.5px] text-slate-800 truncate block font-medium">
                                {formatVal(row[c])}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── SQL result panel: Graphic Card View, Chart View, Table View, SQL query inspection, CSV export ─── */
function SQLResult({ sql, result, onRerun }) {
    const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'chart' | 'table'
    const [sqlOpen, setSqlOpen] = useState(false);
    if (!result) return null;

    const rows = Array.isArray(result.rows) ? result.rows : [];
    const cols = rows.length > 0
        ? (result.fields?.map(f => f.name) || Object.keys(rows[0]))
        : [];

    const isSelect = (result.command === 'SELECT') || (!result.command && sql?.trim().toUpperCase().startsWith('SELECT'));

    // Check if results have numeric columns suitable for chart/stats
    const numCols = rows.length > 0
        ? cols.filter(f => {
            const val = rows[0][f];
            return typeof val === 'number' || (val !== null && val !== '' && !isNaN(Number(val)));
        })
        : [];
    const strCols = cols.filter(c => !numCols.includes(c));

    // Detect if this is an inventory count or lab equipment query
    const countCols = cols.filter(c => ['total_computers', 'pc_count', 'count', 'total_items', 'item_count', 'quantity', 'total'].includes(c));
    const hasCountSummary = countCols.length > 0 && rows.length > 0;

    // Auto-generate inline chart structure if user clicks 'chart'
    const inlineChartData = numCols.length > 0 && rows.length > 0 ? {
        type: 'bar',
        title: `${numCols[0].replace(/_/g, ' ')} by ${strCols[0] ? strCols[0].replace(/_/g, ' ') : 'Category'}`,
        data: rows.slice(0, 15).map(r => ({
            label: String(r[strCols[0]] || r[cols[0]] || 'Item').substring(0, 25),
            [numCols[0]]: Number(r[numCols[0]]) || 0
        })),
        seriesKeys: [numCols[0]],
        colors: DEFAULT_COLORS
    } : null;

    const exportCSV = () => {
        if (!rows.length) return;
        const escape = (v) => {
            if (v === null || v === undefined) return '';
            const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
            return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const header = cols.map(escape).join(',');
        const rowLines = rows.map(row => cols.map(c => escape(row[c])).join(','));
        const csv = [header, ...rowLines].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `query_results_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success(`Exported ${rows.length} rows`);
    };

    return (
        <div className="mt-2.5 rounded-2xl border border-indigo-200/90 shadow-sm overflow-hidden bg-gradient-to-b from-indigo-50/40 via-white to-slate-50/30 text-[12px] animate-in fade-in">
            {/* Header bar */}
            <div className="px-3 py-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-indigo-200 shrink-0" />
                    <span className="font-bold text-xs tracking-tight">
                        {rows.length} {rows.length === 1 ? 'Record Found' : 'Records Found'}
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* View Switcher: Cards / Chart / Table */}
                    {rows.length > 0 && (
                        <div className="flex items-center bg-indigo-950/40 p-0.5 rounded-lg border border-indigo-400/30">
                            <button
                                type="button"
                                onClick={() => setViewMode('cards')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                                    viewMode === 'cards'
                                        ? 'bg-white text-indigo-950 shadow-2xs'
                                        : 'text-indigo-100 hover:text-white'
                                }`}
                                title="Graphic Cards View"
                            >
                                <LayoutGrid className="w-3 h-3" />
                                <span className="hidden sm:inline">Cards</span>
                            </button>

                            {inlineChartData && (
                                <button
                                    type="button"
                                    onClick={() => setViewMode('chart')}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                                        viewMode === 'chart'
                                            ? 'bg-white text-indigo-950 shadow-2xs'
                                            : 'text-indigo-100 hover:text-white'
                                    }`}
                                    title="Visual Chart View"
                                >
                                    <BarChart2 className="w-3 h-3" />
                                    <span className="hidden sm:inline">Chart</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                                    viewMode === 'table'
                                        ? 'bg-white text-indigo-950 shadow-2xs'
                                        : 'text-indigo-100 hover:text-white'
                                }`}
                                title="Table View"
                            >
                                <TableIcon className="w-3 h-3" />
                                <span className="hidden sm:inline">Table</span>
                            </button>
                        </div>
                    )}

                    {/* Export CSV button */}
                    {rows.length > 0 && (
                        <button
                            type="button"
                            onClick={exportCSV}
                            title="Export CSV"
                            className="p-1 rounded-lg bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-100 hover:text-white transition"
                        >
                            <Download className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {/* SQL query toggle */}
                    {sql && (
                        <button
                            type="button"
                            onClick={() => setSqlOpen(!sqlOpen)}
                            title={sqlOpen ? "Hide SQL" : "Show SQL Query Details"}
                            className={`p-1 rounded-lg transition ${
                                sqlOpen ? 'bg-white text-indigo-900 shadow-2xs' : 'bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-100'
                            }`}
                        >
                            <Database className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* SQL Query Collapsible Details (Hidden by default) */}
            {sqlOpen && sql && (
                <div className="px-3 py-2 bg-slate-900 border-b border-indigo-200 animate-in fade-in">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800 mb-1.5">
                        <span className="text-[10px] font-mono text-indigo-300 font-semibold uppercase tracking-wider">Executed SQL Query</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => { navigator.clipboard.writeText(sql); toast.success('SQL copied to clipboard'); }}
                                className="text-[10px] text-indigo-400 hover:text-white flex items-center gap-1 transition">
                                <Copy className="w-2.5 h-2.5" /> Copy
                            </button>
                            {onRerun && (
                                <button onClick={onRerun} className="text-[10px] text-emerald-400 hover:text-white flex items-center gap-1 transition">
                                    <RefreshCw className="w-2.5 h-2.5" /> Re-run
                                </button>
                            )}
                        </div>
                    </div>
                    <pre className="text-[10.5px] text-indigo-100 font-mono whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">{sql}</pre>
                </div>
            )}

            {/* Body Content */}
            <div className="p-2.5 space-y-2.5">
                {/* Requires Confirmation */}
                {result.requiresConfirmation ? (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-1.5">
                            <p className="text-amber-900 text-xs font-bold">Execution requires confirmation</p>
                            <p className="text-amber-800 text-[11px] leading-relaxed">Please review the SQL query above. This operation will modify data in your database.</p>
                            {onRerun && (
                                <button onClick={onRerun} className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-2xs">
                                    <Check className="w-3 h-3" /> Confirm & Execute
                                </button>
                            )}
                        </div>
                    </div>
                ) : !result.success ? (
                    <div className="p-2.5 bg-red-50 text-red-700 text-[11px] rounded-xl border border-red-200 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                        <span className="font-medium">{result.error || 'Query failed to execute.'}</span>
                    </div>
                ) : rows.length === 0 ? (
                    /* Empty State */
                    isSelect ? (
                        <div className="p-4 bg-white rounded-xl border border-slate-200 text-center space-y-2">
                            <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-500 shadow-2xs">
                                <Inbox className="w-4 h-4" />
                            </div>
                            <div>
                                <h5 className="font-bold text-slate-800 text-xs">0 Records Found</h5>
                                <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-0.5 leading-relaxed">
                                    No records currently match this query in the database.
                                </p>
                            </div>
                            <div className="pt-1 flex items-center justify-center gap-2 flex-wrap text-[10px]">
                                <a
                                    href="/admin/labs"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold border border-indigo-200 transition flex items-center gap-1"
                                >
                                    <Server className="w-3 h-3" /> Lab Management
                                </a>
                                <a
                                    href="/classes"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 font-semibold border border-slate-200 transition flex items-center gap-1"
                                >
                                    <BookOpen className="w-3 h-3" /> Classes
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 bg-emerald-50 text-emerald-800 text-[11px] font-medium flex items-center gap-2 border border-emerald-200 rounded-xl">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Operation executed successfully ({result.rowCount || 0} row(s) affected).</span>
                        </div>
                    )
                ) : viewMode === 'chart' && inlineChartData ? (
                    /* Inline Chart View */
                    <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <ChatChart chartData={inlineChartData} />
                    </div>
                ) : viewMode === 'cards' ? (
                    /* Graphic Cards View */
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-0.5">
                        {/* Summary / Hero Card for 1-3 row summary query results */}
                        {hasCountSummary && rows.length <= 3 && (
                            <div className="grid grid-cols-1 gap-2">
                                {rows.map((r, ri) => (
                                    <div key={ri} className="p-3 rounded-xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-violet-500/10 border border-indigo-200 flex items-center justify-between gap-3 shadow-2xs">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                                                <Laptop className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate">
                                                    {r.lab_name || r.name || 'Equipment Metric'} {r.room_number ? `(Room ${r.room_number})` : ''}
                                                </div>
                                                <div className="text-sm font-extrabold text-slate-900 flex items-baseline gap-1.5">
                                                    <span className="text-lg text-indigo-700 font-mono">
                                                        {r[countCols[0]] !== undefined ? r[countCols[0]] : 0}
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-600">
                                                        {countCols[0].replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {rows.slice(0, 50).map((row, idx) => (
                                <SQLCardItem key={idx} row={row} cols={cols} />
                            ))}
                        </div>
                        {rows.length > 50 && (
                            <p className="text-[10px] text-slate-400 text-center py-1 font-medium">
                                Showing first 50 of {rows.length} records (Export CSV for full dataset)
                            </p>
                        )}
                    </div>
                ) : (
                    /* Table View */
                    <div className="overflow-x-auto max-h-64 rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-[11px]">
                            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-700 font-semibold">
                                <tr>
                                    {cols.map((c, i) => (
                                        <th key={i} className="px-2.5 py-1.5 text-left whitespace-nowrap uppercase tracking-wider text-[9px] text-slate-500">
                                            {c.replace(/_/g, ' ')}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.slice(0, 50).map((row, ri) => (
                                    <tr key={ri} className={ri % 2 ? 'bg-slate-50/50 hover:bg-indigo-50/30' : 'hover:bg-indigo-50/30'}>
                                        {cols.map((c, ci) => (
                                            <td key={ci} className="px-2.5 py-1.5 font-mono whitespace-nowrap max-w-[200px] truncate text-slate-800">
                                                {row[c] === null ? (
                                                    <span className="text-slate-400 italic font-sans text-[10px]">NULL</span>
                                                ) : typeof row[c] === 'string' && row[c].startsWith('http') ? (
                                                    <a href={row[c]} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline hover:text-indigo-800">
                                                        Open Link
                                                    </a>
                                                ) : typeof row[c] === 'object' ? (
                                                    JSON.stringify(row[c])
                                                ) : (
                                                    String(row[c])
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {rows.length > 50 && (
                            <p className="text-[10px] text-slate-400 text-center py-1.5 border-t border-slate-100 font-medium">
                                Showing 50 of {rows.length} rows
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Chart component with solid colors matching image reference ─── */
const DEFAULT_COLORS = [
    '#F5B027', // Rich Golden Amber (Image Series 1)
    '#538D4E', // Forest Sage Green (Image Series 2)
    '#2563EB', // Royal Blue
    '#DC2626', // Crimson Red
    '#7C3AED', // Purple
    '#0D9488', // Deep Teal
    '#EA580C', // Burnt Orange
    '#0284C7', // Sky Blue
    '#475569', // Slate Gray
    '#DB2777'  // Rose Pink
];

function RenderMessage({ content, hasQueryResult }) {
    if (!content) return null;
    let cleanContent = content;
    // When structured query results are present, hide redundant raw SQL codeblocks from message body
    if (hasQueryResult) {
        cleanContent = cleanContent.replace(/```sql[\s\S]*?```/gi, '').trim();
    }
    if (!cleanContent) return null;

    const parts = cleanContent.split(new RegExp('(`{3}[\\s\\S]*?`{3}|<think>[\\s\\S]*?<\\/think>)', 'g'));
    
    return (
        <div className="ai-prose text-[13px] leading-relaxed">
            {parts.map((part, i) => {
                if (!part) return null;
                if (part.startsWith('```')) {
                    const m = part.match(/```(\w+)?\n?([\s\S]*?)```/);
                    if (m) {
                        const lang = (m[1] || '').toLowerCase();
                        // For raw SQL blocks in chat, render a compact collapsed accordion
                        if (lang === 'sql') {
                            return (
                                <details key={i} className="my-1.5 group border border-slate-700 rounded-xl bg-slate-900 overflow-hidden text-[11px]">
                                    <summary className="px-3 py-1.5 text-[10.5px] font-mono text-indigo-300 cursor-pointer hover:bg-slate-800 flex items-center justify-between select-none">
                                        <div className="flex items-center gap-1.5">
                                            <Database className="w-3.5 h-3.5 text-indigo-400" />
                                            <span>View SQL Query</span>
                                        </div>
                                        <span className="text-[9px] text-slate-400">Click to expand</span>
                                    </summary>
                                    <div className="p-2.5 border-t border-slate-800 bg-slate-950 font-mono text-indigo-100 whitespace-pre-wrap text-[10.5px] leading-relaxed">
                                        {m[2].trim()}
                                    </div>
                                </details>
                            );
                        }
                        return <CodeBlock key={i} code={m[2].trim()} language={m[1] || ''} />;
                    }
                }
                
                if (part.startsWith('<think>')) {
                    const thinkContent = part.replace(/<\/?think>/g, '').trim();
                    return (
                        <details key={i} className="mb-3 group border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                            <summary className="px-3 py-2 text-[11px] font-medium text-slate-500 cursor-pointer hover:bg-slate-100 flex items-center gap-1.5 select-none list-none [&::-webkit-details-marker]:hidden">
                                <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
                                Thought Process
                            </summary>
                            <div className="px-3 pb-3 text-[11px] text-slate-500 whitespace-pre-wrap border-t border-slate-200 pt-2 bg-slate-50/50">
                                {thinkContent}
                            </div>
                        </details>
                    );
                }

                const html = part
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-indigo-600 underline font-semibold hover:text-indigo-800">$1</a>')
                    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-slate-100 rounded text-[11px] font-mono text-pink-600">$1</code>')
                    .replace(/^### (.+)$/gm, '<h4 class="font-semibold mt-2 mb-0.5 text-[13px]">$1</h4>')
                    .replace(/^## (.+)$/gm, '<h3 class="font-semibold mt-3 mb-1 text-sm">$1</h3>')
                    .replace(/^- (.+)$/gm, '<li class="ml-3 list-disc text-[13px]">$1</li>')
                    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-3 list-decimal text-[13px]">$2</li>')
                    .replace(/\n{2,}/g, '</p><p class="mb-1.5">')
                    .replace(/\n/g, '<br/>');
                return <div key={i} dangerouslySetInnerHTML={{ __html: `<p class="mb-1.5">${html}</p>` }} />;
            })}
        </div>
    );
}

function ChatChart({ chartData }) {
    const echartsRef = useRef(null);
    const { type, title, data, seriesKeys = ['value'], colors = DEFAULT_COLORS } = chartData || {};

    const [activeType, setActiveType] = useState(type || 'bar');
    useEffect(() => { if (type) setActiveType(type); }, [type]);

    if (!chartData || !chartData.data?.length) return null;

    const getImgData = () => {
        const inst = echartsRef.current?.getEchartsInstance();
        if (!inst) return null;
        return inst.getDataURL({ type: 'png', backgroundColor: '#fff', pixelRatio: 2 });
    };

    const downloadChart = () => {
        const url = getImgData();
        if (!url) { toast.error('No chart to export'); return; }
        const a = document.createElement('a');
        a.download = `${(title || 'chart').replace(/\s+/g, '_')}.png`;
        a.href = url;
        a.click();
        toast.success('Chart downloaded');
    };

    const copyChart = async () => {
        const url = getImgData();
        if (!url) return;
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            toast.success('Chart copied to clipboard');
        } catch { toast.error('Copy not supported in this browser'); }
    };

    const renderChart = () => {
        const option = {
            backgroundColor: '#ffffff',
            tooltip: { 
                trigger: activeType === 'pie' || activeType === 'doughnut' ? 'item' : 'axis', 
                textStyle: { fontSize: 11, color: '#1e293b' }, 
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                borderColor: '#cbd5e1',
                borderWidth: 1,
                shadowBlur: 6,
                shadowColor: 'rgba(0,0,0,0.06)'
            },
            legend: { 
                data: seriesKeys, 
                bottom: 2, 
                icon: 'rect', 
                itemWidth: 12, 
                itemHeight: 12, 
                textStyle: { fontSize: 10.5, fontWeight: '600', color: '#334155' } 
            },
            grid: { left: '3%', right: '4%', bottom: '16%', top: '10%', containLabel: true },
            xAxis: activeType === 'pie' || activeType === 'doughnut' ? { show: false } : {
                type: 'category',
                data: data.map(d => d.label),
                axisLabel: { fontSize: 10, fontWeight: '500', color: '#334155', interval: 0, rotate: data.length > 5 ? 20 : 0 },
                axisLine: { lineStyle: { color: '#64748b', width: 1.5 } },
                axisTick: { show: true, alignWithLabel: true }
            },
            yAxis: activeType === 'pie' || activeType === 'doughnut' ? { show: false } : {
                type: 'value',
                axisLabel: { fontSize: 10, fontWeight: '500', color: '#475569' },
                axisLine: { show: true, lineStyle: { color: '#64748b', width: 1.5 } },
                splitLine: { lineStyle: { type: 'dashed', color: '#cbd5e1' } }
            },
            color: colors,
            series: []
        };

        if (activeType === 'pie' || activeType === 'doughnut') {
            option.tooltip = { trigger: 'item' };
            option.series = [{
                type: 'pie',
                radius: activeType === 'doughnut' ? ['40%', '70%'] : '70%',
                data: data.map(d => ({ name: String(d.label), value: Number(d[seriesKeys[0] || 'value']) || 0 })),
                label: { show: true, formatter: '{b}: {c}', fontSize: 10, fontWeight: 'bold', color: '#1e293b' },
                itemStyle: { borderRadius: 3, borderColor: '#fff', borderWidth: 2, opacity: 1 }
            }];
        } else {
            option.series = seriesKeys.map((key, i) => {
                let sType = activeType;
                if (activeType === 'composed') sType = i === 0 ? 'bar' : 'line';
                if (activeType === 'area') sType = 'line';
                
                const baseColor = colors[i % colors.length];
                return {
                    name: key,
                    type: sType,
                    stack: activeType === 'area' ? 'Total' : undefined,
                    barGap: '12%',
                    barCategoryGap: '35%',
                    areaStyle: activeType === 'area' ? { 
                        color: baseColor,
                        opacity: 0.85
                    } : undefined,
                    data: data.map(d => Number(d[key]) || 0),
                    label: { 
                        show: true, 
                        position: 'top', 
                        formatter: (p) => p.value === 0 ? '' : p.value, 
                        fontSize: 10, 
                        fontWeight: 'bold', 
                        color: '#1e293b' 
                    },
                    smooth: false,
                    symbolSize: sType === 'line' ? 8 : 0,
                    itemStyle: { 
                        borderRadius: sType === 'bar' ? [3, 3, 0, 0] : 0,
                        color: baseColor,
                        opacity: 1
                    },
                    lineStyle: sType === 'line' ? { width: 3, color: baseColor } : undefined,
                    animationEasing: 'cubicOut',
                    animationDuration: 800
                };
            });
        }
        return <ReactECharts ref={echartsRef} option={option} style={{ height: 230, width: '100%' }} opts={{ renderer: 'svg' }} />;
    };

    return (
        <div className="mt-2 rounded-lg border border-slate-200 overflow-hidden bg-white">
            <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-slate-200">
                <span className="text-[11px] font-semibold text-indigo-700 truncate mr-2">{title || 'Chart'}</span>
                <div className="flex items-center gap-2 shrink-0">
                    <select 
                        value={activeType}
                        onChange={(e) => setActiveType(e.target.value)}
                        className="text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5 text-slate-600 outline-none cursor-pointer hover:border-indigo-300"
                    >
                        <option value="bar">Bar</option>
                        <option value="line">Line</option>
                        <option value="area">Area</option>
                        {seriesKeys.length === 1 && <option value="pie">Pie</option>}
                        {seriesKeys.length === 1 && <option value="doughnut">Doughnut</option>}
                        {seriesKeys.length > 1 && <option value="composed">Composed</option>}
                    </select>
                    <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                        <button onClick={copyChart} className="p-1 hover:bg-indigo-100 rounded transition" title="Copy as image">
                            <ImageIcon className="w-3 h-3 text-indigo-500" />
                        </button>
                        <button onClick={downloadChart} className="p-1 hover:bg-indigo-100 rounded transition" title="Download PNG">
                            <Download className="w-3 h-3 text-indigo-500" />
                        </button>
                    </div>
                </div>
            </div>
            <div className="p-2 bg-white w-full overflow-hidden">{renderChart()}</div>
        </div>
    );
}

/* ─── Interactive AI Report Action Card ─── */
function ReportActionCard({ action }) {
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async (format) => {
        setDownloading(true);
        try {
            const res = await reportsAPI.generateCustom({
                entities: action.entities || ['students'],
                filters: action.filters || {}
            });
            const reportData = res.data;

            if (!reportData || !reportData.reportResults) {
                toast.error('No report data returned');
                return;
            }

            if (format === 'xlsx') {
                const workbook = XLSX.utils.book_new();
                for (const key of Object.keys(reportData.reportResults)) {
                    const section = reportData.reportResults[key];
                    if (section.rows && section.rows.length > 0) {
                        const worksheet = XLSX.utils.json_to_sheet(section.rows);
                        XLSX.utils.book_append_sheet(workbook, worksheet, section.title.substring(0, 30));
                    }
                }
                XLSX.writeFile(workbook, `AI_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
                toast.success('Excel workbook downloaded!');
            } else if (format === 'csv') {
                const keys = Object.keys(reportData.reportResults);
                const firstResult = reportData.reportResults[keys[0]];
                if (!firstResult?.rows?.length) {
                    toast.error('No rows to export');
                    return;
                }
                const worksheet = XLSX.utils.json_to_sheet(firstResult.rows);
                const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
                const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `AI_Report_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('CSV downloaded!');
            } else if (format === 'pdf') {
                const printWindow = window.open('', '_blank');
                const results = reportData.reportResults;
                let html = `<html><head><title>AI Generated Report</title><style>body{font-family:sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px;} th,td{border:1px solid #cbd5e1;padding:6px 10px;} th{background:#f1f5f9;}</style></head><body><h2>AI Generated Report</h2>`;
                for (const k of Object.keys(results)) {
                    const sec = results[k];
                    if (!sec.rows?.length) continue;
                    const headers = Object.keys(sec.rows[0]);
                    html += `<h3>${sec.title}</h3><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`;
                    sec.rows.forEach(r => {
                        html += `<tr>${headers.map(h => `<td>${r[h] ?? '-'}</td>`).join('')}</tr>`;
                    });
                    html += `</tbody></table>`;
                }
                html += `<script>window.onload=function(){window.print();}</script></body></html>`;
                printWindow.document.write(html);
                printWindow.document.close();
            }
        } catch (err) {
            console.error('In-chat report export error:', err);
            toast.error('Failed to export report');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="mt-2 rounded-xl bg-gradient-to-r from-indigo-50/90 to-purple-50/90 border border-indigo-200 shadow-2xs overflow-hidden text-[11px]">
            <div className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                    <span className="font-semibold text-xs tracking-tight">Report Ready</span>
                </div>
                <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-white/20 text-white rounded-md uppercase">
                    {(action.entities || []).join(', ')}
                </span>
            </div>
            <div className="p-2.5 flex items-center justify-between gap-2">
                <span className="text-slate-600 text-[11px] truncate">Export format:</span>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => handleDownload('pdf')}
                        disabled={downloading}
                        title="Download PDF"
                        className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition shadow-2xs disabled:opacity-50"
                    >
                        <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => handleDownload('xlsx')}
                        disabled={downloading}
                        title="Download Excel (XLSX)"
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-2xs disabled:opacity-50"
                    >
                        <File className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => handleDownload('csv')}
                        disabled={downloading}
                        title="Download CSV"
                        className="p-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition shadow-2xs disabled:opacity-50"
                    >
                        <Download className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Document / Image badge ─── */
function DocBadge({ doc, onRemove }) {
    const isImage = doc.mimeType?.startsWith('image/') || Boolean(doc.imageUrl);
    return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-violet-50 border border-violet-200 rounded-lg text-[11px] shadow-2xs">
            {isImage ? (
                <img
                    src={doc.imageUrl || '/image-placeholder.png'}
                    alt={doc.fileName}
                    className="w-4 h-4 rounded object-cover border border-violet-200"
                />
            ) : (
                <FileText className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
            )}
            <span className="text-violet-800 font-medium truncate max-w-[120px]">{doc.fileName}</span>
            <button
                type="button"
                onClick={onRemove}
                title="Remove attachment"
                className="text-violet-400 hover:text-red-500 transition p-0.5 rounded"
            >
                <X className="w-3 h-3" />
            </button>
        </span>
    );
}

/* ─── Interactive Editable Meeting Action Card ─── */
function MeetingActionCard({ action, onConfirmed }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(action.isConfirmed || false);
    const [copied, setCopied] = useState(false);
    
    // Editable state
    const [title, setTitle] = useState(action.title || 'AI Scheduled Meeting');
    const [duration, setDuration] = useState(action.durationMinutes || 15);
    
    // Format scheduledAt for HTML5 datetime-local input (YYYY-MM-DDTHH:mm)
    const formatForInput = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return '';
        const pad = (n) => String(n).padStart(2, '0');
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hours = pad(d.getHours());
        const minutes = pad(d.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const [datetimeVal, setDatetimeVal] = useState(formatForInput(action.scheduledAt));
    const [targetType, setTargetType] = useState(action.targetType || 'all');
    const [targetId, setTargetId] = useState(action.targetId || '');
    const [targetName, setTargetName] = useState(action.targetName || 'All Participants');
    const [selectedStudents, setSelectedStudents] = useState(
        action.targetType === 'student' && action.targetId
            ? [{ id: action.targetId, name: action.targetName || 'Student' }]
            : []
    );
    
    // Target lists loaded from API
    const [targetOptions, setTargetOptions] = useState({ classes: [], groups: [], students: [] });

    useEffect(() => {
        let isMounted = true;
        const loadTargets = async () => {
            try {
                const res = await meetingAPI.searchTargets({ type: 'all' });
                if (res.data?.success && isMounted) {
                    const data = res.data.data || {};
                    setTargetOptions({
                        classes: Array.isArray(data.classes) ? data.classes : [],
                        groups: Array.isArray(data.groups) ? data.groups : [],
                        students: Array.isArray(data.students) ? data.students : []
                    });
                }
            } catch (err) {
                console.warn('Failed to load meeting targets:', err);
                if (isMounted) {
                    setTargetOptions({ classes: [], groups: [], students: [] });
                }
            }
        };
        loadTargets();
        return () => { isMounted = false; };
    }, []);

    const handleCopyInvite = () => {
        const d = datetimeVal ? new Date(datetimeVal) : new Date(action.scheduledAt);
        const formattedDate = !isNaN(d.getTime()) ? d.toLocaleString() : 'As scheduled';
        const inviteText = `📢 **Meeting Invitation: ${title}**\n🗓️ **Date & Time:** ${formattedDate}\n⏱️ **Duration:** ${duration} minutes\n👥 **Audience:** ${targetName}\n🔑 **Meeting ID:** ${action.meetingLink}\n🔗 **Join Link:** ${window.location.origin}/meeting/${action.meetingLink}`;
        navigator.clipboard.writeText(inviteText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Invitation copied to clipboard!');
    };

    const handleAddStudent = (studentId) => {
        if (!studentId) return;
        const list = Array.isArray(targetOptions.students) ? targetOptions.students : [];
        const sel = list.find(s => s.id === studentId);
        if (!sel) return;

        if (selectedStudents.some(s => s.id === studentId)) {
            toast.error('Student already added to meeting');
            return;
        }

        const fullName = `${sel.firstName} ${sel.lastName}`.trim();
        const updated = [...selectedStudents, { id: sel.id, name: fullName, admissionNumber: sel.admissionNumber }];
        setSelectedStudents(updated);
        setTargetId(updated[0].id);
        const displayLabel = updated.length === 1 ? updated[0].name : `${updated.length} Students (${updated.map(s => s.name).slice(0, 2).join(', ')}${updated.length > 2 ? '...' : ''})`;
        setTargetName(displayLabel);
    };

    const handleRemoveStudent = (studentId) => {
        const updated = selectedStudents.filter(s => s.id !== studentId);
        setSelectedStudents(updated);
        if (updated.length > 0) {
            setTargetId(updated[0].id);
            const displayLabel = updated.length === 1 ? updated[0].name : `${updated.length} Students (${updated.map(s => s.name).slice(0, 2).join(', ')}${updated.length > 2 ? '...' : ''})`;
            setTargetName(displayLabel);
        } else {
            setTargetId('');
            setTargetName('Select Students');
        }
    };

    const handleSaveAndConfirm = async () => {
        if (targetType === 'student' && selectedStudents.length === 0) {
            toast.error('Please select at least one student from the dropdown.');
            return;
        }

        if (targetType !== 'all' && targetType !== 'student' && !targetId) {
            toast.error(`Please select a ${targetType} from the dropdown before confirming.`);
            return;
        }

        setIsSaving(true);
        try {
            const scheduledAtISO = datetimeVal ? new Date(datetimeVal).toISOString() : action.scheduledAt;
            const targetList = targetType === 'student'
                ? selectedStudents.map(s => ({ type: 'student', id: s.id, name: s.name }))
                : (targetType !== 'all' && targetId ? [{ type: targetType, id: targetId, name: targetName }] : []);

            const updatePayload = {
                title: title.trim(),
                scheduledAt: scheduledAtISO,
                durationMinutes: parseInt(duration, 10),
                targetType: targetType,
                targetId: targetType === 'all' ? undefined : (targetType === 'student' ? selectedStudents[0]?.id : targetId),
                targets: targetList,
                autoAdmit: true
            };

            await meetingAPI.updateSession(action.id, updatePayload);
            setIsConfirmed(true);
            setIsEditing(false);
            toast.success('Meeting updated & finalized successfully!');
            if (onConfirmed) {
                onConfirmed({
                    ...action,
                    title: title.trim(),
                    scheduledAt: scheduledAtISO,
                    durationMinutes: parseInt(duration, 10),
                    targetName,
                    isConfirmed: true
                });
            }
        } catch (err) {
            console.error('Failed to update meeting:', err);
            const errDetail = err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || err.message;
            toast.error(errDetail || 'Failed to update meeting');
        } finally {
            setIsSaving(false);
        }
    };

    const displayDate = datetimeVal ? new Date(datetimeVal).toLocaleString([], {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }) : (action.scheduledAt ? new Date(action.scheduledAt).toLocaleString() : 'Now');

    return (
        <div className="mt-2.5 rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/90 via-white to-violet-50/50 shadow-sm overflow-hidden text-[12px]">
            {/* Header */}
            <div className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-indigo-100" />
                    <span className="font-semibold text-xs tracking-tight">
                        {isConfirmed ? 'Meeting Scheduled' : 'Meeting Draft'}
                    </span>
                </div>
                {isConfirmed ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-300 text-emerald-950 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Confirmed
                    </span>
                ) : (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/20 text-white">
                        {action.meetingLink}
                    </span>
                )}
            </div>

            <div className="p-3 space-y-2.5">
                {/* Editable / Readonly Fields */}
                <div className="space-y-2.5">
                    {/* Meeting Title */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Meeting Title</label>
                        {isEditing && !isConfirmed ? (
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-[12px] font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="Meeting title"
                            />
                        ) : (
                            <div className="font-semibold text-slate-800 text-[13px]">{title}</div>
                        )}
                    </div>

                    {/* Direct Meeting Link & Code - ONLY shown when confirmed */}
                    {isConfirmed && (
                        <div className="bg-indigo-50/80 rounded-xl p-2.5 border border-indigo-200 flex items-center justify-between animate-in fade-in">
                            <div className="flex items-center gap-2">
                                <Link2 className="w-4 h-4 text-indigo-600 shrink-0" />
                                <div>
                                    <span className="text-[10px] font-medium text-slate-500 block">Meeting ID / Room</span>
                                    <code className="text-[12px] font-mono font-bold text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-100">
                                        {action.meetingLink}
                                    </code>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={handleCopyInvite}
                                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition shadow-xs"
                                    title="Copy invitation"
                                >
                                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                                <a
                                    href={`/meeting/${action.meetingLink}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 transition shadow-xs"
                                >
                                    <ExternalLink className="w-3 h-3" /> Join
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Grid of Datetime & Duration */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* Date & Time */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                <Calendar className="w-3 h-3 inline mr-1 text-slate-400" /> Date & Time
                            </label>
                            {isEditing && !isConfirmed ? (
                                <input
                                    type="datetime-local"
                                    value={datetimeVal}
                                    onChange={(e) => setDatetimeVal(e.target.value)}
                                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-[11px] text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            ) : (
                                <div className="text-[11px] font-medium text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                                    {displayDate}
                                </div>
                            )}
                        </div>

                        {/* Duration */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                <Clock className="w-3 h-3 inline mr-1 text-slate-400" /> Duration
                            </label>
                            {isEditing && !isConfirmed ? (
                                <select
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-[11px] text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                    <option value="10">10 minutes</option>
                                    <option value="15">15 minutes</option>
                                    <option value="20">20 minutes</option>
                                    <option value="30">30 minutes</option>
                                    <option value="45">45 minutes</option>
                                    <option value="60">60 minutes (1 hr)</option>
                                    <option value="90">90 minutes</option>
                                    <option value="120">120 minutes (2 hr)</option>
                                </select>
                            ) : (
                                <div className="text-[11px] font-medium text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                                    {duration} minutes
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Participant / Audience Target */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            <Users className="w-3 h-3 inline mr-1 text-slate-400" /> Participants / Target Audience
                        </label>
                        {isEditing && !isConfirmed ? (
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-1.5">
                                    <select
                                        value={targetType}
                                        onChange={(e) => {
                                            const newType = e.target.value;
                                            setTargetType(newType);
                                            setTargetId('');
                                            setSelectedStudents([]);
                                            setTargetName(newType === 'all' ? 'All Participants' : '');
                                        }}
                                        className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-[11px] text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >
                                        <option value="all">All</option>
                                        <option value="class">Class</option>
                                        <option value="group">Group</option>
                                        <option value="student">Student(s)</option>
                                    </select>
                                    <div className="col-span-2">
                                        {targetType === 'class' && (
                                            <select
                                                value={targetId}
                                                onChange={(e) => {
                                                    setTargetId(e.target.value);
                                                    const list = Array.isArray(targetOptions.classes) ? targetOptions.classes : [];
                                                    const sel = list.find(c => c.id === e.target.value);
                                                    if (sel) setTargetName(`Class: ${sel.name}`);
                                                }}
                                                className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-[11px] text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            >
                                                <option value="">-- Select Class --</option>
                                                {(Array.isArray(targetOptions.classes) ? targetOptions.classes : []).map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        )}
                                        {targetType === 'group' && (
                                            <select
                                                value={targetId}
                                                onChange={(e) => {
                                                    setTargetId(e.target.value);
                                                    const list = Array.isArray(targetOptions.groups) ? targetOptions.groups : [];
                                                    const sel = list.find(g => g.id === e.target.value);
                                                    if (sel) setTargetName(`Group: ${sel.name}`);
                                                }}
                                                className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-[11px] text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            >
                                                <option value="">-- Select Group --</option>
                                                {(Array.isArray(targetOptions.groups) ? targetOptions.groups : []).map(g => (
                                                    <option key={g.id} value={g.id}>{g.name}</option>
                                                ))}
                                            </select>
                                        )}
                                        {targetType === 'student' && (
                                            <select
                                                value=""
                                                onChange={(e) => handleAddStudent(e.target.value)}
                                                className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-[11px] text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            >
                                                <option value="">+ Add Student to Meeting...</option>
                                                {(Array.isArray(targetOptions.students) ? targetOptions.students : [])
                                                    .filter(s => !selectedStudents.some(sel => sel.id === s.id))
                                                    .map(s => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.firstName} {s.lastName} ({s.admissionNumber || s.email})
                                                        </option>
                                                    ))}
                                            </select>
                                        )}
                                        {targetType === 'all' && (
                                            <div className="text-[11px] text-slate-500 py-1 italic">Invites all school participants</div>
                                        )}
                                    </div>
                                </div>

                                {/* Multi-Student Chip Badges */}
                                {targetType === 'student' && (
                                    <div>
                                        {selectedStudents.length > 0 ? (
                                            <div className="flex flex-wrap gap-1 mt-1 max-h-24 overflow-y-auto p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                                                {selectedStudents.map((st) => (
                                                    <span
                                                        key={st.id}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-medium"
                                                    >
                                                        <User className="w-2.5 h-2.5 text-indigo-500" />
                                                        {st.name}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveStudent(st.id)}
                                                            className="text-slate-400 hover:text-red-500 ml-0.5 p-0.5 rounded"
                                                            title="Remove student"
                                                        >
                                                            <X className="w-2.5 h-2.5" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                                No students added yet. Select one or more students from the dropdown above.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-[11px] font-medium text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 flex items-center justify-between">
                                <span>{targetName}</span>
                                <span className="text-[10px] text-slate-400 capitalize">({targetType})</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Action Controls */}
                {!isConfirmed ? (
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={handleCopyInvite}
                            title={copied ? "Copied!" : "Copy Invite Link"}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition shadow-2xs"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>

                        <div className="flex items-center gap-1.5 ml-auto">
                            <button
                                type="button"
                                onClick={() => setIsEditing(!isEditing)}
                                className={`p-1.5 rounded-lg border transition shadow-2xs ${
                                    isEditing
                                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                                title={isEditing ? 'Done Editing' : 'Edit Details'}
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                                type="button"
                                onClick={handleSaveAndConfirm}
                                disabled={isSaving}
                                title="Confirm & Finalize Meeting"
                                className="p-1.5 px-3 rounded-lg text-white font-semibold flex items-center justify-center gap-1 transition shadow-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Scheduled</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={handleCopyInvite}
                                title="Copy Invite Link"
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition shadow-2xs"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <a
                                href={`/meeting/${action.meetingLink}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Join Meeting"
                                className="p-1.5 px-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-2xs"
                            >
                                <Video className="w-3.5 h-3.5" /> <span>Join</span>
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── NOTE ACTION CARD (DRAFT & APPEND MODE, CONFIRM & CANCEL SUPPORT) ─── */
function NoteActionCard({ action }) {
    const isAppend = action?.isAppend || Boolean(action?.noteId);
    const [title, setTitle] = useState(action?.title || (isAppend ? `Note #${action?.noteNumber || ''}` : 'New Admin Note'));
    const [content, setContent] = useState(action?.content || '');
    const [category, setCategory] = useState(action?.category || 'general');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(action?.isConfirmed || false);
    const [isCancelled, setIsCancelled] = useState(action?.isCancelled || false);

    useEffect(() => {
        if (action) {
            setTitle(action.title || (action.isAppend ? `Note #${action.noteNumber || ''}` : 'New Admin Note'));
            setContent(action.content || '');
            setCategory(action.category || 'general');
            setIsConfirmed(action.isConfirmed || false);
            setIsCancelled(action.isCancelled || false);
        }
    }, [action]);

    const handleConfirm = async () => {
        if (!title.trim() || !content.trim()) {
            toast.error('Title and content are required for note');
            return;
        }

        setIsSaving(true);
        try {
            if (action?.noteId) {
                await api.put(`/admin-notes/${action.noteId}`, {
                    title: title.trim(),
                    content: content.trim(),
                    category: category || 'general'
                });
                toast.success(`Note #${action.noteNumber || ''} updated successfully!`);
            } else {
                await api.post('/admin-notes', {
                    title: title.trim(),
                    content: content.trim(),
                    category: category || 'general'
                });
                toast.success(`Note "${title}" saved successfully!`);
            }

            setIsConfirmed(true);
            setIsEditing(false);
        } catch (err) {
            toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to save note');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsCancelled(true);
        setIsEditing(false);
        toast('Note draft cancelled', { icon: '🚫' });
    };

    const getCategoryBadge = (cat) => {
        switch (cat) {
            case 'academic':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Academic</span>;
            case 'admin':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Admin</span>;
            case 'lab':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Lab</span>;
            case 'reminder':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Reminder</span>;
            case 'important':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">Important</span>;
            default:
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">General</span>;
        }
    };

    if (isCancelled) {
        return (
            <div className="mt-2.5 rounded-2xl border border-slate-200 bg-slate-50/90 p-3.5 shadow-xs space-y-2 text-[12px] animate-in fade-in">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-slate-700">
                        <XCircle className="w-4 h-4 text-slate-400" />
                        <span>Note {isAppend ? 'Update' : 'Draft'} Cancelled</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsCancelled(false)}
                        className="text-[11px] text-primary-600 hover:text-primary-700 font-semibold hover:underline flex items-center gap-1 transition"
                    >
                        <Undo2 className="w-3 h-3" /> Restore Draft
                    </button>
                </div>
                <p className="text-[11px] text-slate-500">
                    The {isAppend ? `update for note #${action?.noteNumber || ''}` : `draft note "${title}"`} was cancelled and not saved.
                </p>
            </div>
        );
    }

    return (
        <div className={`mt-2.5 rounded-2xl border shadow-sm overflow-hidden text-[12px] transition-all animate-in fade-in ${
            isConfirmed
                ? 'border-emerald-200 bg-gradient-to-b from-emerald-50/90 via-white to-teal-50/50'
                : 'border-amber-200 bg-gradient-to-b from-amber-50/90 via-white to-orange-50/50'
        }`}>
            {/* Header */}
            <div className={`px-3 py-1.5 text-white flex items-center justify-between ${
                isConfirmed
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                    : 'bg-gradient-to-r from-amber-600 to-orange-600'
            }`}>
                <div className="flex items-center gap-1.5">
                    <StickyNote className="w-3.5 h-3.5 text-amber-100" />
                    <span className="font-semibold text-xs tracking-tight">
                        {isConfirmed 
                            ? (isAppend ? `Note #${action?.noteNumber || ''} Updated` : 'Note Saved') 
                            : (isAppend ? `Append to Note #${action?.noteNumber || ''}` : 'Note Draft')}
                    </span>
                </div>
                {isConfirmed ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-300 text-emerald-950 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Saved
                    </span>
                ) : (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-950 flex items-center gap-1 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-800 animate-ping" />
                        {isAppend ? 'Append Draft' : 'Draft'}
                    </span>
                )}
            </div>

            <div className="p-2.5 space-y-2.5">
                {isEditing && !isConfirmed ? (
                    <div className="p-2.5 bg-white rounded-xl border border-amber-100 shadow-2xs space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                                <label className="text-[9px] font-semibold text-slate-500 block mb-0.5 uppercase tracking-wider">Note Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Note Title"
                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-semibold text-slate-500 block mb-0.5 uppercase tracking-wider">Category</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value="general">General</option>
                                    <option value="academic">Academic</option>
                                    <option value="admin">Admin</option>
                                    <option value="lab">Lab</option>
                                    <option value="reminder">Reminder</option>
                                    <option value="important">Important</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-semibold text-slate-500 block mb-0.5 uppercase tracking-wider">Note Content</label>
                            <textarea
                                rows={4}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Note details..."
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-slate-900 text-xs leading-snug">
                                {title}
                            </h4>
                            {getCategoryBadge(category)}
                        </div>
                        {isAppend && action?.appendContent ? (
                            <div className="text-[11px] text-slate-700 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 max-h-48 overflow-y-auto space-y-2">
                                <div className="text-slate-600 whitespace-pre-wrap">{action.existingContent}</div>
                                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 font-medium space-y-1">
                                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                                        <Plus className="w-3 h-3" /> Appended Content:
                                    </div>
                                    <p className="whitespace-pre-wrap">{action.appendContent}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-[11px] text-slate-700 whitespace-pre-wrap bg-slate-50/80 p-2 rounded-lg border border-slate-100 max-h-40 overflow-y-auto leading-relaxed">
                                {content || 'No content'}
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                {!isConfirmed ? (
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={handleCancel}
                            title="Cancel Draft"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 transition shadow-2xs"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1.5 ml-auto">
                            <button
                                type="button"
                                onClick={() => setIsEditing(!isEditing)}
                                className={`p-1.5 rounded-lg border transition shadow-2xs ${
                                    isEditing
                                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                                title={isEditing ? 'Done Editing' : 'Edit Note'}
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={isSaving || !title.trim() || !content.trim()}
                                title="Confirm & Save Note"
                                className="p-1.5 px-3 rounded-lg text-white font-medium flex items-center justify-center gap-1 transition shadow-sm bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Saved</span>
                        </div>
                        <a
                            href="/admin/notes"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open Admin Notes"
                            className="p-1.5 px-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-2xs"
                        >
                            <StickyNote className="w-3.5 h-3.5" /> <span>Notes</span>
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── ASSIGNMENT ACTION CARD (DRAFT MODE, CONFIRM & CANCEL SUPPORT) ─── */
function AssignmentActionCard({ action }) {
    const rawAssignments = Array.isArray(action?.assignments) 
        ? action.assignments 
        : action ? [action] : [];
    
    const [assignments, setAssignments] = useState(rawAssignments);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(action?.isConfirmed || false);
    const [isCancelled, setIsCancelled] = useState(action?.isCancelled || false);
    const [targetOptions, setTargetOptions] = useState({ classes: [], groups: [], students: [], subjects: [] });

    useEffect(() => {
        if (action) {
            const raw = Array.isArray(action.assignments) ? action.assignments : (action.title ? [action] : []);
            setAssignments(raw);
            setIsConfirmed(action.isConfirmed || false);
            setIsCancelled(action.isCancelled || false);
        }
    }, [action]);

    // Load available classes, groups, students, subjects for targeting
    useEffect(() => {
        let isMounted = true;
        const loadMetadata = async () => {
            try {
                const [targetRes, subjectRes] = await Promise.all([
                    meetingAPI.searchTargets({ type: 'all' }).catch(() => ({ data: { data: {} } })),
                    api.get('/subjects').catch(() => ({ data: { data: [] } }))
                ]);
                if (isMounted) {
                    const tData = targetRes.data?.data || {};
                    const sData = subjectRes.data?.data || [];
                    setTargetOptions({
                        classes: Array.isArray(tData.classes) ? tData.classes : [],
                        groups: Array.isArray(tData.groups) ? tData.groups : [],
                        students: Array.isArray(tData.students) ? tData.students : [],
                        subjects: Array.isArray(sData) ? sData : (Array.isArray(sData.subjects) ? sData.subjects : [])
                    });
                }
            } catch (err) {
                console.warn('Failed to load target options for assignment card:', err);
            }
        };
        loadMetadata();
        return () => { isMounted = false; };
    }, []);

    const handleUpdateAssignment = (idx, field, value) => {
        setAssignments(prev => {
            const copy = [...prev];
            const current = { ...copy[idx], [field]: value };
            
            // Auto-calculate total max marks
            const prac = Number(field === 'practicalMarks' ? value : (current.practicalMarks !== undefined ? current.practicalMarks : 60)) || 0;
            const out = Number(field === 'outputMarks' ? value : (current.outputMarks !== undefined ? current.outputMarks : 20)) || 0;
            const viva = Number(field === 'vivaMarks' ? value : (current.vivaMarks !== undefined ? current.vivaMarks : 20)) || 0;
            const totalMax = prac + out + viva;
            current.maxMarks = totalMax;

            // Auto-calculate passing marks from passing percentage
            const passPct = Number(field === 'passingMarksPercentage' ? value : (current.passingMarksPercentage !== undefined ? current.passingMarksPercentage : 33)) || 33;
            current.passingMarksPercentage = passPct;
            current.passingMarks = Math.round((totalMax * passPct) / 100);

            if (field === 'latePenaltyPercent') {
                current.latePenaltyPercent = Number(value) || 0;
            }

            copy[idx] = current;
            return copy;
        });
    };

    const handleConfirm = async () => {
        if (assignments.length === 0) {
            toast.error('No assignments to create');
            return;
        }

        setIsSaving(true);
        let successCount = 0;
        try {
            for (const asg of assignments) {
                const prac = Number(asg.practicalMarks !== undefined ? asg.practicalMarks : 60) || 0;
                const out = Number(asg.outputMarks !== undefined ? asg.outputMarks : 20) || 0;
                const viva = Number(asg.vivaMarks !== undefined ? asg.vivaMarks : 20) || 0;
                const totalMax = prac + out + viva;
                const passPct = Number(asg.passingMarksPercentage !== undefined ? asg.passingMarksPercentage : 33) || 33;
                const passMarks = Math.round((totalMax * passPct) / 100);
                const latePenalty = Number(asg.latePenaltyPercent !== undefined ? asg.latePenaltyPercent : 10);

                const payload = {
                    title: asg.title,
                    description: asg.description || asg.aim || asg.title,
                    aim: asg.aim || asg.description || asg.title,
                    subjectId: asg.subjectId || targetOptions.subjects[0]?.id,
                    assignmentType: asg.assignmentType || 'program',
                    programmingLanguage: asg.programmingLanguage || 'python',
                    experimentNumber: asg.experimentNumber || '1',
                    practicalMarks: prac,
                    outputMarks: out,
                    vivaMarks: viva,
                    maxMarks: totalMax,
                    passingMarks: passMarks,
                    latePenaltyPercent: latePenalty,
                    lateSubmissionAllowed: true,
                    academicYearId: action?.academicYearId || undefined,
                    status: 'published'
                };

                const res = await assignmentsAPI.create(payload);
                const created = res.data?.data?.assignment || res.data?.data || res.data;
                const createdId = created?.id || res.data?.data?.assignment?.id || res.data?.assignment?.id || res.data?.id;

                if (createdId) {
                    successCount++;
                    const dueDateObj = asg.dueDate ? new Date(asg.dueDate) : undefined;
                    // Target classes
                    for (const cid of (asg.matchedClassIds || [])) {
                        await assignmentsAPI.addTarget(createdId, { targetType: 'class', targetId: cid, dueDate: dueDateObj }).catch(() => {});
                    }
                    // Target groups
                    for (const gid of (asg.matchedGroupIds || [])) {
                        await assignmentsAPI.addTarget(createdId, { targetType: 'group', targetId: gid, dueDate: dueDateObj }).catch(() => {});
                    }
                    // Target students
                    for (const sid of (asg.matchedStudentIds || [])) {
                        await assignmentsAPI.addTarget(createdId, { targetType: 'student', targetId: sid, dueDate: dueDateObj }).catch(() => {});
                    }
                }
            }

            toast.success(`Successfully created ${successCount} assignment(s)!`);
            setIsConfirmed(true);
            setIsEditing(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create assignment');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsCancelled(true);
        setIsEditing(false);
        toast('Assignment draft cancelled', { icon: '🚫' });
    };

    if (isCancelled) {
        return (
            <div className="mt-2.5 rounded-2xl border border-slate-200 bg-slate-50/90 p-3.5 shadow-xs space-y-2 text-[12px] animate-in fade-in">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-slate-700">
                        <XCircle className="w-4 h-4 text-slate-400" />
                        <span>Assignment Draft Cancelled</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsCancelled(false)}
                        className="text-[11px] text-primary-600 hover:text-primary-700 font-semibold hover:underline flex items-center gap-1 transition"
                    >
                        <Undo2 className="w-3 h-3" /> Restore Draft
                    </button>
                </div>
                <p className="text-[11px] text-slate-500">
                    The assignment draft "{assignments[0]?.title || 'Assignment'}" was cancelled and not created.
                </p>
            </div>
        );
    }

    const firstAsg = assignments[0] || {};
    const formatDue = (isoStr) => {
        if (!isoStr) return 'No deadline';
        try {
            const d = new Date(isoStr);
            return isNaN(d.getTime()) ? isoStr : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch {
            return isoStr;
        }
    };

    // Calculate marks breakdown
    const pracMarks = Number(firstAsg.practicalMarks !== undefined ? firstAsg.practicalMarks : 60);
    const outMarks = Number(firstAsg.outputMarks !== undefined ? firstAsg.outputMarks : 20);
    const vivMarks = Number(firstAsg.vivaMarks !== undefined ? firstAsg.vivaMarks : 20);
    const calcMaxMarks = pracMarks + outMarks + vivMarks;
    const passPercentage = Number(firstAsg.passingMarksPercentage !== undefined ? firstAsg.passingMarksPercentage : 33);
    const calcPassMarks = Math.round((calcMaxMarks * passPercentage) / 100);
    const latePenalty = Number(firstAsg.latePenaltyPercent !== undefined ? firstAsg.latePenaltyPercent : 10);

    return (
        <div className={`mt-2.5 rounded-2xl border shadow-sm overflow-hidden text-[12px] transition-all animate-in fade-in ${
            isConfirmed
                ? 'border-emerald-200 bg-gradient-to-b from-emerald-50/90 via-white to-teal-50/50'
                : 'border-blue-200 bg-gradient-to-b from-blue-50/90 via-white to-indigo-50/50'
        }`}>
            {/* Header */}
            <div className={`px-3 py-1.5 text-white flex items-center justify-between ${
                isConfirmed
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600'
            }`}>
                <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-100" />
                    <span className="font-semibold text-xs tracking-tight">
                        {isConfirmed ? 'Assignment Created' : 'Assignment Draft'}
                    </span>
                </div>
                {isConfirmed ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-300 text-emerald-950 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Published
                    </span>
                ) : (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-300 text-amber-950 flex items-center gap-1 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-800 animate-ping" />
                        Draft
                    </span>
                )}
            </div>

            <div className="p-2.5 space-y-2.5">
                {/* Assignment Details */}
                {isEditing && !isConfirmed ? (
                    <div className="p-2.5 bg-white rounded-xl border border-blue-100 shadow-2xs space-y-2">
                        <div>
                            <label className="text-[9px] font-semibold text-slate-500 block mb-0.5 uppercase tracking-wider">Assignment Title</label>
                            <input
                                type="text"
                                value={firstAsg.title || ''}
                                onChange={(e) => handleUpdateAssignment(0, 'title', e.target.value)}
                                placeholder="Assignment Title"
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="text-[9px] font-semibold text-slate-500 block mb-0.5 uppercase tracking-wider">Aim / Instructions</label>
                            <textarea
                                rows={2}
                                value={firstAsg.aim || firstAsg.description || ''}
                                onChange={(e) => {
                                    handleUpdateAssignment(0, 'aim', e.target.value);
                                    handleUpdateAssignment(0, 'description', e.target.value);
                                }}
                                placeholder="Describe the task or experiment aim..."
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[9px] font-semibold text-slate-500 block mb-0.5 uppercase tracking-wider">Subject</label>
                                <select
                                    value={firstAsg.subjectId || ''}
                                    onChange={(e) => {
                                        const sel = targetOptions.subjects.find(s => s.id === e.target.value);
                                        handleUpdateAssignment(0, 'subjectId', e.target.value);
                                        if (sel) handleUpdateAssignment(0, 'subjectName', sel.name);
                                    }}
                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    {targetOptions.subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.code || 'Sub'})</option>
                                    ))}
                                    {targetOptions.subjects.length === 0 && (
                                        <option value="">{firstAsg.subjectName || 'Computer Science'}</option>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-semibold text-slate-500 block mb-0.5 uppercase tracking-wider">Type</label>
                                <select
                                    value={firstAsg.assignmentType || 'program'}
                                    onChange={(e) => handleUpdateAssignment(0, 'assignmentType', e.target.value)}
                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="program">Programming / Coding</option>
                                    <option value="experiment">Lab Experiment</option>
                                    <option value="project">Project Work</option>
                                    <option value="observation">Observation Sheet</option>
                                    <option value="viva_only">Viva Voce Only</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-[9px] font-semibold text-slate-500 block mb-0.5 uppercase tracking-wider">Due Date</label>
                            <input
                                type="datetime-local"
                                value={firstAsg.dueDate ? firstAsg.dueDate.substring(0, 16) : ''}
                                onChange={(e) => handleUpdateAssignment(0, 'dueDate', e.target.value)}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        {/* Marks Breakdown Grid */}
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                                <span>Marks Breakdown</span>
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">
                                    Total Max: {calcMaxMarks}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                                <div>
                                    <label className="text-[8px] font-semibold text-slate-500 block mb-0.5 uppercase">Practical</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={firstAsg.practicalMarks !== undefined ? firstAsg.practicalMarks : 60}
                                        onChange={(e) => handleUpdateAssignment(0, 'practicalMarks', e.target.value)}
                                        className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[8px] font-semibold text-slate-500 block mb-0.5 uppercase">Output</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={firstAsg.outputMarks !== undefined ? firstAsg.outputMarks : 20}
                                        onChange={(e) => handleUpdateAssignment(0, 'outputMarks', e.target.value)}
                                        className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[8px] font-semibold text-slate-500 block mb-0.5 uppercase">Viva</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={firstAsg.vivaMarks !== undefined ? firstAsg.vivaMarks : 20}
                                        onChange={(e) => handleUpdateAssignment(0, 'vivaMarks', e.target.value)}
                                        className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Passing % & Late Penalty % */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[9px] font-semibold text-slate-500 block mb-0.5 uppercase tracking-wider">
                                    Pass % ({calcPassMarks} Marks)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={firstAsg.passingMarksPercentage !== undefined ? firstAsg.passingMarksPercentage : 33}
                                    onChange={(e) => handleUpdateAssignment(0, 'passingMarksPercentage', e.target.value)}
                                    placeholder="33"
                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-semibold text-slate-500 block mb-0.5 uppercase tracking-wider">
                                    Late Penalty %
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={firstAsg.latePenaltyPercent !== undefined ? firstAsg.latePenaltyPercent : 10}
                                    onChange={(e) => handleUpdateAssignment(0, 'latePenaltyPercent', e.target.value)}
                                    placeholder="10"
                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h4 className="font-bold text-slate-900 text-xs leading-snug truncate">
                                    {firstAsg.title || 'Untitled Assignment'}
                                </h4>
                                <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                                    {firstAsg.aim || firstAsg.description}
                                </p>
                            </div>
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200 shrink-0 capitalize">
                                {firstAsg.assignmentType || 'Program'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] border-t border-slate-100">
                            <div className="flex items-center gap-1 text-slate-700 truncate">
                                <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span className="font-medium truncate">{firstAsg.subjectName || 'Computer Science'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-700 truncate">
                                <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span className="font-medium truncate">{firstAsg.targetSummaryStr || 'All Students'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[11px]">
                            <div className="flex items-center gap-1 text-slate-700 truncate">
                                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span className="font-medium truncate">{formatDue(firstAsg.dueDate)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-700 truncate">
                                <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span className="font-medium truncate">Max: {calcMaxMarks} (Prac {pracMarks}+Out {outMarks}+Viva {vivMarks})</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-1 pt-1 text-[10px] text-slate-500 border-t border-slate-100 bg-slate-50/60 p-1.5 rounded-lg">
                            <span>Passing: <strong className="text-slate-800">{passPercentage}%</strong> ({calcPassMarks} marks)</span>
                            <span>Late Penalty: <strong className="text-slate-800">-{latePenalty}%</strong></span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                {!isConfirmed ? (
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={handleCancel}
                            title="Cancel Draft"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 transition shadow-2xs"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1.5 ml-auto">
                            <button
                                type="button"
                                onClick={() => setIsEditing(!isEditing)}
                                className={`p-1.5 rounded-lg border transition shadow-2xs ${
                                    isEditing
                                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                                title={isEditing ? 'Done Editing' : 'Edit Details'}
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={isSaving || !firstAsg.title}
                                title="Confirm & Create Assignment"
                                className="p-1.5 px-3 rounded-lg text-white font-medium flex items-center justify-center gap-1 transition shadow-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Published</span>
                        </div>
                        <div className="flex gap-1.5">
                            <a
                                href="/assignments"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View Assignments"
                                className="p-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-2xs transition flex items-center justify-center"
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                            </a>
                            <a
                                href="/assigned-work"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View Assigned Work"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white shadow-2xs transition flex items-center justify-center"
                            >
                                <Users className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── CALENDAR ACTION CARD (DRAFT MODE, CONFIRM & CANCEL SUPPORT) ─── */
function CalendarActionCard({ action }) {
    const [events, setEvents] = useState(Array.isArray(action?.events) ? action.events : []);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(action?.isConfirmed || false);
    const [isCancelled, setIsCancelled] = useState(action?.isCancelled || false);
    const academicYearId = action?.academicYearId || '';
    const isSingleEvent = action?.isSingleEvent || events.length === 1;

    const handleUpdateRow = (index, field, value) => {
        setEvents(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };

    const handleDeleteRow = (index) => {
        setEvents(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddRow = () => {
        setEvents(prev => [
            ...prev,
            {
                id: `custom-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                title: 'New Holiday / Event',
                titleHindi: '',
                type: 'gazetted_holiday',
                isHoliday: true
            }
        ]);
        setIsEditing(true);
    };

    const handleConfirm = async () => {
        if (events.length === 0) {
            toast.error('No events or holidays to add');
            return;
        }

        setIsSaving(true);
        try {
            const res = await calendarAPI.bulkImportEvents({
                events: events.map(e => ({
                    date: e.date,
                    title: e.title,
                    titleHindi: e.titleHindi || null,
                    type: e.type || (e.isHoliday ? 'gazetted_holiday' : 'event'),
                    isHoliday: e.isHoliday !== undefined ? e.isHoliday : false
                })),
                academicYearId: academicYearId || undefined
            });

            toast.success(res.data?.message || (isSingleEvent ? `Event "${events[0]?.title}" added to School Calendar!` : `Successfully added ${events.length} holidays to School Calendar!`));
            setIsConfirmed(true);
            setIsEditing(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update calendar');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsCancelled(true);
        setIsEditing(false);
        toast('Event draft cancelled', { icon: '🚫' });
    };

    const getTypeBadge = (type, isHoliday) => {
        switch (type) {
            case 'gazetted_holiday':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">Gazetted Holiday</span>;
            case 'restricted_holiday':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Restricted Holiday</span>;
            case 'summer_vacation':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">Summer Vacation</span>;
            case 'winter_vacation':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">Winter Vacation</span>;
            case 'exam_day':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">Exam Day</span>;
            default:
                return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isHoliday ? 'bg-red-100 text-red-700 border-red-200' : 'bg-indigo-100 text-indigo-700 border-indigo-200'}`}>{isHoliday ? 'Holiday' : 'School Event'}</span>;
        }
    };

    // Formatted date string for single event display
    const singleEvent = events[0] || {};
    const formattedDate = singleEvent.date ? (() => {
        try {
            const d = new Date(singleEvent.date);
            return isNaN(d.getTime()) ? singleEvent.date : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return singleEvent.date;
        }
    })() : '';

    /* ─── State: Cancelled ─── */
    if (isCancelled) {
        return (
            <div className="mt-2.5 rounded-2xl border border-slate-200 bg-slate-50/90 p-3.5 shadow-xs space-y-2 text-[12px] animate-in fade-in">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-slate-700">
                        <XCircle className="w-4 h-4 text-slate-400" />
                        <span>Event Draft Cancelled</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsCancelled(false)}
                        className="text-[11px] text-primary-600 hover:text-primary-700 font-semibold hover:underline flex items-center gap-1 transition"
                    >
                        <Undo2 className="w-3 h-3" /> Restore Draft
                    </button>
                </div>
                <p className="text-[11px] text-slate-500">
                    {isSingleEvent
                        ? `The draft event "${singleEvent?.title || 'Event'}" was cancelled and not added to the calendar.`
                        : `The draft calendar update (${events.length} items) was cancelled.`}
                </p>
            </div>
        );
    }

    /* ─── State: Single Event Draft View ─── */
    if (isSingleEvent) {
        return (
            <div className={`mt-2.5 rounded-2xl border shadow-sm overflow-hidden text-[12px] transition-all animate-in fade-in ${
                isConfirmed
                    ? 'border-emerald-200 bg-gradient-to-b from-emerald-50/90 via-white to-teal-50/50'
                    : 'border-indigo-200 bg-gradient-to-b from-indigo-50/90 via-white to-violet-50/50'
            }`}>
                {/* Header */}
                <div className={`px-3 py-1.5 text-white flex items-center justify-between ${
                    isConfirmed 
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600' 
                        : 'bg-gradient-to-r from-indigo-600 to-violet-600'
                }`}>
                    <div className="flex items-center gap-1.5">
                        <CalendarPlus className="w-3.5 h-3.5 text-indigo-100" />
                        <span className="font-semibold text-xs tracking-tight">
                            {isConfirmed ? 'Event Added' : 'Event Draft'}
                        </span>
                    </div>
                    {isConfirmed ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-300 text-emerald-950 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Confirmed
                        </span>
                    ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-300 text-amber-950 flex items-center gap-1 shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-800 animate-ping" />
                            Draft
                        </span>
                    )}
                </div>

                <div className="p-2.5 space-y-2.5">
                    {/* Single Event Body */}
                    {isEditing && !isConfirmed ? (
                        <div className="p-2.5 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-2">
                            <div>
                                <label className="text-[9px] font-semibold text-slate-500 block mb-0.5 uppercase tracking-wider">Event Title (English)</label>
                                <input
                                    type="text"
                                    value={singleEvent.title || ''}
                                    onChange={(e) => handleUpdateRow(0, 'title', e.target.value)}
                                    placeholder="Event Name"
                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[9px] font-semibold text-slate-500 block mb-0.5 uppercase tracking-wider">Regional (ਪੰਜਾਬੀ/हिंदी)</label>
                                    <input
                                        type="text"
                                        value={singleEvent.titleHindi || ''}
                                        onChange={(e) => handleUpdateRow(0, 'titleHindi', e.target.value)}
                                        placeholder="ਈਵੈਂਟ / इवेंट"
                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-semibold text-slate-500 block mb-0.5 uppercase tracking-wider">Time (Optional)</label>
                                    <input
                                        type="text"
                                        value={singleEvent.time || ''}
                                        onChange={(e) => handleUpdateRow(0, 'time', e.target.value)}
                                        placeholder="e.g. 09:30 AM"
                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[9px] font-semibold text-slate-500 block mb-0.5 uppercase tracking-wider">Event Date</label>
                                    <input
                                        type="date"
                                        value={singleEvent.date || ''}
                                        onChange={(e) => handleUpdateRow(0, 'date', e.target.value)}
                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-semibold text-slate-500 block mb-0.5 uppercase tracking-wider">Event Type</label>
                                    <select
                                        value={singleEvent.type || 'event'}
                                        onChange={(e) => handleUpdateRow(0, 'type', e.target.value)}
                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    >
                                        <option value="event">School Event</option>
                                        <option value="exam_day">Exam Day</option>
                                        <option value="gazetted_holiday">Gazetted Holiday</option>
                                        <option value="restricted_holiday">Restricted Holiday</option>
                                        <option value="summer_vacation">Summer Vacation</option>
                                        <option value="winter_vacation">Winter Vacation</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-0.5">
                                <input
                                    type="checkbox"
                                    id="isHolidayCheck"
                                    checked={!!singleEvent.isHoliday}
                                    onChange={(e) => handleUpdateRow(0, 'isHoliday', e.target.checked)}
                                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="isHolidayCheck" className="text-[11px] text-slate-700 font-medium cursor-pointer">
                                    School Holiday (Campus Closed)
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h4 className="font-bold text-slate-900 text-xs leading-snug">
                                        {singleEvent.title || 'Untitled Event'}
                                    </h4>
                                    {singleEvent.titleHindi && (
                                        <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                                            {singleEvent.titleHindi}
                                        </p>
                                    )}
                                </div>
                                <div className="shrink-0">
                                    {getTypeBadge(singleEvent.type, singleEvent.isHoliday)}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] border-t border-slate-100">
                                <div className="flex items-center gap-1 text-slate-700">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                    <span className="font-medium">{formattedDate || singleEvent.date}</span>
                                </div>
                                <div className="flex items-center gap-1 text-slate-700">
                                    <Clock className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                                    <span className="font-medium">{singleEvent.time || 'All Day'}</span>
                                </div>
                            </div>

                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${singleEvent.isHoliday ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                <span>{singleEvent.isHoliday ? 'Campus Closed' : 'Campus Open'}</span>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {!isConfirmed ? (
                        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                title="Cancel Draft"
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 transition shadow-2xs"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-1.5 ml-auto">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`p-1.5 rounded-lg border transition shadow-2xs ${
                                        isEditing
                                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                    title={isEditing ? 'Done Editing' : 'Edit Details'}
                                >
                                    <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    disabled={isSaving || !singleEvent.title || !singleEvent.date}
                                    title="Confirm & Add to Calendar"
                                    className="p-1.5 px-3 rounded-lg text-white font-medium flex items-center justify-center gap-1 transition shadow-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Added</span>
                            </div>
                            <a
                                href="/admin/calendar"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open Calendar"
                                className="p-1.5 px-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-2xs"
                            >
                                <Calendar className="w-3.5 h-3.5" /> <span>Calendar</span>
                            </a>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    /* ─── State: Multi-Event / Holiday Table Mode ─── */
    return (
        <div className="mt-2.5 rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/90 via-white to-teal-50/50 shadow-sm overflow-hidden text-[12px] animate-in fade-in">
            {/* Header */}
            <div className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-100" />
                    <span className="font-semibold text-xs tracking-tight">
                        {isConfirmed ? 'Holidays Added' : 'Holidays Draft'}
                    </span>
                </div>
                {isConfirmed ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-300 text-emerald-950 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Confirmed
                    </span>
                ) : (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-white/20 text-white">
                        {events.length} Items
                    </span>
                )}
            </div>

            <div className="p-2.5 space-y-2.5">
                {/* Holiday List Table / Container */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs max-h-56 overflow-y-auto">
                    {events.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-[11px]">No holidays recognized in document</div>
                    ) : isEditing && !isConfirmed ? (
                        <div className="p-2 space-y-2">
                            {events.map((ev, idx) => (
                                <div key={idx} className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                                    <div className="grid grid-cols-3 gap-1.5">
                                        <input
                                            type="date"
                                            value={ev.date}
                                            onChange={(e) => handleUpdateRow(idx, 'date', e.target.value)}
                                            className="px-2 py-1 bg-white border border-slate-300 rounded text-[11px] font-mono"
                                        />
                                        <select
                                            value={ev.type || 'gazetted_holiday'}
                                            onChange={(e) => handleUpdateRow(idx, 'type', e.target.value)}
                                            className="px-2 py-1 bg-white border border-slate-300 rounded text-[11px]"
                                        >
                                            <option value="gazetted_holiday">Gazetted Holiday</option>
                                            <option value="restricted_holiday">Restricted Holiday</option>
                                            <option value="summer_vacation">Summer Vacation</option>
                                            <option value="winter_vacation">Winter Vacation</option>
                                            <option value="exam_day">Exam Day</option>
                                            <option value="event">Event</option>
                                        </select>
                                        <div className="flex items-center justify-end">
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteRow(idx)}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                title="Delete item"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <input
                                            type="text"
                                            value={ev.title}
                                            onChange={(e) => handleUpdateRow(idx, 'title', e.target.value)}
                                            placeholder="Holiday Name (English)"
                                            className="px-2 py-1 bg-white border border-slate-300 rounded text-[11px] font-medium"
                                        />
                                        <input
                                            type="text"
                                            value={ev.titleHindi || ''}
                                            onChange={(e) => handleUpdateRow(idx, 'titleHindi', e.target.value)}
                                            placeholder="ਪੰਜਾਬੀ / हिंदी Title"
                                            className="px-2 py-1 bg-white border border-slate-300 rounded text-[11px]"
                                        />
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={handleAddRow}
                                className="w-full py-1.5 border border-dashed border-emerald-300 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Holiday
                            </button>
                        </div>
                    ) : (
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                                <tr>
                                    <th className="px-2 py-1">Date</th>
                                    <th className="px-2 py-1">Holiday</th>
                                    <th className="px-2 py-1">ਪੰਜਾਬੀ / हिंदी</th>
                                    <th className="px-2 py-1 text-right">Type</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {events.map((ev, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/80">
                                        <td className="px-2 py-1 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                                            {ev.date}
                                        </td>
                                        <td className="px-2 py-1 font-medium text-slate-900">
                                            {ev.title}
                                        </td>
                                        <td className="px-2 py-1 text-slate-600 font-medium">
                                            {ev.titleHindi || '-'}
                                        </td>
                                        <td className="px-2 py-1 text-right whitespace-nowrap">
                                            {getTypeBadge(ev.type, ev.isHoliday)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer Controls */}
                {!isConfirmed ? (
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={handleCancel}
                            title="Cancel Draft"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 transition shadow-2xs"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1.5 ml-auto">
                            <button
                                type="button"
                                onClick={() => setIsEditing(!isEditing)}
                                className={`p-1.5 rounded-lg border transition shadow-2xs ${
                                    isEditing
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                                title={isEditing ? 'Done Editing' : 'Edit List'}
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={isSaving || events.length === 0}
                                title="Confirm & Add All to Calendar"
                                className="p-1.5 px-3 rounded-lg text-white font-medium flex items-center justify-center gap-1 transition shadow-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Added</span>
                        </div>
                        <a
                            href="/admin/calendar"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open Calendar"
                            className="p-1.5 px-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-2xs"
                        >
                            <Calendar className="w-3.5 h-3.5" /> <span>Calendar</span>
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── User Creation Action Card ─── */
function UserActionCard({ action }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(action?.isConfirmed || false);
    const [isCancelled, setIsCancelled] = useState(action?.isCancelled || false);
    const [createdUser, setCreatedUser] = useState(null);
    const [availableClasses, setAvailableClasses] = useState([]);

    // Form state
    const [firstName, setFirstName] = useState(action?.firstName || '');
    const [lastName, setLastName] = useState(action?.lastName || '');
    const [email, setEmail] = useState(action?.email || '');
    const [role, setRole] = useState(action?.role || 'student');
    const [admissionNumber, setAdmissionNumber] = useState(action?.admissionNumber || '');
    const [phone, setPhone] = useState(action?.phone || '');
    const [classId, setClassId] = useState(action?.classId || '');
    const [password, setPassword] = useState(action?.password || 'Welcome123!');

    useEffect(() => {
        if (action) {
            setFirstName(action.firstName || '');
            setLastName(action.lastName || '');
            setEmail(action.email || '');
            setRole(action.role || 'student');
            setAdmissionNumber(action.admissionNumber || '');
            setPhone(action.phone || '');
            setClassId(action.classId || '');
            setPassword(action.password || 'Welcome123!');
            setIsConfirmed(action.isConfirmed || false);
            setIsCancelled(action.isCancelled || false);
        }
    }, [action]);

    useEffect(() => {
        classesAPI.getAll({ limit: 100 })
            .then(res => {
                const list = res.data?.data?.classes || res.data?.classes || (Array.isArray(res.data?.data) ? res.data.data : []);
                setAvailableClasses(Array.isArray(list) ? list : []);
            })
            .catch(() => {});
    }, []);

    const handleConfirm = async () => {
        if (!firstName.trim()) {
            toast.error('First name is required');
            return;
        }
        if (!email.trim()) {
            toast.error('Email is required');
            return;
        }

        setIsSaving(true);
        try {
            const res = await usersAPI.create({
                firstName: firstName.trim(),
                lastName: lastName.trim() || 'User',
                email: email.trim().toLowerCase(),
                role,
                phone: phone.trim() || undefined,
                admissionNumber: admissionNumber.trim() || undefined,
                studentId: admissionNumber.trim() || undefined,
                classId: classId || undefined,
                password: password || 'Welcome123!'
            });

            const newUser = res.data?.data?.user || res.data?.user;
            setCreatedUser(newUser);
            setIsConfirmed(true);
            setIsEditing(false);
            toast.success(res.data?.message || `User "${firstName} ${lastName}" created successfully!`, { icon: '👤' });
        } catch (err) {
            console.error('Failed to create user:', err);
            toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to create user');
        } finally {
            setIsSaving(false);
        }
    };

    if (isCancelled) {
        return (
            <div className="mt-3 p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5"><XCircle className="w-4 h-4 text-slate-400" /> User creation draft discarded</span>
                <button onClick={() => setIsCancelled(false)} className="text-indigo-600 hover:underline font-medium">Restore</button>
            </div>
        );
    }

    const selectedClass = (Array.isArray(availableClasses) ? availableClasses : []).find(c => c.id === classId);

    return (
        <div className="mt-3 rounded-xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/50 shadow-sm overflow-hidden text-xs">
            {/* Header */}
            <div className="px-3.5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="font-semibold text-[13px]">
                        {isConfirmed ? 'User Created Successfully' : 'Draft User Details'}
                    </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30">
                    {role}
                </span>
            </div>

            {/* Content Body */}
            <div className="p-3.5 space-y-3">
                {isEditing ? (
                    <div className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">First Name *</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="e.g. Rahul"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Last Name</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="e.g. Sharma"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Email Address *</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                placeholder="rahul@school.com"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Role</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
                                >
                                    <option value="student">Student</option>
                                    <option value="instructor">Instructor</option>
                                    <option value="admin">Admin</option>
                                    <option value="lab_assistant">Lab Assistant</option>
                                </select>
                            </div>
                            {role === 'student' && (
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Enroll in Class</label>
                                    <select
                                        value={classId}
                                        onChange={(e) => setClassId(e.target.value)}
                                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
                                    >
                                        <option value="">-- Select Class --</option>
                                        {availableClasses.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Admission / Student ID</label>
                                <input
                                    type="text"
                                    value={admissionNumber}
                                    onChange={(e) => setAdmissionNumber(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="e.g. ADM-2026-01"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Default Password</label>
                                <input
                                    type="text"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="Welcome123!"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-2.5 py-1 rounded-md text-slate-600 hover:bg-slate-100 font-medium"
                            >
                                Done Editing
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                                    <span>{firstName} {lastName}</span>
                                </div>
                                <div className="text-slate-500 text-xs mt-0.5 flex items-center gap-1 font-mono">
                                    <span>{email}</span>
                                </div>
                            </div>
                            {!isConfirmed && (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                    title="Edit User Details"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="bg-slate-100/70 p-2 rounded-lg">
                                <span className="text-[10px] text-slate-500 block">Role</span>
                                <span className="font-semibold text-slate-700 capitalize">{role}</span>
                            </div>
                            <div className="bg-slate-100/70 p-2 rounded-lg">
                                <span className="text-[10px] text-slate-500 block">Class</span>
                                <span className="font-semibold text-slate-700">{selectedClass?.name || action?.className || 'None'}</span>
                            </div>
                            {admissionNumber && (
                                <div className="bg-slate-100/70 p-2 rounded-lg">
                                    <span className="text-[10px] text-slate-500 block">Admission / ID</span>
                                    <span className="font-semibold text-slate-700">{admissionNumber}</span>
                                </div>
                            )}
                            <div className="bg-slate-100/70 p-2 rounded-lg">
                                <span className="text-[10px] text-slate-500 block">Initial Password</span>
                                <span className="font-mono text-slate-700">{password}</span>
                            </div>
                        </div>

                        {/* Confirmation State */}
                        {isConfirmed && (
                            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                                <span className="flex items-center gap-1.5 font-medium">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    User created and ready in system!
                                </span>
                                <a
                                    href="/users"
                                    className="text-emerald-700 hover:underline font-bold flex items-center gap-1"
                                >
                                    View Users <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {!isConfirmed && (
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCancelled(true)}
                                    title="Cancel / Discard Draft"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    disabled={isSaving}
                                    title="Confirm & Register User"
                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 text-xs"
                                >
                                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    <span>Confirm</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Ticket / Issue Creation Action Card ─── */
function TicketActionCard({ action }) {
    const [isConfirmed, setIsConfirmed] = useState(action?.isConfirmed || false);
    const [isCancelled, setIsCancelled] = useState(action?.isCancelled || false);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [createdTicket, setCreatedTicket] = useState(null);

    const [title, setTitle] = useState(action?.title || 'Power Rail Failure');
    const [description, setDescription] = useState(action?.description || '');
    const [category, setCategory] = useState(action?.category || 'hardware_issue');
    const [priority, setPriority] = useState(action?.priority || 'medium');
    const [date, setDate] = useState(action?.date ? new Date(action.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [labId, setLabId] = useState(action?.labId || '');
    const [itemType, setItemType] = useState(action?.itemType || '');
    const [itemId, setItemId] = useState(action?.itemId || '');
    const [availableLabs, setAvailableLabs] = useState([]);
    const [labItems, setLabItems] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(false);

    useEffect(() => {
        labsAPI.getAll()
            .then(res => {
                const list = res.data?.data?.labs || res.data?.labs || (Array.isArray(res.data?.data) ? res.data.data : []);
                setAvailableLabs(Array.isArray(list) ? list : []);
            })
            .catch(() => {});
    }, []);

    // Load items whenever labId changes
    useEffect(() => {
        if (!labId) {
            setLabItems([]);
            return;
        }
        setItemsLoading(true);
        labsAPI.getItems(labId)
            .then(res => {
                const allItems = res.data?.data?.items || res.data?.items || (Array.isArray(res.data?.data) ? res.data.data : []);
                const items = Array.isArray(allItems) ? allItems : [];
                setLabItems(items);

                // Auto-match itemId if not set but action provided serialNo or itemNumber
                if (!itemId && (action?.serialNo || action?.itemNumber)) {
                    const match = items.find(it =>
                        (action.serialNo && it.serialNo?.toLowerCase() === action.serialNo.toLowerCase()) ||
                        (action.itemNumber && it.itemNumber?.toLowerCase() === action.itemNumber.toLowerCase())
                    );
                    if (match) {
                        setItemId(match.id);
                        if (!itemType) setItemType(match.itemType);
                    }
                }
            })
            .catch(() => setLabItems([]))
            .finally(() => setItemsLoading(false));
    }, [labId]);

    const handleConfirm = async () => {
        if (!title.trim()) {
            toast.error('Ticket title is required');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                title: title.trim(),
                description: description.trim() || title.trim(),
                category,
                priority,
                labId: labId || null,
                itemId: itemId || null
            };

            const res = await ticketsAPI.create(payload);
            if (res.data?.success) {
                setIsConfirmed(true);
                setCreatedTicket(res.data.data);
                toast.success(`Ticket ${res.data.data?.ticketNumber || ''} created successfully!`);
            } else {
                toast.error(res.data?.message || 'Failed to create ticket');
            }
        } catch (err) {
            console.error('Error creating ticket:', err);
            toast.error(err.response?.data?.message || err.message || 'Error creating ticket');
        } finally {
            setLoading(false);
        }
    };

    if (isCancelled) {
        return (
            <div className="mt-3 p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5"><XCircle className="w-4 h-4 text-slate-400" /> Ticket creation draft discarded</span>
                <button onClick={() => setIsCancelled(false)} className="text-indigo-600 hover:underline font-medium">Restore</button>
            </div>
        );
    }

    const selectedLab = (Array.isArray(availableLabs) ? availableLabs : []).find(l => l.id === labId);
    const selectedItem = (Array.isArray(labItems) ? labItems : []).find(i => i.id === itemId);

    const categoryLabels = {
        hardware_issue: '🔧 Hardware Issue',
        software_issue: '💻 Software Issue',
        maintenance_request: '🛠️ Maintenance Request',
        general_complaint: '📝 General Complaint',
        other: '📋 Other'
    };

    const priorityBadges = {
        low: 'bg-slate-100 text-slate-700 border-slate-200',
        medium: 'bg-blue-50 text-blue-700 border-blue-200',
        high: 'bg-orange-50 text-orange-700 border-orange-200',
        critical: 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
    };

    const itemTypeIcons = {
        pc: '🖥️', ups: '⚡', laptop: '💻', tablet: '📱', server: '🗄️',
        interactive_panel: '📺', printer: '🖨️', scanner: '📄', router: '📶',
        network_switch: '🌐', smart_camera: '📹', projector: '📽️',
        soundbar: '🔊', speaker: '📢', headphone: '🎧', barcode_scanner: '🏷️', cable: '🔌', other: '📦'
    };

    const availableItemTypes = Array.from(new Set(labItems.map(i => i.itemType))).filter(Boolean);
    const filteredLabItems = itemType && itemType !== 'all'
        ? labItems.filter(i => i.itemType === itemType)
        : labItems;

    return (
        <div className="mt-3 rounded-xl border border-rose-200/90 bg-gradient-to-br from-rose-50/70 via-white to-amber-50/50 shadow-sm overflow-hidden text-xs">
            {/* Header */}
            <div className="px-3.5 py-2.5 bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4" />
                    <span className="font-semibold text-[13px]">
                        {isConfirmed ? 'Ticket Created' : 'Draft Support Ticket'}
                    </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30">
                    {priority}
                </span>
            </div>

            {/* Content Body */}
            <div className="p-3.5 space-y-3">
                {isEditing ? (
                    <div className="space-y-2.5">
                        <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Ticket Title *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                                placeholder="e.g. Power rail failure"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Category</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none bg-white"
                                >
                                    <option value="hardware_issue">Hardware Issue</option>
                                    <option value="software_issue">Software Issue</option>
                                    <option value="maintenance_request">Maintenance Request</option>
                                    <option value="general_complaint">General Complaint</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Priority</label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none bg-white"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical / Emergency</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Assign to Lab</label>
                                <select
                                    value={labId}
                                    onChange={(e) => {
                                        setLabId(e.target.value);
                                        setItemType('');
                                        setItemId('');
                                    }}
                                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none bg-white"
                                >
                                    <option value="">-- General / No Lab --</option>
                                    {(Array.isArray(availableLabs) ? availableLabs : []).map(l => (
                                        <option key={l.id} value={l.id}>{l.name} {l.roomNumber ? `(${l.roomNumber})` : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Reported Date</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Item Type & Serial No. Selector (When Lab is selected) */}
                        {labId && (
                            <div className="p-2.5 bg-slate-100/80 rounded-lg space-y-2 border border-slate-200">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Filter by Item Type</label>
                                        <select
                                            value={itemType}
                                            onChange={(e) => {
                                                setItemType(e.target.value);
                                                setItemId('');
                                            }}
                                            className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none bg-white"
                                        >
                                            <option value="">All Types ({labItems.length} items)</option>
                                            {availableItemTypes.map(t => (
                                                <option key={t} value={t}>
                                                    {itemTypeIcons[t] || '📦'} {t.toUpperCase()} ({labItems.filter(i => i.itemType === t).length})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Serial No. & Item *</label>
                                        {itemsLoading ? (
                                            <div className="text-[11px] text-slate-500 py-1">Loading items...</div>
                                        ) : labItems.length === 0 ? (
                                            <div className="text-[11px] text-amber-600 py-1">No items found in this lab</div>
                                        ) : (
                                            <select
                                                value={itemId}
                                                onChange={(e) => {
                                                    const sel = labItems.find(i => i.id === e.target.value);
                                                    setItemId(e.target.value);
                                                    if (sel && !itemType) setItemType(sel.itemType);
                                                }}
                                                className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none bg-white font-mono"
                                            >
                                                <option value="">-- Select Serial No. / Item --</option>
                                                {filteredLabItems.map(it => (
                                                    <option key={it.id} value={it.id}>
                                                        {it.itemNumber} • SN: {it.serialNo || 'N/A'} {it.brand ? `(${it.brand})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                {/* Item Preview */}
                                {selectedItem && (
                                    <div className="p-2 bg-white rounded border border-rose-200 text-[11px] flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span>{itemTypeIcons[selectedItem.itemType] || '📦'}</span>
                                            <span className="font-bold text-slate-800">{selectedItem.itemNumber}</span>
                                            <span className="text-slate-500">{selectedItem.brand} {selectedItem.modelNo || ''}</span>
                                        </div>
                                        <div className="font-mono font-semibold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                            SN: {selectedItem.serialNo || 'N/A'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none resize-none"
                                placeholder="Describe the fault or incident..."
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-2.5 py-1 rounded-md text-slate-600 hover:bg-slate-100 font-medium"
                            >
                                Done Editing
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                                    <span>{title}</span>
                                </div>
                                <div className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                                    <span>{description || 'No additional description provided.'}</span>
                                </div>
                            </div>
                            {!isConfirmed && (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                    title="Edit Ticket Details"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="bg-slate-100/70 p-2 rounded-lg">
                                <span className="text-[10px] text-slate-500 block">Category</span>
                                <span className="font-semibold text-slate-700">{categoryLabels[category] || category}</span>
                            </div>
                            <div className="bg-slate-100/70 p-2 rounded-lg">
                                <span className="text-[10px] text-slate-500 block">Priority</span>
                                <span className={`font-semibold capitalize px-1.5 py-0.5 rounded border inline-block text-[11px] ${priorityBadges[priority] || ''}`}>
                                    {priority}
                                </span>
                            </div>
                            <div className="bg-slate-100/70 p-2 rounded-lg">
                                <span className="text-[10px] text-slate-500 block">Location / Lab</span>
                                <span className="font-semibold text-slate-700">{selectedLab?.name || action?.labName || 'General / Campus'}</span>
                            </div>
                            <div className="bg-slate-100/70 p-2 rounded-lg">
                                <span className="text-[10px] text-slate-500 block">Reported Date</span>
                                <span className="font-medium text-slate-700">{date}</span>
                            </div>

                            {/* Serial Number & Affected Item Badge if present */}
                            {(selectedItem || action?.serialNo || action?.itemNumber) && (
                                <div className="col-span-2 bg-slate-100/90 p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm">{itemTypeIcons[selectedItem?.itemType || action?.itemType] || '📦'}</span>
                                        <div>
                                            <span className="font-bold text-slate-800 text-[11px] block">
                                                {selectedItem?.itemNumber || action?.itemNumber || 'Equipment Item'}
                                                {selectedItem?.brand && <span className="font-normal text-slate-500 ml-1">({selectedItem.brand})</span>}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="font-mono text-[11px] font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                                        SN: {selectedItem?.serialNo || action?.serialNo || 'N/A'}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Confirmed State banner */}
                {isConfirmed && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 animate-in fade-in">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Ticket #{createdTicket?.ticketNumber || 'TKT-CREATED'} Created!</span>
                        </div>
                        <p className="text-[11px] text-emerald-700">
                            Support ticket has been logged and queued for the IT / Maintenance team.
                        </p>
                        <div className="pt-1 flex items-center gap-2">
                            <a
                                href="/tickets"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-100/80 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition"
                            >
                                <Ticket className="w-3 h-3" /> View All Tickets
                            </a>
                        </div>
                    </div>
                )}

                {/* Footer Action Buttons */}
                {!isConfirmed && !isEditing && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <button
                            type="button"
                            onClick={() => setIsCancelled(true)}
                            title="Cancel / Discard Draft"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={loading}
                            title="Confirm & Create Ticket"
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-semibold flex items-center gap-1.5 shadow-sm shadow-rose-500/20 transition disabled:opacity-50 text-xs"
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>Confirm</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Procurement Case Action Card ─── */
function ProcurementActionCard({ action }) {
    const [isConfirmed, setIsConfirmed] = useState(action?.isConfirmed || false);
    const [isCancelled, setIsCancelled] = useState(action?.isCancelled || false);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [createdRequest, setCreatedRequest] = useState(null);

    const [title, setTitle] = useState(action?.title || 'Lab Equipment Procurement');
    const [purpose, setPurpose] = useState(action?.purpose || '');
    const [department, setDepartment] = useState(action?.department || 'Computer Science & Lab Department');
    const [budgetCode, setBudgetCode] = useState(action?.budgetCode || 'LAB-ACAD-2026');
    const [items, setItems] = useState(action?.items || [{ itemName: 'Item 1', quantity: 1, unit: 'pcs', estimatedUnitPrice: 0 }]);

    const totalEstimate = items.reduce((acc, it) => acc + ((parseFloat(it.estimatedUnitPrice) || 0) * (parseInt(it.quantity) || 1)), 0);

    const handleAddItem = () => {
        setItems([...items, { itemName: '', quantity: 1, unit: 'pcs', estimatedUnitPrice: 0 }]);
    };

    const handleRemoveItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index, field, val) => {
        const copy = [...items];
        copy[index] = { ...copy[index], [field]: val };
        setItems(copy);
    };

    const handleConfirm = async () => {
        if (!title.trim()) {
            toast.error('Procurement title is required');
            return;
        }
        if (items.length === 0 || !items.some(it => it.itemName.trim())) {
            toast.error('At least one valid item is required');
            return;
        }

        setLoading(true);
        try {
            const validItems = items.filter(it => it.itemName.trim()).map(it => ({
                itemName: it.itemName.trim(),
                quantity: parseInt(it.quantity) || 1,
                unit: it.unit || 'pcs',
                estimatedUnitPrice: parseFloat(it.estimatedUnitPrice) || null,
                specifications: it.specifications || null
            }));

            const payload = {
                title: title.trim(),
                purpose: purpose.trim() || title.trim(),
                department: department.trim(),
                budgetCode: budgetCode.trim(),
                items: validItems
            };

            const res = await procurementAPI.createRequest(payload);
            if (res.data?.success) {
                setIsConfirmed(true);
                setCreatedRequest(res.data.data);
                toast.success('Procurement case created successfully!');
            } else {
                toast.error(res.data?.message || 'Failed to create procurement case');
            }
        } catch (err) {
            console.error('Error creating procurement request:', err);
            toast.error(err.response?.data?.message || err.message || 'Error creating procurement case');
        } finally {
            setLoading(false);
        }
    };

    if (isCancelled) {
        return (
            <div className="mt-3 p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5"><XCircle className="w-4 h-4 text-slate-400" /> Procurement case draft discarded</span>
                <button onClick={() => setIsCancelled(false)} className="text-indigo-600 hover:underline font-medium">Restore</button>
            </div>
        );
    }

    return (
        <div className="mt-3 rounded-xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 shadow-sm overflow-hidden text-xs">
            {/* Header */}
            <div className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    <span className="font-semibold text-[13px]">
                        {isConfirmed ? 'Procurement Case Registered' : 'Draft Procurement Case'}
                    </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30">
                    {department}
                </span>
            </div>

            {/* Body */}
            <div className="p-3.5 space-y-3">
                {isEditing ? (
                    <div className="space-y-2.5">
                        <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Procurement Title *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                placeholder="e.g. Procurement of LAN Cables and Gigabit Switches"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Department</label>
                                <input
                                    type="text"
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Budget Code</label>
                                <input
                                    type="text"
                                    value={budgetCode}
                                    onChange={(e) => setBudgetCode(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Purpose & Justification</label>
                            <textarea
                                value={purpose}
                                onChange={(e) => setPurpose(e.target.value)}
                                rows={2}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none resize-none"
                                placeholder="State the reason for requisition..."
                            />
                        </div>

                        {/* Items Editor */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-semibold text-slate-600">Requisition Items ({items.length})</label>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                                >
                                    <Plus className="w-3 h-3" /> Add Item
                                </button>
                            </div>
                            {items.map((it, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                                    <input
                                        type="text"
                                        value={it.itemName}
                                        onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                                        placeholder="Item name"
                                        className="flex-1 px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                                    />
                                    <input
                                        type="number"
                                        min="1"
                                        value={it.quantity}
                                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                        className="w-14 px-1.5 py-1 bg-white border border-slate-300 rounded text-xs text-center"
                                        placeholder="Qty"
                                    />
                                    <input
                                        type="text"
                                        value={it.unit}
                                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                                        className="w-14 px-1.5 py-1 bg-white border border-slate-300 rounded text-xs text-center"
                                        placeholder="Unit"
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        value={it.estimatedUnitPrice || ''}
                                        onChange={(e) => handleItemChange(idx, 'estimatedUnitPrice', e.target.value)}
                                        className="w-20 px-1.5 py-1 bg-white border border-slate-300 rounded text-xs text-right"
                                        placeholder="₹ Price"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(idx)}
                                        className="text-slate-400 hover:text-rose-500 p-1"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-2.5 py-1 rounded-md text-slate-600 hover:bg-slate-100 font-medium"
                            >
                                Done Editing
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                                    <span>{title}</span>
                                </div>
                                <div className="text-slate-500 text-xs mt-0.5">
                                    <span>{purpose || 'Standard academic lab procurement requisition.'}</span>
                                </div>
                            </div>
                            {!isConfirmed && (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                                    title="Edit Procurement Details"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="bg-slate-100/70 p-2.5 rounded-lg space-y-1.5">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                <span>Requested Items ({items.length})</span>
                                <span className="text-emerald-700 font-semibold">
                                    {totalEstimate > 0 ? `Est. Total: ₹${totalEstimate.toLocaleString('en-IN')}` : ''}
                                </span>
                            </div>
                            <div className="divide-y divide-slate-200/80">
                                {items.map((it, idx) => (
                                    <div key={idx} className="py-1 flex items-center justify-between text-[11px]">
                                        <span className="font-medium text-slate-700">
                                            {it.quantity} {it.unit || 'pcs'} × {it.itemName}
                                        </span>
                                        {it.estimatedUnitPrice ? (
                                            <span className="font-mono text-slate-600">
                                                ₹{(parseFloat(it.estimatedUnitPrice) * (parseInt(it.quantity) || 1)).toLocaleString('en-IN')}
                                            </span>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="bg-slate-100/70 p-2 rounded-lg">
                                <span className="text-[10px] text-slate-500 block">Department</span>
                                <span className="font-semibold text-slate-700">{department}</span>
                            </div>
                            <div className="bg-slate-100/70 p-2 rounded-lg">
                                <span className="text-[10px] text-slate-500 block">Estimated Budget</span>
                                <span className="font-bold text-emerald-700">
                                    ₹{totalEstimate ? totalEstimate.toLocaleString('en-IN') : (action?.estimatedTotal ? parseFloat(action.estimatedTotal).toLocaleString('en-IN') : 'TBD')}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirmed State */}
                {isConfirmed && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 animate-in fade-in">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Procurement Request Created!</span>
                        </div>
                        <p className="text-[11px] text-emerald-700">
                            Requisition has been saved in draft status. You can now invite vendor quotations and print purchase proposals.
                        </p>
                        <div className="pt-1 flex items-center gap-2">
                            <a
                                href="/admin/procurement"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-100/80 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition"
                            >
                                <ShoppingBag className="w-3 h-3" /> View Procurement Dashboard
                            </a>
                        </div>
                    </div>
                )}

                {/* Footer Action Buttons */}
                {!isConfirmed && !isEditing && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <button
                            type="button"
                            onClick={() => setIsCancelled(true)}
                            title="Cancel / Discard Draft"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={loading}
                            title="Confirm & Create Procurement Case"
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 transition disabled:opacity-50 text-xs"
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>Confirm</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Equipment Shift Request Action Card ─── */
function ShiftActionCard({ action }) {
    const [isConfirmed, setIsConfirmed] = useState(action?.isConfirmed || false);
    const [isCancelled, setIsCancelled] = useState(action?.isCancelled || false);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    const [itemId, setItemId] = useState(action?.itemId || '');
    const [itemNumber, setItemNumber] = useState(action?.itemNumber || 'CLX-PC-001');
    const [itemType, setItemType] = useState(action?.itemType || 'pc');
    const [serialNo, setSerialNo] = useState(action?.serialNo || 'N/A');
    const [fromLabName, setFromLabName] = useState(action?.fromLabName || 'Source Lab');
    const [toLabId, setToLabId] = useState(action?.toLabId || '');
    const [toLabName, setToLabName] = useState(action?.toLabName || 'Destination Lab');
    const [reason, setReason] = useState(action?.reason || 'Laboratory reorganization and workstation upgrade');
    const [allLabs, setAllLabs] = useState(action?.allLabs || []);

    useEffect(() => {
        if (action) {
            setItemId(action.itemId || '');
            setItemNumber(action.itemNumber || 'CLX-PC-001');
            setItemType(action.itemType || 'pc');
            setSerialNo(action.serialNo || 'N/A');
            setFromLabName(action.fromLabName || 'Source Lab');
            setToLabId(action.toLabId || '');
            setToLabName(action.toLabName || 'Destination Lab');
            setReason(action.reason || 'Laboratory reorganization and workstation upgrade');
            setAllLabs(action.allLabs || []);
            setIsConfirmed(action.isConfirmed || false);
            setIsCancelled(action.isCancelled || false);
        }
    }, [action]);

    const handleConfirm = async () => {
        if (!itemId || !toLabId) {
            toast.error('Item and Destination Lab are required');
            return;
        }
        if (!reason.trim()) {
            toast.error('Reason for shift is required');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/labs/shift-requests', {
                itemId,
                toLabId,
                reason: reason.trim()
            });

            if (res.data?.success) {
                setIsConfirmed(true);
                setIsEditing(false);
                toast.success('Equipment shift request submitted for approval!');
            } else {
                toast.error(res.data?.message || 'Failed to create shift request');
            }
        } catch (err) {
            console.error('Error creating shift request:', err);
            toast.error(err.response?.data?.message || err.message || 'Error submitting shift request');
        } finally {
            setLoading(false);
        }
    };

    if (isCancelled) {
        return (
            <div className="mt-2.5 rounded-2xl border border-slate-200 bg-slate-50/90 p-3.5 shadow-xs space-y-2 text-[12px] animate-in fade-in">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-slate-700">
                        <XCircle className="w-4 h-4 text-slate-400" />
                        <span>Shift Request Draft Discarded</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsCancelled(false)}
                        className="text-[11px] text-primary-600 hover:text-primary-700 font-semibold hover:underline flex items-center gap-1 transition"
                    >
                        <Undo2 className="w-3 h-3" /> Restore Draft
                    </button>
                </div>
                <p className="text-[11px] text-slate-500">
                    The shift request for item {itemNumber} was cancelled.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-2.5 rounded-2xl border border-cyan-200/90 bg-gradient-to-br from-cyan-50/70 via-white to-blue-50/50 shadow-sm overflow-hidden text-xs animate-in fade-in">
            {/* Header */}
            <div className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-xs tracking-tight">
                    <Truck className="w-4 h-4 text-cyan-100" />
                    <span>{isConfirmed ? 'Shift Request Submitted' : 'Draft Equipment Shift Request'}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30">
                    {itemType.toUpperCase()}
                </span>
            </div>

            {/* Body */}
            <div className="p-3 space-y-2.5">
                {isEditing && !isConfirmed ? (
                    <div className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Item Number</label>
                                <input
                                    type="text"
                                    value={itemNumber}
                                    disabled
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Serial Number</label>
                                <input
                                    type="text"
                                    value={serialNo}
                                    disabled
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-xs font-mono text-slate-700"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Destination Lab *</label>
                            <select
                                value={toLabId}
                                onChange={(e) => {
                                    setToLabId(e.target.value);
                                    const l = allLabs.find(x => x.id === e.target.value);
                                    if (l) setToLabName(l.name);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none bg-white"
                            >
                                {allLabs.map(lab => (
                                    <option key={lab.id} value={lab.id}>{lab.name} {lab.roomNumber ? `(Room ${lab.roomNumber})` : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Reason for Shift *</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={2}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none resize-none"
                                placeholder="State the reason for relocation..."
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                title="Done Editing"
                                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-medium flex items-center gap-1"
                            >
                                <Check className="w-3.5 h-3.5 text-cyan-600" />
                                <span className="text-[11px]">Done</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Equipment Info Box */}
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between">
                                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                    <Monitor className="w-3.5 h-3.5 text-cyan-600" />
                                    <span>{itemNumber}</span>
                                    {action?.brand && <span className="text-slate-500 font-normal">({action.brand} {action.modelNo || ''})</span>}
                                </div>
                                {!isConfirmed && (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(true)}
                                        className="p-1 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition"
                                        title="Edit Destination or Reason"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px]">
                                <span className="text-slate-500">Serial No:</span>
                                <code className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-mono font-bold text-[10px]">
                                    {serialNo}
                                </code>
                            </div>
                        </div>

                        {/* Shift Movement Flow */}
                        <div className="p-2 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200/80 rounded-xl flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Source</span>
                                <span className="font-bold text-slate-800">{fromLabName}</span>
                            </div>
                            <div className="flex flex-col items-center px-2">
                                <span className="text-[9px] font-bold text-cyan-700 uppercase">Transfer</span>
                                <ArrowRight className="w-4 h-4 text-cyan-600 animate-pulse" />
                            </div>
                            <div className="space-y-0.5 text-right">
                                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Destination</span>
                                <span className="font-bold text-cyan-800">{toLabName}</span>
                            </div>
                        </div>

                        {/* Reason Box */}
                        <div className="p-2 bg-slate-50 rounded-lg text-[11px] text-slate-600">
                            <span className="font-semibold text-slate-700">Reason:</span> {reason}
                        </div>
                    </div>
                )}

                {/* Confirmed State */}
                {isConfirmed && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 animate-in fade-in">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Shift Request Queued for Approval!</span>
                        </div>
                        <p className="text-[11px] text-emerald-700">
                            The transfer of {itemNumber} to {toLabName} has been submitted for admin approval.
                        </p>
                        <div className="pt-1 flex items-center gap-2">
                            <a
                                href="/admin/labs/shift-requests"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-100/80 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition"
                            >
                                <Truck className="w-3 h-3" /> View Shift Requests
                            </a>
                        </div>
                    </div>
                )}

                {/* Footer Action Buttons */}
                {!isConfirmed && !isEditing && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <button
                            type="button"
                            onClick={() => setIsCancelled(true)}
                            title="Cancel / Discard Draft"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={loading}
                            title="Confirm & Submit Shift Request"
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-sm shadow-cyan-500/20 transition disabled:opacity-50 text-xs"
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>Confirm Shift</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Document Sharing Action Card ─── */
function DocumentShareActionCard({ action }) {
    const [isConfirmed, setIsConfirmed] = useState(action?.isConfirmed || false);
    const [isCancelled, setIsCancelled] = useState(action?.isCancelled || false);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    const [documentId, setDocumentId] = useState(action?.documentId || '');
    const [documentName, setDocumentName] = useState(action?.documentName || 'Academic Document');
    const [fileType, setFileType] = useState(action?.fileType || 'pdf');
    const [targetClassIds, setTargetClassIds] = useState(action?.targetClassIds || []);
    const [targetGroupIds, setTargetGroupIds] = useState(action?.targetGroupIds || []);
    const [targetStudentIds, setTargetStudentIds] = useState(action?.targetStudentIds || []);
    const [targetNames, setTargetNames] = useState(action?.targetNames || []);
    const [availableClasses, setAvailableClasses] = useState(action?.availableClasses || []);
    const [permission, setPermission] = useState(action?.permission || 'view');

    useEffect(() => {
        if (action) {
            setDocumentId(action.documentId || '');
            setDocumentName(action.documentName || 'Academic Document');
            setFileType(action.fileType || 'pdf');
            setTargetClassIds(action.targetClassIds || []);
            setTargetGroupIds(action.targetGroupIds || []);
            setTargetStudentIds(action.targetStudentIds || []);
            setTargetNames(action.targetNames || []);
            setAvailableClasses(action.availableClasses || []);
            setPermission(action.permission || 'view');
            setIsConfirmed(action.isConfirmed || false);
            setIsCancelled(action.isCancelled || false);
        }
    }, [action]);

    const handleToggleClass = (id) => {
        setTargetClassIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleConfirm = async () => {
        if (!documentId) {
            toast.error('Document ID is required');
            return;
        }
        if (targetClassIds.length === 0 && targetGroupIds.length === 0 && targetStudentIds.length === 0) {
            toast.error('Please select at least one recipient (Class, Group, or Student)');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post(`/documents/${documentId}/share`, {
                classIds: targetClassIds,
                groupIds: targetGroupIds,
                studentIds: targetStudentIds,
                permission
            });

            if (res.data?.success) {
                setIsConfirmed(true);
                setIsEditing(false);
                toast.success('Document shared successfully!');
            } else {
                toast.error(res.data?.message || 'Failed to share document');
            }
        } catch (err) {
            console.error('Error sharing document:', err);
            toast.error(err.response?.data?.message || err.message || 'Error sharing document');
        } finally {
            setLoading(false);
        }
    };

    if (isCancelled) {
        return (
            <div className="mt-2.5 rounded-2xl border border-slate-200 bg-slate-50/90 p-3.5 shadow-xs space-y-2 text-[12px] animate-in fade-in">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-slate-700">
                        <XCircle className="w-4 h-4 text-slate-400" />
                        <span>Document Sharing Cancelled</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsCancelled(false)}
                        className="text-[11px] text-primary-600 hover:text-primary-700 font-semibold hover:underline flex items-center gap-1 transition"
                    >
                        <Undo2 className="w-3 h-3" /> Restore Draft
                    </button>
                </div>
                <p className="text-[11px] text-slate-500">
                    Sharing proposal for "{documentName}" was discarded.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-2.5 rounded-2xl border border-violet-200/90 bg-gradient-to-br from-violet-50/70 via-white to-purple-50/50 shadow-sm overflow-hidden text-xs animate-in fade-in">
            {/* Header */}
            <div className="px-3.5 py-2 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-xs tracking-tight">
                    <Share2 className="w-4 h-4 text-violet-100" />
                    <span>{isConfirmed ? 'Document Shared' : 'Share Document Proposal'}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30">
                    {fileType.toUpperCase()}
                </span>
            </div>

            {/* Body */}
            <div className="p-3 space-y-2.5">
                {/* Document Information */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate text-xs">{documentName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">Permission: View & Download</div>
                        </div>
                    </div>
                    {!isConfirmed && (
                        <button
                            type="button"
                            onClick={() => setIsEditing(!isEditing)}
                            className="p-1 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition"
                            title="Edit Target Recipients"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {isEditing && !isConfirmed ? (
                    <div className="space-y-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200">
                        <label className="text-[10px] font-semibold text-slate-600 block uppercase tracking-wider">Select Target Classes</label>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                            {availableClasses.map(cls => {
                                const selected = targetClassIds.includes(cls.id);
                                return (
                                    <button
                                        key={cls.id}
                                        type="button"
                                        onClick={() => handleToggleClass(cls.id)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                                            selected
                                                ? 'bg-violet-600 text-white border-violet-600 shadow-2xs'
                                                : 'bg-white text-slate-700 border-slate-200 hover:border-violet-300'
                                        }`}
                                    >
                                        Class {cls.name}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex justify-end pt-1">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="p-1 rounded-lg text-slate-600 hover:bg-slate-200 font-medium flex items-center gap-1"
                            >
                                <Check className="w-3.5 h-3.5 text-violet-600" />
                                <span className="text-[11px]">Done</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Recipients:</span>
                        <div className="flex flex-wrap gap-1.5">
                            {targetClassIds.length > 0 && targetClassIds.map(id => {
                                const c = availableClasses.find(x => x.id === id);
                                return (
                                    <span key={id} className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 font-medium text-[11px] border border-violet-200">
                                        Class {c?.name || id}
                                    </span>
                                );
                            })}
                            {targetNames.length === 0 && targetClassIds.length === 0 && (
                                <span className="text-slate-400 italic text-[11px]">No recipients specified</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Confirmed State */}
                {isConfirmed && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 animate-in fade-in">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Document Shared Successfully!</span>
                        </div>
                        <p className="text-[11px] text-emerald-700">
                            Students and instructors in the selected groups can now access and download "{documentName}".
                        </p>
                        <div className="pt-1 flex items-center gap-2">
                            <a
                                href="/documents"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-100/80 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition"
                            >
                                <Folder className="w-3 h-3" /> Open Documents
                            </a>
                        </div>
                    </div>
                )}

                {/* Footer Action Buttons */}
                {!isConfirmed && !isEditing && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <button
                            type="button"
                            onClick={() => setIsCancelled(true)}
                            title="Cancel / Discard Draft"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={loading || (targetClassIds.length === 0 && targetGroupIds.length === 0 && targetStudentIds.length === 0)}
                            title="Confirm & Share Document"
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold flex items-center gap-1.5 shadow-sm shadow-violet-500/20 transition disabled:opacity-50 text-xs"
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>Confirm & Share</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Training Module & Competition Action Card ─── */
function TrainingActionCard({ action }) {
    const [isConfirmed, setIsConfirmed] = useState(action?.isConfirmed || false);
    const [isCancelled, setIsCancelled] = useState(action?.isCancelled || false);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [createdModule, setCreatedModule] = useState(null);

    const [title, setTitle] = useState(action?.title || 'Python Data Structures & Algorithms');
    const [description, setDescription] = useState(action?.description || '');
    const [language, setLanguage] = useState(action?.language || 'python');
    const [classLevel, setClassLevel] = useState(action?.classLevel || 11);
    const [boardAligned, setBoardAligned] = useState(action?.boardAligned || 'CBSE');
    const [units, setUnits] = useState(action?.units || []);

    const handleConfirm = async () => {
        if (!title.trim()) {
            toast.error('Module title is required');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                title: title.trim(),
                description: description.trim() || title.trim(),
                language,
                classLevel: classLevel ? parseInt(classLevel) : null,
                boardAligned
            };

            const res = await trainingAPI.createModule(payload);
            if (res.data?.success && res.data.data?.module) {
                const newMod = res.data.data.module;
                setIsConfirmed(true);
                setCreatedModule(newMod);

                // Auto-create proposed units if provided
                if (units.length > 0) {
                    for (let i = 0; i < units.length; i++) {
                        const u = units[i];
                        await trainingAPI.createUnit(newMod.id, {
                            title: u.title,
                            unitNumber: u.unitNumber || (i + 1),
                            expectedHours: u.expectedHours || 2,
                            unlockThreshold: 75,
                            sequenceOrder: i + 1
                        }).catch(() => {});
                    }
                }

                toast.success(`Training Module "${title}" created successfully!`);
            } else {
                toast.error(res.data?.message || 'Failed to create training module');
            }
        } catch (err) {
            console.error('Error creating training module:', err);
            toast.error(err.response?.data?.message || err.message || 'Error creating training module');
        } finally {
            setLoading(false);
        }
    };

    if (isCancelled) {
        return (
            <div className="mt-3 p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5"><XCircle className="w-4 h-4 text-slate-400" /> Training module draft discarded</span>
                <button onClick={() => setIsCancelled(false)} className="text-indigo-600 hover:underline font-medium">Restore</button>
            </div>
        );
    }

    const languageBadges = {
        python: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        cpp: 'bg-blue-50 text-blue-800 border-blue-200',
        java: 'bg-orange-50 text-orange-800 border-orange-200',
        javascript: 'bg-amber-50 text-amber-800 border-amber-200',
        sql: 'bg-indigo-50 text-indigo-800 border-indigo-200'
    };

    return (
        <div className="mt-3 rounded-xl border border-cyan-200/90 bg-gradient-to-br from-cyan-50/70 via-white to-blue-50/50 shadow-sm overflow-hidden text-xs">
            {/* Header */}
            <div className="px-3.5 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    <span className="font-semibold text-[13px]">
                        {isConfirmed ? 'Training Module Created' : 'Draft Training Module'}
                    </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30">
                    {language}
                </span>
            </div>

            {/* Body */}
            <div className="p-3.5 space-y-3">
                {isEditing ? (
                    <div className="space-y-2.5">
                        <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Module Title *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                                placeholder="e.g. Python Data Structures & Algorithms"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Language</label>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none bg-white"
                                >
                                    <option value="python">Python</option>
                                    <option value="cpp">C++</option>
                                    <option value="java">Java</option>
                                    <option value="javascript">JavaScript</option>
                                    <option value="sql">SQL</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Target Class</label>
                                <select
                                    value={classLevel}
                                    onChange={(e) => setClassLevel(e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none bg-white"
                                >
                                    <option value="11">Class 11</option>
                                    <option value="12">Class 12</option>
                                    <option value="10">Class 10</option>
                                    <option value="9">Class 9</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Description & Pedagogy</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none resize-none"
                                placeholder="Curriculum overview and goals..."
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-2.5 py-1 rounded-md text-slate-600 hover:bg-slate-100 font-medium"
                            >
                                Done Editing
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                                    <span>{title}</span>
                                </div>
                                <div className="text-slate-500 text-xs mt-0.5">
                                    <span>{description || 'Interactive student training course with Socratic AI feedback.'}</span>
                                </div>
                            </div>
                            {!isConfirmed && (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition"
                                    title="Edit Module Details"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="bg-slate-100/70 p-2 rounded-lg">
                                <span className="text-[10px] text-slate-500 block">Programming Language</span>
                                <span className={`font-semibold capitalize px-1.5 py-0.5 rounded border inline-block text-[11px] ${languageBadges[language] || ''}`}>
                                    {language}
                                </span>
                            </div>
                            <div className="bg-slate-100/70 p-2 rounded-lg">
                                <span className="text-[10px] text-slate-500 block">Target Class & Alignment</span>
                                <span className="font-semibold text-slate-700">Class {classLevel} ({boardAligned || 'CBSE'})</span>
                            </div>
                        </div>

                        {units.length > 0 && (
                            <div className="bg-slate-100/70 p-2.5 rounded-lg space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                    Structured Units ({units.length})
                                </span>
                                <div className="space-y-1">
                                    {units.map((u, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-[11px] text-slate-700 font-medium">
                                            <span>• {u.title}</span>
                                            <span className="text-slate-500 text-[10px]">{u.expectedHours} hrs</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Confirmed State */}
                {isConfirmed && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 animate-in fade-in">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Training Module Created!</span>
                        </div>
                        <p className="text-[11px] text-emerald-700">
                            The training curriculum has been registered. You can now build coding exercises and automated test cases.
                        </p>
                        <div className="pt-1 flex items-center gap-2">
                            <a
                                href={createdModule?.id ? `/admin/training/${createdModule.id}/builder` : '/admin/training'}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-800 hover:text-cyan-900 bg-cyan-100/80 hover:bg-cyan-200 px-2.5 py-1 rounded-lg transition"
                            >
                                <Code className="w-3 h-3" /> Open Exercise Builder
                            </a>
                        </div>
                    </div>
                )}

                {/* Footer Action Buttons */}
                {!isConfirmed && !isEditing && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <button
                            type="button"
                            onClick={() => setIsCancelled(true)}
                            title="Cancel / Discard Draft"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={loading}
                            title="Confirm & Create Training Module"
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition disabled:opacity-50 text-xs"
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>Confirm</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Class Creation Action Card ─── */
function ClassActionCard({ action }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(action?.isConfirmed || false);
    const [isCancelled, setIsCancelled] = useState(action?.isCancelled || false);
    const [createdClass, setCreatedClass] = useState(null);

    // Form state
    const [name, setName] = useState(action?.name || 'Class 11 Non-Medical A');
    const [nameHindi, setNameHindi] = useState(action?.nameHindi || '');
    const [gradeLevel, setGradeLevel] = useState(action?.gradeLevel || 11);
    const [section, setSection] = useState(action?.section || 'A');
    const [stream, setStream] = useState(action?.stream || 'Non-Medical');
    const [maxStudents, setMaxStudents] = useState(action?.maxStudents || 60);
    const [academicYearId, setAcademicYearId] = useState(action?.academicYearId || '');

    useEffect(() => {
        if (action) {
            setName(action.name || '');
            setNameHindi(action.nameHindi || '');
            setGradeLevel(action.gradeLevel || 11);
            setSection(action.section || 'A');
            setStream(action.stream || 'Non-Medical');
            setMaxStudents(action.maxStudents || 60);
            setAcademicYearId(action.academicYearId || '');
            setIsConfirmed(action.isConfirmed || false);
            setIsCancelled(action.isCancelled || false);
        }
    }, [action]);

    const handleConfirm = async () => {
        if (!name.trim()) {
            toast.error('Class name is required');
            return;
        }

        setIsSaving(true);
        try {
            const res = await classesAPI.create({
                name: name.trim(),
                nameHindi: nameHindi.trim() || undefined,
                gradeLevel: parseInt(gradeLevel, 10),
                section: section.trim() || undefined,
                stream: stream || 'General',
                maxStudents: parseInt(maxStudents, 10) || 60,
                academicYearId: academicYearId || undefined
            });

            const newClass = res.data?.data?.class;
            setCreatedClass(newClass);
            setIsConfirmed(true);
            setIsEditing(false);
            toast.success(res.data?.message || `Class "${name}" created successfully!`, { icon: '🎓' });
        } catch (err) {
            console.error('Failed to create class:', err);
            toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to create class');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsCancelled(true);
        setIsEditing(false);
        toast('Class creation cancelled', { icon: '🚫' });
    };

    if (isCancelled) {
        return (
            <div className="mt-2.5 rounded-2xl border border-slate-200 bg-slate-50/90 p-3.5 shadow-xs space-y-2 text-[12px] animate-in fade-in">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-slate-700">
                        <XCircle className="w-4 h-4 text-slate-400" />
                        <span>Class Draft Cancelled</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsCancelled(false)}
                        className="text-[11px] text-primary-600 hover:text-primary-700 font-semibold hover:underline flex items-center gap-1 transition"
                    >
                        <Undo2 className="w-3 h-3" /> Restore Draft
                    </button>
                </div>
                <p className="text-[11px] text-slate-500">
                    The draft for class "{name}" was cancelled and not created.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-2.5 rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/90 via-white to-violet-50/50 shadow-sm overflow-hidden text-[12px] animate-in fade-in">
            {/* Header */}
            <div className="px-3 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-xs tracking-tight">
                    <GraduationCap className="w-4 h-4 text-indigo-100" />
                    <span>{isConfirmed ? 'Class Created' : 'Class Draft (Pending Confirmation)'}</span>
                </div>
                {isConfirmed ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-300 text-emerald-950 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Created & Active
                    </span>
                ) : (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-300 text-amber-950 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> Ready to Confirm
                    </span>
                )}
            </div>

            {/* Content Body */}
            <div className="p-3.5 space-y-3">
                {isConfirmed ? (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                                    {gradeLevel}{section ? section : ''}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-[13px]">{name}</h4>
                                    <p className="text-[11px] text-slate-500">{stream} Stream • Capacity: {maxStudents} Students</p>
                                </div>
                            </div>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200">
                                Active
                            </span>
                        </div>
                        {createdClass?.id && (
                            <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-end">
                                <a
                                    href={`/classes/${createdClass.id}`}
                                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                                >
                                    <ExternalLink className="w-3 h-3" /> View Class Details
                                </a>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {isEditing ? (
                            <div className="space-y-2.5">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Class Name *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-[12px] font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        placeholder="e.g. 11 Non-Medical A"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Grade (1-12)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="12"
                                            value={gradeLevel}
                                            onChange={(e) => setGradeLevel(e.target.value)}
                                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-[12px] font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Section</label>
                                        <input
                                            type="text"
                                            maxLength="10"
                                            value={section}
                                            onChange={(e) => setSection(e.target.value)}
                                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-[12px] font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            placeholder="A"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Stream</label>
                                        <select
                                            value={stream}
                                            onChange={(e) => setStream(e.target.value)}
                                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-[12px] font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        >
                                            <option value="General">General</option>
                                            <option value="Non-Medical">Non-Medical</option>
                                            <option value="Medical">Medical</option>
                                            <option value="Science">Science</option>
                                            <option value="Commerce">Commerce</option>
                                            <option value="Arts">Arts</option>
                                            <option value="Vocational">Vocational</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Max Students</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="200"
                                            value={maxStudents}
                                            onChange={(e) => setMaxStudents(e.target.value)}
                                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-[12px] font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Name (Hindi)</label>
                                        <input
                                            type="text"
                                            value={nameHindi}
                                            onChange={(e) => setNameHindi(e.target.value)}
                                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-[12px] font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            placeholder="कक्षा 11"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white/80 rounded-xl p-3 border border-indigo-100/80 space-y-2.5 shadow-2xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-base flex items-center justify-center shadow-xs">
                                            {gradeLevel}{section || ''}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-[14px] leading-tight">{name}</h4>
                                            {nameHindi && <p className="text-[11px] text-slate-500 font-medium">{nameHindi}</p>}
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold rounded-full border border-indigo-200">
                                        {stream}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Grade</span>
                                        <span className="font-bold text-slate-700">Class {gradeLevel}</span>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Section</span>
                                        <span className="font-bold text-slate-700">Section {section || 'A'}</span>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Capacity</span>
                                        <span className="font-bold text-slate-700">{maxStudents} Students</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    title="Cancel / Discard Draft"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(!isEditing)}
                                    title={isEditing ? 'Done Editing' : 'Edit Class Details'}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={isSaving}
                                title="Confirm & Create Class"
                                className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-indigo-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                <span>Confirm</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/* ─── Timetable Slot Creation Action Card ─── */
function TimetableActionCard({ action }) {
    const [slots, setSlots] = useState(Array.isArray(action?.slots) ? action.slots : []);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(action?.isConfirmed || false);
    const [isCancelled, setIsCancelled] = useState(action?.isCancelled || false);
    const classId = action?.classId || '';
    const className = action?.className || 'Class Timetable';

    // Lists for dropdowns
    const [subjectsList, setSubjectsList] = useState([]);
    const [instructorsList, setInstructorsList] = useState([]);

    useEffect(() => {
        if (action?.slots) {
            setSlots(action.slots);
            setIsConfirmed(action.isConfirmed || false);
            setIsCancelled(action.isCancelled || false);
        }
    }, [action]);

    useEffect(() => {
        let isMounted = true;
        const loadContext = async () => {
            try {
                const [subRes, instRes] = await Promise.all([
                    api.get('/subjects').catch(() => ({ data: { data: { subjects: [] } } })),
                    api.get('/users', { params: { role: 'instructor', limit: 100 } }).catch(() => ({ data: { data: { users: [] } } }))
                ]);
                if (isMounted) {
                    setSubjectsList(subRes.data?.data?.subjects || []);
                    setInstructorsList(instRes.data?.data?.users || []);
                }
            } catch {
                // quiet
            }
        };
        loadContext();
        return () => { isMounted = false; };
    }, []);

    const handleSlotChange = (index, field, value) => {
        setSlots(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };

    const handleRemoveSlot = (index) => {
        setSlots(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddSlot = () => {
        const last = slots[slots.length - 1];
        setSlots(prev => [
            ...prev,
            {
                dayOfWeek: last?.dayOfWeek || 'friday',
                periodNumber: parseInt(last?.periodNumber || 1, 10),
                startTime: last?.startTime || '08:00',
                endTime: last?.endTime || '08:40',
                subjectId: last?.subjectId || null,
                subjectName: last?.subjectName || 'Computer Science',
                instructorId: last?.instructorId || null,
                instructorName: last?.instructorName || '',
                roomNumber: last?.roomNumber || 'Room 101',
                slotType: last?.slotType || 'lecture',
                isNew: true
            }
        ]);
        setIsEditing(true);
    };

    const handleConfirm = async () => {
        if (slots.length === 0) {
            toast.error('No timetable slots to apply');
            return;
        }

        setIsSaving(true);
        try {
            // Find or create timetable for target class
            let targetTimetableId = null;
            if (classId) {
                const ttRes = await timetableAPI.getByClass(classId).catch(() => null);
                targetTimetableId = ttRes?.data?.data?.timetable?.id;
                if (!targetTimetableId) {
                    const newTt = await timetableAPI.create({
                        classId,
                        name: `${className} Timetable`,
                        effectiveFrom: new Date().toISOString().split('T')[0]
                    });
                    targetTimetableId = newTt.data?.data?.timetable?.id;
                }
            } else {
                const allTt = await timetableAPI.getAll().catch(() => null);
                targetTimetableId = allTt?.data?.data?.timetables?.[0]?.id;
            }

            if (!targetTimetableId) {
                toast.error('Could not find active timetable. Please create a timetable first.');
                return;
            }

            const formattedSlots = slots.map(s => {
                let resolvedSubjectId = s.subjectId;
                if (!resolvedSubjectId && s.subjectName) {
                    const matchedSub = subjectsList.find(sub =>
                        sub.name.toLowerCase() === s.subjectName.toLowerCase() ||
                        sub.name.toLowerCase().includes(s.subjectName.toLowerCase())
                    );
                    if (matchedSub) resolvedSubjectId = matchedSub.id;
                }

                let resolvedInstructorId = s.instructorId;
                if (!resolvedInstructorId && s.instructorName) {
                    const matchedInst = instructorsList.find(ins => {
                        const full = `${ins.firstName} ${ins.lastName || ''}`.trim().toLowerCase();
                        return full.includes(s.instructorName.toLowerCase()) || s.instructorName.toLowerCase().includes(ins.firstName.toLowerCase());
                    });
                    if (matchedInst) resolvedInstructorId = matchedInst.id;
                }

                return {
                    dayOfWeek: (s.dayOfWeek || 'monday').toLowerCase(),
                    periodNumber: parseInt(s.periodNumber, 10),
                    startTime: s.startTime || '08:00',
                    endTime: s.endTime || '08:40',
                    subjectId: resolvedSubjectId || null,
                    instructorId: resolvedInstructorId || null,
                    roomNumber: s.roomNumber || null,
                    slotType: s.slotType || 'lecture'
                };
            });

            await timetableAPI.addBulkSlots(targetTimetableId, { slots: formattedSlots });
            toast.success(`Successfully applied ${formattedSlots.length} slot(s) to timetable!`, { icon: '🎉' });
            setIsConfirmed(true);
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to apply timetable slots:', err);
            toast.error(err.response?.data?.message || 'Failed to apply timetable slots');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsCancelled(true);
        setIsEditing(false);
        toast('Timetable draft cancelled', { icon: '🚫' });
    };

    if (isCancelled) {
        return (
            <div className="mt-2.5 rounded-2xl border border-slate-200 bg-slate-50/90 p-3.5 shadow-xs space-y-2 text-[12px] animate-in fade-in">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-slate-700">
                        <XCircle className="w-4 h-4 text-slate-400" />
                        <span>Timetable Draft Cancelled</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsCancelled(false)}
                        className="text-[11px] text-primary-600 hover:text-primary-700 font-semibold hover:underline flex items-center gap-1 transition"
                    >
                        <Undo2 className="w-3 h-3" /> Restore Draft
                    </button>
                </div>
                <p className="text-[11px] text-slate-500">
                    The {slots.length} draft slot(s) were cancelled and not added to the timetable.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-2.5 rounded-2xl border border-purple-200 bg-gradient-to-b from-purple-50/90 via-white to-indigo-50/50 shadow-sm overflow-hidden text-[12px] animate-in fade-in">
            {/* Header */}
            <div className="px-3.5 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-xs tracking-tight">
                    <Calendar className="w-4 h-4 text-purple-100" />
                    <span>{isConfirmed ? 'Timetable Slots Applied' : 'Timetable Draft Slots'}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                        {className}
                    </span>
                </div>
                {isConfirmed ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-300 text-emerald-950 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Applied ({slots.length})
                    </span>
                ) : (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-300 text-amber-950 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {slots.length} Slot(s) Pending
                    </span>
                )}
            </div>

            {/* Slots List */}
            <div className="p-3 space-y-2.5">
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {slots.map((slot, idx) => (
                        <div key={idx} className="p-2.5 bg-white rounded-xl border border-purple-100/90 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-extrabold text-[10px] uppercase">
                                        {slot.dayOfWeek}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                                        Period {slot.periodNumber} ({slot.startTime} - {slot.endTime})
                                    </span>
                                </div>
                                {!isConfirmed && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSlot(idx)}
                                        className="text-slate-300 hover:text-red-500 transition p-1"
                                        title="Remove Slot"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {isEditing && !isConfirmed ? (
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div>
                                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Subject</label>
                                        <input
                                            type="text"
                                            value={slot.subjectName || ''}
                                            onChange={(e) => handleSlotChange(idx, 'subjectName', e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-medium"
                                            placeholder="Subject"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Instructor</label>
                                        <input
                                            type="text"
                                            value={slot.instructorName || ''}
                                            onChange={(e) => handleSlotChange(idx, 'instructorName', e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-medium"
                                            placeholder="Instructor"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Period Number</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="12"
                                            value={slot.periodNumber}
                                            onChange={(e) => handleSlotChange(idx, 'periodNumber', parseInt(e.target.value, 10))}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Room</label>
                                        <input
                                            type="text"
                                            value={slot.roomNumber || ''}
                                            onChange={(e) => handleSlotChange(idx, 'roomNumber', e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-medium"
                                            placeholder="Room 101"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between text-[11px]">
                                    <div>
                                        <span className="font-bold text-slate-900 text-[12px] block">{slot.subjectName || 'Regular Session'}</span>
                                        <span className="text-slate-500">
                                            {slot.instructorName ? `Instructor: ${slot.instructorName}` : 'No instructor assigned'} • {slot.roomNumber || 'Room 101'}
                                        </span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700 capitalize">
                                        {slot.slotType || 'lecture'}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer Actions */}
                {isConfirmed ? (
                    <div className="pt-2 border-t border-purple-100 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Successfully added to timetable
                        </span>
                        <a
                            href="/admin/timetable"
                            className="text-[11px] font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1 hover:underline"
                        >
                            <ExternalLink className="w-3 h-3" /> View Timetable
                        </a>
                    </div>
                ) : (
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={handleCancel}
                                title="Cancel / Discard Draft"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(!isEditing)}
                                title={isEditing ? 'Done Editing' : 'Edit Slots'}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={handleAddSlot}
                                title="Add Time Slot"
                                className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={isSaving || slots.length === 0}
                            title="Confirm & Apply Timetable"
                            className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-purple-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>Confirm</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Period Timing Action Card ─── */
function PeriodTimingActionCard({ action }) {
    const [periods, setPeriods] = useState(Array.isArray(action?.periods) ? action.periods : []);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(action?.isConfirmed || false);
    const [isCancelled, setIsCancelled] = useState(action?.isCancelled || false);
    const dayOfWeek = action?.dayOfWeek || 'all';
    const dateStr = action?.dateStr || '';

    useEffect(() => {
        if (action?.periods) {
            setPeriods(action.periods);
            setIsConfirmed(action.isConfirmed || false);
            setIsCancelled(action.isCancelled || false);
        }
    }, [action]);

    const handlePeriodChange = (idx, field, value) => {
        setPeriods(prev => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], [field]: value };
            return copy;
        });
    };

    const handleAddPeriod = () => {
        const last = periods[periods.length - 1];
        const nextNum = (last?.periodNumber || 0) + 1;
        setPeriods(prev => [
            ...prev,
            {
                periodNumber: nextNum,
                startTime: '13:00',
                endTime: '13:40',
                slotType: 'lecture'
            }
        ]);
        setIsEditing(true);
    };

    const handleRemovePeriod = (idx) => {
        setPeriods(prev => prev.filter((_, i) => i !== idx));
    };

    const handleConfirm = async () => {
        if (periods.length === 0) {
            toast.error('No period timings to apply');
            return;
        }

        setIsSaving(true);
        try {
            // Find active timetable(s)
            const allTt = await timetableAPI.getAll().catch(() => null);
            const timetables = allTt?.data?.data?.timetables || [];
            if (timetables.length === 0) {
                toast.error('No active timetables found to apply timings.');
                return;
            }

            for (const tt of timetables) {
                await timetableAPI.updatePeriodTimings(tt.id, {
                    periodTimings: periods,
                    dayOfWeek: dayOfWeek === 'all' ? undefined : dayOfWeek
                });
            }

            toast.success(`Period timings applied to ${timetables.length} timetable(s)!`, { icon: '⏰' });
            setIsConfirmed(true);
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to update period timings:', err);
            toast.error(err.response?.data?.message || 'Failed to update period timings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsCancelled(true);
        setIsEditing(false);
        toast('Period timings draft cancelled', { icon: '🚫' });
    };

    if (isCancelled) {
        return (
            <div className="mt-2.5 rounded-2xl border border-slate-200 bg-slate-50/90 p-3.5 shadow-xs space-y-2 text-[12px] animate-in fade-in">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-slate-700">
                        <XCircle className="w-4 h-4 text-slate-400" />
                        <span>Period Timings Draft Cancelled</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsCancelled(false)}
                        className="text-[11px] text-primary-600 hover:text-primary-700 font-semibold hover:underline flex items-center gap-1 transition"
                    >
                        <Undo2 className="w-3 h-3" /> Restore Draft
                    </button>
                </div>
                <p className="text-[11px] text-slate-500">
                    The {periods.length} extracted period timing(s) were cancelled.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-2.5 rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50/90 via-white to-orange-50/50 shadow-sm overflow-hidden text-[12px] animate-in fade-in">
            {/* Header */}
            <div className="px-3.5 py-2 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-xs tracking-tight">
                    <Clock className="w-4 h-4 text-amber-100" />
                    <span>{isConfirmed ? 'Period Timings Applied' : 'Extracted Period Timings'}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                        {dateStr || (dayOfWeek !== 'all' ? dayOfWeek.toUpperCase() : 'All Week')}
                    </span>
                </div>
                {isConfirmed ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-300 text-emerald-950 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Applied ({periods.length} Periods)
                    </span>
                ) : (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-300 text-amber-950 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {periods.length} Periods Extracted
                    </span>
                )}
            </div>

            {/* Timings List */}
            <div className="p-3 space-y-2.5">
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {periods.map((p, idx) => (
                        <div key={idx} className="p-2.5 bg-white rounded-xl border border-amber-100 shadow-2xs flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 font-extrabold flex items-center justify-center text-xs">
                                    P{p.periodNumber}
                                </span>
                                {isEditing && !isConfirmed ? (
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="time"
                                            value={p.startTime}
                                            onChange={(e) => handlePeriodChange(idx, 'startTime', e.target.value)}
                                            className="px-1.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono"
                                        />
                                        <span className="text-slate-400 font-bold">–</span>
                                        <input
                                            type="time"
                                            value={p.endTime}
                                            onChange={(e) => handlePeriodChange(idx, 'endTime', e.target.value)}
                                            className="px-1.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <div className="font-mono font-bold text-slate-800 text-[13px]">
                                            {p.startTime} – {p.endTime}
                                        </div>
                                        <span className="text-[10px] text-slate-500 capitalize">
                                            {p.slotType === 'break_period' ? '☕ Break' : p.slotType || 'Lecture'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${p.slotType === 'break_period' ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'}`}>
                                    {p.slotType === 'break_period' ? 'Break' : 'Lecture'}
                                </span>
                                {isEditing && !isConfirmed && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemovePeriod(idx)}
                                        className="text-slate-300 hover:text-red-500 p-1 transition"
                                        title="Remove Period"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Actions */}
                {isConfirmed ? (
                    <div className="pt-2 border-t border-amber-100 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Timetable period timings updated
                        </span>
                        <a
                            href="/admin/timetable"
                            className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 hover:underline"
                        >
                            <ExternalLink className="w-3 h-3" /> View Timetable Grid
                        </a>
                    </div>
                ) : (
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={handleCancel}
                                title="Cancel / Discard Draft"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(!isEditing)}
                                title={isEditing ? 'Done Editing' : 'Edit Timings'}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={handleAddPeriod}
                                title="Add Period"
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={isSaving || periods.length === 0}
                            title="Confirm & Apply Timings"
                            className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-amber-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>Confirm</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   MAIN FLOATING CHATBOT COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function FloatingChatbot() {
    const { user, isAuthenticated } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [uploadedDocs, setUploadedDocs] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [unread, setUnread] = useState(0);
    const [preferredModel, setPreferredModel] = useState('auto');
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('ulrms_chatbot_session_id') || null;
        }
        return null;
    });
    const [showHistory, setShowHistory] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const inputRef = useRef(null);

    // Only render for admin/principal
    const isAdmin = user?.role === 'admin' || user?.role === 'principal' || user?.role === 'instructor';

    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (currentSessionId) {
                localStorage.setItem('ulrms_chatbot_session_id', currentSessionId);
            } else {
                localStorage.removeItem('ulrms_chatbot_session_id');
            }
        }
    }, [currentSessionId]);

    const loadSessions = async () => {
        try {
            const res = await api.get('/admin/chatbot/sessions');
            if (res.data.success) {
                const loadedSessions = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.sessions || []);
                setSessions(loadedSessions);
                
                // If we have a saved session ID, restore its messages
                if (currentSessionId && messages.length === 1) {
                    const activeSession = (Array.isArray(loadedSessions) ? loadedSessions : []).find(s => s.id === currentSessionId);
                    if (activeSession && activeSession.metadata?.messages) {
                        setMessages(activeSession.metadata.messages);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load sessions', err);
        }
    };

    useEffect(() => {
        if (isOpen && isAdmin) {
            loadSessions();
        }
    }, [isOpen, isAdmin]);

    const saveSession = async (msgs, title = null) => {
        if (!isAdmin) return null;
        try {
            const res = await api.post('/admin/chatbot/sessions', {
                sessionId: currentSessionId,
                title,
                messages: msgs
            });
            if (res.data.success) {
                setCurrentSessionId(res.data.data.id);
                loadSessions();
                return res.data.data.id;
            }
        } catch (err) {
            console.error('Failed to save session', err);
        }
        return currentSessionId;
    };

    useEffect(() => {
        if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    useEffect(() => {
        if (isOpen) { setUnread(0); inputRef.current?.focus(); }
    }, [isOpen]);

    const handleSend = async () => {
        const msg = input.trim();
        if (!msg || isLoading) return;
        setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: new Date().toISOString() }]);
        setInput('');
        setIsLoading(true);

        try {
            const history = messages.slice(-10).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', content: m.content }));
            const docCtx = uploadedDocs.map(d => `--- ${d.fileName} ---\n${d.extractedText}`).join('\n\n');

            const res = await api.post('/admin/chatbot/chat', { 
                message: msg, 
                conversationHistory: history, 
                documentContext: docCtx,
                provider: preferredModel
            });
            if (res.data.success) {
                const d = res.data.data;
                let title = null;
                if (messages.length === 0) {
                    title = msg.length > 30 ? msg.substring(0, 30) + '...' : msg;
                }
                
                setMessages(prev => {
                    const newMsgs = [...prev, { 
                        role: 'assistant', 
                        content: d.message || d.text || '', 
                        sql: d.sql, 
                        queryResult: d.queryResult, 
                        chartData: d.chartData, 
                        reportAction: d.reportAction, 
                        meetingAction: d.meetingAction,
                        calendarAction: d.calendarAction,
                        assignmentAction: d.assignmentAction,
                        noteAction: d.noteAction,
                        classAction: d.classAction,
                        userAction: d.userAction,
                        ticketAction: d.ticketAction,
                        procurementAction: d.procurementAction,
                        trainingAction: d.trainingAction,
                        timetableAction: d.timetableAction,
                        periodTimingAction: d.periodTimingAction,
                        shiftAction: d.shiftAction,
                        documentShareAction: d.documentShareAction,
                        model: d.model, 
                        provider: d.provider, 
                        timestamp: d.timestamp 
                    }];
                    saveSession(newMsgs, title);
                    return newMsgs;
                });
                if (!isOpen) setUnread(u => u + 1);
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
            setMessages(prev => [...prev, {
                role: 'assistant', content: `❌ **Error:** ${errorMsg}`, timestamp: new Date().toISOString(), isError: true
            }]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleRerunSQL = async (sql) => {
        setIsLoading(true);
        try {
            const res = await api.post('/admin/chatbot/execute', { sql });
            if (res.data.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: '🔄 **Re-executed:**', sql, queryResult: res.data.data, timestamp: new Date().toISOString() }]);
            }
        } catch (err) { toast.error(err.response?.data?.message || err.message); }
        finally { setIsLoading(false); }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const fd = new FormData();
            fd.append('document', file);
            const res = await api.post('/admin/chatbot/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (res.data.success) {
                const docData = res.data.data;
                setUploadedDocs(prev => [...prev, docData]);
                const isImg = docData.mimeType?.startsWith('image/') || Boolean(docData.imageUrl);
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: isImg
                        ? `🖼️ **Image Loaded & Analyzed:** ${docData.fileName}\n\n*OCR Text / Visual Analysis Preview:*\n> ${docData.preview || 'Ready for queries.'}\n\nYou can now ask me questions or instruct me to create records based on this image.`
                        : `📄 **Loaded:** ${docData.fileName} (${docData.charCount.toLocaleString()} chars).\nAsk me anything about it.`,
                    imageUrl: docData.imageUrl || null,
                    timestamp: new Date().toISOString()
                }]);
                toast.success(isImg ? 'Image analyzed successfully!' : 'Document loaded');
            }
        } catch (err) { toast.error(err.response?.data?.message || err.message); }
        finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    const clearChat = () => {
        setCurrentSessionId(null);
        setMessages([{ role: 'assistant', content: '🗑️ Chat cleared. How can I help?', timestamp: new Date().toISOString() }]);
        setUploadedDocs([]);
        setShowHistory(false);
    };

    const [activePromptCategory, setActivePromptCategory] = useState(0);

    const instructorPromptCategories = [
        {
            title: "🏢 Lab & Hardware",
            icon: Monitor,
            prompts: [
                "List all computers in Computer Lab 1 with RAM and processor",
                "Which lab computers have open tickets or faults?",
                "Show lab inventory with total cost and purchase dates",
                "List equipment shift requests pending approval"
            ]
        },
        {
            title: "📦 Procurement Cases",
            icon: ShoppingBag,
            prompts: [
                "Prepare procurement case for 30 CAT-6 LAN cables and 5 Gigabit switches for Lab 2 with estimated budget 35,000",
                "Prepare procurement request for 15 Core i7 PCs and 2 Laser Printers",
                "Show status of active procurement requests and vendor quotes"
            ]
        },
        {
            title: "🎓 Student Training & Modules",
            icon: GraduationCap,
            prompts: [
                "Create training module 'Python Data Structures & Algorithms' for class 12 with exercises on Stacks and Queues",
                "Create training module 'Web Development with JavaScript' for class 11",
                "Show student training progress and mastery analytics for Class 11 Non-Medical A"
            ]
        },
        {
            title: "🎫 Maintenance & Tickets",
            icon: Ticket,
            prompts: [
                "Create ticket 'Power Rail Failure' for Computer Lab 2",
                "Log maintenance ticket for broken monitor on PC-05 in Lab 1"
            ]
        },
        {
            title: "📊 Reports & Audits",
            icon: FileText,
            prompts: [
                "Generate PDF report of lab attendance and coding submissions for Class 11",
                "Export Excel report of faulty lab equipment across all labs"
            ]
        }
    ];

    const suggestions = instructorPromptCategories[activePromptCategory]?.prompts || [];

    // ── Sizing ──
    const panelClass = isExpanded
        ? 'fixed inset-4 z-[9999] rounded-2xl'
        : 'fixed bottom-20 right-4 z-[9999] w-[420px] h-[600px] max-h-[80vh] rounded-2xl';

    // Early return if not authorized (must be AFTER all hooks)
    if (!isAuthenticated || !isAdmin) return null;

    return (
        <>
            {/* ── FAB Button ── */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 text-white shadow-2xl shadow-violet-500/40 flex items-center justify-center hover:scale-110 hover:shadow-violet-500/60 transition-all duration-300 group"
                    title="LIA"
                >
                    <Bot className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    {/* Pulse ring */}
                    <span className="absolute inset-0 rounded-full bg-violet-400 animate-ping opacity-20" />
                    {/* Unread badge */}
                    {unread > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {unread}
                        </span>
                    )}
                </button>
            )}

            {/* ── Chat Panel ── */}
            {isOpen && (
                <div className={`${panelClass} flex flex-col bg-white border border-slate-200 shadow-2xl shadow-slate-900/20 overflow-hidden`}
                    style={{ backdropFilter: 'blur(20px)' }}>

                    {/* Header */}
                    <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white flex-shrink-0 gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex items-center gap-1.5">
                                <h3 className="font-bold text-xs sm:text-sm leading-none truncate">
                                    LIA
                                </h3>
                                <select 
                                    value={preferredModel}
                                    onChange={(e) => setPreferredModel(e.target.value)}
                                    className="bg-white/15 border border-white/25 text-white text-[10px] rounded px-1.5 py-0.5 outline-none focus:bg-white/25 max-w-[100px] truncate"
                                >
                                    <option value="auto" className="text-black">Auto</option>
                                    <option value="groq" className="text-black">Groq (Llama)</option>
                                    <option value="gemini" className="text-black">Gemini</option>
                                    <option value="sambanova" className="text-black">SambaNova</option>
                                    <option value="github" className="text-black">GPT-4o</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => setShowHelp(true)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition text-white/90" title="Prompt Guide">
                                <HelpCircle className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setShowHistory(!showHistory)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition text-white/90" title="Chat History">
                                <History className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={clearChat} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition text-white/90" title="New Chat">
                                <FilePlus className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setIsExpanded(!isExpanded)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition text-white/90" title={isExpanded ? "Restore Size" : "Maximize"}>
                                {isExpanded ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => setIsOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-rose-500/80 hover:text-white transition text-white flex-shrink-0 ml-0.5" title="Close Chat">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Help Modal */}
                    {showHelp && (
                        <div className="absolute inset-0 top-[52px] bg-white z-50 flex flex-col">
                            <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><HelpCircle className="w-4 h-4 text-indigo-600"/> Prompt Guide</h3>
                                <button onClick={() => setShowHelp(false)} className="p-1 hover:bg-slate-200 rounded"><X className="w-4 h-4"/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                <div>
                                    <h4 className="font-medium text-slate-900 mb-1">Create Assignments</h4>
                                    <p className="text-xs text-slate-600 mb-2">Generate and assign tasks automatically.</p>
                                    <div className="bg-indigo-50 p-2 rounded text-xs text-indigo-800 font-mono">"Create assignment to write a Python program for factorial and assign it to 10th A"</div>
                                    <div className="bg-indigo-50 p-2 rounded text-xs text-indigo-800 font-mono mt-1">"Create a lab task for Java Inheritance and set due date to 5th Oct"</div>
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-900 mb-1">Schedule Meetings</h4>
                                    <p className="text-xs text-slate-600 mb-2">Quickly create instant or scheduled meetings.</p>
                                    <div className="bg-emerald-50 p-2 rounded text-xs text-emerald-800 font-mono">"Create an instant meeting for Lab 1"</div>
                                    <div className="bg-emerald-50 p-2 rounded text-xs text-emerald-800 font-mono mt-1">"Schedule a meeting for tomorrow at 10 AM"</div>
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-900 mb-1">Search Documents</h4>
                                    <p className="text-xs text-slate-600 mb-2">Find your uploaded documents.</p>
                                    <div className="bg-amber-50 p-2 rounded text-xs text-amber-800 font-mono">"Find documents related to Physics syllabus"</div>
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-900 mb-1">Database Queries (SQL)</h4>
                                    <p className="text-xs text-slate-600 mb-2">Ask questions about your data.</p>
                                    <div className="bg-slate-100 p-2 rounded text-xs text-slate-700 font-mono">"Show me the top 5 students by submissions"</div>
                                    <div className="bg-slate-100 p-2 rounded text-xs text-slate-700 font-mono mt-1">"How many active instructors are there?"</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* History View */}
                    {showHistory ? (
                        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 relative z-40">
                            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><History className="w-4 h-4"/> Chat History</h3>
                            {sessions.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center mt-10">No chat history found.</p>
                            ) : (
                                <div className="space-y-2">
                                    {sessions.map(s => (
                                        <button 
                                            key={s.id}
                                            onClick={() => {
                                                setCurrentSessionId(s.id);
                                                setMessages(s.metadata?.messages || []);
                                                setShowHistory(false);
                                            }}
                                            className="w-full text-left p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition group"
                                        >
                                            <div className="font-medium text-slate-800 text-sm truncate">{s.description || 'Chat Session'}</div>
                                            <div className="text-[10px] text-slate-400 mt-1">{new Date(s.createdAt).toLocaleString()}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Document badges */}
                            {uploadedDocs.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 px-3 py-2 bg-slate-50 border-b border-slate-200 relative z-30">
                                    {uploadedDocs.map((doc, i) => (
                                        <DocBadge key={i} doc={doc} onRemove={() => setUploadedDocs(p => p.filter((_, j) => j !== i))} />
                                    ))}
                                </div>
                            )}

                            {/* Messages area */}
                            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50/50">
                        {messages.length === 0 && (
                            <div className="py-2 px-1">
                                <div className="text-center mb-3">
                                    <div className="w-10 h-10 mx-auto bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 rounded-full flex items-center justify-center mb-2 shadow-inner">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-semibold text-slate-700 text-sm">Welcome to AI Analytics</h4>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Ask questions about your school's data.</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                    <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200">
                                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Predefined Insights</span>
                                    </div>
                                    <table className="w-full text-[11px]">
                                        <tbody>
                                            {[
                                                { label: "Student Demographics", prompt: "Show me the total number of enrolled students by class in a pie chart" },
                                                { label: "Lab Inventory", prompt: "Show me a grouped bar chart of count of each item type for each lab" },
                                                { label: "Active Support Tickets", prompt: "Show me all pending and open IT support tickets" },
                                                { label: "Recent Submissions", prompt: "Show me the top 5 most recent assignment submissions" }
                                            ].map((q, i) => (
                                                <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-indigo-50 transition cursor-pointer group" onClick={() => { setInput(q.prompt); inputRef.current?.focus(); }}>
                                                    <td className="px-2.5 py-2 font-medium text-slate-700 w-2/5 border-r border-slate-50">{q.label}</td>
                                                    <td className="px-2.5 py-2 text-slate-500 group-hover:text-indigo-600 transition truncate max-w-[120px]">{q.prompt}</td>
                                                    <td className="px-2 py-2 text-right w-6">
                                                        <Send className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 inline" />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs ${
                                        msg.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-br-xs'
                                            : msg.isError
                                            ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-xs'
                                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                                    }`}
                                >
                                    {msg.role === 'user' ? (
                                        <p className="text-[13px] whitespace-pre-wrap">{msg.content}</p>
                                    ) : (
                                        <RenderMessage content={msg.content} hasQueryResult={Boolean(msg.queryResult || msg.sql)} />
                                    )}
                                    {msg.imageUrl && (
                                        <div className="mt-2 mb-1.5 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 max-w-xs shadow-2xs">
                                            <img src={msg.imageUrl} alt="Uploaded Image" className="max-h-44 w-full object-contain" />
                                        </div>
                                    )}
                                    {msg.queryResult && <SQLResult sql={msg.sql} result={msg.queryResult} onRerun={() => handleRerunSQL(msg.sql)} />}
                                    {msg.chartData && <ChatChart chartData={msg.chartData} />}
                                    {msg.reportAction && <ReportActionCard action={msg.reportAction} />}
                                    {msg.meetingAction && <MeetingActionCard action={msg.meetingAction} />}
                                    {msg.calendarAction && <CalendarActionCard action={msg.calendarAction} />}
                                    {msg.assignmentAction && <AssignmentActionCard action={msg.assignmentAction} />}
                                    {msg.noteAction && <NoteActionCard action={msg.noteAction} />}
                                    {msg.classAction && <ClassActionCard action={msg.classAction} />}
                                    {msg.userAction && <UserActionCard action={msg.userAction} />}
                                    {msg.ticketAction && <TicketActionCard action={msg.ticketAction} />}
                                    {msg.procurementAction && <ProcurementActionCard action={msg.procurementAction} />}
                                    {msg.trainingAction && <TrainingActionCard action={msg.trainingAction} />}
                                    {msg.timetableAction && <TimetableActionCard action={msg.timetableAction} />}
                                    {msg.periodTimingAction && <PeriodTimingActionCard action={msg.periodTimingAction} />}
                                    {msg.shiftAction && <ShiftActionCard action={msg.shiftAction} />}
                                    {msg.documentShareAction && <DocumentShareActionCard action={msg.documentShareAction} />}
                                    {msg.provider && <div className="mt-1 text-[9px] text-slate-400 text-right">{msg.provider}/{msg.model}</div>}
                                </div>
                            </div>
                        ))}

                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3.5 py-3 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                                                <div className="flex gap-1">
                                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                                <span className="text-[11px] text-slate-400">Thinking...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />

                                {/* Senior Lab Instructor Prompts & Action Hub */}
                                {messages.length <= 1 && !isLoading && (
                                    <div className="mt-2 space-y-2">
                                        {/* Category Tabs */}
                                        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                                            {instructorPromptCategories.map((cat, idx) => {
                                                const Icon = cat.icon;
                                                const isActive = activePromptCategory === idx;
                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setActivePromptCategory(idx)}
                                                        className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                                                            isActive
                                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                                                : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 border-slate-200'
                                                        }`}
                                                    >
                                                        <Icon className="w-3 h-3" />
                                                        <span>{cat.title}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Prompts list for active category */}
                                        <div className="grid grid-cols-1 gap-1.5">
                                            {suggestions.map((s, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setInput(s)}
                                                    className="text-left px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-xs transition text-[12px] text-slate-700 hover:text-indigo-700 flex items-start gap-2"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-indigo-500" />
                                                    <span className="leading-snug">{s}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input bar */}
                            <div className="flex items-end gap-2 px-3 py-2.5 bg-white border-t border-slate-200 flex-shrink-0">
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.csv,.json,.pdf,.md,.sql,.log,.png,.jpg,.jpeg,.webp,.bmp" />
                                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                                    className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-500 hover:bg-violet-100 transition disabled:opacity-50" title="Upload document, holiday PDF or image">
                                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                </button>
                                
                                <VoiceInputButton
                                    onTranscript={(text) => {
                                        setInput(prev => (prev ? `${prev} ${text}` : text).trim());
                                    }}
                                    className="flex-shrink-0 w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-100 transition shadow-2xs"
                                    title="Speak voice command (e.g. 'create class 12 commerce c')"
                                />

                                <textarea ref={inputRef} value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                    placeholder="Type or speak commands (e.g. 'create class 12 commerce c')..."
                                    rows={1}
                                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                    style={{ minHeight: '36px', maxHeight: '80px' }}
                                />
                                <button onClick={handleSend} disabled={!input.trim() || isLoading}
                                    className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center hover:from-indigo-600 hover:to-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20">
                                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
}
