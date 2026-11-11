/**
 * CustomToolbarIcons.jsx - Official Microsoft Fluent 2 & Fluent System Icon Registry (MIT License)
 * Replaces duplicate/hand-drawn SVGs with authentic Microsoft Fluent 2 Color and Fluent System
 * icons bundled offline via @iconify/react/offline — matching Sidebar's FluentNavIcons aesthetic.
 */
'use client';

import React from 'react';
import { Icon } from '@iconify/react/offline';
import './fluentIconData';

// Helper factory creating a React component backed by official offline Fluent icons.
// Honors the active icon pack ('fluent' / 'argon' -> Fluent 2 Color, 'fluent_mono' -> Fluent Outline/System).
function createFluentToolIcon(displayName, colorIcon, monoIcon, accentClass = '') {
    const Comp = React.forwardRef(({ className = 'w-5 h-5', size, style, ...rest }, ref) => {
        const pack = getActiveIconPack();
        const useMono = pack === 'fluent_mono';
        const iconName = useMono ? monoIcon : colorIcon;
        const isMonochromeGlyph = !iconName.startsWith('fluent-color:');
        const hasExplicitTextColor = /\btext-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|current)\b/.test(className);
        const combinedClass = [
            'shrink-0 select-none',
            !useMono && isMonochromeGlyph && !hasExplicitTextColor ? accentClass : '',
            className,
        ]
            .filter(Boolean)
            .join(' ');

        const dimStyle = size
            ? { width: size, height: size, ...style }
            : style;

        return (
            <span
                ref={ref}
                className={`inline-flex items-center justify-center shrink-0 leading-none ${size ? '' : className}`}
                style={dimStyle}
                {...rest}
            >
                <Icon
                    icon={iconName}
                    width="100%"
                    height="100%"
                    className={combinedClass}
                    aria-hidden="true"
                />
            </span>
        );
    });
    Comp.displayName = displayName;
    return Comp;
}

// 1. Core Selection, Grab & Pointer
export const ArgonSelectIcon = createFluentToolIcon('ArgonSelectIcon', 'fluent:cursor-24-filled', 'fluent:cursor-24-regular', 'text-sky-400');
export const ArgonGrabIcon = createFluentToolIcon('ArgonGrabIcon', 'fluent:hand-right-24-filled', 'fluent:hand-right-24-regular', 'text-amber-400');
export const ArgonLassoIcon = createFluentToolIcon('ArgonLassoIcon', 'fluent:lasso-24-filled', 'fluent:lasso-24-regular', 'text-violet-400');

// 2. Pens, Brushes & Highlighters
export const ArgonPenIcon = createFluentToolIcon('ArgonPenIcon', 'fluent-color:edit-24', 'fluent:inking-tool-24-regular');
export const PresetFountainPenIcon = createFluentToolIcon('PresetFountainPenIcon', 'fluent-color:document-edit-24', 'fluent:calligraphy-pen-24-regular');
export const PresetBrushIcon = createFluentToolIcon('PresetBrushIcon', 'fluent-color:paint-brush-24', 'fluent:paint-bucket-brush-24-regular');
export const ArgonHighlighterIcon = createFluentToolIcon('ArgonHighlighterIcon', 'fluent:highlight-24-filled', 'fluent:highlight-24-regular', 'text-amber-400');

// 3. Erasers & Clear
export const ArgonEraserIcon = createFluentToolIcon('ArgonEraserIcon', 'fluent:eraser-24-filled', 'fluent:eraser-24-regular', 'text-rose-400');
export const PresetChalkEraserIcon = createFluentToolIcon('PresetChalkEraserIcon', 'fluent:eraser-tool-24-filled', 'fluent:eraser-tool-24-regular', 'text-teal-400');
export const ArgonBroomIcon = createFluentToolIcon('ArgonBroomIcon', 'fluent:broom-24-filled', 'fluent:broom-24-regular', 'text-amber-400');

