// High-Performance Safe Mathematical Parser, Evaluator, and Calculus Engine for Graph Plotter

// Standard mathematical constants
export const CONSTANTS = {
    pi: Math.PI,
    PI: Math.PI,
    π: Math.PI,
    e: Math.E,
    E: Math.E,
    tau: Math.PI * 2,
    TAU: Math.PI * 2,
    τ: Math.PI * 2,
    phi: (1 + Math.sqrt(5)) / 2,
    PHI: (1 + Math.sqrt(5)) / 2,
    ϕ: (1 + Math.sqrt(5)) / 2,
};

// Recognized math functions
export const MATH_FUNCTIONS = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    cot: (x) => 1 / Math.tan(x),
    sec: (x) => 1 / Math.cos(x),
    csc: (x) => 1 / Math.sin(x),
    asin: Math.asin,
    arcsin: Math.asin,
    acos: Math.acos,
    arccos: Math.acos,
    atan: Math.atan,
    arctan: Math.atan,
    atan2: Math.atan2,
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    exp: Math.exp,
    ln: Math.log,
    log: (x, b) => b ? Math.log(x) / Math.log(b) : Math.log10(x),
    log10: Math.log10,
    log2: Math.log2,
    abs: Math.abs,
    sign: Math.sign,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    min: Math.min,
    max: Math.max,
};

// Reserved words that cannot be user parameters
const RESERVED_WORDS = new Set([
    'x', 'y', 'z', 't', 'theta', 'θ', 'phi', 'ϕ', 'r', 'u', 'v',
    ...Object.keys(CONSTANTS),
    ...Object.keys(MATH_FUNCTIONS),
    'if', 'else', 'true', 'false', 'and', 'or', 'not'
]);

/**
 * Converts LaTeX strings (e.g. from KaTeX or formula keyboards) into normalized math expression syntax
 */
export function latexToMathExpression(latex) {
    if (!latex) return '';
    let expr = latex.trim();

    // Remove wrapping display math delimiters if present
    expr = expr.replace(/^\$\$|\$\$$|^\\\[|\\\]$/g, '').trim();

    // Common LaTeX replacements
    // \frac{a}{b} -> ((a)/(b))
    while (expr.includes('\\frac')) {
        expr = expr.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '(($1)/($2))');
    }

    // \sqrt[n]{x} -> ((x)^(1/(n)))
    expr = expr.replace(/\\sqrt\s*\[\s*([^\]]+)\s*\]\s*\{([^{}]+)\}/g, '(($2)^(1/($1)))');
    // \sqrt{x} -> sqrt(x)
    expr = expr.replace(/\\sqrt\s*\{([^{}]+)\}/g, 'sqrt($1)');

    // Absolute value: \left| x \right| or |x| -> abs(x)
    expr = expr.replace(/\\left\|([^\\|]+)\\right\|/g, 'abs($1)');
    expr = expr.replace(/\|([^|]+)\|/g, 'abs($1)');

    // Greek letters and constants
    expr = expr.replace(/\\pi/g, 'pi');
    expr = expr.replace(/\\theta/g, 'theta');
    expr = expr.replace(/\\tau/g, 'tau');
    expr = expr.replace(/\\phi/g, 'phi');

    // Functions
    expr = expr.replace(/\\sin/g, 'sin');
    expr = expr.replace(/\\cos/g, 'cos');
    expr = expr.replace(/\\tan/g, 'tan');
    expr = expr.replace(/\\cot/g, 'cot');
    expr = expr.replace(/\\sec/g, 'sec');
    expr = expr.replace(/\\csc/g, 'csc');
    expr = expr.replace(/\\arcsin/g, 'asin');
    expr = expr.replace(/\\arccos/g, 'acos');
    expr = expr.replace(/\\arctan/g, 'atan');
    expr = expr.replace(/\\ln/g, 'ln');
    expr = expr.replace(/\\log/g, 'log');

    // Symbols & Operators
    expr = expr.replace(/\\cdot|\\times/g, '*');
    expr = expr.replace(/\\div/g, '/');
    expr = expr.replace(/\\pm/g, '+');
    expr = expr.replace(/\\le|\\leq/g, '<=');
    expr = expr.replace(/\\ge|\\geq/g, '>=');
    expr = expr.replace(/\\neq/g, '!=');

    // Exponents: x^{2} -> x^(2)
    expr = expr.replace(/\^\{([^{}]+)\}/g, '^($1)');

    // Clean remaining braces
    expr = expr.replace(/\{([^{}]+)\}/g, '($1)');
    expr = expr.replace(/\\left\(|\\right\)/g, (m) => m === '\\left(' ? '(' : ')');
    expr = expr.replace(/\\left\[|\\right\]/g, (m) => m === '\\left[' ? '(' : ')');

    return expr.trim();
}

/**
 * Prepares raw user expression for evaluation:
 * - handles implicit multiplication (e.g. 2x -> 2*x, 3(x+1) -> 3*(x+1), x sin(x) -> x*sin(x))
 * - powers: x^y -> x**y
 * - Unicode symbols: π -> pi, θ -> theta, etc.
 */
