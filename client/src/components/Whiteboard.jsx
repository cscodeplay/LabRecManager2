'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
    Pencil, Eraser, Circle, Square, Minus, Type, Undo2, Redo2, Trash2, Download, Save,
    Palette, ChevronDown, X, Maximize2, Minimize2, Share2, MousePointer2, Sparkles, Wand2,
    Highlighter, MoveRight, Pointer, Image as ImageIcon, ChevronLeft, ChevronRight,
    Plus, Video, VideoOff, Mic, MicOff, Camera, RotateCw, Move, Pipette, Scan,
    Triangle, Star, Hexagon, Scissors, Copy, Files, ClipboardPaste, LineChart, CalendarClock, RectangleHorizontal // For shapes and toolbars
} from 'lucide-react';
import WhiteboardChatWindow from './WhiteboardChatWindow';
import WhiteboardRecorder from './WhiteboardRecorder';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

// Default colors (rainbow + black/white)
const DEFAULT_COLORS = [
    '#000000', '#ffffff', '#ef4444', // Black, White, Red
    '#f97316', '#eab308', '#22c55e', // Orange, Yellow, Green
    '#3b82f6', '#8b5cf6', '#ec4899', // Blue, Purple, Pink
];

// Highlighter colors with transparency
const HIGHLIGHTER_COLORS = [
    'rgba(255, 235, 59, 0.4)',  // Yellow
    'rgba(76, 175, 80, 0.4)',   // Green
    'rgba(33, 150, 243, 0.4)',  // Blue
    'rgba(233, 30, 99, 0.4)',   // Pink
    'rgba(255, 152, 0, 0.4)',   // Orange
];

const STROKE_WIDTHS = [2, 4, 6, 8, 12];

// Helper: Convert hex to RGB
const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
};

// Helper: Convert RGB to hex
const rgbToHex = (r, g, b) => {
    return '#' + [r, g, b].map(x => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
};

// Helper: Convert RGB to HSB
const rgbToHsb = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0, s = max === 0 ? 0 : d / max, v = max;
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), b: Math.round(v * 100) };
};

// Helper: Convert HSB to RGB
const hsbToRgb = (h, s, b) => {
    h /= 360; s /= 100; b /= 100;
    let r, g, bl;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = b * (1 - s);
    const q = b * (1 - f * s);
    const t = b * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = b; g = t; bl = p; break;
        case 1: r = q; g = b; bl = p; break;
        case 2: r = p; g = b; bl = t; break;
        case 3: r = p; g = q; bl = b; break;
        case 4: r = t; g = p; bl = b; break;
        case 5: r = b; g = p; bl = q; break;
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(bl * 255) };
};

// Helper: Get dash array based on stroke style
const getDashArray = (style) => {
    switch (style) {
        case 'dashed': return [10, 6];
        case 'dotted': return [3, 3];
        default: return [];
    }
};

