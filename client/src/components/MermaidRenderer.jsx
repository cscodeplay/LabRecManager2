import React, { useEffect, useState, useRef } from 'react';
import { Info, Copy, Check, PlusCircle, X, Image, Download, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * High-performance, interactive Mermaid.js Diagram Renderer.
 * Dynamically renders on-demand flowcharts, sequence diagrams, class diagrams,
 * and entity-relationship diagrams (ERD) with one-click insertion to the whiteboard canvas.
 * 100% Free & Open Source (MIT License).
 */
/**
 * Automated Mermaid Error Inspector & Corrector:
 * Sanitizes unquoted node labels with brackets, parentheses, colons, or math symbols,
 * handles edge arrows with special characters, strips illegal KaTeX '$' delimiters,
 * and ensures diagram headers are valid.
 */
function sanitizeLabelText(rawText) {
    let t = (rawText || '').trim();
    if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
        t = t.slice(1, -1);
    }
    t = t.replace(/\$/g, '');
    t = t.replace(/"/g, "'");
    return `"${t}"`;
}

export function sanitizeMermaidDiagram(rawCode = '') {
    if (!rawCode || typeof rawCode !== 'string') return '';
    let code = rawCode.trim();

    // 1. Strip markdown fences if present
    code = code.replace(/^```(?:mermaid)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    // 2. Strip KaTeX '$' delimiters inside Mermaid labels
    code = code.replace(/\$([^$\n]+?)\$/g, '$1');

    // 3. Strip duplicate leading keywords (e.g. "mermaid\nflowchart TD")
    code = code.replace(/^(?:mermaid\s*\n)+/i, '');

    // 4. Determine diagram type
    const isSequence = /^\s*sequenceDiagram/m.test(code);
    const isClass = /^\s*classDiagram/m.test(code);
    const isER = /^\s*erDiagram/m.test(code);
    const isState = /^\s*stateDiagram/m.test(code);

    if (isSequence || isClass || isER || isState) {
        // Non-flowchart diagrams: preserve specialized grammar
        return code;
    }

    // 5. Shapes precedence order (two-character openers first!)
    const shapes = [
        { open: '([', close: '])', isTwo: true },
        { open: '((', close: '))', isTwo: true },
        { open: '{{', close: '}}', isTwo: true },
        { open: '[[', close: ']]', isTwo: true },
        { open: '[(', close: ')]', isTwo: true },
        { open: '{', close: '}', isTwo: false },
        { open: '[', close: ']', isTwo: false },
        { open: '(', close: ')', isTwo: false }
    ];

    // 6. Process line-by-line for Flowchart / Graph diagrams
    const lines = code.split('\n');
    let inSubgraph = 0;
    let hasEndNodeUsage = false;
    let hasEndNodeDef = false;
    const sanitizedLines = [];

    for (const l of lines) {
        let line = l;
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('%%')) continue;

        if (trimmed.startsWith('subgraph')) {
            inSubgraph++;
            sanitizedLines.push(line);
            continue;
        }

        if (trimmed === 'end') {
            if (inSubgraph > 0) {
                inSubgraph--;
                sanitizedLines.push(line);
            } else {
                sanitizedLines.push('    endNode(["End"])');
                hasEndNodeDef = true;
            }
            continue;
        }

        if (trimmed.startsWith('classDef') || trimmed.startsWith('style')) {
            sanitizedLines.push(line);
            continue;
        }

        // Drop dangling incomplete lines from truncated generation
        if (/^[a-zA-Z0-9_-]+\s*(?:-->|---|==>|-\.->)\s*$/.test(trimmed)) continue;
        if (/^[a-zA-Z0-9_-]+\s*(?:\[|\(|\{|\(\[|\(\(|\{\{|\[\[|\[\()\s*"?$/.test(trimmed)) continue;

        // Auto-close single-line truncated quote if odd count
        const quoteCount = (line.match(/"/g) || []).length;
        if (quoteCount % 2 !== 0 && line.endsWith('"')) {
            line += '"';
        }

        // A. Remove trailing semicolons after node definitions
        line = line.replace(/\]\s*;\s*(?=(?:-->|---|==>|-\.->|\||\s*$))/g, '] ');
        line = line.replace(/\)\s*;\s*(?=(?:-->|---|==>|-\.->|\||\s*$))/g, ') ');
        line = line.replace(/\}\s*;\s*(?=(?:-->|---|==>|-\.->|\||\s*$))/g, '} ');
        line = line.replace(/;\s*$/g, '');

        // B. Replace illegal single dash arrow " -> " with valid flowchart arrow " --> "
        line = line.replace(/(^|[^->=.])\s*->\s+([^->=.])/g, '$1 --> $2');

        // C. Convert bare text arrow: A -- label --> B to A -->|"label"| B
        line = line.replace(/\s+--\s+([^->\n|]+?)\s+-->\s+/g, (match, edgeLabel) => {
            const cleanEdge = edgeLabel.trim().replace(/^"+|"+$/g, '').replace(/"/g, "'");
            return ` -->|"${cleanEdge}"| `;
        });

        // D. Stash and safely quote pipe edge labels |...| so inner parentheses/brackets are never mistaken for node shapes
        const stashedEdgeLabels = [];
        line = line.replace(/\|([^|\n]+)\|/g, (match, label) => {
            let clean = label.trim();
            if (clean.startsWith('"') && clean.endsWith('"') && clean.length >= 2) {
                clean = clean.slice(1, -1);
            }
            clean = clean.replace(/"/g, "'").replace(/\$/g, '');
            const token = `__MERMAID_EDGE_${stashedEdgeLabels.length}__`;
            stashedEdgeLabels.push(`|"${clean}"|`);
            return token;
        });

        // E. Replace reserved keyword "end" when used as a node ID or arrow target
        line = line.replace(/(-->|---|==>|-\.->)\s*end\b/g, (m, arrow) => {
            hasEndNodeUsage = true;
            return `${arrow} endNode`;
        });
        line = line.replace(/(__MERMAID_EDGE_\d+__)\s*end\b/g, (m, edge) => {
            hasEndNodeUsage = true;
            return `${edge} endNode`;
        });
        line = line.replace(/\bend\s*(-->|---|==>|-\.->)/g, (m, arrow) => {
            hasEndNodeUsage = true;
            return `endNode ${arrow}`;
        });
        line = line.replace(/(^|\s|-->|---|==>|-\.->)(end)\s*([\[\(\{])/g, (m, p, _, op) => {
            hasEndNodeDef = true;
            return `${p}endNode${op}`;
        });

        if (/\bendNode\b/.test(line)) {
            hasEndNodeUsage = true;
            if (/endNode\s*[\[\(\{]/.test(line)) hasEndNodeDef = true;
        }

        // F. Deterministic Shape AST Tokenizer
        let result = '';
        let i = 0;
        while (i < line.length) {
            const idMatch = line.slice(i).match(/^([a-zA-Z0-9_-]+)/);
            if (!idMatch) {
                result += line[i];
                i++;
                continue;
            }

            const nodeId = idMatch[1];
            let afterIdIndex = i + nodeId.length;
            let wsCount = 0;
            while (afterIdIndex + wsCount < line.length && (line[afterIdIndex + wsCount] === ' ' || line[afterIdIndex + wsCount] === '\t')) {
                wsCount++;
            }

            const candidateSlice = line.slice(afterIdIndex + wsCount);
            let matchOpener = null;
            for (const shape of shapes) {
                if (candidateSlice.startsWith(shape.open)) {
                    if (!shape.isTwo) {
                        if (shape.open === '[' && (candidateSlice.startsWith('[[') || candidateSlice.startsWith('[('))) continue;
                        if (shape.open === '(' && (candidateSlice.startsWith('([') || candidateSlice.startsWith('(('))) continue;
                        if (shape.open === '{' && candidateSlice.startsWith('{{')) continue;
                    }
                    matchOpener = shape;
                    break;
                }
            }

            if (!matchOpener) {
                result += nodeId;
                i += nodeId.length;
                continue;
            }

            const contentStartIndex = afterIdIndex + wsCount + matchOpener.open.length;
            let closeIndex = -1;

            if (line[contentStartIndex] === '"') {
                const endQuoteIndex = line.indexOf('"', contentStartIndex + 1);
                if (endQuoteIndex !== -1 && line.slice(endQuoteIndex + 1).startsWith(matchOpener.close)) {
                    closeIndex = endQuoteIndex + 1;
                }
            }

            if (closeIndex === -1) {
                let searchPos = contentStartIndex;
                while (searchPos < line.length) {
                    const foundPos = line.indexOf(matchOpener.close, searchPos);
                    if (foundPos === -1) break;
                    const afterClose = line.slice(foundPos + matchOpener.close.length);
                    if (/^(?:\s*$|\s+(?:-->|---|==>|-\.->|&)|-->|---|==>|-\.->|&|;)/.test(afterClose)) {
                        closeIndex = foundPos;
                        break;
                    }
                    searchPos = foundPos + 1;
                }
            }

            if (closeIndex === -1) {
                closeIndex = line.lastIndexOf(matchOpener.close);
            }

            if (closeIndex !== -1 && closeIndex >= contentStartIndex) {
                const rawLabel = line.slice(contentStartIndex, closeIndex);
                const safeLabel = sanitizeLabelText(rawLabel);
                result += `${nodeId}${matchOpener.open}${safeLabel}${matchOpener.close}`;
                i = closeIndex + matchOpener.close.length;
            } else {
                result += nodeId;
                i += nodeId.length;
            }
        }

        // Restore stashed edge labels
        result = result.replace(/__MERMAID_EDGE_(\d+)__/g, (_, idx) => stashedEdgeLabels[Number(idx)] || '');
        sanitizedLines.push(result);
    }

    if (hasEndNodeUsage && !hasEndNodeDef) {
        sanitizedLines.push('    endNode(["End"])');
    }

    code = sanitizedLines.join('\n');

    // 7. Ensure valid diagram type header exists
    if (!/^\s*(flowchart|graph|sequenceDiagram|classDiagram|erDiagram|stateDiagram)/m.test(code)) {
        code = `flowchart TD\n${code}`;
    }

    return code;
}

/**
 * Pass 3 Emergency Recovery: Extracts node labels and arrow relationships
 * from severely corrupted or partially truncated diagrams to build a guaranteed-valid flowchart.
 */
function extractResilientFlowchart(rawCode) {
    if (!rawCode || typeof rawCode !== 'string') return '';
    const clean = rawCode
        .replace(/^```(?:mermaid)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .replace(/\$([^$\n]+?)\$/g, '$1');

    const lines = clean.split('\n');
    const nodes = new Map();
    const edges = [];

    for (const l of lines) {
        const line = l.trim();
        if (!line || line.startsWith('%%') || line.startsWith('flowchart') || line.startsWith('graph')) continue;

        // Try matching node with label: e.g. A["Label"] or A["Label"] --> B
        const arrowMatch = line.match(/^([a-zA-Z0-9_-]+)(?:[\(\[\{]+(?:\"?)(.*?)(?:\"?)[\)\]\}]+)?\s*-->\s*(?:\|(?:\"?)(.*?)(?:\"?)\|\s*)?([a-zA-Z0-9_-]+)(?:[\(\[\{]+(?:\"?)(.*?)(?:\"?)[\)\]\}]+)?/);
        if (arrowMatch) {
            const [, src, srcLabel, edgeLabel, tgt, tgtLabel] = arrowMatch;
            const cleanSrc = src === 'end' ? 'endNode' : src;
            const cleanTgt = tgt === 'end' ? 'endNode' : tgt;
            if (srcLabel && !nodes.has(cleanSrc)) nodes.set(cleanSrc, srcLabel);
            if (tgtLabel && !nodes.has(cleanTgt)) nodes.set(cleanTgt, tgtLabel);
            edges.push({ src: cleanSrc, tgt: cleanTgt, label: edgeLabel || null });
            continue;
        }

        // Single node definition: e.g. A["Label"]
        const singleNode = line.match(/^([a-zA-Z0-9_-]+)[\(\[\{]+(?:\"?)(.*?)(?:\"?)[\)\]\}]+/);
        if (singleNode) {
            const [, id, label] = singleNode;
            const cleanId = id === 'end' ? 'endNode' : id;
            if (!nodes.has(cleanId)) nodes.set(cleanId, label);
        }
    }

    if (edges.length === 0 && nodes.size === 0) return '';

    let res = 'flowchart TD\n';
    nodes.forEach((label, id) => {
        const cleanLbl = (label || id).replace(/"/g, "'").replace(/[\$\n]/g, ' ').trim() || id;
        res += `    ${id}["${cleanLbl}"]\n`;
    });
    for (const e of edges) {
        if (e.label) {
            const cleanEdgeLbl = e.label.replace(/"/g, "'").replace(/[\$\n]/g, ' ').trim();
            res += `    ${e.src} -->|"${cleanEdgeLbl}"| ${e.tgt}\n`;
        } else {
            res += `    ${e.src} --> ${e.tgt}\n`;
        }
    }
    return res;
}

export default function MermaidRenderer({
    chart = '',
    title = 'Architecture / Flowchart Diagram',
    onInsertDiagram = null,
    className = ''
}) {
    const [svgHtml, setSvgHtml] = useState('');
    const [renderError, setRenderError] = useState(null);
    const [isRendering, setIsRendering] = useState(true);
    const [copied, setCopied] = useState(false);
    const [copiedImage, setCopiedImage] = useState(false);
    const [isExportingImage, setIsExportingImage] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const idRef = useRef(`mermaid_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`);
    const containerRef = useRef(null);

    useEffect(() => {
        let isMounted = true;
        if (!chart || typeof chart !== 'string' || !chart.trim()) {
            setIsRendering(false);
            return;
        }

        const stripped = chart.replace(/^```(?:mermaid)?/i, '').replace(/```$/i, '').trim();
        const hasNodes = /(?:\[|\(|\{|\-\->|\-\-\-)/.test(stripped.replace(/^\s*(?:flowchart|graph)\s+[A-Z]{2}\s*/i, ''));
        if (!hasNodes) {
            setIsRendering(false);
            setRenderError('Flowchart has no diagram nodes to display.');
            return;
        }

        const renderChart = async () => {
            setIsRendering(true);
            setRenderError(null);
            try {
                // Dynamically import mermaid to avoid SSR issues in Next.js
                const mermaidModule = await import('mermaid');
                const mermaid = mermaidModule.default || mermaidModule;

                mermaid.initialize({
                    startOnLoad: false,
                    theme: 'default',
                    securityLevel: 'loose',
                    flowchart: { useMaxWidth: true, htmlLabels: false, curve: 'basis' },
                    sequence: { useMaxWidth: true, showSequenceNumbers: true },
                    er: { useMaxWidth: true },
                    class: { useMaxWidth: true },
                    themeVariables: {
                        primaryColor: '#e0e7ff',
                        primaryBorderColor: '#6366f1',
                        primaryTextColor: '#1e1b4b',
                        lineColor: '#4f46e5',
                        secondaryColor: '#f1f5f9',
                        tertiaryColor: '#ffffff'
                    }
                });

                // Pass 1: Standard render with AST tokenizer and keyword protection
                let cleanChart = sanitizeMermaidDiagram(chart);
                const containerId = `mermaid_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;

                let svg = '';
                try {
                    const result = await mermaid.render(containerId, cleanChart);
                    svg = result.svg;
                } catch (firstPassErr) {
                    console.warn('[MermaidRenderer] First pass failed, applying Pass 2 secondary recovery...', firstPassErr.message);
                    if (typeof document !== 'undefined') {
                        const stray = document.getElementById(containerId) || document.getElementById(`d${containerId}`);
                        if (stray) stray.remove();
                    }
                    // Pass 2: Clean non-ASCII, normalize, and retry
                    let fallbackChart = cleanChart
                        .replace(/[^\x20-\x7E\n]/g, ' ')
                        .replace(/;\s*$/gm, '');
                    if (!/^\s*(flowchart|graph|sequenceDiagram|classDiagram|erDiagram|stateDiagram)/m.test(fallbackChart)) {
                        fallbackChart = `flowchart TD\n${fallbackChart}`;
                    }
                    try {
                        const retryId = `mermaid_retry_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
                        const retryResult = await mermaid.render(retryId, fallbackChart);
                        svg = retryResult.svg;
                    } catch (secondPassErr) {
                        console.warn('[MermaidRenderer] Pass 2 failed, applying Pass 3 resilient flowchart recovery...', secondPassErr.message);
                        if (typeof document !== 'undefined') {
                            const stray2 = document.getElementById(`mermaid_retry_${containerId}`) || document.getElementById(`dmermaid_retry_${containerId}`);
                            if (stray2) stray2.remove();
                        }
                        // Pass 3: Reconstruct flowchart from extracted node and edge tokens
                        const resilientCode = extractResilientFlowchart(chart);
                        if (resilientCode) {
                            const pass3Id = `mermaid_p3_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
                            const p3Result = await mermaid.render(pass3Id, resilientCode);
                            svg = p3Result.svg;
                        } else {
                            throw secondPassErr;
                        }
                    }
                }

                if (isMounted) {
                    let responsiveSvg = svg;
                    // Ensure viewBox exists for responsive scaling
                    if (!responsiveSvg.includes('viewBox') && responsiveSvg.includes('width=') && responsiveSvg.includes('height=')) {
                        const wMatch = responsiveSvg.match(/width="([^"]+)"/);
                        const hMatch = responsiveSvg.match(/height="([^"]+)"/);
                        if (wMatch && hMatch) {
                            const w = parseFloat(wMatch[1]);
                            const h = parseFloat(hMatch[1]);
                            responsiveSvg = responsiveSvg.replace('<svg ', `<svg viewBox="0 0 ${w} ${h}" `);
                        }
                    }
                    // Make sure width and height are 100% responsive inside the container
                    responsiveSvg = responsiveSvg
                        .replace(/style="max-width:[^"]*"/g, 'style="max-width:100%;height:auto;"');

                    setSvgHtml(responsiveSvg);
                    setIsRendering(false);
                }
            } catch (err) {
                console.error('[MermaidRenderer] Render error:', err);
                if (isMounted) {
                    setRenderError(err.message || 'Failed to render Mermaid diagram');
                    setIsRendering(false);
                }
            }
        };

        renderChart();

        return () => {
            isMounted = false;
        };
    }, [chart]);

    const handleCopy = () => {
        navigator.clipboard.writeText(chart);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    /**
     * Sanitizes and prepares a cloned SVG to prevent browser canvas security taint errors.
     * Strips external stylesheets, converts foreignObjects to native SVG text, and ensures white backdrop.
     */
    const prepareUntaintedSvg = (svgEl, width, height) => {
        const clonedSvg = svgEl.cloneNode(true);
        clonedSvg.setAttribute('width', width);
        clonedSvg.setAttribute('height', height);
        if (!clonedSvg.getAttribute('viewBox')) {
            clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }
        clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        // 1. Remove external @import rules from style tags that cause cross-origin taint
        const styles = clonedSvg.querySelectorAll('style');
        styles.forEach(st => {
            if (st.textContent) {
                st.textContent = st.textContent.replace(/@import\s+url\([^)]+\);?/gi, '');
            }
        });

        // 2. Convert any foreignObject elements to native SVG <text> elements to avoid canvas tainting
        const foreignObjects = clonedSvg.querySelectorAll('foreignObject');
        foreignObjects.forEach(fo => {
            const textContent = (fo.textContent || '').trim();
            const x = parseFloat(fo.getAttribute('x') || 0);
            const y = parseFloat(fo.getAttribute('y') || 0);
            const w = parseFloat(fo.getAttribute('width') || 100);
            const h = parseFloat(fo.getAttribute('height') || 30);

            const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textEl.setAttribute('x', String(x + w / 2));
            textEl.setAttribute('y', String(y + h / 2 + 4));
            textEl.setAttribute('text-anchor', 'middle');
            textEl.setAttribute('dominant-baseline', 'middle');
            textEl.setAttribute('fill', '#1e293b');
            textEl.setAttribute('font-family', 'ui-sans-serif, system-ui, -apple-system, sans-serif');
            textEl.setAttribute('font-size', '12px');
            textEl.textContent = textContent;

            if (fo.parentNode) {
                fo.parentNode.replaceChild(textEl, fo);
            }
        });

        // 3. Add clean opaque white background for pasting into Word documents
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('x', '0');
        bgRect.setAttribute('y', '0');
        bgRect.setAttribute('width', '100%');
        bgRect.setAttribute('height', '100%');
        bgRect.setAttribute('fill', '#ffffff');
        clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

        return clonedSvg;
    };

    /**
     * Downloads the diagram as a standalone high-fidelity vector SVG file (100% vector, no rasterization).
     */
    const handleDownloadSvg = () => {
        if (!svgHtml) return;
        try {
            const svgEl = containerRef.current?.querySelector('svg');
            if (!svgEl) {
                toast.error('Diagram SVG not ready');
                return;
            }
            const bbox = svgEl.getBoundingClientRect();
            const width = Math.max(400, Math.round(bbox.width || 600));
            const height = Math.max(250, Math.round(bbox.height || 400));
            const cleanSvg = prepareUntaintedSvg(svgEl, width, height);

            const svgXml = new XMLSerializer().serializeToString(cleanSvg);
            const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
            const URLObj = window.URL || window.webkitURL || window;
            const blobURL = URLObj.createObjectURL(svgBlob);

            const link = document.createElement('a');
            link.download = `${(title || 'diagram').replace(/[^a-zA-Z0-9_-]/g, '_')}.svg`;
            link.href = blobURL;
            link.click();
            setTimeout(() => URLObj.revokeObjectURL(blobURL), 1000);
            toast.success('Vector SVG downloaded! Fully compatible with Word & Docs.', { icon: '📐' });
        } catch (e) {
            console.error('[MermaidRenderer] SVG export failed:', e);
            toast.error('SVG download failed: ' + e.message);
        }
    };

    /**
     * Converts the rendered SVG diagram to a crisp 2x PNG image with opaque white background
     * and copies it directly to the OS clipboard for pasting into Word documents / Google Docs.
     */
    const handleCopyImageForWord = async () => {
        if (!svgHtml) return;
        setIsExportingImage(true);
        try {
            const svgEl = containerRef.current?.querySelector('svg');
            if (!svgEl) {
                toast.error('Diagram SVG not ready');
                setIsExportingImage(false);
                return;
            }

            const bbox = svgEl.getBoundingClientRect();
            const width = Math.max(400, Math.round(bbox.width || 600));
            const height = Math.max(250, Math.round(bbox.height || 400));

            const cleanSvg = prepareUntaintedSvg(svgEl, width, height);
            const svgXml = new XMLSerializer().serializeToString(cleanSvg);
            const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
            const URLObj = window.URL || window.webkitURL || window;
            const blobURL = URLObj.createObjectURL(svgBlob);

            const img = new window.Image();
            img.crossOrigin = 'anonymous';

            img.onload = async () => {
                try {
                    const scale = 2;
                    const canvas = document.createElement('canvas');
                    canvas.width = width * scale;
                    canvas.height = height * scale;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    URLObj.revokeObjectURL(blobURL);

                    // Test canvas export capability safely
                    let isTainted = false;
                    try {
                        canvas.toDataURL('image/png');
                    } catch (secErr) {
                        isTainted = true;
                    }

                    if (isTainted) {
                        // Fallback: Copy or download clean vector SVG
                        setIsExportingImage(false);
                        handleDownloadSvg();
                        toast('Downloaded as vector SVG (Canvas rasterization was restricted by browser security). Ready for Word!', { icon: 'ℹ️' });
                        return;
                    }

                    canvas.toBlob(async (pngBlob) => {
                        setIsExportingImage(false);
                        if (!pngBlob) {
                            handleDownloadSvg();
                            return;
                        }

                        // Direct write to OS Clipboard as image/png
                        if (navigator.clipboard && typeof navigator.clipboard.write === 'function' && window.ClipboardItem) {
                            try {
                                const item = new ClipboardItem({ 'image/png': pngBlob });
                                await navigator.clipboard.write([item]);
                                setCopiedImage(true);
                                setTimeout(() => setCopiedImage(false), 2500);
                                toast.success('Diagram copied as image! Ready to paste (Ctrl+V) into your document.', { icon: '📋' });
                                return;
                            } catch (clipErr) {
                                console.warn('[MermaidRenderer] Clipboard write image failed, falling back to download:', clipErr);
                            }
                        }

                        // Fallback: Trigger PNG download
                        const link = document.createElement('a');
                        link.download = `${(title || 'diagram').replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                        toast.success('Diagram image downloaded for Word document!', { icon: '🖼️' });
                    }, 'image/png');
                } catch (canvasErr) {
                    URLObj.revokeObjectURL(blobURL);
                    setIsExportingImage(false);
                    // Safe vector SVG fallback
                    handleDownloadSvg();
                }
            };

            img.onerror = () => {
                URLObj.revokeObjectURL(blobURL);
                setIsExportingImage(false);
                handleDownloadSvg();
            };

            img.src = blobURL;
        } catch (err) {
            setIsExportingImage(false);
            console.error('[MermaidRenderer] Error exporting image:', err);
            handleDownloadSvg();
        }
    };

    /**
     * Downloads the diagram as a standalone high-resolution PNG file
     */
    const handleDownloadPng = () => {
        if (!svgHtml) return;
        try {
            const svgEl = containerRef.current?.querySelector('svg');
            if (!svgEl) return;
            const bbox = svgEl.getBoundingClientRect();
            const width = Math.max(400, Math.round(bbox.width || 600));
            const height = Math.max(250, Math.round(bbox.height || 400));

            const cleanSvg = prepareUntaintedSvg(svgEl, width, height);
            const svgXml = new XMLSerializer().serializeToString(cleanSvg);
            const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
            const URLObj = window.URL || window.webkitURL || window;
            const blobURL = URLObj.createObjectURL(svgBlob);

            const img = new window.Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                try {
                    const scale = 2;
                    const canvas = document.createElement('canvas');
                    canvas.width = width * scale;
                    canvas.height = height * scale;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    URLObj.revokeObjectURL(blobURL);

                    const link = document.createElement('a');
                    link.download = `${(title || 'diagram').replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    toast.success('Diagram PNG saved! Ready to insert into Word.', { icon: '💾' });
                } catch (canvasErr) {
                    URLObj.revokeObjectURL(blobURL);
                    handleDownloadSvg();
                }
            };

            img.onerror = () => {
                URLObj.revokeObjectURL(blobURL);
                handleDownloadSvg();
            };

            img.src = blobURL;
        } catch (e) {
            handleDownloadSvg();
        }
    };

    const handleInsertToCanvas = () => {
        if (!svgHtml) return;
        if (typeof onInsertDiagram === 'function') {
            onInsertDiagram(svgHtml, {
                title: title || 'Mermaid Diagram',
                code: chart,
                width: 440,
                height: 420
            });
        }
    };

    return (
        <div className={`my-3 rounded-xl border border-slate-700/80 bg-slate-900/95 overflow-hidden shadow-lg ${className}`}>
            {/* Header Toolbar - Clean Icons Only */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/90 border-b border-slate-800 text-[11px]">
                <div className="flex items-center gap-1.5">
                    <span className="text-indigo-400 text-xs">📊</span>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowInfo(prev => !prev)}
                            className={`p-1 rounded transition ${
                                showInfo ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                            title="Diagram & Architecture Details"
                        >
                            <Info className="w-3.5 h-3.5" />
                        </button>
                        {showInfo && (
                            <div
                                className="absolute top-full left-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2.5 z-50 flex flex-col gap-1 min-w-[200px] text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-800 flex items-center justify-between">
                                    <span>Diagram Info</span>
                                    <button type="button" onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-white">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="text-[11px] font-semibold text-indigo-300">{title}</div>
                                <div className="text-[10px] text-slate-400">Engine: Mermaid.js Vector Runtime</div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {/* Copy Mermaid Code */}
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white transition cursor-pointer"
                        title="Copy Mermaid Code"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    {/* Copy Diagram as Image for Word Documents (Ctrl+V ready) */}
                    {svgHtml && (
                        <button
                            type="button"
                            onClick={handleCopyImageForWord}
                            disabled={isExportingImage}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 active:scale-95 text-indigo-300 hover:text-white transition cursor-pointer flex items-center gap-1"
                            title="Copy Diagram as Image (PNG) to Clipboard for Documents / Reports"
                        >
                            {copiedImage ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                                <Image className="w-3.5 h-3.5 text-indigo-400" />
                            )}
                        </button>
                    )}

                    {/* Download Diagram as High-Res PNG */}
                    {svgHtml && (
                        <button
                            type="button"
                            onClick={handleDownloadPng}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Download Diagram Image (PNG) for Word / Reports"
                        >
                            <Download className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {/* Download Diagram as Clean Vector SVG */}
                    {svgHtml && (
                        <button
                            type="button"
                            onClick={handleDownloadSvg}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-400 hover:text-white transition cursor-pointer"
                            title="Download Pure Vector SVG for Word / PowerPoint / Illustrator"
                        >
                            <FileDown className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {/* Add to Whiteboard */}
                    {svgHtml && typeof onInsertDiagram === 'function' && (
                        <button
                            type="button"
                            onClick={handleInsertToCanvas}
                            className="p-1.5 rounded bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white transition cursor-pointer shadow-xs"
                            title="Add Diagram to Whiteboard Canvas"
                        >
                            <PlusCircle className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Visual Diagram Body */}
            {isRendering ? (
                <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2 bg-slate-950/50">
                    <span className="animate-spin text-indigo-400">⏳</span>
                    <span>Rendering Mermaid vector diagram...</span>
                </div>
            ) : renderError ? (
                <div className="p-3 bg-red-950/30 border-t border-red-900/40 text-red-300 text-xs font-mono">
                    <div className="flex items-center gap-1.5 font-bold mb-1 text-red-400">
                        <span>⚠️</span> Diagram Syntax Warning
                    </div>
                    <pre className="text-[11px] overflow-x-auto p-2 rounded bg-slate-950 text-slate-300 border border-slate-800">
                        {chart}
                    </pre>
                </div>
            ) : (
                <div
                    ref={containerRef}
                    className="w-full flex items-center justify-center bg-white p-4 overflow-auto max-h-96 [&_svg]:max-w-full [&_svg]:max-h-80 [&_svg]:h-auto [&_.nodeLabel]:text-slate-900 [&_.edgeLabel]:text-slate-800 [&_text]:fill-slate-900 shadow-inner"
                    dangerouslySetInnerHTML={{ __html: svgHtml }}
                />
            )}
        </div>
    );
}
