'use client';

import React, { useState, useEffect, useMemo } from 'react';
import MathRenderer from '@/components/MathRenderer';
import { 
    Play, Pause, SkipBack, SkipForward, RotateCcw, 
    BookOpen, Brain, Sparkles, AlertTriangle, CheckCircle, 
    Check, X, ShieldAlert, Award, ChevronRight, Layers,
    Flame, Code2, HelpCircle
} from 'lucide-react';

/**
 * Universal Visual-First Pedagogical Theory Viewer
 * Supports 5 Interactive Learning Perspectives:
 * 1. 🎬 Animated Concept Simulator (Concrete visual state-transition player)
 * 2. ⚡ Step-by-Step Blueprint (Chronological execution stages & syntax tokens)
 * 3. 🧠 Concept Mind Map (Dual-Coding 4-pillar retention tree)
 * 4. 📖 Deep-Dive Full Reading (Textbook prose, scalable font, markdown tables)
 * 5. ⚠️ Traps & Mistakes (CBSE Board high-yield side-by-side comparisons)
 */
export default function StudentTheoryViewer({
    unit = {},
    content = '',
    compact = false,
    onComplete = null,
    isCompleting = false,
    completed = false,
    earnedXP = 15,
    onNavigateLab = null
}) {
    // 1. Perspective Navigation Tab State
    const [activeTab, setActiveTab] = useState('anim');

    // 2. Readability Font Scaler State ('sm' | 'base' | 'lg')
    const [fontSize, setFontSize] = useState('base');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('student_theory_font_size');
            if (saved && ['sm', 'base', 'lg'].includes(saved)) {
                setFontSize(saved);
            }
        }
    }, []);

    const handleSetFontSize = (size) => {
        setFontSize(size);
        if (typeof window !== 'undefined') {
            localStorage.setItem('student_theory_font_size', size);
        }
    };

    // 3. Raw Content Fallbacks & Domain Synthesis
    const rawContent = content || unit?.content || unit?.summary || '';
    const unitTitle = unit?.title || 'Core Concept Theory';
    const language = unit?.module?.language || 'python';

    // 4. Synthesize Rich Visual Payload if not pre-populated by AI
    const visualPayload = useMemo(() => {
        return extractOrSynthesizeVisualPayload(unit, rawContent, language);
    }, [unit, rawContent, language]);

    // 5. Animation Player State
    const animStages = visualPayload.animStages;
    const [currentFrame, setCurrentFrame] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [animSpeed, setAnimSpeed] = useState(1);

    useEffect(() => {
        if (!isPlaying || !animStages || animStages.length <= 1) return;

        const intervalMs = Math.round(3200 / animSpeed);
        const timer = setInterval(() => {
            setCurrentFrame(prev => (prev + 1) % animStages.length);
        }, intervalMs);

        return () => clearInterval(timer);
    }, [isPlaying, animStages?.length, animSpeed]);

    // Checkpoint interaction state
    const [checkpointAnswers, setCheckpointAnswers] = useState({});
    const [checkpointChecked, setCheckpointChecked] = useState({});

    const handleSelectOption = (checkpointId, optionIdx) => {
        setCheckpointAnswers(prev => ({ ...prev, [checkpointId]: optionIdx }));
    };

    const handleVerifyCheckpoint = (checkpoint) => {
        const selected = checkpointAnswers[checkpoint.id];
        if (selected === undefined || selected === null) return;

        const isCorrect = selected === checkpoint.correctOption;
        setCheckpointChecked(prev => ({
            ...prev,
            [checkpoint.id]: { checked: true, isCorrect }
        }));
    };

    const checkpoints = unit?.miniCheckpoints || visualPayload.miniCheckpoints || [];
    const totalCheckpoints = checkpoints.length;
    const passedCheckpoints = Object.values(checkpointChecked).filter(c => c.isCorrect).length;

    return (
        <div className={`student-theory-viewer w-full space-y-6 ${compact ? 'text-xs' : ''}`}>
            
            {/* Header Controls: Mode Selector & Font Scaler */}
            <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                {visualPayload.domain || 'Core Theory & Scaffolding'}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                ⏱️ 6 min read
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                <Award className="w-3 h-3" /> +{earnedXP} XP Reward
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                            {unitTitle}
                        </h2>
                    </div>

                    {/* Font Scaler Controls */}
                    <div className="flex items-center gap-2.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shrink-0">
                        <span className="text-[11px] text-slate-400 font-bold px-1.5">Font Size:</span>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => handleSetFontSize('sm')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${fontSize === 'sm' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                            >
                                A-
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSetFontSize('base')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${fontSize === 'base' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                            >
                                Normal
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSetFontSize('lg')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${fontSize === 'lg' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                            >
                                A+
                            </button>
                        </div>
                    </div>
                </div>

                {/* Perspective Mode Switcher */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <button
                        type="button"
                        onClick={() => setActiveTab('anim')}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition shrink-0 ${activeTab === 'anim' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'}`}
                    >
                        <span>🎬 Animated Concept Simulator</span>
                        <span className="px-1.5 py-0.2 rounded-md text-[9px] bg-emerald-400/20 text-emerald-300 font-black uppercase">Visual First</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('steps')}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition shrink-0 ${activeTab === 'steps' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'}`}
                    >
                        <span>⚡ Step-by-Step Blueprint</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('mindmap')}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition shrink-0 ${activeTab === 'mindmap' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'}`}
                    >
                        <span>🧠 Concept Mind Map</span>
                        <span className="px-1.5 py-0.2 rounded-md text-[9px] bg-amber-400/20 text-amber-300 font-bold uppercase">Retention</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('reading')}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition shrink-0 ${activeTab === 'reading' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'}`}
                    >
                        <span>📖 Deep-Dive Reading</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('traps')}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition shrink-0 ${activeTab === 'traps' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'}`}
                    >
                        <span>⚠️ Traps & Mistakes</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: 🎬 ANIMATED CONCEPT SIMULATOR (VISUAL FIRST) */}
            {activeTab === 'anim' && (
                <div className="space-y-6">
                    <div className="p-6 rounded-3xl bg-slate-950 border border-indigo-900/40 space-y-5 shadow-2xl relative overflow-hidden">
                        
                        {/* Simulation Player Header & Controls */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                                        Stage {currentFrame + 1} of {animStages.length}: {animStages[currentFrame]?.title}
                                    </h3>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {animStages[currentFrame]?.subtitle || 'Concept simulation in motion.'}
                                </p>
                            </div>

                            {/* Player Media Controls */}
                            <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPlaying(false);
                                        setCurrentFrame(prev => (prev - 1 + animStages.length) % animStages.length);
                                    }}
                                    title="Previous Frame"
                                    className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
                                >
                                    <SkipBack className="w-4 h-4" />
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={() => setIsPlaying(p => !p)}
                                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition"
                                >
                                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPlaying(false);
                                        setCurrentFrame(prev => (prev + 1) % animStages.length);
                                    }}
                                    title="Next Frame"
                                    className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
                                >
                                    <SkipForward className="w-4 h-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setCurrentFrame(0);
                                        setIsPlaying(true);
                                    }}
                                    title="Restart Simulation"
                                    className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </button>

                                <div className="border-l border-slate-700 pl-2 ml-1 flex items-center gap-1">
                                    {[1, 1.5, 2].map(spd => (
                                        <button
                                            key={spd}
                                            type="button"
                                            onClick={() => setAnimSpeed(spd)}
                                            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${animSpeed === spd ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                        >
                                            {spd}x
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Animated Canvas Stage */}
                        <div className="relative bg-slate-900/90 rounded-2xl p-6 border border-slate-800/80 min-h-[260px] flex flex-col justify-between overflow-hidden">
                            
                            {/* Scrubber Progress Bar */}
                            <div className="space-y-2 mb-4">
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full transition-all duration-300"
                                        style={{ width: `${((currentFrame + 1) / animStages.length) * 100}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    {animStages.map((st, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => {
                                                setIsPlaying(false);
                                                setCurrentFrame(i);
                                            }}
                                            className={`flex items-center gap-1.5 text-[10px] font-bold transition ${i === currentFrame ? 'text-indigo-400 font-extrabold scale-105' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            <span className={`w-2.5 h-2.5 rounded-full ${i === currentFrame ? 'bg-indigo-500 ring-4 ring-indigo-500/30' : 'bg-slate-700'}`} />
                                            <span className="hidden sm:inline">Stage {i + 1}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dynamic Scene Visualizer */}
                            <div className="py-6 flex-1 flex items-center justify-center">
                                {animStages[currentFrame]?.renderScene ? (
                                    <div dangerouslySetInnerHTML={{ __html: animStages[currentFrame].renderScene() }} />
                                ) : (
                                    <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center max-w-lg space-y-2">
                                        <div className="text-3xl">{animStages[currentFrame]?.icon || '⚡'}</div>
                                        <h4 className="text-sm font-bold text-indigo-300">{animStages[currentFrame]?.title}</h4>
                                        <p className="text-xs text-slate-300 leading-relaxed">{animStages[currentFrame]?.narration}</p>
                                    </div>
                                )}
                            </div>

                            {/* Synchronized "Director's Commentary" Narration Bar */}
                            <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-bold text-sm shrink-0">
                                    {animStages[currentFrame]?.icon || '💡'}
                                </div>
                                <div className="flex-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Step Explanation & Mechanical Rule:</span>
                                    <p className="text-xs sm:text-sm text-slate-200 mt-0.5 leading-relaxed">
                                        {animStages[currentFrame]?.narration}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Next Step Guidance Card */}
                    <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                            <span className="text-indigo-400 font-bold">Spatial mental model formed?</span>
                            <span>Transition smoothly to the Mind Map or review the step blueprint.</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActiveTab('mindmap')}
                            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition flex items-center gap-1.5"
                        >
                            <span>Explore Concept Mind Map</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 2: ⚡ STEP-BY-STEP BLUEPRINT */}
            {activeTab === 'steps' && (
                <div className="space-y-6">
                    {/* Core Intuition Card */}
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-800/60 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xl shrink-0 shadow-md">
                            💡
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-indigo-300 uppercase tracking-wider">The Core Mental Model</h4>
                            <div className="text-slate-200 mt-1 leading-relaxed text-sm sm:text-base">
                                <MathRenderer content={visualPayload.coreIntuition} inline />
                            </div>
                        </div>
                    </div>

                    {/* Step-by-Step Progression */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <span>🪜 Step-by-Step Execution Progression</span>
                        </h3>
                        <div className="space-y-4">
                            {visualPayload.steps.map((s, idx) => (
                                <div key={idx} className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/40 transition space-y-3">
                                    <div className="flex items-start gap-4">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-sm shrink-0">
                                            {s.num || idx + 1}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <h4 className="text-base font-bold text-white flex items-center gap-2">
                                                    <span>{s.title}</span>
                                                    {s.badge && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">{s.badge}</span>
                                                    )}
                                                </h4>
                                                {s.subtitle && <span className="text-xs text-slate-400">{s.subtitle}</span>}
                                            </div>
                                            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{s.desc}</p>
                                            {s.snippet && (
                                                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto whitespace-pre">
                                                    {s.snippet}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Syntax Blueprint / Structural Tokens */}
                    {visualPayload.blueprint && visualPayload.blueprint.length > 0 && (
                        <div className="p-6 rounded-2xl bg-slate-950/90 border border-indigo-900/40 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                                    <span>⚡ Visual Anatomy & Blueprint</span>
                                </h3>
                                <span className="text-[11px] text-slate-400">{visualPayload.blueprintSubtitle || 'Syntactic Order of Execution'}</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-center text-xs">
                                {visualPayload.blueprint.map((b, bIdx) => (
                                    <div key={bIdx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                                        <span className="font-mono font-bold text-indigo-300">{b.token}</span>
                                        <div className="text-[10px] text-slate-400">{b.role}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: 🧠 CONCEPT MIND MAP */}
            {activeTab === 'mindmap' && (
                <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <h3 className="text-lg font-black text-white flex items-center gap-2">
                                <span>🧠 Pedagogical Concept Mind Map</span>
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Dual-Coding Retention Map: Hover over any branch to isolate its core rules.
                            </p>
                        </div>
                        <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            Interactive Schema
                        </span>
                    </div>

                    <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-6">
                        {/* Central Hub */}
                        <div className="flex justify-center">
                            <div className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-extrabold text-base shadow-xl flex items-center gap-3 border border-white/20">
                                <span className="text-xl">{visualPayload.mindmap?.icon || '🎯'}</span>
                                <span>{visualPayload.mindmap?.label || unitTitle}</span>
                            </div>
                        </div>

                        {/* Connecting Lines */}
                        <div className="flex justify-center">
                            <div className="w-2/3 h-4 border-t-2 border-indigo-500/40 rounded-t-xl" />
                        </div>

                        {/* 4 Core Retention Branches */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {visualPayload.mindmap?.branches?.map((br, brIdx) => (
                                <div key={brIdx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 space-y-3 transition cursor-pointer shadow-md">
                                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                                        <span>{br.title}</span>
                                    </div>
                                    <ul className="space-y-1.5 text-xs text-slate-300">
                                        {br.nodes?.map((node, nIdx) => (
                                            <li key={nIdx} className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                                <span>{node}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: 📖 DEEP-DIVE FULL READING */}
            {activeTab === 'reading' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
                    <MathRenderer content={rawContent} size={fontSize} />
                </div>
            )}

            {/* TAB 5: ⚠️ TRAPS & MISTAKES */}
            {activeTab === 'traps' && (
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                        <span>⚠️ CBSE Board Traps: Side-by-Side Code Comparison</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Wrong Code Card */}
                        <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-800/60 space-y-3">
                            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                                <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs">✕</span>
                                <span>{visualPayload.traps?.wrongTitle || 'Common Error / Buggy Approach'}</span>
                            </div>
                            {visualPayload.traps?.wrongCode && (
                                <pre className="p-3.5 bg-slate-950 text-rose-300 font-mono text-xs rounded-xl overflow-x-auto border border-rose-900/40">
                                    <code>{visualPayload.traps.wrongCode}</code>
                                </pre>
                            )}
                            <p className="text-xs text-rose-300/90 leading-relaxed">
                                <strong>Why it fails:</strong> {visualPayload.traps?.whyFails || 'Violates language or architectural invariants.'}
                            </p>
                        </div>

                        {/* Correct Code Card */}
                        <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 space-y-3">
                            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">✓</span>
                                <span>{visualPayload.traps?.rightTitle || 'Correct Idiomatic Approach'}</span>
                            </div>
                            {visualPayload.traps?.rightCode && (
                                <pre className="p-3.5 bg-slate-950 text-emerald-300 font-mono text-xs rounded-xl overflow-x-auto border border-emerald-900/40">
                                    <code>{visualPayload.traps.rightCode}</code>
                                </pre>
                            )}
                            <p className="text-xs text-emerald-300/90 leading-relaxed">
                                <strong>Why it works:</strong> {visualPayload.traps?.whyWorks || 'Complies with syntax rules and engine execution order.'}
                            </p>
                        </div>
                    </div>

                    {/* CBSE Tips Callouts */}
                    {unit?.cbseTips && unit.cbseTips.length > 0 && (
                        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2">
                            <span className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                                💡 CBSE High-Yield Examination Tips:
                            </span>
                            <ul className="list-disc list-inside text-xs text-amber-800 dark:text-amber-300 space-y-1">
                                {unit.cbseTips.map((tip, tIdx) => (
                                    <li key={tIdx}>{tip}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Checkpoints Section (If present) */}
            {checkpoints.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-indigo-500" />
                                <span>Interactive Checkpoints ({passedCheckpoints}/{totalCheckpoints} Complete)</span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Verify your conceptual grasp before proceeding to practical coding.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {checkpoints.map((cp, idx) => {
                            const isAnswered = checkpointAnswers[cp.id] !== undefined;
                            const isChecked = checkpointChecked[cp.id]?.checked;
                            const isCorrect = checkpointChecked[cp.id]?.isCorrect;

                            return (
                                <div key={cp.id || idx} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
                                    <div className="flex items-start gap-2.5">
                                        <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                                            {idx + 1}
                                        </span>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white flex-1">
                                            {cp.question}
                                        </p>
                                    </div>

                                    {cp.codeSnippet && (
                                        <pre className="p-3 bg-slate-900 text-cyan-300 font-mono text-xs rounded-xl overflow-x-auto">
                                            <code>{cp.codeSnippet}</code>
                                        </pre>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                        {cp.options?.map((opt, oIdx) => {
                                            const isSelected = checkpointAnswers[cp.id] === oIdx;
                                            return (
                                                <button
                                                    key={oIdx}
                                                    type="button"
                                                    onClick={() => handleSelectOption(cp.id, oIdx)}
                                                    disabled={isChecked}
                                                    className={`p-3 rounded-xl text-left text-xs font-medium border transition ${isSelected ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-bold' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'}`}
                                                >
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        {!isChecked ? (
                                            <button
                                                type="button"
                                                onClick={() => handleVerifyCheckpoint(cp)}
                                                disabled={!isAnswered}
                                                className="btn btn-primary text-xs py-1.5 px-4 disabled:opacity-50"
                                            >
                                                Check Answer
                                            </button>
                                        ) : (
                                            <div className="w-full p-3 rounded-xl text-xs font-medium flex items-start gap-2 bg-slate-100 dark:bg-slate-800">
                                                {isCorrect ? (
                                                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                ) : (
                                                    <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                                )}
                                                <div>
                                                    <span className={isCorrect ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                                                        {isCorrect ? 'Correct! ' : 'Incorrect. '}
                                                    </span>
                                                    <span className="text-slate-600 dark:text-slate-300">{cp.explanation}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Bottom Complete & Action Bar */}
            {onComplete && (
                <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                            🏆
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white">Stage 1 Pre-Lab Complete?</h4>
                            <p className="text-xs text-slate-400">Lock in your knowledge and advance to practical exercises.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={onComplete}
                            disabled={isCompleting || completed}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 font-bold text-xs sm:text-sm text-white shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition disabled:opacity-60"
                        >
                            {completed ? (
                                <>
                                    <CheckCircle className="w-4 h-4 text-emerald-300" />
                                    <span>Theory Completed (+{earnedXP} XP)</span>
                                </>
                            ) : isCompleting ? (
                                <span>Recording Completion...</span>
                            ) : (
                                <>
                                    <span>Complete Stage 1 (+{earnedXP} XP)</span>
                                    <ChevronRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}

/**
 * Robust Fallback Extractor: Synthesizes dynamic animations, mind maps, and steps
 * for ANY subject if unit object lacks pre-generated JSON schema fields.
 */
function extractOrSynthesizeVisualPayload(unit, rawContent, language) {
    // If unit already has explicit AI generated fields, use them!
    if (unit?.animStages && unit?.conceptMindMap && unit?.steps) {
        return {
            domain: unit.domain || 'Computer Science',
            coreIntuition: unit.coreIntuition || unit.summary,
            animStages: unit.animStages,
            steps: unit.steps,
            blueprintSubtitle: unit.blueprintSubtitle || 'Syntactic Order of Evaluation',
            blueprint: unit.syntaxAnatomy || [],
            mindmap: unit.conceptMindMap,
            traps: unit.commonMistakes?.[0] || {
                wrongTitle: 'Common Pitfall',
                wrongCode: '# Suboptimal or buggy usage',
                whyFails: 'Violates syntax or constraints.',
                rightTitle: 'Recommended Approach',
                rightCode: '# Correct usage',
                whyWorks: 'Ensures correctness and performance.'
            }
        };
    }

    const title = unit?.title || 'Concept Theory';
    const textSample = (title + ' ' + rawContent).toLowerCase();

    // 1. SQL / Databases Domain
    if (language === 'sql' || /\b(sql|database|relation|\btable\b|rdbms|cardinality|degree|primary\s+key)\b/i.test(textSample)) {
        return {
            domain: 'Database Management (SQL)',
            coreIntuition: 'Databases organize data into <strong>Relations (Tables)</strong> where columns are <strong>Attributes</strong> and rows are <strong>Tuples</strong>. SQL is declarative: you tell the engine <span class="text-cyan-300 font-semibold underline">WHAT</span> data you need, rather than writing loops for how to fetch it.',
            animStages: [
                {
                    title: 'Stage 1: Source Table Scan (FROM Student)',
                    subtitle: 'Loading all candidate tuples from the storage engine',
                    icon: '🗄️',
                    narration: 'The query engine locates the Student relation on disk and streams candidate records into the memory buffer.',
                    renderScene: () => `
                        <div class="w-full flex flex-col md:flex-row items-center justify-center gap-6">
                            <div class="p-4 rounded-xl bg-slate-950 border-2 border-indigo-500 shadow-xl space-y-2 w-72">
                                <div class="flex justify-between items-center text-xs font-mono text-indigo-300 border-b border-slate-800 pb-1">
                                    <span>Table: Student</span><span class="text-emerald-400 font-bold">4 Records</span>
                                </div>
                                <div class="space-y-1 text-[11px] font-mono">
                                    <div class="p-1 rounded bg-slate-900 flex justify-between text-slate-200"><span>#1 Alice (CS)</span><span class="text-emerald-400">85</span></div>
                                    <div class="p-1 rounded bg-slate-900 flex justify-between text-slate-200"><span>#2 Bob (Bio)</span><span class="text-amber-400">62</span></div>
                                    <div class="p-1 rounded bg-slate-900 flex justify-between text-slate-200"><span>#3 Charlie (CS)</span><span class="text-emerald-400">91</span></div>
                                    <div class="p-1 rounded bg-slate-900 flex justify-between text-slate-200"><span>#4 David (Bio)</span><span class="text-emerald-400">78</span></div>
                                </div>
                            </div>
                            <div class="text-2xl text-indigo-400 animate-pulse">➔</div>
                            <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center w-44 text-xs text-slate-400">Buffer Ready</div>
                        </div>
                    `
                },
                {
                    title: 'Stage 2: Predicate Filtering (WHERE Marks >= 75)',
                    subtitle: 'Discarding non-qualifying tuples before grouping',
                    icon: '🔍',
                    narration: 'The WHERE filter tests each record independently. Bob (Marks: 62) violates the condition and is immediately dropped.',
                    renderScene: () => `
                        <div class="w-full flex items-center justify-center gap-4">
                            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1 w-52 opacity-60">
                                <div class="p-1 rounded bg-slate-900 text-emerald-400">Alice: 85 ✓</div>
                                <div class="p-1 rounded bg-rose-950/60 text-rose-400 line-through border border-rose-800">Bob: 62 ✕</div>
                                <div class="p-1 rounded bg-slate-900 text-emerald-400">Charlie: 91 ✓</div>
                                <div class="p-1 rounded bg-slate-900 text-emerald-400">David: 78 ✓</div>
                            </div>
                            <div class="text-2xl text-purple-400">➔</div>
                            <div class="p-4 rounded-xl bg-purple-950/40 border-2 border-purple-500 text-center w-60 shadow-xl">
                                <span class="text-xs font-bold text-purple-300">Surviving Stream</span>
                                <div class="mt-1 text-xs font-mono text-emerald-300">Alice, Charlie, David</div>
                            </div>
                        </div>
                    `
                },
                {
                    title: 'Stage 3: Group Partitioning & Summary Calculation',
                    subtitle: 'Bucketing tuples by category and computing aggregations',
                    icon: '📦',
                    narration: 'GROUP BY aggregates department stats. HAVING filters summary groups before returning the final projected relation.',
                    renderScene: () => `
                        <div class="w-full flex items-center justify-center gap-4">
                            <div class="p-4 rounded-xl bg-slate-950 border-2 border-emerald-500 shadow-xl w-72 text-center space-y-2">
                                <div class="text-xs font-bold text-emerald-400">Final Projection</div>
                                <div class="text-xs font-mono text-white flex justify-between font-bold border-t border-slate-800 pt-1">
                                    <span>CS Department</span><span class="text-amber-300">Count: 2 | Avg: 88.0</span>
                                </div>
                            </div>
                        </div>
                    `
                }
            ],
            steps: [
                { num: 1, title: 'Define Relations & Constraints', badge: 'DDL Phase', desc: 'Declare table columns with strict types and PRIMARY KEY constraints.', snippet: 'CREATE TABLE Student (RollNo INT PRIMARY KEY, Name VARCHAR(50));' },
                { num: 2, title: 'Filtered Projection & Pattern Matching', badge: 'DQL Phase', desc: 'Filter tuples using WHERE clause before grouping occurs.', snippet: 'SELECT * FROM Student WHERE Marks >= 75 AND Name LIKE "A%";' },
                { num: 3, title: 'Aggregation & Having Filter', badge: 'Summary Phase', desc: 'Compute group metrics using GROUP BY and filter with HAVING.', snippet: 'SELECT Stream, AVG(Marks) FROM Student GROUP BY Stream HAVING COUNT(*) >= 2;' }
            ],
            blueprint: [
                { token: '1. FROM', role: 'Target Table' },
                { token: '2. WHERE', role: 'Row Filter' },
                { token: '3. GROUP BY', role: 'Bucketing' },
                { token: '4. HAVING', role: 'Group Filter' },
                { token: '5. SELECT', role: 'Projection' },
                { token: '6. ORDER BY', role: 'Sort Rows' }
            ],
            mindmap: {
                icon: '🗄️',
                label: 'Relational Databases & SQL Engine',
                branches: [
                    { title: '🏛️ Relational Model', nodes: ['Relation = Table', 'Attribute = Column (Degree)', 'Tuple = Row (Cardinality)'] },
                    { title: '🔑 Integrity Keys', nodes: ['Primary: Unique + Not Null', 'Candidate: Eligible Keys', 'Foreign: Table Linkage'] },
                    { title: '⚡ Sublanguages', nodes: ['DDL: CREATE, ALTER, DROP', 'DML: INSERT, UPDATE, DELETE', 'DQL: SELECT Querying'] },
                    { title: '⚠️ High-Yield Traps', nodes: ['WHERE cannot use AVG/SUM', 'HAVING requires grouped rows', 'NULL requires IS NULL'] }
                ]
            },
            traps: {
                wrongTitle: 'Illegal Aggregate in WHERE',
                wrongCode: 'SELECT Dept, AVG(Salary) FROM Emp WHERE AVG(Salary) > 50000; -- ❌ ERROR!',
                whyFails: 'WHERE evaluates individual tuples before groups exist. AVG() has not been computed yet.',
                rightTitle: 'Use HAVING for Aggregates',
                rightCode: 'SELECT Dept, AVG(Salary) FROM Emp GROUP BY Dept HAVING AVG(Salary) > 50000; -- ✅ Correct!',
                whyWorks: 'HAVING executes after GROUP BY, successfully filtering grouped summary averages.'
            }
        };
    }

    // 2. Generic STEM / Python Fallback
    return {
        domain: 'Computer Science & Software Architecture',
        coreIntuition: `${title} provides modular abstractions, computational efficiency, and robust structural integrity.`,
        animStages: [
            {
                title: 'Stage 1: State & Memory Allocation',
                subtitle: 'Initializing computational entities and data structures',
                icon: '📦',
                narration: `The program establishes variable state, memory allocation, and parameter validation for ${title}.`,
                renderScene: () => `
                    <div class="w-full flex items-center justify-center gap-6">
                        <div class="p-4 rounded-xl bg-slate-950 border-2 border-indigo-500 shadow-xl text-center w-64 space-y-2">
                            <span class="text-xs font-mono text-indigo-400 font-bold">Input Context</span>
                            <div class="p-2 bg-slate-900 rounded font-mono text-xs text-white">Initialize State</div>
                        </div>
                    </div>
                `
            },
            {
                title: 'Stage 2: Transformation & Algorithmic Execution',
                subtitle: 'Applying logic and mutations according to invariant rules',
                icon: '⚡',
                narration: `The computational engine transforms inputs according to core principles of ${title}.`,
                renderScene: () => `
                    <div class="w-full flex items-center justify-center gap-6">
                        <div class="p-4 rounded-xl bg-purple-950/60 border-2 border-purple-500 shadow-xl text-center w-64 space-y-2">
                            <span class="text-xs font-mono text-purple-300 font-bold">Processing Core</span>
                            <div class="p-2 bg-slate-900 rounded font-mono text-xs text-emerald-300">Executing Transformation...</div>
                        </div>
                    </div>
                `
            },
            {
                title: 'Stage 3: Result Verification & Output Resolution',
                subtitle: 'Returning verified results to caller',
                icon: '✨',
                narration: `Execution completes with validated output structures and clean resource handling.`,
                renderScene: () => `
                    <div class="w-full flex items-center justify-center gap-6">
                        <div class="p-4 rounded-xl bg-emerald-950/60 border-2 border-emerald-500 shadow-xl text-center w-64 space-y-2">
                            <span class="text-xs font-mono text-emerald-300 font-bold">Verified Result</span>
                            <div class="p-2 bg-slate-900 rounded font-mono text-xs text-white">Status: 200 OK ✓</div>
                        </div>
                    </div>
                `
            }
        ],
        steps: [
            { num: 1, title: 'Initialization & Foundation', badge: 'Setup Phase', desc: `Define core structures and validate prerequisite constraints for ${title}.` },
            { num: 2, title: 'Transformation & Processing', badge: 'Execution Phase', desc: `Apply algorithmic logic and data modifications in adherence to scope rules.` },
            { num: 3, title: 'Inspection & Output Verification', badge: 'Resolution Phase', desc: `Return output, handle exceptions, and ensure state integrity.` }
        ],
        blueprint: [
            { token: '1. Input', role: 'Prerequisites' },
            { token: '2. Validate', role: 'Invariants' },
            { token: '3. Execute', role: 'Transformation' },
            { token: '4. Verify', role: 'Assertions' },
            { token: '5. Output', role: 'Resolution' }
        ],
        mindmap: {
            icon: '🎯',
            label: title,
            branches: [
                { title: '🏛️ Core Principles', nodes: ['Modularity & Clarity', 'Separation of Concerns', 'Single Responsibility'] },
                { title: '⚡ Operations', nodes: ['Creation / Setup', 'Modification / Access', 'Resource Cleanup'] },
                { title: '🔑 Invariants & Rules', nodes: ['Type Safety', 'Scope Boundaries', 'Time Complexity'] },
                { title: '⚠️ Traps & Pitfalls', nodes: ['Off-by-one errors', 'Unchecked exceptions', 'State mutation bugs'] }
            ]
        },
        traps: {
            wrongTitle: 'Unchecked Edge Case Handling',
            wrongCode: `# Skipping validation\ndef execute(val):\n    return 100 / val  # Crashes if val == 0!`,
            whyFails: 'Fails to guard against zero or invalid boundary inputs.',
            rightTitle: 'Guard Clauses & Defensive Logic',
            rightCode: `# Defensive check\ndef execute(val):\n    if val == 0:\n        return None\n    return 100 / val`,
            whyWorks: 'Guards boundary conditions cleanly before executing computations.'
        }
    };
}
