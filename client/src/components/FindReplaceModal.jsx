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
    CheckCheck
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
    const [matchCase, setMatchCase] = useState(false);
    const [matchWholeWord, setMatchWholeWord] = useState(false);
    const [useRegex, setUseRegex] = useState(false);

    const [matches, setMatches] = useState([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

    // Draggable position state (default centered)
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const modalRef = useRef(null);
    const findInputRef = useRef(null);

    // Center the dialog upon opening
    useEffect(() => {
        if (isOpen) {
            const width = 420;
            const height = 230;
            const initialX = Math.max(20, Math.floor((window.innerWidth - width) / 2));
            const initialY = Math.max(40, Math.floor((window.innerHeight - height) / 2));
            setPosition({ x: initialX, y: initialY });

            // If text is selected in Monaco editor, populate findText
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

    // Perform Search in Monaco Editor Buffer
    const performSearch = (searchText = findText) => {
        if (!editorRef?.current || !searchText) {
            setMatches([]);
            setCurrentMatchIndex(-1);
            return [];
        }

        const editor = editorRef.current;
        const model = editor.getModel();
        if (!model) return [];

        try {
            const results = model.findMatches(
                searchText,
                true, // searchOnlyEditableRange
                useRegex,
                matchCase,
                matchWholeWord ? 'word' : null,
                false // captureMatches
            );

            setMatches(results || []);

            if (results && results.length > 0) {
                // Find closest match to current cursor
                const curPos = editor.getPosition();
                let nextIdx = 0;
                if (curPos) {
                    const found = results.findIndex(
                        (m) => m.range.startLineNumber >= curPos.lineNumber && m.range.startColumn >= curPos.column
                    );
                    if (found !== -1) nextIdx = found;
                }
                setCurrentMatchIndex(nextIdx);
                highlightMatch(results[nextIdx]);
            } else {
                setCurrentMatchIndex(-1);
            }
            return results || [];
        } catch (err) {
            console.warn('[FindReplace] Search error:', err.message);
            return [];
        }
    };

    // Re-run search whenever query or options change
    useEffect(() => {
        if (isOpen) {
            performSearch(findText);
        }
    }, [findText, matchCase, matchWholeWord, useRegex, isOpen]);

    const highlightMatch = (match) => {
        if (!editorRef?.current || !match) return;
        const editor = editorRef.current;
        editor.setSelection(match.range);
        editor.revealRangeInCenter(match.range);
    };

    const handleNext = () => {
        if (matches.length === 0) return;
        const nextIdx = (currentMatchIndex + 1) % matches.length;
        setCurrentMatchIndex(nextIdx);
        highlightMatch(matches[nextIdx]);
    };

    const handlePrev = () => {
        if (matches.length === 0) return;
        const prevIdx = (currentMatchIndex - 1 + matches.length) % matches.length;
        setCurrentMatchIndex(prevIdx);
        highlightMatch(matches[prevIdx]);
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

        // Re-run search to update match count and select next
        const remaining = performSearch(findText);
        toast.success('Replaced 1 occurrence', { id: 'rep-single', duration: 1500 });
    };

    const handleReplaceAll = () => {
        if (!editorRef?.current || matches.length === 0) {
            toast.error('No matches to replace');
            return;
        }

        const editor = editorRef.current;
        const count = matches.length;

        // Perform replace on all ranges in reverse order so character offsets remain valid
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
        toast.success(`Replaced ${count} ${count === 1 ? 'occurrence' : 'occurrences'}!`);
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
            const newX = Math.max(10, Math.min(window.innerWidth - 420, e.clientX - dragOffsetRef.current.x));
            const newY = Math.max(10, Math.min(window.innerHeight - 200, e.clientY - dragOffsetRef.current.y));
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
            className={`w-[420px] rounded-xl shadow-2xl border-2 border-black overflow-hidden select-none animate-in fade-in zoom-in-95 duration-100 ${
                isLightMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'
            }`}
        >
            {/* Header (Draggable Handle) */}
            <div
                onMouseDown={handleMouseDown}
                className={`flex items-center justify-between px-3.5 py-2.5 cursor-move border-b ${
                    isLightMode
                        ? 'bg-slate-100 border-slate-300'
                        : 'bg-slate-950 border-slate-800'
                }`}
            >
                <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold tracking-wide">Find and Replace</span>
                    {findText && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold">
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
                            className={`w-full pl-2.5 pr-20 py-1.5 rounded-lg text-xs font-mono border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                                isLightMode
                                    ? 'bg-slate-50 border-slate-300 text-slate-900'
                                    : 'bg-slate-950 border-slate-700 text-slate-100'
                            }`}
                        />
                        {/* Option Toggles inside Find Input */}
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                            <button
                                type="button"
                                onClick={() => setMatchCase(!matchCase)}
                                className={`p-1 rounded text-[10px] font-bold transition cursor-pointer ${
                                    matchCase
                                        ? 'bg-amber-500 text-slate-950'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                                title="Match Case (Alt+C)"
                            >
                                <CaseSensitive className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setMatchWholeWord(!matchWholeWord)}
                                className={`p-1 rounded text-[10px] font-bold transition cursor-pointer ${
                                    matchWholeWord
                                        ? 'bg-amber-500 text-slate-950'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                                title="Match Whole Word (Alt+W)"
                            >
                                <WholeWord className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setUseRegex(!useRegex)}
                                className={`p-1 rounded text-[10px] font-bold transition cursor-pointer ${
                                    useRegex
                                        ? 'bg-amber-500 text-slate-950'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                                title="Use Regular Expression (Alt+R)"
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

                {/* Replace Row */}
                <div className="flex items-center gap-2">
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
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition disabled:opacity-40 cursor-pointer shadow-xs"
                            title="Replace Current Match"
                        >
                            Replace
                        </button>
                        <button
                            type="button"
                            onClick={handleReplaceAll}
                            disabled={matches.length === 0}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition disabled:opacity-40 cursor-pointer shadow-xs"
                            title="Replace All Occurrences"
                        >
                            All
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer hint */}
            <div className={`px-3 py-1.5 border-t text-[10px] flex items-center justify-between text-slate-400 font-mono ${
                isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
            }`}>
                <span>Enter: Next • Shift+Enter: Prev</span>
                <span className="font-semibold text-slate-500">Draggable • Black Border</span>
            </div>
        </div>
    );
}