// 4. Lines, Connectors, Fill & Eyedropper
export const ArgonLineIcon = createFluentToolIcon('ArgonLineIcon', 'fluent:line-24-regular', 'fluent:line-24-regular', 'text-cyan-400');
export const ArgonConnectorIcon = createFluentToolIcon('ArgonConnectorIcon', 'fluent:connector-24-filled', 'fluent:connector-24-regular', 'text-indigo-400');
export const ArgonFillIcon = createFluentToolIcon('ArgonFillIcon', 'fluent:paint-bucket-24-filled', 'fluent:paint-bucket-24-regular', 'text-sky-400');
export const PresetPaintRollerIcon = createFluentToolIcon('PresetPaintRollerIcon', 'fluent:paint-bucket-brush-24-filled', 'fluent:paint-bucket-brush-24-regular', 'text-emerald-400');
export const ArgonEyedropperIcon = createFluentToolIcon('ArgonEyedropperIcon', 'fluent:eyedropper-24-filled', 'fluent:eyedropper-24-regular', 'text-fuchsia-400');

// 5. Shapes, Sticky Notes & Tables
export const ArgonShapeIcon = createFluentToolIcon('ArgonShapeIcon', 'fluent:shapes-24-filled', 'fluent:shapes-24-regular', 'text-indigo-400');
export const ArgonStickyNoteIcon = createFluentToolIcon('ArgonStickyNoteIcon', 'fluent:note-24-filled', 'fluent:note-24-regular', 'text-amber-400');
export const ArgonTableIcon = createFluentToolIcon('ArgonTableIcon', 'fluent-color:table-24', 'fluent:draw-shape-24-regular');
export const PresetSpreadsheetIcon = createFluentToolIcon('PresetSpreadsheetIcon', 'fluent-color:chart-multiple-24', 'fluent:diagram-24-regular');
export const ArgonFlowchartIcon = createFluentToolIcon('ArgonFlowchartIcon', 'fluent:flowchart-24-filled', 'fluent:flowchart-24-regular', 'text-teal-400');

// 6. Text & Math Tools
export const ArgonTextIcon = createFluentToolIcon('ArgonTextIcon', 'fluent-color:text-edit-style-24', 'fluent:math-format-linear-24-regular');
export const ArgonMathIcon = createFluentToolIcon('ArgonMathIcon', 'fluent-color:number-symbol-square-24', 'fluent:math-formula-24-regular');
export const PresetPiMathIcon = createFluentToolIcon('PresetPiMathIcon', 'fluent:math-symbols-24-filled', 'fluent:math-symbols-24-regular', 'text-sky-400');
export const ArgonCalculatorIcon = createFluentToolIcon('ArgonCalculatorIcon', 'fluent:calculator-24-filled', 'fluent:calculator-24-regular', 'text-emerald-400');
export const ArgonKeyboardIcon = createFluentToolIcon('ArgonKeyboardIcon', 'fluent:keyboard-24-regular', 'fluent:keyboard-24-regular', 'text-indigo-300');
export const ArgonOCRIcon = createFluentToolIcon('ArgonOCRIcon', 'fluent:scan-type-24-regular', 'fluent:scan-type-24-regular', 'text-purple-400');

// 7. Distinct Drafting & Geometry Instruments (zero duplicates)
export const ArgonRulerIcon = createFluentToolIcon('ArgonRulerIcon', 'fluent:ruler-24-filled', 'fluent:ruler-24-regular', 'text-amber-400');
export const ArgonProtractorIcon = createFluentToolIcon('ArgonProtractorIcon', 'fluent-color:gauge-24', 'fluent:triangle-24-regular');
export const ArgonCompassIcon = createFluentToolIcon('ArgonCompassIcon', 'fluent:compass-northwest-24-filled', 'fluent:compass-northwest-24-regular', 'text-cyan-400');
export const ArgonDividerIcon = createFluentToolIcon('ArgonDividerIcon', 'fluent:divider-tall-24-regular', 'fluent:divider-tall-24-regular', 'text-emerald-400');
export const ArgonNeedleIcon = createFluentToolIcon('ArgonNeedleIcon', 'fluent-color:pin-24', 'fluent:pin-24-regular');
export const ArgonSetSquareIcon = createFluentToolIcon('ArgonSetSquareIcon', 'fluent:triangle-24-filled', 'fluent:triangle-24-regular', 'text-amber-300');