export function normalizeMathExpression(rawExpr) {
    if (!rawExpr) return '';
    let expr = latexToMathExpression(rawExpr);

    // Replace unicode constants
    expr = expr.replace(/π/g, 'pi');
    expr = expr.replace(/θ/g, 'theta');
    expr = expr.replace(/τ/g, 'tau');
    expr = expr.replace(/ϕ/g, 'phi');
    expr = expr.replace(/√\s*(\w+|\([^)]+\))/g, 'sqrt($1)');
    expr = expr.replace(/≤/g, '<=');
    expr = expr.replace(/≥/g, '>=');
    expr = expr.replace(/≠/g, '!=');

    // Replace absolute value pipes if any remaining: |x| -> abs(x)
    expr = expr.replace(/\|([^|]+)\|/g, 'abs($1)');

    // Implicit multiplication patterns:
    // 1. Number followed by letter, constant, or open paren: 2x -> 2*x, 2(x) -> 2*(x), 2pi -> 2*pi
    expr = expr.replace(/(\d+(\.\d+)?)\s*([a-zA-Zπθτϕ(])/g, '$1*$3');

    // 2. Closing parenthesis followed by letter, number, constant, or open paren: (x+1)(x-1) -> (x+1)*(x-1), (x)2 -> (x)*2
    expr = expr.replace(/(\))\s*([a-zA-Z0-9πθτϕ(])/g, '$1*$2');

    // 3. Number, variable, or constant followed by a math function name: e.g. x sin(x) -> x*sin(x), 2 cos(x) -> 2*cos(x)
    const funcList = Object.keys(MATH_FUNCTIONS).join('|');
    const fnRegex = new RegExp('([a-zA-Z0-9_πθτϕ])\\s+(' + funcList + ')\\b', 'gi');
    expr = expr.replace(fnRegex, '$1*$2');

    // 4. Identifier followed by open paren: x( -> x*(, but sin( -> sin(
    expr = expr.replace(/\b([a-zA-Z0-9_]+)\s*(\()/g, (match, id, paren) => {
        if (MATH_FUNCTIONS[id.toLowerCase()]) {
            return id.toLowerCase() + paren;
        }
        return id + '*' + paren;
    });

    // 5. Exponents: a^b -> a**b
    expr = expr.replace(/\^/g, '**');

    return expr.trim();
}

/**
 * Extracts custom parameters / slider variables from the equation
 * e.g. for "y = a*x^2 + b*x + c", returns ['a', 'b', 'c']
 */
export function extractParameters(rawExpr) {
    if (!rawExpr) return [];
    const normalized = normalizeMathExpression(rawExpr);
    // Find all identifier tokens [a-zA-Z_][a-zA-Z0-9_]*
    const matches = normalized.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    const params = new Set();

    for (const token of matches) {
        if (!RESERVED_WORDS.has(token.toLowerCase()) && !RESERVED_WORDS.has(token)) {
            params.add(token);
        }
    }

    return Array.from(params).sort();
}

/**
 * Parses user equation string into structured representation:
 * Returns: {
 *   type: 'cartesian' | 'polar' | 'parametric' | 'x_relation' | 'implicit' | 'piecewise' | 'inequality',
 *   leftSide: string,
 *   operator: '=' | '<' | '>' | '<=' | '>=',
 *   expression: string,
 *   raw: string,
 *   parameters: string[],
 *   domainRestriction?: { min?: number, max?: number, condition?: string },
 *   piecewiseBranches?: Array<{ condition: string, expr: string }>,
 *   parametric?: { xExpr: string, yExpr: string, tMin: number, tMax: number },
 *   error: null | string
 * }
 */
/**
 * Analyzes 3D equation strings to identify geometric quadrics:
 * - Spheres: z^2 + x^2 + y^2 = 16, x^2 + y^2 + z^2 = 25, (x-x0)^2 + (y-y0)^2 + (z-z0)^2 = R^2
 * - Ellipsoids: (x/a)^2 + (y/b)^2 + (z/c)^2 = 1 or x^2/a + y^2/b + z^2/c = 1
 * - Cylinders: x^2 + y^2 = R^2, etc.
 * - Cones: z^2 = x^2 + y^2
 * - Tori: (sqrt(x^2+y^2) - R)^2 + z^2 = r^2
 * - Dual-sheet quadrics: z^2 = f(x, y)
 */
export function parseQuadricOrImplicit3D(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') return null;

    let clean = rawInput.trim();
    clean = latexToMathExpression(clean);
    clean = clean.replace(/²/g, '^2').replace(/³/g, '^3');
    clean = clean.replace(/\*\*/g, '^');
    clean = clean.replace(/\s+/g, '');

    if (!clean.includes('=')) return null;

    let [lhs, rhs] = clean.split('=');
    if (!lhs || !rhs) return null;

    // Check for explicit sqrt hemisphere form: z = sqrt(16 - x^2 - y^2) or z = -sqrt(...)
    const hemiMatch = clean.match(/^z=([+-])?sqrt\((.+)\)$/i);
    if (hemiMatch) {
        const sign = hemiMatch[1] === '-' ? -1 : 1;
        const inner = hemiMatch[2];
        const rMatch = inner.match(/^(\d+(?:\.\d+)?)-x\^2-y\^2$/) || inner.match(/^(\d+(?:\.\d+)?)-y\^2-x\^2$/);
        if (rMatch) {
            const r2 = parseFloat(rMatch[1]);
            const radius = Math.sqrt(r2);
            return {
                type: 'sphere',
                subType: sign > 0 ? 'upper_hemisphere' : 'lower_hemisphere',
                name: sign > 0 ? 'Hemisphere (Upper)' : 'Hemisphere (Lower)',
                formula: clean,
                center: { x: 0, y: 0, z: 0 },
                radius,
                raw: rawInput
            };
        }
    }

    // Check if equation has form LHS - C = 0 or 0 = LHS - C
    if (rhs === '0') {
        const constMatch = lhs.match(/([+-]\d+(?:\.\d+)?)$/);
        if (constMatch) {
            const num = parseFloat(constMatch[1]);
            lhs = lhs.slice(0, constMatch.index);
            rhs = String(-num);
        }
    } else if (lhs === '0') {
        const constMatch = rhs.match(/([+-]\d+(?:\.\d+)?)$/);
        if (constMatch) {
            const num = parseFloat(constMatch[1]);
            rhs = rhs.slice(0, constMatch.index);
            lhs = String(-num);
            const temp = lhs; lhs = rhs; rhs = temp;
        }
    }

    // Check if equation has form z^2 = R^2 - x^2 - y^2
    if (lhs === 'z^2') {
        const matchRearranged = rhs.match(/^(\d+(?:\.\d+)?)-x\^2-y\^2$/) || rhs.match(/^(\d+(?:\.\d+)?)-y\^2-x\^2$/);
        if (matchRearranged) {
            lhs = 'z^2+x^2+y^2';
            rhs = matchRearranged[1];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. SPHERE DETECTION
    // Terms: (x-x0)^2, (y-y0)^2, (z-z0)^2 in any order on LHS (or RHS)
    // ─────────────────────────────────────────────────────────────────────────
    const testSidesForSphere = (exprStr, constStr) => {
        let rhsVal = NaN;
        try {
            const cleanC = constStr.replace(/\^/g, '**');
            if (/^[\d\s+\-*/().]+$/.test(cleanC)) {
                rhsVal = Function(`"use strict"; return (${cleanC});`)();
            }
        } catch {}
        if (isNaN(rhsVal) || !isFinite(rhsVal) || rhsVal <= 0) {
            rhsVal = parseFloat(constStr);
        }
        if (isNaN(rhsVal) || rhsVal <= 0) return null;

        // Matches squared terms e.g. "z^2", "+x^2", "-x^2", "(x-1)^2", "+(y+2.5)^2"
        const termRegex = /(?:([+-])|^)(?:\(([xyz])([+-]\d+(?:\.\d+)?)?\)|([xyz]))\^2/g;
        const matches = [...exprStr.matchAll(termRegex)];

        if (matches.length === 3) {
            const vars = {};
            let allPlus = true;

            for (const m of matches) {
                const sign = m[1] || '+';
                if (sign === '-') {
                    allPlus = false;
                    break;
                }
                const varName = (m[2] || m[4]).toLowerCase();
                const offset = m[3] ? -parseFloat(m[3]) : 0;
                vars[varName] = offset;
            }

            if (allPlus && 'x' in vars && 'y' in vars && 'z' in vars) {
                const matchedLength = matches.reduce((acc, m) => acc + m[0].length, 0);
                if (matchedLength >= exprStr.length) {
                    const radius = Math.sqrt(rhsVal);
                    return {
                        type: 'sphere',
                        name: 'Sphere',
                        formula: `x² + y² + z² = ${rhsVal}`,
                        center: { x: vars.x || 0, y: vars.y || 0, z: vars.z || 0 },
                        radius,
                        raw: rawInput
                    };
                }
            }
        }
        return null;
    };

    const sphereOnLHS = testSidesForSphere(lhs, rhs);
    if (sphereOnLHS) return sphereOnLHS;

    const sphereOnRHS = testSidesForSphere(rhs, lhs);
    if (sphereOnRHS) return sphereOnRHS;

    // ─────────────────────────────────────────────────────────────────────────
    // 2. ELLIPSOID DETECTION
    // e.g. (x/a)^2 + (y/b)^2 + (z/c)^2 = 1 or x^2/A + y^2/B + z^2/C = 1
    // ─────────────────────────────────────────────────────────────────────────
    const testForEllipsoid = (exprStr, constStr) => {
        const rhsVal = parseFloat(constStr);
        if (isNaN(rhsVal) || rhsVal <= 0) return null;

        const p1Regex = /(?:([+-])|^)\(([xyz])\/(\d+(?:\.\d+)?)\)\^2/g;
        const m1 = [...exprStr.matchAll(p1Regex)];
        if (m1.length === 3) {
            const axes = {};
            for (const m of m1) {
                axes[m[2].toLowerCase()] = parseFloat(m[3]);
            }
            if ('x' in axes && 'y' in axes && 'z' in axes) {
                const scale = Math.sqrt(rhsVal);
                return {
                    type: 'ellipsoid',
                    name: 'Ellipsoid',
                    formula: rawInput,
                    center: { x: 0, y: 0, z: 0 },
                    radii: { x: axes.x * scale, y: axes.y * scale, z: axes.z * scale },
                    raw: rawInput
                };
            }
        }

        const p2Regex = /(?:([+-])|^)(?:\(([xyz])([+-]\d+(?:\.\d+)?)?\)|([xyz]))\^2\/(\d+(?:\.\d+)?)/g;
        const m2 = [...exprStr.matchAll(p2Regex)];
        if (m2.length === 3) {
            const axes = {};
            const center = {};
            for (const m of m2) {
                const v = (m[2] || m[4]).toLowerCase();
                const off = m[3] ? -parseFloat(m[3]) : 0;
                const denom = parseFloat(m[5]);
                axes[v] = Math.sqrt(denom * rhsVal);
                center[v] = off;
            }
            if ('x' in axes && 'y' in axes && 'z' in axes) {
                return {
                    type: 'ellipsoid',
                    name: 'Ellipsoid',
                    formula: rawInput,
                    center,
                    radii: axes,
                    raw: rawInput
                };
            }
        }
        return null;
    };

    const ellipsoid = testForEllipsoid(lhs, rhs) || testForEllipsoid(rhs, lhs);
    if (ellipsoid) return ellipsoid;

    // ─────────────────────────────────────────────────────────────────────────
    // 3. CYLINDER DETECTION
    // e.g. x^2 + y^2 = R^2  (circular cylinder along Z axis)
    // ─────────────────────────────────────────────────────────────────────────
    const testForCylinder = (exprStr, constStr) => {
        const rhsVal = parseFloat(constStr);
        if (isNaN(rhsVal) || rhsVal <= 0) return null;

        const termRegex = /(?:([+-])|^)(?:\(([xy])([+-]\d+(?:\.\d+)?)?\)|([xy]))\^2/g;
        const matches = [...exprStr.matchAll(termRegex)];
        if (matches.length === 2) {
            const vars = {};
            for (const m of matches) {
                const v = (m[2] || m[4]).toLowerCase();
                const off = m[3] ? -parseFloat(m[3]) : 0;
                vars[v] = off;
            }
            if ('x' in vars && 'y' in vars) {
                const r = Math.sqrt(rhsVal);
                return {
                    type: 'cylinder',
                    name: 'Cylinder',
                    formula: `x² + y² = ${rhsVal}`,
                    axis: 'z',
                    center: { x: vars.x, y: vars.y, z: 0 },
                    radius: r,
                    height: r * 2.5,
                    raw: rawInput
                };
            }
        }
        return null;
    };

    const cylinder = testForCylinder(lhs, rhs) || testForCylinder(rhs, lhs);
    if (cylinder) return cylinder;

    // ─────────────────────────────────────────────────────────────────────────
    // 4. CONE DETECTION: z^2 = x^2 + y^2
    // ─────────────────────────────────────────────────────────────────────────
    if (clean === 'z^2=x^2+y^2' || clean === 'x^2+y^2=z^2' || clean === 'x^2+y^2-z^2=0') {
        return {
            type: 'cone',
            name: 'Double Cone',
            formula: 'z² = x² + y²',
            center: { x: 0, y: 0, z: 0 },
            raw: rawInput
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. TORUS DETECTION: (sqrt(x^2+y^2)-R)^2 + z^2 = r^2
    // ─────────────────────────────────────────────────────────────────────────
    const torusMatch = clean.match(/^\(sqrt\(x\^2\+y\^2\)-(\d+(?:\.\d+)?)\)\^2\+z\^2=(\d+(?:\.\d+)?)$/);
    if (torusMatch) {
        const R = parseFloat(torusMatch[1]);
        const r2 = parseFloat(torusMatch[2]);
        return {
            type: 'torus',
            name: 'Torus',
            formula: rawInput,
            majorRadius: R,
            minorRadius: Math.sqrt(r2),
            raw: rawInput
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. DUAL-SHEET SURFACE: z^2 = f(x, y)
    // ─────────────────────────────────────────────────────────────────────────
    if (lhs === 'z^2') {
        return {
            type: 'dual_sheet',
            name: 'Dual-Sheet Surface',
            formula: `z = ±√(${rhs})`,
            expression: rhs,
            raw: rawInput
        };
    } else if (rhs === 'z^2') {
        return {
            type: 'dual_sheet',
            name: 'Dual-Sheet Surface',
            formula: `z = ±√(${lhs})`,
            expression: lhs,
            raw: rawInput
        };
    }

    return null;
}

export function parseEquation(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') {
        return { error: 'Empty expression' };
    }

    const trimmed = rawInput.trim();
    if (!trimmed) return { error: 'Empty expression' };

    try {
        let clean = trimmed;
        let domainRestriction = null;

        // Extract inline domain/range restrictions e.g. "y = x^2 {x >= 0}" or "y = sqrt(x) [0, 10]"
        const restrictionMatch = clean.match(/[\{\[]\s*(.+?)\s*[\}\]]$/);
        if (restrictionMatch) {
            const restrStr = restrictionMatch[1].trim();
            clean = clean.slice(0, restrictionMatch.index).trim();
            domainRestriction = parseRestrictionString(restrStr);
        }

        // Check for Parametric notation: (cos(t), sin(t)) or x = cos(t), y = sin(t)
        if (clean.startsWith('(') && clean.endsWith(')') && clean.includes(',')) {
            const parts = clean.slice(1, -1).split(',');
            if (parts.length === 2) {
                return {
                    type: 'parametric',
                    operator: '=',
                    raw: rawInput,
                    parametric: {
                        xExpr: parts[0].trim(),
                        yExpr: parts[1].trim(),
                        tMin: domainRestriction?.min ?? 0,
                        tMax: domainRestriction?.max ?? Math.PI * 2
                    },
                    parameters: Array.from(new Set([...extractParameters(parts[0]), ...extractParameters(parts[1])])),
                    domainRestriction,
                    error: null
                };
            }
        }

        // Check for Piecewise syntax: e.g. "x < 0: -x, x >= 0: x^2" or "{x < 0: -x; x >= 0: x^2}"
        if ((clean.includes(':') && clean.includes(',')) || (clean.includes(':') && clean.includes(';'))) {
            const branchParts = clean.split(/[,;]/);
            const branches = [];
            for (const part of branchParts) {
                if (part.includes(':')) {
                    const [cond, expr] = part.split(':');
                    branches.push({
                        condition: cond.trim(),
                        expr: expr.trim()
                    });
                }
            }
            if (branches.length > 0) {
                return {
                    type: 'piecewise',
                    operator: '=',
                    raw: rawInput,
                    piecewiseBranches: branches,
                    parameters: Array.from(new Set(branches.flatMap(b => [...extractParameters(b.condition), ...extractParameters(b.expr)]))),
                    domainRestriction,
                    error: null
                };
            }
        }

        // Check for Polar: r = f(theta) or r = f(t)
        const polarMatch = clean.match(/^r\s*=\s*(.+)$/i);
        if (polarMatch) {
            const expr = polarMatch[1].trim();
            return {
                type: 'polar',
                operator: '=',
                leftSide: 'r',
                expression: expr,
                raw: rawInput,
                parameters: extractParameters(expr),
                domainRestriction,
                error: null
            };
        }

        // Check for Inequalities: y < f(x), y > f(x), y <= f(x), y >= f(x)
        const ineqMatch = clean.match(/^(y|x)\s*(<=|>=|<|>)\s*(.+)$/i);
        if (ineqMatch) {
            const leftVar = ineqMatch[1].toLowerCase();
            const op = ineqMatch[2];
            const expr = ineqMatch[3].trim();
            return {
                type: 'inequality',
                ineqVariable: leftVar, // 'y' or 'x'
                operator: op,
                expression: expr,
                raw: rawInput,
                parameters: extractParameters(expr),
                domainRestriction,
                error: null
            };
        }

        // Check for incomplete equations e.g. "y =", "f(x) =", "x =", "r =", "z ="
        if (/^([a-zA-Z](\([xy, ]+\))?|[yxrz])\s*=\s*$/i.test(clean)) {
            const varName = clean.charAt(0).toLowerCase();
            return {
                type: varName === 'r' ? 'polar' : (varName === 'x' ? 'x_relation' : (varName === 'z' ? 'cartesian3d' : 'cartesian')),
                operator: '=',
                leftSide: varName,
                expression: '',
                raw: rawInput,
                parameters: [],
                domainRestriction: null,
                error: 'Please enter a function (e.g. 2x + 1)'
            };
        }

        // Check for 2D function notation: f(x, y) = ... or z(x, y) = ...
        const func2DNotationMatch = clean.match(/^[a-zA-Z]\s*\(\s*x\s*,\s*y\s*\)\s*=\s*(.+)$/i);
        if (func2DNotationMatch) {
            const expr = func2DNotationMatch[1].trim();
            return {
                type: 'cartesian3d',
                operator: '=',
                leftSide: 'z',
                expression: expr,
                raw: rawInput,
                parameters: extractParameters(expr).filter(p => p.toLowerCase() !== 'x' && p.toLowerCase() !== 'y'),
                domainRestriction,
                error: null
            };
        }

        // Check for 3D assignment: z = f(x, y) or z = f(x)
        const zMatch = clean.match(/^z\s*=\s*(.+)$/i);
        if (zMatch) {
            const expr = zMatch[1].trim();
            return {
                type: 'cartesian3d',
                operator: '=',
                leftSide: 'z',
                expression: expr,
                raw: rawInput,
                parameters: extractParameters(expr).filter(p => p.toLowerCase() !== 'x' && p.toLowerCase() !== 'y'),
                domainRestriction,
                error: null
            };
        }

        // Check for function notation: f(x) = ... or g(x) = ...
        const funcNotationMatch = clean.match(/^[a-zA-Z]\s*\(\s*x\s*\)\s*=\s*(.+)$/i);
        if (funcNotationMatch) {
            const expr = funcNotationMatch[1].trim();
            return {
                type: 'cartesian',
                operator: '=',
                leftSide: 'y',
                expression: expr,
                raw: rawInput,
                parameters: extractParameters(expr),
                domainRestriction,
                error: null
            };
        }

        // Check for standard Cartesian assignment: y = f(x)
        const cartesianMatch = clean.match(/^y\s*=\s*(.+)$/i);
        if (cartesianMatch) {
            const expr = cartesianMatch[1].trim();
            return {
                type: 'cartesian',
                operator: '=',
                leftSide: 'y',
                expression: expr,
                raw: rawInput,
                parameters: extractParameters(expr),
                domainRestriction,
                error: null
            };
        }

        // Check for horizontal relation: x = g(y)
        const xRelationMatch = clean.match(/^x\s*=\s*(.+)$/i);
        if (xRelationMatch) {
            const expr = xRelationMatch[1].trim();
            // If the right side contains 'y' and NOT 'x', it's x = g(y)
            const params = extractParameters(expr);
            const hasY = /y\b/i.test(expr);
            const hasX = /x\b/i.test(expr);
            if (hasY || !hasX) {
                return {
                    type: 'x_relation',
                    operator: '=',
                    leftSide: 'x',
                    expression: expr,
                    raw: rawInput,
                    parameters: params.filter(p => p.toLowerCase() !== 'y'),
                    domainRestriction,
                    error: null
                };
            }
        }

        // Check for 3D Quadrics & Implicit geometric surfaces (Sphere, Ellipsoid, Cylinder, Cone, Torus, etc.)
        const quadric = parseQuadricOrImplicit3D(clean);
        if (quadric) {
            return {
                type: 'quadric3d',
                quadricType: quadric.type,
                quadric,
                operator: '=',
                leftSide: clean.split('=')[0].trim(),
                rightSide: clean.split('=')[1].trim(),
                expression: quadric.formula,
                raw: rawInput,
                parameters: [],
                domainRestriction,
                error: null
            };
        }

        // Check for general Implicit equation: f(x, y) = g(x, y) (e.g. x^2 + y^2 = 25)
        if (clean.includes('=')) {
            const [lhs, rhs] = clean.split('=');
            if (!rhs || !rhs.trim()) {
                return {
                    type: 'cartesian',
                    operator: '=',
                    leftSide: lhs.trim(),
                    expression: '',
                    raw: rawInput,
                    parameters: [],
                    domainRestriction: null,
                    error: 'Please enter an expression on the right-hand side'
                };
            }
            return {
                type: 'implicit',
                operator: '=',
                leftSide: lhs.trim(),
                rightSide: rhs.trim(),
                raw: rawInput,
                parameters: Array.from(new Set([...extractParameters(lhs), ...extractParameters(rhs)])),
                domainRestriction,
                error: null
            };
        }

        // Default: Expression is assumed to be f(x) for y = f(x)
        return {
            type: 'cartesian',
            operator: '=',
            leftSide: 'y',
            expression: clean,
            raw: rawInput,
            parameters: extractParameters(clean),
            domainRestriction,
            error: null
        };
    } catch (err) {
        return {
            error: `Invalid expression syntax: ${err.message}`,
            raw: rawInput
        };
    }
}

/**
 * Parses domain/range restriction string like "x >= 0", "0 <= x <= 10", "-5, 5"
 */
function parseRestrictionString(str) {
    if (!str) return null;
    const s = str.trim();

    // Pattern: a <= x <= b or a < x < b
    const rangeMatch = s.match(/([+-]?\d+(?:\.\d+)?)\s*(?:<=|<)\s*[xy]\s*(?:<=|<)\s*([+-]?\d+(?:\.\d+)?)/i);
    if (rangeMatch) {
        return {
            min: parseFloat(rangeMatch[1]),
            max: parseFloat(rangeMatch[2]),
            condition: s
        };
    }

    // Pattern: x >= a or x > a
    const minMatch = s.match(/[xy]\s*(?:>=|>)\s*([+-]?\d+(?:\.\d+)?)/i);
    if (minMatch) {
        return { min: parseFloat(minMatch[1]), condition: s };
    }

    // Pattern: x <= b or x < b
    const maxMatch = s.match(/[xy]\s*(?:<=|<)\s*([+-]?\d+(?:\.\d+)?)/i);
    if (maxMatch) {
        return { max: parseFloat(maxMatch[1]), condition: s };
    }

    // Pattern: [a, b] comma separated numbers
    const commaMatch = s.match(/([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)/);
    if (commaMatch) {
        return {
            min: parseFloat(commaMatch[1]),
            max: parseFloat(commaMatch[2]),
            condition: s
        };
    }

    return { condition: s };
}

/**
 * Compiles a mathematical expression into a fast, safe callable function.
 * Uses strict scope mapping with standard math functions and constants.
 */
export function compileExpression(rawExpr) {
    if (!rawExpr || typeof rawExpr !== 'string') {
        throw new Error('Expression is empty');
    }

    const normalized = normalizeMathExpression(rawExpr);

    // Validate token syntax
    // Ensure no dangerous keywords or prototypes
    if (/(__proto__|constructor|prototype|window|document|eval|Function|fetch|localStorage|alert)/i.test(normalized)) {
        throw new Error('Disallowed expression tokens');
    }

    // Prepare JS evaluation code:
    // Expose Math functions in scope
    const funcNames = Object.keys(MATH_FUNCTIONS);
    const constNames = ['pi', 'e', 'tau', 'phi'];
    const paramsList = extractParameters(normalized);

    // Build argument signature and body
    try {
        const evaluator = new Function(
            'MATH_FUNCTIONS',
            'CONSTANTS',
            'x',
            'y',
            'z',
            't',
            'theta',
            'params',
            `
            const { ${funcNames.join(', ')} } = MATH_FUNCTIONS;
            const { ${constNames.join(', ')} } = CONSTANTS;
            const __user_params__ = params || {};
            ${paramsList.map(p => `const ${p} = (__user_params__['${p}'] !== undefined ? __user_params__['${p}'] : 1);`).join('\n')}
            try {
                return (${normalized});
            } catch (e) {
                return NaN;
            }
            `
        );

        // Pre-bind with math functions and constants
        return function evaluate(vars = {}, customParams = {}) {
            const x = vars.x !== undefined ? vars.x : 0;
            const y = vars.y !== undefined ? vars.y : 0;
            const z = vars.z !== undefined ? vars.z : 0;
            const t = vars.t !== undefined ? vars.t : (vars.x || 0);
            const theta = vars.theta !== undefined ? vars.theta : (vars.t || vars.x || 0);
            const val = evaluator(MATH_FUNCTIONS, CONSTANTS, x, y, z, t, theta, customParams);
            return typeof val === 'number' && !isNaN(val) && isFinite(val) ? val : (isNaN(val) ? NaN : (val > 0 ? Infinity : -Infinity));
        };
    } catch (err) {
        throw new Error(`Syntax error in expression: ${err.message}`);
    }
}

/**
 * Adaptive sampling algorithm for smooth, high-fidelity curve rendering with discontinuity handling.
 * Avoids connecting vertical asymptotes (e.g. 1/x or tan(x)) with vertical lines!
 * 
 * Returns array of continuous path segments: Array<Array<{ x: number, y: number, screenX: number, screenY: number }>>
 */
export function sampleFunctionCurve({
    fn,
    xMin,
    xMax,
    yMin,
    yMax,
    width,
    height,
    params = {},
    minSamples = 400,
    maxSamples = 1600,
    domainRestriction = null
}) {
    if (!fn) return [];

    const segments = [];
    let currentSegment = [];

    const dxScreen = 1; // 1 pixel resolution minimum
    const totalPixels = Math.max(minSamples, Math.min(maxSamples, Math.round(width)));
    const step = (xMax - xMin) / totalPixels;

    const toScreenX = (mathX) => ((mathX - xMin) / (xMax - xMin)) * width;
    const toScreenY = (mathY) => height - ((mathY - yMin) / (yMax - yMin)) * height;

    // Boundary margins for clipping
    const yMargin = (yMax - yMin) * 2;
    const yUpperBound = yMax + yMargin;
    const yLowerBound = yMin - yMargin;

    let prevMathY = null;
    let prevScreenY = null;

    for (let i = 0; i <= totalPixels; i++) {
        const mathX = xMin + i * step;

        // Check domain restrictions
        if (domainRestriction) {
            if (domainRestriction.min !== undefined && mathX < domainRestriction.min - 1e-9) continue;
            if (domainRestriction.max !== undefined && mathX > domainRestriction.max + 1e-9) continue;
        }

        let mathY;
        try {
            mathY = fn({ x: mathX }, params);
        } catch {
            mathY = NaN;
        }

        // Check if value is defined and finite
        if (isNaN(mathY) || !isFinite(mathY)) {
            if (currentSegment.length > 0) {
                segments.push(currentSegment);
                currentSegment = [];
            }
            prevMathY = null;
            prevScreenY = null;
            continue;
        }

        const screenX = toScreenX(mathX);
        const screenY = toScreenY(mathY);

        // Check for vertical asymptote discontinuity:
        // When consecutive points jump across the viewport with opposite signs and enormous derivative
        if (prevMathY !== null && prevScreenY !== null) {
            const yDiff = Math.abs(screenY - prevScreenY);
            const mathDiff = Math.abs(mathY - prevMathY);
            const isOppositeSign = (mathY > 0 && prevMathY < 0) || (mathY < 0 && prevMathY > 0);
            
            // If the jump is massive (greater than height of screen) and sign flipped or slope > 1000
            if ((yDiff > height * 0.8 && isOppositeSign) || (mathDiff > (yMax - yMin) * 1.5 && isOppositeSign)) {
                if (currentSegment.length > 0) {
                    segments.push(currentSegment);
                    currentSegment = [];
                }
                prevMathY = mathY;
                prevScreenY = screenY;
                currentSegment.push({ x: mathX, y: mathY, screenX, screenY });
                continue;
            }
        }

        // Clamp extremely huge offscreen values to prevent SVG coordinate overflow
        const clampedMathY = Math.max(yLowerBound, Math.min(yUpperBound, mathY));
        const clampedScreenY = toScreenY(clampedMathY);

        currentSegment.push({
            x: mathX,
            y: mathY,
            screenX,
            screenY: clampedScreenY
        });

        prevMathY = mathY;
        prevScreenY = screenY;
    }

    if (currentSegment.length > 0) {
        segments.push(currentSegment);
    }

    return segments;
}

/**
 * Samples a polar function r = f(theta)
 */
export function samplePolarCurve({
    fn,
    xMin,
    xMax,
    yMin,
    yMax,
    width,
    height,
    params = {},
    thetaMin = 0,
    thetaMax = Math.PI * 4,
    samples = 1000
}) {
    if (!fn) return [];

    const segments = [];
    let currentSegment = [];

    const toScreenX = (mathX) => ((mathX - xMin) / (xMax - xMin)) * width;
    const toScreenY = (mathY) => height - ((mathY - yMin) / (yMax - yMin)) * height;

    const step = (thetaMax - thetaMin) / samples;

    for (let i = 0; i <= samples; i++) {
        const theta = thetaMin + i * step;
        let r;
        try {
            r = fn({ theta, t: theta, x: theta }, params);
        } catch {
            r = NaN;
        }

        if (isNaN(r) || !isFinite(r)) {
            if (currentSegment.length > 0) {
                segments.push(currentSegment);
                currentSegment = [];
            }
            continue;
        }

        const mathX = r * Math.cos(theta);
        const mathY = r * Math.sin(theta);
        const screenX = toScreenX(mathX);
        const screenY = toScreenY(mathY);

        currentSegment.push({ x: mathX, y: mathY, screenX, screenY, r, theta });
    }

    if (currentSegment.length > 0) {
        segments.push(currentSegment);
    }

    return segments;
}

/**
 * Samples a parametric curve x = f(t), y = g(t)
 */
export function sampleParametricCurve({
    fnX,
    fnY,
    xMin,
    xMax,
    yMin,
    yMax,
    width,
    height,
    params = {},
    tMin = -10,
    tMax = 10,
    samples = 1000
}) {
    if (!fnX || !fnY) return [];

    const segments = [];
    let currentSegment = [];

    const toScreenX = (mathX) => ((mathX - xMin) / (xMax - xMin)) * width;
    const toScreenY = (mathY) => height - ((mathY - yMin) / (yMax - yMin)) * height;

    const step = (tMax - tMin) / samples;

    for (let i = 0; i <= samples; i++) {
        const t = tMin + i * step;
        let mathX, mathY;
        try {
            mathX = fnX({ t, x: t }, params);
            mathY = fnY({ t, y: t }, params);
        } catch {
            mathX = NaN;
            mathY = NaN;
        }

        if (isNaN(mathX) || isNaN(mathY) || !isFinite(mathX) || !isFinite(mathY)) {
            if (currentSegment.length > 0) {
                segments.push(currentSegment);
                currentSegment = [];
            }
            continue;
        }

        const screenX = toScreenX(mathX);
        const screenY = toScreenY(mathY);

        currentSegment.push({ x: mathX, y: mathY, screenX, screenY, t });
    }

    if (currentSegment.length > 0) {
        segments.push(currentSegment);
    }

    return segments;
}

/**
 * Converts curve points segments to SVG Path 'd' attribute string
 */
export function segmentsToSvgPath(segments) {
    if (!segments || segments.length === 0) return '';
    let d = '';

    for (const seg of segments) {
        if (!seg || seg.length === 0) continue;
        d += `M ${seg[0].screenX.toFixed(2)} ${seg[0].screenY.toFixed(2)} `;
        for (let i = 1; i < seg.length; i++) {
            d += `L ${seg[i].screenX.toFixed(2)} ${seg[i].screenY.toFixed(2)} `;
        }
    }

    return d.trim();
}

/**
 * Builds SVG polygon path for inequality shading
 */
export function buildInequalityFillPath({
    segments,
    operator,
    ineqVariable = 'y',
    width,
    height,
    xMin,
    xMax,
    yMin,
    yMax
}) {
    if (!segments || segments.length === 0) return '';

    const toScreenY = (mathY) => height - ((mathY - yMin) / (yMax - yMin)) * height;

    let fillD = '';

    // For y > f(x) or y >= f(x): shade above curve up to top of screen (y = 0 in screen coords)
    // For y < f(x) or y <= f(x): shade below curve down to bottom of screen (y = height in screen coords)
    const isAbove = operator === '>' || operator === '>=';
    const targetScreenY = isAbove ? 0 : height;

    for (const seg of segments) {
        if (!seg || seg.length < 2) continue;

        const first = seg[0];
        const last = seg[seg.length - 1];

        let path = `M ${first.screenX.toFixed(2)} ${targetScreenY} `;
        path += `L ${first.screenX.toFixed(2)} ${first.screenY.toFixed(2)} `;

        for (let i = 1; i < seg.length; i++) {
            path += `L ${seg[i].screenX.toFixed(2)} ${seg[i].screenY.toFixed(2)} `;
        }

        path += `L ${last.screenX.toFixed(2)} ${targetScreenY} Z`;
        fillD += path + ' ';
    }

    return fillD.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// MATHEMATICAL ANALYSIS FEATURES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Numerical derivative at point x: f'(x)
 */
export function numericalDerivative(fn, x, params = {}, h = 1e-5) {
    try {
        const yPlus = fn({ x: x + h }, params);
        const yMinus = fn({ x: x - h }, params);
        return (yPlus - yMinus) / (2 * h);
    } catch {
        return NaN;
    }
}

/**
 * Find roots (x-intercepts) of f(x) = 0 in [xMin, xMax]
 */
export function findRoots(fn, xMin, xMax, params = {}, steps = 300) {
    const roots = [];
    const step = (xMax - xMin) / steps;

    let prevX = xMin;
    let prevY = fn({ x: prevX }, params);

    for (let i = 1; i <= steps; i++) {
        const currX = xMin + i * step;
        const currY = fn({ x: currX }, params);

        if (isNaN(prevY) || isNaN(currY) || !isFinite(prevY) || !isFinite(currY)) {
            prevX = currX;
            prevY = currY;
            continue;
        }

        // Exact zero
        if (Math.abs(currY) < 1e-12) {
            roots.push(roundTo(currX, 4));
        } else if ((prevY < 0 && currY > 0) || (prevY > 0 && currY < 0)) {
            // Check it's not a vertical asymptote jump
            if (Math.abs(currY - prevY) < 50) {
                // Refine with Bisection
                let low = prevX;
                let high = currX;
                let root = (low + high) / 2;

                for (let iter = 0; iter < 24; iter++) {
                    root = (low + high) / 2;
                    const midY = fn({ x: root }, params);
                    if (Math.abs(midY) < 1e-10) break;
                    if ((prevY < 0 && midY < 0) || (prevY > 0 && midY > 0)) {
                        low = root;
                    } else {
                        high = root;
                    }
                }

                const rounded = roundTo(root, 4);
                if (!roots.some(r => Math.abs(r - rounded) < 1e-3)) {
                    roots.push(rounded);
                }
            }
        }

        prevX = currX;
        prevY = currY;
    }

    return roots;
}

/**
 * Find local Extrema (turning points / local max and min)
 */
export function findExtrema(fn, xMin, xMax, params = {}, steps = 250) {
    const extrema = [];
    const step = (xMax - xMin) / steps;

    let prevX = xMin;
    let prevDeriv = numericalDerivative(fn, prevX, params);

    for (let i = 1; i <= steps; i++) {
        const currX = xMin + i * step;
        const currDeriv = numericalDerivative(fn, currX, params);

        if (isNaN(prevDeriv) || isNaN(currDeriv) || !isFinite(prevDeriv) || !isFinite(currDeriv)) {
            prevX = currX;
            prevDeriv = currDeriv;
            continue;
        }

        if ((prevDeriv < 0 && currDeriv > 0) || (prevDeriv > 0 && currDeriv < 0)) {
            // Derivative changed sign -> turning point
            let low = prevX;
            let high = currX;
            let xExt = (low + high) / 2;

            for (let iter = 0; iter < 20; iter++) {
                xExt = (low + high) / 2;
                const d = numericalDerivative(fn, xExt, params);
                if (Math.abs(d) < 1e-8) break;
                if ((prevDeriv < 0 && d < 0) || (prevDeriv > 0 && d > 0)) {
                    low = xExt;
                } else {
                    high = xExt;
                }
            }

            const yVal = fn({ x: xExt }, params);
            if (isFinite(yVal)) {
                const isMax = prevDeriv > 0;
                const roundedX = roundTo(xExt, 4);
                const roundedY = roundTo(yVal, 4);
                if (!extrema.some(e => Math.abs(e.x - roundedX) < 1e-2)) {
                    extrema.push({
                        type: isMax ? 'max' : 'min',
                        label: isMax ? 'Local Max' : 'Local Min',
                        x: roundedX,
                        y: roundedY
                    });
                }
            }
        }

        prevX = currX;
        prevDeriv = currDeriv;
    }

    return extrema;
}

/**
 * Find intersections between two functions f1(x) and f2(x)
 */
export function findIntersections(fn1, fn2, xMin, xMax, params = {}, steps = 250) {
    const diffFn = (vars, p) => fn1(vars, p) - fn2(vars, p);
    const roots = findRoots(diffFn, xMin, xMax, params, steps);
    return roots.map(rx => ({
        x: rx,
        y: roundTo(fn1({ x: rx }, params), 4)
    }));
}

/**
 * Definite Integral using Simpson's Rule: ∫_a^b f(x) dx
 */
export function calculateDefiniteIntegral(fn, a, b, params = {}, n = 200) {
    if (a === b) return 0;
    const isReversed = a > b;
    const lower = isReversed ? b : a;
    const upper = isReversed ? a : b;

    const intervals = n % 2 === 0 ? n : n + 1;
    const h = (upper - lower) / intervals;

    let sum = fn({ x: lower }, params) + fn({ x: upper }, params);

    for (let i = 1; i < intervals; i++) {
        const x = lower + i * h;
        const y = fn({ x }, params);
        if (isNaN(y) || !isFinite(y)) return NaN;
        sum += (i % 2 === 0 ? 2 : 4) * y;
    }

    const result = (h / 3) * sum;
    return isReversed ? -result : result;
}

/**
 * Tangent line parameters at x0: returns { m, y0, equationText }
 */
export function getTangentLine(fn, x0, params = {}) {
    const y0 = fn({ x: x0 }, params);
    const m = numericalDerivative(fn, x0, params);
    if (isNaN(y0) || isNaN(m) || !isFinite(y0) || !isFinite(m)) return null;

    // y - y0 = m(x - x0) => y = mx + (y0 - m*x0)
    const c = y0 - m * x0;
    const sign = c >= 0 ? '+' : '-';
    const absC = Math.abs(c);
    const eqText = `y = ${roundTo(m, 3)}x ${sign} ${roundTo(absC, 3)}`;

    return {
        x0: roundTo(x0, 3),
        y0: roundTo(y0, 3),
        slope: roundTo(m, 4),
        intercept: roundTo(c, 4),
        equationText: eqText,
        evaluate: (x) => m * (x - x0) + y0
    };
}

/**
 * Secant line parameters through x1 and x2: returns { m, y1, y2, equationText }
 */
export function getSecantLine(fn, x1, x2, params = {}) {
    if (Math.abs(x1 - x2) < 1e-9) return null;
    const y1 = fn({ x: x1 }, params);
    const y2 = fn({ x: x2 }, params);
    if (isNaN(y1) || isNaN(y2) || !isFinite(y1) || !isFinite(y2)) return null;

    const m = (y2 - y1) / (x2 - x1);
    const c = y1 - m * x1;
    const sign = c >= 0 ? '+' : '-';
    const eqText = `y = ${roundTo(m, 3)}x ${sign} ${roundTo(Math.abs(c), 3)}`;

    return {
        x1: roundTo(x1, 3),
        y1: roundTo(y1, 3),
        x2: roundTo(x2, 3),
        y2: roundTo(y2, 3),
        slope: roundTo(m, 4),
        equationText: eqText,
        evaluate: (x) => m * (x - x1) + y1
    };
}

function roundTo(num, decimals = 4) {
    if (isNaN(num)) return NaN;
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
}

/**
 * Format math formulas with Unicode superscripts and mathematical typography
 * Converts e.g. x^2 -> x², y = 2x^3 - 4x^-1 -> y = 2x³ - 4x⁻¹, r = 3*sin(2*theta) -> r = 3·sin(2·θ)
 */
export function formatMathSuperscripts(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const SUPERSCRIPTS = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
        '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
        'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ', 'a': 'ᵃ', 'b': 'ᵇ', 't': 'ᵗ'
    };

    // Replace ^(expression)
    let formatted = raw.replace(/\^\(([^)]+)\)/g, (_, exp) => {
        return exp.split('').map(c => SUPERSCRIPTS[c] || c).join('');
    });
    // Replace ^alphanumeric
    formatted = formatted.replace(/\^([0-9a-zA-Z+-]+)/g, (_, exp) => {
        return exp.split('').map(c => SUPERSCRIPTS[c] || c).join('');
    });
    // Replace * with ·
    formatted = formatted.replace(/\*/g, '·');
    // Replace greek letters
    formatted = formatted.replace(/\btheta\b/gi, 'θ');
    formatted = formatted.replace(/\bpi\b/gi, 'π');
    return formatted;
}

