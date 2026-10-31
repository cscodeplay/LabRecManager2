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
    Clipboard,
    Sun,
    Moon,
    Database,
    Key,
    Sparkles,
    Table,
    Layers,
    Code,
    CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

// 1. Initial Starter Flowchart Nodes & Connectors (For Python / Algorithmic Flow)
const DEFAULT_INITIAL_FLOWCHART_NODES = [
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
        color: '#ffffff',
        borderColor: '#64748b',
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

const DEFAULT_INITIAL_FLOWCHART_CONNECTORS = [
    { id: 'conn_1', from: 'node_start', fromPort: 'bottom', to: 'node_input', toPort: 'top', label: '' },
    { id: 'conn_2', from: 'node_input', fromPort: 'bottom', to: 'node_decision', toPort: 'top', label: '' },
    { id: 'conn_3', from: 'node_decision', fromPort: 'bottom', to: 'node_process', toPort: 'top', label: 'Yes' },
    { id: 'conn_4', from: 'node_process', fromPort: 'bottom', to: 'node_end', toPort: 'top', label: '' }
];

// 2. Initial Starter ER Diagram Nodes & Connectors (For SQL / DBMS Schema Design)
const DEFAULT_INITIAL_ER_NODES = [
    {
        id: 'node_er_student',
        type: 'er_entity',
        text: 'STUDENT',
        x: 120,
        y: 150,
        width: 140,
        height: 54,
        color: '#e0f2fe',
        borderColor: '#0284c7',
        textColor: '#0369a1'
    },
    {
        id: 'node_er_roll',
        type: 'er_key_attribute',
        text: 'roll_no',
        x: 35,
        y: 40,
        width: 110,
        height: 44,
        color: '#fef3c7',
        borderColor: '#d97706',
        textColor: '#78350f'
    },
    {
        id: 'node_er_name',
        type: 'er_attribute',
        text: 'name',
        x: 180,
        y: 40,
        width: 110,
        height: 44,
        color: '#f0fdf4',
        borderColor: '#16a34a',
        textColor: '#15803d'
    },
    {
        id: 'node_er_email',
        type: 'er_attribute',
        text: 'email',
        x: 35,
        y: 260,
        width: 110,
        height: 44,
        color: '#f0fdf4',
        borderColor: '#16a34a',
        textColor: '#15803d'
    },
    {
        id: 'node_er_enrolls',
        type: 'er_relationship',
        text: 'ENROLLS',
        x: 330,
        y: 145,
        width: 130,
        height: 64,
        color: '#fef9c3',
        borderColor: '#ca8a04',
        textColor: '#854d0e'
    },
    {
        id: 'node_er_course',
        type: 'er_entity',
        text: 'COURSE',
        x: 530,
        y: 150,
        width: 140,
        height: 54,
        color: '#e0f2fe',
        borderColor: '#0284c7',
        textColor: '#0369a1'
    },
    {
        id: 'node_er_cid',
        type: 'er_key_attribute',
        text: 'course_id',
        x: 485,
        y: 40,
        width: 115,
        height: 44,
        color: '#fef3c7',
        borderColor: '#d97706',
        textColor: '#78350f'
    },
    {
        id: 'node_er_cname',
        type: 'er_attribute',
        text: 'title',
        x: 630,
        y: 40,
        width: 110,
        height: 44,
        color: '#f0fdf4',
        borderColor: '#16a34a',
        textColor: '#15803d'
    },
    {
        id: 'node_er_credits',
        type: 'er_attribute',
        text: 'credits',
        x: 570,
        y: 260,
        width: 110,
        height: 44,
        color: '#f0fdf4',
        borderColor: '#16a34a',
        textColor: '#15803d'
    }
];

const DEFAULT_INITIAL_ER_CONNECTORS = [
    { id: 'er_conn_1', from: 'node_er_student', fromPort: 'top', to: 'node_er_roll', toPort: 'bottom', label: '' },
    { id: 'er_conn_2', from: 'node_er_student', fromPort: 'top', to: 'node_er_name', toPort: 'bottom', label: '' },
    { id: 'er_conn_3', from: 'node_er_student', fromPort: 'bottom', to: 'node_er_email', toPort: 'top', label: '' },
    { id: 'er_conn_4', from: 'node_er_student', fromPort: 'right', to: 'node_er_enrolls', toPort: 'left', label: 'M' },
    { id: 'er_conn_5', from: 'node_er_enrolls', fromPort: 'right', to: 'node_er_course', toPort: 'left', label: 'N' },
    { id: 'er_conn_6', from: 'node_er_course', fromPort: 'top', to: 'node_er_cid', toPort: 'bottom', label: '' },
    { id: 'er_conn_7', from: 'node_er_course', fromPort: 'top', to: 'node_er_cname', toPort: 'bottom', label: '' },
    { id: 'er_conn_8', from: 'node_er_course', fromPort: 'bottom', to: 'node_er_credits', toPort: 'top', label: '' }
];

const PORTS = ['top', 'right', 'bottom', 'left'];

const CARDINALITY_OPTIONS = ['1:1', '1:N', 'M:N', '1', 'N', 'M', '(0,1)', '(1,1)', '(0,N)', '(1,N)'];

export default function FlowchartVisualCanvas({
    initialData,
    onChange,
    readOnly = false,
    theme = 'light',
    language = 'python',
    onInsertSqlDdl = null
}) {
    // Mode: 'er' (DBMS) | 'flowchart' (Logic)
    const [canvasMode, setCanvasMode] = useState(() => {
        if (initialData?.canvasMode) return initialData.canvasMode;
        return language === 'sql' ? 'er' : 'flowchart';
    });

    // Canvas nodes and connectors
    const [nodes, setNodes] = useState(() => {
        if (initialData?.nodes && initialData.nodes.length > 0) return initialData.nodes;
        return language === 'sql' ? DEFAULT_INITIAL_ER_NODES : DEFAULT_INITIAL_FLOWCHART_NODES;
    });

    const [connectors, setConnectors] = useState(() => {
        if (initialData?.connectors && initialData.connectors.length > 0) return initialData.connectors;
        return language === 'sql' ? DEFAULT_INITIAL_ER_CONNECTORS : DEFAULT_INITIAL_FLOWCHART_CONNECTORS;
    });

    // Active tool: 'select' | 'connector'
    const [activeTool, setActiveTool] = useState('select');

    // Selection & connection state
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [selectedConnectorId, setSelectedConnectorId] = useState(null);
    const [hoveredNodeId, setHoveredNodeId] = useState(null);
    const [hoveredPortInfo, setHoveredPortInfo] = useState(null); // { nodeId, port }

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

    // SQL DDL Generation Modal
    const [generatedSqlDdl, setGeneratedSqlDdl] = useState(null);
    const [isDdlModalOpen, setIsDdlModalOpen] = useState(false);

    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const isLocalUpdateRef = useRef(false);

    const isLight = theme === 'light';

    // Synchronize mode if language changes externally and user hasn't explicitly set canvas
    useEffect(() => {
        if (!initialData?.nodes) {
            if (language === 'sql' && canvasMode !== 'er') {
                setCanvasMode('er');
                setNodes(DEFAULT_INITIAL_ER_NODES);
                setConnectors(DEFAULT_INITIAL_ER_CONNECTORS);
            }
        }
    }, [language]);

    // Emit changes to parent safely
    const notifyChange = useCallback((newNodes, newConnectors, mode = canvasMode) => {
        if (!onChange) return;
        isLocalUpdateRef.current = true;
        onChange({ nodes: newNodes, connectors: newConnectors, canvasMode: mode });
    }, [onChange, canvasMode]);

    // Update if initialData changes externally
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
        if (initialData?.canvasMode && initialData.canvasMode !== canvasMode) {
            setCanvasMode(initialData.canvasMode);
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
        setSelectedNodeId(null);
        notifyChange(nextNodes, nextConns);
        toast.success('Deleted shape & attached connectors');
    }, [nodes, connectors, readOnly, notifyChange]);

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
        if (selectedNodeId) {
            const node = nodes.find((n) => n.id === selectedNodeId);
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
    }, [selectedNodeId, selectedConnectorId, nodes, connectors]);

    const cutSelected = useCallback(() => {
        if (readOnly) return;
        if (selectedNodeId) {
            copySelected();
            deleteNode(selectedNodeId);
        } else if (selectedConnectorId) {
            copySelected();
            deleteConnector(selectedConnectorId);
        }
    }, [readOnly, selectedNodeId, selectedConnectorId, copySelected, deleteNode, deleteConnector]);

    const pasteClipboard = useCallback(() => {
        if (readOnly || !clipboardRef.current) return;
        const { type, data } = clipboardRef.current;

        if (type === 'node') {
            const randId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const newNode = {
                ...data,
                id: randId,
                x: data.x + 40,
                y: data.y + 40
            };
            const nextNodes = [...nodes, newNode];
            setNodes(nextNodes);
            setSelectedNodeId(randId);
            notifyChange(nextNodes, connectors);
            toast.success(`Pasted shape "${newNode.text}"`);
        }
    }, [readOnly, nodes, connectors, notifyChange]);

    // Keyboard Shortcuts (Delete, Cut, Copy, Paste, Escape)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (editingNodeId || editingConnectorId) return;

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

            // Copy (Ctrl+C / Cmd+C)
            if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
                if (selectedNodeId || selectedConnectorId) {
                    e.preventDefault();
                    copySelected();
                }
            }

            // Cut (Ctrl+X / Cmd+X)
            if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
                if (selectedNodeId || selectedConnectorId) {
                    e.preventDefault();
                    cutSelected();
                }
            }

            // Paste (Ctrl+V / Cmd+V)
            if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
                if (clipboardRef.current) {
                    e.preventDefault();
                    pasteClipboard();
                }
            }

            // Escape: deselect everything
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
        editingNodeId,
        editingConnectorId,
        selectedNodeId,
        selectedConnectorId,
        deleteNode,
        deleteConnector,
        copySelected,
        cutSelected,
        pasteClipboard
    ]);

    // Add Shape Handler
    const handleAddShape = (type) => {
        if (readOnly) return;
        const randId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const spawnX = Math.round((-pan.x + 220) / zoom);
        const spawnY = Math.round((-pan.y + 140) / zoom);

        let defaultText = 'Process';
        let width = 160;
        let height = 54;
        let color = '#ffffff';
        let borderColor = '#64748b';
        let textColor = '#0f172a';

        // FLOWCHART SHAPES
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
        }
        // DBMS CHEN'S ER SHAPES
        else if (type === 'er_entity') {
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

        const newNode = {
            id: randId,
            type,
            text: defaultText,
            x: spawnX,
            y: spawnY,
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
        toast.success(`Placed ${type.replace('er_', 'ER ').toUpperCase()} shape`);
    };

    // Node pointer down
    const handleNodePointerDown = (e, node) => {
        if (readOnly) return;
        e.stopPropagation();

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

        setSelectedNodeId(node.id);
        setSelectedConnectorId(null);
        setDraggingNodeId(node.id);
        setDragOffset({
            x: e.clientX / zoom - node.x,
            y: e.clientY / zoom - node.y
        });
    };

    // Hook Port pointer down
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
        if (!connectingSource) return;

        if (connectingSource.nodeId === targetNodeId && connectingSource.port === targetPort) {
            setConnectingSource(null);
            setConnectingMousePos(null);
            return;
        }

        const sourceNode = nodes.find((n) => n.id === connectingSource.nodeId);
        const targetNode = nodes.find((n) => n.id === targetNodeId);

        let defaultLabel = '';
        if (sourceNode?.type === 'decision') {
            const existingCount = connectors.filter((c) => c.from === connectingSource.nodeId).length;
            defaultLabel = existingCount === 0 ? 'Yes' : 'No';
        } else if (
            (sourceNode?.type?.startsWith('er_') && targetNode?.type?.startsWith('er_')) ||
            canvasMode === 'er'
        ) {
            if (
                (sourceNode?.type === 'er_relationship' && targetNode?.type === 'er_entity') ||
                (sourceNode?.type === 'er_entity' && targetNode?.type === 'er_relationship')
            ) {
                defaultLabel = '1';
            }
        }

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

    // Canvas pointer move
    const handleCanvasPointerMove = (e) => {
        if (connectingSource) {
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
            setConnectingSource(null);
            setConnectingMousePos(null);
        }
    };

    const handleCanvasPointerDown = (e) => {
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

    // Mode Switcher Handler
    const handleSwitchMode = (newMode) => {
        if (newMode === canvasMode) return;
        setCanvasMode(newMode);
        if (nodes.length === 0) {
            const starterNodes = newMode === 'er' ? DEFAULT_INITIAL_ER_NODES : DEFAULT_INITIAL_FLOWCHART_NODES;
            const starterConns = newMode === 'er' ? DEFAULT_INITIAL_ER_CONNECTORS : DEFAULT_INITIAL_FLOWCHART_CONNECTORS;
            setNodes(starterNodes);
            setConnectors(starterConns);
            notifyChange(starterNodes, starterConns, newMode);
        } else {
            notifyChange(nodes, connectors, newMode);
        }
        toast.success(`Switched to ${newMode === 'er' ? 'DBMS ER Diagram Designer' : 'Flowchart Canvas'}`);
    };

    // Clear entire canvas
    const handleClearCanvas = () => {
        if (readOnly) return;
        if (confirm(`Clear all shapes and connectors from the ${canvasMode === 'er' ? 'ER Diagram' : 'Flowchart'} canvas?`)) {
            setNodes([]);
            setConnectors([]);
            setSelectedNodeId(null);
            setSelectedConnectorId(null);
            notifyChange([], [], canvasMode);
            toast.success('Canvas cleared');
        }
    };

    // Reset to Starter Templates
    const handleResetToTemplate = () => {
        if (readOnly) return;
        const starterNodes = canvasMode === 'er' ? DEFAULT_INITIAL_ER_NODES : DEFAULT_INITIAL_FLOWCHART_NODES;
        const starterConns = canvasMode === 'er' ? DEFAULT_INITIAL_ER_CONNECTORS : DEFAULT_INITIAL_FLOWCHART_CONNECTORS;
        setNodes(starterNodes);
        setConnectors(starterConns);
        setSelectedNodeId(null);
        setSelectedConnectorId(null);
        notifyChange(starterNodes, starterConns, canvasMode);
        toast.success(`Reset to standard ${canvasMode === 'er' ? 'ER model' : 'flowchart'} template`);
    };

    // SQL DDL Generator from ER Canvas Entities and Attributes
    const handleGenerateSqlDdl = () => {
        const entityNodes = nodes.filter((n) => n.type === 'er_entity' || n.type === 'er_weak_entity');
        const tableNodes = nodes.filter((n) => n.type === 'er_table');
        const relationshipNodes = nodes.filter((n) => n.type === 'er_relationship' || n.type === 'er_weak_relationship');

        if (entityNodes.length === 0 && tableNodes.length === 0) {
            toast.error('No Entities or Relational Tables found on canvas to generate SQL DDL from.');
            return;
        }

        let ddlOutput = `-- ====================================================================\n`;
        ddlOutput += `-- Generated Relational SQL DDL from Antigravity DBMS ER Designer\n`;
        ddlOutput += `-- Generated At: ${new Date().toLocaleString()}\n`;
        ddlOutput += `-- Engine Compatibility: SQLite 3 / MySQL 8+\n`;
        ddlOutput += `-- ====================================================================\n\n`;

        // 1. Process explicit Table Schema cards
        tableNodes.forEach((tNode) => {
            const lines = tNode.text.split('\n').map((l) => l.trim()).filter(Boolean);
            const rawTableName = lines[0] || 'unnamed_table';
            const tableName = rawTableName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
            const colLines = lines.slice(1);

            ddlOutput += `-- Table Schema: ${tableName}\n`;
            ddlOutput += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;

            if (colLines.length === 0) {
                ddlOutput += `    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
            } else {
                colLines.forEach((col, idx) => {
                    const isLast = idx === colLines.length - 1;
                    const cleanCol = col.replace(/^[-*•]\s*/, '');
                    ddlOutput += `    ${cleanCol}${isLast ? '' : ','}\n`;
                });
            }
            ddlOutput += `);\n\n`;
        });

        // 2. Process Chen's Entities & their connected Attributes
        const generatedEntities = {};

        entityNodes.forEach((eNode) => {
            const rawEntityName = eNode.text.trim();
            const tableName = rawEntityName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

            // Find attributes directly connected to this entity
            const connectedConns = connectors.filter((c) => c.from === eNode.id || c.to === eNode.id);
            const connectedAttrIds = connectedConns.map((c) => (c.from === eNode.id ? c.to : c.from));
            const attrNodes = nodes.filter((n) => connectedAttrIds.includes(n.id) && n.type.startsWith('er_') && n.type.includes('attribute'));

            const columns = [];
            const primaryKeys = [];

            attrNodes.forEach((aNode) => {
                const rawAttrName = aNode.text.trim();
                const colName = rawAttrName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

                let colType = 'VARCHAR(100)';
                if (colName.includes('id') || colName.includes('no') || colName.includes('credits') || colName.includes('age')) {
                    colType = 'INTEGER';
                } else if (colName.includes('price') || colName.includes('salary') || colName.includes('amount') || colName.includes('rate')) {
                    colType = 'DECIMAL(10, 2)';
                } else if (colName.includes('date') || colName.includes('dob')) {
                    colType = 'DATE';
                }

                if (aNode.type === 'er_key_attribute' || colName.endsWith('_pk') || colName === 'id') {
                    primaryKeys.push(colName);
                    columns.push(`    ${colName} ${colType} NOT NULL`);
                } else if (aNode.type === 'er_derived') {
                    columns.push(`    -- Derived attribute: ${colName} (computed at query time)`);
                } else if (aNode.type === 'er_multivalued') {
                    columns.push(`    -- Multivalued attribute: ${colName} (recommended as separate table)`);
                } else {
                    columns.push(`    ${colName} ${colType}`);
                }
            });

            // Default fallback primary key if none specified
            if (primaryKeys.length === 0) {
                const defaultPk = `${tableName}_id`;
                primaryKeys.push(defaultPk);
                columns.unshift(`    ${defaultPk} INTEGER PRIMARY KEY AUTOINCREMENT`);
            } else if (!columns.some((c) => c.includes('PRIMARY KEY'))) {
                columns.push(`    PRIMARY KEY (${primaryKeys.join(', ')})`);
            }

            generatedEntities[eNode.id] = { tableName, primaryKeys };

            ddlOutput += `-- Entity: ${rawEntityName} (${eNode.type === 'er_weak_entity' ? 'Weak Entity' : 'Strong Entity'})\n`;
            ddlOutput += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
            ddlOutput += columns.join(',\n') + '\n';
            ddlOutput += `);\n\n`;
        });

        // 3. Process Relationships (M:N junction tables)
        relationshipNodes.forEach((rNode) => {
            const relConns = connectors.filter((c) => c.from === rNode.id || c.to === rNode.id);
            const connectedEntityIds = relConns.map((c) => (c.from === rNode.id ? c.to : c.from));
            const participatingEntities = entityNodes.filter((e) => connectedEntityIds.includes(e.id));

            if (participatingEntities.length >= 2) {
                const rawRelName = rNode.text.trim();
                const relTableName = rawRelName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

                const [ent1, ent2] = participatingEntities;
                const info1 = generatedEntities[ent1.id];
                const info2 = generatedEntities[ent2.id];

                if (info1 && info2) {
                    const fk1 = `${info1.tableName}_id`;
                    const fk2 = `${info2.tableName}_id`;

                    ddlOutput += `-- Relationship M:N Junction: ${rawRelName} (${info1.tableName} <-> ${info2.tableName})\n`;
                    ddlOutput += `CREATE TABLE IF NOT EXISTS ${relTableName} (\n`;
                    ddlOutput += `    ${fk1} INTEGER NOT NULL,\n`;
                    ddlOutput += `    ${fk2} INTEGER NOT NULL,\n`;
                    ddlOutput += `    enrolled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
                    ddlOutput += `    PRIMARY KEY (${fk1}, ${fk2}),\n`;
                    ddlOutput += `    FOREIGN KEY (${fk1}) REFERENCES ${info1.tableName}(${info1.primaryKeys[0] || 'id'}) ON DELETE CASCADE,\n`;
                    ddlOutput += `    FOREIGN KEY (${fk2}) REFERENCES ${info2.tableName}(${info2.primaryKeys[0] || 'id'}) ON DELETE CASCADE\n`;
                    ddlOutput += `);\n\n`;
                }
            }
        });

        ddlOutput += `-- Verification Queries\n`;
        ddlOutput += `SELECT 'Database Schema generated successfully!' AS status;\n`;

        setGeneratedSqlDdl(ddlOutput);
        setIsDdlModalOpen(true);
    };

    // Export Canvas to PNG or SVG
    const handleExportCanvas = (format = 'svg') => {
        if (!svgRef.current) return;
        const svgElement = svgRef.current;
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);

        const prefix = canvasMode === 'er' ? 'er_diagram' : 'flowchart';

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

    // Render node path/geometry based on conventional flowchart & DBMS shapes
    const renderShapeGeometry = (node, isSelected, isConnectingSource) => {
        const { x, y, width: w, height: h, type, color, borderColor } = node;
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
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={h / 2}
                    ry={h / 2}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="cursor-move filter drop-shadow-xs transition-all"
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
                    className="cursor-move filter drop-shadow-xs transition-all"
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
                    className="cursor-move filter drop-shadow-xs transition-all"
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
                    className="cursor-move filter drop-shadow-xs transition-all"
                />
            );
        }

        // DBMS CHEN'S ER GEOMETRIES
        else if (type === 'er_entity') {
            // Strong Entity: Solid Rectangle
            return (
                <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={4}
                    ry={4}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="cursor-move filter drop-shadow-xs transition-all"
                />
            );
        } else if (type === 'er_weak_entity') {
            // Weak Entity: Double Rectangle
            return (
                <g className="cursor-move filter drop-shadow-xs transition-all">
                    <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        rx={5}
                        ry={5}
                        fill={color}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                    />
                    <rect
                        x={x + 4}
                        y={y + 4}
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
            // Strong / Regular Relationship: Diamond
            const points = `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
            return (
                <polygon
                    points={points}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="cursor-move filter drop-shadow-xs transition-all"
                />
            );
        } else if (type === 'er_weak_relationship') {
            // Identifying Relationship: Double Diamond
            const outerPoints = `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
            const innerPoints = `${x + w / 2},${y + 6} ${x + w - 8},${y + h / 2} ${x + w / 2},${y + h - 6} ${x + 8},${y + h / 2}`;
            return (
                <g className="cursor-move filter drop-shadow-xs transition-all">
                    <polygon points={outerPoints} fill={color} stroke={strokeColor} strokeWidth={strokeWidth} />
                    <polygon points={innerPoints} fill="none" stroke={strokeColor} strokeWidth={Math.max(1, strokeWidth - 0.5)} />
                </g>
            );
        } else if (type === 'er_attribute' || type === 'er_key_attribute') {
            // Regular Attribute or Key Attribute: Oval / Ellipse
            return (
                <ellipse
                    cx={x + w / 2}
                    cy={y + h / 2}
                    rx={w / 2}
                    ry={h / 2}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="cursor-move filter drop-shadow-xs transition-all"
                />
            );
        } else if (type === 'er_multivalued') {
            // Multivalued Attribute: Double Oval
            return (
                <g className="cursor-move filter drop-shadow-xs transition-all">
                    <ellipse
                        cx={x + w / 2}
                        cy={y + h / 2}
                        rx={w / 2}
                        ry={h / 2}
                        fill={color}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                    />
                    <ellipse
                        cx={x + w / 2}
                        cy={y + h / 2}
                        rx={w / 2 - 4}
                        ry={h / 2 - 4}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={Math.max(1, strokeWidth - 0.5)}
                    />
                </g>
            );
        } else if (type === 'er_derived') {
            // Derived Attribute: Dashed Oval
            return (
                <ellipse
                    cx={x + w / 2}
                    cy={y + h / 2}
                    rx={w / 2}
                    ry={h / 2}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray="5,4"
                    className="cursor-move filter drop-shadow-xs transition-all"
                />
            );
        } else if (type === 'er_table') {
            // Relational Table Card (Columns & Types)
            return (
                <g className="cursor-move filter drop-shadow-md transition-all">
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
                    />
                    {/* Header bar */}
                    <rect
                        x={x}
                        y={y}
                        width={w}
                        height={26}
                        rx={6}
                        ry={6}
                        fill={isSelected ? '#7c3aed' : '#334155'}
                    />
                    <rect
                        x={x}
                        y={y + 18}
                        width={w}
                        height={8}
                        fill={isSelected ? '#7c3aed' : '#334155'}
                    />
                </g>
            );
        }

        // Default: Standard Process Rectangle
        return (
            <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={4}
                ry={4}
                fill={color}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                className="cursor-move filter drop-shadow-xs transition-all"
            />
        );
    };

    return (
        <div
            ref={containerRef}
            className={`w-full h-full flex flex-col relative select-none overflow-hidden ${
                isLight ? 'bg-slate-50 text-slate-800' : 'bg-slate-950 text-slate-100'
            }`}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
        >
            {/* Top Interactive Toolbar */}
            <div
                className={`px-3 py-2 border-b flex flex-wrap items-center justify-between gap-2 z-10 flex-shrink-0 ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}
            >
                {/* Left: Mode Switcher & Tools */}
                <div className="flex flex-wrap items-center gap-1.5">
                    {/* Canvas Mode Toggle: ER Designer vs Flowchart */}
                    <div
                        className={`flex items-center rounded-lg p-0.5 border mr-1 ${
                            isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-800 border-slate-700'
                        }`}
                    >
                        <button
                            onClick={() => handleSwitchMode('er')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                                canvasMode === 'er'
                                    ? 'bg-sky-600 text-white shadow-xs'
                                    : isLight
                                    ? 'text-slate-600 hover:text-slate-900'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                            title="Switch to DBMS Chen's ER & Relational Schema Designer"
                        >
                            <Database className="w-3.5 h-3.5" />
                            <span>ER Diagram (DBMS)</span>
                        </button>

                        <button
                            onClick={() => handleSwitchMode('flowchart')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                                canvasMode === 'flowchart'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : isLight
                                    ? 'text-slate-600 hover:text-slate-900'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                            title="Switch to Algorithmic Flowchart Canvas"
                        >
                            <Shapes className="w-3.5 h-3.5" />
                            <span>Flowchart (Logic)</span>
                        </button>
                    </div>

                    {/* Pointer / Connector Selectors */}
                    <div
                        className={`flex items-center rounded-lg p-0.5 border ${
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
                            <span className="hidden sm:inline">Select</span>
                        </button>

                        <button
                            onClick={() => {
                                setActiveTool('connector');
                                setSelectedNodeId(null);
                                setSelectedConnectorId(null);
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                activeTool === 'connector'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : isLight
                                    ? 'text-slate-600 hover:text-slate-900'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                            title="Connector Tool: Click shape hooks to link with directed arrows"
                        >
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span>Connector</span>
                        </button>
                    </div>

                    <div className={`h-4 w-px mx-0.5 hidden sm:block ${isLight ? 'bg-slate-300' : 'bg-slate-700'}`} />

                    {/* ER DIAGRAM SHAPE PALETTE */}
                    {canvasMode === 'er' && (
                        <div className="flex flex-wrap items-center gap-1">
                            <button
                                onClick={() => handleAddShape('er_entity')}
                                className="px-2 py-1 rounded bg-sky-50 border border-sky-300 text-sky-800 hover:bg-sky-100 text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Add Strong Entity (Rectangle)"
                            >
                                <span className="w-2.5 h-2 bg-sky-500 rounded-2xs inline-block" />
                                <span>Entity</span>
                            </button>

                            <button
                                onClick={() => handleAddShape('er_weak_entity')}
                                className="px-2 py-1 rounded bg-cyan-50 border border-cyan-300 text-cyan-800 hover:bg-cyan-100 text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Add Weak Entity (Double Rectangle)"
                            >
                                <span className="w-2.5 h-2 border-2 border-cyan-600 bg-cyan-200 rounded-2xs inline-block" />
                                <span>Weak Ent.</span>
                            </button>

                            <button
                                onClick={() => handleAddShape('er_relationship')}
                                className="px-2 py-1 rounded bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Add Relationship (Diamond)"
                            >
                                <span className="w-2 h-2 bg-amber-500 rotate-45 inline-block" />
                                <span>Relationship</span>
                            </button>

                            <button
                                onClick={() => handleAddShape('er_weak_relationship')}
                                className="px-2 py-1 rounded bg-orange-50 border border-orange-300 text-orange-800 hover:bg-orange-100 text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Add Identifying Relationship (Double Diamond)"
                            >
                                <span className="w-2 h-2 border border-orange-600 bg-orange-300 rotate-45 inline-block" />
                                <span>Ident. Rel.</span>
                            </button>

                            <button
                                onClick={() => handleAddShape('er_attribute')}
                                className="px-2 py-1 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Add Regular Attribute (Oval)"
                            >
                                <span className="w-2.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                <span>Attribute</span>
                            </button>

                            <button
                                onClick={() => handleAddShape('er_key_attribute')}
                                className="px-2 py-1 rounded bg-yellow-50 border border-yellow-400 text-yellow-900 hover:bg-yellow-100 text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Add Primary Key Attribute (Underlined + 🔑 Key)"
                            >
                                <Key className="w-3 h-3 text-amber-600" />
                                <span className="underline decoration-amber-600">Key (PK)</span>
                            </button>

                            <button
                                onClick={() => handleAddShape('er_multivalued')}
                                className="px-2 py-1 rounded bg-purple-50 border border-purple-300 text-purple-800 hover:bg-purple-100 text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Add Multivalued Attribute (Double Oval)"
                            >
                                <span className="w-2.5 h-1.5 rounded-full border border-purple-600 bg-purple-200 inline-block" />
                                <span>Multivalued</span>
                            </button>

                            <button
                                onClick={() => handleAddShape('er_derived')}
                                className="px-2 py-1 rounded bg-fuchsia-50 border border-fuchsia-300 text-fuchsia-800 hover:bg-fuchsia-100 text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Add Derived Attribute (Dashed Oval)"
                            >
                                <span className="w-2.5 h-1.5 rounded-full border border-dashed border-fuchsia-600 inline-block" />
                                <span>Derived</span>
                            </button>

                            <button
                                onClick={() => handleAddShape('er_table')}
                                className="px-2 py-1 rounded bg-slate-100 border border-slate-300 text-slate-800 hover:bg-slate-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Add Relational Table Schema Card"
                            >
                                <Table className="w-3 h-3 text-slate-600" />
                                <span>Table Card</span>
                            </button>
                        </div>
                    )}

                    {/* FLOWCHART SHAPE PALETTE */}
                    {canvasMode === 'flowchart' && (
                        <div className="flex flex-wrap items-center gap-1">
                            <button
                                onClick={() => handleAddShape('terminator')}
                                className="px-2 py-1 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-medium transition cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Add Start/End Oval Terminator"
                            >
                                <span className="w-2.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                <span>Oval</span>
                            </button>

                            <button
                                onClick={() => handleAddShape('io')}
                                className="px-2 py-1 rounded bg-sky-50 border border-sky-300 text-sky-800 hover:bg-sky-100 text-xs font-medium transition cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Add Input/Output Parallelogram"
                            >
                                <span className="w-2.5 h-2 bg-sky-500 skew-x-12 inline-block" />
                                <span>Parallelogram</span>
                            </button>

                            <button
                                onClick={() => handleAddShape('process')}
                                className="px-2 py-1 rounded bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 text-xs font-medium transition cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Add Calculation/Assignment Rectangle"
                            >
                                <span className="w-2.5 h-2 bg-slate-400 rounded-2xs inline-block" />
                                <span>Rectangle</span>
                            </button>

                            <button
                                onClick={() => handleAddShape('decision')}
                                className="px-2 py-1 rounded bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-medium transition cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Add Decision Diamond"
                            >
                                <span className="w-2 h-2 bg-amber-500 rotate-45 inline-block" />
                                <span>Diamond</span>
                            </button>

                            <button
                                onClick={() => handleAddShape('loop')}
                                className="px-2 py-1 rounded bg-purple-50 border border-purple-300 text-purple-800 hover:bg-purple-100 text-xs font-medium transition cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Add Loop Iteration Hexagon"
                            >
                                <span>Hexagon</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: SQL DDL Generator, Delete, Zoom, Export */}
                <div className="flex items-center gap-1.5 text-xs">
                    {/* One-Click Generate SQL DDL Button (in ER mode) */}
                    {canvasMode === 'er' && (
                        <button
                            onClick={handleGenerateSqlDdl}
                            className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                            title="Generate Executable SQL DDL CREATE TABLE Statements from Canvas"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                            <span>Generate SQL DDL</span>
                        </button>
                    )}

                    {/* Delete Selected */}
                    {(selectedNodeId || selectedConnectorId) && (
                        <button
                            onClick={() => {
                                if (selectedNodeId) deleteNode(selectedNodeId);
                                else if (selectedConnectorId) deleteConnector(selectedConnectorId);
                            }}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 rounded font-medium flex items-center gap-1 transition cursor-pointer shadow-xs"
                            title="Delete Selected (Del / Backspace)"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Delete</span>
                        </button>
                    )}

                    {/* Zoom controls */}
                    <div
                        className={`flex items-center rounded border ${
                            isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-800 border-slate-700'
                        }`}
                    >
                        <button
                            onClick={() => setZoom(Math.max(0.4, zoom - 0.15))}
                            className={`p-1 ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
                            title="Zoom Out"
                        >
                            <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className={`px-1.5 text-[11px] font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            {Math.round(zoom * 100)}%
                        </span>
                        <button
                            onClick={() => setZoom(Math.min(2.5, zoom + 0.15))}
                            className={`p-1 ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
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
                        className={`p-1 rounded border transition cursor-pointer ${
                            isLight
                                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                        title="Reset Canvas View"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    {/* Export Dropdown */}
                    <button
                        onClick={() => handleExportCanvas('png')}
                        className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded font-bold shadow-xs flex items-center gap-1 transition cursor-pointer"
                        title="Download as PNG Image"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export PNG</span>
                    </button>

                    <button
                        onClick={handleResetToTemplate}
                        className={`p-1 transition cursor-pointer ${
                            isLight ? 'text-slate-400 hover:text-sky-600' : 'text-slate-500 hover:text-sky-400'
                        }`}
                        title="Reset to Starter Template"
                    >
                        <Layers className="w-3.5 h-3.5" />
                    </button>

                    <button
                        onClick={handleClearCanvas}
                        className={`p-1 transition cursor-pointer ${
                            isLight ? 'text-slate-400 hover:text-rose-600' : 'text-slate-500 hover:text-rose-400'
                        }`}
                        title="Clear Canvas"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
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
                    className={`border-b px-3 py-1 text-xs flex items-center justify-between z-10 ${
                        isLight
                            ? 'bg-purple-50 border-purple-200 text-purple-900'
                            : 'bg-purple-950/80 border-purple-800 text-purple-200'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                        <span>
                            {connectingSource
                                ? 'Connection started! Drag or click onto any hook on any shape to connect.'
                                : 'Connector Mode: Click any hook dot on a shape to start directed connection.'}
                        </span>
                    </div>
                    <button
                        onClick={() => {
                            setActiveTool('select');
                            setConnectingSource(null);
                            setConnectingMousePos(null);
                        }}
                        className={`text-[11px] underline cursor-pointer ${
                            isLight ? 'text-purple-700 hover:text-purple-950' : 'text-purple-300 hover:text-white'
                        }`}
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
                        backgroundImage: isLight
                            ? `radial-gradient(#cbd5e1 1.2px, transparent 1.2px)`
                            : `radial-gradient(#334155 1.2px, transparent 1.2px)`,
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
                        {/* 1. CONNECTORS LAYER */}
                        {connectors.map((conn) => {
                            const data = getConnectorPathData(conn);
                            if (!data) return null;
                            const isSelected = selectedConnectorId === conn.id;

                            // In ER model, entity-attribute lines don't necessarily need large arrowheads, but relation-entity does
                            const showArrow = canvasMode !== 'er' || Boolean(conn.label);

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
                                        className="transition-colors group-hover:stroke-purple-500"
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
                                                className="filter drop-shadow-sm group-hover:stroke-purple-500 transition-all"
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

                        {/* Interactive Dragged Live Connector Line */}
                        {connectingSource && connectingMousePos && (
                            <line
                                x1={getPortCoordinates(nodes.find((n) => n.id === connectingSource.nodeId), connectingSource.port).x}
                                y1={getPortCoordinates(nodes.find((n) => n.id === connectingSource.nodeId), connectingSource.port).y}
                                x2={connectingMousePos.x}
                                y2={connectingMousePos.y}
                                stroke="#8b5cf6"
                                strokeWidth={2.5}
                                strokeDasharray="6,4"
                                markerEnd="url(#flowchart-arrowhead-selected)"
                                className="pointer-events-none animate-pulse"
                            />
                        )}

                        {/* 2. SHAPES / NODES LAYER */}
                        {nodes.map((node) => {
                            const isSelected = selectedNodeId === node.id;
                            const isConnectingSource = connectingSource?.nodeId === node.id;
                            const isHovered = hoveredNodeId === node.id;

                            return (
                                <g
                                    key={node.id}
                                    onPointerDown={(e) => handleNodePointerDown(e, node)}
                                    onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
                                    onPointerEnter={() => setHoveredNodeId(node.id)}
                                    onPointerLeave={() => setHoveredNodeId(null)}
                                    className="cursor-move select-none"
                                >
                                    {/* Geometry */}
                                    {renderShapeGeometry(node, isSelected, isConnectingSource)}

                                    {/* Inner Node Text / Content */}
                                    {node.type === 'er_table' ? (
                                        // Relational Table Multi-row Content
                                        <g className="pointer-events-none">
                                            {/* Table Name Header */}
                                            <text
                                                x={node.x + node.width / 2}
                                                y={node.y + 16}
                                                textAnchor="middle"
                                                fill="#ffffff"
                                                fontSize={11}
                                                fontWeight="bold"
                                                fontFamily="monospace"
                                            >
                                                {node.text.split('\n')[0] || 'table'}
                                            </text>
                                            {/* Column rows */}
                                            {node.text.split('\n').slice(1).map((line, lIdx) => (
                                                <text
                                                    key={lIdx}
                                                    x={node.x + 8}
                                                    y={node.y + 40 + lIdx * 18}
                                                    fill={line.includes('PK') ? '#d97706' : node.textColor}
                                                    fontSize={10}
                                                    fontWeight={line.includes('PK') ? 'bold' : 'normal'}
                                                    fontFamily="monospace"
                                                >
                                                    {line.includes('PK') ? `🔑 ${line}` : `• ${line}`}
                                                </text>
                                            ))}
                                        </g>
                                    ) : (
                                        // Standard Text Inside Shape
                                        <text
                                            x={node.x + node.width / 2}
                                            y={node.y + node.height / 2}
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

                                    {/* 3. WHITEBOARD-STYLE CARDINAL HOOK DOCKING PORTS */}
                                    {(isSelected || isHovered || isConnectingSource || activeTool === 'connector') &&
                                        PORTS.map((port) => {
                                            const pt = getPortCoordinates(node, port);
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
                                                    onPointerEnter={() => setHoveredPortInfo({ nodeId: node.id, port })}
                                                    onPointerLeave={() => setHoveredPortInfo(null)}
                                                >
                                                    {/* Invisible large hit circle */}
                                                    <circle
                                                        cx={pt.x}
                                                        cy={pt.y}
                                                        r={14}
                                                        fill="transparent"
                                                        className="cursor-crosshair"
                                                    />

                                                    {/* Outer Aura Ring */}
                                                    {(isThisHookHovered || isThisHookActive) && (
                                                        <circle
                                                            cx={pt.x}
                                                            cy={pt.y}
                                                            r={10}
                                                            fill="none"
                                                            stroke="#8b5cf6"
                                                            strokeWidth={2}
                                                            strokeDasharray="3,2"
                                                            className="animate-spin"
                                                        />
                                                    )}

                                                    {/* Hook Port Center Dot */}
                                                    <circle
                                                        cx={pt.x}
                                                        cy={pt.y}
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
                                                        className="transition-all filter drop-shadow-xs"
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
                            {node.type === 'er_table' ? (
                                <textarea
                                    autoFocus
                                    value={editingNodeText}
                                    onChange={(e) => setEditingNodeText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') setEditingNodeId(null);
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

            {/* Bottom Status / Keyboard Shortcuts Tip Bar */}
            <div
                className={`px-3 py-1.5 border-t text-[11px] flex items-center justify-between z-10 flex-shrink-0 ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
            >
                <span className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                    <span>
                        <strong className={isLight ? 'text-slate-800' : 'text-slate-300'}>Hooks:</strong> Click any hook dot to link • <strong className={isLight ? 'text-slate-800' : 'text-slate-300'}>Shortcuts:</strong> Ctrl+C copy, Ctrl+X cut, Ctrl+V paste, Del delete • Double-click shape to edit text
                    </span>
                </span>
                <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                    {nodes.length} components • {connectors.length} connections • Mode: {canvasMode === 'er' ? 'ER Diagram' : 'Flowchart'}
                </span>
            </div>

            {/* 5. SQL DDL PREVIEW & INSERT MODAL */}
            {isDdlModalOpen && generatedSqlDdl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div
                        className={`w-full max-w-2xl rounded-2xl shadow-2xl border flex flex-col max-h-[85vh] overflow-hidden ${
                            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0 border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                    <Sparkles className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Generated Relational SQL DDL</h3>
                                    <p className="text-xs text-slate-500">
                                        Synthesized ANSI/SQLite/MySQL CREATE TABLE schema from your ER components
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDdlModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body: Code Preview */}
                        <div className="p-4 flex-1 overflow-y-auto">
                            <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
                                {generatedSqlDdl}
                            </pre>
                        </div>

                        {/* Modal Footer: Actions */}
                        <div className="px-5 py-3 border-t flex items-center justify-between border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                            <span className="text-xs text-slate-500 font-medium">
                                Ready to run in Practice SQL Engine
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(generatedSqlDdl);
                                        toast.success('SQL DDL copied to clipboard!');
                                    }}
                                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy SQL</span>
                                </button>

                                {onInsertSqlDdl && (
                                    <button
                                        onClick={() => {
                                            onInsertSqlDdl(generatedSqlDdl);
                                            setIsDdlModalOpen(false);
                                        }}
                                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                        <Code className="w-3.5 h-3.5" />
                                        <span>Insert into SQL Editor Tab</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
