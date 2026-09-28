'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    X, Download, Share2, QrCode, Copy, Check, FileText, 
    Image as ImageIcon, Layers, Upload, ExternalLink, Sparkles,
    FileSpreadsheet, MonitorPlay, CheckCircle2, AlertCircle
} from 'lucide-react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import toast from 'react-hot-toast';
import { DOMAIN_SHAPES } from './DomainShapeLibrary';
import { getAnchorPoint, getConnectorPath } from './ConnectorLine';
import katex from 'katex';
import html2canvas from 'html2canvas';
import { render3DObjectSVG } from './Whiteboard3DObject';

export default function WhiteboardExportModal({
    isOpen,
    onClose,
    whiteboardData,
    sessionId,
    whiteboardId,
    canvasRef,
    currentPage = 0,
    totalPages = 1,
    onImportWBF
}) {
    const [activeTab, setActiveTab] = useState('export'); // 'export' | 'share' | 'import'
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const fileInputRef = useRef(null);

    // Compute shareable URL and generate QR code
    useEffect(() => {
        if (!isOpen) return;

        if (typeof window !== 'undefined') {
            const origin = window.location.origin;
            let url = '';
            if (sessionId) {
                url = `${origin}/live-board?session=${sessionId}`;
            } else if (whiteboardId) {
                url = `${origin}/whiteboard?id=${whiteboardId}`;
            } else {
                url = window.location.href;
            }
            setShareUrl(url);

            QRCode.toDataURL(url, {
                width: 280,
                margin: 2,
                color: {
                    dark: '#0f172a',
                    light: '#ffffff'
                }
            }).then(uri => {
                setQrCodeDataUrl(uri);
            }).catch(err => {
                console.error('QR code generation failed:', err);
            });
        }
    }, [isOpen, sessionId, whiteboardId]);

    if (!isOpen) return null;

    const handleCopyLink = async () => {
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareUrl);
            } else {
                const el = document.createElement('textarea');
                el.value = shareUrl;
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
            }
            setCopied(true);
            toast.success('Shareable link copied to clipboard!', { icon: '📋' });
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            toast.error('Failed to copy link');
        }
    };

    // Helper to download a Blob or DataURL with filename
    const triggerDownload = (blobOrUrl, filename) => {
        const link = document.createElement('a');
        if (typeof blobOrUrl === 'string') {
            link.href = blobOrUrl;
        } else {
            link.href = URL.createObjectURL(blobOrUrl);
        }
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (typeof blobOrUrl !== 'string') {
            setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        }
    };

    // ─────────────────────────────────────────────────────────────────
    // Build Comprehensive Vector SVG for Export
    // ─────────────────────────────────────────────────────────────────
    const buildWhiteboardSVG = () => {
        const canvas = canvasRef?.current;
        const w = canvas ? canvas.width : 1920;
        const h = canvas ? canvas.height : 1080;
        const currentShapes = whiteboardData.pageShapeObjects?.[currentPage] || [];
        const currentTexts = whiteboardData.pageTextObjects?.[currentPage] || [];
        const currentImages = whiteboardData.pageImageObjects?.[currentPage] || [];
        const pageBg = whiteboardData.pageBackgrounds?.[currentPage] || { color: '#ffffff' };
        const bgColor = pageBg.color || '#ffffff';

        // Freehand drawing layer
        const freehandDataUrl = canvas ? canvas.toDataURL('image/png') : '';

        // Serialized Shapes
        const shapesSVG = currentShapes.filter(s => s.type !== 'connector').map(s => {
            const fill = s.fillColor && s.fillColor !== 'transparent' ? s.fillColor : 'none';
            const stroke = s.color || '#000000';
            const sw = s.strokeWidth || 2;
            const rot = s.rotation ? `transform="rotate(${s.rotation} ${s.x + s.width/2} ${s.y + s.height/2})"` : '';

            // Check if domain-specific shape
            if (s.type.startsWith('domain_') || DOMAIN_SHAPES[s.type]) {
                const shapeDef = DOMAIN_SHAPES[s.type] || DOMAIN_SHAPES[s.type.replace('domain_', '')];
                if (shapeDef) {
                    return `
    <g transform="translate(${s.x}, ${s.y}) ${s.rotation ? `rotate(${s.rotation} ${s.width/2} ${s.height/2})` : ''}">
        <rect width="${s.width}" height="${s.height}" fill="none" />
        <!-- Domain Symbol: ${shapeDef.name} -->
        <g stroke="${stroke}" stroke-width="${sw}" fill="${fill}">
            <rect width="${s.width}" height="${s.height}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" />
        </g>
    </g>`;
                }
            }

            if (s.type === 'rectangle') {
                return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" rx="${s.radius || 0}" ${rot} />`;
            } else if (s.type === 'rounded_rect') {
                const r = Math.min(20, s.width/4, s.height/4);
                return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" rx="${r}" ry="${r}" ${rot} />`;
            } else if (s.type === 'circle') {
                return `<ellipse cx="${s.x + s.width/2}" cy="${s.y + s.height/2}" rx="${s.width/2}" ry="${s.height/2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${rot} />`;
            } else if (s.type === 'triangle') {
                return `<polygon points="${s.x + s.width/2},${s.y} ${s.x},${s.y + s.height} ${s.x + s.width},${s.y + s.height}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" ${rot} />`;
            } else if (s.type === 'diamond') {
                return `<polygon points="${s.x + s.width/2},${s.y} ${s.x + s.width},${s.y + s.height/2} ${s.x + s.width/2},${s.y + s.height} ${s.x},${s.y + s.height/2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" ${rot} />`;
            } else if (s.type === 'star') {
                const cx = s.x + s.width/2;
                const cy = s.y + s.height/2;
                const outer = Math.min(s.width, s.height)/2;
                const inner = outer/2.5;
                const pts = [];
                for (let i = 0; i < 10; i++) {
                    const r = i % 2 === 0 ? outer : inner;
                    const angle = (i * Math.PI)/5 - Math.PI/2;
                    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
                }
                return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" ${rot} />`;
            } else if (s.type === 'hexagon') {
                const pts = `${s.x + s.width*0.25},${s.y} ${s.x + s.width*0.75},${s.y} ${s.x + s.width},${s.y + s.height*0.5} ${s.x + s.width*0.75},${s.y + s.height} ${s.x + s.width*0.25},${s.y + s.height} ${s.x},${s.y + s.height*0.5}`;
                return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" ${rot} />`;
            } else if (s.type === 'cloud') {
                return `<path d="M ${s.x + s.width*0.2} ${s.y + s.height*0.7} C ${s.x + s.width*0.05} ${s.y + s.height*0.7} ${s.x + s.width*0.05} ${s.y + s.height*0.45} ${s.x + s.width*0.2} ${s.y + s.height*0.4} C ${s.x + s.width*0.15} ${s.y + s.height*0.15} ${s.x + s.width*0.45} ${s.y + s.height*0.1} ${s.x + s.width*0.5} ${s.y + s.height*0.3} C ${s.x + s.width*0.6} ${s.y + s.height*0.15} ${s.x + s.width*0.85} ${s.y + s.height*0.2} ${s.x + s.width*0.85} ${s.y + s.height*0.4} C ${s.x + s.width*0.98} ${s.y + s.height*0.45} ${s.x + s.width*0.98} ${s.y + s.height*0.7} ${s.x + s.width*0.8} ${s.y + s.height*0.7} Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${rot} />`;
            } else if (s.type === 'line' || s.type === 'arrow' || s.type === 'double_arrow' || s.type === 'dashed_line') {
                const dash = s.type === 'dashed_line' ? 'stroke-dasharray="6,6"' : '';
                return `<line x1="${s.x}" y1="${s.y}" x2="${s.x + s.width}" y2="${s.y + s.height}" stroke="${stroke}" stroke-width="${sw}" ${dash} ${rot} />`;
            } else if (s.type === 'equation') {
                const mathHtml = katex.renderToString(s.latex || '', { displayMode: true, throwOnError: false });
                return `
    <g transform="translate(${s.x}, ${s.y}) ${rot}">
        <rect width="${s.width || 200}" height="${s.height || 80}" fill="${s.bgColor || 'transparent'}" rx="6" />
        <foreignObject width="${s.width || 200}" height="${s.height || 80}">
            <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:${s.color || '#1e293b'};font-size:${s.fontSize || 22}px;">
                ${mathHtml}
            </div>
        </foreignObject>
    </g>`;
            } else if (s.type === 'sticky_note') {
                return `
    <g transform="translate(${s.x}, ${s.y}) ${rot}">
        <rect width="${s.width}" height="${s.height}" fill="${s.color || '#fef08a'}" rx="6" stroke="#ca8a04" stroke-width="1" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))" />
        ${s.text ? `<text x="12" y="24" font-size="${s.fontSize || 14}" fill="#713f12" font-family="sans-serif">${(s.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>` : ''}
    </g>`;
            }
            return '';
        }).join('\n    ');

        // Serialized Connectors
        const connectorsSVG = currentShapes.filter(s => s.type === 'connector').map(conn => {
            const src = currentShapes.find(s => s.id === conn.sourceId) || currentImages.find(i => i.id === conn.sourceId);
            const tgt = currentShapes.find(s => s.id === conn.targetId) || currentImages.find(i => i.id === conn.targetId);
            const pt1 = src ? getAnchorPoint(src, conn.sourceAnchor || 'center') : (conn.sourcePoint || { x: 0, y: 0 });
            const pt2 = tgt ? getAnchorPoint(tgt, conn.targetAnchor || 'center') : (conn.targetPoint || { x: 100, y: 100 });
            const pathD = getConnectorPath(pt1, pt2, conn.pathType || 'curved', conn.waypoint, conn.sourceAnchor, conn.targetAnchor);
            const dash = conn.strokeStyle === 'dashed' ? 'stroke-dasharray="6,6"' : conn.strokeStyle === 'dotted' ? 'stroke-dasharray="2,4"' : '';
            return `<path d="${pathD}" fill="none" stroke="${conn.color || '#2563eb'}" stroke-width="${conn.strokeWidth || 2}" ${dash} marker-end="url(#arrowhead)" />`;
        }).join('\n    ');

        // Serialized 3D Objects
        const current3DObjects = whiteboardData.page3DObjects?.[currentPage] || [];
        const objects3DSVG = current3DObjects.map(obj => {
            const rot = obj.rotation ? `transform="rotate(${obj.rotation} ${obj.x + (obj.width || 220)/2} ${obj.y + (obj.height || 220)/2})"` : '';
            const svgContent = render3DObjectSVG(obj);
            if (!svgContent) return '';
            const innerSvg = svgContent.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
            return `
    <g transform="translate(${obj.x || 0}, ${obj.y || 0})" ${rot}>
        ${innerSvg}
    </g>`;
        }).join('\n');

        // Serialized Graph Objects
        const currentGraphObjects = whiteboardData.pageGraphObjects?.[currentPage] || [];
        const graphsSVG = currentGraphObjects.map(graph => {
            const rot = graph.rotation ? `transform="rotate(${graph.rotation} ${graph.x + (graph.width || 760)/2} ${graph.y + (graph.height || 480)/2})"` : '';
            const domGraphSvg = document.querySelector(`[data-graph-id="${graph.id}"] svg`);
            let innerSvg = '';
            if (domGraphSvg) {
                const serializer = new XMLSerializer();
                const str = serializer.serializeToString(domGraphSvg);
                innerSvg = str.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
            }
            return `
    <g transform="translate(${graph.x || 0}, ${graph.y || 0})" ${rot}>
        ${innerSvg}
    </g>`;
        }).join('\n');

        // Serialized Text Elements
        const textsSVG = currentTexts.map(t => {
            const rot = t.rotation ? `transform="rotate(${t.rotation} ${t.x + (t.width || 120)/2} ${t.y + (t.height || 30)/2})"` : '';
            const hasBg = t.bgColor && t.bgColor !== 'transparent';
            const hasBorder = (t.borderWidth || 0) > 0;
            const bgRect = (hasBg || hasBorder) 
                ? `<rect x="${t.x}" y="${t.y}" width="${t.width || 120}" height="${t.height || 30}" fill="${hasBg ? t.bgColor : 'none'}" stroke="${hasBorder ? (t.borderColor || '#3b82f6') : 'none'}" stroke-width="${hasBorder ? t.borderWidth : 0}" stroke-dasharray="${t.borderStyle === 'dashed' ? '6,6' : t.borderStyle === 'dotted' ? '3,3' : 'none'}" rx="${t.borderRadius || (hasBg ? 4 : 0)}" ${rot} />`
                : '';
            const cleanText = (t.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `
    ${bgRect}
    <text x="${t.x + 8}" y="${t.y + (t.fontSize || 20)}" font-size="${t.fontSize || 20}" font-family="${t.fontFamily || 'sans-serif'}" font-weight="${t.fontWeight || 'normal'}" font-style="${t.fontStyle || 'normal'}" fill="${t.color || '#000000'}" ${rot}>
        ${cleanText}
    </text>`;
        }).join('\n');

        // Serialized Image Elements
        const imagesSVG = currentImages.map(img => {
            const rot = img.rotation ? `transform="rotate(${img.rotation} ${img.x + img.width/2} ${img.y + img.height/2})"` : '';
            const borderSvg = img.borderWidth 
                ? `<rect x="${img.x}" y="${img.y}" width="${img.width}" height="${img.height}" fill="none" stroke="${img.borderColor || '#3b82f6'}" stroke-width="${img.borderWidth}" stroke-dasharray="${img.borderStyle === 'dashed' ? '6,6' : img.borderStyle === 'dotted' ? '3,3' : 'none'}" rx="${img.borderRadius || 0}" ${rot} />`
                : '';
            return `
    <image href="${img.src}" x="${img.x}" y="${img.y}" width="${img.width}" height="${img.height}" preserveAspectRatio="none" ${rot} />
    ${borderSvg}`;
        }).join('\n');

        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#2563eb" />
        </marker>
        <style>
            @import url('https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css');
        </style>
    </defs>
    <!-- Background Canvas -->
    <rect width="${w}" height="${h}" fill="${bgColor}" />
    <!-- Freehand Drawing Layer -->
    ${freehandDataUrl ? `<image href="${freehandDataUrl}" width="${w}" height="${h}" />` : ''}
    <!-- Shapes Layer -->
    ${shapesSVG}
    <!-- Connectors Layer -->
    ${connectorsSVG}
    <!-- 3D Objects Layer -->
    ${objects3DSVG}
    <!-- Graph Plotter Layer -->
    ${graphsSVG}
    <!-- Images Layer -->
    ${imagesSVG}
    <!-- Text Elements Layer -->
    ${textsSVG}
</svg>`;
    };

    // ─────────────────────────────────────────────────────────────────
    // Direct Composite Canvas Generator for High-Res PNG / JPEG / PDF / IWB
    // ─────────────────────────────────────────────────────────────────
    const generateCompositeCanvas = async () => {
        const canvas = canvasRef?.current;
        const w = canvas ? canvas.width : 1920;
        const h = canvas ? canvas.height : 1080;

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = w;
        exportCanvas.height = h;
        const ctx = exportCanvas.getContext('2d', { willReadFrequently: true });

        // 1. Draw page background color & pattern
        const pageBg = whiteboardData.pageBackgrounds?.[currentPage] || { color: '#ffffff', pattern: 'plain' };
        const bgColor = pageBg.color || '#ffffff';
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);

        const pattern = pageBg.pattern || 'plain';
        if (pattern && pattern !== 'plain' && pattern !== 'none') {
            ctx.save();
            ctx.strokeStyle = '#94a3b8';
            ctx.fillStyle = '#94a3b8';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.25;

            if (pattern === 'grid') {
                const step = 25;
                for (let x = 0; x <= w; x += step) {
                    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
                }
                for (let y = 0; y <= h; y += step) {
                    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
                }
            } else if (pattern === 'dotted') {
                const step = 20;
                for (let x = 0; x <= w; x += step) {
                    for (let y = 0; y <= h; y += step) {
                        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
                    }
                }
            } else if (pattern === 'lined') {
                const step = 25;
                for (let y = 0; y <= h; y += step) {
                    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
                }
            } else if (pattern === 'graph') {
                for (let x = 0; x <= w; x += 20) {
                    ctx.beginPath();
                    ctx.lineWidth = x % 100 === 0 ? 1.5 : 0.5;
                    ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
                }
                for (let y = 0; y <= h; y += 20) {
                    ctx.beginPath();
                    ctx.lineWidth = y % 100 === 0 ? 1.5 : 0.5;
                    ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
                }
            }
            ctx.restore();
        }

        // 2. Draw live freehand drawing canvas strokes
        if (canvas) {
            ctx.drawImage(canvas, 0, 0);
        }

        // 3. Draw Shapes Layer (standard, domain, sticky notes, and KaTeX equations)
        const currentShapes = whiteboardData.pageShapeObjects?.[currentPage] || [];
        for (const shpObj of currentShapes) {
            if (shpObj.type === 'connector') continue;

            if (shpObj.type === 'sticky_note') {
                ctx.save();
                const noteW = shpObj.width || 200;
                const noteH = shpObj.height || 200;
                const centerX = shpObj.x + noteW / 2;
                const centerY = shpObj.y + noteH / 2;
                ctx.translate(centerX, centerY);
                ctx.rotate(((shpObj.rotation || 0) * Math.PI) / 180);
                ctx.translate(-centerX, -centerY);

                const noteColor = shpObj.fillColor || shpObj.color || '#fef08a';
                const borderColor = shpObj.color || '#eab308';
                const textColor = shpObj.textColor || '#713f12';

                ctx.shadowColor = 'rgba(0,0,0,0.18)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetY = 4;
                ctx.fillStyle = noteColor;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(shpObj.x, shpObj.y, noteW, noteH, 10);
                else ctx.rect(shpObj.x, shpObj.y, noteW, noteH);
                ctx.fill();

                ctx.shadowColor = 'transparent';
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = shpObj.strokeWidth || 1;
                ctx.stroke();

                ctx.fillStyle = 'rgba(0,0,0,0.06)';
                ctx.fillRect(shpObj.x, shpObj.y, noteW, 26);

                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(shpObj.x + noteW / 2, shpObj.y + 13, 3.5, 0, 2 * Math.PI);
                ctx.fill();

                const noteText = shpObj.text || shpObj.title || '';
                if (noteText) {
                    ctx.fillStyle = textColor;
                    ctx.font = `${shpObj.fontSize || 13}px 'Inter', sans-serif`;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                    const lines = noteText.split('\n');
                    let curY = shpObj.y + 34;
                    for (const line of lines) {
                        ctx.fillText(line, shpObj.x + 10, curY);
                        curY += (shpObj.fontSize || 13) * 1.35;
                    }
                }
                ctx.restore();
                continue;
            }

            if (shpObj.type === 'equation') {
                try {
                    let renderedEq = false;
                    const domEq = document.querySelector(`[data-shape-id="${shpObj.id}"]`);
                    if (domEq) {
                        const eqCanvas = await html2canvas(domEq, {
                            backgroundColor: null,
                            scale: 2,
                            logging: false,
                            useCORS: true
                        });
                        if (eqCanvas) {
                            ctx.save();
                            const eqW = shpObj.width || 200;
                            const eqH = shpObj.height || 80;
                            ctx.translate(shpObj.x + eqW / 2, shpObj.y + eqH / 2);
                            if (shpObj.rotation) ctx.rotate((shpObj.rotation * Math.PI) / 180);
                            ctx.drawImage(eqCanvas, -eqW / 2, -eqH / 2, eqW, eqH);
                            ctx.restore();
                            renderedEq = true;
                        }
                    }

                    if (!renderedEq && shpObj.latex) {
                        const offDiv = document.createElement('div');
                        offDiv.style.position = 'fixed';
                        offDiv.style.left = '-9999px';
                        offDiv.style.top = '-9999px';
                        offDiv.style.width = `${shpObj.width || 200}px`;
                        offDiv.style.height = `${shpObj.height || 80}px`;
                        offDiv.style.display = 'flex';
                        offDiv.style.alignItems = 'center';
                        offDiv.style.justifyContent = 'center';
                        offDiv.style.color = shpObj.color || '#1e293b';
                        offDiv.style.fontSize = `${shpObj.fontSize || 22}px`;
                        offDiv.innerHTML = katex.renderToString(shpObj.latex || '', { displayMode: true, throwOnError: false });
                        document.body.appendChild(offDiv);
                        const offCanvas = await html2canvas(offDiv, { backgroundColor: null, scale: 2, logging: false });
                        document.body.removeChild(offDiv);
                        if (offCanvas) {
                            ctx.save();
                            const eqW = shpObj.width || 200;
                            const eqH = shpObj.height || 80;
                            ctx.translate(shpObj.x + eqW / 2, shpObj.y + eqH / 2);
                            if (shpObj.rotation) ctx.rotate((shpObj.rotation * Math.PI) / 180);
                            ctx.drawImage(offCanvas, -eqW / 2, -eqH / 2, eqW, eqH);
                            ctx.restore();
                            renderedEq = true;
                        }
                    }
                } catch (e) {
                    console.warn("Export composite equation error:", e);
                }
                continue;
            }

            // Check DOM SVG serialization for domain / custom shapes
            const domShapeSvg = document.querySelector(`[data-shape-id="${shpObj.id}"] svg`);
            if (domShapeSvg) {
                try {
                    const serializer = new XMLSerializer();
                    let svgStr = serializer.serializeToString(domShapeSvg);
                    if (!svgStr.includes('xmlns=')) {
                        svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
                    }
                    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
                    const blobUrl = URL.createObjectURL(svgBlob);
                    const img = new Image();
                    await new Promise((resolve) => {
                        img.onload = () => {
                            ctx.save();
                            const shapeW = Math.abs(shpObj.width || 100);
                            const shapeH = Math.abs(shpObj.height || 100);
                            ctx.translate(shpObj.x + shapeW / 2, shpObj.y + shapeH / 2);
                            if (shpObj.rotation) ctx.rotate((shpObj.rotation * Math.PI) / 180);
                            ctx.drawImage(img, -shapeW / 2, -shapeH / 2, shapeW, shapeH);
                            ctx.restore();
                            URL.revokeObjectURL(blobUrl);
                            resolve();
                        };
                        img.onerror = () => {
                            URL.revokeObjectURL(blobUrl);
                            resolve();
                        };
                        img.src = blobUrl;
                    });
                    continue;
                } catch (svgErr) {
                    console.warn("DOM shape SVG draw error:", svgErr);
                }
            }

            // Standard basic geometric shapes
            ctx.save();
            const centerX = shpObj.x + (shpObj.width || 100) / 2;
            const centerY = shpObj.y + (shpObj.height || 100) / 2;
            ctx.translate(centerX, centerY);
            if (shpObj.rotation) ctx.rotate((shpObj.rotation * Math.PI) / 180);
            ctx.translate(-centerX, -centerY);

            ctx.strokeStyle = shpObj.color || '#000000';
            ctx.lineWidth = shpObj.strokeWidth || 2;
            const fill = shpObj.fillColor && shpObj.fillColor !== 'transparent' ? shpObj.fillColor : null;
            if (fill) ctx.fillStyle = fill;

            if (shpObj.type === 'rectangle') {
                if (fill) ctx.fillRect(shpObj.x, shpObj.y, shpObj.width, shpObj.height);
                ctx.strokeRect(shpObj.x, shpObj.y, shpObj.width, shpObj.height);
            } else if (shpObj.type === 'rounded_rect') {
                const r = Math.min(20, Math.abs(shpObj.width)/4, Math.abs(shpObj.height)/4);
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(shpObj.x, shpObj.y, shpObj.width, shpObj.height, r);
                else ctx.rect(shpObj.x, shpObj.y, shpObj.width, shpObj.height);
                if (fill) ctx.fill();
                ctx.stroke();
            } else if (shpObj.type === 'circle') {
                ctx.beginPath();
                ctx.ellipse(shpObj.x + shpObj.width/2, shpObj.y + shpObj.height/2, Math.abs(shpObj.width)/2, Math.abs(shpObj.height)/2, 0, 0, Math.PI * 2);
                if (fill) ctx.fill();
                ctx.stroke();
            } else if (shpObj.type === 'triangle') {
                ctx.beginPath();
                ctx.moveTo(shpObj.x + shpObj.width / 2, shpObj.y);
                ctx.lineTo(shpObj.x, shpObj.y + shpObj.height);
                ctx.lineTo(shpObj.x + shpObj.width, shpObj.y + shpObj.height);
                ctx.closePath();
                if (fill) ctx.fill();
                ctx.stroke();
            } else if (shpObj.type === 'diamond') {
                ctx.beginPath();
                ctx.moveTo(shpObj.x + shpObj.width / 2, shpObj.y);
                ctx.lineTo(shpObj.x + shpObj.width, shpObj.y + shpObj.height / 2);
                ctx.lineTo(shpObj.x + shpObj.width / 2, shpObj.y + shpObj.height);
                ctx.lineTo(shpObj.x, shpObj.y + shpObj.height / 2);
                ctx.closePath();
                if (fill) ctx.fill();
                ctx.stroke();
            } else if (shpObj.type === 'line' || shpObj.type === 'arrow' || shpObj.type === 'double_arrow' || shpObj.type === 'dashed_line') {
                if (shpObj.type === 'dashed_line') ctx.setLineDash([6, 6]);
                ctx.beginPath();
                ctx.moveTo(shpObj.x, shpObj.y);
                ctx.lineTo(shpObj.x + shpObj.width, shpObj.y + shpObj.height);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.restore();
        }

        // 4. Draw Connectors Layer
        const currentConnectors = currentShapes.filter(s => s.type === 'connector');
        const currentImages = whiteboardData.pageImageObjects?.[currentPage] || [];
        for (const conn of currentConnectors) {
            ctx.save();
            let startPt = { x: conn.startX || 0, y: conn.startY || 0 };
            let endPt = { x: conn.endX || 0, y: conn.endY || 0 };
            if (conn.sourceId) {
                const srcShape = currentShapes.find(s => s.id === conn.sourceId) || currentImages.find(i => i.id === conn.sourceId);
                if (srcShape) startPt = getAnchorPoint(srcShape, conn.sourceAnchor || 'auto', endPt);
            }
            if (conn.targetId) {
                const tgtShape = currentShapes.find(s => s.id === conn.targetId) || currentImages.find(i => i.id === conn.targetId);
                if (tgtShape) endPt = getAnchorPoint(tgtShape, conn.targetAnchor || 'auto', startPt);
            }
            ctx.strokeStyle = conn.color || '#3b82f6';
            ctx.lineWidth = conn.strokeWidth || 2;
            const pathType = conn.connectorType || conn.pathType || 'curved';
            const pathD = getConnectorPath(startPt, endPt, pathType, conn.waypoint, conn.sourceAnchor, conn.targetAnchor);
            const path2D = new Path2D(pathD);
            if (conn.borderStyle === 'dashed') ctx.setLineDash([6, 6]);
            else if (conn.borderStyle === 'dotted') ctx.setLineDash([2, 4]);
            ctx.stroke(path2D);
            ctx.restore();
        }

        // 5. Draw 3D Objects Layer
        const current3DObjects = whiteboardData.page3DObjects?.[currentPage] || [];
        for (const obj3d of current3DObjects) {
            try {
                let rendered3D = false;
                const dom3dSvg = document.querySelector(`[data-3d-id="${obj3d.id}"] svg`);
                let svgStr = '';
                if (dom3dSvg) {
                    const serializer = new XMLSerializer();
                    svgStr = serializer.serializeToString(dom3dSvg);
                    if (!svgStr.includes('xmlns=')) {
                        svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
                    }
                }
                if (!svgStr && typeof render3DObjectSVG === 'function') {
                    svgStr = render3DObjectSVG(obj3d);
                }

                if (svgStr) {
                    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
                    const blobUrl = URL.createObjectURL(svgBlob);
                    const img = new Image();
                    await new Promise((resolve) => {
                        img.onload = () => {
                            ctx.save();
                            const w3 = obj3d.width || 220;
                            const h3 = obj3d.height || 220;
                            ctx.translate(obj3d.x || 0, obj3d.y || 0);
                            if (obj3d.rotation) {
                                ctx.translate(w3 / 2, h3 / 2);
                                ctx.rotate((obj3d.rotation * Math.PI) / 180);
                                ctx.translate(-w3 / 2, -h3 / 2);
                            }
                            ctx.drawImage(img, 0, 0, w3, h3);
                            ctx.restore();
                            URL.revokeObjectURL(blobUrl);
                            rendered3D = true;
                            resolve();
                        };
                        img.onerror = () => {
                            URL.revokeObjectURL(blobUrl);
                            resolve();
                        };
                        img.src = blobUrl;
                    });
                }
            } catch (e) {
                console.warn("Export 3D object rendering error:", e);
            }
        }

        // 5.5 Draw Graph Plotter Layer
        const currentGraphObjects = whiteboardData.pageGraphObjects?.[currentPage] || [];
        for (const graphObj of currentGraphObjects) {
            try {
                const domGraphSvg = document.querySelector(`[data-graph-id="${graphObj.id}"] svg`);
                if (domGraphSvg) {
                    const serializer = new XMLSerializer();
                    let svgStr = serializer.serializeToString(domGraphSvg);
                    if (!svgStr.includes('xmlns=')) {
                        svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
                    }
                    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
                    const blobUrl = URL.createObjectURL(svgBlob);
                    const img = new Image();
                    await new Promise((resolve) => {
                        img.onload = () => {
                            ctx.save();
                            const gw = graphObj.width || 760;
                            const gh = graphObj.height || 480;
                            ctx.translate(graphObj.x || 0, graphObj.y || 0);
                            if (graphObj.rotation) {
                                ctx.translate(gw / 2, gh / 2);
                                ctx.rotate((graphObj.rotation * Math.PI) / 180);
                                ctx.translate(-gw / 2, -gh / 2);
                            }
                            ctx.drawImage(img, 0, 0, gw, gh);
                            ctx.restore();
                            URL.revokeObjectURL(blobUrl);
                            resolve();
                        };
                        img.onerror = () => {
                            URL.revokeObjectURL(blobUrl);
                            resolve();
                        };
                        img.src = blobUrl;
                    });
                }
            } catch (gErr) {
                console.warn("Export graph object rendering error:", gErr);
            }
        }

        // 6. Draw Images Layer (DOM direct draw first, then async preload fallback)
        if (currentImages.length > 0) {
            await Promise.all(currentImages.map(imgObj => new Promise((resolve) => {
                const domImg = document.querySelector(`[data-image-id="${imgObj.id}"] img`);
                const renderImageToCtx = (imgSource) => {
                    try {
                        ctx.save();
                        const centerX = imgObj.x + imgObj.width / 2;
                        const centerY = imgObj.y + imgObj.height / 2;
                        ctx.translate(centerX, centerY);
                        ctx.rotate((imgObj.rotation || 0) * Math.PI / 180);
                        if (imgObj.flipX || imgObj.flipY) {
                            ctx.scale(imgObj.flipX ? -1 : 1, imgObj.flipY ? -1 : 1);
                        }
                        if (imgObj.opacity !== undefined) {
                            ctx.globalAlpha = imgObj.opacity / 100;
                        }
                        if (imgObj.borderRadius) {
                            ctx.beginPath();
                            if (ctx.roundRect) ctx.roundRect(-imgObj.width / 2, -imgObj.height / 2, imgObj.width, imgObj.height, imgObj.borderRadius);
                            else ctx.rect(-imgObj.width / 2, -imgObj.height / 2, imgObj.width, imgObj.height);
                            ctx.clip();
                        }
                        ctx.drawImage(imgSource, -imgObj.width / 2, -imgObj.height / 2, imgObj.width, imgObj.height);

                        if (imgObj.borderWidth) {
                            ctx.lineWidth = imgObj.borderWidth;
                            ctx.strokeStyle = imgObj.borderColor || '#3b82f6';
                            if (imgObj.borderStyle === 'dashed') ctx.setLineDash([6, 6]);
                            else if (imgObj.borderStyle === 'dotted') ctx.setLineDash([2, 4]);
                            else ctx.setLineDash([]);
                            ctx.strokeRect(-imgObj.width / 2, -imgObj.height / 2, imgObj.width, imgObj.height);
                        }
                        ctx.restore();
                    } catch (e) {
                        console.error("Error rendering image in export composite", e);
                    }
                    resolve();
                };

                if (domImg && domImg.complete && domImg.naturalWidth > 0) {
                    renderImageToCtx(domImg);
                    return;
                }

                const img = new Image();
                if (imgObj.src && (imgObj.src.startsWith('http://') || imgObj.src.startsWith('https://'))) {
                    img.crossOrigin = 'anonymous';
                }
                img.onload = () => renderImageToCtx(img);
                img.onerror = () => {
                    if (img.crossOrigin) {
                        const fallbackImg = new Image();
                        fallbackImg.onload = () => renderImageToCtx(fallbackImg);
                        fallbackImg.onerror = resolve;
                        fallbackImg.src = imgObj.src;
                    } else {
                        resolve();
                    }
                };
                img.src = imgObj.src;
                if (img.complete) {
                    renderImageToCtx(img);
                }
            })));
        }

        // 7. Draw Text Layer (with KaTeX math typesetting support via html2canvas)
        const currentTexts = whiteboardData.pageTextObjects?.[currentPage] || [];
        for (const txtObj of currentTexts) {
            ctx.save();
            const centerX = txtObj.x + txtObj.width / 2;
            const centerY = txtObj.y + txtObj.height / 2;
            ctx.translate(centerX, centerY);
            ctx.rotate((txtObj.rotation || 0) * Math.PI / 180);

            let renderedViaCanvas = false;
            const hasMath = (txtObj.text?.includes('$') || /\\(frac|sqrt|int|sum|prod|lim|alpha|beta|theta|pi|times|div|pm|log|sin|cos|tan)\b|[\^_]/.test(txtObj.text || ''));
            const domTxt = document.querySelector(`[data-text-id="${txtObj.id}"]`);

            if (hasMath && domTxt) {
                try {
                    const textCanvas = await html2canvas(domTxt, {
                        backgroundColor: null,
                        scale: 2,
                        logging: false,
                        useCORS: true
                    });
                    if (textCanvas) {
                        ctx.drawImage(textCanvas, -txtObj.width / 2, -txtObj.height / 2, txtObj.width, txtObj.height);
                        renderedViaCanvas = true;
                    }
                } catch (tErr) {
                    console.warn("Failed html2canvas for text math in export:", tErr);
                }
            }

            if (!renderedViaCanvas) {
                const hasBg = txtObj.bgColor && txtObj.bgColor !== 'transparent';
                const bw = txtObj.borderWidth || 0;
                if (hasBg || bw > 0) {
                    const rx = -txtObj.width / 2;
                    const ry = -txtObj.height / 2;
                    const rw = txtObj.width;
                    const rh = txtObj.height;
                    const cr = txtObj.borderRadius || 0;
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, cr);
                    else ctx.rect(rx, ry, rw, rh);
                    if (hasBg) {
                        ctx.fillStyle = txtObj.bgColor;
                        ctx.fill();
                    }
                    if (bw > 0) {
                        ctx.lineWidth = bw;
                        ctx.strokeStyle = txtObj.borderColor || '#3b82f6';
                        if (txtObj.borderStyle === 'dashed') ctx.setLineDash([6, 6]);
                        else if (txtObj.borderStyle === 'dotted') ctx.setLineDash([3, 3]);
                        else ctx.setLineDash([]);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                }

                ctx.font = `${txtObj.fontStyle || 'normal'} ${txtObj.fontWeight || 'normal'} ${txtObj.fontSize || 20}px ${txtObj.fontFamily || 'sans-serif'}`;
                ctx.fillStyle = txtObj.color || '#000000';
                ctx.textAlign = txtObj.textAlign || 'left';
                ctx.textBaseline = 'top';

                const lines = (txtObj.text || '').split('\n');
                const lineHeight = (txtObj.fontSize || 20) * 1.3;
                const startX = -txtObj.width / 2 + 8;
                let startY = -txtObj.height / 2 + 8;

                lines.forEach(line => {
                    ctx.fillText(line, startX, startY);
                    startY += lineHeight;
                });
            }
            ctx.restore();
        }

        return exportCanvas;
    };

    // 1. Export WBF (Native Whiteboard File)
    const exportWBF = () => {
        try {
            const data = {
                format: 'WBF',
                version: '2.0',
                appName: 'Interactive Whiteboard',
                exportedAt: new Date().toISOString(),
                totalPages,
                currentPage,
                pageBackgrounds: whiteboardData.pageBackgrounds || {},
                pageImageObjects: whiteboardData.pageImageObjects || {},
                pageTextObjects: whiteboardData.pageTextObjects || {},
                pageShapeObjects: whiteboardData.pageShapeObjects || {},
                page3DObjects: whiteboardData.page3DObjects || {},
                pagePdfObjects: whiteboardData.pagePdfObjects || {},
                pageMediaObjects: whiteboardData.pageMediaObjects || {},
                pages: whiteboardData.pages || []
            };

            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const timestamp = new Date().toISOString().slice(0, 10);
            triggerDownload(blob, `Whiteboard_${timestamp}.wbf`);
            toast.success('Exported native WBF file! Ready to reopen anytime.', { icon: '💾' });
        } catch (err) {
            console.error('WBF Export error:', err);
            toast.error('Failed to export WBF file');
        }
    };

    // 2. Export IWB / CFF (Interactive Whiteboard Common File Format for BenQ EZWrite, ViewSonic, SMART)
    const exportIWB = async () => {
        setIsExporting(true);
        try {
            const zip = new JSZip();
            const canvas = canvasRef?.current;
            const w = canvas ? canvas.width : 1920;
            const h = canvas ? canvas.height : 1080;

            // Generate composite image for background
            const compositeCanvas = await generateCompositeCanvas();
            const bgDataUrl = compositeCanvas.toDataURL('image/png');
            const base64Png = bgDataUrl.replace(/^data:image\/png;base64,/, '');

            if (base64Png) {
                zip.file('images/page_1.png', base64Png, { base64: true });
            }

            const currentShapes = whiteboardData.pageShapeObjects?.[currentPage] || [];
            const currentTexts = whiteboardData.pageTextObjects?.[currentPage] || [];

            // IMS Global / BSI CFF XML structure
            const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<iwb xmlns="http://www.imsglobal.org/xsd/iwb_v1p0" version="1.0">
    <head>
        <title>Interactive Panel Whiteboard Session</title>
        <generator>Interactive Whiteboard Suite</generator>
        <date>${new Date().toISOString()}</date>
    </head>
    <body>
        <page id="page_1" width="${w}" height="${h}">
            <background src="images/page_1.png" />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
                ${currentShapes.map(s => {
                    if (s.type === 'rectangle' || s.type === 'rounded_rect') {
                        return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="${s.fillColor || 'transparent'}" stroke="${s.color || '#000'}" stroke-width="${s.strokeWidth || 2}" rx="${s.radius || 0}" />`;
                    } else if (s.type === 'circle') {
                        return `<ellipse cx="${s.x + s.width/2}" cy="${s.y + s.height/2}" rx="${s.width/2}" ry="${s.height/2}" fill="${s.fillColor || 'transparent'}" stroke="${s.color || '#000'}" stroke-width="${s.strokeWidth || 2}" />`;
                    } else if (s.type === 'diamond') {
                        return `<polygon points="${s.x + s.width/2},${s.y} ${s.x + s.width},${s.y + s.height/2} ${s.x + s.width/2},${s.y + s.height} ${s.x},${s.y + s.height/2}" fill="${s.fillColor || 'transparent'}" stroke="${s.color || '#000'}" stroke-width="${s.strokeWidth || 2}" />`;
                    }
                    return '';
                }).filter(Boolean).join('\n                ')}
                ${currentTexts.map(t => {
                    const hasBg = t.bgColor && t.bgColor !== 'transparent';
                    const hasBorder = (t.borderWidth || 0) > 0;
                    const bgRect = (hasBg || hasBorder) ? `<rect x="${t.x}" y="${t.y}" width="${t.width || 120}" height="${t.height || 30}" fill="${hasBg ? t.bgColor : 'none'}" stroke="${hasBorder ? (t.borderColor || '#3b82f6') : 'none'}" stroke-width="${hasBorder ? t.borderWidth : 0}" rx="${t.borderRadius || 0}" />` : '';
                    return `${bgRect}<text x="${t.x}" y="${t.y + (t.fontSize || 20)}" font-size="${t.fontSize || 20}" font-family="${t.fontFamily || 'sans-serif'}" fill="${t.color || '#000'}">${(t.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`;
                }).join('\n                ')}
            </svg>
        </page>
    </body>
