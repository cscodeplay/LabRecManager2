/**
 * Precision 2D Geometry & Parametric Math Solver Service
 * Translates geometric constraints (angles, side lengths, SAS/SSS/ASA, curves, polar coords)
 * into exact 2D coordinate points, SVG paths, and Fabric.js canvas primitives.
 */

class GeometrySolverService {
    /**
     * Solves a triangle from constraints:
     * - SAS: Side A, Angle (deg), Side B
     * - SSS: Side A, Side B, Side C
     * - ASA: Angle A (deg), Side C (between A and B), Angle B (deg)
     * - Right Triangle: Base, Height (or Hypotenuse + Angle)
     */
    solveTriangle({ type = 'SAS', sideA = 100, sideB = 100, sideC = null, angleA = null, angleB = null, angleC = null, originX = 200, originY = 200 }) {
        const toRad = (deg) => (deg * Math.PI) / 180;
        const toDeg = (rad) => (rad * 180) / Math.PI;

        let a = Number(sideA) || 100;
        let b = Number(sideB) || 100;
        let c = Number(sideC);
        let alpha = angleA ? toRad(Number(angleA)) : null; // angle at A (between b and c)
        let beta = angleB ? toRad(Number(angleB)) : null;   // angle at B (between a and c)
        let gamma = angleC ? toRad(Number(angleC)) : null; // angle at C (between a and b)

        let p1 = { x: originX, y: originY, label: 'A' }; // Vertex A at origin
        let p2 = { x: originX + b, y: originY, label: 'B' }; // Vertex B along horizontal axis
        let p3 = { x: originX, y: originY, label: 'C' };

        if (type === 'SAS') {
            // b = side AB, gamma = angle at A, a = side AC
            const angleRad = alpha || gamma || toRad(60);
            p2 = { x: originX + b, y: originY, label: 'B' };
            p3 = {
                x: originX + a * Math.cos(angleRad),
                y: originY - a * Math.sin(angleRad),
                label: 'C'
            };
            c = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(angleRad));
        } else if (type === 'SSS') {
            if (!c) c = 100;
            // Validate triangle inequality
            if (a + b <= c || a + c <= b || b + c <= a) {
                throw new Error('Triangle inequality violated: sum of any two sides must be greater than the third side.');
            }
            // Use law of cosines: cos(A) = (b^2 + c^2 - a^2) / (2 * b * c)
            // Here let base be side c (from A to B)
            p2 = { x: originX + c, y: originY, label: 'B' };
            const cosA = (b * b + c * c - a * a) / (2 * b * c);
            const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
            p3 = {
                x: originX + b * cosA,
                y: originY - b * sinA,
                label: 'C'
            };
        } else if (type === 'ASA') {
            const angA = alpha || toRad(45);
            const angB = beta || toRad(45);
            const angC = Math.PI - angA - angB;
            if (angC <= 0) throw new Error('Sum of angles must be strictly less than 180 degrees.');
            // base is side c (between A and B)
            const base = b || 120;
            p2 = { x: originX + base, y: originY, label: 'B' };
            // By law of sines: side b = base * sin(B) / sin(C)
            const sideToC = (base * Math.sin(angB)) / Math.sin(angC);
            p3 = {
                x: originX + sideToC * Math.cos(angA),
                y: originY - sideToC * Math.sin(angA),
                label: 'C'
            };
        } else if (type === 'RIGHT') {
            // Right-angled at A
            const base = b || 120;
            const height = a || 80;
            p2 = { x: originX + base, y: originY, label: 'B' };
            p3 = { x: originX, y: originY - height, label: 'C' };
        }

        const points = [p1, p2, p3];
        const centroid = {
            x: (p1.x + p2.x + p3.x) / 3,
            y: (p1.y + p2.y + p3.y) / 3
        };

        // Calculate side lengths
        const lenAB = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const lenBC = Math.hypot(p3.x - p2.x, p3.y - p2.y);
        const lenCA = Math.hypot(p1.x - p3.x, p1.y - p3.y);

        // Calculate perimeter & area (Heron's formula)
        const perimeter = lenAB + lenBC + lenCA;
        const s = perimeter / 2;
        const area = Math.sqrt(Math.max(0, s * (s - lenAB) * (s - lenBC) * (s - lenCA)));