// 8. STEM, AI & Advanced Suites
export const ArgonSparkleIcon = createFluentToolIcon('ArgonSparkleIcon', 'fluent-color:bot-sparkle-24', 'fluent:wand-24-regular');
export const ArgonParametricIcon = createFluentToolIcon('ArgonParametricIcon', 'fluent-color:data-scatter-24', 'fluent:draw-shape-24-regular');
export const ArgonGraphIcon = createFluentToolIcon('ArgonGraphIcon', 'fluent-color:data-trending-24', 'fluent:diagram-24-regular');
export const ArgonPhysicsIcon = createFluentToolIcon('ArgonPhysicsIcon', 'fluent-color:molecule-24', 'fluent:cube-24-regular');
export const Argon3DIcon = createFluentToolIcon('Argon3DIcon', 'fluent:cube-24-filled', 'fluent:cube-24-regular', 'text-sky-400');
export const ArgonFlashcardsIcon = createFluentToolIcon('ArgonFlashcardsIcon', 'fluent-color:book-open-lightbulb-24', 'fluent:book-open-lightbulb-24-regular');
export const ArgonStemSuiteIcon = createFluentToolIcon('ArgonStemSuiteIcon', 'fluent-color:library-24', 'fluent:shapes-24-regular');

// 9. Media, Browser, Slideshow, Curtain & Recorder
export const ArgonBrowserIcon = createFluentToolIcon('ArgonBrowserIcon', 'fluent-color:globe-24', 'fluent:panel-right-24-regular');
export const ArgonMediaIcon = createFluentToolIcon('ArgonMediaIcon', 'fluent-color:video-24', 'fluent:filmstrip-play-24-regular');
export const ArgonYoutubeIcon = createFluentToolIcon('ArgonYoutubeIcon', 'fluent:movies-and-tv-24-filled', 'fluent:movies-and-tv-24-regular', 'text-rose-500');
export const ArgonImageIcon = createFluentToolIcon('ArgonImageIcon', 'fluent-color:image-24', 'fluent:draw-shape-24-regular');
export const ArgonDocumentIcon = createFluentToolIcon('ArgonDocumentIcon', 'fluent-color:document-text-24', 'fluent:note-24-regular');
export const ArgonCodeIcon = createFluentToolIcon('ArgonCodeIcon', 'fluent-color:code-block-24', 'fluent:flowchart-24-regular');
export const ArgonTemplatesIcon = createFluentToolIcon('ArgonTemplatesIcon', 'fluent-color:design-ideas-24', 'fluent:wand-24-regular');
export const ArgonSlideshowIcon = createFluentToolIcon('ArgonSlideshowIcon', 'fluent-color:slide-text-sparkle-24', 'fluent:filmstrip-play-24-regular');
export const ArgonCurtainIcon = createFluentToolIcon('ArgonCurtainIcon', 'fluent-color:content-view-24', 'fluent:panel-left-24-regular');
export const ArgonRecorderIcon = createFluentToolIcon('ArgonRecorderIcon', 'fluent-color:camera-24', 'fluent:record-24-regular');

