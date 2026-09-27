'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import katex from 'katex';
import { X, Check, Calculator, Trash2, HelpCircle } from 'lucide-react';

const SYMBOL_CATEGORIES = [
    {
        id: 'algebra',
        label: 'Algebra',
        items: [
            { label: 'a/b', latex: '\\frac{a}{b}', title: 'Fraction' },
            { label: 'x²', latex: 'x^{2}', title: 'Exponent / Superscript' },
            { label: 'xᵢ', latex: 'x_{i}', title: 'Subscript' },
            { label: '√x', latex: '\\sqrt{x}', title: 'Square Root' },
            { label: 'ⁿ√x', latex: '\\sqrt[n]{x}', title: 'nth Root' },
            { label: '±', latex: '\\pm', title: 'Plus-Minus' },
            { label: '×', latex: '\\times', title: 'Times' },
            { label: '÷', latex: '\\div', title: 'Divide' },
            { label: '·', latex: '\\cdot', title: 'Dot Product' },
            { label: '≠', latex: '\\neq', title: 'Not Equal' },
            { label: '≤', latex: '\\le', title: 'Less or Equal' },
            { label: '≥', latex: '\\ge', title: 'Greater or Equal' },
            { label: '≈', latex: '\\approx', title: 'Approximately' },
            { label: '∝', latex: '\\propto', title: 'Proportional' },
        ]
    },
    {
        id: 'symbols',
        label: 'Greek & Symbols',
        items: [
            { label: 'α', latex: '\\alpha', title: 'Alpha' },
            { label: 'β', latex: '\\beta', title: 'Beta' },
            { label: 'γ', latex: '\\gamma', title: 'Gamma' },
            { label: 'δ', latex: '\\delta', title: 'Delta' },
            { label: 'θ', latex: '\\theta', title: 'Theta' },
            { label: 'λ', latex: '\\lambda', title: 'Lambda' },
            { label: 'μ', latex: '\\mu', title: 'Mu' },
            { label: 'π', latex: '\\pi', title: 'Pi' },
            { label: 'σ', latex: '\\sigma', title: 'Sigma' },
            { label: 'τ', latex: '\\tau', title: 'Tau' },
            { label: 'ω', latex: '\\omega', title: 'Omega' },
            { label: 'Δ', latex: '\\Delta', title: 'Capital Delta' },
            { label: 'Ω', latex: '\\Omega', title: 'Capital Omega' },
            { label: '∞', latex: '\\infty', title: 'Infinity' },
        ]
    },
    {
        id: 'calculus',
        label: 'Calculus',
        items: [
            { label: '∫', latex: '\\int f(x)\\,dx', title: 'Indefinite Integral' },
            { label: '∫ₐᵇ', latex: '\\int_{a}^{b} f(x)\\,dx', title: 'Definite Integral' },
            { label: '∬', latex: '\\iint f(x,y)\\,dxdy', title: 'Double Integral' },
            { label: '∑', latex: '\\sum_{i=1}^{n} x_i', title: 'Summation' },
            { label: '∏', latex: '\\prod_{i=1}^{n} x_i', title: 'Product' },
            { label: 'lim', latex: '\\lim_{x \\to 0}', title: 'Limit' },
            { label: 'df/dx', latex: '\\frac{df}{dx}', title: 'Derivative' },
            { label: '∂f/∂x', latex: '\\frac{\\partial f}{\\partial x}', title: 'Partial Derivative' },
            { label: '∇', latex: '\\nabla', title: 'Nabla / Gradient' },
        ]
    },
    {
        id: 'matrices',
        label: 'Functions & Matrices',
        items: [
            { label: 'sin', latex: '\\sin(x)', title: 'Sine' },
            { label: 'cos', latex: '\\cos(x)', title: 'Cosine' },
            { label: 'tan', latex: '\\tan(x)', title: 'Tangent' },
            { label: 'ln', latex: '\\ln(x)', title: 'Natural Log' },
            { label: 'log', latex: '\\log_{10}(x)', title: 'Logarithm' },
            { label: '(x)', latex: '\\left( x \\right)', title: 'Parentheses' },
            { label: '[x]', latex: '\\left[ x \\right]', title: 'Brackets' },
            { label: '|x|', latex: '\\left| x \\right|', title: 'Absolute Value' },
            { label: '2×2 Mat', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', title: '2x2 Matrix' },
            { label: '3×3 Mat', latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}', title: '3x3 Matrix' },
            { label: 'Det', latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', title: 'Determinant' },
        ]
    }
];

export default function WhiteboardEquationEditor({
    isOpen = false,
    initialLatex = '',
    onInsert,
    onClose,
    position = { x: 300, y: 150 }
}) {
    const [latex, setLatex] = useState(initialLatex || '');
    const [activeTab, setActiveTab] = useState('algebra');
    const textareaRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setLatex(initialLatex || '');
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);
        }
    }, [isOpen, initialLatex]);

    // Live rendered math preview HTML using KaTeX
    const previewHtml = useMemo(() => {
        if (!latex.trim()) return '';
        try {
            return katex.renderToString(latex.trim(), {
                displayMode: true,
                throwOnError: false,
                strict: false
            });
        } catch (err) {
            return `<span class="text-amber-400 font-mono text-xs">Invalid LaTeX</span>`;
        }
    }, [latex]);

    // Insert LaTeX snippet at current caret position
    const handleInsertSnippet = (snippet) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            setLatex(prev => (prev ? `${prev} ${snippet}` : snippet));
            return;
        }

        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const before = latex.substring(0, start);
        const after = latex.substring(end);
        const nextVal = `${before}${snippet}${after}`;
        setLatex(nextVal);

        setTimeout(() => {
            textarea.focus();
            const nextCursor = start + snippet.length;
            textarea.setSelectionRange(nextCursor, nextCursor);
        }, 10);
    };

    const handleCommit = () => {
        if (!latex.trim()) {
            onClose?.();
            return;
        }
        onInsert?.(latex.trim());
        onClose?.();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 backdrop-blur-xs select-none"
            onClick={onClose}
        >
            <div
                className="bg-slate-900 border-2 border-slate-700/90 rounded-2xl shadow-2xl w-[92vw] max-w-[540px] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/95 border-b border-slate-700/80">
                    <div className="flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
                            <Calculator size={15} />
                        </div>
                        <span className="text-xs font-bold tracking-wide uppercase text-slate-200">
                            Math Equation Editor
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/60 transition"
                        title="Close Editor (Escape)"
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* Categorized Symbol Tabs */}
                <div className="flex items-center border-b border-slate-800 bg-slate-950/60 px-2 pt-1 gap-1 overflow-x-auto hide-scrollbar">
                    {SYMBOL_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setActiveTab(cat.id)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap ${
                                activeTab === cat.id
                                    ? 'bg-slate-900 text-indigo-400 border-indigo-500'
                                    : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/40'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Symbol Quick Palette */}
                <div className="p-2.5 bg-slate-900/90 border-b border-slate-800">
                    <div className="flex flex-wrap gap-1 max-h-[88px] overflow-y-auto hide-scrollbar">
                        {SYMBOL_CATEGORIES.find(c => c.id === activeTab)?.items.map((item, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleInsertSnippet(item.latex)}
                                className="px-2 py-1 bg-slate-800/80 hover:bg-indigo-600 hover:text-white border border-slate-700/60 rounded-md text-xs font-mono text-slate-200 transition active:scale-95 shadow-xs"
                                title={item.title || item.label}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Real-Time KaTeX Rendered Preview Box */}
                <div className="p-3 bg-slate-950/80 border-b border-slate-800 min-h-[76px] flex flex-col items-center justify-center overflow-x-auto">
                    {previewHtml ? (
                        <div
                            className="text-base text-slate-100 max-w-full overflow-x-auto py-1"
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                        />
                    ) : (
                        <span className="text-xs text-slate-500 italic">
                            Formula preview will appear here in real time...
                        </span>
                    )}
                </div>

                {/* LaTeX Code Input Textarea */}
                <div className="p-3 bg-slate-900">
                    <div className="flex items-center justify-between mb-1 text-[11px] text-slate-400 font-medium">
                        <span>LaTeX Code</span>
                        <span className="text-[10px] text-slate-500">Press Cmd+Enter / Ctrl+Enter to save</span>
                    </div>
                    <textarea
                        ref={textareaRef}
                        value={latex}
                        onChange={(e) => setLatex(e.target.value)}
                        onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                e.preventDefault();
                                handleCommit();
                            } else if (e.key === 'Escape') {
                                e.preventDefault();
                                onClose?.();
                            }
                        }}
                        placeholder="e.g. \\int_{0}^{\\infty} e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}"
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none shadow-inner"
                    />
                </div>

                {/* Footer Action Bar */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/80 border-t border-slate-700/80">
                    <button
                        type="button"
                        onClick={() => setLatex('')}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition"
                        title="Clear Equation"
                    >
                        <Trash2 size={12} />
                        <span>Clear</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleCommit}
                            disabled={!latex.trim()}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 transition active:scale-95"
                        >
                            <Check size={13} />
                            <span>Insert Equation</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
