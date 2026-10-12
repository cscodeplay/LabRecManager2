'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    Sparkles, Play, Pause, SkipForward, SkipBack, RotateCcw, 
    X, Check, Settings2, Sliders, Layers, Send, ChevronRight, 
    Loader2, BookOpen, PenTool, HelpCircle, Eye, ArrowRight
} from 'lucide-react';
import MathHandwrittenStep from './MathHandwrittenStep';
import MathRenderer from '../MathRenderer';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const PRESET_PROBLEMS = [
    {
        title: 'Right Triangle Hypotenuse (Pythagoras)',
        problem: 'In a right-angled triangle ABC, side AB = 6 cm and side BC = 8 cm with angle B = 90°. Find the length of the hypotenuse AC and its area.',
        level: 'high_school'
    },
    {
        title: 'Calculus: Product Rule Derivative',
        problem: 'Find the derivative of f(x) = x^2 * sin(x) with respect to x, and evaluate the slope of the tangent at x = pi/2.',
        level: 'college'
    },
    {
        title: 'Physics: Projectile Range & Max Height',
        problem: 'A ball is projected with an initial velocity of 20 m/s at an angle of 30 degrees above the horizontal. Assuming g = 9.8 m/s^2, determine the maximum height reached and the horizontal range.',
        level: 'high_school'
    },
    {
        title: 'Algebra: Quadratic Roots by Completing Square',
        problem: 'Solve the quadratic equation 2x^2 + 8x - 10 = 0 by completing the square.',
        level: 'middle_school'
    }
];

const FONT_OPTIONS = [
    { id: 'font-caveat', name: 'Caveat (Fluid Cursive)', class: 'font-caveat' },
    { id: 'font-patrick', name: 'Patrick Hand (Chalkboard)', class: 'font-patrick' },
    { id: 'font-kalam', name: 'Kalam (Natural Pen)', class: 'font-kalam' },
    { id: 'font-architect', name: 'Architects Daughter (Drafting)', class: 'font-architect' }
];

