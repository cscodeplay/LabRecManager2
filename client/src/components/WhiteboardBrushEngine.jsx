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

const GRADIENT_PALETTE = {
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

export function floodFill(ctx, startX, startY, fillConfig, tolerance = 32) {
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const sx = Math.round(startX);
    const sy = Math.round(startY);
    if (sx < 0 || sx >= width || sy < 0 || sy >= height) return;

    const startIdx = (sy * width + sx) * 4;
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];
    const startA = data[startIdx + 3];

    // Determine fill mode (solid, pattern, gradient)
    const isConfigObj = fillConfig && typeof fillConfig === 'object';
    const fillType = isConfigObj ? (fillConfig.type || 'solid') : 'solid';
    const solidColor = isConfigObj ? (fillConfig.color || '#3b82f6') : (fillConfig || '#3b82f6');

    // Parse solid color RGBA
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1;
    tempCanvas.height = 1;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = solidColor;
    tempCtx.fillRect(0, 0, 1, 1);
    const fillPixel = tempCtx.getImageData(0, 0, 1, 1).data;
    const [fillR, fillG, fillB, fillA] = fillPixel;

    if (
        fillType === 'solid' &&
        Math.abs(startR - fillR) <= tolerance &&
        Math.abs(startG - fillG) <= tolerance &&
        Math.abs(startB - fillB) <= tolerance &&
        Math.abs(startA - fillA) <= tolerance
    ) return;

    function colorMatch(idx) {
        return (
            Math.abs(data[idx] - startR) <= tolerance &&
            Math.abs(data[idx + 1] - startG) <= tolerance &&
            Math.abs(data[idx + 2] - startB) <= tolerance &&
            Math.abs(data[idx + 3] - startA) <= tolerance
        );
    }

    function setPixel(idx) {
        data[idx] = fillR;
        data[idx + 1] = fillG;
        data[idx + 2] = fillB;
        data[idx + 3] = fillA;
    }

    const stack = [[sx, sy]];
    const visited = new Uint8Array(width * height);
    let minX = sx, maxX = sx, minY = sy, maxY = sy;

    while (stack.length > 0) {
        const [x, y] = stack.pop();
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        if (visited[y * width + x]) continue;
        if (!colorMatch((y * width + x) * 4)) continue;

        let lx = x;
        while (lx >= 0 && colorMatch((y * width + lx) * 4) && !visited[y * width + lx]) lx--;
        lx++;

        let rx = x;
        while (rx < width && colorMatch((y * width + rx) * 4) && !visited[y * width + rx]) rx++;
        rx--;

        if (lx < minX) minX = lx;
        if (rx > maxX) maxX = rx;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        for (let px = lx; px <= rx; px++) {
            if (fillType === 'solid') {
                setPixel((y * width + px) * 4);
            }
            visited[y * width + px] = 1;

            if (y > 0 && !visited[(y - 1) * width + px] && colorMatch(((y - 1) * width + px) * 4)) {
                stack.push([px, y - 1]);
            }
            if (y < height - 1 && !visited[(y + 1) * width + px] && colorMatch(((y + 1) * width + px) * 4)) {
                stack.push([px, y + 1]);
            }
        }
    }

    if (fillType === 'solid') {
        ctx.putImageData(imageData, 0, 0);
        return;
    }

    // Pattern or Gradient fill using bounding-box offscreen buffer and alpha mask
    const bboxW = Math.max(1, maxX - minX + 1);
    const bboxH = Math.max(1, maxY - minY + 1);

    const offCanvas = document.createElement('canvas');
    offCanvas.width = bboxW;
    offCanvas.height = bboxH;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return;

    if (fillType === 'pattern') {
        const patId = fillConfig.patternId || 'pattern-dots';
        const patTile = createPatternTile(patId, fillConfig.patternFg || '#ffffff', fillConfig.patternBg || '#1e293b');
        const pattern = offCtx.createPattern(patTile, 'repeat');
        if (pattern) {
            offCtx.fillStyle = pattern;
            offCtx.fillRect(0, 0, bboxW, bboxH);
        }
    } else if (fillType === 'gradient') {
        const gradId = fillConfig.gradientId || 'grad-sunset';
        const preset = GRADIENT_PALETTE[gradId] || { from: '#ff512f', to: '#dd2476', type: 'linear', angle: 45 };

        if (preset.type === 'radial') {
            const radGrad = offCtx.createRadialGradient(
                bboxW / 2, bboxH / 2, 0,
                bboxW / 2, bboxH / 2, Math.max(bboxW, bboxH) / 2
            );
            radGrad.addColorStop(0, preset.from);
            radGrad.addColorStop(1, preset.to);
            offCtx.fillStyle = radGrad;
        } else {
            const radAngle = ((preset.angle || 45) * Math.PI) / 180;
            const x1 = bboxW / 2 - Math.cos(radAngle) * (bboxW / 2);
            const y1 = bboxH / 2 - Math.sin(radAngle) * (bboxH / 2);
            const x2 = bboxW / 2 + Math.cos(radAngle) * (bboxW / 2);
            const y2 = bboxH / 2 + Math.sin(radAngle) * (bboxH / 2);
            const linGrad = offCtx.createLinearGradient(x1, y1, x2, y2);
            linGrad.addColorStop(0, preset.from);
            linGrad.addColorStop(1, preset.to);
            offCtx.fillStyle = linGrad;
        }
        offCtx.fillRect(0, 0, bboxW, bboxH);
    }

    // Generate alpha mask from visited pixels
    const maskImgData = offCtx.createImageData(bboxW, bboxH);
    const maskData = maskImgData.data;

    for (let by = 0; by < bboxH; by++) {
        for (let bx = 0; bx < bboxW; bx++) {
            const globalX = minX + bx;
            const globalY = minY + by;
            const maskIdx = (by * bboxW + bx) * 4;
            if (visited[globalY * width + globalX]) {
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

    ctx.drawImage(offCanvas, minX, minY);
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
