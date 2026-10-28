import React, { useState, useEffect, useId } from 'react';
import {
    X,
    Upload,
    RotateCcw,
    Check,
    Download,
    Palette,
    Search,
    Sliders,
    Eye,
    FileCode,
    Sparkles,
    Image,
    Layers,
    Info,
    CheckCircle2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
    ARGON_TOOL_ICON_MAP,
    PRESET_ICONS_REGISTRY,
    PRESET_ICON_PACKS,
    getCustomToolbarIconsMap,
    getCustomIconConfig,
    saveCustomToolbarIcon,
    resetCustomToolbarIcon,
    resetAllCustomToolbarIcons,
    getActiveIconPack,
    setActiveIconPack,
    exportCustomIconsTheme,
    importCustomIconsTheme,
    sanitizeSvgMarkup
} from './geometryTools/CustomToolbarIcons';

const TOOL_CATALOG = [
    {
        category: 'Core Drawing Tools',
        tools: [
            { id: 'select', label: 'Select / Lasso (V)', desc: 'Selection and precision bounding-box cursor' },
            { id: 'grab', label: 'Hand / Pan (H)', desc: 'Canvas navigation and panning hand' },
            { id: 'pen', label: 'Pen & Smart Draw (P)', desc: 'Precision freehand stylus and stroke drawing' },
            { id: 'highlighter', label: 'Highlighter (H)', desc: 'Translucent chisel-tip text and formula marker' },
            { id: 'eraser', label: 'Eraser (E)', desc: 'Object and pixel segment eraser' },
            { id: 'fill', label: 'Fill Bucket (G)', desc: 'Solid, pattern, and gradient boundary fill' },
            { id: 'line', label: 'Lines & Arrows', desc: 'Straight vectors, arrows, and magnetic connectors' },
            { id: 'shape', label: 'Geometric Shapes', desc: '2D primitives (rectangle, circle, triangle, star)' },
            { id: 'table', label: 'Classroom Table (Grid)', desc: 'Interactive spreadsheet table with formulas' },
            { id: 'text', label: 'Text Box (T)', desc: 'Rich text and typographic note tool' }
        ]
    },
    {
        category: 'STEM & Math Tools',
        tools: [
            { id: 'math_tablet', label: 'Math Input Tablet', desc: 'Handwritten math recognition tablet' },
            { id: 'math_solver', label: 'Auto Math Solver', desc: 'Step-by-step Socratic math engine' },
            { id: 'parametric_shape', label: 'Parametric Geometry', desc: 'Equation-driven angles and geometric shapes' },
            { id: 'geometry_instruments', label: 'Geometry Instruments', desc: 'Ruler, Protractor, Compass & Set Square' },
            { id: 'graph_plotter', label: 'Cartesian Graph Plotter', desc: 'Coordinate axis and 2D function curve plotter' },
            { id: 'physics_space', label: 'Physics Space Lab', desc: 'Interactive mechanics and particle simulations' }
        ]
    },
    {
        category: 'Classroom & Media Tools',
        tools: [
            { id: 'image', label: 'Insert Image', desc: 'Add images from Google Drive, Docs or device' },
            { id: 'media', label: 'Media & Documents', desc: 'PDFs, video players, and audio media' },
            { id: 'domain_3d', label: '3D Objects Library', desc: 'Interactive 3D GLTF models and domain objects' },
            { id: 'browser_panel', label: 'Search Panel (Web & YouTube)', desc: 'Sidecar web research and educational videos' },
            { id: 'tasks', label: 'Tasks Checklist', desc: 'Classroom assignment and checklist notes' },
            { id: 'templates', label: 'Templates & SmartArt', desc: 'Classroom lesson templates and mindmaps' },
            { id: 'timer', label: 'Classroom Timer', desc: 'Classroom stopwatch and countdown timer' },
            { id: 'spotlight', label: 'Spotlight Focus', desc: 'Focus beam highlighting lecture points' },
            { id: 'curtain', label: 'Screen Curtain & PPT', desc: 'Centered projector screen & AI slide generator' },
            { id: 'recorder', label: 'Screen Recorder', desc: 'Lecture recording and screen audio capture' },
            { id: 'games', label: 'Whiteboard Games', desc: 'Classroom quiz widgets and interactive games' },
            { id: 'shortcuts', label: 'Keyboard Shortcuts', desc: 'Quick hotkeys and cheat sheet modal' }
        ]
    }
];

