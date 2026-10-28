const { PDFDocument, rgb, degrees, StandardFonts, PDFName, PDFNumber } = require('pdf-lib');
const JSZip = require('jszip');
const { PDFParse } = require('pdf-parse');
let sharp;
try {
    sharp = require('sharp');
} catch (e) {
    console.warn('[PDFStudio] sharp not available, image recompression disabled');
}

function hexToRgb(hex, fallback = { r: 0.85, g: 0.15, b: 0.15 }) {
    if (!hex) return fallback;
    const clean = hex.replace('#', '').trim();
    if (clean.length === 6) {
        return {
            r: parseInt(clean.substring(0, 2), 16) / 255,
            g: parseInt(clean.substring(2, 4), 16) / 255,
            b: parseInt(clean.substring(4, 6), 16) / 255
        };
    }
    return fallback;
}

function sanitizePdfText(str) {
    if (!str) return '';
    return String(str)
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[\u2026]/g, '...')
        .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
        .trim();
}

/**
 * Render rich badge or stamp containing Unicode / Emoji characters to high-DPI PNG via Sharp
 * Preserves native emojis (✍️, ✅, ❌, ⭐, etc.) in exported PDFs without WinAnsi encoding crashes.
 */
async function renderRichBadgeToPngBuffer({ text, color = '#059669', bgColor = '#ecfdf5', width = 160, height = 48, isSignature = false }) {
    const escapeXml = (unsafe) => String(unsafe).replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });

    const cleanText = escapeXml(text);
    const strokeW = isSignature ? 1.5 : 2;
    const fontSize = Math.max(11, Math.round(height * 0.38));
    const fontFamily = isSignature ? 'Georgia, serif' : 'system-ui, -apple-system, sans-serif';
    const fontStyle = isSignature ? 'font-style="italic"' : '';

    const svg = `<svg width="${Math.round(width * 2)}" height="${Math.round(height * 2)}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${bgColor}" stroke="${color}" stroke-width="${strokeW}" rx="6" />
        <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="${fontFamily}" font-weight="bold" font-size="${fontSize}" ${fontStyle} fill="${color}">
            ${cleanText}
        </text>
    </svg>`;

    return await sharp(Buffer.from(svg)).png().toBuffer();
}