export default function MathSolverModal({
    isOpen,
    onClose,
    onInsertStepToCanvas,
    onInsertDiagramToCanvas,
    initialProblem = ''
}) {
    // Problem inputs
    const [problemText, setProblemText] = useState(initialProblem || '');
    const [academicLevel, setAcademicLevel] = useState('high_school');
    const [isLoading, setIsLoading] = useState(false);

    // Solution state
    const [solutionData, setSolutionData] = useState(null);
    const [currentStepIdx, setCurrentStepIdx] = useState(0);

    // Coordination & Pacing controls
    const [isPlaying, setIsPlaying] = useState(false);
    const [paceDelayMs, setPaceDelayMs] = useState(3000); // 3 seconds between steps
    const [selectedFont, setSelectedFont] = useState('font-caveat');
    const [typingSpeedMs, setTypingSpeedMs] = useState(24);
    const [speedMultiplier, setSpeedMultiplier] = useState(1); // 0.5x, 1x, 1.5x, 2x

    const autoPlayTimerRef = useRef(null);

    // Initialize problem if provided
    useEffect(() => {
        if (initialProblem) {
            setProblemText(initialProblem);
        }
    }, [initialProblem]);

    // Handle Solving
    const handleSolve = async () => {
        if (!problemText || !problemText.trim()) {
            toast.error('Please enter a mathematical problem');
            return;
        }

        setIsLoading(true);
        setIsPlaying(false);
        if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);

        try {
            const res = await api.post('/whiteboard/math-solver/solve', {
                problem: problemText.trim(),
                level: academicLevel,
                generateDiagram: true
            });

            if (res.data?.success && res.data?.data) {
                setSolutionData(res.data.data);
                setCurrentStepIdx(0);
                toast.success('Solution generated! Ready for coordination.');
            } else {
                toast.error(res.data?.message || 'Could not generate solution');
            }
        } catch (err) {
            console.error('Solve error:', err);
            toast.error(err.response?.data?.message || 'Error communicating with solver');
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-play timer coordination
    useEffect(() => {
        if (!isPlaying || !solutionData || !solutionData.steps) return;

        const effectiveDelay = Math.max(1000, paceDelayMs / speedMultiplier);

        autoPlayTimerRef.current = setTimeout(() => {
            if (currentStepIdx < solutionData.steps.length - 1) {
                setCurrentStepIdx((prev) => prev + 1);
            } else {
                setIsPlaying(false);
                toast.success('Completed all solution steps!');
            }
        }, effectiveDelay);

        return () => {
            if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
        };
    }, [isPlaying, currentStepIdx, solutionData, paceDelayMs, speedMultiplier]);

    // Stepping controls
    const handleNextStep = () => {
        if (!solutionData || !solutionData.steps) return;
        if (currentStepIdx < solutionData.steps.length - 1) {
            setCurrentStepIdx((prev) => prev + 1);
        }
    };

    const handlePrevStep = () => {
        if (currentStepIdx > 0) {
            setCurrentStepIdx((prev) => prev - 1);
        }
    };

    const handleReset = () => {
        setIsPlaying(false);
        setCurrentStepIdx(0);
        if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    };

    // Handle sending step to whiteboard canvas
    const handleSendCurrentStepToCanvas = () => {
        if (!solutionData || !solutionData.steps[currentStepIdx]) return;
        const step = solutionData.steps[currentStepIdx];
        onInsertStepToCanvas?.(step, selectedFont);
        toast.success(`Inserted Step ${step.stepNumber} onto canvas!`);
    };

    const handleSendDiagramToCanvas = () => {
        if (!solutionData?.overallDiagram?.svg) {
            toast.error('No diagram available for this problem');
            return;
        }
        onInsertDiagramToCanvas?.(solutionData.overallDiagram.svg, solutionData.title);
        toast.success('Inserted problem diagram onto canvas!');
    };

    if (!isOpen) return null;

    const currentStep = solutionData?.steps?.[currentStepIdx] || null;
    const totalSteps = solutionData?.steps?.length || 0;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                Auto Math Problem Solver
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                                    Human Coordination
                                </span>
                            </h2>
                            <p className="text-xs text-slate-400">
                                Generates timed pedagogical steps with handwritten typography and synchronized diagramming
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Main Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Problem Input section */}
                    <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                <PenTool className="w-3.5 h-3.5 text-amber-400" />
                                Problem Statement or Equation
                            </label>
                            <div className="flex items-center gap-2">
                                <select 
                                    value={academicLevel} 
                                    onChange={(e) => setAcademicLevel(e.target.value)}
                                    className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
                                >
                                    <option value="middle_school">Middle School</option>
                                    <option value="high_school">High School (11th/12th)</option>
                                    <option value="college">College / University</option>
                                    <option value="competition">Olympiad / JEE</option>
                                </select>
                            </div>
                        </div>

                        <textarea
                            value={problemText}
                            onChange={(e) => setProblemText(e.target.value)}
                            placeholder="Type or paste any math, physics, or geometry problem (e.g., 'Find hypotenuse of right triangle with sides 6 and 8...')"
                            rows={3}
                            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />

                        {/* Presets and Solve button */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] text-slate-400">Presets:</span>
                                {PRESET_PROBLEMS.map((preset, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            setProblemText(preset.problem);
                                            setAcademicLevel(preset.level);
                                        }}
                                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50 transition"
                                    >
                                        {preset.title.split(' ')[0]}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleSolve}
                                disabled={isLoading || !problemText.trim()}
                                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 disabled:opacity-50 transition active:scale-95"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> Solving...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" /> Solve Step-by-Step
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Solution Display & Coordination Player */}
                    {solutionData && (
                        <div className="space-y-4">
                            {/* Problem Overview & Final Answer Banner */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                                <div>
                                    <div className="text-xs uppercase font-mono tracking-wider text-amber-400">
                                        {solutionData.category} • {solutionData.title}
                                    </div>
                                    <div className="text-sm font-semibold text-white mt-0.5">
                                        Answer: <span className="text-amber-300 font-bold">{solutionData.finalAnswer}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {solutionData.overallDiagram?.svg && (
                                        <button
                                            onClick={handleSendDiagramToCanvas}
                                            className="text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> Stamp Diagram to Canvas
                                        </button>
                                    )}
                                    <button
                                        onClick={handleSendCurrentStepToCanvas}
                                        className="text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md transition"
                                    >
                                        <Send className="w-3.5 h-3.5" /> Stamp Step to Canvas
                                    </button>
                                </div>
                            </div>

                            {/* Player Controls Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                                {/* Navigation & Playback */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleReset}
                                        title="Restart from Step 1"
                                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handlePrevStep}
                                        disabled={currentStepIdx === 0}
                                        title="Previous Step"
                                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
                                    >
                                        <SkipBack className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setIsPlaying(!isPlaying)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition ${
                                            isPlaying 
                                                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25' 
                                                : 'bg-slate-800 hover:bg-slate-700 text-white'
                                        }`}
                                    >
                                        {isPlaying ? (
                                            <>
                                                <Pause className="w-4 h-4" /> Pause Auto-Pace
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4" /> Play Auto-Pace
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleNextStep}
                                        disabled={currentStepIdx >= totalSteps - 1}
                                        title="Next Step"
                                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
                                    >
                                        <SkipForward className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Step Counter & Progress Scrub Bar */}
                                <div className="flex items-center gap-3 flex-1 min-w-[200px] max-w-xs">
                                    <span className="text-xs font-mono text-slate-400 whitespace-nowrap">
                                        Step {currentStepIdx + 1} / {totalSteps}
                                    </span>
                                    <div className="flex-1 flex gap-1 h-2 rounded-full overflow-hidden bg-slate-800">
                                        {solutionData.steps.map((_, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => setCurrentStepIdx(idx)}
                                                className={`flex-1 cursor-pointer transition-all ${
                                                    idx <= currentStepIdx ? 'bg-amber-500' : 'bg-slate-700/50'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Pacing & Font Settings */}
                                <div className="flex items-center gap-3">
                                    {/* Handwriting font selector */}
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-slate-400">Font:</span>
                                        <select
                                            value={selectedFont}
                                            onChange={(e) => setSelectedFont(e.target.value)}
                                            className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-amber-300 focus:outline-none"
                                        >
                                            {FONT_OPTIONS.map((f) => (
                                                <option key={f.id} value={f.id}>{f.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Speed multiplier */}
                                    <div className="flex items-center gap-1">
                                        {[0.5, 1, 1.5, 2].map((sp) => (
                                            <button
                                                key={sp}
                                                onClick={() => setSpeedMultiplier(sp)}
                                                className={`text-[10px] px-2 py-1 rounded-md font-mono transition ${
                                                    speedMultiplier === sp
                                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                                                        : 'bg-slate-800/80 text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                {sp}x
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Active Step Handwritten Inking Display */}
                            {currentStep && (
                                <div className="space-y-4">
                                    <MathHandwrittenStep
                                        step={currentStep}
                                        fontFamily={selectedFont}
                                        fontSize="text-2xl"
                                        animateTyping={true}
                                        typingSpeedMs={Math.round(typingSpeedMs / speedMultiplier)}
                                    />
                                </div>
                            )}

                            {/* Optional Diagram Render */}
                            {solutionData.overallDiagram?.svg && (
                                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col items-center justify-center">
                                    <div className="text-xs text-slate-400 mb-2 font-mono uppercase">
                                        Synchronized Vector Diagram
                                    </div>
                                    <div 
                                        className="max-w-md w-full h-48 flex items-center justify-center"
                                        dangerouslySetInnerHTML={{ __html: solutionData.overallDiagram.svg }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
