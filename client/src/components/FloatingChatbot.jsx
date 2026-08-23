'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Bot, Send, Upload, Database, ChevronDown, ChevronRight, Trash2,
    Sparkles, FileText, AlertTriangle, Copy, Check, RefreshCw, X,
    Loader2, Minimize2, Maximize2, Download, Image as ImageIcon, User, BarChart2, Expand, Shrink, File,
    HelpCircle, History, FilePlus, Maximize, Minimize, Plus,
    Calendar, Clock, Video, Users, CheckCircle, ExternalLink, Edit3, Save, Link2,
    XCircle, CalendarPlus, Undo2
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useAuthStore } from '@/lib/store';
import api, { reportsAPI, meetingAPI, calendarAPI } from '@/lib/api';
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

/* ─── SQL result panel: SQL hidden by default, table shown, CSV export ─── */
function SQLResult({ sql, result, onRerun }) {
    const [tableOpen, setTableOpen] = useState(true);
    const [sqlOpen, setSqlOpen] = useState(false);
    if (!result) return null;

    const cols = result.rows?.length > 0
        ? (result.fields?.map(f => f.name) || Object.keys(result.rows[0]))
        : [];

    const exportCSV = () => {
        if (!result.rows?.length) return;
        const escape = (v) => {
            if (v === null || v === undefined) return '';
            const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
            return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const header = cols.map(escape).join(',');
        const rows = result.rows.map(row => cols.map(c => escape(row[c])).join(','));
        const csv = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `query_results_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success(`Exported ${result.rows.length} rows`);
    };

    return (
        <div className="mt-2 rounded-lg border border-indigo-200 overflow-hidden bg-white text-[12px]">
            {/* SQL toggle — hidden by default */}
            {sql && (
                <button onClick={() => setSqlOpen(!sqlOpen)}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 transition text-left border-b border-indigo-100">
                    {sqlOpen ? <ChevronDown className="w-3 h-3 text-indigo-500" /> : <ChevronRight className="w-3 h-3 text-indigo-500" />}
                    <Database className="w-3 h-3 text-indigo-500" />
                    <span className="font-medium text-indigo-700 text-[11px]">SQL Query</span>
                </button>
            )}
            {sqlOpen && sql && (
                <div className="px-3 py-2 bg-slate-900 border-b border-indigo-200">
                    <pre className="text-[10px] text-indigo-200 font-mono whitespace-pre-wrap">{sql}</pre>
                    <div className="flex gap-2 mt-1.5">
                        <button onClick={() => { navigator.clipboard.writeText(sql); toast.success('Copied'); }}
                            className="text-[10px] text-indigo-400 hover:text-white flex items-center gap-1">
                            <Copy className="w-2.5 h-2.5" /> Copy
                        </button>
                        {onRerun && (
                            <button onClick={onRerun} className="text-[10px] text-emerald-400 hover:text-white flex items-center gap-1">
                                <RefreshCw className="w-2.5 h-2.5" /> Re-run
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Result */}
            {result.requiresConfirmation ? (
                <div className="px-3 py-3 bg-amber-50 border-b border-amber-100 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-amber-800 text-[11px] font-medium mb-1">Execution requires confirmation</p>
                        <p className="text-amber-700 text-[10px] mb-2">Please review the SQL query above. This operation will modify data in your database.</p>
                        {onRerun && (
                            <button onClick={onRerun} className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-medium px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition">
                                <Check className="w-3 h-3" /> Confirm & Execute
                            </button>
                        )}
                    </div>
                </div>
            ) : !result.success ? (
                <div className="px-3 py-2 bg-red-50 text-red-700 text-[11px]">
                    <AlertTriangle className="w-3 h-3 inline mr-1" /> {result.error}
                </div>
            ) : (
                <>
                    {/* Header bar with row count, toggle, and export */}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                        <button onClick={() => setTableOpen(!tableOpen)} className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-900">
                            {tableOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            <span className="font-medium">{result.rowCount ?? result.rows?.length ?? 0} row(s)</span>
                        </button>
                        {result.rows?.length > 0 && (
                            <button onClick={exportCSV} className="flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700 font-medium">
                                <Download className="w-3 h-3" /> Export CSV
                            </button>
                        )}
                    </div>
                    {/* Success message for write operations */}
                    {result.rows?.length === 0 && (
                        <div className="px-3 py-3 bg-emerald-50 text-emerald-700 text-[11px] font-medium flex items-center gap-2 border-b border-emerald-100">
                            <Check className="w-4 h-4" /> 
                            Operation executed successfully. 
                        </div>
                    )}
                    {/* Data table — shown by default */}
                    {tableOpen && result.rows?.length > 0 && (
                        <div className="overflow-x-auto max-h-52">
                            <table className="w-full text-[11px]">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr>
                                        {cols.map((c, i) => (
                                            <th key={i} className="px-2 py-1.5 text-left font-semibold text-slate-600 border-b whitespace-nowrap">{c}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.rows.slice(0, 50).map((row, ri) => (
                                        <tr key={ri} className={ri % 2 ? 'bg-slate-50/50' : ''}>
                                            {cols.map((c, ci) => (
                                                <td key={ci} className="px-2 py-1 border-b border-slate-100 font-mono whitespace-nowrap max-w-[200px] truncate">
                                                    {row[c] === null ? <span className="text-slate-400 italic">NULL</span>
                                                        : typeof row[c] === 'string' && row[c].startsWith('http') ? <a href={row[c]} target="_blank" rel="noopener noreferrer" className="text-indigo-500 underline hover:text-indigo-700">Open Link</a>
                                                        : typeof row[c] === 'object' ? JSON.stringify(row[c]) : String(row[c])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {result.rows.length > 50 && <p className="text-[10px] text-slate-400 text-center py-1">Showing 50 of {result.rows.length}</p>}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/* ─── Chart component with copy/download ─── */
const DEFAULT_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

function RenderMessage({ content }) {
    if (!content) return null;
    const parts = content.split(new RegExp('(`{3}[\\s\\S]*?`{3}|<think>[\\s\\S]*?<\\/think>)', 'g'));
    
    return (
        <div className="ai-prose text-[13px] leading-relaxed">
            {parts.map((part, i) => {
                if (!part) return null;
                if (part.startsWith('```')) {
                    const m = part.match(/```(\w+)?\n?([\s\S]*?)```/);
                    if (m) return <CodeBlock key={i} code={m[2].trim()} language={m[1] || ''} />;
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
            tooltip: { trigger: 'axis', textStyle: { fontSize: 11 }, backgroundColor: 'rgba(255, 255, 255, 0.9)' },
            legend: { data: seriesKeys, bottom: 0, textStyle: { fontSize: 10 } },
            grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
            xAxis: activeType === 'pie' || activeType === 'doughnut' ? { show: false } : {
                type: 'category',
                data: data.map(d => d.label),
                axisLabel: { fontSize: 10, interval: 0, rotate: 20 },
                axisLine: { lineStyle: { color: '#cbd5e1' } }
            },
            yAxis: activeType === 'pie' || activeType === 'doughnut' ? { show: false } : {
                type: 'value',
                axisLabel: { fontSize: 10 },
                splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } }
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
                label: { show: true, formatter: '{b} ({c})', fontSize: 10 },
                itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 }
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
                    areaStyle: activeType === 'area' ? { 
                        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: baseColor }, { offset: 1, color: baseColor + '11' }] }
                    } : undefined,
                    data: data.map(d => Number(d[key]) || 0),
                    label: { show: true, position: 'top', formatter: (p) => p.value === 0 ? '' : p.value, fontSize: 9, color: '#64748b' },
                    smooth: true,
                    symbolSize: sType === 'line' ? 8 : 0,
                    itemStyle: { 
                        borderRadius: sType === 'bar' ? [6, 6, 0, 0] : 0,
                        color: sType === 'bar' ? { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: baseColor }, { offset: 1, color: baseColor + '44' }] } : baseColor
                    },
                    lineStyle: sType === 'line' ? { width: 3, shadowColor: 'rgba(0,0,0,0.15)', shadowBlur: 10, shadowOffsetY: 5 } : undefined,
                    animationEasing: 'cubicOut',
                    animationDuration: 1000
                };
            });
        }
        return <ReactECharts ref={echartsRef} option={option} style={{ height: 220, width: '100%' }} opts={{ renderer: 'svg' }} />;
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
        <div className="my-2 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl shadow-xs space-y-2">
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-xs text-indigo-950">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Interactive Custom Report Ready
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full uppercase">
                    {(action.entities || []).join(', ')}
                </span>
            </div>
            <p className="text-[11px] text-slate-600">
                Click a format below to generate & download your custom report:
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                    onClick={() => handleDownload('pdf')}
                    disabled={downloading}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-xs transition"
                >
                    <FileText className="w-3 h-3" /> PDF
                </button>
                <button
                    onClick={() => handleDownload('xlsx')}
                    disabled={downloading}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-xs transition"
                >
                    <File className="w-3 h-3" /> Excel (XLSX)
                </button>
                <button
                    onClick={() => handleDownload('csv')}
                    disabled={downloading}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-xs transition"
                >
                    <Download className="w-3 h-3" /> CSV
                </button>
            </div>
        </div>
    );
}

