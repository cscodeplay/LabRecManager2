/**
 * mermaidToWhiteboard.js
 * Converts Mermaid flowchart diagrams into native interactive Whiteboard shapes and connectors.
 * Allows users to drag shapes, double-click to edit text, re-route connectors, and customize styles.
 */

function wrapText(text, maxChars = 22) {
    if (!text || typeof text !== 'string') return '';
    const clean = text.replace(/<br\s*\/?>/gi, '\n').trim();
    if (clean.includes('\n')) return clean;
    if (clean.length <= maxChars) return clean;

    const words = clean.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        if ((currentLine + ' ' + word).trim().length <= maxChars) {
            currentLine = (currentLine + ' ' + word).trim();
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
}

function cleanLabel(raw) {
    if (!raw) return '';
    let s = raw.trim();
    // Strip surrounding quotes
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1).trim();
    }
    // HTML entities
    s = s.replace(/&amp;/g, '&')
         .replace(/&lt;/g, '<')
         .replace(/&gt;/g, '>')
         .replace(/&quot;/g, '"')
         .replace(/&#39;/g, "'");
    return s;
}

export function normalizeConnectorLabel(raw) {
    const s = cleanLabel(raw);
    if (!s) return '';
    const cleanLower = s.toLowerCase().replace(/^[\[\(\{'"\s]+|[\]\)\}'"\s]+$/g, '');
    if (cleanLower === 'yes' || cleanLower === 'y' || cleanLower === 'true' || cleanLower === 't') {
        return 'True';
    }
    if (cleanLower === 'no' || cleanLower === 'n' || cleanLower === 'false' || cleanLower === 'f') {
        return 'False';
    }
    return s;
}

export function parseMermaidToWhiteboardElements(
    mermaidCode,
    centerX = 400,
    centerY = 300,
    maxViewportW = 950,
    maxViewportH = 650,
    options = {}
) {
    if (!mermaidCode || typeof mermaidCode !== 'string') return null;

    const clean = mermaidCode
        .replace(/^```(?:mermaid)?/i, '')
        .replace(/```$/i, '')
        .trim();

    // Check for flowchart or graph declaration
    const headerMatch = clean.match(/^\s*(flowchart|graph)\s+([A-Za-z]+)/i);
    if (!headerMatch) return null;

    const direction = (headerMatch[2] || 'TD').toUpperCase();
    const isHorizontal = direction === 'LR' || direction === 'RL';

    const lines = clean.split('\n');
    const nodesMap = new Map(); // id -> { id, label, shapeType }
    const edges = []; // { from, to, label, style }

    // Shape classification regex helpers
    const parseNodeSyntax = (raw) => {
        if (!raw) return null;
        let text = raw.trim();

        // 1. Terminator (["..."]) or (['...'])
        let m = text.match(/^([a-zA-Z0-9_-]+)\s*\(\[\s*["']?(.*?)["']?\s*\]\)$/);
        if (m) return { id: m[1], label: cleanLabel(m[2]) || m[1], shapeType: 'terminator' };

        // 2. Diamond {"..."} or {'...'}
        m = text.match(/^([a-zA-Z0-9_-]+)\s*\{\s*["']?(.*?)["']?\s*\}$/);
        if (m) return { id: m[1], label: cleanLabel(m[2]) || m[1], shapeType: 'diamond' };

        // 3. Parallelogram [/"..."/] or [\ "..." \]
        m = text.match(/^([a-zA-Z0-9_-]+)\s*\[[\/\\]\s*["']?(.*?)["']?\s*[\/\\]\]$/);
        if (m) return { id: m[1], label: cleanLabel(m[2]) || m[1], shapeType: 'parallelogram' };

        // 4. Cylinder [("...")] or [('...')]
        m = text.match(/^([a-zA-Z0-9_-]+)\s*\[\(\s*["']?(.*?)["']?\s*\)\]$/);
        if (m) return { id: m[1], label: cleanLabel(m[2]) || m[1], shapeType: 'cylinder' };

        // 5. Circle (("...")) or (('...'))
        m = text.match(/^([a-zA-Z0-9_-]+)\s*\(\(\s*["']?(.*?)["']?\s*\)\)$/);
        if (m) return { id: m[1], label: cleanLabel(m[2]) || m[1], shapeType: 'circle' };

        // 6. Rounded rectangle ("...") or ('...')
        m = text.match(/^([a-zA-Z0-9_-]+)\s*\(\s*["']?(.*?)["']?\s*\)$/);
        if (m) return { id: m[1], label: cleanLabel(m[2]) || m[1], shapeType: 'terminator' };

        // 7. Standard rectangle ["..."] or ['...']
        m = text.match(/^([a-zA-Z0-9_-]+)\s*\[\s*["']?(.*?)["']?\s*\]$/);
        if (m) return { id: m[1], label: cleanLabel(m[2]) || m[1], shapeType: 'rectangle' };

        // 8. Bare alphanumeric ID
        m = text.match(/^([a-zA-Z0-9_-]+)$/);
        if (m) return { id: m[1], label: m[1], shapeType: 'rectangle' };

        return null;
    };

    // Helper to register or merge node
    const registerNode = (nodeData) => {
        if (!nodeData || !nodeData.id) return;
        const existing = nodesMap.get(nodeData.id);
        if (!existing) {
            // Check if label indicates terminator
            let finalType = nodeData.shapeType;
            if (finalType === 'rectangle' && /^(start|begin|end|finish|stop)\b/i.test(nodeData.label)) {
                finalType = 'terminator';
            }
            nodesMap.set(nodeData.id, { ...nodeData, shapeType: finalType });
        } else {
            // Update with more specific shape/label if previous was bare ID
            if (nodeData.label !== nodeData.id || existing.label === existing.id) {
                let finalType = nodeData.shapeType !== 'rectangle' ? nodeData.shapeType : existing.shapeType;
                if (finalType === 'rectangle' && /^(start|begin|end|finish|stop)\b/i.test(nodeData.label)) {
                    finalType = 'terminator';
                }
                nodesMap.set(nodeData.id, {
                    ...existing,
                    label: nodeData.label,
                    shapeType: finalType
                });
            }
        }
    };

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('%%') || /^flowchart\b|^graph\b|^subgraph\b|^end\b|^classDef\b|^class\b|^style\b/i.test(line)) {
            continue;
        }

        // Check for edge with label: A -- label --> B
        const mLabelInLine = line.match(/^([^-]+?)\s*--\s*["']?([^"'>\n]+?)["']?\s*-->\s*(.*)$/);
        if (mLabelInLine) {
            const srcStr = mLabelInLine[1].trim();
            const edgeLbl = normalizeConnectorLabel(mLabelInLine[2]);
            const tgtStr = mLabelInLine[3].trim();

            const srcNode = parseNodeSyntax(srcStr) || { id: srcStr.replace(/[^a-zA-Z0-9_-]/g, ''), label: srcStr, shapeType: 'rectangle' };
            const tgtNode = parseNodeSyntax(tgtStr) || { id: tgtStr.replace(/[^a-zA-Z0-9_-]/g, ''), label: tgtStr, shapeType: 'rectangle' };

            registerNode(srcNode);
            registerNode(tgtNode);

            edges.push({
                from: srcNode.id,
                to: tgtNode.id,
                label: edgeLbl,
                style: 'solid'
            });
            continue;
        }

        // Check for edge with pipe label: A -->|label| B or A -.->|label| B
        const mPipeLabel = line.match(/^(.*?)\s*(-->|---|==>|-\.->)\s*\|["']?(.*?)["']?\|\s*(.*)$/);
        if (mPipeLabel) {
            const srcStr = mPipeLabel[1].trim();
            const arrow = mPipeLabel[2].trim();
            const edgeLbl = normalizeConnectorLabel(mPipeLabel[3]);
            const tgtStr = mPipeLabel[4].trim();

            const srcNode = parseNodeSyntax(srcStr) || { id: srcStr.replace(/[^a-zA-Z0-9_-]/g, ''), label: srcStr, shapeType: 'rectangle' };
            const tgtNode = parseNodeSyntax(tgtStr) || { id: tgtStr.replace(/[^a-zA-Z0-9_-]/g, ''), label: tgtStr, shapeType: 'rectangle' };

            registerNode(srcNode);
            registerNode(tgtNode);

            edges.push({
                from: srcNode.id,
                to: tgtNode.id,
                label: edgeLbl,
                style: arrow === '-.->' ? 'dashed' : 'solid'
            });
            continue;
        }

        // Standard or chained edges: A --> B or A --> B --> C
        if (/-->|---|==>|-\.->/.test(line)) {
            const tokens = line.split(/\s*(-->|---|==>|-\.->)\s*/).map(t => t.trim()).filter(Boolean);
            if (tokens.length >= 3) {
                for (let i = 0; i < tokens.length - 2; i += 2) {
                    const srcStr = tokens[i];
                    const arrow = tokens[i + 1];
                    const tgtStr = tokens[i + 2];

                    const srcNode = parseNodeSyntax(srcStr) || { id: srcStr.replace(/[^a-zA-Z0-9_-]/g, ''), label: srcStr, shapeType: 'rectangle' };
                    const tgtNode = parseNodeSyntax(tgtStr) || { id: tgtStr.replace(/[^a-zA-Z0-9_-]/g, ''), label: tgtStr, shapeType: 'rectangle' };

                    registerNode(srcNode);
                    registerNode(tgtNode);

                    edges.push({
                        from: srcNode.id,
                        to: tgtNode.id,
                        label: '',
                        style: arrow === '-.->' ? 'dashed' : 'solid'
                    });
                }
                continue;
            }
        }

        // Single isolated node definition: e.g. A["Title"]
        const single = parseNodeSyntax(line);
        if (single && single.id) {
            registerNode(single);
        }
    }

    if (nodesMap.size === 0) return null;

    // 1. Build Adjacency and In-Degree maps
    const inDegree = new Map();
    const adj = new Map();
    nodesMap.forEach((_, id) => {
        inDegree.set(id, 0);
        adj.set(id, []);
    });

    edges.forEach(({ from, to }) => {
        if (adj.has(from) && inDegree.has(to)) {
            adj.get(from).push(to);
            inDegree.set(to, inDegree.get(to) + 1);
        }
    });

    // 2. Identify Roots: in-degree 0, or Start/Begin node, or first defined node
    let roots = [];
    nodesMap.forEach((node, id) => {
        if (inDegree.get(id) === 0) roots.push(id);
    });
    if (roots.length === 0 && nodesMap.size > 0) {
        roots = [nodesMap.keys().next().value];
    }

    // Sort roots so Start/Begin comes first
    roots.sort((a, b) => {
        const aStart = /start|begin/i.test(nodesMap.get(a)?.label || '');
        const bStart = /start|begin/i.test(nodesMap.get(b)?.label || '');
        return (bStart ? 1 : 0) - (aStart ? 1 : 0);
    });

    // 3. DFS to detect back-edges (cycles/loops) and construct Forward DAG
    const visited = new Set();
    const onStack = new Set();
    const forwardAdj = new Map();
    const backEdges = new Set();
    nodesMap.forEach((_, id) => forwardAdj.set(id, []));

    function dfs(u) {
        visited.add(u);
        onStack.add(u);
        const neighbors = adj.get(u) || [];
        for (const v of neighbors) {
            if (onStack.has(v)) {
                // Back-edge (cycle / loop back to ancestor)
                backEdges.add(`${u}->${v}`);
            } else {
                forwardAdj.get(u).push(v);
                if (!visited.has(v)) {
                    dfs(v);
                }
            }
        }
        onStack.delete(u);
    }

    roots.forEach(r => { if (!visited.has(r)) dfs(r); });
    nodesMap.forEach((_, id) => { if (!visited.has(id)) dfs(id); });

    // 4. Compute DAG in-degree strictly for forward edges
    const dagInDegree = new Map();
    nodesMap.forEach((_, id) => dagInDegree.set(id, 0));
    forwardAdj.forEach((neighbors) => {
        neighbors.forEach(v => dagInDegree.set(v, (dagInDegree.get(v) || 0) + 1));
    });

    // 5. Kahn's Algorithm for Topological Ordering on Forward DAG
    const topoOrder = [];
    const q = [];
    nodesMap.forEach((_, id) => {
        if (dagInDegree.get(id) === 0) q.push(id);
    });

    while (q.length > 0) {
        const u = q.shift();
        topoOrder.push(u);
        const neighbors = forwardAdj.get(u) || [];
        for (const v of neighbors) {
            dagInDegree.set(v, dagInDegree.get(v) - 1);
            if (dagInDegree.get(v) === 0) {
                q.push(v);
            }
        }
    }

    // 6. Assign Levels using Longest Path on Forward DAG (ensures strict top-to-bottom sequence)
    const levelMap = new Map();
    nodesMap.forEach((_, id) => levelMap.set(id, 0));

    topoOrder.forEach(u => {
        const uLvl = levelMap.get(u) || 0;
        const neighbors = forwardAdj.get(u) || [];
        for (const v of neighbors) {
            levelMap.set(v, Math.max(levelMap.get(v) || 0, uLvl + 1));
        }
    });

    // 7. Group nodes by level
    const levels = [];
    nodesMap.forEach((node, id) => {
        const lvl = levelMap.get(id) || 0;
        if (!levels[lvl]) levels[lvl] = [];
        levels[lvl].push(node);
    });

    // 8. Order nodes within each level using predecessor barycenters
    const nodeOrderX = new Map();
    levels.forEach((lvlNodes, lvlIdx) => {
        if (!lvlNodes) return;
        if (lvlIdx === 0) {
            lvlNodes.forEach((node, i) => nodeOrderX.set(node.id, i));
            return;
        }

        lvlNodes.forEach((node) => {
            let sumX = 0;
            let countX = 0;
            edges.forEach(({ from, to, label }) => {
                if (to === node.id && (levelMap.get(from) || 0) < lvlIdx) {
                    const pX = nodeOrderX.get(from) || 0;
                    const norm = normalizeConnectorLabel(label);
                    const bias = norm === 'True' ? -0.3 : (norm === 'False' ? 0.3 : 0);
                    sumX += (pX + bias);
                    countX += 1;
                }
            });
            const baryX = countX > 0 ? (sumX / countX) : 0;
            nodeOrderX.set(node.id, baryX);
        });

        // Sort nodes in this level by baryX
        lvlNodes.sort((a, b) => (nodeOrderX.get(a.id) || 0) - (nodeOrderX.get(b.id) || 0));
        lvlNodes.forEach((node, i) => nodeOrderX.set(node.id, i));
    });

    // Compute dimensions and local positions
    const nodeShapes = [];
    const idToGeneratedId = new Map();
    const nodeCoords = new Map();

    const baseColGap = 70;
    const baseRowGap = 80;

    levels.forEach((lvlNodes, lvlIdx) => {
        if (!lvlNodes) return;
        const count = lvlNodes.length;

        lvlNodes.forEach((node, idxInLvl) => {
            const formattedText = wrapText(node.label, 20);
            const lineCount = formattedText.split('\n').length;

            let w = 170;
            let h = Math.max(55, 32 + lineCount * 18);

            if (node.shapeType === 'diamond') {
                w = Math.max(170, 120 + lineCount * 24);
                h = Math.max(80, 50 + lineCount * 20);
            } else if (node.shapeType === 'terminator') {
                w = Math.max(140, 100 + formattedText.length * 4);
                h = 50;
            } else if (node.shapeType === 'parallelogram') {
                w = 180;
                h = Math.max(60, 36 + lineCount * 18);
            }

            let localX, localY;
            if (isHorizontal) {
                localX = lvlIdx * (180 + baseColGap);
                localY = (idxInLvl - (count - 1) / 2) * (80 + baseRowGap);
            } else {
                localX = (idxInLvl - (count - 1) / 2) * (180 + baseColGap);
                localY = lvlIdx * (80 + baseRowGap);
            }

            const genId = `flow_node_${Date.now()}_${node.id}_${Math.random().toString(36).substr(2, 4)}`;
            idToGeneratedId.set(node.id, genId);
            nodeCoords.set(node.id, { x: localX, y: localY, width: w, height: h });

            // Styling palette
            let strokeCol = '#3b82f6';
            let bgCol = '#eff6ff';
            let txtCol = '#1e293b';

            if (node.shapeType === 'terminator' || /^(start|begin|end|finish|stop)/i.test(node.label)) {
                const isStart = /start|begin/i.test(node.label);
                strokeCol = isStart ? '#10b981' : '#ef4444';
                bgCol = isStart ? '#ecfdf5' : '#fef2f2';
                txtCol = isStart ? '#065f46' : '#991b1b';
            } else if (node.shapeType === 'diamond') {
                strokeCol = '#f59e0b';
                bgCol = '#fffbeb';
                txtCol = '#92400e';
            } else if (node.shapeType === 'parallelogram') {
                strokeCol = '#8b5cf6';
                bgCol = '#f5f3ff';
                txtCol = '#5b21b6';
            }

            nodeShapes.push({
                id: genId,
                type: node.shapeType,
                x: localX,
                y: localY,
                width: w,
                height: h,
                rotation: 0,
                color: strokeCol,
                strokeWidth: 2,
                fillColor: bgCol,
                strokeStyle: 'solid',
                text: formattedText,
                textColor: txtCol,
                fontSize: 13,
                fontFamily: 'Inter, system-ui, sans-serif'
            });
        });
    });

    // Compute initial bounding box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodeShapes.forEach(n => {
        minX = Math.min(minX, n.x);
        maxX = Math.max(maxX, n.x + n.width);
        minY = Math.min(minY, n.y);
        maxY = Math.max(maxY, n.y + n.height);
    });

    let graphWidth = maxX - minX;
    let graphHeight = maxY - minY;

    // Viewport-aware scaling: Keep diagram strictly within visible canvas bounds
    const maxAvailableW = Math.max(340, (maxViewportW || 950) * 0.85 - 40);
    const maxAvailableH = Math.max(260, (maxViewportH || 650) * 0.85 - 40);

    let fitScale = 1.0;
    if (graphWidth > maxAvailableW || graphHeight > maxAvailableH) {
        fitScale = Math.min(1.0, maxAvailableW / graphWidth, maxAvailableH / graphHeight);
    }

    if (fitScale < 1.0) {
        // Scale positions relative to (minX, minY)
        nodeShapes.forEach(n => {
            n.x = minX + (n.x - minX) * fitScale;
            n.y = minY + (n.y - minY) * fitScale;

            // Scale shape dimensions gracefully while keeping text comfortable & resizable
            const shapeScale = Math.max(0.72, fitScale);
            n.width = Math.round(n.width * shapeScale);
            n.height = Math.round(n.height * shapeScale);

            // Readable font constraint: Clamped at minimum 11px
            n.fontSize = Math.max(11, Math.round(13 * fitScale));
        });

        // Recompute bounds after fitScale
        minX = Infinity; maxX = -Infinity; minY = Infinity; maxY = -Infinity;
        nodeShapes.forEach(n => {
            minX = Math.min(minX, n.x);
            maxX = Math.max(maxX, n.x + n.width);
            minY = Math.min(minY, n.y);
            maxY = Math.max(maxY, n.y + n.height);
        });
        graphWidth = maxX - minX;
        graphHeight = maxY - minY;
    }

    // Horizontally and vertically center inside the visible viewport around (centerX, centerY)
    const offsetX = Math.round(centerX - (minX + graphWidth / 2));
    const offsetY = Math.round(centerY - (minY + graphHeight / 2));

    // Apply offset to all nodes
    nodeShapes.forEach(n => {
        n.x += offsetX;
        n.y += offsetY;
        const originalCoord = nodeCoords.get(n.id);
        if (originalCoord) {
            originalCoord.x = n.x;
            originalCoord.y = n.y;
            originalCoord.width = n.width;
            originalCoord.height = n.height;
        }
    });

    // Update nodeCoords map with offset
    nodesMap.forEach((_, id) => {
        const genId = idToGeneratedId.get(id);
        const shape = nodeShapes.find(s => s.id === genId);
        if (shape) {
            nodeCoords.set(id, { x: shape.x, y: shape.y, width: shape.width, height: shape.height });
        }
    });

    // Generate Smart Connectors with curved paths & True/False normalization
    const connectorShapes = [];
    const connPathType = options.connectorType || 'curved'; // Curved connectors as requested!

    edges.forEach((edge, eIdx) => {
        const srcGenId = idToGeneratedId.get(edge.from);
        const tgtGenId = idToGeneratedId.get(edge.to);
        const srcPos = nodeCoords.get(edge.from);
        const tgtPos = nodeCoords.get(edge.to);

        if (!srcGenId || !tgtGenId || !srcPos || !tgtPos) return;

        let sAnchor = 'bottom';
        let tAnchor = 'top';

        if (isHorizontal) {
            if (tgtPos.x > srcPos.x + 20) {
                sAnchor = 'right';
                tAnchor = 'left';
            } else if (tgtPos.x < srcPos.x - 20) {
                sAnchor = 'bottom';
                tAnchor = 'bottom';
            } else {
                sAnchor = tgtPos.y > srcPos.y ? 'bottom' : 'top';
                tAnchor = tgtPos.y > srcPos.y ? 'top' : 'bottom';
            }
        } else {
            // TD layout
            if (tgtPos.y > srcPos.y + 20) {
                sAnchor = 'bottom';
                tAnchor = 'top';
            } else if (tgtPos.y < srcPos.y - 20) {
                // Backward loop (e.g. loop back to condition or earlier step)
                const loopSide = (srcPos.x < centerX) ? 'left' : 'right';
                sAnchor = loopSide;
                tAnchor = loopSide;
            } else {
                // Lateral peer connection
                sAnchor = srcPos.x < tgtPos.x ? 'right' : 'left';
                tAnchor = srcPos.x < tgtPos.x ? 'left' : 'right';
            }
        }

        const normLabel = normalizeConnectorLabel(edge.label || '');
        const isTrue = normLabel === 'True';
        const isFalse = normLabel === 'False';
        const connColor = isTrue ? '#059669' : (isFalse ? '#dc2626' : (normLabel ? '#4f46e5' : '#475569'));

        const connId = `flow_conn_${Date.now()}_${eIdx}_${Math.random().toString(36).substr(2, 4)}`;
        connectorShapes.push({
            id: connId,
            type: 'connector',
            sourceId: srcGenId,
            sourceAnchor: sAnchor,
            targetId: tgtGenId,
            targetAnchor: tAnchor,
            pathType: connPathType,
            color: connColor,
            strokeWidth: 2,
            arrowEnd: 'arrow',
            arrowStart: 'none',
            text: normLabel,
            textColor: isTrue ? '#047857' : (isFalse ? '#b91c1c' : '#334155'),
            fontSize: 11.5,
            strokeStyle: edge.style || 'solid'
        });
    });

    return {
        shapes: [...nodeShapes, ...connectorShapes],
        nodeCount: nodeShapes.length,
        edgeCount: connectorShapes.length,
        width: graphWidth,
        height: graphHeight
    };
}