const PRESETS_BY_TOOL = {
    pen: [
        { id: 'argon_pen', name: 'Argon Stylus (Default)' },
        { id: 'fountain_pen', name: 'Fountain Pen' },
        { id: 'brush', name: 'Artisan Brush' }
    ],
    eraser: [
        { id: 'argon_eraser', name: 'Argon Bevel Block (Default)' },
        { id: 'chalk_eraser', name: 'Classroom Chalk Duster' }
    ],
    fill: [
        { id: 'argon_fill', name: 'Liquid Bucket (Default)' },
        { id: 'paint_roller', name: 'Paint Roller' }
    ],
    table: [
        { id: 'argon_table', name: 'Grid Table (Default)' },
        { id: 'spreadsheet', name: 'Spreadsheet Sheet' }
    ],
    math_tablet: [
        { id: 'argon_math', name: 'Square Root & Integrals (Default)' },
        { id: 'pi_math', name: 'Greek Pi Symbol' }
    ],
    select: [
        { id: 'argon_select', name: 'Argon Precision Pointer (Default)' }
    ],
    geometry_instruments: [
        { id: 'argon_compass', name: 'Drafting Compass (Default)' },
        { id: 'argon_ruler', name: 'Metric Ruler' }
    ],
    media: [
        { id: 'argon_media', name: 'Media Player (Default)' }
    ],
    domain_3d: [
        { id: 'argon_3d', name: 'Isometric 3D Cube (Default)' }
    ],
    curtain: [
        { id: 'argon_curtain', name: 'Stage Curtain (Default)' }
    ],
    timer: [
        { id: 'argon_timer', name: 'Classroom Stopwatch (Default)' }
    ],
    recorder: [
        { id: 'argon_recorder', name: 'Aperture Cam (Default)' }
    ]
};