/* ─── Document badge ─── */
function DocBadge({ doc, onRemove }) {
    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-violet-50 border border-violet-200 rounded text-[10px]">
            <FileText className="w-3 h-3 text-violet-500" />
            <span className="text-violet-700 truncate max-w-[100px]">{doc.fileName}</span>
            <button onClick={onRemove} className="text-violet-400 hover:text-red-500"><X className="w-3 h-3" /></button>
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
        <div className="mt-2.5 rounded-xl border border-indigo-200 bg-gradient-to-b from-indigo-50/90 via-white to-violet-50/50 shadow-sm overflow-hidden text-[12px]">
            {/* Header */}
            <div className="px-3.5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                        <Video className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-[13px] tracking-tight">
                        {isConfirmed ? 'Meeting Confirmed' : 'Confirm Meeting'}
                    </span>
                </div>
                {isConfirmed && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Confirmed
                    </span>
                )}
            </div>

            <div className="p-3.5 space-y-3">
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
                            onClick={() => setIsEditing(!isEditing)}
                            className={`p-1.5 rounded-lg border transition ${
                                isEditing
                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100'
                                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                            }`}
                            title={isEditing ? 'Cancel Edit' : 'Edit Details'}
                        >
                            <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onClick={handleSaveAndConfirm}
                            disabled={isSaving}
                            className="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition shadow-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white ml-auto"
                        >
                            {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <CheckCircle className="w-3.5 h-3.5" />
                            )}
                            Confirm & Finalize
                        </button>
                    </div>
                ) : (
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Meeting Scheduled</span>
                        </div>
                        <a
                            href={`/meeting/${action.meetingLink}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition shadow-sm"
                        >
                            <Video className="w-3.5 h-3.5" /> Open Room
                        </a>
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
                <div className={`px-3.5 py-2.5 text-white flex items-center justify-between ${
                    isConfirmed 
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600' 
                        : 'bg-gradient-to-r from-indigo-600 to-violet-600'
                }`}>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                            {isConfirmed ? <Check className="w-3.5 h-3.5" /> : <CalendarPlus className="w-3.5 h-3.5" />}
                        </div>
                        <span className="font-semibold text-[13px] tracking-tight">
                            {isConfirmed ? 'Event Added to Calendar' : 'Event Draft (Pending Confirmation)'}
                        </span>
                    </div>
                    {isConfirmed ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-300 text-emerald-950 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Confirmed
                        </span>
                    ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-300 text-amber-950 flex items-center gap-1 shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-800 animate-ping" />
                            Draft Mode
                        </span>
                    )}
                </div>

                <div className="p-3.5 space-y-3">
                    {/* Information / Edit Header */}
                    {!isConfirmed && (
                        <div className="text-[11px] text-slate-600 flex items-center justify-between">
                            <span>Review event details before confirming:</span>
                            <button
                                type="button"
                                onClick={() => setIsEditing(!isEditing)}
                                className={`px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition ${
                                    isEditing
                                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <Edit3 className="w-3.5 h-3.5" /> {isEditing ? 'Done Editing' : 'Edit Details'}
                            </button>
                        </div>
                    )}

                    {/* Single Event Body */}
                    {isEditing && !isConfirmed ? (
                        <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-2.5">
                            <div>
                                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5 uppercase tracking-wider">Event Title (English)</label>
                                <input
                                    type="text"
                                    value={singleEvent.title || ''}
                                    onChange={(e) => handleUpdateRow(0, 'title', e.target.value)}
                                    placeholder="Event Name"
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5 uppercase tracking-wider">Regional Name (ਪੰਜਾਬੀ / हिंदी)</label>
                                    <input
                                        type="text"
                                        value={singleEvent.titleHindi || ''}
                                        onChange={(e) => handleUpdateRow(0, 'titleHindi', e.target.value)}
                                        placeholder="ਈਵੈਂਟ / इवेंट"
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5 uppercase tracking-wider">Time (Optional)</label>
                                    <input
                                        type="text"
                                        value={singleEvent.time || ''}
                                        onChange={(e) => handleUpdateRow(0, 'time', e.target.value)}
                                        placeholder="e.g. 09:30 AM"
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5 uppercase tracking-wider">Event Date</label>
                                    <input
                                        type="date"
                                        value={singleEvent.date || ''}
                                        onChange={(e) => handleUpdateRow(0, 'date', e.target.value)}
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5 uppercase tracking-wider">Event Type</label>
                                    <select
                                        value={singleEvent.type || 'event'}
                                        onChange={(e) => handleUpdateRow(0, 'type', e.target.value)}
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="isHolidayCheck"
                                    checked={!!singleEvent.isHoliday}
                                    onChange={(e) => handleUpdateRow(0, 'isHoliday', e.target.checked)}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="isHolidayCheck" className="text-xs text-slate-700 font-medium cursor-pointer">
                                    Mark as School Holiday (Campus Closed)
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm leading-snug">
                                        {singleEvent.title || 'Untitled Event'}
                                    </h4>
                                    {singleEvent.titleHindi && (
                                        <p className="text-xs text-slate-600 font-medium mt-0.5">
                                            {singleEvent.titleHindi}
                                        </p>
                                    )}
                                </div>
                                <div className="shrink-0">
                                    {getTypeBadge(singleEvent.type, singleEvent.isHoliday)}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1 text-xs border-t border-slate-100">
                                <div className="flex items-center gap-1.5 text-slate-700">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                    <span className="font-medium">{formattedDate || singleEvent.date}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-700">
                                    <Clock className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                                    <span className="font-medium">{singleEvent.time || 'All Day'}</span>
                                </div>
                            </div>

                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                                <span className={`w-2 h-2 rounded-full ${singleEvent.isHoliday ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                <span>{singleEvent.isHoliday ? 'School Closed (Holiday)' : 'Normal School Day (Open)'}</span>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {!isConfirmed ? (
                        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 text-[11px] font-semibold flex items-center gap-1.5 transition"
                            >
                                <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={isSaving || !singleEvent.title || !singleEvent.date}
                                className="px-4 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition shadow-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <CheckCircle className="w-3.5 h-3.5" />
                                )}
                                Confirm & Add to Calendar
                            </button>
                        </div>
                    ) : (
                        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Added to School Calendar</span>
                            </div>
                            <a
                                href="/admin/calendar"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition shadow-sm"
                            >
                                <Calendar className="w-3.5 h-3.5" /> View Calendar
                            </a>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    /* ─── State: Multi-Event / Holiday Table Mode ─── */
    return (
        <div className="mt-2.5 rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50/90 via-white to-teal-50/50 shadow-sm overflow-hidden text-[12px] animate-in fade-in">
            {/* Header */}
            <div className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                        <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-[13px] tracking-tight">
                        {isConfirmed ? 'Holidays Added to Calendar' : 'Confirm Holiday Calendar'}
                    </span>
                </div>
                {isConfirmed ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-300 text-emerald-950 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Confirmed
                    </span>
                ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/20 text-white">
                        {events.length} Recognized
                    </span>
                )}
            </div>

            <div className="p-3.5 space-y-3">
                {/* Information Notice */}
                {!isConfirmed && (
                    <div className="text-[11px] text-slate-600 flex items-center justify-between">
                        <span>Review recognized holidays before saving:</span>
                        <button
                            type="button"
                            onClick={() => setIsEditing(!isEditing)}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition ${
                                isEditing
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <Edit3 className="w-3.5 h-3.5" /> {isEditing ? 'Done Editing' : 'Edit List'}
                        </button>
                    </div>
                )}

                {/* Holiday List Table / Container */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs max-h-60 overflow-y-auto">
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
                                <Plus className="w-3.5 h-3.5" /> Add Another Holiday
                            </button>
                        </div>
                    ) : (
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                                <tr>
                                    <th className="px-2.5 py-1.5">Date</th>
                                    <th className="px-2.5 py-1.5">Holiday</th>
                                    <th className="px-2.5 py-1.5">ਪੰਜਾਬੀ / हिंदी</th>
                                    <th className="px-2.5 py-1.5 text-right">Type</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {events.map((ev, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/80">
                                        <td className="px-2.5 py-1.5 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                                            {ev.date}
                                        </td>
                                        <td className="px-2.5 py-1.5 font-medium text-slate-900">
                                            {ev.title}
                                        </td>
                                        <td className="px-2.5 py-1.5 text-slate-600 font-medium">
                                            {ev.titleHindi || '-'}
                                        </td>
                                        <td className="px-2.5 py-1.5 text-right whitespace-nowrap">
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
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 text-[11px] font-semibold flex items-center gap-1.5 transition"
                        >
                            <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-[11px] text-slate-500">
                                {events.length} holiday(s)
                            </span>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={isSaving || events.length === 0}
                                className="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition shadow-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <CheckCircle className="w-3.5 h-3.5" />
                                )}
                                Confirm & Add to Calendar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Successfully Added to Calendar</span>
                        </div>
                        <a
                            href="/admin/calendar"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition shadow-sm"
                        >
                            <Calendar className="w-3.5 h-3.5" /> Open Calendar
                        </a>
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
                const loadedSessions = res.data.data;
                setSessions(loadedSessions);
                
                // If we have a saved session ID, restore its messages
                if (currentSessionId && messages.length === 1) {
                    const activeSession = loadedSessions.find(s => s.id === currentSessionId);
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
                setUploadedDocs(prev => [...prev, res.data.data]);
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `📄 **Loaded:** ${res.data.data.fileName} (${res.data.data.charCount.toLocaleString()} chars).\nAsk me anything about it.`,
                    timestamp: new Date().toISOString()
                }]);
                toast.success('Document loaded');
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

    const suggestions = [
        "How many students enrolled?",
        "Top 5 classes by submissions",
        "Active instructors count",
        "Pending procurement requests",
    ];

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
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white flex-shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                <Bot className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm leading-none flex items-center gap-2">
                                    LIA
                                    <select 
                                        value={preferredModel}
                                        onChange={(e) => setPreferredModel(e.target.value)}
                                        className="bg-white/10 border border-white/20 text-white text-[10px] rounded px-1 py-0.5 outline-none focus:bg-white/20 ml-2"
                                    >
                                        <option value="auto" className="text-black">Auto (Fastest)</option>
                                        <option value="groq" className="text-black">Llama 3.3 (Groq)</option>
                                        <option value="gemini" className="text-black">Gemini 3.6 (Google)</option>
                                        <option value="sambanova" className="text-black">Llama 3.2 Vision (SambaNova)</option>
                                        <option value="github" className="text-black">GPT-4o (GitHub)</option>
                                    </select>
                                </h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setShowHelp(true)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition text-white/90" title="Prompt Guide">
                                <HelpCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => setShowHistory(!showHistory)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition text-white/90" title="Chat History">
                                <History className="w-4 h-4" />
                            </button>
                            <button onClick={clearChat} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition text-white/90" title="New Chat">
                                <FilePlus className="w-4 h-4" />
                            </button>
                            <button onClick={() => setIsExpanded(!isExpanded)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition text-white/90 hidden sm:flex">
                                {isExpanded ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                            </button>
                            <button onClick={() => setIsOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition text-white/90">
                                <X className="w-5 h-5" />
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
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] ${msg.role === 'user'
                                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl rounded-br-sm px-3.5 py-2.5 shadow-md shadow-indigo-500/15'
                                    : `rounded-2xl rounded-bl-sm px-3.5 py-3 shadow-sm ${msg.isError
                                        ? 'bg-red-50 border border-red-200'
                                        : 'bg-white border border-slate-200'}`
                                    }`}>
                                    {msg.role === 'assistant' && (
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                                                <Bot className="w-3 h-3 text-white" />
                                            </div>
                                            <span className="text-[10px] text-slate-400">
                                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                        </div>
                                    )}
                                    {msg.role === 'user'
                                        ? <p className="text-[13px] whitespace-pre-wrap">{msg.content}</p>
                                        : <RenderMessage content={msg.content} />
                                    }
                                    {msg.queryResult && <SQLResult sql={msg.sql} result={msg.queryResult} onRerun={() => handleRerunSQL(msg.sql)} />}
                                    {msg.chartData && <ChatChart chartData={msg.chartData} />}
                                    {msg.reportAction && <ReportActionCard action={msg.reportAction} />}
                                    {msg.meetingAction && <MeetingActionCard action={msg.meetingAction} />}
                                    {msg.calendarAction && <CalendarActionCard action={msg.calendarAction} />}
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

                        {/* Suggestions on empty */}
                        {messages.length <= 1 && !isLoading && (
                            <div className="grid grid-cols-1 gap-1.5 mt-2">
                                {suggestions.map((s, i) => (
                                    <button key={i} onClick={() => setInput(s)}
                                        className="text-left px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition text-[12px] text-slate-600 hover:text-indigo-600">
                                        <Sparkles className="w-3 h-3 inline mr-1.5 text-indigo-400" />{s}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    </>
                    )}

                    {/* Input bar */}
                    <div className="flex items-end gap-2 px-3 py-2.5 bg-white border-t border-slate-200 flex-shrink-0">
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.csv,.json,.pdf,.md,.sql,.log,.png,.jpg,.jpeg,.webp,.bmp" />
                        <button onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                            className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-500 hover:bg-violet-100 transition disabled:opacity-50" title="Upload document, holiday PDF or image">
                            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        </button>
                        <textarea ref={inputRef} value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder="Ask anything, upload holiday PDF/image, or request SQL..."
                            rows={1}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                            style={{ minHeight: '36px', maxHeight: '80px' }}
                        />
                        <button onClick={handleSend} disabled={!input.trim() || isLoading}
                            className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center hover:from-indigo-600 hover:to-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20">
                            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
