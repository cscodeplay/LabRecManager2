'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
    Ruler, Compass,
    Pencil, Eraser, Circle, Square, Minus, Type, Undo2, Redo2, Trash2, Download, Save,
    Palette, ChevronDown, X, Maximize2, Minimize2, Share2, MousePointer2, Sparkles, Wand2,
    Highlighter, MoveRight, Pointer, Image as ImageIcon, ChevronLeft, ChevronRight,
    Plus, Video, VideoOff, Mic, MicOff, Camera, RotateCw, Move, Pipette, Scan, Film,
    Triangle, Star, Hexagon, Scissors, Copy, Files, ClipboardPaste, LineChart, CalendarClock, RectangleHorizontal,
    Diamond, Cloud, Spline, ArrowLeftRight, Waypoints, StickyNote as StickyNoteIcon, PaintBucket,
    BringToFront, SendToBack, AlignLeft, AlignCenterHorizontal, AlignRight,
    AlignStartVertical, AlignCenterVertical, AlignEndVertical,
    AlignHorizontalSpaceBetween, AlignVerticalSpaceBetween, Group, Ungroup, Lock, Unlock, Users, MessageCircle, User,
    Folder, Upload, Loader2, FlipHorizontal, FlipVertical, Sun, Contrast, Sliders,
    Clock, GripHorizontal, GripVertical, LayoutTemplate, Flashlight, Library,
    Keyboard, HelpCircle, CheckSquare, ListTodo, Infinity as InfinityIcon, Box, Volume2, VolumeX,
    ChevronUp, ChevronsUp, ChevronsDown
} from 'lucide-react';
import WhiteboardChatWindow from './WhiteboardChatWindow';
import WhiteboardRecorder from './WhiteboardRecorder';
import AdminPermissionsPanel from './AdminPermissionsPanel';
import RadialToolbar from './RadialToolbar';
import { BRUSH_TYPES, renderCalligraphy, renderCrayon, renderWatercolor, renderFountainPen, floodFill, sampleColor } from './WhiteboardBrushEngine';
import StickyNoteRenderer, { createStickyNoteObject, STICKY_COLORS } from './StickyNote';
import ConnectorLine, { findNearestShape, getAnchorPoint, getConnectorPath, renderArrowhead, calculateAngle } from './ConnectorLine';
import TemplateGallery from './TemplateGallery';
import ClassroomTimerModal from './ClassroomTimerModal';
import WhiteboardImagePickerModal from './WhiteboardImagePickerModal';
import WhiteboardExportModal from './WhiteboardExportModal';
import WhiteboardMinimap from './WhiteboardMinimap';
import DomainShapeLibraryModal, { DOMAIN_SHAPES } from './DomainShapeLibrary';
import WhiteboardShortcutsModal from './WhiteboardShortcutsModal';
import WhiteboardClipboardPanel from './WhiteboardClipboardPanel';
import WhiteboardMediaPlayer from './WhiteboardMediaPlayer';
import Whiteboard3DObject, { get3DModelMesh, parseOBJ, parseSTL, parseJSON3D } from './Whiteboard3DObject';
import TorchIcon from './TorchIcon';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/lib/store';
import { formatDate, formatTime } from '@/lib/dateUtils';

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

const CONNECTOR_PRESET_STYLES = [
    {
        id: 'curved_arrow',
        label: 'Curved Arrow (Default)',
        pathType: 'curved',
        strokeStyle: 'solid',
        arrowStart: 'none',
        arrowEnd: 'arrow',
        icon: (
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M 2 12 Q 8 2 13 8" strokeLinecap="round" />
                <polyline points="11,5 14,8 11,11" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )
    },
    {
        id: 'single_arrow',
        label: 'Single Arrow',
        pathType: 'straight',
        strokeStyle: 'solid',
        arrowStart: 'none',
        arrowEnd: 'arrow',
        icon: (
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="2" y1="8" x2="13" y2="8" strokeLinecap="round" />
                <polyline points="9,4 13,8 9,12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )
    },
    {
        id: 'elbow_arrow',
        label: 'Elbow / Orthogonal',
        pathType: 'orthogonal',
        strokeStyle: 'solid',
        arrowStart: 'none',
        arrowEnd: 'arrow',
        icon: (
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="2,4 8,4 8,12 13,12" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="10,9 13,12 10,15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )
    },
    {
        id: 'double_arrow',
        label: 'Double Arrow',
        pathType: 'straight',
        strokeStyle: 'solid',
        arrowStart: 'arrow',
        arrowEnd: 'arrow',
        icon: (
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="8" x2="13" y2="8" strokeLinecap="round" />
                <polyline points="6,4 2,8 6,12" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="10,4 14,8 10,12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )
    },
    {
        id: 'plain_line',
        label: 'Plain Line',
        pathType: 'straight',
        strokeStyle: 'solid',
        arrowStart: 'none',
        arrowEnd: 'none',
        icon: (
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="2" y1="8" x2="14" y2="8" strokeLinecap="round" />
            </svg>
        )
    },
    {
        id: 'dashed_arrow',
        label: 'Dashed Arrow',
        pathType: 'straight',
        strokeStyle: 'dashed',
        arrowStart: 'none',
        arrowEnd: 'arrow',
        icon: (
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="2" y1="8" x2="13" y2="8" strokeDasharray="3,2" strokeLinecap="round" />
                <polyline points="9,4 13,8 9,12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )
    },
    {
        id: 'dotted_arrow',
        label: 'Dotted Arrow',
        pathType: 'straight',
        strokeStyle: 'dotted',
        arrowStart: 'none',
        arrowEnd: 'arrow',
        icon: (
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="2" y1="8" x2="13" y2="8" strokeDasharray="1,2" strokeLinecap="round" />
                <polyline points="9,4 13,8 9,12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )
    }
];

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
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-[100]">
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


// Helper component to render a MediaStream
const HostVideoRenderer = ({ stream }) => {
    const videoRef = useRef(null);
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);
    if (!stream) return null;
    const hasVideo = stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;
    const hasAudio = stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled;
    return (
        <div className="absolute top-4 left-4 z-[50] w-48 h-36 bg-slate-900 rounded-lg overflow-hidden shadow-lg border-2 border-slate-700 pointer-events-auto">
            <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${hasVideo ? '' : 'hidden'}`} />
            {!hasVideo && <div className="absolute inset-0 flex items-center justify-center bg-slate-800"><User className="w-12 h-12 text-slate-500" /></div>}
            {!hasAudio && <div className="absolute bottom-2 right-2 bg-red-500 rounded-full p-1 shadow-sm"><MicOff className="w-3 h-3 text-white" /></div>}
        </div>
    );
};

// Snap angle to nearest 45 degree cardinal/diagonal within 3.5 deg threshold
const snapRotationAngle = (rawAngle) => {
    const normalized = ((rawAngle % 360) + 360) % 360;
    const nearest45 = Math.round(normalized / 45) * 45;
    const diff = Math.abs(normalized - nearest45);
    if (diff <= 3.5 || diff >= 356.5) {
        return (nearest45 % 360);
    }
    return Math.round(rawAngle * 10) / 10;
};

// 360-Degree Circular Protractor & Rotation Dial UI
function RotationDial({ obj }) {
    if (!obj) return null;
    const cx = (obj.x || 0) + (obj.width || 100) / 2;
    const cy = (obj.y || 0) + (obj.height || 100) / 2;
    const radius = Math.max(90, Math.min(obj.width || 100, obj.height || 100) * 0.75);
    const rawRot = obj.rotation || 0;
    const normRot = ((rawRot % 360) + 360) % 360;
    const rad = (normRot - 90) * (Math.PI / 180); // 0 deg is at top (12 o'clock)
    
    const pointerX = cx + radius * Math.cos(rad);
    const pointerY = cy + radius * Math.sin(rad);

    // Generate 24 tick marks (every 15 degrees)
    const ticks = [];
    for (let deg = 0; deg < 360; deg += 15) {
        const tickRad = (deg - 90) * (Math.PI / 180);
        const isCardinal = deg % 90 === 0;
        const isDiagonal = deg % 45 === 0 && !isCardinal;
        const tickLen = isCardinal ? 14 : isDiagonal ? 9 : 5;
        const isCurrentSnapped = Math.abs(normRot - deg) < 2 || Math.abs(normRot - deg) > 358;

        const x1 = cx + (radius - tickLen) * Math.cos(tickRad);
        const y1 = cy + (radius - tickLen) * Math.sin(tickRad);
        const x2 = cx + radius * Math.cos(tickRad);
        const y2 = cy + radius * Math.sin(tickRad);

        let labelPos = null;
        if (isCardinal) {
            const labelDist = radius + 18;
            labelPos = {
                x: cx + labelDist * Math.cos(tickRad),
                y: cy + labelDist * Math.sin(tickRad),
                text: `${deg}°`
            };
        }

        ticks.push({ deg, x1, y1, x2, y2, isCardinal, isDiagonal, isCurrentSnapped, labelPos });
    }

    return (
        <div className="absolute inset-0 pointer-events-none z-[60] overflow-visible animate-in fade-in duration-150">
            <svg width="100%" height="100%" className="overflow-visible pointer-events-none">
                {/* Outer guide circle */}
                <circle cx={cx} cy={cy} r={radius} fill="rgba(15, 23, 42, 0.4)" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3,3" />

                {/* Cardinal & minor tick marks */}
                {ticks.map((t, idx) => (
                    <g key={idx}>
                        <line
                            x1={t.x1}
                            y1={t.y1}
                            x2={t.x2}
                            y2={t.y2}
                            stroke={t.isCurrentSnapped ? '#10b981' : t.isCardinal ? '#3b82f6' : t.isDiagonal ? '#38bdf8' : 'rgba(148, 163, 184, 0.5)'}
                            strokeWidth={t.isCurrentSnapped ? 3 : t.isCardinal ? 2.5 : t.isDiagonal ? 1.75 : 1}
                        />
                        {t.labelPos && (
                            <text
                                x={t.labelPos.x}
                                y={t.labelPos.y}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill={t.isCurrentSnapped ? '#34d399' : '#93c5fd'}
                                fontSize="11"
                                fontWeight="bold"
                                fontFamily="monospace"
                            >
                                {t.labelPos.text}
                            </text>
                        )}
                    </g>
                ))}

                {/* Center Pivot Point */}
                <circle cx={cx} cy={cy} r="4" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />

                {/* Active Radial Line */}
                <line
                    x1={cx}
                    y1={cy}
                    x2={pointerX}
                    y2={pointerY}
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    strokeDasharray={normRot % 45 === 0 ? "none" : "4,2"}
                />

                {/* Active Indicator Node */}
                <circle cx={pointerX} cy={pointerY} r="7" fill="#6366f1" stroke="#ffffff" strokeWidth="2.5" />
            </svg>

            {/* Floating Angle Tooltip Badge */}
            <div
                className="absolute px-3 py-1.5 rounded-full bg-slate-950/95 text-white text-xs font-mono font-bold shadow-2xl border border-indigo-500/60 flex items-center gap-1.5 backdrop-blur-md z-[70] transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${cx}px`, top: `${cy - radius - 36}px` }}
            >
                <RotateCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: '4s' }} />
                <span className="text-indigo-200">Angle:</span>
                <span className="text-emerald-400 font-extrabold text-[13px]">{Math.round(normRot)}°</span>
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
    whiteboardId = null,
    permissions = null,
    isStudent = false,
    userName = 'Instructor',
    userIdentifier = '',
    isMeetingMode = false
}) {
    const canvasRef = useRef(null);
    const canvasWrapperRef = useRef(null);
    const containerRef = useRef(null);
    const activePointerIdRef = useRef(null);
    const activePointerTypeRef = useRef(null);
    const isPenActiveRef = useRef(false);
    const penReleaseTimeoutRef = useRef(null);
    const lastPointRef = useRef(null);
    const currentPathPointsRef = useRef([]);
    const preStrokeImageDataRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const wasDraggingRef = useRef(false);
    const justCreatedShapeRef = useRef(false);
    const spotlightOverlayRef = useRef(null);
    const [tool, setTool] = useState('pen'); // pen, eraser, select, highlighter, shape, laser, text, image
    const [color, setColor] = useState('#000000');
    const [strokeWidth, setStrokeWidth] = useState(2);
    const [eraserSize, setEraserSize] = useState(20); // Separate eraser size
    const [strokeStyle, setStrokeStyle] = useState('solid'); // solid, dashed, dotted
    const [showColorPicker, setShowColorPicker] = useState(false);
    
    // Pop-over UI states
    const [showStrokePicker, setShowStrokePicker] = useState(false);
    const [showStrokeStylePicker, setShowStrokeStylePicker] = useState(false);
    const [showEraserPicker, setShowEraserPicker] = useState(false);
    const [showShapePicker, setShowShapePicker] = useState(false);
    const [showAlignMenu, setShowAlignMenu] = useState(false);
    const [showRecorder, setShowRecorder] = useState(false);
    const [showSelectPicker, setShowSelectPicker] = useState(false);
    const [showHighlighterPicker, setShowHighlighterPicker] = useState(false);

    const [shapeType, setShapeType] = useState('rectangle'); // rectangle, circle, triangle, star
    const [shapePreview, setShapePreview] = useState(null);
    const [selectMode, setSelectMode] = useState('rectangle'); // rectangle, lasso
    const [toolbarDock, setToolbarDock] = useState('bottom'); // bottom, top, left, right, float
    const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
    const [toolbarPos, setToolbarPos] = useState({ x: 250, y: 650 });
    const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
    const toolbarRef = useRef(null);
    const [isSelectionInfiniteCloner, setIsSelectionInfiniteCloner] = useState(false);

    // AI Whiteboard Tasks State
    const [aiTaskPrompt, setAiTaskPrompt] = useState('');
    const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
    const [generatedAITasks, setGeneratedAITasks] = useState([]);

    // Restore saved floating toolbar position
    useEffect(() => {
        try {
            const savedPos = localStorage.getItem('wb_toolbar_pos');
            if (savedPos) {
                const parsed = JSON.parse(savedPos);
                if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                    setToolbarPos(parsed);
                    setToolbarDock('float');
                }
            }
        } catch(e) {}
    }, []);

    const [showImagePicker, setShowImagePicker] = useState(false);
    const [showImagePickerModal, setShowImagePickerModal] = useState(false);
    const [showScreenshotModal, setShowScreenshotModal] = useState(false);
    const [screenshotPreview, setScreenshotPreview] = useState(null);
    const [screenshotBlob, setScreenshotBlob] = useState(null);
    const [screenshotName, setScreenshotName] = useState('');
    const [isSavingScreenshot, setIsSavingScreenshot] = useState(false);
    
    const playShutterSound = () => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        } catch(e) {}
    };
    
    const saveScreenshot = async () => {
        if (!screenshotBlob) return;
        setIsSavingScreenshot(true);
        const formData = new FormData();
        formData.append('file', screenshotBlob, screenshotName || `screenshot-${new Date().getTime()}.png`);
        try {
            const res = await api.post('/whiteboard/screenshot', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data && res.data.success) {
                toast.success('Screenshot saved to Documents > Screenshots!');
                setScreenshotPreview(null);
                setScreenshotBlob(null);
            } else {
                toast.error('Failed to save screenshot: ' + (res.data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Screenshot upload error:', error);
            toast.error('Error saving screenshot.');
        } finally {
            setIsSavingScreenshot(false);
        }
    };

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
    const [remoteCursors, setRemoteCursors] = useState({});
    const [recentLiveActions, setRecentLiveActions] = useState([]);

    // Draw permission check: Instructors/Admins always have draw access. Standalone non-students have draw access. Students in meetings/live sessions are controlled via permissions.
    const canUserDraw = isInstructor ? true : (isStudent ? Boolean(localPermissions?.canDraw) : (localPermissions?.canDraw ?? true));

    const [localPermissions, setLocalPermissions] = useState(() => ({
        canDraw: isInstructor ? true : (permissions && typeof permissions.canDraw === 'boolean' ? permissions.canDraw : !isStudent),
        canShareAudio: permissions?.canShareAudio ?? true,
        canShareVideo: permissions?.canShareVideo ?? true
    }));
    const [showPermissions, setShowPermissions] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
    
    useEffect(() => {
        setLocalPermissions({
            canDraw: isInstructor ? true : (permissions && typeof permissions.canDraw === 'boolean' ? permissions.canDraw : !isStudent),
            canShareAudio: permissions?.canShareAudio ?? true,
            canShareVideo: permissions?.canShareVideo ?? true
        });
    }, [permissions, isInstructor, isStudent]);

    const [isAutoShape, setIsAutoShape] = useState(false);
    const laserTimeoutRef = useRef(null);
    const isRemoteUpdateRef = useRef(false);
    const isDrawingRef = useRef(false);
    const remotePathsRef = useRef({});

    // Highlighter color
    const [highlighterColor, setHighlighterColor] = useState(HIGHLIGHTER_COLORS[0]);

    // Line / Arrow state
    const [lineType, setLineType] = useState('line');
    const [showLinePicker, setShowLinePicker] = useState(false);

    // Image insert
    const imageInputRef = useRef(null);
    const pasteCountRef = useRef(0);

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
    const [selectedImageIds, setSelectedImageIds] = useState([]);
    const selectedImageId = selectedImageIds.length > 0 ? selectedImageIds[selectedImageIds.length - 1] : null;
    const setSelectedImageId = useCallback((idOrFn) => {
        if (typeof idOrFn === 'function') {
            setSelectedImageIds(prev => {
                const currentId = prev.length > 0 ? prev[prev.length - 1] : null;
                const newId = idOrFn(currentId);
                return newId ? [newId] : [];
            });
        } else {
            setSelectedImageIds(idOrFn ? [idOrFn] : []);
        }
    }, []);
    const [imageDragState, setImageDragState] = useState(null); // { id, action, startX, startY, startObj }
    const [showImageAdjustModal, setShowImageAdjustModal] = useState(false);

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
    const [activeTextBorderPopoverId, setActiveTextBorderPopoverId] = useState(null);
    
    // Shape objects for manipulation
    const [pageShapeObjects, setPageShapeObjects] = useState({ 0: [] });
    const [shapeDragState, setShapeDragState] = useState(null);
    const [editingShapeTextId, setEditingShapeTextId] = useState(null);

    // OCR toggle
    const [isOcrActive, setIsOcrActive] = useState(false);

    // ─── Radial Toolbar & Draggable Ball State ──────────────────────────
    const [showRadialMenu, setShowRadialMenu] = useState(false);
    const [radialMenuPos, setRadialMenuPos] = useState({ x: 60, y: 600 });
    const [floatingBallPos, setFloatingBallPos] = useState({ x: 24, y: 560 });
    const [isDraggingBall, setIsDraggingBall] = useState(false);
    const ballDragStartRef = useRef(null);
    const longPressTimerRef = useRef(null);
    const longPressStartPosRef = useRef(null);

    // ─── Canvas Zoom & Minimap Navigation State ──────────────────────────
    const [zoomLevel, setZoomLevel] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

    // ─── Export & Interactive Panel Sharing Modal State ──────────────────
    const [showExportModal, setShowExportModal] = useState(false);

    // ─── Brush Engine State ─────────────────────────────────────────────
    const [brushType, setBrushType] = useState('normal'); // normal, calligraphy, crayon, watercolor, fountain

    // ─── Template Gallery State ─────────────────────────────────────────
    const [showTemplateGallery, setShowTemplateGallery] = useState(false);
    const [hoveredShapeId, setHoveredShapeId] = useState(null);
    const [hoveredImageId, setHoveredImageId] = useState(null);

    // ─── Interactive Magnetic Hooks & Drag Connector Engine ───────────
    const [hoveredHook, setHoveredHook] = useState(null); // { shapeId, anchor }
    const [activeConnectorDrag, setActiveConnectorDrag] = useState(null); // { sourceId, sourceAnchor, sourcePt, currentPt, style, snappedTarget }
    const [activeConnectorPreset, setActiveConnectorPreset] = useState(CONNECTOR_PRESET_STYLES[0]);
    const hookHoverTimeoutRef = useRef(null);
    const [showDomainLibrary, setShowDomainLibrary] = useState(false);

    // ─── Shortcuts Modal State ───
    const [showShortcutsModal, setShowShortcutsModal] = useState(false);

    // ─── Image Background Removal State ───
    const [removingBgImageId, setRemovingBgImageId] = useState(null);

    // ─── Canvas Embedded Media Players State ───
    const [pageMediaObjects, setPageMediaObjects] = useState({ 0: [] });
    const mediaObjects = pageMediaObjects[currentPage] || [];
    const [selectedMediaId, setSelectedMediaId] = useState(null);
    const [showMediaModal, setShowMediaModal] = useState(false);
    const [mediaInputTab, setMediaInputTab] = useState('youtube'); // 'local' | 'youtube' | 'embed'
    const [mediaInputTitle, setMediaInputTitle] = useState('');
    const [mediaInputUrl, setMediaInputUrl] = useState('');

    // ─── 3D Objects State ───
    const [page3DObjects, setPage3DObjects] = useState({ 0: [] });
    const threeDObjects = page3DObjects[currentPage] || [];
    const [selected3DId, setSelected3DId] = useState(null);

    // Global Shift key tracking for geometric aspect-ratio (circles) and straight-line constraints
    const [isShiftDown, setIsShiftDown] = useState(false);
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Shift') setIsShiftDown(true);
        };
        const handleKeyUp = (e) => {
            if (e.key === 'Shift') setIsShiftDown(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Outside pointer click/tap listener to deselect 3D object when clicking outside
    useEffect(() => {
        if (!selected3DId) return;
        const handleOutsidePointer = (e) => {
            if (e.target?.closest?.('.whiteboard-3d-object')) return;
            if (e.target?.closest?.('[data-color-picker]')) return;
            setSelected3DId(null);
        };
        window.addEventListener('pointerdown', handleOutsidePointer);
        return () => window.removeEventListener('pointerdown', handleOutsidePointer);
    }, [selected3DId]);

    // ─── Whiteboard Tasks Checklist State ───
    const [whiteboardTasks, setWhiteboardTasks] = useState([]);
    const [showTasksPanel, setShowTasksPanel] = useState(false);
    const [newTaskText, setNewTaskText] = useState('');
    const [selectedFontFamily, setSelectedFontFamily] = useState('sans-serif');

    // ─── Smart Panel & Flat Panel Tools State (BenQ EZWrite & ViewSonic) ──
    const [showClassroomTimer, setShowClassroomTimer] = useState(false);
    const [isSpotlightActive, setIsSpotlightActive] = useState(false);
    const [spotlightPos, setSpotlightPos] = useState({ x: 400, y: 300 });
    const [spotlightRadius, setSpotlightRadius] = useState(160);
    const [isCurtainActive, setIsCurtainActive] = useState(false);
    const [curtainHeight, setCurtainHeight] = useState(40);

    // Non-passive wheel event listener for Spotlight zoom gestures (prevents 'Unable to preventDefault inside passive event listener')
    useEffect(() => {
        const el = spotlightOverlayRef.current;
        if (!el || !isSpotlightActive) return;

        const handleWheel = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY < 0 ? 20 : -20;
            setSpotlightRadius(r => Math.max(50, Math.min(600, r + delta)));
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            el.removeEventListener('wheel', handleWheel);
        };
    }, [isSpotlightActive]);

    // ─── Pressure Sensitivity ───────────────────────────────────────────
    const [pressureSensitivity, setPressureSensitivity] = useState(true);
    const currentPressureRef = useRef(0.5);

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

    // Active rotating object for 360-degree rotation dial overlay
    const activeRotatingObject = imageDragState?.action === 'rotate'
        ? { ...imageObjects.find(i => i.id === imageDragState.id), objType: 'image' }
        : shapeDragState?.action === 'rotate'
        ? { ...shapeObjects.find(s => s.id === shapeDragState.id), objType: 'shape' }
        : textDragState?.action === 'rotate'
        ? { ...textObjects.find(t => t.id === textDragState.id), objType: 'text' }
        : null;

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

    const setMediaObjects = useCallback((updater) => {
        setPageMediaObjects(prev => ({
            ...prev,
            [currentPageRef.current]: typeof updater === 'function' ? updater(prev[currentPageRef.current] || []) : updater
        }));
    }, []);

    const setThreeDObjects = useCallback((updater) => {
        setPage3DObjects(prev => ({
            ...prev,
            [currentPageRef.current]: typeof updater === 'function' ? updater(prev[currentPageRef.current] || []) : updater
        }));
    }, []);

    // ─── Touch & Apple Pencil Gestures (Two-Finger Pinch Zoom & Pan) ───
    useEffect(() => {
        const wrapper = canvasWrapperRef.current;
        if (!wrapper) return;

        let initialDist = 0;
        let initialZoom = 1;
        let initialMidpoint = { x: 0, y: 0 };
        let initialPan = { x: 0, y: 0 };
        let isPinching = false;

        const handleTouchStart = (e) => {
            if (e.touches && e.touches.length === 2) {
                isPinching = true;
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                initialDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                initialZoom = zoomLevel;
                initialMidpoint = {
                    x: (t1.clientX + t2.clientX) / 2,
                    y: (t1.clientY + t2.clientY) / 2
                };
                initialPan = { ...panOffset };
            }
        };

        const handleTouchMove = (e) => {
            if (isPinching && e.touches && e.touches.length === 2) {
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();

                const t1 = e.touches[0];
                const t2 = e.touches[1];
                const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                if (initialDist > 0) {
                    const scaleFactor = currentDist / initialDist;
                    const newZoom = Math.max(0.2, Math.min(3.5, initialZoom * scaleFactor));
                    setZoomLevel(Math.round(newZoom * 100) / 100);
                }
                const currentMidpoint = {
                    x: (t1.clientX + t2.clientX) / 2,
                    y: (t1.clientY + t2.clientY) / 2
                };
                const dx = (currentMidpoint.x - initialMidpoint.x) / zoomLevel;
                const dy = (currentMidpoint.y - initialMidpoint.y) / zoomLevel;
                setPanOffset({
                    x: initialPan.x + dx,
                    y: initialPan.y + dy
                });
            }
        };

        const handleTouchEnd = (e) => {
            if (!e.touches || e.touches.length < 2) {
                isPinching = false;
            }
        };

        wrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
        wrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
        wrapper.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            wrapper.removeEventListener('touchstart', handleTouchStart);
            wrapper.removeEventListener('touchmove', handleTouchMove);
            wrapper.removeEventListener('touchend', handleTouchEnd);
        };
    }, [zoomLevel, panOffset]);

    // Canvas dimensions - keep fixed to prevent content loss
    const canvasWidth = width;
    const canvasHeight = height;

    // Persistence: track if state has been loaded from localStorage
    const [isStateLoaded, setIsStateLoaded] = useState(false);
    const saveTimeoutRef = useRef(null);
    
    useEffect(() => {
        isDrawingRef.current = isDrawing;
    }, [isDrawing]);
    const STORAGE_KEY = whiteboardId ? `whiteboard_${whiteboardId}` : null;

    // Load state from localStorage or API on mount & reset loading state on whiteboard switch
    useEffect(() => {
        setIsStateLoaded(false);

        if (!STORAGE_KEY) {
            const t = setTimeout(() => setIsStateLoaded(true), 200);
            return () => clearTimeout(t);
        }

        let isMounted = true;

        const loadState = async () => {
            try {
                let saved = null;
                
                // If it's a valid whiteboard UUID format, load from files API
                if (whiteboardId && whiteboardId !== 'admin-standalone' && !whiteboardId.startsWith('standalone_')) {
                    if (!isMeetingMode) {
                        try {
                            const res = await api.get(`/whiteboard/files/${whiteboardId}`);
                            if (res.data?.success && res.data.data?.canvasData) {
                                saved = res.data.data.canvasData;
                            }
                        } catch (e) {
                            console.warn('Failed to load whiteboard file:', e?.message);
                        }
                    }
                } else if (whiteboardId === 'admin-standalone') {
                    try {
                        const res = await api.get('/whiteboard/personal');
                        if (res.data?.success && res.data.data?.canvasData) {
                            saved = res.data.data.canvasData;
                        }
                    } catch (e) {
                        console.warn('Failed to load personal whiteboard:', e?.message);
                    }
                } else {
                    saved = localStorage.getItem(STORAGE_KEY);
                }

                if (saved && isMounted) {
                    const state = typeof saved === 'string' ? JSON.parse(saved) : saved;
                    // Restore all state
                    if (state.pages) setPages(state.pages);
                    if (state.currentPage !== undefined) setCurrentPage(state.currentPage);
                    if (state.totalPages !== undefined) setTotalPages(state.totalPages);
                    if (state.pageBackgrounds) setPageBackgrounds(state.pageBackgrounds);
                    if (state.pageImageObjects) setPageImageObjects(state.pageImageObjects);
                    if (state.pageTextObjects) setPageTextObjects(state.pageTextObjects);
                    if (state.pageShapeObjects) setPageShapeObjects(state.pageShapeObjects);
                    if (state.pageMediaObjects) setPageMediaObjects(state.pageMediaObjects);
                    if (state.page3DObjects) setPage3DObjects(state.page3DObjects);
                    if (state.whiteboardTasks) setWhiteboardTasks(state.whiteboardTasks);
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
                    console.log('✅ Whiteboard state restored from storage');
                }
            } catch (e) {
                console.error('Error loading whiteboard state:', e);
            } finally {
                if (isMounted) {
                    // Small delay to ensure canvas and child components are fully rendered before removing blur
                    setTimeout(() => {
                        if (isMounted) setIsStateLoaded(true);
                    }, 250);
                }
            }
        };
        
        loadState();

        return () => {
            isMounted = false;
        };
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
                    pageMediaObjects,
                    page3DObjects,
                    whiteboardTasks,
                    color,
                    strokeWidth,
                    eraserSize,
                    strokeStyle,
                    tool,
                    savedAt: Date.now()
                };
                
                const stateStr = JSON.stringify(state);
                
                if (whiteboardId && whiteboardId !== 'admin-standalone' && !whiteboardId.startsWith('standalone_')) {
                    // Generate thumbnail from current page
                    let thumbnailUrl = null;
                    if (canvas) {
                        // Scale down canvas for thumbnail
                        const tempCanvas = document.createElement('canvas');
                        const tempCtx = tempCanvas.getContext('2d');
                        tempCanvas.width = 300;
                        tempCanvas.height = 300 * (canvas.height / canvas.width);
                        tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
                        thumbnailUrl = tempCanvas.toDataURL('image/jpeg', 0.5);
                    }

                    if (!isMeetingMode) {
                        api.put(`/whiteboard/files/${whiteboardId}/save`, { 
                            canvasData: stateStr,
                            pageCount: totalPages,
                            thumbnailUrl: thumbnailUrl
                        }).catch(e => console.warn('Whiteboard auto-save deferred:', e?.message));
                    }
                } else if (whiteboardId === 'admin-standalone') {
                    api.put('/whiteboard/personal', { canvasData: stateStr })
                        .catch(e => console.warn('Whiteboard personal auto-save deferred:', e?.message));
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
    }, [STORAGE_KEY, pages, currentPage, totalPages, pageBackgrounds, pageImageObjects, pageTextObjects, pageShapeObjects, pageMediaObjects, page3DObjects, whiteboardTasks, color, strokeWidth, eraserSize, strokeStyle, tool]);

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
    
    const { user } = useAuthStore();
    useEffect(() => {

        // Join session for permission tracking
        if (socket && sessionId) {
            socket.emit('whiteboard:join-session', {
                sessionId,
                userId: user?.id,
                userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown',
                role: isInstructor ? 'instructor' : 'student'
            });
            
            const handlePermissionsUpdate = (data) => {
                // If it's for us
                if (data.userId === user?.id || data.userId === socket.id) {
                    // We need to update local permissions state.
                    // But wait, permissions is passed as a prop from live-board/page.jsx!
                    // Let's emit an event up, or handle it via a custom event, or maintain local permissions state!
                    setLocalPermissions(data.permissions);
                }
            };
            
            socket.on('whiteboard:permissions-updated', handlePermissionsUpdate);
            
            return () => {
                socket.off('whiteboard:permissions-updated', handlePermissionsUpdate);
            }
        }

    }, [socket, sessionId, isInstructor, user]);

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
        if (isSharing) {
            sendCanvasState();
        } else {
            // If viewer, request current state from host
            socket.emit('whiteboard:request-state', { sessionId, requesterId: socket.id });
        }

        // Listen for state requests from new viewers
        const handleStateRequest = (data) => {
            if (data.sessionId === sessionId && isSharing) {
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
                    remotePathsRef.current[data.socketId] = { x: data.x, y: data.y };
                } else {
                    const lastPos = remotePathsRef.current[data.socketId];
                    ctx.beginPath();
                    if (lastPos) {
                        ctx.moveTo(lastPos.x, lastPos.y);
                    } else {
                        ctx.moveTo(data.x, data.y);
                    }
                    ctx.lineTo(data.x, data.y);
                    ctx.stroke();
                    remotePathsRef.current[data.socketId] = { x: data.x, y: data.y };
                }
                ctx.globalCompositeOperation = 'source-over';
            } else if (data.type === 'path') {
                ctx.strokeStyle = data.color || '#000000';
                ctx.lineWidth = data.strokeWidth || 4;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.setLineDash(getDashArray(data.strokeStyle));

                if (data.isStart) {
                    remotePathsRef.current[data.socketId] = { x: data.x, y: data.y };
                } else {
                    const lastPos = remotePathsRef.current[data.socketId];
                    ctx.beginPath();
                    if (lastPos) {
                        ctx.moveTo(lastPos.x, lastPos.y);
                    } else {
                        ctx.moveTo(data.x, data.y);
                    }
                    ctx.lineTo(data.x, data.y);
                    ctx.stroke();
                    remotePathsRef.current[data.socketId] = { x: data.x, y: data.y };
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
            setPageBackgrounds(prev => ({
                ...prev,
                [currentPage]: {
                    ...prev[currentPage],
                    color: data.bgColor || prev[currentPage]?.color || '#ffffff',
                    pattern: data.bgPattern || prev[currentPage]?.pattern || 'blank'
                }
            }));
        };

        const handleCanvasState = (data) => {
            if (isDrawingRef.current) return;
            isRemoteUpdateRef.current = true;
            if (data.sessionId !== sessionId) return;
            if (data.bgColor || data.bgPattern) {
                setPageBackgrounds(prev => ({
                    ...prev,
                    [currentPage]: {
                        ...prev[currentPage],
                        color: data.bgColor || prev[currentPage]?.color || '#ffffff',
                        pattern: data.bgPattern || prev[currentPage]?.pattern || 'blank'
                    }
                }));
            }
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
            isRemoteUpdateRef.current = true;
            if (data.sessionId !== sessionId) return;
            if (data.imageObjects) setImageObjects(data.imageObjects);
            if (data.textObjects) setTextObjects(data.textObjects);
            if (data.shapeObjects) setShapeObjects(data.shapeObjects);
        };

        
        const handleCursorUpdate = (data) => {
            if (data.sessionId !== sessionId || data.socketId === socket.id) return;
            setRemoteCursors(prev => ({
                ...prev,
                [data.socketId]: {
                    x: data.x,
                    y: data.y,
                    userName: data.userName,
                    userIdentifier: data.userIdentifier,
                    action: data.action,
                    tool: data.tool,
                    timestamp: Date.now()
                }
            }));
        };

        const handleWhiteboardAction = (data) => {
            if (data.sessionId !== sessionId || data.socketId === socket.id) return;
            const actionText = `${data.userName || 'Participant'}${data.userIdentifier ? ` (${data.userIdentifier})` : ''} is ${data.action || 'drawing'}`;
            setRecentLiveActions(prev => {
                const filtered = prev.filter(a => a.socketId !== data.socketId);
                return [{ ...data, text: actionText, timestamp: Date.now() }, ...filtered].slice(0, 3);
            });
        };

        socket.on('whiteboard:cursor-update', handleCursorUpdate);
        socket.on('whiteboard:action', handleWhiteboardAction);

        socket.on('whiteboard:state-requested', handleStateRequest);
        socket.on('whiteboard:draw', handleDraw);
        socket.on('whiteboard:clear', handleClear);
        socket.on('whiteboard:background-change', handleBackgroundChange);
        socket.on('whiteboard:canvas-state', handleCanvasState);
        socket.on('whiteboard:objects-update', handleObjectsUpdate);

        return () => {
            socket.off('whiteboard:cursor-update', handleCursorUpdate);
            socket.off('whiteboard:action', handleWhiteboardAction);

            socket.off('whiteboard:state-requested', handleStateRequest);
            socket.off('whiteboard:draw', handleDraw);
            socket.off('whiteboard:clear', handleClear);
            socket.off('whiteboard:background-change', handleBackgroundChange);
            socket.off('whiteboard:canvas-state', handleCanvasState);
            socket.off('whiteboard:objects-update', handleObjectsUpdate);
        };
    }, [isSharing, socket, sessionId]);

    const isInitialMountRef = useRef(true);

    // Granular sync for HTML overlay objects
    useEffect(() => {
        if (isInitialMountRef.current) {
            isInitialMountRef.current = false;
            return;
        }
        if (isRemoteUpdateRef.current) {
            isRemoteUpdateRef.current = false;
            return;
        }
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

    // Flip selection contents (canvas ink, shapes, images)
    const handleFlipSelection = useCallback((horizontal = true) => {
        if (!selection) return;
        const canvas = canvasRef.current;
        const { x, y, width, height } = selection;
        if (width <= 0 || height <= 0) return;

        if (canvas) {
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            // Create temporary canvas of the selected region
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

            if (selection.path && selection.path.length > 0) {
                tempCtx.save();
                tempCtx.beginPath();
                tempCtx.moveTo(selection.path[0].x - x, selection.path[0].y - y);
                for (let i = 1; i < selection.path.length; i++) {
                    tempCtx.lineTo(selection.path[i].x - x, selection.path[i].y - y);
                }
                tempCtx.closePath();
                tempCtx.clip();
                tempCtx.drawImage(canvas, -x, -y);
                tempCtx.restore();

                // Erase old region
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
                tempCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
                ctx.clearRect(x, y, width, height);
            }

            // Draw flipped pixels back
            ctx.save();
            if (horizontal) {
                ctx.translate(x + width, y);
                ctx.scale(-1, 1);
            } else {
                ctx.translate(x, y + height);
                ctx.scale(1, -1);
            }
            ctx.drawImage(tempCanvas, 0, 0);
            ctx.restore();
        }

        // Also flip any selected shapes
        if (selectedShapeIds.length > 0) {
            setPageShapeObjects(prev => ({
                ...prev,
                [currentPage]: (prev[currentPage] || []).map(shp => {
                    if (selectedShapeIds.includes(shp.id)) {
                        return {
                            ...shp,
                            flipX: horizontal ? !shp.flipX : shp.flipX,
                            flipY: !horizontal ? !shp.flipY : shp.flipY
                        };
                    }
                    return shp;
                })
            }));
        }

        // Also flip selected image
        if (selectedImageId) {
            setImageObjects(prev => prev.map(img => {
                if (img.id === selectedImageId) {
                    return {
                        ...img,
                        flipX: horizontal ? !img.flipX : img.flipX,
                        flipY: !horizontal ? !img.flipY : img.flipY
                    };
                }
                return img;
            }));
        }

        saveToHistory();
        toast.success(`Flipped ${horizontal ? 'Horizontally' : 'Vertically'}`, { icon: '🔄' });
    }, [selection, selectedShapeIds, selectedImageId, currentPage, saveToHistory]);

    // Update filters on currently selected image
    const updateSelectedImageFilters = useCallback((updates) => {
        if (!selectedImageId) return;
        setImageObjects(prev => prev.map(img => {
            if (img.id === selectedImageId) {
                return {
                    ...img,
                    ...updates
                };
            }
            return img;
        }));
        saveToHistory();
    }, [selectedImageId, saveToHistory]);

    // Update properties on currently selected text objects
    const updateSelectedTextProps = useCallback((updates) => {
        const activeIds = selectedTextIds.length > 0 ? selectedTextIds : (editingTextId ? [editingTextId] : []);
        if (activeIds.length === 0) return;
        setTextObjects(prev => prev.map(txt => {
            if (activeIds.includes(txt.id)) {
                return {
                    ...txt,
                    ...updates
                };
            }
            return txt;
        }));
        saveToHistory();
    }, [selectedTextIds, editingTextId, saveToHistory, setTextObjects]);

    // Auto-close text border popover when no text is selected
    useEffect(() => {
        if (selectedTextIds.length === 0) {
            setActiveTextBorderPopoverId(null);
        }
    }, [selectedTextIds]);

    // Client-side automatic background removal using BFS flood-fill and boundary transparency
    const handleRemoveImageBackground = useCallback((targetImgObj) => {
        const imgObj = targetImgObj || (selectedImageId ? imageObjects.find(i => i.id === selectedImageId) : null);
        if (!imgObj || !imgObj.src) return;

        setRemovingBgImageId(imgObj.id);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            setTimeout(() => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    ctx.drawImage(img, 0, 0);

                    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imgData.data;
                    const w = canvas.width;
                    const h = canvas.height;

                    // Sample corner pixels to find dominant background color
                    const corners = [
                        0, // top-left
                        (w - 1) * 4, // top-right
                        ((h - 1) * w) * 4, // bottom-left
                        ((h - 1) * w + (w - 1)) * 4 // bottom-right
                    ];

                    let bgR = 0, bgG = 0, bgB = 0, validSamples = 0;
                    corners.forEach(idx => {
                        if (data[idx + 3] > 10) {
                            bgR += data[idx];
                            bgG += data[idx + 1];
                            bgB += data[idx + 2];
                            validSamples++;
                        }
                    });

                    if (validSamples === 0) {
                        toast('Image already has transparent background', { icon: 'ℹ️' });
                        setRemovingBgImageId(null);
                        return;
                    }

                    bgR = Math.round(bgR / validSamples);
                    bgG = Math.round(bgG / validSamples);
                    bgB = Math.round(bgB / validSamples);

                    const visited = new Uint8Array(w * h);
                    const queue = [];

                    const colorDist = (idx) => {
                        const dr = data[idx] - bgR;
                        const dg = data[idx + 1] - bgG;
                        const db = data[idx + 2] - bgB;
                        return Math.sqrt(dr * dr + dg * dg + db * db);
                    };

                    const threshold = 38;
                    const feather = 18;

                    for (let x = 0; x < w; x++) {
                        let idxTop = x * 4;
                        if (colorDist(idxTop) < threshold + feather) {
                            queue.push(x, 0);
                            visited[x] = 1;
                        }
                        let idxBottom = ((h - 1) * w + x) * 4;
                        if (colorDist(idxBottom) < threshold + feather) {
                            queue.push(x, h - 1);
                            visited[(h - 1) * w + x] = 1;
                        }
                    }
                    for (let y = 0; y < h; y++) {
                        let idxLeft = (y * w) * 4;
                        if (colorDist(idxLeft) < threshold + feather && !visited[y * w]) {
                            queue.push(0, y);
                            visited[y * w] = 1;
                        }
                        let idxRight = (y * w + (w - 1)) * 4;
                        if (colorDist(idxRight) < threshold + feather && !visited[y * w + (w - 1)]) {
                            queue.push(w - 1, y);
                            visited[y * w + (w - 1)] = 1;
                        }
                    }

                    let head = 0;
                    while (head < queue.length) {
                        const qx = queue[head++];
                        const qy = queue[head++];
                        const pixelIdx = (qy * w + qx) * 4;
                        const dist = colorDist(pixelIdx);

                        if (dist <= threshold) {
                            data[pixelIdx + 3] = 0;
                        } else if (dist < threshold + feather) {
                            const alphaRatio = (dist - threshold) / feather;
                            data[pixelIdx + 3] = Math.round(data[pixelIdx + 3] * alphaRatio);
                        }

                        const neighbors = [
                            [qx + 1, qy],
                            [qx - 1, qy],
                            [qx, qy + 1],
                            [qx, qy - 1]
                        ];

                        for (let i = 0; i < 4; i++) {
                            const nx = neighbors[i][0];
                            const ny = neighbors[i][1];
                            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                                const nPos = ny * w + nx;
                                if (!visited[nPos]) {
                                    visited[nPos] = 1;
                                    const nIdx = nPos * 4;
                                    if (colorDist(nIdx) < threshold + feather) {
                                        queue.push(nx, ny);
                                    }
                                }
                            }
                        }
                    }

                    ctx.putImageData(imgData, 0, 0);
                    const transparentUrl = canvas.toDataURL('image/png');

                    setImageObjects(prev => prev.map(imgItem =>
                        imgItem.id === imgObj.id ? { ...imgItem, src: transparentUrl } : imgItem
                    ));
                    saveToHistory();
                    toast.success('Image background removed!', { icon: '🪄' });
                } catch (err) {
                    console.error('BG removal error:', err);
                    toast.error('Failed to process image background removal');
                } finally {
                    setRemovingBgImageId(null);
                }
            }, 50);
        };
        img.onerror = () => {
            setRemovingBgImageId(null);
            toast.error('Failed to process image background removal');
        };
        img.src = imgObj.src;
    }, [selectedImageId, imageObjects, saveToHistory, setImageObjects]);


    // Handle importing native WBF / IWB interactive panel format
    const handleImportWBF = useCallback((data) => {
        if (!data) return;
        if (data.format === 'WBF') {
            if (data.pageShapeObjects) setPageShapeObjects(data.pageShapeObjects);
            if (data.pageTextObjects) setPageTextObjects(data.pageTextObjects);
            if (data.pageImageObjects) setPageImageObjects(data.pageImageObjects);
            if (data.pageBackgrounds) setPageBackgrounds(data.pageBackgrounds);
            if (data.totalPages) setTotalPages(data.totalPages);
            if (data.currentPage !== undefined) setCurrentPage(data.currentPage);
            saveToHistory();
            toast.success('Loaded Whiteboard session (.wbf)!', { icon: '📂' });
        } else if (data.format === 'IWB') {
            if (data.bgImage) {
                const img = new Image();
                img.onload = () => {
                    const canvas = canvasRef.current;
                    if (canvas) {
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                    }
                };
                img.src = data.bgImage;
            }
            if (data.shapes && Array.isArray(data.shapes) && data.shapes.length > 0) {
                setPageShapeObjects(prev => ({
                    ...prev,
                    [currentPage]: [...(prev[currentPage] || []), ...data.shapes]
                }));
            }
            if (data.texts && Array.isArray(data.texts) && data.texts.length > 0) {
                setPageTextObjects(prev => ({
                    ...prev,
                    [currentPage]: [...(prev[currentPage] || []), ...data.texts]
                }));
            }
            if (data.images && Array.isArray(data.images) && data.images.length > 0) {
                setPageImageObjects(prev => ({
                    ...prev,
                    [currentPage]: [...(prev[currentPage] || []), ...data.images]
                }));
            }
            saveToHistory();
            toast.success('Loaded Interactive Whiteboard (.iwb) file!', { icon: '📟' });
        }
    }, [currentPage, saveToHistory]);

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
            pasteCountRef.current += 1;
            const stackOffset = ((pasteCountRef.current - 1) % 12 + 1) * 25;
            const newId = Date.now().toString();
            const newImage = {
                ...item.data,
                id: newId,
                x: (item.data.x || 100) + stackOffset,
                y: (item.data.y || 100) + stackOffset
            };
            setImageObjects(prev => [...prev, newImage]);
            setSelectedImageIds([newId]);
            setSelectedShapeIds([]);
            setSelectedTextIds([]);
            saveToHistory();
        } else if (item.type === 'images') {
            pasteCountRef.current += 1;
            const stackOffset = ((pasteCountRef.current - 1) % 12 + 1) * 25;
            const timestamp = Date.now();
            const newImages = (item.data || []).map((img, idx) => ({
                ...img,
                id: (timestamp + idx).toString(),
                x: (img.x || 100) + stackOffset,
                y: (img.y || 100) + stackOffset
            }));
            setImageObjects(prev => [...prev, ...newImages]);
            const newIds = newImages.map(img => img.id);
            setSelectedImageIds(newIds);
            setSelectedShapeIds([]);
            setSelectedTextIds([]);
            saveToHistory();
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
        } else if (item.type === 'texts') {
            const timestamp = Date.now();
            const newTexts = item.data.map((t, idx) => ({
                ...t,
                id: timestamp + idx,
                x: t.x + 20,
                y: t.y + 20
            }));
            setTextObjects(prev => [...prev, ...newTexts]);
            setTimeout(() => setSelectedTextIds(newTexts.map(t => t.id)), 0);
        } else if (item.type === 'shapes') {
            const idMap = {};
            const newIds = [];
            const timestamp = Date.now();

            item.data.forEach((shape, index) => {
                const newId = (timestamp + index).toString();
                idMap[shape.id] = newId;
                newIds.push(newId);
            });

            const newShapes = item.data.map((shape) => {
                const newId = idMap[shape.id];
                if (shape.type === 'connector') {
                    return {
                        ...shape,
                        id: newId,
                        sourceId: idMap[shape.sourceId] || shape.sourceId,
                        targetId: idMap[shape.targetId] || shape.targetId,
                        sourcePoint: shape.sourcePoint ? { x: shape.sourcePoint.x + 20, y: shape.sourcePoint.y + 20 } : shape.sourcePoint,
                        targetPoint: shape.targetPoint ? { x: shape.targetPoint.x + 20, y: shape.targetPoint.y + 20 } : shape.targetPoint,
                        waypoint: shape.waypoint ? { x: shape.waypoint.x + 20, y: shape.waypoint.y + 20 } : null
                    };
                }
                return {
                    ...shape,
                    id: newId,
                    x: (shape.x || 0) + 20,
                    y: (shape.y || 0) + 20
                };
            });

            setShapeObjects(prev => [...prev, ...newShapes]);
            setTimeout(() => setSelectedShapeIds(newIds), 0);
        } else if (item.type === 'media' && item.data) {
            pasteCountRef.current += 1;
            const stackOffset = ((pasteCountRef.current - 1) % 12 + 1) * 25;
            const newId = `media_${Date.now()}`;
            const newMedia = {
                ...item.data,
                id: newId,
                x: (item.data.x || 100) + stackOffset,
                y: (item.data.y || 100) + stackOffset
            };
            setPageMediaObjects(prev => ({
                ...prev,
                [currentPage]: [...(prev[currentPage] || []), newMedia]
            }));
            setSelectedMediaId(newId);
            setSelectedShapeIds([]);
            setSelectedTextIds([]);
            setSelectedImageIds([]);
            setSelected3DId(null);
            saveToHistory();
        } else if (item.type === '3d_object' && item.data) {
            pasteCountRef.current += 1;
            const stackOffset = ((pasteCountRef.current - 1) % 12 + 1) * 25;
            const newId = `3d_${Date.now()}`;
            const new3D = {
                ...item.data,
                id: newId,
                x: (item.data.x || 100) + stackOffset,
                y: (item.data.y || 100) + stackOffset
            };
            setPage3DObjects(prev => ({
                ...prev,
                [currentPage]: [...(prev[currentPage] || []), new3D]
            }));
            setSelected3DId(newId);
            setSelectedShapeIds([]);
            setSelectedTextIds([]);
            setSelectedImageIds([]);
            setSelectedMediaId(null);
            saveToHistory();
        } else if (item.type === 'group' && item.data) {
            pasteCountRef.current += 1;
            const stackOffset = ((pasteCountRef.current - 1) % 12 + 1) * 25;
            const timestamp = Date.now();
            const { shapes = [], texts = [], images = [], media = [], threeD = [] } = item.data;

            const shapeIdMap = {};
            const newShapeIds = [];
            shapes.forEach((s, idx) => {
                const nid = `shp_${timestamp}_${idx}`;
                shapeIdMap[s.id] = nid;
                newShapeIds.push(nid);
            });
            const newShapes = shapes.map(s => {
                const nid = shapeIdMap[s.id];
                if (s.type === 'connector') {
                    return {
                        ...s,
                        id: nid,
                        sourceId: shapeIdMap[s.sourceId] || s.sourceId,
                        targetId: shapeIdMap[s.targetId] || s.targetId,
                        sourcePoint: s.sourcePoint ? { x: s.sourcePoint.x + stackOffset, y: s.sourcePoint.y + stackOffset } : s.sourcePoint,
                        targetPoint: s.targetPoint ? { x: s.targetPoint.x + stackOffset, y: s.targetPoint.y + stackOffset } : s.targetPoint,
                        waypoint: s.waypoint ? { x: s.waypoint.x + stackOffset, y: s.waypoint.y + stackOffset } : null
                    };
                }
                return { ...s, id: nid, x: (s.x || 0) + stackOffset, y: (s.y || 0) + stackOffset };
            });

            const newTexts = texts.map((t, idx) => ({ ...t, id: `txt_${timestamp}_${idx}`, x: (t.x || 0) + stackOffset, y: (t.y || 0) + stackOffset }));
            const newImages = images.map((img, idx) => ({ ...img, id: `img_${timestamp}_${idx}`, x: (img.x || 0) + stackOffset, y: (img.y || 0) + stackOffset }));
            const newMedias = media.map((m, idx) => ({ ...m, id: `media_${timestamp}_${idx}`, x: (m.x || 0) + stackOffset, y: (m.y || 0) + stackOffset }));
            const new3Ds = threeD.map((o, idx) => ({ ...o, id: `3d_${timestamp}_${idx}`, x: (o.x || 0) + stackOffset, y: (o.y || 0) + stackOffset }));

            if (newShapes.length > 0) setShapeObjects(prev => [...prev, ...newShapes]);
            if (newTexts.length > 0) setTextObjects(prev => [...prev, ...newTexts]);
            if (newImages.length > 0) setImageObjects(prev => [...prev, ...newImages]);
            if (newMedias.length > 0) setPageMediaObjects(prev => ({ ...prev, [currentPage]: [...(prev[currentPage] || []), ...newMedias] }));
            if (new3Ds.length > 0) setPage3DObjects(prev => ({ ...prev, [currentPage]: [...(prev[currentPage] || []), ...new3Ds] }));

            setSelectedShapeIds(newShapeIds);
            setSelectedTextIds(newTexts.map(t => t.id));
            setSelectedImageIds(newImages.map(i => i.id));
            saveToHistory();
            toast.success('Pasted group items');
        }
    }, [saveToHistory, currentPage]);

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
        let hasDeleted = false;
        if (selectedImageIds.length > 0) {
            setImageObjects(prev => prev.filter(img => !selectedImageIds.includes(img.id)));
            setSelectedImageIds([]);
            hasDeleted = true;
        }
        if (selectedTextIds.length > 0) {
            setTextObjects(prev => prev.filter(txt => !selectedTextIds.includes(txt.id)));
            setSelectedTextIds([]);
            hasDeleted = true;
        }
        if (selectedShapeIds.length > 0) {
            setShapeObjects(prev => prev.filter(shp => {
                if (selectedShapeIds.includes(shp.id)) return false;
                // Cascade delete connectors attached to any deleted parent shape
                if (shp.type === 'connector' && (selectedShapeIds.includes(shp.sourceId) || selectedShapeIds.includes(shp.targetId))) {
                    return false;
                }
                return true;
            }));
            setSelectedShapeIds([]);
            hasDeleted = true;
        }
        if (selectedMediaId) {
            setPageMediaObjects(prev => ({
                ...prev,
                [currentPage]: (prev[currentPage] || []).filter(m => m.id !== selectedMediaId)
            }));
            setSelectedMediaId(null);
            hasDeleted = true;
        }
        if (selected3DId) {
            setPage3DObjects(prev => ({
                ...prev,
                [currentPage]: (prev[currentPage] || []).filter(o => o.id !== selected3DId)
            }));
            setSelected3DId(null);
            hasDeleted = true;
        }
        if (selection) {
            handleDeleteSelection();
            hasDeleted = true;
        }
        if (hasDeleted) {
            saveToHistory();
        }
    }, [selectedImageIds, selectedTextIds, selectedShapeIds, selectedMediaId, selected3DId, selection, handleDeleteSelection, saveToHistory, currentPage]);

    // Unified Copy
    const handleCopy = useCallback(() => {
        pasteCountRef.current = 0;
        const selectedShapes = shapeObjects.filter(s => selectedShapeIds.includes(s.id));
        const internalConnectors = shapeObjects.filter(s => 
            s.type === 'connector' && 
            selectedShapeIds.includes(s.sourceId) && 
            selectedShapeIds.includes(s.targetId) &&
            !selectedShapeIds.includes(s.id)
        );
        const allSelectedShapes = [...selectedShapes, ...internalConnectors];
        const selectedTexts = textObjects.filter(t => selectedTextIds.includes(t.id));
        const selectedImages = imageObjects.filter(img => selectedImageIds.includes(img.id));
        const selectedMedia = mediaObjects.filter(m => m.id === selectedMediaId);
        const selected3D = threeDObjects.filter(o => o.id === selected3DId);

        const totalKinds = (allSelectedShapes.length > 0 ? 1 : 0) + 
                           (selectedTexts.length > 0 ? 1 : 0) + 
                           (selectedImages.length > 0 ? 1 : 0) + 
                           (selectedMedia.length > 0 ? 1 : 0) + 
                           (selected3D.length > 0 ? 1 : 0);

        const totalCount = allSelectedShapes.length + selectedTexts.length + selectedImages.length + selectedMedia.length + selected3D.length;

        if (totalCount === 0 && selection) {
            handleCopySelection();
            return;
        }

        if (totalKinds > 1 || totalCount > 1) {
            // Mixed Multi-object or multi-item selection -> Package as 'group'
            const groupPayload = {
                shapes: allSelectedShapes.map(s => ({ ...s })),
                texts: selectedTexts.map(t => ({ ...t })),
                images: selectedImages.map(i => ({ ...i })),
                media: selectedMedia.map(m => ({ ...m })),
                threeD: selected3D.map(o => ({ ...o }))
            };
            setClipboardHistory(prev => [{
                id: Date.now(),
                type: 'group',
                data: groupPayload,
                title: `Group (${totalCount} items)`
            }, ...prev].slice(0, 15));
            toast.success(`Copied ${totalCount} items to clipboard`, { icon: '📋' });
            return;
        }

        // Single object selection
        if (selectedImages.length === 1) {
            setClipboardHistory(prev => [{ id: Date.now(), type: 'image', data: { ...selectedImages[0] }, dataURL: selectedImages[0].src }, ...prev].slice(0, 15));
            toast.success('Copied image to clipboard');
            return;
        }
        if (selectedTexts.length === 1) {
            setClipboardHistory(prev => [{ id: Date.now(), type: 'text', data: { ...selectedTexts[0] } }, ...prev].slice(0, 15));
            toast.success('Copied text to clipboard');
            return;
        }
        if (allSelectedShapes.length === 1) {
            setClipboardHistory(prev => [{ id: Date.now(), type: 'shape', data: { ...allSelectedShapes[0] } }, ...prev].slice(0, 15));
            toast.success('Copied shape to clipboard');
            return;
        }
        if (selectedMedia.length === 1) {
            setClipboardHistory(prev => [{ id: Date.now(), type: 'media', data: { ...selectedMedia[0] } }, ...prev].slice(0, 15));
            toast.success('Copied media player');
            return;
        }
        if (selected3D.length === 1) {
            setClipboardHistory(prev => [{ id: Date.now(), type: '3d_object', data: { ...selected3D[0] } }, ...prev].slice(0, 15));
            toast.success('Copied 3D model');
            return;
        }
    }, [selectedImageIds, selectedTextIds, selectedShapeIds, selectedMediaId, selected3DId, imageObjects, textObjects, shapeObjects, mediaObjects, threeDObjects, selection, handleCopySelection]);

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

    const handleBringToFront = useCallback((targetId = null) => {
        const shapeTargets = targetId ? (shapeObjects.some(s => s.id === targetId) ? [targetId] : []) : selectedShapeIds;
        const textTargets = targetId ? (textObjects.some(t => t.id === targetId) ? [targetId] : []) : selectedTextIds;
        const imgTarget = targetId ? (imageObjects.some(i => i.id === targetId) ? targetId : null) : selectedImageId;
        const threeDTarget = targetId ? (threeDObjects.some(o => o.id === targetId) ? targetId : null) : selected3DId;

        const allObjects = [
            ...shapeObjects.map(o => o.zIndex || 30),
            ...textObjects.map(o => o.zIndex || 20),
            ...imageObjects.map(o => o.zIndex || 10),
            ...threeDObjects.map(o => o.zIndex || 15)
        ];
        const maxZ = allObjects.length > 0 ? Math.max(...allObjects) : 30;
        const newZ = maxZ + 1;
        
        if (shapeTargets.length > 0) {
            setShapeObjects(prev => prev.map(s => shapeTargets.includes(s.id) ? { ...s, zIndex: newZ } : s));
        }
        if (textTargets.length > 0) {
            setTextObjects(prev => prev.map(t => textTargets.includes(t.id) ? { ...t, zIndex: newZ } : t));
        }
        if (imgTarget) {
            setImageObjects(prev => prev.map(i => i.id === imgTarget ? { ...i, zIndex: newZ } : i));
        }
        if (threeDTarget) {
            setThreeDObjects(prev => prev.map(o => o.id === threeDTarget ? { ...o, zIndex: newZ } : o));
        }
        saveToHistory();
    }, [shapeObjects, textObjects, imageObjects, threeDObjects, selectedShapeIds, selectedTextIds, selectedImageId, selected3DId, saveToHistory]);

    const handleBringForward = useCallback((targetId = null) => {
        const shapeTargets = targetId ? (shapeObjects.some(s => s.id === targetId) ? [targetId] : []) : selectedShapeIds;
        const textTargets = targetId ? (textObjects.some(t => t.id === targetId) ? [targetId] : []) : selectedTextIds;
        const imgTarget = targetId ? (imageObjects.some(i => i.id === targetId) ? targetId : null) : selectedImageId;
        const threeDTarget = targetId ? (threeDObjects.some(o => o.id === targetId) ? targetId : null) : selected3DId;

        if (shapeTargets.length > 0) {
            setShapeObjects(prev => prev.map(s => shapeTargets.includes(s.id) ? { ...s, zIndex: (s.zIndex || 30) + 1 } : s));
        }
        if (textTargets.length > 0) {
            setTextObjects(prev => prev.map(t => textTargets.includes(t.id) ? { ...t, zIndex: (t.zIndex || 20) + 1 } : t));
        }
        if (imgTarget) {
            setImageObjects(prev => prev.map(i => i.id === imgTarget ? { ...i, zIndex: (i.zIndex || 10) + 1 } : i));
        }
        if (threeDTarget) {
            setThreeDObjects(prev => prev.map(o => o.id === threeDTarget ? { ...o, zIndex: (o.zIndex || 15) + 1 } : o));
        }
        saveToHistory();
    }, [shapeObjects, textObjects, imageObjects, threeDObjects, selectedShapeIds, selectedTextIds, selectedImageId, selected3DId, saveToHistory]);

    const handleSendBackward = useCallback((targetId = null) => {
        const shapeTargets = targetId ? (shapeObjects.some(s => s.id === targetId) ? [targetId] : []) : selectedShapeIds;
        const textTargets = targetId ? (textObjects.some(t => t.id === targetId) ? [targetId] : []) : selectedTextIds;
        const imgTarget = targetId ? (imageObjects.some(i => i.id === targetId) ? targetId : null) : selectedImageId;
        const threeDTarget = targetId ? (threeDObjects.some(o => o.id === targetId) ? targetId : null) : selected3DId;

        if (shapeTargets.length > 0) {
            setShapeObjects(prev => prev.map(s => shapeTargets.includes(s.id) ? { ...s, zIndex: Math.max(1, (s.zIndex || 30) - 1) } : s));
        }
        if (textTargets.length > 0) {
            setTextObjects(prev => prev.map(t => textTargets.includes(t.id) ? { ...t, zIndex: Math.max(1, (t.zIndex || 20) - 1) } : t));
        }
        if (imgTarget) {
            setImageObjects(prev => prev.map(i => i.id === imgTarget ? { ...i, zIndex: Math.max(1, (i.zIndex || 10) - 1) } : i));
        }
        if (threeDTarget) {
            setThreeDObjects(prev => prev.map(o => o.id === threeDTarget ? { ...o, zIndex: Math.max(1, (o.zIndex || 15) - 1) } : o));
        }
        saveToHistory();
    }, [shapeObjects, textObjects, imageObjects, threeDObjects, selectedShapeIds, selectedTextIds, selectedImageId, selected3DId, saveToHistory]);

    const handleSendToBack = useCallback((targetId = null) => {
        const shapeTargets = targetId ? (shapeObjects.some(s => s.id === targetId) ? [targetId] : []) : selectedShapeIds;
        const textTargets = targetId ? (textObjects.some(t => t.id === targetId) ? [targetId] : []) : selectedTextIds;
        const imgTarget = targetId ? (imageObjects.some(i => i.id === targetId) ? targetId : null) : selectedImageId;
        const threeDTarget = targetId ? (threeDObjects.some(o => o.id === targetId) ? targetId : null) : selected3DId;

        const allObjects = [
            ...shapeObjects.map(o => o.zIndex || 30),
            ...textObjects.map(o => o.zIndex || 20),
            ...imageObjects.map(o => o.zIndex || 10),
            ...threeDObjects.map(o => o.zIndex || 15)
        ];
        const minZ = allObjects.length > 0 ? Math.min(...allObjects) : 10;
        const newZ = Math.max(1, minZ - 1);
        
        if (shapeTargets.length > 0) {
            setShapeObjects(prev => prev.map(s => shapeTargets.includes(s.id) ? { ...s, zIndex: newZ } : s));
        }
        if (textTargets.length > 0) {
            setTextObjects(prev => prev.map(t => textTargets.includes(t.id) ? { ...t, zIndex: newZ } : t));
        }
        if (imgTarget) {
            setImageObjects(prev => prev.map(i => i.id === imgTarget ? { ...i, zIndex: newZ } : i));
        }
        if (threeDTarget) {
            setThreeDObjects(prev => prev.map(o => o.id === threeDTarget ? { ...o, zIndex: newZ } : o));
        }
        saveToHistory();
    }, [shapeObjects, textObjects, imageObjects, threeDObjects, selectedShapeIds, selectedTextIds, selectedImageId, selected3DId, saveToHistory]);

    // Alignment tools
    const handleAlign = useCallback((alignment) => {
        if (selectedShapeIds.length < 2) return;

        setShapeObjects(prev => {
            const selected = prev.filter(s => selectedShapeIds.includes(s.id));
            if (selected.length === 0) return prev;

            let minX = Math.min(...selected.map(s => s.x));
            let minY = Math.min(...selected.map(s => s.y));
            let maxX = Math.max(...selected.map(s => s.x + s.width));
            let maxY = Math.max(...selected.map(s => s.y + s.height));

            return prev.map(s => {
                if (!selectedShapeIds.includes(s.id)) return s;
                
                let newX = s.x;
                let newY = s.y;
                
                switch (alignment) {
                    case 'left': newX = minX; break;
                    case 'center': newX = minX + (maxX - minX) / 2 - s.width / 2; break;
                    case 'right': newX = maxX - s.width; break;
                    case 'top': newY = minY; break;
                    case 'middle': newY = minY + (maxY - minY) / 2 - s.height / 2; break;
                    case 'bottom': newY = maxY - s.height; break;
                }
                return { ...s, x: newX, y: newY };
            });
        });
        saveToHistory();
    }, [selectedShapeIds, saveToHistory]);

    // Distribution tools
    const handleDistribute = useCallback((axis) => {
        if (selectedShapeIds.length < 3) return;

        setShapeObjects(prev => {
            const selected = prev.filter(s => selectedShapeIds.includes(s.id));
            if (selected.length < 3) return prev;

            // Sort shapes by their coordinate
            const sorted = [...selected].sort((a, b) => axis === 'horizontal' ? a.x - b.x : a.y - b.y);
            
            const first = sorted[0];
            const last = sorted[sorted.length - 1];
            
            if (axis === 'horizontal') {
                const totalWidth = last.x + last.width - first.x;
                const elementsWidth = sorted.reduce((sum, s) => sum + s.width, 0);
                const space = (totalWidth - elementsWidth) / (sorted.length - 1);
                
                let currentX = first.x;
                return prev.map(s => {
                    if (!selectedShapeIds.includes(s.id)) return s;
                    const index = sorted.findIndex(sortedShape => sortedShape.id === s.id);
                    if (index === 0) { currentX += s.width + space; return s; }
                    if (index === sorted.length - 1) return s;
                    
                    const newS = { ...s, x: currentX };
                    currentX += s.width + space;
                    return newS;
                });
            } else {
                const totalHeight = last.y + last.height - first.y;
                const elementsHeight = sorted.reduce((sum, s) => sum + s.height, 0);
                const space = (totalHeight - elementsHeight) / (sorted.length - 1);
                
                let currentY = first.y;
                return prev.map(s => {
                    if (!selectedShapeIds.includes(s.id)) return s;
                    const index = sorted.findIndex(sortedShape => sortedShape.id === s.id);
                    if (index === 0) { currentY += s.height + space; return s; }
                    if (index === sorted.length - 1) return s;
                    
                    const newS = { ...s, y: currentY };
                    currentY += s.height + space;
                    return newS;
                });
            }
        });
        saveToHistory();
    }, [selectedShapeIds, saveToHistory]);

    // Lock/Unlock tools
    const handleToggleLock = useCallback((targetId = null) => {
        if (targetId) {
            setShapeObjects(prev => prev.map(s => s.id === targetId ? { ...s, isLocked: !s.isLocked } : s));
            setImageObjects(prev => prev.map(i => i.id === targetId ? { ...i, isLocked: !i.isLocked } : i));
            setThreeDObjects(prev => prev.map(o => o.id === targetId ? { ...o, isLocked: !o.isLocked } : o));
            saveToHistory();
            return;
        }
        if (selectedShapeIds.length > 0) {
            setShapeObjects(prev => {
                const anyUnlocked = prev.some(s => selectedShapeIds.includes(s.id) && !s.isLocked);
                const shouldLock = anyUnlocked;
                return prev.map(s => {
                    if (selectedShapeIds.includes(s.id)) {
                        return { ...s, isLocked: shouldLock };
                    }
                    return s;
                });
            });
        }
        if (selectedImageId) {
            setImageObjects(prev => prev.map(i => i.id === selectedImageId ? { ...i, isLocked: !i.isLocked } : i));
        }
        if (selected3DId) {
            setThreeDObjects(prev => prev.map(o => o.id === selected3DId ? { ...o, isLocked: !o.isLocked } : o));
        }
        saveToHistory();
    }, [selectedShapeIds, selectedImageId, selected3DId, saveToHistory]);

    // Floatable Main Toolbar Drag Start (Zero-lag, 120fps direct DOM manipulation)
    const handleToolbarDragStart = (e) => {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        setIsDraggingToolbar(true);
        setToolbarDock('float');

        const startPointerX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const startPointerY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        const initialX = toolbarPos.x;
        const initialY = toolbarPos.y;
        let latestPos = { x: initialX, y: initialY };

        if (toolbarRef.current) {
            toolbarRef.current.style.transition = 'none';
        }

        const onMove = (moveEvt) => {
            const currentX = moveEvt.clientX ?? (moveEvt.touches && moveEvt.touches[0] ? moveEvt.touches[0].clientX : startPointerX);
            const currentY = moveEvt.clientY ?? (moveEvt.touches && moveEvt.touches[0] ? moveEvt.touches[0].clientY : startPointerY);
            const dx = currentX - startPointerX;
            const dy = currentY - startPointerY;

            const clampedX = Math.max(10, Math.min(window.innerWidth - 120, initialX + dx));
            const clampedY = Math.max(10, Math.min(window.innerHeight - 80, initialY + dy));
            latestPos = { x: clampedX, y: clampedY };

            // Direct DOM style update eliminates React 60fps re-render overhead
            if (toolbarRef.current) {
                toolbarRef.current.style.left = `${clampedX}px`;
                toolbarRef.current.style.top = `${clampedY}px`;
            }
        };

        const onUp = () => {
            setIsDraggingToolbar(false);
            if (toolbarRef.current) {
                toolbarRef.current.style.transition = '';
            }
            setToolbarPos(latestPos);
            try {
                localStorage.setItem('wb_toolbar_pos', JSON.stringify(latestPos));
            } catch (err) {}

            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);
    };

    // AI Whiteboard Tasks Generation
    const handleGenerateAITasks = async (customPrompt) => {
        const promptToUse = (typeof customPrompt === 'string' ? customPrompt : aiTaskPrompt).trim();
        if (!promptToUse) {
            toast.error('Please enter a lesson topic or prompt for AI tasks');
            return;
        }
        setIsGeneratingTasks(true);
        try {
            const res = await api.post('/ai/whiteboard-tasks', {
                prompt: promptToUse,
                context: {
                    count: 4,
                    subject: 'Computer Science & STEM'
                }
            });
            const taskData = res.data?.data?.tasks || res.data?.data || [];
            if (Array.isArray(taskData) && taskData.length > 0) {
                setGeneratedAITasks(taskData);
                toast.success(`AI generated ${taskData.length} whiteboard tasks!`, { icon: '✨' });
            } else {
                toast.error('Could not parse tasks. Please try another prompt.');
            }
        } catch (err) {
            console.warn('AI task generation error:', err);
            // Intelligent fallback
            const fallbackTasks = [
                { text: `Introduce fundamental concepts of ${promptToUse}`, duration: 5, category: 'demonstration' },
                { text: 'Draw architectural or structural diagram on canvas', duration: 10, category: 'checkpoint' },
                { text: 'Solve student interactive practice challenge', duration: 15, category: 'exercise' },
                { text: 'Summarize key points, homework and takeaways', duration: 5, category: 'summary' }
            ];
            setGeneratedAITasks(fallbackTasks);
            toast.success(`Generated ${fallbackTasks.length} whiteboard tasks!`, { icon: '✨' });
        } finally {
            setIsGeneratingTasks(false);
        }
    };

    const handleAddAITasksToChecklist = () => {
        if (!generatedAITasks || generatedAITasks.length === 0) return;
        const newTasks = generatedAITasks.map((t, idx) => ({
            id: `task_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
            text: t.text || t.title || String(t),
            completed: false,
            createdAt: new Date().toISOString()
        }));
        setWhiteboardTasks(prev => [...prev, ...newTasks]);
        setGeneratedAITasks([]);
        setAiTaskPrompt('');
        toast.success(`Added ${newTasks.length} tasks to checklist!`);
    };

    const handleInsertAITasksAsStickyNotes = () => {
        if (!generatedAITasks || generatedAITasks.length === 0) return;
        const colors = ['#fef08a', '#bbf7d0', '#fed7aa', '#bae6fd', '#e9d5ff'];
        const startX = 140;
        const startY = 160;
        const cardW = 190;
        const cardH = 140;

        const newNotes = generatedAITasks.map((t, idx) => {
            const col = idx % 3;
            const row = Math.floor(idx / 3);
            return {
                id: `sticky_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
                type: 'sticky_note',
                x: startX + col * (cardW + 28),
                y: startY + row * (cardH + 28),
                width: cardW,
                height: cardH,
                fillColor: colors[idx % colors.length],
                color: '#1e293b',
                text: `Task ${idx + 1}: ${t.text || t.title || String(t)}${t.duration ? ` (${t.duration}m)` : ''}`,
                fontSize: 13,
                zIndex: 25
            };
        });

        setPageShapeObjects(prev => ({
            ...prev,
            [currentPage]: [...(prev[currentPage] || []), ...newNotes]
        }));
        setGeneratedAITasks([]);
        setAiTaskPrompt('');
        toast.success(`Dropped ${newNotes.length} task sticky notes on canvas!`, { icon: '📌' });
    };

    // Grouping tools
    const moveGroup = useCallback((groupId, dx, dy) => {
        setShapeObjects(prev => prev.map(s => s.groupId === groupId && !s.isLocked ? { ...s, x: s.x + dx, y: s.y + dy } : s));
        setTextObjects(prev => prev.map(s => s.groupId === groupId && !s.isLocked ? { ...s, x: s.x + dx, y: s.y + dy } : s));
        setImageObjects(prev => prev.map(s => s.groupId === groupId && !s.isLocked ? { ...s, x: s.x + dx, y: s.y + dy } : s));
    }, []);

    const handleGroup = useCallback(() => {
        const totalSelected = selectedShapeIds.length + selectedTextIds.length + (selectedImageId ? 1 : 0);
        if (totalSelected < 2) return;
        const newGroupId = `group-${Date.now()}`;
        
        if (selectedShapeIds.length > 0) {
            setShapeObjects(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, groupId: newGroupId } : s));
        }
        if (selectedTextIds.length > 0) {
            setTextObjects(prev => prev.map(s => selectedTextIds.includes(s.id) ? { ...s, groupId: newGroupId } : s));
        }
        if (selectedImageId) {
            setImageObjects(prev => prev.map(s => s.id === selectedImageId ? { ...s, groupId: newGroupId } : s));
        }
        saveToHistory();
    }, [selectedShapeIds, selectedTextIds, selectedImageId, saveToHistory]);

    const handleUngroup = useCallback(() => {
        const totalSelected = selectedShapeIds.length + selectedTextIds.length + (selectedImageId ? 1 : 0);
        if (totalSelected === 0) return;
        
        if (selectedShapeIds.length > 0) {
            setShapeObjects(prev => prev.map(s => {
                if (selectedShapeIds.includes(s.id)) {
                    const { groupId, ...rest } = s;
                    return rest;
                }
                return s;
            }));
        }
        if (selectedTextIds.length > 0) {
            setTextObjects(prev => prev.map(s => {
                if (selectedTextIds.includes(s.id)) {
                    const { groupId, ...rest } = s;
                    return rest;
                }
                return s;
            }));
        }
        if (selectedImageId) {
            setImageObjects(prev => prev.map(s => {
                if (s.id === selectedImageId) {
                    const { groupId, ...rest } = s;
                    return rest;
                }
                return s;
            }));
        }
        saveToHistory();
    }, [selectedShapeIds, selectedTextIds, selectedImageId, saveToHistory]);

    // ─── Radial Toolbar & Template Callbacks ──────────────────────────────
    const handleRadialToolSelect = useCallback((toolId, options = {}, hasSubTools = false) => {
        if (toolId === 'pen') {
            setTool('pen');
            if (options.brushType) {
                setBrushType(options.brushType);
                toast.success(`Brush: ${options.brushType}`, { icon: '🖌️' });
            }
            if (options.strokeWidth) setStrokeWidth(options.strokeWidth);
        } else if (toolId === 'highlighter') {
            setTool('highlighter');
            if (options.color) {
                const colorMap = {
                    yellow: 'rgba(255, 235, 59, 0.4)',
                    green: 'rgba(76, 175, 80, 0.4)',
                    blue: 'rgba(33, 150, 243, 0.4)',
                    pink: 'rgba(233, 30, 99, 0.4)',
                    orange: 'rgba(255, 152, 0, 0.4)',
                    purple: 'rgba(168, 85, 247, 0.4)',
                    cyan: 'rgba(6, 182, 212, 0.4)',
                };
                setHighlighterColor(colorMap[options.color] || colorMap.yellow);
            }
        } else if (toolId === 'eraser') {
            if (options.action === 'erase_all') {
                handleClear();
            } else if (options.eraserMode === 'object') {
                setTool('select');
                toast('Object Eraser: click or lasso objects to delete', { icon: '🗑️' });
            } else {
                setTool('eraser');
                if (options.eraserSize) setEraserSize(options.eraserSize);
            }
        } else if (toolId === 'shapes') {
            if (options.shapeType === 'sticky_note') {
                const wrapper = canvasWrapperRef.current;
                const cx = wrapper ? wrapper.clientWidth / 2 - 100 : 200;
                const cy = wrapper ? wrapper.clientHeight / 2 - 100 : 200;
                const newNote = createStickyNoteObject(cx, cy, 'yellow');
                setPageShapeObjects(prev => ({
                    ...prev,
                    [currentPage]: [...(prev[currentPage] || []), newNote]
                }));
                setTool('select');
                setSelectedShapeIds([newNote.id]);
                toast.success('Sticky note added!', { icon: '📝' });
            } else if (options.shapeType === 'connector') {
                const wrapper = canvasWrapperRef.current;
                const cx = wrapper ? wrapper.clientWidth / 2 : 300;
                const cy = wrapper ? wrapper.clientHeight / 2 : 300;
                const newConnector = {
                    id: Date.now().toString(),
                    type: 'connector',
                    sourceId: null,
                    targetId: null,
                    sourcePoint: { x: cx - 90, y: cy },
                    targetPoint: { x: cx + 90, y: cy },
                    sourceAnchor: 'auto',
                    targetAnchor: 'auto',
                    pathType: 'straight',
                    arrowStart: 'none',
                    arrowEnd: 'arrow',
                    color: color || '#6366f1',
                    strokeWidth: 2,
                    strokeStyle: 'solid'
                };
                setPageShapeObjects(prev => ({
                    ...prev,
                    [currentPage]: [...(prev[currentPage] || []), newConnector]
                }));
                setTool('select');
                setSelectedShapeIds([newConnector.id]);
                toast.success('Connector added! Drag endpoints to snap to shapes.', { icon: '🔗' });
            } else {
                setTool('shape');
                if (options.shapeType) setShapeType(options.shapeType);
            }
        } else if (toolId === 'select') {
            setTool('select');
            if (options.action === 'select_all') {
                const allShapes = (pageShapeObjects[currentPage] || []).map(s => s.id);
                const allTexts = (pageTextObjects[currentPage] || []).map(t => t.id);
                setSelectedShapeIds(allShapes);
                setSelectedTextIds(allTexts);
                toast.success('Selected all objects', { icon: '☑️' });
            } else if (options.selectMode) {
                setSelectMode(options.selectMode);
            }
        } else if (toolId === 'line') {
            setTool('line');
            if (options.lineType) setLineType(options.lineType);
        } else if (toolId === 'text') {
            setTool('text');
        } else if (toolId === 'more') {
            if (options.action === 'templates') {
                setShowTemplateGallery(true);
            } else if (options.action === 'timer') {
                setShowClassroomTimer(prev => !prev);
            } else if (options.action === 'spotlight') {
                setIsSpotlightActive(prev => {
                    const next = !prev;
                    if (next) toast('Spotlight active: move cursor to illuminate area', { icon: '🔦' });
                    return next;
                });
            } else if (options.action === 'curtain') {
                setIsCurtainActive(prev => {
                    const next = !prev;
                    if (next) toast('Screen Curtain active: drag bottom bar to reveal', { icon: '🎭' });
                    return next;
                });
            } else if (options.action === 'fill') {
                setTool('fill');
                toast('Paint Bucket: click anywhere to flood fill', { icon: '🎨' });
            } else if (options.action === 'eyedropper') {
                setTool('eyedropper');
                toast('Color Picker: click on the canvas to sample a color', { icon: '✒️' });
            } else if (options.action === 'laser') {
                setTool('laser');
            } else if (options.action === 'undo') {
                handleUndo();
            } else if (options.action === 'redo') {
                handleRedo();
            } else if (options.action === 'datetime') {
                const now = new Date().toLocaleString();
                const newTxt = {
                    id: Date.now(),
                    text: now,
                    x: 200,
                    y: 200,
                    width: 250,
                    height: 40,
                    rotation: 0,
                    color: color,
                    fontSize: 18,
                    fontWeight: 'bold',
                    fontStyle: 'normal'
                };
                setPageTextObjects(prev => ({
                    ...prev,
                    [currentPage]: [...(prev[currentPage] || []), newTxt]
                }));
                toast.success(`Inserted DateTime: ${now}`, { icon: '📅' });
            }
        }
        if (!hasSubTools) {
            setShowRadialMenu(false);
        }
    }, [currentPage, color, strokeWidth, handleClear, handleUndo, handleRedo]);

    const handleApplyTemplate = useCallback((templateData) => {
        if (!templateData) return;
        const { shapes = [], texts = [], background, title = 'Diagram', connectors = [] } = templateData;
        const allShapes = [...shapes, ...connectors];
        
        if (allShapes && allShapes.length > 0) {
            // Generate unique IDs for all template shapes to avoid collision
            const idMap = new Map();
            allShapes.forEach(s => {
                if (s.id) {
                    idMap.set(s.id, 'shape-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6));
                }
            });

            const normalizedShapes = allShapes.map(shape => {
                const newId = (shape.id && idMap.get(shape.id)) || ('shape-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6));
                
                // If template shape is already a connector or an arrow linking two shapes
                if (shape.type === 'connector' || ((shape.type === 'arrow' || shape.type === 'line') && shape.sourceId && shape.targetId)) {
                    return {
                        id: newId,
                        type: 'connector',
                        sourceId: idMap.get(shape.sourceId) || shape.sourceId,
                        sourceAnchor: shape.sourceAnchor || 'bottom',
                        targetId: idMap.get(shape.targetId) || shape.targetId,
                        targetAnchor: shape.targetAnchor || 'top',
                        pathType: shape.pathType || 'curved',
                        strokeStyle: shape.strokeStyle || 'solid',
                        arrowEnd: shape.type === 'line' ? 'none' : (shape.arrowEnd || 'arrow'),
                        arrowStart: shape.type === 'double_arrow' ? 'arrow' : (shape.arrowStart || 'none'),
                        color: shape.color || '#475569',
                        strokeWidth: shape.strokeWidth || 2,
                        label: shape.label || '',
                        waypoint: null
                    };
                }

                if (['line', 'arrow', 'double_arrow', 'dashed_line'].includes(shape.type)) {
                    const sx = shape.startX !== undefined ? (shape.x + shape.startX) : shape.x;
                    const sy = shape.startY !== undefined ? (shape.y + shape.startY) : shape.y;
                    const ex = shape.endX !== undefined ? (shape.x + shape.endX) : (shape.x + (shape.width || 0));
                    const ey = shape.endY !== undefined ? (shape.y + shape.endY) : (shape.y + (shape.height || 0));
                    const minX = Math.min(sx, ex);
                    const minY = Math.min(sy, ey);
                    const w = Math.max(Math.abs(ex - sx), 10);
                    const h = Math.max(Math.abs(ey - sy), 10);
                    return {
                        ...shape,
                        id: newId,
                        x: minX,
                        y: minY,
                        width: w,
                        height: h,
                        startX: sx - minX,
                        startY: sy - minY,
                        endX: ex - minX,
                        endY: ey - minY
                    };
                }
                return {
                    ...shape,
                    id: newId
                };
            });

            const insertedShapeIds = normalizedShapes.map(s => s.id);
            setPageShapeObjects(prev => ({
                ...prev,
                [currentPage]: [...(prev[currentPage] || []), ...normalizedShapes]
            }));
            setSelectedShapeIds(insertedShapeIds);
        }
        if (texts && texts.length > 0) {
            const normalizedTexts = texts.map(t => ({
                ...t,
                id: Date.now() + '-' + Math.random().toString(36).substr(2, 6),
                width: t.width || 450,
                height: t.height || 50,
                fontSize: t.fontSize || 22
            }));
            const insertedTextIds = normalizedTexts.map(t => t.id);
            setPageTextObjects(prev => ({
                ...prev,
                [currentPage]: [...(prev[currentPage] || []), ...normalizedTexts]
            }));
            setSelectedTextIds(insertedTextIds);
        }

        // Keep inserted template elements selected as a group and switch to select tool
        setSelectedImageIds([]);
        setTool('select');
        setShowTemplateGallery(false);
        toast.success(`Applied "${title}" template!`, { icon: '📐' });
        saveToHistory();
    }, [currentPage, saveToHistory]);

    // Listen for external templates dispatched or stored in sessionStorage by AI Assistant or external tools
    useEffect(() => {
        const checkPendingTemplate = () => {
            try {
                const stored = sessionStorage.getItem('pending_whiteboard_template');
                if (stored) {
                    sessionStorage.removeItem('pending_whiteboard_template');
                    const parsed = JSON.parse(stored);
                    if (parsed && (parsed.shapes || parsed.texts || parsed.connectors)) {
                        handleApplyTemplate(parsed);
                    }
                }
            } catch (err) {
                console.error('Failed to load pending whiteboard template:', err);
            }
        };

        checkPendingTemplate();

        const handleExternalTemplateEvent = (e) => {
            if (e.detail) {
                handleApplyTemplate(e.detail);
            }
        };

        window.addEventListener('whiteboard:load-external-template', handleExternalTemplateEvent);
        return () => {
            window.removeEventListener('whiteboard:load-external-template', handleExternalTemplateEvent);
        };
    }, [handleApplyTemplate]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modKey = isMac ? e.metaKey : e.ctrlKey;
            const activeTag = document.activeElement.tagName.toLowerCase();
            const isInput = activeTag === 'input' || activeTag === 'textarea';

            if (isInput) return; // let default inputs work

            // Arrow keys to nudge selected images, shapes, and texts
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                const hasSelectedImages = selectedImageIds.length > 0;
                const hasSelectedShapes = selectedShapeIds.length > 0;
                const hasSelectedTexts = selectedTextIds.length > 0;

                if (hasSelectedImages || hasSelectedShapes || hasSelectedTexts) {
                    e.preventDefault();
                    const step = e.shiftKey ? 10 : 1;
                    let dx = 0;
                    let dy = 0;
                    if (e.key === 'ArrowUp') dy = -step;
                    else if (e.key === 'ArrowDown') dy = step;
                    else if (e.key === 'ArrowLeft') dx = -step;
                    else if (e.key === 'ArrowRight') dx = step;

                    if (hasSelectedImages) {
                        setImageObjects(prev => prev.map(img =>
                            selectedImageIds.includes(img.id) && !img.isLocked
                                ? { ...img, x: img.x + dx, y: img.y + dy }
                                : img
                        ));
                    }
                    if (hasSelectedShapes) {
                        setShapeObjects(prev => prev.map(shp =>
                            selectedShapeIds.includes(shp.id) && !shp.isLocked
                                ? {
                                    ...shp,
                                    x: (shp.x || 0) + dx,
                                    y: (shp.y || 0) + dy,
                                    startX: shp.startX !== undefined ? shp.startX + dx : shp.startX,
                                    startY: shp.startY !== undefined ? shp.startY + dy : shp.startY,
                                    endX: shp.endX !== undefined ? shp.endX + dx : shp.endX,
                                    endY: shp.endY !== undefined ? shp.endY + dy : shp.endY,
                                    sourcePoint: shp.sourcePoint ? { x: shp.sourcePoint.x + dx, y: shp.sourcePoint.y + dy } : shp.sourcePoint,
                                    targetPoint: shp.targetPoint ? { x: shp.targetPoint.x + dx, y: shp.targetPoint.y + dy } : shp.targetPoint,
                                    waypoint: shp.waypoint ? { x: shp.waypoint.x + dx, y: shp.waypoint.y + dy } : shp.waypoint
                                }
                                : shp
                        ));
                    }
                    if (hasSelectedTexts) {
                        setTextObjects(prev => prev.map(txt =>
                            selectedTextIds.includes(txt.id) && !txt.isLocked
                                ? { ...txt, x: txt.x + dx, y: txt.y + dy }
                                : txt
                        ));
                    }
                    saveToHistory();
                    return;
                }
            }

            // Shortcuts modal trigger (? or Cmd+/)
            if (e.key === '?' || (modKey && e.key === '/')) {
                e.preventDefault();
                setShowShortcutsModal(prev => !prev);
                return;
            }

            // Undo / Redo shortcuts
            if (modKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    handleRedo();
                } else {
                    handleUndo();
                }
                return;
            } else if (modKey && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                handleRedo();
                return;
            }

            // Group / Ungroup
            if (modKey && e.key.toLowerCase() === 'g') {
                e.preventDefault();
                if (e.shiftKey) {
                    handleUngroup();
                } else {
                    handleGroup();
                }
                return;
            }

            // Lock / Unlock
            if (modKey && e.key.toLowerCase() === 'l') {
                e.preventDefault();
                handleToggleLock();
                return;
            }

            // Zoom controls hotkeys
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                setZoomLevel(prev => Math.min(3, Math.round((prev + 0.1) * 10) / 10));
                return;
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                setZoomLevel(prev => Math.max(0.2, Math.round((prev - 0.1) * 10) / 10));
                return;
            } else if (e.key === '0') {
                e.preventDefault();
                setZoomLevel(1);
                setPanOffset({ x: 0, y: 0 });
                toast('Zoom reset to 100%', { icon: '🎯' });
                return;
            } else if (e.key === '9') {
                e.preventDefault();
                const container = canvasWrapperRef.current;
                if (container) {
                    const padding = 60;
                    const scaleX = (container.clientWidth - padding) / canvasWidth;
                    const scaleY = (container.clientHeight - padding) / canvasHeight;
                    const fitScale = Math.max(0.2, Math.min(2, Math.min(scaleX, scaleY)));
                    setZoomLevel(Math.round(fitScale * 100) / 100);
                    setPanOffset({ x: 0, y: 0 });
                    toast('Fit to Screen', { icon: '📐' });
                }
                return;
            }

            // Single key tool hotkeys (only when not typing in text/input)
            if (!isInput && !modKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
                const k = e.key.toLowerCase();
                if (k === 'v') { setTool('select'); toast('Select tool (V)', { id: 'tool-hint' }); }
                else if (k === 'p') { setTool('pencil'); toast('Pen tool (P)', { id: 'tool-hint' }); }
                else if (k === 'h') { setTool('highlighter'); toast('Highlighter tool (H)', { id: 'tool-hint' }); }
                else if (k === 'e') { setTool('eraser'); toast('Eraser tool (E)', { id: 'tool-hint' }); }
                else if (k === 't') { setTool('text'); toast('Text tool (T)', { id: 'tool-hint' }); }
                else if (k === 'r') { setTool('shape'); setShapeType('rectangle'); toast('Rectangle shape (R)', { id: 'tool-hint' }); }
                else if (k === 'c') { setTool('shape'); setShapeType('circle'); toast('Circle shape (C)', { id: 'tool-hint' }); }
                else if (k === 'l') { setTool('line'); setLineType('line'); toast('Line tool (L)', { id: 'tool-hint' }); }
                else if (k === 'k') { setTool('line'); setLineType('connector'); toast('Connector line (K)', { id: 'tool-hint' }); }
                else if (k === 'i') { imageInputRef.current?.click(); }
                else if (k === '3') { setShowDomainLibrary(true); }
                else if (k === 'm') { setShowMediaModal(true); }
                else if (k === 'u') { setShowTasksPanel(prev => !prev); }
                else if (k === 'f') { onToggleFullscreen && onToggleFullscreen(); }
            }

            if (modKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                handleCopy();
            } else if (modKey && e.key.toLowerCase() === 'x') {
                e.preventDefault();
                handleCut();
            } else if (modKey && e.key.toLowerCase() === 'v') {
                if (isInput) return;
                if (clipboardHistory && clipboardHistory.length > 0) {
                    e.preventDefault();
                    handlePaste();
                }
            } else if (modKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                handleDuplicate();
            } else if (modKey && e.key === ']') {
                e.preventDefault();
                handleBringToFront();
            } else if (modKey && e.key === '[') {
                e.preventDefault();
                handleSendToBack();
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (!isInput || selectedImageIds.length > 0 || selection || selectedShapeIds.length > 0 || selectedTextIds.length > 0 || selectedMediaId || selected3DId) {
                    e.preventDefault();
                    handleDelete();
                }
            } else if (e.key === 'Escape') {
                if (showShortcutsModal) { setShowShortcutsModal(false); return; }
                if (showTasksPanel) { setShowTasksPanel(false); return; }
                if (showMediaModal) { setShowMediaModal(false); return; }
                if (showDomainLibrary) { setShowDomainLibrary(false); return; }
                if (showRadialMenu) { setShowRadialMenu(false); return; }
                if (showTemplateGallery) { setShowTemplateGallery(false); return; }
                setSelectedImageIds([]);
                setSelectedTextIds([]);
                setSelectedShapeIds([]);
                setSelectedMediaId(null);
                setSelected3DId(null);
            } else if (e.key === '`' || e.key === '~') {
                e.preventDefault();
                const wrapper = canvasWrapperRef.current;
                if (wrapper) {
                    const rect = wrapper.getBoundingClientRect();
                    setRadialMenuPos({ x: rect.width / 2, y: rect.height / 2 });
                    setShowRadialMenu(true);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedImageIds, selectedTextIds, selectedShapeIds, selectedMediaId, selected3DId, selection, showRadialMenu, showTemplateGallery, showShortcutsModal, showTasksPanel, showMediaModal, showDomainLibrary, handleCopy, handleCut, handlePaste, handleDuplicate, handleDelete, handleBringToFront, handleSendToBack, handleUndo, handleRedo, handleGroup, handleUngroup, handleToggleLock, onToggleFullscreen, saveToHistory, clipboardHistory, canvasWidth, canvasHeight]);

    // Global clipboard paste listener for pasting images from websites (HTML <img>, URLs, bitmaps) and 3D files
    useEffect(() => {
        const insertImageFromUrl = (url) => {
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = canvasRef.current;
                const cWidth = canvas ? canvas.width : 1920;
                const cHeight = canvas ? canvas.height : 1080;
                let w = img.width || 320;
                let h = img.height || 240;
                const maxDim = 460;
                if (w > maxDim || h > maxDim) {
                    const ratio = Math.min(maxDim / w, maxDim / h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }
                pasteCountRef.current += 1;
                const offset = ((pasteCountRef.current - 1) % 8 + 1) * 25;
                const newId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                const newImageObj = {
                    id: newId,
                    src: url,
                    x: Math.max(40, Math.round(cWidth / 2 - w / 2) + offset),
                    y: Math.max(40, Math.round(cHeight / 2 - h / 2) + offset),
                    width: w,
                    height: h,
                    rotation: 0,
                    opacity: 1,
                    isLocked: false,
                    isInfiniteCloner: false,
                    zIndex: 15
                };
                setImageObjects(prev => [...prev, newImageObj]);
                setSelectedImageIds([newId]);
                setSelectedImageId(newId);
                setSelectedShapeIds([]);
                setSelectedTextIds([]);
                saveToHistory();
                toast.success('Pasted web image onto whiteboard', { icon: '🖼️' });
            };
            img.onerror = () => {
                toast.error('Could not load image from clipboard URL');
            };
            img.src = url;
        };

        const handleGlobalPaste = (e) => {
            const activeTag = document.activeElement?.tagName?.toLowerCase();
            const isEditingInput = activeTag === 'input' || activeTag === 'textarea';
            if (isEditingInput) return;

            // 1. Direct Image Files / Blobs (OS clipboard, screenshot bitmaps)
            const items = e.clipboardData?.items;
            let imageFile = null;
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type && items[i].type.startsWith('image/')) {
                        imageFile = items[i].getAsFile();
                        break;
                    }
                }
            }

            if (imageFile) {
                e.preventDefault();
                e.stopPropagation();

                const reader = new FileReader();
                reader.onload = (event) => {
                    insertImageFromUrl(event.target.result);
                };
                reader.readAsDataURL(imageFile);
                return;
            }

            // 2. HTML Clipboard containing <img> tags from websites
            const htmlData = e.clipboardData?.getData('text/html');
            if (htmlData) {
                const match = htmlData.match(/<img[^>]+src=["']([^"']+)["']/i);
                if (match && match[1]) {
                    e.preventDefault();
                    e.stopPropagation();
                    insertImageFromUrl(match[1]);
                    return;
                }
            }

            // 3. Plain Text (Direct image URLs or 3D files)
            const textData = e.clipboardData?.getData('text/plain');
            if (textData) {
                const trimmed = textData.trim();
                // Direct image URL
                if (/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(trimmed) || /^https?:\/\/.*\.(png|jpe?g|gif|webp|svg)/i.test(trimmed)) {
                    e.preventDefault();
                    e.stopPropagation();
                    insertImageFromUrl(trimmed);
                    return;
                }

                // 3D Wavefront OBJ
                if (trimmed.startsWith('v ') && trimmed.includes('\nf ')) {
                    const parsed = parseOBJ(trimmed);
                    if (parsed) {
                        e.preventDefault();
                        e.stopPropagation();
                        const new3DObj = {
                            id: `3d_${Date.now()}`,
                            name: 'Pasted 3D Mesh',
                            modelType: 'custom',
                            meshData: parsed,
                            x: 240,
                            y: 180,
                            width: 200,
                            height: 200,
                            rotX: -25,
                            rotY: 45,
                            rotZ: 0,
                            rotation: 0,
                            isLocked: false,
                            isInfiniteCloner: false,
                            zIndex: 25
                        };
                        setPage3DObjects(prev => ({
                            ...prev,
                            [currentPage]: [...(prev[currentPage] || []), new3DObj]
                        }));
                        setSelected3DId(new3DObj.id);
                        saveToHistory();
                        toast.success('Pasted 3D OBJ model onto canvas', { icon: '📦' });
                        return;
                    }
                }

                // 3D JSON Mesh
                if (trimmed.startsWith('{') && (trimmed.includes('"vertices"') || trimmed.includes('"faces"'))) {
                    const parsed = parseJSON3D(trimmed);
                    if (parsed) {
                        e.preventDefault();
                        e.stopPropagation();
                        const new3DObj = {
                            id: `3d_${Date.now()}`,
                            name: 'Pasted 3D Model',
                            modelType: 'custom',
                            meshData: parsed,
                            x: 240,
                            y: 180,
                            width: 200,
                            height: 200,
                            rotX: -25,
                            rotY: 45,
                            rotZ: 0,
                            rotation: 0,
                            isLocked: false,
                            isInfiniteCloner: false,
                            zIndex: 25
                        };
                        setPage3DObjects(prev => ({
                            ...prev,
                            [currentPage]: [...(prev[currentPage] || []), new3DObj]
                        }));
                        setSelected3DId(new3DObj.id);
                        saveToHistory();
                        toast.success('Pasted 3D mesh model onto canvas', { icon: '📦' });
                        return;
                    }
                }
            }
        };

        window.addEventListener('paste', handleGlobalPaste);
        return () => window.removeEventListener('paste', handleGlobalPaste);
    }, [saveToHistory, setImageObjects, setSelectedImageIds, setSelectedImageId, setSelectedShapeIds, setSelectedTextIds, currentPage]);

    // Image manipulation mouse handlers
    useEffect(() => {
        if (!imageDragState) return;

        const handleMouseMove = (e) => {
            const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            const dx = clientX - imageDragState.startX;
            const dy = clientY - imageDragState.startY;
            const startObj = imageDragState.startObj;

            const canvasEl = canvasRef.current;
            const rect = canvasEl ? canvasEl.getBoundingClientRect() : { width: 1, height: 1 };
            const scaleX = (canvasEl && rect.width > 0) ? (canvasEl.width / rect.width) : 1;
            const scaleY = (canvasEl && rect.height > 0) ? (canvasEl.height / rect.height) : 1;
            const canvasDx = dx * scaleX;
            const canvasDy = dy * scaleY;

            if (imageDragState.action === 'move') {
                const deltaX = (clientX - (imageDragState.lastX || imageDragState.startX)) * scaleX;
                const deltaY = (clientY - (imageDragState.lastY || imageDragState.startY)) * scaleY;
                imageDragState.lastX = clientX;
                imageDragState.lastY = clientY;

                if (imageDragState.startImageObjs && imageDragState.startImageObjs.length > 0) {
                    setImageObjects(prev => prev.map(img => {
                        const iObj = imageDragState.startImageObjs.find(i => i.id === img.id);
                        return iObj ? { ...img, x: iObj.x + canvasDx, y: iObj.y + canvasDy } : img;
                    }));
                    if (imageDragState.startShapeObjs && imageDragState.startShapeObjs.length > 0) {
                        setShapeObjects(prev => prev.map(shp => {
                            const sObj = imageDragState.startShapeObjs.find(s => s.id === shp.id);
                            return sObj ? { ...shp, x: (sObj.x || 0) + canvasDx, y: (sObj.y || 0) + canvasDy } : shp;
                        }));
                    }
                    if (imageDragState.startTextObjs && imageDragState.startTextObjs.length > 0) {
                        setTextObjects(prev => prev.map(txt => {
                            const tObj = imageDragState.startTextObjs.find(t => t.id === txt.id);
                            return tObj ? { ...txt, x: (tObj.x || 0) + canvasDx, y: (tObj.y || 0) + canvasDy } : txt;
                        }));
                    }
                } else if (startObj.groupId) {
                    moveGroup(startObj.groupId, deltaX, deltaY);
                } else {
                    setImageObjects(prev => prev.map(img =>
                        img.id === imageDragState.id
                            ? { ...img, x: startObj.x + canvasDx, y: startObj.y + canvasDy }
                            : img
                    ));
                }
            } else if (imageDragState.action === 'rotate') {
                if (!canvasEl) return;
                const scaleToScreenX = (canvasEl && canvasEl.width > 0) ? rect.width / canvasEl.width : 1;
                const scaleToScreenY = (canvasEl && canvasEl.height > 0) ? rect.height / canvasEl.height : 1;
                const centerX = startObj.x + startObj.width / 2;
                const centerY = startObj.y + startObj.height / 2;
                const canvasCenterX = rect.left + centerX * scaleToScreenX;
                const canvasCenterY = rect.top + centerY * scaleToScreenY;

                const startAngle = Math.atan2(imageDragState.startY - canvasCenterY, imageDragState.startX - canvasCenterX);
                const currentAngle = Math.atan2(clientY - canvasCenterY, clientX - canvasCenterX);
                const angleDiff = (currentAngle - startAngle) * (180 / Math.PI);
                const newRotation = snapRotationAngle((startObj.rotation || 0) + angleDiff);

                setImageObjects(prev => prev.map(img =>
                    img.id === imageDragState.id
                        ? { ...img, rotation: newRotation }
                        : img
                ));
            } else if (imageDragState.action.startsWith('resize-')) {
                const handle = imageDragState.action.replace('resize-', '');
                let newX = startObj.x, newY = startObj.y;
                let newWidth = startObj.width, newHeight = startObj.height;
                const minSize = 50;

                if (handle.includes('e')) {
                    newWidth = Math.max(minSize, startObj.width + canvasDx);
                }
                if (handle.includes('w')) {
                    const widthChange = Math.min(canvasDx, startObj.width - minSize);
                    newX = startObj.x + widthChange;
                    newWidth = startObj.width - widthChange;
                }
                if (handle.includes('s')) {
                    newHeight = Math.max(minSize, startObj.height + canvasDy);
                }
                if (handle.includes('n')) {
                    const heightChange = Math.min(canvasDy, startObj.height - minSize);
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
        window.addEventListener('touchmove', handleMouseMove, { passive: false });
        window.addEventListener('touchend', handleMouseUp);
        window.addEventListener('pointermove', handleMouseMove);
        window.addEventListener('pointerup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
            window.removeEventListener('pointermove', handleMouseMove);
            window.removeEventListener('pointerup', handleMouseUp);
        };
    }, [imageDragState]);

    // Text manipulation mouse handlers (same pattern as images)
    useEffect(() => {
        if (!textDragState) return;

        const handleMouseMove = (e) => {
            const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            const dx = clientX - textDragState.startX;
            const dy = clientY - textDragState.startY;
            const startObj = textDragState.startObj;

            const canvasEl = canvasRef.current;
            const rect = canvasEl ? canvasEl.getBoundingClientRect() : { width: 1, height: 1 };
            const scaleX = (canvasEl && rect.width > 0) ? (canvasEl.width / rect.width) : 1;
            const scaleY = (canvasEl && rect.height > 0) ? (canvasEl.height / rect.height) : 1;
            const canvasDx = dx * scaleX;
            const canvasDy = dy * scaleY;

            if (textDragState.action === 'move') {
                const deltaX = (clientX - (textDragState.lastX || textDragState.startX)) * scaleX;
                const deltaY = (clientY - (textDragState.lastY || textDragState.startY)) * scaleY;
                textDragState.lastX = clientX;
                textDragState.lastY = clientY;

                if (startObj.groupId) {
                    moveGroup(startObj.groupId, deltaX, deltaY);
                } else {
                    if (textDragState.startTextObjs && textDragState.startTextObjs.length > 0) {
                        setTextObjects(prev => prev.map(txt => {
                            const tObj = textDragState.startTextObjs.find(t => t.id === txt.id);
                            return tObj ? { ...txt, x: tObj.x + canvasDx, y: tObj.y + canvasDy } : txt;
                        }));
                        if (textDragState.startShapeObjs && textDragState.startShapeObjs.length > 0) {
                            setShapeObjects(prev => prev.map(shp => {
                                const sObj = textDragState.startShapeObjs.find(s => s.id === shp.id);
                                return sObj ? { ...shp, x: (sObj.x || 0) + canvasDx, y: (sObj.y || 0) + canvasDy } : shp;
                            }));
                        }
                        if (textDragState.startImageObjs && textDragState.startImageObjs.length > 0) {
                            setImageObjects(prev => prev.map(img => {
                                const iObj = textDragState.startImageObjs.find(i => i.id === img.id);
                                return iObj ? { ...img, x: iObj.x + canvasDx, y: iObj.y + canvasDy } : img;
                            }));
                        }
                    } else {
                        setTextObjects(prev => prev.map(txt =>
                            txt.id === textDragState.id
                                ? { ...txt, x: startObj.x + canvasDx, y: startObj.y + canvasDy }
                                : txt
                        ));
                    }
                }
            } else if (textDragState.action === 'rotate') {
                if (!canvasEl) return;
                const scaleToScreenX = (canvasEl && canvasEl.width > 0) ? rect.width / canvasEl.width : 1;
                const scaleToScreenY = (canvasEl && canvasEl.height > 0) ? rect.height / canvasEl.height : 1;
                const centerX = startObj.x + startObj.width / 2;
                const centerY = startObj.y + startObj.height / 2;
                const canvasCenterX = rect.left + centerX * scaleToScreenX;
                const canvasCenterY = rect.top + centerY * scaleToScreenY;

                const startAngle = Math.atan2(textDragState.startY - canvasCenterY, textDragState.startX - canvasCenterX);
                const currentAngle = Math.atan2(clientY - canvasCenterY, clientX - canvasCenterX);
                const angleDiff = (currentAngle - startAngle) * (180 / Math.PI);
                const newRotation = snapRotationAngle((startObj.rotation || 0) + angleDiff);

                setTextObjects(prev => prev.map(txt =>
                    txt.id === textDragState.id
                        ? { ...txt, rotation: newRotation }
                        : txt
                ));
            } else if (textDragState.action.startsWith('resize-')) {
                const handle = textDragState.action.replace('resize-', '');
                let newX = startObj.x, newY = startObj.y;
                let newWidth = startObj.width, newHeight = startObj.height;
                const minSize = 50;

                if (handle.includes('e')) {
                    newWidth = Math.max(minSize, startObj.width + canvasDx);
                }
                if (handle.includes('w')) {
                    const widthChange = Math.min(canvasDx, startObj.width - minSize);
                    newX = startObj.x + widthChange;
                    newWidth = startObj.width - widthChange;
                }
                if (handle.includes('s')) {
                    newHeight = Math.max(minSize, startObj.height + canvasDy);
                }
                if (handle.includes('n')) {
                    const heightChange = Math.min(canvasDy, startObj.height - minSize);
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
        window.addEventListener('touchmove', handleMouseMove, { passive: false });
        window.addEventListener('touchend', handleMouseUp);
        window.addEventListener('pointermove', handleMouseMove);
        window.addEventListener('pointerup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
            window.removeEventListener('pointermove', handleMouseMove);
            window.removeEventListener('pointerup', handleMouseUp);
        };
    }, [textDragState, saveToHistory, setTextObjects]);

    // Handle shape dragging/resizing
    useEffect(() => {
        if (!shapeDragState) return;

        const handleMouseMove = (e) => {
            const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            const dx = clientX - shapeDragState.startX;
            const dy = clientY - shapeDragState.startY;
            const startObj = shapeDragState.startObj;

            const canvasEl = canvasRef.current;
            const rect = canvasEl ? canvasEl.getBoundingClientRect() : { width: 1, height: 1 };
            const scaleX = (canvasEl && rect.width > 0) ? (canvasEl.width / rect.width) : 1;
            const scaleY = (canvasEl && rect.height > 0) ? (canvasEl.height / rect.height) : 1;
            const canvasDx = dx * scaleX;
            const canvasDy = dy * scaleY;

            if (shapeDragState.action === 'move') {
                const deltaX = (clientX - (shapeDragState.lastX || shapeDragState.startX)) * scaleX;
                const deltaY = (clientY - (shapeDragState.lastY || shapeDragState.startY)) * scaleY;
                shapeDragState.lastX = clientX;
                shapeDragState.lastY = clientY;

                if (startObj.groupId) {
                    moveGroup(startObj.groupId, deltaX, deltaY);
                } else {
                    if (shapeDragState.startObjs && shapeDragState.startObjs.length > 0) {
                        setShapeObjects(prev => prev.map(shp => {
                            const sObj = shapeDragState.startObjs.find(s => s.id === shp.id);
                            return sObj ? { ...shp, x: sObj.x + canvasDx, y: sObj.y + canvasDy } : shp;
                        }));
                        if (shapeDragState.startTextObjs && shapeDragState.startTextObjs.length > 0) {
                            setTextObjects(prev => prev.map(txt => {
                                const tObj = shapeDragState.startTextObjs.find(t => t.id === txt.id);
                                return tObj ? { ...txt, x: tObj.x + canvasDx, y: tObj.y + canvasDy } : txt;
                            }));
                        }
                        if (shapeDragState.startImageObjs && shapeDragState.startImageObjs.length > 0) {
                            setImageObjects(prev => prev.map(img => {
                                const iObj = shapeDragState.startImageObjs.find(i => i.id === img.id);
                                return iObj ? { ...img, x: iObj.x + canvasDx, y: iObj.y + canvasDy } : img;
                            }));
                        }
                    } else {
                        setShapeObjects(prev => prev.map(shp =>
                            shp.id === shapeDragState.id
                                ? { ...shp, x: startObj.x + canvasDx, y: startObj.y + canvasDy }
                                : shp
                        ));
                    }
                }
            } else if (shapeDragState.action === 'line-endpoint-start' || shapeDragState.action === 'line-endpoint-end') {
                // Center of startObj in canvas coordinates
                const cx = startObj.x + startObj.width / 2;
                const cy = startObj.y + startObj.height / 2;
                const rot = (startObj.rotation || 0) * (Math.PI / 180);

                const unrotSx = (startObj.startX !== undefined ? startObj.startX : (startObj.width < 0 ? Math.abs(startObj.width) : 0)) - startObj.width / 2;
                const unrotSy = (startObj.startY !== undefined ? startObj.startY : (startObj.height < 0 ? Math.abs(startObj.height) : 0)) - startObj.height / 2;
                const canvasSx = cx + unrotSx * Math.cos(rot) - unrotSy * Math.sin(rot);
                const canvasSy = cy + unrotSx * Math.sin(rot) + unrotSy * Math.cos(rot);

                const unrotEx = (startObj.endX !== undefined ? startObj.endX : (startObj.width < 0 ? 0 : (startObj.width || 0))) - startObj.width / 2;
                const unrotEy = (startObj.endY !== undefined ? startObj.endY : (startObj.height < 0 ? 0 : (startObj.height || 0))) - startObj.height / 2;
                const canvasEx = cx + unrotEx * Math.cos(rot) - unrotEy * Math.sin(rot);
                const canvasEy = cy + unrotEx * Math.sin(rot) + unrotEy * Math.cos(rot);

                let newSx = canvasSx;
                let newSy = canvasSy;
                let newEx = canvasEx;
                let newEy = canvasEy;

                if (shapeDragState.action === 'line-endpoint-start') {
                    newSx = canvasSx + canvasDx;
                    newSy = canvasSy + canvasDy;
                } else {
                    newEx = canvasEx + canvasDx;
                    newEy = canvasEy + canvasDy;
                }

                const minX = Math.min(newSx, newEx);
                const minY = Math.min(newSy, newEy);
                const w = Math.max(Math.abs(newEx - newSx), 1);
                const h = Math.max(Math.abs(newEy - newSy), 1);

                setShapeObjects(prev => prev.map(shp =>
                    shp.id === shapeDragState.id
                        ? {
                            ...shp,
                            x: minX,
                            y: minY,
                            width: w,
                            height: h,
                            startX: newSx - minX,
                            startY: newSy - minY,
                            endX: newEx - minX,
                            endY: newEy - minY,
                            rotation: 0
                        }
                        : shp
                ));
            } else if (shapeDragState.action === 'rotate') {
                if (!canvasEl) return;
                const scaleToScreenX = (canvasEl && canvasEl.width > 0) ? rect.width / canvasEl.width : 1;
                const scaleToScreenY = (canvasEl && canvasEl.height > 0) ? rect.height / canvasEl.height : 1;
                const centerX = startObj.x + startObj.width / 2;
                const centerY = startObj.y + startObj.height / 2;
                const canvasCenterX = rect.left + centerX * scaleToScreenX;
                const canvasCenterY = rect.top + centerY * scaleToScreenY;

                const startAngle = Math.atan2(shapeDragState.startY - canvasCenterY, shapeDragState.startX - canvasCenterX);
                const currentAngle = Math.atan2(clientY - canvasCenterY, clientX - canvasCenterX);
                const angleDiff = (currentAngle - startAngle) * (180 / Math.PI);
                const newRotation = snapRotationAngle((startObj.rotation || 0) + angleDiff);

                setShapeObjects(prev => prev.map(shp =>
                    shp.id === shapeDragState.id
                        ? { ...shp, rotation: newRotation }
                        : shp
                ));
            } else if (shapeDragState.action.startsWith('resize-')) {
                const handle = shapeDragState.action.replace('resize-', '');
                let newX = startObj.x, newY = startObj.y;
                let newWidth = startObj.width, newHeight = startObj.height;
                const minSize = 20;

                if (handle.includes('e')) {
                    newWidth = Math.max(minSize, startObj.width + canvasDx);
                }
                if (handle.includes('w')) {
                    const widthChange = Math.min(canvasDx, startObj.width - minSize);
                    newX = startObj.x + widthChange;
                    newWidth = startObj.width - widthChange;
                }
                if (handle.includes('s')) {
                    newHeight = Math.max(minSize, startObj.height + canvasDy);
                }
                if (handle.includes('n')) {
                    const heightChange = Math.min(canvasDy, startObj.height - minSize);
                    newY = startObj.y + heightChange;
                    newHeight = startObj.height - heightChange;
                }

                if ((e.shiftKey || isShiftDown) && (startObj.type === 'circle' || handle.length === 2)) {
                    const size = Math.max(newWidth, newHeight);
                    if (handle.includes('w')) newX = startObj.x + (startObj.width - size);
                    if (handle.includes('n')) newY = startObj.y + (startObj.height - size);
                    newWidth = size;
                    newHeight = size;
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
        window.addEventListener('touchmove', handleMouseMove, { passive: false });
        window.addEventListener('touchend', handleMouseUp);
        window.addEventListener('pointermove', handleMouseMove);
        window.addEventListener('pointerup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
            window.removeEventListener('pointermove', handleMouseMove);
            window.removeEventListener('pointerup', handleMouseUp);
        };
    }, [shapeDragState, saveToHistory, setShapeObjects]);

    // ─── Drag-to-Connect Engine from Shape Magnetic Hooks ─────────────
    const startConnectorDrag = useCallback((shape, anchor, styleOption, e) => {
        if (!canUserDraw) return;
        e.stopPropagation();
        e.preventDefault();
        const sourcePt = getAnchorPoint(shape, anchor);
        
        let resolvedStyle = styleOption;
        if (!resolvedStyle) {
            resolvedStyle = activeConnectorPreset;
            if (!resolvedStyle) {
                if (lineType === 'connector_elbow') {
                    resolvedStyle = CONNECTOR_PRESET_STYLES.find(p => p.pathType === 'orthogonal') || CONNECTOR_PRESET_STYLES[2];
                } else if (lineType === 'connector_straight') {
                    resolvedStyle = CONNECTOR_PRESET_STYLES.find(p => p.pathType === 'straight') || CONNECTOR_PRESET_STYLES[1];
                } else {
                    resolvedStyle = CONNECTOR_PRESET_STYLES[0]; // curved_arrow (default)
                }
            }
        }
        
        setActiveConnectorDrag({
            sourceId: shape.id,
            sourceAnchor: anchor,
            sourcePt,
            currentPt: sourcePt,
            style: resolvedStyle,
            snappedTarget: null
        });
        setHoveredHook(null);
    }, [canUserDraw, lineType, activeConnectorPreset]);

    useEffect(() => {
        if (!activeConnectorDrag) return;

        const handlePointerMove = (e) => {
            const canvasEl = canvasRef.current;
            if (!canvasEl) return;
            const rect = canvasEl.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const scaleX = canvasEl.width / rect.width;
            const scaleY = canvasEl.height / rect.height;
            const currentMousePt = {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };

            // Find nearest hook on any OTHER shape or image
            const eligibleConnectables = [
                ...shapeObjects.filter(s => 
                    s.id !== activeConnectorDrag.sourceId && 
                    !['line', 'arrow', 'double_arrow', 'dashed_line', 'connector', 'ruler', 'protractor'].includes(s.type)
                ),
                ...imageObjects.filter(img => img.id !== activeConnectorDrag.sourceId)
            ];

            let snapTarget = null;
            let minDist = 35; // 35px snap distance
            eligibleConnectables.forEach(targetObj => {
                ['top', 'right', 'bottom', 'left', 'center'].forEach(anchor => {
                    const pt = getAnchorPoint(targetObj, anchor);
                    const dist = Math.hypot(pt.x - currentMousePt.x, pt.y - currentMousePt.y);
                    if (dist < minDist) {
                        minDist = dist;
                        snapTarget = { shape: targetObj, anchor, pt };
                    }
                });
            });

            setActiveConnectorDrag(prev => prev ? {
                ...prev,
                currentPt: snapTarget ? snapTarget.pt : currentMousePt,
                snappedTarget: snapTarget
            } : null);
        };

        const handlePointerUp = (e) => {
            if (!activeConnectorDrag) return;
            const isShift = !!(e?.shiftKey || isShiftDown);

            if (activeConnectorDrag.snappedTarget) {
                // Connected successfully to another shape's hook!
                const targetShape = activeConnectorDrag.snappedTarget.shape;
                const targetAnchor = activeConnectorDrag.snappedTarget.anchor;

                const newConn = {
                    id: Date.now().toString(),
                    type: 'connector',
                    sourceId: activeConnectorDrag.sourceId,
                    sourceAnchor: activeConnectorDrag.sourceAnchor,
                    sourcePoint: activeConnectorDrag.sourcePt,
                    targetId: targetShape.id,
                    targetAnchor: targetAnchor,
                    targetPoint: activeConnectorDrag.snappedTarget.pt,
                    pathType: isShift ? 'straight' : activeConnectorDrag.style.pathType,
                    strokeStyle: activeConnectorDrag.style.strokeStyle,
                    arrowEnd: activeConnectorDrag.style.arrowEnd,
                    arrowStart: activeConnectorDrag.style.arrowStart,
                    color: color || '#2563eb',
                    strokeWidth: strokeWidth || 2,
                    waypoint: null
                };

                setShapeObjects(prev => [...prev, newConn]);
                if (socket && sessionId) socket.emit('whiteboard:shape-add', { sessionId, shape: newConn });
                saveToHistory();
                justCreatedShapeRef.current = true;
                setSelectedShapeIds([newConn.id]);
                setSelectedTextIds([]);
                setSelectedImageId(null);
                setSelected3DId(null);
                setSelectedMediaId(null);
                toast.success('Connected elements!', { icon: '🔗' });
            }
            // If released in blank space, clean cancel! No connector created.
            setActiveConnectorDrag(null);
            setHoveredHook(null);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [activeConnectorDrag, shapeObjects, imageObjects, color, strokeWidth, socket, sessionId, saveToHistory, setShapeObjects, isShiftDown]);

    // Click on canvas to deselect images, text, shapes, 3D and media objects
    const handleCanvasClick = useCallback(() => {
        if (justCreatedShapeRef.current) {
            justCreatedShapeRef.current = false;
            return;
        }
        if (wasDraggingRef.current) {
            wasDraggingRef.current = false;
            return;
        }
        document.activeElement?.blur?.();
        setSelectedImageId(null);
        setSelectedImageIds([]);
        setSelectedTextIds([]);
        setEditingTextId(null);
        setSelectedShapeIds([]);
        setEditingShapeTextId(null);
        setSelection(null);
        setSelected3DId(null);
        setSelectedMediaId(null);
    }, []);

    // Get position from event (works for pointer, touch, and mouse)
    const getPosition = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return { x: 0, y: 0 };

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX = e.clientX;
        let clientY = e.clientY;

        // Fallback for touch events if clientX is not directly on event
        if ((clientX === undefined || clientY === undefined) && e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
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
                socketId: socket.id,
                userName,
                userIdentifier,
                ...eventData
            });
        }
    }, [socket, sessionId, userName, userIdentifier]);

    // Broadcast granular live action for any whiteboard interaction
    const broadcastAction = useCallback((actionDescription, x = 0, y = 0) => {
        if (socket && sessionId) {
            socket.emit('whiteboard:action', {
                sessionId,
                socketId: socket.id,
                userName,
                userIdentifier,
                action: actionDescription,
                x,
                y,
                timestamp: Date.now()
            });
        }
    }, [socket, sessionId, userName, userIdentifier]);

    // Clean up stale cursors and live action notices
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setRemoteCursors(prev => {
                let changed = false;
                const next = { ...prev };
                for (const id in next) {
                    if (now - next[id].timestamp > 3000) {
                        delete next[id];
                        changed = true;
                    }
                }
                return changed ? next : prev;
            });
            setRecentLiveActions(prev => prev.filter(act => now - act.timestamp < 4000));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    
    const snapToGuides = useCallback((pos, shapes, currentStrokeWidth = 0) => {
        const snapDistance = 20;
        const offset = currentStrokeWidth / 2;
        for (const shp of shapes) {
            if (shp.type !== 'ruler' && shp.type !== 'protractor') continue;
            
            const cx = shp.x + shp.width / 2;
            const cy = shp.y + shp.height / 2;
            const rot = (shp.rotation || 0) * Math.PI / 180;
            
            // Global to local
            const dx = pos.x - cx;
            const dy = pos.y - cy;
            let localX = dx * Math.cos(-rot) - dy * Math.sin(-rot) + shp.width / 2;
            let localY = dx * Math.sin(-rot) + dy * Math.cos(-rot) + shp.height / 2;
            
            let snapped = false;
            if (shp.type === 'ruler') {
                if (localX >= -snapDistance && localX <= shp.width + snapDistance) {
                    if (Math.abs(localY) < snapDistance) {
                        localY = -offset; snapped = true;
                    } else if (Math.abs(localY - shp.height) < snapDistance) {
                        localY = shp.height + offset; snapped = true;
                    }
                }
            } else if (shp.type === 'protractor') {
                const pcx = shp.width / 2;
                const pcy = shp.height / 2;
                const r = Math.min(shp.width, shp.height) / 2;
                const pdx = localX - pcx;
                const pdy = localY - pcy;
                const dist = Math.sqrt(pdx * pdx + pdy * pdy);
                
                // Snap to curve (upper half)
                if (Math.abs(dist - r) < snapDistance && pdy <= snapDistance) {
                    const clampedPdy = Math.min(0, pdy);
                    const angle = Math.atan2(clampedPdy, pdx);
                    localX = pcx + (r + offset) * Math.cos(angle);
                    localY = pcy + (r + offset) * Math.sin(angle);
                    snapped = true;
                } 
                // Snap to straight bottom edge
                else if (Math.abs(pdy) < snapDistance && pdx >= -r - snapDistance && pdx <= r + snapDistance) {
                    localY = pcy + offset;
                    snapped = true;
                }
            }
            
            if (snapped) {
                // Local to global
                const ndx = localX - shp.width / 2;
                const ndy = localY - shp.height / 2;
                return {
                    x: cx + ndx * Math.cos(rot) - ndy * Math.sin(rot),
                    y: cy + ndx * Math.sin(rot) + ndy * Math.cos(rot)
                };
            }
        }
        return pos;
    }, []);

    const startDrawing = useCallback((e) => {
        if (!canUserDraw) return;
        e.preventDefault();
        let pos = getPosition(e);
        if (tool === 'pen' || tool === 'highlighter' || tool === 'line' || tool === 'arrow') {
            const currentSw = tool === 'highlighter' ? strokeWidth * 4 : strokeWidth;
            pos = snapToGuides(pos, shapeObjects, currentSw);
        }

        // If text input is open and they click outside, let the blur event commit it.
        // Don't start a new drawing/text action.
        if (showTextInput) {
            return;
        }

        // Handle fill bucket tool
        if (tool === 'fill') {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                floodFill(ctx, Math.round(pos.x), Math.round(pos.y), color, 32);
                saveToHistory();
                emitDrawEvent({ type: 'fill', x: pos.x, y: pos.y, color });
                toast.success('Area filled!', { icon: '🎨' });
            }
            return;
        }

        // Handle eyedropper color picker tool
        if (tool === 'eyedropper') {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                const sampled = sampleColor(ctx, Math.round(pos.x), Math.round(pos.y));
                if (sampled) {
                    setColor(sampled);
                    toast.success(`Color picked: ${sampled}`, { icon: '✒️' });
                    setTool('pen');
                }
            }
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
            document.activeElement?.blur?.();
            setSelection(null); // Clear previous selection
            setSelectedShapeIds([]);
            setSelectedTextIds([]);
            setSelectedImageId(null);
            setSelectedImageIds([]);
            setSelected3DId(null);
            setSelectedMediaId(null);
            setEditingTextId(null);
            setEditingShapeTextId(null);
            if (selectMode === 'lasso') {
                setLassoPath([{ x: pos.x, y: pos.y }]);
            }
        } else {
            setSelected3DId(null);
            setSelectedMediaId(null);
        }

        setIsDrawing(true);
        setStartPos(pos);
        setCurrentPos(pos);
        lastPointRef.current = pos;

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

            // Emit start event with action description
            const currentAction = tool === 'eraser' ? 'erasing' : (tool === 'highlighter' ? 'highlighting' : (tool === 'line' || tool === 'arrow' ? `drawing ${tool}` : 'drawing with pen'));
            broadcastAction(currentAction, pos.x, pos.y);
            emitDrawEvent({
                type: 'path',
                isStart: true,
                x: pos.x,
                y: pos.y,
                color: tool === 'eraser' ? 'eraser' : (tool === 'highlighter' ? highlighterColor : color),
                strokeWidth: tool === 'eraser' ? eraserSize : (tool === 'highlighter' ? strokeWidth * 4 : strokeWidth),
                isHighlighter: tool === 'highlighter',
                isEraser: tool === 'eraser',
                action: currentAction
            });
        }

        // Handle laser pointer
        if (tool === 'laser') {
            setLaserPos(pos);
            broadcastAction('pointing with laser', pos.x, pos.y);
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
    }, [getPosition, tool, color, strokeWidth, eraserSize, highlighterColor, emitDrawEvent, broadcastAction, isSharing, socket, sessionId, canUserDraw]);

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
        wasDraggingRef.current = true;
        e.preventDefault();

        let pos = getPosition(e);
        if (tool === 'pen' || tool === 'highlighter' || tool === 'line' || tool === 'arrow') {
            pos = snapToGuides(pos, shapeObjects);
        }

        // Filter sub-pixel jitter on tablet glass / digitizers
        if (lastPointRef.current && (tool === 'pen' || tool === 'eraser' || tool === 'highlighter')) {
            const dist = Math.hypot(pos.x - lastPointRef.current.x, pos.y - lastPointRef.current.y);
            if (dist < 1.0) {
                return; // Ignore sub-pixel vibration
            }
        }
        lastPointRef.current = pos;
        setCurrentPos(pos);

        if (tool === 'select') {
            if (selectMode === 'lasso') {
                setLassoPath(prev => [...prev, { x: pos.x, y: pos.y }]);
            } else {
                setSelection({
                    x: Math.min(startPos.x, pos.x),
                    y: Math.min(startPos.y, pos.y),
                    width: Math.abs(pos.x - startPos.x),
                    height: Math.abs(pos.y - startPos.y)
                });
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

            if (tool === 'pen' && (e.shiftKey || isShiftDown)) {
                let snapPos = pos;
                const dx = pos.x - pts[0].x;
                const dy = pos.y - pts[0].y;
                const angle = Math.atan2(dy, dx);
                const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
                const dist = Math.hypot(dx, dy);
                snapPos = {
                    x: pts[0].x + Math.cos(snapAngle) * dist,
                    y: pts[0].y + Math.sin(snapAngle) * dist
                };
                currentPathPointsRef.current = [pts[0], snapPos];
                if (preStrokeImageDataRef.current) {
                    ctx.putImageData(preStrokeImageDataRef.current, 0, 0);
                }
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = strokeWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.setLineDash(getDashArray(strokeStyle));
                ctx.globalCompositeOperation = 'source-over';
                ctx.moveTo(pts[0].x, pts[0].y);
                ctx.lineTo(snapPos.x, snapPos.y);
                ctx.stroke();
                wasDraggingRef.current = true;
                return;
            }
            
            const ptObj = {
                x: pos.x,
                y: pos.y,
                pressure: currentPressureRef.current || 0.5,
                timestamp: Date.now()
            };
            pts.push(ptObj);

            // If an advanced brush engine is active, render with realistic brush physics
            if (tool === 'pen' && brushType && brushType !== 'normal') {
                if (preStrokeImageDataRef.current) {
                    ctx.putImageData(preStrokeImageDataRef.current, 0, 0);
                }
                const brushOpts = { color, strokeWidth, opacity: 1 };
                if (brushType === 'calligraphy') {
                    renderCalligraphy(ctx, pts, brushOpts);
                } else if (brushType === 'crayon') {
                    renderCrayon(ctx, pts, brushOpts);
                } else if (brushType === 'watercolor') {
                    renderWatercolor(ctx, pts, brushOpts);
                } else if (brushType === 'fountain') {
                    renderFountainPen(ctx, pts, brushOpts);
                }
                emitDrawEvent({
                    type: 'path',
                    isStart: false,
                    x: pos.x,
                    y: pos.y,
                    color: color,
                    strokeWidth: strokeWidth,
                    brushType: brushType
                });
                return;
            }

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
                
                const eraserRadius = eraserSize / 2;
                const eraserX = pos.x;
                const eraserY = pos.y;
                
                setShapeObjects(prev => prev.filter(shape => {
                    // Check if eraser circle overlaps with shape bounding box
                    const closestX = Math.max(shape.x, Math.min(eraserX, shape.x + shape.width));
                    const closestY = Math.max(shape.y, Math.min(eraserY, shape.y + shape.height));
                    const distX = eraserX - closestX;
                    const distY = eraserY - closestY;
                    const distSq = distX * distX + distY * distY;
                    const intersects = distSq <= eraserRadius * eraserRadius;
                    
                    if (intersects && socket && sessionId) {
                        socket.emit('whiteboard:shape-delete', { sessionId, shapeId: shape.id });
                    }
                    return !intersects;
                }));
                
                // Also remove text objects under eraser
                setTextObjects(prev => prev.filter(txt => {
                    const closestX = Math.max(txt.x, Math.min(eraserX, txt.x + txt.width));
                    const closestY = Math.max(txt.y, Math.min(eraserY, txt.y + txt.height));
                    const distX = eraserX - closestX;
                    const distY = eraserY - closestY;
                    const distSq = distX * distX + distY * distY;
                    return distSq > eraserRadius * eraserRadius;
                }));
                
                // Also remove image objects under eraser
                setImageObjects(prev => prev.filter(img => {
                    const closestX = Math.max(img.x, Math.min(eraserX, img.x + img.width));
                    const closestY = Math.max(img.y, Math.min(eraserY, img.y + img.height));
                    const distX = eraserX - closestX;
                    const distY = eraserY - closestY;
                    const distSq = distX * distX + distY * distY;
                    return distSq > eraserRadius * eraserRadius;
                }));
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
            const isShift = !!(e.shiftKey || isShiftDown);
            let targetPos = pos;
            if (isShift) {
                const dx = pos.x - startPos.x;
                const dy = pos.y - startPos.y;
                const angle = Math.atan2(dy, dx);
                const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
                const dist = Math.hypot(dx, dy);
                targetPos = {
                    x: startPos.x + Math.cos(snapAngle) * dist,
                    y: startPos.y + Math.sin(snapAngle) * dist
                };
            }
            setCurrentPos(targetPos);

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
                ctx.lineTo(targetPos.x, targetPos.y);
                ctx.stroke();
                ctx.setLineDash([]);
            } else { // arrow
                ctx.strokeStyle = color;
                ctx.lineWidth = strokeWidth;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(startPos.x, startPos.y);
                ctx.lineTo(targetPos.x, targetPos.y);
                ctx.stroke();

                const headLength = strokeWidth * 4;
                const angle = Math.atan2(targetPos.y - startPos.y, targetPos.x - startPos.x);
                ctx.beginPath();
                ctx.moveTo(targetPos.x, targetPos.y);
                ctx.lineTo(targetPos.x - headLength * Math.cos(angle - Math.PI / 6), targetPos.y - headLength * Math.sin(angle - Math.PI / 6));
                ctx.lineTo(targetPos.x - headLength * Math.cos(angle + Math.PI / 6), targetPos.y - headLength * Math.sin(angle + Math.PI / 6));
                ctx.closePath();
                ctx.fillStyle = color;
                ctx.fill();
            }
        } else if (tool === 'shape') {
            const isShift = !!(e.shiftKey || isShiftDown);
            let w = Math.abs(pos.x - startPos.x);
            let h = Math.abs(pos.y - startPos.y);
            let x = Math.min(startPos.x, pos.x);
            let y = Math.min(startPos.y, pos.y);

            if (shapeType === 'circle' && isShift) {
                const size = Math.max(w, h);
                w = size;
                h = size;
                x = pos.x < startPos.x ? startPos.x - size : startPos.x;
                y = pos.y < startPos.y ? startPos.y - size : startPos.y;
            }

            setShapePreview({
                x,
                y,
                width: w,
                height: h,
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

        if (tool === 'pen' || tool === 'highlighter') {
            const pts = currentPathPointsRef.current;
            if (preStrokeImageDataRef.current) {
                ctx.putImageData(preStrokeImageDataRef.current, 0, 0);
            }
            
            let shapeCreated = false;

            if (tool === 'pen' && isAutoShape && pts && pts.length >= 8) {
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
                        const newShapeObj = {
                            id: Date.now().toString(),
                            type: 'circle',
                            x: minX, y: minY, width: w, height: h,
                            rotation: 0,
                            color: color,
                            strokeWidth: strokeWidth,
                            text: '',
                            fontSize: 20,
                    stepSize: shapeType === 'graph' ? 5 : undefined
                };
                setShapeObjects(prev => [...prev, newShapeObj]);
                        if (socket && sessionId) socket.emit('whiteboard:shape-add', { sessionId, shape: newShapeObj });
                        shapeCreated = true;
                    }
                    // 2. Rectangle / Square: Area fill > 0.68 of bounding box
                    else if (polygonArea / (w * h) > 0.68) {
                        const newShapeObj = {
                            id: Date.now().toString(),
                            type: 'rectangle',
                            x: minX, y: minY, width: w, height: h,
                            rotation: 0,
                            color: color,
                            strokeWidth: strokeWidth,
                            text: '',
                            fontSize: 20
                        };
                        setShapeObjects(prev => [...prev, newShapeObj]);
                        if (socket && sessionId) socket.emit('whiteboard:shape-add', { sessionId, shape: newShapeObj });
                        shapeCreated = true;
                    }
                    // 3. Triangle
                    else if (polygonArea / (w * h) >= 0.28 && polygonArea / (w * h) <= 0.65) {
                        const newShapeObj = {
                            id: Date.now().toString(),
                            type: 'triangle',
                            x: minX, y: minY, width: w, height: h,
                            rotation: 0,
                            color: color,
                            strokeWidth: strokeWidth,
                            text: '',
                            fontSize: 20
                        };
                        setShapeObjects(prev => [...prev, newShapeObj]);
                        if (socket && sessionId) socket.emit('whiteboard:shape-add', { sessionId, shape: newShapeObj });
                        shapeCreated = true;
                    }
                } else if (!isClosed && pathLength > 40) {
                    const straightDist = Math.hypot(pStart.x - pEnd.x, pStart.y - pEnd.y);
                    const straightness = straightDist / pathLength;

                    // 4. Straight Line
                    if (straightness > 0.88) {
                        // Creating a path for a straight line
                        const newShapeObj = {
                            id: Date.now().toString(),
                            type: 'path',
                            x: Math.min(pStart.x, pEnd.x),
                            y: Math.min(pStart.y, pEnd.y),
                            width: Math.abs(pStart.x - pEnd.x),
                            height: Math.abs(pStart.y - pEnd.y),
                            originalWidth: Math.abs(pStart.x - pEnd.x),
                            originalHeight: Math.abs(pStart.y - pEnd.y),
                            points: [
                                { x: pStart.x - Math.min(pStart.x, pEnd.x), y: pStart.y - Math.min(pStart.y, pEnd.y) },
                                { x: pEnd.x - Math.min(pStart.x, pEnd.x), y: pEnd.y - Math.min(pStart.y, pEnd.y) }
                            ],
                            rotation: 0,
                            color: color,
                            strokeWidth: strokeWidth,
                            smooth: false,
                            isHighlighter: false
                        };
                        setShapeObjects(prev => [...prev, newShapeObj]);
                        if (socket && sessionId) socket.emit('whiteboard:shape-add', { sessionId, shape: newShapeObj });
                        shapeCreated = true;
                    }
                }
            }
            
            if (!shapeCreated && pts && pts.length > 1) {
                // Not an auto shape, save as freehand path
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                pts.forEach(p => {
                    if (p.x < minX) minX = p.x;
                    if (p.x > maxX) maxX = p.x;
                    if (p.y < minY) minY = p.y;
                    if (p.y > maxY) maxY = p.y;
                });
                
                // Relative points
                const relPoints = pts.map(p => ({
                    x: p.x - minX,
                    y: p.y - minY
                }));
                
                const newShapeObj = {
                    id: Date.now().toString(),
                    type: 'path',
                    x: minX,
                    y: minY,
                    width: maxX - minX,
                    height: maxY - minY,
                    originalWidth: maxX - minX,
                    originalHeight: maxY - minY,
                    points: relPoints,
                    rotation: 0,
                    color: tool === 'highlighter' ? highlighterColor : color,
                    strokeWidth: tool === 'highlighter' ? strokeWidth * 4 : strokeWidth,
                    smooth: true,
                    isHighlighter: tool === 'highlighter',
                    brushType: (tool === 'pen' ? brushType : 'normal') || 'normal'
                };
                setShapeObjects(prev => [...prev, newShapeObj]);
                if (socket && sessionId) socket.emit('whiteboard:shape-add', { sessionId, shape: newShapeObj });
            }
        } else if (tool === 'eraser') {
            // Eraser already modified the canvas directly during handleMouseMove.
        } else if (tool === 'line') {
            if (preStrokeImageDataRef.current) {
                ctx.putImageData(preStrokeImageDataRef.current, 0, 0);
            }
            
            const isShift = !!(e?.shiftKey || isShiftDown);
            let finalPosX = pos.x;
            let finalPosY = pos.y;
            if (isShift) {
                const dx = pos.x - startPos.x;
                const dy = pos.y - startPos.y;
                const angle = Math.atan2(dy, dx);
                const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
                const dist = Math.hypot(dx, dy);
                finalPosX = startPos.x + Math.cos(snapAngle) * dist;
                finalPosY = startPos.y + Math.sin(snapAngle) * dist;
            }
            const minX = Math.min(startPos.x, finalPosX);
            const minY = Math.min(startPos.y, finalPosY);
            const w = Math.abs(startPos.x - finalPosX) || 1;
            const h = Math.abs(startPos.y - finalPosY) || 1;

            if (lineType.startsWith('connector')) {
                const nonConnectorShapes = shapeObjects.filter(s => s.type !== 'connector' && !['ruler', 'protractor'].includes(s.type));
                const startSnap = findNearestShape(startPos, nonConnectorShapes, 50);
                const endSnap = findNearestShape(pos, nonConnectorShapes, 50);

                if (!startSnap || !endSnap || startSnap.shape.id === endSnap.shape.id) {
                    toast.error("Connectors must connect two distinct shapes. Please start and end on shape hooks.", { id: 'connector-must-snap' });
                    setTool('select');
                    return;
                }

                const connPathType = isShift ? 'straight' : (lineType === 'connector_elbow' ? 'orthogonal' : (lineType === 'connector_curved' ? 'curved' : 'straight'));

                const newShapeObj = {
                    id: Date.now().toString(),
                    type: 'connector',
                    sourceId: startSnap.shape.id,
                    sourceAnchor: startSnap.anchor || 'bottom',
                    sourcePoint: getAnchorPoint(startSnap.shape, startSnap.anchor),
                    targetId: endSnap.shape.id,
                    targetAnchor: endSnap.anchor || 'top',
                    targetPoint: getAnchorPoint(endSnap.shape, endSnap.anchor),
                    pathType: connPathType,
                    color: color,
                    strokeWidth: strokeWidth,
                    arrowEnd: 'arrow',
                    arrowStart: 'none',
                    waypoint: null
                };
                setShapeObjects(prev => [...prev, newShapeObj]);
                if (socket && sessionId) socket.emit('whiteboard:shape-add', { sessionId, shape: newShapeObj });
                saveToHistory();
                justCreatedShapeRef.current = true;
                setSelectedShapeIds([newShapeObj.id]);
                setSelectedTextIds([]);
                setSelectedImageId(null);
                setSelected3DId(null);
                setSelectedMediaId(null);
                setTool('select');
                toast.success('Connected shapes!', { icon: '🔗' });
            } else {
                const resolvedLineType = lineType === 'arrow' ? 'arrow' : (lineType === 'double_arrow' ? 'double_arrow' : (lineType === 'arc' ? 'arc' : (lineType === 'dashed' ? 'dashed_line' : 'line')));

                const newShapeObj = {
                    id: Date.now().toString(),
                    type: resolvedLineType,
                    x: minX,
                    y: minY,
                    width: w,
                    height: h,
                    originalWidth: w,
                    originalHeight: h,
                    startX: startPos.x - minX,
                    startY: startPos.y - minY,
                    endX: finalPosX - minX,
                    endY: finalPosY - minY,
                    rotation: 0,
                    color: color,
                    strokeWidth: strokeWidth
                };
                setShapeObjects(prev => [...prev, newShapeObj]);
                if (socket && sessionId) socket.emit('whiteboard:shape-add', { sessionId, shape: newShapeObj });
                justCreatedShapeRef.current = true;
                setSelectedShapeIds([newShapeObj.id]);
                setSelectedTextIds([]);
                setSelectedImageId(null);
                setSelected3DId(null);
                setSelectedMediaId(null);
                setTool('select');
            }
        } else if (tool === 'shape') {
            setShapePreview(null);
            const isShift = !!(e?.shiftKey || isShiftDown);
            let w = Math.abs(pos.x - startPos.x);
            let h = Math.abs(pos.y - startPos.y);
            let x = Math.min(startPos.x, pos.x);
            let y = Math.min(startPos.y, pos.y);

            if (shapeType === 'circle' && isShift) {
                const size = Math.max(w, h);
                w = size;
                h = size;
                x = pos.x < startPos.x ? startPos.x - size : startPos.x;
                y = pos.y < startPos.y ? startPos.y - size : startPos.y;
            }

            if (w > 5 || h > 5) {
                let finalW = w;
                let finalH = h;
                if (shapeType === 'ruler') {
                    finalW = Math.min(w, 20 * 38); // 20 units max
                    finalH = 60; // fixed height
                } else if (shapeType === 'protractor') {
                    finalW = 300; // fixed width
                    finalH = 300; // fixed height (width/height equal for radius calculation, but it's a semicircle)
                }
                const newShapeObj = {
                    id: Date.now().toString(),
                    type: shapeType,
                    x,
                    y,
                    width: finalW,
                    height: finalH,
                    rotation: 0,
                    color: color,
                    strokeWidth: strokeWidth,
                    text: '',
                    fontSize: 20
                };
                setShapeObjects(prev => [...prev, newShapeObj]);
                if (socket && sessionId) {
                    socket.emit('whiteboard:shape-add', { sessionId, shape: newShapeObj });
                }
                justCreatedShapeRef.current = true;
                setSelectedShapeIds([newShapeObj.id]);
                setSelectedTextIds([]);
                setSelectedImageId(null);
                setSelected3DId(null);
                setSelectedMediaId(null);
                setTool('select');
            }
        } else if (tool === 'laser') {
            setLaserPos(null);
            if (laserTimeoutRef.current) clearTimeout(laserTimeoutRef.current);
            if (socket && sessionId) {
                socket.emit('whiteboard:laser-update', {
                    sessionId,
                    laserPos: null
                });
            }
        
        
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
                        let selectedShapes = shapeObjects.filter(shape => 
                            !shape.isLocked &&
                            shape.x < minX + selWidth && 
                            shape.x + shape.width > minX && 
                            shape.y < minY + selHeight && 
                            shape.y + shape.height > minY
                        ).map(s => s.id);
                        
                        let selectedTexts = textObjects.filter(txt => 
                            !txt.isLocked &&
                            txt.x < minX + selWidth && 
                            txt.x + txt.width > minX && 
                            txt.y < minY + selHeight && 
                            txt.y + txt.height > minY
                        ).map(s => s.id);

                        let selectedImages = imageObjects.filter(img => 
                            !img.isLocked &&
                            img.x < minX + selWidth && 
                            img.x + img.width > minX && 
                            img.y < minY + selHeight && 
                            img.y + img.height > minY
                        ).map(s => s.id);

                        const groupIdsToSelect = new Set([
                            ...shapeObjects.filter(s => selectedShapes.includes(s.id) && s.groupId).map(s => s.groupId),
                            ...textObjects.filter(s => selectedTexts.includes(s.id) && s.groupId).map(s => s.groupId),
                            ...imageObjects.filter(s => selectedImages.includes(s.id) && s.groupId).map(s => s.groupId)
                        ]);

                        if (groupIdsToSelect.size > 0) {
                            const groupShapeIds = shapeObjects.filter(s => groupIdsToSelect.has(s.groupId)).map(s => s.groupId);
                            const groupTextIds = textObjects.filter(s => groupIdsToSelect.has(s.groupId)).map(s => s.groupId);
                            const groupImageIds = imageObjects.filter(s => groupIdsToSelect.has(s.groupId)).map(s => s.groupId);
                            selectedShapes = Array.from(new Set([...selectedShapes, ...groupShapeIds]));
                            selectedTexts = Array.from(new Set([...selectedTexts, ...groupTextIds]));
                            selectedImages = Array.from(new Set([...selectedImages, ...groupImageIds]));
                        }

                        if (selectedShapes.length > 0 || selectedTexts.length > 0 || selectedImages.length > 0) {
                            setSelectedShapeIds(selectedShapes);
                            setSelectedTextIds(selectedTexts);
                            setSelectedImageIds(selectedImages);
                            setSelection(null);
                        } else if (selWidth > 15 && selHeight > 15) {
                            setSelectedShapeIds([]);
                            setSelectedTextIds([]);
                            setSelectedImageIds([]);
                            setSelection(null);
                        } else {
                            setSelectedShapeIds([]);
                            setSelectedTextIds([]);
                            setSelectedImageIds([]);
                            setSelection(null);
                            setEditingTextId(null);
                        }
                    } else {
                        setSelectedShapeIds([]);
                        setSelectedTextIds([]);
                        setSelectedImageIds([]);
                        setSelection(null);
                        setEditingTextId(null);
                    }
                } else {
                    setSelectedShapeIds([]);
                    setSelectedTextIds([]);
                    setSelectedImageIds([]);
                    setSelection(null);
                    setEditingTextId(null);
                }
                setLassoPath([]);
            } else {
                const x = Math.min(startPos.x, pos.x);
                const y = Math.min(startPos.y, pos.y);
                const selWidth = Math.abs(pos.x - startPos.x);
                const selHeight = Math.abs(pos.y - startPos.y);

                if (selWidth > 5 && selHeight > 5) {
                    let selectedShapes = shapeObjects.filter(shape => 
                        !shape.isLocked &&
                        shape.x < x + selWidth && 
                        shape.x + shape.width > x && 
                        shape.y < y + selHeight && 
                        shape.y + shape.height > y
                    ).map(s => s.id);

                    let selectedTexts = textObjects.filter(txt => 
                        !txt.isLocked &&
                        txt.x < x + selWidth && 
                        txt.x + txt.width > x && 
                        txt.y < y + selHeight && 
                        txt.y + txt.height > y
                    ).map(s => s.id);

                    let selectedImages = imageObjects.filter(img => 
                        !img.isLocked &&
                        img.x < x + selWidth && 
                        img.x + img.width > x && 
                        img.y < y + selHeight && 
                        img.y + img.height > y
                    ).map(s => s.id);

                    const groupIdsToSelect = new Set([
                        ...shapeObjects.filter(s => selectedShapes.includes(s.id) && s.groupId).map(s => s.groupId),
                        ...textObjects.filter(s => selectedTexts.includes(s.id) && s.groupId).map(s => s.groupId),
                        ...imageObjects.filter(s => selectedImages.includes(s.id) && s.groupId).map(s => s.groupId)
                    ]);

                    if (groupIdsToSelect.size > 0) {
                        const groupShapeIds = shapeObjects.filter(s => groupIdsToSelect.has(s.groupId)).map(s => s.groupId);
                        const groupTextIds = textObjects.filter(s => groupIdsToSelect.has(s.groupId)).map(s => s.groupId);
                        const groupImageIds = imageObjects.filter(s => groupIdsToSelect.has(s.groupId)).map(s => s.groupId);
                        selectedShapes = Array.from(new Set([...selectedShapes, ...groupShapeIds]));
                        selectedTexts = Array.from(new Set([...selectedTexts, ...groupTextIds]));
                        selectedImages = Array.from(new Set([...selectedImages, ...groupImageIds]));
                    }

                    if (selectedShapes.length > 0 || selectedTexts.length > 0 || selectedImages.length > 0) {
                        setSelectedShapeIds(selectedShapes);
                        setSelectedTextIds(selectedTexts);
                        setSelectedImageIds(selectedImages);
                        setSelection(null);
                    } else if (selWidth > 15 && selHeight > 15) {
                        setSelectedShapeIds([]);
                        setSelectedTextIds([]);
                        setSelectedImageIds([]);
                        setSelected3DId(null);
                        setSelectedMediaId(null);
                        setSelection(null);
                    } else {
                        setSelectedShapeIds([]);
                        setSelectedTextIds([]);
                        setSelectedImageIds([]);
                        setSelected3DId(null);
                        setSelectedMediaId(null);
                        setSelection(null);
                        setEditingTextId(null);
                    }
                } else {
                    // Click on empty space: deselect everything
                    setSelectedShapeIds([]);
                    setSelectedTextIds([]);
                    setSelectedImageIds([]);
                    setSelected3DId(null);
                    setSelectedMediaId(null);
                    setSelection(null);
                    setEditingTextId(null);
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
    }, [isDrawing, getPosition, tool, isAutoShape, color, strokeWidth, strokeStyle, eraserSize, highlighterColor, lineType, shapeType, saveToHistory, emitDrawEvent, setShapeObjects, shapeObjects, isSharing, socket, sessionId, startPos, currentPos]);

    // Dedicated pointer event handlers with Apple Pencil palm rejection & gesture stabilization
    const handlePointerDown = useCallback((e) => {
        if (!canUserDraw) return;
        
        // Ignore events on interactive canvas elements, controls, tools, overlays, media, 3D, and handles
        if (
            e.target?.closest?.(
                'button, input, textarea, select, video, audio, ' +
                '[data-interactive="true"], [data-handle], ' +
                '.whiteboard-media-player, .whiteboard-3d-object, ' +
                '.whiteboard-clipboard-panel, .whiteboard-minimap, ' +
                '.whiteboard-tasks-panel, .radial-toolbar-container, ' +
                '.radial-fab-button, .whiteboard-spotlight-overlay, ' +
                '.whiteboard-curtain-container, .connector-line-group, ' +
                '.shape-magnetic-hook, .whiteboard-shape-item, ' +
                '.whiteboard-text-item, .whiteboard-image-item, ' +
                '.sticky-note-card, .shape-format-bar, .text-format-bar, ' +
                '.image-format-bar, .connector-hover-popover'
            )
        ) {
            return;
        }

        // Prevent default touch scrolling / gesture recognition ONLY when drawing on canvas surface
        if (e.cancelable) {
            e.preventDefault();
        }

        // ─── Barrel Button / Stylus Long-Press → Open Radial Toolbar ───
        // Apple Pencil barrel button or right-click
        if (e.button === 5 || (e.pointerType === 'pen' && e.button === 2)) {
            const wrapper = canvasWrapperRef.current;
            if (wrapper) {
                const rect = wrapper.getBoundingClientRect();
                setRadialMenuPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                setShowRadialMenu(true);
            }
            return;
        }

        // Close radial menu on any normal pen/touch/mouse down
        if (showRadialMenu) {
            setShowRadialMenu(false);
        }

        // 1. Palm Rejection Logic
        if (e.pointerType === 'pen') {
            if (penReleaseTimeoutRef.current) {
                clearTimeout(penReleaseTimeoutRef.current);
                penReleaseTimeoutRef.current = null;
            }
            isPenActiveRef.current = true;
            activePointerIdRef.current = e.pointerId;
            activePointerTypeRef.current = 'pen';

            // Capture pressure for brush engine
            if (pressureSensitivity) {
                currentPressureRef.current = e.pressure || 0.5;
            }

            // Start long-press timer for radial toolbar (400ms)
            longPressStartPosRef.current = { x: e.clientX, y: e.clientY };
            longPressTimerRef.current = setTimeout(() => {
                const wrapper = canvasWrapperRef.current;
                if (wrapper) {
                    const rect = wrapper.getBoundingClientRect();
                    setRadialMenuPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    setShowRadialMenu(true);
                }
            }, 400);

            try {
                e.currentTarget?.setPointerCapture?.(e.pointerId);
            } catch (_) {}
        } else if (e.pointerType === 'touch') {
            // Drop touch event if Apple Pencil is currently writing (true palm rejection!)
            if (isPenActiveRef.current) {
                return;
            }
            // Drop secondary touch points (e.g. resting palm while drawing with finger)
            if (activePointerIdRef.current !== null) {
                return;
            }
            activePointerIdRef.current = e.pointerId;
            activePointerTypeRef.current = 'touch';
            try {
                e.currentTarget?.setPointerCapture?.(e.pointerId);
            } catch (_) {}
        } else if (e.pointerType === 'mouse') {
            if (e.button !== 0) return; // Left mouse button only
            activePointerIdRef.current = e.pointerId;
            activePointerTypeRef.current = 'mouse';
            try {
                e.currentTarget?.setPointerCapture?.(e.pointerId);
            } catch (_) {}
        }

        startDrawing(e);
    }, [canUserDraw, startDrawing, showRadialMenu, pressureSensitivity]);

    const handlePointerMove = useCallback((e) => {
        if (e.cancelable) {
            e.preventDefault();
        }

        // Cancel long-press timer if pen moved too far
        if (longPressTimerRef.current && longPressStartPosRef.current) {
            const dx = e.clientX - longPressStartPosRef.current.x;
            const dy = e.clientY - longPressStartPosRef.current.y;
            if (Math.hypot(dx, dy) > 5) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
        }

        // Track pressure for brush engine
        if (pressureSensitivity && e.pointerType === 'pen') {
            currentPressureRef.current = e.pressure || 0.5;
        }

        if (!isDrawing) return;

        // Reject non-active pointers (palm or secondary touch points)
        if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) {
            return;
        }
        if (isPenActiveRef.current && e.pointerType !== 'pen') {
            return;
        }

        draw(e);
    }, [isDrawing, draw, pressureSensitivity]);

    const handlePointerUp = useCallback((e) => {
        if (e.cancelable) {
            e.preventDefault();
        }
        if (activePointerIdRef.current !== null && e.pointerId === activePointerIdRef.current) {
            try {
                e.currentTarget?.releasePointerCapture?.(e.pointerId);
            } catch (_) {}
            stopDrawing(e);
            activePointerIdRef.current = null;
            if (activePointerTypeRef.current === 'pen') {
                // Keep isPenActiveRef true for 150ms to ignore trailing palm lift-off touch events
                penReleaseTimeoutRef.current = setTimeout(() => {
                    isPenActiveRef.current = false;
                }, 150);
            }
            activePointerTypeRef.current = null;
            lastPointRef.current = null;
        }
    }, [stopDrawing]);

    const handlePointerCancel = useCallback((e) => {
        if (e.cancelable) {
            e.preventDefault();
        }
        if (activePointerIdRef.current !== null && e.pointerId === activePointerIdRef.current) {
            try {
                e.currentTarget?.releasePointerCapture?.(e.pointerId);
            } catch (_) {}
            stopDrawing(e);
            activePointerIdRef.current = null;
            if (activePointerTypeRef.current === 'pen') {
                penReleaseTimeoutRef.current = setTimeout(() => {
                    isPenActiveRef.current = false;
                }, 150);
            }
            activePointerTypeRef.current = null;
            lastPointRef.current = null;
        }
    }, [stopDrawing]);

    const handlePointerLeave = useCallback((e) => {
        if (isDrawing && (!e.currentTarget?.hasPointerCapture || !e.currentTarget.hasPointerCapture(e.pointerId))) {
            handlePointerUp(e);
        }
    }, [isDrawing, handlePointerUp]);

    // Prevent iOS/browser rubber-band bounce on canvas touchmove without breaking touch/pencil clicks
    useEffect(() => {
        const wrapper = canvasWrapperRef.current;
        if (!wrapper) return;

        const handleTouchMove = (e) => {
            // Allow native touch interaction inside interactive UI, panels, modals, and controls
            if (
                e.target?.closest?.(
                    'button, input, textarea, select, video, audio, ' +
                    '[data-interactive="true"], [data-handle], ' +
                    '.whiteboard-media-player, .whiteboard-3d-object, ' +
                    '.whiteboard-clipboard-panel, .whiteboard-minimap, ' +
                    '.whiteboard-tasks-panel, .radial-toolbar-container, ' +
                    '.radial-fab-button, .whiteboard-spotlight-overlay, ' +
                    '.whiteboard-curtain-container, .connector-line-group, ' +
                    '.shape-magnetic-hook, .whiteboard-shape-item, ' +
                    '.whiteboard-text-item, .whiteboard-image-item, ' +
                    '.sticky-note-card, .shape-format-bar, .text-format-bar, ' +
                    '.image-format-bar, .connector-hover-popover'
                )
            ) {
                return;
            }
            if (e.cancelable) {
                e.preventDefault();
            }
        };

        wrapper.addEventListener('touchmove', handleTouchMove, { passive: false });

        return () => {
            wrapper.removeEventListener('touchmove', handleTouchMove);
        };
    }, []);

    // Screenshot - Composites all layers (background, canvas, images, text)
    const handleScreenshot = useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Create a composite canvas
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const ctx = exportCanvas.getContext('2d', { willReadFrequently: true });

        // 1. Draw background color & pattern with full resilience
        try {
            const currentBg = pageBackgrounds[currentPage] || { color: '#ffffff', pattern: 'plain' };
            const effectiveColor = currentBg.color || bgColor || '#ffffff';
            ctx.fillStyle = effectiveColor;
            ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

            const pattern = currentBg.pattern || bgPattern || 'plain';
            if (pattern && pattern !== 'plain' && pattern !== 'none') {
                ctx.save();
                ctx.strokeStyle = '#94a3b8';
                ctx.fillStyle = '#94a3b8';
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.25;

                if (pattern === 'grid') {
                    const step = 25;
                    for (let x = 0; x <= exportCanvas.width; x += step) {
                        ctx.beginPath();
                        ctx.moveTo(x, 0);
                        ctx.lineTo(x, exportCanvas.height);
                        ctx.stroke();
                    }
                    for (let y = 0; y <= exportCanvas.height; y += step) {
                        ctx.beginPath();
                        ctx.moveTo(0, y);
                        ctx.lineTo(exportCanvas.width, y);
                        ctx.stroke();
                    }
                } else if (pattern === 'dotted') {
                    const step = 20;
                    for (let x = 0; x <= exportCanvas.width; x += step) {
                        for (let y = 0; y <= exportCanvas.height; y += step) {
                            ctx.beginPath();
                            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                } else if (pattern === 'lined') {
                    const step = 25;
                    for (let y = 0; y <= exportCanvas.height; y += step) {
                        ctx.beginPath();
                        ctx.moveTo(0, y);
                        ctx.lineTo(exportCanvas.width, y);
                        ctx.stroke();
                    }
                } else if (pattern === 'graph') {
                    for (let x = 0; x <= exportCanvas.width; x += 20) {
                        ctx.beginPath();
                        ctx.lineWidth = x % 100 === 0 ? 1.5 : 0.5;
                        ctx.moveTo(x, 0);
                        ctx.lineTo(x, exportCanvas.height);
                        ctx.stroke();
                    }
                    for (let y = 0; y <= exportCanvas.height; y += 20) {
                        ctx.beginPath();
                        ctx.lineWidth = y % 100 === 0 ? 1.5 : 0.5;
                        ctx.moveTo(0, y);
                        ctx.lineTo(exportCanvas.width, y);
                        ctx.stroke();
                    }
                } else if (pattern === 'music') {
                    for (let y = 40; y <= exportCanvas.height; y += 80) {
                        for (let line = 0; line < 5; line++) {
                            const ly = y + line * 8;
                            ctx.beginPath();
                            ctx.moveTo(0, ly);
                            ctx.lineTo(exportCanvas.width, ly);
                            ctx.stroke();
                        }
                    }
                } else if (pattern === 'iso') {
                    const stepX = 30;
                    const stepY = 52;
                    for (let x = -exportCanvas.height; x <= exportCanvas.width + exportCanvas.height; x += stepX) {
                        ctx.beginPath();
                        ctx.moveTo(x, 0);
                        ctx.lineTo(x + exportCanvas.height * 0.577, exportCanvas.height);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(x, 0);
                        ctx.lineTo(x - exportCanvas.height * 0.577, exportCanvas.height);
                        ctx.stroke();
                    }
                    for (let y = 0; y <= exportCanvas.height; y += stepY) {
                        ctx.beginPath();
                        ctx.moveTo(0, y);
                        ctx.lineTo(exportCanvas.width, y);
                        ctx.stroke();
                    }
                } else if (pattern === 'hex') {
                    const r = 20;
                    const dx = r * 1.5;
                    const dy = r * Math.sqrt(3);
                    for (let row = 0; row * dy <= exportCanvas.height + dy; row++) {
                        for (let col = 0; col * dx <= exportCanvas.width + dx; col++) {
                            const hx = col * dx;
                            const hy = row * dy + (col % 2 === 1 ? dy / 2 : 0);
                            ctx.beginPath();
                            ctx.arc(hx, hy, 1.5, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }
                ctx.restore();
            }
        } catch (bgErr) {
            console.warn('Background rendering in screenshot fallback:', bgErr);
            ctx.fillStyle = bgColor || '#ffffff';
            ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        }

        // 3. Draw the main canvas (live strokes and drawings)
        ctx.drawImage(canvas, 0, 0);

        // 4. Draw shapes to screenshot
        const currentShapeObjects = pageShapeObjects[currentPage] || [];
        currentShapeObjects.forEach(shpObj => {
            ctx.save();
            const centerX = shpObj.x + shpObj.width / 2;
            const centerY = shpObj.y + shpObj.height / 2;
            
            ctx.translate(centerX, centerY);
            ctx.rotate((shpObj.rotation || 0) * Math.PI / 180);
            ctx.translate(-centerX, -centerY);
            
            ctx.strokeStyle = shpObj.color;
            ctx.lineWidth = shpObj.strokeWidth;
            const fill = shpObj.fillColor || 'transparent';
            ctx.fillStyle = fill;

            ctx.beginPath();
            if (shpObj.type === 'path') {
                if (shpObj.points && shpObj.points.length > 0) {
                    ctx.save();
                    ctx.translate(shpObj.x || 0, shpObj.y || 0);
                    const pts = shpObj.points;
                    ctx.moveTo(pts[0].x, pts[0].y);
                    if (shpObj.isSmoothed) {
                        for (let i = 1; i < pts.length - 1; i++) {
                            const xc = (pts[i].x + pts[i + 1].x) / 2;
                            const yc = (pts[i].y + pts[i + 1].y) / 2;
                            ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
                        }
                        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
                    } else {
                        for (let i = 1; i < pts.length; i++) {
                            ctx.lineTo(pts[i].x, pts[i].y);
                        }
                    }
                    if (shpObj.isHighlighter) ctx.globalAlpha = 0.5;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.stroke();
                    ctx.restore();
                }
            } else if (shpObj.type === 'line') {
                const sx = shpObj.startX !== undefined ? shpObj.startX : (shpObj.width < 0 ? Math.abs(shpObj.width) : 0);
                const sy = shpObj.startY !== undefined ? shpObj.startY : (shpObj.height < 0 ? Math.abs(shpObj.height) : 0);
                const ex = shpObj.endX !== undefined ? shpObj.endX : (shpObj.width < 0 ? 0 : (shpObj.width || 0));
                const ey = shpObj.endY !== undefined ? shpObj.endY : (shpObj.height < 0 ? 0 : (shpObj.height || 0));
                ctx.moveTo(shpObj.x + sx, shpObj.y + sy);
                ctx.lineTo(shpObj.x + ex, shpObj.y + ey);
                ctx.lineCap = 'round';
                ctx.stroke();
            } else if (shpObj.type === 'arrow') {
                const sx = shpObj.startX !== undefined ? shpObj.startX : (shpObj.width < 0 ? Math.abs(shpObj.width) : 0);
                const sy = shpObj.startY !== undefined ? shpObj.startY : (shpObj.height < 0 ? Math.abs(shpObj.height) : 0);
                const ex = shpObj.endX !== undefined ? shpObj.endX : (shpObj.width < 0 ? 0 : (shpObj.width || 0));
                const ey = shpObj.endY !== undefined ? shpObj.endY : (shpObj.height < 0 ? 0 : (shpObj.height || 0));
                ctx.moveTo(shpObj.x + sx, shpObj.y + sy);
                ctx.lineTo(shpObj.x + ex, shpObj.y + ey);
                const angle = Math.atan2(ey - sy, ex - sx);
                const headLength = shpObj.strokeWidth * 4;
                const p1 = { x: shpObj.x + ex, y: shpObj.y + ey };
                const p2 = { x: shpObj.x + ex - headLength * Math.cos(angle - Math.PI / 6), y: shpObj.y + ey - headLength * Math.sin(angle - Math.PI / 6) };
                const p3 = { x: shpObj.x + ex - headLength * Math.cos(angle + Math.PI / 6), y: shpObj.y + ey - headLength * Math.sin(angle + Math.PI / 6) };
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.closePath();
                ctx.fillStyle = shpObj.color;
                ctx.fill();
                ctx.beginPath();
            } else if (shpObj.type === 'graph') {
                ctx.rect(shpObj.x, shpObj.y, shpObj.width, shpObj.height);
                if (shpObj.fillColor) ctx.fill();
                ctx.beginPath();
                ctx.lineWidth = Math.max(0.5, shpObj.strokeWidth * 0.3);
                ctx.setLineDash([4, 4]);
                ctx.globalAlpha = 0.4;
                for(let i=0; i<9; i++) {
                    ctx.moveTo(shpObj.x + shpObj.width/10, shpObj.y + shpObj.height/10 + (shpObj.height*0.8) * (i/8));
                    ctx.lineTo(shpObj.x + shpObj.width*0.9, shpObj.y + shpObj.height/10 + (shpObj.height*0.8) * (i/8));
                    ctx.moveTo(shpObj.x + shpObj.width/10 + (shpObj.width*0.8) * (i/8), shpObj.y + shpObj.height/10);
                    ctx.lineTo(shpObj.x + shpObj.width/10 + (shpObj.width*0.8) * (i/8), shpObj.y + shpObj.height*0.9);
                }
                ctx.stroke();
                ctx.beginPath();
                ctx.globalAlpha = 1.0;
                ctx.setLineDash([]);
                ctx.lineWidth = shpObj.strokeWidth;
                // Y-axis
                ctx.moveTo(shpObj.x + shpObj.width/10, shpObj.y + shpObj.height/10);
                ctx.lineTo(shpObj.x + shpObj.width/10, shpObj.y + shpObj.height*0.9);
                // X-axis
                ctx.moveTo(shpObj.x + shpObj.width/10, shpObj.y + shpObj.height/2);
                ctx.lineTo(shpObj.x + shpObj.width*0.9, shpObj.y + shpObj.height/2);
                ctx.stroke();
                ctx.beginPath();
                // Y-axis arrow
                ctx.moveTo(shpObj.x + shpObj.width/10, shpObj.y + shpObj.height/10);
                ctx.lineTo(shpObj.x + shpObj.width/10 - 4, shpObj.y + shpObj.height/10 + 8);
                ctx.moveTo(shpObj.x + shpObj.width/10, shpObj.y + shpObj.height/10);
                ctx.lineTo(shpObj.x + shpObj.width/10 + 4, shpObj.y + shpObj.height/10 + 8);
                // X-axis arrow
                ctx.moveTo(shpObj.x + shpObj.width*0.9, shpObj.y + shpObj.height/2);
                ctx.lineTo(shpObj.x + shpObj.width*0.9 - 8, shpObj.y + shpObj.height/2 - 4);
                ctx.moveTo(shpObj.x + shpObj.width*0.9, shpObj.y + shpObj.height/2);
                ctx.lineTo(shpObj.x + shpObj.width*0.9 - 8, shpObj.y + shpObj.height/2 + 4);
                ctx.fill();
            } else if (shpObj.type === 'rect') {
                ctx.rect(shpObj.x, shpObj.y, shpObj.width, shpObj.height);
                if (shpObj.fillColor) ctx.fill();
                ctx.stroke();
            } else if (shpObj.type === 'circle') {
                ctx.ellipse(shpObj.x + shpObj.width/2, shpObj.y + shpObj.height/2, shpObj.width/2, shpObj.height/2, 0, 0, Math.PI * 2);
                if (shpObj.fillColor) ctx.fill();
                ctx.stroke();
            } else if (shpObj.type === 'triangle') {
                ctx.moveTo(shpObj.x + shpObj.width/2, shpObj.y);
                ctx.lineTo(shpObj.x, shpObj.y + shpObj.height);
                ctx.lineTo(shpObj.x + shpObj.width, shpObj.y + shpObj.height);
                ctx.closePath();
                if (shpObj.fillColor) ctx.fill();
                ctx.stroke();
            } else if (shpObj.type === 'star') {
                const cx = shpObj.x + shpObj.width / 2;
                const cy = shpObj.y + shpObj.height / 2;
                const outerRadius = Math.min(shpObj.width/2, shpObj.height/2);
                const innerRadius = outerRadius / 2.5;
                for (let i = 0; i < 10; i++) {
                    const r = i % 2 === 0 ? outerRadius : innerRadius;
                    const angle = (i * Math.PI) / 5 - Math.PI / 2;
                    if (i === 0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
                    else ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
                }
                ctx.closePath();
                if (shpObj.fillColor) ctx.fill();
                ctx.stroke();
            }

            if (shpObj.text !== undefined && shpObj.text !== '' && shpObj.type !== 'ruler' && shpObj.type !== 'protractor') {
                ctx.font = `${shpObj.fontSize || 20}px 'Inter', system-ui, sans-serif`;
                ctx.fillStyle = shpObj.textColor || shpObj.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const lines = shpObj.text.split('\n');
                const lineHeight = (shpObj.fontSize || 20) * 1.3;
                let startY = shpObj.y + (shpObj.height / 2) - ((lines.length - 1) * lineHeight) / 2;
                lines.forEach(line => {
                    ctx.fillText(line, shpObj.x + shpObj.width / 2, startY);
                    startY += lineHeight;
                });
            }
            ctx.restore();
        });

        // 5. Draw image objects (asynchronously preloaded to guarantee capture)
        const currentImageObjects = pageImageObjects[currentPage] || [];
        if (currentImageObjects.length > 0) {
            await Promise.all(currentImageObjects.map(imgObj => new Promise((resolve) => {
                const img = new Image();
                if (imgObj.src && (imgObj.src.startsWith('http://') || imgObj.src.startsWith('https://'))) {
                    img.crossOrigin = 'anonymous';
                }
                const drawImg = () => {
                    try {
                        ctx.save();
                        const centerX = imgObj.x + imgObj.width / 2;
                        const centerY = imgObj.y + imgObj.height / 2;
                        ctx.translate(centerX, centerY);
                        ctx.rotate((imgObj.rotation || 0) * Math.PI / 180);
                        ctx.drawImage(img, -imgObj.width / 2, -imgObj.height / 2, imgObj.width, imgObj.height);
                        ctx.restore();
                    } catch (e) {
                        console.error("Error rendering image in screenshot", e);
                    }
                    resolve();
                };
                img.onload = drawImg;
                img.onerror = () => {
                    if (img.crossOrigin) {
                        const fallbackImg = new Image();
                        fallbackImg.onload = () => {
                            try {
                                ctx.save();
                                const centerX = imgObj.x + imgObj.width / 2;
                                const centerY = imgObj.y + imgObj.height / 2;
                                ctx.translate(centerX, centerY);
                                ctx.rotate((imgObj.rotation || 0) * Math.PI / 180);
                                ctx.drawImage(fallbackImg, -imgObj.width / 2, -imgObj.height / 2, imgObj.width, imgObj.height);
                                ctx.restore();
                            } catch (e) {}
                            resolve();
                        };
                        fallbackImg.onerror = resolve;
                        fallbackImg.src = imgObj.src;
                    } else {
                        resolve();
                    }
                };
                img.src = imgObj.src;
                if (img.complete) {
                    drawImg();
                }
            })));
        }

        // 6. Draw text objects
        const currentTextObjects = pageTextObjects[currentPage] || [];
        currentTextObjects.forEach(txtObj => {
            ctx.save();
            const centerX = txtObj.x + txtObj.width / 2;
            const centerY = txtObj.y + txtObj.height / 2;
            ctx.translate(centerX, centerY);
            ctx.rotate((txtObj.rotation || 0) * Math.PI / 180);

            // Draw background and border if present
            const hasBg = txtObj.bgColor && txtObj.bgColor !== 'transparent';
            const bw = txtObj.borderWidth || 0;
            if (hasBg || bw > 0) {
                const rx = -txtObj.width / 2;
                const ry = -txtObj.height / 2;
                const rw = txtObj.width;
                const rh = txtObj.height;
                const cr = txtObj.borderRadius || 0;
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(rx, ry, rw, rh, cr);
                } else {
                    ctx.rect(rx, ry, rw, rh);
                }
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
        if (selection && selection.width > 5 && selection.height > 5) {
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = selection.width;
            cropCanvas.height = selection.height;
            const cropCtx = cropCanvas.getContext('2d');
            cropCtx.drawImage(exportCanvas, -selection.x, -selection.y);
            finalCanvas = cropCanvas;
        }

        playShutterSound();
        try {
            finalCanvas.toBlob((blob) => {
                const dateStr = new Date().toISOString().slice(0, 10);
                const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
                const defaultName = `Whiteboard_Screenshot_Page_${currentPage + 1}_${dateStr}_${timeStr}.png`;

                if (blob) {
                    setScreenshotBlob(blob);
                    setScreenshotPreview(URL.createObjectURL(blob));
                    setScreenshotName(defaultName);
                    toast.success('Screenshot captured!');
                } else {
                    const dataUrl = finalCanvas.toDataURL('image/png');
                    setScreenshotPreview(dataUrl);
                    setScreenshotName(defaultName);
                    fetch(dataUrl)
                        .then(res => res.blob())
                        .then(b => setScreenshotBlob(b))
                        .catch(() => {});
                    toast.success('Screenshot captured!');
                }
            }, 'image/png');
        } catch (err) {
            console.error('Screenshot export error:', err);
            try {
                const dataUrl = finalCanvas.toDataURL('image/png');
                setScreenshotPreview(dataUrl);
                const dateStr = new Date().toISOString().slice(0, 10);
                const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
                setScreenshotName(`Whiteboard_Screenshot_Page_${currentPage + 1}_${dateStr}_${timeStr}.png`);
                fetch(dataUrl)
                    .then(res => res.blob())
                    .then(b => setScreenshotBlob(b))
                    .catch(() => {});
                toast.success('Screenshot captured!');
            } catch (fallbackErr) {
                console.error('Final fallback failed:', fallbackErr);
                toast.error('Could not capture screenshot');
            }
        }
    }, [currentPage, pageBackgrounds, pageImageObjects, pageShapeObjects, pageTextObjects, selection]);

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
        if (tool === 'highlighter') return `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${encodeURIComponent(highlighterColor)}" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>') 2 22, auto`;
        // Pen cursor - solid circle matching size and color
        if (tool === 'pen') return `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${strokeWidth + 2}" height="${strokeWidth + 2}" viewBox="0 0 ${strokeWidth + 2} ${strokeWidth + 2}"><circle cx="${(strokeWidth + 2) / 2}" cy="${(strokeWidth + 2) / 2}" r="${strokeWidth / 2}" fill="${encodeURIComponent(color)}" /></svg>') ${(strokeWidth + 2) / 2} ${(strokeWidth + 2) / 2}, crosshair`;
        if (tool === 'arrow') return 'crosshair';
        return 'crosshair';
    };

    // Insert DateTime Text
    const handleInsertDateTime = useCallback(() => {
        const now = new Date();
        const formatted = `${formatDate(now, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })} - ${formatTime(now)}`;
        
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

    
    const deletePage = useCallback((indexToDelete) => {
        if (totalPages <= 1) {
            toast.error("Cannot delete the only page");
            return;
        }
        
        saveCurrentPage();

        // 1. Remove from arrays and shift subsequent items
        setPages(prev => {
            const newPages = [...prev];
            newPages.splice(indexToDelete, 1);
            return newPages;
        });

        // 2. Shift all object/background maps
        const shiftMap = (mapUpdater) => {
            mapUpdater(prev => {
                const newMap = { ...prev };
                delete newMap[indexToDelete];
                
                // Shift all keys greater than indexToDelete down by 1
                const keys = Object.keys(newMap).map(Number).sort((a, b) => a - b);
                for (const key of keys) {
                    if (key > indexToDelete) {
                        newMap[key - 1] = newMap[key];
                        delete newMap[key];
                    }
                }
                return newMap;
            });
        };

        shiftMap(setPageBackgrounds);
        shiftMap(setPageImageObjects);
        shiftMap(setPageTextObjects);
        shiftMap(setPageShapeObjects);

        setTotalPages(prev => prev - 1);
        
        // 3. Update current page if needed
        if (currentPage === indexToDelete) {
            // Load the previous page (or next page if we deleted the 0th page)
            const nextIdx = Math.max(0, indexToDelete - 1);
            loadPage(nextIdx);
        } else if (currentPage > indexToDelete) {
            setCurrentPage(prev => prev - 1);
            loadPage(currentPage - 1);
        }
    }, [totalPages, currentPage, saveCurrentPage, loadPage]);

    const reorderPage = useCallback((dragIndex, hoverIndex) => {
        saveCurrentPage();
        
        setPages(prev => {
            const newPages = [...prev];
            const [draggedPage] = newPages.splice(dragIndex, 1);
            newPages.splice(hoverIndex, 0, draggedPage);
            return newPages;
        });

        const swapMap = (mapUpdater) => {
            mapUpdater(prev => {
                const newMap = { ...prev };
                
                // Get the items we're moving
                const draggedItem = newMap[dragIndex];
                
                // Remove dragged item temporarily
                delete newMap[dragIndex];
                
                // If dragging up (e.g. index 3 to 1)
                if (dragIndex > hoverIndex) {
                    for (let i = dragIndex - 1; i >= hoverIndex; i--) {
                        if (newMap[i] !== undefined) newMap[i + 1] = newMap[i];
                    }
                } 
                // If dragging down (e.g. index 1 to 3)
                else {
                    for (let i = dragIndex + 1; i <= hoverIndex; i++) {
                        if (newMap[i] !== undefined) newMap[i - 1] = newMap[i];
                    }
                }
                
                // Place the dragged item in its new home
                if (draggedItem !== undefined) {
                    newMap[hoverIndex] = draggedItem;
                } else {
                    delete newMap[hoverIndex];
                }
                
                return newMap;
            });
        };

        swapMap(setPageBackgrounds);
        swapMap(setPageImageObjects);
        swapMap(setPageTextObjects);
        swapMap(setPageShapeObjects);

        if (currentPage === dragIndex) {
            setCurrentPage(hoverIndex);
            loadPage(hoverIndex);
        } else if (currentPage > dragIndex && currentPage <= hoverIndex) {
            setCurrentPage(prev => prev - 1);
            loadPage(currentPage - 1);
        } else if (currentPage < dragIndex && currentPage >= hoverIndex) {
            setCurrentPage(prev => prev + 1);
            loadPage(currentPage + 1);
        }
    }, [currentPage, saveCurrentPage, loadPage]);

    const goToPrevPage = useCallback(() => {
        if (currentPage > 0) loadPage(currentPage - 1);
    }, [currentPage, loadPage]);

    const goToNextPage = useCallback(() => {
        if (currentPage < totalPages - 1) loadPage(currentPage + 1);
    }, [currentPage, totalPages, loadPage]);

    // Generic image inserter from Data URL or remote URL
    const insertImageFromSrc = useCallback((srcUrl) => {
        if (!srcUrl) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = canvasRef.current;
            let imgWidth = img.width || 400;
            let imgHeight = img.height || 300;
            const maxWidth = (canvas?.width || 800) * 0.6;
            const maxHeight = (canvas?.height || 600) * 0.6;

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

            const imageObj = {
                id: Date.now(),
                type: 'image',
                src: srcUrl,
                x: canvas ? (canvas.width - imgWidth) / 2 : 100,
                y: canvas ? (canvas.height - imgHeight) / 2 : 100,
                width: imgWidth,
                height: imgHeight,
                rotation: 0,
                imageElement: img
            };

            setImageObjects(prev => [...prev, imageObj]);
            setSelectedImageId(imageObj.id);

            // Emit image event
            emitDrawEvent({
                type: 'image',
                imageData: srcUrl,
                x: imageObj.x,
                y: imageObj.y,
                width: imgWidth,
                height: imgHeight
            });
        };
        img.src = srcUrl;
    }, [emitDrawEvent]);

    // Image insert handler - creates selectable image objects
    const handleImageInsert = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            insertImageFromSrc(event.target.result);
        };
        reader.readAsDataURL(file);
        e.target.value = ''; // Reset input
    }, [insertImageFromSrc]);

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
                <div className="absolute bottom-[4.5rem] left-1/2 transform -translate-x-1/2 bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-700/60 px-2 py-1 flex items-center gap-1.5 rounded-xl z-40 max-w-[95%] overflow-visible whitespace-nowrap hide-scrollbar transition-all text-slate-200">
                    {/* Delete Selection */}
                    <button 
                        onClick={handleDelete} 
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition" 
                        title="Delete Selection"
                    >
                        <Trash2 size={15} />
                    </button>

                    <div className="w-px h-4 bg-slate-700 mx-0.5" />

                    {/* Edit / Clipboard Hover Group */}
                    <div className="relative group">
                        <button className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center gap-1 transition" title="Clipboard Actions">
                            <Copy size={14} />
                            <span className="hidden sm:inline text-[11px] font-medium">Edit</span>
                            <ChevronDown size={11} className="text-slate-400 group-hover:rotate-180 transition-transform" />
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col bg-slate-850/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 shadow-2xl z-50 min-w-[130px] text-xs before:content-[''] before:absolute before:-bottom-2.5 before:left-0 before:right-0 before:h-2.5 animate-in fade-in zoom-in-95 duration-100">
                            <button onClick={handleCopy} className="flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-700/70 rounded-lg text-slate-200 hover:text-white transition">
                                <span className="flex items-center gap-2"><Copy size={13} /> Copy</span>
                                <kbd className="text-[9px] text-slate-400 font-mono">⌘C</kbd>
                            </button>
                            <button onClick={handleCut} className="flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-700/70 rounded-lg text-slate-200 hover:text-white transition">
                                <span className="flex items-center gap-2"><Scissors size={13} /> Cut</span>
                                <kbd className="text-[9px] text-slate-400 font-mono">⌘X</kbd>
                            </button>
                            <button onClick={handlePaste} className="flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-700/70 rounded-lg text-slate-200 hover:text-white transition">
                                <span className="flex items-center gap-2"><ClipboardPaste size={13} /> Paste</span>
                                <kbd className="text-[9px] text-slate-400 font-mono">⌘V</kbd>
                            </button>
                            <button onClick={handleDuplicate} className="flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-700/70 rounded-lg text-slate-200 hover:text-white transition">
                                <span className="flex items-center gap-2"><Files size={13} /> Duplicate</span>
                                <kbd className="text-[9px] text-slate-400 font-mono">⌘D</kbd>
                            </button>
                        </div>
                    </div>

                    <div className="w-px h-4 bg-slate-700 mx-0.5" />

                    {/* Layers Hover Group */}
                    <div className="relative group">
                        <button className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center gap-1 transition" title="Layer Ordering">
                            <BringToFront size={14} />
                            <span className="hidden sm:inline text-[11px] font-medium">Layers</span>
                            <ChevronDown size={11} className="text-slate-400 group-hover:rotate-180 transition-transform" />
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col bg-slate-850/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 shadow-2xl z-50 min-w-[140px] text-xs before:content-[''] before:absolute before:-bottom-2.5 before:left-0 before:right-0 before:h-2.5 animate-in fade-in zoom-in-95 duration-100">
                            <button onClick={handleBringToFront} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-700/70 rounded-lg text-slate-200 hover:text-white transition">
                                <BringToFront size={13} /> Bring to Front
                            </button>
                            <button onClick={handleSendToBack} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-700/70 rounded-lg text-slate-200 hover:text-white transition">
                                <SendToBack size={13} /> Send to Back
                            </button>
                        </div>
                    </div>

                    <div className="w-px h-4 bg-slate-700 mx-0.5" />

                    {/* Align & Distribute Hover Group */}
                    <div className="relative group">
                        <button className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center gap-1 transition" title="Alignment & Distribution">
                            <AlignLeft size={14} />
                            <span className="hidden sm:inline text-[11px] font-medium">Align</span>
                            <ChevronDown size={11} className="text-slate-400 group-hover:rotate-180 transition-transform" />
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col bg-slate-850/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-2 shadow-2xl z-50 min-w-[170px] text-xs before:content-[''] before:absolute before:-bottom-2.5 before:left-0 before:right-0 before:h-2.5 animate-in fade-in zoom-in-95 duration-100">
                            <div className="text-[10px] font-semibold text-slate-400 px-1 mb-1">Align</div>
                            <div className="grid grid-cols-3 gap-1 mb-2">
                                <button onClick={() => handleAlign('left')} className="p-1.5 hover:bg-slate-700/70 rounded-md text-slate-300 hover:text-white flex items-center justify-center" title="Align Left"><AlignLeft size={13} /></button>
                                <button onClick={() => handleAlign('center')} className="p-1.5 hover:bg-slate-700/70 rounded-md text-slate-300 hover:text-white flex items-center justify-center" title="Align Center"><AlignCenterHorizontal size={13} /></button>
                                <button onClick={() => handleAlign('right')} className="p-1.5 hover:bg-slate-700/70 rounded-md text-slate-300 hover:text-white flex items-center justify-center" title="Align Right"><AlignRight size={13} /></button>
                                <button onClick={() => handleAlign('top')} className="p-1.5 hover:bg-slate-700/70 rounded-md text-slate-300 hover:text-white flex items-center justify-center" title="Align Top"><AlignStartVertical size={13} /></button>
                                <button onClick={() => handleAlign('middle')} className="p-1.5 hover:bg-slate-700/70 rounded-md text-slate-300 hover:text-white flex items-center justify-center" title="Align Middle"><AlignCenterVertical size={13} /></button>
                                <button onClick={() => handleAlign('bottom')} className="p-1.5 hover:bg-slate-700/70 rounded-md text-slate-300 hover:text-white flex items-center justify-center" title="Align Bottom"><AlignEndVertical size={13} /></button>
                            </div>
                            {(selectedShapeIds.length > 2 || selectedTextIds.length > 2) && (
                                <>
                                    <div className="w-full h-px bg-slate-700 my-1" />
                                    <div className="text-[10px] font-semibold text-slate-400 px-1 mb-1">Distribute</div>
                                    <div className="grid grid-cols-2 gap-1">
                                        <button onClick={() => handleDistribute('horizontal')} className="p-1.5 hover:bg-slate-700/70 rounded-md text-slate-300 hover:text-white flex items-center justify-center gap-1" title="Distribute Horizontally"><AlignHorizontalSpaceBetween size={13} /> Horiz</button>
                                        <button onClick={() => handleDistribute('vertical')} className="p-1.5 hover:bg-slate-700/70 rounded-md text-slate-300 hover:text-white flex items-center justify-center gap-1" title="Distribute Vertically"><AlignVerticalSpaceBetween size={13} /> Vert</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="w-px h-4 bg-slate-700 mx-0.5" />

                    {/* Organize Hover Group */}
                    <div className="relative group">
                        <button className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center gap-1 transition" title="Organize & Group">
                            {shapeObjects.some(s => selectedShapeIds.includes(s.id) && s.isLocked) || textObjects.some(t => selectedTextIds.includes(t.id) && t.isLocked) ? (
                                <Lock size={14} className="text-amber-400" />
                            ) : (
                                <Unlock size={14} />
                            )}
                            <span className="hidden sm:inline text-[11px] font-medium">Organize</span>
                            <ChevronDown size={11} className="text-slate-400 group-hover:rotate-180 transition-transform" />
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col bg-slate-850/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 shadow-2xl z-50 min-w-[130px] text-xs before:content-[''] before:absolute before:-bottom-2.5 before:left-0 before:right-0 before:h-2.5 animate-in fade-in zoom-in-95 duration-100">
                            <button onClick={handleToggleLock} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-700/70 rounded-lg text-slate-200 hover:text-white transition">
                                {shapeObjects.some(s => selectedShapeIds.includes(s.id) && s.isLocked) || textObjects.some(t => selectedTextIds.includes(t.id) && t.isLocked) ? (
                                    <><Unlock size={13} /> Unlock</>
                                ) : (
                                    <><Lock size={13} /> Lock</>
                                )}
                            </button>
                            {(selectedShapeIds.length > 1 || selectedTextIds.length > 1) && (
                                <button onClick={handleGroup} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-700/70 rounded-lg text-slate-200 hover:text-white transition">
                                    <Group size={13} /> Group
                                </button>
                            )}
                            {(shapeObjects.some(s => selectedShapeIds.includes(s.id) && s.groupId) || textObjects.some(t => selectedTextIds.includes(t.id) && t.groupId)) && (
                                <button onClick={handleUngroup} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-700/70 rounded-lg text-slate-200 hover:text-white transition">
                                    <Ungroup size={13} /> Ungroup
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Sleek Toolbar / View-Only Status Pill */}
            {!canUserDraw ? (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-700/70 px-4 py-2.5 flex items-center gap-3.5 rounded-full z-40 animate-in fade-in">
                    <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                        <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>View Only (Whiteboard drawing is disabled by Host)</span>
                    </div>
                    <button
                        onClick={onToggleFullscreen}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition"
                        title="Toggle Fullscreen"
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            ) : (() => {
                const isVertical = toolbarDock === 'left' || toolbarDock === 'right';
                const isFloating = toolbarDock === 'float';
                const popoverPos = toolbarDock === 'left'
                    ? 'left-[125%] top-0'
                    : toolbarDock === 'right'
                    ? 'right-[125%] top-0'
                    : toolbarDock === 'top'
                    ? 'top-full left-1/2 -translate-x-1/2 mt-2'
                    : 'bottom-full left-1/2 -translate-x-1/2 mb-2';

                const allTools = [
                    { id: 'select', icon: selectMode === 'lasso' ? Wand2 : MousePointer2, label: 'Select', important: true },
                    { id: 'pen', icon: Pencil, label: 'Pen', important: true },
                    { id: 'highlighter', icon: Highlighter, label: 'Highlighter', important: true },
                    { id: 'eraser', icon: Eraser, label: 'Eraser', important: true },
                    { id: 'line', icon: lineType.startsWith('connector') ? Waypoints : (lineType === 'arrow' ? MoveRight : Minus), label: 'Lines & Arrows', important: false },
                    { id: 'shape', icon: shapeType === 'circle' ? Circle : (shapeType === 'triangle' ? Triangle : (shapeType === 'star' ? Star : RectangleHorizontal)), label: 'Shapes', important: true },
                    { id: 'text', icon: Type, label: 'Text', important: true },
                    { id: 'image', icon: ImageIcon, label: 'Image', important: false },
                    { id: 'media', icon: Film, label: 'Media Player (YouTube, Local, Embed)', important: true },
                    { id: 'domain_3d', icon: Box, label: '3D Objects & Domain Library', important: true },
                    { id: 'tasks', icon: ListTodo, label: 'Whiteboard Tasks Checklist', important: true },
                    { id: 'templates', icon: LayoutTemplate, label: 'Templates & SmartArt (MS Office)', important: false },
                    { id: 'shortcuts', icon: Keyboard, label: 'Keyboard Shortcuts (Cmd+/ or ?)', important: false },
                    { id: 'timer', icon: Clock, label: 'Classroom Timer & Stopwatch', important: false },
                    { id: 'spotlight', icon: TorchIcon, label: 'Spotlight Focus (Torch)', important: false },
                    { id: 'curtain', icon: StickyNoteIcon, label: 'Screen Curtain / Shade', important: false },
                    { id: 'laser', icon: Sparkles, label: 'Laser Pointer', important: false },
                    { id: 'datetime', icon: CalendarClock, label: 'Insert DateTime', important: false },
                    { id: 'recorder', icon: Video, label: 'Toggle Recorder', important: false },
                    ...(isInstructor ? [{ id: 'permissions', icon: Users, label: 'Manage Permissions', important: false }] : []),
                ];

                const displayedTools = isToolbarCollapsed ? allTools.filter(t => t.important) : allTools;

                return (
                <div 
                    ref={toolbarRef}
                    style={isFloating ? { left: `${toolbarPos.x}px`, top: `${toolbarPos.y}px`, transform: 'none' } : undefined}
                    className={`absolute bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-700/60 flex z-40 overflow-visible whitespace-nowrap hide-scrollbar ${isDraggingToolbar ? '' : 'transition-all duration-200'} ${
                    !isStateLoaded ? 'pointer-events-none opacity-60 filter blur-[0.5px]' : 'pointer-events-auto opacity-100'
                } ${
                    toolbarDock === 'top'
                        ? 'top-4 left-1/2 transform -translate-x-1/2 flex-row items-center px-2 py-1 rounded-full gap-0.5 max-w-[95%]'
                        : toolbarDock === 'left'
                        ? 'left-4 top-1/2 transform -translate-y-1/2 flex-col items-center w-12 py-2.5 px-1 rounded-2xl gap-1 max-h-[90vh] overflow-y-auto overflow-x-hidden'
                        : toolbarDock === 'right'
                        ? 'right-4 top-1/2 transform -translate-y-1/2 flex-col items-center w-12 py-2.5 px-1 rounded-2xl gap-1 max-h-[90vh] overflow-y-auto overflow-x-hidden'
                        : isFloating
                        ? 'flex-row items-center px-2 py-1 rounded-full gap-0.5 max-w-[95%]'
                        : 'bottom-4 left-1/2 transform -translate-x-1/2 flex-row items-center px-2 py-1 rounded-full gap-0.5 max-w-[95%]'
                }`}>
                    {/* Floatable Toolbar Drag Grip */}
                    <div
                        onMouseDown={handleToolbarDragStart}
                        onPointerDown={handleToolbarDragStart}
                        className="p-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-white rounded transition flex items-center justify-center shrink-0"
                        title="Drag to float toolbar anywhere on screen"
                    >
                        <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    {/* Collapse to Important Tools Toggle Button */}
                    <button
                        type="button"
                        onClick={() => setIsToolbarCollapsed(prev => !prev)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded-full transition flex items-center justify-center shrink-0"
                        title={isToolbarCollapsed ? "Expand Toolbar (Show All Tools)" : "Collapse Toolbar (Important Tools Only)"}
                    >
                        {isToolbarCollapsed ? <Maximize2 className="w-3.5 h-3.5 text-amber-400" /> : <Minimize2 className="w-3.5 h-3.5" />}
                    </button>
                    <div className={`w-px ${isVertical ? 'h-0.5 w-5 my-0.5' : 'h-4 mx-0.5'} bg-slate-700 shrink-0`} />

                    {/* Tools */}
                    <div className={`flex ${isVertical ? 'flex-col gap-1' : 'items-center gap-0.5'}`}>
                        <div className={`flex ${isVertical ? 'flex-col gap-1' : 'items-center gap-0.5'} relative`}>
                        {displayedTools.map(t => (
                            <div key={t.id} className="relative">
                                <button
                                    onClick={() => {
                                        if (t.id === 'media') {
                                            setShowMediaModal(true);
                                            return;
                                        }
                                        if (t.id === 'domain_3d') {
                                            setShowDomainLibrary(true);
                                            return;
                                        }
                                        if (t.id === 'tasks') {
                                            setShowTasksPanel(prev => !prev);
                                            return;
                                        }
                                        if (t.id === 'shortcuts') {
                                            setShowShortcutsModal(true);
                                            return;
                                        }
                                        if (t.id === 'templates') {
                                            setShowTemplateGallery(true);
                                            return;
                                        }
                                        if (t.id === 'timer') {
                                            setShowClassroomTimer(prev => !prev);
                                            return;
                                        }
                                        if (t.id === 'spotlight') {
                                            setIsSpotlightActive(prev => {
                                                const next = !prev;
                                                if (next) {
                                                    toast('Spotlight active: move cursor to illuminate, scroll to zoom', { icon: '🔦' });
                                                    setSelectedShapeIds([]);
                                                    setSelectedTextIds([]);
                                                    setSelectedImageId(null);
                                                }
                                                return next;
                                            });
                                            return;
                                        }
                                        if (t.id === 'curtain') {
                                            setIsCurtainActive(prev => {
                                                const next = !prev;
                                                if (next) toast('Screen Curtain active: drag bottom bar to reveal', { icon: '🎭' });
                                                return next;
                                            });
                                            return;
                                        }
                                        if (t.id === 'datetime') {
                                            handleInsertDateTime();
                                            return;
                                        }
                                        if (t.id === 'recorder') {
                                            setShowRecorder(!showRecorder);
                                            return;
                                        }
                                        if (t.id === 'permissions') {
                                            setShowPermissions(true);
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
                                    className={`p-1 rounded-full transition-colors flex items-center justify-center ${
                                        tool === t.id ||
                                        (t.id === 'recorder' && showRecorder) ||
                                        (t.id === 'timer' && showClassroomTimer) ||
                                        (t.id === 'spotlight' && isSpotlightActive) ||
                                        (t.id === 'curtain' && isCurtainActive) ||
                                        (t.id === 'tasks' && showTasksPanel)
                                            ? 'bg-primary-500 text-white shadow-inner'
                                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`}
                                    title={t.label}
                                >
                                    {t.id === 'highlighter' ? (
                                        <div className="relative flex items-center justify-center">
                                            <t.icon className="w-3.5 h-3.5" style={{ color: highlighterColor }} />
                                            <span
                                                className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-slate-900 shadow-xs"
                                                style={{ backgroundColor: highlighterColor }}
                                            />
                                        </div>
                                    ) : (
                                        <t.icon className="w-3.5 h-3.5" />
                                    )}
                                </button>
                                
                                {/* Popovers rendered with dynamic positioning */}
                                {tool === t.id && t.id === 'pen' && showStrokePicker && (
                                    <div className={`absolute ${popoverPos} p-3 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 flex flex-col gap-2 min-w-[120px]`}>
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
                                    <div className={`absolute ${popoverPos} p-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 flex flex-col gap-1 min-w-[180px]`}>
                                        <button 
                                            onClick={() => { setShowImagePickerModal(true); setShowImagePicker(false); }}
                                            className="text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded-md transition flex items-center gap-2"
                                        >
                                            <Folder className="w-4 h-4 text-emerald-400" />
                                            Drive & Docs
                                        </button>
                                        <button 
                                            onClick={() => { imageInputRef.current?.click(); setShowImagePicker(false); }}
                                            className="text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded-md transition flex items-center gap-2"
                                        >
                                            <Upload className="w-4 h-4 text-blue-400" />
                                            Upload from Device
                                        </button>
                                    </div>
                                )}

                                {tool === t.id && t.id === 'eraser' && showEraserPicker && (
                                    <div className={`absolute ${popoverPos} p-3 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 flex flex-col gap-2 w-48`}>
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
                                    <div className={`absolute ${popoverPos} p-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 flex gap-1`}>
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
                                    <div className={`absolute ${popoverPos} p-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 flex flex-col gap-1 w-[120px]`}>
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
                                    <div className={`absolute ${popoverPos} p-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 flex flex-col gap-1 w-[150px]`}>
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
                                        <button
                                            onClick={() => { setLineType('double_arrow'); setShowLinePicker(false); }}
                                            className={`flex items-center gap-2 p-1.5 rounded-lg text-xs w-full text-left transition ${lineType === 'double_arrow' ? 'bg-primary-500/20 text-primary-400' : 'text-slate-300 hover:bg-slate-700'}`}
                                            title="Double Arrow"
                                        >
                                            <ArrowLeftRight className="w-3.5 h-3.5" /> 2-Way
                                        </button>
                                        <button
                                            onClick={() => { setLineType('arc'); setShowLinePicker(false); }}
                                            className={`flex items-center gap-2 p-1.5 rounded-lg text-xs w-full text-left transition ${lineType === 'arc' ? 'bg-primary-500/20 text-primary-400' : 'text-slate-300 hover:bg-slate-700'}`}
                                            title="Curved Arc"
                                        >
                                            <Spline className="w-3.5 h-3.5" /> Curved Arc
                                        </button>
                                        <div className="w-full h-px bg-slate-700 my-1" />
                                        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider px-1">Connectors</div>
                                        <button
                                            onClick={() => { setLineType('connector_straight'); setShowLinePicker(false); }}
                                            className={`flex items-center gap-2 p-1.5 rounded-lg text-xs w-full text-left transition ${lineType === 'connector_straight' ? 'bg-primary-500/20 text-primary-400 font-semibold' : 'text-slate-300 hover:bg-slate-700'}`}
                                            title="Straight Snap Connector"
                                        >
                                            <MoveRight className="w-4 h-4 text-sky-400" />
                                            <span className="font-mono text-[11px]">━ Straight</span>
                                        </button>
                                        <button
                                            onClick={() => { setLineType('connector_elbow'); setShowLinePicker(false); }}
                                            className={`flex items-center gap-2 p-1.5 rounded-lg text-xs w-full text-left transition ${lineType === 'connector_elbow' ? 'bg-primary-500/20 text-primary-400 font-semibold' : 'text-slate-300 hover:bg-slate-700'}`}
                                            title="Elbow (90°) Connector"
                                        >
                                            <Waypoints className="w-4 h-4 text-purple-400" />
                                            <span className="font-mono text-[11px]">└ Elbow</span>
                                        </button>
                                        <button
                                            onClick={() => { setLineType('connector_curved'); setShowLinePicker(false); }}
                                            className={`flex items-center gap-2 p-1.5 rounded-lg text-xs w-full text-left transition ${lineType === 'connector_curved' ? 'bg-primary-500/20 text-primary-400 font-semibold' : 'text-slate-300 hover:bg-slate-700'}`}
                                            title="Curved Path Connector"
                                        >
                                            <Spline className="w-4 h-4 text-amber-400" />
                                            <span className="font-mono text-[11px]">∿ Curve</span>
                                        </button>
                                    </div>
                                )}
                                
                                {tool === t.id && t.id === 'text' && showTextBgPicker && (
                                    <div className={`absolute ${popoverPos} p-2.5 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 z-50 flex items-center gap-2 text-slate-200 select-none animate-in fade-in zoom-in-95 duration-150`}>
                                        {/* Font Family Selector */}
                                        <select
                                            value={selectedFontFamily || 'sans-serif'}
                                            onChange={(e) => {
                                                const font = e.target.value;
                                                setSelectedFontFamily(font);
                                                const targets = editingTextId ? [editingTextId] : selectedTextIds;
                                                if (targets.length > 0) {
                                                    setTextObjects(prev => prev.map(t => targets.includes(t.id) ? { ...t, fontFamily: font } : t));
                                                }
                                                if (selectedShapeIds.length > 0) {
                                                    setShapeObjects(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, fontFamily: font } : s));
                                                }
                                            }}
                                            className="bg-slate-700 text-xs text-white rounded px-2 py-1 focus:outline-none border border-slate-600 cursor-pointer"
                                            title="Font Family"
                                        >
                                            <option value="sans-serif">Sans-serif</option>
                                            <option value="serif">Serif</option>
                                            <option value="monospace">Monospace</option>
                                            <option value="Inter">Inter</option>
                                            <option value="Roboto">Roboto</option>
                                            <option value="Caveat">Caveat (Handwritten)</option>
                                            <option value="Comic Sans MS">Comic Marker</option>
                                        </select>

                                        <div className="w-px h-5 bg-slate-700" />

                                        {/* Bold */}
                                        <button
                                            onClick={() => {
                                                const newVal = !isBold;
                                                setIsBold(newVal);
                                                const targets = editingTextId ? [editingTextId] : selectedTextIds;
                                                if (targets.length > 0) {
                                                    setTextObjects(prev => prev.map(t => targets.includes(t.id) ? { ...t, fontWeight: newVal ? 'bold' : 'normal' } : t));
                                                } else {
                                                    setTextObjects(prev => prev.map(t => ({ ...t, fontWeight: newVal ? 'bold' : 'normal' })));
                                                }
                                                if (selectedShapeIds.length > 0) {
                                                    setShapeObjects(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, fontWeight: newVal ? 'bold' : 'normal' } : s));
                                                }
                                            }}
                                            className={`w-7 h-7 flex items-center justify-center rounded font-bold text-xs transition ${isBold ? 'bg-primary-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
                                            title="Bold"
                                        >B</button>

                                        {/* Italic */}
                                        <button
                                            onClick={() => {
                                                const newVal = !isItalic;
                                                setIsItalic(newVal);
                                                const targets = editingTextId ? [editingTextId] : selectedTextIds;
                                                if (targets.length > 0) {
                                                    setTextObjects(prev => prev.map(t => targets.includes(t.id) ? { ...t, fontStyle: newVal ? 'italic' : 'normal' } : t));
                                                } else {
                                                    setTextObjects(prev => prev.map(t => ({ ...t, fontStyle: newVal ? 'italic' : 'normal' })));
                                                }
                                                if (selectedShapeIds.length > 0) {
                                                    setShapeObjects(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, fontStyle: newVal ? 'italic' : 'normal' } : s));
                                                }
                                            }}
                                            className={`w-7 h-7 flex items-center justify-center rounded italic text-xs transition ${isItalic ? 'bg-primary-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
                                            title="Italic"
                                        >I</button>

                                        <div className="w-px h-5 bg-slate-700" />

                                        {/* Background / Fill Colors */}
                                        <div className="flex items-center gap-1">
                                            {['transparent', '#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff', '#fed7aa', '#cbd5e1'].map(bg => (
                                                <button
                                                    key={bg}
                                                    onClick={() => {
                                                        setTextBgColor(bg);
                                                        const targets = editingTextId ? [editingTextId] : selectedTextIds;
                                                        if (targets.length > 0) {
                                                            setTextObjects(prev => prev.map(t => targets.includes(t.id) ? { ...t, bgColor: bg } : t));
                                                        }
                                                        if (selectedShapeIds.length > 0) {
                                                            setShapeObjects(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, fillColor: bg } : s));
                                                        }
                                                    }}
                                                    className={`w-5 h-5 rounded-full border-2 transition ${textBgColor === bg ? 'border-primary-500 scale-110' : 'border-slate-600 hover:border-slate-400'}`}
                                                    style={{ backgroundColor: bg === 'transparent' ? '#334155' : bg }}
                                                    title={bg === 'transparent' ? 'No Background' : `Set Background (${bg})`}
                                                >
                                                    {bg === 'transparent' && <span className="text-[8px] text-slate-400 block -mt-0.5">🚫</span>}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="w-px h-5 bg-slate-700" />
                                        <div className="flex items-center gap-1 text-[11px] text-slate-300">
                                            <span className="text-[10px] text-slate-400">Border:</span>
                                            {[0, 1, 2, 4].map(bw => (
                                                <button
                                                    key={bw}
                                                    type="button"
                                                    onClick={() => {
                                                        const targets = editingTextId ? [editingTextId] : selectedTextIds;
                                                        if (targets.length > 0) {
                                                            setTextObjects(prev => prev.map(t => targets.includes(t.id) ? { ...t, borderWidth: bw, borderColor: t.borderColor || '#3b82f6', borderStyle: t.borderStyle || 'solid' } : t));
                                                        }
                                                    }}
                                                    className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-200"
                                                    title={`Border ${bw === 0 ? 'None' : bw + 'px'}`}
                                                >
                                                    {bw === 0 ? 'None' : `${bw}px`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {tool === t.id && t.id === 'shape' && showShapePicker && (
                                    <div className={`absolute ${popoverPos} p-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 grid grid-cols-3 gap-1 w-[180px]`}>
                                        {[
                                            { id: 'rectangle', icon: RectangleHorizontal, label: 'Rectangle' },
                                            { id: 'rounded_rect', icon: RectangleHorizontal, label: 'Rounded' },
                                            { id: 'circle', icon: Circle, label: 'Circle' },
                                            { id: 'triangle', icon: Triangle, label: 'Triangle' },
                                            { id: 'diamond', icon: Diamond, label: 'Diamond' },
                                            { id: 'star', icon: Star, label: 'Star' },
                                            { id: 'hexagon', icon: Hexagon, label: 'Hexagon' },
                                            { id: 'arc', icon: Spline, label: 'Curved Arc' },
                                            { id: 'cloud', icon: Cloud, label: 'Cloud' },
                                            { id: 'sticky_note', icon: StickyNoteIcon, label: 'Sticky Note' },
                                            { id: 'graph', icon: LineChart, label: '2D Graph' },
                                            { id: 'ruler', icon: Ruler, label: 'Ruler' },
                                            { id: 'protractor', icon: Compass, label: 'Protractor' },
                                        ].map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => {
                                                    if (s.id === 'sticky_note') {
                                                        const wrapper = canvasWrapperRef.current;
                                                        const cx = wrapper ? wrapper.clientWidth / 2 - 100 : 200;
                                                        const cy = wrapper ? wrapper.clientHeight / 2 - 100 : 200;
                                                        const newNote = createStickyNoteObject(cx, cy, 'yellow');
                                                        setPageShapeObjects(prev => ({
                                                            ...prev,
                                                            [currentPage]: [...(prev[currentPage] || []), newNote]
                                                        }));
                                                        setTool('select');
                                                        setSelectedShapeIds([newNote.id]);
                                                        toast.success('Sticky note added!', { icon: '📝' });
                                                    } else {
                                                        setShapeType(s.id);
                                                    }
                                                    setShowShapePicker(false);
                                                }}
                                                className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-xs transition gap-0.5 ${shapeType === s.id ? 'bg-primary-500/20 text-primary-400' : 'text-slate-300 hover:bg-slate-700'}`}
                                                title={s.label}
                                            >
                                                <s.icon className="w-4 h-4" />
                                                <span className="text-[8.5px] truncate w-full text-center leading-tight">{s.label}</span>
                                            </button>
                                        ))}

                                        {/* Domain Symbols Library Button */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowShapePicker(false);
                                                setShowDomainLibrary(true);
                                            }}
                                            className="col-span-3 mt-1 py-1.5 px-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 hover:text-white flex items-center justify-center gap-1.5 text-[11px] font-medium transition shadow-sm"
                                        >
                                            <Library className="w-3.5 h-3.5 text-indigo-400" />
                                            <span>Domain Symbols Library</span>
                                        </button>
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
                    </div>

                    {/* Divider */}
                    <div className={`${isVertical ? 'w-6 h-px my-0.5' : 'w-px h-4 mx-1'} bg-slate-700/60 shrink-0`} />

                    {/* Colors & Style */}
                    <div className={`flex ${isVertical ? 'flex-col gap-1' : 'items-center gap-0.5'} relative`}>
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
                            <div className={`absolute ${popoverPos} p-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 w-[220px]`}>
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
                            <div className={`absolute ${popoverPos} p-4 bg-white rounded-lg shadow-xl border border-slate-200 z-50 w-72`}>
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
                                <div className={`absolute ${popoverPos} p-2 bg-slate-850 bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-700/80 z-50 w-36`}>
                                    <div className="flex flex-col gap-1">
                                        {[
                                            {
                                                id: 'solid',
                                                label: 'Solid',
                                                icon: (
                                                    <svg className="w-16 h-2 text-current" viewBox="0 0 64 8" fill="none">
                                                        <line x1="2" y1="4" x2="62" y2="4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                                    </svg>
                                                )
                                            },
                                            {
                                                id: 'dashed',
                                                label: 'Dashed',
                                                icon: (
                                                    <svg className="w-16 h-2 text-current" viewBox="0 0 64 8" fill="none">
                                                        <line x1="2" y1="4" x2="62" y2="4" stroke="currentColor" strokeWidth="3" strokeDasharray="8,5" strokeLinecap="round" />
                                                    </svg>
                                                )
                                            },
                                            {
                                                id: 'dotted',
                                                label: 'Dotted',
                                                icon: (
                                                    <svg className="w-16 h-2 text-current" viewBox="0 0 64 8" fill="none">
                                                        <line x1="2" y1="4" x2="62" y2="4" stroke="currentColor" strokeWidth="3" strokeDasharray="2.5,5" strokeLinecap="round" />
                                                    </svg>
                                                )
                                            }
                                        ].map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => { setStrokeStyle(item.id); setShowStrokeStylePicker(false); }}
                                                className={`flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-700/70 rounded-lg text-xs transition ${strokeStyle === item.id ? 'bg-indigo-600/30 text-indigo-400 font-semibold border border-indigo-500/40' : 'text-slate-300'}`}
                                                title={item.label}
                                            >
                                                <span className="text-[11px] capitalize">{item.label}</span>
                                                <div className="flex items-center ml-2">{item.icon}</div>
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
                            <div className={`absolute ${popoverPos} p-3 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 w-48 text-slate-200`}>
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
                                        '#ffffff', '#f5f5f5', '#e0e0e0', '#9e9e9e', '#424242',
                                        '#fff9c4', '#fff176', '#ffeb3b', '#ffc107', '#ff9800',
                                        '#c8e6c9', '#81c784', '#4caf50', '#2e7d32', '#1b5e20',
                                        '#bbdefb', '#64b5f6', '#2196f3', '#1565c0', '#0d47a1',
                                        '#f8bbd0', '#f06292', '#e91e63', '#ad1457', '#880e4f',
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

                    {/* Divider */}
                    <div className={`${isVertical ? 'w-6 h-px my-0.5' : 'w-px h-4 mx-1'} bg-slate-700/60 shrink-0`} />

                    {/* Undo/Redo */}
                    <div className={`flex ${isVertical ? 'flex-col gap-0.5' : 'items-center gap-0.5'}`}>
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

                    {/* Divider */}
                    <div className={`${isVertical ? 'w-6 h-px my-0.5' : 'w-px h-4 mx-1'} bg-slate-700/60 shrink-0`} />

                    {/* Page Navigation */}
                    <div className={`flex ${isVertical ? 'flex-col gap-0.5 p-1 rounded-xl' : 'items-center gap-0.5 px-1 py-0.5 rounded-full'} bg-slate-800/80`}>
                        <button
                            onClick={goToPrevPage}
                            disabled={currentPage === 0}
                            className="p-1 hover:bg-slate-700 rounded-full transition disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white"
                            title="Previous Page"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className={`text-[10px] font-medium text-slate-300 ${isVertical ? 'text-center' : 'min-w-[36px] text-center tracking-wider'}`}>
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
                            className="p-1 hover:bg-green-500/20 text-green-400 rounded-full transition"
                            title="Add New Page"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Divider */}
                    <div className={`${isVertical ? 'w-6 h-px my-0.5' : 'w-px h-4 mx-1'} bg-slate-700/60 shrink-0`} />

                    {/* Sharing, Download & Save (Tight grouped) */}
                    <div className={`flex ${isVertical ? 'flex-col gap-1' : 'items-center gap-0.5'}`}>
                        {isInstructor && !isMeetingMode && (
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
                            onClick={() => setShowExportModal(true)}
                            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition flex items-center justify-center"
                            title="Export & Share Whiteboard (WBF, IWB, PDF, Images, QR Code)"
                        >
                            <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                            onClick={handleScreenshot}
                            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition flex items-center justify-center"
                            title="Take Screenshot (Selection or Full Page)"
                        >
                            <Camera className="w-3.5 h-3.5" />
                        </button>
                        {!isStudent && (
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
                        )}
                        <button
                            onClick={() => {
                                const next = { bottom: 'float', float: 'top', top: 'right', right: 'left', left: 'bottom' };
                                const newDock = next[toolbarDock] || 'bottom';
                                setToolbarDock(newDock);
                                toast(`Whiteboard toolbar: ${newDock.toUpperCase()}`, { duration: 1500 });
                            }}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition flex items-center justify-center shrink-0"
                            title={`Dock Mode: ${toolbarDock.toUpperCase()} (Click to cycle Bottom/Float/Top/Right/Left)`}
                        >
                            <Move className="w-3.5 h-3.5 text-primary-400" />
                        </button>
                    </div>
                </div>
                );
            })()}
                
                {/* Advanced Movable & Collapsible Multi-Object Clipboard Panel */}
                <WhiteboardClipboardPanel
                    isOpen={showClipboard && clipboardHistory.length > 0}
                    onClose={() => setShowClipboard(false)}
                    clipboardHistory={clipboardHistory}
                    onPasteItem={(item) => handlePasteItem(item)}
                    onDeleteItem={(id) => setClipboardHistory(prev => prev.filter(item => item.id !== id))}
                    onClearClipboard={() => {
                        setClipboardHistory([]);
                        setShowClipboard(false);
                    }}
                />

            {/* Canvas */}
            <div className={`flex-1 overflow-hidden p-2 sm:p-4 bg-slate-100 flex items-center justify-center relative touch-none select-none overscroll-none whiteboard-canvas-wrapper ${isFullscreen ? 'h-full' : ''}`}>

                <div 
                    ref={canvasWrapperRef}
                    className={`relative rounded-lg shadow-lg overflow-hidden touch-none select-none overscroll-none transition-all duration-300 ${
                        !isStateLoaded ? 'filter blur-sm pointer-events-none select-none opacity-80' : 'filter-none opacity-100'
                    }`}
                    style={{
                        width: canvasWidth,
                        height: canvasHeight,
                        transform: isFullscreen 
                            ? `scale(${fullscreenScale * zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)` 
                            : `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                        transformOrigin: 'center center',
                        backgroundColor: bgColor,
                        touchAction: 'none',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        WebkitTouchCallout: 'none',
                        overscrollBehavior: 'none',
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
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerCancel}
                        onPointerLeave={handlePointerLeave}
                        onClick={handleCanvasClick}
                    >
                    <canvas
                        ref={canvasRef}
                        id="main-whiteboard-canvas"
                        data-whiteboard-canvas="true"
                        width={canvasWidth}
                        height={canvasHeight}
                        className="whiteboard-canvas absolute inset-0 touch-none pointer-events-none select-none"
                        style={{
                            zIndex: 50,
                            backgroundColor: 'transparent',
                            touchAction: 'none'
                        }}
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
                            {tool === 'line' && (() => {
                                const isCurvedConn = lineType === 'connector_curved' && !isShiftDown;
                                const isElbowConn = lineType === 'connector_elbow' && !isShiftDown;
                                let endPt = currentPos;
                                if (isShiftDown) {
                                    const dx = currentPos.x - startPos.x;
                                    const dy = currentPos.y - startPos.y;
                                    const angle = Math.atan2(dy, dx);
                                    const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
                                    const dist = Math.hypot(dx, dy);
                                    endPt = {
                                        x: startPos.x + Math.cos(snapAngle) * dist,
                                        y: startPos.y + Math.sin(snapAngle) * dist
                                    };
                                }
                                if (isCurvedConn) {
                                    return (
                                        <g>
                                            <path
                                                d={getConnectorPath(startPos, endPt, 'curved', null)}
                                                fill="none"
                                                stroke={color}
                                                strokeWidth={strokeWidth}
                                                strokeDasharray="5,5"
                                                strokeLinecap="round"
                                            />
                                            {renderArrowhead('arrow', endPt, calculateAngle(startPos, endPt), strokeWidth * 4, color)}
                                        </g>
                                    );
                                }
                                if (isElbowConn) {
                                    return (
                                        <g>
                                            <path
                                                d={getConnectorPath(startPos, endPt, 'orthogonal', null)}
                                                fill="none"
                                                stroke={color}
                                                strokeWidth={strokeWidth}
                                                strokeDasharray="5,5"
                                                strokeLinecap="round"
                                            />
                                            {renderArrowhead('arrow', endPt, calculateAngle(startPos, endPt), strokeWidth * 4, color)}
                                        </g>
                                    );
                                }
                                return (
                                    <g>
                                        <line
                                            x1={startPos.x}
                                            y1={startPos.y}
                                            x2={endPt.x}
                                            y2={endPt.y}
                                            stroke={color}
                                            strokeWidth={strokeWidth}
                                            strokeDasharray="5,5"
                                            strokeLinecap="round"
                                        />
                                        {(lineType === 'arrow' || lineType === 'connector_straight' || (isShiftDown && lineType.startsWith('connector'))) && (
                                            renderArrowhead('arrow', endPt, calculateAngle(startPos, endPt), strokeWidth * 4, color)
                                        )}
                                    </g>
                                );
                            })()}
                            {tool === 'arrow' && (() => {
                                let endPt = currentPos;
                                if (isShiftDown) {
                                    const dx = currentPos.x - startPos.x;
                                    const dy = currentPos.y - startPos.y;
                                    const angle = Math.atan2(dy, dx);
                                    const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
                                    const dist = Math.hypot(dx, dy);
                                    endPt = {
                                        x: startPos.x + Math.cos(snapAngle) * dist,
                                        y: startPos.y + Math.sin(snapAngle) * dist
                                    };
                                }
                                const headLength = strokeWidth * 4;
                                const angle = Math.atan2(endPt.y - startPos.y, endPt.x - startPos.x);
                                const p1 = `${endPt.x},${endPt.y}`;
                                const p2 = `${endPt.x - headLength * Math.cos(angle - Math.PI / 6)},${endPt.y - headLength * Math.sin(angle - Math.PI / 6)}`;
                                const p3 = `${endPt.x - headLength * Math.cos(angle + Math.PI / 6)},${endPt.y - headLength * Math.sin(angle + Math.PI / 6)}`;
                                return (
                                    <g>
                                        <line
                                            x1={startPos.x}
                                            y1={startPos.y}
                                            x2={endPt.x}
                                            y2={endPt.y}
                                            stroke={color}
                                            strokeWidth={strokeWidth}
                                            strokeDasharray="5,5"
                                            strokeLinecap="round"
                                        />
                                        <polygon points={`${p1} ${p2} ${p3}`} fill={color} opacity={0.5} />
                                    </g>
                                );
                            })()}
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
                            {tool === 'circle' && (() => {
                                let w = Math.abs(currentPos.x - startPos.x);
                                let h = Math.abs(currentPos.y - startPos.y);
                                if (isShiftDown) {
                                    const size = Math.max(w, h);
                                    w = size;
                                    h = size;
                                }
                                const rx = w / 2;
                                const ry = h / 2;
                                const cx = currentPos.x < startPos.x ? startPos.x - rx : startPos.x + rx;
                                const cy = currentPos.y < startPos.y ? startPos.y - ry : startPos.y + ry;
                                return (
                                    <ellipse
                                        cx={cx}
                                        cy={cy}
                                        rx={rx}
                                        ry={ry}
                                        stroke={color}
                                        strokeWidth={strokeWidth}
                                        strokeDasharray="5,5"
                                        fill="none"
                                    />
                                );
                            })()}
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
                        const isSelected = selectedImageIds.includes(imgObj.id);
                        const handleSize = 10;
                        const canInteract = tool === 'select' || isSelected || tool === 'pan';

                        // Calculate unrotated bounding box center and top for floating toolbar
                        const cx = (imgObj.x || 0) + (imgObj.width || 100) / 2;
                        const cy = (imgObj.y || 0) + (imgObj.height || 100) / 2;
                        const rad = ((imgObj.rotation || 0) * Math.PI) / 180;
                        const cos = Math.cos(rad);
                        const sin = Math.sin(rad);
                        const halfW = (imgObj.width || 100) / 2;
                        const halfH = (imgObj.height || 100) / 2;
                        const corners = [
                            { dx: -halfW, dy: -halfH },
                            { dx: halfW, dy: -halfH },
                            { dx: halfW, dy: halfH },
                            { dx: -halfW, dy: halfH }
                        ].map(p => ({
                            x: cx + p.dx * cos - p.dy * sin,
                            y: cy + p.dx * sin + p.dy * cos
                        }));
                        const imgMinY = Math.min(...corners.map(c => c.y));

                        const handleStartMove = (e) => {
                            if (!canUserDraw) return;
                            e.stopPropagation();
                            if (e.target.dataset?.handle) return;
                            
                            const isMulti = e.ctrlKey || e.metaKey;
                            let activeImageIds = selectedImageIds;
                            if (isMulti) {
                                if (selectedImageIds.includes(imgObj.id)) {
                                    activeImageIds = selectedImageIds.filter(id => id !== imgObj.id);
                                } else {
                                    activeImageIds = [...selectedImageIds, imgObj.id];
                                }
                                setSelectedImageIds(activeImageIds);
                            } else {
                                if (!selectedImageIds.includes(imgObj.id)) {
                                    activeImageIds = [imgObj.id];
                                    setSelectedImageIds(activeImageIds);
                                    setSelectedShapeIds([]);
                                    setSelectedTextIds([]);
                                    setSelected3DId(null);
                                    setSelectedMediaId(null);
                                }
                            }
                            if (imgObj.isLocked) return;
                            if (removingBgImageId === imgObj.id) return; // Action lock during background removal

                            const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                            const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

                            // Infinite Cloner drag-to-clone behavior
                            if (imgObj.isInfiniteCloner) {
                                const cloneId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
                                const cloneObj = { ...imgObj, id: cloneId, isInfiniteCloner: false };
                                setImageObjects(prev => [...prev, cloneObj]);
                                setSelectedImageIds([cloneId]);
                                setSelectedImageId(cloneId);
                                setImageDragState({
                                    id: cloneId,
                                    action: 'move',
                                    startX: clientX,
                                    startY: clientY,
                                    startObj: { ...cloneObj },
                                    startImageObjs: [cloneObj],
                                    startShapeObjs: [],
                                    startTextObjs: []
                                });
                                return;
                            }

                            setImageDragState({
                                id: imgObj.id,
                                action: 'move',
                                startX: clientX,
                                startY: clientY,
                                startObj: { ...imgObj },
                                startImageObjs: imageObjects.filter(img => activeImageIds.includes(img.id) && !img.isLocked),
                                startShapeObjs: shapeObjects.filter(shp => selectedShapeIds.includes(shp.id) && !shp.isLocked),
                                startTextObjs: textObjects.filter(txt => selectedTextIds.includes(txt.id) && !txt.isLocked)
                            });
                        };

                        return (
                            <div key={imgObj.id}>
                                <div
                                    className="whiteboard-image-item absolute select-none"
                                    style={{
                                        left: imgObj.x,
                                        top: imgObj.y,
                                        width: imgObj.width,
                                        height: imgObj.height,
                                        zIndex: imgObj.zIndex || (isSelected ? 25 : 10),
                                        transform: `rotate(${imgObj.rotation || 0}deg)`,
                                        transformOrigin: 'center center',
                                        cursor: isSelected ? 'move' : (tool === 'select' ? 'pointer' : 'default'),
                                        pointerEvents: canInteract ? 'auto' : ((tool === 'pen' || tool === 'eraser' || tool === 'highlighter') && !isSelected ? 'none' : 'auto'),
                                        touchAction: 'none'
                                    }}
                                    onMouseEnter={() => setHoveredImageId(imgObj.id)}
                                    onMouseLeave={() => setHoveredImageId(null)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (e.ctrlKey || e.metaKey) {
                                            setSelectedImageIds(prev => prev.includes(imgObj.id) ? prev.filter(id => id !== imgObj.id) : [...prev, imgObj.id]);
                                        } else {
                                            setSelectedImageIds([imgObj.id]);
                                            setSelectedShapeIds([]);
                                            setSelectedTextIds([]);
                                        }
                                    }}
                                    onMouseDown={handleStartMove}
                                    onPointerDown={handleStartMove}
                                >
                                    {/* Sharpness SVG convolution filter */}
                                    {(imgObj.sharpness || 0) > 0 && (
                                        <svg className="hidden absolute" width="0" height="0">
                                            <filter id={`sharpness-${imgObj.id}`}>
                                                <feConvolveMatrix
                                                    order="3"
                                                    kernelMatrix={`0 ${-(imgObj.sharpness || 0) * 0.15} 0 ${-(imgObj.sharpness || 0) * 0.15} ${1 + (imgObj.sharpness || 0) * 0.6} ${-(imgObj.sharpness || 0) * 0.15} 0 ${-(imgObj.sharpness || 0) * 0.15} 0`}
                                                    preserveAlpha="true"
                                                />
                                            </filter>
                                        </svg>
                                    )}
                                    {/* Image with flip, border, and filters */}
                                    <img
                                        src={imgObj.src}
                                        alt="Inserted"
                                        className="w-full h-full object-contain pointer-events-none select-none box-border"
                                        style={{
                                            transform: `${imgObj.flipX ? 'scaleX(-1)' : ''} ${imgObj.flipY ? 'scaleY(-1)' : ''}`.trim() || undefined,
                                            filter: `${(imgObj.sharpness || 0) > 0 ? `url(#sharpness-${imgObj.id}) ` : ''}brightness(${imgObj.brightness ?? 100}%) contrast(${imgObj.contrast ?? 100}%) saturate(${imgObj.saturation ?? 100}%) opacity(${(imgObj.opacity ?? 100) / 100}) blur(${imgObj.blur ?? 0}px)`,
                                            border: imgObj.borderWidth ? `${imgObj.borderWidth}px ${imgObj.borderStyle || 'solid'} ${imgObj.borderColor || '#3b82f6'}` : undefined,
                                            borderRadius: imgObj.borderRadius ? `${imgObj.borderRadius}px` : undefined,
                                            boxSizing: 'border-box'
                                        }}
                                        draggable={false}
                                    />

                                    {/* Loading Progress Spinner during Background Removal */}
                                    {removingBgImageId === imgObj.id && (
                                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs rounded flex flex-col items-center justify-center text-white pointer-events-auto z-40 animate-in fade-in duration-150">
                                            <Loader2 className="w-6 h-6 animate-spin text-primary-400 mb-1" />
                                            <span className="text-[11px] font-semibold tracking-wide">Removing background...</span>
                                        </div>
                                    )}

                                    {/* Infinite Cloner Badge */}
                                    {imgObj.isInfiniteCloner && (
                                        <div className="absolute top-1 left-1 bg-indigo-600/90 text-white rounded-full px-1.5 py-0.5 text-[9px] font-extrabold flex items-center gap-0.5 shadow pointer-events-none z-30">
                                            <span>∞</span>
                                        </div>
                                    )}

                                    {/* Magnetic Connector Hooks (N, E, S, W, Center) */}
                                    {(isSelected || tool === 'line' || hoveredImageId === imgObj.id) && !imgObj.isLocked && (
                                        <>
                                            {[
                                                { anchor: 'top', label: 'N', style: { left: '50%', top: 0 } },
                                                { anchor: 'right', label: 'E', style: { left: '100%', top: '50%' } },
                                                { anchor: 'bottom', label: 'S', style: { left: '50%', top: '100%' } },
                                                { anchor: 'left', label: 'W', style: { left: 0, top: '50%' } },
                                                { anchor: 'center', label: 'C', style: { left: '50%', top: '50%' } },
                                            ].map(({ anchor, label, style }) => (
                                                <div
                                                    key={anchor}
                                                    className="image-magnetic-hook absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 border-2 border-white shadow-md hover:bg-blue-600 hover:scale-125 transition-all z-35 flex items-center justify-center cursor-crosshair group/imghook"
                                                    style={{ ...style, pointerEvents: 'auto' }}
                                                    title={`Connect from ${anchor.toUpperCase()} hook (Hover to select style, drag to link)`}
                                                    onPointerEnter={() => {
                                                        if (hookHoverTimeoutRef.current) clearTimeout(hookHoverTimeoutRef.current);
                                                        setHoveredHook({ shapeId: imgObj.id, anchor });
                                                    }}
                                                    onPointerLeave={() => {
                                                        hookHoverTimeoutRef.current = setTimeout(() => {
                                                            setHoveredHook(null);
                                                        }, 700);
                                                    }}
                                                    onPointerDown={(e) => {
                                                        startConnectorDrag(imgObj, anchor, activeConnectorPreset, e);
                                                    }}
                                                >
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white pointer-events-none" />

                                                    {/* Hover Style Popover */}
                                                    {hoveredHook?.shapeId === imgObj.id && hoveredHook?.anchor === anchor && (
                                                        <div
                                                            className={`connector-hover-popover absolute z-50 flex items-center gap-1 bg-slate-900/95 backdrop-blur-sm border border-slate-700 shadow-2xl rounded-xl p-1 text-white animate-in fade-in zoom-in-95 duration-150 before:content-[''] before:absolute before:-inset-3 before:z-[-1] ${
                                                                anchor === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' :
                                                                anchor === 'bottom' ? 'top-full mt-2 left-1/2 -translate-x-1/2' :
                                                                anchor === 'left' ? 'right-full mr-2 top-1/2 -translate-y-1/2' :
                                                                'left-full ml-2 top-1/2 -translate-y-1/2'
                                                            }`}
                                                            style={{ pointerEvents: 'auto' }}
                                                            onPointerEnter={() => {
                                                                if (hookHoverTimeoutRef.current) clearTimeout(hookHoverTimeoutRef.current);
                                                            }}
                                                            onPointerLeave={() => {
                                                                hookHoverTimeoutRef.current = setTimeout(() => {
                                                                    setHoveredHook(null);
                                                                }, 700);
                                                            }}
                                                            onPointerDown={(e) => e.stopPropagation()}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {CONNECTOR_PRESET_STYLES.map((preset) => (
                                                                <button
                                                                    key={preset.id}
                                                                    type="button"
                                                                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all cursor-grab active:cursor-grabbing group/btn ${
                                                                        activeConnectorPreset?.id === preset.id 
                                                                            ? 'bg-blue-600 text-white shadow' 
                                                                            : 'hover:bg-slate-700 text-slate-300 hover:text-white'
                                                                    }`}
                                                                    title={`${preset.label} (Click to set active, drag to connect)`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActiveConnectorPreset(preset);
                                                                    }}
                                                                    onPointerDown={(e) => {
                                                                        setActiveConnectorPreset(preset);
                                                                        startConnectorDrag(imgObj, anchor, preset, e);
                                                                    }}
                                                                >
                                                                    {preset.icon}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* Selection Border & Handles */}
                                    {isSelected && (
                                        <>
                                            <div className="absolute inset-0 border-2 border-indigo-500 rounded-sm pointer-events-none shadow-sm" />
                                            <div 
                                                className="absolute inset-0" 
                                                style={{ pointerEvents: 'auto', cursor: 'move', touchAction: 'none' }} 
                                                onMouseDown={handleStartMove}
                                                onPointerDown={handleStartMove}
                                            />

                                            {/* Top-Right Corner Lock Hook */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleLock(imgObj.id);
                                                }}
                                                className={`absolute -top-3.5 -right-3.5 z-50 p-1 rounded shadow border transition-all pointer-events-auto cursor-pointer ${
                                                    imgObj.isLocked
                                                        ? 'opacity-85 hover:opacity-100 bg-amber-600/90 border-amber-400 text-white scale-105'
                                                        : 'opacity-35 hover:opacity-100 bg-slate-900/90 hover:bg-slate-900 border-slate-700/70 text-slate-300 hover:text-white hover:scale-110'
                                                }`}
                                                title={imgObj.isLocked ? "Image Locked (Click to Unlock)" : "Image Unlocked (Click to Lock)"}
                                            >
                                                {imgObj.isLocked ? <Lock size={12} className="text-amber-200" /> : <Unlock size={12} />}
                                            </button>

                                            {/* Top-Left Corner Infinite Cloner Interactive Toggle */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setImageObjects(prev => prev.map(i => i.id === imgObj.id ? { ...i, isInfiniteCloner: !i.isInfiniteCloner } : i));
                                                }}
                                                className={`absolute -top-3.5 -left-3.5 z-50 p-1 rounded shadow border transition-all pointer-events-auto cursor-pointer ${
                                                    imgObj.isInfiniteCloner
                                                        ? 'opacity-100 bg-indigo-600 border-indigo-400 text-white scale-105 shadow-indigo-500/50'
                                                        : 'opacity-35 hover:opacity-100 bg-slate-900/90 hover:bg-slate-900 border-slate-700/70 text-slate-300 hover:text-white hover:scale-110'
                                                }`}
                                                title={imgObj.isInfiniteCloner ? "Infinite Copy ON (Click to Turn OFF)" : "Infinite Copy OFF (Click to Turn ON)"}
                                            >
                                                <InfinityIcon size={12} />
                                            </button>

                                            {/* East-Side 4 Layer Hooks */}
                                            <div
                                                className="absolute -right-7 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-50 pointer-events-auto opacity-35 hover:opacity-100 transition-all select-none"
                                                onClick={e => e.stopPropagation()}
                                                onMouseDown={e => e.stopPropagation()}
                                                onPointerDown={e => e.stopPropagation()}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => handleBringToFront(imgObj.id)}
                                                    className="p-1 bg-slate-900/90 hover:bg-slate-900 border border-slate-700/70 hover:border-slate-500 rounded text-slate-300 hover:text-white hover:scale-110 transition shadow-md"
                                                    title="Bring to Front"
                                                >
                                                    <ChevronsUp size={12} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleBringForward(imgObj.id)}
                                                    className="p-1 bg-slate-900/90 hover:bg-slate-900 border border-slate-700/70 hover:border-slate-500 rounded text-slate-300 hover:text-white hover:scale-110 transition shadow-md"
                                                    title="Bring Forward"
                                                >
                                                    <ChevronUp size={12} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSendBackward(imgObj.id)}
                                                    className="p-1 bg-slate-900/90 hover:bg-slate-900 border border-slate-700/70 hover:border-slate-500 rounded text-slate-300 hover:text-white hover:scale-110 transition shadow-md"
                                                    title="Send Backward"
                                                >
                                                    <ChevronDown size={12} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSendToBack(imgObj.id)}
                                                    className="p-1 bg-slate-900/90 hover:bg-slate-900 border border-slate-700/70 hover:border-slate-500 rounded text-slate-300 hover:text-white hover:scale-110 transition shadow-md"
                                                    title="Send to Back"
                                                >
                                                    <ChevronsDown size={12} />
                                                </button>
                                            </div>

                                            {/* Corner Delete X Button */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setImageObjects(prev => prev.filter(i => i.id !== imgObj.id));
                                                    setSelectedImageId(null);
                                                }}
                                                className="absolute -top-3.5 right-4 w-5 h-5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg border border-white/60 z-50 pointer-events-auto cursor-pointer transition-transform hover:scale-110 active:scale-95 opacity-60 hover:opacity-100"
                                                title="Delete Image"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>

                                            {!imgObj.isLocked && (
                                                <>
                                                    {/* Corner Resize Handles */}
                                                    {['nw', 'ne', 'sw', 'se'].map(corner => {
                                                        const pos = {
                                                            nw: { left: -handleSize / 2, top: -handleSize / 2, cursor: 'nwse-resize' },
                                                            ne: { right: -handleSize / 2, top: -handleSize / 2, cursor: 'nesw-resize' },
                                                            sw: { left: -handleSize / 2, bottom: -handleSize / 2, cursor: 'nesw-resize' },
                                                            se: { right: -handleSize / 2, bottom: -handleSize / 2, cursor: 'nwse-resize' },
                                                        }[corner];

                                                        const handleResizeStart = (e) => {
                                                            e.stopPropagation();
                                                            if (e.cancelable) e.preventDefault();
                                                            const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                                                            const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                                                            setImageDragState({
                                                                id: imgObj.id,
                                                                action: `resize-${corner}`,
                                                                startX: clientX,
                                                                startY: clientY,
                                                                startObj: { ...imgObj }
                                                            });
                                                        };

                                                        return (
                                                            <div
                                                                key={corner}
                                                                data-handle={corner}
                                                                className="absolute bg-white border-2 border-indigo-600 rounded-sm shadow-md z-30"
                                                                style={{
                                                                    width: handleSize + 2,
                                                                    height: handleSize + 2,
                                                                    touchAction: 'none',
                                                                    pointerEvents: 'auto',
                                                                    ...pos,
                                                                }}
                                                                onMouseDown={handleResizeStart}
                                                                onPointerDown={handleResizeStart}
                                                                onTouchStart={handleResizeStart}
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

                                                        const handleEdgeResizeStart = (e) => {
                                                            e.stopPropagation();
                                                            if (e.cancelable) e.preventDefault();
                                                            const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                                                            const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                                                            setImageDragState({
                                                                id: imgObj.id,
                                                                action: `resize-${edge}`,
                                                                startX: clientX,
                                                                startY: clientY,
                                                                startObj: { ...imgObj }
                                                            });
                                                        };

                                                        return (
                                                            <div
                                                                key={edge}
                                                                data-handle={edge}
                                                                className="absolute bg-white border-2 border-indigo-600 rounded-sm shadow-md z-30"
                                                                style={{
                                                                    width: handleSize,
                                                                    height: handleSize,
                                                                    touchAction: 'none',
                                                                    pointerEvents: 'auto',
                                                                    ...pos,
                                                                }}
                                                                onMouseDown={handleEdgeResizeStart}
                                                                onPointerDown={handleEdgeResizeStart}
                                                                onTouchStart={handleEdgeResizeStart}
                                                            />
                                                        );
                                                    })}

                                                    {/* Rotate Handle */}
                                                    <div
                                                        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center z-30"
                                                        style={{ top: -35, pointerEvents: 'auto' }}
                                                    >
                                                        <div className="w-px h-5 bg-indigo-500" />
                                                        <div
                                                            data-handle="rotate"
                                                            className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center cursor-grab hover:bg-indigo-700 shadow-md transition-transform hover:scale-110 active:cursor-grabbing"
                                                            style={{ cursor: 'grab', touchAction: 'none', pointerEvents: 'auto' }}
                                                            onMouseDown={(e) => {
                                                                e.stopPropagation();
                                                                const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                                                                const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                                                                setImageDragState({
                                                                    id: imgObj.id,
                                                                    action: 'rotate',
                                                                    startX: clientX,
                                                                    startY: clientY,
                                                                    startObj: { ...imgObj }
                                                                });
                                                            }}
                                                            onPointerDown={(e) => {
                                                                e.stopPropagation();
                                                                const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                                                                const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                                                                setImageDragState({
                                                                    id: imgObj.id,
                                                                    action: 'rotate',
                                                                    startX: clientX,
                                                                    startY: clientY,
                                                                    startObj: { ...imgObj }
                                                                });
                                                            }}
                                                        >
                                                            <RotateCw className="w-3.5 h-3.5" />
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Static Unrotated Floating Toolbar & Adjustments Popover positioned cleanly above rotated bounding box */}
                                {isSelected && (selectedImageId === imgObj.id) && (
                                    <div
                                        className="absolute pointer-events-auto select-none"
                                        style={{
                                            left: cx,
                                            top: imgMinY - 14,
                                            transform: 'translate(-50%, -100%)',
                                            zIndex: 60,
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onPointerDown={(e) => e.stopPropagation()}
                                    >
                                        {/* Image Quick Actions Toolbar */}
                                        <div className="flex items-center gap-1 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl px-2 py-1 text-slate-200">
                                            <button
                                                type="button"
                                                onClick={() => updateSelectedImageFilters({ flipX: !imgObj.flipX })}
                                                className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${imgObj.flipX ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                                                title="Flip Horizontally"
                                            >
                                                <FlipHorizontal className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateSelectedImageFilters({ flipY: !imgObj.flipY })}
                                                className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${imgObj.flipY ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                                                title="Flip Vertically"
                                            >
                                                <FlipVertical className="w-3.5 h-3.5" />
                                            </button>
                                            <div className="w-px h-4 bg-slate-700 mx-0.5" />
                                            {/* Remove Background Button */}
                                            <button
                                                type="button"
                                                disabled={removingBgImageId === imgObj.id}
                                                onClick={() => handleRemoveImageBackground(imgObj)}
                                                className={`h-6 px-2 flex items-center gap-1.5 rounded text-[10.5px] font-medium transition shadow-xs ${removingBgImageId === imgObj.id ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-400' : 'bg-indigo-600/30 hover:bg-indigo-600/60 text-indigo-300 hover:text-white'}`}
                                                title="Remove Image Background (Make Transparent)"
                                            >
                                                <Wand2 className="w-3 h-3 text-indigo-400" />
                                                <span>{removingBgImageId === imgObj.id ? 'Processing...' : 'Remove BG'}</span>
                                            </button>
                                            <div className="w-px h-4 bg-slate-700 mx-0.5" />
                                            {/* Infinite Cloner Toggle */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = !imgObj.isInfiniteCloner;
                                                    setImageObjects(prev => prev.map(i => i.id === imgObj.id ? { ...i, isInfiniteCloner: next } : i));
                                                    toast(next ? 'Infinite Cloner enabled: drag to clone' : 'Infinite Cloner disabled', { icon: '∞' });
                                                }}
                                                className={`h-6 px-2 flex items-center gap-1 rounded text-[10.5px] font-semibold transition ${imgObj.isInfiniteCloner ? 'bg-indigo-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'}`}
                                                title={imgObj.isInfiniteCloner ? "Disable Infinite Copy" : "Enable Infinite Copy (drag to clone)"}
                                            >
                                                <InfinityIcon className="w-3 h-3" />
                                                <span>Infinite</span>
                                            </button>
                                            <div className="w-px h-4 bg-slate-700 mx-0.5" />
                                            {/* Quick Border Color Picker */}
                                            <div className="flex items-center gap-1" title="Border Color (sets 2px border if none)">
                                                <input
                                                    type="color"
                                                    value={imgObj.borderColor || '#3b82f6'}
                                                    onChange={(e) => {
                                                        const clr = e.target.value;
                                                        updateSelectedImageFilters({
                                                            borderColor: clr,
                                                            borderWidth: imgObj.borderWidth ? imgObj.borderWidth : 2
                                                        });
                                                    }}
                                                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                                                    title="Border Color (sets 2px border if none)"
                                                />
                                            </div>
                                            <div className="w-px h-4 bg-slate-700 mx-0.5" />
                                            <button
                                                type="button"
                                                onClick={() => setShowImageAdjustModal(prev => !prev)}
                                                className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${showImageAdjustModal || (imgObj.brightness && imgObj.brightness !== 100) || (imgObj.contrast && imgObj.contrast !== 100) || (imgObj.sharpness && imgObj.sharpness > 0) || imgObj.borderWidth ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                                                title="Adjust Image Quality, Borders & Filters"
                                            >
                                                <Sliders className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Image Adjustments Popover */}
                                        {showImageAdjustModal && (
                                            <div
                                                className="mt-2 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-3 text-slate-200 flex flex-col gap-2.5 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
                                                onClick={(e) => e.stopPropagation()}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onPointerDown={(e) => e.stopPropagation()}
                                            >
                                                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                                                    <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                                                        <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Image Adjustments
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateSelectedImageFilters({ brightness: 100, contrast: 100, sharpness: 0, saturation: 100, opacity: 100, blur: 0 })}
                                                        className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline font-semibold"
                                                        title="Reset brightness, contrast, sharpness, saturation, opacity & blur (keeps border intact)"
                                                    >
                                                        Reset
                                                    </button>
                                                </div>

                                                {/* Brightness */}
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex justify-between text-[10px] text-slate-400 font-medium cursor-pointer" onClick={() => document.getElementById(`brightness-slider-${imgObj.id}`)?.focus()}>
                                                        <span className="flex items-center gap-1"><Sun className="w-3 h-3 text-amber-400" /> Brightness</span>
                                                        <span className="font-mono text-white">{imgObj.brightness ?? 100}%</span>
                                                    </div>
                                                    <input
                                                        id={`brightness-slider-${imgObj.id}`}
                                                        type="range"
                                                        min="30"
                                                        max="200"
                                                        tabIndex={0}
                                                        value={imgObj.brightness ?? 100}
                                                        onChange={(e) => updateSelectedImageFilters({ brightness: parseInt(e.target.value, 10) })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                updateSelectedImageFilters({ brightness: Math.max(30, (imgObj.brightness ?? 100) - (e.shiftKey ? 10 : 2)) });
                                                            } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                updateSelectedImageFilters({ brightness: Math.min(200, (imgObj.brightness ?? 100) + (e.shiftKey ? 10 : 2)) });
                                                            }
                                                        }}
                                                        onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.focus(); }}
                                                        onTouchStart={(e) => { e.stopPropagation(); e.currentTarget.focus(); }}
                                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-slate-900"
                                                    />
                                                </div>

                                                {/* Contrast */}
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex justify-between text-[10px] text-slate-400 font-medium cursor-pointer" onClick={() => document.getElementById(`contrast-slider-${imgObj.id}`)?.focus()}>
                                                        <span className="flex items-center gap-1"><Contrast className="w-3 h-3 text-sky-400" /> Contrast</span>
                                                        <span className="font-mono text-white">{imgObj.contrast ?? 100}%</span>
                                                    </div>
                                                    <input
                                                        id={`contrast-slider-${imgObj.id}`}
                                                        type="range"
                                                        min="30"
                                                        max="200"
                                                        tabIndex={0}
                                                        value={imgObj.contrast ?? 100}
                                                        onChange={(e) => updateSelectedImageFilters({ contrast: parseInt(e.target.value, 10) })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                updateSelectedImageFilters({ contrast: Math.max(30, (imgObj.contrast ?? 100) - (e.shiftKey ? 10 : 2)) });
                                                            } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                updateSelectedImageFilters({ contrast: Math.min(200, (imgObj.contrast ?? 100) + (e.shiftKey ? 10 : 2)) });
                                                            }
                                                        }}
                                                        onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.focus(); }}
                                                        onTouchStart={(e) => { e.stopPropagation(); e.currentTarget.focus(); }}
                                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-slate-900"
                                                    />
                                                </div>

                                                {/* Saturation */}
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex justify-between text-[10px] text-slate-400 font-medium cursor-pointer" onClick={() => document.getElementById(`saturation-slider-${imgObj.id}`)?.focus()}>
                                                        <span className="flex items-center gap-1"><Palette className="w-3 h-3 text-emerald-400" /> Saturation</span>
                                                        <span className="font-mono text-white">{imgObj.saturation ?? 100}%</span>
                                                    </div>
                                                    <input
                                                        id={`saturation-slider-${imgObj.id}`}
                                                        type="range"
                                                        min="0"
                                                        max="200"
                                                        tabIndex={0}
                                                        value={imgObj.saturation ?? 100}
                                                        onChange={(e) => updateSelectedImageFilters({ saturation: parseInt(e.target.value, 10) })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                updateSelectedImageFilters({ saturation: Math.max(0, (imgObj.saturation ?? 100) - (e.shiftKey ? 10 : 2)) });
                                                            } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                updateSelectedImageFilters({ saturation: Math.min(200, (imgObj.saturation ?? 100) + (e.shiftKey ? 10 : 2)) });
                                                            }
                                                        }}
                                                        onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.focus(); }}
                                                        onTouchStart={(e) => { e.stopPropagation(); e.currentTarget.focus(); }}
                                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-slate-900"
                                                    />
                                                </div>

                                                {/* Opacity */}
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex justify-between text-[10px] text-slate-400 font-medium cursor-pointer" onClick={() => document.getElementById(`opacity-slider-${imgObj.id}`)?.focus()}>
                                                        <span>Opacity</span>
                                                        <span className="font-mono text-white">{imgObj.opacity ?? 100}%</span>
                                                    </div>
                                                    <input
                                                        id={`opacity-slider-${imgObj.id}`}
                                                        type="range"
                                                        min="10"
                                                        max="100"
                                                        tabIndex={0}
                                                        value={imgObj.opacity ?? 100}
                                                        onChange={(e) => updateSelectedImageFilters({ opacity: parseInt(e.target.value, 10) })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                updateSelectedImageFilters({ opacity: Math.max(10, (imgObj.opacity ?? 100) - (e.shiftKey ? 10 : 2)) });
                                                            } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                updateSelectedImageFilters({ opacity: Math.min(100, (imgObj.opacity ?? 100) + (e.shiftKey ? 10 : 2)) });
                                                            }
                                                        }}
                                                        onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.focus(); }}
                                                        onTouchStart={(e) => { e.stopPropagation(); e.currentTarget.focus(); }}
                                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-slate-900"
                                                    />
                                                </div>

                                                {/* Sharpness */}
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex justify-between text-[10px] text-slate-400 font-medium cursor-pointer" onClick={() => document.getElementById(`sharpness-slider-${imgObj.id}`)?.focus()}>
                                                        <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-pink-400" /> Sharpness</span>
                                                        <span className="font-mono text-white">{imgObj.sharpness ?? 0}</span>
                                                    </div>
                                                    <input
                                                        id={`sharpness-slider-${imgObj.id}`}
                                                        type="range"
                                                        min="0"
                                                        max="10"
                                                        tabIndex={0}
                                                        value={imgObj.sharpness ?? 0}
                                                        onChange={(e) => updateSelectedImageFilters({ sharpness: parseInt(e.target.value, 10) })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                updateSelectedImageFilters({ sharpness: Math.max(0, (imgObj.sharpness ?? 0) - 1) });
                                                            } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                updateSelectedImageFilters({ sharpness: Math.min(10, (imgObj.sharpness ?? 0) + 1) });
                                                            }
                                                        }}
                                                        onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.focus(); }}
                                                        onTouchStart={(e) => { e.stopPropagation(); e.currentTarget.focus(); }}
                                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-slate-900"
                                                    />
                                                </div>

                                                {/* Corner Radius */}
                                                <div className="flex flex-col gap-1 pt-1 border-t border-slate-800">
                                                    <div className="flex justify-between text-[10px] text-slate-400 font-medium cursor-pointer" onClick={() => document.getElementById(`radius-slider-${imgObj.id}`)?.focus()}>
                                                        <span>Corner Radius</span>
                                                        <span className="font-mono text-white">{imgObj.borderRadius ?? 0}px</span>
                                                    </div>
                                                    <input
                                                        id={`radius-slider-${imgObj.id}`}
                                                        type="range"
                                                        min="0"
                                                        max="60"
                                                        tabIndex={0}
                                                        value={imgObj.borderRadius ?? 0}
                                                        onChange={(e) => updateSelectedImageFilters({ borderRadius: parseInt(e.target.value, 10) })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                updateSelectedImageFilters({ borderRadius: Math.max(0, (imgObj.borderRadius ?? 0) - 2) });
                                                            } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                updateSelectedImageFilters({ borderRadius: Math.min(60, (imgObj.borderRadius ?? 0) + 2) });
                                                            }
                                                        }}
                                                        onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.focus(); }}
                                                        onTouchStart={(e) => { e.stopPropagation(); e.currentTarget.focus(); }}
                                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-slate-900"
                                                    />
                                                </div>

                                                {/* Border Frame & Style */}
                                                <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800">
                                                    <div className="text-[10px] text-slate-400 font-medium">Border Width</div>
                                                    <div className="flex items-center gap-1">
                                                        {[0, 1, 2, 4, 8].map(bw => (
                                                            <button
                                                                key={bw}
                                                                type="button"
                                                                onClick={() => updateSelectedImageFilters({ borderWidth: bw, borderColor: imgObj.borderColor || '#3b82f6', borderStyle: imgObj.borderStyle || 'solid' })}
                                                                className={`flex-1 py-0.5 rounded text-[10px] transition ${imgObj.borderWidth === bw ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                                                            >
                                                                {bw === 0 ? 'None' : `${bw}px`}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="text-[10px] text-slate-400 font-medium mt-1">Border Style</div>
                                                    <div className="grid grid-cols-4 gap-1">
                                                        {[
                                                            { id: 'solid', label: 'Solid', icon: <line x1="2" y1="5" x2="22" y2="5" stroke="currentColor" strokeWidth="2.5" /> },
                                                            { id: 'dashed', label: 'Dashed', icon: <line x1="2" y1="5" x2="22" y2="5" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5,3" /> },
                                                            { id: 'dotted', label: 'Dotted', icon: <line x1="2" y1="5" x2="22" y2="5" stroke="currentColor" strokeWidth="2.5" strokeDasharray="2,3" strokeLinecap="round" /> },
                                                            { id: 'double', label: 'Double', icon: <><line x1="2" y1="3" x2="22" y2="3" stroke="currentColor" strokeWidth="1.5" /><line x1="2" y1="7" x2="22" y2="7" stroke="currentColor" strokeWidth="1.5" /></> }
                                                        ].map(st => (
                                                            <button
                                                                key={st.id}
                                                                type="button"
                                                                onClick={() => updateSelectedImageFilters({ borderStyle: st.id, borderWidth: imgObj.borderWidth || 2 })}
                                                                className={`py-1 flex items-center justify-center rounded transition ${(imgObj.borderStyle || 'solid') === st.id ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                                                                title={st.label}
                                                            >
                                                                <svg className="w-5 h-2.5" viewBox="0 0 24 10" fill="none">{st.icon}</svg>
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="text-[10px] text-slate-400 font-medium mt-1">Border Color</div>
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#000000', '#ffffff'].map(clr => (
                                                            <button
                                                                key={clr}
                                                                type="button"
                                                                onClick={() => updateSelectedImageFilters({ borderColor: clr, borderWidth: imgObj.borderWidth || 2 })}
                                                                className={`w-5 h-5 rounded-full border-2 transition ${imgObj.borderColor === clr ? 'border-white scale-110' : 'border-slate-600 hover:border-slate-400'}`}
                                                                style={{ backgroundColor: clr }}
                                                                title={clr}
                                                            />
                                                        ))}
                                                        <input
                                                            type="color"
                                                            value={imgObj.borderColor || '#3b82f6'}
                                                            onChange={(e) => updateSelectedImageFilters({ borderColor: e.target.value, borderWidth: imgObj.borderWidth || 2 })}
                                                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                                                            title="Custom Color"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Text Objects Layer - Selectable, Movable, Resizable, Rotatable, Editable */}
                    {textObjects.map((txtObj) => {
                        const isSelected = selectedTextIds.includes(txtObj.id);
                        const isEditing = editingTextId === txtObj.id;
                        const handleSize = 10;

                        // Calculate unrotated bounding box center and top for floating toolbar
                        const textW = txtObj.width || 120;
                        const textH = txtObj.height || 40;
                        const cx = (txtObj.x || 0) + textW / 2;
                        const cy = (txtObj.y || 0) + textH / 2;
                        const rad = ((txtObj.rotation || 0) * Math.PI) / 180;
                        const cos = Math.cos(rad);
                        const sin = Math.sin(rad);
                        const halfW = textW / 2;
                        const halfH = textH / 2;
                        const corners = [
                            { dx: -halfW, dy: -halfH },
                            { dx: halfW, dy: -halfH },
                            { dx: halfW, dy: halfH },
                            { dx: -halfW, dy: halfH }
                        ].map(p => ({
                            x: cx + p.dx * cos - p.dy * sin,
                            y: cy + p.dx * sin + p.dy * cos
                        }));
                        const textMinY = Math.min(...corners.map(c => c.y));

                        return (
                            <div key={txtObj.id}>
                                <div
                                    className="whiteboard-text-item absolute"
                                    style={{
                                        left: txtObj.x,
                                        top: txtObj.y,
                                        width: txtObj.width,
                                        minHeight: txtObj.height,
                                        transform: `rotate(${txtObj.rotation || 0}deg)`,
                                        transformOrigin: 'center center',
                                        zIndex: txtObj.zIndex || (isSelected || isEditing ? 20 : 10),
                                        cursor: isEditing ? 'text' : isSelected ? 'move' : 'crosshair',
                                        pointerEvents: (tool === 'select' || isSelected || isEditing) ? 'auto' : 'none',
                                        backgroundColor: txtObj.bgColor || 'transparent',
                                        border: txtObj.borderWidth ? `${txtObj.borderWidth}px ${txtObj.borderStyle || 'solid'} ${txtObj.borderColor || '#3b82f6'}` : undefined,
                                        borderRadius: txtObj.borderRadius ? `${txtObj.borderRadius}px` : undefined,
                                        boxSizing: 'border-box',
                                    }}
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isEditing) {
                                            if (e.ctrlKey || e.metaKey) {
                                                setSelectedTextIds(prev => prev.includes(txtObj.id) ? prev.filter(id => id !== txtObj.id) : [...prev, txtObj.id]);
                                            } else {
                                                setSelectedTextIds([txtObj.id]);
                                                setSelectedImageId(null);
                                                setSelectedShapeIds([]);
                                                setSelected3DId(null);
                                                setSelectedMediaId(null);
                                            }
                                        }
                                    }}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        setEditingTextId(txtObj.id);
                                        setSelectedTextIds([txtObj.id]);
                                        setSelected3DId(null);
                                        setSelectedMediaId(null);
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
                                                setSelectedImageId(null);
                                                setSelectedShapeIds([]);
                                                setSelected3DId(null);
                                                setSelectedMediaId(null);
                                            }
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
                                            startObj: { ...txtObj },
                                            startTextObjs: textObjects.filter(t => selectedTextIds.includes(t.id) || t.id === txtObj.id),
                                            startShapeObjs: shapeObjects.filter(s => selectedShapeIds.includes(s.id))
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
                                            className="w-full h-full p-2 bg-transparent border-0 outline-none ring-2 ring-blue-500 ring-inset rounded resize-none m-0 shadow-none"
                                            style={{
                                                color: txtObj.color,
                                                fontSize: `${txtObj.fontSize}px`,
                                                fontWeight: txtObj.fontWeight || 'normal',
                                                fontStyle: txtObj.fontStyle || 'normal',
                                                fontFamily: txtObj.fontFamily || 'sans-serif',
                                                textAlign: txtObj.textAlign || 'left',
                                                lineHeight: 1.3,
                                                minHeight: txtObj.height,
                                                borderRadius: txtObj.borderRadius ? `${txtObj.borderRadius}px` : undefined,
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
                                                pointerEvents: (tool === 'select' || isSelected) ? 'auto' : 'none',
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
                                            <div className="absolute inset-0 border-2 border-green-500 pointer-events-none" style={{ borderRadius: txtObj.borderRadius ? `${txtObj.borderRadius}px` : undefined }} />
                                            <div
                                                className="absolute inset-0"
                                                style={{ pointerEvents: 'auto', cursor: 'move' }}
                                                onMouseDown={(e) => { if (!canUserDraw) return; e.stopPropagation(); e.preventDefault(); if (txtObj.isLocked) return; setTextDragState({ id: txtObj.id, action: 'move', startX: e.clientX, startY: e.clientY, startObj: { ...txtObj }, startObjs: textObjects.filter(t => selectedTextIds.includes(t.id)), startShapeObjs: shapeObjects.filter(s => selectedShapeIds.includes(s.id)) }); }}
                                                onPointerDown={(e) => {
                                                    if (!canUserDraw) return;
                                                    e.stopPropagation();
                                                    if (e.cancelable) e.preventDefault();
                                                    if (txtObj.isLocked) return;
                                                    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                                                    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                                                    setTextDragState({ id: txtObj.id, action: 'move', startX: clientX, startY: clientY, startObj: { ...txtObj }, startObjs: textObjects.filter(t => selectedTextIds.includes(t.id)), startShapeObjs: shapeObjects.filter(s => selectedShapeIds.includes(s.id)) });
                                                }}
                                            />


                                            {!txtObj.isLocked && (
                                                <>
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
                                                        onPointerDown={(e) => {
                                                            e.stopPropagation();
                                                            if (e.cancelable) e.preventDefault();
                                                            const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                                                            const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                                                            setTextDragState({
                                                                id: txtObj.id,
                                                                action: `resize-${corner}`,
                                                                startX: clientX,
                                                                startY: clientY,
                                                                startObj: { ...txtObj }
                                                            });
                                                        }}
                                                    />
                                                );
                                            })}
                                                </>
                                            )}
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
                                                        onPointerDown={(e) => {
                                                            e.stopPropagation();
                                                            if (e.cancelable) e.preventDefault();
                                                            const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                                                            const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                                                            setTextDragState({
                                                                id: txtObj.id,
                                                                action: `resize-${edge}`,
                                                                startX: clientX,
                                                                startY: clientY,
                                                                startObj: { ...txtObj }
                                                            });
                                                        }}
                                                    />
                                                );
                                            })}

                                            {!txtObj.isLocked && (
                                                <>
                                                    {/* Rotate Handle */}
                                                    <div
                                                        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center z-30"
                                                        style={{ top: -35, pointerEvents: 'auto' }}
                                                    >
                                                        <div className="w-px h-5 bg-green-500" />
                                                        <div
                                                            data-handle="rotate"
                                                            className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center cursor-grab hover:bg-green-700 shadow-md transition-transform hover:scale-110 active:cursor-grabbing"
                                                            style={{ cursor: 'grab', touchAction: 'none', pointerEvents: 'auto' }}
                                                            onMouseDown={(e) => {
                                                                e.stopPropagation();
                                                                const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                                                                const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                                                                setTextDragState({
                                                                    id: txtObj.id,
                                                                    action: 'rotate',
                                                                    startX: clientX,
                                                                    startY: clientY,
                                                                    startObj: { ...txtObj }
                                                                });
                                                            }}
                                                            onPointerDown={(e) => {
                                                                e.stopPropagation();
                                                                const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                                                                const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                                                                setTextDragState({
                                                                    id: txtObj.id,
                                                                    action: 'rotate',
                                                                    startX: clientX,
                                                                    startY: clientY,
                                                                    startObj: { ...txtObj }
                                                                });
                                                            }}
                                                        >
                                                            <RotateCw className="w-3.5 h-3.5" />
                                                        </div>
                                                    </div>

                                                    {/* Delete Button */}
                                                    <button
                                                        className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center z-30 shadow-lg cursor-pointer"
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
                                        </>
                                    )}
                                </div>

                                {/* Static Unrotated Floating Text Format Bar */}
                                {isSelected && (selectedTextIds.length === 1 && selectedTextIds[0] === txtObj.id) && !isEditing && (
                                    <div
                                        className="absolute pointer-events-auto select-none"
                                        style={{
                                            left: cx,
                                            top: textMinY - (txtObj.isLocked ? 14 : 44),
                                            transform: 'translate(-50%, -100%)',
                                            zIndex: 70,
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onPointerDown={(e) => e.stopPropagation()}
                                    >
                                        {/* Floating Toolbar Pill */}
                                        <div className="flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl px-2 py-1 text-slate-200">
                                            {/* Font Family */}
                                            <select
                                                value={txtObj.fontFamily || 'sans-serif'}
                                                onChange={(e) => updateSelectedTextProps({ fontFamily: e.target.value })}
                                                className="bg-slate-800 text-[11px] text-white rounded px-1.5 py-1 border border-slate-700 outline-none cursor-pointer hover:bg-slate-750 transition"
                                                title="Font Family"
                                            >
                                                <option value="sans-serif">Sans-serif</option>
                                                <option value="serif">Serif</option>
                                                <option value="monospace">Monospace</option>
                                                <option value="Inter">Inter</option>
                                                <option value="Roboto">Roboto</option>
                                                <option value="Caveat">Caveat</option>
                                                <option value="Comic Sans MS">Comic Marker</option>
                                            </select>

                                            {/* Font Size +/- */}
                                            <div className="flex items-center bg-slate-800 rounded border border-slate-700 px-1 py-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => updateSelectedTextProps({ fontSize: Math.max(8, (txtObj.fontSize || 20) - 2) })}
                                                    className="w-4 h-5 flex items-center justify-center text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded transition font-bold"
                                                    title="Decrease Font Size"
                                                >
                                                    -
                                                </button>
                                                <span className="text-[11px] font-mono text-white px-1 select-none min-w-[20px] text-center">
                                                    {txtObj.fontSize || 20}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => updateSelectedTextProps({ fontSize: Math.min(120, (txtObj.fontSize || 20) + 2) })}
                                                    className="w-4 h-5 flex items-center justify-center text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded transition font-bold"
                                                    title="Increase Font Size"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <div className="w-px h-4 bg-slate-700 mx-0.5" />

                                            {/* Bold & Italic */}
                                            <button
                                                type="button"
                                                onClick={() => updateSelectedTextProps({ fontWeight: txtObj.fontWeight === 'bold' ? 'normal' : 'bold' })}
                                                className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold transition ${txtObj.fontWeight === 'bold' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                                                title="Bold"
                                            >
                                                B
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateSelectedTextProps({ fontStyle: txtObj.fontStyle === 'italic' ? 'normal' : 'italic' })}
                                                className={`w-6 h-6 flex items-center justify-center rounded text-xs italic font-serif transition ${txtObj.fontStyle === 'italic' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                                                title="Italic"
                                            >
                                                I
                                            </button>

                                            <div className="w-px h-4 bg-slate-700 mx-0.5" />

                                            {/* Alignment */}
                                            <div className="flex items-center bg-slate-800 rounded border border-slate-700 p-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => updateSelectedTextProps({ textAlign: 'left' })}
                                                    className={`w-5 h-5 flex items-center justify-center rounded transition ${(txtObj.textAlign || 'left') === 'left' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                                    title="Align Left"
                                                >
                                                    <AlignLeft className="w-3 h-3" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => updateSelectedTextProps({ textAlign: 'center' })}
                                                    className={`w-5 h-5 flex items-center justify-center rounded transition ${txtObj.textAlign === 'center' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                                    title="Align Center"
                                                >
                                                    <AlignCenterHorizontal className="w-3 h-3" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => updateSelectedTextProps({ textAlign: 'right' })}
                                                    className={`w-5 h-5 flex items-center justify-center rounded transition ${txtObj.textAlign === 'right' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                                    title="Align Right"
                                                >
                                                    <AlignRight className="w-3 h-3" />
                                                </button>
                                            </div>

                                            <div className="w-px h-4 bg-slate-700 mx-0.5" />

                                            {/* Text Color */}
                                            <div className="relative w-6 h-6 flex flex-col items-center justify-center rounded hover:bg-slate-800 border border-slate-700 cursor-pointer overflow-hidden" title="Text Color">
                                                <span className="font-bold text-[12px] leading-none select-none text-slate-200 mt-0.5">A</span>
                                                <div className="w-3.5 h-1 mt-[1px] rounded-xs" style={{ backgroundColor: txtObj.color || '#000000' }} />
                                                <input
                                                    type="color"
                                                    value={txtObj.color || '#000000'}
                                                    onChange={(e) => updateSelectedTextProps({ color: e.target.value })}
                                                    className="absolute inset-[-10px] w-12 h-12 opacity-0 cursor-pointer"
                                                    title="Change Text Color"
                                                />
                                            </div>

                                            {/* Background Color */}
                                            <div className="relative w-6 h-6 flex items-center justify-center rounded hover:bg-slate-800 border border-slate-700 cursor-pointer overflow-hidden" title="Background Fill">
                                                <div className="w-3.5 h-3.5 rounded-xs border border-slate-500 flex items-center justify-center" style={{ backgroundColor: txtObj.bgColor || 'transparent' }}>
                                                    {(!txtObj.bgColor || txtObj.bgColor === 'transparent') && (
                                                        <span className="text-[7px] text-slate-400 leading-none">✕</span>
                                                    )}
                                                </div>
                                                <input
                                                    type="color"
                                                    value={txtObj.bgColor && txtObj.bgColor !== 'transparent' ? txtObj.bgColor : '#ffffff'}
                                                    onChange={(e) => updateSelectedTextProps({ bgColor: e.target.value })}
                                                    className="absolute inset-[-10px] w-12 h-12 opacity-0 cursor-pointer"
                                                    title="Change Background Color"
                                                />
                                            </div>
                                            {txtObj.bgColor && txtObj.bgColor !== 'transparent' && (
                                                <button
                                                    type="button"
                                                    onClick={() => updateSelectedTextProps({ bgColor: 'transparent' })}
                                                    className="w-4 h-5 flex items-center justify-center text-[10px] text-slate-400 hover:text-white rounded hover:bg-slate-800"
                                                    title="Clear Background"
                                                >
                                                    ✕
                                                </button>
                                            )}

                                            <div className="w-px h-4 bg-slate-700 mx-0.5" />

                                            {/* Border & Frame Popover Toggle */}
                                            <button
                                                type="button"
                                                onClick={() => setActiveTextBorderPopoverId(prev => prev === txtObj.id ? null : txtObj.id)}
                                                className={`h-6 px-2 flex items-center gap-1 rounded text-[11px] font-medium transition ${activeTextBorderPopoverId === txtObj.id || (txtObj.borderWidth || 0) > 0 ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                                                title="Border & Frame Settings"
                                            >
                                                <Square className="w-3 h-3" />
                                                <span>Border{(txtObj.borderWidth || 0) > 0 ? ` (${txtObj.borderWidth}px)` : ''}</span>
                                            </button>

                                            <div className="w-px h-4 bg-slate-700 mx-0.5" />

                                            {/* Lock / Unlock */}
                                            <button
                                                type="button"
                                                onClick={() => updateSelectedTextProps({ isLocked: !txtObj.isLocked })}
                                                className={`w-6 h-6 flex items-center justify-center rounded transition ${txtObj.isLocked ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                                                title={txtObj.isLocked ? 'Unlock Text' : 'Lock Text'}
                                            >
                                                {txtObj.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                            </button>

                                            {/* Delete */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTextObjects(prev => prev.filter(t => t.id !== txtObj.id));
                                                    setSelectedTextIds([]);
                                                    saveToHistory();
                                                }}
                                                className="w-6 h-6 flex items-center justify-center rounded text-red-400 hover:text-red-300 hover:bg-red-500/20 transition"
                                                title="Delete Text"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>

                                        {/* Text Border & Frame Popover */}
                                        {activeTextBorderPopoverId === txtObj.id && (
                                            <div
                                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900/98 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl z-50 flex flex-col gap-2.5 text-slate-200 animate-in fade-in zoom-in-95 duration-150"
                                                onClick={(e) => e.stopPropagation()}
                                                onMouseDown={(e) => e.stopPropagation()}
                                            >
                                                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                                                        <Square className="w-3.5 h-3.5 text-indigo-400" /> Border & Frame
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveTextBorderPopoverId(null)}
                                                        className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                {/* Border Width */}
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-[10px] text-slate-400 font-medium">Border Width</div>
                                                    <div className="flex items-center gap-1">
                                                        {[0, 1, 2, 4, 8].map(bw => (
                                                            <button
                                                                key={bw}
                                                                type="button"
                                                                onClick={() => updateSelectedTextProps({ borderWidth: bw, borderColor: txtObj.borderColor || '#3b82f6', borderStyle: txtObj.borderStyle || 'solid' })}
                                                                className={`flex-1 py-0.5 rounded text-[10px] transition ${(txtObj.borderWidth ?? 0) === bw ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                                                            >
                                                                {bw === 0 ? 'None' : `${bw}px`}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Border Style */}
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-[10px] text-slate-400 font-medium">Border Style</div>
                                                    <div className="grid grid-cols-4 gap-1">
                                                        {[
                                                            { id: 'solid', label: 'Solid', icon: <line x1="2" y1="5" x2="22" y2="5" stroke="currentColor" strokeWidth="2.5" /> },
                                                            { id: 'dashed', label: 'Dashed', icon: <line x1="2" y1="5" x2="22" y2="5" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5,3" /> },
                                                            { id: 'dotted', label: 'Dotted', icon: <line x1="2" y1="5" x2="22" y2="5" stroke="currentColor" strokeWidth="2.5" strokeDasharray="2,3" strokeLinecap="round" /> },
                                                            { id: 'double', label: 'Double', icon: <><line x1="2" y1="3" x2="22" y2="3" stroke="currentColor" strokeWidth="1.5" /><line x1="2" y1="7" x2="22" y2="7" stroke="currentColor" strokeWidth="1.5" /></> }
                                                        ].map(st => (
                                                            <button
                                                                key={st.id}
                                                                type="button"
                                                                onClick={() => updateSelectedTextProps({ borderStyle: st.id, borderWidth: txtObj.borderWidth || 2 })}
                                                                className={`py-1 flex items-center justify-center rounded transition ${(txtObj.borderStyle || 'solid') === st.id ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                                                                title={st.label}
                                                            >
                                                                <svg className="w-5 h-2.5" viewBox="0 0 24 10" fill="none">{st.icon}</svg>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Border Color */}
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-[10px] text-slate-400 font-medium">Border Color</div>
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#000000', '#ffffff'].map(clr => (
                                                            <button
                                                                key={clr}
                                                                type="button"
                                                                onClick={() => updateSelectedTextProps({ borderColor: clr, borderWidth: txtObj.borderWidth || 2 })}
                                                                className={`w-5 h-5 rounded-full border-2 transition ${txtObj.borderColor === clr ? 'border-white scale-110' : 'border-slate-600 hover:border-slate-400'}`}
                                                                style={{ backgroundColor: clr }}
                                                                title={clr}
                                                            />
                                                        ))}
                                                        <input
                                                            type="color"
                                                            value={txtObj.borderColor || '#3b82f6'}
                                                            onChange={(e) => updateSelectedTextProps({ borderColor: e.target.value, borderWidth: txtObj.borderWidth || 2 })}
                                                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                                                            title="Custom Border Color"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Corner Radius */}
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-[10px] text-slate-400 font-medium">Corner Radius</div>
                                                    <div className="flex items-center gap-1">
                                                        {[0, 4, 8, 16, 24].map(cr => (
                                                            <button
                                                                key={cr}
                                                                type="button"
                                                                onClick={() => updateSelectedTextProps({ borderRadius: cr })}
                                                                className={`flex-1 py-0.5 rounded text-[10px] transition ${(txtObj.borderRadius ?? 0) === cr ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                                                            >
                                                                {cr === 0 ? '0' : `${cr}px`}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
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
                            <svg width="100%" height="100%" style={{ overflow: 'visible', pointerEvents: 'none' }}>
                                {shapePreview.type === 'rectangle' && <rect x="0" y="0" width={shapePreview.width} height={shapePreview.height} fill="transparent" stroke={shapePreview.color} strokeWidth={shapePreview.strokeWidth} />}
                                {shapePreview.type === 'rounded_rect' && <rect x="0" y="0" width={shapePreview.width} height={shapePreview.height} rx={Math.min(20, shapePreview.width/4, shapePreview.height/4)} fill="transparent" stroke={shapePreview.color} strokeWidth={shapePreview.strokeWidth} />}
                                {shapePreview.type === 'circle' && <ellipse cx={shapePreview.width/2} cy={shapePreview.height/2} rx={shapePreview.width/2} ry={shapePreview.height/2} fill="transparent" stroke={shapePreview.color} strokeWidth={shapePreview.strokeWidth} />}
                                {shapePreview.type === 'triangle' && <polygon points={`${shapePreview.width/2},0 0,${shapePreview.height} ${shapePreview.width},${shapePreview.height}`} fill="transparent" stroke={shapePreview.color} strokeWidth={shapePreview.strokeWidth} strokeLinejoin="round" />}
                                {shapePreview.type === 'diamond' && <polygon points={`${shapePreview.width/2},0 ${shapePreview.width},${shapePreview.height/2} ${shapePreview.width/2},${shapePreview.height} 0,${shapePreview.height/2}`} fill="transparent" stroke={shapePreview.color} strokeWidth={shapePreview.strokeWidth} strokeLinejoin="round" />}
                                {shapePreview.type === 'hexagon' && <polygon points={`${shapePreview.width*0.25},0 ${shapePreview.width*0.75},0 ${shapePreview.width},${shapePreview.height*0.5} ${shapePreview.width*0.75},${shapePreview.height} ${shapePreview.width*0.25},${shapePreview.height} 0,${shapePreview.height*0.5}`} fill="transparent" stroke={shapePreview.color} strokeWidth={shapePreview.strokeWidth} strokeLinejoin="round" />}
                                {shapePreview.type === 'arc' && <path d={`M 0 ${shapePreview.height} Q ${shapePreview.width/2} 0 ${shapePreview.width} ${shapePreview.height}`} fill="none" stroke={shapePreview.color} strokeWidth={shapePreview.strokeWidth} strokeLinecap="round" />}
                                {shapePreview.type === 'cloud' && <path d={`M ${shapePreview.width*0.2} ${shapePreview.height*0.7} C ${shapePreview.width*0.05} ${shapePreview.height*0.7} ${shapePreview.width*0.05} ${shapePreview.height*0.45} ${shapePreview.width*0.2} ${shapePreview.height*0.4} C ${shapePreview.width*0.15} ${shapePreview.height*0.15} ${shapePreview.width*0.45} ${shapePreview.height*0.1} ${shapePreview.width*0.5} ${shapePreview.height*0.3} C ${shapePreview.width*0.6} ${shapePreview.height*0.15} ${shapePreview.width*0.85} ${shapePreview.height*0.2} ${shapePreview.width*0.85} ${shapePreview.height*0.4} C ${shapePreview.width*0.98} ${shapePreview.height*0.45} ${shapePreview.width*0.98} ${shapePreview.height*0.7} ${shapePreview.width*0.8} ${shapePreview.height*0.7} Z`} fill="transparent" stroke={shapePreview.color} strokeWidth={shapePreview.strokeWidth} strokeLinejoin="round" />}
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
                                    return <polygon style={{ pointerEvents: 'none' }} points={points.join(' ')} fill="transparent" stroke={shapePreview.color} strokeWidth={shapePreview.strokeWidth} strokeLinejoin="round" />;
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
                    {shapeObjects.filter(s => s.type !== 'connector').map((shpObj) => {
                        const isSelected = selectedShapeIds.includes(shpObj.id);
                        const handleSize = 10;
                        const renderShapeSVG = () => {
                            const fill = shpObj.fillColor || 'transparent';
                            const bStyle = shpObj.borderStyle || 'solid';
                            const dashArray = bStyle === 'dashed'
                                ? `${Math.max(6, (shpObj.strokeWidth || 2) * 3)},${Math.max(4, (shpObj.strokeWidth || 2) * 2)}`
                                : bStyle === 'dotted'
                                    ? `${Math.max(2, shpObj.strokeWidth || 2)},${Math.max(3, (shpObj.strokeWidth || 2) * 1.5)}`
                                    : undefined;

                            if (shpObj.type === 'rectangle') {
                                if (bStyle === 'double') {
                                    const sw = Math.max(1, Math.round((shpObj.strokeWidth || 2) * 0.45));
                                    const gap = Math.max(2, Math.round((shpObj.strokeWidth || 2) * 0.6));
                                    const inset = sw + gap;
                                    return (
                                        <g style={{ pointerEvents: (tool === 'select' || isSelected) ? 'visiblePainted' : 'none' }}>
                                            <rect x="0" y="0" width={shpObj.width} height={shpObj.height} fill={fill} stroke={shpObj.color} strokeWidth={sw} />
                                            {shpObj.width > inset * 2 && shpObj.height > inset * 2 && (
                                                <rect x={inset} y={inset} width={shpObj.width - inset * 2} height={shpObj.height - inset * 2} fill="none" stroke={shpObj.color} strokeWidth={sw} />
                                            )}
                                        </g>
                                    );
                                }
                                return <rect style={{ pointerEvents: (tool === 'select' || isSelected) ? 'visiblePainted' : 'none' }} x="0" y="0" width={shpObj.width} height={shpObj.height} fill={fill} stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} strokeDasharray={dashArray} />;
                            } else if (shpObj.type === 'circle') {
                                if (bStyle === 'double') {
                                    const sw = Math.max(1, Math.round((shpObj.strokeWidth || 2) * 0.45));
                                    const gap = Math.max(2, Math.round((shpObj.strokeWidth || 2) * 0.6));
                                    const inset = sw + gap;
                                    const rx = shpObj.width / 2;
                                    const ry = shpObj.height / 2;
                                    return (
                                        <g style={{ pointerEvents: (tool === 'select' || isSelected) ? 'visiblePainted' : 'none' }}>
                                            <ellipse cx={rx} cy={ry} rx={rx} ry={ry} fill={fill} stroke={shpObj.color} strokeWidth={sw} />
                                            {rx > inset && ry > inset && (
                                                <ellipse cx={rx} cy={ry} rx={rx - inset} ry={ry - inset} fill="none" stroke={shpObj.color} strokeWidth={sw} />
                                            )}
                                        </g>
                                    );
                                }
                                return <ellipse style={{ pointerEvents: (tool === 'select' || isSelected) ? 'visiblePainted' : 'none' }} cx={shpObj.width/2} cy={shpObj.height/2} rx={shpObj.width/2} ry={shpObj.height/2} fill={fill} stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} strokeDasharray={dashArray} />;
                            } else if (shpObj.type === 'triangle') {
                                const w = shpObj.width, h = shpObj.height;
                                if (bStyle === 'double') {
                                    const sw = Math.max(1, Math.round((shpObj.strokeWidth || 2) * 0.45));
                                    const gap = Math.max(2, Math.round((shpObj.strokeWidth || 2) * 0.6));
                                    const inset = sw + gap;
                                    const scale = Math.max(0.2, (Math.min(w, h) - inset * 2) / Math.min(w, h));
                                    const cx = w / 2, cy = (2 * h) / 3;
                                    const p1 = `${w / 2},0`;
                                    const p2 = `0,${h}`;
                                    const p3 = `${w},${h}`;
                                    const ip1 = `${cx},${cy - cy * scale}`;
                                    const ip2 = `${cx - (w / 2) * scale},${cy + (h - cy) * scale}`;
                                    const ip3 = `${cx + (w / 2) * scale},${cy + (h - cy) * scale}`;
                                    return (
                                        <g style={{ pointerEvents: (tool === 'select' || isSelected) ? 'visiblePainted' : 'none' }}>
                                            <polygon points={`${p1} ${p2} ${p3}`} fill={fill} stroke={shpObj.color} strokeWidth={sw} strokeLinejoin="round" />
                                            <polygon points={`${ip1} ${ip2} ${ip3}`} fill="none" stroke={shpObj.color} strokeWidth={sw} strokeLinejoin="round" />
                                        </g>
                                    );
                                }
                                return <polygon style={{ pointerEvents: (tool === 'select' || isSelected) ? 'visiblePainted' : 'none' }} points={`${shpObj.width/2},0 0,${shpObj.height} ${shpObj.width},${shpObj.height}`} fill={fill} stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} strokeLinejoin="round" strokeDasharray={dashArray} />;
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
                                if (bStyle === 'double') {
                                    const sw = Math.max(1, Math.round((shpObj.strokeWidth || 2) * 0.45));
                                    const gap = Math.max(2, Math.round((shpObj.strokeWidth || 2) * 0.6));
                                    const inset = sw + gap;
                                    const scale = Math.max(0.2, (Math.min(cx * 2, cy * 2) - inset * 2) / (Math.min(cx * 2, cy * 2)));
                                    let innerPoints = [];
                                    for (let i = 0; i < 10; i++) {
                                        const r = (i % 2 === 0 ? outerRadius : innerRadius) * scale;
                                        const angle = (i * Math.PI) / 5 - Math.PI / 2;
                                        innerPoints.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
                                    }
                                    return (
                                        <g style={{ pointerEvents: (tool === 'select' || isSelected) ? 'visiblePainted' : 'none' }}>
                                            <polygon points={points.join(' ')} fill={fill} stroke={shpObj.color} strokeWidth={sw} strokeLinejoin="round" />
                                            <polygon points={innerPoints.join(' ')} fill="none" stroke={shpObj.color} strokeWidth={sw} strokeLinejoin="round" />
                                        </g>
                                    );
                                }
                                return <polygon style={{ pointerEvents: (tool === 'select' || isSelected) ? 'visiblePainted' : 'none' }} points={points.join(' ')} fill={fill} stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} strokeLinejoin="round" strokeDasharray={dashArray} />;
                            } else if (shpObj.type === 'rounded_rect') {
                                const r = Math.min(20, shpObj.width / 4, shpObj.height / 4);
                                if (bStyle === 'double') {
                                    const sw = Math.max(1, Math.round((shpObj.strokeWidth || 2) * 0.45));
                                    const gap = Math.max(2, Math.round((shpObj.strokeWidth || 2) * 0.6));
                                    const inset = sw + gap;
                                    const innerR = Math.max(0, r - inset);
                                    return (
                                        <g style={{ pointerEvents: (tool === 'select' || isSelected) ? 'visiblePainted' : 'none' }}>
                                            <rect x="0" y="0" width={shpObj.width} height={shpObj.height} rx={r} ry={r} fill={fill} stroke={shpObj.color} strokeWidth={sw} />
                                            {shpObj.width > inset * 2 && shpObj.height > inset * 2 && (
                                                <rect x={inset} y={inset} width={shpObj.width - inset * 2} height={shpObj.height - inset * 2} rx={innerR} ry={innerR} fill="none" stroke={shpObj.color} strokeWidth={sw} />
                                            )}
                                        </g>
                                    );
                                }
                                return <rect style={{ pointerEvents: (tool === 'select' || isSelected) ? 'visiblePainted' : 'none' }} x="0" y="0" width={shpObj.width} height={shpObj.height} rx={r} ry={r} fill={fill} stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} strokeDasharray={dashArray} />;
                            } else if (shpObj.type === 'diamond') {
                                const w = shpObj.width, h = shpObj.height;
                                if (bStyle === 'double') {
                                    const sw = Math.max(1, Math.round((shpObj.strokeWidth || 2) * 0.45));
                                    const gap = Math.max(2, Math.round((shpObj.strokeWidth || 2) * 0.6));
                                    const inset = sw + gap;
                                    const scale = Math.max(0.2, (Math.min(w, h) - inset * 2) / Math.min(w, h));
                                    const cx = w / 2, cy = h / 2;
                                    const ip1 = `${cx},${cy - (h / 2) * scale}`;
                                    const ip2 = `${cx + (w / 2) * scale},${cy}`;
                                    const ip3 = `${cx},${cy + (h / 2) * scale}`;
                                    const ip4 = `${cx - (w / 2) * scale},${cy}`;
                                    return (
                                        <g style={{ pointerEvents: (tool === 'select' || isSelected) ? 'visiblePainted' : 'none' }}>
                                            <polygon points={`${w/2},0 ${w},${h/2} ${w/2},${h} 0,${h/2}`} fill={fill} stroke={shpObj.color} strokeWidth={sw} strokeLinejoin="round" />
                                            <polygon points={`${ip1} ${ip2} ${ip3} ${ip4}`} fill="none" stroke={shpObj.color} strokeWidth={sw} strokeLinejoin="round" />
                                        </g>
                                    );
                                }
                                return <polygon style={{ pointerEvents: (tool === 'select' || isSelected) ? 'visiblePainted' : 'none' }} points={`${w/2},0 ${w},${h/2} ${w/2},${h} 0,${h/2}`} fill={fill} stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} strokeLinejoin="round" strokeDasharray={dashArray} />;
                            } else if (shpObj.type === 'hexagon') {
                                const w = shpObj.width, h = shpObj.height;
                                if (bStyle === 'double') {
                                    const sw = Math.max(1, Math.round((shpObj.strokeWidth || 2) * 0.45));
                                    const gap = Math.max(2, Math.round((shpObj.strokeWidth || 2) * 0.6));
                                    const inset = sw + gap;
                                    const scale = Math.max(0.2, (Math.min(w, h) - inset * 2) / Math.min(w, h));
                                    const cx = w / 2, cy = h / 2;
                                    const pts = [
                                        [w * 0.25, 0], [w * 0.75, 0], [w, h * 0.5],
                                        [w * 0.75, h], [w * 0.25, h], [0, h * 0.5]
                                    ];
                                    const innerPts = pts.map(([px, py]) => `${cx + (px - cx) * scale},${cy + (py - cy) * scale}`).join(' ');
                                    return (
                                        <g style={{ pointerEvents: (tool === 'select' || isSelected) ? 'visiblePainted' : 'none' }}>
                                            <polygon points={`${w*0.25},0 ${w*0.75},0 ${w},${h*0.5} ${w*0.75},${h} ${w*0.25},${h} 0,${h*0.5}`} fill={fill} stroke={shpObj.color} strokeWidth={sw} strokeLinejoin="round" />
                                            <polygon points={innerPts} fill="none" stroke={shpObj.color} strokeWidth={sw} strokeLinejoin="round" />
                                        </g>
                                    );
                                }
                                return <polygon style={{ pointerEvents: (tool === 'select' || isSelected) ? 'visiblePainted' : 'none' }} points={`${w*0.25},0 ${w*0.75},0 ${w},${h*0.5} ${w*0.75},${h} ${w*0.25},${h} 0,${h*0.5}`} fill={fill} stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} strokeLinejoin="round" strokeDasharray={dashArray} />;
                            } else if (shpObj.type === 'arc' || shpObj.type === 'curved_line') {
                                return (
                                    <path
                                        d={`M 0 ${shpObj.height} Q ${shpObj.width / 2} 0 ${shpObj.width} ${shpObj.height}`}
                                        fill={fill}
                                        stroke={shpObj.color}
                                        strokeWidth={shpObj.strokeWidth}
                                        strokeLinecap="round"
                                        strokeDasharray={dashArray}
                                        style={{ pointerEvents: (tool === 'select' || isSelected) ? 'visiblePainted' : 'none' }}
                                    />
                                );
                            } else if (shpObj.type === 'cloud') {
                                const w = shpObj.width, h = shpObj.height;
                                return (
                                    <path
                                        d={`M ${w*0.2} ${h*0.7} C ${w*0.05} ${h*0.7} ${w*0.05} ${h*0.45} ${w*0.2} ${h*0.4} C ${w*0.15} ${h*0.15} ${w*0.45} ${h*0.1} ${w*0.5} ${h*0.3} C ${w*0.6} ${h*0.15} ${w*0.85} ${h*0.2} ${w*0.85} ${h*0.4} C ${w*0.98} ${h*0.45} ${w*0.98} ${h*0.7} ${w*0.8} ${h*0.7} Z`}
                                        fill={fill}
                                        stroke={shpObj.color}
                                        strokeWidth={shpObj.strokeWidth}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeDasharray={dashArray}
                                        style={{ pointerEvents: (tool === 'select' || isSelected) ? 'visiblePainted' : 'none' }}
                                    />
                                );
                            } else if (shpObj.type === 'path') {
                                if (!shpObj.points || shpObj.points.length === 0) return null;
                                const pts = shpObj.points;
                                let d = `M ${pts[0].x} ${pts[0].y}`;
                                if (shpObj.smooth && pts.length > 2) {
                                    for (let i = 1; i < pts.length - 1; i++) {
                                        const xc = (pts[i].x + pts[i + 1].x) / 2;
                                        const yc = (pts[i].y + pts[i + 1].y) / 2;
                                        d += ` Q ${pts[i].x} ${pts[i].y}, ${xc} ${yc}`;
                                    }
                                    d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
                                } else {
                                    for (let i = 1; i < pts.length; i++) {
                                        d += ` L ${pts[i].x} ${pts[i].y}`;
                                    }
                                }
                                
                                const maxPx = Math.max(...pts.map(p => p.x));
                                const minPx = Math.min(...pts.map(p => p.x));
                                const maxPy = Math.max(...pts.map(p => p.y));
                                const minPy = Math.min(...pts.map(p => p.y));
                                const origW = shpObj.originalWidth || (maxPx - minPx) || 1;
                                const origH = shpObj.originalHeight || (maxPy - minPy) || 1;
                                const scaleX = shpObj.width / origW;
                                const scaleY = shpObj.height / origH;
                                return (
                                    <g>
                                        {/* Invisible wide hit-test path for easier clicking */}
                                        <path 
                                            d={d} 
                                            fill="none" 
                                            stroke="transparent" 
                                            strokeWidth={Math.max(shpObj.strokeWidth + 16, 20)} 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                            transform={`scale(${scaleX}, ${scaleY})`}
                                            style={{ pointerEvents: (tool === 'select') ? 'stroke' : 'none' }}
                                        />
                                        <path 
                                            d={d} 
                                            fill="none" 
                                            stroke={shpObj.color} 
                                            strokeWidth={shpObj.strokeWidth} 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                            opacity={shpObj.isHighlighter ? 0.5 : 1}
                                            transform={`scale(${scaleX}, ${scaleY})`}
                                            vectorEffect="non-scaling-stroke"
                                            style={{ pointerEvents: 'none' }}
                                        />
                                    </g>
                                );
                            } else if (shpObj.type === 'line') {
                                const localStartX = shpObj.startX !== undefined ? shpObj.startX : (shpObj.width < 0 ? Math.abs(shpObj.width) : 0);
                                const localStartY = shpObj.startY !== undefined ? shpObj.startY : (shpObj.height < 0 ? Math.abs(shpObj.height) : 0);
                                const localEndX = shpObj.endX !== undefined ? shpObj.endX : (shpObj.width < 0 ? 0 : (shpObj.width || 0));
                                const localEndY = shpObj.endY !== undefined ? shpObj.endY : (shpObj.height < 0 ? 0 : (shpObj.height || 0));
                                return (
                                    <g>
                                        <line x1={localStartX} y1={localStartY} x2={localEndX} y2={localEndY} stroke="transparent" strokeWidth={Math.max(shpObj.strokeWidth + 16, 20)} strokeLinecap="round" style={{ pointerEvents: (tool === 'select' || isSelected) ? 'stroke' : 'none', cursor: isSelected ? 'move' : 'pointer' }} />
                                        <line x1={localStartX} y1={localStartY} x2={localEndX} y2={localEndY} stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} strokeLinecap="round" style={{ pointerEvents: 'none' }} />
                                    </g>
                                );
                            } else if (shpObj.type === 'arrow') {
                                const localStartX = shpObj.startX !== undefined ? shpObj.startX : (shpObj.width < 0 ? Math.abs(shpObj.width) : 0);
                                const localStartY = shpObj.startY !== undefined ? shpObj.startY : (shpObj.height < 0 ? Math.abs(shpObj.height) : 0);
                                const localEndX = shpObj.endX !== undefined ? shpObj.endX : (shpObj.width < 0 ? 0 : (shpObj.width || 0));
                                const localEndY = shpObj.endY !== undefined ? shpObj.endY : (shpObj.height < 0 ? 0 : (shpObj.height || 0));
                                const angle = Math.atan2(localEndY - localStartY, localEndX - localStartX);
                                const headLength = shpObj.strokeWidth * 4;
                                const p1 = `${localEndX},${localEndY}`;
                                const p2 = `${localEndX - headLength * Math.cos(angle - Math.PI / 6)},${localEndY - headLength * Math.sin(angle - Math.PI / 6)}`;
                                const p3 = `${localEndX - headLength * Math.cos(angle + Math.PI / 6)},${localEndY - headLength * Math.sin(angle + Math.PI / 6)}`;
                                return (
                                    <g>
                                        <line x1={localStartX} y1={localStartY} x2={localEndX} y2={localEndY} stroke="transparent" strokeWidth={Math.max(shpObj.strokeWidth + 16, 20)} strokeLinecap="round" style={{ pointerEvents: (tool === 'select' || isSelected) ? 'stroke' : 'none', cursor: isSelected ? 'move' : 'pointer' }} />
                                        <line x1={localStartX} y1={localStartY} x2={localEndX} y2={localEndY} stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} strokeLinecap="round" style={{ pointerEvents: 'none' }} />
                                        <polygon points={`${p1} ${p2} ${p3}`} fill={shpObj.color} stroke="none" style={{ pointerEvents: 'none' }} />
                                    </g>
                                );
                            } else if (shpObj.type === 'double_arrow') {
                                const localStartX = shpObj.startX !== undefined ? shpObj.startX : (shpObj.width < 0 ? Math.abs(shpObj.width) : 0);
                                const localStartY = shpObj.startY !== undefined ? shpObj.startY : (shpObj.height < 0 ? Math.abs(shpObj.height) : 0);
                                const localEndX = shpObj.endX !== undefined ? shpObj.endX : (shpObj.width < 0 ? 0 : (shpObj.width || 0));
                                const localEndY = shpObj.endY !== undefined ? shpObj.endY : (shpObj.height < 0 ? 0 : (shpObj.height || 0));
                                const angle = Math.atan2(localEndY - localStartY, localEndX - localStartX);
                                const headLength = shpObj.strokeWidth * 4;
                                const p1 = `${localEndX},${localEndY}`;
                                const p2 = `${localEndX - headLength * Math.cos(angle - Math.PI / 6)},${localEndY - headLength * Math.sin(angle - Math.PI / 6)}`;
                                const p3 = `${localEndX - headLength * Math.cos(angle + Math.PI / 6)},${localEndY - headLength * Math.sin(angle + Math.PI / 6)}`;
                                const p4 = `${localStartX},${localStartY}`;
                                const p5 = `${localStartX + headLength * Math.cos(angle - Math.PI / 6)},${localStartY + headLength * Math.sin(angle - Math.PI / 6)}`;
                                const p6 = `${localStartX + headLength * Math.cos(angle + Math.PI / 6)},${localStartY + headLength * Math.sin(angle + Math.PI / 6)}`;
                                return (
                                    <g>
                                        <line x1={localStartX} y1={localStartY} x2={localEndX} y2={localEndY} stroke="transparent" strokeWidth={Math.max(shpObj.strokeWidth + 16, 20)} strokeLinecap="round" style={{ pointerEvents: (tool === 'select' || isSelected) ? 'stroke' : 'none', cursor: isSelected ? 'move' : 'pointer' }} />
                                        <line x1={localStartX} y1={localStartY} x2={localEndX} y2={localEndY} stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} strokeLinecap="round" style={{ pointerEvents: 'none' }} />
                                        <polygon points={`${p1} ${p2} ${p3}`} fill={shpObj.color} stroke="none" style={{ pointerEvents: 'none' }} />
                                        <polygon points={`${p4} ${p5} ${p6}`} fill={shpObj.color} stroke="none" style={{ pointerEvents: 'none' }} />
                                    </g>
                                );
                            } else if (shpObj.type === 'dashed_line') {
                                const localStartX = shpObj.startX !== undefined ? shpObj.startX : (shpObj.width < 0 ? Math.abs(shpObj.width) : 0);
                                const localStartY = shpObj.startY !== undefined ? shpObj.startY : (shpObj.height < 0 ? Math.abs(shpObj.height) : 0);
                                const localEndX = shpObj.endX !== undefined ? shpObj.endX : (shpObj.width < 0 ? 0 : (shpObj.width || 0));
                                const localEndY = shpObj.endY !== undefined ? shpObj.endY : (shpObj.height < 0 ? 0 : (shpObj.height || 0));
                                return (
                                    <g>
                                        <line x1={localStartX} y1={localStartY} x2={localEndX} y2={localEndY} stroke="transparent" strokeWidth={Math.max(shpObj.strokeWidth + 16, 20)} strokeLinecap="round" style={{ pointerEvents: (tool === 'select' || isSelected) ? 'stroke' : 'none', cursor: isSelected ? 'move' : 'pointer' }} />
                                        <line x1={localStartX} y1={localStartY} x2={localEndX} y2={localEndY} stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} strokeLinecap="round" strokeDasharray="6,6" style={{ pointerEvents: 'none' }} />
                                    </g>
                                );
                            } else if (shpObj.type === 'graph') {
                                const step = shpObj.stepSize || 5;
                                const xAxisY = shpObj.height / 2;
                                const yAxisX = shpObj.width / 10;
                                const graphWidth = shpObj.width * 0.8;
                                const graphHeight = shpObj.height * 0.8;
                                
                                // Calculate how many steps fit in half height and full width
                                const numStepsX = Math.floor(graphWidth / 40); // Approx 40px per tick
                                const numStepsY = Math.floor(graphHeight / 2 / 40);
                                
                                const stepPxX = graphWidth / numStepsX;
                                const stepPxY = (graphHeight / 2) / numStepsY;
                                
                                return (
                                    <g stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} fill={fill}>
                                        <rect width={shpObj.width} height={shpObj.height} fill={fill || 'transparent'} stroke="none" style={{ pointerEvents: (tool === 'select' || isSelected) ? 'visiblePainted' : 'none' }} />
                                        {/* Grid lines and ticks for X axis */}
                                        {Array.from({ length: numStepsX + 1 }).map((_, i) => (
                                            <g key={`x-${i}`}>
                                                <line x1={yAxisX + i * stepPxX} y1={shpObj.height*0.1} x2={yAxisX + i * stepPxX} y2={shpObj.height*0.9} stroke={shpObj.color} strokeWidth={Math.max(0.5, shpObj.strokeWidth * 0.3)} strokeDasharray="4 4" opacity="0.4" />
                                                <line x1={yAxisX + i * stepPxX} y1={xAxisY - 5} x2={yAxisX + i * stepPxX} y2={xAxisY + 5} stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} />
                                                {i > 0 && <text x={yAxisX + i * stepPxX} y={xAxisY + 15} fill={shpObj.color} stroke="none" fontSize="10" textAnchor="middle">{i * step}</text>}
                                            </g>
                                        ))}
                                        {/* Grid lines and ticks for Y axis (positive) */}
                                        {Array.from({ length: numStepsY + 1 }).map((_, i) => (
                                            <g key={`yp-${i}`}>
                                                <line x1={yAxisX} y1={xAxisY - i * stepPxY} x2={yAxisX + graphWidth} y2={xAxisY - i * stepPxY} stroke={shpObj.color} strokeWidth={Math.max(0.5, shpObj.strokeWidth * 0.3)} strokeDasharray="4 4" opacity="0.4" />
                                                <line x1={yAxisX - 5} y1={xAxisY - i * stepPxY} x2={yAxisX + 5} y2={xAxisY - i * stepPxY} stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} />
                                                {i > 0 && <text x={yAxisX - 8} y={xAxisY - i * stepPxY + 3} fill={shpObj.color} stroke="none" fontSize="10" textAnchor="end">{i * step}</text>}
                                            </g>
                                        ))}
                                        {/* Grid lines and ticks for Y axis (negative) */}
                                        {Array.from({ length: numStepsY + 1 }).map((_, i) => (
                                            <g key={`yn-${i}`}>
                                                {i > 0 && (
                                                    <>
                                                        <line x1={yAxisX} y1={xAxisY + i * stepPxY} x2={yAxisX + graphWidth} y2={xAxisY + i * stepPxY} stroke={shpObj.color} strokeWidth={Math.max(0.5, shpObj.strokeWidth * 0.3)} strokeDasharray="4 4" opacity="0.4" />
                                                        <line x1={yAxisX - 5} y1={xAxisY + i * stepPxY} x2={yAxisX + 5} y2={xAxisY + i * stepPxY} stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} />
                                                        <text x={yAxisX - 8} y={xAxisY + i * stepPxY + 3} fill={shpObj.color} stroke="none" fontSize="10" textAnchor="end">{-i * step}</text>
                                                    </>
                                                )}
                                            </g>
                                        ))}
                                        {/* Y-axis */}
                                        <line x1={yAxisX} y1={shpObj.height*0.1} x2={yAxisX} y2={shpObj.height*0.9} />
                                        <polygon points={`${yAxisX},${shpObj.height*0.1} ${yAxisX - 4},${shpObj.height*0.1 + 8} ${yAxisX + 4},${shpObj.height*0.1 + 8}`} fill={shpObj.color} stroke="none" />
                                        {/* X-axis */}
                                        <line x1={yAxisX} y1={xAxisY} x2={yAxisX + graphWidth} y2={xAxisY} />
                                        <polygon points={`${yAxisX + graphWidth},${xAxisY} ${yAxisX + graphWidth - 8},${xAxisY - 4} ${yAxisX + graphWidth - 8},${xAxisY + 4}`} fill={shpObj.color} stroke="none" />
                                        {/* Origin */}
                                        <text x={yAxisX - 8} y={xAxisY + 12} fill={shpObj.color} stroke="none" fontSize="10" textAnchor="end">0</text>
                                    </g>
                                );
                            } else if (shpObj.type === 'ruler') {
                                const cmPixels = 38; // Approx px per cm
                                const numCm = Math.floor(shpObj.width / cmPixels);
                                return (
                                    <g stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} fill={fill}>
                                        <rect width={shpObj.width} height={shpObj.height} fill={fill || 'rgba(255, 255, 255, 0.4)'} stroke={shpObj.color} style={{ pointerEvents: (tool === 'select' || isSelected) ? 'visiblePainted' : 'none', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }} />
                                        {/* Ruler markings */}
                                        {Array.from({ length: numCm * 10 }).map((_, i) => {
                                            const x = i * (cmPixels / 10);
                                            if (x > shpObj.width - 2) return null;
                                            const isCm = i % 10 === 0;
                                            const isHalf = i % 5 === 0 && !isCm;
                                            const tickHeight = isCm ? 15 : (isHalf ? 10 : 5);
                                            return (
                                                <g key={`tick-${i}`}>
                                                    <line x1={x} y1={0} x2={x} y2={tickHeight} stroke={shpObj.color} strokeWidth={isCm ? Math.max(1, shpObj.strokeWidth) : Math.max(0.5, shpObj.strokeWidth * 0.5)} />
                                                    {isCm && <text x={x} y={tickHeight + 12} fill={shpObj.color} stroke="none" fontSize="10" textAnchor="middle">{i / 10}</text>}
                                                </g>
                                            );
                                        })}
                                    </g>
                                );
                            } else if (shpObj.type === 'protractor') {
                                const r = Math.min(shpObj.width, shpObj.height) / 2;
                                const cx = shpObj.width / 2;
                                const cy = shpObj.height / 2;
                                return (
                                    <g stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} fill={fill}>
                                        {/* Semicircle */}
                                        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z`} fill={fill || 'rgba(255, 255, 255, 0.4)'} stroke={shpObj.color} style={{ pointerEvents: (tool === 'select' || isSelected) ? 'visiblePainted' : 'none', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }} />
                                        {/* Inner semicircle */}
                                        <path d={`M ${cx - r + 30} ${cy} A ${r - 30} ${r - 30} 0 0 1 ${cx + r - 30} ${cy}`} fill="none" stroke={shpObj.color} />
                                        {/* Center mark */}
                                        <line x1={cx} y1={cy} x2={cx} y2={cy - 10} stroke={shpObj.color} />
                                        <line x1={cx - 10} y1={cy} x2={cx + 10} y2={cy} stroke={shpObj.color} />
                                        {/* Degree markings */}
                                        {Array.from({ length: 181 }).map((_, i) => {
                                            const angle = (i * Math.PI) / 180;
                                            const isTen = i % 10 === 0;
                                            const isFive = i % 5 === 0 && !isTen;
                                            const outerR = r;
                                            const innerR = isTen ? 10 : (isFive ? r - 10 : r - 5);
                                            const x1 = cx - outerR * Math.cos(angle);
                                            const y1 = cy - outerR * Math.sin(angle);
                                            const x2 = cx - innerR * Math.cos(angle);
                                            const y2 = cy - innerR * Math.sin(angle);
                                            const textR = r - 20;
                                            const tx = cx - textR * Math.cos(angle);
                                            const ty = cy - textR * Math.sin(angle);
                                            return (
                                                <g key={`deg-${i}`}>
                                                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={shpObj.color} strokeWidth={isTen ? Math.max(1, shpObj.strokeWidth) : Math.max(0.5, shpObj.strokeWidth * 0.5)} />
                                                    {isTen && <text x={tx} y={ty} fill={shpObj.color} stroke="none" fontSize="8" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${i - 90} ${tx} ${ty})`}>{i}</text>}
                                                </g>
                                            );
                                        })}
                                    </g>
                                );
                            }
                            if (DOMAIN_SHAPES && DOMAIN_SHAPES[shpObj.type]) {
                                const ds = DOMAIN_SHAPES[shpObj.type];
                                const renderFn = ds.render || (ds.renderSVG ? (w, h, fill, stroke, sw) => ds.renderSVG(w, h, stroke, sw, fill) : null);
                                if (renderFn) {
                                    return (
                                        <g style={{ pointerEvents: (tool === 'select' || isSelected) ? 'visiblePainted' : 'none' }}>
                                            {renderFn(shpObj.width, shpObj.height, fill, shpObj.color, shpObj.strokeWidth || 2)}
                                        </g>
                                    );
                                }
                            }
                            return null;
                        };

                        const isLineLike = ['line', 'arrow', 'double_arrow', 'dashed_line'].includes(shpObj.type);
                        const localStartX = shpObj.startX !== undefined ? shpObj.startX : (shpObj.width < 0 ? Math.abs(shpObj.width) : 0);
                        const localStartY = shpObj.startY !== undefined ? shpObj.startY : (shpObj.height < 0 ? Math.abs(shpObj.height) : 0);
                        const localEndX = shpObj.endX !== undefined ? shpObj.endX : (shpObj.width < 0 ? 0 : (shpObj.width || 0));
                        const localEndY = shpObj.endY !== undefined ? shpObj.endY : (shpObj.height < 0 ? 0 : (shpObj.height || 0));

                        const shapeW = isLineLike ? Math.max(20, Math.abs(localEndX - localStartX)) : Math.max(20, Math.abs(shpObj.width || 100));
                        const shapeH = isLineLike ? Math.max(20, Math.abs(localEndY - localStartY)) : Math.max(20, Math.abs(shpObj.height || 100));
                        const cx = isLineLike 
                            ? (shpObj.x || 0) + (localStartX + localEndX) / 2
                            : (shpObj.x || 0) + (shpObj.width || 100) / 2;
                        const cy = isLineLike
                            ? (shpObj.y || 0) + (localStartY + localEndY) / 2
                            : (shpObj.y || 0) + (shpObj.height || 100) / 2;

                        const rad = ((shpObj.rotation || 0) * Math.PI) / 180;
                        const cos = Math.cos(rad);
                        const sin = Math.sin(rad);
                        const halfW = shapeW / 2;
                        const halfH = shapeH / 2;
                        const corners = [
                            { dx: -halfW, dy: -halfH },
                            { dx: halfW, dy: -halfH },
                            { dx: halfW, dy: halfH },
                            { dx: -halfW, dy: halfH }
                        ].map(p => ({
                            x: cx + p.dx * cos - p.dy * sin,
                            y: cy + p.dx * sin + p.dy * cos
                        }));
                        const shapeMinY = Math.min(...corners.map(c => c.y));

                        return (
                            <div key={shpObj.id}>
                                <div
                                    className="whiteboard-shape-item absolute"
                                style={{
                                    left: shpObj.x,
                                    top: shpObj.y,
                                    width: shpObj.width,
                                    height: shpObj.height,
                                    transform: `rotate(${shpObj.rotation || 0}deg) ${shpObj.flipX ? 'scaleX(-1)' : ''} ${shpObj.flipY ? 'scaleY(-1)' : ''}`,
                                    transformOrigin: 'center center',
                                    cursor: isSelected ? 'move' : 'crosshair',
                                    zIndex: shpObj.zIndex || ((shpObj.type === 'ruler' || shpObj.type === 'protractor') ? 60 : (isSelected ? 20 : 10)),
                                    pointerEvents: (tool === 'select' || tool === 'line' || isSelected) ? 'auto' : 'none',
                                }}
                                onMouseEnter={() => setHoveredShapeId(shpObj.id)}
                                onMouseLeave={() => setHoveredShapeId(null)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    if (!shpObj.isLocked && shpObj.type !== 'ruler' && shpObj.type !== 'protractor') {
                                        setEditingShapeTextId(shpObj.id);
                                    }
                                }}
                                onPointerDown={(e) => {
                                    let activeSelectionIds = selectedShapeIds;
                                    if (tool === 'select') {
                                        e.stopPropagation();
                                        if (e.ctrlKey || e.metaKey) {
                                            if (shpObj.groupId) {
                                                const groupIds = shapeObjects.filter(s => s.groupId === shpObj.groupId).map(s => s.id);
                                                const isGroupSelected = groupIds.every(id => selectedShapeIds.includes(id));
                                                if (isGroupSelected) {
                                                    activeSelectionIds = selectedShapeIds.filter(id => !groupIds.includes(id));
                                                } else {
                                                    activeSelectionIds = Array.from(new Set([...selectedShapeIds, ...groupIds]));
                                                }
                                            } else {
                                                activeSelectionIds = selectedShapeIds.includes(shpObj.id) ? selectedShapeIds.filter(id => id !== shpObj.id) : [...selectedShapeIds, shpObj.id];
                                            }
                                            setSelectedShapeIds(activeSelectionIds);
                                        } else {
                                            if (!selectedShapeIds.includes(shpObj.id)) {
                                                if (shpObj.groupId) {
                                                    activeSelectionIds = shapeObjects.filter(s => s.groupId === shpObj.groupId).map(s => s.id);
                                                } else {
                                                    activeSelectionIds = [shpObj.id];
                                                }
                                                setSelectedShapeIds(activeSelectionIds);
                                            }
                                            setSelectedImageId(null);
                                            setSelectedTextIds([]);
                                            setEditingTextId(null);
                                            setSelected3DId(null);
                                            setSelectedMediaId(null);
                                        }
                                    } else if (tool === 'laser') {
                                        setSelectedImageId(null);
                                        setSelectedTextIds([]);
                                        setEditingTextId(null);
                                        return;
                                    }
                                    if (e.target.dataset.handle) return;
                                    if (editingShapeTextId === shpObj.id) return;
                                    e.stopPropagation();
                                    if (shpObj.isLocked) return; // Cannot drag locked object

                                    const clientX = e.clientX !== undefined ? e.clientX : (e.touches?.[0]?.clientX ?? 0);
                                    const clientY = e.clientY !== undefined ? e.clientY : (e.touches?.[0]?.clientY ?? 0);

                                    // Infinite Cloner drag-to-clone behavior for shapes
                                    if (shpObj.isInfiniteCloner) {
                                        const cloneId = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
                                        const cloneObj = { ...shpObj, id: cloneId, isInfiniteCloner: false };
                                        setShapeObjects(prev => [...prev, cloneObj]);
                                        setSelectedShapeIds([cloneId]);
                                        setShapeDragState({
                                            id: cloneId,
                                            action: 'move',
                                            startX: clientX,
                                            startY: clientY,
                                            startObj: { ...cloneObj },
                                            startObjs: [cloneObj],
                                            startTextObjs: []
                                        });
                                        return;
                                    }

                                    setShapeDragState({
                                        id: shpObj.id,
                                        action: 'move',
                                        startX: clientX,
                                        startY: clientY,
                                        startObj: { ...shpObj },
                                        startObjs: shapeObjects.filter(s => activeSelectionIds.includes(s.id) && !s.isLocked),
                                        startTextObjs: textObjects.filter(t => selectedTextIds.includes(t.id))
                                    });
                                }}
                            >
                                <svg width="100%" height="100%" style={{ overflow: 'visible', pointerEvents: 'none' }}>
                                    {renderShapeSVG()}
                                    </svg>

                        {/* Infinite Cloner Interactive Toggle / Badge */}
                        {isSelected ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, isInfiniteCloner: !s.isInfiniteCloner } : s));
                                }}
                                onMouseDown={e => e.stopPropagation()}
                                onPointerDown={e => e.stopPropagation()}
                                className={`absolute -top-3.5 -left-3.5 z-40 p-1 rounded shadow border transition-all pointer-events-auto ${
                                    shpObj.isInfiniteCloner
                                        ? 'opacity-100 bg-indigo-600 border-indigo-400 text-white scale-105 shadow-indigo-500/50'
                                        : 'opacity-35 hover:opacity-100 bg-slate-900/90 hover:bg-slate-900 border-slate-700/70 text-slate-300 hover:text-white hover:scale-110'
                                }`}
                                title={shpObj.isInfiniteCloner ? "Infinite Copy ON (Click to Turn OFF)" : "Infinite Copy OFF (Click to Turn ON)"}
                            >
                                <InfinityIcon size={12} />
                            </button>
                        ) : (
                            shpObj.isInfiniteCloner && (
                                <div className="absolute top-1 left-1 bg-indigo-600/90 text-white rounded-full px-1.5 py-0.5 text-[9px] font-extrabold flex items-center gap-0.5 shadow pointer-events-none z-30">
                                    <span>∞</span>
                                </div>
                            )
                        )}

                        {/* Top-Right Corner Lock Hook */}
                        {isSelected ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleLock(shpObj.id);
                                }}
                                onMouseDown={e => e.stopPropagation()}
                                onPointerDown={e => e.stopPropagation()}
                                className={`absolute -top-3.5 -right-3.5 z-40 p-1 rounded shadow border transition-all pointer-events-auto ${
                                    shpObj.isLocked
                                        ? 'opacity-85 hover:opacity-100 bg-amber-600/90 border-amber-400 text-white scale-105'
                                        : 'opacity-35 hover:opacity-100 bg-slate-900/90 hover:bg-slate-900 border-slate-700/70 text-slate-300 hover:text-white hover:scale-110'
                                }`}
                                title={shpObj.isLocked ? "Locked (Click to Unlock)" : "Unlocked (Click to Lock)"}
                            >
                                {shpObj.isLocked ? <Lock size={12} className="text-amber-200" /> : <Unlock size={12} />}
                            </button>
                        ) : (
                            shpObj.isLocked && (
                                <div className="absolute top-1 right-1 bg-white/80 p-0.5 rounded-full shadow pointer-events-none" style={{ zIndex: 30 }}>
                                    <Lock size={12} className="text-red-500" />
                                </div>
                            )
                        )}

                        {/* East-Side 4 Layer Hooks */}
                        {isSelected && (
                            <div
                                className="absolute -right-7 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-40 pointer-events-auto opacity-35 hover:opacity-100 transition-all select-none"
                                onClick={e => e.stopPropagation()}
                                onMouseDown={e => e.stopPropagation()}
                                onPointerDown={e => e.stopPropagation()}
                            >
                                <button
                                    type="button"
                                    onClick={() => handleBringToFront(shpObj.id)}
                                    className="p-1 bg-slate-900/90 hover:bg-slate-900 border border-slate-700/70 hover:border-slate-500 rounded text-slate-300 hover:text-white hover:scale-110 transition shadow-md"
                                    title="Bring to Front"
                                >
                                    <ChevronsUp size={12} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleBringForward(shpObj.id)}
                                    className="p-1 bg-slate-900/90 hover:bg-slate-900 border border-slate-700/70 hover:border-slate-500 rounded text-slate-300 hover:text-white hover:scale-110 transition shadow-md"
                                    title="Bring Forward"
                                >
                                    <ChevronUp size={12} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSendBackward(shpObj.id)}
                                    className="p-1 bg-slate-900/90 hover:bg-slate-900 border border-slate-700/70 hover:border-slate-500 rounded text-slate-300 hover:text-white hover:scale-110 transition shadow-md"
                                    title="Send Backward"
                                >
                                    <ChevronDown size={12} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSendToBack(shpObj.id)}
                                    className="p-1 bg-slate-900/90 hover:bg-slate-900 border border-slate-700/70 hover:border-slate-500 rounded text-slate-300 hover:text-white hover:scale-110 transition shadow-md"
                                    title="Send to Back"
                                >
                                    <ChevronsDown size={12} />
                                </button>
                            </div>
                        )}

                        {tool === 'select' && shpObj.groupId && (
                            <div className="absolute top-1 left-1 bg-white/80 p-0.5 rounded-full shadow pointer-events-none" style={{ zIndex: 30 }}>
                                <Group size={12} className="text-blue-500" />
                            </div>
                        )}

                                
                                {shpObj.type !== 'ruler' && shpObj.type !== 'protractor' && (
                                    ['line', 'arrow', 'double_arrow', 'dashed_line'].includes(shpObj.type) ? (() => {
                                        const localStartX = shpObj.startX !== undefined ? shpObj.startX : (shpObj.width < 0 ? Math.abs(shpObj.width) : 0);
                                        const localStartY = shpObj.startY !== undefined ? shpObj.startY : (shpObj.height < 0 ? Math.abs(shpObj.height) : 0);
                                        const localEndX = shpObj.endX !== undefined ? shpObj.endX : (shpObj.width < 0 ? 0 : (shpObj.width || 0));
                                        const localEndY = shpObj.endY !== undefined ? shpObj.endY : (shpObj.height < 0 ? 0 : (shpObj.height || 0));
                                        const lineMidX = (localStartX + localEndX) / 2;
                                        const lineMidY = (localStartY + localEndY) / 2;
                                        const isEditingLine = editingShapeTextId === shpObj.id;
                                        const hasText = shpObj.text && String(shpObj.text).trim() !== '';

                                        return (
                                            <div
                                                className="absolute z-40"
                                                style={{
                                                    left: `${lineMidX}px`,
                                                    top: `${lineMidY}px`,
                                                    transform: 'translate(-50%, -50%)',
                                                    pointerEvents: 'auto'
                                                }}
                                                onClick={e => e.stopPropagation()}
                                                onMouseDown={e => e.stopPropagation()}
                                                onPointerDown={e => e.stopPropagation()}
                                            >
                                                {isEditingLine ? (
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={shpObj.text || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, text: val } : s));
                                                        }}
                                                        onBlur={() => {
                                                            setEditingShapeTextId(null);
                                                            saveToHistory();
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === 'Escape') {
                                                                setEditingShapeTextId(null);
                                                                saveToHistory();
                                                            }
                                                            e.stopPropagation();
                                                        }}
                                                        placeholder="Label..."
                                                        className="px-2.5 py-0.5 text-xs text-center font-semibold bg-white/95 dark:bg-slate-900/95 border-2 border-blue-500 rounded-full shadow-xl outline-none min-w-[70px] max-w-[200px] text-slate-800 dark:text-slate-100"
                                                    />
                                                ) : hasText ? (
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingShapeTextId(shpObj.id);
                                                        }}
                                                        onDoubleClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingShapeTextId(shpObj.id);
                                                        }}
                                                        className="px-2.5 py-0.5 text-xs font-semibold rounded-full shadow-md bg-white/95 dark:bg-slate-900/95 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-blue-500 cursor-pointer pointer-events-auto transition select-none flex items-center gap-1"
                                                        style={{
                                                            color: shpObj.textColor || shpObj.color,
                                                            fontSize: Math.min(shpObj.fontSize || 13, 15),
                                                            fontFamily: shpObj.fontFamily || 'sans-serif'
                                                        }}
                                                        title="Click to edit edge label"
                                                    >
                                                        {shpObj.text}
                                                    </div>
                                                ) : (isSelected || hoveredShapeId === shpObj.id) ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingShapeTextId(shpObj.id);
                                                        }}
                                                        className="px-2 py-0.5 text-[11px] font-medium text-slate-500 hover:text-blue-600 bg-white/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-600 rounded-full shadow-sm hover:border-blue-500 cursor-pointer pointer-events-auto transition flex items-center gap-1 select-none"
                                                        title="Add label to line edge"
                                                    >
                                                        <span>+ Label</span>
                                                    </button>
                                                ) : null}
                                            </div>
                                        );
                                    })() : (
                                        shpObj.text !== undefined && (
                                            <div 
                                                className="absolute inset-0 flex items-center justify-center p-2"
                                                style={{
                                                    pointerEvents: editingShapeTextId === shpObj.id ? 'auto' : 'none'
                                                }}
                                            >
                                                {editingShapeTextId === shpObj.id ? (
                                                    <textarea
                                                        autoFocus
                                                        value={shpObj.text}
                                                        onChange={(e) => {
                                                            setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, text: e.target.value } : s));
                                                        }}
                                                        onBlur={() => {
                                                            setEditingShapeTextId(null);
                                                            saveToHistory();
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Escape') {
                                                                setEditingShapeTextId(null);
                                                            }
                                                            e.stopPropagation();
                                                        }}
                                                        onMouseDown={e => e.stopPropagation()}
                                                        onPointerDown={e => e.stopPropagation()}
                                                        placeholder="Type text..."
                                                        className="w-full text-center bg-white/60 dark:bg-black/60 backdrop-blur-xs border border-indigo-500 rounded outline-none resize-none overflow-hidden p-1 shadow-inner text-slate-800 dark:text-slate-100"
                                                        style={{ 
                                                            color: shpObj.textColor || shpObj.color, 
                                                            fontSize: shpObj.fontSize || 20,
                                                            fontFamily: shpObj.fontFamily || 'sans-serif',
                                                            fontWeight: shpObj.fontWeight || 'normal',
                                                            fontStyle: shpObj.fontStyle || 'normal',
                                                        }}
                                                    />
                                                ) : (
                                                    <div
                                                        className="w-full text-center select-none whitespace-pre-wrap break-words pointer-events-none"
                                                        style={{ 
                                                            color: shpObj.textColor || shpObj.color, 
                                                            fontSize: shpObj.fontSize || 20,
                                                            fontFamily: shpObj.fontFamily || 'sans-serif',
                                                            fontWeight: shpObj.fontWeight || 'normal',
                                                            fontStyle: shpObj.fontStyle || 'normal',
                                                        }}
                                                    >
                                                        {shpObj.text || (isSelected ? <span className="text-slate-400 italic text-[11px] block select-none">Double-click to type</span> : '')}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    )
                                )}

                                {/* Magnetic Connection Hooks (N, E, S, W) for linking diagrams & connectors */}
                                {(isSelected || tool === 'line' || hoveredShapeId === shpObj.id) && 
                                 !['line', 'arrow', 'double_arrow', 'dashed_line', 'arc', 'curved_line', 'path', 'freehand'].includes(shpObj.type) && 
                                 shpObj.type !== 'ruler' && shpObj.type !== 'protractor' && shpObj.type !== 'connector' && (
                                    <>
                                        {[
                                            { anchor: 'top', label: 'N', style: { left: '50%', top: 0 } },
                                            { anchor: 'right', label: 'E', style: { left: '100%', top: '50%' } },
                                            { anchor: 'bottom', label: 'S', style: { left: '50%', top: '100%' } },
                                            { anchor: 'left', label: 'W', style: { left: 0, top: '50%' } },
                                            { anchor: 'center', label: 'C', style: { left: '50%', top: '50%' } },
                                        ].map(({ anchor, label, style }) => (
                                            <div
                                                key={anchor}
                                                className="shape-magnetic-hook absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 border-2 border-white shadow-md hover:bg-blue-600 hover:scale-125 transition-all z-35 flex items-center justify-center cursor-crosshair group/hook"
                                                style={{ ...style, pointerEvents: 'auto' }}
                                                title={`Connect from ${anchor.toUpperCase()} hook (Hover to select style, drag to link)`}
                                                onPointerEnter={() => {
                                                    if (hookHoverTimeoutRef.current) clearTimeout(hookHoverTimeoutRef.current);
                                                    setHoveredHook({ shapeId: shpObj.id, anchor });
                                                }}
                                                onPointerLeave={() => {
                                                    hookHoverTimeoutRef.current = setTimeout(() => {
                                                        setHoveredHook(null);
                                                    }, 700);
                                                }}
                                                onPointerDown={(e) => {
                                                    startConnectorDrag(shpObj, anchor, activeConnectorPreset, e);
                                                }}
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-white pointer-events-none" />

                                                {/* Hover Style Popover */}
                                                {hoveredHook?.shapeId === shpObj.id && hoveredHook?.anchor === anchor && (
                                                    <div
                                                        className={`connector-hover-popover absolute z-50 flex items-center gap-1 bg-slate-900/95 backdrop-blur-sm border border-slate-700 shadow-2xl rounded-xl p-1 text-white animate-in fade-in zoom-in-95 duration-150 before:content-[''] before:absolute before:-inset-3 before:z-[-1] ${
                                                            anchor === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' :
                                                            anchor === 'bottom' ? 'top-full mt-2 left-1/2 -translate-x-1/2' :
                                                            anchor === 'left' ? 'right-full mr-2 top-1/2 -translate-y-1/2' :
                                                            'left-full ml-2 top-1/2 -translate-y-1/2'
                                                        }`}
                                                        style={{ pointerEvents: 'auto' }}
                                                        onPointerEnter={() => {
                                                            if (hookHoverTimeoutRef.current) clearTimeout(hookHoverTimeoutRef.current);
                                                        }}
                                                        onPointerLeave={() => {
                                                            hookHoverTimeoutRef.current = setTimeout(() => {
                                                                setHoveredHook(null);
                                                            }, 700);
                                                        }}
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {CONNECTOR_PRESET_STYLES.map((preset) => (
                                                            <button
                                                                key={preset.id}
                                                                type="button"
                                                                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all cursor-grab active:cursor-grabbing group/btn ${
                                                                    activeConnectorPreset?.id === preset.id 
                                                                        ? 'bg-blue-600 text-white shadow' 
                                                                        : 'hover:bg-slate-700 text-slate-300 hover:text-white'
                                                                }`}
                                                                title={`${preset.label} (Click to set active, drag to connect)`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveConnectorPreset(preset);
                                                                }}
                                                                onPointerDown={(e) => {
                                                                    setActiveConnectorPreset(preset);
                                                                    startConnectorDrag(shpObj, anchor, preset, e);
                                                                }}
                                                            >
                                                                {preset.icon}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </>
                                )}

                                {/* Selection Border & Handles */}
                                {isSelected && (
                                    <>
                                        {!['line', 'arrow', 'double_arrow', 'dashed_line'].includes(shpObj.type) && (
                                            <div className="absolute inset-0 border-2 border-purple-500 pointer-events-none" />
                                        )}
                                        <div 
                                            className="absolute inset-0" 
                                            style={{ 
                                                pointerEvents: (editingShapeTextId === shpObj.id || ['line', 'arrow', 'double_arrow', 'dashed_line'].includes(shpObj.type)) ? 'none' : 'auto', 
                                                cursor: 'move',
                                                touchAction: 'none'
                                            }} 
                                            onPointerDown={(e) => { 
                                                if (!canUserDraw) return; 
                                                if (editingShapeTextId === shpObj.id) return;
                                                e.stopPropagation(); 
                                                if (e.cancelable) e.preventDefault(); 
                                                if (shpObj.isLocked) return; 
                                                const clientX = e.clientX !== undefined ? e.clientX : (e.touches?.[0]?.clientX ?? 0);
                                                const clientY = e.clientY !== undefined ? e.clientY : (e.touches?.[0]?.clientY ?? 0);

                                                if (shpObj.isInfiniteCloner) {
                                                    const cloneId = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
                                                    const cloneObj = { ...shpObj, id: cloneId, isInfiniteCloner: false };
                                                    setShapeObjects(prev => [...prev, cloneObj]);
                                                    setSelectedShapeIds([cloneId]);
                                                    setShapeDragState({
                                                        id: cloneId,
                                                        action: 'move',
                                                        startX: clientX,
                                                        startY: clientY,
                                                        startObj: { ...cloneObj },
                                                        startObjs: [cloneObj],
                                                        startTextObjs: []
                                                    });
                                                    return;
                                                }

                                                setShapeDragState({ 
                                                    id: shpObj.id, 
                                                    action: 'move', 
                                                    startX: clientX, 
                                                    startY: clientY, 
                                                    startObj: { ...shpObj }, 
                                                    startObjs: shapeObjects.filter(s => selectedShapeIds.includes(s.id)), 
                                                    startTextObjs: textObjects.filter(t => selectedTextIds.includes(t.id)) 
                                                }); 
                                            }} 
                                        />
                                        

                                        
                                        {!shpObj.isLocked && shpObj.type !== 'ruler' && shpObj.type !== 'protractor' && (
                                            ['line', 'arrow', 'double_arrow', 'dashed_line'].includes(shpObj.type) ? (
                                                (() => {
                                                    const localStartX = shpObj.startX !== undefined ? shpObj.startX : (shpObj.width < 0 ? Math.abs(shpObj.width) : 0);
                                                    const localStartY = shpObj.startY !== undefined ? shpObj.startY : (shpObj.height < 0 ? Math.abs(shpObj.height) : 0);
                                                    const localEndX = shpObj.endX !== undefined ? shpObj.endX : (shpObj.width < 0 ? 0 : (shpObj.width || 0));
                                                    const localEndY = shpObj.endY !== undefined ? shpObj.endY : (shpObj.height < 0 ? 0 : (shpObj.height || 0));
                                                    const midX = (localStartX + localEndX) / 2;
                                                    const midY = (localStartY + localEndY) / 2;
                                                    const lineAngle = Math.atan2(localEndY - localStartY, localEndX - localStartX);
                                                    const normalAngle = lineAngle - Math.PI / 2;
                                                    const rotX = midX + 28 * Math.cos(normalAngle);
                                                    const rotY = midY + 28 * Math.sin(normalAngle);

                                                    return (
                                                        <>
                                                            {/* Start Endpoint Handle */}
                                                            <div
                                                                data-handle="line-endpoint-start"
                                                                className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border-2 border-purple-600 shadow-lg hover:scale-125 transition-transform z-35 flex items-center justify-center cursor-move"
                                                                style={{ left: localStartX, top: localStartY, pointerEvents: 'auto' }}
                                                                title="Drag to reposition Start point"
                                                                onMouseDown={(e) => {
                                                                    e.stopPropagation();
                                                                    e.preventDefault();
                                                                    setShapeDragState({
                                                                        id: shpObj.id,
                                                                        action: 'line-endpoint-start',
                                                                        startX: e.clientX,
                                                                        startY: e.clientY,
                                                                        startObj: { ...shpObj }
                                                                    });
                                                                }}
                                                                onPointerDown={(e) => {
                                                                    e.stopPropagation();
                                                                    if (e.cancelable) e.preventDefault();
                                                                    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                                                                    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                                                                    setShapeDragState({
                                                                        id: shpObj.id,
                                                                        action: 'line-endpoint-start',
                                                                        startX: clientX,
                                                                        startY: clientY,
                                                                        startObj: { ...shpObj }
                                                                    });
                                                                }}
                                                            >
                                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-600 pointer-events-none" />
                                                            </div>

                                                            {/* End Endpoint Handle */}
                                                            <div
                                                                data-handle="line-endpoint-end"
                                                                className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border-2 border-purple-600 shadow-lg hover:scale-125 transition-transform z-35 flex items-center justify-center cursor-move"
                                                                style={{ left: localEndX, top: localEndY, pointerEvents: 'auto' }}
                                                                title="Drag to reposition End point"
                                                                onMouseDown={(e) => {
                                                                    e.stopPropagation();
                                                                    e.preventDefault();
                                                                    setShapeDragState({
                                                                        id: shpObj.id,
                                                                        action: 'line-endpoint-end',
                                                                        startX: e.clientX,
                                                                        startY: e.clientY,
                                                                        startObj: { ...shpObj }
                                                                    });
                                                                }}
                                                                onPointerDown={(e) => {
                                                                    e.stopPropagation();
                                                                    if (e.cancelable) e.preventDefault();
                                                                    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                                                                    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                                                                    setShapeDragState({
                                                                        id: shpObj.id,
                                                                        action: 'line-endpoint-end',
                                                                        startX: clientX,
                                                                        startY: clientY,
                                                                        startObj: { ...shpObj }
                                                                    });
                                                                }}
                                                            >
                                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-600 pointer-events-none" />
                                                            </div>

                                                            {/* Line Midpoint Rotate Hook */}
                                                            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-30">
                                                                <line x1={midX} y1={midY} x2={rotX} y2={rotY} stroke="#a855f7" strokeWidth="1.5" strokeDasharray="3,3" />
                                                            </svg>
                                                            <div
                                                                data-handle="rotate"
                                                                className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500 hover:bg-purple-600 flex items-center justify-center cursor-grab shadow-md z-35 transition-transform hover:scale-110"
                                                                style={{ left: rotX, top: rotY, pointerEvents: 'auto' }}
                                                                title="Rotate Line"
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
                                                                onPointerDown={(e) => {
                                                                    e.stopPropagation();
                                                                    if (e.cancelable) e.preventDefault();
                                                                    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                                                                    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                                                                    setShapeDragState({
                                                                        id: shpObj.id,
                                                                        action: 'rotate',
                                                                        startX: clientX,
                                                                        startY: clientY,
                                                                        startObj: { ...shpObj }
                                                                    });
                                                                }}
                                                            >
                                                                <RotateCw className="w-3 h-3 text-white pointer-events-none" />
                                                            </div>
                                                        </>
                                                    );
                                                })()
                                            ) : (
                                                <>
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
                                                                onPointerDown={(e) => {
                                                                    e.stopPropagation();
                                                                    if (e.cancelable) e.preventDefault();
                                                                    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                                                                    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                                                                    setShapeDragState({
                                                                        id: shpObj.id,
                                                                        action: `resize-${corner}`,
                                                                        startX: clientX,
                                                                        startY: clientY,
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
                                                                onPointerDown={(e) => {
                                                                    e.stopPropagation();
                                                                    if (e.cancelable) e.preventDefault();
                                                                    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                                                                    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                                                                    setShapeDragState({
                                                                        id: shpObj.id,
                                                                        action: `resize-${edge}`,
                                                                        startX: clientX,
                                                                        startY: clientY,
                                                                        startObj: { ...shpObj }
                                                                    });
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                    {/* Rotate Handle */}
                                                    <div className="absolute left-1/2 -translate-x-1/2 flex flex-col-reverse items-center z-30" style={{ top: -38 }}>
                                                        <div className="w-px h-5 bg-purple-500" />
                                                        <div
                                                            data-handle="rotate"
                                                            className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center cursor-grab hover:bg-purple-600 shadow-md" style={{ cursor: 'grab' }}
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
                                                            onPointerDown={(e) => {
                                                                e.stopPropagation();
                                                                if (e.cancelable) e.preventDefault();
                                                                const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                                                                const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                                                                setShapeDragState({
                                                                    id: shpObj.id,
                                                                    action: 'rotate',
                                                                    startX: clientX,
                                                                    startY: clientY,
                                                                    startObj: { ...shpObj }
                                                                });
                                                            }}
                                                        >
                                                            <RotateCw className="w-3 h-3 text-white" />
                                                        </div>
                                                        <input
                                                            type="number"
                                                            value={Math.round(shpObj.rotation || 0)}
                                                            onChange={(e) => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, rotation: parseInt(e.target.value) || 0 } : s))}
                                                            onPointerDown={(e) => e.stopPropagation()}
                                                            onKeyDown={(e) => e.stopPropagation()}
                                                            className="mb-1 w-12 text-center text-xs bg-slate-800 text-white px-1 py-0.5 rounded shadow-lg z-50 border border-slate-600 outline-none appearance-none"
                                                        />
                                                    </div>
                                                </>
                                            )
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Static Unrotated Floating Shape Format Bar */}
                            {isSelected && (selectedShapeIds.length === 1 && selectedShapeIds[0] === shpObj.id) && editingShapeTextId !== shpObj.id && !shapeDragState && shpObj.type !== 'ruler' && shpObj.type !== 'protractor' && (
                                <div
                                    className="absolute pointer-events-auto select-none"
                                    style={{
                                        left: cx,
                                        top: shapeMinY - (shpObj.isLocked ? 14 : 44),
                                        transform: 'translate(-50%, -100%)',
                                        zIndex: 70,
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl px-2.5 py-1 text-slate-200 animate-in fade-in zoom-in-95 duration-100">
                                        {isLineLike ? (
                                            <>
                                                {/* Line Color */}
                                                <div className="relative w-5 h-5 rounded border border-slate-700 cursor-pointer overflow-hidden flex items-center justify-center hover:scale-105 transition" title="Line Color">
                                                    <div className="w-full h-full" style={{ backgroundColor: shpObj.color || '#000000' }} />
                                                    <input
                                                        type="color"
                                                        value={shpObj.color || '#000000'}
                                                        onChange={(e) => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, color: e.target.value } : s))}
                                                        className="absolute inset-[-10px] w-10 h-10 opacity-0 cursor-pointer"
                                                        title="Line Color"
                                                    />
                                                </div>

                                                {/* Stroke Width */}
                                                <div className="flex items-center bg-slate-800 rounded border border-slate-700 px-1 py-0.5" title="Line Width">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, strokeWidth: Math.max(1, (s.strokeWidth || 2) - 1) } : s))}
                                                        className="w-3.5 h-4 flex items-center justify-center text-[11px] text-slate-300 hover:text-white font-bold"
                                                        title="Decrease Width"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="text-[10px] font-mono text-white px-1 select-none min-w-[14px] text-center">
                                                        {shpObj.strokeWidth || 2}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, strokeWidth: Math.min(30, (s.strokeWidth || 2) + 1) } : s))}
                                                        className="w-3.5 h-4 flex items-center justify-center text-[11px] text-slate-300 hover:text-white font-bold"
                                                        title="Increase Width"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

                                                {/* Dash Style */}
                                                <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700/60" title="Dash Style">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, strokeStyle: 'solid' } : s))}
                                                        className={`px-1.5 py-1 rounded transition ${shpObj.strokeStyle === 'solid' || !shpObj.strokeStyle ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                                        title="Solid Line"
                                                    >
                                                        <svg className="w-4 h-2" viewBox="0 0 20 6" fill="none">
                                                            <line x1="1" y1="3" x2="19" y2="3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, strokeStyle: 'dashed' } : s))}
                                                        className={`px-1.5 py-1 rounded transition ${shpObj.strokeStyle === 'dashed' || shpObj.type === 'dashed_line' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                                        title="Dashed Line"
                                                    >
                                                        <svg className="w-4 h-2" viewBox="0 0 20 6" fill="none">
                                                            <line x1="1" y1="3" x2="19" y2="3" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4,3" strokeLinecap="round" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, strokeStyle: 'dotted' } : s))}
                                                        className={`px-1.5 py-1 rounded transition ${shpObj.strokeStyle === 'dotted' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                                        title="Dotted Line"
                                                    >
                                                        <svg className="w-4 h-2" viewBox="0 0 20 6" fill="none">
                                                            <line x1="1" y1="3" x2="19" y2="3" stroke="currentColor" strokeWidth="2.5" strokeDasharray="2,3" strokeLinecap="round" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

                                                {/* Arrow Ends */}
                                                <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700/60" title="Arrow Ends">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, type: 'line', arrowStart: 'none', arrowEnd: 'none' } : s))}
                                                        className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition ${shpObj.type === 'line' || shpObj.type === 'dashed_line' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                                        title="Plain Line"
                                                    >
                                                        —
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, type: 'arrow', arrowStart: 'none', arrowEnd: 'arrow' } : s))}
                                                        className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition ${shpObj.type === 'arrow' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                                        title="Arrow End"
                                                    >
                                                        →
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, type: 'double_arrow', arrowStart: 'arrow', arrowEnd: 'arrow' } : s))}
                                                        className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition ${shpObj.type === 'double_arrow' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                                        title="Double Arrow"
                                                    >
                                                        ↔
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {/* Stroke / Border Color */}
                                                <div className="relative w-5 h-5 rounded border border-slate-700 cursor-pointer overflow-hidden flex items-center justify-center hover:scale-105 transition" title="Border Color">
                                                    <div className="w-full h-full" style={{ backgroundColor: shpObj.color || '#000000' }} />
                                                    <input
                                                        type="color"
                                                        value={shpObj.color || '#000000'}
                                                        onChange={(e) => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, color: e.target.value } : s))}
                                                        className="absolute inset-[-10px] w-10 h-10 opacity-0 cursor-pointer"
                                                        title="Border Color"
                                                    />
                                                </div>

                                                {/* Fill Color + Transparent Toggle */}
                                                <div className="relative w-5 h-5 rounded border border-slate-700 cursor-pointer overflow-hidden flex items-center justify-center hover:scale-105 transition" title="Fill Color">
                                                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: shpObj.fillColor && shpObj.fillColor !== 'transparent' ? shpObj.fillColor : 'transparent' }}>
                                                        {(!shpObj.fillColor || shpObj.fillColor === 'transparent') && (
                                                            <span className="text-[7px] text-slate-400 leading-none">✕</span>
                                                        )}
                                                    </div>
                                                    <input
                                                        type="color"
                                                        value={shpObj.fillColor && shpObj.fillColor !== 'transparent' ? shpObj.fillColor : '#ffffff'}
                                                        onChange={(e) => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, fillColor: e.target.value } : s))}
                                                        className="absolute inset-[-10px] w-10 h-10 opacity-0 cursor-pointer"
                                                        title="Fill Color"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, fillColor: 'transparent' } : s))}
                                                    className="w-4 h-4 flex items-center justify-center rounded hover:bg-slate-800 text-[10px] text-slate-400 hover:text-white"
                                                    title="No Fill"
                                                >
                                                    <X size={11} />
                                                </button>

                                                {/* Stroke Width */}
                                                <div className="flex items-center bg-slate-800 rounded border border-slate-700 px-1 py-0.5" title="Stroke Width">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, strokeWidth: Math.max(1, (s.strokeWidth || 2) - 1) } : s))}
                                                        className="w-3.5 h-4 flex items-center justify-center text-[11px] text-slate-300 hover:text-white font-bold"
                                                        title="Decrease Stroke Width"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="text-[10px] font-mono text-white px-1 select-none min-w-[14px] text-center">
                                                        {shpObj.strokeWidth || 2}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, strokeWidth: Math.min(30, (s.strokeWidth || 2) + 1) } : s))}
                                                        className="w-3.5 h-4 flex items-center justify-center text-[11px] text-slate-300 hover:text-white font-bold"
                                                        title="Increase Stroke Width"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                {/* Border Line Style: Solid, Dashed, Dotted, Double */}
                                                <div className="flex items-center bg-slate-800 rounded border border-slate-700 p-0.5" title="Border Style">
                                                    {[
                                                        { id: 'solid', label: 'Solid Border', icon: <line x1="2" y1="5" x2="22" y2="5" stroke="currentColor" strokeWidth="2.5" /> },
                                                        { id: 'dashed', label: 'Dashed Border', icon: <line x1="2" y1="5" x2="22" y2="5" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5,3" /> },
                                                        { id: 'dotted', label: 'Dotted Border', icon: <line x1="2" y1="5" x2="22" y2="5" stroke="currentColor" strokeWidth="2.5" strokeDasharray="2,3" strokeLinecap="round" /> },
                                                        { id: 'double', label: 'Double Border', icon: <><line x1="2" y1="3" x2="22" y2="3" stroke="currentColor" strokeWidth="1.5" /><line x1="2" y1="7" x2="22" y2="7" stroke="currentColor" strokeWidth="1.5" /></> }
                                                    ].map(b => (
                                                        <button
                                                            key={b.id}
                                                            type="button"
                                                            onClick={() => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, borderStyle: b.id } : s))}
                                                            className={`px-1.5 py-1 rounded transition ${(shpObj.borderStyle || 'solid') === b.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/60'}`}
                                                            title={b.label}
                                                        >
                                                            <svg className="w-4 h-2.5" viewBox="0 0 24 10" fill="none">{b.icon}</svg>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Shape Text Controls */}
                                                <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

                                                <div className="relative w-5 h-5 flex flex-col items-center justify-center rounded hover:bg-slate-800 border border-slate-700 cursor-pointer overflow-hidden" title="Text Color">
                                                    <span className="font-bold text-[11px] leading-none select-none text-slate-200 mt-0.5">A</span>
                                                    <div className="w-3 h-0.5 mt-[1px] rounded-xs" style={{ backgroundColor: shpObj.textColor || shpObj.color || '#000000' }} />
                                                    <input
                                                        type="color"
                                                        value={shpObj.textColor || shpObj.color || '#000000'}
                                                        onChange={(e) => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, textColor: e.target.value } : s))}
                                                        className="absolute inset-[-10px] w-10 h-10 opacity-0 cursor-pointer"
                                                        title="Text Color"
                                                    />
                                                </div>

                                                <div className="flex items-center bg-slate-800 rounded border border-slate-700 px-1 py-0.5" title="Font Size">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, fontSize: Math.max(10, (s.fontSize || 18) - 2) } : s))}
                                                        className="w-3.5 h-4 flex items-center justify-center text-[11px] text-slate-300 hover:text-white font-bold"
                                                        title="Decrease Font Size"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="text-[10px] font-mono text-white px-1 select-none min-w-[14px] text-center">
                                                        {shpObj.fontSize || 18}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, fontSize: Math.min(80, (s.fontSize || 18) + 2) } : s))}
                                                        className="w-3.5 h-4 flex items-center justify-center text-[11px] text-slate-300 hover:text-white font-bold"
                                                        title="Increase Font Size"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, fontWeight: s.fontWeight === 'bold' ? 'normal' : 'bold' } : s))}
                                                    className={`w-5 h-5 flex items-center justify-center rounded text-xs font-bold transition ${shpObj.fontWeight === 'bold' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                                                    title="Bold"
                                                >
                                                    B
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, fontStyle: s.fontStyle === 'italic' ? 'normal' : 'italic' } : s))}
                                                    className={`w-5 h-5 flex items-center justify-center rounded text-xs italic font-serif transition ${shpObj.fontStyle === 'italic' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                                                    title="Italic"
                                                >
                                                    I
                                                </button>
                                            </>
                                        )}

                                        <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

                                        {/* Infinite Cloner Toggle */}
                                        <button
                                            type="button"
                                            onClick={() => setShapeObjects(prev => prev.map(s => s.id === shpObj.id ? { ...s, isInfiniteCloner: !s.isInfiniteCloner } : s))}
                                            className={`p-1 rounded transition ${shpObj.isInfiniteCloner ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                            title={shpObj.isInfiniteCloner ? "Disable Infinite Cloner" : "Enable Infinite Cloner (drag creates clones)"}
                                        >
                                            <InfinityIcon size={13} />
                                        </button>

                                        {/* Lock */}
                                        <button
                                            type="button"
                                            onClick={() => handleToggleLock()}
                                            className={`p-1 rounded transition ${shpObj.isLocked ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                            title={shpObj.isLocked ? "Unlock Shape" : "Lock Shape"}
                                        >
                                            {shpObj.isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                                        </button>

                                        {/* Delete */}
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition"
                                            title="Delete Shape"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        );
                    })}

                    {/* Multi-Shape Selection Inline Format Bar */}
                    {selectedShapeIds.length > 1 && !shapeDragState && (() => {
                        const selectedShapes = shapeObjects.filter(s => selectedShapeIds.includes(s.id));
                        if (selectedShapes.length < 2) return null;
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        selectedShapes.forEach(s => {
                            const sx = s.x || 0;
                            const sy = s.y || 0;
                            const sw = s.width || 100;
                            const sh = s.height || 100;
                            minX = Math.min(minX, sx, sx + sw);
                            minY = Math.min(minY, sy, sy + sh);
                            maxX = Math.max(maxX, sx, sx + sw);
                            maxY = Math.max(maxY, sy, sy + sh);
                        });
                        const groupCx = (minX + maxX) / 2;
                        const groupTop = minY - 44;

                        return (
                            <div
                                className="absolute pointer-events-auto select-none"
                                style={{
                                    left: groupCx,
                                    top: groupTop,
                                    transform: 'translate(-50%, -100%)',
                                    zIndex: 70,
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl px-2.5 py-1 text-slate-200 animate-in fade-in zoom-in-95 duration-100">
                                    <span className="text-[11px] font-semibold text-slate-400 px-1 select-none">
                                        {selectedShapes.length} shapes
                                    </span>

                                    <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

                                    {/* Border Color */}
                                    <div className="relative w-5 h-5 rounded border border-slate-700 cursor-pointer overflow-hidden flex items-center justify-center hover:scale-105 transition" title="Border Color (All)">
                                        <div className="w-full h-full" style={{ backgroundColor: selectedShapes[0]?.color || '#000000' }} />
                                        <input
                                            type="color"
                                            value={selectedShapes[0]?.color || '#000000'}
                                            onChange={(e) => setShapeObjects(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, color: e.target.value } : s))}
                                            className="absolute inset-[-10px] w-10 h-10 opacity-0 cursor-pointer"
                                            title="Border Color (All)"
                                        />
                                    </div>

                                    {/* Fill Color */}
                                    <div className="relative w-5 h-5 rounded border border-slate-700 cursor-pointer overflow-hidden flex items-center justify-center hover:scale-105 transition" title="Fill Color (All)">
                                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: selectedShapes[0]?.fillColor && selectedShapes[0]?.fillColor !== 'transparent' ? selectedShapes[0].fillColor : 'transparent' }}>
                                            {(!selectedShapes[0]?.fillColor || selectedShapes[0]?.fillColor === 'transparent') && (
                                                <span className="text-[7px] text-slate-400 leading-none">✕</span>
                                            )}
                                        </div>
                                        <input
                                            type="color"
                                            value={selectedShapes[0]?.fillColor && selectedShapes[0]?.fillColor !== 'transparent' ? selectedShapes[0].fillColor : '#ffffff'}
                                            onChange={(e) => setShapeObjects(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, fillColor: e.target.value } : s))}
                                            className="absolute inset-[-10px] w-10 h-10 opacity-0 cursor-pointer"
                                            title="Fill Color (All)"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShapeObjects(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, fillColor: 'transparent' } : s))}
                                        className="w-4 h-4 flex items-center justify-center rounded hover:bg-slate-800 text-[10px] text-slate-400 hover:text-white"
                                        title="No Fill (All)"
                                    >
                                        <X size={11} />
                                    </button>

                                    {/* Stroke Width */}
                                    <div className="flex items-center bg-slate-800 rounded border border-slate-700 px-1 py-0.5" title="Stroke Width (All)">
                                        <button
                                            type="button"
                                            onClick={() => setShapeObjects(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, strokeWidth: Math.max(1, (s.strokeWidth || 2) - 1) } : s))}
                                            className="w-3.5 h-4 flex items-center justify-center text-[11px] text-slate-300 hover:text-white font-bold"
                                            title="Decrease Stroke Width"
                                        >
                                            -
                                        </button>
                                        <span className="text-[10px] font-mono text-white px-1 select-none min-w-[14px] text-center">
                                            {selectedShapes[0]?.strokeWidth || 2}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setShapeObjects(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, strokeWidth: Math.min(30, (s.strokeWidth || 2) + 1) } : s))}
                                            className="w-3.5 h-4 flex items-center justify-center text-[11px] text-slate-300 hover:text-white font-bold"
                                            title="Increase Stroke Width"
                                        >
                                            +
                                        </button>
                                    </div>

                                    {/* Multi-Shape Border Style */}
                                    <div className="flex items-center bg-slate-800 rounded border border-slate-700 p-0.5" title="Border Style (All)">
                                        {[
                                            { id: 'solid', label: 'Solid Border', icon: <line x1="2" y1="5" x2="22" y2="5" stroke="currentColor" strokeWidth="2.5" /> },
                                            { id: 'dashed', label: 'Dashed Border', icon: <line x1="2" y1="5" x2="22" y2="5" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5,3" /> },
                                            { id: 'dotted', label: 'Dotted Border', icon: <line x1="2" y1="5" x2="22" y2="5" stroke="currentColor" strokeWidth="2.5" strokeDasharray="2,3" strokeLinecap="round" /> },
                                            { id: 'double', label: 'Double Border', icon: <><line x1="2" y1="3" x2="22" y2="3" stroke="currentColor" strokeWidth="1.5" /><line x1="2" y1="7" x2="22" y2="7" stroke="currentColor" strokeWidth="1.5" /></> }
                                        ].map(b => (
                                            <button
                                                key={b.id}
                                                type="button"
                                                onClick={() => setShapeObjects(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, borderStyle: b.id } : s))}
                                                className={`px-1.5 py-1 rounded transition ${selectedShapes.every(s => (s.borderStyle || 'solid') === b.id) ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/60'}`}
                                                title={b.label}
                                            >
                                                <svg className="w-4 h-2.5" viewBox="0 0 24 10" fill="none">{b.icon}</svg>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

                                    {/* Group */}
                                    <button
                                        type="button"
                                        onClick={handleGroup}
                                        className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
                                        title="Group Selected Shapes"
                                    >
                                        <Group size={13} />
                                    </button>

                                    {/* Lock */}
                                    <button
                                        type="button"
                                        onClick={handleToggleLock}
                                        className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
                                        title="Lock/Unlock Selected Shapes"
                                    >
                                        {selectedShapes.some(s => s.isLocked) ? <Lock size={13} className="text-amber-400" /> : <Unlock size={13} />}
                                    </button>

                                    {/* Delete */}
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition"
                                        title="Delete Selection"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Top-Left Live Whiteboard Activity Banner */}
                    {recentLiveActions.length > 0 && (
                        <div className="absolute top-4 left-4 z-40 flex flex-col gap-2 pointer-events-none">
                            {recentLiveActions.map((act) => (
                                <div
                                    key={act.socketId + act.timestamp}
                                    className="bg-slate-900/90 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-indigo-500/50 shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200"
                                >
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                    <span>{act.text}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Remote Cursors */}
                    {Object.entries(remoteCursors).map(([id, cursor]) => (
                        <div key={id} className="absolute pointer-events-none z-50 flex items-center" style={{ left: cursor.x, top: cursor.y }}>
                            <svg className="w-5 h-5 text-indigo-500 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M7 2l12 11.2-5.8.5 3.3 7.3-2.2.9-3.2-7.4-4.4 5z"/>
                            </svg>
                            <span className="ml-1 px-2 py-0.5 bg-indigo-600 text-white text-[11px] font-bold rounded-md shadow-lg opacity-95 whitespace-nowrap border border-indigo-400/40">
                                {cursor.userName}{cursor.userIdentifier ? ` (${cursor.userIdentifier})` : ''}{cursor.action ? ` • ${cursor.action}` : ''}
                            </span>
                        </div>
                    ))}

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
                                {/* Infinite Cloner Toggle for Drawing / Ink */}
                                <button
                                    type="button"
                                    onClick={() => setIsSelectionInfiniteCloner(prev => !prev)}
                                    className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                                        isSelectionInfiniteCloner ? 'bg-indigo-600 text-white shadow' : 'text-slate-300 hover:text-white hover:bg-white/10'
                                    }`}
                                    title={isSelectionInfiniteCloner ? "Infinite Copy ON (Click to Turn OFF)" : "Infinite Copy OFF (Click to Turn ON)"}
                                >
                                    <InfinityIcon className="w-4 h-4" />
                                </button>
                                {isSelectionInfiniteCloner && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleCopySelection();
                                            setTimeout(() => {
                                                handlePasteSelection();
                                            }, 60);
                                        }}
                                        className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-all shadow"
                                        title="Stamp duplicate copy on canvas"
                                    >
                                        <span>Stamp +1</span>
                                    </button>
                                )}
                                <div className="w-px h-5 bg-slate-700 mx-1"></div>
                                <button
                                    onClick={() => handleFlipSelection(true)}
                                    className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                                    title="Flip Horizontally"
                                >
                                    <FlipHorizontal className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleFlipSelection(false)}
                                    className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                                    title="Flip Vertically"
                                >
                                    <FlipVertical className="w-4 h-4" />
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

                    {/* Sticky Notes Layer */}
                    {(pageShapeObjects[currentPage] || []).filter(s => s.type === 'sticky_note').map((note) => (
                        <StickyNoteRenderer
                            key={note.id}
                            note={note}
                            isSelected={selectedShapeIds.includes(note.id)}
                            isEditing={editingShapeTextId === note.id}
                            canEdit={canUserDraw}
                            onSelect={(id) => {
                                setSelectedShapeIds([id]);
                                setSelectedImageId(null);
                                setSelectedTextIds([]);
                            }}
                            onUpdate={(id, updates) => {
                                setPageShapeObjects(prev => ({
                                    ...prev,
                                    [currentPage]: (prev[currentPage] || []).map(s => s.id === id ? { ...s, ...updates } : s)
                                }));
                            }}
                            onDelete={(id) => {
                                setPageShapeObjects(prev => ({
                                    ...prev,
                                    [currentPage]: (prev[currentPage] || []).filter(s => s.id !== id)
                                }));
                                setSelectedShapeIds([]);
                            }}
                            onStartDrag={(e, id) => {
                                setShapeDragState({
                                    id,
                                    action: 'move',
                                    startX: e.clientX,
                                    startY: e.clientY,
                                    startObj: { ...note }
                                });
                            }}
                            onStartResize={(e, id, corner) => {
                                setShapeDragState({
                                    id,
                                    action: `resize-${corner}`,
                                    startX: e.clientX,
                                    startY: e.clientY,
                                    startObj: { ...note }
                                });
                            }}
                            onDoubleClick={(id) => {
                                setEditingShapeTextId(id);
                            }}
                        />
                    ))}

                    {/* Smart Connector Lines Layer */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-15 overflow-visible">
                        {(pageShapeObjects[currentPage] || []).filter(s => s.type === 'connector').map((conn) => (
                            <ConnectorLine
                                key={conn.id}
                                connector={conn}
                                shapes={(pageShapeObjects[currentPage] || []).filter(s => s.type !== 'connector')}
                                images={pageImageObjects[currentPage] || []}
                                isSelected={selectedShapeIds.includes(conn.id)}
                                scale={zoomLevel || 1}
                                onSelect={(id) => {
                                    setSelectedShapeIds([id]);
                                    setSelectedImageId(null);
                                    setSelectedTextIds([]);
                                }}
                                onUpdate={(id, updates) => {
                                    setPageShapeObjects(prev => ({
                                        ...prev,
                                        [currentPage]: (prev[currentPage] || []).map(s => s.id === id ? { ...s, ...updates } : s)
                                    }));
                                }}
                                onDelete={(id) => {
                                    setPageShapeObjects(prev => ({
                                        ...prev,
                                        [currentPage]: (prev[currentPage] || []).filter(s => s.id !== id)
                                    }));
                                    setSelectedShapeIds([]);
                                    saveToHistory();
                                }}
                            />
                        ))}

                        {/* Live Interactive Connector Drag Preview */}
                        {activeConnectorDrag && (
                            <g className="connector-drag-preview pointer-events-none">
                                <path
                                    d={getConnectorPath(
                                        activeConnectorDrag.sourcePt,
                                        activeConnectorDrag.currentPt,
                                        isShiftDown ? 'straight' : activeConnectorDrag.style.pathType,
                                        null
                                    )}
                                    fill="none"
                                    stroke={activeConnectorDrag.snappedTarget ? '#10b981' : (color || '#2563eb')}
                                    strokeWidth={strokeWidth || 2}
                                    strokeDasharray={
                                        activeConnectorDrag.style.strokeStyle === 'dashed' ? '6,6' :
                                        activeConnectorDrag.style.strokeStyle === 'dotted' ? '2,4' : 'none'
                                    }
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                {renderArrowhead(
                                    activeConnectorDrag.style.arrowStart,
                                    activeConnectorDrag.sourcePt,
                                    calculateAngle(activeConnectorDrag.currentPt, activeConnectorDrag.sourcePt),
                                    (strokeWidth || 2) * 4,
                                    activeConnectorDrag.snappedTarget ? '#10b981' : (color || '#2563eb')
                                )}
                                {renderArrowhead(
                                    activeConnectorDrag.style.arrowEnd,
                                    activeConnectorDrag.currentPt,
                                    calculateAngle(activeConnectorDrag.sourcePt, activeConnectorDrag.currentPt),
                                    (strokeWidth || 2) * 4,
                                    activeConnectorDrag.snappedTarget ? '#10b981' : (color || '#2563eb')
                                )}
                                {activeConnectorDrag.snappedTarget && (
                                    <circle
                                        cx={activeConnectorDrag.snappedTarget.pt.x}
                                        cy={activeConnectorDrag.snappedTarget.pt.y}
                                        r="12"
                                        fill="rgba(16, 185, 129, 0.35)"
                                        stroke="#10b981"
                                        strokeWidth="2.5"
                                        className="animate-ping"
                                    />
                                )}
                            </g>
                        )}
                    </svg>

                    {/* Floating Draggable Radial Ball */}
                    <div
                        style={{
                            position: 'absolute',
                            left: `${floatingBallPos.x}px`,
                            top: `${floatingBallPos.y}px`,
                            touchAction: 'none'
                        }}
                        className="z-40 pointer-events-auto select-none"
                    >
                        <button
                            type="button"
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                const clientX = e.clientX !== undefined ? e.clientX : (e.touches?.[0]?.clientX ?? 0);
                                const clientY = e.clientY !== undefined ? e.clientY : (e.touches?.[0]?.clientY ?? 0);
                                ballDragStartRef.current = {
                                    startX: clientX,
                                    startY: clientY,
                                    initialX: floatingBallPos.x,
                                    initialY: floatingBallPos.y,
                                    moved: false
                                };
                                setIsDraggingBall(true);

                                const onMove = (me) => {
                                    if (!ballDragStartRef.current) return;
                                    const cx = me.clientX !== undefined ? me.clientX : (me.touches?.[0]?.clientX ?? 0);
                                    const cy = me.clientY !== undefined ? me.clientY : (me.touches?.[0]?.clientY ?? 0);
                                    const dx = cx - ballDragStartRef.current.startX;
                                    const dy = cy - ballDragStartRef.current.startY;
                                    if (Math.hypot(dx, dy) > 4) {
                                        ballDragStartRef.current.moved = true;
                                    }
                                    const maxX = (canvasWrapperRef.current?.clientWidth || window.innerWidth) - 50;
                                    const maxY = (canvasWrapperRef.current?.clientHeight || window.innerHeight) - 50;
                                    const newX = Math.max(10, Math.min(maxX, ballDragStartRef.current.initialX + dx));
                                    const newY = Math.max(10, Math.min(maxY, ballDragStartRef.current.initialY + dy));
                                    setFloatingBallPos({ x: newX, y: newY });
                                };

                                const onUp = () => {
                                    window.removeEventListener('pointermove', onMove);
                                    window.removeEventListener('pointerup', onUp);
                                    window.removeEventListener('touchmove', onMove);
                                    window.removeEventListener('touchend', onUp);
                                    setIsDraggingBall(false);
                                    if (ballDragStartRef.current && !ballDragStartRef.current.moved) {
                                        setRadialMenuPos({ x: floatingBallPos.x + 22, y: floatingBallPos.y + 22 });
                                        setShowRadialMenu(prev => !prev);
                                    }
                                    ballDragStartRef.current = null;
                                };

                                window.addEventListener('pointermove', onMove);
                                window.addEventListener('pointerup', onUp);
                                window.addEventListener('touchmove', onMove, { passive: false });
                                window.addEventListener('touchend', onUp);
                            }}
                            className={`radial-fab-button w-11 h-11 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 shadow-xl shadow-indigo-500/40 border-2 border-white/30 flex items-center justify-center text-white transition-transform duration-150 cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 ${
                                isDraggingBall ? 'opacity-80 scale-105' : ''
                            }`}
                            title="Quick Radial Toolbar (Drag ball anywhere, tap to open)"
                        >
                            <Plus className={`w-5 h-5 transition-transform duration-200 ${showRadialMenu ? 'rotate-45' : ''}`} />
                        </button>
                    </div>

                    {/* Circular Radial Toolbar Centered on Floating Ball */}
                    <RadialToolbar
                        isOpen={showRadialMenu}
                        position={{ x: floatingBallPos.x + 22, y: floatingBallPos.y + 22 }}
                        currentTool={tool}
                        currentBrushType={brushType}
                        onToolSelect={handleRadialToolSelect}
                        onClose={() => setShowRadialMenu(false)}
                        canvasBounds={canvasWrapperRef.current ? { width: canvasWrapperRef.current.clientWidth, height: canvasWrapperRef.current.clientHeight } : { width: 1920, height: 1080 }}
                    />

                    {/* 360-Degree Rotation Protractor & Angle Dial Overlay */}
                    {activeRotatingObject && <RotationDial obj={activeRotatingObject} />}

                    {/* Spotlight Focus Tool (BenQ EZWrite & ViewSonic myViewBoard) */}
                    {isSpotlightActive && (
                        <div
                            ref={spotlightOverlayRef}
                            className="whiteboard-spotlight-overlay absolute inset-0 z-40 pointer-events-auto cursor-crosshair overflow-hidden"
                            onPointerDown={(e) => {
                                if (e.target.closest('button')) e.stopPropagation();
                            }}
                            onMouseMove={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                if (!rect.width || !rect.height) return;
                                const scaleX = canvasWidth / rect.width;
                                const scaleY = canvasHeight / rect.height;
                                setSpotlightPos({
                                    x: (e.clientX - rect.left) * scaleX,
                                    y: (e.clientY - rect.top) * scaleY
                                });
                            }}
                            onTouchMove={(e) => {
                                if (e.touches[0]) {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    if (!rect.width || !rect.height) return;
                                    const scaleX = canvasWidth / rect.width;
                                    const scaleY = canvasHeight / rect.height;
                                    setSpotlightPos({
                                        x: (e.touches[0].clientX - rect.left) * scaleX,
                                        y: (e.touches[0].clientY - rect.top) * scaleY
                                    });
                                }
                            }}
                        >
                            <svg className="w-full h-full" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}>
                                <defs>
                                    <mask id="whiteboard-spotlight-mask">
                                        <rect width="100%" height="100%" fill="white" />
                                        <circle
                                            cx={spotlightPos.x}
                                            cy={spotlightPos.y}
                                            r={spotlightRadius}
                                            fill="black"
                                        />
                                    </mask>
                                </defs>
                                <rect
                                    width="100%"
                                    height="100%"
                                    fill="rgba(15, 23, 42, 0.84)"
                                    mask="url(#whiteboard-spotlight-mask)"
                                />
                                <circle
                                    cx={spotlightPos.x}
                                    cy={spotlightPos.y}
                                    r={spotlightRadius}
                                    fill="none"
                                    stroke="rgba(255, 255, 255, 0.6)"
                                    strokeWidth="2.5"
                                    strokeDasharray="6 4"
                                    className="pointer-events-none"
                                />
                            </svg>

                            {/* Floating Spotlight Controls */}
                            <div 
                                className="absolute top-4 right-4 bg-slate-900/90 text-white backdrop-blur-md px-3 py-1.5 rounded-full shadow-2xl flex items-center gap-3 border border-slate-700 text-xs font-medium z-50 pointer-events-auto"
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <span className="flex items-center gap-1.5 text-amber-300 font-semibold select-none">
                                    <TorchIcon className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                                    Spotlight
                                </span>
                                <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700" onPointerDown={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSpotlightRadius(r => Math.max(50, r - 30));
                                        }}
                                        className="w-5 h-5 flex items-center justify-center hover:bg-slate-700 rounded text-slate-300 hover:text-white font-bold cursor-pointer"
                                        title="Decrease Radius"
                                    >
                                        -
                                    </button>
                                    <span className="text-[11px] text-slate-300 px-1 font-mono select-none">Scroll to zoom</span>
                                    <button
                                        type="button"
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSpotlightRadius(r => Math.min(600, r + 30));
                                        }}
                                        className="w-5 h-5 flex items-center justify-center hover:bg-slate-700 rounded text-slate-300 hover:text-white font-bold cursor-pointer"
                                        title="Increase Radius"
                                    >
                                        +
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsSpotlightActive(false);
                                    }}
                                    className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-full transition-colors cursor-pointer pointer-events-auto"
                                    title="Exit Spotlight"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Screen Shade / Curtain Tool (BenQ EZWrite & ViewSonic myViewBoard) */}
                    {isCurtainActive && (
                        <div 
                            className="whiteboard-curtain-container absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl transition-[height] duration-75 overflow-hidden flex flex-col justify-between select-none"
                            style={{ height: `${curtainHeight}%` }}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs font-medium tracking-wider uppercase opacity-70">
                                <StickyNoteIcon className="w-6 h-6 mb-1 text-slate-400" />
                                <span>Screen Shade (Drag bottom bar down/up)</span>
                            </div>

                            {/* Resizable bottom grab bar */}
                            <div
                                className="w-full h-8 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-700 hover:from-indigo-600 hover:to-purple-600 flex items-center justify-between px-4 cursor-ns-resize text-white shadow-md border-t border-white/20 select-none"
                                onPointerDown={(e) => {
                                    if (e.target.closest('button')) return;
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const startY = e.clientY;
                                    const startHeight = curtainHeight;
                                    const wrapperRect = canvasWrapperRef.current?.getBoundingClientRect();
                                    const totalH = wrapperRect?.height || window.innerHeight;

                                    const onPointerMove = (moveEvent) => {
                                        const deltaY = moveEvent.clientY - startY;
                                        const deltaPct = (deltaY / totalH) * 100;
                                        setCurtainHeight(Math.max(10, Math.min(100, startHeight + deltaPct)));
                                    };
                                    const onPointerUp = () => {
                                        window.removeEventListener('pointermove', onPointerMove);
                                        window.removeEventListener('pointerup', onPointerUp);
                                    };
                                    window.addEventListener('pointermove', onPointerMove);
                                    window.addEventListener('pointerup', onPointerUp);
                                }}
                            >
                                <div className="flex items-center gap-2 text-xs font-semibold">
                                    <GripHorizontal className="w-4 h-4 text-white/70" />
                                    <span>Drag to reveal content ({Math.round(curtainHeight)}%)</span>
                                </div>
                                <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setCurtainHeight(h => h > 50 ? 20 : 80);
                                        }}
                                        className="text-[11px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/90 cursor-pointer pointer-events-auto"
                                    >
                                        {curtainHeight > 50 ? 'Roll Up' : 'Roll Down'}
                                    </button>
                                    <button
                                        type="button"
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsCurtainActive(false);
                                        }}
                                        className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white cursor-pointer pointer-events-auto"
                                        title="Close Screen Shade"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Embedded Canvas Media Players (Local video/audio, YouTube, Web Embeds) */}
                    {(pageMediaObjects[currentPage] || []).map((mediaObj) => (
                        <WhiteboardMediaPlayer
                            key={mediaObj.id}
                            media={mediaObj}
                            isSelected={selectedMediaId === mediaObj.id}
                            scale={zoomLevel}
                            onSelect={(id) => {
                                setSelectedMediaId(id);
                                setSelectedShapeIds([]);
                                setSelectedTextIds([]);
                                setSelectedImageId(null);
                                setSelected3DId(null);
                            }}
                            onUpdate={(updates) => {
                                setMediaObjects(prev => prev.map(m => m.id === mediaObj.id ? { ...m, ...updates } : m));
                            }}
                            onDelete={(id) => {
                                setMediaObjects(prev => prev.filter(m => m.id !== id));
                                if (selectedMediaId === id) setSelectedMediaId(null);
                            }}
                            onDuplicate={(id) => {
                                const orig = (pageMediaObjects[currentPage] || []).find(m => m.id === id);
                                if (!orig) return;
                                const clone = {
                                    ...orig,
                                    id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                                    x: (orig.x || 0) + 30,
                                    y: (orig.y || 0) + 30,
                                    isInfiniteCloner: false
                                };
                                setMediaObjects(prev => [...prev, clone]);
                                setSelectedMediaId(clone.id);
                            }}
                        />
                    ))}

                    {/* 3D Objects Layer (3D perspective mesh projection, 3D trackball rotation, 2D controls) */}
                    {(page3DObjects[currentPage] || []).map((obj3d) => (
                        <Whiteboard3DObject
                            key={obj3d.id}
                            obj={obj3d}
                            isSelected={selected3DId === obj3d.id}
                            onSelect={(id) => {
                                setSelected3DId(id);
                                setSelectedShapeIds([]);
                                setSelectedTextIds([]);
                                setSelectedImageId(null);
                                setSelectedMediaId(null);
                            }}
                            onUpdate={(updates) => {
                                setThreeDObjects(prev => prev.map(o => o.id === obj3d.id ? { ...o, ...updates } : o));
                            }}
                            onDelete={(id) => {
                                setThreeDObjects(prev => prev.filter(o => o.id !== id));
                                if (selected3DId === id) setSelected3DId(null);
                            }}
                            onDuplicate={(id) => {
                                const orig = (page3DObjects[currentPage] || []).find(o => o.id === id);
                                if (!orig) return;
                                const clone = {
                                    ...orig,
                                    id: `3d_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                                    x: (orig.x || 0) + 30,
                                    y: (orig.y || 0) + 30,
                                    isInfiniteCloner: false
                                };
                                setThreeDObjects(prev => [...prev, clone]);
                                setSelected3DId(clone.id);
                            }}
                        />
                    ))}
                </div>

                {/* Interactive 16:9 Canvas Minimap with Zoom & Viewport Navigation */}
                <WhiteboardMinimap
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    shapes={shapeObjects}
                    shapeObjects={shapeObjects}
                    texts={textObjects}
                    textObjects={textObjects}
                    images={imageObjects}
                    imageObjects={imageObjects}
                    connectors={(pageShapeObjects[currentPage] || []).filter(s => s.type === 'connector')}
                    zoomLevel={zoomLevel}
                    setZoomLevel={setZoomLevel}
                    onZoomChange={setZoomLevel}
                    panOffset={panOffset}
                    setPanOffset={setPanOffset}
                    onPanChange={setPanOffset}
                    containerRef={canvasWrapperRef}
                    viewportWidth={canvasWrapperRef.current?.clientWidth || canvasWidth}
                    viewportHeight={canvasWrapperRef.current?.clientHeight || canvasHeight}
                />

                {/* Full-surface Loading Overlay & Interaction Lock */}
                {!isStateLoaded && (
                    <div className="absolute inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex flex-col items-center justify-center select-none pointer-events-auto transition-all duration-300">
                        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 flex flex-col items-center max-w-xs mx-4 border border-slate-200/80 dark:border-slate-700/80 animate-in fade-in zoom-in-95 duration-200">
                            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-primary-500/25 mb-3.5">
                                <Pencil className="w-7 h-7 animate-pulse" />
                                <div className="absolute -inset-1 rounded-2xl border-2 border-primary-400/40 animate-ping pointer-events-none" />
                            </div>
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Loading Whiteboard</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1.5 leading-relaxed">
                                Restoring canvas elements, layers, drawings and tools...
                            </p>
                            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-primary-600 dark:text-primary-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Please wait...</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Template Gallery Modal */}
            <TemplateGallery
                isOpen={showTemplateGallery}
                onClose={() => setShowTemplateGallery(false)}
                onApplyTemplate={handleApplyTemplate}
                canvasWidth={canvasWrapperRef.current?.clientWidth || 1920}
                canvasHeight={canvasWrapperRef.current?.clientHeight || 1080}
            />

            {/* Classroom Countdown Timer & Stopwatch (BenQ & ViewSonic IFP feature) */}
            <ClassroomTimerModal
                isOpen={showClassroomTimer}
                onClose={() => setShowClassroomTimer(false)}
            />

            {/* Domain-Specific Shape Library Modal */}
            <DomainShapeLibraryModal
                isOpen={showDomainLibrary}
                onClose={() => setShowDomainLibrary(false)}
                onSelectShape={(symbol) => {
                    const wrapper = canvasWrapperRef.current;
                    const cx = wrapper ? (wrapper.clientWidth / 2 - (symbol.defaultWidth || 120) / 2) : 200;
                    const cy = wrapper ? (wrapper.clientHeight / 2 - (symbol.defaultHeight || 120) / 2) : 200;

                    if (symbol.is3D || symbol.category === '3d') {
                        const new3D = {
                            id: `3d_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                            modelType: symbol.modelType || symbol.id.replace('_3d', ''),
                            meshData: symbol.meshData || null,
                            name: symbol.name,
                            x: Math.max(20, cx),
                            y: Math.max(20, cy),
                            width: symbol.defaultWidth || 220,
                            height: symbol.defaultHeight || 220,
                            color: color || '#3b82f6',
                            rotX: -25,
                            rotY: 45,
                            rotZ: 0,
                            rotation: 0
                        };
                        setThreeDObjects(prev => [...prev, new3D]);
                        setSelected3DId(new3D.id);
                        setSelectedShapeIds([]);
                        setSelectedTextIds([]);
                        setSelectedImageId(null);
                        setSelectedMediaId(null);
                        setTool('select');
                        setShowDomainLibrary(false);
                        toast.success(`Added 3D ${symbol.name}`, { icon: '📦' });
                        return;
                    }

                    const newShape = {
                        id: Date.now().toString(),
                        type: symbol.id,
                        x: Math.max(20, cx),
                        y: Math.max(20, cy),
                        width: symbol.defaultWidth || 120,
                        height: symbol.defaultHeight || 120,
                        color: color || '#3b82f6',
                        fillColor: 'transparent',
                        strokeWidth: strokeWidth || 2,
                        rotation: 0,
                        name: symbol.name,
                        category: symbol.category
                    };
                    setPageShapeObjects(prev => ({
                        ...prev,
                        [currentPage]: [...(prev[currentPage] || []), newShape]
                    }));
                    setTool('select');
                    setSelectedShapeIds([newShape.id]);
                    setShowDomainLibrary(false);
                    toast.success(`Added ${symbol.name}`, { icon: '📐' });
                }}
            />

            {/* Whiteboard Export & Interactive Panel Sharing Modal (WBF, IWB, PDF, PNG, JPG, SVG, QR) */}
            <WhiteboardExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                whiteboardData={{
                    pageBackgrounds,
                    pageImageObjects,
                    pageTextObjects,
                    pageShapeObjects,
                    pages
                }}
                sessionId={sessionId}
                whiteboardId={whiteboardId}
                canvasRef={canvasRef}
                currentPage={currentPage}
                totalPages={totalPages}
                onImportWBF={handleImportWBF}
            />

            {/* Footer */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 rounded-b-xl">
                <p className="text-xs text-slate-500 text-center">
                    ✨ Draw with mouse or touch • Supports stylus input on tablets
                </p>
            </div>

            {/* Floatable Live Chat (Visible only during standalone sharing for Instructor) */}
            {isSharing && !isMeetingMode && (
                <WhiteboardChatWindow
                    socket={socket}
                    sessionId={sessionId}
                    currentUser={{ name: userName || (isInstructor ? 'Instructor' : 'Student'), role: isInstructor ? 'instructor' : 'student' }}
                    isInstructor={isInstructor}
                    availableGroups={sharingTargets.map((name, i) => ({ id: i, name }))}
                    onClose={() => setIsChatOpen(false)}
                />
            )}

            {/* AV Recorder (Standalone only, Meeting has its own recorder) */}
            {!isMeetingMode && (
                <WhiteboardRecorder 
                    isVisible={showRecorder}
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
            {screenshotPreview && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80">
                    <div className="bg-slate-900 rounded-lg shadow-2xl p-6 max-w-4xl w-full mx-4 flex flex-col max-h-[90vh]">
                        <h3 className="text-xl font-semibold text-white mb-4">Screenshot Preview</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-400 mb-1">Filename</label>
                            <input 
                                type="text" 
                                value={screenshotName} 
                                onChange={(e) => setScreenshotName(e.target.value)} 
                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div className="flex-1 overflow-auto bg-slate-800 rounded border border-slate-700 p-2 flex items-center justify-center min-h-[200px]">
                            <img src={screenshotPreview} alt="Screenshot" className="max-w-full max-h-[60vh] object-contain shadow-lg" />
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button 
                                onClick={() => { setScreenshotPreview(null); setScreenshotBlob(null); }}
                                className="px-4 py-2 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition"
                                disabled={isSavingScreenshot}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (screenshotPreview) {
                                        const a = document.createElement('a');
                                        a.href = screenshotPreview;
                                        a.download = screenshotName || `Whiteboard_Screenshot_${Date.now()}.png`;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        toast.success('Screenshot downloaded to device!');
                                    }
                                }}
                                className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white font-medium transition flex items-center gap-1.5"
                                title="Download PNG directly"
                            >
                                <Download className="w-4 h-4" /> Download PNG
                            </button>
                            <button 
                                onClick={saveScreenshot}
                                className="px-6 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition flex items-center gap-2"
                                disabled={isSavingScreenshot}
                            >
                                {isSavingScreenshot ? 'Saving...' : 'Save to Documents'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {showScreenshotModal && (
                <ScreenshotPickerModal 
                    onClose={() => setShowScreenshotModal(false)}
                    onSelect={(url) => {
                        insertImageFromSrc(url);
                        setShowScreenshotModal(false);
                    }}
                />
            )}

            {showImagePickerModal && (
                <WhiteboardImagePickerModal
                    isOpen={showImagePickerModal}
                    onClose={() => setShowImagePickerModal(false)}
                    onSelectImage={(url) => {
                        insertImageFromSrc(url);
                        setShowImagePickerModal(false);
                    }}
                />
            )}

            <AdminPermissionsPanel 
                socket={socket} 
                sessionId={sessionId} 
                isOpen={showPermissions} 
                onClose={() => setShowPermissions(false)} 
            />

            {/* Global Keyboard Shortcuts Semi-Transparent Modal */}
            <WhiteboardShortcutsModal
                isOpen={showShortcutsModal}
                onClose={() => setShowShortcutsModal(false)}
            />

            {/* Embedded Media Player Insertion Modal */}
            {showMediaModal && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
                    onClick={() => setShowMediaModal(false)}
                >
                    <div 
                        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 max-w-lg w-full flex flex-col gap-4 text-white"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Film className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-base font-bold text-slate-100">Insert Media to Canvas</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowMediaModal(false)}
                                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Tabs: YouTube, Local File, Web Embed */}
                        <div className="flex bg-slate-800/80 p-1 rounded-xl gap-1">
                            {[
                                { id: 'youtube', label: 'YouTube Video' },
                                { id: 'local', label: 'Local Video/Audio' },
                                { id: 'embed', label: 'Web Embed Window' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setMediaInputTab(tab.id)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                                        mediaInputTab === tab.id
                                            ? 'bg-indigo-600 text-white shadow'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Title input */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Title (Optional)</label>
                            <input
                                type="text"
                                value={mediaInputTitle}
                                onChange={e => setMediaInputTitle(e.target.value)}
                                placeholder="e.g. Lecture Video, Lab Simulation, Audio Demo"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        {/* Content by tab */}
                        {mediaInputTab === 'youtube' && (
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">YouTube Link or Video ID</label>
                                <input
                                    type="text"
                                    value={mediaInputUrl}
                                    onChange={e => setMediaInputUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">Supports standard YouTube URLs, Shorts, and embed links.</p>
                            </div>
                        )}

                        {mediaInputTab === 'local' && (
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Select Video or Audio File</label>
                                <input
                                    type="file"
                                    accept="video/*,audio/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (re) => {
                                                setMediaInputUrl(re.target.result);
                                                if (!mediaInputTitle) setMediaInputTitle(file.name.replace(/\.[^/.]+$/, ''));
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">Loads directly into whiteboard canvas (MP4, WebM, MP3, WAV, etc.).</p>
                            </div>
                        )}

                        {mediaInputTab === 'embed' && (
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Website URL or Embed Code</label>
                                <input
                                    type="text"
                                    value={mediaInputUrl}
                                    onChange={e => {
                                        let val = e.target.value;
                                        const srcMatch = val.match(/src=["']([^"']+)["']/);
                                        if (srcMatch) val = srcMatch[1];
                                        setMediaInputUrl(val);
                                    }}
                                    placeholder="https://example.com or <iframe src=...>"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">Embeds web pages, PhET interactive simulations, documents, or widgets directly on canvas.</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowMediaModal(false);
                                    setMediaInputUrl('');
                                    setMediaInputTitle('');
                                }}
                                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!mediaInputUrl.trim()) {
                                        toast.error('Please provide a media URL or file');
                                        return;
                                    }
                                    const wrapper = canvasWrapperRef.current;
                                    const cx = wrapper ? (wrapper.clientWidth / 2 - 240) : 200;
                                    const cy = wrapper ? (wrapper.clientHeight / 2 - 150) : 200;

                                    const newMedia = {
                                        id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                                        mediaType: mediaInputTab,
                                        src: mediaInputUrl,
                                        title: mediaInputTitle.trim() || (mediaInputTab === 'youtube' ? 'YouTube Video' : mediaInputTab === 'embed' ? 'Web Embed' : 'Media Player'),
                                        x: Math.max(20, cx),
                                        y: Math.max(20, cy),
                                        width: 480,
                                        height: 300,
                                        isMuted: true,
                                        isCollapsed: false,
                                        isLocked: false,
                                        rotation: 0
                                    };

                                    setMediaObjects(prev => [...prev, newMedia]);
                                    setSelectedMediaId(newMedia.id);
                                    setShowMediaModal(false);
                                    setMediaInputUrl('');
                                    setMediaInputTitle('');
                                    toast.success('Media player added to canvas!', { icon: '🎬' });
                                }}
                                className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition"
                            >
                                Insert to Canvas
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Whiteboard Tasks & Action Items Panel */}
            {showTasksPanel && (
                <div 
                    className="fixed top-16 right-6 z-50 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-white flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-150 select-none pointer-events-auto"
                >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                            <ListTodo className="w-4 h-4 text-emerald-400" />
                            <h3 className="text-xs font-bold text-slate-100">Whiteboard Tasks</h3>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-full font-mono">
                                {whiteboardTasks.filter(t => t.completed).length}/{whiteboardTasks.length}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowTasksPanel(false)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* AI Lesson / Task Auto-Generator */}
                    <div className="bg-slate-800/80 border border-indigo-500/30 rounded-xl p-2.5 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                <span>AI Lesson Task Generator</span>
                            </div>
                            <span className="text-[9px] uppercase tracking-wider text-indigo-400/80 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-500/20 font-bold">Smart</span>
                        </div>

                        <div className="flex gap-1.5">
                            <input
                                type="text"
                                value={aiTaskPrompt}
                                onChange={(e) => setAiTaskPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleGenerateAITasks();
                                    }
                                }}
                                placeholder="Topic (e.g. Binary Search Trees, Cell Biology)..."
                                className="flex-1 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                                disabled={isGeneratingTasks}
                            />
                            <button
                                type="button"
                                onClick={() => handleGenerateAITasks()}
                                disabled={isGeneratingTasks || !aiTaskPrompt.trim()}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 shadow"
                                title="Generate structured lesson tasks"
                            >
                                {isGeneratingTasks ? (
                                    <>
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>AI...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-3 h-3" />
                                        <span>Gen</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Quick suggestions pills */}
                        {!generatedAITasks.length && (
                            <div className="flex items-center gap-1 overflow-x-auto py-0.5 custom-scrollbar">
                                {['Binary Trees', 'Newton Laws', 'Photosynthesis', 'SQL Joins'].map(topic => (
                                    <button
                                        key={topic}
                                        type="button"
                                        onClick={() => {
                                            setAiTaskPrompt(topic);
                                            handleGenerateAITasks(topic);
                                        }}
                                        className="text-[10px] text-slate-400 hover:text-indigo-300 hover:bg-indigo-950/50 border border-slate-700/60 hover:border-indigo-500/40 px-1.5 py-0.5 rounded-md whitespace-nowrap transition"
                                    >
                                        + {topic}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Generated AI Tasks Review & Choice Buttons */}
                        {generatedAITasks && generatedAITasks.length > 0 && (
                            <div className="bg-slate-900/90 border border-indigo-500/40 rounded-lg p-2 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-150">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                                    <span>{generatedAITasks.length} Suggested Tasks:</span>
                                    <button
                                        type="button"
                                        onClick={() => setGeneratedAITasks([])}
                                        className="text-[10px] text-slate-400 hover:text-white"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="flex flex-col gap-1 max-h-28 overflow-y-auto custom-scrollbar pr-0.5">
                                    {generatedAITasks.map((t, idx) => (
                                        <div key={idx} className="text-[11px] text-slate-300 bg-slate-800/80 px-2 py-1 rounded border border-slate-700/60 flex items-center justify-between gap-1">
                                            <span className="truncate">• {t.text || t.title || String(t)}</span>
                                            {t.duration && <span className="text-[9px] text-indigo-400 shrink-0">{t.duration}m</span>}
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800">
                                    <button
                                        type="button"
                                        onClick={handleAddAITasksToChecklist}
                                        className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 shadow"
                                        title="Add all generated items to checklist"
                                    >
                                        <ListTodo className="w-3 h-3" />
                                        <span>To Checklist</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleInsertAITasksAsStickyNotes}
                                        className="px-2 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 shadow"
                                        title="Insert as sticky note cards on whiteboard canvas"
                                    >
                                        <StickyNoteIcon className="w-3 h-3" />
                                        <span>As Sticky Notes</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Add new task input */}
                    <form 
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!newTaskText.trim()) return;
                            const newTask = {
                                id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                                text: newTaskText.trim(),
                                completed: false,
                                createdAt: new Date().toISOString()
                            };
                            setWhiteboardTasks(prev => [...prev, newTask]);
                            setNewTaskText('');
                        }}
                        className="flex gap-1.5"
                    >
                        <input
                            type="text"
                            value={newTaskText}
                            onChange={(e) => setNewTaskText(e.target.value)}
                            placeholder="Add action item or task..."
                            className="flex-1 bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                        />
                        <button
                            type="submit"
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center shrink-0"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </form>

                    {/* Task items list */}
                    <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                        {whiteboardTasks.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic text-center py-4">No tasks yet. Add one above to track goals!</p>
                        ) : (
                            whiteboardTasks.map((t) => (
                                <div
                                    key={t.id}
                                    className={`flex items-center justify-between p-2 rounded-xl border transition ${
                                        t.completed ? 'bg-slate-800/40 border-slate-800 text-slate-500 line-through' : 'bg-slate-800/80 border-slate-700/60 text-slate-200'
                                    }`}
                                >
                                    <label className="flex items-center gap-2 flex-1 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={!!t.completed}
                                            onChange={() => {
                                                setWhiteboardTasks(prev => prev.map(item => item.id === t.id ? { ...item, completed: !item.completed } : item));
                                            }}
                                            className="accent-emerald-500 rounded cursor-pointer w-3.5 h-3.5"
                                        />
                                        <span className="text-xs break-all leading-tight">{t.text}</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setWhiteboardTasks(prev => prev.filter(item => item.id !== t.id))}
                                        className="p-1 text-slate-500 hover:text-red-400 rounded transition ml-1"
                                        title="Delete Task"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};