</iwb>`;

            zip.file('content.xml', contentXml);
            const content = await zip.generateAsync({ type: 'blob' });
            const timestamp = new Date().toISOString().slice(0, 10);
            triggerDownload(content, `Whiteboard_Panel_${timestamp}.iwb`);
            toast.success('Exported IWB file! Compatible with BenQ EZWrite & ViewSonic myViewBoard.', { icon: '📟', duration: 4000 });
        } catch (err) {
            console.error('IWB export error:', err);
            toast.error('Failed to export IWB package');
        } finally {
            setIsExporting(false);
        }
    };

    // 3. Export PNG / JPEG
    const exportImage = async (format = 'png') => {
        setIsExporting(true);
        try {
            const compositeCanvas = await generateCompositeCanvas();
            const mimeType = format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : 'image/png';
            const dataUrl = compositeCanvas.toDataURL(mimeType, 0.95);
            const timestamp = new Date().toISOString().slice(0, 10);
            triggerDownload(dataUrl, `Whiteboard_${timestamp}.${format}`);
            toast.success(`Exported complete ${format.toUpperCase()} image!`, { icon: '🖼️' });
        } catch (err) {
            console.error('Image export error:', err);
            toast.error(`Failed to export ${format.toUpperCase()}`);
        } finally {
            setIsExporting(false);
        }
    };

    // 4. Export PDF (Embedding complete composite canvas image)
    const exportPDF = async () => {
        setIsExporting(true);
        try {
            const compositeCanvas = await generateCompositeCanvas();
            const imgData = compositeCanvas.toDataURL('image/jpeg', 0.92);

            // Construct printable window for clean OS & display panel PDF saving
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Whiteboard_Page_${currentPage + 1}</title>
                        <style>
                            @page { size: landscape; margin: 0; }
                            body { margin: 0; padding: 0; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; }
                            img { width: 100vw; height: auto; max-height: 100vh; object-fit: contain; }
                        </style>
                    </head>
                    <body>
                        <img src="${imgData}" onload="window.print(); window.close();" />
                    </body>
                    </html>
                `);
                printWindow.document.close();
                toast.success('PDF print/export dialog launched with all board objects!', { icon: '📄' });
            } else {
                exportImage('png');
            }
        } catch (err) {
            console.error('PDF export error:', err);
            toast.error('Failed to export PDF');
        } finally {
            setIsExporting(false);
        }
    };

    // 5. Export SVG Vector
    const exportSVG = () => {
        try {
            const svgContent = buildWhiteboardSVG();
            const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
            triggerDownload(blob, `Whiteboard_Vector_${Date.now()}.svg`);
            toast.success('Exported complete scalable vector SVG!', { icon: '📐' });
        } catch (err) {
            console.error('SVG export error:', err);
            toast.error('Failed to export SVG');
        }
    };

    // ─────────────────────────────────────────────────────────────────
    // Robust, Tolerant WBF & BenQ EZWrite IWB Package Importer
    // ─────────────────────────────────────────────────────────────────
    const handleFileImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Interactive Whiteboard package (.iwb or .zip)
        if (file.name.endsWith('.iwb') || file.name.endsWith('.zip')) {
            try {
                const zip = await JSZip.loadAsync(file);
                const extractedImages = {};
                let bgImage = null;

                // 1. Extract all images into memory map
                const imgFiles = Object.keys(zip.files).filter(f => f.match(/\.(png|jpg|jpeg|svg|webp)$/i));
                for (const imgPath of imgFiles) {
                    const ext = imgPath.split('.').pop().toLowerCase();
                    const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
                    const imgData = await zip.files[imgPath].async('base64');
                    const dataUrl = `data:${mime};base64,${imgData}`;
                    extractedImages[imgPath] = dataUrl;
                    extractedImages[imgPath.replace(/^images\//, '')] = dataUrl;
                    if (!bgImage && imgPath.toLowerCase().includes('page')) {
                        bgImage = dataUrl;
                    }
                }
                if (!bgImage && imgFiles.length > 0) {
                    bgImage = extractedImages[imgFiles[0]];
                }

                // 2. Tolerant XML Parser for content.xml
                const parsedShapes = [];
                const parsedTexts = [];
                const parsedImages = [];

                if (zip.files['content.xml']) {
                    const xmlStr = await zip.files['content.xml'].async('text');
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');

                    // Gracefully inspect elements without throwing
                    try {
                        // Background check
                        const bgNode = xmlDoc.querySelector('background');
                        if (bgNode) {
                            const srcAttr = bgNode.getAttribute('src');
                            if (srcAttr && extractedImages[srcAttr]) {
                                bgImage = extractedImages[srcAttr];
                            }
                        }

                        // Rectangles
                        xmlDoc.querySelectorAll('rect').forEach((r, idx) => {
                            const x = parseFloat(r.getAttribute('x') || 0);
                            const y = parseFloat(r.getAttribute('y') || 0);
                            const w = parseFloat(r.getAttribute('width') || 100);
                            const h = parseFloat(r.getAttribute('height') || 80);
                            const fill = r.getAttribute('fill') || 'transparent';
                            const stroke = r.getAttribute('stroke') || '#3b82f6';
                            const sw = parseFloat(r.getAttribute('stroke-width') || 2);
                            const rx = parseFloat(r.getAttribute('rx') || 0);
                            parsedShapes.push({
                                id: `iwb_rect_${Date.now()}_${idx}`,
                                type: rx > 4 ? 'rounded_rect' : 'rectangle',
                                x, y, width: w, height: h,
                                color: stroke,
                                fillColor: fill,
                                strokeWidth: sw,
                                radius: rx
                            });
                        });

                        // Ellipses & Circles
                        xmlDoc.querySelectorAll('ellipse, circle').forEach((c, idx) => {
                            const cx = parseFloat(c.getAttribute('cx') || 50);
                            const cy = parseFloat(c.getAttribute('cy') || 50);
                            const rx = parseFloat(c.getAttribute('rx') || c.getAttribute('r') || 40);
                            const ry = parseFloat(c.getAttribute('ry') || c.getAttribute('r') || 40);
                            parsedShapes.push({
                                id: `iwb_circle_${Date.now()}_${idx}`,
                                type: 'circle',
                                x: cx - rx,
                                y: cy - ry,
                                width: rx * 2,
                                height: ry * 2,
                                color: c.getAttribute('stroke') || '#3b82f6',
                                fillColor: c.getAttribute('fill') || 'transparent',
                                strokeWidth: parseFloat(c.getAttribute('stroke-width') || 2)
                            });
                        });

                        // Texts
                        xmlDoc.querySelectorAll('text').forEach((t, idx) => {
                            const textContent = t.textContent?.trim();
                            if (textContent) {
                                const x = parseFloat(t.getAttribute('x') || 50);
                                const y = parseFloat(t.getAttribute('y') || 50);
                                const fs = parseFloat(t.getAttribute('font-size') || 20);
                                parsedTexts.push({
                                    id: `iwb_text_${Date.now()}_${idx}`,
                                    text: textContent,
                                    x,
                                    y: Math.max(0, y - fs),
                                    fontSize: fs,
                                    fontFamily: t.getAttribute('font-family') || 'sans-serif',
                                    color: t.getAttribute('fill') || '#0f172a',
                                    width: Math.max(120, textContent.length * (fs * 0.6)),
                                    height: Math.max(30, fs * 1.4)
                                });
                            }
                        });

                        // Images
                        xmlDoc.querySelectorAll('image').forEach((imgNode, idx) => {
                            const href = imgNode.getAttribute('href') || imgNode.getAttribute('xlink:href') || imgNode.getAttribute('src');
                            const srcData = extractedImages[href] || extractedImages[href?.replace(/^images\//, '')];
                            if (srcData) {
                                parsedImages.push({
                                    id: `iwb_img_${Date.now()}_${idx}`,
                                    src: srcData,
                                    x: parseFloat(imgNode.getAttribute('x') || 100),
                                    y: parseFloat(imgNode.getAttribute('y') || 100),
                                    width: parseFloat(imgNode.getAttribute('width') || 200),
                                    height: parseFloat(imgNode.getAttribute('height') || 150)
                                });
                            }
                        });
                    } catch (xmlInnerErr) {
                        console.warn('IWB tolerant parser warning (continuing with background):', xmlInnerErr);
                    }
                }

                if (onImportWBF) {
                    onImportWBF({
                        format: 'IWB',
                        bgImage,
                        shapes: parsedShapes,
                        texts: parsedTexts,
                        images: parsedImages
                    });
                    toast.success('Successfully imported Interactive Whiteboard (.iwb) package!', { icon: '📟' });
                    onClose();
                    return;
                }
            } catch (err) {
                console.error('IWB import error:', err);
                toast.error('Failed to unpack .iwb archive');
            }
            return;
        }

        // Native WBF (.wbf or .json)
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (onImportWBF) {
                    onImportWBF(parsed);
                    toast.success('Successfully imported Whiteboard File (.wbf)!', { icon: '🎉' });
                    onClose();
                }
            } catch (err) {
                console.error('Import error:', err);
                toast.error('Invalid .wbf or JSON file');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                            <Share2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-wide">Export & Classroom Sharing</h2>
                            <p className="text-xs text-slate-400">Save complete lessons or share live whiteboard with interactive displays</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2">
                    <button
                        onClick={() => setActiveTab('export')}
                        className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
                            activeTab === 'export'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Download className="w-4 h-4" /> Export Lesson
                    </button>
                    <button
                        onClick={() => setActiveTab('share')}
                        className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
                            activeTab === 'share'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <QrCode className="w-4 h-4" /> Live Share & QR Code
                    </button>
                    <button
                        onClick={() => setActiveTab('import')}
                        className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
                            activeTab === 'import'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Upload className="w-4 h-4" /> Open / Import File
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* TAB 1: EXPORT */}
                    {activeTab === 'export' && (
                        <div className="space-y-5">
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                                    Interactive Display & Native Formats
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* WBF Native */}
                                    <div 
                                        onClick={exportWBF}
                                        className="p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/60 transition cursor-pointer group flex items-start gap-3.5"
                                    >
                                        <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition shrink-0">
                                            <Layers className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition">Native Whiteboard (.wbf)</span>
                                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono font-bold">100% EDITABLE</span>
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed">Preserves shapes, text, real connectors, images, and rotation for reopening.</p>
                                        </div>
                                    </div>

                                    {/* IWB CFF Format */}
                                    <div 
                                        onClick={exportIWB}
                                        className="p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/60 transition cursor-pointer group flex items-start gap-3.5"
                                    >
                                        <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition shrink-0">
                                            <MonitorPlay className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition">Interactive Panel (.iwb)</span>
                                                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">EZWRITE / VIEWSONIC</span>
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed">Standard CFF package compatible with BenQ EZWrite & ViewSonic myViewBoard.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                                    Document & Image Formats
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {/* PDF */}
                                    <button
                                        onClick={exportPDF}
                                        disabled={isExporting}
                                        className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 flex flex-col items-center justify-center gap-2 text-center transition group disabled:opacity-50"
                                    >
                                        <FileText className="w-6 h-6 text-rose-400 group-hover:scale-110 transition" />
                                        <span className="text-xs font-semibold text-slate-200">PDF Document</span>
                                    </button>

                                    {/* PNG */}
                                    <button
                                        onClick={() => exportImage('png')}
                                        disabled={isExporting}
                                        className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 flex flex-col items-center justify-center gap-2 text-center transition group disabled:opacity-50"
                                    >
                                        <ImageIcon className="w-6 h-6 text-blue-400 group-hover:scale-110 transition" />
                                        <span className="text-xs font-semibold text-slate-200">PNG Image</span>
                                    </button>

                                    {/* JPEG */}
                                    <button
                                        onClick={() => exportImage('jpeg')}
                                        disabled={isExporting}
                                        className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 flex flex-col items-center justify-center gap-2 text-center transition group disabled:opacity-50"
                                    >
                                        <ImageIcon className="w-6 h-6 text-amber-400 group-hover:scale-110 transition" />
                                        <span className="text-xs font-semibold text-slate-200">JPEG Image</span>
                                    </button>

                                    {/* SVG */}
                                    <button
                                        onClick={exportSVG}
                                        disabled={isExporting}
                                        className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 flex flex-col items-center justify-center gap-2 text-center transition group disabled:opacity-50"
                                    >
                                        <Sparkles className="w-6 h-6 text-purple-400 group-hover:scale-110 transition" />
                                        <span className="text-xs font-semibold text-slate-200">SVG Vector</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: LIVE SHARE & QR CODE */}
                    {activeTab === 'share' && (
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            {/* QR Code */}
                            <div className="p-3 bg-white rounded-2xl shadow-xl border border-slate-200 shrink-0">
                                {qrCodeDataUrl ? (
                                    <img 
                                        src={qrCodeDataUrl} 
                                        alt="Whiteboard QR Code" 
                                        className="w-52 h-52 object-contain select-none"
                                    />
                                ) : (
                                    <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-xs">
                                        Generating QR...
                                    </div>
                                )}
                            </div>

                            {/* Share Details */}
                            <div className="flex-1 flex flex-col gap-4 w-full">
                                <div>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        Ready for Students & Classroom Panels
                                    </span>
                                    <h4 className="text-base font-bold text-white mb-1">Scan QR Code to Join Instantly</h4>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Students and teachers can scan this QR code with any tablet, phone, or interactive panel to open this whiteboard in real time.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-400 font-medium">Direct Shareable Link</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={shareUrl}
                                            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            onClick={handleCopyLink}
                                            className={`px-4 py-2.5 rounded-xl font-medium text-xs flex items-center gap-1.5 transition shrink-0 ${
                                                copied 
                                                    ? 'bg-emerald-600 text-white' 
                                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                            }`}
                                        >
                                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            {copied ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-2 flex items-center gap-3">
                                    <a
                                        href={shareUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 transition"
                                    >
                                        <ExternalLink className="w-4 h-4 text-indigo-400" /> Open in New Window
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: IMPORT WBF */}
                    {activeTab === 'import' && (
                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-950/40 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
                                <Upload className="w-7 h-7" />
                            </div>
                            <h4 className="text-base font-bold text-white mb-1">Open Whiteboard File (.wbf / .iwb)</h4>
                            <p className="text-xs text-slate-400 max-w-sm mb-4">
                                Select a native `.wbf` file or interactive flat panel `.iwb` package to restore your whiteboard session.
                            </p>

                            <input 
                                ref={fileInputRef}
                                type="file" 
                                accept=".wbf,.json,.iwb,.zip" 
                                className="hidden" 
                                onChange={handleFileImport}
                            />

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
                            >
                                <Upload className="w-4 h-4" /> Browse Device Files
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Optimized for BenQ, ViewSonic, SMART, and Promethean panels
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
}
