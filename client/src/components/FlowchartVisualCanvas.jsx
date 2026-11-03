'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    Shapes,
    MousePointer,
    Hand,
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
    Clipboard,
    Sun,
    Moon,
    Database,
    Key,
    Sparkles,
    Table,
    Layers,
    Code,
    CheckCircle2,
    Cpu,
    FileCode2,
    X,
    AlertTriangle,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateFlowchartFromCode, generateErDiagramFromSql, generateRelationalErDiagramFromSql } from '@/lib/traditionalGenerators';

// 1. Initial Starter Flowchart Nodes & Connectors (For Python / C / C++ / Java Flow)
const DEFAULT_INITIAL_FLOWCHART_NODES = [
    {
        id: 'node_start',
        type: 'terminator',
        text: 'Start',
        x: 170,
        y: 40,
        width: 140,
        height: 50,
        color: '#dcfce7',
        borderColor: '#16a34a',
        textColor: '#14532d'
    },
    {
        id: 'node_input',
        type: 'io',
        text: 'Input n',
        x: 155,
        y: 125,
        width: 170,
        height: 52,
        color: '#dbeafe',
        borderColor: '#2563eb',
        textColor: '#1e3a8a'
    },
    {
        id: 'node_init',
        type: 'process',
        text: 'total_sum = 0\nfactorial = 1\ni = 1',
        x: 150,
        y: 215,
        width: 180,
        height: 72,
        color: '#ffffff',
        borderColor: '#64748b',
        textColor: '#0f172a'
    },
    {
        id: 'node_decision',
        type: 'decision',
        text: 'i <= n ?',
        x: 160,
        y: 325,
        width: 160,
        height: 72,
        color: '#fef3c7',
        borderColor: '#d97706',
        textColor: '#78350f'
    },
    {
        id: 'node_loop_body',
        type: 'process',
        text: 'total_sum = total_sum + i\nfactorial = factorial * i\ni = i + 1',
        x: 150,
        y: 440,
        width: 180,
        height: 72,
        color: '#ffffff',
        borderColor: '#64748b',
        textColor: '#0f172a'
    },
    {
        id: 'node_output',
        type: 'io',
        text: 'Display total_sum, factorial',
        x: 145,
        y: 560,
        width: 190,
        height: 54,
        color: '#dbeafe',
        borderColor: '#2563eb',
        textColor: '#1e3a8a'
    },
    {
        id: 'node_end',
        type: 'terminator',
        text: 'End',
        x: 170,
        y: 655,
        width: 140,
        height: 50,
        color: '#dcfce7',
        borderColor: '#16a34a',
        textColor: '#14532d'
    }
];

const DEFAULT_INITIAL_FLOWCHART_CONNECTORS = [
    { id: 'conn_1', from: 'node_start', fromPort: 'bottom', to: 'node_input', toPort: 'top', label: '' },
    { id: 'conn_2', from: 'node_input', fromPort: 'bottom', to: 'node_init', toPort: 'top', label: '' },
    { id: 'conn_3', from: 'node_init', fromPort: 'bottom', to: 'node_decision', toPort: 'top', label: '' },
    { id: 'conn_4', from: 'node_decision', fromPort: 'bottom', to: 'node_loop_body', toPort: 'top', label: 'Yes' },
    { id: 'conn_5', from: 'node_loop_body', fromPort: 'left', to: 'node_decision', toPort: 'left', label: 'Loop' },
    { id: 'conn_6', from: 'node_decision', fromPort: 'right', to: 'node_output', toPort: 'top', label: 'No' },
    { id: 'conn_7', from: 'node_output', fromPort: 'bottom', to: 'node_end', toPort: 'top', label: '' }
];

// 2. Initial Starter ER Diagram Nodes & Connectors - Removed to start completely clean (Zero Templates for ER)
const DEFAULT_INITIAL_ER_NODES = [];
const DEFAULT_INITIAL_ER_CONNECTORS = [];

// Categorized Relational Database Designer Shapes (Table cards with internal properties)
const RELATIONAL_SHAPES = [
    {
        category: 'Database Tables',
        items: [
            { id: 'er_table', label: 'Table with Columns', title: 'Add Table Card (Name, Columns, Types, PK/FK inside card)', icon: <Table className="w-3.5 h-3.5 text-primary-500" />, color: 'bg-slate-100 border-slate-300 text-slate-800' }
        ]
    }
];

// Categorized Conceptual ER Diagram Shapes (Chen Model: Entities, Ovals, Diamonds)
const CHEN_ER_SHAPES = [
    {
        category: 'Entities',
        items: [
            { id: 'er_entity', label: 'Strong Entity', title: 'Add Strong Entity (Rectangle)', icon: <span className="w-3 h-2 bg-sky-500 rounded-2xs inline-block" />, color: 'bg-sky-50 border-sky-300 text-sky-800' },
            { id: 'er_weak_entity', label: 'Weak Entity', title: 'Add Weak Entity (Double Rectangle)', icon: <span className="w-3 h-2 border-2 border-cyan-600 bg-cyan-200 rounded-2xs inline-block" />, color: 'bg-cyan-50 border-cyan-300 text-cyan-800' }
        ]
    },
    {
        category: 'Relationships',
        items: [
            { id: 'er_relationship', label: 'Relationship', title: 'Add Relationship (Diamond)', icon: <span className="w-2.5 h-2.5 bg-amber-500 rotate-45 inline-block" />, color: 'bg-amber-50 border-amber-300 text-amber-800' },
            { id: 'er_weak_relationship', label: 'Identifying Rel.', title: 'Add Identifying Relationship (Double Diamond)', icon: <span className="w-2.5 h-2.5 border border-orange-600 bg-orange-300 rotate-45 inline-block" />, color: 'bg-orange-50 border-orange-300 text-orange-800' }
        ]
    },
    {
        category: 'Attributes',
        items: [
            { id: 'er_attribute', label: 'Attribute', title: 'Add Regular Attribute (Oval)', icon: <span className="w-3 h-1.5 rounded-full bg-emerald-500 inline-block" />, color: 'bg-emerald-50 border-emerald-300 text-emerald-800' },
            { id: 'er_key_attribute', label: 'Key (PK)', title: 'Add Primary Key Attribute (Underlined + 🔑 Key)', icon: <Key className="w-3 h-3 text-amber-600" />, color: 'bg-yellow-50 border-yellow-400 text-yellow-900' },
            { id: 'er_multivalued', label: 'Multivalued', title: 'Add Multivalued Attribute (Double Oval)', icon: <span className="w-3 h-1.5 rounded-full border border-purple-600 bg-purple-200 inline-block" />, color: 'bg-purple-50 border-purple-300 text-purple-800' },
            { id: 'er_derived', label: 'Derived', title: 'Add Derived Attribute (Dashed Oval)', icon: <span className="w-3 h-1.5 rounded-full border border-dashed border-fuchsia-600 inline-block" />, color: 'bg-fuchsia-50 border-fuchsia-300 text-fuchsia-800' }
        ]
    }
];

const FLOWCHART_SHAPES = [
    {
        category: 'Flowchart Shapes',
        items: [
            { id: 'terminator', label: 'Start / End', title: 'Start/End Oval Terminator', icon: <span className="w-3 h-1.5 rounded-full bg-emerald-500 inline-block" />, color: 'bg-emerald-50 border-emerald-300 text-emerald-800' },
            { id: 'io', label: 'Input / Output', title: 'Input/Output Parallelogram', icon: <span className="w-3 h-2 bg-sky-500 skew-x-12 inline-block" />, color: 'bg-sky-50 border-sky-300 text-sky-800' },
            { id: 'process', label: 'Process / Action', title: 'Calculation/Assignment Rectangle', icon: <span className="w-3 h-2 bg-slate-400 rounded-2xs inline-block" />, color: 'bg-white border-slate-300 text-slate-800' },
            { id: 'predefined_process', label: 'Function Call', title: 'Subroutine / Function Call (Predefined Process)', icon: <span className="w-3 h-2 border-x-2 border-purple-600 bg-purple-100 rounded-2xs inline-block" />, color: 'bg-purple-50 border-purple-300 text-purple-800' },
            { id: 'decision', label: 'Decision (If)', title: 'Decision Condition Diamond', icon: <span className="w-2.5 h-2.5 bg-amber-500 rotate-45 inline-block" />, color: 'bg-amber-50 border-amber-300 text-amber-800' },
            { id: 'loop', label: 'Loop (Hexagon)', title: 'Loop Iteration Hexagon', icon: <span className="w-3 h-2 bg-purple-500 inline-block" />, color: 'bg-purple-50 border-purple-300 text-purple-800' }
        ]
    }
];

const PORTS = ['top', 'right', 'bottom', 'left'];

const CARDINALITY_OPTIONS = ['1:1', '1:N', 'M:N', '1', 'N', 'M', '(0,1)', '(1,1)', '(0,N)', '(1,N)'];