function ScreenshotPickerModal({ onClose, onSelect }) {
    const [screenshots, setScreenshots] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchScreenshots = async () => {
            try {
                const res = await api.get('/documents?category=Screenshot');
                if (res.data && res.data.success) {
                    setScreenshots(res.data.data.documents || []);
                }
            } catch (err) {
                console.error("Failed to fetch screenshots", err);
            } finally {
                setLoading(false);
            }
        };
        fetchScreenshots();
    }, []);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800">Insert Screenshot</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : screenshots.length === 0 ? (
                        <div className="text-center text-slate-500 py-10">
                            No screenshots found. Take a screenshot first!
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {screenshots.map(doc => (
                                <div 
                                    key={doc.id} 
                                    className="border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:border-blue-500 hover:shadow-md transition group"
                                    onClick={() => onSelect(doc.url)}
                                >
                                    <div className="aspect-video bg-slate-100 flex items-center justify-center relative">
                                        <img 
                                            src={doc.url} 
                                            alt={doc.name} 
                                            className="w-full h-full object-contain"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                            <span className="text-white font-medium bg-blue-600/90 px-3 py-1.5 rounded-full text-sm">
                                                Insert
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-2 text-xs text-slate-600 truncate text-center">
                                        {new Date(doc.createdAt).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function Whiteboard({
    onSave,
    onClose,
    isFullscreen = false,
    onToggleFullscreen,
    width = 800,
    height = 600,
    // Sharing props
    onShare,
    isSharing = false,
    sharingTargets = [],
    onStopSharing,
    socket,
    sessionId,
    isInstructor = false,
    // Camera & Mic props
    showCameraControls = false,
    onCameraToggle,
    onMicToggle,
    isCameraOn = false,
    isMicOn = false,
    // Persistence prop - unique ID for this whiteboard (e.g., `wb_${userId}`)
    whiteboardId = null
}) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const currentPathPointsRef = useRef([]);
    const preStrokeImageDataRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState('pen'); // pen, eraser, select, highlighter, shape, laser, text, image
    const [color, setColor] = useState('#000000');
    const [strokeWidth, setStrokeWidth] = useState(4);
    const [eraserSize, setEraserSize] = useState(20); // Separate eraser size
    const [strokeStyle, setStrokeStyle] = useState('solid'); // solid, dashed, dotted
    const [showColorPicker, setShowColorPicker] = useState(false);
    
    // Pop-over UI states
    const [showStrokePicker, setShowStrokePicker] = useState(false);
    const [showStrokeStylePicker, setShowStrokeStylePicker] = useState(false);
    const [showEraserPicker, setShowEraserPicker] = useState(false);
    const [showShapePicker, setShowShapePicker] = useState(false);
    const [showSelectPicker, setShowSelectPicker] = useState(false);
    const [showHighlighterPicker, setShowHighlighterPicker] = useState(false);

    // Sub-tool options
    const [shapeType, setShapeType] = useState('rectangle'); // rectangle, circle, triangle, star
    const [shapePreview, setShapePreview] = useState(null);
    const [selectMode, setSelectMode] = useState('rectangle'); // rectangle, lasso
    const [showImagePicker, setShowImagePicker] = useState(false);
    const [showScreenshotModal, setShowScreenshotModal] = useState(false);

    // Multi-page state - must be before anything that uses currentPage
    const [pages, setPages] = useState([null]); // Array of canvas data URLs
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Background options - per page
    const [pageBackgrounds, setPageBackgrounds] = useState({ 0: { pattern: 'plain', color: '#ffffff' } });
    const [showBgPicker, setShowBgPicker] = useState(false);

    // Get current page background
    const currentBg = pageBackgrounds[currentPage] || { pattern: 'plain', color: '#ffffff' };
    const bgPattern = currentBg.pattern;
    const bgColor = currentBg.color;

    const setBgPattern = useCallback((pattern) => {
        setPageBackgrounds(prev => ({
            ...prev,
            [currentPage]: { ...prev[currentPage], pattern }
        }));
        if (socket && sessionId) {
            socket.emit('whiteboard:background-change', {
                sessionId,
                bgColor,
                bgPattern: pattern
            });
        }
    }, [currentPage, isSharing, socket, sessionId, bgColor]);

    const setBgColor = useCallback((color) => {
        setPageBackgrounds(prev => ({
            ...prev,
            [currentPage]: { ...prev[currentPage], color }
        }));
        if (socket && sessionId) {
            socket.emit('whiteboard:background-change', {
                sessionId,
                bgColor: color,
                bgPattern
            });
        }
    }, [currentPage, isSharing, socket, sessionId, bgPattern]);

    // Undo/Redo page-specific history
    const [pageHistories, setPageHistories] = useState({ 0: [] });
    const [pageHistoryIndices, setPageHistoryIndices] = useState({ 0: -1 });

    // Drawing state
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

    // Text tool state
    const [showTextInput, setShowTextInput] = useState(false);
    const [textPos, setTextPos] = useState({ x: 0, y: 0 });
    const [textValue, setTextValue] = useState('');

    // Selection state
    const [selection, setSelection] = useState(null); // { x, y, width, height, path?: [{x,y}] }
    const [lassoPath, setLassoPath] = useState([]);
    const [clipboardHistory, setClipboardHistory] = useState([]); // array of clipboard items
    const [showClipboard, setShowClipboard] = useState(false);
    // Laser pointer state
    const [laserPos, setLaserPos] = useState(null);
    const [isAutoShape, setIsAutoShape] = useState(false);
    const laserTimeoutRef = useRef(null);

    // Highlighter color
    const [highlighterColor, setHighlighterColor] = useState(HIGHLIGHTER_COLORS[0]);

    // Line / Arrow state
    const [lineType, setLineType] = useState('line');
    const [showLinePicker, setShowLinePicker] = useState(false);

    // Image insert
    const imageInputRef = useRef(null);

    // Recently used colors (3x3 = 9 colors)
    const [recentColors, setRecentColors] = useState(DEFAULT_COLORS);

    // Custom color picker state
    const [showCustomColorPicker, setShowCustomColorPicker] = useState(false);
    const [customColorMode, setCustomColorMode] = useState('rgb'); // 'rgb' or 'hsb'
    const [customRgb, setCustomRgb] = useState({ r: 0, g: 0, b: 0 });
    const [customHsb, setCustomHsb] = useState({ h: 0, s: 100, b: 100 });
    const [hexInput, setHexInput] = useState('#000000');

    // Image objects for manipulation (selectable, movable, resizable, rotatable)
    // Store images per page: { [pageIndex]: [imageObjects] }
    const [pageImageObjects, setPageImageObjects] = useState({ 0: [] });
    const [selectedImageId, setSelectedImageId] = useState(null);
    const [imageDragState, setImageDragState] = useState(null); // { id, action, startX, startY, startObj }

    // Text objects for manipulation (like images)
    const [pageTextObjects, setPageTextObjects] = useState({ 0: [] });
    const [selectedTextIds, setSelectedTextIds] = useState([]);
    const [selectedShapeIds, setSelectedShapeIds] = useState([]);
    const [editingTextId, setEditingTextId] = useState(null); // For double-click edit mode
    const [textDragState, setTextDragState] = useState(null);
    const [textInputMode, setTextInputMode] = useState('create'); // 'create' or 'edit'
    const [textBoundary, setTextBoundary] = useState(null); // { x, y, width, height } - dotted boundary while creating
    
    // Text formatting state
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [textBgColor, setTextBgColor] = useState('transparent');
    const [showTextBgPicker, setShowTextBgPicker] = useState(false);
    
    // Shape objects for manipulation
    const [pageShapeObjects, setPageShapeObjects] = useState({ 0: [] });
    const [shapeDragState, setShapeDragState] = useState(null);
    const [editingShapeTextId, setEditingShapeTextId] = useState(null);

    // OCR toggle
    const [isOcrActive, setIsOcrActive] = useState(false);

    // Fullscreen scaling
    const [fullscreenScale, setFullscreenScale] = useState(1);
    useEffect(() => {
        if (!isFullscreen) {
            setFullscreenScale(1);
            return;
        }
        const updateScale = () => {
            const wScale = window.innerWidth / width;
            const hScale = window.innerHeight / height;
            setFullscreenScale(Math.min(wScale, hScale) * 0.95);
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, [isFullscreen, width, height]);

    // Get current page's image objects (derived state)
    const imageObjects = pageImageObjects[currentPage] || [];

    // Get current page's text objects (derived state)
    const textObjects = pageTextObjects[currentPage] || [];

    // Get current page's shape objects (derived state)
    const shapeObjects = pageShapeObjects[currentPage] || [];

    // Helper ref to track current page for stable callbacks
    const currentPageRef = useRef(currentPage);
    currentPageRef.current = currentPage;

    // Stable setter functions that use ref to get current page
    const setImageObjects = useCallback((updater) => {
        setPageImageObjects(prev => ({
            ...prev,
            [currentPageRef.current]: typeof updater === 'function' ? updater(prev[currentPageRef.current] || []) : updater
        }));
    }, []);

    const setTextObjects = useCallback((updater) => {
        setPageTextObjects(prev => ({
            ...prev,
            [currentPageRef.current]: typeof updater === 'function' ? updater(prev[currentPageRef.current] || []) : updater
        }));
    }, []);

    const setShapeObjects = useCallback((updater) => {
        setPageShapeObjects(prev => ({
            ...prev,
            [currentPageRef.current]: typeof updater === 'function' ? updater(prev[currentPageRef.current] || []) : updater
        }));
    }, []);

    // Canvas dimensions - keep fixed to prevent content loss
    const canvasWidth = width;
    const canvasHeight = height;

    // Persistence: track if state has been loaded from localStorage
    const [isStateLoaded, setIsStateLoaded] = useState(false);
    const saveTimeoutRef = useRef(null);
    const STORAGE_KEY = whiteboardId ? `whiteboard_${whiteboardId}` : null;

    // Load state from localStorage or API on mount
    useEffect(() => {
        if (!STORAGE_KEY || isStateLoaded) return;

        const loadState = async () => {
            try {
                let saved = null;
                if (whiteboardId === 'admin-standalone') {
                    let token = null;
                    try {
                        const authStore = JSON.parse(localStorage.getItem('auth-storage'));
                        token = authStore?.state?.accessToken;
                    } catch (e) {}

                    if (token) {
                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/whiteboard/personal`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const data = await res.json();
                        if (data.success && data.data?.canvasData) {
                            saved = data.data.canvasData;
                        }
                    }
                } else {
                    saved = localStorage.getItem(STORAGE_KEY);
                }

                if (saved) {
                const state = JSON.parse(saved);
                // Restore all state
                if (state.pages) setPages(state.pages);
                if (state.currentPage !== undefined) setCurrentPage(state.currentPage);
                if (state.totalPages !== undefined) setTotalPages(state.totalPages);
                if (state.pageBackgrounds) setPageBackgrounds(state.pageBackgrounds);
                if (state.pageImageObjects) setPageImageObjects(state.pageImageObjects);
                if (state.pageTextObjects) setPageTextObjects(state.pageTextObjects);
                if (state.pageShapeObjects) setPageShapeObjects(state.pageShapeObjects);
                if (state.color) setColor(state.color);
                if (state.strokeWidth) setStrokeWidth(state.strokeWidth);
                if (state.eraserSize) setEraserSize(state.eraserSize);
                if (state.strokeStyle) setStrokeStyle(state.strokeStyle);
                if (state.tool) setTool(state.tool);

                // Restore canvas content for current page
                if (state.pages && state.pages[state.currentPage || 0]) {
                    const canvas = canvasRef.current;
                    if (canvas) {
                        const ctx = canvas.getContext('2d', { willReadFrequently: true });
                        const img = new Image();
                        img.onload = () => {
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            ctx.drawImage(img, 0, 0);
                        };
                        img.src = state.pages[state.currentPage || 0];
                    }
                }
                console.log('✅ Whiteboard state restored from localStorage');
            }
        } catch (e) {
            console.error('Error loading whiteboard state:', e);
        }
        setIsStateLoaded(true);
    };
    
    loadState();
    }, [STORAGE_KEY, whiteboardId]);

    // Save state to localStorage on changes (debounced)
    useEffect(() => {
        if (!STORAGE_KEY || !isStateLoaded) return;

        // Debounce saves to avoid excessive writes
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(() => {
            try {
                // Save current canvas to pages array
                const canvas = canvasRef.current;
                const updatedPages = [...pages];
                if (canvas) {
                    updatedPages[currentPage] = canvas.toDataURL('image/png');
                }

                const state = {
                    pages: updatedPages,
                    currentPage,
                    totalPages,
                    pageBackgrounds,
                    pageImageObjects,
                    pageTextObjects,
                    pageShapeObjects,
                    color,
                    strokeWidth,
                    eraserSize,
                    strokeStyle,
                    tool,
                    savedAt: Date.now()
                };
                
                const stateStr = JSON.stringify(state);
                
                if (whiteboardId === 'admin-standalone') {
                    let token = null;
                    try {
                        const authStore = JSON.parse(localStorage.getItem('auth-storage'));
                        token = authStore?.state?.accessToken;
                    } catch (e) {}

                    if (token) {
                        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/whiteboard/personal`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ canvasData: stateStr })
                        }).catch(e => console.error('Failed to sync whiteboard to DB:', e));
                    }
                } else {
                    localStorage.setItem(STORAGE_KEY, stateStr);
                }
            } catch (e) {
                console.error('Error saving whiteboard state:', e);
            }
        }, 1000); // Save 1 second after last change

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [STORAGE_KEY, pages, currentPage, totalPages, pageBackgrounds, pageImageObjects, pageTextObjects, pageShapeObjects, color, strokeWidth, eraserSize, strokeStyle, tool]);

    // Initialize canvas - keep transparent to show CSS background patterns
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        // Clear canvas (transparent) - CSS background will show through
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Save initial state
        saveToHistory();
    }, []);

    // Keep track of latest state in refs to avoid re-triggering sendCanvasState heavily
    const latestStateRef = useRef({ bgColor, bgPattern, imageObjects, textObjects, shapeObjects, laserPos });
    useEffect(() => {
        latestStateRef.current = { bgColor, bgPattern, imageObjects, textObjects, shapeObjects, laserPos };
    }, [bgColor, bgPattern, imageObjects, textObjects, shapeObjects, laserPos]);

    // Broadcast canvas state when sharing starts and periodically while sharing
    useEffect(() => {
        if (!socket || !sessionId) return;

        // Function to send current canvas state
        const sendCanvasState = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const imageData = canvas.toDataURL('image/png');
            const state = latestStateRef.current;
            socket.emit('whiteboard:canvas-state', {
                sessionId,
                imageData,
                bgColor: state.bgColor,
                bgPattern: state.bgPattern,
                imageObjects: state.imageObjects,
                textObjects: state.textObjects,
                shapeObjects: state.shapeObjects,
                laserPos: state.laserPos
            });
        };

        // Send immediately when sharing starts
        sendCanvasState();

        // Listen for state requests from new viewers
        const handleStateRequest = (data) => {
            if (data.sessionId === sessionId) {
                // Send targeted state instead of broadcasting to everyone
                const canvas = canvasRef.current;
                const imageData = canvas ? canvas.toDataURL() : null;
                const state = latestStateRef.current;
                socket.emit('whiteboard:send-state', {
                    sessionId,
                    imageData,
                    bgColor: state.bgColor,
                    bgPattern: state.bgPattern,
                    imageObjects: state.imageObjects,
                    textObjects: state.textObjects,
                    shapeObjects: state.shapeObjects,
                    laserPos: state.laserPos,
                    targetSocketId: data.requesterId
                });
            }
        };

        // Helper to convert dash styles
        const getDashArray = (style) => {
            switch (style) {
                case 'dashed': return [15, 15];
                case 'dotted': return [3, 3];
                default: return [];
            }
        };

        // Sync drawing events from other admin devices
        const handleDraw = (data) => {
            if (data.sessionId !== sessionId) return;

            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            if (data.isEraser || data.color === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.strokeStyle = 'rgba(0,0,0,1)';
                ctx.lineWidth = data.strokeWidth || 20;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                if (data.isStart) {
                    ctx.beginPath();
                    ctx.moveTo(data.x, data.y);
                } else {
                    ctx.lineTo(data.x, data.y);
                    ctx.stroke();
                }
                ctx.globalCompositeOperation = 'source-over';
            } else if (data.type === 'path') {
                ctx.strokeStyle = data.color || '#000000';
                ctx.lineWidth = data.strokeWidth || 4;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.setLineDash(getDashArray(data.strokeStyle));

                if (data.isStart) {
                    ctx.beginPath();
                    ctx.moveTo(data.x, data.y);
                } else {
                    ctx.lineTo(data.x, data.y);
                    ctx.stroke();
                }
            } else if (data.type === 'line') {
                ctx.strokeStyle = data.color || '#000000';
                ctx.lineWidth = data.strokeWidth || 4;
                ctx.lineCap = 'round';
                ctx.setLineDash(getDashArray(data.strokeStyle));
                ctx.beginPath();
                ctx.moveTo(data.startX, data.startY);
                ctx.lineTo(data.endX, data.endY);
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (data.type === 'rectangle') {
                ctx.strokeStyle = data.color || '#000000';
                ctx.lineWidth = data.strokeWidth || 4;
                ctx.setLineDash(getDashArray(data.strokeStyle));
                ctx.strokeRect(data.x, data.y, data.width, data.height);
                ctx.setLineDash([]);
            } else if (data.type === 'ellipse') {
                ctx.strokeStyle = data.color || '#000000';
                ctx.lineWidth = data.strokeWidth || 4;
                ctx.setLineDash(getDashArray(data.strokeStyle));
                ctx.beginPath();
                ctx.ellipse(data.centerX, data.centerY, data.radiusX, data.radiusY, 0, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (data.type === 'text') {
                ctx.font = `${data.fontSize || 18}px 'Inter', system-ui, sans-serif`;
                ctx.textBaseline = 'middle';
                ctx.fillStyle = data.color || '#000000';
                ctx.fillText(data.text, data.x, data.y);
            }
        };

        const handleClear = (data) => {
            if (data.sessionId !== sessionId) return;
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };

        const handleBackgroundChange = (data) => {
            if (data.sessionId !== sessionId) return;
            if (data.bgColor) setBgColor(data.bgColor);
            if (data.bgPattern) setBgPattern(data.bgPattern);
        };

        const handleCanvasState = (data) => {
            if (data.sessionId !== sessionId) return;
            if (data.bgColor) setBgColor(data.bgColor);
            if (data.bgPattern) setBgPattern(data.bgPattern);
            if (data.imageObjects) setImageObjects(data.imageObjects);
            if (data.textObjects) setTextObjects(data.textObjects);
            if (data.shapeObjects) setShapeObjects(data.shapeObjects);

            const canvas = canvasRef.current;
            if (!canvas || !data.imageData) return;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = data.imageData;
        };

        const handleObjectsUpdate = (data) => {
            if (data.sessionId !== sessionId) return;
            if (data.imageObjects) setImageObjects(data.imageObjects);
            if (data.textObjects) setTextObjects(data.textObjects);
            if (data.shapeObjects) setShapeObjects(data.shapeObjects);
        };

        socket.on('whiteboard:state-requested', handleStateRequest);
        socket.on('whiteboard:draw', handleDraw);
        socket.on('whiteboard:clear', handleClear);
        socket.on('whiteboard:background-change', handleBackgroundChange);
        socket.on('whiteboard:canvas-state', handleCanvasState);
        socket.on('whiteboard:objects-update', handleObjectsUpdate);

        return () => {
            socket.off('whiteboard:state-requested', handleStateRequest);
            socket.off('whiteboard:draw', handleDraw);
            socket.off('whiteboard:clear', handleClear);
            socket.off('whiteboard:background-change', handleBackgroundChange);
            socket.off('whiteboard:canvas-state', handleCanvasState);
            socket.off('whiteboard:objects-update', handleObjectsUpdate);
        };
    }, [isSharing, socket, sessionId]);

    // Granular sync for HTML overlay objects
    useEffect(() => {
        if (!socket || !sessionId) return;
        socket.emit('whiteboard:objects-update', {
            sessionId,
            imageObjects,
            textObjects,
            shapeObjects
        });
    }, [isSharing, socket, sessionId, imageObjects, textObjects, shapeObjects]);


    // Save current state to history
    const saveToHistory = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const imageData = canvas.toDataURL();
        const currentImages = pageImageObjects[currentPage] ? [...pageImageObjects[currentPage]] : [];
        const currentTexts = pageTextObjects[currentPage] ? [...pageTextObjects[currentPage]] : [];
        const currentShapes = pageShapeObjects[currentPage] ? [...pageShapeObjects[currentPage]] : [];

        setPageHistories(prev => {
            const currentHistory = prev[currentPage] || [];
            const currentIndex = pageHistoryIndices[currentPage] !== undefined ? pageHistoryIndices[currentPage] : -1;
            const newHistory = currentHistory.slice(0, currentIndex + 1);
            newHistory.push({
                imageData,
                imageObjects: currentImages,
                textObjects: currentTexts,
                shapeObjects: currentShapes
            });
            return {
                ...prev,
                [currentPage]: newHistory.slice(-50) // Keep last 50 states
            };
        });
        
        setPageHistoryIndices(prev => {
            const currentIndex = prev[currentPage] !== undefined ? prev[currentPage] : -1;
            return {
                ...prev,
                [currentPage]: Math.min(currentIndex + 1, 49)
            };
        });
    }, [pageHistoryIndices, pageImageObjects, pageTextObjects, pageShapeObjects, currentPage]);

    // Restore state from history
    const restoreFromHistory = useCallback((index) => {
        const canvas = canvasRef.current;
        const currentHistory = pageHistories[currentPage] || [];
        if (!canvas || !currentHistory[index]) return;

        const stateSnapshot = currentHistory[index];
        const imgData = typeof stateSnapshot === 'string' ? stateSnapshot : stateSnapshot.imageData;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            
            if (socket && sessionId) {
                socket.emit('whiteboard:canvas-state', {
                    sessionId,
                    imageData: imgData
                });
            }
        };
        img.src = imgData;

        if (typeof stateSnapshot === 'object') {
            setPageImageObjects(prev => ({ ...prev, [currentPage]: stateSnapshot.imageObjects }));
            setPageTextObjects(prev => ({ ...prev, [currentPage]: stateSnapshot.textObjects }));
            setPageShapeObjects(prev => ({ ...prev, [currentPage]: stateSnapshot.shapeObjects }));
            
            if (socket && sessionId) {
                socket.emit('whiteboard:objects-update', {
                    sessionId,
                    imageObjects: stateSnapshot.imageObjects,
                    textObjects: stateSnapshot.textObjects,
                    shapeObjects: stateSnapshot.shapeObjects
                });
            }
        }
    }, [pageHistories, currentPage, isSharing, socket, sessionId]);

    // Undo
    const handleUndo = useCallback(() => {
        const currentIndex = pageHistoryIndices[currentPage] !== undefined ? pageHistoryIndices[currentPage] : -1;
        if (currentIndex > 0) {
            const newIndex = currentIndex - 1;
            setPageHistoryIndices(prev => ({ ...prev, [currentPage]: newIndex }));
            restoreFromHistory(newIndex);
        }
    }, [pageHistoryIndices, currentPage, restoreFromHistory]);

    // Redo
    const handleRedo = useCallback(() => {
        const currentIndex = pageHistoryIndices[currentPage] !== undefined ? pageHistoryIndices[currentPage] : -1;
        const currentHistory = pageHistories[currentPage] || [];
        if (currentIndex < currentHistory.length - 1) {
            const newIndex = currentIndex + 1;
            setPageHistoryIndices(prev => ({ ...prev, [currentPage]: newIndex }));
            restoreFromHistory(newIndex);
        }
    }, [pageHistoryIndices, pageHistories, currentPage, restoreFromHistory]);

    // Clear canvas
    const handleClear = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        // Clear canvas (transparent) to show CSS background
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Also clear images, text, and shapes on current page
        setImageObjects([]);
        setTextObjects([]);
        setShapeObjects([]);
        setSelectedImageId(null);
        setSelectedTextIds([]);
        setSelectedShapeIds([]);
        setEditingTextId(null);

        saveToHistory();
    }, [saveToHistory]);

    // Copy selection to clipboard
    const handleCopySelection = useCallback(() => {
        if (!selection) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        let imageData;
        if (selection.path) {
            const offCanvas = document.createElement('canvas');
            offCanvas.width = selection.width;
            offCanvas.height = selection.height;
            const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
            
            offCtx.beginPath();
            offCtx.moveTo(selection.path[0].x - selection.x, selection.path[0].y - selection.y);
            for (let i = 1; i < selection.path.length; i++) {
                offCtx.lineTo(selection.path[i].x - selection.x, selection.path[i].y - selection.y);
            }
            offCtx.closePath();
            offCtx.clip();
            
            offCtx.drawImage(canvas, -selection.x, -selection.y);
            imageData = offCtx.getImageData(0, 0, selection.width, selection.height);
        } else {
            const offCanvas = document.createElement('canvas');
            offCanvas.width = selection.width;
            offCanvas.height = selection.height;
            const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
            offCtx.drawImage(canvas, -selection.x, -selection.y);
            imageData = offCtx.getImageData(0, 0, selection.width, selection.height);
        }
        
        // Convert to dataURL for display in clipboard history
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = selection.width;
        tempCanvas.height = selection.height;
        tempCanvas.getContext('2d', { willReadFrequently: true }).putImageData(imageData, 0, 0);
        const dataURL = tempCanvas.toDataURL();
        
        setClipboardHistory(prev => [{ 
            id: Date.now(), 
            type: 'drawing', 
            imageData, 
            dataURL,
            width: selection.width, 
            height: selection.height 
        }, ...prev].slice(0, 10)); // keep last 10
    }, [selection]);

    // Cut selection (copy + delete)
    const handleCutSelection = useCallback(() => {
        if (!selection) return;
        handleCopySelection();

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (selection.path) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(selection.path[0].x, selection.path[0].y);
            for (let i = 1; i < selection.path.length; i++) {
                ctx.lineTo(selection.path[i].x, selection.path[i].y);
            }
            ctx.closePath();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'black';
            ctx.fill();
            ctx.restore();
        } else {
            // Clear selection area (make transparent) to reveal CSS background
            ctx.clearRect(selection.x, selection.y, selection.width, selection.height);
        }
        setSelection(null);
        saveToHistory();
    }, [selection, handleCopySelection, saveToHistory]);

    // Paste from clipboard
    const handlePasteItem = useCallback((item) => {
        if (!item) return;
        
        if (item.type === 'drawing') {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            const x = (canvas.width - item.width) / 2;
            const y = (canvas.height - item.height) / 2;
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = item.width;
            tempCanvas.height = item.height;
            tempCanvas.getContext('2d', { willReadFrequently: true }).putImageData(item.imageData, 0, 0);
            
            ctx.drawImage(tempCanvas, x, y);
            saveToHistory();
        } else if (item.type === 'image') {
            setImageObjects(prev => [
                ...prev,
                {
                    ...item.data,
                    id: Date.now(),
                    x: item.data.x + 20,
                    y: item.data.y + 20
                }
            ]);
        } else if (item.type === 'text') {
            setTextObjects(prev => [
                ...prev,
                {
                    ...item.data,
                    id: Date.now(),
                    x: item.data.x + 20,
                    y: item.data.y + 20
                }
            ]);
        } else if (item.type === 'shape') {
            setShapeObjects(prev => [
                ...prev,
                {
                    ...item.data,
                    id: Date.now(),
                    x: item.data.x + 20,
                    y: item.data.y + 20
                }
            ]);
        } else if (item.type === 'shapes') {
            const newIds = [];
            setShapeObjects(prev => [
                ...prev,
                ...item.data.map((shape, index) => {
                    const newId = Date.now() + index;
                    newIds.push(newId);
                    return {
                        ...shape,
                        id: newId,
                        x: shape.x + 20,
                        y: shape.y + 20
                    };
                })
            ]);
            setTimeout(() => setSelectedShapeIds(newIds), 0);
        }
    }, [saveToHistory]);

    const handlePasteSelection = useCallback(() => {
        if (clipboardHistory.length === 0) return;
        handlePasteItem(clipboardHistory[0]);
    }, [clipboardHistory, handlePasteItem]);

    // Delete selection
    const handleDeleteSelection = useCallback(() => {
        if (!selection) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (selection.path) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(selection.path[0].x, selection.path[0].y);
            for (let i = 1; i < selection.path.length; i++) {
                ctx.lineTo(selection.path[i].x, selection.path[i].y);
            }
            ctx.closePath();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'black';
            ctx.fill();
            ctx.restore();
        } else {
            // Clear selection area (make transparent) to reveal CSS background
            ctx.clearRect(selection.x, selection.y, selection.width, selection.height);
        }
        setSelection(null);
        saveToHistory();
    }, [selection, saveToHistory]);

    // Select color and add to recently used
    const selectColor = useCallback((newColor) => {
        setColor(newColor);
        setShowColorPicker(false);
        setShowCustomColorPicker(false);

        // Update active text if any
        if ((selectedTextIds.length > 0 ? selectedTextIds[0] : null) || editingTextId) {
            const activeId = editingTextId || (selectedTextIds.length > 0 ? selectedTextIds[0] : null);
            setTextObjects(prev => prev.map(t => t.id === activeId ? { ...t, color: newColor } : t));
        } else if (selectedShapeIds.length > 0) {
            setShapeObjects(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, color: newColor } : s));
        }

        // Add to recently used (move to front, keep 9 max)
        setRecentColors(prev => {
            const filtered = prev.filter(c => c.toLowerCase() !== newColor.toLowerCase());
            return [newColor, ...filtered].slice(0, 9);
        });
    }, [editingTextId, (selectedTextIds.length > 0 ? selectedTextIds[0] : null), setTextObjects]);

    // Handle custom color RGB change
    const handleRgbChange = useCallback((key, value) => {
        const newRgb = { ...customRgb, [key]: Math.max(0, Math.min(255, parseInt(value) || 0)) };
        setCustomRgb(newRgb);
        const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
        setHexInput(hex);
        setCustomHsb(rgbToHsb(newRgb.r, newRgb.g, newRgb.b));
    }, [customRgb]);

    // Handle custom color HSB change
    const handleHsbChange = useCallback((key, value) => {
        const max = key === 'h' ? 360 : 100;
        const newHsb = { ...customHsb, [key]: Math.max(0, Math.min(max, parseInt(value) || 0)) };
        setCustomHsb(newHsb);
        const rgb = hsbToRgb(newHsb.h, newHsb.s, newHsb.b);
        setCustomRgb(rgb);
        setHexInput(rgbToHex(rgb.r, rgb.g, rgb.b));
    }, [customHsb]);

    // Handle hex input change
    const handleHexChange = useCallback((value) => {
        setHexInput(value);
        if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
            const rgb = hexToRgb(value);
            setCustomRgb(rgb);
            setCustomHsb(rgbToHsb(rgb.r, rgb.g, rgb.b));
        }
    }, []);

    // Apply custom color
    const applyCustomColor = useCallback(() => {
        selectColor(hexInput);
    }, [hexInput, selectColor]);

    // Unified Delete
    const handleDelete = useCallback(() => {
        if (selectedImageId) {
            setImageObjects(prev => prev.filter(img => img.id !== selectedImageId));
            setSelectedImageId(null);
        } else if ((selectedTextIds.length > 0 ? selectedTextIds[0] : null)) {
            setTextObjects(prev => prev.filter(txt => txt.id !== (selectedTextIds.length > 0 ? selectedTextIds[0] : null)));
            setSelectedTextIds([]);
        } else if (selectedShapeIds.length > 0) {
            setShapeObjects(prev => prev.filter(shp => !selectedShapeIds.includes(shp.id)));
            setSelectedShapeIds([]);
        } else if (selection) {
            handleDeleteSelection();
        }
        saveToHistory();
    }, [selectedImageId, (selectedTextIds.length > 0 ? selectedTextIds[0] : null), selectedShapeIds, selection, handleDeleteSelection, saveToHistory]);

    // Unified Copy
    const handleCopy = useCallback(() => {
        let objToCopy = null;
        if (selectedImageId) {
            objToCopy = imageObjects.find(img => img.id === selectedImageId);
            if (objToCopy) setClipboardHistory(prev => [{ id: Date.now(), type: 'image', data: { ...objToCopy }, dataURL: objToCopy.src }, ...prev].slice(0, 10));
        } else if ((selectedTextIds.length > 0 ? selectedTextIds[0] : null)) {
            objToCopy = textObjects.find(t => t.id === (selectedTextIds.length > 0 ? selectedTextIds[0] : null));
            if (objToCopy) setClipboardHistory(prev => [{ id: Date.now(), type: 'text', data: { ...objToCopy } }, ...prev].slice(0, 10));
        } else if (selectedShapeIds.length > 0) {
            const objsToCopy = shapeObjects.filter(s => selectedShapeIds.includes(s.id));
            if (objsToCopy.length > 0) {
                setClipboardHistory(prev => [{ id: Date.now(), type: 'shapes', data: objsToCopy.map(o => ({...o})) }, ...prev].slice(0, 10));
            }
        } else if (selection) {
            handleCopySelection();
        }
    }, [selectedImageId, (selectedTextIds.length > 0 ? selectedTextIds[0] : null), selectedShapeIds, selection, imageObjects, textObjects, shapeObjects, handleCopySelection]);

    // Unified Cut
    const handleCut = useCallback(() => {
        handleCopy();
        handleDelete();
    }, [handleCopy, handleDelete]);

    // Unified Paste
    const handlePaste = useCallback(() => {
        handlePasteSelection(); // this already uses clipboardHistory[0]
    }, [handlePasteSelection]);

    // Unified Duplicate
    const handleDuplicate = useCallback(() => {
        handleCopy();
        setTimeout(() => handlePaste(), 50);
    }, [handleCopy, handlePaste]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modKey = isMac ? e.metaKey : e.ctrlKey;
            const activeTag = document.activeElement.tagName.toLowerCase();
            const isInput = activeTag === 'input' || activeTag === 'textarea';

            if (isInput && !(selectedTextIds.length > 0 ? selectedTextIds[0] : null) && selectedShapeIds.length === 0) return; // let default inputs work

            if (modKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                handleCopy();
            } else if (modKey && e.key.toLowerCase() === 'x') {
                e.preventDefault();
                handleCut();
            } else if (modKey && e.key.toLowerCase() === 'v') {
                // Don't prevent default if focusing an input (they might be pasting real text)
                if (isInput) return;
                e.preventDefault();
                handlePaste();
            } else if (modKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                handleDuplicate();
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (!isInput || selectedImageId || selection || selectedShapeIds.length > 0) {
                    // Only prevent backspace/delete if not in an input, OR if we have an image/selection active (which can't be typed into)
                    e.preventDefault();
                    handleDelete();
                }
            } else if (e.key === 'Escape') {
                setSelectedImageId(null);
                setSelectedTextIds([]);
                setSelectedShapeIds([]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedImageId, (selectedTextIds.length > 0 ? selectedTextIds[0] : null), selectedShapeIds, selection, handleCopy, handleCut, handlePaste, handleDuplicate, handleDelete]);

    // Image manipulation mouse handlers
    useEffect(() => {
        if (!imageDragState) return;

        const handleMouseMove = (e) => {
            const dx = e.clientX - imageDragState.startX;
            const dy = e.clientY - imageDragState.startY;
            const startObj = imageDragState.startObj;

            if (imageDragState.action === 'move') {
                setImageObjects(prev => prev.map(img =>
                    img.id === imageDragState.id
                        ? { ...img, x: startObj.x + dx, y: startObj.y + dy }
                        : img
                ));
            } else if (imageDragState.action === 'rotate') {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const centerX = startObj.x + startObj.width / 2;
                const centerY = startObj.y + startObj.height / 2;
                const canvasCenterX = rect.left + (centerX / canvas.width) * rect.width;
                const canvasCenterY = rect.top + (centerY / canvas.height) * rect.height;

                const startAngle = Math.atan2(imageDragState.startY - canvasCenterY, imageDragState.startX - canvasCenterX);
                const currentAngle = Math.atan2(e.clientY - canvasCenterY, e.clientX - canvasCenterX);
                const angleDiff = (currentAngle - startAngle) * (180 / Math.PI);

                setImageObjects(prev => prev.map(img =>
                    img.id === imageDragState.id
                        ? { ...img, rotation: startObj.rotation + angleDiff }
                        : img
                ));
            } else if (imageDragState.action.startsWith('resize-')) {
                const handle = imageDragState.action.replace('resize-', '');
                let newX = startObj.x, newY = startObj.y;
                let newWidth = startObj.width, newHeight = startObj.height;
                const minSize = 50;

                if (handle.includes('e')) {
                    newWidth = Math.max(minSize, startObj.width + dx);
                }
                if (handle.includes('w')) {
                    const widthChange = Math.min(dx, startObj.width - minSize);
                    newX = startObj.x + widthChange;
                    newWidth = startObj.width - widthChange;
                }
                if (handle.includes('s')) {
                    newHeight = Math.max(minSize, startObj.height + dy);
                }
                if (handle.includes('n')) {
                    const heightChange = Math.min(dy, startObj.height - minSize);
                    newY = startObj.y + heightChange;
                    newHeight = startObj.height - heightChange;
                }

                setImageObjects(prev => prev.map(img =>
                    img.id === imageDragState.id
                        ? { ...img, x: newX, y: newY, width: newWidth, height: newHeight }
                        : img
                ));
            }
        };

        const handleMouseUp = () => {
            setImageDragState(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [imageDragState]);

    // Text manipulation mouse handlers (same pattern as images)
    useEffect(() => {
        if (!textDragState) return;

        const handleMouseMove = (e) => {
            const dx = e.clientX - textDragState.startX;
            const dy = e.clientY - textDragState.startY;
            const startObj = textDragState.startObj;

            if (textDragState.action === 'move') {
                setTextObjects(prev => prev.map(txt =>
                    txt.id === textDragState.id
                        ? { ...txt, x: startObj.x + dx, y: startObj.y + dy }
                        : txt
                ));
            } else if (textDragState.action === 'rotate') {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const centerX = startObj.x + startObj.width / 2;
                const centerY = startObj.y + startObj.height / 2;
                const canvasCenterX = rect.left + (centerX / canvas.width) * rect.width;
                const canvasCenterY = rect.top + (centerY / canvas.height) * rect.height;

                const startAngle = Math.atan2(textDragState.startY - canvasCenterY, textDragState.startX - canvasCenterX);
                const currentAngle = Math.atan2(e.clientY - canvasCenterY, e.clientX - canvasCenterX);
                const angleDiff = (currentAngle - startAngle) * (180 / Math.PI);

                setTextObjects(prev => prev.map(txt =>
                    txt.id === textDragState.id
                        ? { ...txt, rotation: (startObj.rotation || 0) + angleDiff }
                        : txt
                ));
            } else if (textDragState.action.startsWith('resize-')) {
                const handle = textDragState.action.replace('resize-', '');
                let newX = startObj.x, newY = startObj.y;
                let newWidth = startObj.width, newHeight = startObj.height;
                const minSize = 50;

                if (handle.includes('e')) {
                    newWidth = Math.max(minSize, startObj.width + dx);
                }
                if (handle.includes('w')) {
                    const widthChange = Math.min(dx, startObj.width - minSize);
                    newX = startObj.x + widthChange;
                    newWidth = startObj.width - widthChange;
                }
                if (handle.includes('s')) {
                    newHeight = Math.max(minSize, startObj.height + dy);
                }
                if (handle.includes('n')) {
                    const heightChange = Math.min(dy, startObj.height - minSize);
                    newY = startObj.y + heightChange;
                    newHeight = startObj.height - heightChange;
                }

                setTextObjects(prev => prev.map(txt =>
                    txt.id === textDragState.id
                        ? { ...txt, x: newX, y: newY, width: newWidth, height: newHeight }
                        : txt
                ));
            }
        };

        const handleMouseUp = () => {
            setTextDragState(null);
            saveToHistory();
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [textDragState, saveToHistory, setTextObjects]);

    // Handle shape dragging/resizing
    useEffect(() => {
        if (!shapeDragState) return;

        const handleMouseMove = (e) => {
            const dx = e.clientX - shapeDragState.startX;
            const dy = e.clientY - shapeDragState.startY;
            const startObj = shapeDragState.startObj;

            if (shapeDragState.action === 'move') {
                if (shapeDragState.startObjs && shapeDragState.startObjs.length > 0) {
                    setShapeObjects(prev => prev.map(shp => {
                        const sObj = shapeDragState.startObjs.find(s => s.id === shp.id);
                        return sObj ? { ...shp, x: sObj.x + dx, y: sObj.y + dy } : shp;
                    }));
                } else {
                    setShapeObjects(prev => prev.map(shp =>
                        shp.id === shapeDragState.id
                            ? { ...shp, x: startObj.x + dx, y: startObj.y + dy }
                            : shp
                    ));
                }
            } else if (shapeDragState.action === 'rotate') {
                const canvas = canvasRef.current;
                const rect = canvas.getBoundingClientRect();
                
                // Get the center of the shape in screen coordinates
                const centerX = startObj.x + startObj.width / 2;
                const centerY = startObj.y + startObj.height / 2;
                
                const canvasCenterX = rect.left + (centerX / canvas.width) * rect.width;
                const canvasCenterY = rect.top + (centerY / canvas.height) * rect.height;

                const startAngle = Math.atan2(shapeDragState.startY - canvasCenterY, shapeDragState.startX - canvasCenterX);
                const currentAngle = Math.atan2(e.clientY - canvasCenterY, e.clientX - canvasCenterX);
                const angleDiff = (currentAngle - startAngle) * (180 / Math.PI);

                setShapeObjects(prev => prev.map(shp =>
                    shp.id === shapeDragState.id
                        ? { ...shp, rotation: (startObj.rotation || 0) + angleDiff }
                        : shp
                ));
            } else if (shapeDragState.action.startsWith('resize-')) {
                const handle = shapeDragState.action.replace('resize-', '');
                let newX = startObj.x, newY = startObj.y;
                let newWidth = startObj.width, newHeight = startObj.height;
                const minSize = 20;

                if (handle.includes('e')) {
                    newWidth = Math.max(minSize, startObj.width + dx);
                }
                if (handle.includes('w')) {
                    const widthChange = Math.min(dx, startObj.width - minSize);
                    newX = startObj.x + widthChange;
                    newWidth = startObj.width - widthChange;
                }
                if (handle.includes('s')) {
                    newHeight = Math.max(minSize, startObj.height + dy);
                }
                if (handle.includes('n')) {
                    const heightChange = Math.min(dy, startObj.height - minSize);
                    newY = startObj.y + heightChange;
                    newHeight = startObj.height - heightChange;
                }

                setShapeObjects(prev => prev.map(shp =>
                    shp.id === shapeDragState.id
                        ? { ...shp, x: newX, y: newY, width: newWidth, height: newHeight }
                        : shp
                ));
            }
        };

        const handleMouseUp = () => {
            setShapeDragState(null);
            saveToHistory();
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [shapeDragState, saveToHistory, setShapeObjects]);

    // Click on canvas to deselect images and text
    const handleCanvasClick = useCallback(() => {
        setSelectedImageId(null);
        setSelectedTextIds([]);
        setEditingTextId(null);
        setSelectedShapeIds([]);
    }, []);

    // Get position from event (works for both mouse and touch)
    const getPosition = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX, clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }, []);

    // Emit draw event via socket when sharing
    const emitDrawEvent = useCallback((eventData) => {
        if (socket && sessionId) {
            socket.emit('whiteboard:draw', {
                sessionId,
                ...eventData
            });
        }
    }, [isSharing, socket, sessionId]);

    // Start drawing
    const startDrawing = useCallback((e) => {
        e.preventDefault();
        const pos = getPosition(e);

        // If text input is open and they click outside, let the blur event commit it.
        // Don't start a new drawing/text action.
        if (showTextInput) {
            return;
        }

        // Handle text or shape tool - start drawing boundary area
        if (tool === 'text' || tool === 'shape') {
            setIsDrawing(true);
            setStartPos(pos);
            setCurrentPos(pos);
            if (tool === 'text') setTextBoundary(null);
            if (tool === 'shape') setShapePreview(null);
            return;
        }

        // Handle select tool - start drawing selection box
        if (tool === 'select') {
            setSelection(null); // Clear previous selection
            if (selectMode === 'lasso') {
                setLassoPath([{ x: pos.x, y: pos.y }]);
            }
        }

        setIsDrawing(true);
        setStartPos(pos);
        setCurrentPos(pos);

        if (tool === 'pen' || tool === 'eraser' || tool === 'highlighter' || tool === 'line' || tool === 'arrow') {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.imageSmoothingEnabled = true;

            // Save pre-stroke canvas image data for shape auto-detection/replacement
            try {
                preStrokeImageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
            } catch (err) {}

            currentPathPointsRef.current = [pos];

            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);

            // Emit start event
            emitDrawEvent({
                type: 'path',
                isStart: true,
                x: pos.x,
                y: pos.y,
                color: tool === 'eraser' ? 'eraser' : (tool === 'highlighter' ? highlighterColor : color),
                strokeWidth: tool === 'eraser' ? eraserSize : (tool === 'highlighter' ? strokeWidth * 4 : strokeWidth),
                isHighlighter: tool === 'highlighter',
                isEraser: tool === 'eraser'
            });
        }

        // Handle laser pointer
        if (tool === 'laser') {
            setLaserPos(pos);
            if (laserTimeoutRef.current) {
                clearTimeout(laserTimeoutRef.current);
            }
            // Emit laser position
            if (socket && sessionId) {
                socket.emit('whiteboard:laser-update', {
                    sessionId,
                    laserPos: pos
                });
            }
        }
    }, [getPosition, tool, color, strokeWidth, eraserSize, highlighterColor, emitDrawEvent, isSharing, socket, sessionId]);

    // Handle text submission - creates a text object for manipulation
    const handleTextSubmit = useCallback(() => {
        if (!textValue.trim()) {
            setShowTextInput(false);
            setTextBoundary(null);
            return;
        }

        // Create a new text object with manipulation properties
        const newTextObj = {
            id: Date.now(),
            text: textValue,
            x: textBoundary ? textBoundary.x : textPos.x,
            y: textBoundary ? textBoundary.y : textPos.y,
            width: textBoundary ? Math.max(textBoundary.width, 100) : 200,
            height: textBoundary ? Math.max(textBoundary.height, 40) : 50,
            rotation: 0,
            color: color,
            fontSize: strokeWidth * 2 + 16,
            fontWeight: 'normal',
            fontStyle: 'normal',
            textAlign: 'left',
        };

        setTextObjects(prev => [...prev, newTextObj]);
        setSelectedTextIds([newTextObj.id]);
        setShowTextInput(false);
        setTextValue('');
        setTextBoundary(null);
        saveToHistory();
    }, [textValue, textPos, textBoundary, color, strokeWidth, saveToHistory, setTextObjects]);

    // Draw
    const draw = useCallback((e) => {
        if (!isDrawing) return;
        e.preventDefault();

        const pos = getPosition(e);
        setCurrentPos(pos);

        if (tool === 'select') {
            if (selectMode === 'lasso') {
                setLassoPath(prev => [...prev, { x: pos.x, y: pos.y }]);
            }
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = true;

        if (tool === 'highlighter') {
            const pts = currentPathPointsRef.current;
            pts.push(pos);

            if (preStrokeImageDataRef.current) {
                ctx.putImageData(preStrokeImageDataRef.current, 0, 0);
            }

            ctx.beginPath();
            ctx.strokeStyle = highlighterColor;
            ctx.lineWidth = strokeWidth * 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalCompositeOperation = 'source-over';

            ctx.moveTo(pts[0].x, pts[0].y);
            if (pts.length < 3) {
                ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
            } else {
                for (let i = 1; i < pts.length - 2; i++) {
                    const c = (pts[i].x + pts[i + 1].x) / 2;
                    const d = (pts[i].y + pts[i + 1].y) / 2;
                    ctx.quadraticCurveTo(pts[i].x, pts[i].y, c, d);
                }
                ctx.quadraticCurveTo(
                    pts[pts.length - 2].x,
                    pts[pts.length - 2].y,
                    pts[pts.length - 1].x,
                    pts[pts.length - 1].y
                );
            }
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
        } else if (tool === 'pen' || tool === 'eraser') {
            const pts = currentPathPointsRef.current;
            pts.push(pos);

            ctx.beginPath();
            if (tool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.strokeStyle = 'rgba(0,0,0,1)';
                ctx.lineWidth = eraserSize;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            } else { // pen
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = color;
                ctx.lineWidth = strokeWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.setLineDash(getDashArray(strokeStyle));
            }

            if (pts.length < 3) {
                const b = pts[0];
                ctx.moveTo(b.x, b.y);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
            } else {
                // Smooth quadratic curve for smooth antialiased writing
                const lastTwo = pts.slice(-3);
                const p0 = lastTwo[0];
                const p1 = lastTwo[1];
                const p2 = lastTwo[2];
                const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
                const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

                ctx.moveTo(mid1.x, mid1.y);
                ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
                ctx.stroke();
            }

            if (tool === 'eraser') {
                ctx.globalCompositeOperation = 'source-over';
            }

            emitDrawEvent({
                type: 'path',
                isStart: false,
                x: pos.x,
                y: pos.y,
                color: tool === 'eraser' ? 'eraser' : (tool === 'highlighter' ? highlighterColor : color),
                strokeWidth: tool === 'eraser' ? eraserSize : (tool === 'highlighter' ? strokeWidth * 4 : strokeWidth),
                isHighlighter: tool === 'highlighter',
                isEraser: tool === 'eraser',
                strokeStyle: tool === 'pen' ? strokeStyle : undefined
            });
        } else if (tool === 'line' || tool === 'arrow') {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (preStrokeImageDataRef.current) {
                ctx.putImageData(preStrokeImageDataRef.current, 0, 0);
            }
            if (tool === 'line') {
                ctx.strokeStyle = color;
                ctx.lineWidth = strokeWidth;
                ctx.lineCap = 'round';
                ctx.setLineDash(getDashArray(strokeStyle));
                ctx.beginPath();
                ctx.moveTo(startPos.x, startPos.y);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
                ctx.setLineDash([]);
            } else { // arrow
                ctx.strokeStyle = color;
                ctx.lineWidth = strokeWidth;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(startPos.x, startPos.y);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();

                const headLength = strokeWidth * 4;
                const angle = Math.atan2(pos.y - startPos.y, pos.x - startPos.x);
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(pos.x - headLength * Math.cos(angle - Math.PI / 6), pos.y - headLength * Math.sin(angle - Math.PI / 6));
                ctx.lineTo(pos.x - headLength * Math.cos(angle + Math.PI / 6), pos.y - headLength * Math.sin(angle + Math.PI / 6));
                ctx.closePath();
                ctx.fillStyle = color;
                ctx.fill();
            }
        } else if (tool === 'shape') {
            setShapePreview({
                x: Math.min(startPos.x, pos.x),
                y: Math.min(startPos.y, pos.y),
                width: Math.abs(pos.x - startPos.x),
                height: Math.abs(pos.y - startPos.y),
                type: shapeType,
                color,
                strokeWidth
            });
        } else if (tool === 'laser') {
            setLaserPos(pos);
            if (laserTimeoutRef.current) {
                clearTimeout(laserTimeoutRef.current);
            }
            laserTimeoutRef.current = setTimeout(() => setLaserPos(null), 1500);
            if (socket && sessionId) {
                socket.emit('whiteboard:laser-update', {
                    sessionId,
                    laserPos: pos
                });
            }
        }
    }, [isDrawing, getPosition, tool, color, strokeWidth, strokeStyle, eraserSize, highlighterColor, emitDrawEvent, isSharing, socket, sessionId]);

    // Stop drawing
    const stopDrawing = useCallback((e) => {
        if (!isDrawing) return;
        e.preventDefault();

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = true;

        const rawPos = getPosition(e);
        const pos = (rawPos && !isNaN(rawPos.x) && !isNaN(rawPos.y) && rawPos.x !== 0 && rawPos.y !== 0) ? rawPos : currentPos;

        if (tool === 'pen') {
            const pts = currentPathPointsRef.current;
            if (isAutoShape && pts && pts.length >= 8) {
                // Auto shape recognition when user closes or connects a path
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                let pathLength = 0;

                for (let i = 0; i < pts.length; i++) {
                    const pt = pts[i];
                    if (pt.x < minX) minX = pt.x;
                    if (pt.x > maxX) maxX = pt.x;
                    if (pt.y < minY) minY = pt.y;
                    if (pt.y > maxY) maxY = pt.y;
                    if (i > 0) {
                        pathLength += Math.hypot(pt.x - pts[i - 1].x, pt.y - pts[i - 1].y);
                    }
                }

                const w = maxX - minX;
                const h = maxY - minY;
                const pStart = pts[0];
                const pEnd = pts[pts.length - 1];
                const distClose = Math.hypot(pStart.x - pEnd.x, pStart.y - pEnd.y);
                const maxDim = Math.max(w, h);
                const isClosed = distClose < 20 || distClose < 0.15 * maxDim;

                // Shoelace formula for enclosed polygon area
                let polygonArea = 0;
                for (let i = 0; i < pts.length; i++) {
                    const nextPt = pts[(i + 1) % pts.length];
                    polygonArea += pts[i].x * nextPt.y - nextPt.x * pts[i].y;
                }
                polygonArea = Math.abs(polygonArea / 2);

                if (isClosed && maxDim > 20 && pathLength > 30) {
                    const circularity = (4 * Math.PI * polygonArea) / (pathLength * pathLength);
                    const aspectRatio = w / (h || 1);

                    // Calculate radius variance to distinguish true Circles from Squares/Rectangles/Semi-circles
                    const centerX = minX + w / 2;
                    const centerY = minY + h / 2;
                    let sumRadius = 0;
                    for (let i = 0; i < pts.length; i++) {
                        sumRadius += Math.hypot(pts[i].x - centerX, pts[i].y - centerY);
                    }
                    const avgRadius = sumRadius / pts.length;
                    let sumRadiusDiffSq = 0;
                    for (let i = 0; i < pts.length; i++) {
                        const r = Math.hypot(pts[i].x - centerX, pts[i].y - centerY);
                        sumRadiusDiffSq += (r - avgRadius) * (r - avgRadius);
                    }
                    const stdDevRadius = Math.sqrt(sumRadiusDiffSq / pts.length);
                    const radiusVarianceRatio = stdDevRadius / (avgRadius || 1);

                    // 1. Circle / Ellipse: Must have extremely low radius variance to avoid matching squares
                    if (circularity > 0.85 && radiusVarianceRatio < 0.12 && aspectRatio >= 0.6 && aspectRatio <= 1.6) {
                        if (preStrokeImageDataRef.current) {
                            ctx.putImageData(preStrokeImageDataRef.current, 0, 0);
                        }
                        const radiusX = w / 2;
                        const radiusY = h / 2;

                        ctx.strokeStyle = color;
                        ctx.lineWidth = strokeWidth;
                        ctx.setLineDash(getDashArray(strokeStyle));
                        ctx.beginPath();
                        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                        ctx.stroke();
                        ctx.setLineDash([]);

                        emitDrawEvent({
                            type: 'ellipse',
                            centerX, centerY, radiusX, radiusY, color, strokeWidth, strokeStyle
                        });
                    }
                    // 2. Rectangle / Square: Area fill > 0.68 of bounding box
                    else if (polygonArea / (w * h) > 0.68) {
                        if (preStrokeImageDataRef.current) {
                            ctx.putImageData(preStrokeImageDataRef.current, 0, 0);
                        }
                        ctx.strokeStyle = color;
                        ctx.lineWidth = strokeWidth;
                        ctx.setLineDash(getDashArray(strokeStyle));
                        ctx.strokeRect(minX, minY, w, h);
                        ctx.setLineDash([]);

                        emitDrawEvent({
                            type: 'rectangle',
                            x: minX, y: minY, width: w, height: h, color, strokeWidth, strokeStyle
                        });
                    }
                    // 3. Triangle
                    else if (polygonArea / (w * h) >= 0.28 && polygonArea / (w * h) <= 0.65) {
                        if (preStrokeImageDataRef.current) {
                            ctx.putImageData(preStrokeImageDataRef.current, 0, 0);
                        }
                        let topPt = pts[0], leftPt = pts[0], rightPt = pts[0];
                        pts.forEach(p => {
                            if (p.y < topPt.y) topPt = p;
                            if (p.x < leftPt.x) leftPt = p;
                            if (p.x > rightPt.x) rightPt = p;
                        });

                        ctx.strokeStyle = color;
                        ctx.lineWidth = strokeWidth;
                        ctx.setLineDash(getDashArray(strokeStyle));
                        ctx.beginPath();
                        ctx.moveTo(topPt.x, topPt.y);
                        ctx.lineTo(leftPt.x, leftPt.y);
                        ctx.lineTo(rightPt.x, rightPt.y);
                        ctx.closePath();
                        ctx.stroke();
                        ctx.setLineDash([]);

                        emitDrawEvent({
                            type: 'line',
                            startX: topPt.x, startY: topPt.y, endX: leftPt.x, endY: leftPt.y,
                            color, strokeWidth, strokeStyle
                        });
                        emitDrawEvent({
                            type: 'line',
                            startX: leftPt.x, startY: leftPt.y, endX: rightPt.x, endY: rightPt.y,
                            color, strokeWidth, strokeStyle
                        });
                        emitDrawEvent({
                            type: 'line',
                            startX: rightPt.x, startY: rightPt.y, endX: topPt.x, endY: topPt.y,
                            color, strokeWidth, strokeStyle
                        });
                    }
                } else if (!isClosed && pathLength > 40) {
                    const straightDist = Math.hypot(pStart.x - pEnd.x, pStart.y - pEnd.y);
                    const straightness = straightDist / pathLength;

                    // 4. Straight Line
                    if (straightness > 0.88) {
                        if (preStrokeImageDataRef.current) {
                            ctx.putImageData(preStrokeImageDataRef.current, 0, 0);
                        }
                        ctx.strokeStyle = color;
                        ctx.lineWidth = strokeWidth;
                        ctx.lineCap = 'round';
                        ctx.setLineDash(getDashArray(strokeStyle));
                        ctx.beginPath();
                        ctx.moveTo(pStart.x, pStart.y);
                        ctx.lineTo(pEnd.x, pEnd.y);
                        ctx.stroke();
                        ctx.setLineDash([]);

                        emitDrawEvent({
                            type: 'line',
                            startX: pStart.x, startY: pStart.y, endX: pEnd.x, endY: pEnd.y,
                            color, strokeWidth, strokeStyle
                        });
                    }
                }
            }
        } else if (tool === 'line') {
            ctx.strokeStyle = color;
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = 'round';
            ctx.setLineDash(getDashArray(strokeStyle));
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            ctx.setLineDash([]);

            if (lineType === 'arrow') {
                const headLength = strokeWidth * 4;
                const angle = Math.atan2(pos.y - startPos.y, pos.x - startPos.x);
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(
                    pos.x - headLength * Math.cos(angle - Math.PI / 6),
                    pos.y - headLength * Math.sin(angle - Math.PI / 6)
                );
                ctx.lineTo(
                    pos.x - headLength * Math.cos(angle + Math.PI / 6),
                    pos.y - headLength * Math.sin(angle + Math.PI / 6)
                );
                ctx.closePath();
                ctx.fillStyle = color;
                ctx.fill();
            }

            emitDrawEvent({
                type: 'line',
                startX: startPos.x,
                startY: startPos.y,
                endX: pos.x,
                endY: pos.y,
                color,
                strokeWidth,
                strokeStyle,
                lineType
            });
        } else if (tool === 'shape') {
            let x = Math.min(startPos.x, pos.x);
            let y = Math.min(startPos.y, pos.y);
            let w = Math.abs(pos.x - startPos.x);
            let h = Math.abs(pos.y - startPos.y);
            
            // Create default size if it was just a click
            if (w <= 10 && h <= 10) {
                w = 100;
                h = 100;
                x = pos.x - 50;
                y = pos.y - 50;
            }
            
            if (w > 0 && h > 0) {
                const newShapeObj = {
                    id: Date.now(),
                    type: shapeType, // 'rectangle', 'circle', 'triangle', 'star'
                    x, y, width: w, height: h,
                    rotation: 0,
                    color: color,
                    strokeWidth: strokeWidth,
                    text: '', // Embedded text
                    fontSize: 20
                };
                
                setShapeObjects(prev => [...prev, newShapeObj]);
                setSelectedShapeIds([newShapeObj.id]);
                saveToHistory();

                // Emit event to network
                if (socket && sessionId) {
                    socket.emit('whiteboard:shape-add', {
                        sessionId,
                        shape: newShapeObj
                    });
                }
            }
            setShapePreview(null);
        } else if (tool === 'select') {
            if (selectMode === 'lasso') {
                if (lassoPath.length > 2) {
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    for (const p of lassoPath) {
                        if (p.x < minX) minX = p.x;
                        if (p.y < minY) minY = p.y;
                        if (p.x > maxX) maxX = p.x;
                        if (p.y > maxY) maxY = p.y;
                    }
                    const selWidth = maxX - minX;
                    const selHeight = maxY - minY;
                    
                    if (selWidth > 5 && selHeight > 5) {
                        const selectedShapes = shapeObjects.filter(shape => 
                            shape.x < minX + selWidth && 
                            shape.x + shape.width > minX && 
                            shape.y < minY + selHeight && 
                            shape.y + shape.height > minY
                        ).map(s => s.id);

                        if (selectedShapes.length > 0) {
                            setSelectedShapeIds(selectedShapes);
                        } else {
                            setSelection({ x: minX, y: minY, width: selWidth, height: selHeight, path: lassoPath });
                        }
                    }
                }
                setLassoPath([]);
            } else {
                const x = Math.min(startPos.x, pos.x);
                const y = Math.min(startPos.y, pos.y);
                const selWidth = Math.abs(pos.x - startPos.x);
                const selHeight = Math.abs(pos.y - startPos.y);

                if (selWidth > 5 && selHeight > 5) {
                    const selectedShapes = shapeObjects.filter(shape => 
                        shape.x < x + selWidth && 
                        shape.x + shape.width > x && 
                        shape.y < y + selHeight && 
                        shape.y + shape.height > y
                    ).map(s => s.id);

                    if (selectedShapes.length > 0) {
                        setSelectedShapeIds(selectedShapes);
                    } else {
                        setSelection({ x, y, width: selWidth, height: selHeight });
                    }
                }
            }
        } else if (tool === 'text') {
            const x = Math.min(startPos.x, pos.x);
            const y = Math.min(startPos.y, pos.y);
            const textWidth = Math.max(100, Math.abs(pos.x - startPos.x));
            const textHeight = Math.max(30, Math.abs(pos.y - startPos.y));

            setTextBoundary({ x, y, width: textWidth, height: textHeight });
            setTextPos({ x, y });
            setTextValue('');
            setShowTextInput(true);
        }
        setIsDrawing(false);
        if (tool !== 'select' && tool !== 'laser' && tool !== 'text' && tool !== 'shape') {
            saveToHistory();
        }
    }, [isDrawing, getPosition, tool, isAutoShape, color, strokeWidth, strokeStyle, eraserSize, saveToHistory, emitDrawEvent, shapeType, setShapeObjects, isSharing, socket, sessionId]);

    // Screenshot - Composites all layers (background, canvas, images, text)
    const handleScreenshot = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Create a composite canvas
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const ctx = exportCanvas.getContext('2d', { willReadFrequently: true });

        // 1. Draw background color
        const currentBg = pageBackgrounds[currentPage] || { color: '#ffffff', pattern: 'none' };
        ctx.fillStyle = currentBg.color;
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        // 2. Draw background pattern if any
        if (currentBg.pattern && currentBg.pattern !== 'none') {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = '#888888';
            ctx.lineWidth = 1;

            const patternSize = 20;
            if (currentBg.pattern === 'grid') {
                for (let x = 0; x <= exportCanvas.width; x += patternSize) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, exportCanvas.height);
                    ctx.stroke();
                }
                for (let y = 0; y <= exportCanvas.height; y += patternSize) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(exportCanvas.width, y);
                    ctx.stroke();
                }
            } else if (currentBg.pattern === 'dots') {
                ctx.fillStyle = '#888888';
                for (let x = 0; x <= exportCanvas.width; x += patternSize) {
                    for (let y = 0; y <= exportCanvas.height; y += patternSize) {
                        ctx.beginPath();
                        ctx.arc(x, y, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            } else if (currentBg.pattern === 'lines') {
                for (let y = 0; y <= exportCanvas.height; y += patternSize) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(exportCanvas.width, y);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        // 3. Draw the main canvas (drawings)
        ctx.drawImage(canvas, 0, 0);

        // 4. Draw image objects
        const currentImageObjects = pageImageObjects[currentPage] || [];
        currentImageObjects.forEach(imgObj => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = imgObj.src;

            ctx.save();
            const centerX = imgObj.x + imgObj.width / 2;
            const centerY = imgObj.y + imgObj.height / 2;
            ctx.translate(centerX, centerY);
            ctx.rotate((imgObj.rotation || 0) * Math.PI / 180);
            ctx.drawImage(img, -imgObj.width / 2, -imgObj.height / 2, imgObj.width, imgObj.height);
            ctx.restore();
        });

        // 5. Draw text objects
        const currentTextObjects = pageTextObjects[currentPage] || [];
        currentTextObjects.forEach(txtObj => {
            ctx.save();
            const centerX = txtObj.x + txtObj.width / 2;
            const centerY = txtObj.y + txtObj.height / 2;
            ctx.translate(centerX, centerY);
            ctx.rotate((txtObj.rotation || 0) * Math.PI / 180);

            ctx.font = `${txtObj.fontStyle || 'normal'} ${txtObj.fontWeight || 'normal'} ${txtObj.fontSize}px ${txtObj.fontFamily || 'sans-serif'}`;
            ctx.fillStyle = txtObj.color;
            ctx.textAlign = txtObj.textAlign || 'left';
            ctx.textBaseline = 'top';

            // Handle multi-line text
            const lines = txtObj.text.split('\n');
            const lineHeight = txtObj.fontSize * 1.3;
            const startX = -txtObj.width / 2 + 8; // padding
            let startY = -txtObj.height / 2 + 8;

            lines.forEach(line => {
                ctx.fillText(line, startX, startY);
                startY += lineHeight;
            });
            ctx.restore();
        });

        let finalCanvas = exportCanvas;

        // If there's a selection, crop to it
        if (selection) {
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = selection.width;
            cropCanvas.height = selection.height;
            const cropCtx = cropCanvas.getContext('2d');
            cropCtx.drawImage(exportCanvas, -selection.x, -selection.y);
            finalCanvas = cropCanvas;
        }

        // Upload screenshot
        finalCanvas.toBlob(async (blob) => {
            if (!blob) return;
            const formData = new FormData();
            formData.append('file', blob, `screenshot-${new Date().getTime()}.png`);

            try {
                const res = await api.post('/whiteboard/screenshot', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (res.data && res.data.success) {
                    toast.success('Screenshot saved to Documents > Screenshots!');
                } else {
                    toast.error('Failed to save screenshot: ' + (res.data.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Screenshot upload error:', error);
                toast.error('Error saving screenshot.');
            }
        }, 'image/png');
    }, [currentPage, pageBackgrounds, pageImageObjects, pageTextObjects, selection]);

    // Save and return data
    const handleSave = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const imageData = canvas.toDataURL('image/png');
        if (onSave) {
            onSave(imageData);
        }
    }, [onSave]);

    // Get blob for upload
    const getBlob = useCallback(() => {
        return new Promise((resolve) => {
            const canvas = canvasRef.current;
            if (!canvas) {
                resolve(null);
                return;
            }
            canvas.toBlob((blob) => resolve(blob), 'image/png');
        });
    }, []);

    // Expose getBlob method
    useEffect(() => {
        if (canvasRef.current) {
            canvasRef.current.getBlob = getBlob;
        }
    }, [getBlob]);

    const tools = [
        { id: 'select', icon: MousePointer2, label: 'Select' },
        { id: 'pen', icon: Pencil, label: 'Pen' },
        { id: 'highlighter', icon: Highlighter, label: 'Highlighter' },
        { id: 'eraser', icon: Eraser, label: 'Eraser' },
        { id: 'laser', icon: Pointer, label: 'Laser Pointer' },
        { id: 'line', icon: Minus, label: 'Line' },
        { id: 'arrow', icon: MoveRight, label: 'Arrow' },
        { id: 'rectangle', icon: RectangleHorizontal, label: 'Rectangle' },
        { id: 'circle', icon: Circle, label: 'Circle' },
        { id: 'text', icon: Type, label: 'Text' },
        { id: 'image', icon: ImageIcon, label: 'Insert Image' },
    ];

    // Get cursor based on tool
    const getCursor = () => {
        if (tool === 'select') return 'default';
        if (tool === 'eraser') return `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${eraserSize}" height="${eraserSize}" viewBox="0 0 ${eraserSize} ${eraserSize}"><rect width="${eraserSize}" height="${eraserSize}" fill="white" stroke="black" stroke-width="1"/></svg>') ${eraserSize / 2} ${eraserSize / 2}, auto`;
        if (tool === 'text') return 'text';
        if (tool === 'laser') return 'none';
        if (tool === 'highlighter') return 'crosshair';
        // Pen cursor - pencil icon
        if (tool === 'pen') return `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${encodeURIComponent(color)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>') 2 22, crosshair`;
        if (tool === 'arrow') return 'crosshair';
        return 'crosshair';
    };

    // Insert DateTime Text
    const handleInsertDateTime = useCallback(() => {
        const now = new Date();
        const formatted = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }) + ' - ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        const newText = {
            id: 'datetime-stamp', // Fixed ID to overwrite previous
            text: formatted,
            x: 20,
            y: 20,
            color: color || '#000000',
            fontSize: Math.max(16, strokeWidth * 6),
            isEditing: false
        };
        
        setTextObjects(prev => {
            // Remove previous datetime stamp if exists, and append the new one
            return [...prev.filter(t => t.id !== 'datetime-stamp'), newText];
        });
        saveToHistory();
    }, [color, strokeWidth, saveToHistory, setTextObjects]);

    // Page navigation functions
    const saveCurrentPage = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const imageData = canvas.toDataURL();
        setPages(prev => {
            const newPages = [...prev];
            newPages[currentPage] = imageData;
            return newPages;
        });
    }, [currentPage]);

    const loadPage = useCallback((pageIndex) => {
        const canvas = canvasRef.current;
        if (!canvas || pageIndex < 0 || pageIndex >= totalPages) return;

        saveCurrentPage();

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (pages[pageIndex]) {
            const img = new Image();
            img.onload = () => {
                // Clear canvas (transparent) for CSS background to show
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = pages[pageIndex];
        } else {
            // Just clear (transparent) - no fill - for empty pages
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setCurrentPage(pageIndex);
    }, [pages, totalPages, saveCurrentPage]);

    const addNewPage = useCallback(() => {
        saveCurrentPage();
        const newIndex = totalPages;
        setPages(prev => [...prev, null]);
        setTotalPages(prev => prev + 1);
        setCurrentPage(newIndex);

        // Initialize background for new page
        setPageBackgrounds(prev => ({
            ...prev,
            [newIndex]: { pattern: 'plain', color: '#ffffff' }
        }));

        // Initialize image/text objects for new page
        setPageImageObjects(prev => ({ ...prev, [newIndex]: [] }));
        setPageTextObjects(prev => ({ ...prev, [newIndex]: [] }));

        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            // Clear canvas (transparent) to show CSS background
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        saveToHistory();
    }, [totalPages, saveCurrentPage, saveToHistory]);

    const goToPrevPage = useCallback(() => {
        if (currentPage > 0) loadPage(currentPage - 1);
    }, [currentPage, loadPage]);

    const goToNextPage = useCallback(() => {
        if (currentPage < totalPages - 1) loadPage(currentPage + 1);
    }, [currentPage, totalPages, loadPage]);

    // Image insert handler - creates selectable image objects
    const handleImageInsert = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = canvasRef.current;
                if (!canvas) return;

                // Scale image to fit canvas if too large
                let imgWidth = img.width;
                let imgHeight = img.height;
                const maxWidth = canvas.width * 0.6;
                const maxHeight = canvas.height * 0.6;

                if (imgWidth > maxWidth) {
                    const ratio = maxWidth / imgWidth;
                    imgWidth = maxWidth;
                    imgHeight *= ratio;
                }
                if (imgHeight > maxHeight) {
                    const ratio = maxHeight / imgHeight;
                    imgHeight = maxHeight;
                    imgWidth *= ratio;
                }

                // Create image object for manipulation
                const imageObj = {
                    id: Date.now(),
                    src: event.target.result,
                    x: (canvas.width - imgWidth) / 2,
                    y: (canvas.height - imgHeight) / 2,
                    width: imgWidth,
                    height: imgHeight,
                    rotation: 0, // degrees
                    imageElement: img
                };

                setImageObjects(prev => [...prev, imageObj]);
                setSelectedImageId(imageObj.id);

                // Emit image event
                emitDrawEvent({
                    type: 'image',
                    imageData: event.target.result,
                    x: imageObj.x,
                    y: imageObj.y,
                    width: imgWidth,
                    height: imgHeight
                });
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = ''; // Reset input
    }, [emitDrawEvent]);

    // Handle tool click - special handling for image tool
    const handleToolClick = useCallback((toolId) => {
        if (toolId === 'image') {
            imageInputRef.current?.click();
        } else {
            setTool(toolId);
        }
    }, []);

    return (
        <div
            ref={containerRef}
            className={`relative bg-white rounded-xl shadow-2xl flex flex-col ${isFullscreen ? 'h-full w-full border-0 rounded-none' : ''}`}
        >
            {/* Whiteboard Workspace Container */}

            {/* Common Format Bar for selected items */}
            {(selectedShapeIds.length > 0 || selectedTextIds.length > 0) && (
                <div className="absolute bottom-[4.5rem] left-1/2 transform -translate-x-1/2 bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-700/50 px-3 py-1.5 flex items-center gap-2 rounded-xl z-40 max-w-[95%] overflow-visible whitespace-nowrap hide-scrollbar transition-all text-slate-200">
                    <button onClick={handleDeleteSelection} className="p-1 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded" title="Delete Selection"><Trash2 size={16} /></button>
                    <div className="w-px h-4 bg-slate-700 mx-1"></div>
                    <button onClick={handleCopy} className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded" title="Copy"><Copy size={16} /></button>
                    <button onClick={handleCut} className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded" title="Cut"><Scissors size={16} /></button>
                    <button onClick={handlePaste} className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded" title="Paste"><ClipboardPaste size={16} /></button>
                    <button onClick={handleDuplicate} className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded" title="Duplicate"><Files size={16} /></button>
                    
                    {/* If shape is selected, show shape formatting */}
                    {selectedShapeIds.length > 0 && (
                        <>
                            <div className="w-px h-4 bg-slate-700 mx-1"></div>
                            <input
                                type="color"
                                value={selectedShapeIds.length === 1 ? (shapeObjects.find(s => s.id === selectedShapeIds[0])?.color || '#000000') : '#000000'}
                                onChange={(e) => setShapeObjects(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, color: e.target.value } : s))}
                                className="w-6 h-6 p-0 border border-slate-700 rounded cursor-pointer bg-slate-800"
                                title="Border Color"
                            />
                            <div className="relative group flex items-center">
                                <input
                                    type="color"
                                    value={selectedShapeIds.length === 1 ? (shapeObjects.find(s => s.id === selectedShapeIds[0])?.fillColor || '#ffffff') : '#ffffff'}
                                    onChange={(e) => setShapeObjects(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, fillColor: e.target.value } : s))}
                                    className="w-6 h-6 p-0 border border-slate-700 rounded cursor-pointer bg-slate-800"
                                    title="Fill Color"
                                />
                                <button
                                    onClick={() => setShapeObjects(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, fillColor: 'transparent' } : s))}
                                    className="text-xs bg-slate-800 px-1 py-1 ml-1 rounded hover:bg-slate-700 border border-slate-600"
                                    title="No Fill"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                            <select
                                value={selectedShapeIds.length === 1 ? (shapeObjects.find(s => s.id === selectedShapeIds[0])?.strokeWidth || 2) : 2}
                                onChange={(e) => setShapeObjects(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, strokeWidth: parseInt(e.target.value) } : s))}
                                className="h-6 px-1 text-xs border border-slate-700 rounded bg-slate-800 text-white outline-none"
                                title="Border Width"
                            >
                                {[1, 2, 4, 6, 8].map(w => <option key={w} value={w}>{w}px</option>)}
                            </select>
                        </>
                    )}

                    {/* Text formatting */}
                    {(selectedTextIds.length > 0 || selectedShapeIds.length > 0) && (
                        <>
                            <div className="w-px h-4 bg-slate-700 mx-1"></div>
                            <input
                                type="color"
                                value={selectedTextIds.length > 0 ? (textObjects.find(t => t.id === selectedTextIds[0])?.color || '#000000') : (shapeObjects.find(s => s.id === selectedShapeIds[0])?.textColor || '#000000')}
                                onChange={(e) => {
                                    if (selectedTextIds.length > 0) {
                                        setTextObjects(prev => prev.map(t => selectedTextIds.includes(t.id) ? { ...t, color: e.target.value } : t));
                                    }
                                    if (selectedShapeIds.length > 0) {
                                        setShapeObjects(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, textColor: e.target.value } : s));
                                    }
                                }}
                                className="w-6 h-6 p-0 border border-slate-700 rounded cursor-pointer bg-slate-800"
                                title="Text Color"
                            />
                            <button
                                onClick={() => {
                                    if (selectedTextIds.length > 0) {
                                        setTextObjects(prev => prev.map(t => selectedTextIds.includes(t.id) ? { ...t, fontWeight: t.fontWeight === 'bold' ? 'normal' : 'bold' } : t));
                                    }
                                    if (selectedShapeIds.length > 0) {
                                        setShapeObjects(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, fontWeight: s.fontWeight === 'bold' ? 'normal' : 'bold' } : s));
                                    }
                                }}
                                className="p-1 rounded hover:bg-slate-800 text-sm"
                                title="Bold"
                            ><span className="font-bold">B</span></button>
                            <button
                                onClick={() => {
                                    if (selectedTextIds.length > 0) {
                                        setTextObjects(prev => prev.map(t => selectedTextIds.includes(t.id) ? { ...t, fontStyle: t.fontStyle === 'italic' ? 'normal' : 'italic' } : t));
                                    }
                                    if (selectedShapeIds.length > 0) {
                                        setShapeObjects(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, fontStyle: s.fontStyle === 'italic' ? 'normal' : 'italic' } : s));
                                    }
                                }}
                                className="p-1 rounded hover:bg-slate-800 text-sm"
                                title="Italic"
                            ><span className="italic">I</span></button>
                            <input
                                type="number"
                                min="8" max="100"
                                value={selectedTextIds.length > 0 ? (textObjects.find(t => t.id === selectedTextIds[0])?.fontSize || 20) : (shapeObjects.find(s => s.id === selectedShapeIds[0])?.fontSize || 20)}
                                onChange={(e) => {
                                    const size = parseInt(e.target.value);
                                    if (selectedTextIds.length > 0) {
                                        setTextObjects(prev => prev.map(t => selectedTextIds.includes(t.id) ? { ...t, fontSize: size } : t));
                                    }
                                    if (selectedShapeIds.length > 0) {
                                        setShapeObjects(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, fontSize: size } : s));
                                    }
                                }}
                                className="h-6 w-12 px-1 text-xs border border-slate-700 rounded bg-slate-800 text-white outline-none"
                                title="Font Size"
                            />
                        </>
                    )}
                </div>
            )}

            {/* Floating Sleek Toolbar (Zoom-style) */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-700/50 px-2 py-1 flex items-center gap-0.5 rounded-full z-40 max-w-[95%] overflow-visible whitespace-nowrap hide-scrollbar transition-all">
                    {/* Tools */}
                    <div className="flex items-center gap-0.5">
                        <div className="flex items-center gap-0.5 relative">
                        {[
                            { id: 'select', icon: selectMode === 'lasso' ? Wand2 : MousePointer2, label: 'Select' },
                            { id: 'pen', icon: Pencil, label: 'Pen' },
                            { id: 'highlighter', icon: Highlighter, label: 'Highlighter' },
                            { id: 'eraser', icon: Eraser, label: 'Eraser' },
                            { id: 'line', icon: lineType === 'arrow' ? MoveRight : Minus, label: 'Lines & Arrows' },
                            { id: 'shape', icon: shapeType === 'circle' ? Circle : (shapeType === 'triangle' ? Triangle : (shapeType === 'star' ? Star : RectangleHorizontal)), label: 'Shapes' },
                            { id: 'text', icon: Type, label: 'Text' },
                            { id: 'image', icon: ImageIcon, label: 'Image' },
                            { id: 'laser', icon: Sparkles, label: 'Laser Pointer' },
                            { id: 'datetime', icon: CalendarClock, label: 'Insert DateTime' },
                        ].map(t => (
                            <div key={t.id} className="relative">
                                <button
                                    onClick={() => {
                                        if (t.id === 'datetime') {
                                            handleInsertDateTime();
                                            return;
                                        }
                                        if (tool === t.id) {
                                            // Re-click to open popup
                                            if (t.id === 'pen') setShowStrokePicker(!showStrokePicker);
                                            if (t.id === 'eraser') setShowEraserPicker(!showEraserPicker);
                                            if (t.id === 'select') setShowSelectPicker(!showSelectPicker);
                                            if (t.id === 'shape') setShowShapePicker(!showShapePicker);
                                            if (t.id === 'highlighter') setShowHighlighterPicker(!showHighlighterPicker);
                                            if (t.id === 'line') setShowLinePicker(!showLinePicker);
                                            if (t.id === 'text') setShowTextBgPicker(!showTextBgPicker);
                                            if (t.id === 'image') setShowImagePicker(!showImagePicker);
                                        } else {
                                            setTool(t.id);
                                            setShowStrokePicker(false);
                                            setShowEraserPicker(false);
                                            setShowSelectPicker(false);
                                            setShowShapePicker(false);
                                            setShowHighlighterPicker(false);
                                            setShowLinePicker(false);
                                            setShowTextBgPicker(false);
                                            setShowImagePicker(t.id === 'image');
                                        }
                                    }}
                                    className={`p-1 rounded-full transition-colors flex items-center justify-center ${tool === t.id ? 'bg-primary-500 text-white shadow-inner' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                                    title={t.label}
                                >
                                    <t.icon className="w-3.5 h-3.5" />
                                </button>
                                
                                {/* Popovers rendered relatively above the button */}
                                {tool === t.id && t.id === 'pen' && showStrokePicker && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 flex flex-col gap-2 min-w-[120px]">
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1 text-center">Stroke Width</p>
                                        <input
                                            type="range"
                                            min="1"
                                            max="20"
                                            value={strokeWidth}
                                            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                                            className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="text-xs text-white text-center mt-1">{strokeWidth}px</div>
                                    </div>
                                )}

                                {/* Image Tool Popover */}
                                {tool === t.id && t.id === 'image' && showImagePicker && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 flex flex-col gap-1 min-w-[150px]">
                                        <button 
                                            onClick={() => { imageInputRef.current?.click(); setShowImagePicker(false); }}
                                            className="text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded-md transition"
                                        >
                                            Upload from Device
                                        </button>
                                        <button 
                                            onClick={() => { setShowScreenshotModal(true); setShowImagePicker(false); }}
                                            className="text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded-md transition"
                                        >
                                            Insert Screenshot
                                        </button>
                                    </div>
                                )}

                                {tool === t.id && t.id === 'eraser' && showEraserPicker && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 flex flex-col gap-2 w-48">
                                        <div className="flex justify-between text-xs text-slate-300">
                                            <span>Size</span>
                                            <span>{eraserSize}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="30"
                                            value={eraserSize}
                                            onChange={(e) => setEraserSize(parseInt(e.target.value))}
                                            className="w-full accent-primary-500 cursor-pointer"
                                        />
                                    </div>
                                )}

                                {tool === t.id && t.id === 'highlighter' && showHighlighterPicker && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 flex gap-1">
                                        {HIGHLIGHTER_COLORS.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => { setHighlighterColor(c); setShowHighlighterPicker(false); }}
                                                className={`w-6 h-6 shrink-0 rounded-full border-2 ${highlighterColor === c ? 'border-primary-500' : 'border-transparent hover:border-slate-400'}`}
                                                style={{ backgroundColor: c }}
                                                title={c}
                                            />
                                        ))}
                                    </div>
                                )}

                                {tool === t.id && t.id === 'select' && showSelectPicker && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 flex flex-col gap-1 w-[120px]">
                                        <button
                                            onClick={() => { setSelectMode('rectangle'); setShowSelectPicker(false); }}
                                            className={`flex items-center gap-2 p-1.5 rounded-lg text-xs w-full text-left transition ${selectMode === 'rectangle' ? 'bg-primary-500/20 text-primary-400' : 'text-slate-300 hover:bg-slate-700'}`}
                                            title="Rectangle Select"
                                        >
                                            <RectangleHorizontal className="w-3.5 h-3.5" /> Rect Select
                                        </button>
                                        <button
                                            onClick={() => { setSelectMode('lasso'); setShowSelectPicker(false); }}
                                            className={`flex items-center gap-2 p-1.5 rounded-lg text-xs w-full text-left transition ${selectMode === 'lasso' ? 'bg-primary-500/20 text-primary-400' : 'text-slate-300 hover:bg-slate-700'}`}
                                            title="Lasso Select"
                                        >
                                            <Wand2 className="w-3.5 h-3.5" /> Lasso Select
                                        </button>
                                    </div>
                                )}

                                {tool === t.id && t.id === 'line' && showLinePicker && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 flex flex-col gap-1 w-[100px]">
                                        <button
                                            onClick={() => { setLineType('line'); setShowLinePicker(false); }}
                                            className={`flex items-center gap-2 p-1.5 rounded-lg text-xs w-full text-left transition ${lineType === 'line' ? 'bg-primary-500/20 text-primary-400' : 'text-slate-300 hover:bg-slate-700'}`}
                                            title="Line"
                                        >
                                            <Minus className="w-3.5 h-3.5" /> Line
                                        </button>
                                        <button
                                            onClick={() => { setLineType('arrow'); setShowLinePicker(false); }}
                                            className={`flex items-center gap-2 p-1.5 rounded-lg text-xs w-full text-left transition ${lineType === 'arrow' ? 'bg-primary-500/20 text-primary-400' : 'text-slate-300 hover:bg-slate-700'}`}
                                            title="Arrow"
                                        >
                                            <MoveRight className="w-3.5 h-3.5" /> Arrow
                                        </button>
                                    </div>
                                )}
                                
                                {tool === t.id && t.id === 'text' && showTextBgPicker && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 flex gap-2">
                                        <button
                                            onClick={() => {
                                                const newVal = !isBold;
                                                setIsBold(newVal);
                                                const activeId = editingTextId || (selectedTextIds.length > 0 ? selectedTextIds[0] : null);
                                                if (activeId) {
                                                    setTextObjects(prev => prev.map(t => t.id === activeId ? { ...t, fontWeight: newVal ? 'bold' : 'normal' } : t));
                                                } else {
                                                    setTextObjects(prev => prev.map(t => ({ ...t, fontWeight: newVal ? 'bold' : 'normal' })));
                                                }
                                            }}
                                            className={`p-1.5 rounded hover:bg-slate-700 ${isBold ? 'text-primary-400 font-bold' : 'text-slate-300'}`}
                                            title="Bold"
                                        >B</button>
                                        <button
                                            onClick={() => {
                                                const newVal = !isItalic;
                                                setIsItalic(newVal);
                                                const activeId = editingTextId || (selectedTextIds.length > 0 ? selectedTextIds[0] : null);
                                                if (activeId) {
                                                    setTextObjects(prev => prev.map(t => t.id === activeId ? { ...t, fontStyle: newVal ? 'italic' : 'normal' } : t));
                                                } else {
                                                    setTextObjects(prev => prev.map(t => ({ ...t, fontStyle: newVal ? 'italic' : 'normal' })));
                                                }
                                            }}
                                            className={`p-1.5 rounded hover:bg-slate-700 italic ${isItalic ? 'text-primary-400' : 'text-slate-300'}`}
                                            title="Italic"
                                        >I</button>
                                        <div className="w-px bg-slate-700 mx-1"></div>
                                        {['transparent', '#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff'].map(bg => (
                                            <button
                                                key={bg}
                                                onClick={() => {
                                                    setTextBgColor(bg);
                                                    const activeId = editingTextId || (selectedTextIds.length > 0 ? selectedTextIds[0] : null);
                                                    if (activeId) {
                                                        setTextObjects(prev => prev.map(t => t.id === activeId ? { ...t, bgColor: bg } : t));
                                                    } else {
                                                        setTextObjects(prev => prev.map(t => ({ ...t, bgColor: bg })));
                                                    }
                                                }}
                                                className={`w-6 h-6 rounded-full border-2 ${textBgColor === bg ? 'border-primary-500' : 'border-slate-600'}`}
                                                style={{ backgroundColor: bg === 'transparent' ? '#334155' : bg }}
                                                title={bg === 'transparent' ? 'No Background' : 'Set Background'}
                                            >
                                                {bg === 'transparent' && <span className="text-[10px] text-slate-400 block mt-[2px] ml-[2px]">🚫</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {tool === t.id && t.id === 'shape' && showShapePicker && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 grid grid-cols-2 gap-1 w-[120px]">
                                        {[
                                            { id: 'rectangle', icon: RectangleHorizontal, label: 'Rectangle' },
                                            { id: 'circle', icon: Circle, label: 'Circle' },
                                            { id: 'triangle', icon: Triangle, label: 'Triangle' },
                                            { id: 'star', icon: Star, label: 'Star' },
                                            { id: 'graph', icon: LineChart, label: '2D Graph' },
                                        ].map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => { setShapeType(s.id); setShowShapePicker(false); }}
                                                className={`flex flex-col items-center justify-center p-2 rounded-lg text-xs transition gap-1 ${shapeType === s.id ? 'bg-primary-500/20 text-primary-400' : 'text-slate-300 hover:bg-slate-700'}`}
                                                title={s.label}
                                            >
                                                <s.icon className="w-4 h-4" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        <input
                            type="file"
                            ref={imageInputRef}
                            onChange={handleImageInsert}
                            accept="image/png, image/jpeg, image/gif, image/webp"
                            className="hidden"
                        />
                    </div>

                    {/* Vertical Divider */}
                    

                    {/* Colors */}
                    <div className="flex items-center gap-0.5 relative">
                        <button
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            className="flex items-center gap-1 p-1 hover:bg-slate-800 rounded-full transition text-slate-300 hover:text-white"
                            title="Colors"
                        >
                            <div
                                className="w-3.5 h-3.5 rounded-full border border-slate-500/50 shadow-sm"
                                style={{ backgroundColor: color }}
                            />
                            <ChevronDown className="w-3 h-3 opacity-70" />
                        </button>

                        {showColorPicker && (
                            <div className="absolute bottom-full left-0 mb-2 p-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-10 w-[220px]">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-semibold text-slate-300">Colors</span>
                                    <button
                                        onClick={() => {
                                            setShowColorPicker(false);
                                            setShowCustomColorPicker(true);
                                        }}
                                        className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition flex items-center gap-1 text-[10px]"
                                    >
                                        <Pipette className="w-3 h-3" />
                                        Custom
                                    </button>
                                </div>
                                <div className="grid grid-cols-6 gap-1">
                                    {[...new Set([...DEFAULT_COLORS, ...recentColors])].slice(0, 18).map(c => (
                                        <button
                                            key={c}
                                            onClick={() => selectColor(c)}
                                            className={`w-6 h-6 rounded-full border ${color === c ? 'border-white ring-2 ring-primary-500' : 'border-slate-600 hover:scale-110'} transition-transform shadow-sm`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Custom Color Picker Modal */}
                    {showCustomColorPicker && (
                        <div className="absolute bottom-full left-0 mb-2 p-4 bg-white rounded-lg shadow-xl border border-slate-200 z-20 w-72">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-semibold text-slate-700">Custom Color</p>
                                <button onClick={() => setShowCustomColorPicker(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Color Preview */}
                            <div
                                className="w-full h-16 rounded-lg border border-slate-200 mb-3"
                                style={{ backgroundColor: hexInput }}
                            />

                            {/* Mode Tabs */}
                            <div className="flex gap-2 mb-3">
                                <button
                                    onClick={() => setCustomColorMode('rgb')}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${customColorMode === 'rgb' ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600'
                                        }`}
                                >
                                    RGB
                                </button>
                                <button
                                    onClick={() => setCustomColorMode('hsb')}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${customColorMode === 'hsb' ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600'
                                        }`}
                                >
                                    HSB
                                </button>
                            </div>

                            {/* RGB Sliders */}
                            {customColorMode === 'rgb' && (
                                <div className="space-y-2 mb-3">
                                    {['r', 'g', 'b'].map(key => (
                                        <div key={key} className="flex items-center gap-2">
                                            <span className="w-4 text-xs font-medium text-slate-500 uppercase">{key}</span>
                                            <input
                                                type="range"
                                                min="0"
                                                max="255"
                                                value={customRgb[key]}
                                                onChange={(e) => handleRgbChange(key, e.target.value)}
                                                className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                                                style={{
                                                    background: `linear-gradient(to right, 
                                                        ${key === 'r' ? `rgb(0,${customRgb.g},${customRgb.b}), rgb(255,${customRgb.g},${customRgb.b})` : ''}
                                                        ${key === 'g' ? `rgb(${customRgb.r},0,${customRgb.b}), rgb(${customRgb.r},255,${customRgb.b})` : ''}
                                                        ${key === 'b' ? `rgb(${customRgb.r},${customRgb.g},0), rgb(${customRgb.r},${customRgb.g},255)` : ''}
                                                    )`
                                                }}
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                max="255"
                                                value={customRgb[key]}
                                                onChange={(e) => handleRgbChange(key, e.target.value)}
                                                className="w-14 px-2 py-1 text-xs border border-slate-200 rounded text-center"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* HSB Sliders */}
                            {customColorMode === 'hsb' && (
                                <div className="space-y-2 mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-4 text-xs font-medium text-slate-500">H</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="360"
                                            value={customHsb.h}
                                            onChange={(e) => handleHsbChange('h', e.target.value)}
                                            className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                                            style={{ background: 'linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red)' }}
                                        />
                                        <input
                                            type="number"
                                            min="0"
                                            max="360"
                                            value={customHsb.h}
                                            onChange={(e) => handleHsbChange('h', e.target.value)}
                                            className="w-14 px-2 py-1 text-xs border border-slate-200 rounded text-center"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-4 text-xs font-medium text-slate-500">S</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={customHsb.s}
                                            onChange={(e) => handleHsbChange('s', e.target.value)}
                                            className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-slate-300 to-primary-500"
                                        />
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={customHsb.s}
                                            onChange={(e) => handleHsbChange('s', e.target.value)}
                                            className="w-14 px-2 py-1 text-xs border border-slate-200 rounded text-center"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-4 text-xs font-medium text-slate-500">B</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={customHsb.b}
                                            onChange={(e) => handleHsbChange('b', e.target.value)}
                                            className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-black to-white"
                                        />
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={customHsb.b}
                                            onChange={(e) => handleHsbChange('b', e.target.value)}
                                            className="w-14 px-2 py-1 text-xs border border-slate-200 rounded text-center"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Hex Input */}
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs font-medium text-slate-500">HEX</span>
                                <input
                                    type="text"
                                    value={hexInput}
                                    onChange={(e) => handleHexChange(e.target.value)}
                                    className="flex-1 px-2 py-1.5 text-sm border border-slate-200 rounded font-mono"
                    placeholder="#000000"
                                />
                            </div>

                            {/* Apply Button */}
                            <button
                                onClick={applyCustomColor}
                                className="w-full py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition"
                            >
                                Apply Color
                            </button>
                        </div>
                    )}

                        {/* Stroke Width Removed because it opens inside Pen popover */}

                        {/* Stroke Style */}
                        <div className="relative">
                            <button
                                onClick={() => setShowStrokeStylePicker(!showStrokeStylePicker)}
                                className="p-1 hover:bg-slate-800 rounded-full transition flex items-center justify-center text-slate-300 hover:text-white"
                                title="Stroke Style"
                            >
                                <div className="w-3.5 h-3.5 flex flex-col justify-center gap-[2px]">
                                    <div className="h-[2px] bg-current w-full" />
                                    {strokeStyle === 'dashed' && <div className="h-[2px] bg-current w-full border-l border-r border-transparent border-dashed" />}
                                    {strokeStyle === 'dotted' && <div className="h-[2px] bg-current w-full border-l border-r border-transparent border-dotted" />}
                                </div>
                            </button>
                            {showStrokeStylePicker && (
                                <div className="absolute bottom-full left-0 mb-2 p-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-10 w-28">
                                    <div className="flex flex-col gap-1">
                                        {['solid', 'dashed', 'dotted'].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => { setStrokeStyle(s); setShowStrokeStylePicker(false); }}
                                                className={`p-2 hover:bg-slate-700 rounded-lg text-xs capitalize text-slate-200 ${strokeStyle === s ? 'bg-slate-700 font-medium' : ''}`}
                                            >
                                                <div className={`h-0.5 w-full bg-current mb-1 ${s === 'dashed' ? 'border-dashed border-t-2' : s === 'dotted' ? 'border-dotted border-t-2' : 'border-solid border-t-2'}`} style={{ borderColor: 'currentColor', backgroundColor: 'transparent' }} />
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    

                    {/* Background Pattern */}
                    <div className="relative">
                        <button
                            onClick={() => setShowBgPicker(!showBgPicker)}
                            className="flex items-center gap-1 p-1 hover:bg-slate-800 rounded-full transition text-slate-300 hover:text-white"
                            title="Background Pattern"
                        >
                            <div
                                className="w-3.5 h-3.5 rounded-sm border border-slate-500/50"
                                style={{
                                    backgroundColor: bgColor,
                                    backgroundImage: bgPattern === 'dotted'
                                        ? 'radial-gradient(circle, #999 1px, transparent 1px)'
                                        : bgPattern === 'grid'
                                            ? 'linear-gradient(#ddd 1px, transparent 1px), linear-gradient(90deg, #ddd 1px, transparent 1px)'
                                            : 'none',
                                    backgroundSize: bgPattern === 'dotted' ? '8px 8px' : '10px 10px'
                                }}
                            />
                            <ChevronDown className="w-3 h-3 opacity-70" />
                        </button>
                        {showBgPicker && (
                            <div className="absolute bottom-full left-0 mb-2 p-3 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-10 w-48 text-slate-200">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Pattern</p>
                                <div className="grid grid-cols-4 gap-1 mb-3">
                                    {[
                                        { id: 'plain', label: 'Plain' },
                                        { id: 'dotted', label: 'Dots' },
                                        { id: 'grid', label: 'Grid' },
                                        { id: 'lined', label: 'Lines' }
                                    ].map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setBgPattern(p.id)}
                                            className={`p-1 rounded-lg border text-xs ${bgPattern === p.id ? 'border-primary-500 bg-primary-500/20 text-white' : 'border-slate-600 hover:bg-slate-700'}`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Extended Patterns</p>
                                <div className="grid grid-cols-4 gap-1 mb-3">
                                    {[
                                        { id: 'graph', label: 'Graph' },
                                        { id: 'music', label: 'Music' },
                                        { id: 'iso', label: 'Iso' },
                                        { id: 'hex', label: 'Hex' }
                                    ].map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setBgPattern(p.id)}
                                            className={`p-1 rounded-lg border text-xs ${bgPattern === p.id ? 'border-primary-500 bg-primary-500/20 text-white' : 'border-slate-600 hover:bg-slate-700'}`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Color</p>
                                <div className="grid grid-cols-5 gap-1 mb-2">
                                    {[
                                        '#ffffff', '#f5f5f5', '#e0e0e0', '#9e9e9e', '#424242', // Grays
                                        '#fff9c4', '#fff176', '#ffeb3b', '#ffc107', '#ff9800', // Yellows/Oranges
                                        '#c8e6c9', '#81c784', '#4caf50', '#2e7d32', '#1b5e20', // Greens
                                        '#bbdefb', '#64b5f6', '#2196f3', '#1565c0', '#0d47a1', // Blues
                                        '#f8bbd0', '#f06292', '#e91e63', '#ad1457', '#880e4f', // Pinks
                                    ].map((c, idx) => (
                                        <button
                                            key={c + idx}
                                            onClick={() => setBgColor(c)}
                                            className={`w-6 h-6 rounded-full border-2 ${bgColor === c ? 'border-white ring-2 ring-primary-400' : 'border-slate-600 hover:scale-110'} transition-transform shadow-sm`}
                                            style={{ backgroundColor: c }}
                                            title={c}
                                        />
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                    <input
                                        type="color"
                                        value={bgColor}
                                        onChange={(e) => setBgColor(e.target.value)}
                                        className="w-6 h-6 rounded cursor-pointer bg-transparent"
                                        title="Pick custom color"
                                    />
                                    <input
                                        type="text"
                                        value={bgColor}
                                        onChange={(e) => setBgColor(e.target.value)}
                                        className="flex-1 text-xs px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 uppercase"
                                        placeholder="#ffffff"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    

                    {/* OCR Toggle */}
                    <button
                        onClick={() => setIsOcrActive(!isOcrActive)}
                        className={`p-1 rounded-full transition-colors flex items-center justify-center ${isOcrActive ? 'bg-indigo-500 text-white shadow-inner' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                        title={isOcrActive ? 'Text Recognition (OCR) Active' : 'Enable Text Recognition (OCR)'}
                    >
                        <Scan className="w-3.5 h-3.5" />
                    </button>

                    

                    {/* Undo/Redo */}
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={handleUndo}
                            className="p-1 hover:bg-slate-800 rounded-full transition text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Undo"
                            disabled={(pageHistoryIndices[currentPage] !== undefined ? pageHistoryIndices[currentPage] : -1) <= 0}
                        >
                            <Undo2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={handleRedo}
                            className="p-1 hover:bg-slate-800 rounded-full transition text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Redo"
                            disabled={(pageHistoryIndices[currentPage] !== undefined ? pageHistoryIndices[currentPage] : -1) >= ((pageHistories[currentPage] || []).length - 1)}
                        >
                            <Redo2 className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Actions */}
                    <button
                        onClick={handleClear}
                        className="p-1 hover:bg-red-500/20 text-red-400 rounded-full transition"
                        title="Clear All"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {clipboardHistory.length > 0 && (
                        <button
                            onClick={() => setShowClipboard(!showClipboard)}
                            className={`p-1 rounded-full transition ${showClipboard ? 'bg-green-500/20 text-green-400' : 'hover:bg-green-500/20 text-slate-300 hover:text-green-400'}`}
                            title="Clipboard"
                        >
                            <Files className="w-4 h-4" />
                        </button>
                    )}

                    

                    {/* Page Navigation */}
                    <div className="flex items-center gap-0.5 bg-slate-800/80 rounded-full px-1 py-0.5">
                        <button
                            onClick={goToPrevPage}
                            disabled={currentPage === 0}
                            className="p-1 hover:bg-slate-700 rounded-full transition disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white"
                            title="Previous Page"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-medium text-slate-300 min-w-[36px] text-center tracking-wider">
                            {currentPage + 1}/{totalPages}
                        </span>
                        <button
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages - 1}
                            className="p-1 hover:bg-slate-700 rounded-full transition disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white"
                            title="Next Page"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={addNewPage}
                            className="p-1 hover:bg-green-500/20 text-green-400 rounded-full transition ml-0.5"
                            title="Add New Page"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    

                    {/* Sharing, Download & Save (Tight grouped) */}
                    <div className="flex items-center gap-0.5">
                        {isInstructor && (
                            <button
                                onClick={isSharing ? onStopSharing : onShare}
                                className={`p-1 rounded-full transition flex items-center justify-center ${isSharing
                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                    : 'text-amber-400 hover:bg-amber-500/20'
                                    }`}
                                title={isSharing ? 'Stop Sharing Whiteboard' : 'Share Whiteboard with Students'}
                            >
                                <Share2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button
                            onClick={handleScreenshot}
                            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition flex items-center justify-center"
                            title="Take Screenshot (Selection or Full Page)"
                        >
                            <Camera className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={onToggleFullscreen}
                            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition flex items-center justify-center"
                            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                        >
                            {isFullscreen ? (
                                <Minimize2 className="w-3.5 h-3.5" />
                            ) : (
                                <Maximize2 className="w-3.5 h-3.5" />
                            )}
                        </button>
                    </div>
                </div>
                
                {/* Clipboard Panel */}
                {showClipboard && clipboardHistory.length > 0 && (
                    <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-3 z-50 w-72 flex flex-col gap-2">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                            <h3 className="text-slate-200 text-sm font-semibold flex items-center gap-2"><Files className="w-4 h-4"/> Clipboard</h3>
                            <button onClick={() => setShowClipboard(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            {clipboardHistory.map((item, idx) => (
                                <button 
                                    key={item.id} 
                                    onClick={() => { handlePasteItem(item); setShowClipboard(false); }}
                                    className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden hover:border-primary-500 hover:ring-1 hover:ring-primary-500 transition relative group h-24 flex items-center justify-center p-1"
                                    title={`Paste ${item.type}`}
                                >
                                    {item.dataURL ? (
                                        <img src={item.dataURL} className="max-w-full max-h-full object-contain" />
                                    ) : item.type === 'text' ? (
                                        <div className="text-slate-300 text-xs truncate px-2">{item.data.text}</div>
                                    ) : (
                                        <div className="text-slate-400 text-xs uppercase">{item.type}</div>
                                    )}
                                    <div className="absolute inset-0 bg-primary-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <ClipboardPaste className="w-6 h-6 text-primary-400" />
                                    </div>
                                    <div className="absolute top-1 left-1 bg-slate-800/80 px-1 rounded text-[9px] text-slate-300 pointer-events-none">
                                        {idx + 1}
                                    </div>
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={() => { setClipboardHistory([]); setShowClipboard(false); }}
                            className="w-full mt-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition"
                        >
                            Clear Clipboard
                        </button>
                    </div>
                )}
            </div>

            {/* Canvas */}
            <div className={`flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center relative ${isFullscreen ? 'h-full' : ''}`}>

                <div 
                    className="relative"
                    style={{
                        width: canvasWidth,
                        height: canvasHeight,
                        transform: isFullscreen ? `scale(${fullscreenScale})` : 'none',
                        transformOrigin: 'center center'
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        width={canvasWidth}
                        height={canvasHeight}
                        className="rounded-lg shadow-lg touch-none"
                        style={{
                            backgroundColor: bgColor,
                            backgroundImage: (() => {
                                switch (bgPattern) {
                                    case 'dotted':
                                        return 'radial-gradient(circle, #999 1.5px, transparent 1.5px)';
                                    case 'grid':
                                        return 'linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)';
                                    case 'lined':
                                        return 'linear-gradient(#ccc 1px, transparent 1px)';
                                    case 'graph':
                                        return 'linear-gradient(#bbb 1px, transparent 1px), linear-gradient(90deg, #bbb 1px, transparent 1px), linear-gradient(#ddd 0.5px, transparent 0.5px), linear-gradient(90deg, #ddd 0.5px, transparent 0.5px)';
                                    case 'music':
                                        return 'repeating-linear-gradient(transparent 0px, transparent 7px, #aaa 8px, #aaa 9px)';
                                    case 'iso':
                                        // Isometric grid - triangular pattern
                                        return 'linear-gradient(60deg, #ccc 1px, transparent 1px), linear-gradient(-60deg, #ccc 1px, transparent 1px), linear-gradient(#ccc 1px, transparent 1px)';
                                    case 'hex':
                                        // Hexagonal pattern using overlapping radial gradients
                                        return 'radial-gradient(circle, transparent 12px, #ccc 13px, #ccc 14px, transparent 15px), radial-gradient(circle, transparent 12px, #ccc 13px, #ccc 14px, transparent 15px)';
                                    default:
                                        return 'none';
                                }
                            })(),
                            backgroundSize: (() => {
                                switch (bgPattern) {
                                    case 'dotted': return '20px 20px';
                                    case 'grid': return '25px 25px';
                                    case 'lined': return '100% 25px';
                                    case 'graph': return '100px 100px, 100px 100px, 20px 20px, 20px 20px';
                                    case 'music': return '100% 40px';
                                    case 'iso': return '30px 52px';
                                    case 'hex': return '60px 52px';
                                    default: return 'auto';
                                }
                            })(),
                            backgroundPosition: (() => {
                                switch (bgPattern) {
                                    case 'iso': return '0 0, 0 0, 0 0';
                                    case 'hex': return '0 0, 30px 26px';
                                    default: return undefined;
                                }
                            })(),
                            cursor: getCursor(),
                            border: '2px solid #e2e8f0',
                            outline: '1px solid #cbd5e1'
                        }}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        onClick={handleCanvasClick}
                    />

                    {/* Live Preview Overlay - Shows dotted shape preview while drawing */}
                    {isDrawing && (tool === 'line' || tool === 'arrow' || tool === 'rectangle' || tool === 'circle' || tool === 'select' || tool === 'text') && (
                        <svg
                            className="absolute top-0 left-0 pointer-events-none"
                            width={canvasWidth}
                            height={canvasHeight}
                            style={{
                                maxWidth: isFullscreen ? '95vw' : '100%',
                                maxHeight: isFullscreen ? 'calc(100vh - 200px)' : '100%',
                            }}
                            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
                        >
                            {tool === 'line' && (
                                <line
                                    x1={startPos.x}
                                    y1={startPos.y}
                                    x2={currentPos.x}
                                    y2={currentPos.y}
                                    stroke={color}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray="5,5"
                                    strokeLinecap="round"
                                />
                            )}
                            {tool === 'arrow' && (
                                <g>
                                    <line
                                        x1={startPos.x}
                                        y1={startPos.y}
                                        x2={currentPos.x}
                                        y2={currentPos.y}
                                        stroke={color}
                                        strokeWidth={strokeWidth}
                                        strokeDasharray="5,5"
                                        strokeLinecap="round"
                                    />
                                    {/* Arrow head preview */}
                                    <polygon
                                        points={(() => {
                                            const headLength = strokeWidth * 4;
                                            const angle = Math.atan2(currentPos.y - startPos.y, currentPos.x - startPos.x);
                                            const p1 = `${currentPos.x},${currentPos.y}`;
                                            const p2 = `${currentPos.x - headLength * Math.cos(angle - Math.PI / 6)},${currentPos.y - headLength * Math.sin(angle - Math.PI / 6)}`;
                                            const p3 = `${currentPos.x - headLength * Math.cos(angle + Math.PI / 6)},${currentPos.y - headLength * Math.sin(angle + Math.PI / 6)}`;
                                            return `${p1} ${p2} ${p3}`;
                                        })()}
                                        fill={color}
                                        opacity={0.5}
                                    />
                                </g>
                            )}
                            {tool === 'rectangle' && (
                                <rect
                                    x={Math.min(startPos.x, currentPos.x)}
                                    y={Math.min(startPos.y, currentPos.y)}
                                    width={Math.abs(currentPos.x - startPos.x)}
                                    height={Math.abs(currentPos.y - startPos.y)}
                                    stroke={color}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray="5,5"
                                    fill="none"
                                />
                            )}
                            {tool === 'circle' && (
                                <ellipse
                                    cx={startPos.x + (currentPos.x - startPos.x) / 2}
                                    cy={startPos.y + (currentPos.y - startPos.y) / 2}
                                    rx={Math.abs(currentPos.x - startPos.x) / 2}
                                    ry={Math.abs(currentPos.y - startPos.y) / 2}
                                    stroke={color}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray="5,5"
                                    fill="none"
                                />
                            )}
                            {tool === 'select' && (
                                <rect
                                    x={Math.min(startPos.x, currentPos.x)}
                                    y={Math.min(startPos.y, currentPos.y)}
                                    width={Math.abs(currentPos.x - startPos.x)}
                                    height={Math.abs(currentPos.y - startPos.y)}
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    strokeDasharray="6,4"
                                    fill="rgba(59, 130, 246, 0.1)"
                                />
                            )}
                            {/* Text boundary preview */}
                            {tool === 'text' && (
                                <rect
                                    x={Math.min(startPos.x, currentPos.x)}
                                    y={Math.min(startPos.y, currentPos.y)}
                                    width={Math.max(100, Math.abs(currentPos.x - startPos.x))}
                                    height={Math.max(30, Math.abs(currentPos.y - startPos.y))}
                                    stroke="#000"
                                    strokeWidth={1}
                                    strokeDasharray="4,4"
                                    fill="rgba(255, 255, 255, 0.8)"
                                />
                            )}
                        </svg>
                    )}

                    {/* Image Objects Layer - Selectable, Movable, Resizable, Rotatable */}
                    {imageObjects.map((imgObj) => {
                        const isSelected = selectedImageId === imgObj.id;
                        const handleSize = 10;

                        return (
                            <div
                                key={imgObj.id}
                                className="absolute"
                                style={{
                                    left: imgObj.x,
                                    top: imgObj.y,
                                    width: imgObj.width,
                                    height: imgObj.height,
                                    transform: `rotate(${imgObj.rotation}deg)`,
                                    transformOrigin: 'center center',
                                    cursor: isSelected ? 'move' : 'pointer',
                                    zIndex: isSelected ? 20 : 10,
                                    // Disable pointer events when select tool is active so selection rectangle can be drawn
                                    pointerEvents: 'auto',
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedImageId(imgObj.id);
                                }}
                                onMouseDown={(e) => {
                                    if (!isSelected) {
                                        e.stopPropagation();
                                        setSelectedImageId(imgObj.id);
                                        return;
                                    }
                                    if (e.target.dataset.handle) return; // Let handles handle their own events
                                    e.stopPropagation();
                                    setImageDragState({
                                        id: imgObj.id,
                                        action: 'move',
                                        startX: e.clientX,
                                        startY: e.clientY,
                                        startObj: { ...imgObj }
                                    });
                                }}
                            >
                                {/* Image */}
                                <img
                                    src={imgObj.src}
                                    alt="Inserted"
                                    className="w-full h-full object-contain pointer-events-none select-none"
                                    draggable={false}
                                />

                                {/* Selection Border */}
                                {isSelected && (
                                    <>
                                        <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />

                                        {/* Corner Resize Handles */}
                                        {['nw', 'ne', 'sw', 'se'].map(corner => {
                                            const pos = {
                                                nw: { left: -handleSize / 2, top: -handleSize / 2, cursor: 'nwse-resize' },
                                                ne: { right: -handleSize / 2, top: -handleSize / 2, cursor: 'nesw-resize' },
                                                sw: { left: -handleSize / 2, bottom: -handleSize / 2, cursor: 'nesw-resize' },
                                                se: { right: -handleSize / 2, bottom: -handleSize / 2, cursor: 'nwse-resize' },
                                            }[corner];

                                            return (
                                                <div
                                                    key={corner}
                                                    data-handle={corner}
                                                    className="absolute bg-white border-2 border-blue-500 rounded-sm z-30"
                                                    style={{
                                                        width: handleSize,
                                                        height: handleSize,
                                                        ...pos,
                                                    }}
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        setImageDragState({
                                                            id: imgObj.id,
                                                            action: `resize-${corner}`,
                                                            startX: e.clientX,
                                                            startY: e.clientY,
                                                            startObj: { ...imgObj }
                                                        });
                                                    }}
                                                />
                                            );
                                        })}

                                        {/* Edge Resize Handles */}
                                        {['n', 'e', 's', 'w'].map(edge => {
                                            const pos = {
                                                n: { left: '50%', top: -handleSize / 2, transform: 'translateX(-50%)', cursor: 'ns-resize' },
                                                s: { left: '50%', bottom: -handleSize / 2, transform: 'translateX(-50%)', cursor: 'ns-resize' },
                                                e: { right: -handleSize / 2, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' },
                                                w: { left: -handleSize / 2, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' },
                                            }[edge];

                                            return (
                                                <div
                                                    key={edge}
                                                    data-handle={edge}
                                                    className="absolute bg-white border-2 border-blue-500 rounded-sm z-30"
                                                    style={{
                                                        width: handleSize,
                                                        height: handleSize,
                                                        ...pos,
                                                    }}
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        setImageDragState({
                                                            id: imgObj.id,
                                                            action: `resize-${edge}`,
                                                            startX: e.clientX,
                                                            startY: e.clientY,
                                                            startObj: { ...imgObj }
                                                        });
                                                    }}
                                                />
                                            );
                                        })}

                                        {/* Rotate Handle */}
                                        <div
                                            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center z-30"
                                            style={{ top: -35 }}
                                        >
                                            <div className="w-px h-5 bg-blue-500" />
                                            <div
                                                data-handle="rotate"
                                                className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center cursor-grab hover:bg-blue-600"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    setImageDragState({
                                                        id: imgObj.id,
                                                        action: 'rotate',
                                                        startX: e.clientX,
                                                        startY: e.clientY,
                                                        startObj: { ...imgObj }
                                                    });
                                                }}
                                            >
                                                <RotateCw className="w-3 h-3 text-white" />
                                            </div>
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center z-30 shadow-lg"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setImageObjects(prev => prev.filter(i => i.id !== imgObj.id));
                                                setSelectedImageId(null);
                                                saveToHistory();
                                            }}
                                        >
                                            <X className="w-3 h-3 text-white" />
                                        </button>
                                    </>
                                )}
                            </div>
                        );
                    })}

                    {/* Text Objects Layer - Selectable, Movable, Resizable, Rotatable, Editable */}
                    {textObjects.map((txtObj) => {
                        const isSelected = (selectedTextIds.length > 0 ? selectedTextIds[0] : null) === txtObj.id;
                        const isEditing = editingTextId === txtObj.id;
                        const handleSize = 10;

                        return (
                            <div
                                key={txtObj.id}
                                className="absolute"
                                style={{
                                    left: txtObj.x,
                                    top: txtObj.y,
                                    width: txtObj.width,
                                    minHeight: txtObj.height,
                                    transform: `rotate(${txtObj.rotation || 0}deg)`,
                                    transformOrigin: 'center center',
                                    cursor: isEditing ? 'text' : isSelected ? 'move' : 'pointer',
                                    zIndex: isEditing ? 30 : isSelected ? 25 : 15,
                                    pointerEvents: tool === 'select' || tool === 'text' || isSelected || isEditing ? 'auto' : 'none',
                                    backgroundColor: txtObj.bgColor || 'transparent',
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isEditing) {
                                        setSelectedTextIds([txtObj.id]);
                                        setSelectedImageId(null);
                                    }
                                }}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTextId(txtObj.id);
                                    setSelectedTextIds([txtObj.id]);
                                }}
                                onMouseDown={(e) => {
                                    if (e.target.tagName.toLowerCase() === 'textarea' || e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'select' || e.target.tagName.toLowerCase() === 'button') {
                                        return;
                                    }
                                    if (!isSelected) {
                                        e.stopPropagation();
                                        if (tool === 'select' && (e.ctrlKey || e.metaKey)) {
                                            setSelectedTextIds(prev => prev.includes(txtObj.id) ? prev.filter(id => id !== txtObj.id) : [...prev, txtObj.id]);
                                        } else {
                                            setSelectedTextIds([txtObj.id]);
                                        }
                                        setSelectedImageId(null);
                                        setSelectedShapeIds([]);
                                        // allow drag state to be set
                                    }
                                    if (e.target.dataset.handle) return;
                                    e.stopPropagation();
                                    e.preventDefault(); // Prevent text selection deselect when dragging wrapper
                                    setTextDragState({
                                        id: txtObj.id,
                                        action: 'move',
                                        startX: e.clientX,
                                        startY: e.clientY,
                                        startObj: { ...txtObj }
                                    });
                                }}
                            >
                                {/* Text Content or Edit Textarea */}
                                {isEditing ? (
                                    <textarea
                                        value={txtObj.text}
                                        onChange={(e) => {
                                            const newText = e.target.value;
                                            setTextObjects(prev => prev.map(t =>
                                                t.id === txtObj.id ? { ...t, text: newText } : t
                                            ));
                                        }}
                                        autoFocus
                                        className="w-full h-full p-2 bg-transparent border-2 border-blue-500 rounded resize-none focus:outline-none"
                                        style={{
                                            color: txtObj.color,
                                            fontSize: `${txtObj.fontSize}px`,
                                            fontWeight: txtObj.fontWeight || 'normal',
                                            fontStyle: txtObj.fontStyle || 'normal',
                                            fontFamily: txtObj.fontFamily || 'sans-serif',
                                            textAlign: txtObj.textAlign || 'left',
                                            lineHeight: 1.3,
                                            minHeight: txtObj.height,
                                        }}
                                        onBlur={(e) => {
                                            setEditingTextId(null);
                                            saveToHistory();
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') {
                                                setEditingTextId(null);
                                            }
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                e.target.blur();
                                            }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <div
                                        className="w-full h-full p-2 whitespace-pre-wrap break-words select-none"
                                        style={{
                                            color: txtObj.color,
                                            fontSize: `${txtObj.fontSize}px`,
                                            fontWeight: txtObj.fontWeight || 'normal',
                                            fontStyle: txtObj.fontStyle || 'normal',
                                            fontFamily: txtObj.fontFamily || 'sans-serif',
                                            textAlign: txtObj.textAlign || 'left',
                                            lineHeight: 1.3,
                                        }}
                                    >
                                        {txtObj.text}
                                    </div>
                                )}

                                {/* Selection Border & Handles (not shown when editing) */}
                                {isSelected && (
                                    <>
                                        <div className="absolute inset-0 border-2 border-green-500 pointer-events-none" />


                                        {/* Corner Resize Handles */}
                                        {['nw', 'ne', 'sw', 'se'].map(corner => {
                                            const pos = {
                                                nw: { left: -handleSize / 2, top: -handleSize / 2, cursor: 'nwse-resize' },
                                                ne: { right: -handleSize / 2, top: -handleSize / 2, cursor: 'nesw-resize' },
                                                sw: { left: -handleSize / 2, bottom: -handleSize / 2, cursor: 'nesw-resize' },
                                                se: { right: -handleSize / 2, bottom: -handleSize / 2, cursor: 'nwse-resize' },
                                            }[corner];

                                            return (
                                                <div
                                                    key={corner}
                                                    data-handle={corner}
                                                    className="absolute bg-white border-2 border-green-500 z-30"
                                                    style={{
                                                        width: handleSize,
                                                        height: handleSize,
                                                        ...pos,
                                                    }}
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        setTextDragState({
                                                            id: txtObj.id,
                                                            action: `resize-${corner}`,
                                                            startX: e.clientX,
                                                            startY: e.clientY,
                                                            startObj: { ...txtObj }
                                                        });
                                                    }}
                                                />
                                            );
                                        })}

                                        {/* Edge Resize Handles */}
                                        {['n', 'e', 's', 'w'].map(edge => {
                                            const pos = {
                                                n: { left: '50%', top: -handleSize / 2, transform: 'translateX(-50%)', cursor: 'ns-resize' },
                                                s: { left: '50%', bottom: -handleSize / 2, transform: 'translateX(-50%)', cursor: 'ns-resize' },
                                                e: { right: -handleSize / 2, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' },
                                                w: { left: -handleSize / 2, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' },
                                            }[edge];

                                            return (
                                                <div
                                                    key={edge}
                                                    data-handle={edge}
                                                    className="absolute bg-white border-2 border-green-500 z-30"
                                                    style={{
                                                        width: handleSize,
                                                        height: handleSize,
                                                        ...pos,
                                                    }}
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        setTextDragState({
                                                            id: txtObj.id,
                                                            action: `resize-${edge}`,
                                                            startX: e.clientX,
                                                            startY: e.clientY,
                                                            startObj: { ...txtObj }
                                                        });
                                                    }}
                                                />
                                            );
                                        })}

                                        {/* Rotate Handle */}
                                        <div
                                            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center z-30"
                                            style={{ bottom: -35 }}
                                        >
                                            <div className="w-px h-5 bg-green-500" />
                                            <div
                                                data-handle="rotate"
                                                className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center cursor-grab hover:bg-green-600"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    setTextDragState({
                                                        id: txtObj.id,
                                                        action: 'rotate',
                                                        startX: e.clientX,
                                                        startY: e.clientY,
                                                        startObj: { ...txtObj }
                                                    });
                                                }}
                                            >
                                                <RotateCw className="w-3 h-3 text-white" />
                                            </div>
                                            {textDragState?.id === txtObj.id && textDragState?.action === 'rotate' && (
                                                <div className="absolute top-6 text-xs bg-slate-800 text-white px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-50">
                                                    {Math.round(txtObj.rotation || 0)}°
                                                </div>
                                            )}
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center z-30 shadow-lg"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTextObjects(prev => prev.filter(t => t.id !== txtObj.id));
                                                setSelectedTextIds([]);
                                                saveToHistory();
                                            }}
                                        >
                                            <X className="w-3 h-3 text-white" />
                                        </button>
                                    </>
                                )}
                            </div>
                        );
                    })}

                    {/* Shape Preview */}
                    {shapePreview && shapePreview.width > 0 && shapePreview.height > 0 && (
                        <div
                            className="absolute pointer-events-none z-20"
                            style={{
                                left: shapePreview.x,
                                top: shapePreview.y,
                                width: shapePreview.width,
                                height: shapePreview.height,
                            }}
                        >
                            <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                                {shapePreview.type === 'rectangle' && <rect x="0" y="0" width={shapePreview.width} height={shapePreview.height} fill="transparent" stroke={shapePreview.color} strokeWidth={shapePreview.strokeWidth} />}
                                {shapePreview.type === 'circle' && <ellipse cx={shapePreview.width/2} cy={shapePreview.height/2} rx={shapePreview.width/2} ry={shapePreview.height/2} fill="transparent" stroke={shapePreview.color} strokeWidth={shapePreview.strokeWidth} />}
                                {shapePreview.type === 'triangle' && <polygon points={`${shapePreview.width/2},0 0,${shapePreview.height} ${shapePreview.width},${shapePreview.height}`} fill="transparent" stroke={shapePreview.color} strokeWidth={shapePreview.strokeWidth} strokeLinejoin="round" />}
                                {shapePreview.type === 'star' && (() => {
                                    const cx = shapePreview.width / 2;
                                    const cy = shapePreview.height / 2;
                                    const outerRadius = Math.min(cx, cy);
                                    const innerRadius = outerRadius / 2.5;
                                    let points = [];
                                    for (let i = 0; i < 10; i++) {
                                        const r = i % 2 === 0 ? outerRadius : innerRadius;
                                        const angle = (i * Math.PI) / 5 - Math.PI / 2;
                                        points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
                                    }
                                    return <polygon points={points.join(' ')} fill="transparent" stroke={shapePreview.color} strokeWidth={shapePreview.strokeWidth} strokeLinejoin="round" />;
                                })()}
                                {shapePreview.type === 'graph' && (
                                    <g stroke={shapePreview.color} strokeWidth={shapePreview.strokeWidth} fill="transparent">
                                        {/* Grid lines */}
                                        {Array.from({ length: 9 }).map((_, i) => (
                                            <line key={`h-${i}`} x1={shapePreview.width/10} y1={shapePreview.height/10 + (shapePreview.height*0.8) * (i/8)} x2={shapePreview.width*0.9} y2={shapePreview.height/10 + (shapePreview.height*0.8) * (i/8)} stroke={shapePreview.color} strokeWidth={Math.max(0.5, shapePreview.strokeWidth * 0.3)} strokeDasharray="4 4" opacity="0.4" />
                                        ))}
                                        {Array.from({ length: 9 }).map((_, i) => (
                                            <line key={`v-${i}`} x1={shapePreview.width/10 + (shapePreview.width*0.8) * (i/8)} y1={shapePreview.height/10} x2={shapePreview.width/10 + (shapePreview.width*0.8) * (i/8)} y2={shapePreview.height*0.9} stroke={shapePreview.color} strokeWidth={Math.max(0.5, shapePreview.strokeWidth * 0.3)} strokeDasharray="4 4" opacity="0.4" />
                                        ))}
                                        {/* Y-axis */}
                                        <line x1={shapePreview.width/10} y1={shapePreview.height/10} x2={shapePreview.width/10} y2={shapePreview.height*0.9} />
                                        <polygon points={`${shapePreview.width/10},${shapePreview.height/10} ${shapePreview.width/10 - 4},${shapePreview.height/10 + 8} ${shapePreview.width/10 + 4},${shapePreview.height/10 + 8}`} fill={shapePreview.color} stroke="none" />
                                        {/* X-axis */}
                                        <line x1={shapePreview.width/10} y1={shapePreview.height/2} x2={shapePreview.width*0.9} y2={shapePreview.height/2} />
                                        <polygon points={`${shapePreview.width*0.9},${shapePreview.height/2} ${shapePreview.width*0.9 - 8},${shapePreview.height/2 - 4} ${shapePreview.width*0.9 - 8},${shapePreview.height/2 + 4}`} fill={shapePreview.color} stroke="none" />
                                    </g>
                                )}
                            </svg>
                        </div>
                    )}

                    {/* Shape Objects Layer - Selectable, Movable, Resizable, Rotatable */}
                    {shapeObjects.map((shpObj) => {
                        const isSelected = selectedShapeIds.includes(shpObj.id);
                        const handleSize = 10;
                        const renderShapeSVG = () => {
                            const fill = shpObj.fillColor || 'transparent';
                            if (shpObj.type === 'rectangle') {
                                return <rect x="0" y="0" width={shpObj.width} height={shpObj.height} fill={fill} stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} />;
                            } else if (shpObj.type === 'circle') {
                                return <ellipse cx={shpObj.width/2} cy={shpObj.height/2} rx={shpObj.width/2} ry={shpObj.height/2} fill={fill} stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} />;
                            } else if (shpObj.type === 'triangle') {
                                return <polygon points={`${shpObj.width/2},0 0,${shpObj.height} ${shpObj.width},${shpObj.height}`} fill={fill} stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} strokeLinejoin="round" />;
                            } else if (shpObj.type === 'star') {
                                const cx = shpObj.width / 2;
                                const cy = shpObj.height / 2;
                                const outerRadius = Math.min(cx, cy);
                                const innerRadius = outerRadius / 2.5;
                                let points = [];
                                for (let i = 0; i < 10; i++) {
                                    const r = i % 2 === 0 ? outerRadius : innerRadius;
                                    const angle = (i * Math.PI) / 5 - Math.PI / 2;
                                    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
                                }
                                return <polygon points={points.join(' ')} fill={fill} stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} strokeLinejoin="round" />;
                            } else if (shpObj.type === 'graph') {
                                return (
                                    <g stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} fill={fill}>
                                        <rect width={shpObj.width} height={shpObj.height} fill={fill} stroke="none" />
                                        {/* Grid lines */}
                                        {Array.from({ length: 9 }).map((_, i) => (
                                            <line key={`h-${i}`} x1={shpObj.width/10} y1={shpObj.height/10 + (shpObj.height*0.8) * (i/8)} x2={shpObj.width*0.9} y2={shpObj.height/10 + (shpObj.height*0.8) * (i/8)} stroke={shpObj.color} strokeWidth={Math.max(0.5, shpObj.strokeWidth * 0.3)} strokeDasharray="4 4" opacity="0.4" />
                                        ))}
                                        {Array.from({ length: 9 }).map((_, i) => (
                                            <line key={`v-${i}`} x1={shpObj.width/10 + (shpObj.width*0.8) * (i/8)} y1={shpObj.height/10} x2={shpObj.width/10 + (shpObj.width*0.8) * (i/8)} y2={shpObj.height*0.9} stroke={shpObj.color} strokeWidth={Math.max(0.5, shpObj.strokeWidth * 0.3)} strokeDasharray="4 4" opacity="0.4" />
                                        ))}
                                        {/* Y-axis */}
                                        <line x1={shpObj.width/10} y1={shpObj.height/10} x2={shpObj.width/10} y2={shpObj.height*0.9} />
                                        <polygon points={`${shpObj.width/10},${shpObj.height/10} ${shpObj.width/10 - 4},${shpObj.height/10 + 8} ${shpObj.width/10 + 4},${shpObj.height/10 + 8}`} fill={shpObj.color} stroke="none" />
                                        {/* X-axis */}
                                        <line x1={shpObj.width/10} y1={shpObj.height/2} x2={shpObj.width*0.9} y2={shpObj.height/2} />
                                        <polygon points={`${shpObj.width*0.9},${shpObj.height/2} ${shpObj.width*0.9 - 8},${shpObj.height/2 - 4} ${shpObj.width*0.9 - 8},${shpObj.height/2 + 4}`} fill={shpObj.color} stroke="none" />
                                    </g>
                                );
                            }
                            return null;
                        };

                        return (
                            <div
                                key={shpObj.id}
                                className="absolute"
                                style={{
                                    left: shpObj.x,
                                    top: shpObj.y,
                                    width: shpObj.width,
                                    height: shpObj.height,
                                    transform: `rotate(${shpObj.rotation || 0}deg)`,
                                    transformOrigin: 'center center',
                                    cursor: isSelected ? 'move' : 'pointer',
                                    zIndex: isSelected ? 20 : 10,
                                    pointerEvents: tool === 'select' || isSelected ? 'auto' : 'none',
                                }}
                                onPointerDown={(e) => {
                                    let activeSelectionIds = selectedShapeIds;
                                    if (tool === 'select') {
                                        e.stopPropagation();
                                        if (e.ctrlKey || e.metaKey) {
                                            activeSelectionIds = selectedShapeIds.includes(shpObj.id) ? selectedShapeIds.filter(id => id !== shpObj.id) : [...selectedShapeIds, shpObj.id];
                                            setSelectedShapeIds(activeSelectionIds);
                                        } else {
                                            if (!selectedShapeIds.includes(shpObj.id)) {
                                                activeSelectionIds = [shpObj.id];
                                                setSelectedShapeIds(activeSelectionIds);
                                            }
                                        }
                                        setSelectedImageId(null);
                                        setSelectedTextIds([]);
                                        setEditingTextId(null);
                                        // DO NOT return here, allow shapeDragState to be set so we can move it
                                    } else if (tool === 'laser') {
                                        setSelectedImageId(null);
                                        setSelectedTextIds([]);
                                        setEditingTextId(null);
                                        return;
                                    }
                                    if (e.target.dataset.handle) return;
                                    e.stopPropagation();
                                    setShapeDragState({
                                        id: shpObj.id,
                                        action: 'move',
                                        startX: e.clientX,
                                        startY: e.clientY,
                                        startObj: { ...shpObj },
                                        startObjs: shapeObjects.filter(s => activeSelectionIds.includes(s.id))
                                    });
                                }}
                            >
                                <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                                    {renderShapeSVG()}
                                </svg>
                                
                                {shpObj.text !== undefined && (
                                    <div className="absolute inset-0 flex items-center justify-center p-2">
                                        <textarea
                                            value={shpObj.text}
                                            onChange={(e) => {
                                                setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, text: e.target.value } : s));
                                            }}
                                            onMouseDown={e => e.stopPropagation()}
                                            placeholder="Text..."
                                            className="w-full text-center bg-transparent border-none outline-none resize-none overflow-hidden"
                                            style={{ 
                                                color: shpObj.textColor || shpObj.color, 
                                                fontSize: shpObj.fontSize || 20,
                                                fontFamily: shpObj.fontFamily || 'sans-serif',
                                                fontWeight: shpObj.fontWeight || 'normal',
                                                fontStyle: shpObj.fontStyle || 'normal',
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Selection Border & Handles */}
                                {isSelected && (
                                    <>
                                        <div className="absolute inset-0 border-2 border-purple-500 pointer-events-none" />
                                        

                                        
                                        {/* Corner Resize Handles */}
                                        {['nw', 'ne', 'sw', 'se'].map(corner => {
                                            const pos = {
                                                nw: { left: -handleSize / 2, top: -handleSize / 2, cursor: 'nwse-resize' },
                                                ne: { right: -handleSize / 2, top: -handleSize / 2, cursor: 'nesw-resize' },
                                                sw: { left: -handleSize / 2, bottom: -handleSize / 2, cursor: 'nesw-resize' },
                                                se: { right: -handleSize / 2, bottom: -handleSize / 2, cursor: 'nwse-resize' },
                                            }[corner];
                                            return (
                                                <div
                                                    key={corner}
                                                    data-handle={corner}
                                                    className="absolute bg-white border-2 border-purple-500 z-30"
                                                    style={{ width: handleSize, height: handleSize, ...pos }}
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        setShapeDragState({
                                                            id: shpObj.id,
                                                            action: `resize-${corner}`,
                                                            startX: e.clientX,
                                                            startY: e.clientY,
                                                            startObj: { ...shpObj }
                                                        });
                                                    }}
                                                />
                                            );
                                        })}
                                        {/* Edge Resize Handles */}
                                        {['n', 'e', 's', 'w'].map(edge => {
                                            const pos = {
                                                n: { left: '50%', top: -handleSize / 2, transform: 'translateX(-50%)', cursor: 'ns-resize' },
                                                s: { left: '50%', bottom: -handleSize / 2, transform: 'translateX(-50%)', cursor: 'ns-resize' },
                                                e: { right: -handleSize / 2, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' },
                                                w: { left: -handleSize / 2, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' },
                                            }[edge];
                                            return (
                                                <div
                                                    key={edge}
                                                    data-handle={edge}
                                                    className="absolute bg-white border-2 border-purple-500 z-30"
                                                    style={{ width: handleSize, height: handleSize, ...pos }}
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        setShapeDragState({
                                                            id: shpObj.id,
                                                            action: `resize-${edge}`,
                                                            startX: e.clientX,
                                                            startY: e.clientY,
                                                            startObj: { ...shpObj }
                                                        });
                                                    }}
                                                />
                                            );
                                        })}
                                        {/* Rotate Handle */}
                                        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center z-30" style={{ bottom: -35 }}>
                                            <div className="w-px h-5 bg-purple-500" />
                                            <div
                                                data-handle="rotate"
                                                className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center cursor-grab hover:bg-purple-600"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    setShapeDragState({
                                                        id: shpObj.id,
                                                        action: 'rotate',
                                                        startX: e.clientX,
                                                        startY: e.clientY,
                                                        startObj: { ...shpObj }
                                                    });
                                                }}
                                            >
                                                <RotateCw className="w-3 h-3 text-white" />
                                            </div>
                                            {shapeDragState?.id === shpObj.id && shapeDragState?.action === 'rotate' && (
                                                <div className="absolute top-6 text-xs bg-slate-800 text-white px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-50">
                                                    {Math.round(shpObj.rotation || 0)}°
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}

                    {/* Laser Pointer Overlay */}
                    {laserPos && (
                        <div
                            className="absolute pointer-events-none z-10"
                            style={{
                                left: laserPos.x - 10,
                                top: laserPos.y - 10,
                                width: 20,
                                height: 20,
                            }}
                        >
                            <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
                            <div className="absolute inset-1 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                        </div>
                    )}

                    {/* Text Input - Inline typing, commits on blur or Enter */}
                    {showTextInput && (
                        <div
                            className="absolute z-20"
                            style={{
                                left: textBoundary ? textBoundary.x : textPos.x,
                                top: textBoundary ? textBoundary.y : textPos.y,
                                width: textBoundary ? Math.max(textBoundary.width, 100) : 200,
                                minHeight: textBoundary ? Math.max(textBoundary.height, 40) : 40,
                            }}
                        >
                            <textarea
                                value={textValue}
                                onChange={(e) => setTextValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleTextSubmit();
                                    }
                                    if (e.key === 'Escape') {
                                        setShowTextInput(false);
                                        setTextBoundary(null);
                                        setTextValue('');
                                    }
                                }}
                                onBlur={() => {
                                    // Commit text on blur (clicking outside)
                                    if (textValue.trim()) {
                                        handleTextSubmit();
                                    } else {
                                        setShowTextInput(false);
                                        setTextBoundary(null);
                                    }
                                }}
                                placeholder="Type here..."
                                className="w-full h-full p-2 bg-transparent border-2 border-dashed border-blue-400 rounded resize-none focus:outline-none focus:border-blue-500"
                                style={{
                                    color,
                                    fontSize: `${strokeWidth * 2 + 16}px`,
                                    minHeight: textBoundary ? Math.max(textBoundary.height, 40) : 40,
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                }}
                                autoFocus
                            />
                        </div>
                    )}
                    {/* Lasso Drawing Overlay */}
                    {lassoPath && lassoPath.length > 0 && (
                        <svg
                            className="absolute inset-0 pointer-events-none z-10"
                            width="100%"
                            height="100%"
                            style={{ overflow: 'visible' }}
                        >
                            <polyline
                                points={lassoPath.map(p => `${p.x},${p.y}`).join(' ')}
                                fill="rgba(59, 130, 246, 0.1)"
                                stroke="#3b82f6"
                                strokeWidth="2"
                                strokeDasharray="5,5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    )}

                    {/* Selection Overlay */}
                    {selection && (
                        <div
                            className={`absolute border-2 border-dashed ${!selection.path ? 'border-blue-500 bg-blue-500/10' : 'border-transparent'} pointer-events-none z-20`}
                            style={{
                                left: selection.x,
                                top: selection.y,
                                width: selection.width,
                                height: selection.height
                            }}
                        >
                            {selection.path && (
                                <svg width="100%" height="100%" style={{ overflow: 'visible' }} className="absolute inset-0 pointer-events-none">
                                    <polygon
                                        points={selection.path.map(p => `${p.x - selection.x},${p.y - selection.y}`).join(' ')}
                                        fill="rgba(59, 130, 246, 0.1)"
                                        stroke="#3b82f6"
                                        strokeWidth="2"
                                        strokeDasharray="5,5"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            )}
                            {/* Selection action buttons */}
                            <div
                                className="absolute -top-14 left-0 flex items-center gap-1 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl p-1.5 pointer-events-auto text-slate-200"
                                onClick={e => e.stopPropagation()}
                                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                            >
                                <button
                                    onClick={handleCopySelection}
                                    className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                                    title="Copy"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleCutSelection}
                                    className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                                    title="Cut"
                                >
                                    <Scissors className="w-4 h-4" />
                                </button>
                                <div className="w-px h-5 bg-slate-700 mx-1"></div>
                                <button
                                    onClick={handleDeleteSelection}
                                    className="w-7 h-7 flex items-center justify-center rounded text-red-400 hover:text-red-300 hover:bg-red-400/20 transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="w-px h-5 bg-slate-700 mx-1"></div>
                                <button
                                    onClick={() => setSelection(null)}
                                    className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                    title="Cancel Selection"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 rounded-b-xl">
                <p className="text-xs text-slate-500 text-center">
                    ✨ Draw with mouse or touch • Supports stylus input on tablets
                </p>
            </div>

            {/* Floatable Live Chat (Visible only during sharing for Instructor) */}
            {isSharing && (
                <WhiteboardChatWindow
                    socket={socket}
                    sessionId={sessionId}
                    currentUser={{ name: 'Instructor', role: 'instructor' }}
                    isInstructor={true}
                    availableGroups={sharingTargets.map((name, i) => ({ id: i, name }))}
                />
            )}

            {/* AV Recorder (Instructor Only) */}
            {isInstructor && (
                <WhiteboardRecorder 
                    socket={socket}
                    canvasRef={canvasRef} 
                    sessionId={sessionId || whiteboardId}
                    shapeObjects={shapeObjects}
                    textObjects={textObjects}
                    imageObjects={imageObjects}
                    onRecordingComplete={(data) => {
                        console.log('Recording complete:', data);
                    }}
                />
            )}

            {/* Screenshot Modal */}
            {showScreenshotModal && (
                <ScreenshotPickerModal 
                    onClose={() => setShowScreenshotModal(false)}
                    onSelect={(url) => {
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        img.onload = () => {
                            const newObj = {
                                id: Date.now(),
                                type: 'image',
                                src: url,
                                x: 100,
                                y: 100,
                                width: Math.min(img.width, 400),
                                height: Math.min(img.height, (400 / img.width) * img.height)
                            };
                            setImageObjects(prev => [...prev, newObj]);
                        };
                        img.src = url;
                        setShowScreenshotModal(false);
                    }}
                />
            )}
        </div>
    );
}
