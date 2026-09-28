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
    'x', 'y', 't', 'theta', 'θ', 'r',
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
    // 1. Number followed by letter or parenthesis: 2x -> 2*x, 2(x) -> 2*(x), 2pi -> 2*pi
    expr = expr.replace(/(\d+(\.\d+)?)\s*([a-zA-Zπθτϕ(])/g, '$1*$3');

    // 2. Closing parenthesis followed by letter or opening parenthesis: (x+1)(x-1) -> (x+1)*(x-1), (x)x -> (x)*x
    expr = expr.replace(/(\))\s*([a-zA-Zπθτϕ(])/g, '$1*$2');

    // 3. Variable followed by opening paren or function: x(x+1) -> x*(x+1) (except known function names)
    // We handle this carefully:
    const funcNames = Object.keys(MATH_FUNCTIONS).join('|');
    const funcRegex = new RegExp(`(?<![a-zA-Z0-9_])(${funcNames})\\s*\\(`, 'g');
    // Temporarily replace valid functions with tokens
    const funcTokens = [];
    expr = expr.replace(funcRegex, (match, fn) => {
        const token = `__FN_${funcTokens.length}__(`;
        funcTokens.push(fn);
        return token;
    });

    // Variable or constant followed by another variable or parenthesis: x y -> x*y, x theta -> x*theta
    expr = expr.replace(/([a-zA-Z0-9_])\s+([a-zA-Z0-9_])/g, (match, a, b) => {
        if (a === 'in' || b === 'in') return match;
        return `${a}*${b}`;
    });

    // Variable followed by parenthesis: x( -> x*(
    expr = expr.replace(/([a-zA-Z0-9_])\s*(\()/g, '$1*$2');

    // Restore functions
    expr = expr.replace(/__FN_(\d+)__\(/g, (m, idx) => {
        return `${funcTokens[parseInt(idx)]}(`;
    });

    // Exponents: a^b -> a**b
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

        // Check for general Implicit equation: f(x, y) = g(x, y) (e.g. x^2 + y^2 = 25)
        if (clean.includes('=')) {
            const [lhs, rhs] = clean.split('=');
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
    const constNames = Object.keys(CONSTANTS);

    // Build argument signature and body
    try {
        const evaluator = new Function(
            'MATH_FUNCTIONS',
            'CONSTANTS',
            'x',
            'y',
            't',
            'theta',
            'params',
            `
            const { ${funcNames.join(', ')} } = MATH_FUNCTIONS;
            const { ${constNames.join(', ')} } = CONSTANTS;
            const { ...p } = params || {};
            ${Object.keys(paramsProxyStub()).map(p => `const ${p} = p['${p}'] !== undefined ? p['${p}'] : 1;`).join('\n')}
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
            const t = vars.t !== undefined ? vars.t : (vars.x || 0);
            const theta = vars.theta !== undefined ? vars.theta : (vars.t || vars.x || 0);
            const val = evaluator(MATH_FUNCTIONS, CONSTANTS, x, y, t, theta, customParams);
            return typeof val === 'number' && !isNaN(val) && isFinite(val) ? val : (isNaN(val) ? NaN : (val > 0 ? Infinity : -Infinity));
        };
    } catch (err) {
        throw new Error(`Syntax error in expression: ${err.message}`);
    }
}

// Helper stub for common single-letter and multi-letter parameter declarations
function paramsProxyStub() {
    const stubs = {};
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDFGHIJKLMNOPQRSTUVWXYZ';
    for (const ch of letters) {
        if (!RESERVED_WORDS.has(ch.toLowerCase())) {
            stubs[ch] = 1;
        }
    }
    // Also include common parameter words
    ['step', 'freq', 'amp', 'phase', 'scale', 'radius', 'offset', 'k1', 'k2', 'm', 'c'].forEach(k => {
        stubs[k] = 1;
    });
    return stubs;
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
