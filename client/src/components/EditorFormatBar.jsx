'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    Table,
    Minus,
    Bookmark,
    BookmarkPlus,
    Trash2,
    Copy,
    Check,
    FileText,
    ChevronDown,
    Plus,
    Sparkles,
    RotateCcw,
    X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function EditorFormatBar({
    textareaRef,
    value = '',
    onChange,
    storageKey = 'default',
    defaultTemplates = [],
    variables = [],
    className = ''
}) {
    const [savedTemplates, setSavedTemplates] = useState([]);
    const [showTemplateMenu, setShowTemplateMenu] = useState(false);
    const [showVariableMenu, setShowVariableMenu] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [newTemplateTitle, setNewTemplateTitle] = useState('');
    const [copied, setCopied] = useState(false);

    const templateMenuRef = useRef(null);
    const variableMenuRef = useRef(null);

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

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (templateMenuRef.current && !templateMenuRef.current.contains(e.target)) {
                setShowTemplateMenu(false);
            }
            if (variableMenuRef.current && !variableMenuRef.current.contains(e.target)) {
                setShowVariableMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Text formatting helpers
    const applyWrap = (prefix, suffix = '', defaultText = 'text') => {
        if (!textareaRef?.current) return;
        const el = textareaRef.current;
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;
        const currentText = el.value || '';
        const selected = currentText.substring(start, end) || defaultText;
        const replacement = `${prefix}${selected}${suffix}`;
        const nextValue = currentText.substring(0, start) + replacement + currentText.substring(end);
        
        onChange(nextValue);

        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
        }, 10);
    };

    const applyLinePrefix = (linePrefix) => {
        if (!textareaRef?.current) return;
        const el = textareaRef.current;
        const start = el.selectionStart ?? 0;
        const currentText = el.value || '';
        const lineStart = currentText.lastIndexOf('\n', start - 1) + 1;
        const nextValue = currentText.substring(0, lineStart) + linePrefix + currentText.substring(lineStart);
        
        onChange(nextValue);

        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + linePrefix.length, start + linePrefix.length);
        }, 10);
    };

    const insertAtCursor = (content) => {
        if (!textareaRef?.current) {
            onChange((value ? value + '\n' : '') + content);
            return;
        }
        const el = textareaRef.current;
        const start = el.selectionStart ?? (el.value?.length || 0);
        const end = el.selectionEnd ?? (el.value?.length || 0);
        const currentText = el.value || '';
        const nextValue = currentText.substring(0, start) + content + currentText.substring(end);
        
        onChange(nextValue);

        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + content.length, start + content.length);
        }, 10);
    };

    // Save current text as a custom template
    const handleSaveTemplate = () => {
        if (!newTemplateTitle.trim()) {
            toast.error('Please enter a template name');
            return;
        }
        if (!value.trim()) {
            toast.error('Cannot save empty content as a template');
            return;
        }

        const newTemplate = {
            id: `tpl_${Date.now()}`,
            name: newTemplateTitle.trim(),
            content: value,
            createdAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        };

        const updated = [newTemplate, ...savedTemplates];
        setSavedTemplates(updated);
        try {
            localStorage.setItem(`procurement_templates_${storageKey}`, JSON.stringify(updated));
            toast.success(`Template "${newTemplate.name}" saved!`);
        } catch (e) {
            console.error('Failed to save template to localStorage:', e);
            toast.error('Could not save template locally');
        }

        setNewTemplateTitle('');
        setShowSaveModal(false);
    };

    // Delete custom template
    const handleDeleteTemplate = (id, name, e) => {
        e.stopPropagation();
        if (!window.confirm(`Delete template "${name}"?`)) return;

        const updated = savedTemplates.filter(t => t.id !== id);
        setSavedTemplates(updated);
        try {
            localStorage.setItem(`procurement_templates_${storageKey}`, JSON.stringify(updated));
            toast.success(`Template "${name}" deleted`);
        } catch (e) {
            console.error('Failed to delete template from localStorage:', e);
        }
    };

    // Load template
    const handleLoadTemplate = (tplContent) => {
        if (value.trim()) {
            const choice = window.confirm(
                'Do you want to REPLACE the existing editor content?\n\nClick "OK" to Replace, or "Cancel" to Append to the bottom.'
            );
            if (choice) {
                onChange(tplContent);
            } else {
                onChange(value + '\n\n' + tplContent);
            }
        } else {
            onChange(tplContent);
        }
        setShowTemplateMenu(false);
        toast.success('Template loaded into editor');
    };

    // Copy to clipboard
    const handleCopy = () => {
        if (!value) return;
        navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    // Clear editor
    const handleClear = () => {
        if (!value) return;
        if (window.confirm('Are you sure you want to clear the editor?')) {
            onChange('');
            toast.success('Editor cleared');
        }
    };

    // Metrics
    const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
    const charCount = value.length;

    return (
        <div className={`flex flex-wrap items-center justify-between gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs shadow-2xs ${className}`}>
            {/* Formatting Tools Group */}
            <div className="flex flex-wrap items-center gap-1">
                {/* Bold */}
                <button
                    type="button"
                    onClick={() => applyWrap('**', '**', 'bold text')}
                    title="Bold (**text**)"
                    className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                >
                    <Bold className="w-3.5 h-3.5" />
                </button>

                {/* Italic */}
                <button
                    type="button"
                    onClick={() => applyWrap('*', '*', 'italic text')}
                    title="Italic (*text*)"
                    className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                >
                    <Italic className="w-3.5 h-3.5" />
                </button>

                {/* Underline */}
                <button
                    type="button"
                    onClick={() => applyWrap('<u>', '</u>', 'underlined text')}
                    title="Underline (<u>text</u>)"
                    className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                >
                    <Underline className="w-3.5 h-3.5" />
                </button>

                {/* Strikethrough */}
                <button
                    type="button"
                    onClick={() => applyWrap('~~', '~~', 'strikethrough text')}
                    title="Strikethrough (~~text~~)"
                    className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                >
                    <Strikethrough className="w-3.5 h-3.5" />
                </button>

                <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-1" />

                {/* Heading 1 */}
                <button
                    type="button"
                    onClick={() => applyLinePrefix('# ')}
                    title="Heading 1 (# Title)"
                    className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                >
                    <Heading1 className="w-3.5 h-3.5" />
                </button>

                {/* Heading 2 */}
                <button
                    type="button"
                    onClick={() => applyLinePrefix('## ')}
                    title="Heading 2 (## Section)"
                    className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                >
                    <Heading2 className="w-3.5 h-3.5" />
                </button>

                {/* Heading 3 */}
                <button
                    type="button"
                    onClick={() => applyLinePrefix('### ')}
                    title="Heading 3 (### Sub-section)"
                    className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                >
                    <Heading3 className="w-3.5 h-3.5" />
                </button>

                <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-1" />

                {/* Bullet List */}
                <button
                    type="button"
                    onClick={() => applyLinePrefix('• ')}
                    title="Bullet List (• Item)"
                    className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                >
                    <List className="w-3.5 h-3.5" />
                </button>

                {/* Numbered List */}
                <button
                    type="button"
                    onClick={() => applyLinePrefix('1. ')}
                    title="Numbered List (1. Item)"
                    className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                >
                    <ListOrdered className="w-3.5 h-3.5" />
                </button>

                {/* Blockquote */}
                <button
                    type="button"
                    onClick={() => applyLinePrefix('> ')}
                    title="Blockquote (> Quote)"
                    className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                >
                    <Quote className="w-3.5 h-3.5" />
                </button>

                {/* Divider Line */}
                <button
                    type="button"
                    onClick={() => insertAtCursor('\n\n---\n\n')}
                    title="Insert Horizontal Divider (---)"
                    className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                >
                    <Minus className="w-3.5 h-3.5" />
                </button>

                {/* Table Template */}
                <button
                    type="button"
                    onClick={() => insertAtCursor('\n| Sr. No. | Item Description | Specifications | Qty | Remarks |\n|---|---|---|---|---|\n| 1. | Sample Equipment | Standard OEM Specs | 1 | Operational |\n')}
                    title="Insert Formatted Table"
                    className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition flex items-center gap-1 text-[11px] font-semibold"
                >
                    <Table className="w-3.5 h-3.5" /> Table
                </button>
            </div>

            {/* Right Group: Variables, Templates, & Utilities */}
            <div className="flex flex-wrap items-center gap-1.5">
                {/* Dynamic Variables Inserter Dropdown */}
                {variables.length > 0 && (
                    <div className="relative" ref={variableMenuRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setShowVariableMenu(!showVariableMenu);
                                setShowTemplateMenu(false);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition font-medium text-[11px]"
                        >
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>Variables</span>
                            <ChevronDown className="w-3 h-3 opacity-60" />
                        </button>

                        {showVariableMenu && (
                            <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 p-1.5 text-xs">
                                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Insert Dynamic Variable
                                </div>
                                <div className="space-y-0.5 max-h-56 overflow-y-auto">
                                    {variables.map((v, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                insertAtCursor(v.value);
                                                setShowVariableMenu(false);
                                                toast.success(`Inserted "${v.label}"`);
                                            }}
                                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 flex items-center justify-between transition group"
                                        >
                                            <span className="font-medium group-hover:text-amber-700 dark:group-hover:text-amber-400 truncate">{v.label}</span>
                                            <span className="text-[10px] text-slate-400 truncate ml-2 max-w-[90px]">{v.hint || v.value}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Templates Dropdown Button */}
                <div className="relative" ref={templateMenuRef}>
                    <button
                        type="button"
                        onClick={() => {
                            setShowTemplateMenu(!showTemplateMenu);
                            setShowVariableMenu(false);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition font-semibold text-[11px]"
                    >
                        <Bookmark className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        <span>Templates</span>
                        <ChevronDown className="w-3 h-3 opacity-60" />
                    </button>

                    {showTemplateMenu && (
                        <div className="absolute right-0 top-full mt-1.5 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 p-2 text-xs">
                            {/* Save Draft as Template Action */}
                            <button
                                type="button"
                                onClick={() => {
                                    setShowTemplateMenu(false);
                                    setShowSaveModal(true);
                                }}
                                disabled={!value.trim()}
                                className="w-full mb-2 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold flex items-center justify-center gap-1.5 transition shadow-xs text-xs"
                            >
                                <BookmarkPlus className="w-3.5 h-3.5" /> Save Current Text as Template
                            </button>

                            {/* Section: Custom Saved Templates */}
                            {savedTemplates.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                        <span>My Saved Templates ({savedTemplates.length})</span>
                                    </div>
                                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                        {savedTemplates.map(tpl => (
                                            <div
                                                key={tpl.id}
                                                onClick={() => handleLoadTemplate(tpl.content)}
                                                className="group flex items-center justify-between p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                                                        {tpl.name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        Saved on {tpl.createdAt}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDeleteTemplate(tpl.id, tpl.name, e)}
                                                    title="Delete Template"
                                                    className="p-1 text-slate-400 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Section: Built-in Templates */}
                            {defaultTemplates.length > 0 && (
                                <div>
                                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 dark:border-slate-800 pt-2">
                                        Standard Institutional Templates
                                    </div>
                                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                        {defaultTemplates.map((tpl, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => handleLoadTemplate(tpl.content)}
                                                className="group p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
                                            >
                                                <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center gap-1.5">
                                                    <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                    <span className="truncate">{tpl.title || tpl.name}</span>
                                                </div>
                                                {tpl.description && (
                                                    <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                                                        {tpl.description}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Copy Button */}
                <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!value}
                    title="Copy full text to clipboard"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition disabled:opacity-30"
                >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {/* Clear Button */}
                <button
                    type="button"
                    onClick={handleClear}
                    disabled={!value}
                    title="Clear editor text"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition disabled:opacity-30"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Character/Word Counter Pill */}
                <div className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700/70 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                    {wordCount}w / {charCount}c
                </div>
            </div>

            {/* Save Template Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 text-sm">
                                <BookmarkPlus className="w-4 h-4 text-indigo-600" />
                                <span>Save As Reusable Template</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSaveModal(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                                Template Title / Name *
                            </label>
                            <input
                                type="text"
                                className="input text-xs w-full"
                                placeholder="e.g. Science Lab Requisition 2026-27"
                                value={newTemplateTitle}
                                onChange={e => setNewTemplateTitle(e.target.value)}
                                autoFocus
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveTemplate();
                                    }
                                }}
                            />
                            <p className="text-[10px] text-slate-400 mt-1">
                                This will be saved locally in your browser and accessible anytime from the Templates menu.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
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
                                className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                            >
                                <Check className="w-3.5 h-3.5" /> Save Template
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
