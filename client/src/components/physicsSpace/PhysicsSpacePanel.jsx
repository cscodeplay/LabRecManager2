'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Atom,
    Play,
    Pause,
    RotateCcw,
    SlidersHorizontal,
    Camera,
    ChevronDown,
    X,
    Maximize2,
    Minimize2,
    Info,
    Sparkles,
    BookOpen
} from 'lucide-react';
import PhysicsCanvas from './PhysicsCanvas';
import { PHYSICS_CHAPTERS, PHYSICAL_CONSTANTS } from './vectorConventions';

export default function PhysicsSpacePanel({
    isOpen = false,
    onClose = () => {},
    onStampToWhiteboard = null,
    aiPhysicsAction = null,
    className = ''
}) {
    // Active chapter / simulation
    const [selectedChapterId, setSelectedChapterId] = useState('xi_projectile');
    const [selectedClassTab, setSelectedClassTab] = useState(11); // 11 or 12

    // Interactive playback controls
    const [isPlaying, setIsPlaying] = useState(true);
    const [timeScale, setTimeScale] = useState(1.0);

    // Active Simulation Parameters state
    const [params, setParams] = useState({
        // Projectile
        velocity: 25,
        angle: 45,
        gravity: 9.8,
        height: 0,
        // Incline
        mass: 5,
        staticFriction: 0.25,
        kineticFriction: 0.2,
        // SHM
        mode: 'spring',
        springConstant: 30,
        amplitude: 0.8,
        length: 1.2,
        // Orbit
        altitude: 1000e3,
        // LCR
        resistance: 50,
        inductance: 0.15,
        capacitance: 40e-6,
        frequency: 65,
        // Optics
        lensType: 'convex',
        focalLength: 10,
        objectDistance: 25,
        objectHeight: 4,
        // Bohr
        n_initial: 3,
        n_final: 2
    });

    const [activeSimInstance, setActiveSimInstance] = useState(null);

    // Filtered chapters for current Class tab
    const filteredChapters = useMemo(() => {
        return PHYSICS_CHAPTERS.filter(ch => ch.class === selectedClassTab);
    }, [selectedClassTab]);

    const activeChapter = useMemo(() => {
        return PHYSICS_CHAPTERS.find(ch => ch.id === selectedChapterId) || PHYSICS_CHAPTERS[0];
    }, [selectedChapterId]);

    // Update simulation type from selected chapter
    const currentSimType = activeChapter?.simType || 'projectile';

    // Synchronize with incoming AI Physics Action
    useEffect(() => {
        if (aiPhysicsAction && aiPhysicsAction.simulationType) {
            const matchingChapter = PHYSICS_CHAPTERS.find(
                ch => ch.simType === aiPhysicsAction.simulationType || ch.id.includes(aiPhysicsAction.simulationType)
            );
            if (matchingChapter) {
                setSelectedClassTab(matchingChapter.class);
                setSelectedChapterId(matchingChapter.id);
            }
            if (aiPhysicsAction.parameters && typeof aiPhysicsAction.parameters === 'object') {
                setParams(prev => ({
                    ...prev,
                    ...aiPhysicsAction.parameters
                }));
            }
        }
    }, [aiPhysicsAction]);

    const handleParamChange = (key, val) => {
        setParams(prev => ({
            ...prev,
            [key]: Number(val) || val
        }));
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed top-16 left-4 z-40 w-[420px] sm:w-[500px] max-w-[95vw] bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white animate-in fade-in slide-in-from-left-4 duration-200 ${className}`}>
            {/* Header */}
            <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
                        <Atom className="w-4 h-4 animate-spin" style={{ animationDuration: '10s' }} />
                    </div>
                    <div>
                        <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                            Physics Space
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30 uppercase">
                                XI & XII
                            </span>
                        </h3>
                        <p className="text-[10px] text-slate-400">Real-time simulation lab with vector force overlays</p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {onStampToWhiteboard && (
                        <button
                            type="button"
                            onClick={() => onStampToWhiteboard(activeChapter, activeSimInstance)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm transition"
                            title="Stamp current simulation diagram directly onto whiteboard"
                        >
                            <Camera className="w-3 h-3" />
                            <span>Stamp</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Close Physics Space"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Class XI vs Class XII Tab Selector */}
            <div className="px-3 pt-2 pb-1 bg-slate-900/50 border-b border-slate-800/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                        type="button"
                        onClick={() => setSelectedClassTab(11)}
                        className={`px-3 py-1 rounded-lg font-bold transition text-xs ${
                            selectedClassTab === 11
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Class XI
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedClassTab(12)}
                        className={`px-3 py-1 rounded-lg font-bold transition text-xs ${
                            selectedClassTab === 12
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Class XII
                    </button>
                </div>

                {/* Chapter Dropdown Picker */}
                <div className="relative flex-1 ml-2 max-w-[240px]">
                    <select
                        value={selectedChapterId}
                        onChange={(e) => setSelectedChapterId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-indigo-500 truncate cursor-pointer"
                    >
                        {filteredChapters.map(ch => (
                            <option key={ch.id} value={ch.id}>
                                {ch.title}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Simulation Canvas Body */}
            <div className="p-3 bg-slate-950 flex flex-col items-center">
                <PhysicsCanvas
                    simType={currentSimType}
                    simParams={params}
                    isPlaying={isPlaying}
                    timeScale={timeScale}
                    onSimUpdate={setActiveSimInstance}
                />
            </div>

            {/* Playback Controls & Speed Bar */}
            <div className="px-3 py-2 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setIsPlaying(prev => !prev)}
                        className={`p-1.5 rounded-lg border transition ${
                            isPlaying
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                        title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
                    >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setParams(prev => ({ ...prev }));
                            setIsPlaying(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition border border-transparent hover:border-slate-700"
                        title="Restart Simulation"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 text-[10px] text-slate-400 ml-1">
                        <span>Speed:</span>
                        {[0.5, 1.0, 2.0].map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setTimeScale(s)}
                                className={`px-1 rounded ${timeScale === s ? 'text-indigo-400 font-bold bg-indigo-500/20' : 'hover:text-white'}`}
                            >
                                {s}x
                            </button>
                        ))}
                    </div>
                </div>

                <div className="text-[11px] font-mono text-slate-400 truncate max-w-[150px]">
                    {activeChapter.title}
                </div>
            </div>

            {/* Interactive Parameter Sliders tailored to active chapter */}
            <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 max-h-48 overflow-y-auto custom-scrollbar text-xs space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    <span className="flex items-center gap-1">
                        <SlidersHorizontal className="w-3 h-3 text-indigo-400" />
                        Parameters
                    </span>
                    <span className="text-slate-500 font-normal lowercase">Adjust to recalculate</span>
                </div>

                {/* 1. Projectile parameters */}
                {currentSimType === 'projectile' && (
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Speed (u):</span>
                                <span className="font-mono text-indigo-300">{params.velocity} m/s</span>
                            </div>
                            <input
                                type="range"
                                min={5}
                                max={50}
                                step={1}
                                value={params.velocity}
                                onChange={(e) => handleParamChange('velocity', e.target.value)}
                                className="w-full accent-indigo-500 cursor-pointer"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Angle (θ):</span>
                                <span className="font-mono text-indigo-300">{params.angle}°</span>
                            </div>
                            <input
                                type="range"
                                min={15}
                                max={75}
                                step={1}
                                value={params.angle}
                                onChange={(e) => handleParamChange('angle', e.target.value)}
                                className="w-full accent-indigo-500 cursor-pointer"
                            />
                        </div>
                    </div>
                )}

                {/* 2. Incline plane parameters */}
                {currentSimType === 'inclined_plane' && (
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Angle (θ):</span>
                                <span className="font-mono text-indigo-300">{params.angle}°</span>
                            </div>
                            <input
                                type="range"
                                min={10}
                                max={60}
                                step={1}
                                value={params.angle}
                                onChange={(e) => handleParamChange('angle', e.target.value)}
                                className="w-full accent-indigo-500 cursor-pointer"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Mass (m):</span>
                                <span className="font-mono text-indigo-300">{params.mass} kg</span>
                            </div>
                            <input
                                type="range"
                                min={1}
                                max={20}
                                step={1}
                                value={params.mass}
                                onChange={(e) => handleParamChange('mass', e.target.value)}
                                className="w-full accent-indigo-500 cursor-pointer"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Friction (μ):</span>
                                <span className="font-mono text-indigo-300">{params.staticFriction}</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={0.6}
                                step={0.05}
                                value={params.staticFriction}
                                onChange={(e) => handleParamChange('staticFriction', e.target.value)}
                                className="w-full accent-indigo-500 cursor-pointer"
                            />
                        </div>
                    </div>
                )}

                {/* 3. SHM parameters */}
                {currentSimType === 'shm_spring_pendulum' && (
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Spring (k):</span>
                                <span className="font-mono text-indigo-300">{params.springConstant} N/m</span>
                            </div>
                            <input
                                type="range"
                                min={10}
                                max={80}
                                step={2}
                                value={params.springConstant}
                                onChange={(e) => handleParamChange('springConstant', e.target.value)}
                                className="w-full accent-indigo-500 cursor-pointer"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Mode:</span>
                                <button
                                    type="button"
                                    onClick={() => handleParamChange('mode', params.mode === 'spring' ? 'pendulum' : 'spring')}
                                    className="font-bold text-indigo-400 uppercase"
                                >
                                    {params.mode}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Ray Optics parameters */}
                {currentSimType === 'ray_optics' && (
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Focal (f):</span>
                                <span className="font-mono text-indigo-300">{params.focalLength} cm</span>
                            </div>
                            <input
                                type="range"
                                min={5}
                                max={20}
                                step={1}
                                value={params.focalLength}
                                onChange={(e) => handleParamChange('focalLength', e.target.value)}
                                className="w-full accent-indigo-500 cursor-pointer"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Obj Dist (u):</span>
                                <span className="font-mono text-indigo-300">-{params.objectDistance} cm</span>
                            </div>
                            <input
                                type="range"
                                min={10}
                                max={40}
                                step={1}
                                value={params.objectDistance}
                                onChange={(e) => handleParamChange('objectDistance', e.target.value)}
                                className="w-full accent-indigo-500 cursor-pointer"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Obj Height:</span>
                                <span className="font-mono text-indigo-300">{params.objectHeight} cm</span>
                            </div>
                            <input
                                type="range"
                                min={2}
                                max={8}
                                step={1}
                                value={params.objectHeight}
                                onChange={(e) => handleParamChange('objectHeight', e.target.value)}
                                className="w-full accent-indigo-500 cursor-pointer"
                            />
                        </div>
                    </div>
                )}

                {/* 5. LCR Circuit parameters */}
                {currentSimType === 'lcr_circuit' && (
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Resistance (R):</span>
                                <span className="font-mono text-indigo-300">{params.resistance} Ω</span>
                            </div>
                            <input
                                type="range"
                                min={10}
                                max={150}
                                step={5}
                                value={params.resistance}
                                onChange={(e) => handleParamChange('resistance', e.target.value)}
                                className="w-full accent-indigo-500 cursor-pointer"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Frequency (f):</span>
                                <span className="font-mono text-indigo-300">{params.frequency} Hz</span>
                            </div>
                            <input
                                type="range"
                                min={20}
                                max={120}
                                step={2}
                                value={params.frequency}
                                onChange={(e) => handleParamChange('frequency', e.target.value)}
                                className="w-full accent-indigo-500 cursor-pointer"
                            />
                        </div>
                    </div>
                )}

                {/* 6. Bohr Atom parameters */}
                {currentSimType === 'bohr_atom' && (
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Initial Orbit (n_i):</span>
                                <span className="font-mono text-indigo-300">{params.n_initial}</span>
                            </div>
                            <input
                                type="range"
                                min={2}
                                max={5}
                                step={1}
                                value={params.n_initial}
                                onChange={(e) => handleParamChange('n_initial', e.target.value)}
                                className="w-full accent-indigo-500 cursor-pointer"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Final Orbit (n_f):</span>
                                <span className="font-mono text-indigo-300">{params.n_final}</span>
                            </div>
                            <input
                                type="range"
                                min={1}
                                max={params.n_initial - 1}
                                step={1}
                                value={params.n_final}
                                onChange={(e) => handleParamChange('n_final', e.target.value)}
                                className="w-full accent-indigo-500 cursor-pointer"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