export default function FlowchartVisualCanvas({
    initialData,
    onChange,
    readOnly = false,
    theme = 'light',
    language = 'python',
    activeCode = '',
    onInsertSqlDdl = null
}) {
    // Determine diagram mode strictly based on language:
    // SQL / PLSQL -> ER Diagram Designer
    // Python / C / C++ / Java -> Flowchart Designer
    const isErMode = language === 'sql' || language === 'plsql';
    const canvasMode = isErMode ? 'er' : 'flowchart';
    // 'relational': Database Designer (Table Cards with Properties) | 'chen': Conceptual ERD (Chen Notation)
    const [erSubView, setErSubView] = useState('relational');

    // Canvas nodes and connectors - Blank canvas by default for new files
    const [nodes, setNodes] = useState(() => {
        if (initialData?.nodes && Array.isArray(initialData.nodes)) return initialData.nodes;
        return [];
    });

    const [connectors, setConnectors] = useState(() => {
        if (initialData?.connectors && Array.isArray(initialData.connectors)) return initialData.connectors;
        return [];
    });

    // Active tool: 'select' | 'connector' | 'place_shape'
    const [activeTool, setActiveTool] = useState('select');
    const [pendingShapeType, setPendingShapeType] = useState(null); // Shape selected in palette to be placed on click

    // Selection & connection state - Multi-select supported
    const [selectedNodeIds, setSelectedNodeIds] = useState([]);
    const selectedNodeId = selectedNodeIds[0] || null; // Primary selected node
    const [selectedConnectorId, setSelectedConnectorId] = useState(null);
    const [hoveredNodeId, setHoveredNodeId] = useState(null);
    const [hoveredPortInfo, setHoveredPortInfo] = useState(null); // { nodeId, port }

    // Connecting from a port: { nodeId, port }
    const [connectingSource, setConnectingSource] = useState(null);
    const [connectingMousePos, setConnectingMousePos] = useState(null);
    const [canvasMousePos, setCanvasMousePos] = useState(null);

    // Marquee / Box drag selection
    const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
    const [marqueeBox, setMarqueeBox] = useState(null); // { startX, startY, currentX, currentY }

    // Right-click Context Menu: { x, y, targetType, targetId, canvasPos }
    const [contextMenu, setContextMenu] = useState(null);

    // Confirmation Modal for Clear Canvas
    const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

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

    // Dragging node(s)
    const [draggingNodeId, setDraggingNodeId] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const dragInitialPositionsRef = useRef(new Map());

    // Internal clipboard for cut / copy / paste
    const clipboardRef = useRef(null);

    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const isLocalUpdateRef = useRef(false);

    // Fullscreen Overlay Mode & Collapsible Shapes Palette
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [showShapesDropdown, setShowShapesDropdown] = useState(false);
    const [isShapesExpanded, setIsShapesExpanded] = useState(false);
    const shapesDropdownRef = useRef(null);

    // Escape key listener for exiting Fullscreen
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isFullScreen) {
                setIsFullScreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullScreen]);

    // Outside click listener for closing Shapes Dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (shapesDropdownRef.current && !shapesDropdownRef.current.contains(e.target)) {
                setShowShapesDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isLight = theme === 'light';

    // Emit changes to parent safely
    const notifyChange = useCallback((newNodes, newConnectors) => {
        if (!onChange) return;
        isLocalUpdateRef.current = true;
        onChange({ nodes: newNodes, connectors: newConnectors, canvasMode });
    }, [onChange, canvasMode]);

    // Update if initialData changes externally
    useEffect(() => {
        if (isLocalUpdateRef.current) {
            isLocalUpdateRef.current = false;
            return;
        }
        if (initialData && Array.isArray(initialData.nodes)) {
            setNodes(initialData.nodes);
        }
        if (initialData && Array.isArray(initialData.connectors)) {
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

    // Calculate best automatic port between two nodes
    const getBestPorts = (fromNode, toNode) => {
        if (fromNode.id === toNode.id) {
            return { fromPort: 'right', toPort: 'top' };
        }

        const fCenterX = fromNode.x + fromNode.width / 2;
        const fCenterY = fromNode.y + fromNode.height / 2;
        const tCenterX = toNode.x + toNode.width / 2;
        const tCenterY = toNode.y + toNode.height / 2;

        const dx = tCenterX - fCenterX;
        const dy = tCenterY - fCenterY;

        if (Math.abs(dy) >= Math.abs(dx)) {
            return dy > 0
                ? { fromPort: 'bottom', toPort: 'top' }
                : { fromPort: 'top', toPort: 'bottom' };
        } else {
            return dx > 0
                ? { fromPort: 'right', toPort: 'left' }
                : { fromPort: 'left', toPort: 'right' };
        }
    };

    // Get connector path and middle pill position using smooth Bézier curves
    const getConnectorPathData = (conn) => {
        const fromNode = nodes.find((n) => n.id === conn.from);
        const toNode = nodes.find((n) => n.id === conn.to);
        if (!fromNode || !toNode) return null;

        const autoPorts = getBestPorts(fromNode, toNode);
        const fromPort = conn.fromPort || autoPorts.fromPort;
        const toPort = conn.toPort || autoPorts.toPort;

        const start = getPortCoordinates(fromNode, fromPort);
        const end = getPortCoordinates(toNode, toPort);

        // Self-loop
        if (fromNode.id === toNode.id) {
            const loopOffset = 65;
            const cp1 = { x: start.x + (fromPort === 'right' ? loopOffset : 0), y: start.y + (fromPort === 'bottom' ? loopOffset : -loopOffset * 0.5) };
            const cp2 = { x: end.x + (toPort === 'left' ? -loopOffset : 0), y: end.y + (toPort === 'top' ? -loopOffset : loopOffset * 0.5) };
            const pathD = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;

            const midX = 0.125 * start.x + 0.375 * cp1.x + 0.375 * cp2.x + 0.125 * end.x;
            const midY = 0.125 * start.y + 0.375 * cp1.y + 0.375 * cp2.y + 0.125 * end.y;

            return { start, end, cp1, cp2, pathD, midX, midY, fromPort, toPort };
        }

        const normalOffsets = {
            top: { x: 0, y: -1 },
            bottom: { x: 0, y: 1 },
            left: { x: -1, y: 0 },
            right: { x: 1, y: 0 }
        };

        const dist = Math.hypot(end.x - start.x, end.y - start.y);
        const curvature = Math.min(Math.max(dist * 0.45, 30), 140);

        const fromNorm = normalOffsets[fromPort] || { x: 0, y: 1 };
        const toNorm = normalOffsets[toPort] || { x: 0, y: -1 };

        const cp1 = {
            x: start.x + fromNorm.x * curvature,
            y: start.y + fromNorm.y * curvature
        };
        const cp2 = {
            x: end.x + toNorm.x * curvature,
            y: end.y + toNorm.y * curvature
        };

        const pathD = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;

        const midX = 0.125 * start.x + 0.375 * cp1.x + 0.375 * cp2.x + 0.125 * end.x;
        const midY = 0.125 * start.y + 0.375 * cp1.y + 0.375 * cp2.y + 0.125 * end.y;

        return { start, end, cp1, cp2, pathD, midX, midY, fromPort, toPort };
    };

    // Node actions
    const deleteNode = useCallback((nodeId) => {
        if (readOnly) return;
        const nextNodes = nodes.filter((n) => n.id !== nodeId);
        const nextConns = connectors.filter((c) => c.from !== nodeId && c.to !== nodeId);
        setNodes(nextNodes);
        setConnectors(nextConns);
        setSelectedNodeIds((prev) => prev.filter((id) => id !== nodeId));
        notifyChange(nextNodes, nextConns);
        toast.success('Deleted shape & attached connectors');
    }, [nodes, connectors, readOnly, notifyChange]);

    const deleteSelectedNodes = useCallback(() => {
        if (readOnly || selectedNodeIds.length === 0) return;
        const setIds = new Set(selectedNodeIds);
        const nextNodes = nodes.filter((n) => !setIds.has(n.id));
        const nextConns = connectors.filter((c) => !setIds.has(c.from) && !setIds.has(c.to));
        setNodes(nextNodes);
        setConnectors(nextConns);
        const count = selectedNodeIds.length;
        setSelectedNodeIds([]);
        notifyChange(nextNodes, nextConns);
        toast.success(`Deleted ${count} shape(s)`);
    }, [nodes, connectors, readOnly, selectedNodeIds, notifyChange]);

    const deleteConnector = useCallback((connectorId) => {
        if (readOnly) return;
        const nextConns = connectors.filter((c) => c.id !== connectorId);
        setConnectors(nextConns);
        setSelectedConnectorId(null);
        notifyChange(nodes, nextConns);
        toast.success('Deleted connector');
    }, [connectors, nodes, readOnly, notifyChange]);

    // Cut / Copy / Paste
    const copySelected = useCallback(() => {
        if (selectedNodeIds.length > 0) {
            const node = nodes.find((n) => n.id === selectedNodeIds[0]);
            if (node) {
                clipboardRef.current = { type: 'node', data: { ...node } };
                toast.success(`Copied shape "${node.text}"`);
            }
        } else if (selectedConnectorId) {
            const conn = connectors.find((c) => c.id === selectedConnectorId);
            if (conn) {
                clipboardRef.current = { type: 'connector', data: { ...conn } };
                toast.success('Copied connector');
            }
        }
    }, [selectedNodeIds, selectedConnectorId, nodes, connectors]);

    const cutSelected = useCallback(() => {
        if (readOnly) return;
        if (selectedNodeIds.length > 0) {
            copySelected();
            deleteSelectedNodes();
        } else if (selectedConnectorId) {
            copySelected();
            deleteConnector(selectedConnectorId);
        }
    }, [readOnly, selectedNodeIds, selectedConnectorId, copySelected, deleteSelectedNodes, deleteConnector]);

    const pasteClipboard = useCallback((targetPos = null) => {
        if (readOnly || !clipboardRef.current) return;
        const { type, data } = clipboardRef.current;

        if (type === 'node') {
            const randId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const spawnX = targetPos ? Math.round(targetPos.x - data.width / 2) : data.x + 35;
            const spawnY = targetPos ? Math.round(targetPos.y - data.height / 2) : data.y + 35;
            const newNode = {
                ...data,
                id: randId,
                x: spawnX,
                y: spawnY
            };
            const nextNodes = [...nodes, newNode];
            setNodes(nextNodes);
            setSelectedNodeIds([randId]);
            notifyChange(nextNodes, connectors);
            toast.success(`Pasted shape "${newNode.text}"`);
        }
    }, [readOnly, nodes, connectors, notifyChange]);

    // Keyboard Shortcuts (Ctrl+A, Del, Backspace, Ctrl+C, Ctrl+X, Ctrl+V, Esc)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (editingNodeId || editingConnectorId) return;

            // Select All (Ctrl+A / Cmd+A)
            if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    if (nodes.length > 0) {
                        setSelectedNodeIds(nodes.map((n) => n.id));
                        toast.success(`Selected all (${nodes.length}) shapes`, { icon: '🔲' });
                    }
                }
                return;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                if (selectedNodeIds.length > 0) {
                    e.preventDefault();
                    deleteSelectedNodes();
                } else if (selectedConnectorId) {
                    e.preventDefault();
                    deleteConnector(selectedConnectorId);
                }
            }

            if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
                if (selectedNodeIds.length > 0 || selectedConnectorId) {
                    e.preventDefault();
                    copySelected();
                }
            }

            if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
                if (selectedNodeIds.length > 0 || selectedConnectorId) {
                    e.preventDefault();
                    cutSelected();
                }
            }

            if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
                if (clipboardRef.current) {
                    e.preventDefault();
                    pasteClipboard();
                }
            }

            if (e.key === 'Escape') {
                setSelectedNodeIds([]);
                setSelectedConnectorId(null);
                setConnectingSource(null);
                setConnectingMousePos(null);
                setPendingShapeType(null);
                setActiveTool('select');
                setContextMenu(null);
                setIsMarqueeSelecting(false);
                setMarqueeBox(null);
            }

            if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                if (e.key === 'h' || e.key === 'H') {
                    setActiveTool('pan');
                } else if (e.key === 'v' || e.key === 'V') {
                    setActiveTool('select');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        editingNodeId,
        editingConnectorId,
        selectedNodeIds,
        selectedConnectorId,
        nodes,
        deleteNode,
        deleteSelectedNodes,
        deleteConnector,
        copySelected,
        cutSelected,
        pasteClipboard
    ]);

    // Shape Configuration Specifications
    const getShapeConfig = (type) => {
        let defaultText = 'Process';
        let width = 160;
        let height = 54;
        let color = '#ffffff';
        let borderColor = '#64748b';
        let textColor = '#0f172a';

        if (type === 'terminator') {
            defaultText = 'Start / End';
            width = 140;
            height = 50;
            color = '#dcfce7';
            borderColor = '#16a34a';
            textColor = '#14532d';
        } else if (type === 'io') {
            defaultText = 'Input / Output';
            width = 170;
            height = 54;
            color = '#dbeafe';
            borderColor = '#2563eb';
            textColor = '#1e3a8a';
        } else if (type === 'process') {
            defaultText = 'Process / Action';
            width = 160;
            height = 54;
            color = '#ffffff';
            borderColor = '#64748b';
            textColor = '#0f172a';
        } else if (type === 'predefined_process' || type === 'subroutine') {
            defaultText = 'Call function()';
            width = 175;
            height = 54;
            color = '#f5f3ff';
            borderColor = '#7c3aed';
            textColor = '#4c1d95';
        } else if (type === 'decision') {
            defaultText = 'Condition?';
            width = 150;
            height = 70;
            color = '#fef3c7';
            borderColor = '#d97706';
            textColor = '#78350f';
        } else if (type === 'loop') {
            defaultText = 'For i in range';
            width = 170;
            height = 54;
            color = '#f3e8ff';
            borderColor = '#9333ea';
            textColor = '#581c87';
        } else if (type === 'er_entity') {
            defaultText = 'ENTITY';
            width = 140;
            height = 54;
            color = '#e0f2fe';
            borderColor = '#0284c7';
            textColor = '#0369a1';
        } else if (type === 'er_weak_entity') {
            defaultText = 'WEAK_ENTITY';
            width = 150;
            height = 54;
            color = '#cffafe';
            borderColor = '#0891b2';
            textColor = '#155e75';
        } else if (type === 'er_relationship') {
            defaultText = 'RELATION';
            width = 130;
            height = 64;
            color = '#fef9c3';
            borderColor = '#ca8a04';
            textColor = '#854d0e';
        } else if (type === 'er_weak_relationship') {
            defaultText = 'ID_RELATION';
            width = 140;
            height = 68;
            color = '#ffedd5';
            borderColor = '#ea580c';
            textColor = '#9a3412';
        } else if (type === 'er_attribute') {
            defaultText = 'attribute';
            width = 110;
            height = 44;
            color = '#f0fdf4';
            borderColor = '#16a34a';
            textColor = '#15803d';
        } else if (type === 'er_key_attribute') {
            defaultText = 'id_pk';
            width = 115;
            height = 44;
            color = '#fef3c7';
            borderColor = '#d97706';
            textColor = '#78350f';
        } else if (type === 'er_multivalued') {
            defaultText = 'phones';
            width = 120;
            height = 46;
            color = '#ede9fe';
            borderColor = '#7c3aed';
            textColor = '#5b21b6';
        } else if (type === 'er_derived') {
            defaultText = 'age_derived';
            width = 120;
            height = 44;
            color = '#fae8ff';
            borderColor = '#c026d3';
            textColor = '#86198f';
        } else if (type === 'er_table') {
            defaultText = 'table_name\nid INT PK\nname VARCHAR(50)\ncreated_at TIMESTAMP';
            width = 180;
            height = 110;
            color = '#f8fafc';
            borderColor = '#475569';
            textColor = '#0f172a';
        }

        return { defaultText, width, height, color, borderColor, textColor };
    };

    // User selects a shape from toolbar to place on canvas click
    const handleSelectShapeToPlace = (type) => {
        if (readOnly) return;
        if (pendingShapeType === type) {
            setPendingShapeType(null);
            setActiveTool('select');
        } else {
            setPendingShapeType(type);
            setActiveTool('place_shape');
            setSelectedNodeIds([]);
            setSelectedConnectorId(null);
            toast(`Click on canvas to place ${type.replace('er_', 'ER ').toUpperCase()}`, {
                icon: '📍',
                duration: 2500
            });
        }
    };

    // Place Shape at specific canvas world coordinates
    const placeShapeAt = (type, targetX, targetY) => {
        if (readOnly) return;
        const cfg = getShapeConfig(type);
        const randId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const newNode = {
            id: randId,
            type,
            text: cfg.defaultText,
            x: Math.round(targetX - cfg.width / 2),
            y: Math.round(targetY - cfg.height / 2),
            width: cfg.width,
            height: cfg.height,
            color: cfg.color,
            borderColor: cfg.borderColor,
            textColor: cfg.textColor
        };
        const nextNodes = [...nodes, newNode];
        setNodes(nextNodes);
        setSelectedNodeIds([randId]);
        notifyChange(nextNodes, connectors);
        toast.success(`Placed ${type.replace('er_', 'ER ').toUpperCase()} shape`);
        return newNode;
    };

    // Add Shape Handler (Toolbar fallback)
    const handleAddShape = (type) => {
        if (readOnly) return;
        const spawnX = Math.round((-pan.x + 220) / zoom);
        const spawnY = Math.round((-pan.y + 140) / zoom);
        placeShapeAt(type, spawnX, spawnY);
    };

    // Helper to calculate exact coordinates relative to SVG canvas in world-space
    const getCanvasMousePos = (e) => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const rect = svgRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - pan.x) / zoom,
            y: (e.clientY - rect.top - pan.y) / zoom
        };
    };

    // Context menu opening helper
    const handleContextMenu = (e, targetType, targetId = null) => {
        e.preventDefault();
        e.stopPropagation();
        if (readOnly) return;

        if (targetType === 'node') {
            if (!selectedNodeIds.includes(targetId)) {
                setSelectedNodeIds([targetId]);
            }
            setSelectedConnectorId(null);
        } else if (targetType === 'connector') {
            setSelectedConnectorId(targetId);
            setSelectedNodeIds([]);
        }

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            targetType,
            targetId,
            canvasPos: getCanvasMousePos(e)
        });
    };

    // Node pointer down - Multi-selection, group drag, and tap-to-connect on mobile
    const handleNodePointerDown = (e, node) => {
        if (readOnly) return;
        e.stopPropagation();
        if (contextMenu) setContextMenu(null);

        // Tap-to-Connect on Mobile & Touch:
        // If connectingSource is active and user taps ANY destination node, connect!
        if (connectingSource) {
            if (connectingSource.nodeId !== node.id) {
                completeConnection(node.id, 'top');
            } else {
                completeConnection(node.id, 'left');
            }
            return;
        }

        if (activeTool === 'connector') {
            if (!connectingSource) {
                setConnectingSource({ nodeId: node.id, port: 'bottom' });
                const pt = getPortCoordinates(node, 'bottom');
                setConnectingMousePos(pt);
            } else {
                completeConnection(node.id, 'top');
            }
            return;
        }

        if (activeTool === 'pan') {
            setIsPanning(true);
            setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            return;
        }

        let nextSelected = selectedNodeIds;
        if (e.shiftKey) {
            nextSelected = nextSelected.includes(node.id)
                ? nextSelected.filter((id) => id !== node.id)
                : [...nextSelected, node.id];
            setSelectedNodeIds(nextSelected);
        } else if (!nextSelected.includes(node.id)) {
            nextSelected = [node.id];
            setSelectedNodeIds(nextSelected);
        }
        setSelectedConnectorId(null);
        setDraggingNodeId(node.id);

        const mouse = getCanvasMousePos(e);
        setDragOffset({
            x: mouse.x - node.x,
            y: mouse.y - node.y
        });

        // Store initial positions of all selected nodes for synchronized group dragging
        const posMap = new Map();
        nodes.forEach((n) => {
            if (nextSelected.includes(n.id)) {
                posMap.set(n.id, { x: n.x, y: n.y });
            }
        });
        dragInitialPositionsRef.current = posMap;
    };

    // Hook Port pointer down
    const handlePortPointerDown = (e, nodeId, port) => {
        if (readOnly) return;
        e.stopPropagation();
        if (contextMenu) setContextMenu(null);

        // If already connecting, tapping this target port completes the connection!
        if (connectingSource) {
            completeConnection(nodeId, port);
            return;
        }

        setConnectingSource({ nodeId, port });
        const fromNode = nodes.find((n) => n.id === nodeId);
        if (fromNode) {
            const pt = getPortCoordinates(fromNode, port);
            setConnectingMousePos(pt);
        }
    };

    // Complete connection to a target node & port - NO default labels by default
    const completeConnection = (targetNodeId, targetPort = 'top') => {
        if (!connectingSource) return;

        if (connectingSource.nodeId === targetNodeId && connectingSource.port === targetPort) {
            setConnectingSource(null);
            setConnectingMousePos(null);
            return;
        }

        // By default do NOT put labels on connectors
        const defaultLabel = '';

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
        toast.success(
            connectingSource.nodeId === targetNodeId
                ? 'Loopback connector created!'
                : 'Connected shapes!',
            { icon: '🔗' }
        );
    };

    // Canvas pointer move - Zero-lag group drag & marquee drag selection
    const handleCanvasPointerMove = (e) => {
        const mouse = getCanvasMousePos(e);
        setCanvasMousePos(mouse);

        if (connectingSource) {
            setConnectingMousePos(mouse);
            return;
        }

        if (isMarqueeSelecting) {
            setMarqueeBox((prev) => (prev ? { ...prev, currentX: mouse.x, currentY: mouse.y } : null));
            return;
        }

        if (draggingNodeId) {
            const targetStart = dragInitialPositionsRef.current.get(draggingNodeId);
            if (targetStart) {
                const dx = Math.round(mouse.x - dragOffset.x - targetStart.x);
                const dy = Math.round(mouse.y - dragOffset.y - targetStart.y);
                setNodes((prev) =>
                    prev.map((n) => {
                        const startPos = dragInitialPositionsRef.current.get(n.id);
                        if (startPos) {
                            return { ...n, x: startPos.x + dx, y: startPos.y + dy };
                        }
                        return n;
                    })
                );
            }
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
            dragInitialPositionsRef.current.clear();
            notifyChange(nodes, connectors);
        }
        if (isPanning) {
            setIsPanning(false);
        }
        if (isMarqueeSelecting && marqueeBox) {
            const x1 = Math.min(marqueeBox.startX, marqueeBox.currentX);
            const x2 = Math.max(marqueeBox.startX, marqueeBox.currentX);
            const y1 = Math.min(marqueeBox.startY, marqueeBox.currentY);
            const y2 = Math.max(marqueeBox.startY, marqueeBox.currentY);

            if (x2 - x1 > 8 || y2 - y1 > 8) {
                const hitIds = nodes
                    .filter((n) => n.x < x2 && n.x + n.width > x1 && n.y < y2 && n.y + n.height > y1)
                    .map((n) => n.id);
                setSelectedNodeIds(hitIds);
            }
            setIsMarqueeSelecting(false);
            setMarqueeBox(null);
        }
    };

    const handleCanvasPointerDown = (e) => {
        if (contextMenu) setContextMenu(null);
        const mouse = getCanvasMousePos(e);

        if (pendingShapeType) {
            placeShapeAt(pendingShapeType, mouse.x, mouse.y);
            if (!e.shiftKey) {
                setPendingShapeType(null);
                setActiveTool('select');
            }
            return;
        }

        const target = e.target;
        if (target.tagName === 'svg' || target.id === 'canvas-bg' || target.id === 'flowchart-svg-canvas') {
            if (!e.shiftKey) {
                setSelectedNodeIds([]);
            }
            setSelectedConnectorId(null);
            setConnectingSource(null);
            setConnectingMousePos(null);

            if (activeTool === 'pan' || e.button === 1 || e.spaceKey) {
                setIsPanning(true);
                setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            } else if (e.button === 0) {
                setIsMarqueeSelecting(true);
                setMarqueeBox({ startX: mouse.x, startY: mouse.y, currentX: mouse.x, currentY: mouse.y });
            }
        }
    };

    // Double-click shape to edit text inline
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

    // Double-click connector pill to edit label
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

    // Quick tag cardinality on selected connector
    const handleSetConnectorCardinality = (tag) => {
        if (!selectedConnectorId) return;
        const nextConns = connectors.map((c) =>
            c.id === selectedConnectorId ? { ...c, label: tag } : c
        );
        setConnectors(nextConns);
        notifyChange(nodes, nextConns);
        toast.success(`Set cardinality to "${tag}"`);
    };

    // Clear entire canvas (Trigger styled modal)
    const handleClearCanvas = () => {
        if (readOnly) return;
        setShowClearConfirmModal(true);
    };

    const executeClearCanvas = () => {
        setNodes([]);
        setConnectors([]);
        setSelectedNodeIds([]);
        setSelectedConnectorId(null);
        notifyChange([], []);
        setShowClearConfirmModal(false);
        toast.success('Canvas cleared');
    };

    // Reset to Starter Templates (Flowchart only; ER designer has zero templates)
    const handleResetToTemplate = () => {
        if (readOnly || isErMode) return;
        const starterNodes = DEFAULT_INITIAL_FLOWCHART_NODES;
        const starterConns = DEFAULT_INITIAL_FLOWCHART_CONNECTORS;
        setNodes(starterNodes);
        setConnectors(starterConns);
        setSelectedNodeId(null);
        setSelectedConnectorId(null);
        notifyChange(starterNodes, starterConns);
        toast.success('Reset to standard flowchart template');
    };

    // ========================================================================
    // 3. TRADITIONAL RULE-BASED CODE -> DIAGRAM GENERATOR (ZERO AI CALLS)
    // ========================================================================
    const handleTraditionalGenerate = () => {
        if (!activeCode || !activeCode.trim()) {
            toast.error('The active editor code is empty. Write or load some code first!');
            return;
        }

        if (isErMode) {
            if (erSubView === 'relational') {
                const result = generateRelationalErDiagramFromSql(activeCode);
                if (!result.nodes || result.nodes.length === 0) {
                    toast.error('No CREATE TABLE statements found in SQL code to generate relational tables.');
                    return;
                }
                setNodes(result.nodes);
                setConnectors(result.connectors);
                notifyChange(result.nodes, result.connectors);
                toast.success(`Generated Database Designer with ${result.nodes.length} relational tables (No AI)!`, { icon: '🗄️' });
            } else {
                // Traditional SQL DDL parser for Conceptual Chen ERD
                const result = generateErDiagramFromSql(activeCode);
                if (!result.nodes || result.nodes.length === 0) {
                    toast.error('No CREATE TABLE statements found in the SQL editor. Write CREATE TABLE DDL to generate an ER diagram!');
                    return;
                }
                setNodes(result.nodes);
                setConnectors(result.connectors);
                notifyChange(result.nodes, result.connectors);
                toast.success(`Generated Conceptual ER Diagram with ${result.nodes.length} components (No AI)!`, { icon: '🔷' });
            }
        } else {
            // Traditional CFG code parser
            const result = generateFlowchartFromCode(activeCode, language);
            if (!result.nodes || result.nodes.length === 0) {
                toast.error('No actionable programming statements found in code editor to generate flowchart.');
                return;
            }
            setNodes(result.nodes);
            setConnectors(result.connectors);
            notifyChange(result.nodes, result.connectors);
            toast.success(`Generated Flowchart with ${result.nodes.length} steps using static code analysis (No AI used)!`, { icon: '⚡' });
        }
    };

    // Export Canvas to PNG or SVG
    const handleExportCanvas = (format = 'svg') => {
        if (!svgRef.current) return;
        const svgElement = svgRef.current;
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);

        const prefix = isErMode ? 'er_diagram' : 'flowchart';

        if (format === 'svg') {
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${prefix}_${Date.now()}.svg`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`Downloaded SVG ${prefix}!`);
        } else {
            const img = new Image();
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 1400;
                canvas.height = 1000;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = isLight ? '#ffffff' : '#020617';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const pngUrl = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = pngUrl;
                a.download = `${prefix}_${Date.now()}.png`;
                a.click();
                toast.success(`Downloaded PNG ${prefix}!`);
            };
        }
    };

    // Render node path/geometry starting at (0, 0) - NO CSS TRANSITIONS on positioning!
    const renderShapeGeometry = (node, isSelected, isConnectingSource) => {
        const { width: w, height: h, type, color, borderColor } = node;
        const strokeColor = isConnectingSource
            ? '#38bdf8'
            : isSelected
            ? '#8b5cf6'
            : borderColor;
        const strokeWidth = isSelected || isConnectingSource ? 2.5 : 2;

        // FLOWCHART GEOMETRIES
        if (type === 'terminator') {
            return (
                <rect
                    x={0}
                    y={0}
                    width={w}
                    height={h}
                    rx={h / 2}
                    ry={h / 2}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="drop-shadow-xs"
                />
            );
        } else if (type === 'io') {
            const skew = 18;
            const points = `${skew},0 ${w},0 ${w - skew},${h} 0,${h}`;
            return (
                <polygon
                    points={points}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="drop-shadow-xs"
                />
            );
        } else if (type === 'process') {
            return (
                <rect
                    x={0}
                    y={0}
                    width={w}
                    height={h}
                    rx={3}
                    ry={3}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="drop-shadow-xs"
                />
            );
        } else if (type === 'predefined_process' || type === 'subroutine') {
            const barOffset = 14;
            return (
                <g className="drop-shadow-xs">
                    <rect
                        x={0}
                        y={0}
                        width={w}
                        height={h}
                        rx={3}
                        ry={3}
                        fill={color}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                    />
                    <line
                        x1={barOffset}
                        y1={0}
                        x2={barOffset}
                        y2={h}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                    />
                    <line
                        x1={w - barOffset}
                        y1={0}
                        x2={w - barOffset}
                        y2={h}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                    />
                </g>
            );
        } else if (type === 'decision') {
            const points = `${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`;
            return (
                <polygon
                    points={points}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="drop-shadow-xs"
                />
            );
        } else if (type === 'loop') {
            const inset = 16;
            const points = `${inset},0 ${w - inset},0 ${w},${h / 2} ${w - inset},${h} ${inset},${h} 0,${h / 2}`;
            return (
                <polygon
                    points={points}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="drop-shadow-xs"
                />
            );
        }

        // DBMS CHEN'S ER GEOMETRIES
        else if (type === 'er_entity') {
            return (
                <rect
                    x={0}
                    y={0}
                    width={w}
                    height={h}
                    rx={4}
                    ry={4}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="drop-shadow-xs"
                />
            );
        } else if (type === 'er_weak_entity') {
            return (
                <g className="drop-shadow-xs">
                    <rect
                        x={0}
                        y={0}
                        width={w}
                        height={h}
                        rx={5}
                        ry={5}
                        fill={color}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                    />
                    <rect
                        x={4}
                        y={4}
                        width={w - 8}
                        height={h - 8}
                        rx={3}
                        ry={3}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={Math.max(1, strokeWidth - 0.5)}
                    />
                </g>
            );
        } else if (type === 'er_relationship') {
            const points = `${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`;
            return (
                <polygon
                    points={points}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="drop-shadow-xs"
                />
            );
        } else if (type === 'er_weak_relationship') {
            const outerPoints = `${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`;
            const innerPoints = `${w / 2},6 ${w - 8},${h / 2} ${w / 2},${h - 6} 8,${h / 2}`;
            return (
                <g className="drop-shadow-xs">
                    <polygon points={outerPoints} fill={color} stroke={strokeColor} strokeWidth={strokeWidth} />
                    <polygon points={innerPoints} fill="none" stroke={strokeColor} strokeWidth={Math.max(1, strokeWidth - 0.5)} />
                </g>
            );
        } else if (type === 'er_attribute' || type === 'er_key_attribute') {
            return (
                <ellipse
                    cx={w / 2}
                    cy={h / 2}
                    rx={w / 2}
                    ry={h / 2}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="drop-shadow-xs"
                />
            );
        } else if (type === 'er_multivalued') {
            return (
                <g className="drop-shadow-xs">
                    <ellipse
                        cx={w / 2}
                        cy={h / 2}
                        rx={w / 2}
                        ry={h / 2}
                        fill={color}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                    />
                    <ellipse
                        cx={w / 2}
                        cy={h / 2}
                        rx={w / 2 - 4}
                        ry={h / 2 - 4}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={Math.max(1, strokeWidth - 0.5)}
                    />
                </g>
            );
        } else if (type === 'er_derived') {
            return (
                <ellipse
                    cx={w / 2}
                    cy={h / 2}
                    rx={w / 2}
                    ry={h / 2}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray="5,4"
                    className="drop-shadow-xs"
                />
            );
        } else if (type === 'er_table') {
            return (
                <g className="drop-shadow-md">
                    <rect
                        x={0}
                        y={0}
                        width={w}
                        height={h}
                        rx={6}
                        ry={6}
                        fill={color}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                    />
                    <rect
                        x={0}
                        y={0}
                        width={w}
                        height={26}
                        rx={6}
                        ry={6}
                        fill={isSelected ? '#7c3aed' : '#334155'}
                    />
                    <rect
                        x={0}
                        y={18}
                        width={w}
                        height={8}
                        fill={isSelected ? '#7c3aed' : '#334155'}
                    />
                </g>
            );
        }

        return (
            <rect
                x={0}
                y={0}
                width={w}
                height={h}
                rx={4}
                ry={4}
                fill={color}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                className="drop-shadow-xs"
            />
        );
    };

    return (
        <div
            ref={containerRef}
            className={`select-none transition-all duration-200 ${
                isFullScreen
                    ? `fixed inset-0 z-50 w-screen h-screen flex flex-col overflow-hidden shadow-2xl ${isLight ? 'bg-slate-50 text-slate-800' : 'bg-slate-950 text-slate-100'}`
                    : `w-full max-w-full h-full flex flex-col relative overflow-hidden min-w-0 ${isLight ? 'bg-slate-50 text-slate-800' : 'bg-slate-950 text-slate-100'}`
            }`}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
        >
            {/* Top Interactive Toolbar (Collapsible & Grouped Style) */}
            <div
                className={`px-2 sm:px-3 py-1.5 border-b flex items-center justify-between gap-1.5 sm:gap-2 z-30 flex-shrink-0 overflow-visible whitespace-nowrap ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}
            >
                {/* Left: Mode Title & Tools */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    {/* Active Mode Indicator Badge */}
                    <div
                        className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-bold border shrink-0 ${
                            isErMode
                                ? isLight
                                    ? 'bg-sky-50 border-sky-300 text-sky-800'
                                    : 'bg-sky-950/60 border-sky-800 text-sky-300'
                                : isLight
                                ? 'bg-purple-50 border-purple-300 text-purple-800'
                                : 'bg-purple-950/60 border-purple-800 text-purple-300'
                        }`}
                        title={isErMode ? 'ER Diagram Designer (Active for SQL/PL-SQL)' : 'Flowchart Designer (Active for Python/C/C++/Java)'}
                    >
                        {isErMode ? (
                            <>
                                <Database className="w-3.5 h-3.5 text-sky-500" />
                                <span className="hidden sm:inline">ER Diagram (DBMS)</span>
                                <span className="sm:hidden inline">ER</span>
                            </>
                        ) : (
                            <>
                                <Shapes className="w-3.5 h-3.5 text-purple-500" />
                                <span className="hidden sm:inline">Flowchart Designer</span>
                                <span className="sm:hidden inline">Flowchart</span>
                            </>
                        )}
                    </div>

                    {/* Pointer / Navigation Tools (Segmented Control) */}
                    <div
                        className={`flex items-center rounded-lg p-0.5 border shrink-0 ${
                            isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-800 border-slate-700'
                        }`}
                    >
                        <button
                            onClick={() => {
                                setActiveTool('select');
                                setConnectingSource(null);
                                setConnectingMousePos(null);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                activeTool === 'select'
                                    ? isLight
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'bg-slate-700 text-white shadow-xs'
                                    : isLight
                                    ? 'text-slate-600 hover:text-slate-900'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                            title="Pointer / Select Tool (V)"
                        >
                            <MousePointer className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Select</span>
                        </button>

                        <button
                            onClick={() => {
                                setActiveTool('pan');
                                setSelectedNodeIds([]);
                                setSelectedConnectorId(null);
                                setConnectingSource(null);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                activeTool === 'pan'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : isLight
                                    ? 'text-slate-600 hover:text-slate-900'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                            title="Hand / Pan Tool (H): Click and drag canvas to navigate"
                        >
                            <Hand className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Hand</span>
                        </button>

                        <button
                            onClick={() => {
                                setActiveTool('connector');
                                setSelectedNodeId(null);
                                setSelectedConnectorId(null);
                            }}
                            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                activeTool === 'connector'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : isLight
                                    ? 'text-slate-600 hover:text-slate-900'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                            title="Connector Tool: Click shape hooks to link with directed arrows"
                        >
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Connector</span>
                            <span className="md:hidden inline">Link</span>
                        </button>
                    </div>

                    <div className={`h-4 w-px mx-0.5 ${isLight ? 'bg-slate-300' : 'bg-slate-700'}`} />

                    {/* ER SUB-VIEW SWITCHER: Database Designer (Tables with Columns) vs Conceptual ERD (Chen Notation) */}
                    {isErMode && (
                        <div className={`flex items-center rounded-lg p-0.5 border text-xs font-semibold ${
                            isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-800 border-slate-700'
                        }`}>
                            <button
                                type="button"
                                onClick={() => setErSubView('relational')}
                                title="Database Designer: Relational table cards with columns, types & PK/FK properties inside the card"
                                className={`flex items-center gap-1 px-2 py-1 rounded-md transition cursor-pointer text-[11px] ${
                                    erSubView === 'relational'
                                        ? isLight
                                            ? 'bg-white text-primary-700 shadow-xs'
                                            : 'bg-slate-700 text-primary-300 shadow-xs'
                                        : isLight
                                        ? 'text-slate-600 hover:text-slate-900'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Table className="w-3 h-3 text-primary-500" />
                                <span className="hidden sm:inline">Database Designer</span>
                                <span className="sm:hidden inline">Tables</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setErSubView('chen')}
                                title="Conceptual ERD: Chen notation with Entities (rectangles), Attributes (ovals) & Relationships (diamonds)"
                                className={`flex items-center gap-1 px-2 py-1 rounded-md transition cursor-pointer text-[11px] ${
                                    erSubView === 'chen'
                                        ? isLight
                                            ? 'bg-white text-purple-700 shadow-xs'
                                            : 'bg-slate-700 text-purple-300 shadow-xs'
                                        : isLight
                                        ? 'text-slate-600 hover:text-slate-900'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Layers className="w-3 h-3 text-purple-500" />
                                <span className="hidden sm:inline">Conceptual ERD</span>
                                <span className="sm:hidden inline">Chen ER</span>
                            </button>
                        </div>
                    )}

                    {/* COLLAPSIBLE SHAPES SELECTOR (Grouped Dropdown + Expandable Ribbon) */}
                    <div className="relative" ref={shapesDropdownRef}>
                        <button
                            onClick={() => setShowShapesDropdown(!showShapesDropdown)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer shadow-xs ${
                                pendingShapeType
                                    ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-400/40'
                                    : showShapesDropdown
                                    ? isLight ? 'bg-slate-200 border-slate-400 text-slate-900' : 'bg-slate-800 border-slate-600 text-white'
                                    : isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                            }`}
                            title="Choose Shape from Palette (Click to open collapsible shape picker)"
                        >
                            <Shapes className="w-3.5 h-3.5 text-indigo-400" />
                            <span>
                                {pendingShapeType
                                    ? `Place: ${pendingShapeType.replace('er_', '').replace(/_/g, ' ').toUpperCase()}`
                                    : (isErMode ? (erSubView === 'relational' ? 'Table Shapes' : 'ER Shapes') : 'Flow Shapes')}
                            </span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>

                        {/* Collapsible Dropdown Palette */}
                        {showShapesDropdown && (
                            <div className={`absolute left-0 top-full mt-1.5 w-72 p-2 rounded-xl shadow-2xl border z-50 animate-in fade-in slide-in-from-top-1 text-xs select-none max-h-96 overflow-y-auto ${
                                isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
                            }`}>
                                {(isErMode ? (erSubView === 'relational' ? RELATIONAL_SHAPES : CHEN_ER_SHAPES) : FLOWCHART_SHAPES).map((cat, cIdx) => (
                                    <div key={cIdx} className={cIdx > 0 ? 'mt-2 pt-2 border-t border-slate-200 dark:border-slate-800' : ''}>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 px-1 mb-1">
                                            {cat.category}
                                        </p>
                                        <div className="grid grid-cols-1 gap-1">
                                            {cat.items.map((s) => {
                                                const isShapeActive = pendingShapeType === s.id;
                                                return (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => {
                                                            handleSelectShapeToPlace(s.id);
                                                            setShowShapesDropdown(false);
                                                        }}
                                                        className={`w-full text-left px-2 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center justify-between shadow-2xs ${
                                                            isShapeActive
                                                                ? 'ring-2 ring-indigo-500 bg-indigo-100 text-indigo-900 border-indigo-400 dark:bg-indigo-950 dark:text-indigo-200'
                                                                : `${s.color} hover:opacity-90`
                                                        }`}
                                                        title={`${s.title} (Select then click canvas)`}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            {s.icon}
                                                            <span>{s.label}</span>
                                                        </span>
                                                        {isShapeActive && <Check className="w-3 h-3 text-indigo-600" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 px-1">
                                    <span>Tip: Click canvas to place</span>
                                    <button
                                        onClick={() => {
                                            setIsShapesExpanded(!isShapesExpanded);
                                            setShowShapesDropdown(false);
                                        }}
                                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                                    >
                                        {isShapesExpanded ? 'Collapse Ribbon' : 'Expand Ribbon'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Optional Expanded Shapes Ribbon (When user toggles Expand Ribbon) */}
                    {isShapesExpanded && (
                        <div className="hidden lg:flex items-center gap-1 pl-1">
                            {(isErMode ? ER_SHAPES.flatMap(c => c.items) : FLOWCHART_SHAPES.flatMap(c => c.items)).map((s) => {
                                const isShapeActive = pendingShapeType === s.id;
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => handleSelectShapeToPlace(s.id)}
                                        className={`px-2 py-1 rounded border text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-xs ${
                                            isShapeActive
                                                ? 'ring-2 ring-indigo-500 bg-indigo-100 text-indigo-900 border-indigo-400 dark:bg-indigo-950 dark:text-indigo-200'
                                                : `${s.color} hover:opacity-90`
                                        }`}
                                        title={`${s.title} (Click then click canvas)`}
                                    >
                                        {s.icon}
                                        <span>{s.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right: Actions, Fullscreen & Controls */}
                <div className="flex items-center gap-1 sm:gap-1.5 text-xs shrink-0">
                    {/* TRADITIONAL RULE-BASED GENERATOR (NO AI) */}
                    <button
                        onClick={handleTraditionalGenerate}
                        className="px-2 sm:px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded shadow-xs flex items-center gap-1 transition cursor-pointer shrink-0"
                        title={`Generate ${isErMode ? 'ER Diagram' : 'Flowchart'} automatically from editor code using static parser (Traditional rule-based, 100% offline, 0 AI calls)`}
                    >
                        <Cpu className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                        <span className="hidden md:inline">Generate from Code (No AI)</span>
                        <span className="md:hidden inline">Generate</span>
                    </button>

                    {/* Export PNG */}
                    <button
                        onClick={() => handleExportCanvas('png')}
                        className="px-2 sm:px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded font-bold shadow-xs flex items-center gap-1 transition cursor-pointer shrink-0"
                        title="Download as PNG Image"
                    >
                        <Download className="w-3.5 h-3.5 shrink-0" />
                        <span className="hidden md:inline">Export PNG</span>
                        <span className="md:hidden inline">PNG</span>
                    </button>

                    {/* Starter Template - ONLY for Flowchart mode (ZERO templates for ER mode) */}
                    {!isErMode && (
                        <button
                            onClick={handleResetToTemplate}
                            className={`p-1.5 rounded transition cursor-pointer shrink-0 ${
                                isLight ? 'text-slate-500 hover:text-sky-600 hover:bg-slate-100' : 'text-slate-400 hover:text-sky-400 hover:bg-slate-800'
                            }`}
                            title="Load Starter Flowchart Example"
                        >
                            <Layers className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {/* Clear Canvas */}
                    <button
                        onClick={handleClearCanvas}
                        className={`p-1.5 rounded transition cursor-pointer shrink-0 ${
                            isLight ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40'
                        }`}
                        title="Clear Canvas"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className={`h-4 w-px mx-0.5 ${isLight ? 'bg-slate-300' : 'bg-slate-700'}`} />

                    {/* FULLSCREEN OVERLAY TOGGLE BUTTON */}
                    <button
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className={`px-2 sm:px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                            isFullScreen
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400/40'
                                : isLight
                                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                        }`}
                        title={isFullScreen ? 'Exit Fullscreen Overlay (Esc)' : 'Expand Designer to Fullscreen Overlay'}
                        aria-label="Toggle Fullscreen"
                    >
                        {isFullScreen ? (
                            <>
                                <Minimize2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Exit Fullscreen</span>
                            </>
                        ) : (
                            <>
                                <Maximize2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Fullscreen</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Sub-Bar: Selected Connector Cardinality Quick-Tagger */}
            {selectedConnectorId && (
                <div
                    className={`px-3 py-1.5 border-b flex flex-wrap items-center justify-between text-xs z-10 ${
                        isLight ? 'bg-amber-50/90 border-amber-200 text-amber-900' : 'bg-amber-950/60 border-amber-800 text-amber-200'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <span className="font-bold flex items-center gap-1">
                            <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                            <span>Cardinality Tag:</span>
                        </span>
                        <div className="flex flex-wrap items-center gap-1">
                            {CARDINALITY_OPTIONS.map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => handleSetConnectorCardinality(opt)}
                                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 font-mono text-[11px] font-bold hover:bg-amber-100 transition cursor-pointer shadow-2xs"
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                    <span className="text-[11px] text-amber-700 dark:text-amber-300 italic hidden md:inline">
                        Double-click connector pill to type custom label
                    </span>
                </div>
            )}

            {/* Instruction Banner when Connector Mode or Dragging Hook is Active */}
            {(activeTool === 'connector' || Boolean(connectingSource)) && (
                <div
                    className={`border-b px-3 py-1.5 text-xs flex items-center justify-between z-10 ${
                        isLight
                            ? 'bg-purple-50 border-purple-200 text-purple-900'
                            : 'bg-purple-950/80 border-purple-800 text-purple-200'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                        <span className="font-semibold">
                            {connectingSource
                                ? 'Tap any destination shape or port to complete connection!'
                                : 'Connector Mode: Tap any shape or port to start linking.'}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTool('select');
                            setConnectingSource(null);
                            setConnectingMousePos(null);
                        }}
                        className={`text-[11px] font-bold underline cursor-pointer ${
                            isLight ? 'text-purple-700 hover:text-purple-950' : 'text-purple-300 hover:text-white'
                        }`}
                    >
                        {connectingSource ? 'Cancel Link' : 'Exit Connector Mode'}
                    </button>
                </div>
            )}

            {/* Canvas Main SVG Layer */}
            <div
                className={`flex-1 w-full h-full relative overflow-hidden select-none ${
                    activeTool === 'pan'
                        ? isPanning ? 'cursor-grabbing' : 'cursor-grab'
                        : 'cursor-default'
                }`}
                onPointerDown={handleCanvasPointerDown}
            >
                {/* Floating Fixed Top-Right Zoom Tool */}
                <div
                    className={`absolute top-3 right-3 z-20 flex items-center gap-1 p-1 rounded-lg border shadow-md backdrop-blur-md transition select-none ${
                        isLight
                            ? 'bg-white/90 border-slate-200 text-slate-700 shadow-slate-200/50'
                            : 'bg-slate-900/90 border-slate-700 text-slate-200 shadow-slate-950/50'
                    }`}
                >
                    <button
                        onClick={() => setZoom((prev) => Math.max(0.3, +(prev - 0.15).toFixed(2)))}
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Zoom Out (-)"
                    >
                        <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setZoom(1)}
                        className="px-2 py-0.5 text-xs font-mono font-bold hover:underline cursor-pointer"
                        title="Click to reset zoom to 100%"
                    >
                        {Math.round(zoom * 100)}%
                    </button>
                    <button
                        onClick={() => setZoom((prev) => Math.min(2.5, +(prev + 0.15).toFixed(2)))}
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Zoom In (+)"
                    >
                        <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => {
                            setZoom(1);
                            setPan({ x: 0, y: 0 });
                        }}
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition border-l border-slate-200 dark:border-slate-700 cursor-pointer"
                        title="Reset Canvas View (Recenter)"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition border-l border-slate-200 dark:border-slate-700 cursor-pointer"
                        title={isFullScreen ? 'Exit Fullscreen Overlay (Esc)' : 'Expand Designer to Fullscreen Overlay'}
                    >
                        {isFullScreen ? <Minimize2 className="w-3.5 h-3.5 text-indigo-500" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                </div>

                {/* Floating Shape Placement Helper Pill */}
                {pendingShapeType && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-semibold shadow-lg flex items-center gap-2 select-none animate-in fade-in slide-in-from-top-2">
                        <span>Click canvas to place {pendingShapeType.replace('er_', 'ER ').toUpperCase()}</span>
                        <button
                            onClick={() => {
                                setPendingShapeType(null);
                                setActiveTool('select');
                            }}
                            className="p-0.5 rounded-full hover:bg-white/20 transition cursor-pointer"
                            title="Cancel placement (Esc)"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {/* Empty Canvas Watermark / Guide */}
                {nodes.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center p-6 space-y-2 z-0">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-2xs ${
                            isLight ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}>
                            {isErMode ? <Database className="w-6 h-6" /> : <Shapes className="w-6 h-6" />}
                        </div>
                        <p className={`text-sm font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            Empty {isErMode ? 'ER Diagram' : 'Flowchart'} Canvas
                        </p>
                        <p className={`text-xs max-w-sm ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                            Select a shape from the toolbar above and click on canvas to place it, or click{' '}
                            <span className="font-semibold text-primary-600 dark:text-primary-400">Generate from Code</span> to auto-generate from your script.
                        </p>
                    </div>
                )}

                <svg
                    ref={svgRef}
                    id="flowchart-svg-canvas"
                    className="w-full h-full absolute inset-0"
                    onContextMenu={(e) => handleContextMenu(e, 'canvas')}
                    style={{
                        backgroundImage: isLight
                            ? `radial-gradient(#cbd5e1 1.2px, transparent 1.2px)`
                            : `radial-gradient(#334155 1.2px, transparent 1.2px)`,
                        backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                        backgroundPosition: `${pan.x}px ${pan.y}px`,
                        touchAction: 'none'
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
                            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={isLight ? '#4f46e5' : '#6366f1'} />
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
                            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#8b5cf6" />
                        </marker>
                    </defs>

                    {/* Master Zoom and Pan Group */}
                    <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                        {/* Ghost Shape Placement Preview */}
                        {pendingShapeType && canvasMousePos && (() => {
                            const cfg = getShapeConfig(pendingShapeType);
                            const ghostNode = {
                                id: 'ghost_preview',
                                type: pendingShapeType,
                                text: cfg.defaultText,
                                x: Math.round(canvasMousePos.x - cfg.width / 2),
                                y: Math.round(canvasMousePos.y - cfg.height / 2),
                                width: cfg.width,
                                height: cfg.height,
                                color: cfg.color,
                                borderColor: cfg.borderColor,
                                textColor: cfg.textColor
                            };
                            return (
                                <g transform={`translate(${ghostNode.x}, ${ghostNode.y})`} className="pointer-events-none opacity-45">
                                    {renderShapeGeometry(ghostNode, false, false)}
                                    <text
                                        x={ghostNode.width / 2}
                                        y={ghostNode.height / 2}
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        fill={ghostNode.textColor}
                                        fontSize={12}
                                        fontFamily="sans-serif"
                                    >
                                        {ghostNode.text.split('\n')[0]}
                                    </text>
                                </g>
                            );
                        })()}

                        {/* Marquee Drag-To-Select Box */}
                        {marqueeBox && (() => {
                            const x = Math.min(marqueeBox.startX, marqueeBox.currentX);
                            const y = Math.min(marqueeBox.startY, marqueeBox.currentY);
                            const w = Math.abs(marqueeBox.currentX - marqueeBox.startX);
                            const h = Math.abs(marqueeBox.currentY - marqueeBox.startY);
                            return (
                                <rect
                                    x={x}
                                    y={y}
                                    width={w}
                                    height={h}
                                    fill={isLight ? 'rgba(99, 102, 241, 0.12)' : 'rgba(129, 140, 248, 0.18)'}
                                    stroke={isLight ? '#6366f1' : '#818cf8'}
                                    strokeWidth={1.5}
                                    strokeDasharray="4 3"
                                    className="pointer-events-none"
                                />
                            );
                        })()}

                        {/* 1. CONNECTORS LAYER */}
                        {connectors.map((conn) => {
                            const data = getConnectorPathData(conn);
                            if (!data) return null;
                            const isSelected = selectedConnectorId === conn.id;
                            const showArrow = !isErMode || Boolean(conn.label);

                            return (
                                <g
                                    key={conn.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedConnectorId(conn.id);
                                        setSelectedNodeIds([]);
                                    }}
                                    onContextMenu={(e) => handleContextMenu(e, 'connector', conn.id)}
                                    className="cursor-pointer group"
                                >
                                    {/* Hit target */}
                                    <path
                                        d={data.pathD}
                                        fill="none"
                                        stroke="transparent"
                                        strokeWidth={16}
                                        className="cursor-pointer"
                                    />

                                    {/* Visible Curved Connector Line */}
                                    <path
                                        d={data.pathD}
                                        fill="none"
                                        stroke={
                                            isSelected
                                                ? '#8b5cf6'
                                                : isLight
                                                ? '#475569'
                                                : '#94a3b8'
                                        }
                                        strokeWidth={isSelected ? 3 : 2}
                                        markerEnd={showArrow ? (isSelected ? 'url(#flowchart-arrowhead-selected)' : 'url(#flowchart-arrowhead)') : undefined}
                                        className="group-hover:stroke-purple-500"
                                    />

                                    {/* Midpoint Cardinality / Label Pill */}
                                    {conn.label && (
                                        <g
                                            transform={`translate(${data.midX}, ${data.midY})`}
                                            onDoubleClick={(e) => handleConnectorPillDoubleClick(e, conn)}
                                            className="cursor-pointer"
                                        >
                                            <rect
                                                x={-(conn.label.length * 4.5 + 10)}
                                                y={-11}
                                                width={conn.label.length * 9 + 20}
                                                height={22}
                                                rx={11}
                                                ry={11}
                                                fill={
                                                    isSelected
                                                        ? '#8b5cf6'
                                                        : isLight
                                                        ? '#ffffff'
                                                        : '#1e293b'
                                                }
                                                stroke={
                                                    isSelected
                                                        ? '#7c3aed'
                                                        : isLight
                                                        ? '#cbd5e1'
                                                        : '#475569'
                                                }
                                                strokeWidth={1.5}
                                                className="drop-shadow-sm group-hover:stroke-purple-500"
                                            />
                                            <text
                                                textAnchor="middle"
                                                dominantBaseline="central"
                                                fill={
                                                    isSelected
                                                        ? '#ffffff'
                                                        : isLight
                                                        ? '#0f172a'
                                                        : '#f8fafc'
                                                }
                                                fontSize={11}
                                                fontWeight="700"
                                                fontFamily="monospace"
                                            >
                                                {conn.label}
                                            </text>
                                        </g>
                                    )}
                                </g>
                            );
                        })}

                        {/* Interactive Dragged Live Connector Line - Smooth Bézier Curve (NOT a straight dotted line) */}
                        {connectingSource && connectingMousePos && (() => {
                            const fromNode = nodes.find((n) => n.id === connectingSource.nodeId);
                            if (!fromNode) return null;
                            const start = getPortCoordinates(fromNode, connectingSource.port);
                            const end = connectingMousePos;

                            const normalOffsets = {
                                top: { x: 0, y: -1 },
                                bottom: { x: 0, y: 1 },
                                left: { x: -1, y: 0 },
                                right: { x: 1, y: 0 }
                            };
                            const norm = normalOffsets[connectingSource.port] || { x: 0, y: 1 };
                            const dist = Math.hypot(end.x - start.x, end.y - start.y);
                            const curvature = Math.min(Math.max(dist * 0.45, 25), 120);

                            const cp1 = { x: start.x + norm.x * curvature, y: start.y + norm.y * curvature };
                            const cp2 = { x: end.x, y: end.y };
                            const livePathD = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;

                            return (
                                <path
                                    d={livePathD}
                                    fill="none"
                                    stroke="#8b5cf6"
                                    strokeWidth={2.5}
                                    markerEnd="url(#flowchart-arrowhead-selected)"
                                    className="pointer-events-none drop-shadow-sm"
                                />
                            );
                        })()}

                        {/* 2. SHAPES / NODES LAYER - Encapsulated into unified Translate Group (Zero Lag, Perfectly Synchronized) */}
                        {nodes.map((node) => {
                            const isSelected = selectedNodeIds.includes(node.id);
                            const isConnectingSource = connectingSource?.nodeId === node.id;
                            const isHovered = hoveredNodeId === node.id;

                            // Local port relative positions
                            const portLocs = {
                                top: { x: node.width / 2, y: 0 },
                                right: { x: node.type === 'io' ? node.width - 9 : node.width, y: node.height / 2 },
                                bottom: { x: node.width / 2, y: node.height },
                                left: { x: node.type === 'io' ? 9 : 0, y: node.height / 2 }
                            };

                            return (
                                <g
                                    key={node.id}
                                    transform={`translate(${node.x}, ${node.y})`}
                                    onPointerDown={(e) => handleNodePointerDown(e, node)}
                                    onContextMenu={(e) => handleContextMenu(e, 'node', node.id)}
                                    onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
                                    onPointerEnter={() => setHoveredNodeId(node.id)}
                                    onPointerLeave={() => setHoveredNodeId(null)}
                                    className="cursor-move select-none"
                                >
                                    {/* Shape Geometry */}
                                    {renderShapeGeometry(node, isSelected, isConnectingSource)}

                                    {/* Inner Text Content */}
                                    {node.type === 'er_table' ? (
                                        <g className="pointer-events-none">
                                            <text
                                                x={node.width / 2}
                                                y={16}
                                                textAnchor="middle"
                                                fill="#ffffff"
                                                fontSize={11}
                                                fontWeight="bold"
                                                fontFamily="monospace"
                                            >
                                                {node.text.split('\n')[0] || 'table'}
                                            </text>
                                            {node.text.split('\n').slice(1).map((line, lIdx) => (
                                                <text
                                                    key={lIdx}
                                                    x={8}
                                                    y={40 + lIdx * 18}
                                                    fill={line.includes('PK') ? '#d97706' : node.textColor}
                                                    fontSize={10}
                                                    fontWeight={line.includes('PK') ? 'bold' : 'normal'}
                                                    fontFamily="monospace"
                                                >
                                                    {line.includes('PK') ? `🔑 ${line}` : `• ${line}`}
                                                </text>
                                            ))}
                                        </g>
                                    ) : node.text.includes('\n') ? (
                                        <text
                                            x={node.width / 2}
                                            y={node.height / 2 - ((node.text.split('\n').length - 1) * 8.5)}
                                            textAnchor="middle"
                                            dominantBaseline="central"
                                            fill={node.textColor}
                                            fontSize={11.5}
                                            fontWeight="600"
                                            fontFamily="monospace"
                                            className="pointer-events-none"
                                        >
                                            {node.text.split('\n').map((line, lIdx) => (
                                                <tspan
                                                    key={lIdx}
                                                    x={node.width / 2}
                                                    dy={lIdx === 0 ? 0 : 17}
                                                >
                                                    {line}
                                                </tspan>
                                            ))}
                                        </text>
                                    ) : (
                                        <text
                                            x={node.width / 2}
                                            y={node.height / 2}
                                            textAnchor="middle"
                                            dominantBaseline="central"
                                            fill={node.textColor}
                                            fontSize={node.type.startsWith('er_') ? 12 : 12.5}
                                            fontWeight={node.type === 'er_entity' || node.type === 'er_relationship' || node.type === 'er_key_attribute' ? '700' : '600'}
                                            fontFamily="sans-serif"
                                            textDecoration={node.type === 'er_key_attribute' ? 'underline' : 'none'}
                                            className="pointer-events-none"
                                        >
                                            {node.type === 'er_key_attribute' ? `🔑 ${node.text}` : node.text}
                                        </text>
                                    )}

                                    {/* 3. CARDINAL HOOK DOCKING PORTS (Positioned Relative to Node - Pinned Rigorously) */}
                                    {(isSelected || isHovered || isConnectingSource || activeTool === 'connector') &&
                                        PORTS.map((port) => {
                                            const loc = portLocs[port];
                                            const isThisHookActive = connectingSource?.nodeId === node.id && connectingSource?.port === port;
                                            const isThisHookHovered = hoveredPortInfo?.nodeId === node.id && hoveredPortInfo?.port === port;

                                            return (
                                                <g
                                                    key={port}
                                                    className="cursor-crosshair"
                                                    onPointerDown={(e) => handlePortPointerDown(e, node.id, port)}
                                                    onPointerUp={(e) => {
                                                        e.stopPropagation();
                                                        if (connectingSource) {
                                                            completeConnection(node.id, port);
                                                        }
                                                    }}
                                                    onTouchEnd={(e) => {
                                                        e.stopPropagation();
                                                        if (connectingSource) {
                                                            completeConnection(node.id, port);
                                                        }
                                                    }}
                                                    onPointerEnter={() => setHoveredPortInfo({ nodeId: node.id, port })}
                                                    onPointerLeave={() => setHoveredPortInfo(null)}
                                                >
                                                    {/* Invisible large hit target circle (20px radius for touch) */}
                                                    <circle
                                                        cx={loc.x}
                                                        cy={loc.y}
                                                        r={20}
                                                        fill="transparent"
                                                        className="cursor-crosshair"
                                                    />

                                                    {/* Outer Aura Ring */}
                                                    {(isThisHookHovered || isThisHookActive) && (
                                                        <circle
                                                            cx={loc.x}
                                                            cy={loc.y}
                                                            r={10}
                                                            fill="none"
                                                            stroke="#8b5cf6"
                                                            strokeWidth={2}
                                                            strokeDasharray="3,2"
                                                        />
                                                    )}

                                                    {/* Hook Port Center Dot */}
                                                    <circle
                                                        cx={loc.x}
                                                        cy={loc.y}
                                                        r={isThisHookActive || isThisHookHovered ? 6 : 4}
                                                        fill={
                                                            isThisHookActive
                                                                ? '#8b5cf6'
                                                                : isThisHookHovered
                                                                ? '#3b82f6'
                                                                : isLight
                                                                ? '#ffffff'
                                                                : '#1e293b'
                                                        }
                                                        stroke={
                                                            isThisHookActive
                                                                ? '#ffffff'
                                                                : isThisHookHovered
                                                                ? '#1d4ed8'
                                                                : isLight
                                                                ? '#94a3b8'
                                                                : '#64748b'
                                                        }
                                                        strokeWidth={isThisHookActive || isThisHookHovered ? 2.5 : 1.5}
                                                        className="drop-shadow-xs"
                                                    />
                                                </g>
                                            );
                                        })}
                                </g>
                            );
                        })}
                    </g>
                </svg>

                {/* 4. FLICKER-FREE HTML OVERLAY FOR DIRECT IN-PLACE TEXT EDITING */}
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
                            {node.type === 'er_table' || node.text.includes('\n') ? (
                                <textarea
                                    autoFocus
                                    value={editingNodeText}
                                    onChange={(e) => setEditingNodeText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') setEditingNodeId(null);
                                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveNodeText();
                                    }}
                                    onBlur={handleSaveNodeText}
                                    className={`w-full h-full p-1.5 rounded text-xs font-mono focus:outline-none shadow-2xl ring-2 ring-sky-500 border-2 border-sky-500 resize-none ${
                                        isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                                    }`}
                                />
                            ) : (
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
                                    className={`w-full text-center px-1 py-1 rounded text-xs font-bold focus:outline-none shadow-2xl ring-2 ring-purple-500/40 border-2 border-purple-500 ${
                                        isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                                    }`}
                                />
                            )}
                        </div>
                    );
                })()}

                {/* Connector Pill Label Inline Editor */}
                {editingConnectorId && (() => {
                    const conn = connectors.find((c) => c.id === editingConnectorId);
                    if (!conn) return null;
                    const data = getConnectorPathData(conn);
                    if (!data) return null;

                    const screenX = pan.x + data.midX * zoom - 40;
                    const screenY = pan.y + data.midY * zoom - 15;

                    return (
                        <div
                            style={{
                                position: 'absolute',
                                left: `${screenX}px`,
                                top: `${screenY}px`,
                                width: '80px',
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
                                placeholder="1:N / Yes"
                                className={`w-full text-center px-1 py-0.5 rounded-full text-xs font-bold font-mono focus:outline-none shadow-2xl ring-2 ring-purple-500/40 border-2 border-purple-500 ${
                                    isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                                }`}
                            />
                        </div>
                    );
                })()}
            </div>

            {/* Bottom Status / Keyboard Shortcuts Tip Bar (Hidden on mobile to maximize canvas viewport) */}
            <div
                className={`hidden lg:flex px-3 py-1.5 border-t text-[11px] items-center justify-between z-10 flex-shrink-0 ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
            >
                <span className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                    <span>
                        <strong className={isLight ? 'text-slate-800' : 'text-slate-300'}>Hooks:</strong> Click any hook dot to link • <strong className={isLight ? 'text-slate-800' : 'text-slate-300'}>Zero-Lag Drag:</strong> Text and hooks move in sync • <strong className={isLight ? 'text-slate-800' : 'text-slate-300'}>Shortcuts:</strong> Ctrl+C copy, Ctrl+X cut, Ctrl+V paste, Del delete
                    </span>
                </span>
                <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                    {nodes.length} components • {connectors.length} connections • Mode: {isErMode ? 'ER Diagram (DBMS)' : 'Flowchart (Logic)'}
                </span>
            </div>

            {/* Custom Right-Click Context Menu */}
            {contextMenu && (
                <div
                    className={`fixed z-50 py-1.5 rounded-xl border shadow-2xl min-w-[170px] text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 select-none ${
                        isLight
                            ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/50'
                            : 'bg-slate-900/95 border-slate-700 text-slate-100 shadow-slate-950/80'
                    }`}
                    style={{ left: Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 180 : contextMenu.x), top: Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 200 : contextMenu.y) }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {contextMenu.targetType === 'node' && (
                        <>
                            <button
                                onClick={() => {
                                    cutSelected();
                                    setContextMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-left transition cursor-pointer"
                            >
                                <Scissors className="w-3.5 h-3.5 text-slate-400" />
                                <span>Cut</span>
                                <span className="ml-auto text-[10px] text-slate-400 font-mono">Ctrl+X</span>
                            </button>
                            <button
                                onClick={() => {
                                    copySelected();
                                    setContextMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-left transition cursor-pointer"
                            >
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                <span>Copy</span>
                                <span className="ml-auto text-[10px] text-slate-400 font-mono">Ctrl+C</span>
                            </button>
                            {clipboardRef.current && (
                                <button
                                    onClick={() => {
                                        pasteClipboard(contextMenu.canvasPos);
                                        setContextMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-left transition cursor-pointer"
                                >
                                    <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Paste</span>
                                    <span className="ml-auto text-[10px] text-slate-400 font-mono">Ctrl+V</span>
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    const node = nodes.find((n) => n.id === contextMenu.targetId);
                                    if (node) {
                                        setEditingNodeId(node.id);
                                        setEditingNodeText(node.text);
                                    }
                                    setContextMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-left transition cursor-pointer"
                            >
                                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                <span>Edit Text</span>
                                <span className="ml-auto text-[10px] text-slate-400 font-mono">Enter</span>
                            </button>
                            <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                            <button
                                onClick={() => {
                                    deleteSelectedNodes();
                                    setContextMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-left transition cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Shape</span>
                                <span className="ml-auto text-[10px] text-slate-400 font-mono">Del</span>
                            </button>
                        </>
                    )}

                    {contextMenu.targetType === 'connector' && (
                        <>
                            <button
                                onClick={() => {
                                    const conn = connectors.find((c) => c.id === contextMenu.targetId);
                                    if (conn) {
                                        setEditingConnectorId(conn.id);
                                        setEditingConnectorLabel(conn.label || '');
                                    }
                                    setContextMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-left transition cursor-pointer"
                            >
                                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                <span>Edit Label</span>
                            </button>
                            <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                            <button
                                onClick={() => {
                                    deleteConnector(contextMenu.targetId);
                                    setContextMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-left transition cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Connector</span>
                                <span className="ml-auto text-[10px] text-slate-400 font-mono">Del</span>
                            </button>
                        </>
                    )}

                    {contextMenu.targetType === 'canvas' && (
                        <>
                            {clipboardRef.current && (
                                <button
                                    onClick={() => {
                                        pasteClipboard(contextMenu.canvasPos);
                                        setContextMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-left transition cursor-pointer"
                                >
                                    <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Paste Here</span>
                                    <span className="ml-auto text-[10px] text-slate-400 font-mono">Ctrl+V</span>
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setSelectedNodeIds(nodes.map((n) => n.id));
                                    setContextMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-left transition cursor-pointer"
                            >
                                <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                                <span>Select All</span>
                                <span className="ml-auto text-[10px] text-slate-400 font-mono">Ctrl+A</span>
                            </button>
                            <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                            <button
                                onClick={() => {
                                    setShowClearConfirmModal(true);
                                    setContextMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-left transition cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Clear Canvas...</span>
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Clear Canvas UI-Aligned Confirmation Modal */}
            {showClearConfirmModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
                    onClick={() => setShowClearConfirmModal(false)}
                >
                    <div
                        className={`w-full max-w-sm rounded-2xl p-5 border shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 ${
                            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 shrink-0 border border-rose-200 dark:border-rose-900">
                                <AlertTriangle className="w-5 h-5 text-rose-600" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-sm">Clear Canvas?</h3>
                                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Are you sure you want to clear all {nodes.length} shape(s) and {connectors.length} connection(s)? This action cannot be undone.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowClearConfirmModal(false)}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                                    isLight
                                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={executeClearCanvas}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer shadow-sm"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
