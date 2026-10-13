'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Plus,
    X,
    Eye,
    EyeOff,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    Box,
    Grid,
    SlidersHorizontal
} from 'lucide-react';
import GraphCanvas from './graphPlotter/GraphCanvas';
import Graph3DCanvas from './graphPlotter/Graph3DCanvas';
import { parseEquation, compileExpression } from './graphPlotter/mathParser';
import { getEquationColor } from './graphPlotter/colorPalette';

/**
 * Convert a LaTeX math string into a clean expression understood by `parseEquation`
 */
export function latexToGraphExpression(raw = '') {
    if (!raw || typeof raw !== 'string') return '';
    let s = raw.trim();

    // Strip math delimiters
    s = s
        .replace(/^\$\$|\$\$$/g, '')
        .replace(/^\$|\$$/g, '')
        .replace(/^\\\[|\\\]$/g, '')
        .replace(/^\\\(|\\\)$/g, '')
        .trim();

    // Unwrap \boxed{...}
    s = s.replace(/\\boxed\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '$1');
    // Remove \text{...}, \mathrm{...}, \mathbf{...}
    s = s.replace(/\\(?:text|textbf|textit|mathrm|mathbf)\{[^{}]*\}/g, ' ');
    // Remove \left and \right
    s = s.replace(/\\left\s*/g, '').replace(/\\right\s*/g, '');

    // Convert \frac{a}{b} -> ((a)/(b)) (run 3 times for nested fractions)
    for (let i = 0; i < 3; i++) {
        s = s.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '(($1)/($2))');
    }

    // Convert \sqrt[n]{x} and \sqrt{x}
    s = s.replace(/\\sqrt\[([^{}\]]+)\]\{([^{}]+)\}/g, '(($2)^(1/($1)))');
    for (let i = 0; i < 2; i++) {
        s = s.replace(/\\sqrt\s*\{([^{}]+)\}/g, 'sqrt($1)');
    }

    // Convert exponents ^{...} -> ^(...)
    s = s.replace(/\^\{([^{}]+)\}/g, '^($1)');
    // Remove subscripts like x_1 -> x1
    s = s.replace(/_\{([^{}]+)\}/g, '$1').replace(/_([0-9a-zA-Z])/g, '$1');

    // Replace common LaTeX trig/log/constants
    s = s
        .replace(/\\cdot|\\times/g, '*')
        .replace(/\\div/g, '/')
        .replace(/\\sin\b/g, 'sin')
        .replace(/\\cos\b/g, 'cos')
        .replace(/\\tan\b/g, 'tan')
        .replace(/\\sec\b/g, 'sec')
        .replace(/\\csc\b/g, 'csc')
        .replace(/\\cot\b/g, 'cot')
        .replace(/\\arcsin\b/g, 'asin')
        .replace(/\\arccos\b/g, 'acos')
        .replace(/\\arctan\b/g, 'atan')
        .replace(/\\sinh\b/g, 'sinh')
        .replace(/\\cosh\b/g, 'cosh')
        .replace(/\\tanh\b/g, 'tanh')
        .replace(/\\ln\b/g, 'ln')
        .replace(/\\log\b/g, 'log')
        .replace(/\\pi\b/g, 'pi')
        .replace(/\\theta\b/g, 'theta')
        .replace(/\\le\b|\\leq\b/g, '<=')
        .replace(/\\ge\b|\\geq\b/g, '>=')
        // Remove remaining unknown LaTeX commands
        .replace(/\\[a-zA-Z]+/g, ' ')
        // Replace remaining curly braces with parentheses
        .replace(/\{/g, '(')
        .replace(/\}/g, ')')
        .replace(/\s+/g, ' ')
        .trim();

    return s;
}

/**
 * Determine whether a candidate math expression is a genuine plotworthy 2D/3D equation
 * (and not an arithmetic step like `12 + 4 + 9 = 25` or scalar assignment like `r = 5`).
 */