        const svgPath = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} Z`;

        return {
            points,
            centroid,
            sideLengths: {
                AB: Math.round(lenAB * 100) / 100,
                BC: Math.round(lenBC * 100) / 100,
                CA: Math.round(lenCA * 100) / 100
            },
            perimeter: Math.round(perimeter * 100) / 100,
            area: Math.round(area * 100) / 100,
            svgPath,
            labels: [
                { text: 'A', x: p1.x - 15, y: p1.y + 15 },
                { text: 'B', x: p2.x + 10, y: p2.y + 15 },
                { text: 'C', x: p3.x, y: p3.y - 12 },
                { text: `${Math.round(lenAB)}`, x: (p1.x + p2.x) / 2, y: p1.y + 18 },
                { text: `${Math.round(lenBC)}`, x: (p2.x + p3.x) / 2 + 15, y: (p2.y + p3.y) / 2 },
                { text: `${Math.round(lenCA)}`, x: (p1.x + p3.x) / 2 - 18, y: (p1.y + p3.y) / 2 }
            ]
        };
    }

    /**
     * Regular polygon generator using polar equations
     * x = cx + r * cos(theta), y = cy + r * sin(theta)
     */
    generateRegularPolygon({ sides = 5, radius = 80, centerX = 200, centerY = 200, rotationDeg = -90 }) {
        const n = Math.max(3, parseInt(sides, 10) || 3);
        const r = Math.max(10, Number(radius) || 80);
        const rotRad = (Number(rotationDeg) * Math.PI) / 180;
        const points = [];

        for (let i = 0; i < n; i++) {
            const angle = rotRad + (2 * Math.PI * i) / n;
            points.push({
                x: Math.round((centerX + r * Math.cos(angle)) * 100) / 100,
                y: Math.round((centerY + r * Math.sin(angle)) * 100) / 100
            });
        }

        const svgPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

        // Calculate side length: s = 2 * r * sin(pi / n)
        const sideLength = 2 * r * Math.sin(Math.PI / n);
        const perimeter = n * sideLength;
        const area = 0.5 * n * r * r * Math.sin((2 * Math.PI) / n);

        return {
            sides: n,
            radius: r,
            center: { x: centerX, y: centerY },
            points,
            sideLength: Math.round(sideLength * 100) / 100,
            perimeter: Math.round(perimeter * 100) / 100,
            area: Math.round(area * 100) / 100,
            svgPath
        };
    }

    /**
     * Samples a mathematical function curve: y = f(x)
     * e.g. sin(x), x^2, cos(2*x), exp(-x^2)
     */
    sampleFunctionCurve({
        expression = 'sin(x)',
        xMin = -10,
        xMax = 10,
        step = 0.2,
        scaleX = 20,
        scaleY = 20,
        centerX = 250,
        centerY = 200
    }) {
        const points = [];
        const minX = Number(xMin) || -10;
        const maxX = Number(xMax) || 10;
        const dx = Math.max(0.02, Number(step) || 0.2);

        // Safe mathematical evaluator for 1-variable function f(x)
        const evalFunc = (x) => {
            try {
                // Support common functions
                const sin = Math.sin, cos = Math.cos, tan = Math.tan;
                const sqrt = Math.sqrt, abs = Math.abs, log = Math.log, exp = Math.exp;
                const pi = Math.PI, e = Math.E, pow = Math.pow;

                // Replace ^ with ** for JavaScript power operator
                let sanitized = expression
                    .replace(/\^/g, '**')
                    .replace(/([0-9]+)x/gi, '$1*x')
                    .replace(/([0-9]+)\(/gi, '$1*(');

                // Safe Function constructor scoped to math parameters
                const fn = new Function('x', 'sin', 'cos', 'tan', 'sqrt', 'abs', 'log', 'exp', 'pi', 'e', 'pow', `return ${sanitized};`);
                return fn(x, sin, cos, tan, sqrt, abs, log, exp, pi, e, pow);
            } catch (err) {
                return 0;
            }
        };

        for (let x = minX; x <= maxX; x += dx) {
            const rawY = evalFunc(x);
            if (Number.isFinite(rawY)) {
                // Canvas coordinates (y inverted)
                const canvasX = centerX + x * scaleX;
                const canvasY = centerY - rawY * scaleY;
                points.push({
                    mathX: Math.round(x * 100) / 100,
                    mathY: Math.round(rawY * 100) / 100,
                    x: Math.round(canvasX * 100) / 100,
                    y: Math.round(canvasY * 100) / 100
                });
            }
        }

        if (points.length === 0) {
            throw new Error('No valid coordinate points generated from function expression.');
        }

        const svgPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

        return {
            expression,
            domain: [minX, maxX],
            pointsCount: points.length,
            points,
            svgPath
        };
    }

    /**
     * Generates text characters along a mathematical curve or path
     * Calculates position and tangent rotation angle for each glyph.
     */
    generateTextAlongCurve({ text = 'Mathematical Equations', curvePoints = [], spacing = 18 }) {
        if (!curvePoints || curvePoints.length < 2) return [];

        const chars = text.split('');
        const placedChars = [];
        let accumulatedDistance = 0;
        let charIndex = 0;

        for (let i = 1; i < curvePoints.length && charIndex < chars.length; i++) {
            const pPrev = curvePoints[i - 1];
            const pCurr = curvePoints[i];
            const segDist = Math.hypot(pCurr.x - pPrev.x, pCurr.y - pPrev.y);

            accumulatedDistance += segDist;

            if (accumulatedDistance >= spacing) {
                accumulatedDistance = 0;
                // Tangent angle
                const angleRad = Math.atan2(pCurr.y - pPrev.y, pCurr.x - pPrev.x);
                const angleDeg = (angleRad * 180) / Math.PI;

                placedChars.push({
                    char: chars[charIndex],
                    x: pCurr.x,
                    y: pCurr.y,
                    rotation: Math.round(angleDeg * 10) / 10
                });
                charIndex++;
            }
        }

        return placedChars;
    }

    /**
     * Solves a circular sector: radius R, angle deltaTheta (deg)
     * Arc length s = R * deltaTheta
     * Area A = 0.5 * R^2 * deltaTheta
     * Perimeter P = 2*R + s
     */
    solveSector({ radius = 80, angleDeg = 60, startAngleDeg = 0, centerX = 180, centerY = 180 }) {
        const R = Math.max(10, Number(radius) || 80);
        const angDeg = Math.max(1, Math.min(360, Number(angleDeg) || 60));
        const startDeg = Number(startAngleDeg) || 0;
        const toRad = (d) => (d * Math.PI) / 180;

        const radDelta = toRad(angDeg);
        const radStart = toRad(startDeg);
        const radEnd = toRad(startDeg + angDeg);

        const arcLength = R * radDelta;
        const area = 0.5 * R * R * radDelta;
        const perimeter = 2 * R + arcLength;

        const p1 = {
            x: Math.round((centerX + R * Math.cos(radStart)) * 100) / 100,
            y: Math.round((centerY + R * Math.sin(radStart)) * 100) / 100
        };
        const p2 = {
            x: Math.round((centerX + R * Math.cos(radEnd)) * 100) / 100,
            y: Math.round((centerY + R * Math.sin(radEnd)) * 100) / 100
        };

        const largeArc = angDeg > 180 ? 1 : 0;
        const svgPath = `M ${centerX} ${centerY} L ${p1.x} ${p1.y} A ${R} ${R} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;

        // Mid-arc point for label
        const midRad = toRad(startDeg + angDeg / 2);
        const midPoint = {
            x: Math.round((centerX + R * Math.cos(midRad)) * 100) / 100,
            y: Math.round((centerY + R * Math.sin(midRad)) * 100) / 100
        };

        return {
            shapeType: 'sector',
            radius: R,
            angleDeg: angDeg,
            arcLength: Math.round(arcLength * 100) / 100,
            area: Math.round(area * 100) / 100,
            perimeter: Math.round(perimeter * 100) / 100,
            center: { x: centerX, y: centerY },
            points: [{ x: centerX, y: centerY, label: 'O' }, p1, p2, midPoint],
            svgPath,
            labels: [
                { text: `r = ${R}`, x: (centerX + p1.x) / 2, y: (centerY + p1.y) / 2 - 8 },
                { text: `θ = ${angDeg}°`, x: centerX + 22 * Math.cos(midRad), y: centerY + 22 * Math.sin(midRad) },
                { text: `s = ${Math.round(arcLength)}`, x: midPoint.x + 12 * Math.cos(midRad), y: midPoint.y + 12 * Math.sin(midRad) }
            ],
            latexFormula: `A = \\frac{1}{2} r^2 \\theta = \\frac{1}{2} (${R})^2 \\left(\\frac{${angDeg}\\pi}{180}\\right) \\approx ${Math.round(area * 100) / 100}`
        };
    }

    /**
     * Solves a circular segment: chord and circular arc region
     * Chord length c = 2 * R * sin(deltaTheta / 2)
     * Area A = 0.5 * R^2 * (deltaTheta - sin(deltaTheta))
     */
    solveSegment({ radius = 80, angleDeg = 60, startAngleDeg = 0, centerX = 180, centerY = 180 }) {
        const R = Math.max(10, Number(radius) || 80);
        const angDeg = Math.max(1, Math.min(360, Number(angleDeg) || 60));
        const startDeg = Number(startAngleDeg) || 0;
        const toRad = (d) => (d * Math.PI) / 180;

        const radDelta = toRad(angDeg);
        const radStart = toRad(startDeg);
        const radEnd = toRad(startDeg + angDeg);

        const chordLength = 2 * R * Math.sin(radDelta / 2);
        const arcLength = R * radDelta;
        const area = 0.5 * R * R * (radDelta - Math.sin(radDelta));
        const perimeter = chordLength + arcLength;

        const p1 = {
            x: Math.round((centerX + R * Math.cos(radStart)) * 100) / 100,
            y: Math.round((centerY + R * Math.sin(radStart)) * 100) / 100
        };
        const p2 = {
            x: Math.round((centerX + R * Math.cos(radEnd)) * 100) / 100,
            y: Math.round((centerY + R * Math.sin(radEnd)) * 100) / 100
        };

        const largeArc = angDeg > 180 ? 1 : 0;
        const svgPath = `M ${p1.x} ${p1.y} A ${R} ${R} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;

        const midRad = toRad(startDeg + angDeg / 2);
        const midArc = {
            x: Math.round((centerX + R * Math.cos(midRad)) * 100) / 100,
            y: Math.round((centerY + R * Math.sin(midRad)) * 100) / 100
        };

        return {
            shapeType: 'segment',
            radius: R,
            angleDeg: angDeg,
            chordLength: Math.round(chordLength * 100) / 100,
            arcLength: Math.round(arcLength * 100) / 100,
            area: Math.round(area * 100) / 100,
            perimeter: Math.round(perimeter * 100) / 100,
            svgPath,
            labels: [
                { text: `chord = ${Math.round(chordLength)}`, x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 + 14 },
                { text: `arc = ${Math.round(arcLength)}`, x: midArc.x, y: midArc.y - 10 }
            ],
            latexFormula: `A = \\frac{1}{2} r^2 (\\theta - \\sin\\theta) \\approx ${Math.round(area * 100) / 100}`
        };
    }

    /**
     * Solves an annular sector (partial ring washer)
     * Area A = 0.5 * (R_outer^2 - R_inner^2) * deltaTheta
     */
    solveAnnulusSector({ rInner = 40, rOuter = 80, angleDeg = 60, startAngleDeg = 0, centerX = 180, centerY = 180 }) {
        const rIn = Math.max(5, Number(rInner) || 40);
        const rOut = Math.max(rIn + 5, Number(rOuter) || 80);
        const angDeg = Math.max(1, Math.min(360, Number(angleDeg) || 60));
        const startDeg = Number(startAngleDeg) || 0;
        const toRad = (d) => (d * Math.PI) / 180;

        const radDelta = toRad(angDeg);
        const radStart = toRad(startDeg);
        const radEnd = toRad(startDeg + angDeg);

        const area = 0.5 * (rOut * rOut - rIn * rIn) * radDelta;
        const largeArc = angDeg > 180 ? 1 : 0;

        const pOutStart = { x: centerX + rOut * Math.cos(radStart), y: centerY + rOut * Math.sin(radStart) };
        const pOutEnd = { x: centerX + rOut * Math.cos(radEnd), y: centerY + rOut * Math.sin(radEnd) };
        const pInEnd = { x: centerX + rIn * Math.cos(radEnd), y: centerY + rIn * Math.sin(radEnd) };
        const pInStart = { x: centerX + rIn * Math.cos(radStart), y: centerY + rIn * Math.sin(radStart) };

        const svgPath = `M ${pOutStart.x} ${pOutStart.y} A ${rOut} ${rOut} 0 ${largeArc} 1 ${pOutEnd.x} ${pOutEnd.y} L ${pInEnd.x} ${pInEnd.y} A ${rIn} ${rIn} 0 ${largeArc} 0 ${pInStart.x} ${pInStart.y} Z`;

        return {
            shapeType: 'annulus_sector',
            rInner: rIn,
            rOuter: rOut,
            angleDeg: angDeg,
            area: Math.round(area * 100) / 100,
            svgPath,
            latexFormula: `A = \\frac{1}{2} (R^2 - r^2) \\theta = \\frac{1}{2} (${rOut}^2 - ${rIn}^2) (${radDelta.toFixed(2)}) \\approx ${Math.round(area * 100) / 100}`
        };
    }

    /**
     * Parabolic arch: y = h * (1 - 4*x^2 / w^2) for x in [-w/2, w/2]
     * Area A = (2/3) * w * h
     */
    solveParabolicArch({ width = 160, height = 100, centerX = 180, centerY = 180, samples = 30 }) {
        const w = Math.max(20, Number(width) || 160);
        const h = Math.max(10, Number(height) || 100);
        const n = Math.max(10, Number(samples) || 30);

        const halfW = w / 2;
        const points = [];
        for (let i = 0; i <= n; i++) {
            const relX = -halfW + (w * i) / n;
            const relY = h * (1 - (4 * relX * relX) / (w * w));
            points.push({
                x: Math.round((centerX + relX) * 100) / 100,
                y: Math.round((centerY - relY) * 100) / 100
            });
        }

        const pathStr = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ` L ${centerX + halfW} ${centerY} L ${centerX - halfW} ${centerY} Z`;
        const area = (2 / 3) * w * h;

        return {
            shapeType: 'parabolic_arch',
            width: w,
            height: h,
            area: Math.round(area * 100) / 100,
            points,
            svgPath: pathStr,
            latexFormula: `A = \\int_{-w/2}^{w/2} h\\left(1 - \\frac{4x^2}{w^2}\\right) dx = \\frac{2}{3} w h = \\frac{2}{3} (${w}) (${h}) = ${Math.round(area * 100) / 100}`
        };
    }

    /**
     * Parses any 2D circle equation (general form Ax^2 + Ay^2 + Dx + Ey + F = C or standard form (x-h)^2 + (y-k)^2 = r^2)
     * from natural problem text and returns { cx, cy, r, rSq, D, E, F, A, raw, standardForm, generalForm }.
     */
    parseCircleEquationFromText(str) {
        if (!str || typeof str !== 'string') return null;

        // Normalize superscripts and unicode minus signs
        const norm = str
            .replace(/²/g, '^2')
            .replace(/³/g, '^3')
            .replace(/[−–—]/g, '-')
            .replace(/\$/g, ' ');

        // Split into clauses (e.g. if there is "and line y = ...") and find the clause with both x and y squared terms
        const clauses = norm.split(/\band\b|,|;/i);
        let candidateRaw = null;

        for (const clause of clauses) {
            const m = clause.match(/((?:\d*\.?\d*\s*\*?\s*)?(?:\(\s*x\s*[+-]\s*\d+(?:\.\d+)?\s*\)|x)\s*\^\s*2[\s\S]*?=\s*[-+0-9xXyY^().\s*/]+)/i) ||
                      clause.match(/((?:\d*\.?\d*\s*\*?\s*)?(?:\(\s*y\s*[+-]\s*\d+(?:\.\d+)?\s*\)|y)\s*\^\s*2[\s\S]*?=\s*[-+0-9xXyY^().\s*/]+)/i);
            if (m) {
                const eqStr = m[1].trim().replace(/[?.!]+$/, '').trim();
                if (/\bx\b/i.test(eqStr) && /\by\b/i.test(eqStr) && !/\bz\b/i.test(eqStr)) {
                    candidateRaw = eqStr;
                    break;
                }
            }
        }

        if (!candidateRaw) return null;

        const eqParts = candidateRaw.split('=');
        if (eqParts.length !== 2) return null;
        const [lhsRaw, rhsRaw] = eqParts.map(s => s.trim());
        if (!lhsRaw || !rhsRaw) return null;

        // Prepare safe JS arithmetic expression for f(x, y) = LHS - RHS
        const toJsExpr = (side) => {
            let s = side.toLowerCase().replace(/\s+/g, '');
            // Only allow safe characters: digits, x, y, ., +, -, *, /, ^, (, )
            if (!/^[0-9xy.+\-*/^()]+$/.test(s)) return null;
            // Implicit multiplication: 2x -> 2*x, 2( -> 2*(, )x -> )*x, )( -> )*(, x( -> x*(
            s = s
                .replace(/(\d(?:\.\d+)?)([xy(])/g, '$1*$2')
                .replace(/(\))([0-9xy(])/g, '$1*$2')
                .replace(/([xy])(\()/g, '$1*$2')
                .replace(/([xy])([xy])/g, '$1*$2')
                .replace(/\^/g, '**');
            return s;
        };

        const lhsJs = toJsExpr(lhsRaw);
        const rhsJs = toJsExpr(rhsRaw);
        if (!lhsJs || !rhsJs) return null;

        try {
            const evalFn = new Function('x', 'y', `"use strict"; return ((${lhsJs}) - (${rhsJs}));`);
            const f00 = evalFn(0, 0);
            const f10 = evalFn(1, 0);
            const fm10 = evalFn(-1, 0);
            const f01 = evalFn(0, 1);
            const f0m1 = evalFn(0, -1);

            if (![f00, f10, fm10, f01, f0m1].every(Number.isFinite)) return null;

            const Ax = (f10 + fm10) / 2 - f00;
            const Ay = (f01 + f0m1) / 2 - f00;
            const D = (f10 - fm10) / 2;
            const E = (f01 - f0m1) / 2;

            // A circle requires equal non-zero x^2 and y^2 coefficients
            if (Math.abs(Ax - Ay) > 1e-6 || Math.abs(Ax) < 1e-6) return null;

            // Verify at two off-axis points that there are no xy or higher-degree terms
            const f23 = evalFn(2, 3);
            const exp23 = Ax * 4 + Ay * 9 + 2 * D + 3 * E + f00;
            if (!Number.isFinite(f23) || Math.abs(f23 - exp23) > 1e-5) return null;

            const fm21 = evalFn(-2, 1.5);
            const expm21 = Ax * 4 + Ay * 2.25 - 2 * D + 1.5 * E + f00;
            if (!Number.isFinite(fm21) || Math.abs(fm21 - expm21) > 1e-5) return null;

            // Normalize by dividing through by Ax so x^2 + y^2 + dNorm*x + eNorm*y + fNorm = 0
            const dNorm = D / Ax;
            const eNorm = E / Ax;
            const fNorm = f00 / Ax;

            const cx = -dNorm / 2;
            const cy = -eNorm / 2;
            const rSq = cx * cx + cy * cy - fNorm;
            if (rSq <= 1e-7) return null;

            const roundNum = (n) => {
                const v = Math.round(n * 10000) / 10000;
                return Object.is(v, -0) ? 0 : v;
            };
            const r = Math.sqrt(rSq);

            return {
                cx: roundNum(cx),
                cy: roundNum(cy),
                r: roundNum(r),
                rSq: roundNum(rSq),
                D: roundNum(dNorm),
                E: roundNum(eNorm),
                F: roundNum(fNorm),
                A: roundNum(Ax),
                raw: candidateRaw.replace(/\s+/g, ' ')
            };
        } catch {
            return null;
        }
    }

    /**
     * Solves standalone 2D Circle properties (Center, Radius, Diameter, Area, Circumference, Standard Form)
     * with full pedagogical Completing-the-Square LaTeX steps.
     */
    solveCircleEquation(circleInput) {
        const parsed = (circleInput && typeof circleInput === 'object' && circleInput.r !== undefined)
            ? circleInput
            : this.parseCircleEquationFromText(typeof circleInput === 'string' ? circleInput : '');

        if (!parsed) {
            throw new Error('Could not parse a valid circle equation.');
        }

        const round2 = (n) => {
            const v = Math.round(n * 100) / 100;
            return Object.is(v, -0) ? 0 : v;
        };
        const cx = round2(parsed.cx);
        const cy = round2(parsed.cy);
        const rSq = round2(parsed.rSq !== undefined ? parsed.rSq : parsed.r * parsed.r);
        const r = round2(Math.sqrt(rSq));
        const diameter = round2(2 * r);
        const area = round2(Math.PI * rSq);
        const circumference = round2(2 * Math.PI * r);

        const formatSqTerm = (centerCoord, varName) => {
            if (Math.abs(centerCoord) < 1e-6) return `${varName}^2`;
            return centerCoord < 0
                ? `(${varName} + ${round2(Math.abs(centerCoord))})^2`
                : `(${varName} - ${round2(centerCoord)})^2`;
        };

        const standardCircleEq = `${formatSqTerm(cx, 'x')} + ${formatSqTerm(cy, 'y')} = ${rSq}`;
        const isPerfectSquareR = Math.abs(r - Math.round(r)) < 1e-6;
        const rLatex = isPerfectSquareR ? `${Math.round(r)}` : `\\sqrt{${rSq}} \\approx ${r}`;
        const areaExactLatex = `${rSq}\\pi`;
        const circumExactLatex = isPerfectSquareR ? `${2 * Math.round(r)}\\pi` : `2\\pi\\sqrt{${rSq}}`;

        return {
            circle: { cx, cy, r, rSq },
            center: { x: cx, y: cy },
            radius: r,
            rSq,
            diameter,
            area,
            circumference,
            rLatex,
            areaExactLatex,
            circumExactLatex,
            equations: {
                originalCircle: parsed.raw || standardCircleEq,
                standardCircle: standardCircleEq
            }
        };
    }

    /**
     * Parses circle equation and line equation from natural problem text
     */
    parseCircleAndLineFromText(str) {
        if (!str || typeof str !== 'string') return null;

        const circle = this.parseCircleEquationFromText(str);

        // Line match: y = mx + c or y = mx - c or y = mx
        let line = null;
        const lineMatch = str.match(/y\s*=\s*([+-]?\s*\d*(?:\.\d+)?)\s*x(?:\s*([+-]\s*\d+(?:\.\d+)?))?/i);
        if (lineMatch) {
            let mStr = (lineMatch[1] || '').replace(/\s+/g, '');
            let m = mStr === '' || mStr === '+' ? 1 : (mStr === '-' ? -1 : parseFloat(mStr));
            let c = lineMatch[2] ? parseFloat(lineMatch[2].replace(/\s+/g, '')) : 0;
            line = { m, k: c, raw: lineMatch[0].replace(/\s+/g, ' ') };
        }

        if (circle && line) {
            return { circle, line };
        }
        return null;
    }

    /**
     * Solves intersection of a Circle and a Line in Cartesian space
     * Supports:
     * - Circle: center (cx, cy), radius r OR general form x^2 + y^2 + 2gx + 2fy + c = 0
     * - Line: y = m*x + k OR Ax + By + C = 0
     */
    solveCircleLineIntersection({
        circle = { cx: 0, cy: 0, r: 5 },
        line = { m: 1, k: 0 }
    }) {
        let cx = Number(circle.cx) || 0;
        let cy = Number(circle.cy) || 0;
        let r = Number(circle.r) || 5;
        let rawCircleEq = circle.raw || circle.equation || null;

        // If circle is given in general form x^2 + y^2 + 2gx + 2fy + c = 0
        if (circle.g !== undefined && circle.f !== undefined && circle.c !== undefined) {
            cx = -Number(circle.g);
            cy = -Number(circle.f);
            const rSq = cx * cx + cy * cy - Number(circle.c);
            if (rSq <= 0) throw new Error('Circle radius is imaginary or zero.');
            r = Math.sqrt(rSq);
        } else if (circle.D !== undefined || circle.d !== undefined) {
            // General form: x^2 + y^2 + Dx + Ey + F = 0
            const Dval = Number(circle.D !== undefined ? circle.D : circle.d);
            const Eval = Number(circle.E !== undefined ? circle.E : circle.e);
            const Fval = Number(circle.F !== undefined ? circle.F : (circle.c !== undefined ? circle.c : circle.f));
            cx = -Dval / 2;
            cy = -Eval / 2;
            const rSq = cx * cx + cy * cy - Fval;
            if (rSq <= 0) throw new Error('Circle radius is imaginary or zero.');
            r = Math.sqrt(rSq);
            if (!rawCircleEq) {
                const dSign = Dval >= 0 ? `+ ${Dval}` : `- ${Math.abs(Dval)}`;
                const eSign = Eval >= 0 ? `+ ${Eval}` : `- ${Math.abs(Eval)}`;
                const fSign = Fval >= 0 ? `+ ${Fval}` : `- ${Math.abs(Fval)}`;
                rawCircleEq = `x^2 + y^2 ${dSign}x ${eSign}y ${fSign} = 0`;
            }
        }

        const m = Number(line.m) !== undefined ? Number(line.m) : 1;
        const k = Number(line.k !== undefined ? line.k : (line.c !== undefined ? line.c : (line.intercept !== undefined ? line.intercept : 0)));

        // Quadratic equation: (x - cx)^2 + (m*x + k - cy)^2 = r^2
        // Let yDiff = k - cy
        // (1 + m^2)*x^2 + 2*(m*yDiff - cx)*x + (cx^2 + yDiff^2 - r^2) = 0
        const yDiff = k - cy;
        const A = 1 + m * m;
        const B = 2 * (m * yDiff - cx);
        const C = cx * cx + yDiff * yDiff - r * r;

        const D = B * B - 4 * A * C;
        const intersections = [];
        let status = 'no_intersection';

        if (Math.abs(D) < 1e-9) {
            status = 'tangent';
            const x = -B / (2 * A);
            const y = m * x + k;
            intersections.push({ x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
        } else if (D > 0) {
            status = 'secant';
            const sqrtD = Math.sqrt(D);
            const x1 = (-B + sqrtD) / (2 * A);
            const y1 = m * x1 + k;
            const x2 = (-B - sqrtD) / (2 * A);
            const y2 = m * x2 + k;
            intersections.push({ x: Math.round(x1 * 100) / 100, y: Math.round(y1 * 100) / 100 });
            intersections.push({ x: Math.round(x2 * 100) / 100, y: Math.round(y2 * 100) / 100 });
        }

        // Clean LaTeX and human formatting without double-minuses (e.g. "x - -1.5")
        const formatTerm = (val, varName) => {
            if (val === 0) return `${varName}^2`;
            return val < 0 ? `(${varName} + ${Math.abs(val)})^2` : `(${varName} - ${val})^2`;
        };
        const standardCircleEq = `${formatTerm(cx, 'x')} + ${formatTerm(cy, 'y')} = ${(r * r).toFixed(2)}`;
        const lineEq = `y = ${m === 1 ? '' : (m === -1 ? '-' : m)}x ${k >= 0 ? `+ ${k}` : `- ${Math.abs(k)}`}`;
        const roundNum = (n) => Math.round(n * 100) / 100;

        const bSign = B >= 0 ? `+ ${roundNum(B)}` : `- ${roundNum(Math.abs(B))}`;
        const cSign = C >= 0 ? `+ ${roundNum(C)}` : `- ${roundNum(Math.abs(C))}`;
        const quadEq = `${roundNum(A)}x^2 ${bSign}x ${cSign} = 0`;

        return {
            status,
            circle: { cx: roundNum(cx), cy: roundNum(cy), r: roundNum(r) },
            center: { x: roundNum(cx), y: roundNum(cy) },
            radius: roundNum(r),
            rSq: roundNum(r * r),
            line: { m, k },
            discriminant: roundNum(D),
            intersections,
            intersectionPoints: intersections,
            equations: {
                originalCircle: rawCircleEq || standardCircleEq,
                circle: standardCircleEq,
                line: lineEq,
                quadratic: quadEq
            },
            latexSteps: [
                rawCircleEq
                    ? `\\text{Given Circle: } ${rawCircleEq} \\iff ${standardCircleEq}`
                    : `\\text{Circle: } ${standardCircleEq}`,
                `\\text{Center: } C(${roundNum(cx)}, ${roundNum(cy)}), \\quad \\text{Radius } r = \\sqrt{${roundNum(r * r)}} \\approx ${roundNum(r)}`,
                `\\text{Given Line: } ${lineEq}`,
                `\\text{Substitute } y \\text{ into circle: } ${quadEq}`,
                `\\Delta = b^2 - 4ac = (${roundNum(B)})^2 - 4(${roundNum(A)})(${roundNum(C)}) = ${roundNum(D)} \\implies ${intersections.length} \\text{ real point(s)}`,
                intersections.length === 2
                    ? `\\text{Roots: } x_1 = ${intersections[0].x}, \\; x_2 = ${intersections[1].x} \\implies P_1(${intersections[0].x}, ${intersections[0].y}) \\text{ and } P_2(${intersections[1].x}, ${intersections[1].y})`
                    : (intersections.length === 1 ? `\\text{Point of tangency: } P(${intersections[0].x}, ${intersections[0].y})` : `\\text{No real intersection points}`)
            ]
        };
    }

    /**
     * 3D Vector Operations Solver (CBSE Class 12 / College Math)
     * Solves magnitudes, dot product, cross product, angles, and unit vectors.
     */
    solveVectors({ a = [1, 0, 0], b = [0, 1, 0] }) {
        const ax = Number(a[0]) || 0, ay = Number(a[1]) || 0, az = Number(a[2]) || 0;
        const bx = Number(b[0]) || 0, by = Number(b[1]) || 0, bz = Number(b[2]) || 0;

        const magA = Math.sqrt(ax * ax + ay * ay + az * az);
        const magB = Math.sqrt(bx * bx + by * by + bz * bz);

        // Dot product: a . b = ax*bx + ay*by + az*bz
        const dotProduct = ax * bx + ay * by + az * bz;

        // Angle theta: cos(theta) = dot / (|a| * |b|)
        let angleDeg = 0;
        let angleRad = 0;
        if (magA > 0 && magB > 0) {
            const cosTheta = Math.max(-1, Math.min(1, dotProduct / (magA * magB)));
            angleRad = Math.acos(cosTheta);
            angleDeg = (angleRad * 180) / Math.PI;
        }

        // Cross product: a x b = (ay*bz - az*by)i - (ax*bz - az*bx)j + (ax*by - ay*bx)k
        const cross = [
            ay * bz - az * by,
            az * bx - ax * bz,
            ax * by - ay * bx
        ];
        const magCross = Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2]);

        // Direction cosines of a
        const dirCosA = magA > 0 ? [ax / magA, ay / magA, az / magA] : [0, 0, 0];

        // Normal unit vector
        const unitNormal = magCross > 0 ? [cross[0] / magCross, cross[1] / magCross, cross[2] / magCross] : [0, 0, 0];

        const formatVec = (v) => `${v[0]}\\hat{i} ${v[1] >= 0 ? '+' : ''}${v[1]}\\hat{j} ${v[2] >= 0 ? '+' : ''}${v[2]}\\hat{k}`;

        return {
            vectorA: [ax, ay, az],
            vectorB: [bx, by, bz],
            a: [ax, ay, az],
            b: [bx, by, bz],
            magnitudeA: Math.round(magA * 100) / 100,
            magnitudeB: Math.round(magB * 100) / 100,
            magA: Math.round(magA * 100) / 100,
            magB: Math.round(magB * 100) / 100,
            dotProduct: Math.round(dotProduct * 100) / 100,
            angleDeg: Math.round(angleDeg * 10) / 10,
            angleRad: Math.round(angleRad * 100) / 100,
            crossProduct: cross.map((c) => Math.round(c * 100) / 100),
            magnitudeCross: Math.round(magCross * 100) / 100,
            magCross: Math.round(magCross * 100) / 100,
            unitNormal: unitNormal.map((u) => Math.round(u * 100) / 100),
            directionCosinesA: dirCosA.map((d) => Math.round(d * 100) / 100),
            latexSummary: {
                vecA: `\\vec{a} = ${formatVec([ax, ay, az])}`,
                vecB: `\\vec{b} = ${formatVec([bx, by, bz])}`,
                dot: `\\vec{a} \\cdot \\vec{b} = (${ax})(${bx}) + (${ay})(${by}) + (${az})(${bz}) = ${dotProduct}`,
                angle: `\\theta = \\arccos\\left(\\frac{\\vec{a}\\cdot\\vec{b}}{|\\vec{a}||\\vec{b}|}\\right) \\approx ${Math.round(angleDeg * 10) / 10}^\\circ`,
                cross: `\\vec{a} \\times \\vec{b} = ${formatVec(cross)}`,
                magCross: `|\\vec{a} \\times \\vec{b}| = ${Math.round(magCross * 100) / 100}`
            }
        };
    }

    /**
     * 3D Solid Measurements Solver: Volume & Surface Area
     * Cylinder, Cone, Sphere, Frustum, Hemisphere, Capsule
     */
    solveSolid({ shape = 'cylinder', radius = 5, height = 10, r1 = 8, r2 = 4, length = 12 }) {
        const sh = (shape || 'cylinder').toLowerCase();
        const r = Math.max(0.1, Number(radius) || 5);
        const h = Math.max(0.1, Number(height) || 10);
        const pi = Math.PI;

        let volume = 0;
        let curvedArea = 0;
        let totalArea = 0;
        let steps = [];

        if (sh === 'cylinder') {
            volume = pi * r * r * h;
            curvedArea = 2 * pi * r * h;
            totalArea = 2 * pi * r * (h + r);
            steps = [
                `V = \\pi r^2 h = \\pi (${r})^2 (${h}) = ${Math.round(r * r * h)}\\pi \\approx ${Math.round(volume * 100) / 100}`,
                `S_{\\text{curved}} = 2\\pi r h = 2\\pi (${r})(${h}) = ${Math.round(2 * r * h)}\\pi \\approx ${Math.round(curvedArea * 100) / 100}`,
                `S_{\\text{total}} = 2\\pi r (h + r) = 2\\pi (${r})(${h + r}) = ${Math.round(2 * r * (h + r))}\\pi \\approx ${Math.round(totalArea * 100) / 100}`
            ];
        } else if (sh === 'sphere') {
            volume = (4 / 3) * pi * Math.pow(r, 3);
            curvedArea = 4 * pi * r * r;
            totalArea = curvedArea;
            steps = [
                `V = \\frac{4}{3}\\pi r^3 = \\frac{4}{3}\\pi (${r})^3 \\approx ${Math.round(volume * 100) / 100}`,
                `S_{\\text{total}} = 4\\pi r^2 = 4\\pi (${r})^2 = ${Math.round(4 * r * r)}\\pi \\approx ${Math.round(totalArea * 100) / 100}`
            ];
        } else if (sh === 'cone') {
            const slant = Math.sqrt(r * r + h * h);
            volume = (1 / 3) * pi * r * r * h;
            curvedArea = pi * r * slant;
            totalArea = pi * r * (r + slant);
            steps = [
                `l = \\sqrt{r^2 + h^2} = \\sqrt{${r}^2 + ${h}^2} \\approx ${Math.round(slant * 100) / 100}`,
                `V = \\frac{1}{3}\\pi r^2 h = \\frac{1}{3}\\pi (${r})^2 (${h}) \\approx ${Math.round(volume * 100) / 100}`,
                `S_{\\text{curved}} = \\pi r l \\approx ${Math.round(curvedArea * 100) / 100}`,
                `S_{\\text{total}} = \\pi r (r + l) \\approx ${Math.round(totalArea * 100) / 100}`
            ];
        } else if (sh === 'frustum') {
            const rad1 = Math.max(0.1, Number(r1) || 8);
            const rad2 = Math.max(0.1, Number(r2) || 4);
            const slant = Math.sqrt(h * h + Math.pow(rad1 - rad2, 2));
            volume = (1 / 3) * pi * h * (rad1 * rad1 + rad2 * rad2 + rad1 * rad2);
            curvedArea = pi * (rad1 + rad2) * slant;
            totalArea = curvedArea + pi * rad1 * rad1 + pi * rad2 * rad2;
            steps = [
                `l = \\sqrt{h^2 + (r_1 - r_2)^2} = \\sqrt{${h}^2 + (${rad1} - ${rad2})^2} \\approx ${Math.round(slant * 100) / 100}`,
                `V = \\frac{1}{3}\\pi h (r_1^2 + r_2^2 + r_1 r_2) \\approx ${Math.round(volume * 100) / 100}`,
                `S_{\\text{curved}} = \\pi (r_1 + r_2) l \\approx ${Math.round(curvedArea * 100) / 100}`,
                `S_{\\text{total}} = S_{\\text{curved}} + \\pi r_1^2 + \\pi r_2^2 \\approx ${Math.round(totalArea * 100) / 100}`
            ];
        } else if (sh === 'hemisphere') {
            volume = (2 / 3) * pi * Math.pow(r, 3);
            curvedArea = 2 * pi * r * r;
            totalArea = 3 * pi * r * r;
            steps = [
                `V = \\frac{2}{3}\\pi r^3 = \\frac{2}{3}\\pi (${r})^3 \\approx ${Math.round(volume * 100) / 100}`,
                `S_{\\text{curved}} = 2\\pi r^2 = 2\\pi (${r})^2 = ${Math.round(2 * r * r)}\\pi \\approx ${Math.round(curvedArea * 100) / 100}`,
                `S_{\\text{total}} = 3\\pi r^2 = 3\\pi (${r})^2 = ${Math.round(3 * r * r)}\\pi \\approx ${Math.round(totalArea * 100) / 100}`
            ];
        } else if (sh === 'capsule') {
            // Cylinder of length h with 2 hemispherical end caps of radius r
            const bodyVol = pi * r * r * h;
            const capVol = (4 / 3) * pi * Math.pow(r, 3);
            volume = bodyVol + capVol;
            curvedArea = 2 * pi * r * h + 4 * pi * r * r;
            totalArea = curvedArea;
            steps = [
                `V = \\pi r^2 h + \\frac{4}{3}\\pi r^3 \\approx ${Math.round(volume * 100) / 100}`,
                `S = 2\\pi r h + 4\\pi r^2 \\approx ${Math.round(totalArea * 100) / 100}`
            ];
        }

        return {
            shape: sh,
            dimensions: { radius: r, height: h, r1, r2 },
            volume: Math.round(volume * 100) / 100,
            curvedSurfaceArea: Math.round(curvedArea * 100) / 100,
            totalSurfaceArea: Math.round(totalArea * 100) / 100,
            surfaceArea: Math.round(totalArea * 100) / 100,
            lateralArea: Math.round(curvedArea * 100) / 100,
            latexSteps: steps
        };
    }

    /**
     * Parses composite geometry problems from text (e.g. square with inscribed circle, finding remaining/shaded area).
     */
    parseCompositeGeometryFromText(text) {
        if (!text || typeof text !== 'string') return null;
        const low = text.toLowerCase();

        const hasCompositeKeywords = /\b(inscribed|circumscribed|remaining\s*(?:part|area|portion)|shaded\s*(?:area|region|part)|cutout|cut\s*out|leftover|between\s*(?:the)?\s*(?:square|circle|shapes)|annulus|concentric|ring)\b/i.test(low);
        const hasSquare = /\bsquare\b/i.test(low);
        const hasCircle = /\bcircle\b/i.test(low);
        const hasConcentric = /\bconcentric\b/i.test(low) || (/\bring\b/i.test(low) && hasCircle);

        if (!hasCompositeKeywords && !(hasSquare && hasCircle)) return null;

        const unitMatch = low.match(/\b(cm|m|mm|inches|inch|ft|feet|units)\b/i);
        const unit = unitMatch ? unitMatch[1] : 'cm';

        // 1. Concentric circles / Annulus ring
        if (hasConcentric) {
            const radiiMatches = [...low.matchAll(/(?:radius|radii|r\d?|r)\s*(?:of|=|is|:)?\s*(\d+(?:\.\d+)?)/gi)].map(m => Number(m[1]));
            let r1 = 7, r2 = 14;
            if (radiiMatches.length >= 2) {
                r1 = Math.min(radiiMatches[0], radiiMatches[1]);
                r2 = Math.max(radiiMatches[0], radiiMatches[1]);
            } else if (radiiMatches.length === 1) {
                r1 = radiiMatches[0];
                r2 = r1 * 2;
            }
            return {
                subtype: 'concentric_circles',
                r1,
                r2,
                unit,
                rawText: text
            };
        }

        // 2. Square with Inscribed Circle (or Circle Inscribed in Square)
        if (hasSquare && hasCircle) {
            const isCircleInSquare = /\b(circle\s*inscribed\s*in\s*(?:a\s*)?square|square\s*(?:which\s*has\s*|with\s*(?:an?\s*)?)?circle\s*inscribed|diameter\s*equal\s*to\s*side|inscribed\s*in\s*it\s*with\s*diameter|remaining\s*part\s*for\s*square)\b/i.test(low) || !/\bsquare\s*inscribed\s*in\s*(?:a\s*)?circle\b/i.test(low);

            if (isCircleInSquare) {
                // Extract side length
                let side = null;
                const sideMatch = low.match(/(?:side\s*length|side\s*of|side)\s*(?:of|=|is|:)?\s*(\d+(?:\.\d+)?)/i);
                if (sideMatch) side = Number(sideMatch[1]);

                if (!side) {
                    const diaMatch = low.match(/(?:diameter\s*of|diameter)\s*(?:of|=|is|:)?\s*(\d+(?:\.\d+)?)/i);
                    if (diaMatch) side = Number(diaMatch[1]);
                }
                if (!side) {
                    const radMatch = low.match(/(?:radius\s*of|radius)\s*(?:of|=|is|:)?\s*(\d+(?:\.\d+)?)/i);
                    if (radMatch) side = Number(radMatch[1]) * 2;
                }
                if (!side) {
                    const numMatch = low.match(/(\d+(?:\.\d+)?)\s*(?:cm|m|mm|units)?\s*square/i);
                    if (numMatch) side = Number(numMatch[1]);
                }

                const isGeneral = !side;
                const resolvedSide = side || 14; // Standard textbook default (s = 14 => r = 7 => integer area 154)

                return {
                    subtype: 'square_circle_inscribed',
                    side: resolvedSide,
                    radius: resolvedSide / 2,
                    diameter: resolvedSide,
                    isGeneral,
                    unit,
                    rawText: text
                };
            } else {
                // Square inscribed in circle
                let radius = null;
                const radMatch = low.match(/(?:radius\s*of|radius)\s*(?:of|=|is|:)?\s*(\d+(?:\.\d+)?)/i);
                if (radMatch) radius = Number(radMatch[1]);
                const resolvedRad = radius || 10;
                return {
                    subtype: 'circle_square_inscribed',
                    radius: resolvedRad,
                    unit,
                    rawText: text
                };
            }
        }

        return null;
    }

    /**
     * Solves composite geometry problems with exact step-by-step LaTeX and diagram specifications.
     */
    solveCompositeGeometry(parsed) {
        if (!parsed) return null;
        const { subtype, unit, rawText } = parsed;

        if (subtype === 'square_circle_inscribed') {
            const s = parsed.side;
            const r = parsed.radius;
            const pi = Math.PI;
            const areaSquare = s * s;
            const areaCircleExact = r * r;
            const areaCircleDec = Math.round(pi * r * r * 100) / 100;
            const areaCirclePi227 = Math.round((22 / 7) * r * r * 100) / 100;
            const areaRemExactDec = Math.round((areaSquare - pi * r * r) * 100) / 100;
            const areaRemPi227 = Math.round((areaSquare - (22 / 7) * r * r) * 100) / 100;

            const formulaLatex = `A_{\\text{remaining}} = A_{\\text{square}} - A_{\\text{circle}} = s^2 - \\pi r^2 = s^2 - \\pi \\left(\\frac{s}{2}\\right)^2 = s^2\\left(1 - \\frac{\\pi}{4}\\right)`;

            const isGen = parsed.isGeneral;
            const speechResponse = isGen
                ? `For a square of side s with an inscribed circle of diameter d = s (radius r = s/2), the area of the square is s² and the circle is π(s/2)². The area of the remaining shaded corner region is s²(1 - π/4), which is approximately 0.2146 s². For instance, with side s = 14 ${unit}, the square has area 196 ${unit}², the circle 154 ${unit}², leaving 42 ${unit}² in the four corners.`
                : `For a square of side ${s} ${unit} with an inscribed circle of diameter ${s} ${unit} (radius ${r} ${unit}), the area of the square is ${areaSquare} ${unit}² and the circle's area is ${areaCircleExact}π ≈ ${areaCircleDec} ${unit}². Subtracting the circle gives the remaining shaded corner area as ${areaRemExactDec} ${unit}² (or ${areaRemPi227} ${unit}² using π ≈ 22/7).`;

            const solutionMarkdown = `### 📌 Given & Concept\n` +
                `- **Square Side Length:** $s = ${s}\\text{ ${unit}}$\n` +
                `- **Inscribed Circle Diameter:** $d = s = ${s}\\text{ ${unit}}$\n` +
                `- **Inscribed Circle Radius:** $r = \\frac{d}{2} = \\frac{s}{2} = ${r}\\text{ ${unit}}$\n` +
                `- **Target Region:** Area of the remaining portion (the 4 shaded corner regions between the square and the inscribed circle).\n\n` +
                `### 📐 Formula\n` +
                `$$${formulaLatex}$$\n\n` +
                `### 🔢 Step-by-Step Solution\n` +
                `1. **Area of the Square ($A_{\\text{square}}$):**\n` +
                `   $$A_{\\text{square}} = s^2 = (${s})^2 = ${areaSquare}\\text{ ${unit}}^2$$\n` +
                `2. **Area of the Inscribed Circle ($A_{\\text{circle}}$):**\n` +
                `   Since the circle touches all four sides of the square, its diameter equals the side length ($d = s = ${s}\\text{ ${unit}}$), so $r = ${r}\\text{ ${unit}}$:\n` +
                `   $$A_{\\text{circle}} = \\pi r^2 = \\pi (${r})^2 = ${areaCircleExact}\\pi \\approx ${areaCircleDec}\\text{ ${unit}}^2$$\n` +
                `   *(Using $\\pi \\approx \\frac{22}{7}$: $A_{\\text{circle}} = \\frac{22}{7} \\times ${r}^2 = ${areaCirclePi227}\\text{ ${unit}}^2$)*\n` +
                `3. **Area of the Remaining (Shaded) Corner Part:**\n` +
                `   Subtract the circle's area from the square's area:\n` +
                `   $$A_{\\text{remaining}} = A_{\\text{square}} - A_{\\text{circle}} = ${areaSquare} - ${areaCircleExact}\\pi \\approx ${areaSquare} - ${areaCircleDec} = ${areaRemExactDec}\\text{ ${unit}}^2$$\n` +
                `   *(With $\\pi \\approx \\frac{22}{7}$: $A_{\\text{remaining}} = ${areaSquare} - ${areaCirclePi227} = ${areaRemPi227}\\text{ ${unit}}^2$)*\n\n` +
                `### ✅ Final Answer\n` +
                `$$\\boxed{A_{\\text{remaining}} = ${areaSquare} - ${areaCircleExact}\\pi \\approx ${areaRemExactDec}\\text{ ${unit}}^2 \\quad \\left(\\text{or } ${areaRemPi227}\\text{ ${unit}}^2 \\text{ using } \\pi = \\frac{22}{7}\\right)}$$`;

            const diagramProps = {
                subtype: 'square_circle_inscribed',
                sideValue: s,
                radiusValue: r,
                diameterValue: s,
                unit,
                sideLabel: `s = ${s} ${unit}`,
                radiusLabel: `r = ${r} ${unit}`,
                diameterLabel: `d = s = ${s} ${unit}`,
                areaFormulaLabel: `Shaded Area = ${areaRemExactDec} ${unit}² (${areaSquare} - ${areaCircleExact}π)`,
                color: '#6366f1'
            };

            return {
                subtype,
                speechResponse,
                solutionMarkdown,
                diagramProps,
                suggestedFollowUps: [
                    `🔢 Area with side 20 ${unit}`,
                    `⭕ Perimeter of remaining boundary`,
                    `📐 Circle circumscribing square`,
                    `📄 Clean blank board`
                ]
            };
        }

        if (subtype === 'concentric_circles') {
            const { r1, r2 } = parsed;
            const pi = Math.PI;
            const aOuter = Math.round(pi * r2 * r2 * 100) / 100;
            const aInner = Math.round(pi * r1 * r1 * 100) / 100;
            const aRing = Math.round(pi * (r2 * r2 - r1 * r1) * 100) / 100;
            const aRingExact = r2 * r2 - r1 * r1;

            const speechResponse = `For concentric circles with inner radius ${r1} ${unit} and outer radius ${r2} ${unit}, the area of the circular ring path is π(r₂² - r₁²) = ${aRingExact}π ≈ ${aRing} ${unit}².`;

            const solutionMarkdown = `### 📌 Given & Concept\n` +
                `- **Inner Radius:** $r_1 = ${r1}\\text{ ${unit}}$\n` +
                `- **Outer Radius:** $r_2 = ${r2}\\text{ ${unit}}$\n` +
                `- **Ring (Annulus) Area:** Area between the two concentric circles.\n\n` +
                `### 📐 Formula\n` +
                `$$A_{\\text{ring}} = \\pi (r_2^2 - r_1^2) = \\pi (r_2 - r_1)(r_2 + r_1)$$\n\n` +
                `### 🔢 Step-by-Step Solution\n` +
                `1. **Outer Circle Area:** $A_2 = \\pi r_2^2 = \\pi (${r2})^2 = ${r2 * r2}\\pi \\approx ${aOuter}\\text{ ${unit}}^2$\n` +
                `2. **Inner Circle Area:** $A_1 = \\pi r_1^2 = \\pi (${r1})^2 = ${r1 * r1}\\pi \\approx ${aInner}\\text{ ${unit}}^2$\n` +
                `3. **Shaded Ring Area:** $A_{\\text{ring}} = A_2 - A_1 = \\pi (${r2}^2 - ${r1}^2) = ${aRingExact}\\pi \\approx ${aRing}\\text{ ${unit}}^2$\n\n` +
                `### ✅ Final Answer\n` +
                `$$\\boxed{A_{\\text{ring}} = ${aRingExact}\\pi \\approx ${aRing}\\text{ ${unit}}^2}$$`;

            const diagramProps = {
                subtype: 'concentric_circles',
                r1,
                r2,
                ratio: r1 / r2,
                unit,
                innerRadiusLabel: `r₁ = ${r1} ${unit}`,
                outerRadiusLabel: `r₂ = ${r2} ${unit}`,
                color: '#6366f1'
            };

            return {
                subtype,
                speechResponse,
                solutionMarkdown,
                diagramProps,
                suggestedFollowUps: [
                    `📏 Width of path = ${r2 - r1} ${unit}`,
                    `⭕ Outer circumference`,
                    `📄 Clean blank board`
                ]
            };
        }

        return null;
    }

    /**
     * Parses 3D wireframe diagram requests from text (cone, cylinder, cuboid, cube, sphere, pyramid, frustum).
     */
    parse3DWireframeFromText(text) {
        if (!text || typeof text !== 'string') return null;
        const low = text.toLowerCase();

        const hasWireframe = /\b(wireframe|wire\s*frame|wire-frame)\b/i.test(low);
        const has3DKeyword = /\b(3d|solid|volume|surface\s*area|curved\s*surface|lateral\s*surface|cone|conical|cylinder|cylindrical|cuboid|cube|sphere|spherical|pyramid|frustum)\b/i.test(low);

        if (!hasWireframe && !has3DKeyword) return null;

        let modelType = null;
        if (/\b(cone|conical)\b/i.test(low)) modelType = 'cone';
        else if (/\b(cylinder|cylindrical)\b/i.test(low)) modelType = 'cylinder';
        else if (/\b(cuboid|rectangular\s*prism|box)\b/i.test(low)) modelType = 'cuboid';
        else if (/\bcube\b/i.test(low)) modelType = 'cube';
        else if (/\b(sphere|spherical)\b/i.test(low)) modelType = 'sphere';
        else if (/\bpyramid\b/i.test(low)) modelType = 'pyramid';
        else if (/\bfrustum\b/i.test(low)) modelType = 'frustum';

        if (!modelType && hasWireframe) {
            modelType = 'cuboid'; // Default 3D wireframe solid
        }
        if (!modelType) return null;

        const unitMatch = low.match(/\b(cm|m|mm|inches|inch|ft|feet|units)\b/i);
        const unit = unitMatch ? unitMatch[1] : 'cm';

        // Extract dimension parameters
        const dims = {};
        const rMatch = low.match(/\b(?:radius|rad|r)\b\s*(?:of|=|is|:)?\s*(\d+(?:\.\d+)?)/i);
        if (rMatch) dims.radius = Number(rMatch[1]);

        const hMatch = low.match(/\b(?:height|hgt|h)\b\s*(?:of|=|is|:)?\s*(\d+(?:\.\d+)?)/i);
        if (hMatch) dims.height = Number(hMatch[1]);

        const lMatch = low.match(/\b(?:length|len|l)\b\s*(?:of|=|is|:)?\s*(\d+(?:\.\d+)?)/i);
        if (lMatch) dims.length = Number(lMatch[1]);

        const wMatch = low.match(/\b(?:width|breadth|wid|w|b)\b\s*(?:of|=|is|:)?\s*(\d+(?:\.\d+)?)/i);
        if (wMatch) dims.width = Number(wMatch[1]);

        const sMatch = low.match(/\b(?:side|edge|s)\b\s*(?:of|=|is|:)?\s*(\d+(?:\.\d+)?)/i);
        if (sMatch) dims.side = Number(sMatch[1]);

        const slantMatch = low.match(/\b(?:slant|slant\s*height)\b\s*(?:of|=|is|:)?\s*(\d+(?:\.\d+)?)/i);
        if (slantMatch) dims.slant = Number(slantMatch[1]);

        const r1Match = low.match(/\b(?:r1|top\s*radius)\b\s*(?:of|=|is|:)?\s*(\d+(?:\.\d+)?)/i);
        if (r1Match) dims.r1 = Number(r1Match[1]);

        const r2Match = low.match(/\b(?:r2|bottom\s*radius)\b\s*(?:of|=|is|:)?\s*(\d+(?:\.\d+)?)/i);
        if (r2Match) dims.r2 = Number(r2Match[1]);

        // Default dimensions if missing
        if (modelType === 'cone') {
            if (dims.radius === undefined) dims.radius = 5;
            if (dims.height === undefined) dims.height = 12;
            dims.slant = Math.round(Math.hypot(dims.radius, dims.height) * 100) / 100;
        } else if (modelType === 'cylinder') {
            if (dims.radius === undefined) dims.radius = 4;
            if (dims.height === undefined) dims.height = 10;
        } else if (modelType === 'cuboid') {
            if (dims.length === undefined) dims.length = 10;
            if (dims.width === undefined) dims.width = 6;
            if (dims.height === undefined) dims.height = 5;
        } else if (modelType === 'cube') {
            if (dims.side === undefined) dims.side = 6;
            dims.length = dims.side;
            dims.width = dims.side;
            dims.height = dims.side;
        } else if (modelType === 'sphere') {
            if (dims.radius === undefined) dims.radius = 7;
        } else if (modelType === 'pyramid') {
            if (dims.length === undefined) dims.length = 8;
            if (dims.width === undefined) dims.width = dims.length;
            if (dims.height === undefined) dims.height = 12;
        } else if (modelType === 'frustum') {
            if (dims.r1 === undefined) dims.r1 = 3;
            if (dims.r2 === undefined) dims.r2 = 6;
            if (dims.height === undefined) dims.height = 4;
            dims.slant = Math.round(Math.hypot(dims.height, dims.r2 - dims.r1) * 100) / 100;
        }

        return {
            modelType,
            dimensions: dims,
            unit,
            rawText: text
        };
    }

    /**
     * Solves 3D wireframe solid geometry problems with step-by-step LaTeX formulas and diagram specifications.
     */
    solve3DWireframe(parsed) {
        if (!parsed) return null;
        const { modelType, dimensions: dims, unit } = parsed;
        const pi = Math.PI;

        let volume = 0, surfaceArea = 0, curvedArea = 0;
        let formulasLatex = '', stepsMarkdown = '', speechText = '';

        if (modelType === 'cone') {
            const { radius: r, height: h, slant: l } = dims;
            volume = Math.round((1 / 3) * pi * r * r * h * 100) / 100;
            curvedArea = Math.round(pi * r * l * 100) / 100;
            surfaceArea = Math.round(pi * r * (r + l) * 100) / 100;

            speechText = `For a cone with radius r = ${r} ${unit} and height h = ${h} ${unit}, the slant height is l = √(r² + h²) = ${l} ${unit}. Its volume is ${volume} ${unit}³ and total surface area is ${surfaceArea} ${unit}².`;
            formulasLatex = `l = \\sqrt{r^2 + h^2}, \\quad V = \\frac{1}{3}\\pi r^2 h, \\quad S_{\\text{curved}} = \\pi r l, \\quad S_{\\text{total}} = \\pi r (r + l)`;
            stepsMarkdown = `1. **Slant Height ($l$):**\n` +
                `   $$l = \\sqrt{r^2 + h^2} = \\sqrt{(${r})^2 + (${h})^2} = \\sqrt{${r * r + h * h}} = ${l}\\text{ ${unit}}$$\n` +
                `2. **Volume ($V$):**\n` +
                `   $$V = \\frac{1}{3}\\pi r^2 h = \\frac{1}{3}\\pi (${r})^2 (${h}) = ${Math.round((1 / 3) * r * r * h)}\\pi \\approx ${volume}\\text{ ${unit}}^3$$\n` +
                `3. **Curved & Total Surface Area:**\n` +
                `   - Curved: $S_{\\text{curved}} = \\pi r l = \\pi (${r})(${l}) = ${r * l}\\pi \\approx ${curvedArea}\\text{ ${unit}}^2$\n` +
                `   - Total: $S_{\\text{total}} = \\pi r (r + l) = \\pi (${r})(${r + l}) = ${r * (r + l)}\\pi \\approx ${surfaceArea}\\text{ ${unit}}^2$`;
        } else if (modelType === 'cylinder') {
            const { radius: r, height: h } = dims;
            volume = Math.round(pi * r * r * h * 100) / 100;
            curvedArea = Math.round(2 * pi * r * h * 100) / 100;
            surfaceArea = Math.round(2 * pi * r * (h + r) * 100) / 100;

            speechText = `For a cylinder with radius r = ${r} ${unit} and height h = ${h} ${unit}, the volume is ${volume} ${unit}³, curved surface area is ${curvedArea} ${unit}², and total surface area is ${surfaceArea} ${unit}².`;
            formulasLatex = `V = \\pi r^2 h, \\quad S_{\\text{curved}} = 2\\pi r h, \\quad S_{\\text{total}} = 2\\pi r (h + r)`;
            stepsMarkdown = `1. **Volume ($V$):**\n` +
                `   $$V = \\pi r^2 h = \\pi (${r})^2 (${h}) = ${r * r * h}\\pi \\approx ${volume}\\text{ ${unit}}^3$$\n` +
                `2. **Curved Surface Area ($S_{\\text{curved}}$):**\n` +
                `   $$S_{\\text{curved}} = 2\\pi r h = 2\\pi (${r})(${h}) = ${2 * r * h}\\pi \\approx ${curvedArea}\\text{ ${unit}}^2$$\n` +
                `3. **Total Surface Area ($S_{\\text{total}}$):**\n` +
                `   $$S_{\\text{total}} = 2\\pi r (h + r) = 2\\pi (${r})(${h + r}) = ${2 * r * (h + r)}\\pi \\approx ${surfaceArea}\\text{ ${unit}}^2$`;
        } else if (modelType === 'cuboid' || modelType === 'cube') {
            const l = dims.length || dims.side;
            const w = dims.width || dims.side;
            const h = dims.height || dims.side;
            volume = l * w * h;
            surfaceArea = 2 * (l * w + l * h + w * h);
            curvedArea = 2 * (l + w) * h; // Lateral surface area

            speechText = `For a ${modelType} with length ${l} ${unit}, width ${w} ${unit}, and height ${h} ${unit}, the volume is ${volume} ${unit}³ and total surface area is ${surfaceArea} ${unit}².`;
            formulasLatex = `V = l \\cdot w \\cdot h, \\quad S_{\\text{lateral}} = 2(l + w)h, \\quad S_{\\text{total}} = 2(lw + lh + wh)`;
            stepsMarkdown = `1. **Volume ($V$):**\n` +
                `   $$V = l \\cdot w \\cdot h = (${l})(${w})(${h}) = ${volume}\\text{ ${unit}}^3$$\n` +
                `2. **Lateral Surface Area ($S_{\\text{lateral}}$):**\n` +
                `   $$S_{\\text{lateral}} = 2(l + w)h = 2(${l} + ${w})(${h}) = ${curvedArea}\\text{ ${unit}}^2$$\n` +
                `3. **Total Surface Area ($S_{\\text{total}}$):**\n` +
                `   $$S_{\\text{total}} = 2(lw + lh + wh) = 2((${l}\\cdot${w}) + (${l}\\cdot${h}) + (${w}\\cdot${h})) = ${surfaceArea}\\text{ ${unit}}^2$$`;
        } else if (modelType === 'sphere') {
            const { radius: r } = dims;
            volume = Math.round((4 / 3) * pi * Math.pow(r, 3) * 100) / 100;
            surfaceArea = Math.round(4 * pi * r * r * 100) / 100;

            speechText = `For a sphere with radius r = ${r} ${unit}, the volume is ${volume} ${unit}³ and surface area is ${surfaceArea} ${unit}².`;
            formulasLatex = `V = \\frac{4}{3}\\pi r^3, \\quad S_{\\text{total}} = 4\\pi r^2`;
            stepsMarkdown = `1. **Volume ($V$):**\n` +
                `   $$V = \\frac{4}{3}\\pi r^3 = \\frac{4}{3}\\pi (${r})^3 = \\frac{${4 * Math.pow(r, 3)}}{3}\\pi \\approx ${volume}\\text{ ${unit}}^3$$\n` +
                `2. **Surface Area ($S_{\\text{total}}$):**\n` +
                `   $$S_{\\text{total}} = 4\\pi r^2 = 4\\pi (${r})^2 = ${4 * r * r}\\pi \\approx ${surfaceArea}\\text{ ${unit}}^2$$`;
        } else if (modelType === 'pyramid') {
            const { length: l, width: w, height: h } = dims;
            volume = Math.round((1 / 3) * l * w * h * 100) / 100;
            surfaceArea = Math.round((l * w + l * Math.hypot(h, w / 2) + w * Math.hypot(h, l / 2)) * 100) / 100;

            speechText = `For a pyramid with rectangular base ${l} × ${w} ${unit} and altitude ${h} ${unit}, the volume is ${volume} ${unit}³.`;
            formulasLatex = `V = \\frac{1}{3} l w h`;
            stepsMarkdown = `1. **Volume ($V$):**\n` +
                `   $$V = \\frac{1}{3} l w h = \\frac{1}{3}(${l})(${w})(${h}) = ${volume}\\text{ ${unit}}^3$$`;
        } else if (modelType === 'frustum') {
            const { r1, r2, height: h, slant: l } = dims;
            volume = Math.round((1 / 3) * pi * h * (r1 * r1 + r2 * r2 + r1 * r2) * 100) / 100;
            curvedArea = Math.round(pi * (r1 + r2) * l * 100) / 100;
            surfaceArea = Math.round((curvedArea + pi * (r1 * r1 + r2 * r2)) * 100) / 100;

            speechText = `For a frustum of a cone with radii r₁ = ${r1} ${unit}, r₂ = ${r2} ${unit}, and height ${h} ${unit}, the slant height is ${l} ${unit} and volume is ${volume} ${unit}³.`;
            formulasLatex = `l = \\sqrt{h^2 + (r_2 - r_1)^2}, \\quad V = \\frac{1}{3}\\pi h (r_1^2 + r_2^2 + r_1 r_2), \\quad S_{\\text{curved}} = \\pi (r_1 + r_2) l`;
            stepsMarkdown = `1. **Slant Height ($l$):**\n` +
                `   $$l = \\sqrt{h^2 + (r_2 - r_1)^2} = \\sqrt{${h}^2 + (${r2} - ${r1})^2} = ${l}\\text{ ${unit}}$$\n` +
                `2. **Volume ($V$):**\n` +
                `   $$V = \\frac{1}{3}\\pi h (r_1^2 + r_2^2 + r_1 r_2) = \\frac{1}{3}\\pi (${h})(${r1 * r1} + ${r2 * r2} + ${r1 * r2}) \\approx ${volume}\\text{ ${unit}}^3$$\n` +
                `3. **Curved Surface Area ($S_{\\text{curved}}$):**\n` +
                `   $$S_{\\text{curved}} = \\pi (r_1 + r_2) l = \\pi (${r1} + ${r2})(${l}) \\approx ${curvedArea}\\text{ ${unit}}^2$$`;
        }

        const dimsText = Object.entries(dims).map(([k, v]) => `**${k.charAt(0).toUpperCase() + k.slice(1)}:** $${v}\\text{ ${unit}}$`).join(', ');
        const solutionMarkdown = `### 📌 Given & Concept\n` +
            `- **Shape:** 3D ${modelType.charAt(0).toUpperCase() + modelType.slice(1)} Wireframe\n` +
            `- **Given Dimensions:** ${dimsText}\n\n` +
            `### 📐 Formula\n` +
            `$$${formulasLatex}$$\n\n` +
            `### 🔢 Step-by-Step Solution\n` +
            `${stepsMarkdown}\n\n` +
            `### ✅ Final Answer\n` +
            `$$\\boxed{\\text{Volume } V = ${volume}\\text{ ${unit}}^3, \\quad \\text{Surface Area } S = ${surfaceArea}\\text{ ${unit}}^2}$$`;

        const diagramProps = {
            modelType,
            dimensions: dims,
            unit,
            color: '#3b82f6',
            dashColor: '#64748b'
        };

        return {
            modelType,
            dimensions: dims,
            speechResponse: speechText,
            solutionMarkdown,
            diagramProps,
            suggestedFollowUps: [
                `📐 Curved vs total area`,
                `✨ Change dimensions`,
                `📄 Clean blank board`
            ]
        };
    }
}

module.exports = new GeometrySolverService();

