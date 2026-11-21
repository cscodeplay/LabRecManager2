'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Table as TableIcon,
    Undo2,
    Redo2,
    Bookmark,
    BookmarkPlus,
    Sparkles,
    ExternalLink,
    Trash2,
    Check,
    Copy,
    ChevronDown,
    RotateCcw,
    X,
    Plus,
    FileText,
    Baseline,
    Palette
} from 'lucide-react';
import toast from 'react-hot-toast';

// Convert legacy plain text or raw markdown asterisks to clean HTML
function normalizeInitialHtml(val) {
    if (!val || typeof val !== 'string') return '';
    const trimmed = val.trim();
    if (!trimmed) return '';

    // If it already looks like HTML (contains <p, <div, <table, <h1, <br)
    if (/<(p|div|h[1-6]|table|ul|ol|br|strong|b|em|i|span)[^>]*>/i.test(trimmed)) {
        return trimmed;
    }

    // Convert legacy markdown-ish or plain text with newlines
    let html = trimmed
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>');

    const paragraphs = html.split(/\n\n+/);
    if (paragraphs.length > 1) {
        return paragraphs.map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
    }

    return `<p>${html.replace(/\n/g, '<br/>')}</p>`;
}

const INK_COLORS = [
    { label: 'Default Charcoal', color: '#0f172a' },
    { label: 'Navy Blue', color: '#1e3a8a' },
    { label: 'Indigo', color: '#4338ca' },
    { label: 'Forest Green', color: '#166534' },
    { label: 'Crimson Red', color: '#991b1b' },
    { label: 'Slate Muted', color: '#64748b' }
];

