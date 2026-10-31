'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Shapes,
    MousePointer,
    ArrowRight,
    Trash2,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Download,
    Plus,
    Check,
    Edit2,
    Move,
    Maximize2,
    Minimize2,
    HelpCircle,
    Info,
    Copy,
    Scissors,
    Clipboard
} from 'lucide-react';
import toast from 'react-hot-toast';

// Initial Starter Flowchart Nodes and Connectors
const DEFAULT_INITIAL_NODES = [
    {
        id: 'node_start',
        type: 'terminator',
        text: 'Start',
        x: 180,
        y: 40,
        width: 140,
        height: 52,
        color: '#dcfce7',
        borderColor: '#16a34a',
        textColor: '#14532d'
    },
    {
        id: 'node_input',
        type: 'io',
        text: 'Input n',
        x: 165,
        y: 140,
        width: 170,
        height: 54,
        color: '#dbeafe',
        borderColor: '#2563eb',
        textColor: '#1e3a8a'
    },
    {
        id: 'node_decision',
        type: 'decision',
        text: 'n > 0?',
        x: 175,
        y: 245,
        width: 150,
        height: 72,
        color: '#fef3c7',
        borderColor: '#d97706',
        textColor: '#78350f'
    },
    {
        id: 'node_process',
        type: 'process',
        text: 'total = n * 2',
        x: 165,
        y: 370,
        width: 170,
        height: 54,
        color: '#f8fafc',
        borderColor: '#475569',
        textColor: '#0f172a'
    },
    {
        id: 'node_end',
        type: 'terminator',
        text: 'End',
        x: 180,
        y: 480,
        width: 140,
        height: 52,
        color: '#dcfce7',
        borderColor: '#16a34a',
        textColor: '#14532d'
    }
];

const DEFAULT_INITIAL_CONNECTORS = [
    { id: 'conn_1', from: 'node_start', fromPort: 'bottom', to: 'node_input', toPort: 'top', label: '' },
    { id: 'conn_2', from: 'node_input', fromPort: 'bottom', to: 'node_decision', toPort: 'top', label: '' },
    { id: 'conn_3', from: 'node_decision', fromPort: 'bottom', to: 'node_process', toPort: 'top', label: 'Yes' },
    { id: 'conn_4', from: 'node_process', fromPort: 'bottom', to: 'node_end', toPort: 'top', label: '' }
];

const PORTS = ['top', 'right', 'bottom', 'left'];

