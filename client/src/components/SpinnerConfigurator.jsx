'use client';

import React, { useState } from 'react';
import {
    Palette,
    Sliders,
    Sparkles,
    RotateCcw,
    Maximize2,
    Eye,
    Sun,
    Moon,
    Check,
    Gauge,
    Layers,
    Type,
    CircleDot
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
    useSpinnerStore,
    SPINNER_PALETTES,
    THICKNESS_PRESETS,
    GAP_PRESETS,
    SPEED_PRESETS,
    BLOCK_COUNT_PRESETS
} from '@/lib/spinnerStore';
import GreenSegmentedSpinner from './GreenSegmentedSpinner';

export default function SpinnerConfigurator() {
    const {
        palette,
        customColors,
        blockCount,
        speed,
        ringThickness,
        slotGap,
        brandText,
        showBrandText,
        showSpecularShine,
        showTrackGuide,
        updateConfig,
        setPalette,
        setCustomColor,
        resetDefaults
    } = useSpinnerStore();

    // Preview state
    const [previewTheme, setPreviewTheme] = useState('light'); // 'light' | 'dark'
    const [previewSize, setPreviewSize] = useState('lg'); // 'sm' | 'md' | 'lg'
    const [showFullscreenModal, setShowFullscreenModal] = useState(false);

    const activePaletteDef = SPINNER_PALETTES[palette] || SPINNER_PALETTES.emerald;

    const handleReset = () => {
        resetDefaults();
        toast.success('Restored default ULRMS Emerald Green loader configuration');
    };

    return (
        <div className="space-y-6">
            {/* Header & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <CircleDot className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            Page Loader & Spinner Configuration
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                                Global Live Sync
                            </span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Customize the brand color gradient, radial blocks, rotation cadence, and typography across all application loading screens.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs self-start sm:self-auto"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to Defaults
                </button>
            </div>

            {/* Interactive Live Preview Sandbox */}
            <div className="card p-6 border-2 border-emerald-500/20 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Real-Time Interactive Preview
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Theme Toggle */}
                        <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => setPreviewTheme('light')}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition ${
                                    previewTheme === 'light'
                                        ? 'bg-white text-slate-900 shadow-2xs'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                <Sun className="w-3 h-3 text-amber-500" /> Light
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewTheme('dark')}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition ${
                                    previewTheme === 'dark'
                                        ? 'bg-slate-900 text-white shadow-2xs'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                <Moon className="w-3 h-3 text-indigo-400" /> Dark
                            </button>
                        </div>

                        {/* Size Switcher */}
                        <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            {['sm', 'md', 'lg'].map((sz) => (
                                <button
                                    key={sz}
                                    type="button"
                                    onClick={() => setPreviewSize(sz)}
                                    className={`px-2 py-1 text-xs font-semibold uppercase rounded-md transition ${
                                        previewSize === sz
                                            ? 'bg-emerald-600 text-white shadow-2xs'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {sz}
                                </button>
                            ))}
                        </div>

                        {/* Fullscreen Test Button */}
                        <button
                            type="button"
                            onClick={() => setShowFullscreenModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                            Test Fullscreen
                        </button>
                    </div>
                </div>

                {/* Preview Stage Box */}
                <div
                    className={`rounded-2xl p-10 flex flex-col items-center justify-center transition-colors min-h-[220px] relative overflow-hidden border ${
                        previewTheme === 'dark'
                            ? 'bg-slate-950 border-slate-800 text-white'
                            : 'bg-slate-50/80 border-slate-200/90 text-slate-900'
                    }`}
                >
                    <GreenSegmentedSpinner
                        size={previewSize}
                        label={previewSize !== 'sm' ? `Simulating ${activePaletteDef.name} Loader...` : ''}
                    />

                    <div className="mt-4 flex items-center gap-2 text-2xs text-slate-400 dark:text-slate-500">
                        <span>{blockCount} radial blocks</span>
                        <span>•</span>
                        <span>{speed} blocks/sec</span>
                        <span>•</span>
                        <span>{ringThickness} profile</span>
                    </div>
                </div>
            </div>

            {/* 1. Color Palette Matrix */}
            <div className="card p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Brand Color Palette
                    </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.values(SPINNER_PALETTES).map((pal) => {
                        const isSelected = palette === pal.id;
                        return (
                            <button
                                key={pal.id}
                                type="button"
                                onClick={() => {
                                    setPalette(pal.id);
                                    toast.success(`Active palette set to ${pal.name}`);
                                }}
                                className={`p-3.5 rounded-xl border-2 text-left transition relative flex flex-col justify-between h-24 ${
                                    isSelected
                                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    {/* Color Swatch Dot */}
                                    <div
                                        className="w-5 h-5 rounded-full border border-black/10 shadow-xs"
                                        style={{
                                            background: `linear-gradient(135deg, ${pal.start}, ${pal.mid}, ${pal.end})`
                                        }}
                                    />
                                    {isSelected && (
                                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                                            <Check className="w-3 h-3 stroke-[3]" />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                        {pal.name}
                                    </p>
                                    <p className="text-2xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                        {pal.tagline}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Custom Duo-Hex Picker when 'custom' is active */}
                {palette === 'custom' && (
                    <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            Custom Hex Gradient Stops
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                                    Start Stop (0%)
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={customColors.start}
                                        onChange={(e) => setCustomColor('start', e.target.value)}
                                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5"
                                    />
                                    <input
                                        type="text"
                                        value={customColors.start}
                                        onChange={(e) => setCustomColor('start', e.target.value)}
                                        className="input text-xs font-mono py-1.5 uppercase"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                                    Mid Stop (48%)
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={customColors.mid}
                                        onChange={(e) => setCustomColor('mid', e.target.value)}
                                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5"
                                    />
                                    <input
                                        type="text"
                                        value={customColors.mid}
                                        onChange={(e) => setCustomColor('mid', e.target.value)}
                                        className="input text-xs font-mono py-1.5 uppercase"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                                    End Stop (100%)
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={customColors.end}
                                        onChange={(e) => setCustomColor('end', e.target.value)}
                                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5"
                                    />
                                    <input
                                        type="text"
                                        value={customColors.end}
                                        onChange={(e) => setCustomColor('end', e.target.value)}
                                        className="input text-xs font-mono py-1.5 uppercase"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Block Count & Cadence Speed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Block Count */}
                <div className="card p-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            Radial Block Count
                        </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        Choose between classic chunky segments (8 or 12) or high-density precision blocks (24 or 32).
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {BLOCK_COUNT_PRESETS.map((cnt) => (
                            <button
                                key={cnt}
                                type="button"
                                onClick={() => updateConfig({ blockCount: cnt })}
                                className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition ${
                                    blockCount === cnt
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                }`}
                            >
                                {cnt}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Animation Cadence / Speed */}
                <div className="card p-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Gauge className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            Revolution Cadence (Speed)
                        </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        Speed of block illumination sweep and specular reflection cycle.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {Object.values(SPEED_PRESETS).map((spd) => (
                            <button
                                key={spd.id}
                                type="button"
                                onClick={() => updateConfig({ speed: spd.speed })}
                                className={`py-2 px-2.5 rounded-xl border text-center font-semibold text-xs transition capitalize ${
                                    speed === spd.speed
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                }`}
                            >
                                {spd.id}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. Ring Geometry & Spacing */}
            <div className="card p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Ring Proportions & Spacing
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Ring Thickness */}
                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                            Ring Profile Thickness
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.values(THICKNESS_PRESETS).map((thk) => (
                                <button
                                    key={thk.id}
                                    type="button"
                                    onClick={() => updateConfig({ ringThickness: thk.id })}
                                    className={`py-2.5 px-3 rounded-xl border text-center text-xs font-semibold transition ${
                                        ringThickness === thk.id
                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                    }`}
                                >
                                    {thk.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Slot Gap */}
                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                            Angular Slot Gap Between Blocks
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.values(GAP_PRESETS).map((gp) => (
                                <button
                                    key={gp.id}
                                    type="button"
                                    onClick={() => updateConfig({ slotGap: gp.gap })}
                                    className={`py-2.5 px-3 rounded-xl border text-center text-xs font-semibold transition ${
                                        slotGap === gp.gap
                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                    }`}
                                >
                                    {gp.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Brand Typography & Visual FX */}
            <div className="card p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Brand Badge & Typography
                    </h3>
                </div>

                <div className="space-y-4 max-w-xl">
                    {/* Brand Text Input */}
                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                            Center Brand Badge Text
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                maxLength={8}
                                value={brandText}
                                onChange={(e) => updateConfig({ brandText: e.target.value.toUpperCase() })}
                                placeholder="ULRMS"
                                className="input text-sm font-bold tracking-wider max-w-[200px]"
                            />
                            <span className="text-2xs text-slate-400">
                                Max 8 characters (e.g. ULRMS, DPS, LAB, CODE)
                            </span>
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showBrandText}
                                onChange={(e) => updateConfig({ showBrandText: e.target.checked })}
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                            />
                            <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                                    Display Brand Text
                                </span>
                                <span className="text-2xs text-slate-500 dark:text-slate-400">
                                    Show badge in ring center
                                </span>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showSpecularShine}
                                onChange={(e) => updateConfig({ showSpecularShine: e.target.checked })}
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                            />
                            <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                                    Specular Shine Reflection
                                </span>
                                <span className="text-2xs text-slate-500 dark:text-slate-400">
                                    Sweeps across center text
                                </span>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showTrackGuide}
                                onChange={(e) => updateConfig({ showTrackGuide: e.target.checked })}
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                            />
                            <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                                    Background Radial Guide Track
                                </span>
                                <span className="text-2xs text-slate-500 dark:text-slate-400">
                                    Faint circular slots behind blocks
                                </span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Fullscreen Simulation Modal */}
            {showFullscreenModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md cursor-pointer animate-fadeIn"
                    onClick={() => setShowFullscreenModal(false)}
                    title="Click anywhere to exit fullscreen test"
                >
                    <div className="absolute top-6 right-6">
                        <button
                            type="button"
                            onClick={() => setShowFullscreenModal(false)}
                            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition border border-white/20"
                        >
                            Exit Fullscreen Test (Esc / Click)
                        </button>
                    </div>
                    <GreenSegmentedSpinner
                        fullscreen
                        label="Testing Fullscreen Loading State..."
                    />
                </div>
            )}
        </div>
    );
}