// 10. Utilities, Actions & Chrome Controls
export const ArgonTasksIcon = createFluentToolIcon('ArgonTasksIcon', 'fluent-color:clipboard-task-24', 'fluent:clipboard-task-24-regular');
export const ArgonShortcutsIcon = createFluentToolIcon('ArgonShortcutsIcon', 'fluent-color:apps-list-detail-24', 'fluent:keyboard-24-regular');
export const ArgonTimerIcon = createFluentToolIcon('ArgonTimerIcon', 'fluent-color:clock-alarm-24', 'fluent:clock-alarm-24-regular');
export const ArgonSpotlightIcon = createFluentToolIcon('ArgonSpotlightIcon', 'fluent-color:lightbulb-filament-24', 'fluent:flashlight-24-regular');
export const ArgonGamesIcon = createFluentToolIcon('ArgonGamesIcon', 'fluent:games-24-filled', 'fluent:games-24-regular', 'text-purple-400');
export const ArgonUtilitiesIcon = createFluentToolIcon('ArgonUtilitiesIcon', 'fluent-color:toolbox-24', 'fluent:options-24-regular');
export const ArgonCustomIconsIcon = createFluentToolIcon('ArgonCustomIconsIcon', 'fluent-color:star-settings-24', 'fluent:star-24-regular');
export const ArgonPermissionsIcon = createFluentToolIcon('ArgonPermissionsIcon', 'fluent-color:shield-checkmark-24', 'fluent:lock-closed-24-regular');
export const ArgonSearchIcon = createFluentToolIcon('ArgonSearchIcon', 'fluent-color:search-sparkle-24', 'fluent:search-sparkle-24-regular');
export const ArgonMicIcon = createFluentToolIcon('ArgonMicIcon', 'fluent-color:mic-24', 'fluent:mic-24-regular');
export const ArgonBrightnessIcon = createFluentToolIcon('ArgonBrightnessIcon', 'fluent-color:weather-sunny-low-24', 'fluent:lightbulb-24-regular');
export const ArgonVolumeIcon = createFluentToolIcon('ArgonVolumeIcon', 'fluent-color:headphones-24', 'fluent:headphones-24-regular');
export const ArgonShareIcon = createFluentToolIcon('ArgonShareIcon', 'fluent-color:share-ios-24', 'fluent:share-ios-24-regular');
export const ArgonExportIcon = createFluentToolIcon('ArgonExportIcon', 'fluent-color:arrow-square-down-24', 'fluent:arrow-square-down-24-regular');
export const ArgonQRCodeIcon = createFluentToolIcon('ArgonQRCodeIcon', 'fluent:qr-code-24-regular', 'fluent:qr-code-24-regular', 'text-indigo-300');
export const ArgonFullscreenIcon = createFluentToolIcon('ArgonFullscreenIcon', 'fluent:full-screen-maximize-24-regular', 'fluent:full-screen-maximize-24-regular');
export const ArgonFullscreenExitIcon = createFluentToolIcon('ArgonFullscreenExitIcon', 'fluent:full-screen-minimize-24-regular', 'fluent:full-screen-minimize-24-regular');
export const ArgonLayersIcon = createFluentToolIcon('ArgonLayersIcon', 'fluent:layer-diagonal-24-regular', 'fluent:layer-diagonal-24-regular');
export const ArgonUndoIcon = createFluentToolIcon('ArgonUndoIcon', 'fluent:arrow-undo-24-regular', 'fluent:arrow-undo-24-regular');
export const ArgonRedoIcon = createFluentToolIcon('ArgonRedoIcon', 'fluent:arrow-redo-24-regular', 'fluent:arrow-redo-24-regular');
export const ArgonZoomInIcon = createFluentToolIcon('ArgonZoomInIcon', 'fluent:zoom-in-24-regular', 'fluent:zoom-in-24-regular');
export const ArgonZoomOutIcon = createFluentToolIcon('ArgonZoomOutIcon', 'fluent:zoom-out-24-regular', 'fluent:zoom-out-24-regular');
export const ArgonZoomFitIcon = createFluentToolIcon('ArgonZoomFitIcon', 'fluent:zoom-fit-24-regular', 'fluent:zoom-fit-24-regular');

// Generic wrapper to render any curated icon key on demand (used by drop-up items & context bars)
export function FluentToolIcon({ icon, className = 'w-4 h-4', size, style, ...rest }) {
    const dimStyle = size ? { width: size, height: size, ...style } : style;
    return (
        <span
            className={`inline-flex items-center justify-center shrink-0 leading-none ${size ? '' : className}`}
            style={dimStyle}
            {...rest}
        >
            <Icon
                icon={icon}
                width="100%"
                height="100%"
                className={className}
                aria-hidden="true"
            />
        </span>
    );
}

export const PRESET_ICONS_REGISTRY = {
    'fountain_pen': PresetFountainPenIcon,
    'brush': PresetBrushIcon,
    'chalk_eraser': PresetChalkEraserIcon,
    'paint_roller': PresetPaintRollerIcon,
    'spreadsheet': PresetSpreadsheetIcon,
    'pi_math': PresetPiMathIcon,
    'argon_pen': ArgonPenIcon,
    'argon_select': ArgonSelectIcon,
    'argon_eraser': ArgonEraserIcon,
    'argon_fill': ArgonFillIcon,
    'argon_table': ArgonTableIcon,
    'argon_compass': ArgonCompassIcon,
    'argon_ruler': ArgonRulerIcon,
    'argon_protractor': ArgonProtractorIcon,
    'argon_math': ArgonMathIcon,
    'argon_media': ArgonMediaIcon,
    'argon_3d': Argon3DIcon,
    'argon_tasks': ArgonTasksIcon,
    'argon_spotlight': ArgonSpotlightIcon,
    'argon_curtain': ArgonCurtainIcon,
    'argon_recorder': ArgonRecorderIcon,
    'argon_timer': ArgonTimerIcon,
    'argon_shape': ArgonShapeIcon,
    'argon_templates': ArgonTemplatesIcon,
    'argon_games': ArgonGamesIcon
};

