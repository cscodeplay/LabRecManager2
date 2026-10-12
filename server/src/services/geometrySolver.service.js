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
}

module.exports = new GeometrySolverService();
