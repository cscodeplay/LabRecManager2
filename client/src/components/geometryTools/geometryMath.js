/**
 * Geometry Math & Coordinate Transformation Utilities
 * Mathematically exact geometry calculations for classroom instruments:
 * Ruler, Compass, Divider, Protractor, and Set Squares.
 */

// Standard web display metrics: 96 CSS pixels = 1 inch, 2.54 cm = 1 inch
export const PX_PER_INCH = 96;
export const PX_PER_CM = 96 / 2.54; // ~37.79527559 px/cm
export const PX_PER_MM = PX_PER_CM / 10; // ~3.7795 px/mm

/**
 * Convert screen pixels to centimeters
 */
export function pxToCm(px) {
    if (!px || isNaN(px)) return 0;
    return Math.round((px / PX_PER_CM) * 10) / 10;
}

/**
 * Convert screen pixels to millimeters
 */
export function pxToMm(px) {
    if (!px || isNaN(px)) return 0;
    return Math.round(px / PX_PER_MM);
}

/**
 * Convert centimeters to screen pixels
 */
export function cmToPx(cm) {
    if (!cm || isNaN(cm)) return 0;
    return cm * PX_PER_CM;
}

/**
 * Convert screen pixels to inches
 */
export function pxToInches(px) {
    if (!px || isNaN(px)) return 0;
    return Math.round((px / PX_PER_INCH) * 100) / 100;
}

/**
 * Normalize angle to [0, 360) range
 */
export function normalizeAngleDeg(deg) {
    let a = deg % 360;
    if (a < 0) a += 360;
    return a;
}

/**
 * Convert degrees to radians
 */
export function degToRad(deg) {
    return (deg * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
export function radToDeg(rad) {
    return (rad * 180) / Math.PI;
}

/**
 * Calculate Euclidean distance between two points
 */
export function distanceBetween(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.hypot(dx, dy);
}

/**
 * Calculate angle between two points in degrees [0, 360)
 */
export function angleBetweenDeg(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const rad = Math.atan2(dy, dx);
    return normalizeAngleDeg(radToDeg(rad));
}

/**
 * Magnetic snap for rotation angles:
 * Snaps to standard engineering / geometric angles: 0, 15, 30, 45, 60, 75, 90, 120, 135, 180, etc.
 */
export function snapAngleDeg(deg, threshold = 2.5, forceSnap = false) {
    const normalized = normalizeAngleDeg(deg);
    const standardAngles = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345, 360];
    
    if (forceSnap) {
        // Snap to nearest 15 degrees
        return Math.round(normalized / 15) * 15 % 360;
    }

    for (const snap of standardAngles) {
        if (Math.abs(normalized - snap) <= threshold || Math.abs(normalized - (snap - 360)) <= threshold) {
            return snap % 360;
        }
    }
    return Math.round(normalized * 10) / 10;
}

/**
 * Calculate line endpoints given an origin point, length, and angle
 */
export function getLineEndpoints(origin, lengthPx, angleDeg) {
    const rad = degToRad(angleDeg);
    return {
        start: { x: origin.x, y: origin.y },
        end: {
            x: origin.x + lengthPx * Math.cos(rad),
            y: origin.y + lengthPx * Math.sin(rad)
        }
    };
}

/**
 * Generate an SVG arc path string from start angle to end angle
 */
export function describeArc(cx, cy, radius, startAngleDeg, endAngleDeg) {
    const startRad = degToRad(startAngleDeg);
    const endRad = degToRad(endAngleDeg);

    const startX = cx + radius * Math.cos(startRad);
    const startY = cy + radius * Math.sin(startRad);
    const endX = cx + radius * Math.cos(endRad);
    const endY = cy + radius * Math.sin(endRad);

    let diff = endAngleDeg - startAngleDeg;
    if (diff < 0) diff += 360;
    const largeArcFlag = diff <= 180 ? '0' : '1';

    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
}

/**
 * Format measurement readout with unit options
 */
export function formatMeasurement(px, unit = 'cm') {
    if (unit === 'mm') {
        return `${pxToMm(px)} mm`;
    }
    if (unit === 'in') {
        return `${pxToInches(px)}"`;
    }
    return `${pxToCm(px)} cm`;
}

/**
 * Transform viewport screen coordinates (e.g. e.clientX, e.clientY)
 * into mathematically exact Whiteboard Canvas internal coordinates.
 * Works uniformly across any zoom level, pan offset, and screen DPI.
 */
export function screenToCanvasCoords(clientX, clientY) {
    if (typeof document === 'undefined') return { x: clientX, y: clientY };
    const canvas = document.getElementById('main-whiteboard-canvas');
    if (!canvas) return { x: clientX, y: clientY };
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: clientX, y: clientY };
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

/**
 * Calculate the exact apex hinge position for a 2-arm instrument (Compass / Divider)
 * where both arms have fixed length `armLength`.
 * Ensures arm lengths remain strictly constant regardless of opening angle or rotation.
 */
export function calculateHingePoint(p1, p2, armLength = 180, invertSide = false) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const d = Math.hypot(dx, dy);

    // Midpoint between tips
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    if (d <= 0.001) {
        return { x: midX, y: midY - armLength };
    }

    // Altitude of isosceles triangle with legs = armLength and base = d
    const halfBase = Math.min(d / 2, armLength - 0.5);
    const altitude = Math.sqrt(Math.max(0, armLength * armLength - halfBase * halfBase));

    // Perpendicular unit vector to the base vector p1 -> p2
    const ux = dx / d;
    const uy = dy / d;
    const sign = invertSide ? 1 : -1;
    const nx = -uy * sign;
    const ny = ux * sign;

    return {
        x: midX + altitude * nx,
        y: midY + altitude * ny
    };
}