export default function InlineRichWordEditor({
    value = '',
    onChange,
    storageKey = 'default',
    defaultTemplates = [],
    variables = [],
    placeholder = 'Type document content here...',
    minHeight = '240px',
    className = '',
    documentTitle = 'Procurement Document'
}) {
    const editorRef = useRef(null);
    const [savedTemplates, setSavedTemplates] = useState([]);
    const [showTemplateMenu, setShowTemplateMenu] = useState(false);
    const [showVariableMenu, setShowVariableMenu] = useState(false);
    const [showColorMenu, setShowColorMenu] = useState(false);
    const [showTableModal, setShowTableModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [newTemplateTitle, setNewTemplateTitle] = useState('');
    const [tableRows, setTableRows] = useState(3);
    const [tableCols, setTableCols] = useState(3);
    const [wordCount, setWordCount] = useState(0);
    const [charCount, setCharCount] = useState(0);

    const templateMenuRef = useRef(null);
    const variableMenuRef = useRef(null);
    const colorMenuRef = useRef(null);

    // Load custom templates from localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem(`procurement_templates_${storageKey}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    setSavedTemplates(parsed);
                }
            }
        } catch (e) {
            console.error('Failed to load custom templates from localStorage:', e);
        }
    }, [storageKey]);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (templateMenuRef.current && !templateMenuRef.current.contains(e.target)) {
                setShowTemplateMenu(false);
            }
            if (variableMenuRef.current && !variableMenuRef.current.contains(e.target)) {
                setShowVariableMenu(false);
            }
            if (colorMenuRef.current && !colorMenuRef.current.contains(e.target)) {
                setShowColorMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sync initial value into contentEditable when mounting or when external value changes drastically
    useEffect(() => {
        if (!editorRef.current) return;
        const currentHtml = editorRef.current.innerHTML;
        const targetHtml = normalizeInitialHtml(value);
        if (targetHtml !== currentHtml && (editorRef.current !== document.activeElement || !currentHtml)) {
            editorRef.current.innerHTML = targetHtml;
            updateCounts(targetHtml);
        }
    }, [value]);

    const updateCounts = (html) => {
        const temp = document.createElement('div');
        temp.innerHTML = html || '';
        const text = temp.innerText || temp.textContent || '';
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        setWordCount(words);
        setCharCount(text.length);
    };

    const emitChange = useCallback(() => {
        if (!editorRef.current) return;
        const html = editorRef.current.innerHTML;
        updateCounts(html);
        if (onChange) {
            onChange(html);
        }
    }, [onChange]);

    // Format commands using document.execCommand
    const execCmd = (cmd, val = null) => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        document.execCommand(cmd, false, val);
        emitChange();
    };

    // Format block for Headings
    const handleFormatBlock = (tag) => {
        execCmd('formatBlock', tag);
    };

    // Insert Table
    const handleInsertTable = () => {
        if (!editorRef.current) return;
        let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #cbd5e1;">';
        for (let r = 0; r < tableRows; r++) {
            tableHtml += '<tr>';
            for (let c = 0; c < tableCols; c++) {
                if (r === 0) {
                    tableHtml += '<th style="border: 1px solid #cbd5e1; padding: 6px 10px; background-color: #f1f5f9; font-weight: bold; text-align: left; font-size: 12px;">Header</th>';
                } else {
                    tableHtml += '<td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 12px;">Cell</td>';
                }
            }
            tableHtml += '</tr>';
        }
        tableHtml += '</table><p></p>';

        execCmd('insertHTML', tableHtml);
        setShowTableModal(false);
    };

    // Insert Variable Token
    const handleInsertVariable = (token) => {
        execCmd('insertHTML', `<strong>${token}</strong>&nbsp;`);
        setShowVariableMenu(false);
    };

    // Apply template
    const handleApplyTemplate = (tpl) => {
        const content = tpl.html || normalizeInitialHtml(tpl.content || '');
        if (editorRef.current) {
            editorRef.current.innerHTML = content;
            emitChange();
        }
        setShowTemplateMenu(false);
        toast.success(`Applied template "${tpl.name}"`);
    };

    // Save as Custom Template
    const handleSaveTemplate = () => {
        if (!newTemplateTitle.trim()) {
            toast.error('Please enter a template name');
            return;
        }
        const currentHtml = editorRef.current?.innerHTML || '';
        if (!currentHtml.trim()) {
            toast.error('Cannot save empty document as a template');
            return;
        }

        const newTemplate = {
            id: `tpl_${Date.now()}`,
            name: newTemplateTitle.trim(),
            html: currentHtml,
            createdAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        };

        const updated = [...savedTemplates, newTemplate];
        setSavedTemplates(updated);
        try {
            localStorage.setItem(`procurement_templates_${storageKey}`, JSON.stringify(updated));
            toast.success(`Saved "${newTemplate.name}" to templates`);
        } catch (e) {
            console.error('Failed to save template to localStorage:', e);
            toast.error('Failed to persist template locally');
        }

        setNewTemplateTitle('');
        setShowSaveModal(false);
    };

    // Delete custom template
    const handleDeleteTemplate = (id, name, e) => {
        e.stopPropagation();
        const updated = savedTemplates.filter(t => t.id !== id);
        setSavedTemplates(updated);
        try {
            localStorage.setItem(`procurement_templates_${storageKey}`, JSON.stringify(updated));
            toast.success(`Deleted template "${name}"`);
        } catch (e) {
            console.error(e);
        }
    };

    // Launch full Office Word processor
    const handleOpenFullOfficeWord = () => {
        const currentHtml = editorRef.current?.innerHTML || '';
        try {
            // Save draft into session storage for word-editor to pick up
            const sessionKey = `office_draft_${storageKey}_${Date.now()}`;
            sessionStorage.setItem('office_import_draft', JSON.stringify({
                title: documentTitle || 'Procurement Letter Draft',
                html: currentHtml
            }));
            window.open(`/documents/word-editor?imported=true&title=${encodeURIComponent(documentTitle)}`, '_blank');
            toast.success('Opened in Office Word processor in a new tab');
        } catch (e) {
            window.open(`/documents/word-editor?title=${encodeURIComponent(documentTitle)}`, '_blank');
        }
    };

    return (
        <div className={`rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs overflow-hidden ${className}`}>
            {/* Toolbar Header */}
            <div className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 p-2 flex flex-wrap items-center gap-1.5 select-none">
                {/* Undo / Redo */}
                <div className="flex items-center gap-0.5 border-r border-slate-300 dark:border-slate-600 pr-1.5">
                    <button
                        type="button"
                        onClick={() => execCmd('undo')}
                        title="Undo (Ctrl+Z)"
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                    >
                        <Undo2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('redo')}
                        title="Redo (Ctrl+Y)"
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                    >
                        <Redo2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Headings & Paragraph Selector */}
                <div className="flex items-center gap-0.5 border-r border-slate-300 dark:border-slate-600 pr-1.5">
                    <button
                        type="button"
                        onClick={() => handleFormatBlock('p')}
                        title="Normal Paragraph"
                        className="px-2 py-1 text-xs font-semibold rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                    >
                        P
                    </button>
                    <button
                        type="button"
                        onClick={() => handleFormatBlock('h1')}
                        title="Heading 1"
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                    >
                        <Heading1 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleFormatBlock('h2')}
                        title="Heading 2"
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                    >
                        <Heading2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleFormatBlock('h3')}
                        title="Heading 3"
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                    >
                        <Heading3 className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Text Styles: Bold, Italic, Underline, Strikethrough */}
                <div className="flex items-center gap-0.5 border-r border-slate-300 dark:border-slate-600 pr-1.5">
                    <button
                        type="button"
                        onClick={() => execCmd('bold')}
                        title="Bold (Ctrl+B)"
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition"
                    >
                        <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('italic')}
                        title="Italic (Ctrl+I)"
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                    >
                        <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('underline')}
                        title="Underline (Ctrl+U)"
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                    >
                        <Underline className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('strikeThrough')}
                        title="Strikethrough"
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                    >
                        <Strikethrough className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Text Alignment Controls: Left, Center, Right, Justify */}
                <div className="flex items-center gap-0.5 border-r border-slate-300 dark:border-slate-600 pr-1.5 bg-indigo-50/50 dark:bg-indigo-950/30 px-1 rounded-lg">
                    <button
                        type="button"
                        onClick={() => execCmd('justifyLeft')}
                        title="Align Left"
                        className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                    >
                        <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('justifyCenter')}
                        title="Align Center"
                        className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                    >
                        <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('justifyRight')}
                        title="Align Right"
                        className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                    >
                        <AlignRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('justifyFull')}
                        title="Justify Full"
                        className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                    >
                        <AlignJustify className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Lists & Table */}
                <div className="flex items-center gap-0.5 border-r border-slate-300 dark:border-slate-600 pr-1.5">
                    <button
                        type="button"
                        onClick={() => execCmd('insertUnorderedList')}
                        title="Bulleted List"
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                    >
                        <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('insertOrderedList')}
                        title="Numbered List"
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                    >
                        <ListOrdered className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowTableModal(true)}
                        title="Insert Styled Table"
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                    >
                        <TableIcon className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Ink Color Picker */}
                <div className="relative" ref={colorMenuRef}>
                    <button
                        type="button"
                        onClick={() => setShowColorMenu(!showColorMenu)}
                        title="Ink Color"
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 transition"
                    >
                        <Palette className="w-3.5 h-3.5" />
                        <ChevronDown className="w-2.5 h-2.5" />
                    </button>
                    {showColorMenu && (
                        <div className="absolute left-0 mt-1 z-30 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-2 flex flex-col gap-1 min-w-[140px]">
                            {INK_COLORS.map(c => (
                                <button
                                    key={c.color}
                                    type="button"
                                    onClick={() => {
                                        execCmd('foreColor', c.color);
                                        setShowColorMenu(false);
                                    }}
                                    className="flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-left"
                                >
                                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300" style={{ backgroundColor: c.color }} />
                                    <span>{c.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Variables Dropdown */}
                {variables.length > 0 && (
                    <div className="relative" ref={variableMenuRef}>
                        <button
                            type="button"
                            onClick={() => setShowVariableMenu(!showVariableMenu)}
                            className="px-2 py-1 text-xs font-semibold rounded bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center gap-1 transition border border-indigo-200 dark:border-indigo-800"
                        >
                            <Sparkles className="w-3 h-3 text-indigo-500" />
                            <span>Insert Variable</span>
                            <ChevronDown className="w-2.5 h-2.5" />
                        </button>
                        {showVariableMenu && (
                            <div className="absolute left-0 mt-1 z-30 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-1 min-w-[180px]">
                                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase">Institutional Tokens</div>
                                {variables.map(v => (
                                    <button
                                        key={v.token}
                                        type="button"
                                        onClick={() => handleInsertVariable(v.token)}
                                        className="w-full text-left px-2 py-1 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 rounded flex items-center justify-between"
                                    >
                                        <span className="font-medium">{v.label}</span>
                                        <code className="text-[10px] text-indigo-600 bg-indigo-50 px-1 rounded">{v.token}</code>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Template Hub Dropdown */}
                <div className="relative" ref={templateMenuRef}>
                    <button
                        type="button"
                        onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                        className="px-2 py-1 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 transition border border-slate-300 dark:border-slate-600"
                    >
                        <Bookmark className="w-3 h-3 text-amber-500" />
                        <span>Templates ({defaultTemplates.length + savedTemplates.length})</span>
                        <ChevronDown className="w-2.5 h-2.5" />
                    </button>
                    {showTemplateMenu && (
                        <div className="absolute right-0 mt-1 z-30 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 min-w-[260px] max-w-[340px] max-h-[360px] overflow-y-auto">
                            {/* Built-in Templates */}
                            {defaultTemplates.length > 0 && (
                                <div className="mb-2">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">Standard Templates</div>
                                    {defaultTemplates.map((tpl, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => handleApplyTemplate(tpl)}
                                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between"
                                        >
                                            <span className="font-semibold">{tpl.name}</span>
                                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Standard</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Saved Custom Templates */}
                            {savedTemplates.length > 0 && (
                                <div className="mb-2 border-t border-slate-100 dark:border-slate-700 pt-2">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">My Saved Templates</div>
                                    {savedTemplates.map(tpl => (
                                        <div
                                            key={tpl.id}
                                            onClick={() => handleApplyTemplate(tpl)}
                                            className="cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between group"
                                        >
                                            <div>
                                                <div className="font-semibold">{tpl.name}</div>
                                                <div className="text-[10px] text-slate-400">{tpl.createdAt}</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDeleteTemplate(tpl.id, tpl.name, e)}
                                                className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 p-1 rounded"
                                                title="Delete template"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Save current as template */}
                            <button
                                type="button"
                                onClick={() => {
                                    setShowTemplateMenu(false);
                                    setShowSaveModal(true);
                                }}
                                className="w-full mt-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 flex items-center justify-center gap-1.5 transition"
                            >
                                <BookmarkPlus className="w-3.5 h-3.5" /> Save Current as Template
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Spacer & Full Word Editor Shortcut */}
                <div className="ml-auto flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={handleOpenFullOfficeWord}
                        title="Open document in full Office Word Suite with equations & formatting"
                        className="px-2 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 flex items-center gap-1 border border-blue-200 dark:border-blue-800 transition shadow-2xs"
                    >
                        <FileText className="w-3 h-3 text-blue-600" />
                        <span className="hidden sm:inline">Open in</span> Office Word
                        <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                </div>
            </div>

            {/* WYSIWYG contentEditable Paper Surface */}
            <div className="relative p-4 bg-white dark:bg-slate-900 min-h-[160px]">
                <div
                    ref={editorRef}
                    contentEditable
                    onInput={emitChange}
                    onBlur={emitChange}
                    style={{ minHeight }}
                    data-placeholder={placeholder}
                    className="outline-none focus:outline-none prose dark:prose-invert max-w-none text-xs sm:text-sm font-sans leading-relaxed text-slate-900 dark:text-slate-100 selection:bg-indigo-100 selection:text-indigo-900
                    [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_table]:border [&_table]:border-slate-300 dark:[&_table]:border-slate-700
                    [&_th]:border [&_th]:border-slate-300 dark:[&_th]:border-slate-700 [&_th]:p-2 [&_th]:bg-slate-100 dark:[&_th]:bg-slate-800 [&_th]:font-bold [&_th]:text-left
                    [&_td]:border [&_td]:border-slate-300 dark:[&_td]:border-slate-700 [&_td]:p-2
                    [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
                    [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
                    [&_h1]:text-lg [&_h1]:font-bold [&_h1]:my-2 [&_h1]:text-slate-900 dark:[&_h1]:text-white
                    [&_h2]:text-base [&_h2]:font-bold [&_h2]:my-2 [&_h2]:text-slate-900 dark:[&_h2]:text-white
                    [&_h3]:text-sm [&_h3]:font-bold [&_h3]:my-1.5 [&_h3]:text-slate-900 dark:[&_h3]:text-white
                    [&_p]:my-1.5"
                />
            </div>

            {/* Footer Stats Bar */}
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <div className="flex items-center gap-3">
                    <span>{wordCount} Words</span>
                    <span>•</span>
                    <span>{charCount} Characters</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-sans font-medium text-[10px]">
                    <Check className="w-3 h-3" /> WYSIWYG Office Format Active
                </div>
            </div>

            {/* Insert Table Modal */}
            {showTableModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <TableIcon className="w-4 h-4 text-indigo-600" /> Insert Styled Table
                            </h4>
                            <button
                                type="button"
                                onClick={() => setShowTableModal(false)}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Rows</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    className="input text-xs mt-1 w-full"
                                    value={tableRows}
                                    onChange={e => setTableRows(parseInt(e.target.value) || 1)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Columns</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    className="input text-xs mt-1 w-full"
                                    value={tableCols}
                                    onChange={e => setTableCols(parseInt(e.target.value) || 1)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowTableModal(false)}
                                className="btn btn-secondary text-xs py-1.5 px-3"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleInsertTable}
                                className="btn btn-primary text-xs py-1.5 px-3"
                            >
                                Insert Table
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Template Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <BookmarkPlus className="w-4 h-4 text-indigo-600" /> Save as Custom Template
                            </h4>
                            <button
                                type="button"
                                onClick={() => setShowSaveModal(false)}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="mb-4">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Template Title *</label>
                            <input
                                type="text"
                                placeholder="e.g. Science Lab Requisition Template"
                                className="input text-xs mt-1 w-full"
                                value={newTemplateTitle}
                                onChange={e => setNewTemplateTitle(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowSaveModal(false)}
                                className="btn btn-secondary text-xs py-1.5 px-3"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveTemplate}
                                className="btn btn-primary text-xs py-1.5 px-3"
                            >
                                Save Template
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
