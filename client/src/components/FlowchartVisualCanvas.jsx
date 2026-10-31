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
    Info
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
        width: 130,
        height: 50,
        color: '#dcfce7',
        borderColor: '#16a34a',
        textColor: '#14532d'
    },
    {
        id: 'node_input',
        type: 'io',
        text: 'Input n',
        x: 165,
        y: 130,
        width: 160,
        height: 54,
        color: '#dbeafe',
        borderColor: '#2563eb',
        textColor: '#1e3a8a'
    },
    {
        id: 'node_decision',
        type: 'decision',
        text: 'n > 0?',
        x: 170,
        y: 225,
        width: 150,
        height: 70,
        color: '#fef3c7',
        borderColor: '#d97706',
        textColor: '#78350f'
    },
    {
        id: 'node_process',
        type: 'process',
        text: 'total = n * 2',
        x: 165,
        y: 340,
        width: 160,
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
        y: 440,
        width: 130,
        height: 50,
        color: '#dcfce7',
        borderColor: '#16a34a',
        textColor: '#14532d'
    }
];

const DEFAULT_INITIAL_CONNECTORS = [
    { id: 'conn_1', from: 'node_start', to: 'node_input', label: '' },
    { id: 'conn_2', from: 'node_input', to: 'node_decision', label: '' },
    { id: 'conn_3', from: 'node_decision', to: 'node_process', label: 'Yes' },
    { id: 'conn_4', from: 'node_process', to: 'node_end', label: '' }
];

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
    const [connectorSourceId, setConnectorSourceId] = useState(null);

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

    const svgRef = useRef(null);
    const containerRef = useRef(null);

    // Sync state changes with parent
    useEffect(() => {
        if (onChange) {
            onChange({ nodes, connectors });
        }
    }, [nodes, connectors, onChange]);

    // Update if initialData changes externally (e.g. tab switch)
    useEffect(() => {
        if (initialData?.nodes) setNodes(initialData.nodes);
        if (initialData?.connectors) setConnectors(initialData.connectors);
    }, [initialData]);

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
            width = 130;
            height = 50;
            text = 'Start / End';
            color = '#dcfce7';
            borderColor = '#16a34a';
            textColor = '#14532d';
        } else if (type === 'io') {
            width = 160;
            height = 54;
            text = 'Input / Output';
            color = '#dbeafe';
            borderColor = '#2563eb';
            textColor = '#1e3a8a';
        } else if (type === 'decision') {
            width = 150;
            height = 70;
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

        setNodes((prev) => [...prev, newNode]);
        setSelectedNodeId(randId);
        toast.success(`Placed ${type.toUpperCase()} shape`);
    };

    // Node click handler
    const handleNodeClick = (e, nodeId) => {
        e.stopPropagation();

        if (activeTool === 'connector') {
            if (!connectorSourceId) {
                setConnectorSourceId(nodeId);
                toast('Selected source node. Now click target node to connect.', {
                    icon: '🎯'
                });
            } else if (connectorSourceId === nodeId) {
                setConnectorSourceId(null);
            } else {
                // Create connection
                const sourceNode = nodes.find((n) => n.id === connectorSourceId);
                const isDecision = sourceNode?.type === 'decision';

                // Check existing connectors from this decision
                const existingBranchCount = connectors.filter((c) => c.from === connectorSourceId).length;
                const defaultLabel = isDecision ? (existingBranchCount === 0 ? 'Yes' : 'No') : '';

                const newConn = {
                    id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                    from: connectorSourceId,
                    to: nodeId,
                    label: defaultLabel
                };

                setConnectors((prev) => [...prev, newConn]);
                setConnectorSourceId(null);
                toast.success('Arrow connector created with editable pill label!');
            }
            return;
        }

        setSelectedNodeId(nodeId);
        setSelectedConnectorId(null);
    };

    // Double-click node to edit text directly
    const handleNodeDoubleClick = (e, node) => {
        e.stopPropagation();
        if (readOnly) return;
        setEditingNodeId(node.id);
        setEditingNodeText(node.text);
    };

    // Save edited node text
    const handleSaveNodeText = () => {
        if (!editingNodeId) return;
        setNodes((prev) =>
            prev.map((n) => (n.id === editingNodeId ? { ...n, text: editingNodeText } : n))
        );
        setEditingNodeId(null);
    };

    // Double-click connector pill to edit label
    const handleConnectorPillDoubleClick = (e, conn) => {
        e.stopPropagation();
        if (readOnly) return;
        setEditingConnectorId(conn.id);
        setEditingConnectorLabel(conn.label || '');
    };

    // Save edited connector pill label
    const handleSaveConnectorLabel = () => {
        if (!editingConnectorId) return;
        setConnectors((prev) =>
            prev.map((c) => (c.id === editingConnectorId ? { ...c, label: editingConnectorLabel } : c))
        );
        setEditingConnectorId(null);
    };

    // Dragging a node on pointer down
    const handleNodePointerDown = (e, node) => {
        if (readOnly || activeTool === 'connector') return;
        e.stopPropagation();
        setDraggingNodeId(node.id);
        setDragOffset({
            x: e.clientX / zoom - node.x,
            y: e.clientY / zoom - node.y
        });
    };

    // Canvas pointer move (Dragging node or Panning canvas)
    const handleCanvasPointerMove = (e) => {
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
        setDraggingNodeId(null);
        setIsPanning(false);
    };

    const handleCanvasPointerDown = (e) => {
        if (e.target.tagName === 'svg' || e.target.id === 'canvas-bg') {
            setSelectedNodeId(null);
            setSelectedConnectorId(null);
            setConnectorSourceId(null);
            setIsPanning(true);
            setPanStart({
                x: e.clientX - pan.x,
                y: e.clientY - pan.y
            });
        }
    };

    // Delete selected element
    const handleDeleteSelected = () => {
        if (readOnly) return;
        if (selectedNodeId) {
            setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
            setConnectors((prev) =>
                prev.filter((c) => c.from !== selectedNodeId && c.to !== selectedNodeId)
            );
            setSelectedNodeId(null);
            toast.success('Shape and associated connectors deleted');
        } else if (selectedConnectorId) {
            setConnectors((prev) => prev.filter((c) => c.id !== selectedConnectorId));
            setSelectedConnectorId(null);
            toast.success('Connector deleted');
        }
    };

    // Clear entire canvas
    const handleClearCanvas = () => {
        if (readOnly) return;
        if (confirm('Clear all shapes and connectors from the flowchart canvas?')) {
            setNodes([]);
            setConnectors([]);
            setSelectedNodeId(null);
            setSelectedConnectorId(null);
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
            // Render to Image / Canvas
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
    const renderShapeGeometry = (node, isSelected, isSource) => {
        const { x, y, width: w, height: h, type, color, borderColor } = node;
        const strokeColor = isSource ? '#38bdf8' : isSelected ? '#a855f7' : borderColor;
        const strokeWidth = isSelected || isSource ? 3 : 2;

        if (type === 'terminator') {
            // Oval / Rounded Pill
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
            // Parallelogram (Input / Output)
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
            // Diamond (Decision)
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
            // Hexagon (Loop)
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
            // Small circle connector
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
            // Process Rectangle (Default)
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

    // Calculate connector arrow lines and middle pill label coordinates
    const getConnectorGeometry = (conn) => {
        const fromNode = nodes.find((n) => n.id === conn.from);
        const toNode = nodes.find((n) => n.id === conn.to);
        if (!fromNode || !toNode) return null;

        // Centers
        const fCenterX = fromNode.x + fromNode.width / 2;
        const fCenterY = fromNode.y + fromNode.height / 2;
        const tCenterX = toNode.x + toNode.width / 2;
        const tCenterY = toNode.y + toNode.height / 2;

        let startX = fCenterX;
        let startY = fromNode.y + fromNode.height; // default bottom
        let endX = tCenterX;
        let endY = toNode.y; // default top

        // If target is to the right
        if (toNode.x > fromNode.x + fromNode.width) {
            startX = fromNode.x + fromNode.width;
            startY = fCenterY;
            endX = toNode.x;
            endY = tCenterY;
        } else if (toNode.x + toNode.width < fromNode.x) {
            startX = fromNode.x;
            startY = fCenterY;
            endX = toNode.x + toNode.width;
            endY = tCenterY;
        } else if (toNode.y + toNode.height < fromNode.y) {
            startY = fromNode.y;
            endY = toNode.y + toNode.height;
        }

        // Midpoint coordinates for the pill label
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;

        return { startX, startY, endX, endY, midX, midY };
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
                {/* Left: Shape Tool & Connector Tool */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                    {/* Tool Mode: Pointer vs Connector */}
                    <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                        <button
                            onClick={() => {
                                setActiveTool('select');
                                setConnectorSourceId(null);
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                                activeTool === 'select'
                                    ? 'bg-primary-600 text-white shadow-xs'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                            title="Pointer / Move Mode"
                        >
                            <MousePointer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Select</span>
                        </button>

                        <button
                            onClick={() => {
                                setActiveTool('connector');
                                setSelectedNodeId(null);
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                                activeTool === 'connector'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                            title="Connector Tool: Click shape A then shape B to link with an arrow"
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
                            onClick={handleDeleteSelected}
                            className="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 rounded font-medium flex items-center gap-1 transition"
                            title="Delete Selected"
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

            {/* Instruction banner for Connector Tool */}
            {activeTool === 'connector' && (
                <div className="bg-purple-950/80 border-b border-purple-800 px-3 py-1.5 text-xs text-purple-200 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                        <span>
                            {connectorSourceId
                                ? 'Source selected. Now click another shape to connect with an arrow!'
                                : 'Connector Tool Active: Click the starting shape to begin connection.'}
                        </span>
                    </div>
                    <button
                        onClick={() => {
                            setActiveTool('select');
                            setConnectorSourceId(null);
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
                        {/* 1. CONNECTORS LAYER (Lines and Midpoint Labeled Pills) */}
                        {connectors.map((conn) => {
                            const geom = getConnectorGeometry(conn);
                            if (!geom) return null;
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
                                    {/* Transparent hit target line for easy clicking */}
                                    <line
                                        x1={geom.startX}
                                        y1={geom.startY}
                                        x2={geom.endX}
                                        y2={geom.endY}
                                        stroke="transparent"
                                        strokeWidth={14}
                                    />

                                    {/* Directed Arrow Line */}
                                    <line
                                        x1={geom.startX}
                                        y1={geom.startY}
                                        x2={geom.endX}
                                        y2={geom.endY}
                                        stroke={isSelected ? '#a855f7' : '#6366f1'}
                                        strokeWidth={isSelected ? 3 : 2}
                                        markerEnd={
                                            isSelected
                                                ? 'url(#flowchart-arrowhead-selected)'
                                                : 'url(#flowchart-arrowhead)'
                                        }
                                        className="transition-colors group-hover:stroke-purple-400"
                                    />

                                    {/* EDITABLE PILL-SHAPED LABEL AT MIDDLE */}
                                    <g
                                        transform={`translate(${geom.midX}, ${geom.midY})`}
                                        onDoubleClick={(e) => handleConnectorPillDoubleClick(e, conn)}
                                        className="cursor-pointer"
                                    >
                                        {/* Pill background */}
                                        <rect
                                            x={-30}
                                            y={-12}
                                            width={60}
                                            height={24}
                                            rx={12}
                                            ry={12}
                                            fill="#0f172a"
                                            stroke={isSelected ? '#a855f7' : '#475569'}
                                            strokeWidth={1.5}
                                            className="transition-all hover:stroke-purple-400 hover:fill-slate-900"
                                        />

                                        {/* Pill text */}
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

                        {/* 2. SHAPES LAYER (Conventional Flowchart Nodes) */}
                        {nodes.map((node) => {
                            const isSelected = selectedNodeId === node.id;
                            const isSource = connectorSourceId === node.id;

                            return (
                                <g
                                    key={node.id}
                                    onClick={(e) => handleNodeClick(e, node.id)}
                                    onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
                                    onPointerDown={(e) => handleNodePointerDown(e, node)}
                                    className="cursor-move group"
                                >
                                    {/* SVG Geometry */}
                                    {renderShapeGeometry(node, isSelected, isSource)}

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
                                </g>
                            );
                        })}
                    </g>
                </svg>

                {/* 3. HTML OVERLAY FOR IN-PLACE DIRECT TEXT EDITING */}
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
                                height: `${screenH}px`
                            }}
                            className="flex items-center justify-center p-1 z-30"
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
                                className="w-full text-center px-1 py-0.5 bg-slate-900 border-2 border-purple-500 rounded text-xs font-bold text-white focus:outline-none shadow-xl"
                            />
                        </div>
                    );
                })()}

                {/* Connector Pill Label Inline Editor */}
                {editingConnectorId && (() => {
                    const conn = connectors.find((c) => c.id === editingConnectorId);
                    if (!conn) return null;
                    const geom = getConnectorGeometry(conn);
                    if (!geom) return null;

                    const screenX = pan.x + geom.midX * zoom - 35;
                    const screenY = pan.y + geom.midY * zoom - 15;

                    return (
                        <div
                            style={{
                                position: 'absolute',
                                left: `${screenX}px`,
                                top: `${screenY}px`,
                                width: '70px',
                                height: '30px'
                            }}
                            className="z-30 flex items-center justify-center"
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
                                className="w-full text-center px-1 py-0.5 bg-slate-900 border-2 border-purple-500 rounded-full text-xs font-bold text-white focus:outline-none shadow-xl"
                            />
                        </div>
                    );
                })()}
            </div>

            {/* Bottom Tip Bar */}
            <div className="px-3 py-1.5 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between z-10 flex-shrink-0">
                <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-primary-400" />
                    <span>
                        Double-click any shape or connector pill to edit text in place • Drag shapes to position
                    </span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                    {nodes.length} shapes • {connectors.length} connectors
                </span>
            </div>
        </div>
    );
}
