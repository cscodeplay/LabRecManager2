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
import { parseEquation, compileExpression, formatMathSuperscripts } from './graphPlotter/mathParser';
import { getEquationColor } from './graphPlotter/colorPalette';
import katex from 'katex';

/**
 * Render a graph equation into formatted KaTeX HTML (or Unicode superscript fallback)
 * Converts programming multiplication (2*x -> 2x, 3*y -> 3y) and superscripts powers (x^2 -> x²)
 */
export function renderEquationMathHtml(expr) {
    if (!expr || typeof expr !== 'string') return '';
    try {
        let latex = expr.trim();
        // Remove explicit multiplication between numbers and variables/parentheses: 2*x -> 2x, 3*y -> 3y, 2*(x+1) -> 2(x+1)
        latex = latex.replace(/(\d(?:\.\d+)?)\s*\*\s*([a-zA-Z(])/g, '$1$2');
        latex = latex.replace(/(\))\s*\*\s*([0-9a-zA-Z(])/g, '$1$2');
        latex = latex.replace(/([a-zA-Z])\s*\*\s*([a-zA-Z])/g, '$1$2');
        // Convert fractions like ((a)/(b)) -> \frac{a}{b}
        latex = latex.replace(/\(\(([^\/()]+)\)\/\(([^\/()]+)\)\)/g, '\\frac{$1}{$2}');
        // Convert remaining * to \cdot
        latex = latex.replace(/\*/g, ' \\cdot ');
        // Greek letters
        latex = latex.replace(/\btheta\b/gi, '\\theta');
        latex = latex.replace(/\bpi\b/gi, '\\pi');

        return katex.renderToString(latex, {
            displayMode: false,
            throwOnError: false,
            strict: false
        });
    } catch {
        return `<span class="font-mono">${formatMathSuperscripts(expr) || expr}</span>`;
    }
}

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

    // Unwrap \boxed{...} (run twice for nested braces)
    for (let i = 0; i < 2; i++) {
        s = s.replace(/\\boxed\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '$1');
    }
    // Remove \text{...}, \mathrm{...}, \mathbf{...}, \quad, \qquad, \displaystyle
    s = s
        .replace(/\\(?:text|textbf|textit|mathrm|mathbf|mathcal)\s*\{[^{}]*\}/g, ' ')
        .replace(/\\(?:quad|qquad|displaystyle|,|;|!|:)\b/g, ' ');
    // Remove \left and \right
    s = s.replace(/\\left\s*/g, '').replace(/\\right\s*/g, '');

    // Handle Calculus Integrals: extract integrand from \int_{a}^{b} f(x) dx or \int f(x) dx
    if (/\\int\b/.test(s)) {
        const intMatch = s.match(/\\int(?:\s*_(?:\{[^{}]*\}|[^\s^]+))?(?:\s*\^(?:\{[^{}]*\}|[^\s_]+))?\s*([\s\S]+?)\s*(?:\\[,;!]\s*)?d([xyzt]|\\theta)\b/i);
        if (intMatch && intMatch[1]) {
            const integrand = intMatch[1].trim();
            if (integrand && !integrand.includes('=')) {
                s = `y = ${integrand}`;
            }
        }
    }

    // Handle Calculus Limits: \lim_{x \to a} f(x) = L -> extract y = f(x)
    if (/\\lim\b/.test(s)) {
        s = s.replace(/\\lim\s*(?:_\{[^{}]*\})?\s*/g, '');
        if (s.includes('=')) {
            const lhs = s.split('=')[0].trim();
            if (lhs) s = `y = ${lhs}`;
        }
    }

    // Normalize derivative LHS notations: \frac{dy}{dx} = ..., \frac{d}{dx}(...) = ..., f'(x) = ..., y' = ...
    s = s
        .replace(/^\\frac\s*\{\s*d(?:\^2)?\s*y\s*\}\s*\{\s*d\s*x(?:\^2)?\s*\}\s*=/i, 'y =')
        .replace(/^(?:[fghy])\s*'+(\s*\(\s*x\s*\))?\s*=/i, 'y =');

    // Strip trailing constant of integration "+ C" or "+ c"
    s = s.replace(/\+\s*C\s*$/, '');

    // Normalize Unicode superscripts and math operators
    s = s
        .replace(/²/g, '^2')
        .replace(/³/g, '^3')
        .replace(/⁴/g, '^4')
        .replace(/[−–—]/g, '-')
        .replace(/×/g, '*')
        .replace(/÷/g, '/');

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
        // Strip leading prose labels like "Equation:" or "Circle:"
        .replace(/^[a-zA-Z\s]{2,20}:\s*/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    return s;
}

/**
 * Numerically check if an implicit 2D function f(x, y) = 0 represents a circle A(x^2 + y^2) + Dx + Ey + F = 0.
 * Returns { cx, cy, r } if it is a valid circle with positive radius, or null otherwise.
 */
function detectImplicitCircleMeta(compiledFn) {
    if (typeof compiledFn !== 'function') return null;
    try {
        const f00 = compiledFn({ x: 0, y: 0, z: 0 }, {});
        const f10 = compiledFn({ x: 1, y: 0, z: 0 }, {});
        const fm10 = compiledFn({ x: -1, y: 0, z: 0 }, {});
        const f01 = compiledFn({ x: 0, y: 1, z: 0 }, {});
        const f0m1 = compiledFn({ x: 0, y: -1, z: 0 }, {});
        if (![f00, f10, fm10, f01, f0m1].every(Number.isFinite)) return null;

        const Ax = (f10 + fm10) / 2 - f00;
        const Ay = (f01 + f0m1) / 2 - f00;
        const D = (f10 - fm10) / 2;
        const E = (f01 - f0m1) / 2;

        if (Math.abs(Ax - Ay) > 1e-5 || Math.abs(Ax) < 1e-5) return null;

        // Verify at two off-axis points that there are no xy or higher-degree terms
        const f23 = compiledFn({ x: 2, y: 3, z: 0 }, {});
        const exp23 = Ax * 4 + Ay * 9 + 2 * D + 3 * E + f00;
        if (!Number.isFinite(f23) || Math.abs(f23 - exp23) > 1e-4) return null;

        const fm21 = compiledFn({ x: -2, y: 1.5, z: 0 }, {});
        const expm21 = Ax * 4 + Ay * 2.25 - 2 * D + 1.5 * E + f00;
        if (!Number.isFinite(fm21) || Math.abs(fm21 - expm21) > 1e-4) return null;

        const cx = -D / (2 * Ax);
        const cy = -E / (2 * Ax);
        const rSq = cx * cx + cy * cy - f00 / Ax;
        if (rSq <= 1e-6) return null;

        return {
            cx: Number(cx.toFixed(4)),
            cy: Number(cy.toFixed(4)),
            r: Number(Math.sqrt(rSq).toFixed(4))
        };
    } catch {
        return null;
    }
}

/**
 * Determine whether a candidate math expression is a genuine plotworthy 2D/3D equation
 * (and not an arithmetic step like `12 + 4 + 9 = 25` or scalar assignment like `r = 5`).
 */
export function normalizeCandidateEquation(rawCandidate = '', allowParameters = false) {
    if (!rawCandidate || typeof rawCandidate !== 'string') return null;

    // Split on logical implication arrows (\iff, \implies, =>), semicolons, or newlines
    const clauses = rawCandidate
        .split(/\\iff|\\Longleftrightarrow|\\implies|\\Rightarrow|<=>|=>|;|\n|,\s*(?=(?:[xyz]\b|\([xyz]))/i)
        .map(c => c.trim())
        .filter(Boolean);

    const results = [];

    for (const clause of clauses) {
        let expr = latexToGraphExpression(clause);
        if (!expr || expr.length < 3 || expr.length > 160) continue;

        // Reject expressions with ± or \pm that aren't standard equations
        if (expr.includes('±') || expr.includes('\\pm')) continue;

        // If chained equality like `(x-2)^2 + (y+3)^2 = 12 + 4 + 9 = 25`, reduce to `firstLHS = lastRHS`
        if (expr.includes('=') && !/[<>]=/.test(expr)) {
            const rawParts = expr.split('=').map(p => p.trim()).filter(Boolean);
            // Filter out single-letter label prefixes like `C = ...` that aren't x, y, z, r, f(x)
            const eqParts = rawParts.filter((p, idx) => {
                if (idx === 0 && /^[a-zA-Z]$/.test(p) && !/^[xyzr]$/i.test(p)) return false;
                if (idx === 0 && /^\(\(d\)\/\(dx\)\)/i.test(p)) return false;
                return true;
            });
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
        if (/^(?:r|r\^\(?2\)?|h|k|g|f|c|m|a|b|d)\s*=/i.test(expr) && !hasTheta) {
            continue;
        }

        // Track if this is a trivial single-coordinate assignment like `x = 2` or `y = -3`
        const isTrivialAssignment = /^[xy]\s*=\s*[-+]?\d+(?:\.\d+)?$/i.test(expr);

        // If it's a single-variable nonlinear equation in x only (e.g. `x^2 - 5x + 6 = 0`),
        // convert to `y = ...` so its curve and roots are plotted on the 2D plane
        let plotExpr = expr;
        if (hasX && !hasY && !hasZ && !hasTheta && !isTrivialAssignment && expr.includes('=') && !/[<>]=/.test(expr)) {
            const [lhs, rhs] = expr.split('=').map(s => s.trim());
            if (lhs && rhs) {
                if (rhs === '0') {
                    plotExpr = `y = ${lhs}`;
                } else if (lhs === '0') {
                    plotExpr = `y = ${rhs}`;
                } else {
                    plotExpr = `y = (${lhs}) - (${rhs})`;
                }
            }
        }

        const parsed = parseEquation(plotExpr);
        if (!parsed || parsed.error) continue;

        // If it's a polar equation (`r = ...`), ensure it actually uses `theta`
        if (parsed.type === 'polar' && !hasTheta) continue;

        // Reject symbolic template formulas (like `(x-h)^2 + (y-k)^2 = r^2` or `x^2 + y^2 + 2gx + 2fy + c = 0`)
        // during automatic extraction unless allowParameters is true
        if (!allowParameters && Array.isArray(parsed.parameters) && parsed.parameters.length > 0) {
            continue;
        }

        let compiled = null;
        let compiledX = null;
        let compiledY = null;
        try {
            if (parsed.type === 'parametric' && parsed.parametric) {
                compiledX = compileExpression(parsed.parametric.xExpr);
                compiledY = compileExpression(parsed.parametric.yExpr);
                const tx = compiledX({ t: 0.5, x: 0.5 }, {});
                const ty = compiledY({ t: 0.5, y: 0.5 }, {});
                if (typeof tx !== 'number' || typeof ty !== 'number') continue;
            } else if (parsed.expression) {
                compiled = compileExpression(parsed.expression);
                const testVal = compiled({ x: 1.5, y: 1.5, z: 1.5, theta: 0.5, t: 0.5 }, {});
                if (typeof testVal !== 'number') continue;
            } else {
                continue;
            }
        } catch {
            continue;
        }

        // Note: `quadricType === 'cylinder'` without `z` is `(x-h)^2 + (y-k)^2 = r^2`, which is a 2D circle!
        const is3D = hasZ || parsed.type === 'cartesian3d' || (parsed.type === 'quadric3d' && parsed.quadricType !== 'cylinder');

        let circleMeta = null;
        if (!is3D) {
            if (parsed.type === 'quadric3d' && parsed.quadric?.type === 'cylinder') {
                circleMeta = {
                    cx: parsed.quadric.center?.x || 0,
                    cy: parsed.quadric.center?.y || 0,
                    r: parsed.quadric.radius || 5
                };
            } else if (parsed.type === 'implicit' && compiled) {
                circleMeta = detectImplicitCircleMeta(compiled);
            }
        }

        results.push({
            expr,
            plotExpr,
            parsed,
            compiled,
            compiledX,
            compiledY,
            is3D,
            isTrivialAssignment,
            circleMeta
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
    const seenPts = new Set();

    const canonicalize = (exprStr) => exprStr.replace(/\s+/g, '').toLowerCase();

    const addPoint = (x, y, label = '', color = '#38bdf8', radius = undefined) => {
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        if (Math.abs(x) > 500 || Math.abs(y) > 500) return;
        const key = `${x.toFixed(2)}_${y.toFixed(2)}`;
        if (seenPts.has(key)) {
            if (radius !== undefined) {
                const existingPt = keyPoints.find(p => Math.hypot(p.x - x, p.y - y) < 0.05);
                if (existingPt && !existingPt.radius) existingPt.radius = radius;
            }
            return;
        }
        seenPts.add(key);
        const fmt = (v) => Number.isInteger(Number(v.toFixed(2))) ? String(Math.round(v)) : v.toFixed(2);
        keyPoints.push({
            x,
            y,
            radius,
            label: label || `(${fmt(x)}, ${fmt(y)})`,
            color
        });
    };

    const addCandidate = (rawStr, source = 'solution') => {
        const candidates = normalizeCandidateEquation(rawStr, false);
        if (!candidates) return;
        for (const item of candidates) {
            // Skip trivial `x = 2` or `y = -3` coordinate lines extracted from intermediate solution steps
            if (source === 'solution' && item.isTrivialAssignment) continue;
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

    // 1b. Explicit curves from canvasAction / AI response
    if (Array.isArray(aiSolution?.curves)) {
        aiSolution.curves.forEach(c => {
            if (c?.label) addCandidate(String(c.label), 'ai');
            if (c?.type === 'circle' && Number.isFinite(c.cx) && Number.isFinite(c.cy) && Number.isFinite(c.r)) {
                const hTerm = c.cx === 0 ? 'x^2' : `(x ${c.cx > 0 ? '-' : '+'} ${Math.abs(c.cx)})^2`;
                const kTerm = c.cy === 0 ? 'y^2' : `(y ${c.cy > 0 ? '-' : '+'} ${Math.abs(c.cy)})^2`;
                addCandidate(`${hTerm} + ${kTerm} = ${Number((c.r * c.r).toFixed(4))}`, 'ai');
                addPoint(c.cx, c.cy, c.centerLabel || `Center (${c.cx}, ${c.cy})`, '#38bdf8', c.r);
            } else if (c?.type === 'line' && Number.isFinite(c.slope) && Number.isFinite(c.intercept)) {
                addCandidate(`y = ${c.slope}*x ${c.intercept >= 0 ? '+' : '-'} ${Math.abs(c.intercept)}`, 'ai');
            }
        });
    }

    // 2. Question text
    const qText = aiSolution?.question || '';
    if (qText) {
        const qLatex = [...qText.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$\n]+?)\$/g)];
        qLatex.forEach(m => addCandidate(m[1] || m[2], 'question'));
        // Also scan plain-text equations in the question (e.g. "x^2 + y^2 - 4x + 6y - 12 = 0" or "y = x^2 - 4")
        const plainEqMatches = qText.match(/(?:[xyz]\s*=|[xyz]\s*\^\s*\d|[xyz][²³]|\([xyz]\s*[-+])[^,.;?!]+=\s*[-+0-9a-zA-Z^²³().\s*/]+/gi) || [];
        plainEqMatches.forEach(m => addCandidate(m, 'question'));
    }

    // 3. Solution markdown math blocks: ONLY parse if no primary equations were provided via graphEquations!
    // This strictly prevents intermediate algebraic simplification lines (e.g. 3x = 9, 2x = 6) from polluting the graph.
    const hasPrimaryEquations = Array.isArray(aiSolution?.graphEquations) && aiSolution.graphEquations.length > 0;
    const fullText = aiSolution?.solutionMarkdown || activeTabText || '';
    if (!hasPrimaryEquations && fullText) {
        const blockMatches = [...fullText.matchAll(/\$\$([\s\S]*?)\$\$/g)];
        blockMatches.forEach(m => addCandidate(m[1], 'solution'));
        const stripped = fullText.replace(/\$\$[\s\S]*?\$\$/g, ' ');
        const inlineMatches = [...stripped.matchAll(/\$([^$\n]+?)\$/g)];
        inlineMatches.forEach(m => addCandidate(m[1], 'solution'));
    }

    // Deduplicate algebraically equivalent equations (e.g. `x^2 + y^2 - 4x + 6y - 12 = 0` and `(x - 2)^2 + (y + 3)^2 = 25`)
    const deduplicated = [];
    for (const eq of equations) {
        if (eq.compiled && !eq.is3D) {
            const p1 = eq.compiled({ x: 1.2, y: -0.7, z: 0 }, {});
            const p2 = eq.compiled({ x: -2.3, y: 1.9, z: 0 }, {});
            const p3 = eq.compiled({ x: 3.1, y: 2.4, z: 0 }, {});
            const existing = deduplicated.find(d => {
                if (!d.compiled || d.is3D) return false;
                // Check if both are circle equations with the same center and radius
                if (eq.circleMeta && d.circleMeta) {
                    return (
                        Math.hypot(eq.circleMeta.cx - d.circleMeta.cx, eq.circleMeta.cy - d.circleMeta.cy) < 1e-2 &&
                        Math.abs(eq.circleMeta.r - d.circleMeta.r) < 1e-2
                    );
                }
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
                if (!existing.circleMeta && eq.circleMeta) {
                    existing.circleMeta = eq.circleMeta;
                }
                // Prefer analytic quadric circle representation for crisp 240-segment rendering
                if (eq.parsed.type === 'quadric3d' && existing.parsed.type === 'implicit') {
                    existing.parsed = eq.parsed;
                    existing.compiled = eq.compiled;
                }
                continue;
            }
        }
        deduplicated.push({
            ...eq,
            aliases: [eq.expr]
        });
    }

    // 4. Add circle centers & radii detected from equations
    for (const eq of deduplicated) {
        if (eq.circleMeta) {
            const { cx, cy, r } = eq.circleMeta;
            const fmt = (v) => Number.isInteger(Number(v.toFixed(2))) ? String(Math.round(v)) : v.toFixed(2);
            addPoint(cx, cy, `Center (${fmt(cx)}, ${fmt(cy)})`, '#38bdf8', r);
        }
    }

    // 4b. Analytical 2D linear intersection solver for systems of equations
    // If linear equations are present, compute their exact intersection (x0, y0)
    const linearEqs = deduplicated.filter(eq => eq.compiled && !eq.is3D && !eq.circleMeta);
    if (linearEqs.length >= 2) {
        for (let i = 0; i < linearEqs.length - 1; i++) {
            for (let j = i + 1; j < linearEqs.length; j++) {
                const eq1 = linearEqs[i];
                const eq2 = linearEqs[j];
                try {
                    const f1_00 = eq1.compiled({ x: 0, y: 0, z: 0 }, {});
                    const f1_10 = eq1.compiled({ x: 1, y: 0, z: 0 }, {});
                    const f1_01 = eq1.compiled({ x: 0, y: 1, z: 0 }, {});
                    const a1 = f1_10 - f1_00;
                    const b1 = f1_01 - f1_00;
                    const c1 = -f1_00;

                    const f2_00 = eq2.compiled({ x: 0, y: 0, z: 0 }, {});
                    const f2_10 = eq2.compiled({ x: 1, y: 0, z: 0 }, {});
                    const f2_01 = eq2.compiled({ x: 0, y: 1, z: 0 }, {});
                    const a2 = f2_10 - f2_00;
                    const b2 = f2_01 - f2_00;
                    const c2 = -f2_00;

                    const f1_22 = eq1.compiled({ x: 2, y: 2, z: 0 }, {});
                    const f2_22 = eq2.compiled({ x: 2, y: 2, z: 0 }, {});
                    const isLin1 = Math.abs((a1 * 2 + b1 * 2 - c1) - f1_22) < 1e-3;
                    const isLin2 = Math.abs((a2 * 2 + b2 * 2 - c2) - f2_22) < 1e-3;

                    if (isLin1 && isLin2) {
                        const det = a1 * b2 - a2 * b1;
                        if (Math.abs(det) > 1e-4) {
                            const interX = (c1 * b2 - c2 * b1) / det;
                            const interY = (a1 * c2 - a2 * c1) / det;
                            if (Number.isFinite(interX) && Number.isFinite(interY)) {
                                const fmt = (n) => Number.isInteger(Number(n.toFixed(2))) ? String(Math.round(n)) : n.toFixed(2);
                                addPoint(interX, interY, `Intersection (${fmt(interX)}, ${fmt(interY)})`, '#f43f5e');
                            }
                        }
                    }
                } catch (_) {}
            }
        }
    }

    // 5. Add explicit points from AI response (`plottedPoints` and `intersectionPoints`)
    if (Array.isArray(aiSolution?.plottedPoints)) {
        aiSolution.plottedPoints.forEach(pt => {
            if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.y)) {
                addPoint(pt.x, pt.y, pt.label || '', '#38bdf8');
            }
        });
    }
    if (Array.isArray(aiSolution?.intersectionPoints)) {
        aiSolution.intersectionPoints.forEach(pt => {
            if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.y)) {
                addPoint(pt.x, pt.y, pt.label || '', '#f43f5e');
            }
        });
    }

    // 6. Extract key coordinate points (e.g. Center (2, -3), Vertex, intersections) from solution text
    const cleanPtText = `${qText}\n${fullText}`.replace(/\\left|\\right/g, '');
    const ptRegex = /\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g;
    let pm;
    while ((pm = ptRegex.exec(cleanPtText)) !== null) {
        const x = parseFloat(pm[1]);
        const y = parseFloat(pm[2]);
        const prefixSlice = cleanPtText.slice(Math.max(0, pm.index - 35), pm.index);
        let labelPrefix = '';
        if (/center/i.test(prefixSlice)) labelPrefix = 'Center ';
        else if (/vertex/i.test(prefixSlice)) labelPrefix = 'Vertex ';
        else if (/focus/i.test(prefixSlice)) labelPrefix = 'Focus ';

        const fmt = (v) => Number.isInteger(Number(v.toFixed(2))) ? String(Math.round(v)) : v.toFixed(2);
        addPoint(x, y, `${labelPrefix}(${fmt(x)}, ${fmt(y)})`, labelPrefix ? '#38bdf8' : '#a855f7');
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
    isOpenByDefault = true,
    onClose = null
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isVisible, setIsVisible] = useState(isOpenByDefault);
    const [graphMode, setGraphMode] = useState('2d'); // '2d' | '3d'
    const [manualModeOverride, setManualModeOverride] = useState(false);

    // Resizable panel dimensions
    const [panelSize, setPanelSize] = useState({ width: 390, height: 430 });

    // Plotted equations state: Array<{ id, raw, rawInput, label, parsed, compiled, compiledX, compiledY, color, visible, aliases, is3D }>
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

    // Build a plotted equation record from an expression string or pre-parsed candidate
    const createEquationItem = useCallback((exprOrCandidate, existingList = [], aliases = null) => {
        const isObj = exprOrCandidate && typeof exprOrCandidate === 'object';
        const displayRaw = isObj ? exprOrCandidate.expr : (latexToGraphExpression(exprOrCandidate) || String(exprOrCandidate).trim());
        const plotTarget = isObj ? (exprOrCandidate.plotExpr || exprOrCandidate.expr) : displayRaw;

        const parsed = isObj && exprOrCandidate.parsed ? exprOrCandidate.parsed : parseEquation(plotTarget);
        if (!parsed || parsed.error) {
            return { valid: false, error: parsed?.error || 'Invalid mathematical expression' };
        }

        let compiled = isObj ? exprOrCandidate.compiled : null;
        let compiledX = isObj ? exprOrCandidate.compiledX : null;
        let compiledY = isObj ? exprOrCandidate.compiledY : null;

        if (!compiled && !compiledX) {
            try {
                if (parsed.type === 'parametric' && parsed.parametric) {
                    compiledX = compileExpression(parsed.parametric.xExpr);
                    compiledY = compileExpression(parsed.parametric.yExpr);
                    compiledX({ t: 0.5, x: 0.5 }, {});
                    compiledY({ t: 0.5, y: 0.5 }, {});
                } else if (parsed.expression) {
                    compiled = compileExpression(parsed.expression);
                    compiled({ x: 1, y: 1, z: 1, theta: 0.5, t: 0.5 }, {});
                } else {
                    return { valid: false, error: 'Incomplete equation.' };
                }
            } catch (err) {
                return {
                    valid: false,
                    error: 'Could not compile expression. Check syntax (e.g., y = x^2 - 4, x^2 + y^2 = 25, or z = sin(x)*cos(y)).'
                };
            }
        }

        const hasZ = /\bz\b/i.test(displayRaw);
        const is3D = isObj && exprOrCandidate.is3D !== undefined
            ? exprOrCandidate.is3D
            : (hasZ || parsed.type === 'cartesian3d' || (parsed.type === 'quadric3d' && parsed.quadricType !== 'cylinder'));
        const color = getEquationColor(existingList.length);

        return {
            valid: true,
            item: {
                id: `eq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                raw: displayRaw,
                rawInput: displayRaw,
                label: displayRaw,
                parsed,
                compiled,
                compiledX,
                compiledY,
                color,
                visible: true,
                is3D,
                aliases: aliases || (isObj && exprOrCandidate.aliases) || [displayRaw]
            }
        };
    }, []);

    // Automatically populate graph when AI generates or explains a mathematical problem
    useEffect(() => {
        if (!aiSolution || aiSolution.isError) return;
        const sig = `${aiSolution.question || ''}::${aiSolution.solutionMarkdown || ''}::${(aiSolution.graphEquations || []).join(',')}`;
        if (!sig || sig === '::::' || sig === lastAiSignatureRef.current) return;
        lastAiSignatureRef.current = sig;

        const { equations: extractedEqs, keyPoints: extractedPts } = extractGraphDataFromAiSolution(aiSolution);
        if (extractedEqs.length === 0 && extractedPts.length === 0) return;

        const builtEquations = [];
        for (const eqData of extractedEqs) {
            const res = createEquationItem(eqData, builtEquations, eqData.aliases);
            if (res.valid) {
                builtEquations.push(res.item);
            }
        }

        if (builtEquations.length > 0 || extractedPts.length > 0) {
            if (builtEquations.length > 0) {
                setEquations(builtEquations);
                setSelectedEqId(builtEquations[0].id);
            }
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
                let minX = -6, maxX = 6, minY = -6, maxY = 6;
                extractedPts.forEach(pt => {
                    const pad = (pt.radius || 2.5) + 2.5;
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
                className="fixed bottom-24 left-3 z-40 px-3 py-2 rounded-xl border-2 border-slate-700 hover:border-yellow-400 text-slate-100 shadow-2xl flex items-center gap-2 text-xs font-bold transition pointer-events-auto"
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
                className="fixed bottom-24 left-3 z-40 border-2 border-slate-700 rounded-xl shadow-2xl px-3 py-2 flex items-center gap-2.5 text-xs text-slate-100 pointer-events-auto"
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
                                    <span
                                        className="truncate inline-flex items-center text-xs tracking-wide"
                                        title={eq.rawInput}
                                        dangerouslySetInnerHTML={{ __html: renderEquationMathHtml(eq.rawInput) }}
                                    />
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