export default function WhiteboardCustomIconsModal({ isOpen, onClose }) {
    const [selectedToolId, setSelectedToolId] = useState('pen');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('presets'); // presets, upload, paste
    const [svgCodeInput, setSvgCodeInput] = useState('');
    const [imageUrlInput, setImageUrlInput] = useState('');
    const [activePack, setActivePackState] = useState('argon');
    const [customIconsMap, setCustomIconsMap] = useState({});
    const [previewRefresh, setPreviewRefresh] = useState(0);
    const fileInputId = useId();

    useEffect(() => {
        if (isOpen) {
            setCustomIconsMap(getCustomToolbarIconsMap());
            setActivePackState(getActiveIconPack());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const selectedToolObj = TOOL_CATALOG.flatMap(c => c.tools).find(t => t.id === selectedToolId) || TOOL_CATALOG[0].tools[0];
    const currentCustomConfig = customIconsMap[selectedToolId] || null;

    // Filtered list of tools based on search
    const filteredCategories = TOOL_CATALOG.map(cat => ({
        ...cat,
        tools: cat.tools.filter(t => 
            t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.desc.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(cat => cat.tools.length > 0);

    const handleApplyPreset = (presetId, presetName) => {
        const iconData = { type: 'preset', value: presetId, name: presetName };
        saveCustomToolbarIcon(selectedToolId, iconData);
        setCustomIconsMap(getCustomToolbarIconsMap());
        setPreviewRefresh(v => v + 1);
        toast.success(`Icon for "${selectedToolObj.label}" set to ${presetName}!`, { icon: '🎨' });
    };

    const handleFileUpload = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (file.size > 800 * 1024) {
            toast.error('Icon file is too large (max 800KB)');
            return;
        }

        const isSvg = file.type.includes('svg') || file.name.endsWith('.svg');
        const reader = new FileReader();

        if (isSvg) {
            reader.onload = (evt) => {
                const rawSvg = evt.target.result;
                const cleaned = sanitizeSvgMarkup(rawSvg);
                const iconData = { type: 'svg', value: cleaned, name: file.name };
                saveCustomToolbarIcon(selectedToolId, iconData);
                setCustomIconsMap(getCustomToolbarIconsMap());
                setPreviewRefresh(v => v + 1);
                toast.success(`Custom SVG icon applied for "${selectedToolObj.label}"!`, { icon: '✨' });
            };
            reader.readAsText(file);
        } else {
            reader.onload = (evt) => {
                const dataUrl = evt.target.result;
                const iconData = { type: 'url', value: dataUrl, name: file.name };
                saveCustomToolbarIcon(selectedToolId, iconData);
                setCustomIconsMap(getCustomToolbarIconsMap());
                setPreviewRefresh(v => v + 1);
                toast.success(`Custom image icon applied for "${selectedToolObj.label}"!`, { icon: '🖼️' });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleApplyPastedCode = () => {
        if (svgCodeInput && svgCodeInput.trim().startsWith('<svg')) {
            const cleaned = sanitizeSvgMarkup(svgCodeInput);
            const iconData = { type: 'svg', value: cleaned, name: 'Pasted SVG' };
            saveCustomToolbarIcon(selectedToolId, iconData);
            setCustomIconsMap(getCustomToolbarIconsMap());
            setPreviewRefresh(v => v + 1);
            setSvgCodeInput('');
            toast.success(`Custom SVG markup applied for "${selectedToolObj.label}"!`, { icon: '✨' });
            return;
        }

        if (imageUrlInput && (imageUrlInput.startsWith('http://') || imageUrlInput.startsWith('https://') || imageUrlInput.startsWith('/'))) {
            const iconData = { type: 'url', value: imageUrlInput.trim(), name: 'Remote URL' };
            saveCustomToolbarIcon(selectedToolId, iconData);
            setCustomIconsMap(getCustomToolbarIconsMap());
            setPreviewRefresh(v => v + 1);
            setImageUrlInput('');
            toast.success(`Image URL icon applied for "${selectedToolObj.label}"!`, { icon: '🌐' });
            return;
        }

        toast.error('Please enter valid <svg> markup or an http(s) image URL');
    };

    const handleResetSelectedTool = () => {
        resetCustomToolbarIcon(selectedToolId);
        setCustomIconsMap(getCustomToolbarIconsMap());
        setPreviewRefresh(v => v + 1);
        toast.success(`Reset "${selectedToolObj.label}" to default icon`, { icon: '🔄' });
    };

    const handleResetAll = () => {
        if (confirm('Reset all whiteboard toolbar icons to defaults?')) {
            resetAllCustomToolbarIcons();
            setCustomIconsMap({});
            setPreviewRefresh(v => v + 1);
            toast.success('All toolbar icons restored to defaults', { icon: '🔄' });
        }
    };

    const handlePackSwitch = (packId) => {
        setActiveIconPack(packId);
        setActivePackState(packId);
        setPreviewRefresh(v => v + 1);
        toast.success(`Switched active theme to ${packId.toUpperCase()}`, { icon: '📦' });
    };

    const handleExportTheme = () => {
        const themeJson = exportCustomIconsTheme();
        const blob = new Blob([themeJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `whiteboard-toolbar-theme-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Toolbar icon theme exported!', { icon: '💾' });
    };

    const handleImportTheme = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const success = importCustomIconsTheme(evt.target.result);
            if (success) {
                setCustomIconsMap(getCustomToolbarIconsMap());
                setActivePackState(getActiveIconPack());
                setPreviewRefresh(v => v + 1);
                toast.success('Theme imported successfully!', { icon: '🎉' });
            } else {
                toast.error('Failed to parse theme JSON file');
            }
        };
        reader.readAsText(file);
    };

    // Live preview renderer for the selected tool
    const renderPreviewIcon = () => {
        if (currentCustomConfig) {
            if (currentCustomConfig.type === 'svg' && currentCustomConfig.value) {
                return (
                    <span
                        className="w-5 h-5 inline-flex items-center justify-center overflow-hidden"
                        dangerouslySetInnerHTML={{ __html: sanitizeSvgMarkup(currentCustomConfig.value) }}
                    />
                );
            }
            if (currentCustomConfig.type === 'url' && currentCustomConfig.value) {
                return (
                    <img
                        src={currentCustomConfig.value}
                        alt={selectedToolId}
                        className="w-5 h-5 object-contain"
                    />
                );
            }
            if (currentCustomConfig.type === 'preset' && PRESET_ICONS_REGISTRY[currentCustomConfig.value]) {
                const PresetComp = PRESET_ICONS_REGISTRY[currentCustomConfig.value];
                return <PresetComp className="w-5 h-5" />;
            }
        }

        const ArgonComp = ARGON_TOOL_ICON_MAP[selectedToolId];
        if (ArgonComp) {
            return <ArgonComp className="w-5 h-5" />;
        }

        return <Sparkles className="w-5 h-5" />;
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-200">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
                            <Palette size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <span>Toolbar Icon Customizer</span>
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-full font-mono uppercase">
                                    Argon 2.0
                                </span>
                            </h2>
                            <p className="text-xs text-slate-400">
                                Personalize toolbar items with custom SVGs, images, URLs, or curated educational icon packs
                            </p>
                        </div>
                    </div>
                    
                    {/* Icon Pack Quick Switcher */}
                    <div className="hidden sm:flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700/60 text-xs">
                        {PRESET_ICON_PACKS.map(p => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => handlePackSwitch(p.id)}
                                className={`px-2.5 py-1 rounded-lg transition font-medium ${activePack === p.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                                title={p.description}
                            >
                                {p.label.split(' ')[0]}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                        title="Close Modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Body: Left Tool Selector + Right Customization Workspace */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[460px]">
                    
                    {/* Left Column: Tool Catalog List */}
                    <div className="w-full md:w-72 border-r border-slate-800/80 bg-slate-950/30 flex flex-col overflow-hidden">
                        {/* Search Filter */}
                        <div className="p-3 border-b border-slate-800/60">
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search 28 tools..."
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Tools Scroll View */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-4">
                            {filteredCategories.map((cat, cIdx) => (
                                <div key={cIdx} className="space-y-1">
                                    <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase px-2.5 py-1">
                                        {cat.category}
                                    </div>
                                    {cat.tools.map(tool => {
                                        const isSelected = tool.id === selectedToolId;
                                        const isCustomized = !!customIconsMap[tool.id];
                                        const ToolArgonIcon = ARGON_TOOL_ICON_MAP[tool.id] || Sparkles;

                                        return (
                                            <button
                                                key={tool.id}
                                                type="button"
                                                onClick={() => setSelectedToolId(tool.id)}
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition ${
                                                    isSelected
                                                        ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/30'
                                                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`p-1 rounded-lg ${isSelected ? 'bg-indigo-500/40 text-white' : 'bg-slate-800/80 text-slate-400'}`}>
                                                        <ToolArgonIcon className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="truncate">{tool.label}</span>
                                                </div>
                                                {isCustomized && (
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${isSelected ? 'bg-indigo-800 text-indigo-200' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                                                        Custom
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Customization Workspace */}
                    <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
                        
                        {/* Selected Tool Details & Live Toolbar Preview */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-white">{selectedToolObj.label}</h3>
                                    {currentCustomConfig ? (
                                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <CheckCircle2 size={10} />
                                            <span>Active: {currentCustomConfig.name || currentCustomConfig.type}</span>
                                        </span>
                                    ) : (
                                        <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700/60 px-2 py-0.5 rounded-full">
                                            Using {activePack.toUpperCase()} Vector
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">{selectedToolObj.desc}</p>
                            </div>

                            {/* Live Toolbar Preview Buttons */}
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-400 font-medium">Toolbar Preview</div>
                                    <div className="text-[9px] text-slate-500">Normal vs Selected</div>
                                </div>
                                <div className="flex items-center gap-1.5 p-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-inner">
                                    {/* Normal State Preview */}
                                    <div
                                        className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center justify-center"
                                        title="Preview: Inactive Toolbar Button"
                                    >
                                        {renderPreviewIcon()}
                                    </div>
                                    {/* Active State Preview */}
                                    <div
                                        className="p-2 rounded-xl bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400 scale-105 flex items-center justify-center"
                                        title="Preview: Active Selected Toolbar Button"
                                    >
                                        {renderPreviewIcon()}
                                    </div>
                                </div>
                                {currentCustomConfig && (
                                    <button
                                        type="button"
                                        onClick={handleResetSelectedTool}
                                        className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition"
                                        title="Reset tool icon to default"
                                    >
                                        <RotateCcw size={15} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Customization Method Tabs */}
                        <div className="flex border-b border-slate-800 gap-6 text-xs">
                            <button
                                type="button"
                                onClick={() => setActiveTab('presets')}
                                className={`pb-2.5 font-medium transition flex items-center gap-1.5 border-b-2 ${
                                    activeTab === 'presets'
                                        ? 'border-indigo-500 text-indigo-400 font-semibold'
                                        : 'border-transparent text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Sparkles size={14} />
                                <span>Curated Presets</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('upload')}
                                className={`pb-2.5 font-medium transition flex items-center gap-1.5 border-b-2 ${
                                    activeTab === 'upload'
                                        ? 'border-indigo-500 text-indigo-400 font-semibold'
                                        : 'border-transparent text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Upload size={14} />
                                <span>Upload SVG / PNG</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('paste')}
                                className={`pb-2.5 font-medium transition flex items-center gap-1.5 border-b-2 ${
                                    activeTab === 'paste'
                                        ? 'border-indigo-500 text-indigo-400 font-semibold'
                                        : 'border-transparent text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <FileCode size={14} />
                                <span>Paste Code / Image URL</span>
                            </button>
                        </div>

                        {/* Tab Content 1: Curated Presets */}
                        {activeTab === 'presets' && (
                            <div className="space-y-4">
                                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                                    <Info size={13} className="text-indigo-400 shrink-0" />
                                    <span>Select from pre-designed vector icons optimized for high-DPI interactive smartboards:</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {(PRESETS_BY_TOOL[selectedToolId] || [
                                        { id: `argon_${selectedToolId}`, name: 'Argon Vector (Default)' }
                                    ]).map((preset) => {
                                        const PresetIcon = PRESET_ICONS_REGISTRY[preset.id] || ARGON_TOOL_ICON_MAP[selectedToolId] || Sparkles;
                                        const isApplied = currentCustomConfig?.value === preset.id;

                                        return (
                                            <div
                                                key={preset.id}
                                                onClick={() => handleApplyPreset(preset.id, preset.name)}
                                                className={`p-3 rounded-2xl border cursor-pointer transition flex items-center gap-3 ${
                                                    isApplied
                                                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500/50'
                                                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800/40'
                                                }`}
                                            >
                                                <div className="p-2 bg-slate-900 border border-slate-700/60 rounded-xl text-indigo-300 flex items-center justify-center shrink-0">
                                                    <PresetIcon className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-semibold truncate">{preset.name}</div>
                                                    <div className="text-[10px] text-slate-500">Vector SVG</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Tab Content 2: Upload File */}
                        {activeTab === 'upload' && (
                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500 rounded-2xl p-8 text-center transition flex flex-col items-center justify-center bg-slate-950/30">
                                    <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-2xl mb-3">
                                        <Upload size={24} />
                                    </div>
                                    <h4 className="text-xs font-bold text-white mb-1">
                                        Drop your custom SVG or PNG icon here
                                    </h4>
                                    <p className="text-[11px] text-slate-400 max-w-sm mb-4">
                                        Vector SVG files scale cleanly on any screen resolution. Transparent PNGs (64x64 or 128x128) are also supported.
                                    </p>
                                    <input
                                        type="file"
                                        id={fileInputId}
                                        accept=".svg,.png,.webp"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    <label
                                        htmlFor={fileInputId}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md transition"
                                    >
                                        Browse from Device
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Tab Content 3: Paste Raw SVG Code or Image URL */}
                        {activeTab === 'paste' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                        Paste Raw SVG Code
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={svgCodeInput}
                                        onChange={(e) => setSvgCodeInput(e.target.value)}
                                        placeholder='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">...</svg>'
                                        className="w-full p-3 bg-slate-950 border border-slate-700/80 rounded-xl font-mono text-xs text-indigo-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="h-px bg-slate-800 flex-1" />
                                    <span className="text-[10px] text-slate-500 font-mono uppercase">OR</span>
                                    <div className="h-px bg-slate-800 flex-1" />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                        Image URL (Web or Local)
                                    </label>
                                    <input
                                        type="text"
                                        value={imageUrlInput}
                                        onChange={(e) => setImageUrlInput(e.target.value)}
                                        placeholder="https://example.com/icons/custom-pen.svg or /custom-icons/pen.svg"
                                        className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={handleApplyPastedCode}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-2"
                                >
                                    <Check size={14} />
                                    <span>Apply Custom Icon</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Controls: Reset All, Theme Export/Import, Close */}
                <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleResetAll}
                            className="px-3 py-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 rounded-xl transition flex items-center gap-1.5"
                        >
                            <RotateCcw size={13} />
                            <span>Reset All Tools</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleExportTheme}
                            className="px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition flex items-center gap-1.5"
                            title="Export all your custom toolbar icons as a shareable JSON file"
                        >
                            <Download size={13} />
                            <span>Export Theme</span>
                        </button>
                        <label className="px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition flex items-center gap-1.5 cursor-pointer">
                            <Upload size={13} />
                            <span>Import Theme</span>
                            <input type="file" accept=".json" onChange={handleImportTheme} className="hidden" />
                        </label>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md transition"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
