'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import katex from 'katex';
import { 
    Pencil, 
    Eraser, 
    RotateCcw, 
    RotateCw, 
    Trash2, 
    Check, 
    X, 
    Sparkles, 
    Loader2, 
    Edit3, 
    Move, 
    Eye,
    HelpCircle
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

/**
 * Windows-style Math Input Tablet (Math Input Panel)
 * Allows handwriting mathematical formulas using mouse, pencil or stylus,
 * converts handwriting into standard LaTeX equations via AI Vision,
 * displays live KaTeX preview, and inserts directly onto the whiteboard canvas.
 */
export default function WhiteboardMathTablet({
    isOpen,
    onClose,
    onInsert,
    initialLatex = ''
}) {
    // Window position & drag
    const [position, setPosition] = useState({ x: 120, y: 80 });
    const isDraggingRef = useRef(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    // Inking tools & strokes
    const [tool, setTool] = useState('write'); // 'write' | 'erase'
    const [strokes, setStrokes] = useState([]); // Array of Array<{x, y, pressure}>
    const [redoHistory, setRedoHistory] = useState([]);
    const currentStrokeRef = useRef(null);

    // Recognition & LaTeX
    const [recognizedLatex, setRecognizedLatex] = useState(initialLatex || '');
    const [editableLatex, setEditableLatex] = useState(initialLatex || '');
    const [isEditingLatex, setIsEditingLatex] = useState(false);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [provider, setProvider] = useState('gemini');
    const debounceTimerRef = useRef(null);
    const abortControllerRef = useRef(null);

    // Canvas references
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    // Center window initially
    useEffect(() => {
        if (isOpen && typeof window !== 'undefined') {
            const width = 640;
            const height = 480;
            const x = Math.max(20, Math.round((window.innerWidth - width) / 2));
            const y = Math.max(40, Math.round((window.innerHeight - height) / 2 - 40));
            setPosition({ x, y });
        }
    }, [isOpen]);

    // Dragging window logic
    const handleTitlePointerDown = (e) => {
        if (e.target.closest('button')) return;
        isDraggingRef.current = true;
        dragOffsetRef.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        e.currentTarget.setPointerCapture?.(e.pointerId);
    };

    const handleTitlePointerMove = (e) => {
        if (!isDraggingRef.current) return;
        const newX = Math.max(10, Math.min(window.innerWidth - 300, e.clientX - dragOffsetRef.current.x));
        const newY = Math.max(10, Math.min(window.innerHeight - 100, e.clientY - dragOffsetRef.current.y));
        setPosition({ x: newX, y: newY });
    };

    const handleTitlePointerUp = (e) => {
        isDraggingRef.current = false;
        try {
            e.currentTarget.releasePointerCapture?.(e.pointerId);
        } catch (_) {}
    };

    // Redraw the canvas
    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;

        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // 1. Clear & draw classic Windows Math Input Panel lined graph paper background
        ctx.fillStyle = '#fefdfa'; // Soft cream paper
        ctx.fillRect(0, 0, width, height);

        // Grid lines (subtle yellow/grey grid)
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#f1ebe0';
        const gridSize = 20;

        ctx.beginPath();
        for (let x = gridSize; x < width; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = gridSize; y < height; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();

        // Baseline guideline (subtle rose/blue ruled line in the middle)
        ctx.strokeStyle = '#e2d7c5';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(0, Math.round(height / 2));
        ctx.lineTo(width, Math.round(height / 2));
        ctx.stroke();
        ctx.setLineDash([]);

        // Watermark placeholder when empty
        if (strokes.length === 0 && (!currentStrokeRef.current || currentStrokeRef.current.length === 0)) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '500 15px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Write math expression here with pencil or stylus', width / 2, height / 2 - 10);
            ctx.font = '400 12px system-ui, sans-serif';
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText('e.g. fractions, exponents, square roots, integrals, equations', width / 2, height / 2 + 15);
        }

        // 2. Draw all finalized strokes
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#0f172a'; // Deep slate ink

        const drawStrokePoints = (points) => {
            if (!points || points.length === 0) return;
            if (points.length === 1) {
                ctx.beginPath();
                ctx.arc(points[0].x, points[0].y, 2, 0, Math.PI * 2);
                ctx.fill();
                return;
            }

            ctx.beginPath();
            ctx.lineWidth = 3.2;
            ctx.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < points.length - 1; i++) {
                const xc = (points[i].x + points[i + 1].x) / 2;
                const yc = (points[i].y + points[i + 1].y) / 2;
                ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }

            const last = points[points.length - 1];
            ctx.lineTo(last.x, last.y);
            ctx.stroke();
        };

        strokes.forEach(s => drawStrokePoints(s));

        // Draw active in-progress stroke
        if (currentStrokeRef.current && currentStrokeRef.current.length > 0) {
            drawStrokePoints(currentStrokeRef.current);
        }

        ctx.restore();
    }, [strokes]);

    // Resize canvas to match display size with DPR
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = 590;
        const displayHeight = 240;

        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        redrawCanvas();
    }, [isOpen, redrawCanvas]);

    // Perform AI Vision recognition from drawn canvas
    const triggerRecognition = useCallback(async (currentStrokesList) => {
        const activeStrokes = currentStrokesList || strokes;
        if (!activeStrokes || activeStrokes.length === 0) {
            setRecognizedLatex('');
            setEditableLatex('');
            return;
        }

        // Cancel pending request if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        // Render black ink on pure white background for optimal OCR recognition
        const offscreen = document.createElement('canvas');
        offscreen.width = 600;
        offscreen.height = 240;
        const octx = offscreen.getContext('2d');
        octx.fillStyle = '#ffffff';
        octx.fillRect(0, 0, 600, 240);

        octx.lineCap = 'round';
        octx.lineJoin = 'round';
        octx.strokeStyle = '#000000';
        octx.lineWidth = 4;

        activeStrokes.forEach(points => {
            if (!points || points.length === 0) return;
            if (points.length === 1) {
                octx.beginPath();
                octx.arc(points[0].x, points[0].y, 2.5, 0, Math.PI * 2);
                octx.fill();
                return;
            }
            octx.beginPath();
            octx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length - 1; i++) {
                const xc = (points[i].x + points[i + 1].x) / 2;
                const yc = (points[i].y + points[i + 1].y) / 2;
                octx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }
            const last = points[points.length - 1];
            octx.lineTo(last.x, last.y);
            octx.stroke();
        });

        const dataUrl = offscreen.toDataURL('image/png');

        setIsRecognizing(true);
        try {
            const res = await api.post('/ai/recognize-math', {
                image: dataUrl,
                provider
            }, {
                signal: abortControllerRef.current.signal
            });

            if (res.data?.success && res.data?.data?.latex !== undefined) {
                const result = res.data.data.latex.trim();
                setRecognizedLatex(result);
                setEditableLatex(result);
            }
        } catch (err) {
            if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
                console.warn('[MathTablet] Recognition notice:', err.message);
            }
        } finally {
            setIsRecognizing(false);
        }
    }, [strokes, provider]);

    // Schedule debounced auto-recognition after writing stops
    const scheduleAutoRecognition = useCallback((updatedStrokes) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            triggerRecognition(updatedStrokes);
        }, 1100);
    }, [triggerRecognition]);

    // Pointer event coordinates relative to canvas
    const getCanvasCoords = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            pressure: e.pressure || 0.5
        };
    };

    // Erase stroke hit-test
    const eraseNear = (point) => {
        const threshold = 18;
        const newStrokes = strokes.filter(strokePoints => {
            return !strokePoints.some(pt => {
                const dx = pt.x - point.x;
                const dy = pt.y - point.y;
                return Math.sqrt(dx * dx + dy * dy) < threshold;
            });
        });

        if (newStrokes.length !== strokes.length) {
            setStrokes(newStrokes);
            setRedoHistory([]);
            scheduleAutoRecognition(newStrokes);
        }
    };

    // Canvas Pointer Handlers
    const handlePointerDown = (e) => {
        e.preventDefault();
        const pt = getCanvasCoords(e);
        e.currentTarget.setPointerCapture?.(e.pointerId);

        if (tool === 'erase') {
            eraseNear(pt);
            return;
        }

        currentStrokeRef.current = [pt];
        redrawCanvas();
    };

    const handlePointerMove = (e) => {
        if (tool === 'erase') {
            if (e.buttons > 0) {
                const pt = getCanvasCoords(e);
                eraseNear(pt);
            }
            return;
        }

        if (!currentStrokeRef.current) return;
        const pt = getCanvasCoords(e);
        currentStrokeRef.current.push(pt);
        redrawCanvas();
    };

    const handlePointerUp = (e) => {
        try {
            e.currentTarget.releasePointerCapture?.(e.pointerId);
        } catch (_) {}

        if (tool === 'erase') return;

        if (currentStrokeRef.current && currentStrokeRef.current.length > 0) {
            const nextStrokes = [...strokes, currentStrokeRef.current];
            setStrokes(nextStrokes);
            setRedoHistory([]);
            currentStrokeRef.current = null;
            redrawCanvas();
            scheduleAutoRecognition(nextStrokes);
        }
    };

    // Undo / Redo / Clear
    const handleUndo = () => {
        if (strokes.length === 0) return;
        const last = strokes[strokes.length - 1];
        const nextStrokes = strokes.slice(0, -1);
        setStrokes(nextStrokes);
        setRedoHistory(prev => [last, ...prev]);
        scheduleAutoRecognition(nextStrokes);
    };

    const handleRedo = () => {
        if (redoHistory.length === 0) return;
        const [first, ...rest] = redoHistory;
        const nextStrokes = [...strokes, first];
        setStrokes(nextStrokes);
        setRedoHistory(rest);
        scheduleAutoRecognition(nextStrokes);
    };

    const handleClear = () => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        if (abortControllerRef.current) abortControllerRef.current.abort();
        setStrokes([]);
        setRedoHistory([]);
        currentStrokeRef.current = null;
        setRecognizedLatex('');
        setEditableLatex('');
        setIsRecognizing(false);
    };

    // Insert into whiteboard
    const handleInsert = () => {
        const finalLatex = (isEditingLatex ? editableLatex : recognizedLatex).trim();
        if (!finalLatex) {
            toast.error('Please write an equation first');
            return;
        }
        if (onInsert) {
            onInsert(finalLatex);
        }
        toast.success('Inserted math equation!', { icon: '📐' });
        onClose();
    };

    if (!isOpen) return null;

    // Rendered KaTeX string for preview
    const activeFormula = isEditingLatex ? editableLatex : recognizedLatex;
    let katexHtml = '';
    let katexError = null;
    if (activeFormula) {
        try {
            katexHtml = katex.renderToString(activeFormula, {
                displayMode: true,
                throwOnError: false
            });
        } catch (err) {
            katexError = err.message;
        }
    }

    return (
        <div 
            ref={containerRef}
            className="fixed z-[130] bg-slate-900 border-2 border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 select-none text-slate-200"
            style={{ 
                left: `${position.x}px`, 
                top: `${position.y}px`, 
                width: '630px',
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)'
            }}
        >
            {/* Header / Title Bar (Windows MIP Style) */}
            <div 
                className="bg-slate-800/90 px-3.5 py-2 flex items-center justify-between border-b border-slate-700/70 cursor-move text-slate-200"
                onPointerDown={handleTitlePointerDown}
                onPointerMove={handleTitlePointerMove}
                onPointerUp={handleTitlePointerUp}
            >
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-serif font-bold text-xs">
                        Σ
                    </div>
                    <span className="font-semibold text-xs tracking-wide text-white">Math Input Tablet</span>
                    <span className="text-[10px] text-slate-400 bg-slate-700/60 px-1.5 py-0.5 rounded font-mono">Windows MIP</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button 
                        onClick={onClose}
                        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/70 transition"
                        title="Close Tablet"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Live KaTeX Recognition Ribbon */}
            <div className="bg-slate-950/80 px-4 py-2.5 border-b border-slate-800 flex flex-col gap-1.5 min-h-[70px]">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5 font-medium">
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Equation Preview</span>
                        {isRecognizing && (
                            <span className="flex items-center gap-1 text-indigo-400 ml-2 animate-pulse text-[10px]">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Recognizing handwriting...
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {activeFormula && (
                            <button
                                type="button"
                                onClick={() => setIsEditingLatex(!isEditingLatex)}
                                className={`text-[11px] px-2 py-0.5 rounded flex items-center gap-1 transition ${
                                    isEditingLatex 
                                        ? 'bg-indigo-600 text-white font-medium' 
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                                title="Edit LaTeX code manually"
                            >
                                <Edit3 className="w-3 h-3" />
                                <span>{isEditingLatex ? 'Close Edit' : 'Edit LaTeX'}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* KaTeX formula display */}
                {isEditingLatex ? (
                    <input 
                        type="text"
                        value={editableLatex}
                        onChange={(e) => setEditableLatex(e.target.value)}
                        placeholder="Type standard LaTeX (e.g. \frac{a}{b}, x^2, \int x\,dx)..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-emerald-400 focus:outline-none focus:border-indigo-500"
                        autoFocus
                    />
                ) : (
                    <div className="flex items-center justify-center min-h-[40px] overflow-x-auto py-1">
                        {activeFormula ? (
                            <div 
                                className="text-white text-lg tracking-wide"
                                dangerouslySetInnerHTML={{ __html: katexHtml }}
                            />
                        ) : (
                            <span className="text-xs text-slate-500 italic">
                                {isRecognizing ? 'Transcribing handwritten math...' : 'Draw formulas below to see live recognized equation here'}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Handwriting Surface & Side Toolbar */}
            <div className="p-3 bg-slate-900 flex gap-2.5">
                {/* Canvas Drawing Surface */}
                <div className="relative rounded-xl overflow-hidden border-2 border-slate-700/80 shadow-inner bg-[#fefdfa] flex-1">
                    <canvas
                        ref={canvasRef}
                        className={`block touch-none ${tool === 'erase' ? 'cursor-cell' : 'cursor-crosshair'}`}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                    />
                </div>

                {/* Tablet Action Buttons (Windows MIP Style side rail) */}
                <div className="flex flex-col gap-1.5 w-14 shrink-0">
                    <button
                        type="button"
                        onClick={() => setTool('write')}
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10px] font-medium transition ${
                            tool === 'write' 
                                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400' 
                                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                        title="Write (Pencil)"
                    >
                        <Pencil className="w-4 h-4 mb-0.5" />
                        <span>Write</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setTool('erase')}
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10px] font-medium transition ${
                            tool === 'erase' 
                                ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400' 
                                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                        title="Erase strokes"
                    >
                        <Eraser className="w-4 h-4 mb-0.5" />
                        <span>Erase</span>
                    </button>

                    <div className="h-px bg-slate-800 my-0.5" />

                    <button
                        type="button"
                        onClick={handleUndo}
                        disabled={strokes.length === 0}
                        className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[9px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-40 disabled:pointer-events-none"
                        title="Undo stroke"
                    >
                        <RotateCcw className="w-3.5 h-3.5 mb-0.5" />
                        <span>Undo</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleRedo}
                        disabled={redoHistory.length === 0}
                        className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[9px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-40 disabled:pointer-events-none"
                        title="Redo stroke"
                    >
                        <RotateCw className="w-3.5 h-3.5 mb-0.5" />
                        <span>Redo</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={strokes.length === 0 && !recognizedLatex}
                        className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[9px] bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition disabled:opacity-40 disabled:pointer-events-none"
                        title="Clear canvas"
                    >
                        <Trash2 className="w-3.5 h-3.5 mb-0.5" />
                        <span>Clear</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => triggerRecognition(strokes)}
                        disabled={strokes.length === 0 || isRecognizing}
                        className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[9px] bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 transition disabled:opacity-40 disabled:pointer-events-none mt-auto"
                        title="Force recognition re-run"
                    >
                        <Sparkles className="w-3.5 h-3.5 mb-0.5" />
                        <span>Scan</span>
                    </button>
                </div>
            </div>

            {/* Bottom Actions Footer */}
            <div className="bg-slate-950 px-4 py-2.5 flex items-center justify-between border-t border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-[11px]">AI Model:</span>
                    <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2 py-0.5 focus:outline-none"
                    >
                        <option value="gemini">Gemini Vision (Fast & Accurate)</option>
                        <option value="groq">Groq Vision (Llama-3.2 Vision)</option>
                    </select>
                    {strokes.length > 0 && (
                        <span className="text-[10px] text-slate-500 ml-1">
                            ({strokes.length} stroke{strokes.length > 1 ? 's' : ''})
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleInsert}
                        disabled={!activeFormula || !activeFormula.trim()}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 disabled:opacity-40 disabled:pointer-events-none"
                    >
                        <Check className="w-4 h-4" />
                        <span>Insert Equation</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