/**
 * Physical Barrier & Outer Edge Snapping for Geometry Instruments:
 * Ensures the pen NEVER draws underneath a ruler, protractor, or set square.
 * When the pointer is inside the instrument body or near its outer perimeter,
 * it is clamped/projected directly to the nearest outer edge of the instrument.
 */
export function clampPointToInstrumentOuterEdge(p, instrument) {
    if (!instrument || !p) return p;

    if (instrument.type === 'ruler') {
        const { x, y, angle, lengthPx, heightPx } = instrument;
        const rad = degToRad(angle);
        const cos = Math.cos(-rad);
        const sin = Math.sin(-rad);

        const dx = p.x - x;
        const dy = p.y - y;
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        // Bounding check with outer snap margin
        const margin = 14;
        const isInsideX = localX >= -margin && localX <= lengthPx + margin;
        const isInsideY = localY >= -margin && localY <= heightPx + margin;

        if (isInsideX && isInsideY) {
            // Constrain localX along ruler length
            const clampedX = Math.max(0, Math.min(lengthPx, localX));
            // User is most often drawing along the top measuring edge (y = 0)
            const clampedY = localY < heightPx / 2 ? 0 : heightPx;

            // Transform back to canvas space
            const forwardCos = Math.cos(rad);
            const forwardSin = Math.sin(rad);
            return {
                x: x + clampedX * forwardCos - clampedY * forwardSin,
                y: y + clampedX * forwardSin + clampedY * forwardCos
            };
        }
        return p;
    }

    if (instrument.type === 'protractor') {
        const { centerX, centerY, radiusPx, baseRotation } = instrument;
        const rad = degToRad(baseRotation);
        const cos = Math.cos(-rad);
        const sin = Math.sin(-rad);

        const dx = p.x - centerX;
        const dy = p.y - centerY;
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        const dist = Math.hypot(localX, localY);
        const margin = 14;

        // Protractor is a semi-circle: localY <= 0 (upper semi-circle) and dist <= radiusPx
        if (localY <= margin && dist <= radiusPx + margin) {
            let clampedLocalX = localX;
            let clampedLocalY = localY;

            // If closer to outer circular arc than base line:
            const distToArc = Math.abs(dist - radiusPx);
            const distToBase = Math.abs(localY);

            if (distToArc < distToBase && dist > 1) {
                // Snap along outer circular arc
                clampedLocalX = (localX / dist) * radiusPx;
                clampedLocalY = Math.min(0, (localY / dist) * radiusPx);
            } else {
                // Snap along straight base diameter
                clampedLocalX = Math.max(-radiusPx, Math.min(radiusPx, localX));
                clampedLocalY = 0;
            }

            const forwardCos = Math.cos(rad);
            const forwardSin = Math.sin(rad);
            return {
                x: centerX + clampedLocalX * forwardCos - clampedLocalY * forwardSin,
                y: centerY + clampedLocalX * forwardSin + clampedLocalY * forwardCos
            };
        }
        return p;
    }

    if (instrument.type === 'setsquare') {
        const { x, y, angle, basePx, heightPx, isFlipped } = instrument;
        const rad = degToRad(angle);
        const cos = Math.cos(-rad);
        const sin = Math.sin(-rad);

        const dx = p.x - x;
        const dy = p.y - y;
        const localX = dx * cos - dy * sin;
        const flipSign = isFlipped ? -1 : 1;
        const localY = (dx * sin + dy * cos) * flipSign;

        // Triangle vertices in local coords: (0, 0), (basePx, 0), (0, heightPx)
        const margin = 14;
        if (localX >= -margin && localY >= -margin && (localX / basePx + localY / heightPx) <= 1 + margin / basePx) {
            const dBase = Math.abs(localY);
            const dVert = Math.abs(localX);
            const hypA = heightPx;
            const hypB = basePx;
            const hypC = -basePx * heightPx;
            const dHyp = Math.abs(hypA * localX + hypB * localY + hypC) / Math.hypot(hypA, hypB);

            let clampedX = localX;
            let clampedY = localY;

            if (dBase <= dVert && dBase <= dHyp) {
                clampedX = Math.max(0, Math.min(basePx, localX));
                clampedY = 0;
            } else if (dVert <= dBase && dVert <= dHyp) {
                clampedX = 0;
                clampedY = Math.max(0, Math.min(heightPx, localY));
            } else {
                const hypLen2 = basePx * basePx + heightPx * heightPx;
                const t = Math.max(0, Math.min(1, ((localX - 0) * (basePx - 0) + (localY - heightPx) * (0 - heightPx)) / hypLen2));
                clampedX = t * basePx;
                clampedY = (1 - t) * heightPx;
            }

            const unFlippedY = clampedY * flipSign;
            const forwardCos = Math.cos(rad);
            const forwardSin = Math.sin(rad);
            return {
                x: x + clampedX * forwardCos - unFlippedY * forwardSin,
                y: y + clampedX * forwardSin + unFlippedY * forwardCos
            };
        }
        return p;
    }

    return p;
}
