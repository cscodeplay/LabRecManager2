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
     * Parses circle equation and line equation from natural problem text
     */
    parseCircleAndLineFromText(str) {
        if (!str || typeof str !== 'string') return null;
        let circle = null, line = null;

        // General form: x^2 + y^2 + Dx + Ey + F = 0
        const genMatch = str.match(/x(?:\^2|²|\^?2)\s*\+\s*y(?:\^2|²|\^?2)\s*([+-]\s*\d*(?:\.\d+)?)\s*x\s*([+-]\s*\d*(?:\.\d+)?)\s*y\s*([+-]\s*\d+(?:\.\d+)?)\s*=\s*0/i);
        if (genMatch) {
            const parseCoeff = (s) => parseFloat(s.replace(/\s+/g, '')) || (s.includes('-') ? -1 : 1);
            const D = parseCoeff(genMatch[1]);
            const E = parseCoeff(genMatch[2]);
            const F = parseFloat(genMatch[3].replace(/\s+/g, ''));
            circle = { D, E, F, raw: genMatch[0].replace(/\s+/g, ' ') };
        } else {
            // Standard form: (x - h)^2 + (y - k)^2 = r^2
            const stdMatch = str.match(/\(x\s*([+-]\s*\d+(?:\.\d+)?)\)(?:\^2|²|\^?2)\s*\+\s*\(y\s*([+-]\s*\d+(?:\.\d+)?)\)(?:\^2|²|\^?2)\s*=\s*(\d+(?:\.\d+)?)/i);
            if (stdMatch) {
                const h = -parseFloat(stdMatch[1].replace(/\s+/g, ''));
                const k = -parseFloat(stdMatch[2].replace(/\s+/g, ''));
                const rSq = parseFloat(stdMatch[3]);
                circle = { cx: h, cy: k, r: Math.sqrt(rSq), raw: stdMatch[0] };
            }
        }

        // Line match: y = mx + c or y = mx - c or y = mx
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
}

module.exports = new GeometrySolverService();