// Unified Toolbar Icon Resolver: Maps tool IDs across main dock, drop-ups, radial ring & modal
export const ARGON_TOOL_ICON_MAP = {
    select: ArgonSelectIcon,
    grab: ArgonGrabIcon,
    lasso: ArgonLassoIcon,
    pen: ArgonPenIcon,
    highlighter: ArgonHighlighterIcon,
    eraser: ArgonEraserIcon,
    clear_board: ArgonBroomIcon,
    fill: ArgonFillIcon,
    eyedropper: ArgonEyedropperIcon,
    line: ArgonLineIcon,
    connector: ArgonConnectorIcon,
    shape: ArgonShapeIcon,
    sticky_note: ArgonStickyNoteIcon,
    table: ArgonTableIcon,
    flowchart: ArgonFlowchartIcon,
    text: ArgonTextIcon,
    geometry_instruments: ArgonCompassIcon,
    compass: ArgonCompassIcon,
    ruler: ArgonRulerIcon,
    protractor: ArgonProtractorIcon,
    setsquare: ArgonSetSquareIcon,
    divider: ArgonDividerIcon,
    needle: ArgonNeedleIcon,
    math_tablet: ArgonMathIcon,
    math_solver: ArgonSparkleIcon,
    calculator: ArgonCalculatorIcon,
    math_keyboard: ArgonKeyboardIcon,
    ocr: ArgonOCRIcon,
    parametric_shape: ArgonParametricIcon,
    graph_plotter: ArgonGraphIcon,
    physics_space: ArgonPhysicsIcon,
    flashcards: ArgonFlashcardsIcon,
    stem_suite: ArgonStemSuiteIcon,
    media: ArgonMediaIcon,
    image: ArgonImageIcon,
    document: ArgonDocumentIcon,
    youtube: ArgonYoutubeIcon,
    mermaid: ArgonCodeIcon,
    domain_3d: Argon3DIcon,
    insert_media: ArgonMediaIcon,
    tasks: ArgonTasksIcon,
    templates: ArgonTemplatesIcon,
    shortcuts: ArgonShortcutsIcon,
    timer: ArgonTimerIcon,
    spotlight: ArgonSpotlightIcon,
    curtain: ArgonCurtainIcon,
    slideshow: ArgonSlideshowIcon,
    recorder: ArgonRecorderIcon,
    games: ArgonGamesIcon,
    utilities: ArgonUtilitiesIcon,
    custom_icons: ArgonCustomIconsIcon,
    permissions: ArgonPermissionsIcon,
    global_search: ArgonSearchIcon,
    brightness: ArgonBrightnessIcon,
    volume: ArgonVolumeIcon,
    mic: ArgonMicIcon,
    share: ArgonShareIcon,
    export: ArgonExportIcon,
    qr_code: ArgonQRCodeIcon,
    layers: ArgonLayersIcon,
    undo: ArgonUndoIcon,
    redo: ArgonRedoIcon,
    browser_panel: ArgonBrowserIcon,
    ai_assistant: ArgonSparkleIcon,
    ai_copilot: ArgonSparkleIcon
};

export const PRESET_ICON_PACKS = [
    { id: 'fluent', label: 'Fluent 2 Color (Default)', description: 'Official Microsoft Fluent 2 multi-color & system icons matching the Sidebar (MIT License)' },
    { id: 'fluent_mono', label: 'Fluent System Outline', description: 'Clean single-weight Microsoft Fluent System stroke icons (MIT License)' },
    { id: 'lucide', label: 'Lucide Minimal', description: 'Minimalist monochrome Lucide line icons (ISC License)' }
];

