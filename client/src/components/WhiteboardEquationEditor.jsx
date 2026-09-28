'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import katex from 'katex';
import { X, Check, Calculator, Trash2, HelpCircle, ArrowLeft, Sparkles } from 'lucide-react';

export const SYMBOL_CATEGORIES = [
    {
        id: 'powers',
        label: 'Powers & Subscripts',
        items: [
            { label: 'x²', latex: 'x^{2}', title: 'Squared (Exponent 2)' },
            { label: 'x³', latex: 'x^{3}', title: 'Cubed (Exponent 3)' },
            { label: 'xⁿ', latex: 'x^{n}', title: 'Power / Superscript' },
            { label: 'eˣ', latex: 'e^{x}', title: 'Exponential e^x' },
            { label: '10ⁿ', latex: '10^{n}', title: 'Power of 10' },
            { label: 'x₁', latex: 'x_{1}', title: 'Subscript 1' },
            { label: 'x₂', latex: 'x_{2}', title: 'Subscript 2' },
            { label: 'xᵢ', latex: 'x_{i}', title: 'Subscript i' },
            { label: 'xₙ', latex: 'x_{n}', title: 'Subscript n' },
            { label: 'xᵢ²', latex: 'x_{i}^{2}', title: 'Subscript and Exponent' },
            { label: 'aₙᵏ', latex: 'a_{n}^{k}', title: 'Subscript and Power' },
            { label: "f'(x)", latex: "f'(x)", title: 'Prime / Derivative Notation' },
            { label: "f''(x)", latex: "f''(x)", title: 'Double Prime' },
        ]
    },
    {
        id: 'calculus',
        label: 'Calculus & Limits',
        items: [
            { label: '∫', latex: '\\int f(x)\\,dx', title: 'Indefinite Integral' },
            { label: '∫ₐᵇ', latex: '\\int_{a}^{b} f(x)\\,dx', title: 'Definite Integral with Limits [a, b]' },
            { label: '∬', latex: '\\iint_{D} f(x,y)\\,dA', title: 'Double Integral over Region D' },
            { label: '∭', latex: '\\iiint_{V} f(x,y,z)\\,dV', title: 'Triple Integral over Volume V' },
            { label: '∮', latex: '\\oint_{C} \\mathbf{F} \\cdot d\\mathbf{r}', title: 'Contour / Closed Line Integral' },
            { label: 'lim x→0', latex: '\\lim_{x \\to 0} f(x)', title: 'Limit as x approaches 0' },
            { label: 'lim x→∞', latex: '\\lim_{x \\to \\infty} f(x)', title: 'Limit as x approaches Infinity' },
            { label: 'lim x→a⁻', latex: '\\lim_{x \\to a^{-}} f(x)', title: 'Left-Hand Limit' },
            { label: 'lim x→a⁺', latex: '\\lim_{x \\to a^{+}} f(x)', title: 'Right-Hand Limit' },
            { label: '∑', latex: '\\sum_{i=1}^{n} x_i', title: 'Summation with Bounds' },
            { label: '∑ ∞', latex: '\\sum_{k=0}^{\\infty} a_k', title: 'Infinite Series Summation' },
            { label: '∏', latex: '\\prod_{i=1}^{n} x_i', title: 'Product with Bounds' },
            { label: 'df/dx', latex: '\\frac{df}{dx}', title: 'First Derivative' },
            { label: 'd²f/dx²', latex: '\\frac{d^{2}f}{dx^{2}}', title: 'Second Derivative' },
            { label: '∂f/∂x', latex: '\\frac{\\partial f}{\\partial x}', title: 'Partial Derivative' },
            { label: '∂²f/∂x²', latex: '\\frac{\\partial^{2} f}{\\partial x^{2}}', title: 'Second Partial Derivative' },
            { label: '∇', latex: '\\nabla', title: 'Nabla / Gradient Operator' },
            { label: 'Δ', latex: '\\Delta', title: 'Laplacian / Delta' },
        ]
    },
    {
        id: 'algebra',
        label: 'Algebra & Arithmetic',
        items: [
            { label: 'a/b', latex: '\\frac{a}{b}', title: 'Fraction' },
            { label: '√x', latex: '\\sqrt{x}', title: 'Square Root' },
            { label: 'ⁿ√x', latex: '\\sqrt[n]{x}', title: 'nth Root' },
            { label: '±', latex: '\\pm', title: 'Plus-Minus' },
            { label: '∓', latex: '\\mp', title: 'Minus-Plus' },
            { label: '×', latex: '\\times', title: 'Multiplication Cross' },
            { label: '÷', latex: '\\div', title: 'Division Symbol' },
            { label: '·', latex: '\\cdot', title: 'Dot Product / Multiply' },
            { label: '≠', latex: '\\neq', title: 'Not Equal' },
            { label: '≤', latex: '\\le', title: 'Less Than or Equal' },
            { label: '≥', latex: '\\ge', title: 'Greater Than or Equal' },
            { label: '≈', latex: '\\approx', title: 'Approximately Equal' },
            { label: '≡', latex: '\\equiv', title: 'Equivalent / Congruent' },
            { label: '∝', latex: '\\propto', title: 'Proportional to' },
            { label: '|x|', latex: '\\left| x \\right|', title: 'Absolute Value' },
        ]
    },
    {
        id: 'symbols',
        label: 'Greek & Constants',
        items: [
            { label: 'α', latex: '\\alpha', title: 'Alpha' },
            { label: 'β', latex: '\\beta', title: 'Beta' },
            { label: 'γ', latex: '\\gamma', title: 'Gamma' },
            { label: 'δ', latex: '\\delta', title: 'Delta' },
            { label: 'ε', latex: '\\epsilon', title: 'Epsilon' },
            { label: 'θ', latex: '\\theta', title: 'Theta' },
            { label: 'λ', latex: '\\lambda', title: 'Lambda' },
            { label: 'μ', latex: '\\mu', title: 'Mu' },
            { label: 'π', latex: '\\pi', title: 'Pi' },
            { label: 'ρ', latex: '\\rho', title: 'Rho' },
            { label: 'σ', latex: '\\sigma', title: 'Sigma' },
            { label: 'τ', latex: '\\tau', title: 'Tau' },
            { label: 'φ', latex: '\\phi', title: 'Phi' },
            { label: 'ω', latex: '\\omega', title: 'Omega' },
            { label: 'Δ', latex: '\\Delta', title: 'Capital Delta' },
            { label: 'Ω', latex: '\\Omega', title: 'Capital Omega' },
            { label: 'Σ', latex: '\\Sigma', title: 'Capital Sigma' },
            { label: 'Π', latex: '\\Pi', title: 'Capital Pi' },
            { label: '∞', latex: '\\infty', title: 'Infinity' },
            { label: 'ħ', latex: '\\hbar', title: 'Reduced Planck Constant (hbar)' },
        ]
    },
    {
        id: 'logic_sets',
        label: 'Sets & Logic',
        items: [
            { label: '∈', latex: '\\in', title: 'Element of' },
            { label: '∉', latex: '\\notin', title: 'Not element of' },
            { label: '⊂', latex: '\\subset', title: 'Subset of' },
            { label: '⊆', latex: '\\subseteq', title: 'Subset or equal' },
            { label: '∪', latex: '\\cup', title: 'Set Union' },
            { label: '∩', latex: '\\cap', title: 'Set Intersection' },
            { label: '∅', latex: '\\emptyset', title: 'Empty Set' },
            { label: '∀', latex: '\\forall', title: 'For all' },
            { label: '∃', latex: '\\exists', title: 'There exists' },
            { label: '¬', latex: '\\neg', title: 'Negation' },
            { label: '∧', latex: '\\land', title: 'Logical AND' },
            { label: '∨', latex: '\\lor', title: 'Logical OR' },
            { label: '⇒', latex: '\\implies', title: 'Implies' },
            { label: '⇔', latex: '\\iff', title: 'If and only if' },
            { label: '→', latex: '\\to', title: 'Right Arrow' },
            { label: '←', latex: '\\leftarrow', title: 'Left Arrow' },
            { label: '↔', latex: '\\leftrightarrow', title: 'Bidirectional Arrow' },
        ]
    },
    {
        id: 'matrices',
        label: 'Functions & Matrices',
        items: [
            { label: 'sin', latex: '\\sin(x)', title: 'Sine' },
            { label: 'cos', latex: '\\cos(x)', title: 'Cosine' },
            { label: 'tan', latex: '\\tan(x)', title: 'Tangent' },
            { label: 'arcsin', latex: '\\arcsin(x)', title: 'Inverse Sine' },
            { label: 'arccos', latex: '\\arccos(x)', title: 'Inverse Cosine' },
            { label: 'arctan', latex: '\\arctan(x)', title: 'Inverse Tangent' },
            { label: 'ln', latex: '\\ln(x)', title: 'Natural Logarithm' },
            { label: 'log₁₀', latex: '\\log_{10}(x)', title: 'Base 10 Logarithm' },
            { label: 'log_b', latex: '\\log_{b}(x)', title: 'Logarithm Base b' },
            { label: '(x)', latex: '\\left( x \\right)', title: 'Auto-scaling Parentheses' },
            { label: '[x]', latex: '\\left[ x \\right]', title: 'Auto-scaling Brackets' },
            { label: '{x}', latex: '\\left\\{ x \\right\\}', title: 'Auto-scaling Curly Braces' },
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

export const FORMULA_TEMPLATES = [
    {
        id: 'fraction',
        label: 'a/b',
        title: 'Fraction (Numerator / Denominator)',
        latex: '\\frac{a}{b}',
        displayKaTeX: '\\frac{\\square}{\\square}',
        slots: [
            { id: 'num', label: 'Numerator', default: 'a', placeholder: 'e.g. 3x + 1' },
            { id: 'den', label: 'Denominator', default: 'b', placeholder: 'e.g. 2' },
        ],
        format: (vals) => `\\frac{${vals.num || 'a'}}{${vals.den || 'b'}}`
    },
    {
        id: 'power',
        label: 'xⁿ',
        title: 'Power / Exponent',
        latex: 'x^{n}',
        displayKaTeX: '\\square^{\\square}',
        slots: [
            { id: 'base', label: 'Base', default: 'x', placeholder: 'e.g. x' },
            { id: 'exp', label: 'Exponent', default: '2', placeholder: 'e.g. 2' },
        ],
        format: (vals) => `{${vals.base || 'x'}}^{${vals.exp || '2'}}`
    },
    {
        id: 'subscript',
        label: 'xₙ',
        title: 'Subscript Index',
        latex: 'x_{n}',
        displayKaTeX: '\\square_{\\square}',
        slots: [
            { id: 'base', label: 'Base', default: 'x', placeholder: 'e.g. a' },
            { id: 'sub', label: 'Subscript', default: '1', placeholder: 'e.g. 1' },
        ],
        format: (vals) => `{${vals.base || 'x'}}_{${vals.sub || '1'}}`
    },
    {
        id: 'sub_power',
        label: 'xₙᵏ',
        title: 'Subscript & Exponent',
        latex: 'x_{n}^{k}',
        displayKaTeX: '\\square_{\\square}^{\\square}',
        slots: [
            { id: 'base', label: 'Base', default: 'x', placeholder: 'e.g. x' },
            { id: 'sub', label: 'Subscript', default: '1', placeholder: 'e.g. i' },
            { id: 'exp', label: 'Exponent', default: '2', placeholder: 'e.g. 2' },
        ],
        format: (vals) => `{${vals.base || 'x'}}_{${vals.sub || '1'}}^{${vals.exp || '2'}}`
    },
    {
        id: 'sqrt',
        label: '√x',
        title: 'Square Root',
        latex: '\\sqrt{x}',
        displayKaTeX: '\\sqrt{\\square}',
        slots: [
            { id: 'radicand', label: 'Under Radical (x)', default: 'x', placeholder: 'e.g. 16' },
        ],
        format: (vals) => `\\sqrt{${vals.radicand || 'x'}}`
    },
    {
        id: 'nth_root',
        label: 'ⁿ√x',
        title: 'nth Root',
        latex: '\\sqrt[n]{x}',
        displayKaTeX: '\\sqrt[\\square]{\\square}',
        slots: [
            { id: 'index', label: 'Root Index (n)', default: '3', placeholder: 'e.g. 3' },
            { id: 'radicand', label: 'Under Radical (x)', default: 'x', placeholder: 'e.g. 27' },
        ],
        format: (vals) => `\\sqrt[${vals.index || '3'}]{${vals.radicand || 'x'}}`
    },
    {
        id: 'def_integral',
        label: '∫ₐᵇ',
        title: 'Definite Integral',
        latex: '\\int_{a}^{b} f(x)\\,dx',
        displayKaTeX: '\\int_{\\square}^{\\square} \\square\\,d\\square',
        slots: [
            { id: 'lower', label: 'Lower Limit (a)', default: '0', placeholder: 'e.g. 0' },
            { id: 'upper', label: 'Upper Limit (b)', default: '1', placeholder: 'e.g. 1' },
            { id: 'expr', label: 'Integrand f(x)', default: 'x^2', placeholder: 'e.g. x^2' },
            { id: 'var', label: 'Variable (dx)', default: 'x', placeholder: 'e.g. x' },
        ],
        format: (vals) => `\\int_{${vals.lower || '0'}}^{${vals.upper || '1'}} ${vals.expr || 'x'}\\,d${vals.var || 'x'}`
    },
    {
        id: 'indef_integral',
        label: '∫',
        title: 'Indefinite Integral',
        latex: '\\int f(x)\\,dx',
        displayKaTeX: '\\int \\square\\,d\\square',
        slots: [
            { id: 'expr', label: 'Expression f(x)', default: 'x', placeholder: 'e.g. 2x' },
            { id: 'var', label: 'Variable (dx)', default: 'x', placeholder: 'e.g. x' },
        ],
        format: (vals) => `\\int ${vals.expr || 'x'}\\,d${vals.var || 'x'}`
    },
    {
        id: 'summation',
        label: '∑',
        title: 'Summation with Bounds',
        latex: '\\sum_{i=1}^{n} x_i',
        displayKaTeX: '\\sum_{\\square}^{\\square} \\square',
        slots: [
            { id: 'from', label: 'From (Start)', default: 'i=1', placeholder: 'e.g. i=1' },
            { id: 'to', label: 'To (End)', default: 'n', placeholder: 'e.g. n' },
            { id: 'term', label: 'Term Formula', default: 'x_i', placeholder: 'e.g. i^2' },
        ],
        format: (vals) => `\\sum_{${vals.from || 'i=1'}}^{${vals.to || 'n'}} ${vals.term || 'x_i'}`
    },
    {
        id: 'limit',
        label: 'lim',
        title: 'Limit Operator',
        latex: '\\lim_{x \\to 0} f(x)',
        displayKaTeX: '\\lim_{\\square \\to \\square} \\square',
        slots: [
            { id: 'var', label: 'Variable', default: 'x', placeholder: 'e.g. x' },
            { id: 'to', label: 'Approaches', default: '0', placeholder: 'e.g. 0' },
            { id: 'expr', label: 'Expression', default: 'f(x)', placeholder: 'e.g. \\frac{\\sin x}{x}' },
        ],
        format: (vals) => `\\lim_{${vals.var || 'x'} \\to ${vals.to || '0'}} ${vals.expr || 'f(x)'}`
    },
    {
        id: 'log',
        label: 'log_b',
        title: 'Logarithm with Base',
        latex: '\\log_{b}(x)',
        displayKaTeX: '\\log_{\\square}(\\square)',
        slots: [
            { id: 'base', label: 'Base (b)', default: '10', placeholder: 'e.g. 10' },
            { id: 'val', label: 'Argument (x)', default: 'x', placeholder: 'e.g. x' },
        ],
        format: (vals) => `\\log_{${vals.base || '10'}}(${vals.val || 'x'})`
    },
    {
        id: 'brackets',
        label: '(□)',
        title: 'Parentheses (Auto-scaled)',
        latex: '\\left( x \\right)',
        displayKaTeX: '\\left( \\square \\right)',
        slots: [
            { id: 'expr', label: 'Enclosed Expression', default: 'x + 1', placeholder: 'e.g. x + 1' },
        ],
        format: (vals) => `\\left( ${vals.expr || 'x'} \\right)`
    },
    {
        id: 'matrix2x2',
        label: '[2×2]',
        title: '2×2 Matrix',
        latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
        displayKaTeX: '\\begin{pmatrix} \\square & \\square \\\\ \\square & \\square \\end{pmatrix}',
        slots: [
            { id: 'a11', label: 'Row 1, Col 1', default: '1', placeholder: 'a11' },
            { id: 'a12', label: 'Row 1, Col 2', default: '0', placeholder: 'a12' },
            { id: 'a21', label: 'Row 2, Col 1', default: '0', placeholder: 'a21' },
            { id: 'a22', label: 'Row 2, Col 2', default: '1', placeholder: 'a22' },
        ],
        format: (vals) => `\\begin{pmatrix} ${vals.a11 || '0'} & ${vals.a12 || '0'} \\\\ ${vals.a21 || '0'} & ${vals.a22 || '0'} \\end{pmatrix}`
    }
];

/**
 * MathVirtualKeyboard — Floating virtual keyboard for inserting math symbols,
 * powers, subscripts, limits, integrals, and VirtualX-style template constituent values.
 */
export function MathVirtualKeyboard({
    isOpen = false,
    onClose,
    onInsertSymbol,
    anchorPosition = { x: 300, y: 300 }
}) {
    const [activeTab, setActiveTab] = useState('templates');
    const [filterQuery, setFilterQuery] = useState('');
    const [pos, setPos] = useState(anchorPosition);
    const [isDragging, setIsDragging] = useState(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (anchorPosition && typeof anchorPosition.x === 'number') {
            setPos(anchorPosition);
        }
    }, [anchorPosition]);

    const handlePointerDown = (e) => {
        setIsDragging(true);
        dragOffsetRef.current = {
            x: e.clientX - pos.x,
            y: e.clientY - pos.y
        };
        e.stopPropagation();
    };

    useEffect(() => {
        if (!isDragging) return;
        const handlePointerMove = (e) => {
            const nextX = Math.max(10, Math.min(window.innerWidth - 380, e.clientX - dragOffsetRef.current.x));
            const nextY = Math.max(10, Math.min(window.innerHeight - 260, e.clientY - dragOffsetRef.current.y));
            setPos({ x: nextX, y: nextY });
        };
        const handlePointerUp = () => setIsDragging(false);

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging]);

    if (!isOpen) return null;

    // Pick active category
    const currentCategory = SYMBOL_CATEGORIES.find(c => c.id === activeTab);
    const filteredItems = filterQuery.trim()
        ? SYMBOL_CATEGORIES.flatMap(c => c.items).filter(item =>
            item.label.toLowerCase().includes(filterQuery.toLowerCase()) ||
            (item.title && item.title.toLowerCase().includes(filterQuery.toLowerCase())) ||
            item.latex.toLowerCase().includes(filterQuery.toLowerCase())
        )
        : (currentCategory ? currentCategory.items : []);

    const allTabs = [
        { id: 'templates', label: '⭐ Templates (VirtualX)' },
        ...SYMBOL_CATEGORIES
    ];

    const handleSelectTemplate = (tmpl) => {
        // Insert directly with square placeholders - no separate form
        const boxVals = {};
        tmpl.slots.forEach(s => { boxVals[s.id] = s.default || '\\square'; });
        const formatted = tmpl.format(boxVals);
        onInsertSymbol?.(formatted, tmpl.label);
    };

    return (
        <div
            className="math-keyboard-panel fixed z-[999] pointer-events-auto select-none"
            style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
            }}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
        >
            <div className="w-[370px] bg-slate-900/98 backdrop-blur-md border-2 border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-100">
                {/* Header with Drag Handle */}
                <div
                    onPointerDown={handlePointerDown}
                    className="flex items-center justify-between px-3 py-2 bg-slate-800/90 border-b border-slate-700/80 cursor-grab active:cursor-grabbing"
                >
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                            Math Formula & Symbol Keyboard
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
                            title="Close Virtual Keyboard"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Filter / Search Bar */}
                <div className="p-2 border-b border-slate-800 bg-slate-950/70">
                    <input
                        type="text"
                        value={filterQuery}
                        onChange={e => setFilterQuery(e.target.value)}
                        placeholder="Search symbols or templates (fraction, integral, alpha, power)..."
                        className="w-full px-2.5 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                </div>

                {/* Category Pills */}
                {!filterQuery.trim() && (
                    <div className="flex items-center gap-1 px-2 pt-1.5 pb-1 bg-slate-950/40 border-b border-slate-800 overflow-x-auto hide-scrollbar">
                        {allTabs.map(cat => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setActiveTab(cat.id)}
                                className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition whitespace-nowrap ${
                                    activeTab === cat.id
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Content Area */}
                <div className="p-2.5 max-h-[220px] overflow-y-auto hide-scrollbar">
                    {activeTab === 'templates' && !filterQuery.trim() ? (
                        /* Visual Template Cards Gallery */
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                            {FORMULA_TEMPLATES.map(tmpl => (
                                <button
                                    key={tmpl.id}
                                    type="button"
                                    onClick={() => handleSelectTemplate(tmpl)}
                                    className="group relative flex flex-col items-center justify-center py-2 px-1 bg-slate-800/90 hover:bg-indigo-600 hover:text-white border border-slate-700/70 rounded-xl transition active:scale-95 shadow-xs"
                                    title={`Click to fill constituent values for ${tmpl.title}`}
                                >
                                    <span
                                        className="text-xs font-bold leading-none select-none text-slate-100 group-hover:text-white my-1"
                                        dangerouslySetInnerHTML={{
                                            __html: katex.renderToString(tmpl.displayKaTeX, { displayMode: false, throwOnError: false })
                                        }}
                                    />
                                    <span className="text-[8px] text-slate-400 group-hover:text-indigo-200 truncate max-w-full font-sans mt-0.5">
                                        {tmpl.title.split(' ')[0]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        /* Standard Symbols Grid */
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                            {filteredItems.map((item, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                        onInsertSymbol?.(item.latex, item.label);
                                    }}
                                    className="group relative flex flex-col items-center justify-center py-2 px-1 bg-slate-800/90 hover:bg-indigo-600 hover:text-white border border-slate-700/70 rounded-xl transition active:scale-95 shadow-xs"
                                    title={item.title || item.label}
                                >
                                    <span className="font-mono text-xs font-bold leading-none select-none text-slate-100 group-hover:text-white">
                                        {item.label}
                                    </span>
                                    <span className="text-[8px] text-slate-400 group-hover:text-indigo-200 mt-1 truncate max-w-full font-mono">
                                        {item.title ? item.title.split(' ')[0] : ''}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div className="px-3 py-1.5 bg-slate-800/60 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Select a template or click any key to insert</span>
                    <span className="text-slate-500">VirtualX Style</span>
                </div>
            </div>
        </div>
    );
}

