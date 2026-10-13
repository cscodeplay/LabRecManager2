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