function getSpeechCalloutSvgPath(x, y, w, h, tx, ty, r = 8) {
    x = parseFloat(x || 0);
    y = parseFloat(y || 0);
    w = Math.max(20, parseFloat(w || 140));
    h = Math.max(20, parseFloat(h || 48));
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

class PdfStudioService {
    /**
     * Merge multiple PDF buffers in the specified order
     * @param {Array<Buffer>} pdfBuffers
     * @returns {Promise<Buffer>}
     */
    async mergePdfs(pdfBuffers) {
        if (!pdfBuffers || pdfBuffers.length < 2) {
            throw new Error('At least two PDF files are required for merging');
        }

        const mergedPdf = await PDFDocument.create();

        for (const buf of pdfBuffers) {
            const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
            const pageIndices = srcDoc.getPageIndices();
            const copiedPages = await mergedPdf.copyPages(srcDoc, pageIndices);
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }

        const mergedBytes = await mergedPdf.save({ useObjectStreams: true });
        return Buffer.from(mergedBytes);
    }

    /**
     * Compress PDF file (Basic, Medium, and Strong modes) with real image stream downsampling
     * @param {Buffer} pdfBuffer
     * @param {string} level ('basic' | 'medium' | 'strong')
     * @returns {Promise<{buffer: Buffer, originalSize: number, compressedSize: number, savingsPercent: number}>}
     */
    async compressPdf(pdfBuffer, level = 'basic') {
        if (!pdfBuffer) throw new Error('PDF buffer is required');
        const originalSize = pdfBuffer.length;

        const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

        // Configuration by tier
        let maxDimension = 1500;
        let quality = 70;
        if (level === 'medium') {
            maxDimension = 1100;
            quality = 55;
        } else if (level === 'strong') {
            maxDimension = 800;
            quality = 40;
        }

        // 1. Real raster image stream downsampling via Sharp
        if (sharp) {
            try {
                const objects = srcDoc.context.enumerateIndirectObjects();
                for (const [ref, obj] of objects) {
                    if (obj && obj.dict && obj.dict.get(PDFName.of('Subtype'))?.toString() === '/Image') {
                        try {
                            const streamData = obj.contents;
                            if (streamData && streamData.length > 500) {
                                const resized = await sharp(streamData)
                                    .resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true })
                                    .jpeg({ quality, mozjpeg: true })
                                    .toBuffer();

                                if (resized.length < streamData.length) {
                                    obj.contents = new Uint8Array(resized);
                                    obj.dict.set(PDFName.of('Length'), PDFNumber.of(resized.length));
                                    obj.dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
                                    const meta = await sharp(resized).metadata();
                                    if (meta.width) obj.dict.set(PDFName.of('Width'), PDFNumber.of(meta.width));
                                    if (meta.height) obj.dict.set(PDFName.of('Height'), PDFNumber.of(meta.height));
                                }
                            }
                        } catch (imgErr) {
                            // Non-JPEG/raw stream or unsupported color profile, keep original
                        }
                    }
                }
            } catch (enumErr) {
                console.warn('[PDF Studio] Image compression warning:', enumErr.message);
            }
        }

        // 2. Metadata handling
        if (level === 'strong') {
            srcDoc.setTitle('');
            srcDoc.setAuthor('');
            srcDoc.setSubject('');
            srcDoc.setKeywords([]);
            srcDoc.setProducer('ULRMS LabPDF Studio');
            srcDoc.setCreator('ULRMS LabPDF Studio');
        }

        // 3. Save with object streams to compress cross-references
        const compressedBytes = await srcDoc.save({
            useObjectStreams: true,
            addDefaultPage: false,
            objectsPerTick: 50
        });

        const compressedBuffer = Buffer.from(compressedBytes);
        const compressedSize = compressedBuffer.length;
        const savingsPercent = originalSize > 0 
            ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
            : 0;

        return {
            buffer: compressedBuffer,
            originalSize,
            compressedSize,
            savingsPercent
        };
    }

    /**
     * Split all pages into individual single-page PDFs packaged inside a ZIP archive
     * @param {Buffer} pdfBuffer
     * @returns {Promise<Buffer>}
     */
    async splitPdfToZip(pdfBuffer, selectedPages = null) {
        if (!pdfBuffer) throw new Error('PDF buffer is required');
        const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
        const totalPages = srcDoc.getPageCount();
        const zip = new JSZip();

        let targetIndices = Array.from({ length: totalPages }, (_, i) => i);
        if (selectedPages && Array.isArray(selectedPages) && selectedPages.length > 0) {
            targetIndices = selectedPages
                .map(p => {
                    const num = typeof p === 'number' ? p : parseInt(p, 10);
                    return num > 0 ? num - 1 : num;
                })
                .filter(idx => !isNaN(idx) && idx >= 0 && idx < totalPages);
            if (targetIndices.length === 0) {
                targetIndices = Array.from({ length: totalPages }, (_, i) => i);
            }
        }

        for (const i of targetIndices) {
            const singlePageDoc = await PDFDocument.create();
            const [copied] = await singlePageDoc.copyPages(srcDoc, [i]);
            singlePageDoc.addPage(copied);
            const singleBytes = await singlePageDoc.save({ useObjectStreams: true });
            const pageNum = String(i + 1).padStart(3, '0');
            zip.file(`page_${pageNum}.pdf`, Buffer.from(singleBytes));
        }

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        return zipBuffer;
    }

    /**
     * Split multi-file or reorganized operations into individual single-page PDFs in a ZIP archive
     * @param {Buffer|Array<Buffer>} pdfBuffers
     * @param {Array<object>} operations
     * @returns {Promise<Buffer>}
     */
    async splitPdfOperationsToZip(pdfBuffers, operations) {
        if (!pdfBuffers) throw new Error('PDF buffer(s) are required');
        if (!operations || !Array.isArray(operations) || operations.length === 0) {
            throw new Error('Valid operations array with at least one page is required');
        }

        const buffers = Array.isArray(pdfBuffers) ? pdfBuffers : [pdfBuffers];
        const loadedDocs = await Promise.all(
            buffers.map(b => PDFDocument.load(b, { ignoreEncryption: true }))
        );
        const zip = new JSZip();

        for (let i = 0; i < operations.length; i++) {
            const op = operations[i];
            const docIdx = parseInt(op.docIndex !== undefined ? op.docIndex : 0, 10);
            const srcDoc = loadedDocs[docIdx] || loadedDocs[0];
            if (!srcDoc) continue;

            const totalSrcPages = srcDoc.getPageCount();
            const rawIdx = op.pageIndex !== undefined ? op.pageIndex : op.sourcePageIndex;
            const pIdx = parseInt(rawIdx, 10);
            if (isNaN(pIdx) || pIdx < 0 || pIdx >= totalSrcPages) continue;

            const singleDoc = await PDFDocument.create();
            const [copiedPage] = await singleDoc.copyPages(srcDoc, [pIdx]);
            const rot = op.rotationDegrees !== undefined ? op.rotationDegrees : op.rotation;
            if (rot !== undefined && !isNaN(parseInt(rot, 10))) {
                const currentRotation = copiedPage.getRotation().angle || 0;
                copiedPage.setRotation(degrees((currentRotation + parseInt(rot, 10)) % 360));
            }
            singleDoc.addPage(copiedPage);

            const singleBytes = await singleDoc.save({ useObjectStreams: true });
            const pageNum = String(i + 1).padStart(3, '0');
            zip.file(`page_${pageNum}.pdf`, Buffer.from(singleBytes));
        }

        return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    }

    /**
     * Get preview metadata of split pages without generating full zip
     * @param {Buffer} pdfBuffer
     * @returns {Promise<object>}
     */
    async getSplitPagesMetadata(pdfBuffer) {
        if (!pdfBuffer) throw new Error('PDF buffer is required');
        const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
        const totalPages = srcDoc.getPageCount();
        const pages = [];
        for (let i = 0; i < totalPages; i++) {
            const page = srcDoc.getPage(i);
            const { width, height } = page.getSize();
            pages.push({
                pageIndex: i,
                pageNumber: i + 1,
                fileName: `page_${String(i + 1).padStart(3, '0')}.pdf`,
                width: Math.round(width),
                height: Math.round(height),
                rotation: page.getRotation().angle || 0
            });
        }
        return { totalPages, pages };
    }

    /**
     * Add annotations (Text callouts, Highlighter, Blackout redaction, Stamps, eSignatures)
     * @param {Buffer} pdfBuffer
     * @param {Array<object>} annotations
     * @returns {Promise<Buffer>}
     */
    async annotatePdf(pdfBuffer, annotations = []) {
        if (!pdfBuffer) throw new Error('PDF buffer is required');
        const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
        const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
        const helvetica = await doc.embedFont(StandardFonts.Helvetica);
        const pages = doc.getPages();

        for (const ann of annotations) {
            const pageIdx = parseInt(ann.pageIndex || 0, 10);
            if (pageIdx < 0 || pageIdx >= pages.length) continue;
            const page = pages[pageIdx];
            const { height } = page.getSize();

            const x = parseFloat(ann.x || 50);
            // Convert coordinate system if origin is top-left
            const y = ann.isTopLeft ? (height - parseFloat(ann.y || 50)) : parseFloat(ann.y || 50);

            if (ann.type === 'highlight') {
                // Semi-transparent highlight box
                const w = parseFloat(ann.width || 120);
                const h = parseFloat(ann.height || 20);
                page.drawRectangle({
                    x,
                    y: y - h,
                    width: w,
                    height: h,
                    color: rgb(1, 0.95, 0.2), // Yellow highlighter
                    opacity: 0.4
                });
            } else if (ann.type === 'redact') {
                // Blackout redaction bar
                const w = parseFloat(ann.width || 150);
                const h = parseFloat(ann.height || 22);
                page.drawRectangle({
                    x,
                    y: y - h,
                    width: w,
                    height: h,
                    color: rgb(0, 0, 0),
                    opacity: 1
                });
            } else if (ann.type === 'text') {
                // Text note / callout
                const text = String(ann.text || '');
                const size = parseFloat(ann.fontSize || 12);
                page.drawText(text, {
                    x,
                    y,
                    size,
                    font: helvetica,
                    color: rgb(0.1, 0.1, 0.1)
                });
            } else if (ann.type === 'stamp') {
                const rawStamp = String(ann.text || 'APPROVED');
                const hasUnicodeOrEmoji = /[^\x20-\x7E]/.test(rawStamp);
                const sw = parseFloat(ann.width || 140);
                const sh = parseFloat(ann.height || 36);

                if (hasUnicodeOrEmoji) {
                    try {
                        const hexCol = ann.color || (rawStamp.includes('REJECT') ? '#dc2626' : (rawStamp.includes('GRADED') || rawStamp.includes('VERIFIED') || rawStamp.includes('APPROVED')) ? '#059669' : '#2563eb');
                        const bgCol = hexCol === '#dc2626' ? 'rgba(254, 242, 242, 0.95)' : hexCol === '#059669' ? 'rgba(236, 253, 245, 0.95)' : 'rgba(239, 246, 255, 0.95)';
                        const pngBuf = await renderRichBadgeToPngBuffer({
                            text: rawStamp,
                            color: hexCol,
                            bgColor: bgCol,
                            width: sw,
                            height: sh
                        });
                        const embeddedImg = await doc.embedPng(pngBuf);
                        page.drawImage(embeddedImg, {
                            x,
                            y: y - sh + 10,
                            width: sw,
                            height: sh
                        });
                    } catch (e) {
                        console.warn('[PDF Studio] annotatePdf stamp emoji error:', e.message);
                    }
                } else {
                    const stampText = sanitizePdfText(rawStamp).toUpperCase() || 'APPROVED';
                    const stampColor = stampText.includes('REJECT') 
                        ? rgb(0.9, 0.1, 0.1)
                        : stampText.includes('GRADED') || stampText.includes('VERIFIED') || stampText.includes('APPROVED')
                        ? rgb(0.05, 0.65, 0.3)
                        : rgb(0.1, 0.4, 0.85);

                    const textWidth = helveticaBold.widthOfTextAtSize(stampText, 14);
                    const pad = 8;
                    page.drawRectangle({
                        x,
                        y: y - 10,
                        width: textWidth + pad * 2,
                        height: 28,
                        borderColor: stampColor,
                        borderWidth: 2,
                        color: rgb(1, 1, 1),
                        opacity: 0.95
                    });
                    page.drawText(stampText, {
                        x: x + pad,
                        y: y - 3,
                        size: 14,
                        font: helveticaBold,
                        color: stampColor
                    });
                }
            } else if (ann.type === 'signature') {
                const rawSig = String(ann.text || '✍️ Digitally Signed');
                const hasUnicodeOrEmoji = /[^\x20-\x7E]/.test(rawSig);
                const sw = parseFloat(ann.width || 150);
                const sh = parseFloat(ann.height || 40);

                if (hasUnicodeOrEmoji) {
                    try {
                        const pngBuf = await renderRichBadgeToPngBuffer({
                            text: rawSig,
                            color: '#1d4ed8',
                            bgColor: 'rgba(239, 246, 255, 0.95)',
                            width: sw,
                            height: sh,
                            isSignature: true
                        });
                        const embeddedImg = await doc.embedPng(pngBuf);
                        page.drawImage(embeddedImg, {
                            x,
                            y: y - sh + 10,
                            width: sw,
                            height: sh
                        });
                    } catch (e) {
                        console.warn('[PDF Studio] annotatePdf signature emoji error:', e.message);
                    }
                } else {
                    const sigName = sanitizePdfText(rawSig) || 'Digitally Signed';
                    try {
                        page.drawText(`[Signed] ${sigName}`, {
                            x,
                            y,
                            size: 13,
                            font: helveticaBold,
                            color: rgb(0.1, 0.2, 0.6)
                        });
                        page.drawText(`Signed via ULRMS: ${new Date().toLocaleDateString('en-IN')}`, {
                            x,
                            y: y - 12,
                            size: 8,
                            font: helvetica,
                            color: rgb(0.4, 0.4, 0.4)
                        });
                    } catch (e) {}
                }
            }
        }

        const savedBytes = await doc.save({ useObjectStreams: true });
        return Buffer.from(savedBytes);
    }

    /**
     * Extract selectable text using pdf-parse (OCR / Text Extractor)
     * @param {Buffer} pdfBuffer
     * @returns {Promise<object>}
     */
    async ocrExtractPdf(pdfBuffer) {
        if (!pdfBuffer) throw new Error('PDF buffer is required');
        const parser = new PDFParse({ data: pdfBuffer });
        const res = await parser.getText();
        const infoRes = await parser.getInfo().catch(() => ({}));
        const rawText = res.text || '';
        const text = rawText.replace(/\n\n-- \d+ of \d+ --(\n\n)?/g, '\n').trim();
        const lines = text.split('\n');
        const words = text ? text.split(/\s+/).length : 0;

        return {
            pageCount: res.total || 1,
            text,
            lineCount: text ? lines.length : 0,
            wordCount: words,
            charCount: text.length,
            info: infoRes.info || {}
        };
    }

    /**
     * Reorganize, rotate, duplicate, delete, interleave multi-file pages, and optionally watermark & annotate in one pass
     * @param {Buffer|Array<Buffer>} pdfBuffers Single buffer or array of PDF buffers
     * @param {Array<{docIndex?: number, pageIndex: number, rotationDegrees?: number}>} operations
     * @param {object} options Optional watermarkText, watermarkColor, watermarkImageBuffer, watermarkImageDataUrl, annotations, compressLevel
     * @returns {Promise<Buffer|object>}
     */
    async reorganizePdf(pdfBuffers, operations, options = {}) {
        if (!pdfBuffers) throw new Error('PDF buffer(s) are required');
        if (!operations || !Array.isArray(operations) || operations.length === 0) {
            throw new Error('Valid operations array with at least one page is required');
        }

        const buffers = Array.isArray(pdfBuffers) ? pdfBuffers : [pdfBuffers];
        const loadedDocs = await Promise.all(
            buffers.map(b => PDFDocument.load(b, { ignoreEncryption: true }))
        );

        const newDoc = await PDFDocument.create();

        for (const op of operations) {
            const docIdx = parseInt(op.docIndex !== undefined ? op.docIndex : 0, 10);
            const srcDoc = loadedDocs[docIdx] || loadedDocs[0];
            if (!srcDoc) continue;

            const totalSrcPages = srcDoc.getPageCount();
            const rawIdx = op.pageIndex !== undefined ? op.pageIndex : op.sourcePageIndex;
            const pIdx = parseInt(rawIdx, 10);
            if (isNaN(pIdx) || pIdx < 0 || pIdx >= totalSrcPages) continue;

            const [copiedPage] = await newDoc.copyPages(srcDoc, [pIdx]);
            const rot = op.rotationDegrees !== undefined ? op.rotationDegrees : op.rotation;
            if (rot !== undefined && !isNaN(parseInt(rot, 10))) {
                const currentRotation = copiedPage.getRotation().angle || 0;
                const newRotation = ((currentRotation + parseInt(rot, 10)) % 360 + 360) % 360;
                copiedPage.setRotation(degrees(newRotation));
            }
            newDoc.addPage(copiedPage);
        }

        if (newDoc.getPageCount() === 0) {
            throw new Error('No valid pages found in operations to reorganize');
        }

        const pages = newDoc.getPages();

        // 1. Apply Text Watermark (with custom color)
        if (options && options.watermarkText && options.watermarkText.trim()) {
            const rawWm = options.watermarkText.trim();
            const watermarkText = sanitizePdfText(rawWm) || 'CONFIDENTIAL';
            const font = await newDoc.embedFont(StandardFonts.HelveticaBold);
            const fontSize = options.watermarkFontSize ? parseFloat(options.watermarkFontSize) : 44;
            const opacity = options.watermarkOpacity !== undefined ? parseFloat(options.watermarkOpacity) : 0.35;
            const wmColor = hexToRgb(options.watermarkColor, { r: 0.85, g: 0.15, b: 0.15 });
            const angleDeg = 35;
            const angleRad = (angleDeg * Math.PI) / 180;

            for (const page of pages) {
                const { width, height } = page.getSize();
                try {
                    const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
                    const textHeight = font.heightAtSize(fontSize);
                    const rx = (textWidth / 2) * Math.cos(angleRad) - (textHeight / 2) * Math.sin(angleRad);
                    const ry = (textWidth / 2) * Math.sin(angleRad) + (textHeight / 2) * Math.cos(angleRad);
                    const x = (width / 2) - rx;
                    const y = (height / 2) - ry;

                    page.drawText(watermarkText, {
                        x,
                        y,
                        size: fontSize,
                        font,
                        color: rgb(wmColor.r, wmColor.g, wmColor.b),
                        opacity,
                        rotate: degrees(angleDeg)
                    });
                } catch (wmErr) {
                    console.warn('[PDF Studio] watermark draw error:', wmErr.message);
                }
            }
        }

        // 2. Apply Image Watermark (scaled to fit within 50% page bounds)
        let imgBuf = options.watermarkImageBuffer;
        if (!imgBuf && options.watermarkImageDataUrl) {
            imgBuf = Buffer.from(options.watermarkImageDataUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        }
        if (imgBuf && imgBuf.length > 0) {
            let embeddedImg;
            try {
                embeddedImg = await newDoc.embedPng(imgBuf);
            } catch {
                try {
                    embeddedImg = await newDoc.embedJpg(imgBuf);
                } catch (e) {
                    console.warn('[PDFStudio] Could not embed watermark image:', e.message);
                }
            }
            if (embeddedImg) {
                const imgDims = embeddedImg.scale(1);
                const opacity = options.watermarkOpacity !== undefined ? parseFloat(options.watermarkOpacity) : 0.35;
                for (const page of pages) {
                    const { width, height } = page.getSize();
                    const maxW = width * 0.50;
                    const maxH = height * 0.50;
                    const scale = Math.min(maxW / imgDims.width, maxH / imgDims.height, 1);
                    const drawW = imgDims.width * scale;
                    const drawH = imgDims.height * scale;
                    const x = (width - drawW) / 2;
                    const y = (height - drawH) / 2;
                    page.drawImage(embeddedImg, {
                        x,
                        y,
                        width: drawW,
                        height: drawH,
                        opacity
                    });
                }
            }
        }

        // 3. Apply Canvas Annotations (Freehand pencil drawing, highlight, redact, stamps, signature, rich text notes)
        const combinedAnnotations = [];
        const hasOpAnnotations = operations && operations.some(op => op.annotations && op.annotations.length > 0);
        if (hasOpAnnotations) {
            operations.forEach((op, opIdx) => {
                if (op.annotations && Array.isArray(op.annotations)) {
                    op.annotations.forEach(a => {
                        combinedAnnotations.push({ ...a, pageIndex: opIdx });
                    });
                }
            });
        } else if (options && options.annotations && Array.isArray(options.annotations)) {
            options.annotations.forEach(a => combinedAnnotations.push(a));
        }

        if (combinedAnnotations.length > 0) {
            const helveticaBold = await newDoc.embedFont(StandardFonts.HelveticaBold);
            const helvetica = await newDoc.embedFont(StandardFonts.Helvetica);
            const timesBold = await newDoc.embedFont(StandardFonts.TimesRomanBold);
            const timesRoman = await newDoc.embedFont(StandardFonts.TimesRoman);
            const courierBold = await newDoc.embedFont(StandardFonts.CourierBold);
            const courier = await newDoc.embedFont(StandardFonts.Courier);

            for (const ann of combinedAnnotations) {
                const pageIdx = parseInt(ann.pageIndex !== undefined ? ann.pageIndex : 0, 10);
                if (pageIdx < 0 || pageIdx >= pages.length) continue;
                const page = pages[pageIdx];
                const { width, height } = page.getSize();

                // Freehand pencil drawings (array of points in 1:1 PDF points or normalized fractions)
                if (ann.type === 'draw' && Array.isArray(ann.points) && ann.points.length > 1) {
                    const strokeCol = hexToRgb(ann.color || '#2563eb', { r: 0.15, g: 0.39, b: 0.92 });
                    const thickness = parseFloat(ann.strokeWidth || 2);
                    for (let i = 0; i < ann.points.length - 1; i++) {
                        const p1 = ann.points[i];
                        const p2 = ann.points[i + 1];
                        const p1x = p1.normX !== undefined ? p1.normX * width : parseFloat(p1.x || 0);
                        const p1y = p1.normY !== undefined ? height - (p1.normY * height) : height - parseFloat(p1.y || 0);
                        const p2x = p2.normX !== undefined ? p2.normX * width : parseFloat(p2.x || 0);
                        const p2y = p2.normY !== undefined ? height - (p2.normY * height) : height - parseFloat(p2.y || 0);
                        page.drawLine({
                            start: { x: p1x, y: p1y },
                            end: { x: p2x, y: p2y },
                            thickness,
                            color: rgb(strokeCol.r, strokeCol.g, strokeCol.b),
                            opacity: ann.opacity !== undefined ? parseFloat(ann.opacity) : 1
                        });
                    }
                } else if (ann.type === 'highlight') {
                    const ax = ann.normX !== undefined ? ann.normX * width : parseFloat(ann.x || 50);
                    const ay = ann.normY !== undefined ? height - (ann.normY * height) : height - parseFloat(ann.y || 50);
                    const aw = ann.normWidth !== undefined ? ann.normWidth * width : parseFloat(ann.width || 120);
                    const ah = ann.normHeight !== undefined ? ann.normHeight * height : parseFloat(ann.height || 20);
                    const hlCol = hexToRgb(ann.color || '#facc15', { r: 1, g: 0.95, b: 0.2 });
                    page.drawRectangle({
                        x: ax,
                        y: ay - ah,
                        width: aw,
                        height: ah,
                        color: rgb(hlCol.r, hlCol.g, hlCol.b),
                        opacity: ann.opacity !== undefined ? parseFloat(ann.opacity) : 0.45
                    });
                } else if (ann.type === 'redact') {
                    const ax = ann.normX !== undefined ? ann.normX * width : parseFloat(ann.x || 50);
                    const ay = ann.normY !== undefined ? height - (ann.normY * height) : height - parseFloat(ann.y || 50);
                    const aw = ann.normWidth !== undefined ? ann.normWidth * width : parseFloat(ann.width || 150);
                    const ah = ann.normHeight !== undefined ? ann.normHeight * height : parseFloat(ann.height || 24);
                    page.drawRectangle({
                        x: ax,
                        y: ay - ah,
                        width: aw,
                        height: ah,
                        color: rgb(0, 0, 0),
                        opacity: 1
                    });
                } else if (ann.type === 'stamp') {
                    const ax = ann.normX !== undefined ? ann.normX * width : parseFloat(ann.x || 50);
                    const ay = ann.normY !== undefined ? height - (ann.normY * height) : height - parseFloat(ann.y || 50);
                    // Use physical PDF user points so stamps preserve exact dimensions and never widen or distort on export
                    const aw = parseFloat(ann.width || 140);
                    const ah = parseFloat(ann.height || 46);

                    if ((ann.stampKind === 'image' || ann.imageDataUrl) && (ann.imageUrl || ann.imageDataUrl)) {
                        try {
                            const raw = ann.imageUrl || ann.imageDataUrl;
                            const base64Data = raw.replace(/^data:image\/\w+;base64,/, '');
                            const imgBuffer = Buffer.from(base64Data, 'base64');
                            const isPng = imgBuffer[0] === 0x89 && imgBuffer[1] === 0x50;
                            const embeddedImg = isPng ? await newDoc.embedPng(imgBuffer) : await newDoc.embedJpg(imgBuffer);
                            page.drawImage(embeddedImg, {
                                x: ax,
                                y: ay - ah,
                                width: aw,
                                height: ah
                            });
                        } catch (imgErr) {
                            console.warn('[PDF Studio] Failed to embed custom image stamp:', imgErr.message);
                        }
                    } else {
                        const rawStamp = String(ann.text || 'APPROVED');
                        const hasUnicodeOrEmoji = /[^\x20-\x7E]/.test(rawStamp);

                        if (hasUnicodeOrEmoji) {
                            try {
                                const hexCol = ann.color || (rawStamp.includes('REJECT') ? '#dc2626' : (rawStamp.includes('GRADED') || rawStamp.includes('VERIFIED') || rawStamp.includes('APPROVED')) ? '#059669' : '#2563eb');
                                const bgCol = hexCol === '#dc2626' ? 'rgba(254, 242, 242, 0.95)' : hexCol === '#059669' ? 'rgba(236, 253, 245, 0.95)' : 'rgba(239, 246, 255, 0.95)';
                                const pngBuf = await renderRichBadgeToPngBuffer({
                                    text: rawStamp,
                                    color: hexCol,
                                    bgColor: bgCol,
                                    width: aw,
                                    height: ah
                                });
                                const embeddedImg = await newDoc.embedPng(pngBuf);
                                page.drawImage(embeddedImg, {
                                    x: ax,
                                    y: ay - ah,
                                    width: aw,
                                    height: ah
                                });
                            } catch (badgeErr) {
                                console.warn('[PDF Studio] Failed to render rich emoji stamp badge:', badgeErr.message);
                            }
                        } else {
                            const stampText = sanitizePdfText(rawStamp).toUpperCase() || 'APPROVED';
                            const hexCol = ann.color || (stampText.includes('REJECT') ? '#dc2626' : (stampText.includes('GRADED') || stampText.includes('VERIFIED') || stampText.includes('APPROVED')) ? '#059669' : '#2563eb');
                            const stampColor = hexToRgb(hexCol, { r: 0.05, g: 0.65, b: 0.3 });
                            const dynamicFont = Math.max(9, Math.round(ah * 0.36));

                            page.drawRectangle({
                                x: ax,
                                y: ay - ah,
                                width: aw,
                                height: ah,
                                borderColor: rgb(stampColor.r, stampColor.g, stampColor.b),
                                borderWidth: 2,
                                color: rgb(1, 1, 1),
                                opacity: 0.95
                            });
                            try {
                                const textW = helveticaBold.widthOfTextAtSize(stampText, dynamicFont);
                                const textX = Math.max(ax + 4, ax + (aw - textW) / 2);
                                const textY = ay - (ah / 2) - (dynamicFont / 3);
                                page.drawText(stampText, {
                                    x: textX,
                                    y: textY,
                                    size: dynamicFont,
                                    font: helveticaBold,
                                    color: rgb(stampColor.r, stampColor.g, stampColor.b)
                                });
                            } catch (txtErr) {
                                console.warn('[PDF Studio] drawText stamp error:', txtErr.message);
                            }
                        }
                    }
                } else if (ann.type === 'shape') {
                    const ax = ann.normX !== undefined ? ann.normX * width : parseFloat(ann.x || 50);
                    const ay = ann.normY !== undefined ? height - (ann.normY * height) : height - parseFloat(ann.y || 50);
                    const aw = ann.normWidth !== undefined ? ann.normWidth * width : parseFloat(ann.width || 100);
                    const ah = ann.normHeight !== undefined ? ann.normHeight * height : parseFloat(ann.height || 60);
                    const shapeCol = hexToRgb(ann.color || '#e11d48', { r: 0.88, g: 0.11, b: 0.28 });
                    const strokeW = parseFloat(ann.strokeWidth || 2);
                    const fillCol = ann.fill === 'white' ? rgb(1, 1, 1) : undefined;

                    if (ann.shapeType === 'ellipse') {
                        page.drawEllipse({
                            x: ax + (aw / 2),
                            y: ay - (ah / 2),
                            xScale: Math.abs(aw / 2),
                            yScale: Math.abs(ah / 2),
                            borderColor: rgb(shapeCol.r, shapeCol.g, shapeCol.b),
                            borderWidth: strokeW,
                            color: fillCol
                        });
                    } else if (ann.shapeType === 'line' || ann.shapeType === 'arrow') {
                        const startX = ann.normX1 !== undefined ? ann.normX1 * width : (ann.x1 !== undefined ? parseFloat(ann.x1) : ax);
                        const startY = ann.normY1 !== undefined ? height - (ann.normY1 * height) : (ann.y1 !== undefined ? height - parseFloat(ann.y1) : ay);
                        const endX = ann.normX2 !== undefined ? ann.normX2 * width : (ann.x2 !== undefined ? parseFloat(ann.x2) : ax + aw);
                        const endY = ann.normY2 !== undefined ? height - (ann.normY2 * height) : (ann.y2 !== undefined ? height - parseFloat(ann.y2) : ay - ah);
                        page.drawLine({
                            start: { x: startX, y: startY },
                            end: { x: endX, y: endY },
                            thickness: strokeW,
                            color: rgb(shapeCol.r, shapeCol.g, shapeCol.b)
                        });
                        if (ann.shapeType === 'arrow') {
                            const angle = Math.atan2(endY - startY, endX - startX);
                            const headLen = Math.max(10, strokeW * 4);
                            const p1x = endX - headLen * Math.cos(angle - Math.PI / 6);
                            const p1y = endY - headLen * Math.sin(angle - Math.PI / 6);
                            const p2x = endX - headLen * Math.cos(angle + Math.PI / 6);
                            const p2y = endY - headLen * Math.sin(angle + Math.PI / 6);
                            page.drawLine({
                                start: { x: endX, y: endY },
                                end: { x: p1x, y: p1y },
                                thickness: strokeW,
                                color: rgb(shapeCol.r, shapeCol.g, shapeCol.b)
                            });
                            page.drawLine({
                                start: { x: endX, y: endY },
                                end: { x: p2x, y: p2y },
                                thickness: strokeW,
                                color: rgb(shapeCol.r, shapeCol.g, shapeCol.b)
                            });
                        }
                    } else {
                        // Default rectangle
                        page.drawRectangle({
                            x: ax,
                            y: ay - ah,
                            width: aw,
                            height: ah,
                            borderColor: rgb(shapeCol.r, shapeCol.g, shapeCol.b),
                            borderWidth: strokeW,
                            color: fillCol
                        });
                    }
                } else if (ann.type === 'callout') {
                    // Callout Annotation (Authentic continuous speech bubble SVG vector path + text)
                    const screenX = ann.normX !== undefined ? ann.normX * width : parseFloat(ann.x || 50);
                    const screenY = ann.normY !== undefined ? ann.normY * height : parseFloat(ann.y || 50);
                    // Use physical PDF user points so callout note box dimensions stay exact in exported PDF
                    const aw = parseFloat(ann.width || 140);
                    const ah = parseFloat(ann.height || 48);

                    const tipX = ann.targetNormX !== undefined ? ann.targetNormX * width : (ann.targetX !== undefined ? parseFloat(ann.targetX) : screenX - 30);
                    const tipY = ann.targetNormY !== undefined ? ann.targetNormY * height : (ann.targetY !== undefined ? parseFloat(ann.targetY) : screenY + 40);

                    const calloutCol = hexToRgb(ann.color || '#e11d48', { r: 0.88, g: 0.11, b: 0.28 });
                    const colRgb = rgb(calloutCol.r, calloutCol.g, calloutCol.b);

                    // Continuous unified vector callout path (supports speech, thought, leader_line, pill)
                    try {
                        const pathD = getCalloutSvgPath(screenX, screenY, aw, ah, tipX, tipY, 8, ann.calloutType || ann.shapeType || 'speech');
                        page.drawSvgPath(pathD, {
                            x: 0,
                            y: height,
                            borderColor: colRgb,
                            borderWidth: 1.5,
                            color: rgb(1, 1, 1),
                            opacity: 0.98
                        });
                    } catch (svgErr) {
                        console.warn('[PDF Studio] drawSvgPath fallback:', svgErr.message);
                        page.drawRectangle({
                            x: screenX,
                            y: (height - screenY) - ah,
                            width: aw,
                            height: ah,
                            borderColor: colRgb,
                            borderWidth: 1.5,
                            color: rgb(1, 1, 1)
                        });
                    }

                    // Callout note text
                    const rawCallout = String(ann.text || '');
                    const calloutText = sanitizePdfText(rawCallout);
                    if (calloutText) {
                        try {
                            const pdfAy = height - screenY;
                            page.drawText(calloutText.substring(0, 80), {
                                x: screenX + 8,
                                y: pdfAy - 18,
                                size: 10,
                                font: helveticaBold,
                                color: rgb(0.1, 0.1, 0.1)
                            });
                        } catch (txtErr) {
                            console.warn('[PDF Studio] drawText callout error:', txtErr.message);
                        }
                    }
                } else if (ann.type === 'text' || ann.type === 'textbox') {
                    // Rich Multiline Textbox Note or In-Place Edited Text with Rotation
                    const ax = ann.normX !== undefined ? ann.normX * width : parseFloat(ann.x || 50);
                    const ay = ann.normY !== undefined ? height - (ann.normY * height) : height - parseFloat(ann.y || 50);
                    const fontSize = parseFloat(ann.fontSize || 12);
                    const isBold = Boolean(ann.bold);
                    const rotDeg = parseFloat(ann.rotation || 0);
                    const fam = String(ann.fontFamily || '').toLowerCase();
                    let textFont = helvetica;
                    if (fam.includes('times') || fam.includes('serif')) {
                        textFont = isBold ? timesBold : timesRoman;
                    } else if (fam.includes('courier') || fam.includes('mono')) {
                        textFont = isBold ? courierBold : courier;
                    } else {
                        textFont = isBold ? helveticaBold : helvetica;
                    }

                    // Mask original background if overlaid or replacing text
                    if (ann.maskOriginal || ann.isOverlaid || ann.background || ann.bg) {
                        const maskW = ann.normWidth !== undefined ? ann.normWidth * width : Math.max(10, parseFloat(ann.width || 120));
                        const maskH = ann.normHeight !== undefined ? ann.normHeight * height : Math.max(10, parseFloat(ann.height || (fontSize * 1.4)));
                        page.drawRectangle({
                            x: ax - 2,
                            y: ay - maskH + (fontSize * 0.2),
                            width: maskW + 4,
                            height: maskH + 4,
                            color: rgb(1, 1, 1),
                            opacity: 1,
                            ...(rotDeg ? { rotate: degrees(-rotDeg) } : {})
                        });
                    }

                    const textCol = hexToRgb(ann.color || '#0f172a', { r: 0.06, g: 0.09, b: 0.16 });
                    const lines = String(ann.text || '').split('\n');
                    lines.forEach((lineText, lIdx) => {
                        const cleanLine = sanitizePdfText(lineText);
                        if (!cleanLine) return;
                        try {
                            page.drawText(cleanLine, {
                                x: ax,
                                y: ay - fontSize - (lIdx * (fontSize * 1.3)),
                                size: fontSize,
                                font: textFont,
                                color: rgb(textCol.r, textCol.g, textCol.b),
                                ...(rotDeg ? { rotate: degrees(-rotDeg) } : {})
                            });
                        } catch (txtErr) {
                            console.warn('[PDF Studio] drawText textbox error:', txtErr.message);
                        }
                    });
                } else if (ann.type === 'image') {
                    // Embedded image object (PNG/JPG)
                    const ax = ann.normX !== undefined ? ann.normX * width : parseFloat(ann.x || 50);
                    const ay = ann.normY !== undefined ? height - (ann.normY * height) : height - parseFloat(ann.y || 50);
                    const aw = ann.normWidth !== undefined ? ann.normWidth * width : parseFloat(ann.width || 180);
                    const ah = ann.normHeight !== undefined ? ann.normHeight * height : parseFloat(ann.height || 120);

                    if (ann.imageUrl || ann.imageDataUrl) {
                        try {
                            const raw = ann.imageUrl || ann.imageDataUrl;
                            const base64Data = raw.replace(/^data:image\/\w+;base64,/, '');
                            const imgBuffer = Buffer.from(base64Data, 'base64');
                            const isPng = imgBuffer[0] === 0x89 && imgBuffer[1] === 0x50;
                            const embeddedImg = isPng ? await newDoc.embedPng(imgBuffer) : await newDoc.embedJpg(imgBuffer);
                            page.drawImage(embeddedImg, {
                                x: ax,
                                y: ay - ah,
                                width: aw,
                                height: ah
                            });
                        } catch (imgErr) {
                            console.warn('[PDF Studio] Failed to embed image:', imgErr.message);
                        }
                    }
                } else if (ann.type === 'signature') {
                    const ax = ann.normX !== undefined ? ann.normX * width : parseFloat(ann.x || 50);
                    const ay = ann.normY !== undefined ? height - (ann.normY * height) : height - parseFloat(ann.y || 50);
                    // Use physical PDF user points so signatures preserve natural dimensions
                    const aw = parseFloat(ann.width || 160);
                    const ah = parseFloat(ann.height || 60);

                    if (ann.imageUrl || ann.imageDataUrl) {
                        try {
                            const raw = ann.imageUrl || ann.imageDataUrl;
                            const base64Data = raw.replace(/^data:image\/\w+;base64,/, '');
                            const imgBuffer = Buffer.from(base64Data, 'base64');
                            const isPng = imgBuffer[0] === 0x89 && imgBuffer[1] === 0x50;
                            const embeddedImg = isPng ? await newDoc.embedPng(imgBuffer) : await newDoc.embedJpg(imgBuffer);
                            page.drawImage(embeddedImg, {
                                x: ax,
                                y: ay - ah,
                                width: aw,
                                height: ah
                            });
                        } catch (sigErr) {
                            console.warn('[PDF Studio] Failed to embed signature image:', sigErr.message);
                            const cleanSig = sanitizePdfText(ann.text || 'Signature');
                            try {
                                page.drawText(`[Signed] ${cleanSig}`, {
                                    x: ax,
                                    y: ay - 14,
                                    size: 14,
                                    font: helveticaBold,
                                    color: rgb(0.1, 0.2, 0.6)
                                });
                            } catch (e) {}
                        }
                    } else {
                        const rawSig = String(ann.text || '✍️ Digitally Signed');
                        const hasUnicodeOrEmoji = /[^\x20-\x7E]/.test(rawSig);

                        if (hasUnicodeOrEmoji) {
                            try {
                                const pngBuf = await renderRichBadgeToPngBuffer({
                                    text: rawSig,
                                    color: '#1d4ed8',
                                    bgColor: 'rgba(239, 246, 255, 0.95)',
                                    width: aw,
                                    height: ah,
                                    isSignature: true
                                });
                                const embeddedImg = await newDoc.embedPng(pngBuf);
                                page.drawImage(embeddedImg, {
                                    x: ax,
                                    y: ay - ah,
                                    width: aw,
                                    height: ah
                                });
                            } catch (err) {
                                console.warn('[PDF Studio] Failed to render rich emoji signature:', err.message);
                            }
                        } else {
                            const cleanSig = sanitizePdfText(rawSig) || 'Digitally Signed';
                            try {
                                page.drawText(`[Signed] ${cleanSig}`, {
                                    x: ax,
                                    y: ay - 14,
                                    size: 14,
                                    font: helveticaBold,
                                    color: rgb(0.1, 0.2, 0.6)
                                });
                            } catch (e) {}
                        }
                    }
                }
            }
        }

        const savedBytes = await newDoc.save();
        const outputBuffer = Buffer.from(savedBytes);

        // 4. Handle Compression if requested
        if (options.compressLevel && options.compressLevel !== 'none') {
            const compResult = await this.compressPdf(outputBuffer, options.compressLevel);
            return compResult;
        }

        return outputBuffer;
    }

    /**
     * Split / extract pages from a PDF
     * @param {Buffer} pdfBuffer
     * @param {string} pageRangeStr (e.g. "1-3, 5, 8-10")
     * @returns {Promise<Buffer>}
     */
    async splitPdf(pdfBuffer, pageRangeStr) {
        if (!pdfBuffer) throw new Error('PDF buffer is required');
        const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
        const totalPages = srcDoc.getPageCount();

        // Parse page ranges (1-based to 0-based)
        const selectedIndices = new Set();
        const parts = (pageRangeStr || `1-${totalPages}`).split(',');

        for (const part of parts) {
            const clean = part.trim();
            if (clean.includes('-')) {
                const [startStr, endStr] = clean.split('-');
                const start = Math.max(1, parseInt(startStr, 10));
                const end = Math.min(totalPages, parseInt(endStr, 10));
                for (let i = start; i <= end; i++) {
                    selectedIndices.add(i - 1);
                }
            } else {
                const pNum = parseInt(clean, 10);
                if (pNum >= 1 && pNum <= totalPages) {
                    selectedIndices.add(pNum - 1);
                }
            }
        }

        const indicesArray = Array.from(selectedIndices).sort((a, b) => a - b);
        if (indicesArray.length === 0) {
            throw new Error('No valid pages found in specified page range');
        }

        const newDoc = await PDFDocument.create();
        const copiedPages = await newDoc.copyPages(srcDoc, indicesArray);
        copiedPages.forEach(p => newDoc.addPage(p));

        const savedBytes = await newDoc.save();
        return Buffer.from(savedBytes);
    }

    /**
     * Watermark and / or add page numbers to a PDF
     * @param {Buffer} pdfBuffer
     * @param {object} options
     * @returns {Promise<Buffer>}
     */
    async watermarkPdf(pdfBuffer, options = {}) {
        if (!pdfBuffer) throw new Error('PDF buffer is required');
        const {
            watermarkText,
            opacity = 0.25,
            fontSize = 38,
            addPageNumbers = false,
            pageNumberPosition = 'bottom-right'
        } = options;

        const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pages = pdfDoc.getPages();
        const total = pages.length;

        for (let i = 0; i < total; i++) {
            const page = pages[i];
            const { width, height } = page.getSize();

            // Watermark Text diagonally across center
            if (watermarkText && watermarkText.trim()) {
                const textWidth = font.widthOfTextAtSize(watermarkText.trim(), fontSize);
                const textHeight = font.heightAtSize(fontSize);
                const angleDeg = 35;
                const angleRad = (angleDeg * Math.PI) / 180;
                const rx = (textWidth / 2) * Math.cos(angleRad) - (textHeight / 2) * Math.sin(angleRad);
                const ry = (textWidth / 2) * Math.sin(angleRad) + (textHeight / 2) * Math.cos(angleRad);
                const x = (width / 2) - rx;
                const y = (height / 2) - ry;

                page.drawText(watermarkText.trim(), {
                    x,
                    y,
                    size: fontSize,
                    font,
                    color: rgb(0.85, 0.15, 0.15),
                    opacity: parseFloat(opacity) || 0.35,
                    rotate: degrees(angleDeg)
                });
            }

            // Page Number
            if (addPageNumbers) {
                const numText = `Page ${i + 1} of ${total}`;
                const numWidth = regularFont.widthOfTextAtSize(numText, 9);
                let x = width - numWidth - 36;
                let y = 20;

                if (pageNumberPosition === 'bottom-center') {
                    x = (width - numWidth) / 2;
                } else if (pageNumberPosition === 'top-right') {
                    y = height - 25;
                }

                page.drawText(numText, {
                    x,
                    y,
                    size: 9,
                    font: regularFont,
                    color: rgb(0.4, 0.4, 0.4)
                });
            }
        }

        const savedBytes = await pdfDoc.save();
        return Buffer.from(savedBytes);
    }

    /**
     * Inspect PDF page metadata (page count, dimensions)
     * @param {Buffer} pdfBuffer
     * @returns {Promise<object>}
     */
    async getPdfMetadata(pdfBuffer) {
        if (!pdfBuffer) throw new Error('PDF buffer is required');
        const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
        const pageCount = pdfDoc.getPageCount();
        const pages = [];

        for (let i = 0; i < pageCount; i++) {
            const p = pdfDoc.getPage(i);
            const { width, height } = p.getSize();
            const rotation = p.getRotation().angle || 0;
            pages.push({
                pageIndex: i,
                pageNumber: i + 1,
                width: Math.round(width),
                height: Math.round(height),
                rotation,
                isLandscape: width > height
            });
        }

        return {
            pageCount,
            pages
        };
    }
}

module.exports = new PdfStudioService();