export function sanitizeSvgMarkup(rawSvg) {
    if (!rawSvg || typeof rawSvg !== 'string') return '';
    let cleaned = rawSvg.trim();
    cleaned = cleaned.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/on\w+="[^"]*"/gi, '');
    cleaned = cleaned.replace(/on\w+='[^']*'/gi, '');
    if (!/viewBox=/i.test(cleaned) && /width=/i.test(cleaned) && /height=/i.test(cleaned)) {
        const wMatch = cleaned.match(/width=["']?(\d+)/i);
        const hMatch = cleaned.match(/height=["']?(\d+)/i);
        if (wMatch && hMatch) {
            cleaned = cleaned.replace(/<svg/i, `<svg viewBox="0 0 ${wMatch[1]} ${hMatch[1]}"`);
        }
    }
    cleaned = cleaned.replace(/<svg([^>]*?)(\s+width=["'][^"']*["'])?/i, (m, rest) => {
        const cleanRest = rest.replace(/\s+width=["'][^"']*["']/i, '').replace(/\s+height=["'][^"']*["']/i, '');
        return `<svg width="100%" height="100%" shape-rendering="geometricPrecision" ${cleanRest}`;
    });
    return cleaned;
}

export function getCustomToolbarIconsMap() {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem('wb_custom_toolbar_icons');
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

export function getCustomIconConfig(toolId) {
    if (typeof window === 'undefined') return null;
    const localMap = getCustomToolbarIconsMap();
    if (localMap[toolId]) return localMap[toolId];
    if (window.__CUSTOM_WHITEBOARD_ICONS__ && window.__CUSTOM_WHITEBOARD_ICONS__[toolId]) {
        const val = window.__CUSTOM_WHITEBOARD_ICONS__[toolId];
        return typeof val === 'string' ? { type: val.startsWith('<svg') ? 'svg' : 'url', value: val } : val;
    }
    return null;
}

export function saveCustomToolbarIcon(toolId, iconData) {
    if (typeof window === 'undefined') return;
    const map = getCustomToolbarIconsMap();
    map[toolId] = iconData;
    try {
        localStorage.setItem('wb_custom_toolbar_icons', JSON.stringify(map));
        window.dispatchEvent(new CustomEvent('wb-custom-icons-updated', { detail: { toolId, iconData } }));
    } catch (e) {
        console.error('Failed to save custom toolbar icon:', e);
    }
}

export function resetCustomToolbarIcon(toolId) {
    if (typeof window === 'undefined') return;
    const map = getCustomToolbarIconsMap();
    delete map[toolId];
    try {
        localStorage.setItem('wb_custom_toolbar_icons', JSON.stringify(map));
        window.dispatchEvent(new CustomEvent('wb-custom-icons-updated', { detail: { toolId } }));
    } catch (e) {}
}

export function resetAllCustomToolbarIcons() {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem('wb_custom_toolbar_icons');
        window.dispatchEvent(new CustomEvent('wb-custom-icons-updated', { detail: { all: true } }));
    } catch (e) {}
}

export function getActiveIconPack() {
    if (typeof window === 'undefined') return 'fluent';
    try {
        const stored = localStorage.getItem('wb_toolbar_icon_pack') || 'fluent';
        // Map legacy pack IDs cleanly to the Fluent Color default
        if (stored === 'argon' || stored === 'flat_color' || stored === 'noto') return 'fluent';
        return stored;
    } catch (e) {
        return 'fluent';
    }
}

export function setActiveIconPack(packId) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem('wb_toolbar_icon_pack', packId);
        window.dispatchEvent(new CustomEvent('wb-custom-icons-updated', { detail: { pack: packId } }));
    } catch (e) {}
}

export function exportCustomIconsTheme() {
    return JSON.stringify({
        version: '2.0',
        timestamp: new Date().toISOString(),
        iconPack: getActiveIconPack(),
        customIcons: getCustomToolbarIconsMap()
    }, null, 2);
}

export function importCustomIconsTheme(jsonStr) {
    if (!jsonStr) return false;
    try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.customIcons && typeof parsed.customIcons === 'object') {
            localStorage.setItem('wb_custom_toolbar_icons', JSON.stringify(parsed.customIcons));
        }
        if (parsed.iconPack) {
            localStorage.setItem('wb_toolbar_icon_pack', parsed.iconPack);
        }
        window.dispatchEvent(new CustomEvent('wb-custom-icons-updated', { detail: { imported: true } }));
        return true;
    } catch (e) {
        console.error('Failed to import custom icons theme:', e);
        return false;
    }
}

