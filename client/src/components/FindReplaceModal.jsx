'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Search,
    Replace,
    ChevronDown,
    ChevronUp,
    X,
    CaseSensitive,
    WholeWord,
    Regex,
    Check,
    CheckCheck,
    Sparkles,
    Move
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function FindReplaceModal({
    isOpen,
    onClose,
    editorRef,
    onCodeChange,
    isLightMode = false
}) {
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [ignoreCase, setIgnoreCase] = useState(true); // true = case-insensitive, false = case-sensitive
    const [exactMatch, setExactMatch] = useState(false); // false = partial/substring match allowed, true = whole-word only
    const [useRegex, setUseRegex] = useState(false);
    const [findInSelection, setFindInSelection] = useState(false);

    const [matches, setMatches] = useState([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

    // Draggable position state (default centered)
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const modalRef = useRef(null);
    const findInputRef = useRef(null);

    // Monaco decorations ref for real-time highlighting
    const decorationsRef = useRef([]);

    // Center the dialog upon opening and populate selected text if any
    useEffect(() => {
        if (isOpen) {
            const width = 430;
            const height = 260;
            const initialX = Math.max(20, Math.floor((window.innerWidth - width) / 2));
            const initialY = Math.max(40, Math.floor((window.innerHeight - height) / 2));
            setPosition({ x: initialX, y: initialY });

            if (editorRef?.current) {
                const editor = editorRef.current;
                const selection = editor.getSelection();
                if (selection && !selection.isEmpty()) {
                    const selectedStr = editor.getModel()?.getValueInRange(selection) || '';
                    if (selectedStr && !selectedStr.includes('\n')) {
                        setFindText(selectedStr);
                    }
                }
            }

            setTimeout(() => {
                findInputRef.current?.focus();
                findInputRef.current?.select();
            }, 50);
        }
    }, [isOpen, editorRef]);

    // Cleanup Monaco decorations when modal closes or unmounts
    const clearMonacoDecorations = () => {
        if (editorRef?.current && decorationsRef.current.length > 0) {
            editorRef.current.deltaDecorations(decorationsRef.current, []);
            decorationsRef.current = [];
        }
    };

    useEffect(() => {
        if (!isOpen) {
            clearMonacoDecorations();
        }
        return () => clearMonacoDecorations();
    }, [isOpen]);

    // Apply Real-time Highlighting to Monaco Editor Buffer
    const updateDecorations = (resultsList, activeIdx) => {
        if (!editorRef?.current) return;
        const editor = editorRef.current;

        const newDecorations = (resultsList || []).map((m, idx) => {
            const isActive = idx === activeIdx;
            return {
                range: m.range,
                options: {
                    className: isActive ? 'monaco-find-active-match' : 'monaco-find-match',
                    inlineClassName: isActive ? 'monaco-find-active-match-inline' : 'monaco-find-match-inline',
                    overviewRuler: {
                        color: isActive ? '#f59e0b' : '#fbbf24',
                        position: 4 // Full lane
                    },
                    minimap: {
                        color: isActive ? '#f59e0b' : '#fbbf24',
                        position: 1
                    }
                }
            };
        });

        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
    };

    // Perform Search in Monaco Editor Buffer
    const performSearch = (searchText = findText, preferredActiveIndex = null) => {
        if (!editorRef?.current || !searchText) {
            setMatches([]);
            setCurrentMatchIndex(-1);
            clearMonacoDecorations();
            return [];
        }

        const editor = editorRef.current;
        const model = editor.getModel();
        if (!model) return [];

        try {
            // If findInSelection is enabled, limit range
            let searchRange = null;
            if (findInSelection) {
                const sel = editor.getSelection();
                if (sel && !sel.isEmpty()) searchRange = sel;
            }

            const WORD_SEPARATORS = "`~!@#$%^&*()-=+[{]}\\|;:'\",.<>/? \t\r\n";
            const results = model.findMatches(
                searchText,
                searchRange || true,
                useRegex,
                !ignoreCase,
                exactMatch ? WORD_SEPARATORS : null,
                false
            );

            setMatches(results || []);

            if (results && results.length > 0) {
                let nextIdx = 0;
                if (preferredActiveIndex !== null && preferredActiveIndex >= 0 && preferredActiveIndex < results.length) {
                    nextIdx = preferredActiveIndex;
                } else {
                    const curPos = editor.getPosition();
                    if (curPos) {
                        const found = results.findIndex(
                            (m) => m.range.startLineNumber >= curPos.lineNumber && m.range.startColumn >= curPos.column
                        );
                        if (found !== -1) nextIdx = found;
                    }
                }
                setCurrentMatchIndex(nextIdx);
                highlightAndRevealMatch(results[nextIdx], results, nextIdx);
            } else {
                setCurrentMatchIndex(-1);
                clearMonacoDecorations();
            }
            return results || [];
        } catch (err) {
            console.warn('[FindReplace] Search error:', err.message);
            setMatches([]);
            setCurrentMatchIndex(-1);
            clearMonacoDecorations();
            return [];
        }
    };

    // Re-run search whenever query or options change
    useEffect(() => {
        if (isOpen) {
            performSearch(findText);
        }
    }, [findText, ignoreCase, exactMatch, useRegex, findInSelection, isOpen]);

    const highlightAndRevealMatch = (match, resultsList = matches, idx = currentMatchIndex) => {
        if (!editorRef?.current || !match) return;
        const editor = editorRef.current;
        editor.setSelection(match.range);
        editor.revealRangeInCenter(match.range);
        updateDecorations(resultsList, idx);
    };

    const handleNext = () => {
        if (matches.length === 0) return;
        const nextIdx = (currentMatchIndex + 1) % matches.length;
        setCurrentMatchIndex(nextIdx);
        highlightAndRevealMatch(matches[nextIdx], matches, nextIdx);
    };

    const handlePrev = () => {
        if (matches.length === 0) return;
        const prevIdx = (currentMatchIndex - 1 + matches.length) % matches.length;
        setCurrentMatchIndex(prevIdx);
        highlightAndRevealMatch(matches[prevIdx], matches, prevIdx);
    };

    const handleReplace = () => {
        if (!editorRef?.current || matches.length === 0 || currentMatchIndex === -1) return;
        const editor = editorRef.current;
        const activeMatch = matches[currentMatchIndex];
        if (!activeMatch) return;

        editor.executeEdits('find-replace', [
            {
                range: activeMatch.range,
                text: replaceText,
                forceMoveMarkers: true
            }
        ]);

        if (onCodeChange) {
            onCodeChange(editor.getValue());
        }

        // Re-run search and preserve index
        performSearch(findText, currentMatchIndex);
        toast.success('Replaced 1 occurrence', { id: 'rep-single', duration: 1200 });
    };

    const handleReplaceAll = () => {
        if (!editorRef?.current || matches.length === 0) {
            toast.error('No matches to replace');
            return;
        }

        const editor = editorRef.current;
        const count = matches.length;

        // Reverse order so offsets remain valid
        const edits = [...matches].reverse().map((m) => ({
            range: m.range,
            text: replaceText,
            forceMoveMarkers: true
        }));

        editor.executeEdits('find-replace', edits);

        if (onCodeChange) {
            onCodeChange(editor.getValue());
        }

        performSearch(findText);
        toast.success(`Replaced ${count} ${count === 1 ? 'occurrence' : 'occurrences'}!`, { icon: '✨' });
    };

    // Drag handlers
    const handleMouseDown = (e) => {
        if (e.target.closest('input, button, select, label')) return;
        setIsDragging(true);
        dragOffsetRef.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            const newX = Math.max(10, Math.min(window.innerWidth - 430, e.clientX - dragOffsetRef.current.x));
            const newY = Math.max(10, Math.min(window.innerHeight - 220, e.clientY - dragOffsetRef.current.y));
            setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // Keyboard navigation (Enter = next, Shift+Enter = prev, Esc = close)
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                handlePrev();
            } else {
                handleNext();
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div
            ref={modalRef}
            style={{
                position: 'fixed',
                left: `${position.x}px`,
                top: `${position.y}px`,
                zIndex: 9999
            }}
            onKeyDown={handleKeyDown}
            className={`w-[430px] rounded-2xl shadow-2xl border-2 overflow-hidden select-none animate-in fade-in zoom-in-95 duration-100 ${
                isLightMode ? 'bg-white border-slate-300 text-slate-900 shadow-slate-900/20' : 'bg-slate-900 border-slate-700 text-slate-100 shadow-black/40'
            }`}
        >
            {/* Custom Monaco Match Highlight Styles */}
            <style jsx global>{`
                .monaco-find-match {
                    background-color: rgba(254, 240, 138, 0.45) !important;
                    border: 1px solid #eab308 !important;
                    border-radius: 2px !important;
                }
                .monaco-find-active-match {
                    background-color: #f59e0b !important;
                    color: #000000 !important;
                    border: 1px solid #b45309 !important;
                    border-radius: 2px !important;
                    box-shadow: 0 0 8px rgba(245, 158, 11, 0.9) !important;
                }
            `}</style>

            {/* Header (Draggable Handle) */}
            <div
                onMouseDown={handleMouseDown}
                className={`flex items-center justify-between px-4 py-2.5 cursor-move border-b ${
                    isLightMode
                        ? 'bg-slate-100 border-slate-200 text-slate-800'
                        : 'bg-slate-950 border-slate-800 text-slate-200'
                }`}
            >
                <div className="flex items-center gap-2">
                    <Move className="w-3.5 h-3.5 text-slate-400" />
                    <Search className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold tracking-wide">Find & Replace</span>
                    {findText && (
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                            matches.length > 0
                                ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
                                : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800'
                        }`}>
                            {matches.length > 0
                                ? `${currentMatchIndex + 1} of ${matches.length}`
                                : 'No matches'}
                        </span>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Close (Esc)"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content Body */}
            <div className="p-3.5 space-y-2.5">
                {/* Find Row */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <input
                            ref={findInputRef}
                            type="text"
                            value={findText}
                            onChange={(e) => setFindText(e.target.value)}
                            placeholder="Find..."
                            className={`w-full pl-2.5 pr-24 py-1.5 rounded-lg text-xs font-mono border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                                isLightMode
                                    ? 'bg-slate-50 border-slate-300 text-slate-900'
                                    : 'bg-slate-950 border-slate-700 text-slate-100'
                            }`}
                        />
                        {/* Option Toggles inside Find Input */}
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                            <button
                                type="button"
                                onClick={() => setIgnoreCase(!ignoreCase)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                    ignoreCase
                                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                                title={`Ignore Case (Alt+C): ${ignoreCase ? 'ON (Case-Insensitive)' : 'OFF (Case-Sensitive)'}`}
                            >
                                Aa
                            </button>
                            <button
                                type="button"
                                onClick={() => setExactMatch(!exactMatch)}
                                className={`p-1 rounded text-[10px] font-bold transition cursor-pointer ${
                                    exactMatch
                                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                                title={`Exact Match (Alt+W): ${exactMatch ? 'ON (Whole Word Only)' : 'OFF (Partial Matches Allowed)'}`}
                            >
                                <WholeWord className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setUseRegex(!useRegex)}
                                className={`p-1 rounded text-[10px] font-bold transition cursor-pointer ${
                                    useRegex
                                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                                title={`Use Regular Expression (Alt+R): ${useRegex ? 'ON' : 'OFF'}`}
                            >
                                <Regex className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Prev / Next Buttons */}
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={handlePrev}
                            disabled={matches.length === 0}
                            className={`p-1.5 rounded-lg border text-xs transition cursor-pointer disabled:opacity-40 ${
                                isLightMode
                                    ? 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'
                                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                            }`}
                            title="Previous Match (Shift+Enter)"
                        >
                            <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleNext}
                            disabled={matches.length === 0}
                            className={`p-1.5 rounded-lg border text-xs transition cursor-pointer disabled:opacity-40 ${
                                isLightMode
                                    ? 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'
                                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                            }`}
                            title="Next Match (Enter)"
                        >
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Explicit Search Options Checkboxes */}
                <div className="flex items-center justify-between text-xs px-0.5 pt-0.5">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-medium select-none hover:text-amber-600 dark:hover:text-amber-400 transition">
                            <input
                                type="checkbox"
                                checked={ignoreCase}
                                onChange={(e) => setIgnoreCase(e.target.checked)}
                                className="rounded text-amber-500 focus:ring-amber-400 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>Ignore Case</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-medium select-none hover:text-amber-600 dark:hover:text-amber-400 transition">
                            <input
                                type="checkbox"
                                checked={exactMatch}
                                onChange={(e) => setExactMatch(e.target.checked)}
                                className="rounded text-amber-500 focus:ring-amber-400 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>Exact Match</span>
                        </label>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400 font-medium select-none hover:text-amber-600 dark:hover:text-amber-400 transition">
                        <input
                            type="checkbox"
                            checked={findInSelection}
                            onChange={(e) => setFindInSelection(e.target.checked)}
                            className="rounded text-amber-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>In selection</span>
                    </label>
                </div>

                {/* Replace Row */}
                <div className="flex items-center gap-2 pt-0.5">
                    <input
                        type="text"
                        value={replaceText}
                        onChange={(e) => setReplaceText(e.target.value)}
                        placeholder="Replace with..."
                        className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-mono border focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                            isLightMode
                                ? 'bg-slate-50 border-slate-300 text-slate-900'
                                : 'bg-slate-950 border-slate-700 text-slate-100'
                        }`}
                    />

                    {/* Replace / Replace All Buttons */}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleReplace}
                            disabled={matches.length === 0}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition disabled:opacity-40 cursor-pointer shadow-xs"
                            title="Replace Current Match"
                        >
                            Replace
                        </button>
                        <button
                            type="button"
                            onClick={handleReplaceAll}
                            disabled={matches.length === 0}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition disabled:opacity-40 cursor-pointer shadow-xs"
                            title="Replace All Occurrences"
                        >
                            All
                        </button>
                    </div>
                </div>
            </div>

            {/* Clean Footer (Clean Shortcuts Hint Only, No Debug Clutter) */}
            <div className={`px-4 py-2 border-t text-[10px] font-mono flex items-center justify-between text-slate-400 ${
                isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
            }`}>
                <span>Enter ↵ Next • Shift+Enter ⇧↵ Prev</span>
                <span>Esc to Close</span>
            </div>
        </div>
    );
}
