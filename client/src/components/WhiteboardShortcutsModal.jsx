'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    X, Keyboard, MousePointer2, Pencil, Highlighter, Eraser, Type,
    Square, Circle, Diamond, Minus, Waypoints, Image as ImageIcon,
    StickyNote, ZoomIn, ZoomOut, RotateCcw, Maximize, Undo2, Redo2,
    Copy, Scissors, ClipboardPaste, Trash2, Layers, Move,
    Sparkles, LayoutTemplate, CheckSquare, Search, Box, Video, Infinity as InfinityIcon,
    Mic, MicOff, Volume2, Palette, Ruler, Play, Check, Calculator, Clock, Compass, Shield
} from 'lucide-react';

export default function WhiteboardShortcutsModal({
    isOpen,
    onClose,
    initialTab = 'shortcuts',
    isListening = false,
    onToggleListen = () => {},
    onExecuteCommand = () => {}
}) {
    const [activeTab, setActiveTab] = useState(initialTab || 'shortcuts');
    const [searchQuery, setSearchQuery] = useState('');
    const [isMac, setIsMac] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent));
        }
    }, []);

    // Synchronize activeTab when opened or initialTab changes
    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab || 'shortcuts');
            setSearchQuery('');
        }
    }, [isOpen, initialTab]);

    // Dismiss with Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const modKey = isMac ? '⌘' : 'Ctrl';
    const altKey = isMac ? '⌥' : 'Alt';
    const shiftKey = isMac ? '⇧' : 'Shift';

    const shortcutCategories = useMemo(() => [
        {
            title: 'Tools & Drawing',
            icon: Pencil,
            shortcuts: [
                { key: 'V / S', desc: 'Select Tool (Click or Marquee Box)', icon: MousePointer2 },
                { key: 'P', desc: 'Pen / Freehand Pencil Drawing', icon: Pencil },
                { key: 'H', desc: 'Highlighter (Semi-transparent Ink)', icon: Highlighter },
                { key: 'E', desc: 'Eraser Tool', icon: Eraser },
                { key: 'T', desc: 'Text Tool (Click anywhere to type)', icon: Type },
                { key: 'R', desc: 'Rectangle / Box Shape', icon: Square },
                { key: 'C', desc: 'Circle / Ellipse Shape', icon: Circle },
                { key: 'D', desc: 'Diamond Decision Shape', icon: Diamond },
                { key: 'L', desc: 'Straight Line / Arrow Shape', icon: Minus },
                { key: 'K / X', desc: 'Smart Magnetic Connector Line', icon: Waypoints },
                { key: 'I', desc: 'Insert Image from Device', icon: ImageIcon },
                { key: 'N', desc: 'Sticky Note / Card', icon: StickyNote },
                { key: '3', desc: '3D Objects & Domain Library', icon: Box },
                { key: 'U', desc: 'Insert Canvas Media Player', icon: Video },
            ]
        },
        {
            title: 'Canvas, Zoom & Navigation',
            icon: ZoomIn,
            shortcuts: [
                { key: '+ / =', desc: 'Zoom In (+25%)', icon: ZoomIn },
                { key: '−', desc: 'Zoom Out (-25%)', icon: ZoomOut },
                { key: '0', desc: 'Reset Zoom to 100% (Centered)', icon: RotateCcw },
                { key: '9', desc: 'Fit Canvas Content to Screen', icon: Maximize },
                { key: `${shiftKey} + M`, desc: 'Toggle Interactive Minimap', icon: Layers },
                { key: 'Space + Drag', desc: 'Hand Tool / Pan Canvas Viewport', icon: Move },
                { key: '2-Finger Pinch', desc: 'Touch / Stylus Pinch to Zoom', icon: ZoomIn },
                { key: '2-Finger Drag', desc: 'Touch / Stylus Pan Viewport', icon: Move },
                { key: 'F', desc: 'Toggle Fullscreen Mode', icon: Maximize },
                { key: `${shiftKey} + S`, desc: 'Toggle Spotlight Focus (Torch)', icon: Sparkles },
                { key: `${shiftKey} + C`, desc: 'Toggle Screen Curtain / Shade', icon: Layers },
            ]
        },
        {
            title: 'Edit, History & Clipboard',
            icon: Copy,
            shortcuts: [
                { key: `${modKey} + Z`, desc: 'Undo Last Canvas Action', icon: Undo2 },
                { key: `${modKey} + ${shiftKey} + Z`, desc: 'Redo Canvas Action', icon: Redo2 },
                { key: `${modKey} + C`, desc: 'Copy Selected Elements', icon: Copy },
                { key: `${modKey} + X`, desc: 'Cut Selected Elements', icon: Scissors },
                { key: `${modKey} + V`, desc: 'Paste (Whiteboard, Images, Web, 3D)', icon: ClipboardPaste },
                { key: `${modKey} + D`, desc: 'Duplicate Selected Items', icon: Copy },
                { key: 'Backspace / Del', desc: 'Delete Selected Items', icon: Trash2 },
                { key: `${modKey} + A`, desc: 'Select All Objects on Canvas', icon: MousePointer2 },
                { key: 'Esc', desc: 'Deselect All / Defocus Active Text', icon: X },
                { key: `${shiftKey} + V`, desc: 'Open Movable Clipboard Panel', icon: ClipboardPaste },
                { key: `${shiftKey} + T`, desc: 'Toggle Tasks Checklist Panel', icon: CheckSquare },
            ]
        },
        {
            title: 'Arrange, 3D & Infinite Clone',
            icon: Layers,
            shortcuts: [
                { key: `${modKey} + G`, desc: 'Group Selected Shapes', icon: Layers },
                { key: `${modKey} + ${shiftKey} + G`, desc: 'Ungroup Selected Group', icon: Layers },
                { key: `${modKey} + L`, desc: 'Lock / Unlock Selected Elements', icon: Layers },
                { key: `${modKey} + ]`, desc: 'Bring Forward / To Front', icon: Layers },
                { key: `${modKey} + [`, desc: 'Send Backward / To Back', icon: Layers },
                { key: `${shiftKey} + H`, desc: 'Flip Selected Horizontally', icon: Move },
                { key: `${shiftKey} + V`, desc: 'Flip Selected Vertically', icon: Move },
                { key: 'R (on select)', desc: 'Rotate 90° Clockwise', icon: RotateCcw },
                { key: 'Arrow Keys', desc: 'Nudge Selected Items by 1px', icon: Move },
                { key: `${shiftKey} + Arrows`, desc: 'Nudge Selected Items by 10px', icon: Move },
                { key: `${modKey} + ${shiftKey} + A`, desc: 'Open AI Bot Co-Pilot & Tutor (3D, Flowcharts, Voice)', icon: Sparkles },
                { key: 'M', desc: 'Open Templates & SmartArt Gallery', icon: LayoutTemplate },
                { key: '? / ' + modKey + ' + /', desc: 'Open Help & Shortcuts Guide', icon: Keyboard },
            ]
        }
    ], [modKey, altKey, shiftKey]);

    const voiceCommandGroups = useMemo(() => [
        {
            category: 'Voice Control & Modes',
            icon: '🎙️',
            description: 'Manage speech recognition and listening states',
            commands: [
                { phrase: 'voice mode off / stop listening', action: 'voice mode off', desc: 'Turn off microphone voice control' },
                { phrase: 'turn off voice / disable voice', action: 'turn off voice', desc: 'Alternative phrasing to stop listening' },
                { phrase: 'voice mode on / start listening', action: 'voice mode on', desc: 'Acknowledge active voice control listener' },
                { phrase: 'help / voice commands / cheatsheet', action: 'help', desc: 'Open this voice commands and help guide' }
            ]
        },
        {
            category: 'Smart Shapes & Smart Ink',
            icon: '✨',
            description: 'AI-assisted shape snapping and handwriting math OCR',
            commands: [
                { phrase: 'turn on smart shape / smart shape on', action: 'turn on smart shape', desc: 'Auto-snap ink strokes into 10 geometric shapes' },
                { phrase: 'turn off smart shape / smart shape off', action: 'turn off smart shape', desc: 'Disable automatic shape recognition' },
                { phrase: 'toggle smart shape', action: 'toggle smart shape', desc: 'Toggle smart shape recognition' },
                { phrase: 'turn on smart ink / handwriting on', action: 'turn on smart ink', desc: 'Enable handwriting-to-text & math OCR' },
                { phrase: 'turn off smart ink / handwriting off', action: 'turn off smart ink', desc: 'Disable automatic handwriting recognition' },
                { phrase: 'convert ink / recognize ink', action: 'convert ink', desc: 'Convert selected ink strokes to LaTeX or text' }
            ]
        },
        {
            category: 'Board & Canvas View',
            icon: '🧹',
            description: 'Canvas resets, viewport zooming, and board history',
            commands: [
                { phrase: 'clear the board / clear canvas', action: 'clear the board', desc: 'Clear all drawings, text & shapes on active page' },
                { phrase: 'clear all / erase all', action: 'clear all', desc: 'Alternative phrasing to clear current page' },
                { phrase: 'undo / redo', action: 'undo', desc: 'Undo or redo canvas modifications' },
                { phrase: 'zoom in / zoom out', action: 'zoom in', desc: 'Increase or decrease whiteboard zoom level' },
                { phrase: 'reset zoom / zoom 100%', action: 'reset zoom', desc: 'Reset zoom level back to 100% centered' },
                { phrase: 'fit to screen', action: 'fit to screen', desc: 'Fit all board elements onto the viewport' },
                { phrase: 'fullscreen / toggle fullscreen', action: 'fullscreen', desc: 'Toggle fullscreen whiteboard presentation' },
                { phrase: 'export / download board / save', action: 'export', desc: 'Open image & PDF export modal' }
            ]
        },
        {
            category: 'Backgrounds & Canvas Styling',
            icon: '▦',
            description: 'Grid overlays, dot matrix, ruled lines, and chalkboard colors',
            commands: [
                { phrase: 'background grid / toggle grid', action: 'background grid', desc: 'Toggle canvas grid pattern' },
                { phrase: 'background dots / dotted canvas', action: 'background dots', desc: 'Set subtle dot matrix background' },
                { phrase: 'background lines / ruled canvas', action: 'background lines', desc: 'Set ruled notebook lines background' },
                { phrase: 'background graph / graph paper', action: 'background graph', desc: 'Set Cartesian graph paper background' },
                { phrase: 'background music / music staff', action: 'background music', desc: 'Set musical stave lines background' },
                { phrase: 'background isometric', action: 'background isometric', desc: 'Set 3D isometric projection grid' },
                { phrase: 'background hex', action: 'background hex', desc: 'Set hexagonal honeycomb grid' },
                { phrase: 'chalkboard / green chalkboard', action: 'chalkboard', desc: 'Switch to classroom chalkboard green' },
                { phrase: 'background black / dark canvas', action: 'background black', desc: 'Switch to dark slate/black canvas' },
                { phrase: 'background white / plain background', action: 'background plain', desc: 'Switch to standard clean white canvas' }
            ]
        },
        {
            category: 'Pen Brushes & Sparkle Modes',
            icon: '🖌️',
            description: 'Calligraphy, crayon, watercolor, sparkle effects & opacity',
            commands: [
                { phrase: 'pen / regular pen', action: 'pen', desc: 'Switch to standard freehand ink pen' },
                { phrase: 'calligraphy / calligraphy brush', action: 'calligraphy', desc: 'Smooth angle-sensitive calligraphy pen' },
                { phrase: 'crayon / crayon brush', action: 'crayon', desc: 'Textured wax crayon brush' },
                { phrase: 'watercolor / watercolor brush', action: 'watercolor', desc: 'Soft blending watercolor wash brush' },
                { phrase: 'fountain pen', action: 'fountain', desc: 'Elegant fountain pen stroke' },
                { phrase: 'sparkle pen [galaxy|rainbow|gold|emerald]', action: 'sparkle pen galaxy', desc: 'Animated particle sparkle pen' },
                { phrase: 'pen opacity [10-100] percent', action: 'pen opacity 50 percent', desc: 'Set pen transparency (10% to 100%)' },
                { phrase: 'pressure sensitivity on / off', action: 'pressure sensitivity on', desc: 'Toggle stylus pressure sensitivity' }
            ]
        },
        {
            category: 'Highlighter & Eraser Modes',
            icon: '🖊️',
            description: 'Translucent highlighter colors and object vs pixel erasers',
            commands: [
                { phrase: 'highlighter [yellow|green|blue|pink|orange]', action: 'highlighter yellow', desc: 'Switch to translucent highlighter' },
                { phrase: 'highlighter size [N]', action: 'highlighter size 24', desc: 'Change highlighter stroke thickness' },
                { phrase: 'object eraser / stroke eraser', action: 'object eraser', desc: 'Erase entire strokes or shapes on touch' },
                { phrase: 'pixel eraser / rub eraser', action: 'pixel eraser', desc: 'Classic pixel-by-pixel ink eraser' },
                { phrase: 'eraser size [N]', action: 'eraser size 30', desc: 'Set eraser radius in pixels' }
            ]
        },
        {
            category: 'Selection & Infinite Cloner',
            icon: '👆',
            description: 'Marquee selection, lasso tool, infinite cloner & select all',
            commands: [
                { phrase: 'select tool / pointer', action: 'select', desc: 'Switch to selection arrow tool' },
                { phrase: 'lasso select / lasso tool', action: 'lasso select', desc: 'Freeform polygonal lasso selection' },
                { phrase: 'box select / rectangle select', action: 'box select', desc: 'Standard marquee box selector' },
                { phrase: 'select all / select everything', action: 'select all', desc: 'Select all elements across current page' },
                { phrase: 'deselect all / clear selection', action: 'deselect all', desc: 'Clear all active selection boxes' },
                { phrase: 'infinite cloner on / off / toggle', action: 'infinite cloner on', desc: 'Dragging creates endless duplicates' }
            ]
        },
        {
            category: 'Shapes, Connectors & Sticky Notes',
            icon: '🔷',
            description: 'Geometric polygons, magnetic connectors, and sticky notes',
            commands: [
                { phrase: 'draw circle [radius 80]', action: 'draw circle radius 80', desc: 'Draws circle with optional pixel radius (default 60)' },
                { phrase: 'draw square [size 100]', action: 'draw square size 100', desc: 'Draws square with optional side length (default 100)' },
                { phrase: 'draw rectangle [200 by 120]', action: 'draw rectangle 200 by 120', desc: 'Draws rectangle with width and height in pixels' },
                { phrase: 'draw triangle / star / diamond / hexagon', action: 'draw triangle', desc: 'Draws geometric decision polygons' },
                { phrase: 'draw line / straight line', action: 'draw line', desc: 'Draws straight horizontal line' },
                { phrase: 'draw arrow / double arrow', action: 'draw arrow', desc: 'Draws directional or double-ended arrow' },
                { phrase: 'straight / elbow / curved connector', action: 'straight connector', desc: 'Magnetic shape-to-shape connectors' },
                { phrase: 'curved arc', action: 'curved arc', desc: 'Curved arc shape tool' },
                { phrase: 'sticky note [yellow|blue|green|pink|purple|orange]', action: 'sticky note yellow', desc: 'Place colored sticky note' }
            ]
        },
        {
            category: 'Alignment, Flipping & Rotation',
            icon: '🔄',
            description: 'Positioning, vertical/horizontal alignment, flip, and rotation',
            commands: [
                { phrase: 'align left / center / right', action: 'align left', desc: 'Align selected elements horizontally' },
                { phrase: 'align top / middle / bottom', action: 'align top', desc: 'Align selected elements vertically' },
                { phrase: 'distribute horizontally / vertically', action: 'distribute horizontally', desc: 'Space selected items evenly' },
                { phrase: 'flip horizontal / vertical', action: 'flip horizontal', desc: 'Mirror selection across axis' },
                { phrase: 'rotate 90 degrees / rotate [N] degrees', action: 'rotate 90 degrees', desc: 'Rotate selected item(s) by degrees' }
            ]
        },
        {
            category: 'Shape Properties & Dimensions',
            icon: '🎨',
            description: 'Live adjustments for borders, fills, and unit measurement overlays',
            commands: [
                { phrase: 'border [color] (e.g. border red / blue)', action: 'border red', desc: 'Change border/stroke color of shape(s)' },
                { phrase: 'border width [N] (e.g. border width 4)', action: 'border width 4', desc: 'Set border thickness in pixels' },
                { phrase: 'solid / dashed / dotted / double border', action: 'dashed border', desc: 'Change border dash style' },
                { phrase: 'fill [color] (e.g. fill blue / fill yellow)', action: 'fill blue', desc: 'Set shape interior fill color' },
                { phrase: 'no fill / fill transparent', action: 'no fill', desc: 'Make shape background transparent' },
                { phrase: 'display units / show units', action: 'display units', desc: 'Show width & height dimensions in px and cm' },
                { phrase: 'hide units / remove units', action: 'hide units', desc: 'Hide dimension measurement badges' },
                { phrase: 'corner radius [12]', action: 'corner radius 12', desc: 'Adjust rectangle corner rounding' }
            ]
        },
        {
            category: 'Text, Math & Notes',
            icon: '✍️',
            description: 'Insert digital text, LaTeX equations, and handwriting math',
            commands: [
                { phrase: 'type [message]', action: 'type Antigravity Whiteboard', desc: 'Inserts typed text directly on board' },
                { phrase: 'type [message] font size [32]', action: 'type Chapter 1 font size 32', desc: 'Types text with specified font size' },
                { phrase: 'font bold / font italic / font underline', action: 'font bold', desc: 'Toggle bold, italic, or underline on text/shape' },
                { phrase: 'font size [N] (e.g. font size 36)', action: 'font size 36', desc: 'Change font size of selected text/shape' },
                { phrase: 'font sans / font serif / font mono / font cursive', action: 'font serif', desc: 'Change typography font family' },
                { phrase: 'equation / math editor', action: 'equation', desc: 'Open LaTeX Math Equation Editor' },
                { phrase: 'math solver / math tablet', action: 'math tablet', desc: 'Open handwriting math input tablet' }
            ]
        },
        {
            category: 'Image Tools & Filters',
            icon: '🖼️',
            description: 'Background removal, monochrome filter, and adjustments',
            commands: [
                { phrase: 'remove image background', action: 'remove image background', desc: 'AI background removal transparency' },
                { phrase: 'grayscale image / black and white', action: 'grayscale image', desc: 'Apply monochrome filter to image' },
                { phrase: 'reset image filters', action: 'reset image filters', desc: 'Restore original image contrast and saturation' }
            ]
        },
        {
            category: 'Multi-Page & Navigation',
            icon: '🧭',
            description: 'Page pagination, duplication, deletion, and jumping',
            commands: [
                { phrase: 'new page / add page', action: 'new page', desc: 'Create new blank whiteboard page' },
                { phrase: 'duplicate page / clone page', action: 'duplicate page', desc: 'Clone active page with all objects' },
                { phrase: 'delete page / remove page', action: 'delete page', desc: 'Delete current whiteboard page' },
                { phrase: 'next page / previous page', action: 'next page', desc: 'Navigate between existing board pages' },
                { phrase: 'jump to page [N] / go to page [N]', action: 'jump to page 2', desc: 'Directly navigate to page number' }
            ]
        },
        {
            category: 'Panels & Classroom Tools',
            icon: '📦',
            description: 'Minimap, clipboard, chat, permissions, and classroom tools',
            commands: [
                { phrase: 'minimap / toggle minimap', action: 'minimap', desc: 'Toggle interactive viewport minimap' },
                { phrase: 'clipboard / clipboard history', action: 'clipboard', desc: 'Open multi-object clipboard panel' },
                { phrase: 'chat / messages', action: 'chat', desc: 'Open live session chat panel' },
                { phrase: 'permissions / manage participants', action: 'permissions', desc: 'Instructor participant controls' },
                { phrase: 'timer / stopwatch', action: 'timer', desc: 'Toggle classroom countdown timer' },
                { phrase: 'spotlight / torch', action: 'spotlight', desc: 'Toggle audience spotlight focus' },
                { phrase: 'screen curtain / shade', action: 'screen curtain', desc: 'Toggle privacy shade curtain' },
                { phrase: 'tasks / checklist', action: 'tasks', desc: 'Toggle whiteboard checklist panel' },
                { phrase: 'templates / smartart', action: 'templates', desc: 'Browse diagram templates gallery' },
                { phrase: '3d models / domain library', action: '3d models', desc: 'Open 3D and scientific library' },
                { phrase: 'graph plotter / plot graph', action: 'graph plotter', desc: 'Insert Cartesian equation plot' },
                { phrase: 'record / screen recorder', action: 'recorder', desc: 'Open screen & audio recording studio' },
                { phrase: 'games', action: 'games', desc: 'Open educational mini-games' }
            ]
        },
        {
            category: 'AI Whiteboard Co-Pilot & Generative Drawing',
            icon: '🤖',
            description: 'Interactive 3D models, flowcharts, generative diagrams, and conversational speech',
            commands: [
                { phrase: 'ai bot / ai co-pilot / open ai', action: 'ai bot', desc: 'Open interactive AI Bot Co-Pilot Hub' },
                { phrase: 'draw 3D [earth | atom | dna | router | rocket]', action: 'draw 3D earth model', desc: 'Generate and place interactive 3D model on board' },
                { phrase: 'draw flowchart [concept / topic]', action: 'draw login flowchart', desc: 'Generate native editable flowchart with smart arrows' },
                { phrase: 'draw diagram [concept / axes / venn]', action: 'draw venn diagram', desc: 'Generate native geometric diagram on canvas' },
                { phrase: 'solve [equation]', action: 'solve 2x + 6 = 18', desc: 'Ask AI to solve math equations and speak steps aloud' },
                { phrase: 'explain [concept / theorem]', action: 'explain water cycle', desc: 'Get conversational voice explanation and step-by-step notes' },
                { phrase: 'closed captions on / off', action: 'closed captions on', desc: 'Toggle real-time streaming speech captions overlay' },
                { phrase: 'ai voice on / mute ai voice', action: 'ai voice on', desc: 'Enable/disable spoken AI voice answers' }
            ]
        }
    ], []);

    const filteredShortcutCategories = useMemo(() => {
        if (!searchQuery.trim()) return shortcutCategories;
        const query = searchQuery.toLowerCase();
        return shortcutCategories.map(cat => ({
            ...cat,
            shortcuts: cat.shortcuts.filter(s =>
                s.desc.toLowerCase().includes(query) ||
                s.key.toLowerCase().includes(query)
            )
        })).filter(cat => cat.shortcuts.length > 0);
    }, [shortcutCategories, searchQuery]);

    const filteredVoiceGroups = useMemo(() => {
        if (!searchQuery.trim()) return voiceCommandGroups;
        const query = searchQuery.toLowerCase();
        return voiceCommandGroups.map(grp => ({
            ...grp,
            commands: grp.commands.filter(c =>
                c.phrase.toLowerCase().includes(query) ||
                c.desc.toLowerCase().includes(query) ||
                c.action.toLowerCase().includes(query)
            )
        })).filter(grp => grp.commands.length > 0);
    }, [voiceCommandGroups, searchQuery]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 select-none"
            onClick={onClose}
        >
            <div
                className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-white animate-in zoom-in-95 duration-150"
                style={{ backgroundColor: '#0f172a' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white shrink-0">
                            {activeTab === 'shortcuts' ? <Keyboard className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-slate-100">
                                    Whiteboard Help & Reference
                                </h2>
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                                    {activeTab === 'shortcuts' ? (isMac ? 'macOS' : 'Windows / Linux') : 'Speech Recognition'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Master your whiteboard workflow with quick keystrokes, gestures, and hands-free voice commands
                            </p>
                        </div>
                    </div>

                    {/* Tab Navigation: Shortcuts & Voice Commands Tab */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center p-1 bg-slate-800/90 rounded-xl border border-slate-700/80 shadow-inner">
                            <button
                                type="button"
                                onClick={() => { setActiveTab('shortcuts'); setSearchQuery(''); }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                    activeTab === 'shortcuts'
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-750'
                                }`}
                            >
                                <Keyboard className="w-3.5 h-3.5" />
                                <span>Shortcuts</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setActiveTab('voice'); setSearchQuery(''); }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                    activeTab === 'voice'
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-750'
                                }`}
                            >
                                <Mic className={`w-3.5 h-3.5 ${isListening ? 'text-red-400 animate-pulse' : ''}`} />
                                <span>Voice Commands</span>
                                {isListening && (
                                    <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                                )}
                            </button>
                        </div>

                        {/* Search filter */}
                        <div className="relative w-44 sm:w-56">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder={activeTab === 'shortcuts' ? "Search shortcuts..." : "Search voice commands..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                            title="Close (Esc)"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tab 1: Keyboard Shortcuts Content */}
                {activeTab === 'shortcuts' && (
                    <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 custom-scrollbar">
                        {filteredShortcutCategories.map((category, idx) => (
                            <div
                                key={idx}
                                className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-4 flex flex-col space-y-3"
                            >
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
                                    <category.icon className="w-4 h-4 text-indigo-400 shrink-0" />
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                                        {category.title}
                                    </h3>
                                    <span className="text-[10px] text-slate-500 ml-auto font-mono">
                                        {category.shortcuts.length}
                                    </span>
                                </div>

                                <div className="space-y-2 overflow-y-auto pr-1">
                                    {category.shortcuts.map((sc, sIdx) => (
                                        <div
                                            key={sIdx}
                                            className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-800/50 transition group"
                                        >
                                            <span className="text-[11px] text-slate-300 group-hover:text-slate-100 transition leading-snug">
                                                {sc.desc}
                                            </span>
                                            <kbd className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/80 text-[10px] font-mono font-bold text-indigo-200 shrink-0 shadow-xs">
                                                {sc.key}
                                            </kbd>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {filteredShortcutCategories.length === 0 && (
                            <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
                                <Keyboard className="w-8 h-8 opacity-30" />
                                <p className="text-sm">No shortcuts found matching "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 2: Voice Commands Content */}
                {activeTab === 'voice' && (
                    <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 custom-scrollbar">
                        {/* Live Mic Banner */}
                        <div className="bg-gradient-to-r from-slate-950 to-indigo-950/40 border border-indigo-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl flex items-center justify-center transition shadow-lg ${
                                    isListening
                                        ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/40 animate-pulse'
                                        : 'bg-indigo-500/20 text-indigo-400'
                                }`}>
                                    {isListening ? <Mic className="w-5 h-5 text-red-400" /> : <MicOff className="w-5 h-5 text-slate-400" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-white">Voice Command Listening</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                            isListening
                                                ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                                        }`}>
                                            {isListening ? 'Listening Live' : 'Microphone Idle'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {isListening 
                                            ? 'Microphone is active! Speak any command below or say "voice mode off" to stop.'
                                            : 'Click the button on the right to start listening, or test individual commands.'}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={onToggleListen}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-md ${
                                    isListening
                                        ? 'bg-red-600 hover:bg-red-500 text-white ring-2 ring-red-400/50'
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}
                            >
                                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                <span>{isListening ? 'Turn Off Voice Mode' : 'Turn On Voice Mode'}</span>
                            </button>
                        </div>

                        {/* AI Support Info Banner */}
                        <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-blue-950/40 border border-purple-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2.5">
                                <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30 text-base select-none">✨</span>
                                <div>
                                    <span className="font-semibold text-purple-200">AI Natural Language Translation Active:</span>{' '}
                                    <span className="text-slate-300">
                                        Voice commands aren't restricted to exact phrases. Speak conversationally (e.g. <em>"can you wipe the board clean"</em>, <em>"draw a round blue circle of size 80"</em>, <em>"make outline dashed"</em>, <em>"zoom closer"</em>) and AI will interpret and execute the action automatically.
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Categorized Voice Commands Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredVoiceGroups.map((group, gIdx) => (
                                <div
                                    key={gIdx}
                                    className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-4 flex flex-col space-y-3"
                                >
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
                                        <span className="text-base">{group.icon}</span>
                                        <div>
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                                                {group.category}
                                            </h3>
                                            <p className="text-[10px] text-slate-400">{group.description}</p>
                                        </div>
                                        <span className="text-[10px] text-slate-500 ml-auto font-mono">
                                            {group.commands.length}
                                        </span>
                                    </div>

                                    <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                                        {group.commands.map((cmd, cIdx) => (
                                            <div
                                                key={cIdx}
                                                className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/60 hover:border-indigo-500/40 transition group flex flex-col gap-1"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-medium text-indigo-200 group-hover:text-indigo-100 transition font-mono">
                                                        "{cmd.phrase}"
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => onExecuteCommand(cmd.action)}
                                                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white transition flex items-center gap-1 cursor-pointer shrink-0"
                                                        title={`Test command: "${cmd.action}"`}
                                                    >
                                                        <Play className="w-2.5 h-2.5" />
                                                        <span>Try</span>
                                                    </button>
                                                </div>
                                                <span className="text-[11px] text-slate-400 leading-snug">
                                                    {cmd.desc}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {filteredVoiceGroups.length === 0 && (
                                <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <Mic className="w-8 h-8 opacity-30" />
                                    <p className="text-sm">No voice commands found matching "{searchQuery}"</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer Tips */}
                <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-4">
                        <span>💡 <strong>Tip:</strong> Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono">?</kbd> or say <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono">"help"</kbd> anytime to open this guide</span>
                        <span>•</span>
                        <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono">Esc</kbd> to close</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition shadow-sm ml-auto cursor-pointer"
                    >
                        Got It
                    </button>
                </div>
            </div>
        </div>
    );
}
