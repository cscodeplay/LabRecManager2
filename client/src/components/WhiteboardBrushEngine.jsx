'use client';

/**
 * WhiteboardBrushEngine — Advanced brush renderers for the whiteboard canvas.
 * 
 * Each brush is a render function: (ctx, points, options) => void
 * Points array: [{ x, y, pressure, tiltX, tiltY, timestamp }, ...]
 * 
 * Brush Types:
 *   - normal:      Standard smooth pen (quadratic Bézier, already in Whiteboard.jsx)
 *   - calligraphy: Variable-width based on tilt and velocity (Apple Notes inspired)
 *   - crayon:      Textured grainy strokes with pressure-sensitive opacity
 *   - watercolor:  Soft-edge diffused circles with blending (MS Whiteboard inspired)
 *   - fountain:    Constant-width smooth ink with start/end dot decoration
 */

// ─── Shared Utilities ───────────────────────────────────────────────────────

function distanceBetween(p1, p2) {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function angleBetween(p1, p2) {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

// ─── Calligraphy Brush ──────────────────────────────────────────────────────

export function renderCalligraphy(ctx, points, options = {}) {
    const { color = '#000000', strokeWidth = 4, opacity = 1 } = options;
    if (points.length < 2) return;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const baseWidth = strokeWidth;
    const minWidth = baseWidth * 0.15;
    const maxWidth = baseWidth * 3.5;

    const widths = points.map((pt, i) => {
        const tiltMag = Math.hypot(pt.tiltX || 0, pt.tiltY || 0);
        const tiltFactor = 0.6 + (tiltMag / 90) * 0.8;

        let velocityFactor = 1.0;
        if (i > 0) {
            const dt = Math.max(1, (pt.timestamp || 0) - (points[i - 1].timestamp || 0));
            const dist = distanceBetween(points[i - 1], pt);
            const velocity = dist / dt;
            velocityFactor = Math.max(0.3, Math.min(1.5, 1.2 - velocity * 0.8));
        }

        const pressure = pt.pressure || 0.5;
        const pressureFactor = 0.4 + pressure * 0.8;

        const w = baseWidth * tiltFactor * velocityFactor * pressureFactor;
        return Math.max(minWidth, Math.min(maxWidth, w));
    });

    // Smooth widths with moving average
    const smoothedWidths = widths.map((w, i) => {
        const range = 3;
        let sum = 0, count = 0;
        for (let j = Math.max(0, i - range); j <= Math.min(widths.length - 1, i + range); j++) {
            sum += widths[j];
            count++;
        }
        return sum / count;
    });

    // Build left and right edge paths
    const leftEdge = [];
    const rightEdge = [];

    for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const w = smoothedWidths[i] / 2;

        let angle;
        if (i === 0) {
            angle = angleBetween(points[0], points[Math.min(1, points.length - 1)]);
        } else if (i === points.length - 1) {
            angle = angleBetween(points[Math.max(0, i - 1)], points[i]);
        } else {
            angle = angleBetween(points[i - 1], points[i + 1]);
        }

        const perpAngle = angle + Math.PI / 2;
        leftEdge.push({
            x: pt.x + Math.cos(perpAngle) * w,
            y: pt.y + Math.sin(perpAngle) * w
        });
        rightEdge.push({
            x: pt.x - Math.cos(perpAngle) * w,
            y: pt.y - Math.sin(perpAngle) * w
        });
    }

    // Draw filled polygon strip
    ctx.beginPath();
    ctx.moveTo(leftEdge[0].x, leftEdge[0].y);
    for (let i = 1; i < leftEdge.length; i++) {
        const prev = leftEdge[i - 1];
        const curr = leftEdge[i];
        const mx = (prev.x + curr.x) / 2;
        const my = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
    }
    ctx.lineTo(leftEdge[leftEdge.length - 1].x, leftEdge[leftEdge.length - 1].y);

    for (let i = rightEdge.length - 1; i >= 0; i--) {
        if (i === rightEdge.length - 1) {
            ctx.lineTo(rightEdge[i].x, rightEdge[i].y);
        } else {
            const prev = rightEdge[i + 1];
            const curr = rightEdge[i];
            const mx = (prev.x + curr.x) / 2;
            const my = (prev.y + curr.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
        }
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}


// ─── Crayon / Pencil Brush ──────────────────────────────────────────────────

function getCrayonPattern(ctx, color) {
    const size = 32;
    const offscreen = document.createElement('canvas');
    offscreen.width = size;
    offscreen.height = size;
    const offCtx = offscreen.getContext('2d');

    offCtx.fillStyle = color;
    offCtx.fillRect(0, 0, 1, 1);
    const pixel = offCtx.getImageData(0, 0, 1, 1).data;
    const [r, g, b] = pixel;

    const imageData = offCtx.createImageData(size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
        const noise = Math.random();
        const alpha = noise > 0.35 ? Math.floor(noise * 180) : 0;
        imageData.data[i] = r;
        imageData.data[i + 1] = g;
        imageData.data[i + 2] = b;
        imageData.data[i + 3] = alpha;
    }
    offCtx.putImageData(imageData, 0, 0);

    return ctx.createPattern(offscreen, 'repeat');
}

export function renderCrayon(ctx, points, options = {}) {
    const { color = '#000000', strokeWidth = 6, opacity = 1 } = options;
    if (points.length < 2) return;

    ctx.save();

    const pattern = getCrayonPattern(ctx, color);
    ctx.strokeStyle = pattern;
    ctx.lineWidth = strokeWidth * 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const mx = (prev.x + curr.x) / 2;
        const my = (prev.y + curr.y) / 2;

        const pressure = curr.pressure || 0.5;
        ctx.globalAlpha = Math.max(0.3, Math.min(opacity, pressure * 0.9));
        ctx.lineWidth = strokeWidth * (1.5 + pressure * 1.5);

        ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
    }
    ctx.stroke();

    // Scatter grain dots for texture
    ctx.globalAlpha = opacity * 0.4;
    for (let i = 0; i < points.length; i += 2) {
        const pt = points[i];
        const pressure = pt.pressure || 0.5;
        const scatter = strokeWidth * 1.5;
        for (let j = 0; j < 3; j++) {
            const ox = (Math.random() - 0.5) * scatter;
            const oy = (Math.random() - 0.5) * scatter;
            const dotSize = Math.random() * 1.5 + 0.5;
            ctx.fillStyle = color;
            ctx.globalAlpha = Math.random() * 0.3 * pressure;
            ctx.beginPath();
            ctx.arc(pt.x + ox, pt.y + oy, dotSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}


// ─── Watercolor / Spray Brush ───────────────────────────────────────────────

export function renderWatercolor(ctx, points, options = {}) {
    const { color = '#3b82f6', strokeWidth = 8, opacity = 0.12 } = options;
    if (points.length < 2) return;

    ctx.save();

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1;
    tempCanvas.height = 1;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = color;
    tempCtx.fillRect(0, 0, 1, 1);
    const pixel = tempCtx.getImageData(0, 0, 1, 1).data;
    const [r, g, b] = pixel;

    const radius = strokeWidth * 3;

    for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const pressure = pt.pressure || 0.5;
        const currentRadius = radius * (0.6 + pressure * 0.6);

        const gradient = ctx.createRadialGradient(
            pt.x, pt.y, 0,
            pt.x, pt.y, currentRadius
        );
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity * pressure})`);
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${opacity * pressure * 0.5})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        for (let j = 0; j < 2; j++) {
            const scatter = currentRadius * 0.8;
            const sx = pt.x + (Math.random() - 0.5) * scatter;
            const sy = pt.y + (Math.random() - 0.5) * scatter;
            const sr = currentRadius * (0.2 + Math.random() * 0.3);

            const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
            sg.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity * 0.6})`);
            sg.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}


// ─── Fountain Pen Brush ─────────────────────────────────────────────────────

export function renderFountainPen(ctx, points, options = {}) {
    const { color = '#000000', strokeWidth = 3, opacity = 1 } = options;
    if (points.length < 2) return;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(3, strokeWidth);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const mx = (prev.x + curr.x) / 2;
        const my = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();

    // Start blob
    const startBlobRadius = ctx.lineWidth * 0.9;
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, startBlobRadius, 0, Math.PI * 2);
    ctx.fill();

    // End blob
    const endBlobRadius = ctx.lineWidth * 0.6;
    ctx.beginPath();
    ctx.arc(last.x, last.y, endBlobRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}


// ─── Flood Fill (Fill Bucket) ───────────────────────────────────────────────

// ─── Flood Fill (Fill Bucket with Solid, Pattern, & Gradient Support) ────────

export function createPatternTile(patternId, fgColor = '#ffffff', bgColor = '#1e293b') {
    const tile = document.createElement('canvas');
    const tCtx = tile.getContext('2d');
    if (!tCtx) return tile;

    if (patternId === 'pattern-dots') {
        tile.width = 16;
        tile.height = 16;
        tCtx.fillStyle = bgColor;
        tCtx.fillRect(0, 0, 16, 16);
        tCtx.fillStyle = fgColor;
        tCtx.beginPath();
        tCtx.arc(8, 8, 2.5, 0, Math.PI * 2);
        tCtx.fill();
    } else if (patternId === 'pattern-stripes-diag') {
        tile.width = 16;
        tile.height = 16;
        tCtx.fillStyle = bgColor;
        tCtx.fillRect(0, 0, 16, 16);
        tCtx.strokeStyle = fgColor;
        tCtx.lineWidth = 3;
        tCtx.beginPath();
        tCtx.moveTo(0, 0); tCtx.lineTo(16, 16);
        tCtx.moveTo(-8, 8); tCtx.lineTo(8, 24);
        tCtx.moveTo(8, -8); tCtx.lineTo(24, 8);
        tCtx.stroke();
    } else if (patternId === 'pattern-stripes-horizontal') {
        tile.width = 16;
        tile.height = 16;
        tCtx.fillStyle = bgColor;
        tCtx.fillRect(0, 0, 16, 16);
        tCtx.strokeStyle = fgColor;
        tCtx.lineWidth = 3;
        tCtx.beginPath();
        tCtx.moveTo(0, 8); tCtx.lineTo(16, 8);
        tCtx.stroke();
    } else if (patternId === 'pattern-crosshatch') {
        tile.width = 16;
        tile.height = 16;
        tCtx.fillStyle = bgColor;
        tCtx.fillRect(0, 0, 16, 16);
        tCtx.strokeStyle = fgColor;
        tCtx.lineWidth = 2;
        tCtx.beginPath();
        tCtx.moveTo(0, 0); tCtx.lineTo(16, 16);
        tCtx.moveTo(16, 0); tCtx.lineTo(0, 16);
        tCtx.stroke();
    } else if (patternId === 'pattern-grid') {
        tile.width = 20;
        tile.height = 20;
        tCtx.fillStyle = bgColor;
        tCtx.fillRect(0, 0, 20, 20);
        tCtx.strokeStyle = fgColor;
        tCtx.lineWidth = 1.5;
        tCtx.strokeRect(0, 0, 20, 20);
    } else if (patternId === 'pattern-brick') {
        tile.width = 32;
        tile.height = 16;
        tCtx.fillStyle = bgColor;
        tCtx.fillRect(0, 0, 32, 16);
        tCtx.strokeStyle = fgColor;
        tCtx.lineWidth = 1.5;
        tCtx.beginPath();
        tCtx.moveTo(0, 8); tCtx.lineTo(32, 8);
        tCtx.moveTo(16, 0); tCtx.lineTo(16, 8);
        tCtx.moveTo(0, 8); tCtx.lineTo(0, 16);
        tCtx.moveTo(32, 8); tCtx.lineTo(32, 16);
        tCtx.stroke();
    } else {
        // Fallback / Zigzag
        tile.width = 24;
        tile.height = 12;
        tCtx.fillStyle = bgColor;
        tCtx.fillRect(0, 0, 24, 12);
        tCtx.strokeStyle = fgColor;
        tCtx.lineWidth = 2;
        tCtx.beginPath();
        tCtx.moveTo(0, 6); tCtx.lineTo(6, 0); tCtx.lineTo(12, 6); tCtx.lineTo(18, 0); tCtx.lineTo(24, 6);
        tCtx.stroke();
    }

    return tile;
}

export const GRADIENT_PALETTE = {
    'grad-sunset': { from: '#ff512f', to: '#dd2476', type: 'linear', angle: 45 },
    'grad-ocean': { from: '#00c6ff', to: '#0072ff', type: 'linear', angle: 90 },
    'grad-emerald': { from: '#11998e', to: '#38ef7d', type: 'linear', angle: 45 },
    'grad-neon': { from: '#f857a6', to: '#ff5858', type: 'linear', angle: 135 },
    'grad-cyberpunk': { from: '#7f00ff', to: '#e100ff', type: 'linear', angle: 90 },
    'grad-amber': { from: '#f59e0b', to: '#b45309', type: 'linear', angle: 45 },
    'grad-aurora': { from: '#a8ff78', to: '#78ffd6', type: 'linear', angle: 90 },
    'grad-fire': { from: '#f12711', to: '#f5af19', type: 'linear', angle: 45 },
    'grad-radial-glow': { from: '#60a5fa', to: '#1e3a8a', type: 'radial' },
    'grad-radial-warm': { from: '#fde047', to: '#ea580c', type: 'radial' },
    'grad-radial-iris': { from: '#c084fc', to: '#581c87', type: 'radial' },
    'grad-radial-mint': { from: '#6ee7b7', to: '#047857', type: 'radial' }
};

/**
 * Resolves a fill style (solid color, SVG pattern URL, or SVG gradient URL) into a
 * valid Canvas2D fillStyle (CanvasPattern, CanvasGradient, or color string).
 */
export function resolveCanvasFillStyle(ctx, fillColor, bbox = {}, customOptions = {}) {
    if (!fillColor || fillColor === 'transparent') {
        return 'transparent';
    }

    const {
        patternFgColor = '#ffffff',
        patternBgColor = '#1e293b',
        gradientFrom = '#ff512f',
        gradientTo = '#dd2476',
        gradientAngle = 45,
        gradientType = 'linear'
    } = customOptions;

    const x = bbox.x ?? 0;
    const y = bbox.y ?? 0;
    const width = Math.max(1, bbox.width ?? 100);
    const height = Math.max(1, bbox.height ?? 100);

    // 1. Check for SVG pattern fill: url(#pattern-...)
    const patternMatch = typeof fillColor === 'string' && fillColor.match(/url\(#?(pattern-[^)]+)\)/);
    if (patternMatch) {
        const patId = patternMatch[1];
        try {
            const tile = createPatternTile(patId, patternFgColor, patternBgColor);
            const pat = ctx.createPattern(tile, 'repeat');
            if (pat) return pat;
        } catch (err) {
            console.warn('Failed to resolve pattern fill for canvas:', err);
        }
        return patternBgColor || '#1e293b';
    }

    // 2. Check for SVG gradient fill: url(#grad-...)
    const gradMatch = typeof fillColor === 'string' && fillColor.match(/url\(#?(grad-[^)]+)\)/);
    if (gradMatch) {
        const gradId = gradMatch[1];
        const preset = GRADIENT_PALETTE[gradId];

        let from = preset ? preset.from : gradientFrom;
        let to = preset ? preset.to : gradientTo;
        let type = preset ? preset.type : (gradId.includes('radial') ? 'radial' : gradientType);
        let angle = preset ? (preset.angle ?? 45) : (gradientAngle ?? 45);

        if (gradId === 'grad-custom-linear') {
            type = 'linear';
            from = gradientFrom;
            to = gradientTo;
            angle = gradientAngle ?? 45;
        } else if (gradId === 'grad-custom-radial') {
            type = 'radial';
            from = gradientFrom;
            to = gradientTo;
        }

        try {
            if (type === 'radial') {
                const cx = x + width / 2;
                const cy = y + height / 2;
                const r = Math.max(width, height) / 2;
                const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                radGrad.addColorStop(0, from);
                radGrad.addColorStop(1, to);
                return radGrad;
            } else {
                const cx = x + width / 2;
                const cy = y + height / 2;
                const rad = (angle * Math.PI) / 180;
                const halfW = width / 2;
                const halfH = height / 2;
                const x1 = cx - Math.cos(rad) * halfW;
                const y1 = cy - Math.sin(rad) * halfH;
                const x2 = cx + Math.cos(rad) * halfW;
                const y2 = cy + Math.sin(rad) * halfH;
                const linGrad = ctx.createLinearGradient(x1, y1, x2, y2);
                linGrad.addColorStop(0, from);
                linGrad.addColorStop(1, to);
                return linGrad;
            }
        } catch (err) {
            console.warn('Failed to resolve gradient fill for canvas:', err);
            return from;
        }
    }

    // 3. Fallback: return raw color string (hex, rgb, hsl, etc.)
    return fillColor;
}

export function floodFill(ctx, startX, startY, fillConfig, tolerance = 32) {
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const sx = Math.round(startX);
    const sy = Math.round(startY);
    if (sx < 0 || sx >= width || sy < 0 || sy >= height) return { success: false, reason: 'out-of-bounds' };

    const startIdx = (sy * width + sx) * 4;
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];
    const startA = data[startIdx + 3];

    // Determine fill mode (solid, pattern, gradient)
    const isConfigObj = fillConfig && typeof fillConfig === 'object';
    let fillType = 'solid';
    let solidColor = '#3b82f6';
    let patId = 'pattern-dots';
    let patFg = '#ffffff';
    let patBg = '#1e293b';
    let gradId = 'grad-sunset';
    let gradFrom = '#ff512f';
    let gradTo = '#dd2476';
    let gradAngle = 45;
    let gradType = 'linear';

    if (isConfigObj) {
        fillType = fillConfig.type || 'solid';
        solidColor = fillConfig.color || '#3b82f6';
        patId = fillConfig.patternId || 'pattern-dots';
        patFg = fillConfig.patternFg || fillConfig.patternFgColor || '#ffffff';
        patBg = fillConfig.patternBg || fillConfig.patternBgColor || '#1e293b';
        gradId = fillConfig.gradientId || 'grad-sunset';
        gradFrom = fillConfig.gradientFrom || '#ff512f';
        gradTo = fillConfig.gradientTo || '#dd2476';
        gradAngle = fillConfig.gradientAngle ?? 45;
        gradType = fillConfig.gradientType || 'linear';
    } else if (typeof fillConfig === 'string') {
        if (fillConfig.startsWith('url(#pattern-')) {
            fillType = 'pattern';
            patId = fillConfig.slice(5, -1).replace(/^#/, '');
        } else if (fillConfig.startsWith('url(#grad-')) {
            fillType = 'gradient';
            gradId = fillConfig.slice(5, -1).replace(/^#/, '');
        } else {
            fillType = 'solid';
            solidColor = fillConfig || '#3b82f6';
        }
    }

    // Parse solid color RGBA
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1;
    tempCanvas.height = 1;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = solidColor;
    tempCtx.fillRect(0, 0, 1, 1);
    const fillPixel = tempCtx.getImageData(0, 0, 1, 1).data;
    const [fillR, fillG, fillB, fillA] = fillPixel;

    const isTransparentStart = startA <= 30;

    // 1. Build initial Barrier map
    // Transparent start: any pixel with opacity > 20 is part of a drawn stroke/boundary barrier
    // Colored start: any pixel with color distance > 25 from start color is a boundary barrier
    const isBarrier = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const pIdx = i * 4;
        const a = data[pIdx + 3];
        if (isTransparentStart) {
            if (a > 20) {
                isBarrier[i] = 1;
            }
        } else {
            const dr = Math.abs(data[pIdx] - startR);
            const dg = Math.abs(data[pIdx + 1] - startG);
            const db = Math.abs(data[pIdx + 2] - startB);
            const da = Math.abs(a - startA);
            if (dr > 25 || dg > 25 || db > 25 || da > 25) {
                isBarrier[i] = 1;
            }
        }
    }

    if (isBarrier[sy * width + sx]) {
        // Clicked directly on a stroke barrier line
        return { success: false, reason: 'clicked-barrier' };
    }

    // 2. Bridge diagonal contacts & 1-2px micro gaps in freehand drawings
    // Prevents leakage through anti-aliased diagonal steps and tiny unclosed loops
    const solidBarrier = new Uint8Array(isBarrier);
    for (let y = 1; y < height - 1; y++) {
        const rowOffset = y * width;
        for (let x = 1; x < width - 1; x++) {
            const i = rowOffset + x;
            if (solidBarrier[i]) continue;

            // Diagonal touches: if NW & SE or NE & SW are barriers, close diagonal passage
            if ((isBarrier[i - width - 1] && isBarrier[i + width + 1]) ||
                (isBarrier[i - width + 1] && isBarrier[i + width - 1])) {
                solidBarrier[i] = 1;
                continue;
            }

            // 1-pixel gap in horizontal or vertical lines
            if ((isBarrier[i - 1] && isBarrier[i + 1]) ||
                (isBarrier[i - width] && isBarrier[i + width])) {
                solidBarrier[i] = 1;
                continue;
            }

            // 2-pixel gap horizontal
            if (x > 1 && x < width - 2) {
                if ((isBarrier[i - 2] && isBarrier[i + 1]) || (isBarrier[i - 1] && isBarrier[i + 2])) {
                    solidBarrier[i] = 1;
                    continue;
                }
            }

            // 2-pixel gap vertical
            if (y > 1 && y < height - 2) {
                if ((isBarrier[i - width * 2] && isBarrier[i + width]) || (isBarrier[i - width] && isBarrier[i + width * 2])) {
                    solidBarrier[i] = 1;
                    continue;
                }
            }
        }
    }

    // 3. Scanline Flood Fill on traversable area
    const stack = [[sx, sy]];
    const visited = new Uint8Array(width * height);
    let minX = sx, maxX = sx, minY = sy, maxY = sy;
    let touchedBorder = false;
    let filledCount = 0;

    while (stack.length > 0) {
        const [x, y] = stack.pop();
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        const currentPos = y * width + x;
        if (visited[currentPos] || solidBarrier[currentPos]) continue;

        let lx = x;
        while (lx >= 0 && !solidBarrier[y * width + lx] && !visited[y * width + lx]) lx--;
        lx++;

        let rx = x;
        while (rx < width && !solidBarrier[y * width + rx] && !visited[y * width + rx]) rx++;
        rx--;

        if (lx <= 2 || rx >= width - 3 || y <= 2 || y >= height - 3) {
            touchedBorder = true;
        }

        if (lx < minX) minX = lx;
        if (rx > maxX) maxX = rx;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        for (let px = lx; px <= rx; px++) {
            visited[y * width + px] = 1;
            filledCount++;

            if (y > 0 && !visited[(y - 1) * width + px] && !solidBarrier[(y - 1) * width + px]) {
                stack.push([px, y - 1]);
            }
            if (y < height - 1 && !visited[(y + 1) * width + px] && !solidBarrier[(y + 1) * width + px]) {
                stack.push([px, y + 1]);
            }
        }
    }

    // 4. Boundary leakage protection: if flood reached canvas edges or exceeds 35% of total canvas,
    // the drawing is an open canvas or has large unclosed gaps. Abort to protect canvas.
    const isInsideCanvas = sx > 20 && sy > 20 && sx < width - 20 && sy < height - 20;
    if (touchedBorder && isInsideCanvas && filledCount > (width * height * 0.15)) {
        return { success: false, reason: 'leaked' };
    }

    // 5. Dilate fill mask slightly (1-2px) under anti-aliased stroke edges so no white halo is left
    const fillMask = new Uint8Array(visited);
    for (let y = Math.max(1, minY - 2); y <= Math.min(height - 2, maxY + 2); y++) {
        const rowOffset = y * width;
        for (let x = Math.max(1, minX - 2); x <= Math.min(width - 2, maxX + 2); x++) {
            const i = rowOffset + x;
            if (visited[i]) continue;
            if (data[i * 4 + 3] < 180) {
                if (visited[i - 1] || visited[i + 1] || visited[i - width] || visited[i + width]) {
                    fillMask[i] = 1;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
    }

    const bboxW = Math.max(1, maxX - minX + 1);
    const bboxH = Math.max(1, maxY - minY + 1);

    const offCanvas = document.createElement('canvas');
    offCanvas.width = bboxW;
    offCanvas.height = bboxH;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return { success: false };

    if (fillType === 'solid') {
        offCtx.fillStyle = solidColor;
        offCtx.fillRect(0, 0, bboxW, bboxH);
    } else if (fillType === 'pattern') {
        const patTile = createPatternTile(patId, patFg, patBg);
        const pattern = offCtx.createPattern(patTile, 'repeat');
        if (pattern) {
            offCtx.fillStyle = pattern;
            offCtx.fillRect(0, 0, bboxW, bboxH);
        }
    } else if (fillType === 'gradient') {
        let preset = GRADIENT_PALETTE[gradId];
        let from = preset ? preset.from : gradFrom;
        let to = preset ? preset.to : gradTo;
        let type = preset ? preset.type : (gradId.includes('radial') ? 'radial' : gradType);
        let angle = preset ? (preset.angle ?? 45) : (gradAngle ?? 45);

        if (gradId === 'grad-custom-linear') {
            type = 'linear';
            from = gradFrom;
            to = gradTo;
            angle = gradAngle;
        } else if (gradId === 'grad-custom-radial') {
            type = 'radial';
            from = gradFrom;
            to = gradTo;
        }

        if (type === 'radial') {
            const radGrad = offCtx.createRadialGradient(
                bboxW / 2, bboxH / 2, 0,
                bboxW / 2, bboxH / 2, Math.max(bboxW, bboxH) / 2
            );
            radGrad.addColorStop(0, from);
            radGrad.addColorStop(1, to);
            offCtx.fillStyle = radGrad;
        } else {
            const radAngle = (angle * Math.PI) / 180;
            const x1 = bboxW / 2 - Math.cos(radAngle) * (bboxW / 2);
            const y1 = bboxH / 2 - Math.sin(radAngle) * (bboxH / 2);
            const x2 = bboxW / 2 + Math.cos(radAngle) * (bboxW / 2);
            const y2 = bboxH / 2 + Math.sin(radAngle) * (bboxH / 2);
            const linGrad = offCtx.createLinearGradient(x1, y1, x2, y2);
            linGrad.addColorStop(0, from);
            linGrad.addColorStop(1, to);
            offCtx.fillStyle = linGrad;
        }
        offCtx.fillRect(0, 0, bboxW, bboxH);
    }

    // 6. Generate alpha mask from dilated filled pixels
    const maskImgData = offCtx.createImageData(bboxW, bboxH);
    const maskData = maskImgData.data;

    for (let by = 0; by < bboxH; by++) {
        for (let bx = 0; bx < bboxW; bx++) {
            const globalX = minX + bx;
            const globalY = minY + by;
            const maskIdx = (by * bboxW + bx) * 4;
            if (fillMask[globalY * width + globalX]) {
                maskData[maskIdx] = 255;
                maskData[maskIdx + 1] = 255;
                maskData[maskIdx + 2] = 255;
                maskData[maskIdx + 3] = 255;
            } else {
                maskData[maskIdx + 3] = 0;
            }
        }
    }

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = bboxW;
    maskCanvas.height = bboxH;
    const maskCtx = maskCanvas.getContext('2d');
    if (maskCtx) {
        maskCtx.putImageData(maskImgData, 0, 0);
        offCtx.globalCompositeOperation = 'destination-in';
        offCtx.drawImage(maskCanvas, 0, 0);
        offCtx.globalCompositeOperation = 'source-over';
    }

    // 7. Composite onto main canvas
    // For transparent canvas, destination-over places the fill behind strokes, preserving crisp stroke antialiasing
    ctx.save();
    if (isTransparentStart) {
        ctx.globalCompositeOperation = 'destination-over';
    } else {
        ctx.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(offCanvas, minX, minY);
    ctx.restore();

    return { success: true };
}


// ─── Eyedropper (Color Sampler) ─────────────────────────────────────────────

export function sampleColor(ctx, x, y) {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= ctx.canvas.width || py >= ctx.canvas.height) {
        return '#000000';
    }
    const pixel = ctx.getImageData(px, py, 1, 1).data;
    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v => {
        const h = v.toString(16);
        return h.length === 1 ? '0' + h : h;
    }).join('');
    return hex;
}


// ─── Brush Type Registry ────────────────────────────────────────────────────

export const BRUSH_TYPES = {
    normal: { id: 'normal', label: 'Standard Pen', description: 'Smooth ink with Bézier curves', render: null },
    calligraphy: { id: 'calligraphy', label: 'Calligraphy', description: 'Variable-width nib based on tilt & speed', render: renderCalligraphy },
    crayon: { id: 'crayon', label: 'Crayon / Pencil', description: 'Textured grainy strokes', render: renderCrayon },
    watercolor: { id: 'watercolor', label: 'Watercolor', description: 'Soft diffused paint with blending', render: renderWatercolor },
    fountain: { id: 'fountain', label: 'Fountain Pen', description: 'Clean ink with start/end dots', render: renderFountainPen }
};

export default BRUSH_TYPES;
