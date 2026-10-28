'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Upload,
    Download,
    RotateCw,
    RotateCcw,
    Trash2,
    Copy,
    MoveLeft,
    MoveRight,
    Merge,
    Split,
    Layers,
    FileText,
    FileSpreadsheet,
    Presentation,
    Film,
    RefreshCw,
    HardDrive,
    Sparkles,
    Check,
    AlertCircle,
    X,
    Maximize2,
    Minimize2,
    Bold,
    Italic,
    Underline,
    MessageSquare,
    Calendar,
    FileCode,
    Sliders,
    Type,
    Highlighter,
    Stamp,
    FileSearch,
    Archive,
    ShieldCheck,
    CheckCheck,
    FileDown,
    Scissors,
    CheckSquare,
    Plus,
    Undo2,
    Redo2,
    LayoutGrid,
    ScrollText,
    Info,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    ZoomIn,
    ZoomOut,
    PenTool,
    Eraser,
    MousePointer,
    Image as ImageIcon,
    Square,
    Circle,
    Minus,
    ArrowRight,
    Search,
    PanelLeft,
    Printer,
    Award,
    StickyNote,
    Save,
    Cloud,
    Folder,
    FolderPlus,
    ScanText
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import OfficeThemeToggle from '@/components/OfficeThemeToggle';
import OfficeAppBlurLoader from '@/components/OfficeAppBlurLoader';
import OfficeOpenImportMenu from '@/components/OfficeOpenImportMenu';
import MultiSourcePdfPickerModal from '@/components/MultiSourcePdfPickerModal';
import { saveStudioSession, loadStudioSession, clearStudioSession } from '@/lib/pdfStudioStorage';
import { useThemeStore } from '@/lib/store';
import { getPdfJs } from '@/lib/pdfjsLoader';

const WATERMARK_PALETTE = [
    { name: 'Crimson Red', hex: '#dc2626' },
    { name: 'Slate Gray', hex: '#475569' },
    { name: 'Pure Black', hex: '#000000' },
    { name: 'Cobalt Blue', hex: '#2563eb' },
    { name: 'Emerald Green', hex: '#059669' },
    { name: 'Amethyst Purple', hex: '#7c3aed' },
    { name: 'Amber Orange', hex: '#d97706' }
];

const PEN_COLORS = [
    { name: 'Blue', hex: '#2563eb' },
    { name: 'Black', hex: '#000000' },
    { name: 'Red', hex: '#dc2626' },
    { name: 'Green', hex: '#059669' }
];

const HIGHLIGHT_COLORS = [
    { name: 'Yellow', hex: '#facc15' },
    { name: 'Green', hex: '#4ade80' },
    { name: 'Cyan', hex: '#38bdf8' },
    { name: 'Pink', hex: '#f472b6' }
];

const CALLOUT_TYPES = [
    { id: 'speech', label: 'Speech Bubble', desc: 'Rounded balloon with tail' },
    { id: 'thought', label: 'Thought Bubble', desc: 'Cloud shape with dot trail' },
    { id: 'leader_line', label: 'Leader Line Box', desc: 'Engineering box with elbow line & anchor' },
    { id: 'pill', label: 'Pill / Tag Badge', desc: 'Stadium badge with pointer chevron' }
];

// Helper to compute continuous speech bubble SVG path with integrated pointer tail
function getSpeechCalloutSvgPath(x, y, w, h, tx, ty, r = 8) {
    x = parseFloat(x || 0); y = parseFloat(y || 0);
    w = Math.max(20, parseFloat(w || 140)); h = Math.max(20, parseFloat(h || 48));
    tx = isNaN(parseFloat(tx)) ? x - 20 : parseFloat(tx);
    ty = isNaN(parseFloat(ty)) ? y + h + 20 : parseFloat(ty);
    r = Math.min(r, Math.min(w, h) / 4);

    const cx = x + w / 2;
    const cy = y + h / 2;
    const dx = tx - cx;
    const dy = ty - cy;

    let side = 'bottom';
    if (Math.abs(dx) / (w / 2) > Math.abs(dy) / (h / 2)) {
        side = dx < 0 ? 'left' : 'right';
    } else {
        side = dy < 0 ? 'top' : 'bottom';
    }

    const tw = Math.min(24, Math.max(12, (side === 'top' || side === 'bottom' ? w : h) - 2 * r - 4));
    const x1 = x + w;
    const y1 = y + h;

    let path = `M ${x + r} ${y} `;

    // Top edge
    if (side === 'top') {
        const baseCenter = Math.max(x + r + tw / 2, Math.min(x1 - r - tw / 2, tx));
        const tb1 = baseCenter - tw / 2;
        const tb2 = baseCenter + tw / 2;
        path += `L ${tb1} ${y} L ${tx} ${ty} L ${tb2} ${y} `;
    }
    path += `L ${x1 - r} ${y} Q ${x1} ${y} ${x1} ${y + r} `;

    // Right edge
    if (side === 'right') {
        const baseCenter = Math.max(y + r + tw / 2, Math.min(y1 - r - tw / 2, ty));
        const tb1 = baseCenter - tw / 2;
        const tb2 = baseCenter + tw / 2;
        path += `L ${x1} ${tb1} L ${tx} ${ty} L ${x1} ${tb2} `;
    }
    path += `L ${x1} ${y1 - r} Q ${x1} ${y1} ${x1 - r} ${y1} `;

    // Bottom edge
    if (side === 'bottom') {
        const baseCenter = Math.max(x + r + tw / 2, Math.min(x1 - r - tw / 2, tx));
        const tb1 = baseCenter + tw / 2;
        const tb2 = baseCenter - tw / 2;
        path += `L ${tb1} ${y1} L ${tx} ${ty} L ${tb2} ${y1} `;
    }
    path += `L ${x + r} ${y1} Q ${x} ${y1} ${x} ${y1 - r} `;

    // Left edge
    if (side === 'left') {
        const baseCenter = Math.max(y + r + tw / 2, Math.min(y1 - r - tw / 2, ty));
        const tb1 = baseCenter + tw / 2;
        const tb2 = baseCenter - tw / 2;
        path += `L ${x} ${tb1} L ${tx} ${ty} L ${x} ${tb2} `;
    }
    path += `L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;

    return path;
}

function getThoughtCalloutSvgPath(x, y, w, h, tx, ty) {
    x = parseFloat(x || 0); y = parseFloat(y || 0);
    w = Math.max(30, parseFloat(w || 140)); h = Math.max(24, parseFloat(h || 48));
    tx = isNaN(parseFloat(tx)) ? x - 20 : parseFloat(tx);
    ty = isNaN(parseFloat(ty)) ? y + h + 20 : parseFloat(ty);
    const x1 = x + w, y1 = y + h;
    const midX = x + w / 2, midY = y + h / 2;

    let path = `M ${x + w * 0.2} ${y} `;
    path += `A ${w * 0.18} ${h * 0.3} 0 0 1 ${x + w * 0.5} ${y - 2} `;
    path += `A ${w * 0.18} ${h * 0.3} 0 0 1 ${x + w * 0.8} ${y} `;
    path += `A ${w * 0.18} ${h * 0.3} 0 0 1 ${x1} ${y + h * 0.3} `;
    path += `A ${w * 0.18} ${h * 0.3} 0 0 1 ${x1} ${y + h * 0.7} `;
    path += `A ${w * 0.18} ${h * 0.3} 0 0 1 ${x + w * 0.8} ${y1} `;
    path += `A ${w * 0.18} ${h * 0.3} 0 0 1 ${x + w * 0.5} ${y1 + 2} `;
    path += `A ${w * 0.18} ${h * 0.3} 0 0 1 ${x + w * 0.2} ${y1} `;
    path += `A ${w * 0.18} ${h * 0.3} 0 0 1 ${x} ${y + h * 0.7} `;
    path += `A ${w * 0.18} ${h * 0.3} 0 0 1 ${x} ${y + h * 0.3} `;
    path += `A ${w * 0.18} ${h * 0.3} 0 0 1 ${x + w * 0.2} ${y} Z `;

    const dot1X = midX + (tx - midX) * 0.45, dot1Y = midY + (ty - midY) * 0.45;
    const dot2X = midX + (tx - midX) * 0.72, dot2Y = midY + (ty - midY) * 0.72;
    const dot3X = tx, dot3Y = ty;
    const addCircle = (cx, cy, cr) => {
        return `M ${cx - cr} ${cy} A ${cr} ${cr} 0 1 0 ${cx + cr} ${cy} A ${cr} ${cr} 0 1 0 ${cx - cr} ${cy} Z `;
    };
    path += addCircle(dot1X, dot1Y, 5.5);
    path += addCircle(dot2X, dot2Y, 3.8);
    path += addCircle(dot3X, dot3Y, 2.5);
    return path;
}

function getLeaderLineCalloutSvgPath(x, y, w, h, tx, ty) {
    x = parseFloat(x || 0); y = parseFloat(y || 0);
    w = Math.max(20, parseFloat(w || 140)); h = Math.max(20, parseFloat(h || 48));
    tx = isNaN(parseFloat(tx)) ? x - 20 : parseFloat(tx);
    ty = isNaN(parseFloat(ty)) ? y + h + 20 : parseFloat(ty);
    const r = 4;
    const x1 = x + w, y1 = y + h;
    const cx = x + w / 2, cy = y + h / 2;

    let path = `M ${x + r} ${y} L ${x1 - r} ${y} Q ${x1} ${y} ${x1} ${y + r} L ${x1} ${y1 - r} Q ${x1} ${y1} ${x1 - r} ${y1} L ${x + r} ${y1} Q ${x} ${y1} ${x} ${y1 - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z `;
    const startX = tx < cx ? x : x1;
    const startY = cy;
    const elbowX = tx < cx ? Math.min(startX - 15, (startX + tx) / 2) : Math.max(startX + 15, (startX + tx) / 2);
    const elbowY = startY;
    path += `M ${startX} ${startY} L ${elbowX} ${elbowY} L ${tx} ${ty} `;
    const dotR = 3;
    path += `M ${tx - dotR} ${ty} A ${dotR} ${dotR} 0 1 0 ${tx + dotR} ${ty} A ${dotR} ${dotR} 0 1 0 ${tx - dotR} ${ty} Z`;
    return path;
}

function getPillCalloutSvgPath(x, y, w, h, tx, ty) {
    x = parseFloat(x || 0); y = parseFloat(y || 0);
    w = Math.max(30, parseFloat(w || 140)); h = Math.max(20, parseFloat(h || 38));
    tx = isNaN(parseFloat(tx)) ? x - 20 : parseFloat(tx);
    ty = isNaN(parseFloat(ty)) ? y + h + 20 : parseFloat(ty);
    const r = h / 2;
    const x1 = x + w, y1 = y + h;
    const cx = x + w / 2, cy = y + h / 2;
    const dx = tx - cx, dy = ty - cy;
    let side = dx < 0 ? 'left' : 'right';
    if (Math.abs(dy) > Math.abs(dx) * 1.5) {
        side = dy < 0 ? 'top' : 'bottom';
    }
    const tw = 12;
    let path = `M ${x + r} ${y} `;
    if (side === 'top') {
        path += `L ${cx - tw/2} ${y} L ${tx} ${ty} L ${cx + tw/2} ${y} `;
    }
    path += `L ${x1 - r} ${y} A ${r} ${r} 0 0 1 ${x1} ${y1} `;
    if (side === 'bottom') {
        path += `L ${cx + tw/2} ${y1} L ${tx} ${ty} L ${cx - tw/2} ${y1} `;
    }
    path += `L ${x + r} ${y1} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
    return path;
}

function getCalloutSvgPath(x, y, w, h, tx, ty, r = 8, type = 'speech') {
    switch (type) {
        case 'thought':
            return getThoughtCalloutSvgPath(x, y, w, h, tx, ty);
        case 'leader_line':
            return getLeaderLineCalloutSvgPath(x, y, w, h, tx, ty);
        case 'pill':
            return getPillCalloutSvgPath(x, y, w, h, tx, ty);
        case 'speech':
        default:
            return getSpeechCalloutSvgPath(x, y, w, h, tx, ty, r);
    }
}

// Client-side high-fidelity vector PDF page thumbnail & annotation renderer
function PdfPageCanvas({
    pdfDoc,
    pageNumber = 1,
    rotation = 0,
    watermarkText = '',
    watermarkColor = '#dc2626',
    watermarkOpacity = 0.35,
    watermarkImage = null,
    annotations = [],
    scale = null,
    targetWidth = 180,
    suppressInteractive = false,
    onDimensions = null,
    className = ''
}) {
    const canvasRef = useRef(null);
    const baseCanvasRef = useRef(null);
    const renderTaskRef = useRef(null);
    const [renderError, setRenderError] = useState(false);
    const [rendering, setRendering] = useState(true);

    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !baseCanvasRef.current) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(baseCanvasRef.current, 0, 0, canvas.width, canvas.height);

        const baseWidth = baseCanvasRef.current._baseWidth || 612;
        const scaleFactor = canvas.width / baseWidth;

        // Render Live Annotations on Canvas
        if (annotations && annotations.length > 0) {
            annotations.forEach(ann => {
                // Skip interactive overlays in scroll view because DOM elements render them with interactive drag/resize
                if (suppressInteractive && (ann.type === 'stamp' || ann.type === 'signature' || ann.type === 'text' || ann.type === 'textbox' || ann.type === 'image' || ann.type === 'shape' || ann.type === 'callout')) {
                    return;
                }

                context.save();

                // Freehand drawings (Zero shift with normalized fractions)
                if (ann.type === 'draw' && Array.isArray(ann.points) && ann.points.length > 1) {
                    context.strokeStyle = ann.color || '#2563eb';
                    context.lineWidth = Math.max(1, (ann.strokeWidth || 2) * scaleFactor);
                    context.lineCap = 'round';
                    context.lineJoin = 'round';
                    context.globalAlpha = ann.opacity !== undefined ? ann.opacity : 1;
                    context.beginPath();
                    const p0 = ann.points[0];
                    const startX = p0.normX !== undefined ? p0.normX * canvas.width : p0.x * scaleFactor;
                    const startY = p0.normY !== undefined ? p0.normY * canvas.height : p0.y * scaleFactor;
                    context.moveTo(startX, startY);
                    for (let i = 1; i < ann.points.length; i++) {
                        const pt = ann.points[i];
                        const px = pt.normX !== undefined ? pt.normX * canvas.width : pt.x * scaleFactor;
                        const py = pt.normY !== undefined ? pt.normY * canvas.height : pt.y * scaleFactor;
                        context.lineTo(px, py);
                    }
                    context.stroke();
                } else if (ann.type === 'shape') {
                    const ax = ann.normX !== undefined ? ann.normX * canvas.width : (ann.x || 50) * scaleFactor;
                    const ay = ann.normY !== undefined ? ann.normY * canvas.height : (ann.y || 50) * scaleFactor;
                    const aw = ann.normWidth !== undefined ? ann.normWidth * canvas.width : (ann.width || 100) * scaleFactor;
                    const ah = ann.normHeight !== undefined ? ann.normHeight * canvas.height : (ann.height || 60) * scaleFactor;
                    context.strokeStyle = ann.color || '#e11d48';
                    context.lineWidth = Math.max(1, (ann.strokeWidth || 2) * scaleFactor);
                    if (ann.shapeType === 'ellipse') {
                        context.beginPath();
                        context.ellipse(ax + aw / 2, ay + ah / 2, Math.abs(aw / 2), Math.abs(ah / 2), 0, 0, 2 * Math.PI);
                        context.stroke();
                    } else if (ann.shapeType === 'line' || ann.shapeType === 'arrow') {
                        const x1 = ann.normX1 !== undefined ? ann.normX1 * canvas.width : ax;
                        const y1 = ann.normY1 !== undefined ? ann.normY1 * canvas.height : ay;
                        const x2 = ann.normX2 !== undefined ? ann.normX2 * canvas.width : ax + aw;
                        const y2 = ann.normY2 !== undefined ? ann.normY2 * canvas.height : ay + ah;
                        context.beginPath();
                        context.moveTo(x1, y1);
                        context.lineTo(x2, y2);
                        context.stroke();
                        if (ann.shapeType === 'arrow') {
                            const angle = Math.atan2(y2 - y1, x2 - x1);
                            const headLen = Math.max(12, 16 * scaleFactor);
                            context.beginPath();
                            context.moveTo(x2, y2);
                            context.lineTo(
                                x2 - headLen * Math.cos(angle - Math.PI / 6),
                                y2 - headLen * Math.sin(angle - Math.PI / 6)
                            );
                            context.lineTo(
                                x2 - headLen * Math.cos(angle + Math.PI / 6),
                                y2 - headLen * Math.sin(angle + Math.PI / 6)
                            );
                            context.closePath();
                            context.fillStyle = context.strokeStyle;
                            context.fill();
                        }
                    } else {
                        context.strokeRect(ax, ay, aw, ah);
                    }
                } else if (ann.type === 'callout') {
                    const ax = ann.normX !== undefined ? ann.normX * canvas.width : (ann.x || 50) * scaleFactor;
                    const ay = ann.normY !== undefined ? ann.normY * canvas.height : (ann.y || 50) * scaleFactor;
                    const aw = (ann.normWidth !== undefined ? ann.normWidth * canvas.width : (ann.width || 140) * scaleFactor);
                    const ah = (ann.normHeight !== undefined ? ann.normHeight * canvas.height : (ann.height || 48) * scaleFactor);
                    const tx = ann.targetNormX !== undefined ? ann.targetNormX * canvas.width : (ann.targetX || ax - 30);
                    const ty = ann.targetNormY !== undefined ? ann.targetNormY * canvas.height : (ann.targetY || ay + 20);
                    const col = ann.color || '#e11d48';

                    try {
                        const pathD = getCalloutSvgPath(ax, ay, aw, ah, tx, ty, 6);
                        const p2d = new Path2D(pathD);
                        context.fillStyle = 'rgba(255, 255, 255, 0.98)';
                        context.fill(p2d);
                        context.strokeStyle = col;
                        context.lineWidth = Math.max(1, 1.5 * scaleFactor);
                        context.stroke(p2d);
                    } catch (e) {
                        context.fillStyle = '#ffffff';
                        context.fillRect(ax, ay, aw, ah);
                        context.strokeStyle = col;
                        context.strokeRect(ax, ay, aw, ah);
                    }

                    context.fillStyle = '#0f172a';
                    context.font = `bold ${Math.max(9, Math.round(11 * scaleFactor))}px sans-serif`;
                    context.fillText(String(ann.text || '').substring(0, 30), ax + 8 * scaleFactor, ay + ah / 2 + 4 * scaleFactor);
                } else if (ann.type === 'highlight') {
                    const ax = ann.normX !== undefined ? ann.normX * canvas.width : (ann.x || 50) * scaleFactor;
                    const ay = ann.normY !== undefined ? ann.normY * canvas.height : (ann.y || 50) * scaleFactor;
                    const aw = ann.normWidth !== undefined ? ann.normWidth * canvas.width : (ann.width || 120) * scaleFactor;
                    const ah = ann.normHeight !== undefined ? ann.normHeight * canvas.height : (ann.height || 20) * scaleFactor;
                    context.fillStyle = ann.color || 'rgba(250, 204, 21, 0.45)';
                    context.fillRect(ax, ay, aw, ah);
                } else if (ann.type === 'redact') {
                    const ax = ann.normX !== undefined ? ann.normX * canvas.width : (ann.x || 50) * scaleFactor;
                    const ay = ann.normY !== undefined ? ann.normY * canvas.height : (ann.y || 50) * scaleFactor;
                    const aw = ann.normWidth !== undefined ? ann.normWidth * canvas.width : (ann.width || 140) * scaleFactor;
                    const ah = ann.normHeight !== undefined ? ann.normHeight * canvas.height : (ann.height || 24) * scaleFactor;
                    context.fillStyle = '#000000';
                    context.fillRect(ax, ay, aw, ah);
                } else if (ann.type === 'stamp') {
                    const ax = ann.normX !== undefined ? ann.normX * canvas.width : (ann.x || 50) * scaleFactor;
                    const ay = ann.normY !== undefined ? ann.normY * canvas.height : (ann.y || 50) * scaleFactor;
                    if ((ann.stampKind === 'image' && ann.imageUrl) || ann.imageUrl) {
                        const stampImg = new Image();
                        stampImg.src = ann.imageUrl;
                        if (stampImg.complete) {
                            context.drawImage(stampImg, ax, ay, (ann.width || 120) * scaleFactor, (ann.height || 40) * scaleFactor);
                        }
                    } else {
                        const stampText = String(ann.text || 'APPROVED').toUpperCase();
                        const isApproved = stampText.includes('APPROVED');
                        const isRejected = stampText.includes('REJECTED');
                        const strokeColor = isApproved ? '#059669' : isRejected ? '#e11d48' : '#6366f1';
                        const bgColor = isApproved ? 'rgba(16, 185, 129, 0.15)' : isRejected ? 'rgba(244, 63, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)';

                        context.font = `bold ${Math.max(9, Math.round(11 * scaleFactor))}px monospace`;
                        const txtWidth = context.measureText(stampText).width;
                        const pad = 6 * scaleFactor;
                        const sw = txtWidth + pad * 2;
                        const sh = 22 * scaleFactor;

                        context.fillStyle = bgColor;
                        context.fillRect(ax, ay, sw, sh);
                        context.strokeStyle = strokeColor;
                        context.lineWidth = Math.max(1, 2 * scaleFactor);
                        context.strokeRect(ax, ay, sw, sh);

                        context.fillStyle = strokeColor;
                        context.textAlign = 'center';
                        context.textBaseline = 'middle';
                        context.fillText(stampText, ax + sw / 2, ay + sh / 2);
                    }
                } else if (ann.type === 'text') {
                    const ax = (ann.x || 50) * scaleFactor;
                    const ay = (ann.y || 50) * scaleFactor;
                    const fs = Math.max(9, Math.round((ann.fontSize || 13) * scaleFactor));
                    context.font = `${ann.bold ? 'bold ' : ''}${fs}px sans-serif`;
                    context.fillStyle = ann.color || '#0f172a';
                    context.textAlign = 'left';
                    context.textBaseline = 'top';
                    const lines = String(ann.text || 'Note').split('\n');
                    lines.forEach((l, lIdx) => {
                        context.fillText(l, ax, ay + (lIdx * fs * 1.25));
                    });
                } else if (ann.type === 'signature') {
                    const ax = (ann.x || 50) * scaleFactor;
                    const ay = (ann.y || 50) * scaleFactor;
                    const aw = (ann.width || 160) * scaleFactor;
                    const ah = (ann.height || 60) * scaleFactor;
                    if (ann.imageUrl) {
                        const sigImg = new Image();
                        sigImg.src = ann.imageUrl;
                        if (sigImg.complete) {
                            context.drawImage(sigImg, ax, ay, aw, ah);
                        }
                    } else {
                        context.font = `italic bold ${Math.max(10, Math.round(13 * scaleFactor))}px serif`;
                        context.fillStyle = '#1d4ed8';
                        context.textAlign = 'left';
                        context.textBaseline = 'top';
                        context.fillText(`✍️ ${ann.text || 'Signature'}`, ax, ay);
                    }
                }
                context.restore();
            });
        }

        // Render Live Image Watermark (centered, fitted within 50% max page dimensions)
        if (watermarkImage) {
            context.save();
            context.globalAlpha = parseFloat(watermarkOpacity) || 0.35;
            const maxW = canvas.width * 0.50;
            const maxH = canvas.height * 0.50;
            const imgRatio = watermarkImage.width / (watermarkImage.height || 1);
            let fitW = maxW;
            let fitH = fitW / imgRatio;
            if (fitH > maxH) {
                fitH = maxH;
                fitW = fitH * imgRatio;
            }
            const ix = (canvas.width - fitW) / 2;
            const iy = (canvas.height - fitH) / 2;
            context.drawImage(watermarkImage, ix, iy, fitW, fitH);
            context.restore();
        }

        // Render Live Centered Diagonal Text Watermark
        if (watermarkText && watermarkText.trim() && !watermarkImage) {
            context.save();
            context.translate(canvas.width / 2, canvas.height / 2);
            context.rotate(-35 * Math.PI / 180);
            const wmFontSize = Math.max(12, Math.round(canvas.width * 0.10));
            context.font = `bold ${wmFontSize}px Helvetica, Arial, sans-serif`;
            context.fillStyle = watermarkColor || '#dc2626';
            context.globalAlpha = parseFloat(watermarkOpacity) || 0.35;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(watermarkText.trim(), 0, 0);
            context.restore();
        }
    }, [annotations, watermarkText, watermarkColor, watermarkOpacity, watermarkImage, suppressInteractive]);

    // Redraw annotations & watermark on change without restarting PDF.js
    useEffect(() => {
        redrawCanvas();
    }, [redrawCanvas]);

    // PDF.js Page Vector Render (runs only when page geometry or document changes)
    useEffect(() => {
        let isCancelled = false;
        if (!pdfDoc || !canvasRef.current) return;

        // Cancel previous render task if active
        if (renderTaskRef.current) {
            try {
                renderTaskRef.current.cancel();
            } catch {}
            renderTaskRef.current = null;
        }

        setRenderError(false);

        (async () => {
            try {
                setRendering(true);
                const page = await pdfDoc.getPage(pageNumber);
                if (isCancelled) return;

                const effectiveRotation = ((rotation || 0) + (page.rotate || 0)) % 360;
                const baseViewport = page.getViewport({ scale: 1, rotation: effectiveRotation });
                const baseWidth = baseViewport.width || 612;
                const baseHeight = baseViewport.height || 792;
                const computedScale = scale ? scale : (targetWidth / baseWidth);
                const viewport = page.getViewport({ scale: computedScale, rotation: effectiveRotation });

                const canvas = canvasRef.current;
                if (!canvas) return;
                canvas.width = Math.round(viewport.width);
                canvas.height = Math.round(viewport.height);

                // Render offscreen to avoid blank flashes
                const offscreen = document.createElement('canvas');
                offscreen.width = Math.round(viewport.width);
                offscreen.height = Math.round(viewport.height);
                offscreen._baseWidth = baseWidth;
                offscreen._baseHeight = baseHeight;
                const offContext = offscreen.getContext('2d');

                const renderContext = {
                    canvasContext: offContext,
                    viewport: viewport
                };
                const task = page.render(renderContext);
                renderTaskRef.current = task;
                await task.promise;
                if (isCancelled) return;

                baseCanvasRef.current = offscreen;
                redrawCanvas();

                if (onDimensions) {
                    onDimensions({
                        pageNumber,
                        baseWidth,
                        baseHeight,
                        aspectRatio: baseHeight / baseWidth
                    });
                }

                if (!isCancelled) setRendering(false);
            } catch (err) {
                // Ignore rendering cancellation gracefully
                const isCancel = 
                    err?.name === 'RenderingCancelledException' || 
                    err?.name === 'AbortException' || 
                    err?.message?.toLowerCase().includes('cancel') ||
                    err?.message?.toLowerCase().includes('abort');
                if (isCancel || isCancelled) {
                    return;
                }
                console.warn(`[PdfThumbnail] Error rendering page ${pageNumber}:`, err);
                if (!isCancelled) {
                    setRenderError(true);
                    setRendering(false);
                }
            }
        })();

        return () => {
            isCancelled = true;
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel();
                } catch {}
                renderTaskRef.current = null;
            }
        };
    }, [pdfDoc, pageNumber, rotation, scale, targetWidth, onDimensions]);

    if (!pdfDoc) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-2 text-center text-slate-400 select-none bg-slate-50/50">
                <RefreshCw size={18} className="animate-spin mb-1 text-slate-400/80" />
                <span className="text-[11px] font-mono font-bold">Loading Page {pageNumber}...</span>
            </div>
        );
    }

    if (renderError) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-2 text-center text-slate-400 select-none">
                <FileText size={28} className="mb-1 text-slate-400/80" />
                <span className="text-[11px] font-mono font-bold">Page {pageNumber}</span>
                <span className="text-[9px] text-slate-400">PDF Document</span>
            </div>
        );
    }

    return (
        <div className={`w-full h-full relative overflow-hidden bg-white select-none ${className}`}>
            {rendering && !baseCanvasRef.current && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 z-10">
                    <RefreshCw size={14} className="animate-spin text-slate-400" />
                </div>
            )}
            <canvas ref={canvasRef} className="w-full h-full block shadow-sm rounded-sm" />
        </div>
    );
}

// Generate high-resolution 2x raster image with full emoji and Unicode support
function generateStampImageDataUrl(text, color, width = 140, height = 46) {
    if (typeof window === 'undefined') return null;
    try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(80, width * 2);
        canvas.height = Math.max(30, height * 2);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.scale(2, 2);
        const r = 8;
        const w = width;
        const h = height;

        // Opaque rounded background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(w - r, 0);
        ctx.quadraticCurveTo(w, 0, w, r);
        ctx.lineTo(w, h - r);
        ctx.quadraticCurveTo(w, h, w - r, h);
        ctx.lineTo(r, h);
        ctx.quadraticCurveTo(0, h, 0, h - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.fill();

        // Outer solid border
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = color;
        ctx.stroke();

        // Inner dashed border
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1;
        ctx.strokeRect(4, 4, w - 8, h - 8);
        ctx.setLineDash([]);

        // Rich text with emojis
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const fontSize = Math.max(11, Math.round(h * 0.36));
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Segoe UI", Roboto, sans-serif`;
        ctx.fillText(text, w / 2, h / 2);

        return canvas.toDataURL('image/png');
    } catch (e) {
        console.warn('generateStampImageDataUrl error:', e);
        return null;
    }
}

// Interactive Draggable, Resizable & Deletable Stamp Overlay
function InteractiveStamp({ stamp, onUpdate, onDelete, containerWidth, isSelectMode = true }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [localDragPos, setLocalDragPos] = useState(null);
    const [localSize, setLocalSize] = useState(null);

    const scaleFactor = (containerWidth || 560) / 612;
    const baseW = stamp.width || 140;
    const baseH = stamp.height || 46;
    const width = localSize ? localSize.width : baseW;
    const height = localSize ? localSize.height : baseH;
    const scaledWidth = Math.max(40, Math.round(width * scaleFactor));
    const scaledHeight = Math.max(18, Math.round(height * scaleFactor));

    const currentNormX = localDragPos ? localDragPos.normX : (stamp.normX !== undefined ? stamp.normX : (stamp.x || 50) / 612);
    const currentNormY = localDragPos ? localDragPos.normY : (stamp.normY !== undefined ? stamp.normY : (stamp.y || 50) / 792);
    const leftPct = currentNormX * 100;
    const topPct = currentNormY * 100;

    const handleMouseDownDrag = (e) => {
        e.stopPropagation();
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseDownResize = (e) => {
        e.stopPropagation();
        setIsResizing(true);
        setDragStart({ x: e.clientX, y: e.clientY, w: width, h: height });
    };

    useEffect(() => {
        if (!isDragging && !isResizing) return;

        const handleMouseMove = (e) => {
            if (isDragging) {
                const dx = e.clientX - dragStart.x;
                const dy = e.clientY - dragStart.y;
                const effWidth = containerWidth || 560;
                const effHeight = effWidth * 1.33;
                const deltaNormX = dx / effWidth;
                const deltaNormY = dy / effHeight;
                const baseNormX = stamp.normX !== undefined ? stamp.normX : (stamp.x || 50) / 612;
                const baseNormY = stamp.normY !== undefined ? stamp.normY : (stamp.y || 50) / 792;
                const normW = width / 612;
                const normH = height / 792;
                const nextX = Math.max(0, Math.min(Math.max(0, 1 - normW), baseNormX + deltaNormX));
                const nextY = Math.max(0, Math.min(Math.max(0, 1 - normH), baseNormY + deltaNormY));

                setLocalDragPos({
                    normX: nextX,
                    normY: nextY,
                    x: Math.round(nextX * 612),
                    y: Math.round(nextY * 792)
                });
            } else if (isResizing) {
                const dw = e.clientX - dragStart.x;
                const dh = e.clientY - dragStart.y;
                const maxW = Math.max(60, Math.round((1 - currentNormX) * 612));
                const maxH = Math.max(24, Math.round((1 - currentNormY) * 792));
                setLocalSize({
                    width: Math.max(60, Math.min(maxW, (dragStart.w || 140) + dw)),
                    height: Math.max(24, Math.min(maxH, (dragStart.h || 46) + dh))
                });
            }
        };

        const handleMouseUp = () => {
            if (isDragging && localDragPos) {
                onUpdate(localDragPos);
                setLocalDragPos(null);
            }
            if (isResizing && localSize) {
                onUpdate(localSize);
                setLocalSize(null);
            }
            setIsDragging(false);
            setIsResizing(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, dragStart, stamp, localDragPos, localSize, containerWidth, onUpdate]);

    const isImage = Boolean((stamp.stampKind === 'image' && (stamp.imageUrl || stamp.imageDataUrl)) || stamp.imageUrl || stamp.imageDataUrl);
    const text = String(stamp.text || 'APPROVED').toUpperCase();
    const color = stamp.color || (text.includes('REJECT') ? '#dc2626' : text.includes('APPROVED') || text.includes('GRADED') ? '#059669' : '#2563eb');

    return (
        <div
            className={`absolute select-none group/stamp z-20 flex items-center justify-center transition-shadow ${
                isSelectMode ? 'cursor-move pointer-events-auto' : 'cursor-default pointer-events-none'
            } ${
                isImage
                    ? (isSelectMode ? 'border-0 p-0 hover:drop-shadow-md hover:outline hover:outline-1 hover:outline-dashed hover:outline-slate-400/60' : 'border-0 p-0')
                    : (isSelectMode ? 'border-2 rounded-lg p-1 hover:shadow-lg hover:outline hover:outline-1 hover:outline-dashed hover:outline-slate-400/60' : 'border-2 rounded-lg p-1')
            }`}
            style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${scaledWidth}px`,
                height: `${scaledHeight}px`,
                borderColor: isImage ? 'transparent' : color,
                backgroundColor: isImage ? 'transparent' : 'rgba(255,255,255,0.92)'
            }}
            onMouseDown={isSelectMode ? handleMouseDownDrag : undefined}
        >
            {/* Delete button (top-right, only in select mode) */}
            {isSelectMode && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] opacity-0 group-hover/stamp:opacity-100 hover:scale-110 transition shadow-md"
                    title="Delete Stamp"
                >
                    ✕
                </button>
            )}

            {/* Content: Image or Text */}
            {isImage ? (
                <img src={stamp.imageDataUrl || stamp.imageUrl} alt="stamp" className="w-full h-full object-contain pointer-events-none" />
            ) : (
                <span
                    className="font-bold tracking-wider font-mono text-center truncate pointer-events-none px-1"
                    style={{ color, fontSize: `${Math.max(10, Math.round(scaledHeight * 0.36))}px` }}
                >
                    {text}
                </span>
            )}

            {/* Resize handle (bottom-right) */}
            <div
                className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 rounded-sm cursor-se-resize opacity-0 group-hover/stamp:opacity-100 transition shadow-xs"
                onMouseDown={handleMouseDownResize}
                title="Resize Stamp"
            />
        </div>
    );
}

// Interactive Draggable, Resizable & Deletable Signature Overlay
function InteractiveSignature({ sig, signature, onUpdate, onDelete, containerWidth, isSelectMode = true }) {
    const activeSig = sig || signature || {};
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [localDragPos, setLocalDragPos] = useState(null);
    const [localSize, setLocalSize] = useState(null);

    const scaleFactor = (containerWidth || 560) / 612;
    const baseW = activeSig.width || 170;
    const baseH = activeSig.height || 65;
    const width = localSize ? localSize.width : baseW;
    const height = localSize ? localSize.height : baseH;
    const scaledWidth = Math.max(40, Math.round(width * scaleFactor));
    const scaledHeight = Math.max(18, Math.round(height * scaleFactor));

    const currentNormX = localDragPos ? localDragPos.normX : (activeSig.normX !== undefined ? activeSig.normX : (activeSig.x || 50) / 612);
    const currentNormY = localDragPos ? localDragPos.normY : (activeSig.normY !== undefined ? activeSig.normY : (activeSig.y || 50) / 792);
    const leftPct = currentNormX * 100;
    const topPct = currentNormY * 100;

    const handleMouseDownDrag = (e) => {
        e.stopPropagation();
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseDownResize = (e) => {
        e.stopPropagation();
        setIsResizing(true);
        setDragStart({ x: e.clientX, y: e.clientY, w: width, h: height });
    };

    useEffect(() => {
        if (!isDragging && !isResizing) return;

        const handleMouseMove = (e) => {
            if (isDragging) {
                const dx = e.clientX - dragStart.x;
                const dy = e.clientY - dragStart.y;
                const effWidth = containerWidth || 560;
                const effHeight = effWidth * 1.33;
                const deltaNormX = dx / effWidth;
                const deltaNormY = dy / effHeight;
                const baseNormX = activeSig.normX !== undefined ? activeSig.normX : (activeSig.x || 50) / 612;
                const baseNormY = activeSig.normY !== undefined ? activeSig.normY : (activeSig.y || 50) / 792;
                const normW = width / 612;
                const normH = height / 792;
                const nextX = Math.max(0, Math.min(Math.max(0, 1 - normW), baseNormX + deltaNormX));
                const nextY = Math.max(0, Math.min(Math.max(0, 1 - normH), baseNormY + deltaNormY));

                setLocalDragPos({
                    normX: nextX,
                    normY: nextY,
                    x: Math.round(nextX * 612),
                    y: Math.round(nextY * 792)
                });
            } else if (isResizing) {
                const dw = e.clientX - dragStart.x;
                const dh = e.clientY - dragStart.y;
                const maxW = Math.max(60, Math.round((1 - currentNormX) * 612));
                const maxH = Math.max(25, Math.round((1 - currentNormY) * 792));
                setLocalSize({
                    width: Math.max(60, Math.min(maxW, (dragStart.w || 170) + dw)),
                    height: Math.max(25, Math.min(maxH, (dragStart.h || 65) + dh))
                });
            }
        };

        const handleMouseUp = () => {
            if (isDragging && localDragPos) {
                onUpdate(localDragPos);
                setLocalDragPos(null);
            }
            if (isResizing && localSize) {
                onUpdate(localSize);
                setLocalSize(null);
            }
            setIsDragging(false);
            setIsResizing(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, dragStart, activeSig, localDragPos, localSize, containerWidth, onUpdate]);

    return (
        <div
            className={`absolute select-none group/sig z-20 border rounded p-0.5 transition-all ${
                isSelectMode
                    ? 'cursor-move border-transparent hover:border hover:border-dashed hover:border-slate-400/60 pointer-events-auto'
                    : 'border-transparent cursor-default pointer-events-none'
            }`}
            style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${scaledWidth}px`,
                height: `${scaledHeight}px`
            }}
            onMouseDown={isSelectMode ? handleMouseDownDrag : undefined}
        >
            {/* Delete button (top-right, only in select mode) */}
            {isSelectMode && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] opacity-0 group-hover/sig:opacity-100 hover:scale-110 transition shadow-md"
                    title="Delete Signature"
                >
                    ✕
                </button>
            )}

            {/* Signature Image */}
            {activeSig.imageUrl ? (
                <img
                    src={activeSig.imageUrl}
                    alt="Signature"
                    className="w-full h-full object-contain pointer-events-none select-none filter drop-shadow-xs"
                />
            ) : (
                <span className="font-serif italic font-bold text-blue-700 pointer-events-none text-center">
                    ✍️ {activeSig.text || 'Signature'}
                </span>
            )}

            {/* Resize handle (bottom-right) */}
            <div
                className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 rounded-sm cursor-se-resize opacity-0 group-hover/sig:opacity-100 transition shadow-xs"
                onMouseDown={handleMouseDownResize}
                title="Resize Signature"
            />
        </div>
    );
}

// Interactive Draggable, Resizable, Rotatable & Editable Text Box Overlay
function InteractiveTextBox({ textBox, box, onUpdate, onDelete, onSelect, isSelected, containerWidth, isSelectMode = true }) {
    const activeBox = textBox || box || {};
    const boxRef = useRef(null);
    const textareaRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [resizeHandle, setResizeHandle] = useState(null);
    const [isRotating, setIsRotating] = useState(false);
    const [rotateCenter, setRotateCenter] = useState(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isEditing, setIsEditing] = useState(Boolean(activeBox.isEditing));

    useEffect(() => {
        if (activeBox.isEditing) {
            setIsEditing(true);
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    textareaRef.current.select();
                }
            }, 60);
        }
    }, [activeBox.isEditing]);

    const scaleFactor = (containerWidth || 560) / 612;
    const width = activeBox.width || 180;
    const height = activeBox.height || 48;
    const scaledWidth = Math.max(40, Math.round(width * scaleFactor));
    const scaledHeight = Math.max(18, Math.round(height * scaleFactor));
    const currentNormX = activeBox.normX !== undefined ? activeBox.normX : (activeBox.x || 50) / 612;
    const currentNormY = activeBox.normY !== undefined ? activeBox.normY : (activeBox.y || 50) / 792;
    const leftPct = currentNormX * 100;
    const topPct = currentNormY * 100;
    const fontSize = activeBox.fontSize || Math.max(11, Math.round(height * 0.45));
    const scaledFontSize = Math.max(9, Math.round(fontSize * scaleFactor));
    const fontFamily = activeBox.fontFamily || 'sans-serif';
    const rotation = activeBox.rotation || 0;

    const handleMouseDownDrag = (e) => {
        if (isEditing) return;
        e.stopPropagation();
        onSelect?.(activeBox);
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseDownResize = (e, handle = 'se') => {
        e.stopPropagation();
        onSelect?.(activeBox);
        setResizeHandle(handle);
        setDragStart({ x: e.clientX, y: e.clientY, w: width, h: height, normX: currentNormX, normY: currentNormY });
    };

    const handleMouseDownRotate = (e) => {
        e.stopPropagation();
        onSelect?.(activeBox);
        setIsRotating(true);
        if (boxRef.current) {
            const rect = boxRef.current.getBoundingClientRect();
            setRotateCenter({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            });
        }
    };

    useEffect(() => {
        if (!isDragging && !resizeHandle && !isRotating) return;

        const handleMouseMove = (e) => {
            const effWidth = containerWidth || 560;
            const effHeight = effWidth * 1.33;

            if (isDragging) {
                const dx = e.clientX - dragStart.x;
                const dy = e.clientY - dragStart.y;
                const deltaNormX = dx / effWidth;
                const deltaNormY = dy / effHeight;
                const normW = width / 612;
                const normH = height / 792;
                const nextX = Math.max(0, Math.min(Math.max(0, 1 - normW), currentNormX + deltaNormX));
                const nextY = Math.max(0, Math.min(Math.max(0, 1 - normH), currentNormY + deltaNormY));

                onUpdate({
                    normX: nextX,
                    normY: nextY,
                    x: Math.round(nextX * 612),
                    y: Math.round(nextY * 792)
                });
                setDragStart({ x: e.clientX, y: e.clientY });
            } else if (resizeHandle) {
                const dw = (e.clientX - dragStart.x) / scaleFactor;
                const dh = (e.clientY - dragStart.y) / scaleFactor;
                const maxW = Math.max(50, Math.round((1 - dragStart.normX) * 612));
                const maxH = Math.max(20, Math.round((1 - dragStart.normY) * 792));

                let newWidth = dragStart.w;
                let newHeight = dragStart.h;

                if (resizeHandle.includes('e')) newWidth = Math.max(50, Math.min(maxW, dragStart.w + dw));
                if (resizeHandle.includes('s')) newHeight = Math.max(20, Math.min(maxH, dragStart.h + dh));

                const newFontSize = Math.max(9, Math.min(64, Math.round(newHeight * 0.45)));
                onUpdate({
                    width: Math.round(newWidth),
                    height: Math.round(newHeight),
                    fontSize: newFontSize
                });
            } else if (isRotating && rotateCenter) {
                const rad = Math.atan2(e.clientY - rotateCenter.y, e.clientX - rotateCenter.x) + Math.PI / 2;
                const deg = Math.round((rad * 180) / Math.PI);
                const normalizedDeg = (deg % 360 + 360) % 360;
                onUpdate({ rotation: normalizedDeg });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setResizeHandle(null);
            setIsRotating(false);
            setRotateCenter(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, resizeHandle, isRotating, rotateCenter, dragStart, currentNormX, currentNormY, width, height, scaleFactor, containerWidth, onUpdate]);

    return (
        <div
            ref={boxRef}
            className={`absolute z-20 group/tb select-none rounded p-0.5 transition-all ${
                isEditing
                    ? 'border-2 border-rose-500 bg-white/95 shadow-xl pointer-events-auto'
                    : isSelected
                    ? 'border-2 border-dashed border-rose-500 bg-transparent shadow-lg cursor-move pointer-events-auto'
                    : isSelectMode
                    ? 'border border-transparent hover:border-dashed hover:border-slate-400/60 bg-transparent cursor-pointer pointer-events-auto'
                    : 'border border-transparent bg-transparent cursor-default pointer-events-none'
            }`}
            style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${scaledWidth}px`,
                height: `${scaledHeight}px`,
                transform: rotation ? `rotate(${rotation}deg)` : undefined,
                transformOrigin: 'center center'
            }}
            onMouseDown={(e) => {
                if (!isSelectMode && !isEditing) return;
                onSelect?.(activeBox);
                handleMouseDownDrag(e);
            }}
            onClick={(e) => {
                if (!isSelectMode && !isEditing) return;
                e.stopPropagation();
                onSelect?.(activeBox);
            }}
            onDoubleClick={(e) => {
                if (!isSelectMode && !isEditing) return;
                e.stopPropagation();
                setIsEditing(true);
                setTimeout(() => textareaRef.current?.focus(), 50);
            }}
        >
            {/* Delete button (when selected or hovered) */}
            {(isSelected || isEditing) && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] hover:scale-110 transition shadow-md z-30"
                    title="Delete Text Box"
                >
                    ✕
                </button>
            )}

            {/* Rotation Handle (top-center stem + knob) */}
            {isSelected && !isEditing && (
                <div
                    className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto cursor-grab active:cursor-grabbing z-30 group/rot"
                    onMouseDown={handleMouseDownRotate}
                    title="Drag to rotate text box"
                >
                    <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-rose-500 shadow-md hover:scale-125 transition" />
                    <div className="w-0.5 h-3.5 bg-rose-500" />
                </div>
            )}

            {/* Editable Content */}
            {isEditing ? (
                <div className="w-full h-full flex flex-col justify-between bg-white">
                    <textarea
                        ref={textareaRef}
                        value={activeBox.text || ''}
                        onChange={(e) => onUpdate({ text: e.target.value })}
                        onBlur={() => {
                            setIsEditing(false);
                            onUpdate({ isEditing: false });
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
                                setIsEditing(false);
                                onUpdate({ isEditing: false });
                            }
                        }}
                        placeholder="Type text..."
                        className="w-full h-full bg-white border-none outline-none resize-none font-medium text-slate-900"
                        style={{
                            fontSize: `${scaledFontSize}px`,
                            fontFamily,
                            color: activeBox.color || '#0f172a',
                            fontWeight: activeBox.bold ? 'bold' : 'normal',
                            fontStyle: activeBox.italic ? 'italic' : 'normal'
                        }}
                    />
                </div>
            ) : (
                <div
                    className="w-full h-full overflow-hidden flex items-center bg-transparent"
                    style={{
                        fontSize: `${scaledFontSize}px`,
                        fontFamily,
                        color: activeBox.color || '#0f172a',
                        fontWeight: activeBox.bold ? 'bold' : 'normal',
                        fontStyle: activeBox.italic ? 'italic' : 'normal'
                    }}
                >
                    <span className="whitespace-pre-wrap break-words leading-tight">
                        {activeBox.text || 'Double-click to edit text...'}
                    </span>
                </div>
            )}

            {/* Resize Handles (when selected) */}
            {isSelected && !isEditing && (
                <>
                    <div
                        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-rose-500 rounded-xs cursor-se-resize shadow-xs z-30"
                        onMouseDown={(e) => handleMouseDownResize(e, 'se')}
                        title="Resize width & height"
                    />
                    <div
                        className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-3 bg-rose-500 rounded-xs cursor-e-resize shadow-xs z-30"
                        onMouseDown={(e) => handleMouseDownResize(e, 'e')}
                        title="Resize width"
                    />
                    <div
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-2.5 bg-rose-500 rounded-xs cursor-s-resize shadow-xs z-30"
                        onMouseDown={(e) => handleMouseDownResize(e, 's')}
                        title="Resize height"
                    />
                </>
            )}
        </div>
    );
}

// Interactive Draggable, Resizable & Deletable Inserted Image Overlay
function InteractiveImage({ image, onUpdate, onDelete, containerWidth, isSelectMode = true }) {
    const activeImg = image || {};
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [localDragPos, setLocalDragPos] = useState(null);
    const [localSize, setLocalSize] = useState(null);

    const scaleFactor = (containerWidth || 560) / 612;
    const baseW = activeImg.width || 180;
    const baseH = activeImg.height || 120;
    const width = localSize ? localSize.width : baseW;
    const height = localSize ? localSize.height : baseH;
    const scaledWidth = Math.max(40, Math.round(width * scaleFactor));
    const scaledHeight = Math.max(20, Math.round(height * scaleFactor));

    const currentNormX = localDragPos ? localDragPos.normX : (activeImg.normX !== undefined ? activeImg.normX : (activeImg.x || 50) / 612);
    const currentNormY = localDragPos ? localDragPos.normY : (activeImg.normY !== undefined ? activeImg.normY : (activeImg.y || 50) / 792);
    const leftPct = currentNormX * 100;
    const topPct = currentNormY * 100;

    const handleMouseDownDrag = (e) => {
        e.stopPropagation();
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseDownResize = (e) => {
        e.stopPropagation();
        setIsResizing(true);
        setDragStart({ x: e.clientX, y: e.clientY, w: width, h: height });
    };

    useEffect(() => {
        if (!isDragging && !isResizing) return;

        const handleMouseMove = (e) => {
            if (isDragging) {
                const dx = e.clientX - dragStart.x;
                const dy = e.clientY - dragStart.y;
                const effWidth = containerWidth || 560;
                const effHeight = effWidth * 1.33;
                const deltaNormX = dx / effWidth;
                const deltaNormY = dy / effHeight;
                const baseNormX = activeImg.normX !== undefined ? activeImg.normX : (activeImg.x || 50) / 612;
                const baseNormY = activeImg.normY !== undefined ? activeImg.normY : (activeImg.y || 50) / 792;
                const normW = width / 612;
                const normH = height / 792;
                const nextX = Math.max(0, Math.min(Math.max(0, 1 - normW), baseNormX + deltaNormX));
                const nextY = Math.max(0, Math.min(Math.max(0, 1 - normH), baseNormY + deltaNormY));

                setLocalDragPos({
                    normX: nextX,
                    normY: nextY,
                    x: Math.round(nextX * 612),
                    y: Math.round(nextY * 792)
                });
            } else if (isResizing) {
                const dw = e.clientX - dragStart.x;
                const dh = e.clientY - dragStart.y;
                const maxW = Math.max(50, Math.round((1 - currentNormX) * 612));
                const maxH = Math.max(30, Math.round((1 - currentNormY) * 792));
                setLocalSize({
                    width: Math.max(50, Math.min(maxW, (dragStart.w || 180) + dw)),
                    height: Math.max(30, Math.min(maxH, (dragStart.h || 120) + dh))
                });
            }
        };

        const handleMouseUp = () => {
            if (isDragging && localDragPos) {
                onUpdate(localDragPos);
                setLocalDragPos(null);
            }
            if (isResizing && localSize) {
                onUpdate(localSize);
                setLocalSize(null);
            }
            setIsDragging(false);
            setIsResizing(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, dragStart, activeImg, localDragPos, localSize, containerWidth, onUpdate]);

    return (
        <div
            className={`absolute select-none group/img z-20 border-0 p-0 transition-all bg-transparent ${
                isSelectMode
                    ? 'cursor-move hover:outline hover:outline-1 hover:outline-dashed hover:outline-slate-400/60 pointer-events-auto'
                    : 'cursor-default pointer-events-none'
            }`}
            style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${scaledWidth}px`,
                height: `${scaledHeight}px`
            }}
            onMouseDown={isSelectMode ? handleMouseDownDrag : undefined}
        >
            {/* Delete button (top-right, only in select mode) */}
            {isSelectMode && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] opacity-0 group-hover/img:opacity-100 hover:scale-110 transition shadow-md"
                    title="Delete Image"
                >
                    ✕
                </button>
            )}

            {activeImg.imageUrl ? (
                <img
                    src={activeImg.imageUrl}
                    alt="Embedded"
                    className="w-full h-full object-contain pointer-events-none select-none rounded filter drop-shadow-xs"
                />
            ) : null}

            {/* Resize handle (bottom-right) */}
            <div
                className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-slate-600 rounded-sm cursor-se-resize opacity-0 group-hover/img:opacity-100 transition shadow-xs"
                onMouseDown={handleMouseDownResize}
                title="Resize Image"
            />
        </div>
    );
}

// Interactive Draggable, Resizable & Selectable Shape Overlay (Rectangle, Ellipse, Line, Arrow)
function InteractiveShape({ shape, onUpdate, onDelete, isSelected, onSelect, containerWidth, isSelectMode = true }) {
    const rawShape = shape || {};
    const [localPatch, setLocalPatch] = useState(null);
    const activeShape = localPatch ? { ...rawShape, ...localPatch } : rawShape;
    const [isDragging, setIsDragging] = useState(false);
    const [resizeHandle, setResizeHandle] = useState(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const normWidth = activeShape.normWidth !== undefined ? activeShape.normWidth : Math.max(0.02, (activeShape.width || 120) / 612);
    const normHeight = activeShape.normHeight !== undefined ? activeShape.normHeight : Math.max(0.015, (activeShape.height || 80) / 792);
    const width = Math.max(20, Math.round(normWidth * 612));
    const height = Math.max(16, Math.round(normHeight * 792));
    const leftPct = (activeShape.normX !== undefined ? activeShape.normX : (activeShape.x || 50) / 612) * 100;
    const topPct = (activeShape.normY !== undefined ? activeShape.normY : (activeShape.y || 50) / 792) * 100;
    const widthPct = normWidth * 100;
    const heightPct = normHeight * 100;

    const shapeType = activeShape.shapeType || 'rectangle';
    const strokeColor = activeShape.color || '#e11d48';
    const strokeWidth = activeShape.strokeWidth || 2;
    const fill = activeShape.fill || 'none';

    const handleMouseDownMove = (e) => {
        e.stopPropagation();
        onSelect?.(activeShape.id, e.shiftKey);
        setIsDragging(true);
        setDragStart({
            x: e.clientX,
            y: e.clientY,
            normX: activeShape.normX !== undefined ? activeShape.normX : (activeShape.x || 50) / 612,
            normY: activeShape.normY !== undefined ? activeShape.normY : (activeShape.y || 50) / 792,
            normX1: activeShape.normX1 !== undefined ? activeShape.normX1 : 0.1,
            normY1: activeShape.normY1 !== undefined ? activeShape.normY1 : 0.1,
            normX2: activeShape.normX2 !== undefined ? activeShape.normX2 : 0.3,
            normY2: activeShape.normY2 !== undefined ? activeShape.normY2 : 0.3
        });
    };

    const handleMouseDownResize = (e, handle) => {
        e.stopPropagation();
        onSelect?.(activeShape.id);
        setResizeHandle(handle);
        setDragStart({
            x: e.clientX,
            y: e.clientY,
            w: width,
            h: height,
            normW: normWidth,
            normH: normHeight,
            normX: activeShape.normX !== undefined ? activeShape.normX : (activeShape.x || 50) / 612,
            normY: activeShape.normY !== undefined ? activeShape.normY : (activeShape.y || 50) / 792,
            normX1: activeShape.normX1 !== undefined ? activeShape.normX1 : 0.1,
            normY1: activeShape.normY1 !== undefined ? activeShape.normY1 : 0.1,
            normX2: activeShape.normX2 !== undefined ? activeShape.normX2 : 0.3,
            normY2: activeShape.normY2 !== undefined ? activeShape.normY2 : 0.3
        });
    };

    useEffect(() => {
        if (!isDragging && !resizeHandle) return;

        const handleMouseMove = (e) => {
            const effWidth = containerWidth || 560;
            const effHeight = effWidth * 1.33;
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;
            const deltaNormX = dx / effWidth;
            const deltaNormY = dy / effHeight;

            if (isDragging) {
                if (shapeType === 'line' || shapeType === 'arrow') {
                    const nx1 = Math.max(0, Math.min(1.0, (dragStart.normX1 ?? 0.1) + deltaNormX));
                    const ny1 = Math.max(0, Math.min(1.0, (dragStart.normY1 ?? 0.1) + deltaNormY));
                    const nx2 = Math.max(0, Math.min(1.0, (dragStart.normX2 ?? 0.3) + deltaNormX));
                    const ny2 = Math.max(0, Math.min(1.0, (dragStart.normY2 ?? 0.3) + deltaNormY));
                    setLocalPatch({
                        normX1: nx1,
                        normY1: ny1,
                        normX2: nx2,
                        normY2: ny2,
                        x1: Math.round(nx1 * 612),
                        y1: Math.round(ny1 * 792),
                        x2: Math.round(nx2 * 612),
                        y2: Math.round(ny2 * 792)
                    });
                } else {
                    const nextX = Math.max(0, Math.min(Math.max(0, 1 - normWidth), dragStart.normX + deltaNormX));
                    const nextY = Math.max(0, Math.min(Math.max(0, 1 - normHeight), dragStart.normY + deltaNormY));
                    setLocalPatch({
                        normX: nextX,
                        normY: nextY,
                        x: Math.round(nextX * 612),
                        y: Math.round(nextY * 792)
                    });
                }
            } else if (resizeHandle) {
                if (shapeType === 'line' || shapeType === 'arrow') {
                    if (resizeHandle === 'start') {
                        const nx1 = Math.max(0, Math.min(1.0, (dragStart.normX1 ?? 0.1) + deltaNormX));
                        const ny1 = Math.max(0, Math.min(1.0, (dragStart.normY1 ?? 0.1) + deltaNormY));
                        setLocalPatch({
                            normX1: nx1,
                            normY1: ny1,
                            x1: Math.round(nx1 * 612),
                            y1: Math.round(ny1 * 792)
                        });
                    } else if (resizeHandle === 'end') {
                        const nx2 = Math.max(0, Math.min(1.0, (dragStart.normX2 ?? 0.3) + deltaNormX));
                        const ny2 = Math.max(0, Math.min(1.0, (dragStart.normY2 ?? 0.3) + deltaNormY));
                        setLocalPatch({
                            normX2: nx2,
                            normY2: ny2,
                            x2: Math.round(nx2 * 612),
                            y2: Math.round(ny2 * 792)
                        });
                    }
                } else {
                    let nw = dragStart.w;
                    let nh = dragStart.h;
                    let nx = dragStart.normX;
                    let ny = dragStart.normY;

                    const maxW = Math.max(20, Math.round((1 - nx) * 612));
                    const maxH = Math.max(16, Math.round((1 - ny) * 792));

                    if (resizeHandle.includes('e')) nw = Math.max(20, Math.min(maxW, dragStart.w + dx));
                    if (resizeHandle.includes('s')) nh = Math.max(16, Math.min(maxH, dragStart.h + dy));
                    if (resizeHandle.includes('w')) {
                        const clampedDx = Math.min(dx, dragStart.w - 20);
                        nw = Math.max(20, dragStart.w - clampedDx);
                        nx = Math.max(0, Math.min(Math.max(0, 1 - (nw / 612)), dragStart.normX + (clampedDx / effWidth)));
                    }
                    if (resizeHandle.includes('n')) {
                        const clampedDy = Math.min(dy, dragStart.h - 16);
                        nh = Math.max(16, dragStart.h - clampedDy);
                        ny = Math.max(0, Math.min(Math.max(0, 1 - (nh / 792)), dragStart.normY + (clampedDy / effHeight)));
                    }

                    const nWidth = Math.max(0.02, nw / 612);
                    const nHeight = Math.max(0.015, nh / 792);

                    setLocalPatch({
                        width: nw,
                        height: nh,
                        normWidth: nWidth,
                        normHeight: nHeight,
                        normX: nx,
                        normY: ny,
                        x: Math.round(nx * 612),
                        y: Math.round(ny * 792)
                    });
                }
            }
        };

        const handleMouseUp = () => {
            if (localPatch) {
                onUpdate(localPatch);
                setLocalPatch(null);
            }
            setIsDragging(false);
            setResizeHandle(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, resizeHandle, dragStart, localPatch, containerWidth, onUpdate, shapeType]);

    if (shapeType === 'line' || shapeType === 'arrow') {
        const x1Pct = (activeShape.normX1 !== undefined ? activeShape.normX1 : 0.1) * 100;
        const y1Pct = (activeShape.normY1 !== undefined ? activeShape.normY1 : 0.1) * 100;
        const x2Pct = (activeShape.normX2 !== undefined ? activeShape.normX2 : 0.3) * 100;
        const y2Pct = (activeShape.normY2 !== undefined ? activeShape.normY2 : 0.3) * 100;

        return (
            <div className="absolute inset-0 pointer-events-none z-20 group/shape">
                <svg className="w-full h-full overflow-visible pointer-events-auto cursor-move" onMouseDown={handleMouseDownMove}>
                    <defs>
                        <marker id={`arrow-${activeShape.id}`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                            <polygon points="0 0, 8 4, 0 8" fill={strokeColor} />
                        </marker>
                    </defs>
                    {/* Subtle dashed selection guideline behind line/arrow if selected */}
                    {isSelected && (
                        <line
                            x1={`${x1Pct}%`}
                            y1={`${y1Pct}%`}
                            x2={`${x2Pct}%`}
                            y2={`${y2Pct}%`}
                            stroke="#f43f5e"
                            strokeWidth={strokeWidth + 4}
                            strokeDasharray="4 3"
                            opacity={0.6}
                        />
                    )}
                    <line
                        x1={`${x1Pct}%`}
                        y1={`${y1Pct}%`}
                        x2={`${x2Pct}%`}
                        y2={`${y2Pct}%`}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        markerEnd={shapeType === 'arrow' ? `url(#arrow-${activeShape.id})` : undefined}
                    />
                </svg>
                <div
                    onMouseDown={isSelectMode ? (e) => handleMouseDownResize(e, 'start') : undefined}
                    className={`absolute w-3.5 h-3.5 -ml-1.5 -mt-1.5 rounded-full bg-white border-2 border-rose-500 cursor-grab hover:scale-125 transition shadow-sm ${
                        isSelected ? 'opacity-100 scale-100 pointer-events-auto' : isSelectMode ? 'opacity-0 group-hover/shape:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                    style={{ left: `${x1Pct}%`, top: `${y1Pct}%` }}
                    title="Drag Start Point"
                />
                <div
                    onMouseDown={isSelectMode ? (e) => handleMouseDownResize(e, 'end') : undefined}
                    className={`absolute w-3.5 h-3.5 -ml-1.5 -mt-1.5 rounded-full bg-white border-2 border-rose-500 cursor-grab hover:scale-125 transition shadow-sm ${
                        isSelected ? 'opacity-100 scale-100 pointer-events-auto' : isSelectMode ? 'opacity-0 group-hover/shape:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                    style={{ left: `${x2Pct}%`, top: `${y2Pct}%` }}
                    title="Drag End Point"
                />
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                    className={`absolute -ml-3 -mt-3 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition shadow-lg z-30 ${
                        isSelected ? 'opacity-100 scale-100 pointer-events-auto' : isSelectMode ? 'opacity-0 group-hover/shape:opacity-100 scale-90 hover:scale-110 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                    style={{ left: `${(x1Pct + x2Pct) / 2}%`, top: `${(y1Pct + y2Pct) / 2}%` }}
                    title="Delete"
                >
                    <Trash2 size={12} />
                </button>
            </div>
        );
    }

    return (
        <div
            className={`absolute z-20 group/shape select-none transition-shadow ${
                isSelectMode ? 'cursor-move pointer-events-auto' : 'cursor-default pointer-events-none'
            } ${
                isSelected
                    ? 'outline-2 outline-dashed outline-rose-500 outline-offset-2 ring-1 ring-rose-400/50 shadow-md'
                    : isSelectMode
                    ? 'hover:outline hover:outline-1 hover:outline-dashed hover:outline-slate-400/60'
                    : ''
            }`}
            style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`
            }}
            onMouseDown={isSelectMode ? handleMouseDownMove : undefined}
            onClick={(e) => {
                if (!isSelectMode) return;
                e.stopPropagation();
                onSelect?.(activeShape.id, e.shiftKey);
            }}
        >
            <svg className="w-full h-full overflow-visible pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                {shapeType === 'ellipse' ? (
                    <ellipse
                        cx="50"
                        cy="50"
                        rx="48"
                        ry="48"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        vectorEffect="non-scaling-stroke"
                        fill={fill === 'white' ? '#ffffff' : fill === 'tint' ? `${strokeColor}22` : 'none'}
                    />
                ) : (
                    <rect
                        x="2"
                        y="2"
                        width="96"
                        height="96"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        vectorEffect="non-scaling-stroke"
                        fill={fill === 'white' ? '#ffffff' : fill === 'tint' ? `${strokeColor}22` : 'none'}
                        rx="3"
                    />
                )}
            </svg>

            {/* Delete button when shape is selected (or on hover in select mode) */}
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                className={`absolute -top-3 -right-3 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition shadow-lg z-30 ${
                    isSelected ? 'opacity-100 scale-100 pointer-events-auto' : isSelectMode ? 'opacity-0 group-hover/shape:opacity-100 scale-90 hover:scale-110 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                title="Delete Shape"
            >
                <Trash2 size={12} />
            </button>

            {/* 8 Resize Handles (only when selected) */}
            <div onMouseDown={(e) => handleMouseDownResize(e, 'nw')} className={`absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-rose-500 rounded-xs cursor-nwse-resize transition shadow-xs z-30 ${isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />
            <div onMouseDown={(e) => handleMouseDownResize(e, 'n')} className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-rose-500 rounded-xs cursor-ns-resize transition shadow-xs z-30 ${isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />
            <div onMouseDown={(e) => handleMouseDownResize(e, 'ne')} className={`absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-rose-500 rounded-xs cursor-nesw-resize transition shadow-xs z-30 ${isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />
            <div onMouseDown={(e) => handleMouseDownResize(e, 'e')} className={`absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-white border-2 border-rose-500 rounded-xs cursor-ew-resize transition shadow-xs z-30 ${isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />
            <div onMouseDown={(e) => handleMouseDownResize(e, 'se')} className={`absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-rose-500 rounded-xs cursor-nwse-resize transition shadow-xs z-30 ${isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />
            <div onMouseDown={(e) => handleMouseDownResize(e, 's')} className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-rose-500 rounded-xs cursor-ns-resize transition shadow-xs z-30 ${isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />
            <div onMouseDown={(e) => handleMouseDownResize(e, 'sw')} className={`absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-rose-500 rounded-xs cursor-nesw-resize transition shadow-xs z-30 ${isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />
            <div onMouseDown={(e) => handleMouseDownResize(e, 'w')} className={`absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-white border-2 border-rose-500 rounded-xs cursor-ew-resize transition shadow-xs z-30 ${isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />
        </div>
    );
}

// Interactive Callout Annotation (Authentic continuous speech bubble SVG vector path + pointer tip + editable note)
function InteractiveCallout({ callout, onUpdate, onDelete, isSelected, onSelect, containerWidth, isSelectMode = true }) {
    const rawCallout = callout || {};
    const [localPatch, setLocalPatch] = useState(null);
    const activeCallout = localPatch ? { ...rawCallout, ...localPatch } : rawCallout;
    const [isDraggingBox, setIsDraggingBox] = useState(false);
    const [isDraggingTip, setIsDraggingTip] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(activeCallout.text || 'Add note...');

    const effWidth = containerWidth || 580;
    const effHeight = effWidth * 1.33;

    const width = Math.max(90, activeCallout.width || 140);
    const height = Math.max(36, activeCallout.height || 48);
    const normX = activeCallout.normX !== undefined ? activeCallout.normX : (activeCallout.x || 100) / 612;
    const normY = activeCallout.normY !== undefined ? activeCallout.normY : (activeCallout.y || 100) / 792;
    const boxLeftPx = normX * effWidth;
    const boxTopPx = normY * effHeight;

    const tipNormX = activeCallout.targetNormX !== undefined ? activeCallout.targetNormX : Math.max(0, normX - 0.08);
    const tipNormY = activeCallout.targetNormY !== undefined ? activeCallout.targetNormY : Math.max(0, normY + 0.08);
    const tipXPx = tipNormX * effWidth;
    const tipYPx = tipNormY * effHeight;

    const color = activeCallout.color || '#e11d48';
    const calloutType = activeCallout.calloutType || activeCallout.shapeType || 'speech';

    // Generate continuous vector callout path (supports speech, thought, leader_line, pill)
    const bubblePath = getCalloutSvgPath(boxLeftPx, boxTopPx, width, height, tipXPx, tipYPx, 10, calloutType);

    const handleMouseDownBox = (e) => {
        if (isEditing) return;
        e.stopPropagation();
        onSelect?.(activeCallout.id);
        setIsDraggingBox(true);
        setDragStart({
            x: e.clientX,
            y: e.clientY,
            normX,
            normY
        });
    };

    const handleMouseDownTip = (e) => {
        e.stopPropagation();
        onSelect?.(activeCallout.id);
        setIsDraggingTip(true);
        setDragStart({
            x: e.clientX,
            y: e.clientY,
            targetNormX: tipNormX,
            targetNormY: tipNormY
        });
    };

    const handleMouseDownResize = (e) => {
        e.stopPropagation();
        setIsResizing(true);
        setDragStart({
            x: e.clientX,
            y: e.clientY,
            w: width,
            h: height
        });
    };

    useEffect(() => {
        if (!isDraggingBox && !isDraggingTip && !isResizing) return;

        const handleMouseMove = (e) => {
            const deltaX = e.clientX - dragStart.x;
            const deltaY = e.clientY - dragStart.y;
            const deltaNormX = deltaX / effWidth;
            const deltaNormY = deltaY / effHeight;

            if (isDraggingBox) {
                const normW = width / effWidth;
                const normH = height / effHeight;
                const nextX = Math.max(0, Math.min(Math.max(0, 1 - normW), dragStart.normX + deltaNormX));
                const nextY = Math.max(0, Math.min(Math.max(0, 1 - normH), dragStart.normY + deltaNormY));
                setLocalPatch({
                    normX: nextX,
                    normY: nextY,
                    x: Math.round(nextX * 612),
                    y: Math.round(nextY * 792)
                });
            } else if (isDraggingTip) {
                const nextTipX = Math.max(0, Math.min(1.0, dragStart.targetNormX + deltaNormX));
                const nextTipY = Math.max(0, Math.min(1.0, dragStart.targetNormY + deltaNormY));
                setLocalPatch({
                    targetNormX: nextTipX,
                    targetNormY: nextTipY,
                    targetX: Math.round(nextTipX * 612),
                    targetY: Math.round(nextTipY * 792)
                });
            } else if (isResizing) {
                const maxW = (1 - normX) * effWidth;
                const maxH = (1 - normY) * effHeight;
                const nextW = Math.max(90, Math.min(maxW, Math.round(dragStart.w + deltaX)));
                const nextH = Math.max(36, Math.min(maxH, Math.round(dragStart.h + deltaY)));
                setLocalPatch({ width: nextW, height: nextH });
            }
        };

        const handleMouseUp = () => {
            if (localPatch) {
                onUpdate(localPatch);
                setLocalPatch(null);
            }
            setIsDraggingBox(false);
            setIsDraggingTip(false);
            setIsResizing(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingBox, isDraggingTip, isResizing, dragStart, localPatch, effWidth, effHeight, width, height, normX, normY, onUpdate]);

    return (
        <div className="absolute inset-0 pointer-events-none z-20 group/callout">
            <svg className="w-full h-full overflow-visible pointer-events-none">
                {/* Continuous speech bubble vector with pointing tail - selection highlights the bubble stroke itself */}
                <path
                    d={bubblePath}
                    fill="rgba(255, 255, 255, 0.98)"
                    stroke={isSelected ? '#e11d48' : color}
                    strokeWidth={isSelected ? '3.5' : '2.5'}
                    strokeLinejoin="round"
                    className={`transition-all ${isSelected ? 'drop-shadow-xl filter drop-shadow-[0_4px_14px_rgba(225,29,72,0.3)]' : 'drop-shadow-md'}`}
                />
            </svg>

            {/* Target Pointer Handle with Reticle */}
            <div
                onMouseDown={isSelectMode ? handleMouseDownTip : undefined}
                className={`absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-white cursor-crosshair transition shadow-lg z-30 flex items-center justify-center group/tip ${
                    isSelected ? 'pointer-events-auto opacity-100 hover:scale-125' : isSelectMode ? 'pointer-events-auto opacity-0 group-hover/callout:opacity-100 hover:scale-125' : 'pointer-events-none opacity-0'
                }`}
                style={{ left: `${tipXPx}px`, top: `${tipYPx}px`, backgroundColor: color }}
                title="Drag pointer arrow to target location"
            >
                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
            </div>

            {/* Callout Note Box */}
            <div
                className={`absolute select-none p-2.5 flex flex-col justify-between ${
                    isEditing || isSelected
                        ? 'pointer-events-auto cursor-move'
                        : isSelectMode
                        ? 'pointer-events-auto cursor-move'
                        : 'pointer-events-none cursor-default'
                }`}
                style={{
                    left: `${boxLeftPx}px`,
                    top: `${boxTopPx}px`,
                    width: `${width}px`,
                    minHeight: `${height}px`,
                    backgroundColor: 'transparent'
                }}
                onMouseDown={isSelectMode ? handleMouseDownBox : undefined}
                onClick={(e) => {
                    if (!isSelectMode && !isEditing) return;
                    e.stopPropagation();
                    onSelect?.(activeCallout.id);
                }}
                onDoubleClick={(e) => {
                    if (!isSelectMode && !isEditing) return;
                    e.stopPropagation();
                    setIsEditing(true);
                }}
            >
                {/* Floating Callout Style Switcher (visible when selected) */}
                {isSelected && (
                    <div
                        className="absolute -top-7 left-0 flex items-center gap-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-md z-40 pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {CALLOUT_TYPES.map(t => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => onUpdate({ calloutType: t.id })}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 transition ${
                                    calloutType === t.id
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                title={t.label}
                            >
                                <span>{t.label.split(' ')[0]}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Delete button (visible on hover only - speech bubble label removed) */}
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                    className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-[10px] opacity-0 group-hover/callout:opacity-100 hover:scale-110 transition shadow-md z-30 pointer-events-auto"
                    title="Delete Callout"
                >
                    ✕
                </button>

                {/* Callout Note Body */}
                <div className="flex-1">
                    {isEditing ? (
                        <textarea
                            autoFocus
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={() => {
                                setIsEditing(false);
                                onUpdate({ text: editText });
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    setIsEditing(false);
                                    onUpdate({ text: editText });
                                }
                            }}
                            className="w-full h-full bg-transparent resize-none text-xs font-medium focus:outline-none text-slate-800"
                        />
                    ) : (
                        <div className="text-xs font-semibold text-slate-800 break-words pointer-events-none">
                            {activeCallout.text || 'Double-click to edit note'}
                        </div>
                    )}
                </div>

                {/* Resize Handle */}
                <div
                    onMouseDown={isSelectMode ? handleMouseDownResize : undefined}
                    className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full cursor-se-resize transition shadow-xs z-30 ${
                        isSelected ? 'opacity-100 scale-110 pointer-events-auto' : isSelectMode ? 'opacity-0 group-hover/callout:opacity-100 hover:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                    title="Drag to resize note box"
                />
            </div>
        </div>
    );
}

// Digital Signature Creator & Storage Modal
function SignatureStudioModal({ isOpen, onClose, onApply, savedSignatures = [], onSaveSignature, onDeleteSavedSignature, isDark }) {
    const [tab, setTab] = useState('draw'); // 'draw' | 'type' | 'upload' | 'saved'
    const [typedName, setTypedName] = useState('');
    const [typedStyle, setTypedStyle] = useState('dancing');
    const [typedColor, setTypedColor] = useState('#1e3a8a');
    const [penColor, setPenColor] = useState('#1e3a8a');
    const [penWidth, setPenWidth] = useState(3);
    const [uploadedImg, setUploadedImg] = useState(null);
    const [saveForReuse, setSaveForReuse] = useState(true);

    const padCanvasRef = useRef(null);
    const isDrawingPadRef = useRef(false);

    useEffect(() => {
        if (!isOpen) return;
        if (tab === 'draw') {
            setTimeout(clearPad, 50);
        }
    }, [isOpen, tab]);

    const clearPad = () => {
        const c = padCanvasRef.current;
        if (!c) return;
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, c.width, c.height);
    };

    const handlePadMouseDown = (e) => {
        const c = padCanvasRef.current;
        if (!c) return;
        isDrawingPadRef.current = true;
        const rect = c.getBoundingClientRect();
        const touch = (e.touches && e.touches.length > 0) ? e.touches[0] : ((e.changedTouches && e.changedTouches.length > 0) ? e.changedTouches[0] : null);
        const clientX = touch ? touch.clientX : (e.clientX ?? 0);
        const clientY = touch ? touch.clientY : (e.clientY ?? 0);
        const ctx = c.getContext('2d');
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
    };

    const handlePadMouseMove = (e) => {
        if (!isDrawingPadRef.current) return;
        const c = padCanvasRef.current;
        if (!c) return;
        const rect = c.getBoundingClientRect();
        const touch = (e.touches && e.touches.length > 0) ? e.touches[0] : ((e.changedTouches && e.changedTouches.length > 0) ? e.changedTouches[0] : null);
        const clientX = touch ? touch.clientX : (e.clientX ?? 0);
        const clientY = touch ? touch.clientY : (e.clientY ?? 0);
        const ctx = c.getContext('2d');
        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
    };

    const handlePadMouseUp = () => {
        isDrawingPadRef.current = false;
    };

    const getCurrentSignatureDataUrl = () => {
        if (tab === 'draw') {
            const c = padCanvasRef.current;
            if (!c) return null;
            return c.toDataURL('image/png');
        } else if (tab === 'type') {
            if (!typedName.trim()) return null;
            const off = document.createElement('canvas');
            off.width = 460;
            off.height = 160;
            const ctx = off.getContext('2d');
            ctx.clearRect(0, 0, off.width, off.height);
            ctx.fillStyle = typedColor;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            if (typedStyle === 'dancing') {
                ctx.font = 'italic bold 42px "Dancing Script", "Brush Script MT", cursive, serif';
            } else if (typedStyle === 'caveat') {
                ctx.font = 'italic 44px "Caveat", "Segoe Script", cursive, serif';
            } else {
                ctx.font = 'italic bold 38px "Great Vibes", "Brush Script MT", cursive, serif';
            }
            ctx.fillText(typedName.trim(), off.width / 2, off.height / 2);
            return off.toDataURL('image/png');
        } else if (tab === 'upload') {
            return uploadedImg || null;
        }
        return null;
    };

    const handleSaveOnly = () => {
        const sigUrl = getCurrentSignatureDataUrl();
        if (!sigUrl) {
            toast.error(tab === 'type' ? 'Please type your signatory name first' : 'Please draw or upload a signature first');
            return;
        }
        onSaveSignature?.(sigUrl);
        setTab('saved');
    };

    const handleApply = () => {
        let finalDataUrl = getCurrentSignatureDataUrl();
        if (!finalDataUrl) {
            toast.error('Please create or select a signature');
            return;
        }

        if (saveForReuse && onSaveSignature) {
            onSaveSignature(finalDataUrl);
        }

        onApply(finalDataUrl);
        onClose();
    };

    const handleDownloadSignature = (sigUrl, idx) => {
        try {
            const a = document.createElement('a');
            a.href = sigUrl;
            a.download = `digital_signature_${idx + 1}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success('Downloaded signature image!');
        } catch {
            toast.error('Failed to download signature');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 space-y-4 ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
                <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                        <Award size={18} className="text-rose-500" />
                        <h3 className="text-base font-bold">Add Digital Signature</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Mode Tabs */}
                <div className={`flex rounded-xl p-1 border text-xs font-semibold ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
                }`}>
                    {['draw', 'type', 'upload', 'saved'].map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTab(t)}
                            className={`flex-1 py-1.5 rounded-lg capitalize transition ${
                                tab === t
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            {t === 'saved' ? `Saved (${savedSignatures.length})` : t}
                        </button>
                    ))}
                </div>

                {/* Tab: Draw */}
                {tab === 'draw' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 text-[11px]">Ink:</span>
                                {['#1e3a8a', '#000000', '#dc2626', '#059669'].map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setPenColor(c)}
                                        className={`w-5 h-5 rounded-full border-2 transition ${penColor === c ? 'scale-125 border-rose-500 shadow-xs' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={clearPad}
                                className="text-xs text-rose-500 hover:text-rose-400 font-semibold flex items-center gap-1"
                            >
                                <Trash2 size={12} /> Clear
                            </button>
                        </div>
                        <div className="relative border-2 border-dashed rounded-2xl overflow-hidden bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800">
                            <canvas
                                ref={padCanvasRef}
                                width={460}
                                height={150}
                                className="w-full h-36 cursor-crosshair touch-none"
                                onMouseDown={handlePadMouseDown}
                                onMouseMove={handlePadMouseMove}
                                onMouseUp={handlePadMouseUp}
                                onMouseLeave={handlePadMouseUp}
                                onTouchStart={handlePadMouseDown}
                                onTouchMove={handlePadMouseMove}
                                onTouchEnd={handlePadMouseUp}
                            />
                            <div className="absolute bottom-2 left-4 text-[10px] text-slate-400 pointer-events-none select-none">
                                ✍️ Sign above the line
                            </div>
                            <div className="absolute bottom-6 left-4 right-4 border-b border-slate-300 dark:border-slate-800 pointer-events-none" />
                        </div>
                    </div>
                )}

                {/* Tab: Type */}
                {tab === 'type' && (
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={typedName}
                            onChange={(e) => setTypedName(e.target.value)}
                            placeholder="Type your full legal name..."
                            className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-500 ${
                                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                            autoFocus
                        />
                        <div className="flex items-center gap-2">
                            {[
                                { id: 'dancing', label: 'Dancing Script' },
                                { id: 'caveat', label: 'Caveat' },
                                { id: 'vibes', label: 'Great Vibes' }
                            ].map(s => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setTypedStyle(s.id)}
                                    className={`flex-1 py-1 px-2 rounded-lg border text-xs transition ${
                                        typedStyle === s.id
                                            ? 'border-rose-500 bg-rose-500/10 text-rose-500 font-bold'
                                            : isDark ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                        {/* Preview */}
                        <div className="h-28 rounded-2xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 flex items-center justify-center p-4">
                            <span
                                style={{
                                    fontFamily: typedStyle === 'dancing' ? '"Dancing Script", cursive' : typedStyle === 'caveat' ? '"Caveat", cursive' : '"Great Vibes", cursive',
                                    fontSize: '32px',
                                    color: typedColor
                                }}
                            >
                                {typedName || 'Your Signature Preview'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Tab: Upload */}
                {tab === 'upload' && (
                    <div className="space-y-3">
                        <label className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2 transition ${
                            isDark ? 'border-slate-800 hover:border-slate-700 bg-slate-950' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                        }`}>
                            {uploadedImg ? (
                                <img src={uploadedImg} alt="Signature Upload" className="max-h-28 object-contain" />
                            ) : (
                                <>
                                    <Upload size={28} className="text-rose-500" />
                                    <span className="text-xs font-semibold">Choose Signature Image (PNG, JPG, SVG)</span>
                                    <span className="text-[10px] text-slate-400">Transparent PNG recommended</span>
                                </>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const r = new FileReader();
                                        r.onload = (ev) => setUploadedImg(ev.target.result);
                                        r.readAsDataURL(file);
                                    }
                                }}
                            />
                        </label>
                    </div>
                )}

                {/* Tab: Saved */}
                {tab === 'saved' && (
                    <div className="space-y-3">
                        {savedSignatures.length === 0 ? (
                            <div className="text-center py-8 text-xs text-slate-400">
                                No saved signatures yet. Create one with Draw, Type, or Upload and click &quot;Save Signature&quot;.
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
                                {savedSignatures.map((sigUrl, idx) => (
                                    <div
                                        key={idx}
                                        className={`border rounded-xl p-2.5 flex flex-col justify-between items-center gap-2 relative group ${
                                            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                                        }`}
                                    >
                                        <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition z-10">
                                            <button
                                                type="button"
                                                onClick={() => handleDownloadSignature(sigUrl, idx)}
                                                className="w-5 h-5 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center text-[10px] transition shadow-xs"
                                                title="Download Signature as PNG"
                                            >
                                                <Download size={10} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDeleteSavedSignature?.(idx)}
                                                className="w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[10px] transition shadow-xs"
                                                title="Delete Saved Signature"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <div className="h-16 w-full flex items-center justify-center bg-white rounded-lg p-1 border border-slate-200/60">
                                            <img src={sigUrl} alt="Saved Sig" className="max-h-full max-w-full object-contain" />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onApply(sigUrl);
                                                onClose();
                                            }}
                                            className="w-full py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1"
                                        >
                                            <Award size={12} />
                                            <span>Place Signature</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Controls */}
                {tab !== 'saved' && (
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                        <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={saveForReuse}
                                onChange={(e) => setSaveForReuse(e.target.checked)}
                                className="w-3.5 h-3.5 rounded text-rose-600"
                            />
                            <span>Save to My Signatures</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleSaveOnly}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1 ${
                                    isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-200' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                                }`}
                                title="Save signature into persistent library"
                            >
                                <Save size={13} />
                                <span>Save Signature</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleApply}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1"
                            >
                                <span>Place on Document</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function getToolCursor(tool, penColor = '#e11d48', highlighterColor = '#facc15') {
    if (tool === 'pen') {
        const strokeHex = encodeURIComponent(penColor || '#e11d48');
        return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z' fill='${strokeHex}'/%3E%3Cpath d='M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z' stroke='${strokeHex}' stroke-width='1.5' fill='none'/%3E%3C/svg%3E") 2 22, crosshair`;
    }
    if (tool === 'eraser') {
        return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%231e293b' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21' fill='%23fb7185'/%3E%3Cpath d='M22 21H7' stroke-width='2.2' stroke='%230f172a'/%3E%3Cpath d='m5 11 9 9' fill='%23ffffff' fill-opacity='0.9'/%3E%3C/svg%3E") 4 20, cell`;
    }
    if (tool === 'highlighter') {
        const fillHex = encodeURIComponent(highlighterColor || '#facc15');
        return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23334155' stroke-width='1.5'%3E%3Cpath d='m9 11-6 6v3h3l6-6' fill='${fillHex}' stroke-width='1.8'/%3E%3Cpath d='m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4' fill='%2364748b'/%3E%3C/svg%3E") 2 22, crosshair`;
    }
    if (tool === 'text') return 'text';
    if (tool === 'callout') {
        return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23e11d48' stroke-width='1.8'%3E%3Cpath d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' fill='%23ffffff'/%3E%3Ccircle cx='9' cy='10' r='1' fill='%23e11d48'/%3E%3Ccircle cx='12' cy='10' r='1' fill='%23e11d48'/%3E%3Ccircle cx='15' cy='10' r='1' fill='%23e11d48'/%3E%3C/svg%3E") 3 21, crosshair`;
    }
    if (tool === 'stamp') {
        return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23059669' stroke-width='1.8'%3E%3Cpath d='M5 22h14'/%3E%3Cpath d='M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77Z' fill='%23ffffff'/%3E%3Cpath d='M14 13V8.5C14 7.12 12.88 6 11.5 6S9 7.12 9 8.5V13'/%3E%3C/svg%3E") 12 21, copy`;
    }
    if (tool === 'shape') return 'crosshair';
    return 'default';
}

// Multi-Source PDF Upload Dropdown Button Component (Point 3)
function MultiSourceUploadDropdown({ onSelectLocalFiles, onOpenPickerModal, isDark }) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const fileInputRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative inline-block" ref={containerRef}>
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.length > 0) {
                        onSelectLocalFiles(e.target.files);
                    }
                    e.target.value = '';
                    setDropdownOpen(false);
                }}
            />

            <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-2 group cursor-pointer"
            >
                <Upload size={14} className="group-hover:scale-110 transition-transform" />
                <span>Choose / Open PDF</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
                <div className={`absolute left-1/2 -translate-x-1/2 mt-2 w-72 rounded-2xl border p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white shadow-black/60' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/60'
                }`}>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1">
                        Select Document Source
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setDropdownOpen(false);
                            fileInputRef.current?.click();
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                        }`}
                    >
                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                            <Upload size={15} />
                        </div>
                        <div>
                            <div className="font-bold">Upload from Local Device</div>
                            <div className="text-[10px] text-slate-400">Select PDF file(s) from computer</div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setDropdownOpen(false);
                            onOpenPickerModal('pdf-folder');
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                        }`}
                    >
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                            <Folder size={15} />
                        </div>
                        <div>
                            <div className="font-bold">PDF Documents Folder</div>
                            <div className="text-[10px] text-slate-400">CloudVault &rarr; PDF Documents library</div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setDropdownOpen(false);
                            onOpenPickerModal('drive');
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                        }`}
                    >
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                            <Cloud size={15} />
                        </div>
                        <div>
                            <div className="font-bold">Google Drive Folder</div>
                            <div className="text-[10px] text-slate-400">Import PDFs from connected Drive</div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setDropdownOpen(false);
                            onOpenPickerModal('user-docs');
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                        }`}
                    >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                            <HardDrive size={15} />
                        </div>
                        <div>
                            <div className="font-bold">User CloudVault Documents</div>
                            <div className="text-[10px] text-slate-400">Personal saved laboratory records</div>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}

export default function PdfStudioPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const driveFileIdParam = searchParams.get('driveFileId');
    const titleParam = searchParams.get('title');
    const fileUrlParam = searchParams.get('fileUrl');
    const docIdParam = searchParams.get('docId') || searchParams.get('id');

    // Studio active tab: 'edit-merge', 'extract', 'compress', 'ocr'
    const [activeTab, setActiveTab] = useState('edit-merge');

    // Multi-source picker modal state (Point 3)
    const [pickerModalOpen, setPickerModalOpen] = useState(false);
    const [pickerInitialTab, setPickerInitialTab] = useState('pdf-folder');

    const handleOpenPicker = (tab = 'pdf-folder') => {
        setPickerInitialTab(tab);
        setPickerModalOpen(true);
    };

    // Global Theme State
    const { theme } = useThemeStore();
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        const updateTheme = () => {
            if (theme === 'dark' || theme === 'contrast') {
                setIsDark(true);
            } else if (theme === 'light') {
                setIsDark(false);
            } else if (theme === 'system') {
                setIsDark(typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            }
        };
        updateTheme();
        if (typeof window !== 'undefined') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const listener = () => { if (theme === 'system') updateTheme(); };
            mq.addEventListener('change', listener);
            return () => mq.removeEventListener('change', listener);
        }
    }, [theme]);

    // Unified Multi-PDF Source Documents & Pages
    const [sourceDocs, setSourceDocs] = useState([]); // [{ id, file, name, size, pdfDoc, pageCount }]
    const [pages, setPages] = useState([]); // [{ id, docIndex, originalPageNum, pageIndex, rotation: 0 }]
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);

    // View Mode (Grid Overview vs Continuous Scroll)
    const [viewMode, setViewMode] = useState('scroll'); // 'grid' | 'scroll' - default to continuous scroll
    const [scrollZoom, setScrollZoom] = useState(1.0); // 0.7 to 1.5
    const [zoomInputText, setZoomInputText] = useState('100%');
    const [zoomMenuOpen, setZoomMenuOpen] = useState(false);
    const [stampMenuOpen, setStampMenuOpen] = useState(false);
    const [showDocInfo, setShowDocInfo] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showThumbnails, setShowThumbnails] = useState(false);
    const [showComments, setShowComments] = useState(false);

    // Watermark State & Live Preview
    const [watermarkMode, setWatermarkMode] = useState('text'); // 'text' | 'image'
    const [watermarkInput, setWatermarkInput] = useState('');
    const [watermarkColor, setWatermarkColor] = useState('#dc2626');
    const [watermarkOpacity, setWatermarkOpacity] = useState(0.35);
    const [watermarkImageEl, setWatermarkImageEl] = useState(null);
    const [watermarkImageDataUrl, setWatermarkImageDataUrl] = useState('');
    const [appliedWatermarkText, setAppliedWatermarkText] = useState('');
    const [appliedWatermarkColor, setAppliedWatermarkColor] = useState('#dc2626');
    const [appliedWatermarkImage, setAppliedWatermarkImage] = useState(null);
    const [appliedWatermarkImageDataUrl, setAppliedWatermarkImageDataUrl] = useState('');
    const [showWatermarkBar, setShowWatermarkBar] = useState(false);

    // Annotations & Interactive Canvas State
    const [annotations, setAnnotations] = useState([]); // [{ id, pageId, pageIndex, type, text, points, x, y, width, height, color, strokeWidth }]
    const [activeTool, setActiveTool] = useState('select'); // 'select', 'pen', 'highlighter', 'eraser', 'text', 'stamp', 'signature', 'shape', 'note'
    const [penColor, setPenColor] = useState('#e11d48');
    const [penWidth, setPenWidth] = useState(3);
    const [highlighterColor, setHighlighterColor] = useState('#fde047');
    const [highlighterWidth, setHighlighterWidth] = useState(14);
    const [selectedShape, setSelectedShape] = useState('rectangle');
    const [stampType, setStampType] = useState('APPROVED');
    const [annotationText, setAnnotationText] = useState('');
    const [selectedAnnotationPageIndex, setSelectedAnnotationPageIndex] = useState(0);
    const [pageJumpInput, setPageJumpInput] = useState('1');

    // Select Tool Sub-Modes & Eraser State
    const [selectSubMode, setSelectSubMode] = useState('pointer'); // 'pointer' | 'ocr' | 'copy'
    const [selectMenuOpen, setSelectMenuOpen] = useState(false);
    const [eraserSize, setEraserSize] = useState(14); // 8 | 14 | 24
    const [ocrModalData, setOcrModalData] = useState(null); // { text, wordCount, charCount }
    const [showOcrModal, setShowOcrModal] = useState(false);
    const erasedAnyRef = useRef(false);

    useEffect(() => {
        setPageJumpInput(String(selectedAnnotationPageIndex + 1));
    }, [selectedAnnotationPageIndex]);

    const handlePageJump = (val) => {
        const pNum = parseInt(val, 10);
        if (!isNaN(pNum) && pNum >= 1 && pNum <= pages.length) {
            const targetIdx = pNum - 1;
            setSelectedAnnotationPageIndex(targetIdx);
            setPageJumpInput(String(pNum));
            const el = document.getElementById(`pdf-page-${targetIdx}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            setPageJumpInput(String(selectedAnnotationPageIndex + 1));
        }
    };
    const [editorZoom, setEditorZoom] = useState(1.0); // 0.8 to 1.4
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [activeFloatingText, setActiveFloatingText] = useState(null);

    // Text Properties Toolbar State (two-way sync with selectedTextBoxId)
    const [activeFontFamily, setActiveFontFamily] = useState('Helvetica');
    const [activeFontSize, setActiveFontSize] = useState(14);
    const [activeBold, setActiveBold] = useState(false);
    const [activeItalic, setActiveItalic] = useState(false);
    const [activeTextColor, setActiveTextColor] = useState('#0f172a');
    const [selectedTextBoxId, setSelectedTextBoxId] = useState(null);

    // Shape Selection & Properties
    const [selectedShapeId, setSelectedShapeId] = useState(null);
    const [shapeStrokeWidth, setShapeStrokeWidth] = useState(2);
    const [shapeFill, setShapeFill] = useState('none');

    // Callout Selection & Types
    const [selectedCalloutId, setSelectedCalloutId] = useState(null);
    const [activeCalloutType, setActiveCalloutType] = useState('speech'); // 'speech' | 'thought' | 'leader_line' | 'pill'
    const [showCalloutMenu, setShowCalloutMenu] = useState(false);

    // Extract Dropdown State
    const [showExtractDropdown, setShowExtractDropdown] = useState(false);

    // Print Modal State
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printIncludeAnnotations, setPrintIncludeAnnotations] = useState(true);

    // OCR Mode State
    const [ocrMode, setOcrMode] = useState('auto'); // 'auto' | 'text' | 'vision'

    // Multi-selection & Clipboard
    const [selectedAnnotationIds, setSelectedAnnotationIds] = useState([]);
    const clipboardRef = useRef(null);

    const handleDeselectAll = useCallback(() => {
        setSelectedShapeId(null);
        setSelectedTextBoxId(null);
        setSelectedCalloutId(null);
        setSelectedAnnotationIds([]);
    }, []);

    const handleToolChange = useCallback((newTool) => {
        if (activeTool === newTool) {
            setActiveTool('select');
            handleDeselectAll();
            return;
        }
        handleDeselectAll();
        setShowWatermarkBar(false);
        setActiveTool(newTool);
    }, [activeTool, handleDeselectAll]);

    // Stamp Options
    const [stampIncludeDate, setStampIncludeDate] = useState(false);

    // Custom Stamp Modal
    const [showCustomStampDialog, setShowCustomStampDialog] = useState(false);
    const [customStampKind, setCustomStampKind] = useState('text'); // 'text' | 'image'
    const [customStampText, setCustomStampText] = useState('OFFICIAL SEAL');
    const [customStampColor, setCustomStampColor] = useState('#059669');
    const [customStampImage, setCustomStampImage] = useState('');

    // Digital Signature Modal & Saved Signatures
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [savedSignatures, setSavedSignatures] = useState([]);

    // Search state
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchMatches, setSearchMatches] = useState([]);
    const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

    // Dynamic per-page precise geometric dimensions & aspect ratio map
    const [pageDimensions, setPageDimensions] = useState({});
    const handlePageDimensions = useCallback(({ pageNumber, docIndex = 0, baseWidth, baseHeight, aspectRatio }) => {
        setPageDimensions(prev => {
            const key = `${docIndex}_${pageNumber}`;
            if (prev[key] && Math.abs(prev[key].aspectRatio - aspectRatio) < 0.0005) return prev;
            return {
                ...prev,
                [key]: { baseWidth, baseHeight, aspectRatio }
            };
        });
    }, []);

    // Drawing refs on overlay canvas for zero-shift 60fps realtime inking
    const overlayCanvasRefs = useRef({});
    const isDrawingRef = useRef(false);
    const currentStrokeRef = useRef([]);
    const dragStartRef = useRef(null);
    const activeDrawPageRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentStroke, setCurrentStroke] = useState([]);
    const [dragStart, setDragStart] = useState(null);
    const [currentRedact, setCurrentRedact] = useState(null);

    // Extract Pages Tab State
    const [selectedExtractPages, setSelectedExtractPages] = useState([]);
    const [splitRange, setSplitRange] = useState('');
    const [extractViewMode, setExtractViewMode] = useState('grid'); // 'grid' | 'scroll'

    // Compressor State
    const [compressLevel, setCompressLevel] = useState('basic'); // 'basic' | 'medium' | 'strong'
    const [compressTargetDoc, setCompressTargetDoc] = useState('all'); // 'all' | docIndex
    const [compressStats, setCompressStats] = useState(null);
    const [compressing, setCompressing] = useState(false);

    // Esc key to exit full screen
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isFullScreen) {
                setIsFullScreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullScreen]);

    // OCR / Text Extractor State
    const [ocrResult, setOcrResult] = useState(null);
    const [ocrLoading, setOcrLoading] = useState(false);

    // Drag-over styling
    const [isDragOver, setIsDragOver] = useState(false);

    // ─────────────────────────────────────────────────────────────
    // History Stack for Undo / Redo
    // ─────────────────────────────────────────────────────────────
    const [history, setHistory] = useState([]);
    const [historyIdx, setHistoryIdx] = useState(-1);

    const pushHistory = useCallback((newPages, newAnnotations, newWmText, newWmColor, newWmImg, newWmImgDataUrl) => {
        const nextState = {
            pages: JSON.parse(JSON.stringify(newPages)),
            annotations: JSON.parse(JSON.stringify(newAnnotations !== undefined ? newAnnotations : annotations)),
            appliedWatermarkText: newWmText !== undefined ? newWmText : appliedWatermarkText,
            appliedWatermarkColor: newWmColor !== undefined ? newWmColor : appliedWatermarkColor,
            appliedWatermarkImage: newWmImg !== undefined ? newWmImg : appliedWatermarkImage,
            appliedWatermarkImageDataUrl: newWmImgDataUrl !== undefined ? newWmImgDataUrl : appliedWatermarkImageDataUrl
        };
        setHistory(prev => {
            const sliced = prev.slice(0, historyIdx + 1);
            return [...sliced, nextState].slice(-30);
        });
        setHistoryIdx(prev => Math.min(prev + 1, 29));
    }, [annotations, appliedWatermarkColor, appliedWatermarkImage, appliedWatermarkImageDataUrl, appliedWatermarkText, historyIdx]);

    const handleTextPropChange = (patch) => {
        if (patch.fontFamily !== undefined) setActiveFontFamily(patch.fontFamily);
        if (patch.fontSize !== undefined) setActiveFontSize(patch.fontSize);
        if (patch.bold !== undefined) setActiveBold(patch.bold);
        if (patch.italic !== undefined) setActiveItalic(patch.italic);
        if (patch.color !== undefined) setActiveTextColor(patch.color);

        if (selectedTextBoxId) {
            setAnnotations(prev => {
                const next = prev.map(a => a.id === selectedTextBoxId ? {
                    ...a,
                    fontFamily: patch.fontFamily !== undefined ? patch.fontFamily : a.fontFamily,
                    fontSize: patch.fontSize !== undefined ? patch.fontSize : a.fontSize,
                    bold: patch.bold !== undefined ? patch.bold : a.bold,
                    italic: patch.italic !== undefined ? patch.italic : a.italic,
                    color: patch.color !== undefined ? patch.color : a.color
                } : a);
                pushHistory(pages, next);
                return next;
            });
        }
    };

    const handleShapePropChange = (patch) => {
        if (patch.strokeWidth !== undefined) setShapeStrokeWidth(patch.strokeWidth);
        if (patch.color !== undefined) setPenColor(patch.color);
        if (patch.fill !== undefined) setShapeFill(patch.fill);

        if (selectedShapeId) {
            setAnnotations(prev => {
                const next = prev.map(a => a.id === selectedShapeId ? {
                    ...a,
                    strokeWidth: patch.strokeWidth !== undefined ? patch.strokeWidth : a.strokeWidth,
                    color: patch.color !== undefined ? patch.color : a.color,
                    fill: patch.fill !== undefined ? patch.fill : a.fill
                } : a);
                pushHistory(pages, next);
                return next;
            });
        }
    };

    const handleUndo = useCallback(() => {
        if (historyIdx > 0) {
            const targetIdx = historyIdx - 1;
            const state = history[targetIdx];
            setPages(state.pages);
            setAnnotations(state.annotations);
            setAppliedWatermarkText(state.appliedWatermarkText);
            setAppliedWatermarkColor(state.appliedWatermarkColor);
            setAppliedWatermarkImage(state.appliedWatermarkImage);
            setAppliedWatermarkImageDataUrl(state.appliedWatermarkImageDataUrl);
            setHistoryIdx(targetIdx);
            toast.success('Undone action', { id: 'undo-toast', duration: 1200 });
        }
    }, [history, historyIdx]);

    const handleRedo = useCallback(() => {
        if (historyIdx < history.length - 1) {
            const targetIdx = historyIdx + 1;
            const state = history[targetIdx];
            setPages(state.pages);
            setAnnotations(state.annotations);
            setAppliedWatermarkText(state.appliedWatermarkText);
            setAppliedWatermarkColor(state.appliedWatermarkColor);
            setAppliedWatermarkImage(state.appliedWatermarkImage);
            setAppliedWatermarkImageDataUrl(state.appliedWatermarkImageDataUrl);
            setHistoryIdx(targetIdx);
            toast.success('Redone action', { id: 'redo-toast', duration: 1200 });
        }
    }, [history, historyIdx]);

    // Keyboard Shortcuts (Undo/Redo, Delete/Backspace, Copy, Cut, Paste, Multi-Select)
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isInputFocused = e.target && (
                e.target.tagName === 'INPUT' ||
                e.target.tagName === 'TEXTAREA' ||
                e.target.isContentEditable
            );

            // Undo (Ctrl/Cmd+Z)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                if (!isInputFocused) {
                    e.preventDefault();
                    handleUndo();
                }
                return;
            }

            // Redo (Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z)
            if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
                if (!isInputFocused) {
                    e.preventDefault();
                    handleRedo();
                }
                return;
            }

            // Delete or Backspace key to remove selected items
            if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputFocused) {
                const idsToDelete = new Set([...selectedAnnotationIds]);
                if (selectedShapeId) idsToDelete.add(selectedShapeId);
                if (selectedTextBoxId) idsToDelete.add(selectedTextBoxId);
                if (selectedCalloutId) idsToDelete.add(selectedCalloutId);

                if (idsToDelete.size > 0) {
                    e.preventDefault();
                    const next = annotations.filter(a => !idsToDelete.has(a.id));
                    setAnnotations(next);
                    pushHistory(pages, next);
                    handleDeselectAll();
                    toast.success(`Deleted ${idsToDelete.size} item(s)`);
                }
                return;
            }

            // Copy (Ctrl/Cmd+C)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !isInputFocused) {
                const idsToCopy = new Set([...selectedAnnotationIds]);
                if (selectedShapeId) idsToCopy.add(selectedShapeId);
                if (selectedTextBoxId) idsToCopy.add(selectedTextBoxId);
                if (selectedCalloutId) idsToCopy.add(selectedCalloutId);

                const items = annotations.filter(a => idsToCopy.has(a.id));
                if (items.length > 0) {
                    e.preventDefault();
                    clipboardRef.current = JSON.parse(JSON.stringify(items));
                    toast.success(`Copied ${items.length} item(s)`);
                }
                return;
            }

            // Cut (Ctrl/Cmd+X)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x' && !isInputFocused) {
                const idsToCut = new Set([...selectedAnnotationIds]);
                if (selectedShapeId) idsToCut.add(selectedShapeId);
                if (selectedTextBoxId) idsToCut.add(selectedTextBoxId);
                if (selectedCalloutId) idsToCut.add(selectedCalloutId);

                const items = annotations.filter(a => idsToCut.has(a.id));
                if (items.length > 0) {
                    e.preventDefault();
                    clipboardRef.current = JSON.parse(JSON.stringify(items));
                    const next = annotations.filter(a => !idsToCut.has(a.id));
                    setAnnotations(next);
                    pushHistory(pages, next);
                    handleDeselectAll();
                    toast.success(`Cut ${items.length} item(s)`);
                }
                return;
            }

            // Paste (Ctrl/Cmd+V)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && !isInputFocused) {
                if (clipboardRef.current && clipboardRef.current.length > 0) {
                    e.preventDefault();
                    const targetIdx = selectedAnnotationPageIndex >= 0 && selectedAnnotationPageIndex < pages.length ? selectedAnnotationPageIndex : 0;
                    const targetPage = pages[targetIdx] || pages[0];
                    const clonedItems = clipboardRef.current.map((item, idx) => ({
                        ...item,
                        id: `cloned_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
                        pageId: targetPage ? targetPage.id : item.pageId,
                        pageIndex: targetIdx,
                        normX: Math.min(0.92, (item.normX !== undefined ? item.normX : 0.1) + 0.03),
                        normY: Math.min(0.92, (item.normY !== undefined ? item.normY : 0.1) + 0.03),
                        x: (item.x || 50) + 18,
                        y: (item.y || 50) + 18
                    }));
                    const next = [...annotations, ...clonedItems];
                    setAnnotations(next);
                    pushHistory(pages, next);
                    setSelectedAnnotationIds(clonedItems.map(c => c.id));
                    if (clonedItems.length === 1 && clonedItems[0].type === 'shape') {
                        setSelectedShapeId(clonedItems[0].id);
                    }
                    toast.success(`Pasted ${clonedItems.length} item(s)`);
                }
                return;
            }

            // Select All annotations on page (Ctrl/Cmd+A)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && !isInputFocused && activeTool === 'select') {
                const targetIdx = selectedAnnotationPageIndex >= 0 && selectedAnnotationPageIndex < pages.length ? selectedAnnotationPageIndex : 0;
                const targetPage = pages[targetIdx] || pages[0];
                const pageAnns = annotations.filter(a => a.pageId ? a.pageId === targetPage?.id : a.pageIndex === targetIdx);
                if (pageAnns.length > 0) {
                    e.preventDefault();
                    setSelectedAnnotationIds(pageAnns.map(a => a.id));
                    toast.success(`Selected ${pageAnns.length} annotations on page`);
                }
                return;
            }

            // Escape: deselect all
            if (e.key === 'Escape' && !isInputFocused) {
                handleDeselectAll();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo, selectedAnnotationIds, selectedShapeId, selectedTextBoxId, selectedCalloutId, annotations, pages, selectedAnnotationPageIndex, activeTool, handleDeselectAll, pushHistory]);

    // Close export, stamp, zoom, and select dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showExportMenu && !e.target.closest?.('.export-dropdown-container')) {
                setShowExportMenu(false);
            }
            if (stampMenuOpen && !e.target.closest?.('.stamp-dropdown-container')) {
                setStampMenuOpen(false);
            }
            if (zoomMenuOpen && !e.target.closest?.('.zoom-dropdown-container')) {
                setZoomMenuOpen(false);
            }
            if (selectMenuOpen && !e.target.closest?.('.select-dropdown-container')) {
                setSelectMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showExportMenu, stampMenuOpen, zoomMenuOpen, selectMenuOpen]);

    // Persistent Saved Signatures in localStorage + Server Office Media Files
    useEffect(() => {
        let localSigs = [];
        try {
            const raw = localStorage.getItem('loms_saved_signatures');
            if (raw) localSigs = JSON.parse(raw);
        } catch {}
        if (localSigs.length > 0) {
            setSavedSignatures(localSigs);
        }

        // Fetch from server /api/office/documents/signatures
        fetch('/api/office/documents/signatures')
            .then(res => res.json())
            .then(json => {
                if (json?.success && Array.isArray(json.data)) {
                    const serverSigs = json.data.map(d => d.dataUrl).filter(Boolean);
                    setSavedSignatures(prev => {
                        const merged = Array.from(new Set([...serverSigs, ...(prev || [])])).slice(0, 30);
                        try {
                            localStorage.setItem('loms_saved_signatures', JSON.stringify(merged));
                        } catch {}
                        return merged;
                    });
                }
            })
            .catch(() => {});
    }, []);

    const handleSaveSignature = async (sigUrl) => {
        if (!sigUrl) return;
        setSavedSignatures(prev => {
            const current = Array.isArray(prev) ? prev : [];
            const updated = [sigUrl, ...current.filter(s => s !== sigUrl)].slice(0, 30);
            try {
                localStorage.setItem('loms_saved_signatures', JSON.stringify(updated));
            } catch {}
            return updated;
        });
        toast.success('Signature saved to library!');

        // Save to server Office Media Files/Signatures
        try {
            await fetch('/api/office/documents/signatures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    signatureDataUrl: sigUrl,
                    title: `Signature ${new Date().toLocaleDateString('en-GB')}`
                })
            });
        } catch (e) {
            console.warn('[PDF Studio] Server signature backup warning:', e);
        }
    };

    const handleDeleteSavedSignature = (idx) => {
        setSavedSignatures(prev => {
            const updated = prev.filter((_, i) => i !== idx);
            try {
                localStorage.setItem('loms_saved_signatures', JSON.stringify(updated));
            } catch {}
            return updated;
        });
        toast.success('Removed saved signature');
    };

    // Persistent Saved Custom Stamps in localStorage
    const [savedStamps, setSavedStamps] = useState([]);

    useEffect(() => {
        let localStamps = [];
        try {
            const raw = localStorage.getItem('loms_saved_custom_stamps');
            if (raw) localStamps = JSON.parse(raw);
        } catch {}
        if (Array.isArray(localStamps) && localStamps.length > 0) {
            setSavedStamps(localStamps);
        }
    }, []);

    const handleSaveCustomStamp = (stampObj) => {
        if (!stampObj) return;
        const stampText = stampObj.text || customStampText || 'CUSTOM STAMP';
        const newStamp = {
            id: `stamp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: stampObj.name || stampText,
            kind: stampObj.kind || stampObj.stampKind || customStampKind || 'text',
            text: stampText,
            color: stampObj.color || customStampColor || '#059669',
            imageUrl: stampObj.imageUrl || customStampImage || '',
            createdAt: Date.now()
        };
        setSavedStamps(prev => {
            const current = Array.isArray(prev) ? prev : [];
            const updated = [newStamp, ...current.filter(s => s.text !== newStamp.text || s.kind !== newStamp.kind)].slice(0, 30);
            try {
                localStorage.setItem('loms_saved_custom_stamps', JSON.stringify(updated));
            } catch {}
            return updated;
        });
        toast.success(`Saved "${newStamp.name}" to stamp library!`);
    };

    const handleDeleteSavedStamp = (id) => {
        setSavedStamps(prev => {
            const updated = prev.filter(s => s.id !== id);
            try {
                localStorage.setItem('loms_saved_custom_stamps', JSON.stringify(updated));
            } catch {}
            return updated;
        });
        toast.success('Removed stamp from library');
    };

    const handleApplySignature = (sigDataUrl) => {
        if (!sigDataUrl) return;
        const targetPageIndex = selectedAnnotationPageIndex >= 0 && selectedAnnotationPageIndex < pages.length
            ? selectedAnnotationPageIndex
            : 0;
        const targetPage = pages[targetPageIndex] || pages[0];
        const newSigAnn = {
            id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            pageId: targetPage?.id || `page_${targetPageIndex}`,
            pageIndex: targetPageIndex,
            type: 'signature',
            imageUrl: sigDataUrl,
            normX: 0.35,
            normY: 0.70,
            x: 215,
            y: 550,
            width: 170,
            height: 65
        };
        const updated = [...annotations, newSigAnn];
        setAnnotations(updated);
        pushHistory(pages, updated);
        setShowSignatureModal(false);
        toast.success('Signature placed on document! You can drag and resize it.');
    };

    // Keep zoom percentage input in sync
    useEffect(() => {
        setZoomInputText(`${Math.round(scrollZoom * 100)}%`);
    }, [scrollZoom]);

    // ─────────────────────────────────────────────────────────────
    // 1. Handle Multi-PDF Import & Append
    // ─────────────────────────────────────────────────────────────
    const handleFilesSelect = async (filesList) => {
        const fileArr = Array.from(filesList).filter(
            f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf'
        );
        if (fileArr.length === 0) {
            toast.error('Please upload valid PDF document(s)');
            return;
        }

        setLoading(true);
        toast.loading(`Processing ${fileArr.length} PDF document(s)...`, { id: 'pdf-load' });

        try {
            const pdfjs = await getPdfJs();
            const newSourceDocs = [];
            const newPages = [];

            for (let i = 0; i < fileArr.length; i++) {
                const curFile = fileArr[i];
                const docIdx = sourceDocs.length + i;
                const arrayBuffer = await curFile.arrayBuffer();
                let docProxy = null;
                if (pdfjs) {
                    try {
                        const uint8 = new Uint8Array(arrayBuffer);
                        docProxy = await pdfjs.getDocument({
                            data: uint8,
                            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
                            cMapPacked: true
                        }).promise;
                    } catch (e) {
                        console.warn('pdfjs error loading file with worker, trying fallback:', curFile.name, e);
                        try {
                            const uint8 = new Uint8Array(arrayBuffer);
                            docProxy = await pdfjs.getDocument({
                                data: uint8,
                                disableWorker: true
                            }).promise;
                        } catch (e2) {
                            console.error('pdfjs error loading file fallback failed:', curFile.name, e2);
                        }
                    }
                }
                const pageCount = docProxy ? docProxy.numPages : 1;
                newSourceDocs.push({
                    id: `doc_${docIdx}_${Date.now()}_${i}`,
                    file: curFile,
                    name: curFile.name,
                    size: (curFile.size / (1024 * 1024)).toFixed(2),
                    pdfDoc: docProxy,
                    pageCount
                });

                for (let p = 0; p < pageCount; p++) {
                    let unscaledW = 612;
                    let unscaledH = 792;
                    try {
                        if (docProxy) {
                            const pageObj = await docProxy.getPage(p + 1);
                            const effectiveRot = pageObj.rotate || 0;
                            const vp = pageObj.getViewport({ scale: 1, rotation: effectiveRot });
                            unscaledW = vp.width || 612;
                            unscaledH = vp.height || 792;
                        }
                    } catch {}
                    newPages.push({
                        id: `page_${docIdx}_${p}_${Date.now()}_${Math.random()}`,
                        docIndex: docIdx,
                        originalPageNum: p + 1,
                        pageIndex: p,
                        rotation: 0,
                        unscaledWidth: unscaledW,
                        unscaledHeight: unscaledH,
                        aspectRatio: unscaledH / unscaledW
                    });
                }
            }

            const updatedDocs = [...sourceDocs, ...newSourceDocs];
            const updatedPages = [...pages, ...newPages];
            setSourceDocs(updatedDocs);
            setPages(updatedPages);
            pushHistory(updatedPages, annotations, appliedWatermarkText, appliedWatermarkColor, appliedWatermarkImage, appliedWatermarkImageDataUrl);
            toast.success(`Imported ${newPages.length} page(s) from ${fileArr.length} PDF file(s)!`, { id: 'pdf-load' });
        } catch (err) {
            console.error('File load error:', err);
            toast.error('Failed to load PDF files', { id: 'pdf-load' });
        } finally {
            setLoading(false);
        }
    };

    // Helper to safely fetch PDF binary data across local, blob, and remote URLs
    const fetchPdfBuffer = async (url) => {
        if (!url) throw new Error('No PDF URL provided');
        if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('/')) {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.arrayBuffer();
        }
        try {
            const res = await fetch(url, { method: 'GET', mode: 'cors' });
            if (res.ok) {
                return await res.arrayBuffer();
            }
        } catch (e) {
            console.warn('Direct fetch failed, falling back to server stream proxy:', e.message);
        }
        const proxyUrl = `/api/documents/stream-proxy?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
        return await res.arrayBuffer();
    };

    // Auto-load Google Drive or URL / Office Media PDF if parameter provided
    useEffect(() => {
        if (driveFileIdParam) {
            const loadDrivePdf = async () => {
                setLoading(true);
                toast.loading(`Loading "${titleParam || 'PDF'}" from Google Drive...`, { id: 'gdrive-pdf' });
                try {
                    let arrayBuffer = null;
                    try {
                        const officeRes = await api.get(`/office/documents/drive/${driveFileIdParam}`);
                        const d = officeRes.data?.data;
                        if (d && d.fileBase64) {
                            const raw = d.fileBase64.split(',')[1] || d.fileBase64;
                            const byteChars = atob(raw);
                            const bytes = new Uint8Array(byteChars.length);
                            for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
                            arrayBuffer = bytes.buffer;
                        }
                    } catch (e) {
                        console.warn('office drive endpoint failed, falling back to /drive/files/:id/content', e);
                    }

                    if (!arrayBuffer) {
                        const res = await api.get(`/drive/files/${driveFileIdParam}/content`, { responseType: 'arraybuffer' });
                        arrayBuffer = res.data;
                    }

                    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
                    const loadedFile = new File([blob], titleParam || 'drive_document.pdf', { type: 'application/pdf' });
                    await handleFilesSelect([loadedFile]);
                    toast.success('Loaded PDF from Google Drive!', { id: 'gdrive-pdf' });
                } catch (err) {
                    console.error('Failed to load PDF from Google Drive:', err);
                    toast.error('Could not download PDF from Google Drive', { id: 'gdrive-pdf' });
                    setLoading(false);
                }
            };
            loadDrivePdf();
        } else if (fileUrlParam) {
            const loadUrlPdf = async () => {
                setLoading(true);
                toast.loading(`Loading "${titleParam || 'Document'}"...`, { id: 'url-pdf' });
                try {
                    const arrayBuffer = await fetchPdfBuffer(fileUrlParam);
                    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
                    const loadedFile = new File([blob], titleParam || 'document.pdf', { type: 'application/pdf' });
                    await handleFilesSelect([loadedFile]);
                    toast.success('Loaded PDF successfully!', { id: 'url-pdf' });
                } catch (err) {
                    console.error('Failed to load PDF from URL:', err);
                    toast.error('Could not load PDF document', { id: 'url-pdf' });
                    setLoading(false);
                }
            };
            loadUrlPdf();
        } else if (docIdParam) {
            const loadOfficeDoc = async () => {
                setLoading(true);
                toast.loading('Loading document...', { id: 'doc-pdf' });
                try {
                    let loadedFile = null;
                    // 1. Try standard CloudVault documents table first (/api/documents/:id)
                    try {
                        const docRes = await api.get(`/documents/${docIdParam}`);
                        const d = docRes.data?.data;
                        if (d && (d.url || d.filePath)) {
                            const fileUrl = d.url || d.filePath;
                            const arrayBuffer = await fetchPdfBuffer(fileUrl);
                            const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
                            loadedFile = new File([blob], d.fileName || d.name || 'document.pdf', { type: 'application/pdf' });
                        }
                    } catch (e) {
                        console.warn('Standard /api/documents/:id lookup failed, trying /office/documents/:id', e);
                    }

                    // 2. Fallback to /api/office/documents/:id
                    if (!loadedFile) {
                        const res = await api.get(`/office/documents/${docIdParam}`);
                        const docData = res.data?.data;
                        if (docData && docData.fileBase64) {
                            const rawBase64 = docData.fileBase64.split(',')[1] || docData.fileBase64;
                            const byteCharacters = atob(rawBase64);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            const blob = new Blob([byteArray], { type: 'application/pdf' });
                            loadedFile = new File([blob], `${docData.title || 'document'}.pdf`, { type: 'application/pdf' });
                        }
                    }

                    if (loadedFile) {
                        await handleFilesSelect([loadedFile]);
                        toast.success('Loaded PDF successfully!', { id: 'doc-pdf' });
                    } else {
                        throw new Error('Document content could not be retrieved');
                    }
                } catch (err) {
                    console.error('Failed to load Document by ID:', err);
                    toast.error('Could not load document', { id: 'doc-pdf' });
                } finally {
                    setLoading(false);
                }
            };
            loadOfficeDoc();
        } else {
            // Restore session from IndexedDB if present (Point 5: prevent file loss on page refresh)
            const restoreSession = async () => {
                try {
                    const session = await loadStudioSession();
                    if (session && session.sourceDocs && session.sourceDocs.length > 0) {
                        toast.loading('Restoring previous PDF Studio session...', { id: 'session-restore' });
                        setLoading(true);
                        const pdfjs = await getPdfJs();
                        const restoredDocs = [];

                        for (let i = 0; i < session.sourceDocs.length; i++) {
                            const d = session.sourceDocs[i];
                            let docProxy = null;
                            if (pdfjs && d.file) {
                                try {
                                    const arrayBuffer = await d.file.arrayBuffer();
                                    const uint8 = new Uint8Array(arrayBuffer);
                                    docProxy = await pdfjs.getDocument({
                                        data: uint8,
                                        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
                                        cMapPacked: true
                                    }).promise;
                                } catch (e) {
                                    console.warn('pdfjs worker error restoring file, fallback:', e);
                                    try {
                                        const arrayBuffer = await d.file.arrayBuffer();
                                        docProxy = await pdfjs.getDocument({
                                            data: new Uint8Array(arrayBuffer),
                                            disableWorker: true
                                        }).promise;
                                    } catch (e2) {}
                                }
                            }
                            restoredDocs.push({
                                ...d,
                                pdfDoc: docProxy
                            });
                        }

                        setSourceDocs(restoredDocs);
                        if (session.pages && session.pages.length > 0) {
                            setPages(session.pages);
                        }
                        if (session.annotations && session.annotations.length > 0) {
                            setAnnotations(session.annotations);
                        }
                        if (session.scrollZoom) {
                            setScrollZoom(session.scrollZoom);
                        }
                        toast.success(`Restored ${session.pages?.length || 0} page(s) from your previous session!`, { id: 'session-restore' });
                    }
                } catch (e) {
                    console.warn('[PDF Studio] Session restore skipped/failed:', e);
                } finally {
                    setLoading(false);
                }
            };
            restoreSession();
        }
    }, [driveFileIdParam, titleParam, fileUrlParam, docIdParam]);

    // Auto-persist active session to IndexedDB so page refresh preserves files and edits
    useEffect(() => {
        if (!sourceDocs || sourceDocs.length === 0) return;
        const timer = setTimeout(() => {
            saveStudioSession({
                sourceDocs,
                pages,
                annotations,
                scrollZoom
            });
        }, 1200);
        return () => clearTimeout(timer);
    }, [sourceDocs, pages, annotations, scrollZoom]);

    const handleClearStudioSession = async () => {
        if (window.confirm('Clear current document and start a new session?')) {
            await clearStudioSession();
            setSourceDocs([]);
            setPages([]);
            setAnnotations([]);
            toast.success('Started new clean PDF Studio session');
        }
    };

    const handleOpenOfficeDoc = async (fileItem) => {
        try {
            setLoading(true);
            toast.loading(`Opening "${fileItem.name}"...`, { id: 'pdf-load' });
            let blob = null;
            if (fileItem.url) {
                const arrayBuffer = await fetchPdfBuffer(fileItem.url);
                blob = new Blob([arrayBuffer], { type: 'application/pdf' });
            } else if (fileItem.id) {
                const res = await api.get(`/office/documents/${fileItem.id}`);
                const docData = res.data?.data;
                if (docData?.fileBase64) {
                    const rawBase64 = docData.fileBase64.split(',')[1] || docData.fileBase64;
                    const byteCharacters = atob(rawBase64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    blob = new Blob([byteArray], { type: 'application/pdf' });
                }
            }
            if (blob) {
                const loadedFile = new File([blob], fileItem.name || 'document.pdf', { type: 'application/pdf' });
                await handleFilesSelect([loadedFile]);
                toast.success(`Opened "${fileItem.name}"!`, { id: 'pdf-load' });
            } else {
                toast.error('Unable to read document file', { id: 'pdf-load' });
            }
        } catch (err) {
            console.error('Error opening office media file:', err);
            toast.error('Failed to open document', { id: 'pdf-load' });
        } finally {
            setLoading(false);
        }
    };

    // Handler when selecting a file from MultiSourcePdfPickerModal (Point 3)
    const handlePickPdfFromModal = async (fileItem) => {
        try {
            setLoading(true);
            toast.loading(`Opening "${fileItem.name || fileItem.title || 'Document'}"...`, { id: 'pdf-load' });
            let loadedFile = null;

            if (fileItem.url) {
                const arrayBuffer = await fetchPdfBuffer(fileItem.url);
                const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
                loadedFile = new File([blob], fileItem.name || fileItem.title || 'document.pdf', { type: 'application/pdf' });
            } else if (fileItem.fileId || fileItem.id) {
                if (fileItem.mimeType?.includes('google-apps') || fileItem.kind?.includes('drive') || fileItem.fileId) {
                    const id = fileItem.fileId || fileItem.id;
                    const res = await api.get(`/drive/files/${id}/content`, { responseType: 'arraybuffer' });
                    const blob = new Blob([res.data], { type: 'application/pdf' });
                    loadedFile = new File([blob], fileItem.name || 'drive_document.pdf', { type: 'application/pdf' });
                } else {
                    try {
                        const docRes = await api.get(`/documents/${fileItem.id}`);
                        const d = docRes.data?.data;
                        if (d && (d.url || d.filePath)) {
                            const buffer = await fetchPdfBuffer(d.url || d.filePath);
                            const blob = new Blob([buffer], { type: 'application/pdf' });
                            loadedFile = new File([blob], d.fileName || d.name || `${d.title || 'document'}.pdf`, { type: 'application/pdf' });
                        }
                    } catch (e) {}

                    if (!loadedFile) {
                        const res = await api.get(`/office/documents/${fileItem.id}`);
                        const docData = res.data?.data;
                        if (docData?.fileBase64) {
                            const rawBase64 = docData.fileBase64.split(',')[1] || docData.fileBase64;
                            const byteChars = atob(rawBase64);
                            const byteNums = new Array(byteChars.length);
                            for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
                            const blob = new Blob([new Uint8Array(byteNums)], { type: 'application/pdf' });
                            loadedFile = new File([blob], `${docData.title || fileItem.name || 'document'}.pdf`, { type: 'application/pdf' });
                        }
                    }
                }
            }

            if (loadedFile) {
                await handleFilesSelect([loadedFile]);
                toast.success(`Loaded "${loadedFile.name}"!`, { id: 'pdf-load' });
            } else {
                throw new Error('Unable to retrieve document binary');
            }
        } catch (err) {
            console.error('Error opening file from picker:', err);
            toast.error('Failed to load selected document', { id: 'pdf-load' });
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // Page Operations with History Snapshot & Synchronized Annotation Rotation
    // ─────────────────────────────────────────────────────────────
    const rotateAnnotation90CW = (ann) => {
        const updated = { ...ann };

        // 1. Freehand / highlighter points
        if (Array.isArray(ann.points) && ann.points.length > 0) {
            updated.points = ann.points.map(pt => {
                const oldNormX = pt.normX !== undefined ? pt.normX : (pt.x || 0) / 612;
                const oldNormY = pt.normY !== undefined ? pt.normY : (pt.y || 0) / 792;
                const newNormX = Math.max(0, Math.min(1, 1 - oldNormY));
                const newNormY = Math.max(0, Math.min(1, oldNormX));
                return {
                    ...pt,
                    normX: newNormX,
                    normY: newNormY,
                    x: Math.round(newNormX * 612),
                    y: Math.round(newNormY * 792)
                };
            });
            return updated;
        }

        // 2. Lines and Arrows
        if (ann.shapeType === 'line' || ann.shapeType === 'arrow') {
            const oldNormX1 = ann.normX1 !== undefined ? ann.normX1 : (ann.x || 0) / 612;
            const oldNormY1 = ann.normY1 !== undefined ? ann.normY1 : (ann.y || 0) / 792;
            const oldNormX2 = ann.normX2 !== undefined ? ann.normX2 : ((ann.x || 0) + (ann.width || 100)) / 612;
            const oldNormY2 = ann.normY2 !== undefined ? ann.normY2 : ((ann.y || 0) + (ann.height || 60)) / 792;

            const newNormX1 = Math.max(0, Math.min(1, 1 - oldNormY1));
            const newNormY1 = Math.max(0, Math.min(1, oldNormX1));
            const newNormX2 = Math.max(0, Math.min(1, 1 - oldNormY2));
            const newNormY2 = Math.max(0, Math.min(1, oldNormX2));

            updated.normX1 = newNormX1;
            updated.normY1 = newNormY1;
            updated.normX2 = newNormX2;
            updated.normY2 = newNormY2;
            updated.normX = Math.min(newNormX1, newNormX2);
            updated.normY = Math.min(newNormY1, newNormY2);
            updated.normWidth = Math.abs(newNormX2 - newNormX1);
            updated.normHeight = Math.abs(newNormY2 - newNormY1);
            updated.x = Math.round(updated.normX * 612);
            updated.y = Math.round(updated.normY * 792);
            return updated;
        }

        // 3. Callouts (Preserve readable horizontal box dimensions & text, rotate anchor and pointer tip)
        if (ann.type === 'callout') {
            const oldNormX = ann.normX !== undefined ? ann.normX : (ann.x || 50) / 612;
            const oldNormY = ann.normY !== undefined ? ann.normY : (ann.y || 50) / 792;
            const wPts = ann.width || 140;
            const hPts = ann.height || 48;
            const newNormW = wPts / 792;
            const newNormH = hPts / 612;

            const newNormX = Math.max(0, Math.min(Math.max(0, 1 - newNormW), 1 - (oldNormY + (ann.normHeight || hPts / 792))));
            const newNormY = Math.max(0, Math.min(Math.max(0, 1 - newNormH), oldNormX));

            const oldTargetX = ann.targetNormX !== undefined ? ann.targetNormX : (ann.targetX || oldNormX * 612 - 30) / 612;
            const oldTargetY = ann.targetNormY !== undefined ? ann.targetNormY : (ann.targetY || oldNormY * 792 + 20) / 792;

            updated.normX = newNormX;
            updated.normY = newNormY;
            updated.normWidth = newNormW;
            updated.normHeight = newNormH;
            updated.width = wPts;
            updated.height = hPts;
            updated.x = Math.round(newNormX * 792);
            updated.y = Math.round(newNormY * 612);
            updated.targetNormX = Math.max(0, Math.min(1, 1 - oldTargetY));
            updated.targetNormY = Math.max(0, Math.min(1, oldTargetX));
            updated.targetX = Math.round(updated.targetNormX * 792);
            updated.targetY = Math.round(updated.targetNormY * 612);
            updated.rotation = 0; // Always maintain horizontal, readable text
            return updated;
        }

        // 4. Stamps and Signatures (Preserve upright orientation, horizontal readability, and natural dimensions)
        if (ann.type === 'stamp' || ann.type === 'signature') {
            const oldNormX = ann.normX !== undefined ? ann.normX : (ann.x || 50) / 612;
            const oldNormY = ann.normY !== undefined ? ann.normY : (ann.y || 50) / 792;
            const wPts = ann.width || (ann.type === 'stamp' ? 140 : 160);
            const hPts = ann.height || (ann.type === 'stamp' ? 46 : 60);
            const newNormW = wPts / 792;
            const newNormH = hPts / 612;

            const newNormX = Math.max(0, Math.min(Math.max(0, 1 - newNormW), 1 - (oldNormY + (ann.normHeight || hPts / 792))));
            const newNormY = Math.max(0, Math.min(Math.max(0, 1 - newNormH), oldNormX));

            updated.normX = newNormX;
            updated.normY = newNormY;
            updated.normWidth = newNormW;
            updated.normHeight = newNormH;
            updated.width = wPts;
            updated.height = hPts;
            updated.x = Math.round(newNormX * 792);
            updated.y = Math.round(newNormY * 612);
            updated.rotation = 0; // Always upright and horizontal
            return updated;
        }

        // 5. Bounding box items: textbox, shape (rect/ellipse), image, highlight, redact
        const oldNormX = ann.normX !== undefined ? ann.normX : (ann.x || 50) / 612;
        const oldNormY = ann.normY !== undefined ? ann.normY : (ann.y || 50) / 792;
        const oldNormW = ann.normWidth !== undefined ? ann.normWidth : (ann.width || 140) / 612;
        const oldNormH = ann.normHeight !== undefined ? ann.normHeight : (ann.height || 48) / 792;

        const newNormX = Math.max(0, Math.min(1, 1 - (oldNormY + oldNormH)));
        const newNormY = Math.max(0, Math.min(1, oldNormX));
        const newNormW = oldNormH;
        const newNormH = oldNormW;

        updated.normX = newNormX;
        updated.normY = newNormY;
        updated.normWidth = newNormW;
        updated.normHeight = newNormH;
        updated.width = Math.round(newNormW * 612);
        updated.height = Math.round(newNormH * 792);
        updated.x = Math.round(newNormX * 612);
        updated.y = Math.round(newNormY * 792);

        if (ann.rotation !== undefined) {
            updated.rotation = ((ann.rotation || 0) + 90) % 360;
        }

        return updated;
    };

    const rotatePage = (index, delta = 90) => {
        const targetPage = pages[index];
        let nextAnnotations = annotations;
        if (targetPage) {
            nextAnnotations = annotations.map(a => {
                const matches = a.pageId ? a.pageId === targetPage.id : a.pageIndex === index;
                return matches ? rotateAnnotation90CW(a) : a;
            });
            setAnnotations(nextAnnotations);
        }
        setPages(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], rotation: (copy[index].rotation + delta) % 360 };
            pushHistory(copy, nextAnnotations, appliedWatermarkText, appliedWatermarkColor, appliedWatermarkImage, appliedWatermarkImageDataUrl);
            return copy;
        });
        if (searchQuery && searchQuery.trim().length >= 2) {
            setTimeout(() => handleSearch(searchQuery), 80);
        }
    };

    const deletePage = (index) => {
        if (pages.length <= 1) {
            toast.error('Document must contain at least one page');
            return;
        }
        setPages(prev => {
            const copy = prev.filter((_, i) => i !== index);
            pushHistory(copy, annotations, appliedWatermarkText, appliedWatermarkColor, appliedWatermarkImage, appliedWatermarkImageDataUrl);
            return copy;
        });
        toast.success('Removed page');
    };

    const duplicatePage = (index) => {
        setPages(prev => {
            const copy = [...prev];
            const item = copy[index];
            copy.splice(index + 1, 0, { ...item, id: `page_${Date.now()}_${Math.random()}` });
            pushHistory(copy, annotations, appliedWatermarkText, appliedWatermarkColor, appliedWatermarkImage, appliedWatermarkImageDataUrl);
            return copy;
        });
        toast.success('Page duplicated');
    };

    const movePage = (fromIndex, toIndex) => {
        if (toIndex < 0 || toIndex >= pages.length || fromIndex === toIndex) return;
        setPages(prev => {
            const copy = [...prev];
            const [moved] = copy.splice(fromIndex, 1);
            copy.splice(toIndex, 0, moved);
            pushHistory(copy, annotations, appliedWatermarkText, appliedWatermarkColor, appliedWatermarkImage, appliedWatermarkImageDataUrl);
            return copy;
        });
        toast.success(`Moved page to position ${toIndex + 1}`, { id: 'move-toast', duration: 1000 });
    };

    const rotateAll = (delta = 90) => {
        const nextAnnotations = annotations.map(a => rotateAnnotation90CW(a));
        setAnnotations(nextAnnotations);
        setPages(prev => {
            const copy = prev.map(p => ({ ...p, rotation: (p.rotation + delta) % 360 }));
            pushHistory(copy, nextAnnotations, appliedWatermarkText, appliedWatermarkColor, appliedWatermarkImage, appliedWatermarkImageDataUrl);
            return copy;
        });
        toast.success(`Rotated all pages by ${delta}°`);
    };

    // ─────────────────────────────────────────────────────────────
    // Watermark Operations with Live Preview & Immediate Image Apply
    // ─────────────────────────────────────────────────────────────
    const handleImageWatermarkUpload = (file) => {
        if (!file || !file.type.startsWith('image/')) {
            toast.error('Please upload a valid image (PNG, JPG, SVG, WebP)');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            const img = new Image();
            img.onload = () => {
                setWatermarkMode('image');
                setWatermarkImageEl(img);
                setWatermarkImageDataUrl(dataUrl);
                // Immediately apply image watermark and clear text watermark (mutually exclusive)
                setAppliedWatermarkImage(img);
                setAppliedWatermarkImageDataUrl(dataUrl);
                setAppliedWatermarkText('');
                setWatermarkInput('');
                pushHistory(pages, annotations, '', watermarkColor, img, dataUrl);
                toast.success('Watermark image applied to all pages!');
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    };

    const handleApplyWatermark = () => {
        if (watermarkMode === 'image' || (watermarkImageEl && !watermarkInput.trim()) || (appliedWatermarkImageDataUrl && !watermarkInput.trim())) {
            const img = watermarkImageEl || appliedWatermarkImage;
            const dataUrl = watermarkImageDataUrl || appliedWatermarkImageDataUrl;
            if (!img && !dataUrl) {
                toast.error('Please select an image file first');
                return;
            }
            setWatermarkMode('image');
            setAppliedWatermarkImage(img);
            setAppliedWatermarkImageDataUrl(dataUrl);
            setAppliedWatermarkText('');
            setWatermarkInput('');
            pushHistory(pages, annotations, '', watermarkColor, img, dataUrl);
            toast.success('Applied image watermark to all pages!');
        } else {
            if (!watermarkInput.trim()) {
                toast.error('Enter watermark text first or upload an image');
                return;
            }
            const val = watermarkInput.trim();
            setWatermarkMode('text');
            setAppliedWatermarkText(val);
            setAppliedWatermarkColor(watermarkColor);
            // Clear image watermark (mutually exclusive)
            setAppliedWatermarkImage(null);
            setAppliedWatermarkImageDataUrl('');
            setWatermarkImageEl(null);
            setWatermarkImageDataUrl('');
            pushHistory(pages, annotations, val, watermarkColor, null, '');
            toast.success(`Applied watermark "${val}"!`);
        }
    };

    const handleClearWatermark = () => {
        setAppliedWatermarkText('');
        setAppliedWatermarkImage(null);
        setAppliedWatermarkImageDataUrl('');
        setWatermarkInput('');
        setWatermarkImageEl(null);
        setWatermarkImageDataUrl('');
        pushHistory(pages, annotations, '', '#dc2626', null, '');
        toast.success('Watermark cleared');
    };

    // Insert new Image annotation to current page
    const handleInsertImage = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (pages.length === 0) {
            toast.error('Please upload a PDF document first');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            const targetPageIdx = selectedAnnotationPageIndex !== null ? selectedAnnotationPageIndex : 0;
            const targetPage = pages[targetPageIdx] || pages[0];
            const newImgAnn = {
                id: `ann_img_${Date.now()}_${Math.random()}`,
                pageId: targetPage.id,
                pageIndex: targetPageIdx,
                type: 'image',
                imageUrl: dataUrl,
                imageDataUrl: dataUrl,
                normX: 0.3,
                normY: 0.3,
                x: 180,
                y: 220,
                width: 200,
                height: 140
            };
            const updated = [...annotations, newImgAnn];
            setAnnotations(updated);
            pushHistory(pages, updated);
            toast.success('Inserted image! You can drag to reposition or drag bottom-right corner to resize.');
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // ─────────────────────────────────────────────────────────────
    // Unified Multi-PDF Export (with Standard, Basic & Strong Compression)
    // ─────────────────────────────────────────────────────────────
    // Circular progress notification with percentage inside round indicator
    const renderCircularProgressToast = (progress, statusText, titleText = 'Processing Document', isComplete = false, isError = false) => {
        const radius = 16;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (Math.max(0, Math.min(100, progress)) / 100) * circumference;

        if (isComplete || isError) {
            setTimeout(() => {
                toast.dismiss('pdf-circular-progress');
            }, 3200);
        }

        toast.custom((t) => (
            <div className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl shadow-2xl border transition-all duration-300 ${
                isDark ? 'bg-slate-900 border-slate-700 text-white shadow-black/60' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/60'
            } ${t.visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                {/* Round Progress Spinner with Percentage inside */}
                <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                    <svg className="w-12 h-12 -rotate-90 transform" viewBox="0 0 40 40">
                        {/* Background track circle */}
                        <circle
                            cx="20"
                            cy="20"
                            r={radius}
                            stroke={isDark ? '#334155' : '#e2e8f0'}
                            strokeWidth="3.5"
                            fill="transparent"
                        />
                        {/* Round dynamic progress dial */}
                        <circle
                            cx="20"
                            cy="20"
                            r={radius}
                            stroke={isError ? '#ef4444' : isComplete ? '#10b981' : '#f43f5e'}
                            strokeWidth="3.5"
                            strokeDasharray={`${circumference} ${circumference}`}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            fill="transparent"
                            className="transition-all duration-300 ease-out"
                        />
                    </svg>
                    {/* Percentage text inside round progress */}
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black tracking-tight font-mono">
                        {isError ? '✕' : isComplete ? '100%' : `${Math.round(progress)}%`}
                    </span>
                </div>

                <div className="flex flex-col min-w-[200px]">
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${isError ? 'text-rose-500' : isComplete ? 'text-emerald-500' : ''}`}>
                        {titleText}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                        {statusText}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={() => toast.dismiss('pdf-circular-progress')}
                    className="ml-auto p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Dismiss notification"
                >
                    <X size={14} />
                </button>
            </div>
        ), { id: 'pdf-circular-progress', duration: isComplete || isError ? 3200 : Infinity });
    };

    const handleExportReorganized = async (compLevel = 'none') => {
        if (sourceDocs.length === 0 || pages.length === 0) {
            toast.error('Please upload at least one PDF first');
            return;
        }
        setProcessing(true);
        setShowExportMenu(false);

        const levelLabel = compLevel === 'strong' ? 'Strong Compressed' : compLevel === 'basic' ? 'Basic Compressed' : 'Standard Quality';
        renderCircularProgressToast(15, `Preparing ${levelLabel} export...`, 'Exporting Document');

        try {
            const operations = pages.map((p, outIdx) => ({
                docIndex: p.docIndex,
                sourceFileIndex: p.docIndex,
                pageIndex: p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex,
                sourcePageIndex: p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex,
                rotationDegrees: p.rotation || 0,
                rotation: p.rotation || 0,
                annotations: annotations
                    .filter(a => a.pageId ? a.pageId === p.id : a.pageIndex === (p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex))
                    .map(a => ({ ...a, pageIndex: outIdx }))
            }));

            const formData = new FormData();
            sourceDocs.forEach(d => {
                if (d.file instanceof Blob || d.file instanceof File) {
                    formData.append('files', d.file, d.name || 'document.pdf');
                } else if (d.file) {
                    formData.append('files', new Blob([d.file], { type: 'application/pdf' }), d.name || 'document.pdf');
                }
            });
            if (!formData.has('files') && activeFile) {
                formData.append('files', activeFile, activeFileName);
            }
            if (!formData.has('files')) {
                toast.error('No source PDF file available to export');
                setProcessing(false);
                return;
            }
            formData.append('operations', JSON.stringify(operations));

            // Watermark text & color
            if (appliedWatermarkText && appliedWatermarkText.trim()) {
                formData.append('watermarkText', appliedWatermarkText.trim());
                formData.append('watermarkColor', appliedWatermarkColor);
                formData.append('watermarkOpacity', String(watermarkOpacity));
            }

            // Image watermark
            if (appliedWatermarkImageDataUrl) {
                formData.append('watermarkImageDataUrl', appliedWatermarkImageDataUrl);
                formData.append('watermarkOpacity', String(watermarkOpacity));
            }

            // Compression level
            if (compLevel !== 'none') {
                formData.append('compressLevel', compLevel);
            }

            renderCircularProgressToast(55, `Compiling and optimizing ${levelLabel} PDF...`, 'Exporting Document');

            const res = await api.post('/office/pdf/reorganize', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            const downloadUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = downloadUrl;
            const primaryName = sourceDocs[0]?.name || 'document.pdf';
            const suffix = compLevel === 'strong' ? '_strong_compressed.pdf' : compLevel === 'basic' ? '_compressed.pdf' : '_organized.pdf';
            const safeName = sourceDocs.length > 1
                ? `merged_document${suffix}`
                : primaryName.replace(/\.pdf$/i, suffix);
            a.download = safeName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);

            renderCircularProgressToast(100, `Downloaded ${levelLabel} PDF!`, 'Export Complete', true);
        } catch (err) {
            console.error('Export error:', err);
            let errMsg = 'Failed to export reorganized PDF';
            if (err.response?.data instanceof Blob) {
                try {
                    const text = await err.response.data.text();
                    const parsed = JSON.parse(text);
                    if (parsed.message) errMsg = parsed.message;
                } catch {}
            } else if (err.response?.data?.message) {
                errMsg = err.response.data.message;
            }
            renderCircularProgressToast(0, errMsg, 'Export Failed', false, true);
        } finally {
            setProcessing(false);
        }
    };


    // ─────────────────────────────────────────────────────────────
    // Direct PDF Conversion Export (.docx, .xlsx, .txt, .zip)
    // ─────────────────────────────────────────────────────────────
    const handleExportAs = async (targetFormat = 'pdf') => {
        if (sourceDocs.length === 0 || pages.length === 0) {
            toast.error('Please upload at least one PDF first');
            return;
        }
        setProcessing(true);
        setShowExportMenu(false);

        const formatLabels = {
            docx: 'Word Document (.docx)',
            xlsx: 'Excel Spreadsheet (.xlsx)',
            txt: 'Plain Text (.txt)',
            zip: 'Page Archive (.zip)',
            pdf: 'Standard PDF'
        };
        const label = formatLabels[targetFormat] || targetFormat.toUpperCase();
        toast.loading(`Converting & exporting as ${label}...`, { id: 'pdf-export' });

        try {
            const operations = pages.map(p => ({
                docIndex: p.docIndex,
                sourceFileIndex: p.docIndex,
                pageIndex: p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex,
                sourcePageIndex: p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex,
                rotationDegrees: p.rotation || 0,
                rotation: p.rotation || 0,
                annotations: annotations.filter(a => a.pageId ? a.pageId === p.id : a.pageIndex === p.pageIndex)
            }));

            const formData = new FormData();
            sourceDocs.forEach(d => {
                if (d.file instanceof Blob || d.file instanceof File) {
                    formData.append('files', d.file, d.name || 'document.pdf');
                } else if (d.file) {
                    formData.append('files', new Blob([d.file], { type: 'application/pdf' }), d.name || 'document.pdf');
                }
            });
            if (!formData.has('files') && activeFile) {
                formData.append('files', activeFile, activeFileName);
            }
            if (!formData.has('files')) {
                toast.error('No source PDF file available to export');
                setProcessing(false);
                return;
            }
            formData.append('operations', JSON.stringify(operations));
            formData.append('targetFormat', targetFormat);

            if (appliedWatermarkText && appliedWatermarkText.trim()) {
                formData.append('watermarkText', appliedWatermarkText.trim());
                formData.append('watermarkColor', appliedWatermarkColor);
                formData.append('watermarkOpacity', String(watermarkOpacity));
            }
            if (appliedWatermarkImageDataUrl) {
                formData.append('watermarkImageDataUrl', appliedWatermarkImageDataUrl);
                formData.append('watermarkOpacity', String(watermarkOpacity));
            }
            if (annotations && annotations.length > 0) {
                formData.append('annotations', JSON.stringify(annotations));
            }

            const res = await api.post('/office/pdf/export-as', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            const cd = res.headers['content-disposition'];
            let filename = `exported_${targetFormat}`;
            if (cd) {
                const match = cd.match(/filename=["']?([^"';]+)["']?/);
                if (match && match[1]) filename = match[1];
            } else {
                const primaryName = (sourceDocs[0]?.name || 'document').replace(/\.pdf$/i, '');
                filename = `${primaryName}.${targetFormat === 'word' ? 'docx' : targetFormat === 'excel' ? 'xlsx' : targetFormat}`;
            }

            const blobType = res.headers['content-type'] || 'application/octet-stream';
            const downloadUrl = window.URL.createObjectURL(new Blob([res.data], { type: blobType }));
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);

            toast.success(`Successfully exported as ${label}!`, { id: 'pdf-export' });
        } catch (err) {
            console.error('Export error:', err);
            let errMsg = `Failed to export as ${label}`;
            if (err.response?.data instanceof Blob) {
                try {
                    const text = await err.response.data.text();
                    const parsed = JSON.parse(text);
                    if (parsed.message) errMsg = parsed.message;
                } catch {}
            } else if (err.response?.data?.message) {
                errMsg = err.response.data.message;
            } else if (err.message) {
                errMsg = err.message;
            }
            toast.error(errMsg, { id: 'pdf-export' });
        } finally {
            setProcessing(false);
        }
    };


    // ─────────────────────────────────────────────────────────────
    // Splitter, Compressor & OCR Handlers
    // ─────────────────────────────────────────────────────────────
    const activeFile = sourceDocs[0]?.file || null;
    const activeFileName = sourceDocs[0]?.name || 'document.pdf';

    const handleExecuteSplit = async () => {
        if (!activeFile) {
            toast.error('Please upload a PDF file first');
            return;
        }
        setProcessing(true);
        toast.loading(`Extracting pages [${splitRange}]...`, { id: 'split-pdf' });
        try {
            const formData = new FormData();
            formData.append('file', activeFile);
            formData.append('pageRange', splitRange);

            const res = await api.post('/office/pdf/split', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            const downloadUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = activeFileName.replace(/\.pdf$/i, '_extracted.pdf');
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);

            toast.success('Successfully extracted pages!', { id: 'split-pdf' });
        } catch (err) {
            console.error('Split error:', err);
            toast.error('Failed to split PDF', { id: 'split-pdf' });
        } finally {
            setProcessing(false);
        }
    };


    const handleDownloadSinglePage = async (pageNum) => {
        if (!activeFile) return;
        setProcessing(true);
        toast.loading(`Extracting Page ${pageNum}...`, { id: 'split-single' });
        try {
            const formData = new FormData();
            formData.append('file', activeFile);
            formData.append('pageRange', String(pageNum));

            const res = await api.post('/office/pdf/split', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            const downloadUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `page_${String(pageNum).padStart(3, '0')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);

            toast.success(`Downloaded Page ${pageNum}!`, { id: 'split-single' });
        } catch (err) {
            console.error('Download single page error:', err);
            toast.error(`Failed to extract Page ${pageNum}`, { id: 'split-single' });
        } finally {
            setProcessing(false);
        }
    };


    const handleExtractZipAndSaveToOffice = async () => {
        const targetFile = activeFile || sourceDocs[0]?.file;
        if (!targetFile && sourceDocs.length === 0) {
            toast.error('Please upload a PDF file first');
            return;
        }
        setProcessing(true);
        renderCircularProgressToast(20, 'Preparing document pages...', 'Zipping & Saving to Cloud');
        try {
            const sortedPageNums = selectedExtractPages.length > 0
                ? [...selectedExtractPages].sort((a, b) => a - b)
                : pages.map((_, i) => i + 1);
            const filteredPages = sortedPageNums.map(num => pages[num - 1]).filter(Boolean);

            const operations = filteredPages.map(p => ({
                docIndex: p.docIndex,
                sourceFileIndex: p.docIndex,
                pageIndex: p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex,
                sourcePageIndex: p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex,
                rotationDegrees: p.rotation || 0,
                rotation: p.rotation || 0,
                annotations: annotations.filter(a => a.pageId ? a.pageId === p.id : a.pageIndex === p.pageIndex)
            }));

            const formData = new FormData();
            if (sourceDocs.length > 0) {
                sourceDocs.forEach(d => {
                    if (d.file) formData.append('files', d.file, d.name || 'document.pdf');
                });
            } else if (targetFile) {
                formData.append('file', targetFile, targetFile.name || 'document.pdf');
            }
            formData.append('operations', JSON.stringify(operations));
            formData.append('selectedPages', JSON.stringify(sortedPageNums));

            renderCircularProgressToast(50, 'Compiling ZIP archive of pages...', 'Zipping & Saving to Cloud');

            const res = await api.post('/office/pdf/split-zip', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            renderCircularProgressToast(80, 'Saving ZIP to CloudVault > Zip Archives...', 'Zipping & Saving to Cloud');

            const baseName = (targetFile?.name || sourceDocs[0]?.name || 'document').replace(/\.pdf$/i, '');
            const zipFormData = new FormData();
            zipFormData.append('file', res.data, `${baseName}_extracted_pages.zip`);
            zipFormData.append('docType', 'zip');
            zipFormData.append('format', 'zip');
            zipFormData.append('title', `${baseName}_extracted_pages`);
            zipFormData.append('folderName', 'Zip Archives');
            zipFormData.append('content', JSON.stringify({ pageCount: filteredPages.length, operations }));

            await api.post('/office/documents/save-to-media-files', zipFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            renderCircularProgressToast(100, `Saved ${filteredPages.length} pages in ZIP to CloudVault > Zip Archives!`, 'Extraction Complete', true);
        } catch (err) {
            console.error('Extract to office zip error:', err);
            renderCircularProgressToast(0, err.response?.data?.message || err.message || 'Failed to save ZIP to CloudVault', 'Extraction Failed', false, true);
        } finally {
            setProcessing(false);
        }
    };


    const handleExtractDownloadZip = async () => {
        const targetFile = activeFile || sourceDocs[0]?.file;
        if (!targetFile && sourceDocs.length === 0) {
            toast.error('Please upload a PDF file first');
            return;
        }
        setProcessing(true);
        renderCircularProgressToast(25, 'Preparing document pages...', 'Downloading ZIP Archive');
        try {
            const sortedPageNums = selectedExtractPages.length > 0
                ? [...selectedExtractPages].sort((a, b) => a - b)
                : pages.map((_, i) => i + 1);
            const filteredPages = sortedPageNums.map(num => pages[num - 1]).filter(Boolean);

            const operations = filteredPages.map(p => ({
                docIndex: p.docIndex,
                sourceFileIndex: p.docIndex,
                pageIndex: p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex,
                sourcePageIndex: p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex,
                rotationDegrees: p.rotation || 0,
                rotation: p.rotation || 0,
                annotations: annotations.filter(a => a.pageId ? a.pageId === p.id : a.pageIndex === p.pageIndex)
            }));

            const formData = new FormData();
            if (sourceDocs.length > 0) {
                sourceDocs.forEach(d => {
                    if (d.file) formData.append('files', d.file, d.name || 'document.pdf');
                });
            } else if (targetFile) {
                formData.append('file', targetFile, targetFile.name || 'document.pdf');
            }
            formData.append('operations', JSON.stringify(operations));
            formData.append('selectedPages', JSON.stringify(sortedPageNums));

            renderCircularProgressToast(65, 'Packaging individual pages into ZIP...', 'Downloading ZIP Archive');

            const res = await api.post('/office/pdf/split-zip', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            renderCircularProgressToast(90, 'Starting browser download...', 'Downloading ZIP Archive');

            const downloadUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
            const a = document.createElement('a');
            a.href = downloadUrl;
            const baseName = (targetFile?.name || sourceDocs[0]?.name || 'document').replace(/\.pdf$/i, '');
            a.download = `${baseName}_extracted_pages.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);

            renderCircularProgressToast(100, `Downloaded ZIP containing ${filteredPages.length} pages!`, 'Extraction Complete', true);
        } catch (err) {
            console.error('Split zip error:', err);
            renderCircularProgressToast(0, err.response?.data?.message || err.message || 'Failed to download ZIP archive', 'Extraction Failed', false, true);
        } finally {
            setProcessing(false);
        }
    };


    const handleExtractDownloadSeparatePages = async () => {
        const targetFile = activeFile || sourceDocs[0]?.file;
        if (!targetFile && sourceDocs.length === 0) {
            toast.error('Please upload a PDF file first');
            return;
        }
        setProcessing(true);
        renderCircularProgressToast(20, 'Splitting into separate single-page PDFs...', 'Downloading Separate Pages');
        try {
            const sortedPageNums = selectedExtractPages.length > 0
                ? [...selectedExtractPages].sort((a, b) => a - b)
                : pages.map((_, i) => i + 1);
            const filteredPages = sortedPageNums.map(num => pages[num - 1]).filter(Boolean);
            const baseName = (targetFile?.name || sourceDocs[0]?.name || 'document').replace(/\.pdf$/i, '');

            for (let i = 0; i < filteredPages.length; i++) {
                const p = filteredPages[i];
                const pNum = sortedPageNums[i];
                renderCircularProgressToast(
                    Math.round(20 + ((i + 1) / filteredPages.length) * 75),
                    `Downloading Page ${pNum} of ${filteredPages.length}...`,
                    'Downloading Separate Pages'
                );

                const singleOp = [{
                    docIndex: p.docIndex,
                    sourceFileIndex: p.docIndex,
                    pageIndex: p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex,
                    sourcePageIndex: p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex,
                    rotationDegrees: p.rotation || 0,
                    rotation: p.rotation || 0,
                    annotations: annotations.filter(a => a.pageId ? a.pageId === p.id : a.pageIndex === p.pageIndex)
                }];

                const formData = new FormData();
                if (sourceDocs.length > 0) {
                    sourceDocs.forEach(d => {
                        if (d.file) formData.append('files', d.file, d.name || 'document.pdf');
                    });
                } else if (targetFile) {
                    formData.append('file', targetFile, targetFile.name || 'document.pdf');
                }
                formData.append('operations', JSON.stringify(singleOp));

                const res = await api.post('/office/pdf/reorganize', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    responseType: 'blob'
                });

                const downloadUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `${baseName}_page_${String(pNum).padStart(2, '0')}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(downloadUrl);
                document.body.removeChild(a);

                if (i < filteredPages.length - 1) {
                    await new Promise(r => setTimeout(r, 200));
                }
            }

            renderCircularProgressToast(100, `Downloaded all ${filteredPages.length} separate page files!`, 'Extraction Complete', true);
        } catch (err) {
            console.error('Download separate pages error:', err);
            renderCircularProgressToast(0, err.response?.data?.message || err.message || 'Failed to download separate pages', 'Extraction Failed', false, true);
        } finally {
            setProcessing(false);
        }
    };


    const handleExtractSaveSeparatePagesToCloud = async () => {
        const targetFile = activeFile || sourceDocs[0]?.file;
        if (!targetFile && sourceDocs.length === 0) {
            toast.error('Please upload a PDF file first');
            return;
        }
        setProcessing(true);

        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const dtStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        const dtFolder = `extract_${dtStr}`;

        renderCircularProgressToast(15, `Creating cloud folder ${dtFolder}...`, 'Saving Separate Pages');
        try {
            const sortedPageNums = selectedExtractPages.length > 0
                ? [...selectedExtractPages].sort((a, b) => a - b)
                : pages.map((_, i) => i + 1);
            const filteredPages = sortedPageNums.map(num => pages[num - 1]).filter(Boolean);
            const baseName = (targetFile?.name || sourceDocs[0]?.name || 'document').replace(/\.pdf$/i, '');

            for (let i = 0; i < filteredPages.length; i++) {
                const p = filteredPages[i];
                const pNum = sortedPageNums[i];
                renderCircularProgressToast(
                    Math.round(15 + ((i + 1) / filteredPages.length) * 80),
                    `Saving Page ${pNum} to CloudVault > ${dtFolder}...`,
                    'Saving Separate Pages'
                );

                const singleOp = [{
                    docIndex: p.docIndex,
                    sourceFileIndex: p.docIndex,
                    pageIndex: p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex,
                    sourcePageIndex: p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex,
                    rotationDegrees: p.rotation || 0,
                    rotation: p.rotation || 0,
                    annotations: annotations.filter(a => a.pageId ? a.pageId === p.id : a.pageIndex === p.pageIndex)
                }];

                const formData = new FormData();
                if (sourceDocs.length > 0) {
                    sourceDocs.forEach(d => {
                        if (d.file) formData.append('files', d.file, d.name || 'document.pdf');
                    });
                } else if (targetFile) {
                    formData.append('file', targetFile, targetFile.name || 'document.pdf');
                }
                formData.append('operations', JSON.stringify(singleOp));

                const res = await api.post('/office/pdf/reorganize', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    responseType: 'blob'
                });

                const pageFormData = new FormData();
                pageFormData.append('file', res.data, `${baseName}_page_${String(pNum).padStart(2, '0')}.pdf`);
                pageFormData.append('docType', 'pdf');
                pageFormData.append('format', 'pdf');
                pageFormData.append('title', `${baseName}_page_${String(pNum).padStart(2, '0')}`);
                pageFormData.append('folderName', dtFolder);
                pageFormData.append('content', JSON.stringify({ pageNumber: pNum, totalPages: filteredPages.length }));

                await api.post('/office/documents/save-to-media-files', pageFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            renderCircularProgressToast(100, `Saved ${filteredPages.length} separate pages into CloudVault > ${dtFolder}!`, 'Extraction Complete', true);
        } catch (err) {
            console.error('Save separate pages to cloud error:', err);
            renderCircularProgressToast(0, err.response?.data?.message || err.message || 'Failed to save pages to cloud', 'Extraction Failed', false, true);
        } finally {
            setProcessing(false);
        }
    };


    const handleExtractPagesToZip = handleExtractDownloadZip;

    const handleCompressPdf = async (destination = 'local') => {
        const targetDoc = compressTargetDoc === 'all'
            ? (activeFile ? { file: activeFile, name: activeFileName } : sourceDocs[0])
            : sourceDocs[parseInt(compressTargetDoc, 10)];

        if (!targetDoc?.file) {
            toast.error('No PDF file available to compress');
            return;
        }

        setProcessing(true);
        setCompressing(true);
        toast.loading(`Downsampling images & compressing PDF (${compressLevel})...`, { id: 'pdf-compress' });

        try {
            const formData = new FormData();
            formData.append('file', targetDoc.file);
            formData.append('level', compressLevel);

            const res = await api.post('/office/pdf/compress', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            const origSize = parseInt(res.headers['x-original-size'] || String(targetDoc.file.size || 0), 10);
            const compSize = parseInt(res.headers['x-compressed-size'] || String(res.data.size || 0), 10);
            const savings = parseInt(res.headers['x-savings-percent'] || '0', 10) || (origSize > 0 ? Math.max(0, Math.round(((origSize - compSize) / origSize) * 100)) : 0);

            setCompressStats({
                originalSize: origSize,
                compressedSize: compSize,
                savingsPercent: savings
            });

            const baseName = (targetDoc.name || 'document').replace(/\.pdf$/i, '');
            const finalFilename = `${baseName}_compressed_${compressLevel}.pdf`;

            if (destination === 'cloud') {
                renderCircularProgressToast(80, 'Storing in CloudVault > PDF Documents...', 'Saving to Cloud');
                const cloudFormData = new FormData();
                cloudFormData.append('file', res.data, finalFilename);
                cloudFormData.append('docType', 'pdf');
                cloudFormData.append('format', 'pdf');
                cloudFormData.append('title', `${baseName}_compressed_${compressLevel}`);
                cloudFormData.append('folderName', 'PDF Documents');
                cloudFormData.append('content', JSON.stringify({
                    compressLevel,
                    originalSize: origSize,
                    compressedSize: compSize,
                    savingsPercent: savings
                }));

                await api.post('/office/documents/save-to-media-files', cloudFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                toast.success(`Compressed and saved to CloudVault > PDF Documents (${savings}% reduction)!`, { id: 'pdf-compress' });
            } else {
                const downloadUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = finalFilename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(downloadUrl);
                document.body.removeChild(a);

                toast.success(`Compressed PDF downloaded (${savings}% reduction)!`, { id: 'pdf-compress' });
            }
        } catch (err) {
            console.error('Compress error:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to compress PDF', { id: 'pdf-compress' });
        } finally {
            setProcessing(false);
            setCompressing(false);
        }
    };

    const handleRunVisionOcr = async () => {
        if (!activeFile && sourceDocs.length === 0) {
            toast.error('Please upload a PDF file first');
            return;
        }
        setOcrLoading(true);
        toast.loading('Scanning with Multimodal AI Vision (Scanned / Image Document)...', { id: 'ocr-extract' });
        try {
            const pdfjs = await getPdfJs();
            const targetBlob = activeFile || sourceDocs[0]?.file;
            const arrayBuffer = await targetBlob.arrayBuffer();
            const loadedPdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            const pageImages = [];

            const maxPages = Math.min(5, loadedPdf.numPages);
            for (let i = 1; i <= maxPages; i++) {
                const pdfPage = await loadedPdf.getPage(i);
                const viewport = pdfPage.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                await pdfPage.render({ canvasContext: ctx, viewport }).promise;
                pageImages.push(canvas.toDataURL('image/jpeg', 0.85));
            }

            if (pageImages.length === 0) {
                toast.error('Could not render document pages for vision scanning', { id: 'ocr-extract' });
                return;
            }

            const res = await api.post('/office/pdf/ocr-vision', {
                images: pageImages,
                provider: 'gemini'
            });

            if (res.data?.success && res.data.data) {
                setOcrResult(res.data.data);
                toast.success(`AI Vision extracted ${res.data.data.wordCount} words from scanned pages!`, { id: 'ocr-extract' });
            } else {
                toast.error('AI Vision OCR could not detect text', { id: 'ocr-extract' });
            }
        } catch (err) {
            console.error('Vision OCR error:', err);
            toast.error(err.response?.data?.message || err.message || 'Vision OCR failed', { id: 'ocr-extract' });
        } finally {
            setOcrLoading(false);
        }
    };

    const handleRunOcr = async () => {
        if (!activeFile) {
            toast.error('Please upload a PDF file first');
            return;
        }
        setOcrLoading(true);
        toast.loading('Analyzing document text...', { id: 'ocr-extract' });
        try {
            const formData = new FormData();
            formData.append('file', activeFile);

            const res = await api.post('/office/pdf/ocr', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data?.success && res.data.data) {
                setOcrResult(res.data.data);
                if (res.data.data.wordCount === 0) {
                    toast('No selectable text found (scanned PDF). Engaging AI Vision OCR...', { icon: '🔍', id: 'ocr-extract' });
                    handleRunVisionOcr();
                    return;
                }
                toast.success(`Extracted ${res.data.data.wordCount} words!`, { id: 'ocr-extract' });
            } else {
                toast.error('Failed to extract text from document', { id: 'ocr-extract' });
            }
        } catch (err) {
            console.error('OCR error:', err);
            toast.error('OCR extraction failed', { id: 'ocr-extract' });
        } finally {
            setOcrLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // Interactive Canvas Mouse Drawing Handlers (Real-time Inking & Snapped Vectors)
    // ─────────────────────────────────────────────────────────────
    const getCanvasCoordinates = (e, pageIdx) => {
        const canvas = overlayCanvasRefs.current[pageIdx] || e.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const touch = (e.touches && e.touches.length > 0)
            ? e.touches[0]
            : ((e.changedTouches && e.changedTouches.length > 0) ? e.changedTouches[0] : null);
        const clientX = touch ? touch.clientX : (e.clientX ?? 0);
        const clientY = touch ? touch.clientY : (e.clientY ?? 0);
        
        // Zero-shift normalized fractions (0.0 to 1.0)
        const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

        const basePtWidth = 612;
        const basePtHeight = 792;
        const x_pt = Math.round(normX * basePtWidth);
        const y_pt = Math.round(normY * basePtHeight);

        return {
            normX,
            normY,
            x: x_pt,
            y: y_pt,
            screenX: clientX - rect.left,
            screenY: clientY - rect.top,
            rectWidth: rect.width,
            rectHeight: rect.height
        };
    };

    // Continuous Pencil-Style Segment Eraser Algorithm (Point 5)
    const eraseSegmentAtPoint = (coords, pageIdx, targetPageId) => {
        const eraserRadius = eraserSize || 14;
        let anyModified = false;

        setAnnotations(prev => {
            let changed = false;
            const nextAnnotations = [];

            for (const a of prev) {
                const matches = a.pageId ? a.pageId === targetPageId : a.pageIndex === pageIdx;
                if (!matches || a.type !== 'draw' || !Array.isArray(a.points) || a.points.length === 0) {
                    nextAnnotations.push(a);
                    continue;
                }

                // Check if any point is within eraserRadius
                const hitPoint = a.points.some(pt => {
                    const px = pt.normX !== undefined ? pt.normX * 612 : pt.x;
                    const py = pt.normY !== undefined ? pt.normY * 792 : pt.y;
                    const ex = coords.normX !== undefined ? coords.normX * 612 : coords.x;
                    const ey = coords.normY !== undefined ? coords.normY * 792 : coords.y;
                    return Math.hypot(px - ex, py - ey) <= eraserRadius;
                });

                if (!hitPoint) {
                    nextAnnotations.push(a);
                    continue;
                }

                changed = true;
                anyModified = true;

                // Split the points array into contiguous surviving segments
                const survivingSegments = [];
                let curSegment = [];

                for (const pt of a.points) {
                    const px = pt.normX !== undefined ? pt.normX * 612 : pt.x;
                    const py = pt.normY !== undefined ? pt.normY * 792 : pt.y;
                    const ex = coords.normX !== undefined ? coords.normX * 612 : coords.x;
                    const ey = coords.normY !== undefined ? coords.normY * 792 : coords.y;
                    const dist = Math.hypot(px - ex, py - ey);

                    if (dist > eraserRadius) {
                        curSegment.push(pt);
                    } else {
                        if (curSegment.length >= 2) {
                            survivingSegments.push(curSegment);
                        }
                        curSegment = [];
                    }
                }
                if (curSegment.length >= 2) {
                    survivingSegments.push(curSegment);
                }

                if (survivingSegments.length > 0) {
                    nextAnnotations.push({
                        ...a,
                        points: survivingSegments[0]
                    });
                    for (let sIdx = 1; sIdx < survivingSegments.length; sIdx++) {
                        nextAnnotations.push({
                            ...a,
                            id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${sIdx}`,
                            points: survivingSegments[sIdx]
                        });
                    }
                }
                // If survivingSegments.length === 0, the entire stroke was erased!
            }

            if (changed) {
                erasedAnyRef.current = true;
                return nextAnnotations;
            }
            return prev;
        });

        return anyModified;
    };

    // Marquee Area Selection (Select OCR & Copy Select)
    const handleMarqueeAreaSelect = async (pageIdx, normX1, normY1, normX2, normY2, mode) => {
        const targetPage = pages[pageIdx];
        if (!targetPage) return;

        let extractedText = '';

        // 1. Try extracting selectable text via PDF.js getTextContent
        try {
            const sourceDoc = sourceDocs.find(d => d.id === targetPage.sourceDocId) || sourceDocs[targetPage.docIndex] || sourceDocs[0];
            if (sourceDoc?.pdfDoc) {
                const pdfPage = await sourceDoc.pdfDoc.getPage(targetPage.originalPageNum);
                const viewport = pdfPage.getViewport({ scale: 1, rotation: targetPage.rotation || 0 });
                const textContent = await pdfPage.getTextContent();

                const xMin = Math.min(normX1, normX2) * viewport.width;
                const xMax = Math.max(normX1, normX2) * viewport.width;
                const yMin = Math.min(normY1, normY2) * viewport.height;
                const yMax = Math.max(normY1, normY2) * viewport.height;

                const collectedWords = [];
                for (const item of textContent.items) {
                    if (!item.str || !item.str.trim()) continue;
                    const itmX = item.transform[4];
                    const itmY = item.transform[5];
                    const itmH = Math.abs(item.transform[3]) || item.height || 12;
                    const itmW = item.width || (item.str.length * itmH * 0.6);

                    // Word-level precision containment: slice item.str into words and check individual bounding boxes
                    const wordRegex = /\S+/g;
                    let match;
                    while ((match = wordRegex.exec(item.str)) !== null) {
                        const wordText = match[0];
                        const sIdx = match.index;
                        const wLen = wordText.length;
                        const fracStart = sIdx / Math.max(1, item.str.length);
                        const fracEnd = (sIdx + wLen) / Math.max(1, item.str.length);

                        const userXStart = itmX + (fracStart * itmW);
                        const userXEnd = itmX + (fracEnd * itmW);

                        let vxStart, vyStart, vxEnd, vyEnd;
                        if (typeof viewport.convertToViewportPoint === 'function') {
                            [vxStart, vyStart] = viewport.convertToViewportPoint(userXStart, itmY);
                            [vxEnd, vyEnd] = viewport.convertToViewportPoint(userXEnd, itmY);
                        } else {
                            vxStart = userXStart;
                            vyStart = viewport.height - itmY;
                            vxEnd = userXEnd;
                            vyEnd = viewport.height - itmY;
                        }

                        const wMinX = Math.min(vxStart, vxEnd);
                        const wMaxX = Math.max(vxStart, vxEnd);
                        const wMinY = Math.min(vyStart, vyEnd) - itmH;
                        const wMaxY = Math.max(vyStart, vyEnd) + 2;

                        const centerVx = (wMinX + wMaxX) / 2;
                        const centerVy = (wMinY + wMaxY) / 2;

                        // Word center must fall strictly within the user marquee selection rectangle
                        if (centerVx >= xMin - 2 && centerVx <= xMax + 2 && centerVy >= yMin - 2 && centerVy <= yMax + 2) {
                            collectedWords.push({
                                text: wordText,
                                vx: wMinX,
                                vy: wMinY,
                                centerVy
                            });
                        }
                    }
                }

                if (collectedWords.length > 0) {
                    collectedWords.sort((a, b) => {
                        if (Math.abs(a.centerVy - b.centerVy) > 6) {
                            return a.centerVy - b.centerVy;
                        }
                        return a.vx - b.vx;
                    });

                    const lines = [];
                    let curLine = [];
                    let curLineY = null;
                    for (const w of collectedWords) {
                        if (curLineY === null || Math.abs(w.centerVy - curLineY) <= 6) {
                            curLine.push(w.text);
                            curLineY = w.centerVy;
                        } else {
                            lines.push(curLine.join(' '));
                            curLine = [w.text];
                            curLineY = w.centerVy;
                        }
                    }
                    if (curLine.length > 0) lines.push(curLine.join(' '));
                    extractedText = lines.join('\n').trim();
                }
            }
        } catch (err) {
            console.warn('TextContent extraction error:', err);
        }

        // 2. If no text detected (e.g. image / scanned PDF), crop canvas region and use Multimodal Vision OCR
        if (!extractedText) {
            try {
                const container = document.getElementById(`pdf-page-${pageIdx}`);
                const canvas = container ? container.querySelector('canvas') : null;
                if (canvas) {
                    const x = Math.min(normX1, normX2) * canvas.width;
                    const y = Math.min(normY1, normY2) * canvas.height;
                    const w = Math.abs(normX2 - normX1) * canvas.width;
                    const h = Math.abs(normY2 - normY1) * canvas.height;

                    if (w > 10 && h > 10) {
                        const cropCanvas = document.createElement('canvas');
                        cropCanvas.width = Math.max(1, Math.round(w));
                        cropCanvas.height = Math.max(1, Math.round(h));
                        const cropCtx = cropCanvas.getContext('2d');
                        cropCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
                        const croppedBase64 = cropCanvas.toDataURL('image/jpeg', 0.9);

                        toast.loading('Analyzing area with OCR Vision...', { id: 'marquee-ocr' });
                        const res = await api.post('/office/pdf/ocr-vision', {
                            pageImages: [croppedBase64]
                        });
                        toast.dismiss('marquee-ocr');
                        if (res.data?.data?.text) {
                            extractedText = res.data.data.text.trim();
                        }
                    }
                }
            } catch (err) {
                console.error('Vision OCR crop error:', err);
                toast.dismiss('marquee-ocr');
            }
        }

        if (!extractedText) {
            toast('No text detected in selected area', { icon: 'ℹ️' });
            return;
        }

        const wordCount = extractedText.trim().split(/\s+/).length;
        const charCount = extractedText.length;

        if (mode === 'copy') {
            try {
                await navigator.clipboard.writeText(extractedText);
                toast.success(`Copied ${wordCount} words to clipboard!`, { icon: '📋' });
            } catch (e) {
                toast.error('Could not copy to clipboard');
            }
        } else {
            // mode === 'ocr'
            setOcrModalData({ text: extractedText, wordCount, charCount, pageNum: pageIdx + 1 });
            setShowOcrModal(true);
        }
    };

    const handleCanvasMouseDown = async (e, pageIdx) => {
        if (sourceDocs.length === 0) return;
        const targetPage = pages[pageIdx];
        if (!targetPage) return;
        setSelectedAnnotationPageIndex(pageIdx);

        const coords = getCanvasCoordinates(e, pageIdx);

        // Marquee Area Selection (Select OCR & Copy Select)
        if (activeTool === 'select' && (selectSubMode === 'ocr' || selectSubMode === 'copy')) {
            isDrawingRef.current = true;
            activeDrawPageRef.current = pageIdx;
            dragStartRef.current = coords;
            return;
        }

        if (activeTool === 'pen' || activeTool === 'highlighter') {
            isDrawingRef.current = true;
            activeDrawPageRef.current = pageIdx;
            currentStrokeRef.current = [coords];

            const canvas = overlayCanvasRefs.current[pageIdx];
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.beginPath();
                ctx.moveTo(coords.normX * canvas.width, coords.normY * canvas.height);
            }
        } else if (activeTool === 'shape') {
            isDrawingRef.current = true;
            activeDrawPageRef.current = pageIdx;
            dragStartRef.current = coords;
        } else if (activeTool === 'eraser') {
            // 1. Check if clicked directly on discrete item (shape, stamp, signature, text, or callout)
            const itemHit = annotations.find(a => {
                const matchPage = a.pageId ? a.pageId === targetPage.id : a.pageIndex === pageIdx;
                if (!matchPage || a.type === 'draw') return false;
                const ax = a.x || 0;
                const ay = a.y || 0;
                const aw = a.width || (a.type === 'stamp' ? 140 : a.type === 'signature' ? 170 : 150);
                const ah = a.height || 36;
                return coords.x >= ax && coords.x <= ax + aw && coords.y >= ay && coords.y <= ay + ah;
            });

            if (itemHit) {
                const updated = annotations.filter(a => a.id !== itemHit.id);
                setAnnotations(updated);
                pushHistory(pages, updated);
                toast.success('Erased item');
                return;
            }

            // 2. Continuous drag eraser for pencil/highlighter strokes
            isDrawingRef.current = true;
            activeDrawPageRef.current = pageIdx;
            erasedAnyRef.current = false;
            eraseSegmentAtPoint(coords, pageIdx, targetPage.id);
        } else if (activeTool === 'text') {
            // 1. Check if clicked on an EXISTING text box to edit it directly instead of creating duplicate
            const existingHit = annotations.find(a => {
                const matchPage = a.pageId ? a.pageId === targetPage.id : a.pageIndex === pageIdx;
                if (!matchPage || a.type !== 'text') return false;
                const ax = a.x || 0;
                const ay = a.y || 0;
                const aw = a.width || 180;
                const ah = a.height || 48;
                return coords.x >= (ax - 10) && coords.x <= (ax + aw + 10) && coords.y >= (ay - 10) && coords.y <= (ay + ah + 10);
            });

            if (existingHit) {
                setSelectedTextBoxId(existingHit.id);
                setAnnotations(prev => prev.map(a => a.id === existingHit.id ? { ...a, isEditing: true } : a));
                return;
            }

            // 2. Format Auto-Detection from Nearest PDF Text (Transparent overlay without destructive masking)
            let detected = null;
            try {
                const sourceDoc = sourceDocs.find(d => d.id === targetPage.sourceDocId) || sourceDocs[targetPage.docIndex] || sourceDocs[0];
                if (sourceDoc?.pdfDoc) {
                    const pdfPage = await sourceDoc.pdfDoc.getPage(targetPage.originalPageNum);
                    const viewport = pdfPage.getViewport({ scale: 1 });
                    const textContent = await pdfPage.getTextContent();

                    const clickPtX = coords.x;
                    const clickPtYFromBottom = viewport.height - coords.y;

                    let closestItem = null;
                    let minDist = 48;

                    for (const item of textContent.items) {
                        if (!item.str || !item.str.trim()) continue;
                        const itmX = item.transform[4];
                        const itmY = item.transform[5];
                        const itmH = Math.abs(item.transform[3]) || item.height || 12;
                        const itmW = item.width || (item.str.length * itmH * 0.6);

                        const insideX = clickPtX >= (itmX - 8) && clickPtX <= (itmX + itmW + 8);
                        const insideY = clickPtYFromBottom >= (itmY - 6) && clickPtYFromBottom <= (itmY + itmH + 6);

                        if (insideX && insideY) {
                            closestItem = item;
                            break;
                        }

                        const itmCenterX = itmX + itmW / 2;
                        const itmCenterY = itmY + itmH / 2;
                        const dist = Math.hypot(clickPtX - itmCenterX, clickPtYFromBottom - itmCenterY);
                        if (dist < minDist) {
                            minDist = dist;
                            closestItem = item;
                        }
                    }

                    if (closestItem) {
                        const fontRef = (closestItem.fontName + ' ' + (textContent.styles?.[closestItem.fontName]?.fontFamily || '')).toLowerCase();
                        let detectedFamily = 'Helvetica';
                        if (fontRef.includes('times') || fontRef.includes('serif')) {
                            detectedFamily = 'Times-Roman';
                        } else if (fontRef.includes('courier') || fontRef.includes('mono')) {
                            detectedFamily = 'Courier';
                        } else if (fontRef.includes('roboto')) {
                            detectedFamily = 'Roboto';
                        } else if (fontRef.includes('open sans')) {
                            detectedFamily = 'Open Sans';
                        } else if (fontRef.includes('lato')) {
                            detectedFamily = 'Lato';
                        } else if (fontRef.includes('montserrat')) {
                            detectedFamily = 'Montserrat';
                        } else if (fontRef.includes('georgia')) {
                            detectedFamily = 'Georgia';
                        } else if (fontRef.includes('playfair')) {
                            detectedFamily = 'Playfair Display';
                        } else if (fontRef.includes('merriweather')) {
                            detectedFamily = 'Merriweather';
                        } else if (fontRef.includes('inter')) {
                            detectedFamily = 'Inter';
                        }

                        const isBold = fontRef.includes('bold') || fontRef.includes('black') || fontRef.includes('heavy') || fontRef.includes('700') || fontRef.includes('800') || fontRef.includes('900');
                        const isItalic = fontRef.includes('italic') || fontRef.includes('oblique');
                        const fontSize = Math.max(9, Math.round(Math.abs(closestItem.transform[3]) || closestItem.height || 14));

                        detected = {
                            fontSize,
                            fontFamily: detectedFamily,
                            bold: isBold,
                            italic: isItalic,
                            color: '#0f172a'
                        };
                    }
                }
            } catch (err) {
                console.warn('[PDF Studio] Font auto-detection:', err);
            }

            const chosenFont = detected ? detected.fontFamily : (activeFontFamily || 'Helvetica');
            const chosenSize = detected ? detected.fontSize : (activeFontSize || 14);
            const chosenBold = detected ? detected.bold : activeBold;
            const chosenItalic = detected ? detected.italic : activeItalic;
            const chosenColor = detected ? detected.color : (activeTextColor || '#0f172a');

            const newTextAnn = {
                id: `ann_text_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                pageId: targetPage.id,
                pageIndex: pageIdx,
                type: 'text',
                text: 'Type text here...',
                fontSize: chosenSize,
                fontFamily: chosenFont,
                bold: chosenBold,
                italic: chosenItalic,
                color: chosenColor,
                maskOriginal: false, // Clean transparent overlay, never masks original PDF text
                isEditing: true,
                normX: coords.normX,
                normY: coords.normY,
                x: coords.x,
                y: coords.y,
                width: 160,
                height: Math.max(32, Math.round(chosenSize * 1.8))
            };
            const updated = [...annotations, newTextAnn];
            setAnnotations(updated);
            pushHistory(pages, updated);
            setSelectedTextBoxId(newTextAnn.id);

            // Synchronize detected format with main toolbar controls
            setActiveFontFamily(chosenFont);
            setActiveFontSize(chosenSize);
            setActiveBold(chosenBold);
            setActiveItalic(chosenItalic);
            setActiveTextColor(chosenColor);

            if (detected) {
                toast.success(`Applied detected format: ${chosenFont} ${chosenSize}pt (${chosenBold ? 'Bold ' : ''}${chosenItalic ? 'Italic' : ''})`, { icon: '✨' });
            } else {
                toast.success('Text field placed! Type your text.');
            }
        } else if (activeTool === 'stamp') {
            const dateStr = stampIncludeDate ? ` • ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}` : '';
            const stampFinalText = `${stampType}${dateStr}`;
            const stampColor = stampType.includes('REJECT') ? '#dc2626' : (stampType.includes('GRADED') || stampType.includes('VERIFIED') || stampType.includes('APPROVED')) ? '#059669' : '#2563eb';
            const stampW = stampIncludeDate ? 175 : 140;
            const stampH = 46;
            const stampImgDataUrl = generateStampImageDataUrl(stampFinalText, stampColor, stampW, stampH);

            const newAnn = {
                id: `ann_stamp_${Date.now()}`,
                pageId: targetPage.id,
                pageIndex: pageIdx,
                type: 'stamp',
                stampKind: 'text',
                text: stampFinalText,
                color: stampColor,
                normX: coords.normX,
                normY: coords.normY,
                x: coords.x,
                y: coords.y,
                width: stampW,
                height: stampH,
                imageDataUrl: stampImgDataUrl
            };
            const updated = [...annotations, newAnn];
            setAnnotations(updated);
            pushHistory(pages, updated);
            toast.success(`Placed "${stampFinalText}" stamp!`);
        } else if (activeTool === 'callout') {
            const newCallout = {
                id: `ann_callout_${Date.now()}_${Math.random()}`,
                pageId: targetPage.id,
                pageIndex: pageIdx,
                type: 'callout',
                calloutType: activeCalloutType || 'speech',
                text: 'Note: review here',
                color: penColor || '#e11d48',
                normX: Math.min(0.82, coords.normX),
                normY: Math.min(0.85, coords.normY),
                width: 140,
                height: 48,
                targetNormX: Math.max(0.02, coords.normX - 0.08),
                targetNormY: Math.min(0.95, coords.normY + 0.08),
                targetX: Math.round(Math.max(10, coords.x - 45)),
                targetY: Math.round(coords.y + 45),
                x: coords.x,
                y: coords.y
            };
            const updated = [...annotations, newCallout];
            setAnnotations(updated);
            pushHistory(pages, updated);
            setSelectedCalloutId(newCallout.id);
            toast.success('Added callout note! Drag pointer tip or box.');
        } else if (activeTool === 'signature') {
            setShowSignatureModal(true);
        } else if (activeTool === 'redact') {
            isDrawingRef.current = true;
            activeDrawPageRef.current = pageIdx;
            dragStartRef.current = coords;
        }
    };

    const handleCanvasMouseMove = (e, pageIdx) => {
        const activeIdx = pageIdx !== undefined ? pageIdx : activeDrawPageRef.current;
        if (!isDrawingRef.current || activeDrawPageRef.current !== activeIdx) return;
        const canvas = overlayCanvasRefs.current[activeIdx];
        if (!canvas) return;

        const coords = getCanvasCoordinates(e, activeIdx);
        const ctx = canvas.getContext('2d');
        const scaleFactor = canvas.width / 612;

        const bufX = coords.normX * canvas.width;
        const bufY = coords.normY * canvas.height;

        if (activeTool === 'select' && (selectSubMode === 'ocr' || selectSubMode === 'copy') && dragStartRef.current) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const startX = dragStartRef.current.normX * canvas.width;
            const startY = dragStartRef.current.normY * canvas.height;
            const curX = bufX;
            const curY = bufY;
            const rectX = Math.min(startX, curX);
            const rectY = Math.min(startY, curY);
            const rectW = Math.abs(curX - startX);
            const rectH = Math.abs(curY - startY);

            ctx.save();
            ctx.strokeStyle = selectSubMode === 'ocr' ? '#6366f1' : '#059669';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.fillStyle = selectSubMode === 'ocr' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(5, 150, 105, 0.15)';
            ctx.fillRect(rectX, rectY, rectW, rectH);
            ctx.strokeRect(rectX, rectY, rectW, rectH);
            ctx.restore();
            return;
        } else if (activeTool === 'eraser') {
            const targetPage = pages[activeIdx];
            if (targetPage) {
                eraseSegmentAtPoint(coords, activeIdx, targetPage.id);
            }
            return;
        } else if (activeTool === 'pen') {
            const prev = currentStrokeRef.current[currentStrokeRef.current.length - 1] || coords;
            const prevBufX = prev.normX * canvas.width;
            const prevBufY = prev.normY * canvas.height;
            currentStrokeRef.current.push(coords);
            ctx.strokeStyle = penColor;
            ctx.lineWidth = Math.max(1, (penWidth || 2) * scaleFactor);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.moveTo(prevBufX, prevBufY);
            ctx.lineTo(bufX, bufY);
            ctx.stroke();
        } else if (activeTool === 'highlighter') {
            const prev = currentStrokeRef.current[currentStrokeRef.current.length - 1] || coords;
            const prevBufX = prev.normX * canvas.width;
            const prevBufY = prev.normY * canvas.height;
            currentStrokeRef.current.push(coords);
            ctx.strokeStyle = highlighterColor;
            ctx.lineWidth = Math.max(8, (highlighterWidth || 16) * scaleFactor);
            ctx.lineCap = 'square';
            ctx.lineJoin = 'miter';
            ctx.globalAlpha = 0.40;
            ctx.beginPath();
            ctx.moveTo(prevBufX, prevBufY);
            ctx.lineTo(bufX, bufY);
            ctx.stroke();
        } else if (activeTool === 'shape' && dragStartRef.current) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = penColor;
            ctx.lineWidth = Math.max(1, (penWidth || 2) * scaleFactor);
            ctx.globalAlpha = 1;

            let startX = dragStartRef.current.normX * canvas.width;
            let startY = dragStartRef.current.normY * canvas.height;
            let curX = bufX;
            let curY = bufY;

            // Vector horizontal/vertical snapping:
            if (selectedShape === 'line' || selectedShape === 'arrow') {
                if (Math.abs(curY - startY) < 14) curY = startY;
                else if (Math.abs(curX - startX) < 14) curX = startX;
            }

            if (selectedShape === 'rectangle') {
                const rx = Math.min(startX, curX);
                const ry = Math.min(startY, curY);
                const rw = Math.abs(curX - startX);
                const rh = Math.abs(curY - startY);
                ctx.strokeRect(rx, ry, rw, rh);
            } else if (selectedShape === 'ellipse') {
                const rx = Math.min(startX, curX);
                const ry = Math.min(startY, curY);
                const rw = Math.abs(curX - startX);
                const rh = Math.abs(curY - startY);
                ctx.beginPath();
                ctx.ellipse(rx + rw / 2, ry + rh / 2, Math.abs(rw / 2), Math.abs(rh / 2), 0, 0, 2 * Math.PI);
                ctx.stroke();
            } else if (selectedShape === 'line') {
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(curX, curY);
                ctx.stroke();
            } else if (selectedShape === 'arrow') {
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(curX, curY);
                ctx.stroke();

                const angle = Math.atan2(curY - startY, curX - startX);
                const headLen = Math.max(12, 16 * scaleFactor);
                ctx.beginPath();
                ctx.moveTo(curX, curY);
                ctx.lineTo(
                    curX - headLen * Math.cos(angle - Math.PI / 6),
                    curY - headLen * Math.sin(angle - Math.PI / 6)
                );
                ctx.lineTo(
                    curX - headLen * Math.cos(angle + Math.PI / 6),
                    curY - headLen * Math.sin(angle + Math.PI / 6)
                );
                ctx.closePath();
                ctx.fillStyle = ctx.strokeStyle;
                ctx.fill();
            }
        }
    };

    const handleCanvasMouseUp = (e, pageIdx) => {
        if (!isDrawingRef.current) return;
        const activeIdx = pageIdx !== undefined ? pageIdx : activeDrawPageRef.current;
        isDrawingRef.current = false;
        activeDrawPageRef.current = null;

        const canvas = overlayCanvasRefs.current[activeIdx];
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        const targetPage = pages[activeIdx];
        if (!targetPage) return;

        // Complete Marquee Area Selection (Select OCR & Copy Select)
        if (activeTool === 'select' && (selectSubMode === 'ocr' || selectSubMode === 'copy') && dragStartRef.current) {
            const ds = dragStartRef.current;
            const endCoords = getCanvasCoordinates(e, activeIdx);
            dragStartRef.current = null;
            const normX1 = Math.min(ds.normX, endCoords.normX);
            const normY1 = Math.min(ds.normY, endCoords.normY);
            const normX2 = Math.max(ds.normX, endCoords.normX);
            const normY2 = Math.max(ds.normY, endCoords.normY);
            if (Math.abs(normX2 - normX1) > 0.01 && Math.abs(normY2 - normY1) > 0.01) {
                handleMarqueeAreaSelect(activeIdx, normX1, normY1, normX2, normY2, selectSubMode);
            }
            return;
        }

        // Complete Eraser drag session
        if (activeTool === 'eraser') {
            if (erasedAnyRef.current) {
                pushHistory(pages, annotations);
            }
            erasedAnyRef.current = false;
            return;
        }

        if ((activeTool === 'pen' || activeTool === 'highlighter') && currentStrokeRef.current.length > 1) {
            const newStroke = {
                id: `ann_draw_${Date.now()}_${Math.random()}`,
                pageId: targetPage.id,
                pageIndex: activeIdx,
                type: 'draw',
                points: currentStrokeRef.current.map(p => ({
                    normX: p.normX,
                    normY: p.normY,
                    x: p.x,
                    y: p.y
                })),
                color: activeTool === 'highlighter' ? highlighterColor : penColor,
                strokeWidth: activeTool === 'highlighter' ? (highlighterWidth || 16) : (penWidth || 2),
                opacity: activeTool === 'highlighter' ? 0.45 : 1
            };
            const updated = [...annotations, newStroke];
            setAnnotations(updated);
            pushHistory(pages, updated);
            currentStrokeRef.current = [];
        } else if (activeTool === 'shape' && dragStartRef.current) {
            const ds = dragStartRef.current;
            const endCoords = getCanvasCoordinates(e, activeIdx);

            let curNormX = endCoords.normX;
            let curNormY = endCoords.normY;
            let curXPt = endCoords.x;
            let curYPt = endCoords.y;

            // Snapping check
            if (selectedShape === 'line' || selectedShape === 'arrow') {
                if (Math.abs(curYPt - ds.y) < 14) {
                    curYPt = ds.y;
                    curNormY = ds.normY;
                } else if (Math.abs(curXPt - ds.x) < 14) {
                    curXPt = ds.x;
                    curNormX = ds.normX;
                }
            }

            const wPt = Math.abs(curXPt - ds.x);
            const hPt = Math.abs(curYPt - ds.y);

            if (wPt > 5 || hPt > 5) {
                const newShape = {
                    id: `ann_shape_${Date.now()}_${Math.random()}`,
                    pageId: targetPage.id,
                    pageIndex: activeIdx,
                    type: 'shape',
                    shapeType: selectedShape,
                    normX: Math.min(ds.normX, curNormX),
                    normY: Math.min(ds.normY, curNormY),
                    normWidth: Math.max(0.015, Math.abs(curNormX - ds.normX)),
                    normHeight: Math.max(0.015, Math.abs(curNormY - ds.normY)),
                    normX1: ds.normX,
                    normY1: ds.normY,
                    normX2: curNormX,
                    normY2: curNormY,
                    x1: ds.x,
                    y1: ds.y,
                    x2: curXPt,
                    y2: curYPt,
                    x: Math.min(ds.x, curXPt),
                    y: Math.min(ds.y, curYPt),
                    width: Math.max(10, wPt),
                    height: Math.max(10, hPt),
                    color: penColor,
                    strokeWidth: shapeStrokeWidth || penWidth || 2,
                    fill: shapeFill || 'none'
                };
                const updated = [...annotations, newShape];
                setAnnotations(updated);
                pushHistory(pages, updated);
                setSelectedShapeId(newShape.id);
                toast.success(`Inserted ${selectedShape}. Drag or resize to adjust.`);
            }
            dragStartRef.current = null;
        } else if (activeTool === 'redact' && dragStartRef.current) {
            const ds = dragStartRef.current;
            const endCoords = getCanvasCoordinates(e, activeIdx);
            const wPt = Math.abs(endCoords.x - ds.x);
            const hPt = Math.abs(endCoords.y - ds.y);

            if (wPt > 5 || hPt > 5) {
                const newRedact = {
                    id: `ann_redact_${Date.now()}_${Math.random()}`,
                    pageId: targetPage.id,
                    pageIndex: activeIdx,
                    type: 'redact',
                    normX: Math.min(ds.normX, endCoords.normX),
                    normY: Math.min(ds.normY, endCoords.normY),
                    x: Math.min(ds.x, endCoords.x),
                    y: Math.min(ds.y, endCoords.y),
                    width: Math.max(20, wPt),
                    height: Math.max(10, hPt)
                };
                const updated = [...annotations, newRedact];
                setAnnotations(updated);
                pushHistory(pages, updated);
                toast.success('Added redaction block');
            }
            dragStartRef.current = null;
        }
    };

    // Text search through PDF pages with detection & bounding box coordinates for highlight & minimap
    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (!query || query.trim().length < 2) {
            setSearchMatches([]);
            setCurrentMatchIdx(0);
            return;
        }
        const cleanQ = query.trim().toLowerCase();
        const matches = [];

        // High precision font measuring canvas context for proportional kerning
        let measureCanvas = null;
        let measureCtx = null;
        if (typeof document !== 'undefined') {
            try {
                measureCanvas = document.createElement('canvas');
                measureCtx = measureCanvas.getContext('2d');
            } catch {}
        }

        // Fallback weighted character metric for proportional text coverage
        const getCharWeight = (ch) => {
            if (ch === ' ' || ch === '\t') return 0.28;
            if (/[il1.,;:!'|\`\(\)\[\]\{\}\-]/.test(ch)) return 0.28;
            if (/[frtI]/.test(ch)) return 0.38;
            if (/[mwMW]/.test(ch)) return 0.95;
            if (/[A-Z]/.test(ch)) return 0.72;
            if (/[0-9]/.test(ch)) return 0.55;
            return 0.52;
        };

        for (let pIdx = 0; pIdx < pages.length; pIdx++) {
            const p = pages[pIdx];
            const srcDoc = sourceDocs[p.docIndex] || sourceDocs[0];
            if (!srcDoc?.pdfDoc) continue;
            try {
                const page = await srcDoc.pdfDoc.getPage(p.originalPageNum);
                const rot = ((p.rotation || 0) + (page.rotate || 0)) % 360;
                const viewport = page.getViewport({ scale: 1, rotation: rot });
                const textContent = await page.getTextContent();
                const styles = textContent.styles || {};

                let matchCounterOnPage = 0;
                for (const item of textContent.items) {
                    if (!item.str || !item.str.trim()) continue;
                    const itemLower = item.str.toLowerCase();
                    let matchIdx = itemLower.indexOf(cleanQ);
                    while (matchIdx !== -1) {
                        const matchLen = cleanQ.length;
                        const itmX = item.transform[4];
                        const itmY = item.transform[5];
                        const fontH = Math.hypot(item.transform[2], item.transform[3]) || Math.abs(item.transform[3]) || item.height || 12;
                        const itmW = item.width || (item.str.length * fontH * 0.55);
                        const style = styles[item.fontName];

                        const prefixStr = item.str.substring(0, matchIdx);
                        const matchStr = item.str.substring(matchIdx, matchIdx + matchLen);

                        let prefixX = 0;
                        let matchW = 0;
                        let measuredWithCanvas = false;

                        if (measureCtx) {
                            try {
                                const fontFamily = style?.fontFamily || 'sans-serif';
                                measureCtx.font = `${Math.round(fontH)}px ${fontFamily}`;
                                const totalM = measureCtx.measureText(item.str).width;
                                const prefixM = measureCtx.measureText(prefixStr).width;
                                const matchM = measureCtx.measureText(matchStr).width;
                                if (totalM > 0) {
                                    const ratio = itmW / totalM;
                                    prefixX = prefixM * ratio;
                                    matchW = matchM * ratio;
                                    measuredWithCanvas = true;
                                }
                            } catch {}
                        }

                        if (!measuredWithCanvas) {
                            let totalW = 0;
                            for (let c = 0; c < item.str.length; c++) totalW += getCharWeight(item.str[c]);
                            if (totalW <= 0) totalW = item.str.length;
                            let pW = 0;
                            for (let c = 0; c < matchIdx; c++) pW += getCharWeight(item.str[c]);
                            let mW = 0;
                            for (let c = matchIdx; c < matchIdx + matchLen; c++) mW += getCharWeight(item.str[c]);

                            prefixX = (pW / totalW) * itmW;
                            matchW = (mW / totalW) * itmW;
                        }

                        // Horizontal cushion padding (1.5pt or 2% word width) so glyph borders are never clipped
                        const padX = Math.max(1.5, matchW * 0.02);
                        const matchX1 = itmX + prefixX - padX;
                        const matchX2 = itmX + prefixX + matchW + padX;

                        // Vertical coverage using font ascent and descent metrics
                        // In PDF space, ascent is positive (above baseline) and descent is negative (below baseline)
                        const ascent = style?.ascent !== undefined && style.ascent > 0 ? style.ascent : 0.85;
                        const descent = style?.descent !== undefined && style.descent < 0 ? style.descent : -0.25;

                        // Vertical padding cushion so capitals and descenders (g, y, p, q, j) are completely covered
                        const padY = fontH * 0.10;
                        const matchY_bottom = itmY + (fontH * descent) - padY;
                        const matchY_top = itmY + (fontH * ascent) + padY;

                        const rect = viewport.convertToViewportRectangle([matchX1, matchY_bottom, matchX2, matchY_top]);
                        const vLeft = Math.min(rect[0], rect[2]);
                        const vTop = Math.min(rect[1], rect[3]);
                        const vWidth = Math.max(8, Math.abs(rect[0] - rect[2]));
                        const vHeight = Math.max(10, Math.abs(rect[1] - rect[3]));

                        const normX = Math.max(0, Math.min(0.999, vLeft / viewport.width));
                        const normY = Math.max(0, Math.min(0.999, vTop / viewport.height));
                        const normW = Math.max(0.005, Math.min(1 - normX, vWidth / viewport.width));
                        const normH = Math.max(0.008, Math.min(1 - normY, vHeight / viewport.height));

                        matches.push({
                            id: `match_${pIdx}_${matchCounterOnPage++}`,
                            pageIndex: pIdx,
                            pageNum: pIdx + 1,
                            normX,
                            normY,
                            normWidth: normW,
                            normHeight: normH,
                            str: item.str,
                            snippet: item.str.length > 50 ? item.str.substring(0, 50) + '...' : item.str
                        });

                        matchIdx = itemLower.indexOf(cleanQ, matchIdx + matchLen);
                    }
                }
            } catch (err) {
                console.warn('[PDF Studio] Search extraction error:', err);
            }
        }

        setSearchMatches(matches);
        setCurrentMatchIdx(0);
        if (matches.length > 0) {
            setTimeout(() => {
                const matchEl = document.getElementById(`search-match-${matches[0].id}`);
                if (matchEl) {
                    matchEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    document.getElementById(`pdf-page-${matches[0].pageIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 80);
        }
    };

    const goToNextMatch = () => {
        if (searchMatches.length === 0) return;
        const nextIdx = (currentMatchIdx + 1) % searchMatches.length;
        setCurrentMatchIdx(nextIdx);
        const m = searchMatches[nextIdx];
        if (m) {
            setSelectedAnnotationPageIndex(m.pageIndex);
            setPageJumpInput(String(m.pageIndex + 1));
            setTimeout(() => {
                const matchEl = document.getElementById(`search-match-${m.id}`);
                if (matchEl) {
                    matchEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    document.getElementById(`pdf-page-${m.pageIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 60);
        }
    };

    const goToPrevMatch = () => {
        if (searchMatches.length === 0) return;
        const prevIdx = (currentMatchIdx - 1 + searchMatches.length) % searchMatches.length;
        setCurrentMatchIdx(prevIdx);
        const m = searchMatches[prevIdx];
        if (m) {
            setSelectedAnnotationPageIndex(m.pageIndex);
            setPageJumpInput(String(m.pageIndex + 1));
            setTimeout(() => {
                const matchEl = document.getElementById(`search-match-${m.id}`);
                if (matchEl) {
                    matchEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    document.getElementById(`pdf-page-${m.pageIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 60);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // Save Direct to Office Media Files & Page Extraction Helpers
    // ─────────────────────────────────────────────────────────────
    const formatRanges = (nums) => {
        if (!nums || nums.length === 0) return '';
        const sorted = [...new Set(nums)].sort((a, b) => a - b);
        const ranges = [];
        let start = sorted[0], end = sorted[0];
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] === end + 1) {
                end = sorted[i];
            } else {
                ranges.push(start === end ? `${start}` : `${start}-${end}`);
                start = sorted[i];
                end = sorted[i];
            }
        }
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        return ranges.join(', ');
    };

    const parseRanges = (str, max) => {
        if (!str || !str.trim()) return [];
        const parts = str.split(',').map(s => s.trim()).filter(Boolean);
        const result = new Set();
        parts.forEach(part => {
            if (part.includes('-')) {
                const [s, e] = part.split('-').map(n => parseInt(n.trim(), 10));
                if (!isNaN(s) && !isNaN(e)) {
                    for (let i = Math.min(s, e); i <= Math.max(s, e); i++) {
                        if (i >= 1 && i <= max) result.add(i);
                    }
                }
            } else {
                const n = parseInt(part, 10);
                if (!isNaN(n) && n >= 1 && n <= max) result.add(n);
            }
        });
        return Array.from(result).sort((a, b) => a - b);
    };

    const handleToggleExtractPage = (pageNum) => {
        setSelectedExtractPages(prev => {
            const next = prev.includes(pageNum) ? prev.filter(n => n !== pageNum) : [...prev, pageNum].sort((a, b) => a - b);
            setSplitRange(formatRanges(next));
            return next;
        });
    };

    const handleSelectAllExtractPages = () => {
        if (selectedExtractPages.length === pages.length) {
            setSelectedExtractPages([]);
            setSplitRange('');
        } else {
            const all = pages.map((_, i) => i + 1);
            setSelectedExtractPages(all);
            setSplitRange(pages.length > 1 ? `1-${pages.length}` : '1');
        }
    };

    const handleSplitRangeChange = (val) => {
        setSplitRange(val);
        const parsed = parseRanges(val, pages.length);
        setSelectedExtractPages(parsed);
    };

    const handleExecuteExtractPages = async () => {
        if (selectedExtractPages.length === 0) {
            toast.error('Please select at least one page to extract');
            return;
        }
        const targetFile = activeFile || sourceDocs[0]?.file;
        if (!targetFile && sourceDocs.length === 0) {
            toast.error('Please upload a PDF file first');
            return;
        }
        setProcessing(true);
        renderCircularProgressToast(15, `Extracting ${selectedExtractPages.length} selected pages...`, 'Extracting Pages');
        try {
            const sortedPageNums = [...selectedExtractPages].sort((a, b) => a - b);
            const filteredPages = sortedPageNums.map(num => pages[num - 1]).filter(Boolean);

            const operations = filteredPages.map(p => ({
                docIndex: p.docIndex,
                sourceFileIndex: p.docIndex,
                pageIndex: p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex,
                sourcePageIndex: p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex,
                rotationDegrees: p.rotation || 0,
                rotation: p.rotation || 0,
                annotations: annotations.filter(a => a.pageId ? a.pageId === p.id : a.pageIndex === p.pageIndex)
            }));

            const formData = new FormData();
            sourceDocs.forEach(d => {
                if (d.file instanceof Blob || d.file instanceof File) {
                    formData.append('files', d.file, d.name || 'document.pdf');
                } else if (d.file) {
                    formData.append('files', new Blob([d.file], { type: 'application/pdf' }), d.name || 'document.pdf');
                }
            });
            if (!formData.has('files') && activeFile) {
                formData.append('files', activeFile, activeFileName);
            }
            if (!formData.has('files')) {
                toast.error('No source PDF file available to export');
                setProcessing(false);
                return;
            }
            formData.append('operations', JSON.stringify(operations));

            renderCircularProgressToast(45, 'Assembling extracted PDF pages...', 'Extracting Pages');

            const res = await api.post('/office/pdf/reorganize', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            // Convert extracted PDF blob to base64
            const base64Extracted = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(res.data);
            });

            // Trigger browser download of extracted PDF
            const downloadUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = downloadUrl;
            const primaryTitle = (sourceDocs[0]?.name || 'document').replace(/\.pdf$/i, '');
            a.download = `${primaryTitle}_extracted.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);

            renderCircularProgressToast(75, 'Storing extracted PDF in CloudVault > PDF Documents...', 'Saving to CloudVault');

            const extractFormData = new FormData();
            extractFormData.append('file', res.data, `${primaryTitle}_extracted.pdf`);
            extractFormData.append('docType', 'pdf');
            extractFormData.append('format', 'pdf');
            extractFormData.append('title', `${primaryTitle}_extracted`);
            extractFormData.append('folderName', 'PDF Documents');
            extractFormData.append('content', JSON.stringify({ pageCount: filteredPages.length, operations }));

            await api.post('/office/documents/save-to-media-files', extractFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            renderCircularProgressToast(100, `Extracted ${selectedExtractPages.length} pages and saved to CloudVault > PDF Documents!`, 'Extraction Complete', true);
        } catch (err) {
            console.error('Extract error:', err);
            renderCircularProgressToast(0, err.response?.data?.message || err.message || 'Failed to extract selected pages', 'Extraction Failed', false, true);
        } finally {
            setProcessing(false);
        }
    };


    const handleSaveToOfficeMediaFiles = async () => {
        if (sourceDocs.length === 0 || pages.length === 0) {
            toast.error('Please upload at least one PDF first');
            return;
        }
        setProcessing(true);
        setShowExportMenu(false);

        // Stage 1: Initializing
        renderCircularProgressToast(12, 'Preparing document and pages...');

        try {
            const operations = pages.map((p, outIdx) => ({
                docIndex: p.docIndex,
                sourceFileIndex: p.docIndex,
                pageIndex: p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex,
                sourcePageIndex: p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex,
                rotationDegrees: p.rotation || 0,
                rotation: p.rotation || 0,
                annotations: annotations
                    .filter(a => a.pageId ? a.pageId === p.id : a.pageIndex === (p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex))
                    .map(a => ({ ...a, pageIndex: outIdx }))
            }));

            // Stage 2: Packaging annotations and watermarks
            renderCircularProgressToast(35, 'Rendering vector layers and annotations...');

            const formData = new FormData();
            sourceDocs.forEach(d => {
                if (d.file instanceof Blob || d.file instanceof File) {
                    formData.append('files', d.file, d.name || 'document.pdf');
                } else if (d.file) {
                    formData.append('files', new Blob([d.file], { type: 'application/pdf' }), d.name || 'document.pdf');
                }
            });
            if (!formData.has('files') && activeFile) {
                formData.append('files', activeFile, activeFileName);
            }
            if (!formData.has('files')) {
                toast.error('No source PDF file available to export');
                setProcessing(false);
                return;
            }
            formData.append('operations', JSON.stringify(operations));

            if (appliedWatermarkText && appliedWatermarkText.trim()) {
                formData.append('watermarkText', appliedWatermarkText.trim());
                formData.append('watermarkColor', appliedWatermarkColor);
                formData.append('watermarkOpacity', String(watermarkOpacity));
            }
            if (appliedWatermarkImageDataUrl) {
                formData.append('watermarkImageDataUrl', appliedWatermarkImageDataUrl);
                formData.append('watermarkOpacity', String(watermarkOpacity));
            }

            // Stage 3: Compiling and assembling PDF
            renderCircularProgressToast(65, 'Reorganizing and compiling PDF...');

            const res = await api.post('/office/pdf/reorganize', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            // Stage 4: Transmitting binary PDF directly via multipart FormData (Fixes HTTP 413)
            renderCircularProgressToast(85, 'Storing in CloudVault > PDF Documents...');

            const primaryTitle = (sourceDocs[0]?.name || 'Document').replace(/\.pdf$/i, '');
            const saveFormData = new FormData();
            saveFormData.append('file', res.data, `${primaryTitle}.pdf`);
            saveFormData.append('docType', 'pdf');
            saveFormData.append('format', 'pdf');
            saveFormData.append('title', primaryTitle);
            saveFormData.append('folderName', 'PDF Documents');
            saveFormData.append('content', JSON.stringify({
                pageCount: pages.length,
                operations
            }));

            const saveRes = await api.post('/office/documents/save-to-media-files', saveFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (saveRes.data?.success) {
                // Stage 5: Success
                renderCircularProgressToast(100, 'Saved in CloudVault > PDF Documents!', true, false);
            } else {
                renderCircularProgressToast(0, saveRes.data?.message || 'Could not complete save', false, true);
            }
        } catch (err) {
            console.error('Save to media error:', err);
            renderCircularProgressToast(0, err.response?.data?.message || err.message || 'Failed to save', false, true);
        } finally {
            setProcessing(false);
        }
    };

    const handleExecutePrint = async () => {
        if (sourceDocs.length === 0 && pages.length === 0) {
            toast.error('No PDF pages to print');
            return;
        }
        setProcessing(true);
        toast.loading('Compiling crisp vector print stream...', { id: 'pdf-print' });
        try {
            const operations = pages.map((p, outIdx) => ({
                docIndex: p.docIndex,
                sourceFileIndex: p.docIndex,
                pageIndex: p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex,
                sourcePageIndex: p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex,
                rotationDegrees: p.rotation || 0,
                rotation: p.rotation || 0,
                annotations: printIncludeAnnotations
                    ? annotations
                        .filter(a => a.pageId ? a.pageId === p.id : a.pageIndex === (p.originalPageNum ? p.originalPageNum - 1 : p.pageIndex))
                        .map(a => ({ ...a, pageIndex: outIdx }))
                    : []
            }));

            const formData = new FormData();
            sourceDocs.forEach(d => {
                if (d.file instanceof Blob || d.file instanceof File) {
                    formData.append('files', d.file, d.name || 'document.pdf');
                } else if (d.file) {
                    formData.append('files', new Blob([d.file], { type: 'application/pdf' }), d.name || 'document.pdf');
                }
            });
            if (!formData.has('files') && activeFile) {
                formData.append('files', activeFile, activeFileName);
            }
            formData.append('operations', JSON.stringify(operations));

            if (printIncludeAnnotations) {
                if (appliedWatermarkText && appliedWatermarkText.trim()) {
                    formData.append('watermarkText', appliedWatermarkText.trim());
                    formData.append('watermarkColor', appliedWatermarkColor);
                    formData.append('watermarkOpacity', String(watermarkOpacity));
                }
                if (appliedWatermarkImageDataUrl) {
                    formData.append('watermarkImageDataUrl', appliedWatermarkImageDataUrl);
                    formData.append('watermarkOpacity', String(watermarkOpacity));
                }
            }

            const res = await api.post('/office/pdf/reorganize', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            const printBlob = new Blob([res.data], { type: 'application/pdf' });
            const blobUrl = window.URL.createObjectURL(printBlob);

            const printIframe = document.createElement('iframe');
            printIframe.style.position = 'fixed';
            printIframe.style.right = '0';
            printIframe.style.bottom = '0';
            printIframe.style.width = '0';
            printIframe.style.height = '0';
            printIframe.style.border = '0';
            printIframe.src = blobUrl;
            document.body.appendChild(printIframe);

            printIframe.onload = () => {
                try {
                    printIframe.contentWindow.focus();
                    printIframe.contentWindow.print();
                } catch (e) {
                    const win = window.open(blobUrl, '_blank');
                    win?.focus();
                    win?.print();
                }
                setTimeout(() => {
                    try { document.body.removeChild(printIframe); } catch (err) {}
                    window.URL.revokeObjectURL(blobUrl);
                }, 60000);
            };

            toast.success('Native PDF print dialog opened!', { id: 'pdf-print' });
            setShowPrintModal(false);
        } catch (err) {
            console.error('Print error:', err);
            toast.error('Failed to prepare document for printing', { id: 'pdf-print' });
        } finally {
            setProcessing(false);
        }
    };



    // Calculate metadata for Info popover
    const totalFileSizeMb = sourceDocs.reduce((acc, d) => acc + parseFloat(d.size || 0), 0).toFixed(2);

    
    // Pinned action toolbar and contextual ribbons inside wide container
    const renderActionToolbar = () => {
        // Exclusively determine active contextual ribbon (zero or one - Point 2)
        let activeRibbon = null;
        if (activeTab === 'edit-merge') {
            if (activeTool === 'select') {
                activeRibbon = null; // Strictly no context bar when Select tool is chosen
            } else if (showWatermarkBar) {
                activeRibbon = 'watermark';
            } else if (activeTool === 'pen') {
                activeRibbon = 'pen';
            } else if (activeTool === 'highlighter') {
                activeRibbon = 'highlighter';
            } else if (activeTool === 'shape' || selectedShapeId) {
                activeRibbon = 'shape';
            } else if (activeTool === 'eraser') {
                activeRibbon = 'eraser';
            }
        }

        return (
            activeTab === "edit-merge" && sourceDocs.length > 0 ? (
                <div className="absolute top-0 left-0 right-0 z-40 flex flex-col items-center pt-2 pb-1 px-2 pointer-events-none gap-1">
                {/* FLOATING ACTION TOOLBAR (Floating pill, rounded-2xl, auto-fading, tightly packed) */}
            {activeTab === 'edit-merge' && sourceDocs.length > 0 && (
                <div className="w-full flex justify-center py-1 px-2 sm:px-4 z-40 shrink-0 pointer-events-none">
                    <div
                        className={`pointer-events-auto rounded-2xl border shadow-xl backdrop-blur-md px-2.5 sm:px-3 py-1 flex items-center justify-between gap-1 sm:gap-1.5 max-w-full overflow-visible transition-all duration-300 ${
                            (activeTool !== 'select' || zoomMenuOpen || showExportMenu || stampMenuOpen || showWatermarkBar || selectedTextBoxId || selectedShapeId || selectedCalloutId)
                                ? 'opacity-100 shadow-2xl scale-100'
                                : 'opacity-40 hover:opacity-100 hover:shadow-2xl focus-within:opacity-100'
                        } ${
                            isDark
                                ? 'border-slate-600 bg-slate-900/95 text-white shadow-black/40 ring-1 ring-white/10'
                                : 'border-slate-300 bg-white/95 text-slate-800 shadow-slate-400/25 ring-1 ring-black/5'
                        }`}
                    >
                    {/* Left: Editable Page Jump & Zoom Controls */}
                    <div className="flex items-center gap-2">
                        {/* Editable Page Jump Input */}
                        <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                            <span className="hidden sm:inline">Page</span>
                            <input
                                type="text"
                                value={pageJumpInput}
                                onChange={(e) => setPageJumpInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handlePageJump(pageJumpInput);
                                        e.target.blur();
                                    }
                                }}
                                onBlur={() => handlePageJump(pageJumpInput)}
                                className={`w-10 text-center font-bold text-rose-500 rounded border px-1 py-0.5 text-xs focus:outline-none focus:border-rose-500 ${
                                    isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-300'
                                }`}
                                title="Type page number and press Enter to jump"
                            />
                            <span>/</span>
                            <span className="font-semibold text-slate-500">{pages.length}</span>
                        </div>

                        {/* Page Navigation Up / Down Buttons */}
                        <div className="flex items-center gap-0.5">
                            <button
                                type="button"
                                onClick={() => {
                                    const cur = parseInt(pageJumpInput, 10) || (selectedAnnotationPageIndex + 1) || 1;
                                    if (cur > 1) handlePageJump(cur - 1);
                                }}
                                disabled={((parseInt(pageJumpInput, 10) || 1) <= 1)}
                                className={`p-1 rounded-md border transition disabled:opacity-30 disabled:pointer-events-none ${
                                    isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                                }`}
                                title="Previous Page (Up Arrow)"
                            >
                                <ChevronUp size={13} />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const cur = parseInt(pageJumpInput, 10) || (selectedAnnotationPageIndex + 1) || 1;
                                    if (cur < pages.length) handlePageJump(cur + 1);
                                }}
                                disabled={((parseInt(pageJumpInput, 10) || 1) >= pages.length)}
                                className={`p-1 rounded-md border transition disabled:opacity-30 disabled:pointer-events-none ${
                                    isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                                }`}
                                title="Next Page (Down Arrow)"
                            >
                                <ChevronDown size={13} />
                            </button>
                        </div>

                        <div className={`h-4 w-px mx-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                        {/* Zoom Controls */}
                        <div className="flex items-center gap-1 relative zoom-dropdown-container">
                            <button
                                type="button"
                                onClick={() => {
                                    const next = Math.max(0.5, Math.round((scrollZoom - 0.1) * 10) / 10);
                                    setScrollZoom(next);
                                    setZoomInputText(`${Math.round(next * 100)}%`);
                                }}
                                className={`p-1.5 rounded-lg border transition ${isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'}`}
                                title="Zoom Out"
                            >
                                <ZoomOut size={13} />
                            </button>
                            <input
                                type="text"
                                value={zoomInputText}
                                onChange={(e) => setZoomInputText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const parsed = parseInt(zoomInputText.replace('%', ''), 10);
                                        if (!isNaN(parsed) && parsed >= 25 && parsed <= 400) {
                                            setScrollZoom(parsed / 100);
                                            setZoomInputText(`${parsed}%`);
                                        } else {
                                            setZoomInputText(`${Math.round(scrollZoom * 100)}%`);
                                        }
                                        e.target.blur();
                                    }
                                }}
                                onBlur={() => {
                                    const parsed = parseInt(zoomInputText.replace('%', ''), 10);
                                    if (!isNaN(parsed) && parsed >= 25 && parsed <= 400) {
                                        setScrollZoom(parsed / 100);
                                        setZoomInputText(`${parsed}%`);
                                    } else {
                                        setZoomInputText(`${Math.round(scrollZoom * 100)}%`);
                                    }
                                }}
                                className={`w-12 text-center text-[11px] font-mono font-semibold py-1 px-0.5 rounded border focus:outline-none focus:border-rose-500 ${
                                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                                }`}
                                title="Type custom zoom % and press Enter"
                            />
                            <button
                                type="button"
                                onClick={() => setZoomMenuOpen(!zoomMenuOpen)}
                                className={`p-1 rounded-lg border text-xs transition ${isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'}`}
                                title="Preset Zoom Options"
                            >
                                <ChevronDown size={11} />
                            </button>
                            {zoomMenuOpen && (
                                <div className={`absolute top-full left-0 mt-1 w-28 rounded-xl border p-1 shadow-2xl z-[60] ${
                                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                                }`}>
                                    {[
                                        { label: '50%', val: 0.5 },
                                        { label: '75%', val: 0.75 },
                                        { label: '100%', val: 1.0 },
                                        { label: '125%', val: 1.25 },
                                        { label: '150%', val: 1.5 },
                                        { label: '200%', val: 2.0 },
                                        { label: 'Fit Width', val: 1.15 },
                                        { label: 'Fit Page', val: 0.9 }
                                    ].map(opt => (
                                        <button
                                            key={opt.label}
                                            type="button"
                                            onClick={() => {
                                                setScrollZoom(opt.val);
                                                setZoomInputText(`${Math.round(opt.val * 100)}%`);
                                                setZoomMenuOpen(false);
                                            }}
                                            className={`w-full text-left px-2 py-1 rounded-md text-xs font-mono transition ${
                                                Math.round(scrollZoom * 100) === Math.round(opt.val * 100)
                                                    ? 'bg-rose-500/10 text-rose-500 font-bold'
                                                    : isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    const next = Math.min(2.5, Math.round((scrollZoom + 0.1) * 10) / 10);
                                    setScrollZoom(next);
                                    setZoomInputText(`${Math.round(next * 100)}%`);
                                }}
                                className={`p-1.5 rounded-lg border transition ${isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'}`}
                                title="Zoom In"
                            >
                                <ZoomIn size={13} />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => rotateAll(90)}
                            className={`p-1.5 rounded-lg border transition ${isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'}`}
                            title="Rotate Document 90° Clockwise"
                        >
                            <RotateCw size={14} />
                        </button>
                    </div>

                    {/* Center: Core Annotation Tools */}
                    <div className="flex items-center gap-1">
                        {/* Select Tool Dropdown (Pointer, Select OCR, Copy Select - Point 2) */}
                        <div className="relative select-dropdown-container flex items-center">
                            <button
                                type="button"
                                onClick={() => {
                                    handleToolChange('select');
                                    setSelectMenuOpen(prev => !prev);
                                }}
                                className={`p-1.5 rounded-l-lg transition flex items-center gap-1 ${
                                    activeTool === 'select'
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'
                                }`}
                                title={
                                    selectSubMode === 'ocr'
                                        ? 'Select OCR (Drag area to extract text)'
                                        : selectSubMode === 'copy'
                                        ? 'Copy Select (Drag area to copy text to clipboard)'
                                        : 'Select & Move'
                                }
                            >
                                {selectSubMode === 'ocr' ? (
                                    <ScanText size={15} />
                                ) : selectSubMode === 'copy' ? (
                                    <Copy size={15} />
                                ) : (
                                    <MousePointer size={15} />
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectMenuOpen(prev => !prev)}
                                className={`px-1 py-1.5 rounded-r-lg border-l transition ${
                                    activeTool === 'select'
                                        ? 'bg-rose-600 text-white border-rose-500 hover:bg-rose-700'
                                        : isDark
                                        ? 'border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white'
                                        : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                                }`}
                                title="Select Tool Modes"
                            >
                                <ChevronDown size={11} />
                            </button>

                            {selectMenuOpen && (
                                <div className={`absolute top-full left-0 mt-1.5 w-44 rounded-xl border shadow-2xl py-1 z-50 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 ${
                                    isDark ? 'bg-slate-900/95 border-slate-700 text-slate-200' : 'bg-white/95 border-slate-200 text-slate-700'
                                }`}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleToolChange('select');
                                            setSelectSubMode('pointer');
                                            setSelectMenuOpen(false);
                                        }}
                                        className={`w-full px-3 py-1.5 flex items-center gap-2 text-left transition ${
                                            selectSubMode === 'pointer' && activeTool === 'select'
                                                ? 'bg-rose-600/10 text-rose-500 font-semibold'
                                                : isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                        }`}
                                    >
                                        <MousePointer size={13} className="shrink-0" />
                                        <div className="flex-1">
                                            <div className="font-medium">Pointer</div>
                                            <div className="text-[10px] text-slate-400">Select, move, transform</div>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleToolChange('select');
                                            setSelectSubMode('ocr');
                                            setSelectMenuOpen(false);
                                            toast('Drag a rectangle on the document to extract text via OCR', { icon: '🔍' });
                                        }}
                                        className={`w-full px-3 py-1.5 flex items-center gap-2 text-left transition ${
                                            selectSubMode === 'ocr' && activeTool === 'select'
                                                ? 'bg-rose-600/10 text-rose-500 font-semibold'
                                                : isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                        }`}
                                    >
                                        <ScanText size={13} className="shrink-0" />
                                        <div className="flex-1">
                                            <div className="font-medium">Select OCR</div>
                                            <div className="text-[10px] text-slate-400">Marquee area text extract</div>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleToolChange('select');
                                            setSelectSubMode('copy');
                                            setSelectMenuOpen(false);
                                            toast('Drag a rectangle to instantly copy selected text to clipboard', { icon: '📋' });
                                        }}
                                        className={`w-full px-3 py-1.5 flex items-center gap-2 text-left transition ${
                                            selectSubMode === 'copy' && activeTool === 'select'
                                                ? 'bg-rose-600/10 text-rose-500 font-semibold'
                                                : isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                        }`}
                                    >
                                        <Copy size={13} className="shrink-0" />
                                        <div className="flex-1">
                                            <div className="font-medium">Copy Select</div>
                                            <div className="text-[10px] text-slate-400">Drag to copy text to clipboard</div>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Pen Tool with color dot */}
                        <button
                            type="button"
                            onClick={() => handleToolChange('pen')}
                            className={`p-1.5 rounded-lg transition relative ${
                                activeTool === 'pen'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'
                            }`}
                            title="Draw Ink Pen"
                        >
                            <PenTool size={15} />
                            <span
                                className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white dark:border-slate-900"
                                style={{ backgroundColor: penColor }}
                            />
                        </button>

                        {/* Highlighter Tool with fluorescent dot */}
                        <button
                            type="button"
                            onClick={() => handleToolChange('highlighter')}
                            className={`p-1.5 rounded-lg transition relative ${
                                activeTool === 'highlighter'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'
                            }`}
                            title="Fluorescent Highlighter"
                        >
                            <Highlighter size={15} />
                            <span
                                className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white dark:border-slate-900"
                                style={{ backgroundColor: highlighterColor }}
                            />
                        </button>

                        {/* Eraser Tool */}
                        <button
                            type="button"
                            onClick={() => handleToolChange('eraser')}
                            className={`p-1.5 rounded-lg transition ${
                                activeTool === 'eraser'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'
                            }`}
                            title="Stroke & Annotation Eraser"
                        >
                            <Eraser size={15} />
                        </button>

                        {/* Text Tool */}
                        <button
                            type="button"
                            onClick={() => handleToolChange('text')}
                            className={`p-1.5 rounded-lg transition ${
                                activeTool === 'text'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'
                            }`}
                            title="Add or Edit Text in PDF (Auto Font Detection)"
                        >
                            <Type size={15} />
                        </button>

                        {/* Main Toolbar Text Properties Controls (Point 2) */}
                        {(activeTool === 'text' || selectedTextBoxId) && (
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-xs shadow-xs animate-in fade-in duration-150 ${
                                isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-50 border-slate-300'
                            }`}>
                                <select
                                    value={activeFontFamily}
                                    onChange={(e) => handleTextPropChange({ fontFamily: e.target.value })}
                                    className={`text-[11px] rounded px-1.5 py-0.5 border font-medium focus:outline-none focus:border-rose-500 ${
                                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                                    }`}
                                    title="Font Family"
                                >
                                    <optgroup label="Standard Sans">
                                        <option value="Helvetica">Helvetica</option>
                                        <option value="Arial">Arial</option>
                                        <option value="Inter">Inter</option>
                                        <option value="Roboto">Roboto</option>
                                        <option value="Open Sans">Open Sans</option>
                                        <option value="Lato">Lato</option>
                                        <option value="Montserrat">Montserrat</option>
                                    </optgroup>
                                    <optgroup label="Classic Serif">
                                        <option value="Times-Roman">Times New Roman</option>
                                        <option value="Georgia">Georgia</option>
                                        <option value="Playfair Display">Playfair Display</option>
                                        <option value="Merriweather">Merriweather</option>
                                    </optgroup>
                                    <optgroup label="Monospace">
                                        <option value="Courier">Courier</option>
                                        <option value="Fira Code">Fira Code</option>
                                    </optgroup>
                                </select>

                                <select
                                    value={activeFontSize}
                                    onChange={(e) => handleTextPropChange({ fontSize: parseInt(e.target.value, 10) })}
                                    className={`text-[11px] rounded px-1 py-0.5 border font-mono font-medium focus:outline-none focus:border-rose-500 ${
                                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                                    }`}
                                    title="Font Size (pt)"
                                >
                                    {[9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48].map(sz => (
                                        <option key={sz} value={sz}>{sz}pt</option>
                                    ))}
                                </select>

                                <button
                                    type="button"
                                    onClick={() => handleTextPropChange({ bold: !activeBold })}
                                    className={`p-1 rounded transition ${
                                        activeBold
                                            ? 'bg-rose-600 text-white'
                                            : isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
                                    }`}
                                    title="Bold"
                                >
                                    <Bold size={12} />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleTextPropChange({ italic: !activeItalic })}
                                    className={`p-1 rounded transition ${
                                        activeItalic
                                            ? 'bg-rose-600 text-white'
                                            : isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
                                    }`}
                                    title="Italic"
                                >
                                    <Italic size={12} />
                                </button>

                                <label className="relative flex items-center cursor-pointer p-0.5" title="Text Color">
                                    <span
                                        className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 shadow-xs"
                                        style={{ backgroundColor: activeTextColor }}
                                    />
                                    <input
                                        type="color"
                                        value={activeTextColor}
                                        onChange={(e) => handleTextPropChange({ color: e.target.value })}
                                        className="sr-only"
                                    />
                                </label>
                            </div>
                        )}

                        {/* Add Image Tool */}
                        <label
                            className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center ${
                                isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'
                            }`}
                            title="Insert Image (PNG, JPG, SVG)"
                        >
                            <ImageIcon size={15} />
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleInsertImage}
                            />
                        </label>

                        {/* Shapes Dropdown / Toggle */}
                        <button
                            type="button"
                            onClick={() => handleToolChange('shape')}
                            className={`p-1.5 rounded-lg transition flex items-center gap-0.5 ${
                                activeTool === 'shape'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'
                            }`}
                            title="Geometric Shapes (Rectangle, Ellipse, Line, Arrow)"
                        >
                            <Square size={14} />
                            <ChevronDown size={11} />
                        </button>

                        {/* Callout Tool & Types Dropdown */}
                        <div className="relative callout-dropdown-container flex items-center">
                            <button
                                type="button"
                                onClick={() => {
                                    const nextTool = activeTool === 'callout' ? 'select' : 'callout';
                                    handleToolChange(nextTool);
                                    const targetIdx = selectedAnnotationPageIndex !== null ? selectedAnnotationPageIndex : 0;
                                    const targetPage = pages[targetIdx] || pages[0];
                                    if (targetPage && nextTool === 'callout') {
                                        const newCallout = {
                                            id: `ann_callout_${Date.now()}`,
                                            pageId: targetPage.id,
                                            pageIndex: targetIdx,
                                            type: 'callout',
                                            calloutType: activeCalloutType || 'speech',
                                            text: 'Note: review here',
                                            color: penColor || '#e11d48',
                                            normX: 0.35,
                                            normY: 0.30,
                                            width: 140,
                                            height: 48,
                                            targetNormX: 0.25,
                                            targetNormY: 0.38
                                        };
                                        const updated = [...annotations, newCallout];
                                        setAnnotations(updated);
                                        pushHistory(pages, updated);
                                        setSelectedCalloutId(newCallout.id);
                                        toast.success(`Placed ${CALLOUT_TYPES.find(t => t.id === activeCalloutType)?.label || 'Callout'} on page ${targetIdx + 1}!`);
                                    }
                                }}
                                className={`p-1.5 rounded-l-lg transition flex items-center gap-1 text-xs font-semibold ${
                                    activeTool === 'callout'
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'
                                }`}
                                title={`Callout: ${CALLOUT_TYPES.find(t => t.id === activeCalloutType)?.label || 'Speech Bubble'}`}
                            >
                                <MessageSquare size={14} />
                                <span className="hidden xl:inline">{CALLOUT_TYPES.find(t => t.id === activeCalloutType)?.label?.split(' ')[0] || 'Callout'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCalloutMenu(!showCalloutMenu)}
                                className={`p-1.5 rounded-r-lg border-l transition flex items-center ${
                                    activeTool === 'callout'
                                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                                        : isDark ? 'hover:bg-slate-800 text-slate-400 border-slate-700' : 'hover:bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                                title="Select Callout Type (Speech, Thought, Leader Line, Pill)"
                            >
                                <ChevronDown size={11} />
                            </button>

                            {showCalloutMenu && (
                                <div className={`absolute top-full left-0 mt-1.5 w-60 rounded-2xl border p-1.5 shadow-2xl z-50 ${
                                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                                }`}>
                                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Callout Styles
                                    </div>
                                    {CALLOUT_TYPES.map(type => (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => {
                                                setActiveCalloutType(type.id);
                                                setShowCalloutMenu(false);
                                                handleToolChange('callout');
                                                const targetIdx = selectedAnnotationPageIndex !== null ? selectedAnnotationPageIndex : 0;
                                                const targetPage = pages[targetIdx] || pages[0];
                                                if (targetPage) {
                                                    const newCallout = {
                                                        id: `ann_callout_${Date.now()}`,
                                                        pageId: targetPage.id,
                                                        pageIndex: targetIdx,
                                                        type: 'callout',
                                                        calloutType: type.id,
                                                        text: 'Note: review here',
                                                        color: penColor || '#e11d48',
                                                        normX: 0.35,
                                                        normY: 0.30,
                                                        width: 140,
                                                        height: 48,
                                                        targetNormX: 0.25,
                                                        targetNormY: 0.38
                                                    };
                                                    const updated = [...annotations, newCallout];
                                                    setAnnotations(updated);
                                                    pushHistory(pages, updated);
                                                    setSelectedCalloutId(newCallout.id);
                                                    toast.success(`Placed ${type.label} on page ${targetIdx + 1}!`);
                                                }
                                            }}
                                            className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition ${
                                                activeCalloutType === type.id
                                                    ? 'bg-rose-500/10 text-rose-500'
                                                    : isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                                            }`}
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                                                {type.id === 'speech' && <MessageSquare size={13} />}
                                                {type.id === 'thought' && <Sparkles size={13} />}
                                                {type.id === 'leader_line' && <ArrowRight size={13} />}
                                                {type.id === 'pill' && <Award size={13} />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-xs">{type.label}</div>
                                                <div className="text-[10px] text-slate-400">{type.desc}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Stamps Dropdown */}
                        <div className="relative stamp-dropdown-container">
                            <button
                                type="button"
                                onClick={() => setStampMenuOpen(!stampMenuOpen)}
                                className={`px-2 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                                    isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-200' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                                }`}
                                title="Apply Status Stamp"
                            >
                                <Stamp size={13} className="text-emerald-500" />
                                <span className="hidden lg:inline">{stampType}</span>
                                <ChevronDown size={11} />
                            </button>
                            {stampMenuOpen && (
                                <div className={`absolute left-0 mt-1 w-52 rounded-xl border p-2 shadow-2xl z-[60] max-h-96 overflow-y-auto ${
                                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                                }`}>
                                    {/* Date stamp inclusion toggle */}
                                    <label className={`flex items-center justify-between p-1.5 mb-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                                        isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
                                    }`}>
                                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                            <Calendar size={12} className="text-rose-500" />
                                            <span>Include Today's Date</span>
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={stampIncludeDate}
                                            onChange={(e) => setStampIncludeDate(e.target.checked)}
                                            className="accent-rose-600 rounded"
                                        />
                                    </label>

                                    {/* Saved Custom Stamps Library Section */}
                                    {savedStamps.length > 0 && (
                                        <div className="mb-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-500 px-1 mb-1 flex items-center justify-between">
                                                <span>Saved Stamps ({savedStamps.length})</span>
                                            </div>
                                            <div className="space-y-0.5 max-h-36 overflow-y-auto">
                                                {savedStamps.map(s => {
                                                    const dateStr = stampIncludeDate ? ` • ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}` : '';
                                                    const fullLabel = `${s.text || s.name}${dateStr}`;
                                                    return (
                                                        <div
                                                            key={s.id}
                                                            className={`group/saved flex items-center justify-between px-2 py-1 rounded-lg text-xs font-mono font-bold transition ${
                                                                isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setStampType(s.text || s.name);
                                                                    setActiveTool('stamp');
                                                                    setStampMenuOpen(false);
                                                                    const targetIdx = selectedAnnotationPageIndex !== null ? selectedAnnotationPageIndex : 0;
                                                                    const targetPage = pages[targetIdx] || pages[0];
                                                                    if (targetPage) {
                                                                        const stampW = s.kind === 'image' ? 120 : (stampIncludeDate ? 175 : 140);
                                                                        const stampH = s.kind === 'image' ? 120 : 46;
                                                                        const stampImgDataUrl = s.kind === 'image' ? s.imageUrl : generateStampImageDataUrl(fullLabel, s.color, stampW, stampH);
                                                                        const newAnn = {
                                                                            id: `ann_stamp_${Date.now()}`,
                                                                            pageId: targetPage.id,
                                                                            pageIndex: targetIdx,
                                                                            type: 'stamp',
                                                                            stampKind: s.kind || 'text',
                                                                            text: fullLabel,
                                                                            color: s.color,
                                                                            imageUrl: s.kind === 'image' ? s.imageUrl : '',
                                                                            normX: 0.38,
                                                                            normY: 0.25,
                                                                            x: 200,
                                                                            y: 180,
                                                                            width: stampW,
                                                                            height: stampH,
                                                                            imageDataUrl: stampImgDataUrl
                                                                        };
                                                                        const updated = [...annotations, newAnn];
                                                                        setAnnotations(updated);
                                                                        pushHistory(pages, updated);
                                                                        toast.success(`Placed "${fullLabel}" stamp on page ${targetIdx + 1}!`);
                                                                    }
                                                                }}
                                                                className="flex-1 text-left truncate flex items-center gap-1.5"
                                                                style={{ color: s.color }}
                                                            >
                                                                {s.kind === 'image' && s.imageUrl ? (
                                                                    <img src={s.imageUrl} alt="stamp" className="w-4 h-4 object-contain rounded" />
                                                                ) : null}
                                                                <span className="truncate">{s.text || s.name}</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteSavedStamp(s.id);
                                                                }}
                                                                className="opacity-0 group-hover/saved:opacity-100 p-0.5 text-slate-400 hover:text-rose-500 rounded transition"
                                                                title="Delete saved stamp"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Stamp Categories */}
                                    {[
                                        {
                                            category: 'Action & Signing',
                                            stamps: [
                                                { label: 'SIGN HERE ✍️', color: '#2563eb' },
                                                { label: 'INITIAL HERE 📝', color: '#2563eb' },
                                                { label: 'WITNESS', color: '#7c3aed' },
                                                { label: 'NOTARIZED', color: '#d97706' }
                                            ]
                                        },
                                        {
                                            category: 'Review & Approval',
                                            stamps: [
                                                { label: 'APPROVED', color: '#059669' },
                                                { label: 'VERIFIED', color: '#059669' },
                                                { label: 'COMPLETED', color: '#0d9488' },
                                                { label: 'REJECTED', color: '#dc2626' }
                                            ]
                                        },
                                        {
                                            category: 'Status & Notice',
                                            stamps: [
                                                { label: 'CONFIDENTIAL', color: '#e11d48' },
                                                { label: 'DRAFT', color: '#64748b' },
                                                { label: 'FINAL', color: '#4f46e5' },
                                                { label: 'URGENT', color: '#ea580c' },
                                                { label: 'REVISED', color: '#0891b2' },
                                                { label: 'VOID', color: '#dc2626' }
                                            ]
                                        }
                                    ].map(group => (
                                        <div key={group.category} className="mb-2">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">
                                                {group.category}
                                            </div>
                                            <div className="space-y-0.5">
                                                {group.stamps.map(s => {
                                                    const dateStr = stampIncludeDate ? ` • ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}` : '';
                                                    const fullLabel = `${s.label}${dateStr}`;
                                                    return (
                                                        <button
                                                            key={s.label}
                                                            type="button"
                                                            onClick={() => {
                                                                setStampType(s.label);
                                                                setActiveTool('stamp');
                                                                setStampMenuOpen(false);
                                                                const targetIdx = selectedAnnotationPageIndex !== null ? selectedAnnotationPageIndex : 0;
                                                                const targetPage = pages[targetIdx] || pages[0];
                                                                if (targetPage) {
                                                                    const stampW = stampIncludeDate ? 175 : 140;
                                                                    const stampH = 46;
                                                                    const stampImgDataUrl = generateStampImageDataUrl(fullLabel, s.color, stampW, stampH);
                                                                    const newAnn = {
                                                                        id: `ann_stamp_${Date.now()}`,
                                                                        pageId: targetPage.id,
                                                                        pageIndex: targetIdx,
                                                                        type: 'stamp',
                                                                        stampKind: 'text',
                                                                        text: fullLabel,
                                                                        color: s.color,
                                                                        normX: 0.38,
                                                                        normY: 0.25,
                                                                        x: 200,
                                                                        y: 180,
                                                                        width: stampW,
                                                                        height: stampH,
                                                                        imageDataUrl: stampImgDataUrl
                                                                    };
                                                                    const updated = [...annotations, newAnn];
                                                                    setAnnotations(updated);
                                                                    pushHistory(pages, updated);
                                                                    toast.success(`Placed "${fullLabel}" stamp on page ${targetIdx + 1}!`);
                                                                }
                                                            }}
                                                            className={`w-full text-left px-2 py-1 rounded-lg text-xs font-mono font-bold flex items-center justify-between transition ${
                                                                stampType === s.label
                                                                    ? 'bg-rose-500/10 text-rose-500'
                                                                    : isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                                            }`}
                                                            style={{ color: s.color }}
                                                        >
                                                            <span className="truncate">{s.label}</span>
                                                            {stampType === s.label && <Check size={12} className="shrink-0 ml-1" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                    <div className={`my-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCustomStampDialog(true);
                                            setStampMenuOpen(false);
                                        }}
                                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-rose-500 transition ${
                                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                        }`}
                                    >
                                        <Plus size={13} />
                                        <span>Custom Stamp...</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Digital Signature Tool */}
                        <button
                            type="button"
                            onClick={() => setShowSignatureModal(true)}
                            className={`px-2 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                                isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-200' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                            }`}
                            title="Add or Sign Document with Saved Signature"
                        >
                            <Award size={13} className="text-blue-500" />
                            <span className="hidden lg:inline">Sign</span>
                        </button>

                        {/* Watermark Toggle */}
                        <button
                            type="button"
                            onClick={() => setShowWatermarkBar(!showWatermarkBar)}
                            className={`p-1.5 rounded-lg border transition ${
                                showWatermarkBar || appliedWatermarkText || appliedWatermarkImageDataUrl
                                    ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                                    : isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                            }`}
                            title="Toggle Watermark Settings"
                        >
                            <ShieldCheck size={14} />
                        </button>

                        <div className={`h-4 w-px mx-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                        {/* Undo / Redo */}
                        <button
                            type="button"
                            onClick={handleUndo}
                            disabled={historyIdx <= 0}
                            className={`p-1.5 rounded-lg transition ${
                                historyIdx <= 0
                                    ? 'opacity-30 cursor-not-allowed'
                                    : isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                            }`}
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo2 size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={handleRedo}
                            disabled={historyIdx >= history.length - 1}
                            className={`p-1.5 rounded-lg transition ${
                                historyIdx >= history.length - 1
                                    ? 'opacity-30 cursor-not-allowed'
                                    : isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                            }`}
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo2 size={14} />
                        </button>
                    </div>

                    {/* Right: Search & Export Dropdown */}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setSearchOpen(!searchOpen)}
                            className={`p-1.5 rounded-lg border transition ${
                                searchOpen
                                    ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                                    : isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                            }`}
                            title="Find in document (Ctrl+F)"
                        >
                            <Search size={14} />
                        </button>

                        {/* Collective Export Dropdown */}
                        <div className="relative export-dropdown-container">
                            <button
                                type="button"
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition"
                            >
                                <Download size={13} />
                                <span>Export</span>
                                <ChevronDown size={12} />
                            </button>

                            {showExportMenu && (
                                <div className={`absolute right-0 mt-1 w-64 rounded-2xl border p-1.5 shadow-2xl z-[60] ${
                                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                                }`}>
                                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Office Media Files
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSaveToOfficeMediaFiles}
                                        disabled={processing}
                                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 text-rose-500 transition ${
                                            isDark ? 'hover:bg-slate-800' : 'hover:bg-rose-50'
                                        }`}
                                    >
                                        <Save size={14} />
                                        <div className="flex-1">
                                            <div>Save to Office Media Files</div>
                                            <div className="text-[10px] font-normal text-slate-400">Stores in CloudVault &rarr; PDF Documents</div>
                                        </div>
                                    </button>

                                    <div className={`my-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />

                                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Download PDF
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleExportReorganized('none')}
                                        disabled={processing}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                        }`}
                                    >
                                        <Download size={13} className="text-emerald-500" />
                                        <span>Download Standard PDF</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleExportReorganized('basic')}
                                        disabled={processing}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                        }`}
                                    >
                                        <Sliders size={13} className="text-blue-500" />
                                        <span>Download Basic Compressed (~40%)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleExportReorganized('strong')}
                                        disabled={processing}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                        }`}
                                    >
                                        <Archive size={13} className="text-amber-500" />
                                        <span>Download Strong Compressed (~75%)</span>
                                    </button>

                                    <div className={`my-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />

                                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Convert & Print
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleExportAs('docx')}
                                        disabled={processing}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                        }`}
                                    >
                                        <FileText size={13} className="text-blue-500" />
                                        <span>Convert to Word (.docx)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleExportAs('xlsx')}
                                        disabled={processing}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                        }`}
                                    >
                                        <FileSpreadsheet size={13} className="text-emerald-500" />
                                        <span>Convert to Excel (.xlsx)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleExportAs('txt')}
                                        disabled={processing}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                        }`}
                                    >
                                        <FileCode size={13} className="text-purple-500" />
                                        <span>Extract Plain Text (.txt)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowExportMenu(false);
                                            setShowPrintModal(true);
                                        }}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                        }`}
                                    >
                                        <Printer size={13} className="text-slate-400" />
                                        <span>Print Document...</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* CONTEXTUAL TOOL RIBBONS (Mutually Exclusive: Zero or One - Point 2) */}
            {activeRibbon === 'pen' && (
                <div className="w-full flex justify-center py-1 px-3 z-30 shrink-0 pointer-events-none">
                    <div className={`pointer-events-auto rounded-xl border shadow-md px-3 py-1 flex items-center gap-2.5 text-xs backdrop-blur-md ${
                        isDark ? 'bg-slate-900/95 border-slate-700 text-slate-300 shadow-black/30' : 'bg-white/95 border-slate-200 text-slate-700 shadow-slate-300/30'
                    }`}>
                        <span className="font-bold flex items-center gap-1 text-[11px] text-slate-400">
                            <PenTool size={12} /> Pen:
                        </span>
                        <div className="flex items-center gap-1.5">
                            {['#000000', '#2563eb', '#dc2626', '#059669', '#7c3aed', '#d97706'].map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setPenColor(c)}
                                    className={`w-5 h-5 rounded-full border-2 transition ${penColor === c ? 'scale-125 border-rose-500 shadow-xs' : 'border-transparent hover:scale-110'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                        <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                        <span className="text-[11px] text-slate-400">Width:</span>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 5, 8].map(w => (
                                <button
                                    key={w}
                                    type="button"
                                    onClick={() => setPenWidth(w)}
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                                        penWidth === w
                                            ? 'bg-rose-600 text-white'
                                            : isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
                                    }`}
                                >
                                    {w}px
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeRibbon === 'highlighter' && (
                <div className="w-full flex justify-center py-1 px-3 z-30 shrink-0 pointer-events-none">
                    <div className={`pointer-events-auto rounded-xl border shadow-md px-3 py-1 flex items-center gap-2.5 text-xs backdrop-blur-md ${
                        isDark ? 'bg-slate-900/95 border-slate-700 text-slate-300 shadow-black/30' : 'bg-white/95 border-slate-200 text-slate-700 shadow-slate-300/30'
                    }`}>
                        <span className="font-bold flex items-center gap-1 text-[11px] text-slate-400">
                            <Highlighter size={12} /> Fluorescent Highlighter:
                        </span>
                        <div className="flex items-center gap-1.5">
                            {[
                                { name: 'Yellow', hex: '#facc15' },
                                { name: 'Green', hex: '#4ade80' },
                                { name: 'Cyan', hex: '#38bdf8' },
                                { name: 'Pink', hex: '#f472b6' },
                                { name: 'Orange', hex: '#fb923c' }
                            ].map(c => (
                                <button
                                    key={c.hex}
                                    type="button"
                                    onClick={() => setHighlighterColor(c.hex)}
                                    className={`w-5 h-5 rounded-full border-2 transition ${highlighterColor === c.hex ? 'scale-125 border-rose-500 shadow-xs' : 'border-transparent hover:scale-110'}`}
                                    style={{ backgroundColor: c.hex }}
                                    title={c.name}
                                />
                            ))}
                        </div>
                        <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                        <span className="text-[11px] text-slate-400">Thickness:</span>
                        <div className="flex items-center gap-1">
                            {[10, 14, 20].map(w => (
                                <button
                                    key={w}
                                    type="button"
                                    onClick={() => setHighlighterWidth(w)}
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                                        highlighterWidth === w
                                            ? 'bg-rose-600 text-white'
                                            : isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
                                    }`}
                                >
                                    {w}px
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeRibbon === 'shape' && (
                <div className="w-full flex justify-center py-1 px-3 z-30 shrink-0 pointer-events-none">
                    <div className={`pointer-events-auto rounded-xl border shadow-md px-3 py-1 flex items-center gap-2.5 text-xs backdrop-blur-md ${
                        isDark ? 'bg-slate-900/95 border-slate-700 text-slate-300 shadow-black/30' : 'bg-white/95 border-slate-200 text-slate-700 shadow-slate-300/30'
                    }`}>
                    <span className="font-bold text-[11px] text-slate-400">Shape:</span>
                    <div className="flex items-center gap-1">
                        {[
                            { id: 'rectangle', label: 'Rectangle', icon: Square },
                            { id: 'ellipse', label: 'Ellipse', icon: Circle },
                            { id: 'line', label: 'Line', icon: Minus },
                            { id: 'arrow', label: 'Arrow', icon: ArrowRight }
                        ].map(s => {
                            const IconComponent = s.icon;
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setSelectedShape(s.id)}
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition ${
                                        selectedShape === s.id
                                            ? 'bg-rose-600 text-white'
                                            : isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
                                    }`}
                                >
                                    <IconComponent size={12} />
                                    <span>{s.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Stroke Width Selector */}
                    <span className="text-[11px] text-slate-400">Stroke:</span>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 6, 8].map(w => (
                            <button
                                key={w}
                                type="button"
                                onClick={() => handleShapePropChange({ strokeWidth: w })}
                                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition ${
                                    (shapeStrokeWidth || 2) === w
                                        ? 'bg-rose-600 text-white'
                                        : isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
                                }`}
                            >
                                {w}px
                            </button>
                        ))}
                    </div>

                    <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Stroke Color Palette */}
                    <div className="flex items-center gap-1">
                        {['#e11d48', '#2563eb', '#059669', '#d97706', '#000000'].map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => handleShapePropChange({ color: c })}
                                className={`w-4 h-4 rounded-full border transition ${penColor === c ? 'scale-125 border-rose-500 ring-1 ring-rose-400' : 'border-transparent'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>

                    <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Fill Selector */}
                    <span className="text-[11px] text-slate-400">Fill:</span>
                    <div className="flex items-center gap-1">
                        {[
                            { id: 'none', label: 'None' },
                            { id: 'white', label: 'Solid White' },
                            { id: 'tint', label: 'Color Tint' }
                        ].map(f => (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => handleShapePropChange({ fill: f.id })}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                                    (shapeFill || 'none') === f.id
                                        ? 'bg-rose-600 text-white'
                                        : isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {selectedShapeId && (
                        <>
                            <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                            <button
                                type="button"
                                onClick={() => {
                                    setAnnotations(prev => {
                                        const next = prev.filter(a => a.id !== selectedShapeId);
                                        pushHistory(pages, next);
                                        return next;
                                    });
                                    setSelectedShapeId(null);
                                    toast.success('Deleted shape');
                                }}
                                className="px-2 py-1 rounded bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white flex items-center gap-1 font-bold text-[11px] transition shadow-xs"
                                title="Delete Selected Shape"
                            >
                                <Trash2 size={12} />
                                <span>Delete Shape</span>
                            </button>
                        </>
                    )}
                    </div>
                </div>
            )}

            {/* Eraser Tool Context Ribbon (Pencil Eraser Sizes & Clear Inks) */}
            {activeRibbon === 'eraser' && (
                <div className="w-full flex justify-center py-1 px-3 z-30 shrink-0 pointer-events-none">
                    <div className={`pointer-events-auto rounded-xl border shadow-md px-3 py-1 flex items-center gap-2.5 text-xs backdrop-blur-md ${
                        isDark ? 'bg-slate-900/95 border-slate-700 text-slate-300 shadow-black/30' : 'bg-white/95 border-slate-200 text-slate-700 shadow-slate-300/30'
                    }`}>
                        <span className="font-bold flex items-center gap-1 text-[11px] text-slate-400">
                            <Eraser size={12} /> Eraser:
                        </span>
                        <div className="flex items-center gap-1">
                            {[
                                { size: 8, label: 'Fine (8px)' },
                                { size: 14, label: 'Medium (14px)' },
                                { size: 24, label: 'Broad (24px)' }
                            ].map(item => (
                                <button
                                    key={item.size}
                                    type="button"
                                    onClick={() => setEraserSize(item.size)}
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                                        eraserSize === item.size
                                            ? 'bg-rose-600 text-white'
                                            : isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                        <button
                            type="button"
                            onClick={() => {
                                const targetPage = pages[selectedAnnotationPageIndex];
                                if (!targetPage) return;
                                setAnnotations(prev => {
                                    const next = prev.filter(a => {
                                        if (a.type !== 'draw') return true;
                                        const matches = a.pageId ? a.pageId === targetPage.id : a.pageIndex === selectedAnnotationPageIndex;
                                        return !matches;
                                    });
                                    pushHistory(pages, next);
                                    return next;
                                });
                                toast.success('Cleared inks on current page');
                            }}
                            className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white transition flex items-center gap-1"
                            title="Erase all pen and highlighter strokes on this page"
                        >
                            <Trash2 size={11} />
                            <span>Clear Page Inks</span>
                        </button>
                    </div>
                </div>
            )}

            {activeRibbon === 'watermark' && (
                <div className="w-full flex justify-center py-1 px-3 z-30 shrink-0 pointer-events-none">
                    <div className={`pointer-events-auto rounded-xl border shadow-md px-3 py-1.5 flex flex-wrap items-center gap-2.5 text-xs backdrop-blur-md ${
                        isDark ? 'bg-slate-900/95 border-slate-700 text-slate-300 shadow-black/30' : 'bg-white/95 border-slate-200 text-slate-700 shadow-slate-300/30'
                    }`}>
                        <span className="font-bold flex items-center gap-1 text-[11px] text-rose-500">
                            <ShieldCheck size={13} /> Watermark:
                        </span>
                        <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800/60 p-0.5 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setWatermarkMode('text')}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                                    watermarkMode === 'text' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                                }`}
                            >
                                Text
                            </button>
                            <button
                                type="button"
                                onClick={() => setWatermarkMode('image')}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                                    watermarkMode === 'image' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                                }`}
                            >
                                Image
                            </button>
                        </div>

                        {watermarkMode === 'text' ? (
                            <>
                                <input
                                    type="text"
                                    value={watermarkInput}
                                    onChange={(e) => {
                                        setWatermarkInput(e.target.value);
                                        setWatermarkMode('text');
                                    }}
                                    placeholder="Watermark text (e.g. CONFIDENTIAL)"
                                    className={`border rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-rose-500 ${
                                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                                    }`}
                                />
                                <div className="flex items-center gap-1">
                                    {WATERMARK_PALETTE.slice(0, 5).map(c => (
                                        <button
                                            key={c.hex}
                                            type="button"
                                            onClick={() => setWatermarkColor(c.hex)}
                                            className={`w-4 h-4 rounded-full border transition ${watermarkColor === c.hex ? 'scale-125 border-rose-500' : 'border-transparent'}`}
                                            style={{ backgroundColor: c.hex }}
                                        />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <label className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-dashed border-rose-500 text-rose-500 hover:bg-rose-500/10 flex items-center gap-1.5 cursor-pointer transition">
                                <Upload size={12} /> {watermarkImageEl || appliedWatermarkImageDataUrl ? 'Change Image...' : 'Upload Watermark Image...'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleImageWatermarkUpload(e.target.files[0])}
                                />
                            </label>
                        )}

                        {appliedWatermarkImageDataUrl && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-rose-500/40 bg-rose-500/10">
                                <img src={appliedWatermarkImageDataUrl} alt="Watermark" className="w-5 h-5 object-contain" />
                                <span className="text-[10px] text-rose-500 font-semibold">Image Active</span>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={handleApplyWatermark}
                            className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center shadow-xs"
                            title="Apply Watermark"
                        >
                            <Check size={14} />
                        </button>
                        {(appliedWatermarkText || appliedWatermarkImageDataUrl) && (
                            <button
                                type="button"
                                onClick={handleClearWatermark}
                                className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs transition flex items-center justify-center"
                                title="Clear Watermark"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                        {/* Dedicated Close Button for Watermark Context Ribbon (Point 5) */}
                        <button
                            type="button"
                            onClick={() => setShowWatermarkBar(false)}
                            className="ml-auto p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                            title="Close Watermark Ribbon"
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>
            )}

            {/* FLOATING SEARCH WIDGET (Directly below toolbar) */}
            {searchOpen && (
                <div className={`pointer-events-auto rounded-2xl border px-3 py-1.5 shadow-2xl flex items-center gap-2 text-xs backdrop-blur-md transition-all z-50 mt-1 ${
                    isDark ? 'bg-slate-900/95 border-slate-700 text-white shadow-rose-950/20' : 'bg-white/95 border-slate-300 text-slate-900 shadow-slate-400/20'
                }`}>
                    <Search size={14} className="text-rose-500 shrink-0" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            handleSearch(e.target.value);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (e.shiftKey) {
                                    goToPrevMatch();
                                } else {
                                    goToNextMatch();
                                }
                            } else if (e.key === 'Escape') {
                                setSearchOpen(false);
                            }
                        }}
                        placeholder="Find in document..."
                        className={`border rounded-lg px-2.5 py-1 text-xs w-48 focus:outline-none focus:border-rose-500 ${
                            isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                        autoFocus
                    />
                    <span className="text-[11px] text-slate-400 font-mono shrink-0 min-w-[50px] text-center">
                        {searchMatches.length > 0 ? `${currentMatchIdx + 1} of ${searchMatches.length}` : (searchQuery ? '0 found' : '')}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                        <button
                            type="button"
                            onClick={goToPrevMatch}
                            disabled={searchMatches.length === 0}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 transition"
                            title="Previous Match"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={goToNextMatch}
                            disabled={searchMatches.length === 0}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 transition"
                            title="Next Match"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className={`h-4 w-px mx-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                    <button
                        type="button"
                        onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery('');
                            setSearchMatches([]);
                        }}
                        className="p-1 hover:text-rose-500 text-slate-400 transition"
                        title="Close Search"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}
            </div>
        ) : null
    );
};
return (
        <div className={`h-screen w-screen flex flex-col overflow-hidden font-sans select-none ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
            {/* Smooth Breathing Blur Loader on route transition / loading */}
            {loading && <OfficeAppBlurLoader appName="pdf" />}

            {/* TOP HEADER (Pinned, Height 48px, shrink-0, z-40) */}
            <header className={`h-12 border-b px-3 flex items-center justify-between shrink-0 shadow-xs transition-colors ${
                isDark ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-800'
            }`}>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => router.push('/documents')}
                        className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'}`}
                        title="Back to Documents Hub"
                    >
                        <ArrowLeft size={16} />
                    </button>

                    {/* Universal File Open / Import Menu */}
                    <OfficeOpenImportMenu
                        currentApp="pdf"
                        accept=".pdf,application/pdf"
                        onFileSelected={(file) => handleFilesSelect([file])}
                        onOpenOfficeDoc={handleOpenOfficeDoc}
                    />

                    {sourceDocs.length > 0 && (
                        <button
                            type="button"
                            onClick={handleClearStudioSession}
                            className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                                isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                            }`}
                            title="Clear loaded PDF and start a new session"
                        >
                            <Plus size={13} className="text-rose-500" />
                            <span className="hidden sm:inline">New / Clear</span>
                        </button>
                    )}

                    <div className="flex items-center gap-2 ml-1">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300">
                            LabPDF Studio
                        </span>
                        <span className="text-xs text-slate-400 font-mono hidden md:inline truncate max-w-[220px]">
                            {sourceDocs.length > 0 ? `• ${sourceDocs[0].name} ${sourceDocs.length > 1 ? `(+ ${sourceDocs.length - 1})` : ''}` : '• Professional PDF Studio'}
                        </span>
                    </div>
                </div>

                {/* 4 Mode Tabs */}
                <div className="flex items-center gap-1.5">
                    <div className={`flex items-center gap-1 p-0.5 rounded-xl border text-xs font-semibold ${
                        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
                    }`}>
                        <button
                            type="button"
                            onClick={() => setActiveTab('edit-merge')}
                            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                                activeTab === 'edit-merge'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                            }`}
                        >
                            <Layers size={13} />
                            <span>Edit & Merge</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('extract')}
                            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                                activeTab === 'extract'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                            }`}
                        >
                            <Scissors size={13} />
                            <span>Extract Pages</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('compress')}
                            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                                activeTab === 'compress'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                            }`}
                        >
                            <Sliders size={13} />
                            <span>Compress</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('ocr')}
                            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                                activeTab === 'ocr'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                            }`}
                        >
                            <FileSearch size={13} />
                            <span>OCR & Text</span>
                        </button>
                    </div>

                    {/* View Controls for Edit-Merge mode (Thumbnails sidebar toggle & Scroll / Grid view switcher) */}
                    {activeTab === 'edit-merge' && sourceDocs.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setShowThumbnails(!showThumbnails)}
                                className={`p-1.5 rounded-lg border transition ${
                                    showThumbnails
                                        ? 'border-rose-500 bg-rose-500/10 text-rose-500 font-bold'
                                        : (isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-600')
                                }`}
                                title="Toggle Page Thumbnails Sidebar"
                            >
                                <PanelLeft size={14} />
                            </button>

                            <div className={`flex items-center rounded-lg border p-0.5 text-xs ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-100'}`}>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('scroll')}
                                    className={`px-2 py-1 rounded transition flex items-center gap-1 ${
                                        viewMode === 'scroll'
                                            ? 'bg-rose-600 text-white shadow-xs font-semibold'
                                            : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                    title="Continuous Scroll View"
                                >
                                    <ScrollText size={12} />
                                    <span className="hidden sm:inline text-xs">Scroll</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`px-2 py-1 rounded transition flex items-center gap-1 ${
                                        viewMode === 'grid'
                                            ? 'bg-rose-600 text-white shadow-xs font-semibold'
                                            : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                    title="Grid Page Organizer"
                                >
                                    <LayoutGrid size={12} />
                                    <span className="hidden sm:inline text-xs">Grid</span>
                                </button>
                            </div>

                            <div className={`h-4 w-px mx-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                        </div>
                    )}

                    {/* Full Screen Toggle */}
                    <button
                        type="button"
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className={`p-1.5 rounded-lg border transition ${
                            isFullScreen
                                ? 'bg-rose-600 text-white border-rose-500'
                                : (isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600')
                        }`}
                        title={isFullScreen ? 'Exit Full Screen (Esc)' : 'Full Screen'}
                    >
                        {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                    </button>

                    {/* Theme Toggle */}
                    <OfficeThemeToggle />
                </div>
            </header>

            {/* MAIN VIEWPORT (flex-1 overflow-hidden flex, Only inner area scrolls!) */}
            <div className={`flex-1 flex overflow-hidden relative ${
                isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
            }`}>
                {/* Optional Left Thumbnails Sidebar */}
                {showThumbnails && activeTab === 'edit-merge' && sourceDocs.length > 0 && (
                    <div className={`w-48 border-r overflow-y-auto p-2 space-y-2 shrink-0 select-none ${
                        isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white/60'
                    }`}>
                        <div className="text-[11px] font-bold text-slate-400 px-1 mb-2 flex items-center justify-between">
                            <span>THUMBNAILS</span>
                            <span className="font-mono text-rose-500">{pages.length}</span>
                        </div>
                        {pages.map((p, idx) => {
                            const sourceDoc = sourceDocs[p.docIndex] || sourceDocs[0];
                            const isSelected = selectedAnnotationPageIndex === idx;
                            return (
                                <div
                                    key={p.id}
                                    onClick={() => {
                                        setSelectedAnnotationPageIndex(idx);
                                        const el = document.getElementById(`pdf-page-${idx}`);
                                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className={`p-1.5 rounded-xl border cursor-pointer transition ${
                                        isSelected
                                            ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-500/5'
                                            : isDark ? 'border-slate-800 hover:border-slate-700 bg-slate-950/40' : 'border-slate-200 hover:border-slate-300 bg-white'
                                    }`}
                                >
                                    <div className="h-28 bg-white rounded border border-slate-200/80 overflow-hidden flex items-center justify-center">
                                        <PdfPageCanvas
                                            pdfDoc={sourceDoc?.pdfDoc}
                                            pageNumber={p.originalPageNum}
                                            rotation={p.rotation}
                                            watermarkText={appliedWatermarkText}
                                            watermarkColor={appliedWatermarkColor}
                                            watermarkOpacity={watermarkOpacity}
                                            watermarkImage={appliedWatermarkImage}
                                            annotations={annotations.filter(a => a.pageId ? a.pageId === p.id : a.pageIndex === idx)}
                                            targetWidth={120}
                                        />
                                    </div>
                                    <div className="text-center text-[10px] font-mono font-bold mt-1 text-slate-400">
                                        Page {idx + 1}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Main Scrollable Canvas Area (Only this element scrolls!) */}
                <main className={`flex-1 flex flex-col h-full overflow-hidden p-2 sm:p-3 relative min-w-0 ${activeTab !== 'edit-merge' ? 'overflow-y-auto p-4 sm:p-6 items-center' : ''}`}>
                    {/* TAB 1: EDIT & MERGE (Wide Bounded Container with Pinned Top Toolbar) */}
                    {activeTab === 'edit-merge' && (
                        <div
                            className={`w-full max-w-[98%] xl:max-w-[96%] 2xl:max-w-[95%] h-[calc(100vh-115px)] min-h-[560px] mx-auto rounded-2xl border-2 shadow-inner relative flex flex-col overflow-hidden transition-colors ${
                                isDark
                                    ? 'bg-slate-900/40 border-slate-700/80 shadow-black/40'
                                    : 'bg-slate-100/60 border-slate-300 shadow-slate-300/40'
                            }`}
                        >
                            {/* Toolbar stays near top inside the container */}
                            {renderActionToolbar()}

                            {/* Scrollable inner body (Decoupled from floating toolbar overlay) */}
                            <div className={`w-full h-full overflow-x-auto overflow-y-auto ${sourceDocs.length > 0 ? 'pt-20 pb-12' : 'p-3 sm:p-5'} px-3 sm:px-5 flex flex-col items-center min-w-0`}>
                            {sourceDocs.length === 0 ? (
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                    onDragLeave={() => setIsDragOver(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDragOver(false);
                                        if (e.dataTransfer.files?.length > 0) handleFilesSelect(e.dataTransfer.files);
                                    }}
                                    className={`border-2 border-dashed rounded-3xl p-12 text-center transition flex flex-col items-center justify-center gap-4 ${
                                        isDragOver
                                            ? 'border-rose-500 bg-rose-500/10'
                                            : (isDark ? 'border-slate-800 bg-slate-900/40 hover:border-slate-700' : 'border-slate-300 bg-white/90 hover:border-slate-400 shadow-md')
                                    }`}
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center">
                                        <Layers size={32} />
                                    </div>
                                    <div>
                                        <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            Professional PDF Studio
                                        </h3>
                                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                                            Open, annotate, edit, sign, merge, and export PDF documents. Freehand inking, fluorescent highlighting, stamps, shapes, and persistent CloudVault storage.
                                        </p>
                                    </div>
                                    <MultiSourceUploadDropdown
                                        onSelectLocalFiles={handleFilesSelect}
                                        onOpenPickerModal={handleOpenPicker}
                                        isDark={isDark}
                                    />
                                </div>
                            ) : (
                                <>
                                    {/* GRID MODE: REORDER & ORGANIZE */}
                                    {viewMode === 'grid' && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {pages.map((p, idx) => {
                                                const sourceDoc = sourceDocs[p.docIndex] || sourceDocs[0];
                                                return (
                                                    <div
                                                        key={p.id}
                                                        className={`border rounded-2xl p-2.5 flex flex-col justify-between shadow-xs transition hover:shadow-md group/card relative ${
                                                            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between text-[11px] mb-2 font-mono">
                                                            <span className="font-bold text-rose-500 px-1.5 py-0.5 rounded bg-rose-500/10">
                                                                #{idx + 1}
                                                            </span>
                                                            <span className="text-slate-400 truncate max-w-[100px]" title={sourceDoc?.name}>
                                                                {sourceDoc?.name}
                                                            </span>
                                                        </div>

                                                        {/* Native 90° Canvas Thumbnail (NO CSS rotate transform!) */}
                                                        <div className="h-48 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center relative">
                                                            <PdfPageCanvas
                                                                pdfDoc={sourceDoc?.pdfDoc}
                                                                pageNumber={p.originalPageNum}
                                                                rotation={p.rotation}
                                                                watermarkText={appliedWatermarkText}
                                                                watermarkColor={appliedWatermarkColor}
                                                                watermarkOpacity={watermarkOpacity}
                                                                watermarkImage={appliedWatermarkImage}
                                                                annotations={annotations.filter(a => a.pageId ? a.pageId === p.id : a.pageIndex === idx)}
                                                                targetWidth={180}
                                                            />
                                                        </div>

                                                        {/* Card Action Controls */}
                                                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                                                            <div className="flex items-center gap-0.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => movePage(idx, idx - 1)}
                                                                    disabled={idx === 0}
                                                                    className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition ${idx === 0 ? 'opacity-20 cursor-not-allowed' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                                                                    title="Move Left"
                                                                >
                                                                    <MoveLeft size={13} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => movePage(idx, idx + 1)}
                                                                    disabled={idx === pages.length - 1}
                                                                    className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition ${idx === pages.length - 1 ? 'opacity-20 cursor-not-allowed' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                                                                    title="Move Right"
                                                                >
                                                                    <MoveRight size={13} />
                                                                </button>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => rotatePage(idx, 90)}
                                                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                                                                title="Rotate 90° Clockwise"
                                                            >
                                                                <RotateCw size={13} />
                                                            </button>

                                                            <div className="flex items-center gap-0.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => duplicatePage(idx)}
                                                                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                                                                    title="Duplicate Page"
                                                                >
                                                                    <Copy size={13} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => deletePage(idx)}
                                                                    className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition"
                                                                    title="Delete Page"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* SCROLL MODE: CONTINUOUS READING & ANNOTATIONS */}
                                    {viewMode === 'scroll' && (
                                        <div
                                            className="flex flex-col items-center gap-3.5 pb-16 w-full cursor-default"
                                                onClick={(e) => {
                                                    if (e.target === e.currentTarget) handleDeselectAll();
                                                }}
                                            >
                                            {pages.map((p, idx) => {
                                                const sourceDoc = sourceDocs[p.docIndex] || sourceDocs[0];
                                                const docIdx = p.docIndex ?? 0;
                                                const pageDim = pageDimensions[`${docIdx}_${p.originalPageNum}`] || pageDimensions[p.id];
                                                const isRotated90 = (p.rotation || 0) % 180 !== 0;

                                                let effectiveAspect = pageDim?.aspectRatio;
                                                if (!effectiveAspect) {
                                                    if (p.unscaledWidth && p.unscaledHeight) {
                                                        effectiveAspect = isRotated90 ? (p.unscaledWidth / p.unscaledHeight) : (p.unscaledHeight / p.unscaledWidth);
                                                    } else {
                                                        effectiveAspect = isRotated90 ? (580 / 760) : (792 / 612);
                                                    }
                                                }

                                                const baseW = isRotated90 ? 760 : 600;
                                                const containerWidth = Math.round(baseW * scrollZoom);
                                                const containerHeight = Math.round(containerWidth * effectiveAspect);

                                                return (
                                                    <div
                                                        key={p.id}
                                                        id={`pdf-page-${idx}`}
                                                        className="flex flex-col items-center w-full"
                                                        onClick={(e) => {
                                                            if (e.target === e.currentTarget) handleDeselectAll();
                                                        }}
                                                    >
                                                        {/* Page Number Label */}
                                                        <div className="text-[11px] font-mono font-bold text-slate-400 mb-1 flex items-center gap-2">
                                                            <span>Page {idx + 1} of {pages.length}</span>
                                                            <span className="text-[10px] text-slate-500 truncate max-w-xs">({sourceDoc?.name})</span>
                                                        </div>

                                                        {/* Page Canvas Container with Clean Standard Border */}
                                                        <div
                                                            className="relative bg-white shadow-xl rounded-sm border border-slate-200/80 dark:border-slate-800 select-none overflow-hidden"
                                                            style={{
                                                                width: `${containerWidth}px`,
                                                                height: `${containerHeight}px`,
                                                                cursor: getToolCursor(activeTool, penColor, highlighterColor)
                                                            }}
                                                            onClick={(e) => {
                                                                if (activeTool === 'select' && e.target === e.currentTarget) {
                                                                    handleDeselectAll();
                                                                }
                                                            }}
                                                        >
                                                            {/* Render PDF Page with Overlaid Canvas Content */}
                                                            <PdfPageCanvas
                                                                pdfDoc={sourceDoc?.pdfDoc}
                                                                pageNumber={p.originalPageNum}
                                                                rotation={p.rotation}
                                                                watermarkText={appliedWatermarkText}
                                                                watermarkColor={appliedWatermarkColor}
                                                                watermarkOpacity={watermarkOpacity}
                                                                watermarkImage={appliedWatermarkImage}
                                                                annotations={annotations.filter(a => a.pageId ? a.pageId === p.id : a.pageIndex === idx)}
                                                                scale={null}
                                                                targetWidth={containerWidth}
                                                                suppressInteractive={true}
                                                                onDimensions={(dims) => handlePageDimensions({ ...dims, docIndex: p.docIndex ?? 0 })}
                                                            />

                                                            {/* Live Overlay Canvas for Real-time Zero-Shift Drawing */}
                                                            <canvas
                                                                ref={(el) => { if (el) overlayCanvasRefs.current[idx] = el; }}
                                                                width={containerWidth}
                                                                height={containerHeight}
                                                                className="absolute inset-0 z-10 touch-none w-full h-full"
                                                                style={{
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    cursor: getToolCursor(activeTool, penColor, highlighterColor),
                                                                    pointerEvents: (activeTool === 'select' && selectSubMode === 'pointer') ? 'none' : 'auto'
                                                                }}
                                                                onMouseDown={(e) => {
                                                                    setSelectedAnnotationPageIndex(idx);
                                                                    handleCanvasMouseDown(e, idx);
                                                                }}
                                                                onMouseMove={(e) => handleCanvasMouseMove(e, idx)}
                                                                onMouseUp={(e) => handleCanvasMouseUp(e, idx)}
                                                                onTouchStart={(e) => {
                                                                    setSelectedAnnotationPageIndex(idx);
                                                                    handleCanvasMouseDown(e, idx);
                                                                }}
                                                                onTouchMove={(e) => handleCanvasMouseMove(e, idx)}
                                                                onTouchEnd={(e) => handleCanvasMouseUp(e, idx)}
                                                            />

                                                            {/* Interactive Draggable, Resizable & Deletable Stamps */}
                                                            {annotations
                                                                .filter(a => a.type === 'stamp' && (a.pageId ? a.pageId === p.id : a.pageIndex === idx))
                                                                .map(stamp => (
                                                                    <InteractiveStamp
                                                                        key={stamp.id}
                                                                        stamp={stamp}
                                                                        isSelectMode={activeTool === 'select'}
                                                                        containerWidth={containerWidth}
                                                                        onUpdate={(patch) => {
                                                                            setAnnotations(prev => {
                                                                                const next = prev.map(a => a.id === stamp.id ? { ...a, ...patch } : a);
                                                                                pushHistory(pages, next);
                                                                                return next;
                                                                            });
                                                                        }}
                                                                        onDelete={() => {
                                                                            setAnnotations(prev => {
                                                                                const next = prev.filter(a => a.id !== stamp.id);
                                                                                pushHistory(pages, next);
                                                                                return next;
                                                                            });
                                                                            toast.success('Deleted stamp');
                                                                        }}
                                                                    />
                                                                ))
                                                            }

                                                            {/* Interactive Draggable, Resizable & Deletable Signatures */}
                                                            {annotations
                                                                .filter(a => a.type === 'signature' && (a.pageId ? a.pageId === p.id : a.pageIndex === idx))
                                                                .map(sig => (
                                                                    <InteractiveSignature
                                                                        key={sig.id}
                                                                        sig={sig}
                                                                        signature={sig}
                                                                        isSelectMode={activeTool === 'select'}
                                                                        containerWidth={containerWidth}
                                                                        onUpdate={(patch) => {
                                                                            setAnnotations(prev => {
                                                                                const next = prev.map(a => a.id === sig.id ? { ...a, ...patch } : a);
                                                                                pushHistory(pages, next);
                                                                                return next;
                                                                            });
                                                                        }}
                                                                        onDelete={() => {
                                                                            setAnnotations(prev => {
                                                                                const next = prev.filter(a => a.id !== sig.id);
                                                                                pushHistory(pages, next);
                                                                                return next;
                                                                            });
                                                                            toast.success('Deleted signature');
                                                                        }}
                                                                    />
                                                                ))
                                                            }

                                                            {/* Interactive Draggable, Resizable & Editable Text Boxes */}
                                                            {annotations
                                                                .filter(a => (a.type === 'textbox' || a.type === 'text') && (a.pageId ? a.pageId === p.id : a.pageIndex === idx))
                                                                .map(box => (
                                                                    <InteractiveTextBox
                                                                        key={box.id}
                                                                        box={box}
                                                                        isSelectMode={activeTool === 'select'}
                                                                        containerWidth={containerWidth}
                                                                        isSelected={selectedTextBoxId === box.id}
                                                                        onSelect={(b) => {
                                                                            setSelectedTextBoxId(b.id);
                                                                            if (b.fontFamily) setActiveFontFamily(b.fontFamily);
                                                                            if (b.fontSize) setActiveFontSize(b.fontSize);
                                                                            if (b.bold !== undefined) setActiveBold(Boolean(b.bold));
                                                                            if (b.italic !== undefined) setActiveItalic(Boolean(b.italic));
                                                                            if (b.color) setActiveTextColor(b.color);
                                                                        }}
                                                                        onUpdate={(patch) => {
                                                                            setAnnotations(prev => {
                                                                                const next = prev.map(a => a.id === box.id ? { ...a, ...patch } : a);
                                                                                pushHistory(pages, next);
                                                                                return next;
                                                                            });
                                                                        }}
                                                                        onDelete={() => {
                                                                            setAnnotations(prev => {
                                                                                const next = prev.filter(a => a.id !== box.id);
                                                                                pushHistory(pages, next);
                                                                                return next;
                                                                            });
                                                                            if (selectedTextBoxId === box.id) setSelectedTextBoxId(null);
                                                                            toast.success('Deleted text box');
                                                                        }}
                                                                    />
                                                                ))
                                                            }

                                                            {/* Interactive Draggable, Resizable & Deletable Images */}
                                                            {annotations
                                                                .filter(a => a.type === 'image' && (a.pageId ? a.pageId === p.id : a.pageIndex === idx))
                                                                .map(img => (
                                                                    <InteractiveImage
                                                                        key={img.id}
                                                                        image={img}
                                                                        isSelectMode={activeTool === 'select'}
                                                                        containerWidth={containerWidth}
                                                                        onUpdate={(patch) => {
                                                                            setAnnotations(prev => {
                                                                                const next = prev.map(a => a.id === img.id ? { ...a, ...patch } : a);
                                                                                pushHistory(pages, next);
                                                                                return next;
                                                                            });
                                                                        }}
                                                                        onDelete={() => {
                                                                            setAnnotations(prev => {
                                                                                const next = prev.filter(a => a.id !== img.id);
                                                                                pushHistory(pages, next);
                                                                                return next;
                                                                            });
                                                                            toast.success('Deleted image');
                                                                        }}
                                                                    />
                                                                ))
                                                            }

                                                            {/* Interactive Draggable, Resizable & Selectable Shapes (Point 4) */}
                                                            {annotations
                                                                .filter(a => a.type === 'shape' && (a.pageId ? a.pageId === p.id : a.pageIndex === idx))
                                                                .map(shp => (
                                                                    <InteractiveShape
                                                                        key={shp.id}
                                                                        shape={shp}
                                                                        isSelectMode={activeTool === 'select'}
                                                                        isSelected={selectedShapeId === shp.id || selectedAnnotationIds.includes(shp.id)}
                                                                        onSelect={(id, isShift) => {
                                                                            if (isShift) {
                                                                                setSelectedAnnotationIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                                                                            } else {
                                                                                setSelectedShapeId(id);
                                                                                setSelectedAnnotationIds([id]);
                                                                            }
                                                                            if (shp.strokeWidth) setShapeStrokeWidth(shp.strokeWidth);
                                                                            if (shp.color) setPenColor(shp.color);
                                                                            if (shp.fill) setShapeFill(shp.fill);
                                                                        }}
                                                                        containerWidth={containerWidth}
                                                                        onUpdate={(patch) => {
                                                                            setAnnotations(prev => {
                                                                                const next = prev.map(a => a.id === shp.id ? { ...a, ...patch } : a);
                                                                                pushHistory(pages, next);
                                                                                return next;
                                                                            });
                                                                        }}
                                                                        onDelete={() => {
                                                                            setAnnotations(prev => {
                                                                                const next = prev.filter(a => a.id !== shp.id);
                                                                                pushHistory(pages, next);
                                                                                return next;
                                                                            });
                                                                            if (selectedShapeId === shp.id) setSelectedShapeId(null);
                                                                            setSelectedAnnotationIds(prev => prev.filter(x => x !== shp.id));
                                                                            toast.success('Deleted shape');
                                                                        }}
                                                                    />
                                                                ))
                                                            }

                                                            {/* Interactive Draggable, Editable Callout Annotations (Point 6) */}
                                                            {annotations
                                                                .filter(a => a.type === 'callout' && (a.pageId ? a.pageId === p.id : a.pageIndex === idx))
                                                                .map(cal => (
                                                                    <InteractiveCallout
                                                                        key={cal.id}
                                                                        callout={cal}
                                                                        isSelectMode={activeTool === 'select'}
                                                                        isSelected={selectedCalloutId === cal.id}
                                                                        onSelect={(id) => setSelectedCalloutId(id)}
                                                                        containerWidth={containerWidth}
                                                                        onUpdate={(patch) => {
                                                                            setAnnotations(prev => {
                                                                                const next = prev.map(a => a.id === cal.id ? { ...a, ...patch } : a);
                                                                                pushHistory(pages, next);
                                                                                return next;
                                                                            });
                                                                        }}
                                                                        onDelete={() => {
                                                                            setAnnotations(prev => {
                                                                                const next = prev.filter(a => a.id !== cal.id);
                                                                                pushHistory(pages, next);
                                                                                return next;
                                                                            });
                                                                            if (selectedCalloutId === cal.id) setSelectedCalloutId(null);
                                                                            toast.success('Deleted callout');
                                                                        }}
                                                                    />
                                                                ))
                                                            }

                                                            {/* In-Document Search Highlight Overlays (Point 3) */}
                                                            {searchMatches
                                                                .filter(m => m.pageIndex === idx)
                                                                .map(m => {
                                                                    const isCurrent = searchMatches[currentMatchIdx]?.id === m.id;
                                                                    return (
                                                                        <div
                                                                            key={m.id}
                                                                            id={`search-match-${m.id}`}
                                                                            className={`absolute rounded-[2px] pointer-events-none transition-all ${
                                                                                isCurrent
                                                                                    ? 'bg-amber-400/85 ring-2 ring-amber-500 shadow-md z-30 animate-pulse'
                                                                                    : 'bg-yellow-300/75 border border-yellow-400/80 mix-blend-multiply z-20'
                                                                            }`}
                                                                            style={{
                                                                                left: `${m.normX * 100}%`,
                                                                                top: `${m.normY * 100}%`,
                                                                                width: `${m.normWidth * 100}%`,
                                                                                height: `${m.normHeight * 100}%`
                                                                            }}
                                                                        />
                                                                    );
                                                                })
                                                            }
                                                        </div>

                                                        {/* Clear Dashed Page Break Divider between Pages */}
                                                        {idx < pages.length - 1 && (
                                                            <div className="w-full flex items-center justify-center my-6">
                                                                <div className="w-full max-w-xl border-b-2 border-dashed border-slate-400 dark:border-slate-600 relative flex justify-center">
                                                                    <span className="absolute -top-3 px-3 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs border border-slate-300 dark:border-slate-700">
                                                                        Page Break • End of Page {idx + 1}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Vertical Minimap Rail for Search Result Locations (Point 3) */}
                                    {searchMatches.length > 0 && activeTab === 'edit-merge' && (
                                        <div
                                            className="fixed right-2 top-28 bottom-14 w-3.5 z-40 rounded-full border shadow-lg flex flex-col items-center py-1 transition-all bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border-slate-300 dark:border-slate-700"
                                            title={`${searchMatches.length} search matches found`}
                                        >
                                            <div className="relative w-full h-full">
                                                {searchMatches.map((m, mIdx) => {
                                                    const isCurrent = currentMatchIdx === mIdx;
                                                    const posPct = ((m.pageIndex + Math.max(0, Math.min(0.99, m.normY))) / pages.length) * 100;
                                                    return (
                                                        <button
                                                            key={m.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setCurrentMatchIdx(mIdx);
                                                                document.getElementById(`pdf-page-${m.pageIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                            }}
                                                            className={`absolute left-0.5 right-0.5 rounded-full transition-all cursor-pointer ${
                                                                isCurrent
                                                                    ? 'h-2.5 bg-rose-500 ring-2 ring-rose-400 z-30 shadow-md'
                                                                    : 'h-1.5 bg-amber-400 hover:bg-amber-500 hover:h-2 z-20 opacity-85 hover:opacity-100'
                                                            }`}
                                                            style={{ top: `${Math.max(1, Math.min(98, posPct))}%` }}
                                                            title={`Page ${m.pageNum}: "${m.str}" (Match ${mIdx + 1})`}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            </div>
                        </div>
                    )}

                    {/* TAB 2: EXTRACT PAGES (Visual Cards with Checkboxes & Range Input) */}
                    {activeTab === 'extract' && (
                        <div className="w-full max-w-5xl space-y-5">
                            {sourceDocs.length === 0 ? (
                                <div className={`border-2 border-dashed rounded-3xl p-12 text-center transition flex flex-col items-center justify-center gap-4 ${
                                    isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-300 bg-white/90 shadow-md'
                                }`}>
                                    <Scissors size={32} className="text-rose-500" />
                                    <div>
                                        <h3 className="text-base font-bold mb-1">Upload a PDF to Extract Pages</h3>
                                        <p className="text-xs text-slate-400">Select which pages you want to extract into a standalone merged PDF or individual pages.</p>
                                    </div>
                                    <MultiSourceUploadDropdown
                                        onSelectLocalFiles={handleFilesSelect}
                                        onOpenPickerModal={handleOpenPicker}
                                        isDark={isDark}
                                    />
                                </div>
                            ) : (
                                <div className={`border rounded-3xl p-5 shadow-xl space-y-4 ${
                                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                                }`}>
                                    {/* Action Bar */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                                        <div className="flex items-center gap-2">
                                            {/* View Mode Toggle: Grid vs Scroll (Icon Only with Tooltip) */}
                                            <div className={`flex items-center rounded-lg border p-0.5 text-xs ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-100'}`}>
                                                <button
                                                    type="button"
                                                    onClick={() => setExtractViewMode('grid')}
                                                    className={`p-1.5 rounded-md transition flex items-center justify-center ${
                                                        extractViewMode === 'grid'
                                                            ? 'bg-rose-600 text-white shadow-xs'
                                                            : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                                                    }`}
                                                    title="Grid View"
                                                >
                                                    <LayoutGrid size={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setExtractViewMode('scroll')}
                                                    className={`p-1.5 rounded-md transition flex items-center justify-center ${
                                                        extractViewMode === 'scroll'
                                                            ? 'bg-rose-600 text-white shadow-xs'
                                                            : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                                                    }`}
                                                    title="Continuous Scroll View"
                                                >
                                                    <ScrollText size={15} />
                                                </button>
                                            </div>

                                            {/* Select All / Deselect All (Icon Only with Tooltip) */}
                                            <button
                                                type="button"
                                                onClick={handleSelectAllExtractPages}
                                                className={`p-1.5 rounded-xl border transition flex items-center justify-center ${
                                                    selectedExtractPages.length === pages.length
                                                        ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                                                        : isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                                                }`}
                                                title={selectedExtractPages.length === pages.length ? 'Deselect All Pages' : 'Select All Pages'}
                                            >
                                                <CheckSquare size={16} />
                                            </button>
                                            <span className="text-xs font-mono text-slate-400">
                                                <strong className="text-rose-500">{selectedExtractPages.length}</strong> of {pages.length} selected
                                            </span>
                                        </div>

                                        {/* Bidirectional Range Input */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-400">Range:</span>
                                            <input
                                                type="text"
                                                value={splitRange}
                                                onChange={(e) => handleSplitRangeChange(e.target.value)}
                                                placeholder="e.g. 1-3, 5"
                                                className={`border rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-rose-500 w-36 ${
                                                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                                }`}
                                            />
                                        </div>

                                        {/* Action Buttons: Merged PDF & Extract Actions Dropdown */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleExecuteExtractPages}
                                                disabled={processing || selectedExtractPages.length === 0}
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                                                title={`Download ${selectedExtractPages.length || pages.length} Selected Pages as Merged PDF`}
                                            >
                                                <Scissors size={14} className="text-rose-500" />
                                                <span className="hidden sm:inline">Merged PDF</span>
                                            </button>

                                            <div className="relative extract-dropdown-container">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowExtractDropdown(!showExtractDropdown)}
                                                    disabled={processing || pages.length === 0}
                                                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition"
                                                >
                                                    {processing ? <RefreshCw size={14} className="animate-spin" /> : <Archive size={14} />}
                                                    <span>Extract Actions</span>
                                                    <ChevronDown size={12} />
                                                </button>

                                                {showExtractDropdown && (
                                                    <div className={`absolute right-0 mt-1.5 w-72 rounded-2xl border p-1.5 shadow-2xl z-50 ${
                                                        isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                                                    }`}>
                                                        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                            ZIP Archive
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowExtractDropdown(false);
                                                                handleExtractZipAndSaveToOffice();
                                                            }}
                                                            disabled={processing}
                                                            className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition ${
                                                                isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                                                            }`}
                                                        >
                                                            <Cloud size={15} className="text-rose-500 shrink-0" />
                                                            <div>
                                                                <div className="font-bold text-xs">Zip & Save to Office Zip Folder</div>
                                                                <div className="text-[10px] text-slate-400">Stores in CloudVault &rarr; Zip Archives</div>
                                                            </div>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowExtractDropdown(false);
                                                                handleExtractDownloadZip();
                                                            }}
                                                            disabled={processing}
                                                            className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition ${
                                                                isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                                                            }`}
                                                        >
                                                            <Archive size={15} className="text-emerald-500 shrink-0" />
                                                            <div>
                                                                <div className="font-bold text-xs">Download ZIP</div>
                                                                <div className="text-[10px] text-slate-400">Downloads ZIP file directly to computer</div>
                                                            </div>
                                                        </button>

                                                        <div className={`my-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />

                                                        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                            Separate Single Pages
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowExtractDropdown(false);
                                                                handleExtractDownloadSeparatePages();
                                                            }}
                                                            disabled={processing}
                                                            className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition ${
                                                                isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                                                            }`}
                                                        >
                                                            <Layers size={15} className="text-blue-500 shrink-0" />
                                                            <div>
                                                                <div className="font-bold text-xs">Download Separate Pages</div>
                                                                <div className="text-[10px] text-slate-400">Downloads each page as separate PDF</div>
                                                            </div>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowExtractDropdown(false);
                                                                handleExtractSaveSeparatePagesToCloud();
                                                            }}
                                                            disabled={processing}
                                                            className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition ${
                                                                isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                                                            }`}
                                                        >
                                                            <FolderPlus size={15} className="text-amber-500 shrink-0" />
                                                            <div>
                                                                <div className="font-bold text-xs">Save Separate Pages to Cloud PDF</div>
                                                                <div className="text-[10px] text-slate-400">Saves in timestamped datetime folder</div>
                                                            </div>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* GRID VIEW */}
                                    {extractViewMode === 'grid' && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 max-h-[600px] overflow-y-auto p-1">
                                            {pages.map((p, idx) => {
                                                const pageNum = idx + 1;
                                                const isSelected = selectedExtractPages.includes(pageNum);
                                                const sourceDoc = sourceDocs[p.docIndex] || sourceDocs[0];

                                                return (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => handleToggleExtractPage(pageNum)}
                                                        className={`border rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer transition shadow-xs hover:shadow-md relative ${
                                                            isSelected
                                                                ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-500/5'
                                                                : isDark ? 'bg-slate-950 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => {}}
                                                                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer pointer-events-none"
                                                                />
                                                                <span className="font-bold text-rose-500">Page {pageNum}</span>
                                                            </div>
                                                            <span className="text-slate-400 text-[10px] truncate max-w-[80px]">
                                                                {sourceDoc?.name}
                                                            </span>
                                                        </div>

                                                        <div className="h-44 bg-white rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center relative">
                                                            <PdfPageCanvas
                                                                pdfDoc={sourceDoc?.pdfDoc}
                                                                pageNumber={p.originalPageNum}
                                                                rotation={p.rotation}
                                                                targetWidth={200}
                                                            />
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownloadSinglePage(p.originalPageNum);
                                                            }}
                                                            disabled={processing}
                                                            className="mt-2 w-full py-1.5 text-xs font-bold rounded-lg bg-rose-600/10 hover:bg-rose-600 text-rose-600 hover:text-white transition flex items-center justify-center"
                                                            title={`Download Page ${pageNum} as Standalone PDF`}
                                                        >
                                                            <Download size={14} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* SCROLL STREAM VIEW */}
                                    {extractViewMode === 'scroll' && (
                                        <div className="flex flex-col items-center gap-6 max-h-[600px] overflow-y-auto p-2">
                                            {pages.map((p, idx) => {
                                                const pageNum = idx + 1;
                                                const isSelected = selectedExtractPages.includes(pageNum);
                                                const sourceDoc = sourceDocs[p.docIndex] || sourceDocs[0];
                                                const containerWidth = 520;
                                                const containerHeight = Math.round(containerWidth * 1.33);

                                                return (
                                                    <div
                                                        key={p.id}
                                                        className="flex flex-col items-center w-full"
                                                    >
                                                        <div className="w-[520px] flex items-center justify-between mb-1.5 px-1 text-xs">
                                                            <label
                                                                onClick={() => handleToggleExtractPage(pageNum)}
                                                                className="flex items-center gap-2 cursor-pointer font-bold"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => {}}
                                                                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer pointer-events-none"
                                                                />
                                                                <span className={isSelected ? 'text-rose-500 font-bold' : 'text-slate-400'}>
                                                                    Select Page {pageNum} of {pages.length}
                                                                </span>
                                                            </label>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDownloadSinglePage(p.originalPageNum)}
                                                                disabled={processing}
                                                                className="p-1 rounded-md text-rose-500 hover:bg-rose-500/10 transition flex items-center justify-center"
                                                                title={`Download Page ${pageNum} as Standalone PDF`}
                                                            >
                                                                <Download size={15} />
                                                            </button>
                                                        </div>

                                                        <div
                                                            onClick={() => handleToggleExtractPage(pageNum)}
                                                            className={`relative bg-white shadow-xl rounded-sm border-2 transition cursor-pointer overflow-hidden ${
                                                                isSelected ? 'border-rose-500 ring-2 ring-rose-500/30' : 'border-black dark:border-slate-700'
                                                            }`}
                                                            style={{ width: `${containerWidth}px`, height: `${containerHeight}px` }}
                                                        >
                                                            <PdfPageCanvas
                                                                pdfDoc={sourceDoc?.pdfDoc}
                                                                pageNumber={p.originalPageNum}
                                                                rotation={p.rotation}
                                                                targetWidth={containerWidth}
                                                            />
                                                        </div>

                                                        {idx < pages.length - 1 && (
                                                            <div className="w-full flex items-center justify-center my-4">
                                                                <div className="w-full max-w-md border-b-2 border-dashed border-slate-300 dark:border-slate-700 relative flex justify-center">
                                                                    <span className="absolute -top-3 px-2 py-0.5 rounded-full text-[9px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                                        Page Break
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: COMPRESSOR */}
                    {activeTab === 'compress' && (
                        <div className="w-full max-w-xl space-y-6">
                            <div className={`border rounded-3xl p-6 shadow-xl space-y-5 ${
                                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}>
                                <div className={`flex items-center justify-between border-b pb-3 ${
                                    isDark ? 'border-slate-800' : 'border-slate-200'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <Sliders size={18} className="text-rose-500" />
                                        <h3 className="text-sm font-bold">Compress PDF</h3>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                        PDF Utilities
                                    </span>
                                </div>

                                {!activeFile ? (
                                    <label className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2 transition ${
                                        isDark ? 'border-slate-800 hover:border-slate-700 bg-slate-950/40' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                                    }`}>
                                        <Upload size={24} className="text-rose-500" />
                                        <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                            Select PDF Document to Compress
                                        </span>
                                        <input
                                            type="file"
                                            accept="application/pdf,.pdf"
                                            className="hidden"
                                            onChange={(e) => e.target.files?.length > 0 && handleFilesSelect(e.target.files)}
                                        />
                                    </label>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Multi-Document Selection */}
                                        {sourceDocs.length > 1 && (
                                            <div>
                                                <label className={`text-xs font-bold block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    Select Target PDF Document
                                                </label>
                                                <select
                                                    value={compressTargetDoc}
                                                    onChange={(e) => setCompressTargetDoc(e.target.value)}
                                                    className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-rose-500 ${
                                                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                                    }`}
                                                >
                                                    <option value="all">All Documents (Merged & Reorganized) — {totalFileSizeMb} MB</option>
                                                    {sourceDocs.map((doc, dIdx) => (
                                                        <option key={doc.id} value={dIdx}>
                                                            Doc {dIdx + 1}: {doc.name} ({doc.size} MB)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div className={`border rounded-xl p-3 flex items-center justify-between text-xs ${
                                            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                                        }`}>
                                            <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {compressTargetDoc === 'all' ? (sourceDocs.length > 1 ? 'Merged Studio Output' : activeFileName) : sourceDocs[parseInt(compressTargetDoc, 10)]?.name}
                                            </span>
                                            <span className="text-slate-400 font-mono">
                                                {compressTargetDoc === 'all' ? `${totalFileSizeMb} MB` : `${sourceDocs[parseInt(compressTargetDoc, 10)]?.size} MB`}
                                            </span>
                                        </div>

                                        {/* 3 Compression Tiers */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setCompressLevel('basic')}
                                                className={`p-2.5 rounded-2xl border text-left transition ${
                                                    compressLevel === 'basic'
                                                        ? 'border-rose-500 bg-rose-500/10 text-rose-400 shadow-sm'
                                                        : isDark ? 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="font-bold text-xs">Basic</div>
                                                <div className="text-[10px] opacity-75 mt-0.5">~40% savings</div>
                                                <div className="text-[9px] text-slate-400 mt-1">Crisp print quality</div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setCompressLevel('medium')}
                                                className={`p-2.5 rounded-2xl border text-left transition ${
                                                    compressLevel === 'medium'
                                                        ? 'border-rose-500 bg-rose-500/10 text-rose-400 shadow-sm'
                                                        : isDark ? 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="font-bold text-xs">Balanced</div>
                                                <div className="text-[10px] opacity-75 mt-0.5">~60% savings</div>
                                                <div className="text-[9px] text-slate-400 mt-1">Optimal sharing</div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setCompressLevel('strong')}
                                                className={`p-2.5 rounded-2xl border text-left transition ${
                                                    compressLevel === 'strong'
                                                        ? 'border-rose-500 bg-rose-500/10 text-rose-400 shadow-sm'
                                                        : isDark ? 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="font-bold text-xs">Strong</div>
                                                <div className="text-[10px] opacity-75 mt-0.5">~75-80% savings</div>
                                                <div className="text-[9px] text-slate-400 mt-1">Email / LMS ready</div>
                                            </button>
                                        </div>

                                        {/* Compression Stats Banner */}
                                        {compressStats && (
                                            <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                                                isDark ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                            }`}>
                                                <div>
                                                    <div className="font-bold flex items-center gap-1.5">
                                                        <Check size={14} className="text-emerald-500" />
                                                        <span>Compression Complete</span>
                                                    </div>
                                                    <div className="text-[11px] opacity-80 mt-0.5">
                                                        {(compressStats.originalSize / (1024 * 1024)).toFixed(2)} MB &rarr; {(compressStats.compressedSize / (1024 * 1024)).toFixed(2)} MB
                                                    </div>
                                                </div>
                                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white font-mono font-bold text-xs shadow-xs">
                                                    -{compressStats.savingsPercent}% Reduced
                                                </span>
                                            </div>
                                        )}

                                        {/* Dual Action Buttons: Local Download & Cloud Save */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => handleCompressPdf('local')}
                                                disabled={processing}
                                                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition"
                                            >
                                                {compressing ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                                                <span>Download Locally</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleCompressPdf('cloud')}
                                                disabled={processing}
                                                className={`w-full py-2.5 border rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                                                    isDark ? 'border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200' : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
                                                }`}
                                            >
                                                {compressing ? <RefreshCw size={14} className="animate-spin" /> : <Cloud size={14} className="text-rose-500" />}
                                                <span>Save to Cloud Vault</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: OCR & TEXT EXTRACTOR */}
                    {activeTab === 'ocr' && (
                        <div className="w-full max-w-2xl space-y-6">
                            <div className={`border rounded-3xl p-6 shadow-xl space-y-5 ${
                                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}>
                                <div className={`flex items-center justify-between border-b pb-3 ${
                                    isDark ? 'border-slate-800' : 'border-slate-200'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <FileSearch size={18} className="text-rose-500" />
                                        <h3 className="text-sm font-bold">OCR & Text Extractor</h3>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                        PDF Utilities
                                    </span>
                                </div>

                                {!activeFile ? (
                                    <label className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2 transition ${
                                        isDark ? 'border-slate-800 hover:border-slate-700 bg-slate-950/40' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                                    }`}>
                                        <Upload size={24} className="text-rose-500" />
                                        <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                            Select PDF Document to Extract Text
                                        </span>
                                        <input
                                            type="file"
                                            accept="application/pdf,.pdf"
                                            className="hidden"
                                            onChange={(e) => e.target.files?.length > 0 && handleFilesSelect(e.target.files)}
                                        />
                                    </label>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={handleRunOcr}
                                                disabled={ocrLoading}
                                                className="py-3 px-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition"
                                            >
                                                {ocrLoading ? <RefreshCw size={14} className="animate-spin" /> : <FileSearch size={14} />}
                                                <span>Fast Digital Text Extraction</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleRunVisionOcr}
                                                disabled={ocrLoading}
                                                className={`py-3 px-3 border rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                                                    isDark ? 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-200' : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
                                                }`}
                                            >
                                                {ocrLoading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} className="text-amber-500" />}
                                                <span>Multimodal AI Vision OCR</span>
                                            </button>
                                        </div>

                                        {/* Scanned PDF warning card */}
                                        {ocrResult && ocrResult.wordCount === 0 && (
                                            <div className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row items-center justify-between gap-3 ${
                                                isDark ? 'bg-amber-950/20 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                                            }`}>
                                                <div className="flex items-start gap-2">
                                                    <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <div className="font-bold">0 Selectable Words Detected</div>
                                                        <div className="text-[11px] opacity-80">This document contains images or scanned pages without selectable text streams. Run Multimodal AI Vision OCR.</div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleRunVisionOcr}
                                                    disabled={ocrLoading}
                                                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shrink-0 transition"
                                                >
                                                    Run AI Vision OCR
                                                </button>
                                            </div>
                                        )}

                                        {ocrResult && (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-4 gap-2 text-center">
                                                    <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                                        <div className="text-[10px] text-slate-400 uppercase font-bold">Pages</div>
                                                        <div className="font-bold text-sm text-rose-500">{ocrResult.pageCount}</div>
                                                    </div>
                                                    <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                                        <div className="text-[10px] text-slate-400 uppercase font-bold">Words</div>
                                                        <div className="font-bold text-sm text-emerald-500">{ocrResult.wordCount.toLocaleString()}</div>
                                                    </div>
                                                    <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                                        <div className="text-[10px] text-slate-400 uppercase font-bold">Characters</div>
                                                        <div className="font-bold text-sm text-blue-500">{ocrResult.charCount.toLocaleString()}</div>
                                                    </div>
                                                    <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                                        <div className="text-[10px] text-slate-400 uppercase font-bold">Lines</div>
                                                        <div className="font-bold text-sm text-amber-500">{ocrResult.lineCount.toLocaleString()}</div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-xs font-bold text-slate-400">Extracted Text Output</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                                                    navigator.clipboard.writeText(ocrResult.text);
                                                                    toast.success('Copied all text to clipboard!');
                                                                }
                                                            }}
                                                            className="text-xs text-rose-500 hover:underline font-semibold flex items-center gap-1"
                                                        >
                                                            <Copy size={12} /> Copy All Text
                                                        </button>
                                                    </div>
                                                    <textarea
                                                        readOnly
                                                        value={ocrResult.text}
                                                        rows={12}
                                                        className={`w-full border rounded-2xl p-3 font-mono text-xs focus:outline-none ${
                                                            isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                                                        }`}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* CUSTOM STAMP DIALOG MODAL */}
            {showCustomStampDialog && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4 ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <Stamp size={18} className="text-rose-500" />
                                <h3 className="text-sm font-bold">Create Custom Stamp</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCustomStampDialog(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Stamp Kind Tabs */}
                        <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setCustomStampKind('text')}
                                className={`py-2 rounded-xl border transition ${
                                    customStampKind === 'text'
                                        ? 'bg-rose-600 text-white border-rose-500'
                                        : isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                                }`}
                            >
                                Custom Text Stamp
                            </button>
                            <button
                                type="button"
                                onClick={() => setCustomStampKind('image')}
                                className={`py-2 rounded-xl border transition ${
                                    customStampKind === 'image'
                                        ? 'bg-rose-600 text-white border-rose-500'
                                        : isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                                }`}
                            >
                                Custom Image Stamp
                            </button>
                        </div>

                        {customStampKind === 'text' ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 block mb-1">Stamp Text</label>
                                    <input
                                        type="text"
                                        value={customStampText}
                                        onChange={(e) => setCustomStampText(e.target.value.toUpperCase())}
                                        placeholder="e.g. AUDITED & VERIFIED"
                                        className={`w-full border rounded-xl p-2.5 text-xs font-mono font-bold focus:outline-none focus:border-rose-500 ${
                                            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                        }`}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-400 block mb-1">Border & Text Color</label>
                                    <div className="flex items-center gap-2">
                                        {['#059669', '#dc2626', '#2563eb', '#7c3aed', '#d97706', '#000000'].map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setCustomStampColor(c)}
                                                className={`w-7 h-7 rounded-full border-2 transition ${customStampColor === c ? 'scale-110 border-rose-500 shadow-md' : 'border-transparent'}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Live Preview */}
                                <div className="border border-dashed rounded-xl p-4 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                                    <div
                                        className="border-2 rounded-lg px-4 py-2 font-mono font-bold text-center tracking-wider text-xs shadow-xs"
                                        style={{ borderColor: customStampColor, color: customStampColor }}
                                    >
                                        {customStampText || 'CUSTOM STAMP'}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-400 block mb-1">Upload Stamp Image / Logo</label>
                                <label className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2 transition ${
                                    isDark ? 'border-slate-800 hover:border-slate-700 bg-slate-950/40' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                                }`}>
                                    {customStampImage ? (
                                        <img src={customStampImage} alt="stamp preview" className="max-h-24 object-contain" />
                                    ) : (
                                        <>
                                            <Upload size={24} className="text-rose-500" />
                                            <span className="text-xs font-semibold">Choose PNG, JPG, or SVG</span>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => setCustomStampImage(ev.target.result);
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowCustomStampDialog(false)}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const fullLabel = customStampKind === 'text' ? (customStampText || 'CUSTOM STAMP') : 'Image Stamp';
                                    handleSaveCustomStamp({
                                        name: fullLabel,
                                        stampKind: customStampKind,
                                        text: fullLabel,
                                        color: customStampColor,
                                        imageUrl: customStampImage
                                    });
                                }}
                                className="px-3 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                                title="Save this stamp to library for future documents"
                            >
                                <Save size={13} />
                                <span>Save to Library</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (pages.length === 0) {
                                        toast.error('Please upload a PDF document first');
                                        return;
                                    }
                                    const targetPage = pages[selectedAnnotationPageIndex] || pages[0];
                                    const stampW = customStampKind === 'image' ? 120 : 150;
                                    const stampH = customStampKind === 'image' ? 120 : 46;
                                    const stampImgDataUrl = customStampKind === 'image' ? customStampImage : generateStampImageDataUrl(customStampText, customStampColor, stampW, stampH);
                                    const newAnn = {
                                        id: `ann_stamp_${Date.now()}`,
                                        pageId: targetPage.id,
                                        pageIndex: selectedAnnotationPageIndex,
                                        type: 'stamp',
                                        stampKind: customStampKind,
                                        text: customStampKind === 'text' ? customStampText : '',
                                        imageUrl: customStampKind === 'image' ? customStampImage : '',
                                        color: customStampColor,
                                        normX: 0.35,
                                        normY: 0.35,
                                        x: 210,
                                        y: 270,
                                        width: stampW,
                                        height: stampH,
                                        imageDataUrl: stampImgDataUrl
                                    };
                                    // Also auto-save to library for convenience
                                    handleSaveCustomStamp({
                                        name: customStampKind === 'text' ? (customStampText || 'CUSTOM STAMP') : 'Image Stamp',
                                        stampKind: customStampKind,
                                        text: customStampKind === 'text' ? customStampText : '',
                                        color: customStampColor,
                                        imageUrl: customStampImage
                                    });
                                    const updated = [...annotations, newAnn];
                                    setAnnotations(updated);
                                    pushHistory(pages, updated);
                                    setShowCustomStampDialog(false);
                                    toast.success('Added custom stamp to page and saved to library!');
                                }}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md transition"
                            >
                                Add Stamp to Document
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* SIGNATURE STUDIO MODAL */}
            <SignatureStudioModal
                isOpen={showSignatureModal}
                onClose={() => setShowSignatureModal(false)}
                onApply={handleApplySignature}
                savedSignatures={savedSignatures}
                onSaveSignature={handleSaveSignature}
                onDeleteSavedSignature={handleDeleteSavedSignature}
                isDark={isDark}
            />

            {/* HIGH-FIDELITY PRINT MODAL */}
            {showPrintModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4 ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                        <div className={`flex items-center justify-between border-b pb-3 ${
                            isDark ? 'border-slate-800' : 'border-slate-200'
                        }`}>
                            <div className="flex items-center gap-2">
                                <Printer size={18} className="text-rose-500" />
                                <h3 className="text-sm font-bold">Print Document</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPrintModal(false)}
                                className="text-slate-400 hover:text-white transition"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-3.5 text-xs">
                            <div className={`p-3 rounded-2xl border ${
                                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-slate-400">Total Document Pages</span>
                                    <span className="font-bold text-rose-500">{pages.length} Pages</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-400">Active Annotations</span>
                                    <span className="font-mono text-emerald-500">{annotations.length} items</span>
                                </div>
                            </div>

                            {/* Print with Annotations Toggle */}
                            <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                                printIncludeAnnotations
                                    ? 'border-rose-500/50 bg-rose-500/5'
                                    : isDark ? 'border-slate-800 hover:border-slate-700' : 'border-slate-200 hover:border-slate-300'
                            }`}>
                                <input
                                    type="checkbox"
                                    checked={printIncludeAnnotations}
                                    onChange={(e) => setPrintIncludeAnnotations(e.target.checked)}
                                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                                />
                                <div className="space-y-0.5">
                                    <div className="font-bold">Include Annotations & Markup</div>
                                    <div className="text-[11px] text-slate-400">
                                        Prints pen drawings, highlighters, status stamps, notes, text boxes, and watermarks overlaid onto the vector PDF pages.
                                    </div>
                                </div>
                            </label>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowPrintModal(false)}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleExecutePrint}
                                disabled={processing}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
                            >
                                {processing ? <RefreshCw size={14} className="animate-spin" /> : <Printer size={14} />}
                                <span>Print Document Now</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* OCR EXTRACTED TEXT MODAL */}
            {showOcrModal && ocrModalData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                    <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 space-y-4 ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                        <div className={`flex items-center justify-between border-b pb-3 ${
                            isDark ? 'border-slate-800' : 'border-slate-200'
                        }`}>
                            <div className="flex items-center gap-2">
                                <ScanText size={18} className="text-rose-500" />
                                <h3 className="text-sm font-bold">Extracted Text (Page {ocrModalData.pageNum || 1})</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowOcrModal(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition p-1 rounded-lg"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                            <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 font-bold border border-rose-500/20">
                                {ocrModalData.wordCount || 0} words
                            </span>
                            <span className="px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 font-medium border border-slate-500/20">
                                {ocrModalData.charCount || 0} characters
                            </span>
                        </div>

                        <div className="relative">
                            <textarea
                                readOnly
                                value={ocrModalData.text || ''}
                                className={`w-full h-56 p-3 text-xs font-mono rounded-2xl border resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/50 leading-relaxed ${
                                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                                }`}
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowOcrModal(false)}
                                className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(ocrModalData.text || '');
                                        toast.success('Copied extracted text to clipboard!', { icon: '📋' });
                                    } catch (e) {
                                        toast.error('Failed to copy to clipboard');
                                    }
                                }}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
                            >
                                <Copy size={14} />
                                <span>Copy to Clipboard</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Multi-Source PDF Picker Modal (Point 3) */}
            <MultiSourcePdfPickerModal
                isOpen={pickerModalOpen}
                onClose={() => setPickerModalOpen(false)}
                initialTab={pickerInitialTab}
                onSelectPdf={handlePickPdfFromModal}
            />
        </div>
    );
}