export function normalizeCandidateEquation(rawCandidate = '') {
    if (!rawCandidate || typeof rawCandidate !== 'string') return null;

    // Split on logical implication arrows (\iff, \implies, =>) and pick plotworthy clauses
    const clauses = rawCandidate
        .split(/\\iff|\\Longleftrightarrow|\\implies|\\Rightarrow|<=>|=>|;|,\s*(?=[xyz]\b|\([xyz])/i)
        .map(c => c.trim())
        .filter(Boolean);

    const results = [];

    for (const clause of clauses) {
        let expr = latexToGraphExpression(clause);
        if (!expr || expr.length < 3 || expr.length > 140) continue;

        // Reject expressions with ± or \pm that aren't standard equations
        if (expr.includes('±') || expr.includes('\\pm')) continue;

        // If chained equality like `(x-2)^2 + (y+3)^2 = 12 + 4 + 9 = 25`, reduce to `firstLHS = lastRHS`
        if (expr.includes('=') && !/[<>]=/.test(expr)) {
            const eqParts = expr.split('=').map(p => p.trim()).filter(Boolean);
            if (eqParts.length >= 2) {
                expr = `${eqParts[0]} = ${eqParts[eqParts.length - 1]}`;
            } else {
                continue;
            }
        }

        // Must contain at least one graphing variable (x, y, z, or theta)
        const hasX = /\bx\b/i.test(expr);
        const hasY = /\by\b/i.test(expr);
        const hasZ = /\bz\b/i.test(expr);
        const hasTheta = /\btheta\b|θ/i.test(expr);

        if (!hasX && !hasY && !hasZ && !hasTheta) continue;

        // Reject scalar definitions like `r = 5`, `r^2 = 25`, `h = 2`, `k = -3`, `g = -2`, `f = 3`, `c = -12`
        if (/^(?:r|r\^\(?2\)?|h|k|g|f|c|m|a|b|d)\s*=/i.test(expr) && !hasTheta && !hasX && !hasY && !hasZ) {
            continue;
        }

        // Reject general template formulas with Symbolic constants like g, f, c, h, k, r unless they have numbers
        if (/\b(?:h|k|g|f|c|a|b|m)\b/.test(expr.replace(/\b(?:sin|cos|tan|sec|csc|cot|sinh|cosh|tanh|asin|acos|atan|sqrt|ln|log|abs|exp|pi|theta)\b/gi, ''))) {
            continue;
        }

        // Let's test if parseEquation + compileExpression succeeds!
        const parsed = parseEquation(expr);
        if (!parsed.valid) continue;

        // If it's a polar equation (`r = ...`), ensure it actually uses `theta`
        if (parsed.type === 'polar' && !hasTheta) continue;

        const compiled = compileExpression(parsed.expr, parsed.variables);
        if (!compiled.valid) continue;

        // Test evaluation at a sample point to ensure no unresolved symbols remain
        try {
            const testVal = compiled.fn({ x: 1.5, y: 1.5, z: 1.5, theta: 0.5, t: 0.5 }, {});
            if (typeof testVal !== 'number') continue;
        } catch {
            continue;
        }

        results.push({
            expr,
            parsed,
            compiled: compiled.fn,
            is3D: parsed.type === 'quadric3d' || parsed.type === 'surface3d' || hasZ
        });
    }

    return results.length > 0 ? results : null;
}

/**
 * Extract all unique plotworthy equations and key points from an AI problem & solution
 */
export function extractGraphDataFromAiSolution(aiSolution, activeTabText = '') {
    const equations = [];
    const keyPoints = [];
    const seenNormalized = new Set();

    const canonicalize = (exprStr) => exprStr.replace(/\s+/g, '').toLowerCase();

    const addCandidate = (rawStr, source = 'solution') => {
        const candidates = normalizeCandidateEquation(rawStr);
        if (!candidates) return;
        for (const item of candidates) {
            const key = canonicalize(item.expr);
            if (seenNormalized.has(key)) continue;
            seenNormalized.add(key);
            equations.push({
                ...item,
                source
            });
        }
    };

    // 1. Explicit graphEquations array from AI response (if present)
    if (Array.isArray(aiSolution?.graphEquations)) {
        aiSolution.graphEquations.forEach(eq => addCandidate(String(eq), 'ai'));
    }

    // 2. Question text
    const qText = aiSolution?.question || '';
    if (qText) {
        const qLatex = [...qText.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$\n]+?)\$/g)];
        qLatex.forEach(m => addCandidate(m[1] || m[2], 'question'));
        // Also scan plain-text equations in the question (e.g. "x^2 + y^2 - 4x + 6y - 12 = 0" or "y = x^2 - 4")
        const plainEqMatches = qText.match(/(?:[xyz]\s*=|[xyz]\^2|\([xyz]\s*[-+])[^,.;?!]+=\s*[-+0-9a-zA-Z^().\s*/]+/gi) || [];
        plainEqMatches.forEach(m => addCandidate(m, 'question'));
    }

    // 3. Solution markdown math blocks
    const fullText = aiSolution?.solutionMarkdown || activeTabText || '';
    if (fullText) {
        const blockMatches = [...fullText.matchAll(/\$\$([\s\S]*?)\$\$/g)];
        blockMatches.forEach(m => addCandidate(m[1], 'solution'));
        const stripped = fullText.replace(/\$\$[\s\S]*?\$\$/g, ' ');
        const inlineMatches = [...stripped.matchAll(/\$([^$\n]+?)\$/g)];
        inlineMatches.forEach(m => addCandidate(m[1], 'solution'));
    }

    // Deduplicate equivalent circle/implicit forms if we have more than 2 implicit equations of the same curve
    const deduplicated = [];
    for (const eq of equations) {
        if (eq.parsed.type === 'implicit' || eq.parsed.type === 'cartesian') {
            const p1 = eq.compiled({ x: 1.2, y: -0.7, z: 0 }, {});
            const p2 = eq.compiled({ x: -2.3, y: 1.9, z: 0 }, {});
            const p3 = eq.compiled({ x: 3.1, y: 2.4, z: 0 }, {});
            const existing = deduplicated.find(d => {
                if (d.parsed.type !== eq.parsed.type) return false;
                const d1 = d.compiled({ x: 1.2, y: -0.7, z: 0 }, {});
                const d2 = d.compiled({ x: -2.3, y: 1.9, z: 0 }, {});
                const d3 = d.compiled({ x: 3.1, y: 2.4, z: 0 }, {});
                return (
                    Math.abs(p1 - d1) < 1e-4 &&
                    Math.abs(p2 - d2) < 1e-4 &&
                    Math.abs(p3 - d3) < 1e-4
                );
            });
            if (existing) {
                existing.aliases = existing.aliases || [existing.expr];
                if (!existing.aliases.includes(eq.expr)) {
                    existing.aliases.push(eq.expr);
                }
                continue;
            }
        }
        deduplicated.push({
            ...eq,
            aliases: [eq.expr]
        });
    }

    // 4. Extract key coordinate points (e.g. Center (2, -3), Vertex, intersections) from solution text
    const cleanPtText = `${qText}\n${fullText}`.replace(/\\left|\\right/g, '');
    const ptRegex = /\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g;
    const seenPts = new Set();
    let pm;
    while ((pm = ptRegex.exec(cleanPtText)) !== null) {
        const x = parseFloat(pm[1]);
        const y = parseFloat(pm[2]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        if (Math.abs(x) > 500 || Math.abs(y) > 500) continue;
        const key = `${x.toFixed(2)}_${y.toFixed(2)}`;
        if (seenPts.has(key)) continue;
        seenPts.add(key);

        const prefixSlice = cleanPtText.slice(Math.max(0, pm.index - 35), pm.index);
        let labelPrefix = '';
        if (/center/i.test(prefixSlice)) labelPrefix = 'Center ';
        else if (/vertex/i.test(prefixSlice)) labelPrefix = 'Vertex ';
        else if (/focus/i.test(prefixSlice)) labelPrefix = 'Focus ';

        const fmt = (v) => Number.isInteger(Number(v.toFixed(2))) ? String(Math.round(v)) : v.toFixed(2);
        keyPoints.push({
            x,
            y,
            label: `${labelPrefix}(${fmt(x)}, ${fmt(y)})`,
            color: labelPrefix ? '#38bdf8' : '#a855f7'
        });
    }

    // Also detect standard circle center `(x - h)^2 + (y - k)^2 = r^2` if not already in keyPoints
    for (const eq of deduplicated) {
        for (const alias of (eq.aliases || [eq.expr])) {
            const circleMatch = alias.match(/^\(\s*x\s*([+-]\s*\d+(?:\.\d+)?)\s*\)\^\(?2\)?\s*\+\s*\(\s*y\s*([+-]\s*\d+(?:\.\d+)?)\s*\)\^\(?2\)?\s*=\s*(\d+(?:\.\d+)?)/i);
            if (circleMatch) {
                const h = -parseFloat(circleMatch[1].replace(/\s+/g, ''));
                const k = -parseFloat(circleMatch[2].replace(/\s+/g, ''));
                const rSq = parseFloat(circleMatch[3]);
                if (Number.isFinite(h) && Number.isFinite(k)) {
                    const key = `${h.toFixed(2)}_${k.toFixed(2)}`;
                    if (!seenPts.has(key)) {
                        seenPts.add(key);
                        keyPoints.push({
                            x: h,
                            y: k,
                            radius: rSq > 0 ? Math.sqrt(rSq) : undefined,
                            label: `Center (${h}, ${k})`,
                            color: '#38bdf8'
                        });
                    } else {
                        const existingPt = keyPoints.find(p => Math.hypot(p.x - h, p.y - k) < 0.05);
                        if (existingPt && rSq > 0) existingPt.radius = Math.sqrt(rSq);
                    }
                }
            }
        }
    }

    return {
        equations: deduplicated.slice(0, 6),
        keyPoints: keyPoints.slice(0, 8)
    };
}

