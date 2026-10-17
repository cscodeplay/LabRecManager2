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
    /**
     * Generates a high-precision, publication-quality mathematical vector SVG diagram
     * for regular polygons (n=3 triangle, n=4 square, n=6 hexagon, etc.) inscribed in a circle.
     */
    generateInscribedPolygonSvg({ n = 3, radiusValue = 10, radiusLabel = 'R', sideValue = null, sideLabel = 'a = \\sqrt{3}R', shapeTitle = 'Equilateral Triangle Inscribed in Circle', unit = 'cm', bottomBadge = 'a = 2R \\sin(60^\\circ) = \\sqrt{3}R \\approx 1.732R' }) {
        const cx = 190, cy = 190;
        const R_px = 125;
        const vertices = [];
        const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

        for (let k = 0; k < n; k++) {
            const angle = -Math.PI / 2 + (2 * Math.PI * k) / n;
            const vx = cx + R_px * Math.cos(angle);
            const vy = cy + R_px * Math.sin(angle);
            const lx = cx + (R_px + 20) * Math.cos(angle);
            const ly = cy + (R_px + 20) * Math.sin(angle);
            vertices.push({ x: vx, y: vy, lx, ly, label: labels[k] || `V${k + 1}` });
        }

        const pointsStr = vertices.map(v => `${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(' ');

        // Radius line to vertex 1 (bottom right for triangle) or top
        const radVertex = vertices[1] || vertices[0];
        const radMidX = ((cx + radVertex.x) / 2 + 12).toFixed(1);
        const radMidY = ((cy + radVertex.y) / 2 - 8).toFixed(1);

        // Side dimension arrow along bottom edge
        let sideDimSvg = '';
        if (n === 3) {
            const cX = vertices[2].x;
            const bX = vertices[1].x;
            const yBase = vertices[1].y + 24;
            sideDimSvg = `
  <line x1="${cX.toFixed(1)}" y1="${yBase}" x2="${bX.toFixed(1)}" y2="${yBase}" stroke="#2563eb" stroke-width="1.8" marker-start="url(#dimArrow)" marker-end="url(#dimArrow)" />
  <text x="${cx}" y="${yBase + 16}" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#2563eb">${sideLabel}</text>
            `;
        } else if (n === 4) {
            const cX = vertices[3].x;
            const bX = vertices[2].x;
            const yBase = vertices[2].y + 24;
            sideDimSvg = `
  <line x1="${cX.toFixed(1)}" y1="${yBase}" x2="${bX.toFixed(1)}" y2="${yBase}" stroke="#2563eb" stroke-width="1.8" marker-start="url(#dimArrow)" marker-end="url(#dimArrow)" />
  <text x="${cx}" y="${yBase + 16}" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#2563eb">${sideLabel}</text>
            `;
        } else if (n === 6) {
            const cX = vertices[4].x;
            const bX = vertices[2].x;
            const yBase = vertices[3].y + 24;
            sideDimSvg = `
  <text x="${cx}" y="${yBase + 16}" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#2563eb">${sideLabel}</text>
            `;
        }

        const vertexLabelsSvg = vertices.map(v => 
            `<text x="${v.lx.toFixed(1)}" y="${v.ly.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#0f172a">${v.label}</text>`
        ).join('\n  ');

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 380" width="100%" height="100%">
  <defs>
    <linearGradient id="geoBg_${n}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>
    <radialGradient id="shadedCircle_${n}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(99, 102, 241, 0.04)"/>
      <stop offset="100%" stop-color="rgba(99, 102, 241, 0.16)"/>
    </radialGradient>
    <marker id="dimArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 2 L 10 5 L 0 8 z" fill="#2563eb"/>
    </marker>
  </defs>

  <!-- Background card -->
  <rect width="380" height="380" rx="14" fill="url(#geoBg_${n})" stroke="#e2e8f0" stroke-width="1.5"/>

  <!-- Title -->
  <text x="${cx}" y="28" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#1e293b">${shapeTitle}</text>

  <!-- Outer Circle -->
  <circle cx="${cx}" cy="${cy}" r="${R_px}" fill="url(#shadedCircle_${n})" stroke="#6366f1" stroke-width="2.5"/>

  <!-- Inscribed Polygon -->
  <polygon points="${pointsStr}" fill="rgba(255, 255, 255, 0.94)" stroke="#2563eb" stroke-width="2.5" stroke-linejoin="round"/>

  <!-- Center Dot O -->
  <circle cx="${cx}" cy="${cy}" r="3.5" fill="#0f172a"/>
  <text x="${cx - 14}" y="${cy + 4}" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#0f172a">O</text>

  <!-- Radius dashed line -->
  <line x1="${cx}" y1="${cy}" x2="${radVertex.x.toFixed(1)}" y2="${radVertex.y.toFixed(1)}" stroke="#ef4444" stroke-width="1.8" stroke-dasharray="4,4"/>
  <text x="${radMidX}" y="${radMidY}" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#ef4444">${radiusLabel}</text>

  ${n === 3 ? `
  <!-- Center altitude / inradius line OD -->
  <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${vertices[1].y.toFixed(1)}" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,3"/>
  <text x="${cx + 6}" y="${((cy + vertices[1].y) / 2).toFixed(1)}" font-family="Inter, -apple-system, sans-serif" font-size="10" font-weight="600" fill="#64748b">r = R/2</text>
  ` : ''}

  <!-- Vertices labels -->
  ${vertexLabelsSvg}

  <!-- Dimension arrows -->
  ${sideDimSvg}

  <!-- Bottom Formula Badge -->
  <rect x="30" y="342" width="320" height="26" rx="6" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
  <text x="${cx}" y="359" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#1d4ed8">${bottomBadge}</text>
</svg>`;
    }

    /**
     * Generates vector SVG for circle inscribed in an equilateral triangle (Incircle).
     */
    generateInscribedCircleInTriangleSvg({ sideValue = 14, sideLabel = 'a', inradiusValue = 4.04, inradiusLabel = 'r = a/(2\\sqrt{3})', unit = 'cm', bottomBadge = 'r = \\frac{a}{2\\sqrt{3}} \\approx 0.289a' }) {
        const cx = 190, cy = 205;
        const sidePx = 230;
        const hPx = (sidePx * Math.sqrt(3)) / 2; // ~199
        const rPx = hPx / 3; // ~66.3
        const topY = cy - 2 * rPx;
        const botY = cy + rPx;
        const leftX = cx - sidePx / 2;
        const rightX = cx + sidePx / 2;

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 380" width="100%" height="100%">
  <defs>
    <linearGradient id="incircleBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>
    <radialGradient id="incircleShade" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(16, 185, 129, 0.08)"/>
      <stop offset="100%" stop-color="rgba(16, 185, 129, 0.22)"/>
    </radialGradient>
    <marker id="dimArrowGreen" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 2 L 10 5 L 0 8 z" fill="#059669"/>
    </marker>
  </defs>

  <rect width="380" height="380" rx="14" fill="url(#incircleBg)" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="${cx}" y="28" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#1e293b">Circle Inscribed in Equilateral Triangle</text>

  <!-- Outer Triangle -->
  <polygon points="${cx},${topY.toFixed(1)} ${rightX.toFixed(1)},${botY.toFixed(1)} ${leftX.toFixed(1)},${botY.toFixed(1)}" fill="rgba(241, 245, 249, 0.7)" stroke="#2563eb" stroke-width="2.5" stroke-linejoin="round"/>

  <!-- Inscribed Circle -->
  <circle cx="${cx}" cy="${cy}" r="${rPx.toFixed(1)}" fill="url(#incircleShade)" stroke="#10b981" stroke-width="2.5"/>

  <!-- Center Dot I -->
  <circle cx="${cx}" cy="${cy}" r="3.5" fill="#0f172a"/>
  <text x="${cx - 14}" y="${cy + 4}" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#0f172a">I</text>

  <!-- Inradius line to tangent -->
  <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${botY.toFixed(1)}" stroke="#ef4444" stroke-width="1.8" stroke-dasharray="4,4"/>
  <text x="${cx + 8}" y="${((cy + botY) / 2).toFixed(1)}" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#ef4444">${inradiusLabel}</text>

  <!-- Vertices labels -->
  <text x="${cx}" y="${(topY - 12).toFixed(1)}" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#0f172a">A</text>
  <text x="${(rightX + 16).toFixed(1)}" y="${(botY + 8).toFixed(1)}" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#0f172a">B</text>
  <text x="${(leftX - 16).toFixed(1)}" y="${(botY + 8).toFixed(1)}" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#0f172a">C</text>

  <!-- Base dimension line -->
  <line x1="${leftX.toFixed(1)}" y1="${(botY + 22).toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${(botY + 22).toFixed(1)}" stroke="#059669" stroke-width="1.8" marker-start="url(#dimArrowGreen)" marker-end="url(#dimArrowGreen)"/>
  <text x="${cx}" y="${(botY + 38).toFixed(1)}" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#059669">${sideLabel}</text>

  <!-- Bottom Formula Badge -->
  <rect x="30" y="342" width="320" height="26" rx="6" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1"/>
  <text x="${cx}" y="359" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#047857">${bottomBadge}</text>
</svg>`;
    }

    /**
     * Generates vector SVG for square with inscribed circle.
     */
    generateSquareWithCircleSvg({ s = 14, r = 7, unit = 'cm', isGeneral = false }) {
        const cx = 190, cy = 190;
        const sidePx = 230;
        const sqX = cx - sidePx / 2;
        const sqY = cy - sidePx / 2;
        const rPx = sidePx / 2;

        const sLabel = isGeneral ? 's' : `s = ${s} ${unit}`;
        const rLabel = isGeneral ? 'r = s/2' : `r = ${r} ${unit}`;
        const bottomBadge = isGeneral ? 'A_{remaining} = s^2(1 - \\pi/4) \\approx 0.2146 s^2' : `Remaining Area = ${Math.round((s*s - Math.PI*r*r)*100)/100} ${unit}²`;

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 380" width="100%" height="100%">
  <defs>
    <linearGradient id="sqBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>
    <marker id="dimArrowBlue" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 2 L 10 5 L 0 8 z" fill="#2563eb"/>
    </marker>
  </defs>

  <rect width="380" height="380" rx="14" fill="url(#sqBg)" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="${cx}" y="28" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#1e293b">Square with Inscribed Circle</text>

  <!-- Shaded corner regions via path with hole (evenodd) -->
  <path d="M ${sqX} ${sqY} h ${sidePx} v ${sidePx} h -${sidePx} Z M ${cx} ${cy - rPx} a ${rPx} ${rPx} 0 1 0 0.0001 0 Z" fill="rgba(99, 102, 241, 0.2)" fill-rule="evenodd"/>

  <!-- Square outline -->
  <rect x="${sqX}" y="${sqY}" width="${sidePx}" height="${sidePx}" fill="none" stroke="#3b82f6" stroke-width="2.5"/>

  <!-- Circle outline -->
  <circle cx="${cx}" cy="${cy}" r="${rPx}" fill="rgba(255, 255, 255, 0.9)" stroke="#6366f1" stroke-width="2.5"/>

  <!-- Center Dot O -->
  <circle cx="${cx}" cy="${cy}" r="3.5" fill="#0f172a"/>
  <text x="${cx - 12}" y="${cy - 8}" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#0f172a">O</text>

  <!-- Radius line -->
  <line x1="${cx}" y1="${cy}" x2="${cx + rPx}" y2="${cy}" stroke="#ef4444" stroke-width="1.8" stroke-dasharray="4,4"/>
  <text x="${cx + rPx / 2}" y="${cy - 8}" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#ef4444">${rLabel}</text>

  <!-- Top dimension line -->
  <line x1="${sqX}" y1="${sqY - 14}" x2="${sqX + sidePx}" y2="${sqY - 14}" stroke="#2563eb" stroke-width="1.8" marker-start="url(#dimArrowBlue)" marker-end="url(#dimArrowBlue)"/>
  <text x="${cx}" y="${sqY - 22}" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#2563eb">${sLabel}</text>

  <!-- Bottom Formula Badge -->
  <rect x="30" y="342" width="320" height="26" rx="6" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
  <text x="${cx}" y="359" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#1d4ed8">${bottomBadge}</text>
</svg>`;
    }

    /**
     * Generates vector SVG for concentric circles (Annulus).
     */
    generateAnnulusSvg({ r1 = 7, r2 = 14, unit = 'cm' }) {
        const cx = 190, cy = 190;
        const r2Px = 130;
        const r1Px = (r1 / r2) * r2Px;
        const aRing = Math.round(Math.PI * (r2 * r2 - r1 * r1) * 100) / 100;

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 380" width="100%" height="100%">
  <defs>
    <linearGradient id="annBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>
  </defs>

  <rect width="380" height="380" rx="14" fill="url(#annBg)" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="${cx}" y="28" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#1e293b">Concentric Circles (Circular Ring)</text>

  <!-- Outer Circle -->
  <circle cx="${cx}" cy="${cy}" r="${r2Px}" fill="rgba(99, 102, 241, 0.22)" stroke="#4f46e5" stroke-width="2.5"/>

  <!-- Inner Circle (cutout) -->
  <circle cx="${cx}" cy="${cy}" r="${r1Px}" fill="#ffffff" stroke="#6366f1" stroke-width="2.5"/>

  <!-- Center Dot O -->
  <circle cx="${cx}" cy="${cy}" r="3.5" fill="#0f172a"/>
  <text x="${cx - 12}" y="${cy - 8}" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#0f172a">O</text>

  <!-- Inner Radius line -->
  <line x1="${cx}" y1="${cy}" x2="${cx + r1Px}" y2="${cy}" stroke="#ef4444" stroke-width="1.8" stroke-dasharray="4,4"/>
  <text x="${cx + r1Px / 2}" y="${cy - 8}" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#ef4444">r₁ = ${r1} ${unit}</text>

  <!-- Outer Radius line -->
  <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - r2Px}" stroke="#2563eb" stroke-width="1.8" stroke-dasharray="4,4"/>
  <text x="${cx + 8}" y="${cy - r2Px / 2}" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#2563eb">r₂ = ${r2} ${unit}</text>

  <!-- Bottom Formula Badge -->
  <rect x="30" y="342" width="320" height="26" rx="6" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
  <text x="${cx}" y="359" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#1d4ed8">Ring Area = \\pi(r_2^2 - r_1^2) \\approx ${aRing} ${unit}^2</text>
</svg>`;
    }

    /**
     * Parses composite geometry problems from text (e.g. square with inscribed circle, equilateral triangle in circle, hexagon in circle, remaining/shaded area).
     */
    parseCompositeGeometryFromText(text) {
        if (!text || typeof text !== 'string') return null;
        const low = text.toLowerCase();

        const hasCompositeKeywords = /\b(inscribed|circumscribed|circumscribing|remaining\s*(?:part|area|portion)|shaded\s*(?:area|region|part)|cutout|cut\s*out|leftover|between\s*(?:the)?\s*(?:square|circle|triangle|shapes)|annulus|concentric|ring)\b/i.test(low);
        const hasSquare = /\bsquare\b/i.test(low);
        const hasCircle = /\bcircle\b/i.test(low);
        const hasTriangle = /\b(triangle|equilateral\s*triangle)\b/i.test(low);
        const hasHexagon = /\b(hexagon|regular\s*hexagon)\b/i.test(low);
        const hasPolygon = /\b(polygon|pentagon|octagon|decagon|regular\s*polygon)\b/i.test(low);
        const hasConcentric = /\bconcentric\b/i.test(low) || (/\bring\b/i.test(low) && hasCircle);

        if (!hasCompositeKeywords && !(hasSquare && hasCircle) && !(hasTriangle && hasCircle) && !(hasHexagon && hasCircle) && !(hasPolygon && hasCircle)) return null;

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

        // 2. Equilateral Triangle and Circle (Inscribed or Circumscribed)
        if (hasTriangle && hasCircle) {
            const isCircleInTri = /\b(circle\s*inscribed\s*in\s*(?:an?\s*)?(?:equilateral\s*)?triangle|incircle\s*of\s*(?:an?\s*)?(?:equilateral\s*)?triangle)\b/i.test(low);

            if (isCircleInTri) {
                let side = null;
                const sideMatch = low.match(/(?:side\s*length|side\s*of|side)\s*(?:of|=|is|:)?\s*(\d+(?:\.\d+)?)/i);
                if (sideMatch) side = Number(sideMatch[1]);
                const isGeneral = !side;
                return {
                    subtype: 'circle_triangle_inscribed',
                    side: side || 14,
                    isGeneral,
                    unit,
                    rawText: text
                };
            } else {
                // Equilateral Triangle inscribed inside a Circle
                let radius = null;
                let radiusVar = null;
                const radNumMatch = low.match(/(?:radius|circumradius)\s*(?:of|=|is|:)?\s*(\d+(?:\.\d+)?)/i);
                if (radNumMatch) {
                    radius = Number(radNumMatch[1]);
                } else {
                    const radVarMatch = low.match(/(?:radius|circumradius)\s*(?:of|=|is|:)?\s*([a-zA-Z])\b/i);
                    if (radVarMatch) {
                        radiusVar = radVarMatch[1].toUpperCase();
                    }
                }

                let side = null;
                const sideNumMatch = low.match(/(?:side\s*length|side\s*of|side)\s*(?:of|=|is|:)?\s*(\d+(?:\.\d+)?)/i);
                if (sideNumMatch) side = Number(sideNumMatch[1]);

                const isGeneral = !radius && !side;
                const resolvedRadius = radius || (side ? side / Math.sqrt(3) : 10);

                return {
                    subtype: 'triangle_circle_inscribed',
                    radius: resolvedRadius,
                    radiusVar: radiusVar || 'R',
                    side: side || Math.round(resolvedRadius * Math.sqrt(3) * 100) / 100,
                    isGeneral,
                    unit,
                    rawText: text
                };
            }
        }

        // 3. Regular Hexagon inscribed in Circle
        if (hasHexagon && hasCircle) {
            let radius = null;
            const radNumMatch = low.match(/(?:radius|circumradius)\s*(?:of|=|is|:)?\s*(\d+(?:\.\d+)?)/i);
            if (radNumMatch) radius = Number(radNumMatch[1]);
            const isGeneral = !radius;
            return {
                subtype: 'hexagon_circle_inscribed',
                radius: radius || 6,
                isGeneral,
                unit,
                rawText: text
            };
        }

        // 4. Regular Polygon (Pentagon, Octagon, etc.) in Circle
        if (hasPolygon && hasCircle) {
            let n = 5;
            if (/pentagon/i.test(low)) n = 5;
            else if (/hexagon/i.test(low)) n = 6;
            else if (/octagon/i.test(low)) n = 8;
            else if (/decagon/i.test(low)) n = 10;
            const nMatch = low.match(/(\d+)\s*-\s*gon/i);
            if (nMatch) n = Number(nMatch[1]);

            let radius = null;
            const radNumMatch = low.match(/(?:radius|circumradius)\s*(?:of|=|is|:)?\s*(\d+(?:\.\d+)?)/i);
            if (radNumMatch) radius = Number(radNumMatch[1]);
            const isGeneral = !radius;
            return {
                subtype: 'polygon_circle_inscribed',
                n,
                radius: radius || 8,
                isGeneral,
                unit,
                rawText: text
            };
        }

        // 5. Square with Inscribed Circle vs Square Inscribed in Circle
        if (hasSquare && hasCircle) {
            const isSquareInCircle = /\bsquare\s*(?:is\s*)?inscribed\s*(?:in|inside)\s*(?:a\s*)?circle\b/i.test(low) ||
                /\bcircle\s*(?:circumscribing|circumscribed\s*(?:about|around))\s*(?:a\s*)?square\b/i.test(low);

            if (isSquareInCircle) {
                // Square inscribed in circle
                let radius = null;
                const radMatch = low.match(/(?:radius|circumradius)\s*(?:of|=|is|:)?\s*(\d+(?:\.\d+)?)/i);
                if (radMatch) radius = Number(radMatch[1]);
                const isGeneral = !radius;
                const resolvedRad = radius || 10;
                return {
                    subtype: 'circle_square_inscribed',
                    radius: resolvedRad,
                    isGeneral,
                    unit,
                    rawText: text
                };
            } else {
                // Square with inscribed circle (Circle inscribed in Square)
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
                const resolvedSide = side || 14;

                return {
                    subtype: 'square_circle_inscribed',
                    side: resolvedSide,
                    radius: resolvedSide / 2,
                    diameter: resolvedSide,
                    isGeneral,
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

        // 1. EQUILATERAL TRIANGLE INSCRIBED IN CIRCLE OF RADIUS R
        if (subtype === 'triangle_circle_inscribed') {
            const isGen = parsed.isGeneral;
            const R = parsed.radius;
            const radVar = parsed.radiusVar || 'R';
            const aNum = Math.round(R * Math.sqrt(3) * 100) / 100;
            const hNum = Math.round(1.5 * R * 100) / 100;
            const rInNum = Math.round(0.5 * R * 100) / 100;
            const aTriNum = Math.round(((3 * Math.sqrt(3)) / 4) * R * R * 100) / 100;
            const aCircNum = Math.round(Math.PI * R * R * 100) / 100;
            const aRemNum = Math.round((aCircNum - aTriNum) * 100) / 100;

            const speechResponse = isGen
                ? `For an equilateral triangle inscribed inside a circle of radius ${radVar}, each side of the triangle is a = √3 ${radVar} (approximately 1.732 ${radVar}). The altitude of the triangle is 1.5 ${radVar}, the inradius is 0.5 ${radVar}, and the area of the triangle is (3√3/4) ${radVar}² ≈ 1.299 ${radVar}².`
                : `For an equilateral triangle inscribed inside a circle of radius ${R} ${unit}, the side of the triangle is a = ${R}√3 ${unit} ≈ ${aNum} ${unit}. The altitude is ${hNum} ${unit}, the area of the triangle is ≈ ${aTriNum} ${unit}², and the area of the circumscribing circle is ≈ ${aCircNum} ${unit}².`;

            const solutionMarkdown = isGen
                ? `### 📌 Given & Concept\n` +
                  `- **Given:** An equilateral triangle $\\Delta ABC$ is inscribed in a circle of radius $${radVar}$ (circumcenter $O$).\n` +
                  `- **Properties of Equilateral Triangle:**\n` +
                  `  - All three sides are equal: $AB = BC = CA = a$.\n` +
                  `  - All interior angles are equal: $\\angle A = \\angle B = \\angle C = 60^\\circ$.\n` +
                  `  - The circumcenter, incenter, and centroid coincide at center $O$.\n` +
                  `  - The circumradius is $R = ${radVar}$.\n\n` +
                  `### 📐 Formula\n` +
                  `Using the Law of Sines / Circumradius Formula:\n` +
                  `$$\\frac{a}{\\sin A} = 2R \\implies a = 2R \\sin(60^\\circ) = 2R \\left(\\frac{\\sqrt{3}}{2}\\right) = \\sqrt{3}R$$\n\n` +
                  `### 🔢 Step-by-Step Solution\n` +
                  `1. **Central Angle Subtended by a Side:**\n` +
                  `   The angle subtended by chord $BC$ at center $O$ is twice the inscribed angle $\\angle BAC$:\n` +
                  `   $$\\angle BOC = 2 \\times 60^\\circ = 120^\\circ$$\n\n` +
                  `2. **Right-Angled Triangle Construction:**\n` +
                  `   Draw perpendicular $OD \\perp BC$. In isosceles triangle $\\Delta OBC$ ($OB = OC = R$):\n` +
                  `   - $OD$ bisects chord $BC$, so $BD = \\frac{a}{2}$.\n` +
                  `   - $OD$ bisects $\\angle BOC$, so $\\angle BOD = \\frac{120^\\circ}{2} = 60^\\circ$.\n\n` +
                  `3. **Apply Trigonometry in $\\Delta OBD$:**\n` +
                  `   $$\\sin(\\angle BOD) = \\frac{\\text{Opposite}}{\\text{Hypotenuse}} = \\frac{BD}{OB}$$\n` +
                  `   $$\\sin(60^\\circ) = \\frac{a/2}{R} \\implies \\frac{\\sqrt{3}}{2} = \\frac{a}{2R}$$\n\n` +
                  `4. **Solve for Side Length $a$:**\n` +
                  `   $$a = 2R \\times \\frac{\\sqrt{3}}{2} = \\sqrt{3}R \\approx 1.732 R$$\n\n` +
                  `5. **Key Secondary Dimensions:**\n` +
                  `   - **Altitude / Height:** $h = \\frac{\\sqrt{3}}{2}a = \\frac{\\sqrt{3}}{2}(\\sqrt{3}R) = \\frac{3}{2}R = 1.5R$\n` +
                  `   - **Inradius ($r$):** $r = \\frac{a}{2\\sqrt{3}} = \\frac{R}{2} = 0.5R$\n` +
                  `   - **Triangle Area:** $A_{\\text{triangle}} = \\frac{\\sqrt{3}}{4}a^2 = \\frac{3\\sqrt{3}}{4}R^2 \\approx 1.299 R^2$\n` +
                  `   - **Circle Area:** $A_{\\text{circle}} = \\pi R^2 \\approx 3.1416 R^2$\n` +
                  `   - **Remaining Area:** $A_{\\text{rem}} = R^2\\left(\\pi - \\frac{3\\sqrt{3}}{4}\\right) \\approx 1.8425 R^2$\n\n` +
                  `### ✅ Final Answer\n` +
                  `$$\\boxed{a = \\sqrt{3}R \\approx 1.732 R}$$`
                : `### 📌 Given & Concept\n` +
                  `- **Given:** Equilateral triangle $\\Delta ABC$ inscribed in a circle of radius $R = ${R}\\text{ ${unit}}$.\n` +
                  `- **Angle:** Each angle of the equilateral triangle is $60^\\circ$.\n` +
                  `- **Target:** Side length $a$ of the triangle.\n\n` +
                  `### 📐 Formula\n` +
                  `$$a = 2R \\sin(60^\\circ) = \\sqrt{3}R$$\n\n` +
                  `### 🔢 Step-by-Step Solution\n` +
                  `1. **Substitute Circumradius $R = ${R}\\text{ ${unit}}$:**\n` +
                  `   $$a = \\sqrt{3} \\times ${R} = ${R}\\sqrt{3}\\text{ ${unit}} \\approx ${aNum}\\text{ ${unit}}$$\n\n` +
                  `2. **Altitude / Height ($h$):**\n` +
                  `   $$h = \\frac{3}{2}R = \\frac{3}{2}(${R}) = ${hNum}\\text{ ${unit}}$$\n\n` +
                  `3. **Area of Equilateral Triangle ($A_{\\text{triangle}}$):**\n` +
                  `   $$A_{\\text{triangle}} = \\frac{\\sqrt{3}}{4}a^2 = \\frac{3\\sqrt{3}}{4}(${R})^2 = \\frac{3\\sqrt{3}}{4}(${R * R}) = ${Math.round((3 * R * R) / 4)}\\sqrt{3} \\approx ${aTriNum}\\text{ ${unit}}^2$$\n\n` +
                  `4. **Area of Circle ($A_{\\text{circle}}$):**\n` +
                  `   $$A_{\\text{circle}} = \\pi R^2 = \\pi (${R})^2 = ${R * R}\\pi \\approx ${aCircNum}\\text{ ${unit}}^2$$\n\n` +
                  `### ✅ Final Answer\n` +
                  `$$\\boxed{a = ${R}\\sqrt{3}\\text{ ${unit}} \\approx ${aNum}\\text{ ${unit}}}$$`;

            const sideLabelStr = isGen ? 'a = \\sqrt{3}R' : `a = ${R}\\sqrt{3} \\approx ${aNum} ${unit}`;
            const radLabelStr = isGen ? 'R' : `R = ${R} ${unit}`;
            const badgeStr = isGen ? 'a = \\sqrt{3}R \\approx 1.732R' : `a = ${aNum} ${unit} | h = ${hNum} ${unit}`;

            const svg = this.generateInscribedPolygonSvg({
                n: 3,
                radiusValue: R,
                radiusLabel: radLabelStr,
                sideValue: aNum,
                sideLabel: sideLabelStr,
                shapeTitle: 'Equilateral Triangle Inscribed in Circle',
                unit,
                bottomBadge: badgeStr
            });

            const diagramProps = {
                subtype: 'triangle_circle_inscribed',
                radiusValue: R,
                radiusLabel: radLabelStr,
                sideValue: aNum,
                sideLabel: sideLabelStr,
                isGeneral: isGen,
                unit,
                svg,
                color: '#6366f1'
            };

            return {
                subtype,
                speechResponse,
                solutionMarkdown,
                diagramProps,
                diagram: {
                    type: 'svg',
                    svg,
                    width: 380,
                    height: 380,
                    title: 'Equilateral Triangle Inscribed in Circle'
                },
                suggestedFollowUps: [
                    `📐 Inradius r = R/2`,
                    `📊 Area between circle & triangle`,
                    `⭕ Circle circumscribing square`,
                    `📄 Clean blank board`
                ]
            };
        }

        // 2. CIRCLE INSCRIBED IN EQUILATERAL TRIANGLE (INCIRCLE)
        if (subtype === 'circle_triangle_inscribed') {
            const { side, isGeneral } = parsed;
            const a = side;
            const rIn = Math.round((a / (2 * Math.sqrt(3))) * 100) / 100;
            const h = Math.round(((Math.sqrt(3) / 2) * a) * 100) / 100;
            const aTri = Math.round(((Math.sqrt(3) / 4) * a * a) * 100) / 100;
            const aInCirc = Math.round((Math.PI * rIn * rIn) * 100) / 100;

            const speechResponse = isGeneral
                ? `For a circle inscribed inside an equilateral triangle of side a, the inradius is r = a / (2√3) ≈ 0.2887 a. The area of the inscribed circle is π a² / 12 ≈ 0.2618 a².`
                : `For a circle inscribed inside an equilateral triangle of side ${a} ${unit}, the inradius is r = ${a} / (2√3) ≈ ${rIn} ${unit}. The triangle area is ≈ ${aTri} ${unit}² and the inscribed circle area is ≈ ${aInCirc} ${unit}².`;

            const solutionMarkdown = `### 📌 Given & Concept\n` +
                `- **Given:** Equilateral triangle $\\Delta ABC$ of side $a = ${a}\\text{ ${unit}}$ with an inscribed circle (incircle) tangent to all three sides.\n` +
                `- **Properties:** All sides equal $a$, all angles $60^\\circ$.\n\n` +
                `### 📐 Formula\n` +
                `$$r = \\frac{\\Delta}{s} = \\frac{\\frac{\\sqrt{3}}{4}a^2}{\\frac{3}{2}a} = \\frac{\\sqrt{3}}{6}a = \\frac{a}{2\\sqrt{3}} \\approx 0.2887 a$$\n\n` +
                `### 🔢 Step-by-Step Solution\n` +
                `1. **Inradius ($r$):**\n` +
                `   $$r = \\frac{${a}}{2\\sqrt{3}} = \\frac{${a}\\sqrt{3}}{6} \\approx ${rIn}\\text{ ${unit}}$$\n` +
                `2. **Area of Inscribed Circle ($A_{\\text{circle}}$):**\n` +
                `   $$A_{\\text{circle}} = \\pi r^2 = \\pi (${rIn})^2 \\approx ${aInCirc}\\text{ ${unit}}^2$$\n` +
                `3. **Area of Triangle ($A_{\\text{triangle}}$):**\n` +
                `   $$A_{\\text{triangle}} = \\frac{\\sqrt{3}}{4} (${a})^2 \\approx ${aTri}\\text{ ${unit}}^2$$\n\n` +
                `### ✅ Final Answer\n` +
                `$$\\boxed{r = \\frac{a}{2\\sqrt{3}} = \\frac{${a}}{2\\sqrt{3}} \\approx ${rIn}\\text{ ${unit}}}$$`;

            const svg = this.generateInscribedCircleInTriangleSvg({
                sideValue: a,
                sideLabel: `a = ${a} ${unit}`,
                inradiusValue: rIn,
                inradiusLabel: `r = ${rIn} ${unit}`,
                unit,
                bottomBadge: `r = \\frac{a}{2\\sqrt{3}} \\approx ${rIn} ${unit}`
            });

            return {
                subtype,
                speechResponse,
                solutionMarkdown,
                diagramProps: { subtype, sideValue: a, inradiusValue: rIn, unit, svg, color: '#10b981' },
                diagram: { type: 'svg', svg, width: 380, height: 380, title: 'Incircle of Equilateral Triangle' },
                suggestedFollowUps: [`📐 Circumradius R = 2r`, `⭕ Remaining corner area`, `📄 Clean blank board`]
            };
        }

        // 3. REGULAR HEXAGON INSCRIBED IN CIRCLE
        if (subtype === 'hexagon_circle_inscribed') {
            const { radius, isGeneral } = parsed;
            const R = radius;
            const a = R; // In regular hexagon, side = circumradius!
            const perimeter = 6 * a;
            const areaHex = Math.round(((3 * Math.sqrt(3)) / 2) * R * R * 100) / 100;
            const areaCirc = Math.round(Math.PI * R * R * 100) / 100;

            const speechResponse = `For a regular hexagon inscribed in a circle of radius ${R} ${unit}, each side equals the circumradius: a = R = ${R} ${unit}. The perimeter is 6R = ${perimeter} ${unit}, and the area of the hexagon is (3√3/2)R² ≈ ${areaHex} ${unit}².`;

            const solutionMarkdown = `### 📌 Given & Concept\n` +
                `- **Given:** Regular hexagon inscribed in a circle of radius $R = ${R}\\text{ ${unit}}$.\n` +
                `- **Geometric Property:** A regular hexagon can be partitioned into 6 congruent equilateral triangles from the center, so each side equals the circumradius: $a = R$.\n\n` +
                `### 📐 Formula\n` +
                `$$a = R, \\quad P = 6a = 6R, \\quad A_{\\text{hexagon}} = \\frac{3\\sqrt{3}}{2} R^2$$\n\n` +
                `### 🔢 Step-by-Step Solution\n` +
                `1. **Side Length ($a$):** $a = R = ${R}\\text{ ${unit}}$\n` +
                `2. **Perimeter ($P$):** $P = 6 \\times ${R} = ${perimeter}\\text{ ${unit}}$\n` +
                `3. **Area of Hexagon ($A_{\\text{hexagon}}$):**\n` +
                `   $$A = \\frac{3\\sqrt{3}}{2}(${R})^2 = \\frac{3\\sqrt{3}}{2}(${R * R}) = ${Math.round((3 * R * R) / 2)}\\sqrt{3} \\approx ${areaHex}\\text{ ${unit}}^2$$\n` +
                `4. **Area of Circle:** $A_{\\text{circle}} = \\pi (${R})^2 = ${R * R}\\pi \\approx ${areaCirc}\\text{ ${unit}}^2$\n\n` +
                `### ✅ Final Answer\n` +
                `$$\\boxed{a = ${R}\\text{ ${unit}}, \\quad P = ${perimeter}\\text{ ${unit}}, \\quad A = ${areaHex}\\text{ ${unit}}^2}$$`;

            const svg = this.generateInscribedPolygonSvg({
                n: 6,
                radiusValue: R,
                radiusLabel: `R = ${R} ${unit}`,
                sideValue: a,
                sideLabel: `a = R = ${R} ${unit}`,
                shapeTitle: 'Regular Hexagon Inscribed in Circle',
                unit,
                bottomBadge: `a = R = ${R} ${unit} | P = ${perimeter} ${unit}`
            });

            return {
                subtype,
                speechResponse,
                solutionMarkdown,
                diagramProps: { subtype, radiusValue: R, sideValue: a, unit, svg, color: '#6366f1' },
                diagram: { type: 'svg', svg, width: 380, height: 380, title: 'Regular Hexagon Inscribed in Circle' },
                suggestedFollowUps: [`📏 Apothem = R√3/2`, `⭕ Shaded area between circle and hexagon`, `📄 Clean blank board`]
            };
        }

        // 4. SQUARE INSCRIBED IN CIRCLE
        if (subtype === 'circle_square_inscribed') {
            const { radius, isGeneral } = parsed;
            const R = radius;
            const side = Math.round(R * Math.sqrt(2) * 100) / 100;
            const areaSq = Math.round(2 * R * R * 100) / 100;
            const areaCirc = Math.round(Math.PI * R * R * 100) / 100;
            const areaRem = Math.round((areaCirc - areaSq) * 100) / 100;

            const speechResponse = `For a square inscribed in a circle of radius ${R} ${unit}, the diagonal of the square equals the diameter 2R = ${2 * R} ${unit}. The side is s = R√2 ≈ ${side} ${unit}, and the area of the square is 2R² = ${areaSq} ${unit}².`;

            const solutionMarkdown = `### 📌 Given & Concept\n` +
                `- **Given:** Square inscribed in a circle of radius $R = ${R}\\text{ ${unit}}$.\n` +
                `- **Property:** The diagonal of the inscribed square passes through the center and equals the circle diameter: $d = 2R = ${2 * R}\\text{ ${unit}}$.\n\n` +
                `### 📐 Formula\n` +
                `$$s = \\frac{d}{\\sqrt{2}} = \\frac{2R}{\\sqrt{2}} = R\\sqrt{2}, \\quad A_{\\text{square}} = s^2 = 2R^2$$\n\n` +
                `### 🔢 Step-by-Step Solution\n` +
                `1. **Side Length ($s$):**\n` +
                `   $$s = \\sqrt{2} \\times ${R} = ${R}\\sqrt{2} \\approx ${side}\\text{ ${unit}}$$\n` +
                `2. **Area of Square:** $A_{\\text{square}} = s^2 = 2(${R})^2 = ${areaSq}\\text{ ${unit}}^2$\n` +
                `3. **Area of Circle:** $A_{\\text{circle}} = \\pi (${R})^2 = ${R * R}\\pi \\approx ${areaCirc}\\text{ ${unit}}^2$\n` +
                `4. **Remaining Area between Circle & Square:**\n` +
                `   $$A_{\\text{rem}} = \\pi R^2 - 2R^2 = R^2(\\pi - 2) = ${R * R}(\\pi - 2) \\approx ${areaRem}\\text{ ${unit}}^2$$\n\n` +
                `### ✅ Final Answer\n` +
                `$$\\boxed{s = ${R}\\sqrt{2} \\approx ${side}\\text{ ${unit}}, \\quad A_{\\text{square}} = ${areaSq}\\text{ ${unit}}^2}$$`;

            const svg = this.generateInscribedPolygonSvg({
                n: 4,
                radiusValue: R,
                radiusLabel: `R = ${R} ${unit}`,
                sideValue: side,
                sideLabel: `s = R\\sqrt{2} \\approx ${side} ${unit}`,
                shapeTitle: 'Square Inscribed in Circle',
                unit,
                bottomBadge: `s = R\\sqrt{2} \\approx ${side} ${unit} | A = 2R^2`
            });

            return {
                subtype,
                speechResponse,
                solutionMarkdown,
                diagramProps: { subtype, radiusValue: R, sideValue: side, unit, svg, color: '#6366f1' },
                diagram: { type: 'svg', svg, width: 380, height: 380, title: 'Square Inscribed in Circle' },
                suggestedFollowUps: [`📏 Perimeter = 4√2 R`, `⭕ Shaded segments area`, `📄 Clean blank board`]
            };
        }

        // 5. SQUARE WITH INSCRIBED CIRCLE
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

            const svg = this.generateSquareWithCircleSvg({ s, r, unit, isGeneral: isGen });

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
                color: '#6366f1',
                svg
            };

            return {
                subtype,
                speechResponse,
                solutionMarkdown,
                diagramProps,
                diagram: {
                    type: 'svg',
                    svg,
                    width: 380,
                    height: 380,
                    title: 'Square with Inscribed Circle'
                },
                suggestedFollowUps: [
                    `🔢 Area with side 20 ${unit}`,
                    `⭕ Perimeter of remaining boundary`,
                    `📐 Circle circumscribing square`,
                    `📄 Clean blank board`
                ]
            };
        }

        // 6. CONCENTRIC CIRCLES (ANNULUS)
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

            const svg = this.generateAnnulusSvg({ r1, r2, unit });

            const diagramProps = {
                subtype: 'concentric_circles',
                r1,
                r2,
                ratio: r1 / r2,
                unit,
                innerRadiusLabel: `r₁ = ${r1} ${unit}`,
                outerRadiusLabel: `r₂ = ${r2} ${unit}`,
                color: '#6366f1',
                svg
            };

            return {
                subtype,
                speechResponse,
                solutionMarkdown,
                diagramProps,
                diagram: {
                    type: 'svg',
                    svg,
                    width: 380,
                    height: 380,
                    title: 'Concentric Circles (Circular Ring)'
                },
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

    /**
     * Generates vector SVG for Calculus Area Bounded by Curves (e.g. y = x^2 and y = 4).
     */
    generateCalculusAreaSvg({ curve1 = 'y = x²', curve2 = 'y = 4', a = -2, b = 2, area = '32/3', title = 'Area Bounded by Curves' } = {}) {
        const cx = 190, cy = 240;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 380" width="100%" height="100%">
  <defs>
    <linearGradient id="calcGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f8fafc"/></linearGradient>
    <pattern id="calcHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="8" stroke="rgba(99,102,241,0.3)" stroke-width="2"/></pattern>
    <marker id="calcArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 2 L 10 5 L 0 8 z" fill="#64748b"/></marker>
  </defs>
  <rect width="380" height="380" rx="14" fill="url(#calcGrad)" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="190" y="28" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#1e293b">${title}: ${curve1} &amp; ${curve2}</text>

  <!-- Cartesian Axes -->
  <line x1="40" y1="${cy}" x2="340" y2="${cy}" stroke="#64748b" stroke-width="1.6" marker-end="url(#calcArrow)"/>
  <line x1="${cx}" y1="290" x2="${cx}" y2="55" stroke="#64748b" stroke-width="1.6" marker-end="url(#calcArrow)"/>
  <text x="345" y="${cy + 4}" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#64748b">X</text>
  <text x="${cx - 10}" y="52" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#64748b">Y</text>
  <text x="${cx - 12}" y="${cy + 15}" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#64748b">O</text>

  <!-- Shaded Region between y = 4 and y = x^2 (x from -2 to 2) -->
  <path d="M 110 120 L 270 120 Q 190 240 110 120 Z" fill="rgba(99,102,241,0.2)" stroke="#6366f1" stroke-width="1.5"/>
  <path d="M 110 120 L 270 120 Q 190 240 110 120 Z" fill="url(#calcHatch)"/>

  <!-- Line y = 4 -->
  <line x1="70" y1="120" x2="310" y2="120" stroke="#ef4444" stroke-width="2.2"/>
  <text x="314" y="116" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#ef4444">${curve2}</text>

  <!-- Parabola y = x^2 -->
  <path d="M 85 82.5 Q 190 282 295 82.5" fill="none" stroke="#2563eb" stroke-width="2.5"/>
  <text x="290" y="78" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#2563eb">${curve1}</text>

  <!-- Differential Strip dA = (y2 - y1) dx -->
  <rect x="226" y="120" width="8" height="88" fill="rgba(239,68,68,0.25)" stroke="#ef4444" stroke-width="1"/>
  <text x="240" y="165" font-family="Inter, -apple-system, sans-serif" font-size="10" font-weight="600" fill="#dc2626">dA = (4 - x²)dx</text>

  <!-- Points of Intersection -->
  <circle cx="110" cy="120" r="3.5" fill="#0f172a"/>
  <text x="60" y="112" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#0f172a">(-2, 4)</text>
  <circle cx="270" cy="120" r="3.5" fill="#0f172a"/>
  <text x="274" y="112" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#0f172a">(2, 4)</text>

  <!-- Bottom Result Badge -->
  <rect x="30" y="342" width="320" height="26" rx="6" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
  <text x="190" y="359" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#1d4ed8">A = ∫₋₂² (4 - x²) dx = [4x - x³/3]₋₂² = ${area} ≈ 10.67 sq units</text>
</svg>`;
    }

    /**
     * Generates vector SVG for Conic Sections (Parabola, Ellipse, Hyperbola).
     */
    generateConicSvg({ type = 'parabola', a = 1.25, b = 1, title = 'Conic Section' } = {}) {
        const cx = 190, cy = 190;
        if (type === 'ellipse') {
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 380" width="100%" height="100%">
  <defs>
    <linearGradient id="conicBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f8fafc"/></linearGradient>
    <marker id="conicArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 2 L 10 5 L 0 8 z" fill="#64748b"/></marker>
  </defs>
  <rect width="380" height="380" rx="14" fill="url(#conicBg)" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="190" y="28" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#1e293b">${title}: x²/a² + y²/b² = 1</text>
  <line x1="40" y1="${cy}" x2="340" y2="${cy}" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#conicArrow)"/>
  <line x1="${cx}" y1="320" x2="${cx}" y2="55" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#conicArrow)"/>
  <ellipse cx="${cx}" cy="${cy}" rx="120" ry="75" fill="rgba(99,102,241,0.08)" stroke="#2563eb" stroke-width="2.5"/>
  <circle cx="${cx - 94}" cy="${cy}" r="3.5" fill="#ef4444"/>
  <text x="${cx - 104}" y="${cy - 8}" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#ef4444">F₁(-c, 0)</text>
  <circle cx="${cx + 94}" cy="${cy}" r="3.5" fill="#ef4444"/>
  <text x="${cx + 80}" y="${cy - 8}" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#ef4444">F₂(c, 0)</text>
  <circle cx="${cx}" cy="${cy}" r="3.5" fill="#0f172a"/>
  <text x="${cx - 12}" y="${cy + 15}" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#0f172a">O</text>
  <line x1="${cx - 120}" y1="${cy}" x2="${cx + 120}" y2="${cy}" stroke="#2563eb" stroke-width="1.8"/>
  <text x="${cx + 124}" y="${cy + 14}" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#2563eb">A(a,0)</text>
  <text x="${cx + 6}" y="${cy - 80}" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#2563eb">B(0,b)</text>
  <rect x="30" y="342" width="320" height="26" rx="6" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
  <text x="190" y="359" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#1d4ed8">c = √(a² - b²),  e = c/a &lt; 1,  Area = πab</text>
</svg>`;
        }

        // Parabola y^2 = 4ax
        const vx = 145;
        const fx = vx + 50;
        const dx = vx - 50;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 380" width="100%" height="100%">
  <defs>
    <linearGradient id="paraBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f8fafc"/></linearGradient>
    <marker id="paraArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 2 L 10 5 L 0 8 z" fill="#64748b"/></marker>
  </defs>
  <rect width="380" height="380" rx="14" fill="url(#paraBg)" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="190" y="28" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#1e293b">${title}: y² = 4ax</text>
  <line x1="40" y1="${cy}" x2="340" y2="${cy}" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#paraArrow)"/>
  <line x1="${vx}" y1="320" x2="${vx}" y2="55" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#paraArrow)"/>
  <text x="345" y="${cy + 4}" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#64748b">Axis</text>

  <!-- Directrix x = -a -->
  <line x1="${dx}" y1="55" x2="${dx}" y2="325" stroke="#ef4444" stroke-width="1.8" stroke-dasharray="4,4"/>
  <text x="${dx - 12}" y="70" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#ef4444" text-anchor="end">Directrix: x = -a</text>

  <!-- Parabola Curve -->
  <path d="M 310 65 Q ${vx - 40} ${cy} 310 315" fill="none" stroke="#2563eb" stroke-width="2.5"/>

  <!-- Vertex V(0,0) -->
  <circle cx="${vx}" cy="${cy}" r="3.5" fill="#0f172a"/>
  <text x="${vx - 14}" y="${cy + 15}" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#0f172a">V(0,0)</text>

  <!-- Focus F(a, 0) -->
  <circle cx="${fx}" cy="${cy}" r="4" fill="#ef4444"/>
  <text x="${fx + 6}" y="${cy - 8}" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#ef4444">Focus F(a, 0)</text>

  <!-- Latus Rectum Chord through Focus -->
  <line x1="${fx}" y1="${cy - 95}" x2="${fx}" y2="${cy + 95}" stroke="#10b981" stroke-width="1.8" stroke-dasharray="3,3"/>
  <text x="${fx + 8}" y="${cy - 75}" font-family="Inter, -apple-system, sans-serif" font-size="10" font-weight="600" fill="#059669">Latus Rectum = 4a</text>

  <!-- Bottom Result Badge -->
  <rect x="30" y="342" width="320" height="26" rx="6" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
  <text x="190" y="359" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#1d4ed8">Vertex: (0,0),  Focus: (a,0),  Directrix: x = -a,  LR = 4a</text>
</svg>`;
    }

    /**
     * Generates vector SVG for Circle Tangents from an external point P.
     */
    generateCircleTangentSvg({ radius = 65, externalDist = 160, title = 'Tangents to Circle from Point P' } = {}) {
        const ox = 145, oy = 190, px = 305, py = 190;
        const ax = 171, ay = 131;
        const bx = 171, by = 249;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 380" width="100%" height="100%">
  <defs>
    <linearGradient id="tanBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f8fafc"/></linearGradient>
  </defs>
  <rect width="380" height="380" rx="14" fill="url(#tanBg)" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="190" y="28" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#1e293b">${title}</text>

  <!-- Circle -->
  <circle cx="${ox}" cy="${oy}" r="${radius}" fill="rgba(99,102,241,0.06)" stroke="#6366f1" stroke-width="2.5"/>
  <circle cx="${ox}" cy="${oy}" r="3.5" fill="#0f172a"/>
  <text x="${ox - 15}" y="${oy + 4}" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#0f172a">O</text>

  <!-- Tangent Lines PA and PB -->
  <line x1="${px}" y1="${py}" x2="${ax}" y2="${ay}" stroke="#2563eb" stroke-width="2.2"/>
  <line x1="${px}" y1="${py}" x2="${bx}" y2="${by}" stroke="#2563eb" stroke-width="2.2"/>

  <!-- Radii OA and OB -->
  <line x1="${ox}" y1="${oy}" x2="${ax}" y2="${ay}" stroke="#ef4444" stroke-width="1.8" stroke-dasharray="3,3"/>
  <line x1="${ox}" y1="${oy}" x2="${bx}" y2="${by}" stroke="#ef4444" stroke-width="1.8" stroke-dasharray="3,3"/>
  <text x="142" y="155" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#ef4444">r</text>
  <text x="142" y="230" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#ef4444">r</text>

  <!-- Center Line OP -->
  <line x1="${ox}" y1="${oy}" x2="${px}" y2="${py}" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,4"/>

  <!-- Right Angle Indicators -->
  <rect x="${ax - 4}" y="${ay + 2}" width="8" height="8" transform="rotate(-23 ${ax} ${ay})" fill="none" stroke="#ef4444" stroke-width="1.2"/>
  <rect x="${bx - 4}" y="${by - 10}" width="8" height="8" transform="rotate(23 ${bx} ${by})" fill="none" stroke="#ef4444" stroke-width="1.2"/>

  <!-- Contact Points & External Point P -->
  <circle cx="${ax}" cy="${ay}" r="3.5" fill="#2563eb"/>
  <text x="${ax - 4}" y="${ay - 8}" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#2563eb">A</text>
  <circle cx="${bx}" cy="${by}" r="3.5" fill="#2563eb"/>
  <text x="${bx - 4}" y="${by + 16}" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#2563eb">B</text>
  <circle cx="${px}" cy="${py}" r="4" fill="#0f172a"/>
  <text x="${px + 8}" y="${py + 4}" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#0f172a">P</text>

  <!-- Bottom Result Badge -->
  <rect x="30" y="342" width="320" height="26" rx="6" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
  <text x="190" y="359" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#1d4ed8">PA = PB = √(OP² - r²),  ∠OAP = ∠OBP = 90°</text>
</svg>`;
    }

    /**
     * Generates vector SVG for Venn Diagrams (2-set or 3-set).
     */
    generateVennSvg({ type = 'intersection', title = 'Venn Diagram: A ∩ B' } = {}) {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 380" width="100%" height="100%">
  <defs>
    <linearGradient id="vennBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f8fafc"/></linearGradient>
    <clipPath id="vennClipA"><circle cx="150" cy="185" r="70"/></clipPath>
  </defs>
  <rect width="380" height="380" rx="14" fill="url(#vennBg)" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="190" y="28" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#1e293b">${title}</text>

  <!-- Universal Set U -->
  <rect x="40" y="60" width="300" height="260" rx="10" fill="#f8fafc" stroke="#64748b" stroke-width="1.8"/>
  <text x="55" y="85" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#64748b">U</text>

  <!-- Set A and Set B Circles -->
  <circle cx="150" cy="185" r="70" fill="rgba(59,130,246,0.12)" stroke="#2563eb" stroke-width="2.2"/>
  <circle cx="230" cy="185" r="70" fill="rgba(16,185,129,0.12)" stroke="#059669" stroke-width="2.2"/>

  <!-- Shaded Intersection Lens -->
  <circle cx="230" cy="185" r="70" fill="rgba(99,102,241,0.45)" clip-path="url(#vennClipA)"/>

  <!-- Labels -->
  <text x="120" y="150" font-family="Inter, -apple-system, sans-serif" font-size="14" font-weight="700" fill="#1d4ed8">A</text>
  <text x="255" y="150" font-family="Inter, -apple-system, sans-serif" font-size="14" font-weight="700" fill="#047857">B</text>
  <text x="190" y="190" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#312e81">A ∩ B</text>

  <!-- Bottom Result Badge -->
  <rect x="30" y="342" width="320" height="26" rx="6" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
  <text x="190" y="359" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#1d4ed8">n(A ∪ B) = n(A) + n(B) - n(A ∩ B)</text>
</svg>`;
    }

    /**
     * Generates vector SVG for Complex Contour Integration in the complex z-plane.
     */
    generateComplexContourSvg({ pole = 'z = i', radius = 'R', title = 'Contour Integration in Complex Plane' } = {}) {
        const cx = 190, cy = 230;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 380" width="100%" height="100%">
  <defs>
    <linearGradient id="cpxBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f8fafc"/></linearGradient>
    <marker id="cpxArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 2 L 10 5 L 0 8 z" fill="#64748b"/></marker>
    <marker id="pathArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 2 L 10 5 L 0 8 z" fill="#2563eb"/></marker>
  </defs>
  <rect width="380" height="380" rx="14" fill="url(#cpxBg)" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="190" y="28" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#1e293b">${title}</text>

  <!-- Axes: Re(z) and Im(z) -->
  <line x1="40" y1="${cy}" x2="340" y2="${cy}" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#cpxArrow)"/>
  <line x1="${cx}" y1="310" x2="${cx}" y2="55" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#cpxArrow)"/>
  <text x="345" y="${cy + 4}" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#64748b">Re(z)</text>
  <text x="${cx - 10}" y="52" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#64748b">Im(z)</text>

  <!-- Semicircular Contour CR -->
  <path d="M 70 ${cy} L 310 ${cy} A 120 120 0 0 0 70 ${cy} Z" fill="rgba(99,102,241,0.12)" stroke="#2563eb" stroke-width="2.2"/>

  <!-- Path direction arrows -->
  <line x1="170" y1="${cy}" x2="210" y2="${cy}" stroke="#2563eb" stroke-width="2.2" marker-end="url(#pathArrow)"/>
  <path d="M 275 145 A 120 120 0 0 0 190 110" fill="none" stroke="#2563eb" stroke-width="2.2" marker-end="url(#pathArrow)"/>

  <!-- Poles at z = +i (inside) and z = -i (outside) -->
  <text x="190" y="165" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="18" font-weight="900" fill="#ef4444">×</text>
  <text x="202" y="162" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#ef4444">${pole} (Pole)</text>

  <text x="190" y="300" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="18" font-weight="900" fill="#94a3b8">×</text>
  <text x="202" y="298" font-family="Inter, -apple-system, sans-serif" font-size="10" font-weight="600" fill="#94a3b8">z = -i</text>

  <!-- Contour Labels -->
  <text x="70" y="${cy + 16}" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#2563eb">-R</text>
  <text x="305" y="${cy + 16}" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#2563eb">+R</text>
  <text x="235" y="115" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#2563eb">C_R</text>

  <!-- Bottom Result Badge -->
  <rect x="30" y="342" width="320" height="26" rx="6" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
  <text x="190" y="359" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#1d4ed8">∮_C f(z) dz = 2πi · Res(f, i) = 2πi · (1/2i) = π</text>
</svg>`;
    }

    /**
     * Generates vector SVG for Linear Programming (LPP) Feasible Regions.
     */
    generateLppFeasibleSvg({ optimalPoint = '(1, 3)', maxZ = '9', title = 'Linear Programming Feasible Region' } = {}) {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 380" width="100%" height="100%">
  <defs>
    <linearGradient id="lppBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f8fafc"/></linearGradient>
    <marker id="lppArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 2 L 10 5 L 0 8 z" fill="#64748b"/></marker>
  </defs>
  <rect width="380" height="380" rx="14" fill="url(#lppBg)" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="190" y="28" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#1e293b">${title}</text>

  <!-- First Quadrant Axes -->
  <line x1="60" y1="280" x2="330" y2="280" stroke="#64748b" stroke-width="1.8" marker-end="url(#lppArrow)"/>
  <line x1="60" y1="280" x2="60" y2="55" stroke="#64748b" stroke-width="1.8" marker-end="url(#lppArrow)"/>
  <text x="335" y="284" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#64748b">x</text>
  <text x="56" y="50" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#64748b">y</text>

  <!-- Feasible Convex Polygon -->
  <polygon points="60,280 172.5,280 105,145 60,100" fill="rgba(34,197,94,0.22)" stroke="#16a34a" stroke-width="2.5"/>

  <!-- Boundary Lines -->
  <line x1="40" y1="315" x2="200" y2="245" stroke="#ef4444" stroke-width="1.5"/>
  <line x1="40" y1="80" x2="240" y2="280" stroke="#3b82f6" stroke-width="1.5"/>

  <!-- Corner Vertices -->
  <circle cx="60" cy="280" r="4" fill="#0f172a"/>
  <text x="44" y="296" font-family="Inter, -apple-system, sans-serif" font-size="10" font-weight="700" fill="#0f172a">(0,0)</text>

  <circle cx="172.5" cy="280" r="4" fill="#0f172a"/>
  <text x="160" y="296" font-family="Inter, -apple-system, sans-serif" font-size="10" font-weight="700" fill="#0f172a">(2.5, 0)</text>

  <circle cx="60" cy="100" r="4" fill="#0f172a"/>
  <text x="32" y="105" font-family="Inter, -apple-system, sans-serif" font-size="10" font-weight="700" fill="#0f172a">(0, 4)</text>

  <!-- Optimal Point -->
  <circle cx="105" cy="145" r="5" fill="#f59e0b" stroke="#b45309" stroke-width="2"/>
  <text x="115" y="140" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="800" fill="#b45309">Optimal ${optimalPoint}</text>

  <!-- Objective Function Level Line -->
  <line x1="45" y1="185" x2="165" y2="105" stroke="#8b5cf6" stroke-width="1.8" stroke-dasharray="4,4"/>
  <text x="170" y="112" font-family="Inter, -apple-system, sans-serif" font-size="10" font-weight="600" fill="#8b5cf6">Z = 3x + 2y</text>

  <!-- Bottom Result Badge -->
  <rect x="30" y="342" width="320" height="26" rx="6" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
  <text x="190" y="359" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#1d4ed8">Optimal Corner Point: ${optimalPoint}  ⟹  Z_max = ${maxZ}</text>
</svg>`;
    }

    /**
     * Generates vector SVG for Metric Space Unit Balls in R^2 (l1, l2, l_infinity norms).
     */
    generateMetricBallsSvg({ title = 'Unit Balls in ℝ² for l₁, l₂, l_∞ Norms' } = {}) {
        const cx = 190, cy = 190, r = 85;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 380" width="100%" height="100%">
  <defs>
    <linearGradient id="metBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f8fafc"/></linearGradient>
    <marker id="metArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 2 L 10 5 L 0 8 z" fill="#64748b"/></marker>
  </defs>
  <rect width="380" height="380" rx="14" fill="url(#metBg)" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="190" y="28" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#1e293b">${title}</text>

  <!-- Axes -->
  <line x1="40" y1="${cy}" x2="340" y2="${cy}" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#metArrow)"/>
  <line x1="${cx}" y1="320" x2="${cx}" y2="55" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#metArrow)"/>
  <text x="345" y="${cy + 4}" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#64748b">x₁</text>
  <text x="${cx - 10}" y="52" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#64748b">x₂</text>

  <!-- l_infinity ball (Square max(|x1|, |x2|) <= 1) -->
  <rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" fill="rgba(239,68,68,0.06)" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,4"/>

  <!-- l2 ball (Euclidean Circle x1^2 + x2^2 <= 1) -->
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(99,102,241,0.12)" stroke="#4f46e5" stroke-width="2.2"/>

  <!-- l1 ball (Taxicab Diamond |x1| + |x2| <= 1) -->
  <polygon points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}" fill="rgba(16,185,129,0.22)" stroke="#059669" stroke-width="2.5"/>

  <!-- Legend -->
  <rect x="250" y="55" width="115" height="65" rx="6" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <rect x="258" y="66" width="10" height="10" fill="#059669"/>
  <text x="274" y="75" font-family="Inter, -apple-system, sans-serif" font-size="10" font-weight="600" fill="#1e293b">l₁ Diamond</text>
  <circle cx="263" cy="88" r="5" fill="#4f46e5"/>
  <text x="274" y="92" font-family="Inter, -apple-system, sans-serif" font-size="10" font-weight="600" fill="#1e293b">l₂ Circle</text>
  <rect x="258" y="101" width="10" height="10" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="2,2"/>
  <text x="274" y="110" font-family="Inter, -apple-system, sans-serif" font-size="10" font-weight="600" fill="#1e293b">l_∞ Square</text>

  <!-- Bottom Result Badge -->
  <rect x="30" y="342" width="320" height="26" rx="6" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
  <text x="190" y="359" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#1d4ed8">B_{l₁} ⊂ B_{l₂} ⊂ B_{l_∞}  (|x|+|y| ≤ 1 ⊂ x²+y² ≤ 1 ⊂ max|x|,|y| ≤ 1)</text>
</svg>`;
    }

    /**
     * Generates vector SVG for Topology Quotient Identification Polygons (Torus, Möbius Strip, Klein Bottle).
     */
    generateTopologyQuotientSvg({ type = 'torus', title = 'Topology Quotient Space: Torus T²' } = {}) {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 380" width="100%" height="100%">
  <defs>
    <linearGradient id="topBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f8fafc"/></linearGradient>
    <marker id="arrowA" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 2 L 10 5 L 0 8 z" fill="#2563eb"/></marker>
    <marker id="arrowB" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 2 L 10 5 L 0 8 z" fill="#ef4444"/></marker>
  </defs>
  <rect width="380" height="380" rx="14" fill="url(#topBg)" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="190" y="28" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#1e293b">${title}</text>

  <!-- Fundamental Square [0, 1] x [0, 1] -->
  <rect x="90" y="90" width="200" height="200" rx="4" fill="rgba(99,102,241,0.06)" stroke="#64748b" stroke-width="2"/>

  <!-- Horizontal Identification Edges 'a' (both pointing right) -->
  <line x1="90" y1="90" x2="200" y2="90" stroke="#2563eb" stroke-width="3" marker-end="url(#arrowA)"/>
  <line x1="200" y1="90" x2="290" y2="90" stroke="#2563eb" stroke-width="3"/>
  <text x="190" y="80" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="800" fill="#2563eb">a →</text>

  <line x1="90" y1="290" x2="200" y2="290" stroke="#2563eb" stroke-width="3" marker-end="url(#arrowA)"/>
  <line x1="200" y1="290" x2="290" y2="290" stroke="#2563eb" stroke-width="3"/>
  <text x="190" y="310" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="800" fill="#2563eb">a →</text>

  <!-- Vertical Identification Edges 'b' (both pointing up) -->
  <line x1="90" y1="290" x2="90" y2="180" stroke="#ef4444" stroke-width="3" marker-end="url(#arrowB)"/>
  <line x1="90" y1="180" x2="90" y2="90" stroke="#ef4444" stroke-width="3"/>
  <text x="75" y="195" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="800" fill="#ef4444">b ↑</text>

  <line x1="290" y1="290" x2="290" y2="180" stroke="#ef4444" stroke-width="3" marker-end="url(#arrowB)"/>
  <line x1="290" y1="180" x2="290" y2="90" stroke="#ef4444" stroke-width="3"/>
  <text x="305" y="195" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="800" fill="#ef4444">b ↑</text>

  <!-- Vertices (all 4 identify to single point) -->
  <circle cx="90" cy="90" r="4.5" fill="#0f172a"/>
  <circle cx="290" cy="90" r="4.5" fill="#0f172a"/>
  <circle cx="90" cy="290" r="4.5" fill="#0f172a"/>
  <circle cx="290" cy="290" r="4.5" fill="#0f172a"/>
  <text x="190" y="195" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#4338ca">T² = S¹ × S¹</text>

  <!-- Bottom Result Badge -->
  <rect x="30" y="342" width="320" height="26" rx="6" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
  <text x="190" y="359" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#1d4ed8">Word: a b a⁻¹ b⁻¹  ⟹  Euler Characteristic χ(T²) = 0</text>
</svg>`;
    }

    /**
     * Generates vector SVG for Vector Addition (Parallelogram / Triangle Law).
     */
    generateVectorDiagramSvg({ operation = 'addition', title = 'Vector Addition: Parallelogram Law' } = {}) {
        const ox = 75, oy = 265;
        const ax = 215, ay = 265;
        const bx = 160, by = 180;
        const rx = 300, ry = 180;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 380" width="100%" height="100%">
  <defs>
    <linearGradient id="vecBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f8fafc"/></linearGradient>
    <marker id="vecArrowA" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 2 L 10 5 L 0 8 z" fill="#2563eb"/></marker>
    <marker id="vecArrowB" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 2 L 10 5 L 0 8 z" fill="#059669"/></marker>
    <marker id="vecArrowR" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 2 L 10 5 L 0 8 z" fill="#dc2626"/></marker>
  </defs>
  <rect width="380" height="380" rx="14" fill="url(#vecBg)" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="190" y="28" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#1e293b">${title}</text>

  <!-- Parallelogram Dashed Completion -->
  <line x1="${ax}" y1="${ay}" x2="${rx}" y2="${ry}" stroke="#94a3b8" stroke-width="1.6" stroke-dasharray="4,4"/>
  <line x1="${bx}" y1="${by}" x2="${rx}" y2="${ry}" stroke="#94a3b8" stroke-width="1.6" stroke-dasharray="4,4"/>

  <!-- Vector a -->
  <line x1="${ox}" y1="${oy}" x2="${ax}" y2="${ay}" stroke="#2563eb" stroke-width="2.5" marker-end="url(#vecArrowA)"/>
  <text x="145" y="${oy + 18}" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="800" fill="#2563eb">a⃗</text>

  <!-- Vector b -->
  <line x1="${ox}" y1="${oy}" x2="${bx}" y2="${by}" stroke="#059669" stroke-width="2.5" marker-end="url(#vecArrowB)"/>
  <text x="105" y="${by + 30}" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="800" fill="#059669">b⃗</text>

  <!-- Resultant Vector R = a + b -->
  <line x1="${ox}" y1="${oy}" x2="${rx}" y2="${ry}" stroke="#dc2626" stroke-width="2.8" marker-end="url(#vecArrowR)"/>
  <text x="210" y="210" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="800" fill="#dc2626">R⃗ = a⃗ + b⃗</text>

  <!-- Origin O -->
  <circle cx="${ox}" cy="${oy}" r="4" fill="#0f172a"/>
  <text x="${ox - 14}" y="${oy + 4}" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#0f172a">O</text>

  <!-- Angle theta arc -->
  <path d="M 115 ${oy} A 40 40 0 0 0 102 238" fill="none" stroke="#64748b" stroke-width="1.5"/>
  <text x="122" y="250" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#64748b">θ</text>

  <!-- Bottom Result Badge -->
  <rect x="30" y="342" width="320" height="26" rx="6" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
  <text x="190" y="359" text-anchor="middle" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#1d4ed8">R = √(a² + b² + 2ab cos θ),  tan α = (b sin θ)/(a + b cos θ)</text>
</svg>`;
    }

    /**
     * Parses broad syllabus problems (Calculus, Conics, Circle Theorems, Complex Analysis,
     * Linear Programming, Venn Diagrams, Vectors, Metric Spaces, Topology) from user text.
     */
    parseSyllabusDiagramFromText(text) {
        if (!text || typeof text !== 'string') return null;
        const low = text.toLowerCase();

        // 1. Calculus: Area bounded by curves
        if (/\b(area\s*(?:bounded|enclosed|between|under)\s*(?:the)?\s*curve|area\s*bounded|bounded\s*by\s*y\s*=|\barea\s*under\b)/i.test(low) ||
            (/\barea\b/i.test(low) && /y\s*=\s*x\^?2/i.test(low) && /\by\s*=\s*\d+/i.test(low))) {
            return { type: 'calculus_area', rawText: text };
        }

        // 2. Conic Sections: Parabola, Ellipse, Hyperbola
        if (/\b(parabola|focus\s*and\s*directrix|directrix\s*of\s*parabola|latus\s*rectum|y\^?2\s*=\s*4a)/i.test(low)) {
            return { type: 'conic_parabola', rawText: text };
        }
        if (/\b(ellipse|eccentricity\s*of\s*ellipse|foci\s*of\s*ellipse|major\s*axis|minor\s*axis|x\^?2\/a\^?2)/i.test(low)) {
            return { type: 'conic_ellipse', rawText: text };
        }
        if (/\b(hyperbola|asymptotes\s*of\s*hyperbola|eccentricity\s*of\s*hyperbola)/i.test(low)) {
            return { type: 'conic_hyperbola', rawText: text };
        }

        // 3. Circle Tangents & External Point
        if (/\b(tangent|tangents)\b/i.test(low) && /\b(circle|point\s*p|external\s*point)\b/i.test(low)) {
            return { type: 'circle_tangent', rawText: text };
        }

        // 4. Complex Analysis: Contour Integration, Cauchy Residue, Poles
        if (/\b(contour\s*integral|cauchy\s*residue|residue\s*theorem|semicircular\s*contour|upper\s*semicircle|poles?\s*at|complex\s*plane\s*contour|bromwich)/i.test(low)) {
            return { type: 'complex_contour', rawText: text };
        }

        // 5. Linear Programming (LPP): Feasible region, corner points
        if (/\b(feasible\s*region|linear\s*programming|maximize\s*z|minimize\s*z|corner\s*point\s*method|lpp\b)/i.test(low)) {
            return { type: 'lpp_feasible', rawText: text };
        }

        // 6. Venn Diagrams / Set Theory
        if (/\b(venn\s*diagram|a\s*union\s*b|a\s*intersect\s*b|set\s*theory\s*diagram)\b/i.test(low)) {
            return { type: 'venn_diagram', rawText: text };
        }

        // 7. Vectors: Addition, Parallelogram Law
        if (/\b(parallelogram\s*law|triangle\s*law\s*of\s*vector|vector\s*addition|resultant\s*of\s*two\s*vectors)\b/i.test(low)) {
            return { type: 'vector_addition', rawText: text };
        }

        // 8. Metric Spaces: Unit balls in l1, l2, l_infinity
        if (/\b(metric\s*ball|unit\s*ball|taxicab\s*norm|l1\s*norm|l2\s*norm|l_?\s*infinity\s*norm|supremum\s*norm)\b/i.test(low)) {
            return { type: 'metric_balls', rawText: text };
        }

        // 9. Topology: Quotient polygons (Torus, Möbius strip, Klein bottle)
        if (/\b(torus\s*quotient|mobius\s*strip.*identification|klein\s*bottle.*identification|quotient\s*space.*polygon|identification\s*polygon)\b/i.test(low)) {
            return { type: 'topology_quotient', rawText: text };
        }

        return null;
    }

    /**
     * Solves and generates complete mathematical derivations and publication-grade SVG diagrams
     * for broad syllabus problems across CBSE, B.Tech, and M.Sc mathematics.
     */
    solveSyllabusDiagram(parsed) {
        if (!parsed || !parsed.type) return null;

        let speechResponse = '';
        let solutionMarkdown = '';
        let svg = '';
        let title = 'Mathematical Diagram';

        if (parsed.type === 'calculus_area') {
            title = 'Area Bounded by Curves';
            svg = this.generateCalculusAreaSvg({ curve1: 'y = x²', curve2: 'y = 4', a: -2, b: 2, area: '32/3', title });
            speechResponse = 'The area bounded by the parabola y = x squared and the line y = 4 is 32 over 3, or approximately 10.67 square units, evaluated by integrating 4 minus x squared from minus 2 to 2.';
            solutionMarkdown = `### 📌 Given & Concept
- **Curves:** Parabola $y = x^2$ (opening upward) and horizontal line $y = 4$.
- **Points of Intersection:**
  $$x^2 = 4 \\implies x = \\pm 2$$
  Intersection coordinates: $P_1(-2, 4)$ and $P_2(2, 4)$.
- **Governing Concept:** Area between two curves $y = f(x)$ and $y = g(x)$ where $f(x) \\ge g(x)$ on $[a, b]$:
  $$A = \\int_{a}^{b} \\left[ f(x) - g(x) \\right] dx$$

### 📐 Formula
$$A = \\int_{-2}^{2} \\left(4 - x^2\\right) dx = 2 \\int_{0}^{2} \\left(4 - x^2\\right) dx$$

### 🔢 Step-by-Step Solution
1. **Set up the definite integral:**
   Since the region is symmetric about the $y$-axis:
   $$A = 2 \\left[ 4x - \\frac{x^3}{3} \\right]_{0}^{2}$$
2. **Evaluate at the limits:**
   $$A = 2 \\left( 4(2) - \\frac{2^3}{3} \\right) = 2 \\left( 8 - \\frac{8}{3} \\right) = 2 \\left( \\frac{16}{3} \\right) = \\frac{32}{3}$$

### ✅ Final Answer
$$\\boxed{\\text{Area } A = \\frac{32}{3} \\approx 10.67\\text{ square units}}$$`;
        } else if (parsed.type === 'conic_parabola') {
            title = 'Parabola with Focus & Directrix';
            svg = this.generateConicSvg({ type: 'parabola', a: 1.25, title });
            speechResponse = 'For the standard parabola y squared equals 4ax, the vertex is at the origin, the focus is at (a, 0), the directrix is x equals minus a, and the latus rectum has length 4a.';
            solutionMarkdown = `### 📌 Given & Concept
- **Equation of Parabola:** $y^2 = 4ax$ ($a > 0$).
- **Geometric Definition:** Locus of a point equidistant from the focus $F(a, 0)$ and the directrix line $x + a = 0$.

### 📐 Formula
- **Focus:** $F(a, 0)$
- **Directrix:** $x = -a \\iff x + a = 0$
- **Axis of Symmetry:** $y = 0$ ($x$-axis)
- **Latus Rectum Length:** $LL' = 4a$
- **Eccentricity:** $e = 1$

### 🔢 Step-by-Step Solution
1. **End-points of Latus Rectum:** Substitute $x = a$ into $y^2 = 4a(a) = 4a^2 \\implies y = \\pm 2a$.
   $$L(a, 2a), \\quad L'(a, -2a)$$
2. **Length of Latus Rectum:**
   $$\\text{Length} = |2a - (-2a)| = 4a$$

### ✅ Final Answer
$$\\boxed{\\text{Vertex: } (0,0), \\quad \\text{Focus: } (a, 0), \\quad \\text{Directrix: } x = -a, \\quad \\text{Latus Rectum } = 4a}$$`;
        } else if (parsed.type === 'conic_ellipse') {
            title = 'Standard Ellipse';
            svg = this.generateConicSvg({ type: 'ellipse', a: 4, b: 2.5, title });
            speechResponse = 'For the ellipse x squared over a squared plus y squared over b squared equals 1, the foci are at plus or minus c comma 0 where c equals the square root of a squared minus b squared, and the total area is pi a b.';
            solutionMarkdown = `### 📌 Given & Concept
- **Equation of Ellipse:** $\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1$ ($a > b > 0$).
- **Major Axis:** $2a$ along $x$-axis; **Minor Axis:** $2b$ along $y$-axis.

### 📐 Formula
- **Focal Distance:** $c = \\sqrt{a^2 - b^2}$
- **Foci:** $F_1(-c, 0)$ and $F_2(c, 0)$
- **Eccentricity:** $e = \\frac{c}{a} = \\sqrt{1 - \\frac{b^2}{a^2}} < 1$
- **Area of Ellipse:** $A = \\pi a b$

### 🔢 Step-by-Step Solution
1. **Sum of Focal Distances:** For any point $P(x,y)$ on the ellipse:
   $$PF_1 + PF_2 = 2a$$
2. **Directrices:** $x = \\pm \\frac{a}{e}$.

### ✅ Final Answer
$$\\boxed{\\text{Foci: } (\\pm c, 0) = \\left(\\pm \\sqrt{a^2 - b^2}, 0\\right), \\quad e = \\frac{c}{a}, \\quad \\text{Area} = \\pi a b}$$`;
        } else if (parsed.type === 'circle_tangent') {
            title = 'Tangents from External Point';
            svg = this.generateCircleTangentSvg({ radius: 65, externalDist: 160, title });
            speechResponse = 'Tangents drawn from an external point P to a circle are equal in length, and each tangent is strictly perpendicular to the radius at the point of contact.';
            solutionMarkdown = `### 📌 Given & Concept
- **Circle:** Center $O$, radius $r$.
- **External Point:** $P$ located at distance $d = OP > r$ from the center.
- **Contact Points:** $A$ and $B$.

### 📐 Formula
- **Perpendicularity:** $\\angle OAP = \\angle OBP = 90^\\circ$
- **Tangent Length:**
  $$PA = PB = \\sqrt{OP^2 - r^2}$$

### 🔢 Step-by-Step Solution
1. In $\\triangle OAP$ and $\\triangle OBP$:
   - $OA = OB = r$ (radii of same circle)
   - $OP = OP$ (common hypotenuse)
   - $\\angle OAP = \\angle OBP = 90^\\circ$ (radius $\\perp$ tangent)
2. By RHS congruence: $\\triangle OAP \\cong \\triangle OBP$.
3. Therefore: $PA = PB$ and $\\angle APO = \\angle BPO$.

### ✅ Final Answer
$$\\boxed{PA = PB = \\sqrt{OP^2 - r^2}, \\quad \\angle OAP = 90^\\circ}$$`;
        } else if (parsed.type === 'complex_contour') {
            title = 'Complex Contour Integration';
            svg = this.generateComplexContourSvg({ pole: 'z = i', radius: 'R', title });
            speechResponse = 'By the Cauchy Residue Theorem, integrating 1 over z squared plus 1 along the closed upper semicircular contour encloses the simple pole at z equals i, giving a value of pi.';
            solutionMarkdown = `### 📌 Given & Concept
- **Integral:** $I = \\int_{-\\infty}^{\\infty} \\frac{1}{x^2 + 1} dx$
- **Complex Function:** $f(z) = \\frac{1}{z^2 + 1} = \\frac{1}{(z - i)(z + i)}$
- **Poles:** Simple poles at $z = i$ (upper half-plane) and $z = -i$ (lower half-plane).
- **Contour $C$:** Semicircular contour $C_R$ in upper half-plane bounded by $[-R, R]$ on the real axis and arc $\\Gamma_R$.

### 📐 Formula
$$\\oint_{C} f(z) dz = 2\\pi i \\sum_{k} \\text{Res}(f, z_k)$$

### 🔢 Step-by-Step Solution
1. **Residue at $z = i$ (enclosed inside $C$):**
   $$\\text{Res}(f, i) = \\lim_{z \\to i} (z - i) \\frac{1}{(z - i)(z + i)} = \\frac{1}{2i}$$
2. **Apply Residue Theorem:**
   $$\\oint_{C} f(z) dz = 2\\pi i \\left(\\frac{1}{2i}\\right) = \\pi$$
3. **Jordan's Lemma / Arc limit as $R \\to \\infty$:**
   $$\\left| \\int_{\\Gamma_R} f(z) dz \\right| \\le \\frac{\\pi R}{R^2 - 1} \\to 0 \\quad \\text{as } R \\to \\infty$$

### ✅ Final Answer
$$\\boxed{\\int_{-\\infty}^{\\infty} \\frac{1}{x^2 + 1} dx = \\pi}$$`;
        } else if (parsed.type === 'lpp_feasible') {
            title = 'LPP Feasible Region';
            svg = this.generateLppFeasibleSvg({ optimalPoint: '(1, 3)', maxZ: '9', title });
            speechResponse = 'The feasible region is a bounded convex polygon. Evaluating the objective function Z = 3x + 2y at all corner vertices yields the optimal maximum value of 9 at point (1, 3).';
            solutionMarkdown = `### 📌 Given & Concept
- **Objective Function:** Maximize $Z = 3x + 2y$
- **Constraints:**
  $$x + y \\le 4, \\quad 2x + y \\le 5, \\quad x \\ge 0, \\quad y \\ge 0$$
- **Fundamental Theorem of LPP:** The optimal value of the linear objective function occurs at one of the corner points (vertices) of the convex feasible region.

### 📐 Formula
$$Z(x, y) = 3x + 2y$$

### 🔢 Step-by-Step Solution
1. **Find Corner Points (Vertices):**
   - Origin: $(0, 0) \\implies Z = 3(0) + 2(0) = 0$
   - $x$-intercept of $2x + y = 5$: $(2.5, 0) \\implies Z = 3(2.5) + 0 = 7.5$
   - $y$-intercept of $x + y = 4$: $(0, 4) \\implies Z = 0 + 2(4) = 8$
   - Intersection of $x + y = 4$ and $2x + y = 5$:
     Subtracting gives $x = 1 \\implies y = 3$:
     $$Z(1, 3) = 3(1) + 2(3) = 9$$

### ✅ Final Answer
$$\\boxed{\\text{Maximum } Z = 9 \\quad \\text{at corner point } (x^*, y^*) = (1, 3)}$$`;
        } else if (parsed.type === 'metric_balls') {
            title = 'Unit Balls in ℝ²';
            svg = this.generateMetricBallsSvg({ title });
            speechResponse = 'In R squared, the unit ball takes different geometric shapes depending on the norm: a diamond for the l1 taxicab norm, a circle for the l2 Euclidean norm, and a square for the l-infinity supremum norm.';
            solutionMarkdown = `### 📌 Given & Concept
- **Normed Linear Space:** $\\mathbb{R}^2$ with standard $l_p$ norms for $p = 1, 2, \\infty$.
- **Unit Ball Definition:** $B_p = \\{ (x_1, x_2) \\in \\mathbb{R}^2 : \\|x\\|_p \\le 1 \\}$.

### 📐 Formula
- **$l_1$ Norm (Taxicab):** $\\|x\\|_1 = |x_1| + |x_2| \\le 1$ (Diamond)
- **$l_2$ Norm (Euclidean):** $\\|x\\|_2 = \\sqrt{x_1^2 + x_2^2} \\le 1$ (Circle)
- **$l_\\infty$ Norm (Supremum):** $\\|x\\|_\\infty = \\max(|x_1|, |x_2|) \\le 1$ (Square)

### 🔢 Step-by-Step Solution
1. For any $x \\in \\mathbb{R}^2$:
   $$\\|x\\|_\\infty \\le \\|x\\|_2 \\le \\|x\\|_1$$
2. In terms of unit balls, the inclusion reverses:
   $$B_{l_1} \\subset B_{l_2} \\subset B_{l_\\infty}$$

### ✅ Final Answer
$$\\boxed{B_{l_1} \\text{ (Diamond)} \\subset B_{l_2} \\text{ (Circle)} \\subset B_{l_\\infty} \\text{ (Square)}}$$`;
        } else if (parsed.type === 'topology_quotient') {
            title = 'Topology Quotient Space: Torus T²';
            svg = this.generateTopologyQuotientSvg({ type: 'torus', title });
            speechResponse = 'The 2-torus is constructed as the quotient of a square unit cell with opposing edges identified with matching orientations, having fundamental group Z cross Z and Euler characteristic 0.';
            solutionMarkdown = `### 📌 Given & Concept
- **Fundamental Polygon:** $X = [0, 1] \\times [0, 1] \\subset \\mathbb{R}^2$.
- **Equivalence Relation (Edge Identification):**
  $$(x, 0) \\sim (x, 1) \\quad \\text{and} \\quad (0, y) \\sim (1, y)$$

### 📐 Formula
- **Quotient Space:** $T^2 = (S^1 \\times S^1)$
- **Standard Word:** $a b a^{-1} b^{-1}$
- **Euler Characteristic:** $\\chi(T^2) = V - E + F = 1 - 2 + 1 = 0$
- **Fundamental Group:** $\\pi_1(T^2) \\cong \\mathbb{Z} \\times \\mathbb{Z}$

### 🔢 Step-by-Step Solution
1. Identify horizontal edges $a$ in the same direction: produces an open cylinder.
2. Identify vertical edges $b$ in the same direction: glues the two circular ends together to form a donut-shaped 2-torus.
3. All 4 vertices of the square identify to a single point.

### ✅ Final Answer
$$\\boxed{T^2 = S^1 \\times S^1, \\quad \\pi_1(T^2) \\cong \\mathbb{Z} \\times \\mathbb{Z}, \\quad \\chi(T^2) = 0}$$`;
        } else if (parsed.type === 'vector_addition') {
            title = 'Vector Addition: Parallelogram Law';
            svg = this.generateVectorDiagramSvg({ operation: 'addition', title });
            speechResponse = 'According to the parallelogram law of vector addition, if two vectors act simultaneously on a body, their resultant is represented by the diagonal of the parallelogram passing through their common point.';
            solutionMarkdown = `### 📌 Given & Concept
- **Vectors:** $\\vec{a}$ and $\\vec{b}$ acting at an angle $\\theta$ between them.
- **Law of Parallelogram:** If two vectors are represented in magnitude and direction by the adjacent sides of a parallelogram, their resultant $\\vec{R}$ is represented by the diagonal.

### 📐 Formula
- **Magnitude of Resultant:**
  $$R = |\\vec{a} + \\vec{b}| = \\sqrt{a^2 + b^2 + 2ab\\cos\\theta}$$
- **Direction (Angle $\\alpha$ with $\\vec{a}$):**
  $$\\tan\\alpha = \\frac{b\\sin\\theta}{a + b\\cos\\theta}$$

### 🔢 Step-by-Step Solution
1. **Special Cases:**
   - Same direction ($\\theta = 0^\\circ$): $R = a + b$ (Maximum)
   - Perpendicular ($\\theta = 90^\\circ$): $R = \\sqrt{a^2 + b^2}$
   - Opposite direction ($\\theta = 180^\\circ$): $R = |a - b|$ (Minimum)

### ✅ Final Answer
$$\\boxed{R = \\sqrt{a^2 + b^2 + 2ab\\cos\\theta}, \\quad \\tan\\alpha = \\frac{b\\sin\\theta}{a + b\\cos\\theta}}$$`;
        } else if (parsed.type === 'venn_diagram') {
            title = 'Venn Diagram: A ∩ B';
            svg = this.generateVennSvg({ type: 'intersection', title });
            speechResponse = 'The Venn diagram illustrates the intersection of sets A and B as the central overlapping region containing elements that belong simultaneously to both sets.';
            solutionMarkdown = `### 📌 Given & Concept
- **Universal Set:** $U$
- **Subsets:** $A, B \\subseteq U$
- **Intersection:** $A \\cap B = \\{ x \\in U : x \\in A \\text{ and } x \\in B \\}$

### 📐 Formula
- **Inclusion-Exclusion Principle:**
  $$n(A \\cup B) = n(A) + n(B) - n(A \\cap B)$$
- **Disjoint Sets (if $A \\cap B = \\emptyset$):**
  $$n(A \\cup B) = n(A) + n(B)$$

### 🔢 Step-by-Step Solution
1. The region labeled $A \\cap B$ represents the elements common to both sets $A$ and $B$.
2. The remaining regions represent $A \\setminus B$ (only $A$) and $B \\setminus A$ (only $B$).

### ✅ Final Answer
$$\\boxed{n(A \\cup B) = n(A) + n(B) - n(A \\cap B)}$$`;
        }

        return {
            speechResponse,
            solutionMarkdown,
            diagram: {
                type: 'svg',
                title,
                svg
            },
            suggestedFollowUps: [
                '📐 Show derivation steps',
                '🔢 Solve with custom numbers',
                '📄 Clean blank board'
            ]
        };
    }
}

module.exports = new GeometrySolverService();


