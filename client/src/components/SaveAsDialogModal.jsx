'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Save,
    X,
    FileCode,
    Folder,
    FolderOpen,
    AlertCircle,
    Check,
    ChevronDown,
    FileSpreadsheet,
    Terminal,
    Database,
    Tag,
    Clock
} from 'lucide-react';

export default function SaveAsDialogModal({
    isOpen,
    onClose,
    onSave,
    currentFileName = '',
    currentLanguage = 'python',
    currentTitle = '',
    currentDescription = '',
    studentIdentifier = 'student',
    availableFolders = [],
    existingDocs = [],
    lastAutosavedAt = null
}) {
    const [fileNameWithoutExt, setFileNameWithoutExt] = useState('');
    const [fileType, setFileType] = useState(currentLanguage === 'sql' ? 'sql' : 'python');
    const [targetFolder, setTargetFolder] = useState(currentLanguage === 'sql' ? 'SQL' : 'Python');
    const [problemTitle, setProblemTitle] = useState('');
    const [problemDescription, setProblemDescription] = useState('');
    const [titleError, setTitleError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const inputRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        const defaultLang = currentLanguage === 'sql' ? 'sql' : 'python';
        setFileType(defaultLang);
        setTargetFolder(defaultLang === 'sql' ? 'SQL' : 'Python');
        setProblemTitle(currentTitle || '');
        setProblemDescription(currentDescription || '');
        setTitleError('');

        const dateStr = new Date().toISOString().split('T')[0];
        let defaultBase = `${studentIdentifier}_${dateStr}`;
        const targetExt = defaultLang === 'sql' ? 'sql' : 'py';

        // Auto-increment default filename if `<studentId>_<date>.<ext>` already exists
        const safeDocs = Array.isArray(existingDocs) ? existingDocs : [];
        let counter = 1;
        let candidateName = `${defaultBase}.${targetExt}`;
        while (safeDocs.some(d => (d.name || d.fileName || '').toLowerCase() === candidateName.toLowerCase())) {
            candidateName = `${defaultBase}_${counter}.${targetExt}`;
            counter++;
        }
        if (counter > 1) {
            defaultBase = `${defaultBase}_${counter - 1}`;
        }

        if (currentFileName) {
            // Strip .py or .sql if already present
            const stripped = currentFileName.replace(/\.(py|sql)$/i, '');
            setFileNameWithoutExt(stripped || defaultBase);
        } else {
            setFileNameWithoutExt(defaultBase);
        }

        // Auto-focus input on open
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.select();
            }
        }, 100);
    }, [isOpen, currentFileName, currentLanguage, currentTitle, currentDescription, studentIdentifier, existingDocs]);

    if (!isOpen) return null;

    const extension = fileType === 'sql' ? 'sql' : 'py';
    const cleanProposedName = (fileNameWithoutExt || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const fullProposedFileName = `${cleanProposedName}.${extension}`;

    // Duplicate check in existing documents for this folder (excluding the current tab's active file if overwriting)
    const safeDocs = Array.isArray(existingDocs) ? existingDocs : [];
    const isDuplicate = safeDocs.some((d) => {
        const dName = (d.name || d.fileName || '').toLowerCase();
        if (currentFileName && currentFileName.toLowerCase() === fullProposedFileName.toLowerCase()) {
            return false;
        }
        return dName === fullProposedFileName.toLowerCase();
    });

    const handleTypeChange = (newType) => {
        setFileType(newType);
        // Automatically align suggested folder if currently on the standard folder
        if (targetFolder === 'Python' || targetFolder === 'SQL') {
            setTargetFolder(newType === 'sql' ? 'SQL' : 'Python');
        }
    };

    const handleFormSubmit = async (e) => {
        if (e) e.preventDefault();

        const cleanTitle = problemTitle.trim();
        if (!cleanTitle) {
            setTitleError('Problem Title is mandatory before saving.');
            return;
        }

        if (isDuplicate) {
            setTitleError(`A file named "${fullProposedFileName}" already exists in the ${targetFolder} folder. Please choose a unique name.`);
            return;
        }

        const cleanName = (fileNameWithoutExt || `${studentIdentifier}_${new Date().toISOString().split('T')[0]}`)
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .trim();

        const finalFileName = `${cleanName}.${extension}`;

        setIsSaving(true);
        try {
            await onSave({
                fileName: finalFileName,
                folderName: targetFolder,
                language: fileType,
                problemTitle: cleanTitle,
                problemDescription: problemDescription.trim()
            });
            onClose();
        } catch (err) {
            console.error('Save error:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl text-slate-100 overflow-hidden flex flex-col">
                {/* Traditional Window Title Bar */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <Save className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                <span>Save As</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                                    Cloud Documents
                                </span>
                            </h2>
                            <p className="text-[11px] text-slate-400">
                                Save code and associate problem metadata to your repository
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
                        title="Cancel"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
                    {/* Last Autosaved Datetime Indicator */}
                    {lastAutosavedAt && (
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Current code last autosaved:</span>
                            <span className="text-emerald-400 font-medium flex items-center gap-1 font-mono">
                                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                                {new Date(lastAutosavedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(lastAutosavedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        </div>
                    )}

                    {/* Destination Folder Row */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                            <Folder className="w-3.5 h-3.5 text-amber-400" />
                            <span>Destination Folder</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setTargetFolder('Python')}
                                className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-2 transition ${
                                    targetFolder === 'Python'
                                        ? 'bg-amber-950/50 border-amber-500/70 text-amber-200'
                                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                                }`}
                            >
                                <Terminal className="w-4 h-4 text-amber-400 shrink-0" />
                                <span className="truncate">📁 Python Folder</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setTargetFolder('SQL')}
                                className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-2 transition ${
                                    targetFolder === 'SQL'
                                        ? 'bg-sky-950/50 border-sky-500/70 text-sky-200'
                                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                                }`}
                            >
                                <Database className="w-4 h-4 text-sky-400 shrink-0" />
                                <span className="truncate">📁 SQL Folder</span>
                            </button>
                        </div>
                    </div>

                    {/* File Name Field */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                                <span>File Name</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                                Default: &lt;studentId&gt;_&lt;date&gt;
                            </span>
                        </label>
                        <div className={`flex items-center rounded-xl border ${isDuplicate ? 'border-rose-500' : 'border-slate-700'} bg-slate-800/90 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 overflow-hidden`}>
                            <input
                                ref={inputRef}
                                type="text"
                                value={fileNameWithoutExt}
                                onChange={(e) => setFileNameWithoutExt(e.target.value)}
                                placeholder="filename_example"
                                className="flex-1 px-3.5 py-2.5 text-sm bg-transparent text-white placeholder-slate-500 focus:outline-hidden font-mono"
                                required
                            />
                            <div className="px-3 py-2 bg-slate-800 text-xs font-mono font-bold text-emerald-400 border-l border-slate-700 shrink-0 select-none">
                                .{extension}
                            </div>
                        </div>
                        {isDuplicate && (
                            <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>A file named "{fullProposedFileName}" already exists in the {targetFolder} folder.</span>
                            </p>
                        )}
                    </div>

                    {/* Save as Type Dropdown */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Save as type:
                        </label>
                        <div className="relative">
                            <select
                                value={fileType}
                                onChange={(e) => handleTypeChange(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-800/90 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500 transition appearance-none cursor-pointer font-medium"
                            >
                                <option value="python">Python Script (*.py)</option>
                                <option value="sql">SQL Query Script (*.sql)</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    {/* Problem Title (MANDATORY) */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5 text-rose-400" />
                                <span>Problem Title</span>
                                <span className="text-rose-400 font-bold">*</span>
                            </span>
                            <span className="text-[10px] text-rose-300 bg-rose-950/60 border border-rose-800/50 px-1.5 py-0.2 rounded">
                                Mandatory
                            </span>
                        </label>
                        <input
                            type="text"
                            value={problemTitle}
                            onChange={(e) => {
                                setProblemTitle(e.target.value);
                                if (titleError) setTitleError('');
                            }}
                            placeholder="e.g. Factorial of N, Student Records Query"
                            className={`w-full px-3.5 py-2 rounded-xl text-xs bg-slate-800/90 border ${
                                titleError ? 'border-rose-500' : 'border-slate-700'
                            } text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition`}
                        />
                        {titleError && (
                            <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                <span>{titleError}</span>
                            </p>
                        )}
                    </div>

                    {/* Problem Description (Optional) */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Description / Objectives (Optional)
                        </label>
                        <textarea
                            rows={2}
                            value={problemDescription}
                            onChange={(e) => setProblemDescription(e.target.value)}
                            placeholder="Briefly state the goal of this exercise or query..."
                            className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition resize-none"
                        />
                    </div>

                    {/* Footer Buttons */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || isDuplicate || !fileNameWithoutExt.trim()}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-700/30 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    <span>Saving to Documents...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Save</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