export default function WhiteboardGraphingPanel({
    aiSolution = null,
    activeSolutionStep = null, // { index, text, equations, points }
    externalEquations = [], // equations added via voice commands or external triggers
    isOpenByDefault = false,
    onClose = null
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isVisible, setIsVisible] = useState(isOpenByDefault);
    const [graphMode, setGraphMode] = useState('2d'); // '2d' | '3d'
    const [manualModeOverride, setManualModeOverride] = useState(false);

    // Resizable panel dimensions
    const [panelSize, setPanelSize] = useState({ width: 390, height: 430 });

    // Plotted equations state: Array<{ id, rawInput, parsed, compiled, color, visible, aliases, is3D }>
    const [equations, setEquations] = useState([]);
    const [selectedEqId, setSelectedEqId] = useState(null);
    const [keyPoints, setKeyPoints] = useState([]);

    // Manual equation input state
    const [inputExpr, setInputExpr] = useState('');
    const [inputError, setInputError] = useState('');

    // Coordinate range state
    const [viewBounds, setViewBounds] = useState({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 });
    const [showRangeControls, setShowRangeControls] = useState(false);

    const lastAiSignatureRef = useRef('');
    const lastExternalSigRef = useRef('');

    // Build a plotted equation record from an expression string
    const createEquationItem = useCallback((exprStr, existingList = [], aliases = null) => {
        const cleaned = latexToGraphExpression(exprStr) || exprStr.trim();
        const parsed = parseEquation(cleaned);
        if (!parsed.valid) {
            return { valid: false, error: parsed.error || 'Invalid mathematical expression' };
        }
        const compiled = compileExpression(parsed.expr, parsed.variables);
        if (!compiled.valid) {
            return { valid: false, error: compiled.error || 'Could not compile expression. Check syntax (e.g., y = x^2 - 4 or z = sin(x)*cos(y)).' };
        }

        // Verify evaluation doesn't throw on standard coordinates
        try {
            compiled.fn({ x: 1, y: 1, z: 1, theta: 0.5, t: 0.5 }, {});
        } catch (err) {
            return { valid: false, error: 'Unsupported function or unrecognized symbol.' };
        }

        const hasZ = /\bz\b/i.test(cleaned);
        const is3D = parsed.type === 'quadric3d' || parsed.type === 'surface3d' || hasZ;
        const color = getEquationColor(existingList.length);

        return {
            valid: true,
            item: {
                id: `eq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                rawInput: cleaned,
                parsed,
                compiled: compiled.fn,
                color,
                visible: true,
                is3D,
                aliases: aliases || [cleaned]
            }
        };
    }, []);

    // Automatically populate graph when AI generates or explains a mathematical problem
    useEffect(() => {
        if (!aiSolution || aiSolution.isError) return;
        const sig = `${aiSolution.question || ''}::${aiSolution.solutionMarkdown || ''}`;
        if (!sig || sig === '::' || sig === lastAiSignatureRef.current) return;
        lastAiSignatureRef.current = sig;

        const { equations: extractedEqs, keyPoints: extractedPts } = extractGraphDataFromAiSolution(aiSolution);
        if (extractedEqs.length === 0 && extractedPts.length === 0) return;

        const builtEquations = [];
        for (const eqData of extractedEqs) {
            const res = createEquationItem(eqData.expr, builtEquations, eqData.aliases);
            if (res.valid) {
                builtEquations.push(res.item);
            }
        }

        if (builtEquations.length > 0) {
            setEquations(builtEquations);
            setSelectedEqId(builtEquations[0].id);
            setKeyPoints(extractedPts);
            setIsVisible(true);
            setIsCollapsed(false);
            setInputError('');

            // Auto-detect 2D vs 3D mode
            const needs3D = builtEquations.some(e => e.is3D);
            setGraphMode(needs3D ? '3d' : '2d');
            setManualModeOverride(false);

            // Auto-frame coordinate bounds around key points & circle radius if applicable
            if (!needs3D && extractedPts.length > 0) {
                let minX = -8, maxX = 8, minY = -8, maxY = 8;
                extractedPts.forEach(pt => {
                    const pad = (pt.radius || 3) + 2.5;
                    minX = Math.min(minX, Math.floor(pt.x - pad));
                    maxX = Math.max(maxX, Math.ceil(pt.x + pad));
                    minY = Math.min(minY, Math.floor(pt.y - pad));
                    maxY = Math.max(maxY, Math.ceil(pt.y + pad));
                });
                const span = Math.max(maxX - minX, maxY - minY, 12);
                const cx = Math.round((minX + maxX) / 2);
                const cy = Math.round((minY + maxY) / 2);
                const half = Math.ceil(span / 2);
                setViewBounds({
                    xMin: cx - half,
                    xMax: cx + half,
                    yMin: cy - half,
                    yMax: cy + half
                });
            } else {
                setViewBounds({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 });
            }
        }
    }, [aiSolution, createEquationItem]);

    // Handle external equations triggered by voice commands (e.g. "plot y = sin(x)")
    useEffect(() => {
        if (!Array.isArray(externalEquations) || externalEquations.length === 0) return;
        const sig = externalEquations.join('||');
        if (sig === lastExternalSigRef.current) return;
        lastExternalSigRef.current = sig;

        setEquations(prev => {
            const next = [...prev];
            let addedAny = false;
            let any3D = next.some(e => e.is3D);
            for (const rawEq of externalEquations) {
                const res = createEquationItem(rawEq, next);
                if (res.valid) {
                    const exists = next.some(e => e.rawInput.replace(/\s+/g, '') === res.item.rawInput.replace(/\s+/g, ''));
                    if (!exists) {
                        next.push(res.item);
                        addedAny = true;
                        if (res.item.is3D) any3D = true;
                    }
                }
            }
            if (addedAny) {
                setIsVisible(true);
                setIsCollapsed(false);
                if (!manualModeOverride) {
                    setGraphMode(any3D ? '3d' : '2d');
                }
            }
            return next;
        });
    }, [externalEquations, createEquationItem, manualModeOverride]);

    // Synchronize active solution step with highlighted curves & points on the graph
    const { highlightedEqIds, highlightedPoints } = useMemo(() => {
        if (!activeSolutionStep) {
            return { highlightedEqIds: [], highlightedPoints: [] };
        }

        const stepEqIds = [];
        const stepPoints = Array.isArray(activeSolutionStep.points) ? [...activeSolutionStep.points] : [];
        const stepRawEqs = Array.isArray(activeSolutionStep.equations) ? activeSolutionStep.equations : [];

        // Normalize step equations and compare against plotted equations (and their algebraic aliases)
        const normalizedStepExprs = stepRawEqs
            .map(e => latexToGraphExpression(e).replace(/\s+/g, '').toLowerCase())
            .filter(Boolean);

        const stepTextClean = latexToGraphExpression(activeSolutionStep.text || '')
            .replace(/\s+/g, '')
            .toLowerCase();

        for (const eq of equations) {
            const allForms = (eq.aliases && eq.aliases.length > 0 ? eq.aliases : [eq.rawInput])
                .map(a => a.replace(/\s+/g, '').toLowerCase());

            const isMatched = allForms.some(form =>
                normalizedStepExprs.some(se => se.includes(form) || form.includes(se)) ||
                (form.length >= 4 && stepTextClean.includes(form))
            );

            if (isMatched) {
                stepEqIds.push(eq.id);
            }
        }

        // If the step mentions "circle", "curve", "surface", or "graph" and there is only 1 plotted equation, highlight it
        if (
            stepEqIds.length === 0 &&
            equations.length === 1 &&
            /\b(circle|curve|parabola|line|ellipse|hyperbola|surface|sphere|graph|equation|radius|center)\b/i.test(activeSolutionStep.text || '')
        ) {
            stepEqIds.push(equations[0].id);
        }

        return {
            highlightedEqIds: stepEqIds,
            highlightedPoints: stepPoints
        };
    }, [activeSolutionStep, equations]);

    // Add manual equation handler with clear validation & guidance
    const handleAddManualEquation = (e) => {
        e.preventDefault();
        const trimmed = inputExpr.trim();
        if (!trimmed) return;

        const res = createEquationItem(trimmed, equations);
        if (!res.valid) {
            setInputError(
                `${res.error}. Try formats like "y = x^2 - 4", "x^2 + y^2 = 25", or 3D "z = sin(x)*cos(y)".`
            );
            return;
        }

        setInputError('');
        setInputExpr('');
        setEquations(prev => {
            const next = [...prev, res.item];
            if (!manualModeOverride) {
                const any3D = next.some(item => item.is3D);
                setGraphMode(any3D ? '3d' : '2d');
            }
            return next;
        });
        setSelectedEqId(res.item.id);
    };

    // Drag resize handler for bottom-right corner
    const handleStartResize = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = panelSize.width;
        const startHeight = panelSize.height;

        const onMouseMove = (moveEvent) => {
            const newWidth = Math.max(310, Math.min(680, startWidth + (moveEvent.clientX - startX)));
            const newHeight = Math.max(280, Math.min(720, startHeight + (moveEvent.clientY - startY)));
            setPanelSize({ width: newWidth, height: newHeight });
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    // If closed, render a minimal launcher pill on the left side of the whiteboard
    if (!isVisible) {
        return (
            <button
                type="button"
                onClick={() => {
                    setIsVisible(true);
                    setIsCollapsed(false);
                }}
                style={{ backgroundColor: '#0f172a' }}
                className="fixed top-16 left-3 z-40 px-3 py-2 rounded-xl border-2 border-slate-700 hover:border-yellow-400 text-slate-100 shadow-2xl flex items-center gap-2 text-xs font-bold transition pointer-events-auto"
                title="Open Interactive 2D/3D Graphing Panel"
            >
                <Grid className="w-4 h-4 text-yellow-400" />
                <span>Graph</span>
                {equations.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-yellow-400 text-slate-950 text-[10px] font-extrabold">
                        {equations.length}
                    </span>
                )}
            </button>
        );
    }

    // If collapsed, render a compact vertical/horizontal header pill on the left side
    if (isCollapsed) {
        return (
            <div
                style={{ backgroundColor: '#0f172a' }}
                className="fixed top-16 left-3 z-40 border-2 border-slate-700 rounded-xl shadow-2xl px-3 py-2 flex items-center gap-2.5 text-xs text-slate-100 pointer-events-auto"
            >
                <Grid className="w-4 h-4 text-yellow-400 shrink-0" />
                <span className="font-bold">Graph ({graphMode.toUpperCase()})</span>
                {equations.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-yellow-400 text-slate-950 text-[10px] font-extrabold">
                        {equations.length}
                    </span>
                )}
                <button
                    type="button"
                    onClick={() => setIsCollapsed(false)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
                    title="Expand Graphing Panel"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        );
    }

    const canvasHeight = Math.max(210, panelSize.height - (equations.length > 0 ? 155 : 105));

    return (
        <div
            style={{
                width: `${panelSize.width}px`,
                backgroundColor: '#0f172a'
            }}
            className="fixed top-14 left-3 z-40 border-2 border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto select-none"
        >
            {/* 1. Minimal Header Bar */}
            <div
                style={{ backgroundColor: '#1e293b' }}
                className="px-3 py-2 border-b border-slate-700 flex items-center justify-between gap-2 text-xs"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <Grid className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                    <span className="font-bold text-slate-100 truncate">Interactive Graph</span>

                    {/* 2D / 3D Mode Switcher (Auto-detected + Manual Toggle) */}
                    <div
                        style={{ backgroundColor: '#020617' }}
                        className="flex items-center rounded-lg p-0.5 border border-slate-700"
                    >
                        <button
                            type="button"
                            onClick={() => {
                                setGraphMode('2d');
                                setManualModeOverride(true);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                graphMode === '2d'
                                    ? 'bg-yellow-400 text-slate-950'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                            title="2D Cartesian / Polar / Implicit Graphing"
                        >
                            2D
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setGraphMode('3d');
                                setManualModeOverride(true);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                                graphMode === '3d'
                                    ? 'bg-yellow-400 text-slate-950'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                            title="3D Surface & Coordinate Graphing"
                        >
                            <Box className="w-2.5 h-2.5" />
                            <span>3D</span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {/* Coordinate Range Toggle (2D) */}
                    {graphMode === '2d' && (
                        <button
                            type="button"
                            onClick={() => setShowRangeControls(prev => !prev)}
                            className={`p-1 rounded transition ${
                                showRangeControls
                                    ? 'bg-yellow-400 text-slate-950'
                                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                            }`}
                            title="Adjust visible coordinate range (xMin, xMax, yMin, yMax)"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {/* Reset View */}
                    <button
                        type="button"
                        onClick={() => setViewBounds({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 })}
                        className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition"
                        title="Reset Coordinate Range"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    {/* Collapse */}
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(true)}
                        className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition"
                        title="Collapse Panel"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {/* Close */}
                    <button
                        type="button"
                        onClick={() => {
                            setIsVisible(false);
                            if (onClose) onClose();
                        }}
                        className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition"
                        title="Hide Graphing Panel"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* 2. Optional Coordinate Range Inputs (xMin, xMax, yMin, yMax) */}
            {graphMode === '2d' && showRangeControls && (
                <div
                    style={{ backgroundColor: '#1e293b' }}
                    className="px-3 py-1.5 border-b border-slate-700 grid grid-cols-4 gap-1.5 text-[10px]"
                >
                    {[
                        { key: 'xMin', label: 'X min' },
                        { key: 'xMax', label: 'X max' },
                        { key: 'yMin', label: 'Y min' },
                        { key: 'yMax', label: 'Y max' }
                    ].map(({ key, label }) => (
                        <label key={key} className="flex flex-col gap-0.5 text-slate-300 font-medium">
                            <span>{label}</span>
                            <input
                                type="number"
                                value={Number(viewBounds[key].toFixed(1))}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!Number.isFinite(val)) return;
                                    setViewBounds(prev => ({ ...prev, [key]: val }));
                                }}
                                style={{ backgroundColor: '#0f172a' }}
                                className="w-full px-1.5 py-0.5 rounded border border-slate-600 text-white font-mono text-[10px] focus:outline-none focus:border-yellow-400"
                            />
                        </label>
                    ))}
                </div>
            )}

            {/* 3. Manual Equation Entry Bar */}
            <form
                onSubmit={handleAddManualEquation}
                style={{ backgroundColor: '#0f172a' }}
                className="px-2.5 py-2 border-b border-slate-800 flex flex-col gap-1"
            >
                <div className="flex items-center gap-1.5">
                    <input
                        type="text"
                        value={inputExpr}
                        onChange={(e) => {
                            setInputExpr(e.target.value);
                            if (inputError) setInputError('');
                        }}
                        placeholder="Plot 2D/3D: e.g. y = x^2 - 4, x^2+y^2=25, z = sin(x)*cos(y)"
                        style={{ backgroundColor: '#1e293b' }}
                        className="flex-1 px-2.5 py-1 rounded-lg border border-slate-700 text-xs text-white placeholder-slate-400 font-mono focus:outline-none focus:border-yellow-400"
                    />
                    <button
                        type="submit"
                        disabled={!inputExpr.trim()}
                        className="px-2.5 py-1 rounded-lg bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-slate-950 text-xs font-bold transition flex items-center gap-1 shrink-0"
                        title="Plot equation"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Plot</span>
                    </button>
                </div>

                {/* Validation / Error Guidance */}
                {inputError && (
                    <div
                        style={{ backgroundColor: '#450a0a' }}
                        className="px-2 py-1 rounded-lg border border-rose-500 text-rose-200 text-[10px] flex items-start gap-1.5 leading-snug"
                    >
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>{inputError}</span>
                    </div>
                )}
            </form>

            {/* 4. Active Equations Strip (Synchronized with AI Voice & Solution Steps) */}
            {equations.length > 0 && (
                <div
                    style={{ backgroundColor: '#0f172a' }}
                    className="px-2.5 py-1.5 border-b border-slate-800 max-h-24 overflow-y-auto custom-scrollbar flex flex-col gap-1"
                >
                    {equations.map((eq) => {
                        const isStepActive = highlightedEqIds.includes(eq.id);
                        return (
                            <div
                                key={eq.id}
                                onClick={() => setSelectedEqId(eq.id)}
                                style={{
                                    backgroundColor: isStepActive ? '#422006' : '#1e293b',
                                    borderColor: isStepActive ? '#facc15' : (selectedEqId === eq.id ? '#64748b' : '#334155')
                                }}
                                className={`px-2 py-1 rounded-lg border flex items-center justify-between gap-2 text-[11px] cursor-pointer transition ${
                                    isStepActive ? 'ring-1 ring-yellow-400 text-yellow-100 font-bold' : 'text-slate-200'
                                }`}
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: isStepActive ? '#facc15' : eq.color }}
                                    />
                                    <span className="font-mono truncate" title={eq.rawInput}>
                                        {eq.rawInput}
                                    </span>
                                    {eq.is3D && (
                                        <span className="px-1 py-0.2 rounded bg-slate-800 text-amber-300 text-[9px] font-bold shrink-0">
                                            3D
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEquations(prev => prev.map(item =>
                                                item.id === eq.id ? { ...item, visible: !item.visible } : item
                                            ));
                                        }}
                                        className="p-0.5 rounded text-slate-400 hover:text-white"
                                        title={eq.visible ? 'Hide curve' : 'Show curve'}
                                    >
                                        {eq.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEquations(prev => prev.filter(item => item.id !== eq.id));
                                        }}
                                        className="p-0.5 rounded text-slate-400 hover:text-rose-400"
                                        title="Remove equation"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 5. 2D or 3D Interactive Graph Viewport */}
            <div className="relative flex-1 w-full overflow-hidden" style={{ height: `${canvasHeight}px`, backgroundColor: '#090d16' }}>
                {graphMode === '3d' ? (
                    <Graph3DCanvas
                        width={panelSize.width}
                        height={canvasHeight}
                        theme="dark"
                        equations={equations}
                        selectedEqId={selectedEqId}
                        onSelectEquation={setSelectedEqId}
                        showIntersections={true}
                    />
                ) : (
                    <GraphCanvas
                        width={panelSize.width}
                        height={canvasHeight}
                        equations={equations}
                        selectedEqId={selectedEqId}
                        highlightedEqIds={highlightedEqIds}
                        externalPoints={keyPoints}
                        highlightedPoints={highlightedPoints}
                        onSelectEquation={setSelectedEqId}
                        viewBounds={viewBounds}
                        onUpdateViewBounds={setViewBounds}
                        coordinateSystem="cartesian"
                        showGrid={true}
                        showMinorGrid={true}
                        showAxisLabels={true}
                        showCurveLabels={true}
                        showIntersections={true}
                        legendConfig={{ show: false, position: 'top-right' }}
                        theme="dark"
                    />
                )}

                {/* Resize Corner Grip */}
                <div
                    onMouseDown={handleStartResize}
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-0.5 opacity-60 hover:opacity-100 z-30"
                    title="Drag to resize graphing panel"
                >
                    <svg width="10" height="10" viewBox="0 0 10 10" className="text-slate-400">
                        <path d="M9 1v8H1" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M9 5v4H5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                </div>
            </div>
        </div>
    );
}