export default function FlowchartVisualCanvas({
    initialData,
    onChange,
    readOnly = false
}) {
    // Canvas nodes and connectors
    const [nodes, setNodes] = useState(() => initialData?.nodes || DEFAULT_INITIAL_NODES);
    const [connectors, setConnectors] = useState(() => initialData?.connectors || DEFAULT_INITIAL_CONNECTORS);

    // Active tool: 'select' | 'connector'
    const [activeTool, setActiveTool] = useState('select');

    // Selection & connection state
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [selectedConnectorId, setSelectedConnectorId] = useState(null);
    const [hoveredNodeId, setHoveredNodeId] = useState(null);

    // Connecting from a port: { nodeId, port }
    const [connectingSource, setConnectingSource] = useState(null);
    const [connectingMousePos, setConnectingMousePos] = useState(null);

    // Editing text inline
    const [editingNodeId, setEditingNodeId] = useState(null);
    const [editingNodeText, setEditingNodeText] = useState('');
    const [editingConnectorId, setEditingConnectorId] = useState(null);
    const [editingConnectorLabel, setEditingConnectorLabel] = useState('');

    // Pan and zoom
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    // Dragging a node
    const [draggingNodeId, setDraggingNodeId] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Internal clipboard for cut / copy / paste
    const clipboardRef = useRef(null);

    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const lastSyncStateRef = useRef({ nodes: null, connectors: null });
    const isLocalUpdateRef = useRef(false);

    // Emit changes to parent safely (without bouncing back into initialData)
    const notifyChange = useCallback((newNodes, newConnectors) => {
        if (!onChange) return;
        isLocalUpdateRef.current = true;
        onChange({ nodes: newNodes, connectors: newConnectors });
    }, [onChange]);

    // Update if initialData changes externally (e.g. user opens a different tab/file)
    useEffect(() => {
        if (isLocalUpdateRef.current) {
            isLocalUpdateRef.current = false;
            return;
        }
        if (initialData?.nodes && initialData.nodes !== nodes) {
            setNodes(initialData.nodes);
        }
        if (initialData?.connectors && initialData.connectors !== connectors) {
            setConnectors(initialData.connectors);
        }
    }, [initialData]);

    // Helper: calculate absolute coordinates of a node's hook port
    const getPortCoordinates = (node, port) => {
        const { x, y, width: w, height: h, type } = node;
        switch (port) {
            case 'top':
                return { x: x + w / 2, y };
            case 'right':
                return { x: x + (type === 'io' ? w - 9 : w), y: y + h / 2 };
            case 'bottom':
                return { x: x + w / 2, y: y + h };
            case 'left':
                return { x: x + (type === 'io' ? 9 : 0), y: y + h / 2 };
            default:
                return { x: x + w / 2, y: y + h / 2 };
        }
    };

    // Calculate best automatic port between two nodes if not explicitly specified
    const getBestPorts = (fromNode, toNode) => {
        const fCenterX = fromNode.x + fromNode.width / 2;
        const fCenterY = fromNode.y + fromNode.height / 2;
        const tCenterX = toNode.x + toNode.width / 2;
        const tCenterY = toNode.y + toNode.height / 2;

        const dx = tCenterX - fCenterX;
        const dy = tCenterY - fCenterY;

        if (Math.abs(dy) >= Math.abs(dx)) {
            // Primarily vertical
            if (dy > 0) {
                return { fromPort: 'bottom', toPort: 'top' };
            } else {
                return { fromPort: 'top', toPort: 'bottom' };
            }
        } else {
            // Primarily horizontal
            if (dx > 0) {
                return { fromPort: 'right', toPort: 'left' };
            } else {
                return { fromPort: 'left', toPort: 'right' };
            }
        }
    };

    // Get connector path and middle pill position using smooth whiteboard-style cubic Bézier curves
    const getConnectorPathData = (conn) => {
        const fromNode = nodes.find((n) => n.id === conn.from);
        const toNode = nodes.find((n) => n.id === conn.to);
        if (!fromNode || !toNode) return null;

        const autoPorts = getBestPorts(fromNode, toNode);
        const fromPort = conn.fromPort || autoPorts.fromPort;
        const toPort = conn.toPort || autoPorts.toPort;

        const start = getPortCoordinates(fromNode, fromPort);
        const end = getPortCoordinates(toNode, toPort);

        // Compute control points extending along the port normal
        const normalOffsets = {
            top: { x: 0, y: -1 },
            bottom: { x: 0, y: 1 },
            left: { x: -1, y: 0 },
            right: { x: 1, y: 0 }
        };

        const n1 = normalOffsets[fromPort] || { x: 0, y: 1 };
        const n2 = normalOffsets[toPort] || { x: 0, y: -1 };

        const dist = Math.max(35, Math.hypot(end.x - start.x, end.y - start.y) * 0.35);

        const cp1 = { x: start.x + n1.x * dist, y: start.y + n1.y * dist };
        const cp2 = { x: end.x + n2.x * dist, y: end.y + n2.y * dist };

        const pathD = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;

        // Midpoint at cubic curve t = 0.5
        const midX = 0.125 * start.x + 0.375 * cp1.x + 0.375 * cp2.x + 0.125 * end.x;
        const midY = 0.125 * start.y + 0.375 * cp1.y + 0.375 * cp2.y + 0.125 * end.y;

        return { start, end, cp1, cp2, pathD, midX, midY, fromPort, toPort };
    };

    // Cascading Delete: Deleting a shape automatically deletes all connected connectors
    const deleteNode = useCallback((nodeId) => {
        if (readOnly) return;
        setNodes((prevNodes) => {
            const nextNodes = prevNodes.filter((n) => n.id !== nodeId);
            setConnectors((prevConns) => {
                const nextConns = prevConns.filter((c) => c.from !== nodeId && c.to !== nodeId);
                notifyChange(nextNodes, nextConns);
                return nextConns;
            });
            return nextNodes;
        });
        if (selectedNodeId === nodeId) setSelectedNodeId(null);
        toast.success('Shape and attached connectors deleted');
    }, [readOnly, selectedNodeId, notifyChange]);

    const deleteConnector = useCallback((connId) => {
        if (readOnly) return;
        setConnectors((prevConns) => {
            const nextConns = prevConns.filter((c) => c.id !== connId);
            notifyChange(nodes, nextConns);
            return nextConns;
        });
        if (selectedConnectorId === connId) setSelectedConnectorId(null);
        toast.success('Connector deleted');
    }, [readOnly, selectedConnectorId, nodes, notifyChange]);

    // Keyboard Shortcuts: Cut, Copy, Paste, Delete / Backspace
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if active element is a text input, textarea, or currently editing text
            const activeElem = document.activeElement;
            const isTyping = activeElem && (activeElem.tagName === 'INPUT' || activeElem.tagName === 'TEXTAREA');
            if (isTyping || editingNodeId || editingConnectorId) {
                return;
            }

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isCtrl = isMac ? e.metaKey : e.ctrlKey;

            // Delete / Backspace
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedNodeId) {
                    e.preventDefault();
                    deleteNode(selectedNodeId);
                } else if (selectedConnectorId) {
                    e.preventDefault();
                    deleteConnector(selectedConnectorId);
                }
            }

            // Copy: Ctrl+C / Cmd+C
            if (isCtrl && (e.key === 'c' || e.key === 'C')) {
                if (selectedNodeId) {
                    const node = nodes.find((n) => n.id === selectedNodeId);
                    if (node) {
                        clipboardRef.current = { ...node };
                        toast.success('Copied shape to clipboard', { icon: '📋' });
                    }
                }
            }

            // Cut: Ctrl+X / Cmd+X
            if (isCtrl && (e.key === 'x' || e.key === 'X')) {
                if (selectedNodeId && !readOnly) {
                    const node = nodes.find((n) => n.id === selectedNodeId);
                    if (node) {
                        clipboardRef.current = { ...node };
                        deleteNode(selectedNodeId);
                        toast.success('Cut shape to clipboard', { icon: '✂️' });
                    }
                }
            }

            // Paste: Ctrl+V / Cmd+V
            if (isCtrl && (e.key === 'v' || e.key === 'V')) {
                if (clipboardRef.current && !readOnly) {
                    const randId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                    const pastedNode = {
                        ...clipboardRef.current,
                        id: randId,
                        x: clipboardRef.current.x + 35,
                        y: clipboardRef.current.y + 35
                    };
                    setNodes((prev) => {
                        const next = [...prev, pastedNode];
                        notifyChange(next, connectors);
                        return next;
                    });
                    setSelectedNodeId(randId);
                    clipboardRef.current = pastedNode; // Offset consecutive pastes
                    toast.success('Pasted shape', { icon: '📄' });
                }
            }

            // Escape: Cancel selection or connection
            if (e.key === 'Escape') {
                setSelectedNodeId(null);
                setSelectedConnectorId(null);
                setConnectingSource(null);
                setConnectingMousePos(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        nodes,
        connectors,
        selectedNodeId,
        selectedConnectorId,
        editingNodeId,
        editingConnectorId,
        readOnly,
        deleteNode,
        deleteConnector,
        notifyChange
    ]);

    // Handle adding a new shape
    const handleAddShape = (type) => {
        if (readOnly) return;
        const randId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        // Center on current pan
        const centerX = Math.max(50, Math.round((-pan.x + 220) / zoom));
        const centerY = Math.max(50, Math.round((-pan.y + 160) / zoom));

        let width = 160;
        let height = 54;
        let text = 'Process';
        let color = '#f8fafc';
        let borderColor = '#475569';
        let textColor = '#0f172a';

        if (type === 'terminator') {
            width = 140;
            height = 52;
            text = 'Start / End';
            color = '#dcfce7';
            borderColor = '#16a34a';
            textColor = '#14532d';
        } else if (type === 'io') {
            width = 170;
            height = 54;
            text = 'Input / Output';
            color = '#dbeafe';
            borderColor = '#2563eb';
            textColor = '#1e3a8a';
        } else if (type === 'decision') {
            width = 150;
            height = 72;
            text = 'Condition?';
            color = '#fef3c7';
            borderColor = '#d97706';
            textColor = '#78350f';
        } else if (type === 'loop') {
            width = 160;
            height = 58;
            text = 'Loop Header';
            color = '#f3e8ff';
            borderColor = '#9333ea';
            textColor = '#581c87';
        } else if (type === 'connector') {
            width = 50;
            height = 50;
            text = 'A';
            color = '#f1f5f9';
            borderColor = '#64748b';
            textColor = '#334155';
        }

        const newNode = {
            id: randId,
            type,
            text,
            x: centerX,
            y: centerY,
            width,
            height,
            color,
            borderColor,
            textColor
        };

        const nextNodes = [...nodes, newNode];
        setNodes(nextNodes);
        setSelectedNodeId(randId);
        notifyChange(nextNodes, connectors);
        toast.success(`Placed ${type.toUpperCase()} shape`);
    };

    // Node pointer down (start drag or start connecting)
    const handleNodePointerDown = (e, node) => {
        if (readOnly) return;
        e.stopPropagation();

        if (activeTool === 'connector') {
            if (!connectingSource) {
                setConnectingSource({ nodeId: node.id, port: 'bottom' });
            } else if (connectingSource.nodeId !== node.id) {
                completeConnection(node.id, 'top');
            }
            return;
        }

        setSelectedNodeId(node.id);
        setSelectedConnectorId(null);
        setDraggingNodeId(node.id);
        setDragOffset({
            x: e.clientX / zoom - node.x,
            y: e.clientY / zoom - node.y
        });
    };

    // Hook Port pointer down (start connection from a specific cardinal hook)
    const handlePortPointerDown = (e, nodeId, port) => {
        if (readOnly) return;
        e.stopPropagation();
        setConnectingSource({ nodeId, port });
        const fromNode = nodes.find((n) => n.id === nodeId);
        if (fromNode) {
            const pt = getPortCoordinates(fromNode, port);
            setConnectingMousePos(pt);
        }
    };

    // Complete connection to a target node & port
    const completeConnection = (targetNodeId, targetPort = 'top') => {
        if (!connectingSource || connectingSource.nodeId === targetNodeId) {
            setConnectingSource(null);
            setConnectingMousePos(null);
            return;
        }

        const sourceNode = nodes.find((n) => n.id === connectingSource.nodeId);
        const isDecision = sourceNode?.type === 'decision';
        const existingCount = connectors.filter((c) => c.from === connectingSource.nodeId).length;
        const defaultLabel = isDecision ? (existingCount === 0 ? 'Yes' : 'No') : '';

        const newConn = {
            id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            from: connectingSource.nodeId,
            fromPort: connectingSource.port,
            to: targetNodeId,
            toPort: targetPort,
            label: defaultLabel
        };

        const nextConns = [...connectors, newConn];
        setConnectors(nextConns);
        setConnectingSource(null);
        setConnectingMousePos(null);
        if (activeTool === 'connector') setActiveTool('select');
        notifyChange(nodes, nextConns);
        toast.success('Connected shapes with directed arrow!', { icon: '🔗' });
    };

    // Canvas pointer move (Dragging node, panning, or drawing connector preview)
    const handleCanvasPointerMove = (e) => {
        if (connectingSource) {
            // Update live cursor coordinates in canvas space
            const mouseCanvasX = (e.clientX - pan.x) / zoom;
            const mouseCanvasY = (e.clientY - pan.y) / zoom;
            setConnectingMousePos({ x: mouseCanvasX, y: mouseCanvasY });
            return;
        }

        if (draggingNodeId) {
            const newX = Math.round(e.clientX / zoom - dragOffset.x);
            const newY = Math.round(e.clientY / zoom - dragOffset.y);
            setNodes((prev) =>
                prev.map((n) => (n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n))
            );
        } else if (isPanning) {
            setPan({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            });
        }
    };

    const handleCanvasPointerUp = () => {
        if (draggingNodeId) {
            setDraggingNodeId(null);
            notifyChange(nodes, connectors);
        }
        if (isPanning) {
            setIsPanning(false);
        }
        if (connectingSource && activeTool !== 'connector') {
            // Cancel unfinished drag-connection if dropped on empty canvas
            setConnectingSource(null);
            setConnectingMousePos(null);
        }
    };

    const handleCanvasPointerDown = (e) => {
        // Only trigger canvas click / pan if clicking directly on background
        const target = e.target;
        if (target.tagName === 'svg' || target.id === 'canvas-bg' || target.id === 'flowchart-svg-canvas') {
            setSelectedNodeId(null);
            setSelectedConnectorId(null);
            setConnectingSource(null);
            setConnectingMousePos(null);
            setIsPanning(true);
            setPanStart({
                x: e.clientX - pan.x,
                y: e.clientY - pan.y
            });
        }
    };

    // Double-click shape to edit text inline (flicker-free)
    const handleNodeDoubleClick = (e, node) => {
        e.stopPropagation();
        if (readOnly) return;
        setEditingNodeId(node.id);
        setEditingNodeText(node.text);
    };

    const handleSaveNodeText = () => {
        if (!editingNodeId) return;
        const nextNodes = nodes.map((n) =>
            n.id === editingNodeId ? { ...n, text: editingNodeText } : n
        );
        setNodes(nextNodes);
        setEditingNodeId(null);
        notifyChange(nextNodes, connectors);
    };

    // Double-click connector pill to edit label (flicker-free)
    const handleConnectorPillDoubleClick = (e, conn) => {
        e.stopPropagation();
        if (readOnly) return;
        setEditingConnectorId(conn.id);
        setEditingConnectorLabel(conn.label || '');
    };

    const handleSaveConnectorLabel = () => {
        if (!editingConnectorId) return;
        const nextConns = connectors.map((c) =>
            c.id === editingConnectorId ? { ...c, label: editingConnectorLabel } : c
        );
        setConnectors(nextConns);
        setEditingConnectorId(null);
        notifyChange(nodes, nextConns);
    };

    // Clear entire canvas
    const handleClearCanvas = () => {
        if (readOnly) return;
        if (confirm('Clear all shapes and connectors from the flowchart canvas?')) {
            setNodes([]);
            setConnectors([]);
            setSelectedNodeId(null);
            setSelectedConnectorId(null);
            notifyChange([], []);
            toast.success('Canvas cleared');
        }
    };

    // Export Canvas to PNG or SVG
    const handleExportCanvas = (format = 'svg') => {
        if (!svgRef.current) return;
        const svgElement = svgRef.current;
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);

        if (format === 'svg') {
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flowchart_${Date.now()}.svg`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Downloaded SVG flowchart!');
        } else {
            const img = new Image();
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 1200;
                canvas.height = 900;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#020617';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const pngUrl = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = pngUrl;
                a.download = `flowchart_${Date.now()}.png`;
                a.click();
                toast.success('Downloaded PNG flowchart!');
            };
        }
    };

    // Render node path/geometry based on conventional flowchart shapes
    const renderShapeGeometry = (node, isSelected, isConnectingSource) => {
        const { x, y, width: w, height: h, type, color, borderColor } = node;
        const strokeColor = isConnectingSource
            ? '#38bdf8'
            : isSelected
            ? '#a855f7'
            : borderColor;
        const strokeWidth = isSelected || isConnectingSource ? 3 : 2;

        if (type === 'terminator') {
            return (
                <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={h / 2}
                    ry={h / 2}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="cursor-move filter drop-shadow-sm transition-all"
                />
            );
        } else if (type === 'io') {
            const skew = 18;
            const points = `${x + skew},${y} ${x + w},${y} ${x + w - skew},${y + h} ${x},${y + h}`;
            return (
                <polygon
                    points={points}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="cursor-move filter drop-shadow-sm transition-all"
                />
            );
        } else if (type === 'decision') {
            const points = `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
            return (
                <polygon
                    points={points}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="cursor-move filter drop-shadow-sm transition-all"
                />
            );
        } else if (type === 'loop') {
            const inset = 16;
            const points = `${x + inset},${y} ${x + w - inset},${y} ${x + w},${y + h / 2} ${x + w - inset},${y + h} ${x + inset},${y + h} ${x},${y + h / 2}`;
            return (
                <polygon
                    points={points}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="cursor-move filter drop-shadow-sm transition-all"
                />
            );
        } else if (type === 'connector') {
            return (
                <circle
                    cx={x + w / 2}
                    cy={y + h / 2}
                    r={Math.min(w, h) / 2}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="cursor-move filter drop-shadow-sm transition-all"
                />
            );
        } else {
            return (
                <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={6}
                    ry={6}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="cursor-move filter drop-shadow-sm transition-all"
                />
            );
        }
    };

    return (
        <div
            ref={containerRef}
            className="flex flex-col h-full w-full bg-slate-950 text-slate-100 select-none overflow-hidden relative"
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
        >
            {/* Top Canvas Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800 flex-shrink-0 z-20">
                {/* Left: Pointer vs Connector Tool and Shapes */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                    <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                        <button
                            onClick={() => {
                                setActiveTool('select');
                                setConnectingSource(null);
                                setConnectingMousePos(null);
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                                activeTool === 'select'
                                    ? 'bg-primary-600 text-white shadow-xs'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                            title="Pointer / Select Tool (V)"
                        >
                            <MousePointer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Select</span>
                        </button>

                        <button
                            onClick={() => {
                                setActiveTool('connector');
                                setSelectedNodeId(null);
                                setSelectedConnectorId(null);
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                                activeTool === 'connector'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                            title="Connector Tool: Click shape hooks to link with directed arrows"
                        >
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span>Connector Tool</span>
                        </button>
                    </div>

                    <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

                    {/* Shape Tool Buttons */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleAddShape('terminator')}
                            className="px-2 py-1 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                            title="Add Start/End Oval Terminator"
                        >
                            <span className="w-2.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                            <span>Oval</span>
                        </button>

                        <button
                            onClick={() => handleAddShape('io')}
                            className="px-2 py-1 rounded bg-blue-950/80 border border-blue-500/50 text-blue-300 hover:bg-blue-900 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                            title="Add Input/Output Parallelogram"
                        >
                            <span className="w-2.5 h-2 bg-blue-400 skew-x-12 inline-block" />
                            <span>Parallelogram</span>
                        </button>

                        <button
                            onClick={() => handleAddShape('process')}
                            className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                            title="Add Calculation/Assignment Rectangle"
                        >
                            <span className="w-2.5 h-2 bg-slate-300 rounded-2xs inline-block" />
                            <span>Rectangle</span>
                        </button>

                        <button
                            onClick={() => handleAddShape('decision')}
                            className="px-2 py-1 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 hover:bg-amber-900 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                            title="Add Decision Diamond"
                        >
                            <span className="w-2 h-2 bg-amber-400 rotate-45 inline-block" />
                            <span>Diamond</span>
                        </button>

                        <button
                            onClick={() => handleAddShape('loop')}
                            className="px-2 py-1 rounded bg-purple-950/80 border border-purple-500/50 text-purple-300 hover:bg-purple-900 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                            title="Add Loop Iteration Hexagon"
                        >
                            <span>Hexagon</span>
                        </button>
                    </div>
                </div>

                {/* Right: Actions, Delete, Zoom, Export */}
                <div className="flex items-center gap-1.5 text-xs">
                    {/* Delete Selected */}
                    {(selectedNodeId || selectedConnectorId) && (
                        <button
                            onClick={() => {
                                if (selectedNodeId) deleteNode(selectedNodeId);
                                else if (selectedConnectorId) deleteConnector(selectedConnectorId);
                            }}
                            className="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 rounded font-medium flex items-center gap-1 transition"
                            title="Delete Selected (Del / Backspace)"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Delete</span>
                        </button>
                    )}

                    {/* Zoom controls */}
                    <div className="flex items-center bg-slate-800 rounded border border-slate-700">
                        <button
                            onClick={() => setZoom(Math.max(0.4, zoom - 0.15))}
                            className="p-1 hover:text-white text-slate-400"
                            title="Zoom Out"
                        >
                            <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-1.5 text-[11px] font-mono text-slate-300">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button
                            onClick={() => setZoom(Math.min(2.5, zoom + 0.15))}
                            className="p-1 hover:text-white text-slate-400"
                            title="Zoom In"
                        >
                            <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            setZoom(1);
                            setPan({ x: 0, y: 0 });
                        }}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition"
                        title="Reset Canvas View"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    {/* Export Dropdown */}
                    <button
                        onClick={() => handleExportCanvas('png')}
                        className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded font-bold shadow-xs flex items-center gap-1 transition cursor-pointer"
                        title="Download Flowchart as PNG Image"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export PNG</span>
                    </button>

                    <button
                        onClick={handleClearCanvas}
                        className="p-1 text-slate-500 hover:text-rose-400 transition"
                        title="Clear Canvas"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Instruction Banner when Connector Mode is Active */}
            {activeTool === 'connector' && (
                <div className="bg-purple-950/80 border-b border-purple-800 px-3 py-1 text-xs text-purple-200 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                        <span>
                            {connectingSource
                                ? 'Hook selected! Click any hook dot on another shape to connect.'
                                : 'Whiteboard Connector Mode: Hover over shapes and click any hook dot (top, right, bottom, left) to connect.'}
                        </span>
                    </div>
                    <button
                        onClick={() => {
                            setActiveTool('select');
                            setConnectingSource(null);
                            setConnectingMousePos(null);
                        }}
                        className="text-[11px] underline text-purple-300 hover:text-white"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Canvas Main SVG Layer */}
            <div
                className="flex-1 w-full h-full relative overflow-hidden cursor-default"
                onPointerDown={handleCanvasPointerDown}
            >
                <svg
                    ref={svgRef}
                    id="flowchart-svg-canvas"
                    className="w-full h-full absolute inset-0"
                    style={{
                        backgroundImage: `radial-gradient(#334155 1px, transparent 1px)`,
                        backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                        backgroundPosition: `${pan.x}px ${pan.y}px`
                    }}
                >
                    {/* Definitions for Markers and Styles */}
                    <defs>
                        <marker
                            id="flowchart-arrowhead"
                            viewBox="0 0 10 10"
                            refX="8"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#6366f1" />
                        </marker>
                        <marker
                            id="flowchart-arrowhead-selected"
                            viewBox="0 0 10 10"
                            refX="8"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#a855f7" />
                        </marker>
                    </defs>

                    {/* Master Zoom and Pan Group */}
                    <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                        {/* 1. CONNECTORS LAYER (Curved Directed Arrows & Midpoint Labeled Pills) */}
                        {connectors.map((conn) => {
                            const data = getConnectorPathData(conn);
                            if (!data) return null;
                            const isSelected = selectedConnectorId === conn.id;

                            return (
                                <g
                                    key={conn.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedConnectorId(conn.id);
                                        setSelectedNodeId(null);
                                    }}
                                    className="cursor-pointer group"
                                >
                                    {/* Transparent hit target for easy clicking */}
                                    <path
                                        d={data.pathD}
                                        fill="none"
                                        stroke="transparent"
                                        strokeWidth={16}
                                    />

                                    {/* Directed Arrow Path */}
                                    <path
                                        d={data.pathD}
                                        fill="none"
                                        stroke={isSelected ? '#a855f7' : '#6366f1'}
                                        strokeWidth={isSelected ? 3 : 2}
                                        strokeDasharray={isSelected ? '6,3' : 'none'}
                                        markerEnd={
                                            isSelected
                                                ? 'url(#flowchart-arrowhead-selected)'
                                                : 'url(#flowchart-arrowhead)'
                                        }
                                        className="transition-colors group-hover:stroke-purple-400"
                                    />

                                    {/* Midpoint Pill-Shaped Label */}
                                    <g
                                        transform={`translate(${data.midX}, ${data.midY})`}
                                        onDoubleClick={(e) => handleConnectorPillDoubleClick(e, conn)}
                                        className="cursor-pointer"
                                    >
                                        <rect
                                            x={-28}
                                            y={-12}
                                            width={56}
                                            height={24}
                                            rx={12}
                                            ry={12}
                                            fill="#0f172a"
                                            stroke={isSelected ? '#a855f7' : '#475569'}
                                            strokeWidth={1.5}
                                            className="transition-all hover:stroke-purple-400 hover:fill-slate-900 drop-shadow-md"
                                        />
                                        <text
                                            x={0}
                                            y={4}
                                            textAnchor="middle"
                                            fill="#e2e8f0"
                                            fontSize={11}
                                            fontWeight="bold"
                                            fontFamily="system-ui, sans-serif"
                                            className="select-none pointer-events-none"
                                        >
                                            {conn.label || (editingConnectorId === conn.id ? '' : 'Next')}
                                        </text>
                                    </g>
                                </g>
                            );
                        })}

                        {/* Live Elastic Connector Line when user is dragging from a port */}
                        {connectingSource && connectingMousePos && (() => {
                            const fromNode = nodes.find((n) => n.id === connectingSource.nodeId);
                            if (!fromNode) return null;
                            const start = getPortCoordinates(fromNode, connectingSource.port);
                            const end = connectingMousePos;
                            const pathD = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;

                            return (
                                <g className="pointer-events-none">
                                    <path
                                        d={pathD}
                                        fill="none"
                                        stroke="#38bdf8"
                                        strokeWidth={2}
                                        strokeDasharray="5,5"
                                        markerEnd="url(#flowchart-arrowhead)"
                                    />
                                    <circle cx={end.x} cy={end.y} r={4} fill="#38bdf8" />
                                </g>
                            );
                        })()}

                        {/* 2. SHAPES LAYER (Nodes + Cardinal Hooks) */}
                        {nodes.map((node) => {
                            const isSelected = selectedNodeId === node.id;
                            const isConnectingSource = connectingSource?.nodeId === node.id;
                            const isHovered = hoveredNodeId === node.id;
                            const showHooks = !readOnly && (isHovered || isSelected || activeTool === 'connector' || Boolean(connectingSource));

                            return (
                                <g
                                    key={node.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (connectingSource && connectingSource.nodeId !== node.id) {
                                            completeConnection(node.id, 'top');
                                            return;
                                        }
                                        setSelectedNodeId(node.id);
                                        setSelectedConnectorId(null);
                                    }}
                                    onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
                                    onPointerDown={(e) => handleNodePointerDown(e, node)}
                                    onMouseEnter={() => setHoveredNodeId(node.id)}
                                    onMouseLeave={() => setHoveredNodeId(null)}
                                    className="cursor-move group"
                                >
                                    {/* SVG Geometry */}
                                    {renderShapeGeometry(node, isSelected, isConnectingSource)}

                                    {/* In-Shape Text Rendering */}
                                    {editingNodeId !== node.id && (
                                        <text
                                            x={node.x + node.width / 2}
                                            y={node.y + node.height / 2 + 4}
                                            textAnchor="middle"
                                            fill={node.textColor}
                                            fontSize={13}
                                            fontWeight={node.type === 'terminator' ? 'bold' : '600'}
                                            fontFamily="'JetBrains Mono', system-ui, sans-serif"
                                            className="pointer-events-none select-none"
                                        >
                                            {node.text}
                                        </text>
                                    )}

                                    {/* 4 CARDINAL HOOK PORTS (Whiteboard Style Anchor Points) */}
                                    {showHooks &&
                                        PORTS.map((port) => {
                                            const { x: px, y: py } = getPortCoordinates(node, port);
                                            const isThisHookActive = connectingSource?.nodeId === node.id && connectingSource?.port === port;

                                            return (
                                                <g
                                                    key={port}
                                                    onPointerDown={(e) => handlePortPointerDown(e, node.id, port)}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (connectingSource && connectingSource.nodeId !== node.id) {
                                                            completeConnection(node.id, port);
                                                        }
                                                    }}
                                                    className="cursor-crosshair group/port"
                                                >
                                                    {/* Invisible large hit area */}
                                                    <circle
                                                        cx={px}
                                                        cy={py}
                                                        r={12}
                                                        fill="transparent"
                                                    />
                                                    {/* Visible hook circle */}
                                                    <circle
                                                        cx={px}
                                                        cy={py}
                                                        r={isThisHookActive ? 6 : 4.5}
                                                        fill={isThisHookActive ? '#38bdf8' : '#ffffff'}
                                                        stroke={isThisHookActive ? '#0284c7' : '#6366f1'}
                                                        strokeWidth={2}
                                                        className="transition-transform group-hover/port:scale-125 filter drop-shadow-sm"
                                                    />
                                                </g>
                                            );
                                        })}
                                </g>
                            );
                        })}
                    </g>
                </svg>

                {/* 3. FLICKER-FREE HTML OVERLAY FOR DIRECT IN-PLACE TEXT EDITING */}
                {/* Node Text Inline Editor */}
                {editingNodeId && (() => {
                    const node = nodes.find((n) => n.id === editingNodeId);
                    if (!node) return null;

                    const screenX = pan.x + node.x * zoom;
                    const screenY = pan.y + node.y * zoom;
                    const screenW = node.width * zoom;
                    const screenH = node.height * zoom;

                    return (
                        <div
                            style={{
                                position: 'absolute',
                                left: `${screenX}px`,
                                top: `${screenY}px`,
                                width: `${screenW}px`,
                                height: `${screenH}px`,
                                pointerEvents: 'auto'
                            }}
                            className="flex items-center justify-center p-1 z-30"
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <input
                                autoFocus
                                type="text"
                                value={editingNodeText}
                                onChange={(e) => setEditingNodeText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveNodeText();
                                    if (e.key === 'Escape') setEditingNodeId(null);
                                }}
                                onBlur={handleSaveNodeText}
                                className="w-full text-center px-1 py-1 bg-slate-900 border-2 border-purple-500 rounded text-xs font-bold text-white focus:outline-none shadow-2xl ring-2 ring-purple-500/30"
                            />
                        </div>
                    );
                })()}

                {/* Connector Pill Label Inline Editor */}
                {editingConnectorId && (() => {
                    const conn = connectors.find((c) => c.id === editingConnectorId);
                    if (!conn) return null;
                    const data = getConnectorPathData(conn);
                    if (!data) return null;

                    const screenX = pan.x + data.midX * zoom - 35;
                    const screenY = pan.y + data.midY * zoom - 15;

                    return (
                        <div
                            style={{
                                position: 'absolute',
                                left: `${screenX}px`,
                                top: `${screenY}px`,
                                width: '70px',
                                height: '30px',
                                pointerEvents: 'auto'
                            }}
                            className="z-30 flex items-center justify-center"
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <input
                                autoFocus
                                type="text"
                                value={editingConnectorLabel}
                                onChange={(e) => setEditingConnectorLabel(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveConnectorLabel();
                                    if (e.key === 'Escape') setEditingConnectorId(null);
                                }}
                                onBlur={handleSaveConnectorLabel}
                                placeholder="Yes / No"
                                className="w-full text-center px-1 py-0.5 bg-slate-900 border-2 border-purple-500 rounded-full text-xs font-bold text-white focus:outline-none shadow-2xl ring-2 ring-purple-500/30"
                            />
                        </div>
                    );
                })()}
            </div>

            {/* Bottom Status / Keyboard Shortcuts Tip Bar */}
            <div className="px-3 py-1.5 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between z-10 flex-shrink-0">
                <span className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                    <span>
                        <strong className="text-slate-300">Whiteboard hooks:</strong> Click hook dots to connect • <strong className="text-slate-300">Shortcuts:</strong> Ctrl+C copy, Ctrl+X cut, Ctrl+V paste, Del delete (cascades to connectors) • Double-click to edit text
                    </span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                    {nodes.length} shapes • {connectors.length} connectors
                </span>
            </div>
        </div>
    );
}