export const EXTERNAL_AI_ICONS_REGISTRY = {};

/**
 * Dynamic Custom Icon Component
 * Checks user override first, then active icon pack (Fluent 2 Color / Fluent System / Lucide fallback).
 */
export function CustomToolIcon({ toolId, fallback: FallbackComponent, className = 'w-4 h-4', alt = '', ...props }) {
    const [, setRevision] = React.useState(0);

    React.useEffect(() => {
        const handleUpdate = () => setRevision(r => r + 1);
        window.addEventListener('wb-custom-icons-updated', handleUpdate);
        return () => window.removeEventListener('wb-custom-icons-updated', handleUpdate);
    }, []);

    const customConfig = getCustomIconConfig(toolId);
    if (customConfig) {
        if (customConfig.type === 'svg' && customConfig.value) {
            return (
                <span
                    className={`inline-flex items-center justify-center ${className}`}
                    style={{ ...props.style, overflow: 'hidden' }}
                    dangerouslySetInnerHTML={{ __html: sanitizeSvgMarkup(customConfig.value) }}
                    title={alt}
                    {...props}
                />
            );
        }
        if (customConfig.type === 'url' && customConfig.value) {
            return (
                <img
                    src={customConfig.value}
                    alt={alt || toolId}
                    className={`${className} object-contain`}
                    style={props.style}
                    {...props}
                />
            );
        }
        if (customConfig.type === 'preset' && PRESET_ICONS_REGISTRY[customConfig.value]) {
            const Preset = PRESET_ICONS_REGISTRY[customConfig.value];
            return <Preset className={className} {...props} />;
        }
    }

    const pack = getActiveIconPack();
    if (pack === 'lucide' && FallbackComponent) {
        return <FallbackComponent className={className} {...props} />;
    }

    const FluentComp = ARGON_TOOL_ICON_MAP[toolId];
    if (FluentComp) {
        return <FluentComp className={className} {...props} />;
    }

    if (FallbackComponent) {
        return <FallbackComponent className={className} {...props} />;
    }

    return null;
}

/**
 * Drop-in factory returning a React component bound to toolId, reactive to icon-pack updates.
 */
export function getCustomToolbarIcon(toolId, FallbackComponent) {
    const DynamicIcon = React.forwardRef((props, ref) => {
        const { className = 'w-4 h-4', style, ...rest } = props;
        const [, setRevision] = React.useState(0);

        React.useEffect(() => {
            const handleUpdate = () => setRevision(r => r + 1);
            window.addEventListener('wb-custom-icons-updated', handleUpdate);
            return () => window.removeEventListener('wb-custom-icons-updated', handleUpdate);
        }, []);

        const customConfig = getCustomIconConfig(toolId);
        if (customConfig) {
            if (customConfig.type === 'svg' && customConfig.value) {
                return (
                    <span
                        ref={ref}
                        className={`inline-flex items-center justify-center ${className}`}
                        style={{ ...style, overflow: 'hidden' }}
                        dangerouslySetInnerHTML={{ __html: sanitizeSvgMarkup(customConfig.value) }}
                        {...rest}
                    />
                );
            }
            if (customConfig.type === 'url' && customConfig.value) {
                return (
                    <img
                        ref={ref}
                        src={customConfig.value}
                        alt={toolId}
                        className={`${className} object-contain`}
                        style={style}
                        {...rest}
                    />
                );
            }
            if (customConfig.type === 'preset' && PRESET_ICONS_REGISTRY[customConfig.value]) {
                const Preset = PRESET_ICONS_REGISTRY[customConfig.value];
                return <Preset ref={ref} className={className} style={style} {...rest} />;
            }
        }

        const pack = getActiveIconPack();
        if (pack === 'lucide' && FallbackComponent) {
            return <FallbackComponent ref={ref} className={className} style={style} {...rest} />;
        }

        const FluentComp = ARGON_TOOL_ICON_MAP[toolId];
        if (FluentComp) {
            return <FluentComp ref={ref} className={className} style={style} {...rest} />;
        }

        if (FallbackComponent) {
            return <FallbackComponent ref={ref} className={className} style={style} {...rest} />;
        }

        return null;
    });

    DynamicIcon.displayName = `CustomToolbarIcon_${toolId}`;
    return DynamicIcon;
}
